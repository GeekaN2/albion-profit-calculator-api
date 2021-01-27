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

  // Token expires after 1 month
  await db.collection('refresh_tokens').createIndex( { dtCreated: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  await db.collection('user_settings').createIndex( { userId: 1 }, { unique: true });
  
  await db.collection('users').createIndex({ nickname: 1 }, { unique: true });

  console.log('Indexes created');
}

main();