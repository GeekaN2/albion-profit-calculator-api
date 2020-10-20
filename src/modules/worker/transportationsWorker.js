const { workerData, parentPort } = require('worker_threads')
const { createArrayOfAllNames, sleep, normalizedPriceAndDate, normalizeItem } = require('../../utlis');
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

      console.log("Worker successfully connected to MongoDB");
    }
    catch(ex) {
      console.log("Worker connection failed");
    }
  }

  /**
   * Run worker
   */
  async start() {
    console.log('Worker started', new Date());
    
    await this.connect();
  }

  /**
   * Stop worker
   */
  async stop() {
    console.log('Worker stopped', new Date());

    await this.connection.close();
  }

  /**
   * Update one item in mongodb
   */
  async updateOneItem() {
    // await this.db.collection('normalized_prices').updateOne({}, { upsert: true });
  }
}

/**
 * Run worker
 */
async function runWorker() {
  const worker = new Worker();
  
  await worker.start();

  for (let baseItemName of items) {
    const allItems = createArrayOfAllNames(baseItemName);
    const itemsData = await axios.get(`${config.apiUrl}/data?${allItems.join(',')}&locations=${cities.join(',')}&qualities=${qualities.join(',')}`);
    
    let normalizedItems = cities.forEach(city => normalizedItems[city] = {});

    itemsData.forEach((item) => {
      if (!normalizedItems[item.itemId]) {
        normalizedItems[item.location][item.itemId] = {
          item: item.id,
          quality: item.quality,
          price: 0,
          date: new Date(0),
          location: item.location,
          marketFee: 3
        };
      }

      const currentPrice = normalizedItems[item.location][item.itemId];
      let newPrice = normalizedPriceAndDate(item);

      newPrice = normalizeItem(currentPrice, newPrice);
      normalizedItems[item.location][item.itemId] = newPrice;
    });

    for (let city of cities) {
      for (let itemName in normalizedItems[city]) {
        await worker.updateOneItem(normalizedItems[city][itemName]);
      }
    }

    console.log('Updated', baseItemName);
    await sleep(20);
  }


  await worker.stop();
}

runWorker().catch(err => console.log('Error in worker', err));