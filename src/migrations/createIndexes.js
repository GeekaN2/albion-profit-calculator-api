const config = require('../config');
const MongoClient = require('mongodb').MongoClient;


async function main() {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  const db = connection.db('albion');

  await db.collection('market_orders').createIndex({ OrderId: 1 }, { unique: true });
  await db.collection('market_orders').createIndex({ Expires: 1 }, { expireAfterSeconds: 0 });
  await db.collection('market_orders').createIndex({ ItemId: 1, LocationdId: 1, QualityLevel: 1, UpdatedAt: -1, UnitPriceSilver: 1 });

  await db.collection('normalized_prices').createIndex({ itemId: 1, location: 1 });

  await db.collection('average_data').createIndex({ itemName: 1, location: 1 });

  console.log('Indexes created');
}

main();