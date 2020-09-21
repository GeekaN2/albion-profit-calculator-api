const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
let orders = fs.readFileSync('market_orders.txt').toString();
const items = require('../static/items.json');

// db.market_orders.createIndex({ OrderId: 1 }, { unique: true })
// db.market_orders.createIndex({ Expires: 1}, { expireAfterSeconds: 0 })
// db.market_orders.createIndex({ ItemId: 1, LocationdId: 1, QualityLevel: 1 })

console.log('Readed');
orders = orders.split('\n');

var collection;
var rl;
const day = 24 * 60 * 60 * 1000;
let quantity = 0;

const cityCode = {
  7: 'Thetford',
  1002: 'Lymhurst',
  2004: 'Bridgewatch',
  3003: 'Black Market',
  3005: 'Caerleon',
  3008: 'Martlock',
  4002: 'Fort Sterling',
}

console.log('Start', new Date());
(async function () {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  const db = connection.db('albion');
  collection = db.collection('market_orders');

  console.log('Connected to mongodb', new Date());

  for (let order of orders) {
    order = order.split('\t');

    if (quantity % 10000 == 0) {
      console.log(quantity);
    }

    quantity++;

    order[8] = new Date(order[8]);

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

    if (!items.some(name => item.ItemId.slice(3).includes(name)) || item.ItemId.slice(1, 2) < 4 || !cityCode[item.LocationId]) {
      continue;
    }

    if (item.Expires - Date.now() > 7 * day) {
      item.Expires = new Date(Date.now() + 7 * day);
    }

    await collection.updateOne({ OrderId: item.OrderId }, { $set: item }, { w: 1, j: false, upsert: true });
  }

  console.log('End', new Date());
})();

// 3990616755	T8_HIDE_LEVEL2@2	1	2	22379	3	3	offer	2020-09-25 09:37:58	3008	248671982	2020-08-26 10:39:23	2020-09-20 04:50:54	\N
