const NATS = require('nats');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const { getLocationFromLocationId, isAvailableLocation, getDbByServerId, getServerById } = require('../../utlis');

const argv = require('minimist')(process.argv.slice(2));

const serverId = argv.serverId;
const server = getServerById(serverId);

const nc = NATS.connect(server.natsUrl);
console.log(`Connection to NATS: ${server.natsUrl}`);

var collection;
let quantityOfUpdatedOrders = 0;
let quantityOfCreatedOrders = 0;
let quantityOfFailedOrders = 0;
let daysWhileOrderCanLive = 14;

(async function () {
  const connection = await new MongoClient(config.connection, { useUnifiedTopology: true, useNewUrlParser: true }).connect();
  const db = connection.db(server.id);
  collection = db.collection('market_orders');

  console.log(`Connected to mongodb: server - ${server.id}`, new Date());
})();

let gotMessages = false;

setInterval(function () {
  console.log('1 minute past', new Date());
  console.log('Updated', quantityOfUpdatedOrders, 'orders');
  console.log('Created', quantityOfCreatedOrders, 'orders');
  console.log('Failed to process', quantityOfFailedOrders, 'orders');

  quantityOfCreatedOrders = quantityOfUpdatedOrders = quantityOfFailedOrders = 0;
}, 60 * 1000);

nc.subscribe('marketorders.deduped.bulk', async function (msg) {
  const response = JSON.parse(msg);

  if (!gotMessages) {
    gotMessages = true;

    console.log('Got some messages');
  }

  const day = 24 * 60 * 60 * 1000;

  for (let item of response) {
    if (!isAvailableLocation(getLocationFromLocationId(item.LocationId))) {
      continue;
    }

    const itemInDB = await collection.findOne({ OrderId: item.Id });
    
    if (itemInDB === null) {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
        item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
      }

      try {
        await collection.insertOne({
          OrderId: item.Id,
          ItemId: item.ItemTypeId,
          LocationId: String(item.LocationId),
          QualityLevel: item.QualityLevel,
          UnitPriceSilver: item.UnitPriceSilver,
          Amount: item.Amount,
          AuctionType: item.AuctionType,
          CreatedAt: new Date(),
          UpdatedAt: new Date(),
          Expires: item.Expires
        });

        quantityOfCreatedOrders++;
      } catch (error) {
        console.error('Failed to insert an item with id', item.Id, error);

        quantityOfFailedOrders++;
      }

      // console.log('Created', item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);
      
    } else {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
        item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
      }

      try {
        await collection.updateOne({
          OrderId: item.Id
        }, {
          $set: {
            UnitPriceSilver: item.UnitPriceSilver,
            Amount: item.Amount,
            UpdatedAt: new Date(),
          }
        });

        quantityOfUpdatedOrders++;
      } catch (error) {
        console.error('Failed to update an item with id', item.Id, error);

        quantityOfFailedOrders++;
      }

      // console.log('Updated', item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);

    }
  }
})
