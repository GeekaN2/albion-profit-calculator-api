const { workerData, parentPort } = require('worker_threads')
const { sleep } = require('../../utlis');
const { normalizedPriceAndDate, normalizeItem, createArrayOfAllNames } = require('./utils');
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const items = require('../../static/items.json');

const cities = [
  'Black Market',
  'Bridgewatch',
  'Caerleon',
  'Fort Sterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
]

const qualities = [1, 2, 3];

class Worker {
  constructor() {}

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      let connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
      this.connection = connection;
      this.db = connection.db('albion');

      console.log("Transportations worker: successfully connected to MongoDB");
    }
    catch(ex) {
      console.log("Transportations worker: connection failed");
    }
  }

  /**
   * Run worker
   */
  async start() {
    console.log('Transportations worker: started', new Date());
    
    await this.connect();
  }

  /**
   * Stop worker
   */
  async stop() {
    console.log('Transportations worker: stopped', new Date());

    await this.connection.close();
  }

  /**
   * Update one item in mongodb
   */
  async updateOneItem(item) {
    await this.db.collection('normalized_prices').updateOne({
      itemId: item.itemId,
      location: item.location
    }, {
      $set: {
        ...item
      }
    },
     { upsert: true });
  }
}

/**
 * Run worker
 */
async function runWorker() {
  const worker = new Worker();
  
  await worker.start();

  for (let baseItemName of items) {
    const allItems = createArrayOfAllNames(`T4${baseItemName}`);
    let itemsData = await axios.get(`${config.apiUrl}/data?items=${allItems.join(',')}&locations=${cities.join(',')}&qualities=${qualities.join(',')}`);
    let averageData = await axios.get(`${config.apiUrl}/average_data?items=${allItems.join(',')}&locations=${cities.join(',')}`);
    
    itemsData = itemsData.data;
    averageData = averageData.data.reduce((accumulator, item) => {
      if (!accumulator[item.location]) {
        accumulator[item.location] = {};
      }

      accumulator[item.location][item.itemName] = item;

      return accumulator
    }, {})

    let normalizedItems = {};
    cities.forEach(city => normalizedItems[city] = {});

    itemsData = itemsData.map((item) => {
      return {
        ...item,
        averagePrice: averageData[item.location][item.itemId].averagePrice,
        averageItems: averageData[item.location][item.itemId].averageItems
      }
    })

    itemsData.forEach((item) => {
      if (!normalizedItems[item.location][item.itemId]) {
        normalizedItems[item.location][item.itemId] = {
          itemId: item.itemId,
          quality: item.quality,
          normalizedPrice: 0,
          sellPriceMin: 0,
          date: new Date(0),
          location: item.location,
          marketFee: 3,
          averagePrice: item.averagePrice,
          averageItems: item.averageItems
        };
      }

      const currentItem = normalizedItems[item.location][item.itemId];
      const normalizedPrice = normalizedPriceAndDate(item);
      const newPrice = normalizeItem(currentItem, normalizedPrice);

      normalizedItems[item.location][item.itemId] = newPrice;
    });

    for (let city of cities) {
      for (let itemName in normalizedItems[city]) {
        await worker.updateOneItem(normalizedItems[city][itemName]);
      }
    }

    console.log('Transportations worker: Updated', baseItemName);

    await sleep(20);
  }

  await worker.stop();
}

runWorker().catch(err => console.log('Error in worker', err));