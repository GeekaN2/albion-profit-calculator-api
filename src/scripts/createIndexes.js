const config = require('../config');
const MongoClient = require('mongodb').MongoClient;

const createServerIndexes = async (dbName) => {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });

  const serverDb = connection.db(dbName);

  await serverDb.collection('market_orders').createIndex({ OrderId: 1 }, { unique: true });
  await serverDb.collection('market_orders').createIndex({ Expires: 1 }, { expireAfterSeconds: 0 });
  await serverDb.collection('market_orders').createIndex({ ItemId: 1, LocationdId: 1, QualityLevel: 1, UpdatedAt: -1, UnitPriceSilver: 1 });

  await serverDb.collection('normalized_prices').createIndex({ itemId: 1, location: 1 });

  await serverDb.collection('average_data').createIndex({ itemName: 1, location: 1 });
}

/**
 * We have many databases for data from different servers 
 * with the same structure and one with users
 */
async function main() {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });

  const mainDb = connection.db('albion');

  const serversCursor = mainDb.collection('servers').find({});
  const servers = await serversCursor.toArray();
  const dbNames = servers.map(server => server.id);

  // Token expires after 1 month
  await mainDb.collection('refresh_tokens').createIndex( { dtCreated: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  await mainDb.collection('user_settings').createIndex( { userId: 1 }, { unique: true });

  await mainDb.collection('users').createIndex({ nickname: 1 });

  dbNames.forEach(async (dbName) => await createServerIndexes(dbName));

  console.log('Indexes created');
}

main();

module.exports = {
  createServerIndexes
}