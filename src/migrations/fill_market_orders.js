const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const items = require('../static/items.json');
const split = require('split');
const { getLocationFromLocationId, isAvailableLocation } = require('../utlis');

const day = 24 * 60 * 60 * 1000;
let quantity = 0;
let collection;

let splitstream = fs.createReadStream('./src/static/migrations/market_orders.txt').pipe(split());

/**
 * Insert orders to our database from database txt dump
 */
async function connectToMongoDB() {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  collection = connection.db('albion').collection('market_orders');

  return collection;
}

/**
 * Create collection indexes
 * 
 * @param {*} collection 
 */
async function createIndexes(collection) {
  await collection.createIndex({ OrderId: 1 }, { unique: true });
  await collection.createIndex({ Expires: 1 }, { expireAfterSeconds: 0 });
  await collection.createIndex({ ItemId: 1, LocationdId: 1, QualityLevel: 1, UpdatedAt: -1, UnitPriceSilver: 1 });

  console.log('Indexes created');
}

async function main() {
  await connectToMongoDB();

  console.log('Connected to mongodb', new Date());

  await createIndexes(collection);
}

async function updateOrder(order) {
  // order example: 3990616755	T8_HIDE_LEVEL2@2	1	2	22379	3	3	offer	2020-09-25 09:37:58	3008	248671982	2020-08-26 10:39:23	2020-09-20 04:50:54	\N
  order = order.split('\t');

  if (quantity % 100000 == 0) {
    console.log(`Updated ${quantity} orders`);
  }

  quantity++;

  const item = {
    OrderId: Number(order[0]),
    ItemId: order[1],
    LocationId: Number(order[9]),
    QualityLevel: Number(order[2]),
    UnitPriceSilver: Number(order[4]),
    Amount: Number(order[5]),
    AuctionType: order[7],
    CreatedAt: new Date(order[11]),
    UpdatedAt: new Date(order[12]),
    Expires: new Date(order[8])
  }

  if (!items.some(name => item.ItemId.slice(3).includes(name)) || item.ItemId.slice(1, 2) < 4 || !isAvailableLocation(getLocationFromLocationId(item.LocationId))) {
    return;
  }

  if (item.Expires - Date.now() > 7 * day) {
    item.Expires = new Date(Date.now() + 7 * day);
  }

  await collection.updateOne({ OrderId: item.OrderId }, { $set: item }, { upsert: true });

  console.log('Updated', item.ItemId);
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

main();

splitstream.on('data', async function (order) {
  splitstream.pause();
  
  while (collection === undefined) {
    await sleep(1000);
  }

  try {
    await updateOrder(order);
  } catch {
    console.log('Bad order');
  }
  
  splitstream.resume();
});