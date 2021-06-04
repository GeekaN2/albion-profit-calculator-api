const NATS = require('nats');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const { getLocationFromLocationId, isAvailableLocation } = require('../../utlis');

const nc = NATS.connect('nats://public:thenewalbiondata@138.68.83.18:4222');
var collection;
let quantityOfUpdatedOrders = 0;
let quantityOfCreatedOrders = 0;
let daysWhileOrderCanLive = 14;

(async function () {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  const db = connection.db('albion');
  collection = db.collection('market_orders');

  console.log('Connected to mongodb', new Date());
})();

let gotMessages = false;

const logInterval = setInterval(function () {
  console.log('1 minute past', new Date());
  console.log('Updated', quantityOfUpdatedOrders, 'orders');
  console.log('Created', quantityOfCreatedOrders, 'orders');

  quantityOfCreatedOrders = quantityOfUpdatedOrders = 0;
}, 60 * 1000);

nc.subscribe('marketorders.deduped.bulk', async function (msg) {
  const response = JSON.parse(msg);

  if (!gotMessages) {
    gotMessages = true;

    console.log('Got some messages');
  }

  const day = 24 * 60 * 60 * 1000;

  for (let item of response) {
    const tier = item.ItemTypeId.match(/T\d/);

    if (tier < 2 || !isAvailableLocation(getLocationFromLocationId(item.LocationId))) {
      continue;
    }

    const itemInDB = await collection.findOne({ OrderId: item.Id });

    if (itemInDB === null) {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
        item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
      }

      await collection.insertOne({
        OrderId: item.Id,
        ItemId: item.ItemTypeId,
        LocationId: item.LocationId,
        QualityLevel: item.QualityLevel,
        UnitPriceSilver: item.UnitPriceSilver,
        Amount: item.Amount,
        AuctionType: item.AuctionType,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        Expires: item.Expires
      });

      // console.log('Created', item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);
      
      quantityOfCreatedOrders++;
    } else {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
        item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
      }

      await collection.updateOne({
        OrderId: item.Id
      }, {
        $set: {
          UnitPriceSilver: item.UnitPriceSilver,
          Amount: item.Amount,
          UpdatedAt: new Date(),
        }
      });

      // console.log('Updated', item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);

      quantityOfUpdatedOrders++;
    }
  }
})
