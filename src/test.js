const NATS = require('nats');
const MongoClient = require('mongodb').MongoClient;
const config = require('./config');
const items = require('./static/items.json');

const nc = NATS.connect('nats://public:thenewalbiondata@albion-online-data.com:4222');
var collection;

(async function() {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  const db = connection.db('albion');
  collection = db.collection('items_data');

  console.log('Connected to mongodb', new Date());
})();

const cityCode = {
  7: 'Thetford',
  1002: 'Lymhurst',
  2004: 'Bridgewatch',
  3003: 'Black Market',
  3005: 'Caerleon',
  3008: 'Martlock',
  4002: 'Fort Sterling',
}

let gotMessages = false;

nc.subscribe('marketorders.deduped.bulk', async function (msg) {
  const response = JSON.parse(msg);

  if (!gotMessages) {
    gotMessages = true;

    console.log('Got some messages');
  }

  for (let item of response) {
    if (!items.some(name => item.ItemTypeId.slice(3).includes(name)) || item.ItemTypeId.slice(1, 2) < 4 || !cityCode[item.LocationId]) {
      continue;
    }

    console.log('Updated', item);
  }
})
