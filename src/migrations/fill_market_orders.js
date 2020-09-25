const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const items = require('../static/items.json');
const { getLocationFromLocationId, isAvailableLocation } = require('../utlis');
let orders = fs.readFileSync('./src/static/migrations/market_orders.txt').toString().split('\n');

console.log('Readed market_orders.txt. Started at', new Date());

/**
 * Insert orders to our database from database txt dump
 */
(async function insertNewOrders() {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  const collection = connection.db('albion').collection('market_orders');

  await createIndexes(collection);

  const day = 24 * 60 * 60 * 1000;
  let quantity = 0;

  console.log('Connected to mongodb', new Date());

  for (let order of orders) {
    // order example: 3990616755	T8_HIDE_LEVEL2@2	1	2	22379	3	3	offer	2020-09-25 09:37:58	3008	248671982	2020-08-26 10:39:23	2020-09-20 04:50:54	\N
    order = order.split('\t'); 
    
    if (order.length != 14) {
      console.log('Bad order');

      break;
    }

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
      continue;
    }

    if (item.Expires - Date.now() > 7 * day) {
      item.Expires = new Date(Date.now() + 7 * day);
    }

    await collection.updateOne({ OrderId: item.OrderId }, { $set: item }, { upsert: true });
  }

  console.log('End', new Date());
})();

/**
 * Create collection indexes
 * 
 * @param {*} collection 
 */
async function createIndexes(collection) {
  await collection.createIndex({ OrderId: 1 }, { unique: true });
  await collection.createIndex({ Expires: 1}, { expireAfterSeconds: 0 });
  await collection.createIndex({ ItemId: 1, LocationdId: 1, QualityLevel: 1, UpdatedAt: -1, UnitPriceSilver: 1 });

  console.log('Indexes created');
}
