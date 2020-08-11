const { workerData, parentPort } = require('worker_threads')
const { createArrayOfAllNames, sleep } = require('../../utlis');
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const allItems = require('../../static/items.json');

const cities = [
  'Black Market',
  'Bridgewatch',
  'Caerleon',
  'Fort Sterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
]

const allCities = cities.join(',');
const baseUrl = 'https://www.albion-online-data.com/api/v2/stats/charts';
const monthAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // fix on prod
const formatDate = `${monthAgo.getMonth() + 1}-${monthAgo.getDate()}-${monthAgo.getFullYear()}`;
const qualities = '1,2,3';

class Worker {
  constructor() {}

  async connect() {
    try {
      let connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
      this.connection = connection;
      this.db = connection.db('albion');
      console.log("Worker successfully connected to MongoDB");
    }
    catch(ex) {
      console.log("Worker connection failed");
    }
  }

  async start() {
    console.log('Worker started', new Date());
    
    await this.connect();
  }

  async stop() {
    console.log('Worker stopped', new Date());

    await this.connection.close();
  }

  async setItemData(collectedData) {
    const collection = this.db.collection('average_data');
    const options = { upsert: true };

    const dataToSet = [];

    for (let city in collectedData) {
      dataToSet.push({
        itemName: collectedData[city].itemName,
        location: city,
        averagePrice: collectedData[city].averagePrice || 0,
        averageItems: collectedData[city].averageItems || 0
      });
    }

    for (let data of dataToSet) {
      const response = await collection.updateOne({ itemName: data.itemName, location: data.location}, { $set: data }, options);
    }
  }

  async collectDataForOneItem(itemName) {
    const requestUrl = `${baseUrl}/${itemName}?date=${formatDate}&locations=${allCities}&qualities=${qualities}&time-scale=24`;
    
    const response = await axios.get(requestUrl);
    const data = response.data;
    
    const baseObject = {
      amountOfItems: 0,
      sumCost: 0, // prices[i] * items[i] + ...
      averagePrice: 0,
      averageItems: 0,
    };

    let collectedData = {};

    for (let city of cities) {
      collectedData[city] = Object.assign({}, baseObject);
      collectedData[city].days = new Set();
      collectedData[city].itemName = itemName;
    }
    
    // Set data from charts
    for (let chart of data) {
      const currentCity = chart.location;
      const chartData = chart.data;

      for (let i = 0; i < chartData.timestamps.length; i++) {
        const cost = chartData.prices_avg[i] * chartData.item_count[i];
        
        collectedData[currentCity].days.add(chartData.timestamps[i]);
        collectedData[currentCity].amountOfItems += chartData.item_count[i];
        collectedData[currentCity].sumCost += cost;
      }
    }

    // Calculate average data: prices and items
    for (let city in collectedData) {
      collectedData[city].averagePrice = collectedData[city].sumCost / collectedData[city].amountOfItems;
      collectedData[city].averageItems = collectedData[city].amountOfItems / collectedData[city].days.size;
    }

    return collectedData;
  }
}


async function runWorker() {
  const worker = new Worker();
  
  await worker.start();

  for (let baseItemName of allItems) {
    const itemsWithTierAndSubtier = createArrayOfAllNames(baseItemName);

    for (let item of itemsWithTierAndSubtier) {
      const collectedData = await worker.collectDataForOneItem(item);
  
      worker.setItemData(collectedData);

      // we can only send 1 request in 1 second, so we need to sleep
      await sleep(1000);
    }

    console.log('Updated', baseItemName);
  }

  // For test
  // const itemName = 'T4_MAIN_SPEAR';
  // const collectedData = await worker.collectDataForOneItem(itemName);
  // await worker.setItemData(collectedData);

  await worker.stop();
}

runWorker().catch(err => console.log('Error in worker', err));