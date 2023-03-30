const { getEnvironmentData } = require('worker_threads')
const { getDbByServerId } = require('../../utlis');
const PromisePool = require('es6-promise-pool');
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
  'Brecilien',
]

const qualities = [1, 2, 3];
const serverId = getEnvironmentData('serverId');

const MAX_PARALLEL_REQUESTS = 16;

class Worker {
  constructor() { }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      let connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
      this.connection = connection;
      this.db = connection.db(getDbByServerId(serverId));

      console.log("Transportations worker: successfully connected to MongoDB");
    }
    catch (ex) {
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

async function processBaseItemName(baseItemName, worker) {
  const allItems = createArrayOfAllNames(`T4${baseItemName}`);
  let itemsData = await axios.get(`${config.apiUrl}/data?items=${allItems.join(',')}&locations=${cities.join(',')}&qualities=${qualities.join(',')}&serverId=${serverId}`);
  let averageData = await axios.get(`${config.apiUrl}/average_data?items=${allItems.join(',')}&locations=${cities.join(',')}&serverId=${serverId}`);

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
        marketFee: 4,
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
}

/**
 * Run worker
 */
async function runWorker() {
  const worker = new Worker();

  await worker.start();

  function* getPromises() {
    for (let baseItemName of items) {
      yield processBaseItemName(baseItemName, worker).then(() => {
        console.log('Transportations worker: Updated', baseItemName);
      }).catch(() => {
        console.log('Transportations worker: Error on', baseItemName);
      });
    }
  }

  const pool = new PromisePool(getPromises, MAX_PARALLEL_REQUESTS);
    
  await pool.start();

  await worker.stop();
}

runWorker().catch(err => console.log('Error in worker', err));