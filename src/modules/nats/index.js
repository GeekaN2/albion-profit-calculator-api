const NATS = require('nats');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const items = require('../../static/items.json');
const { getLocationFromLocationId, isAvailableLocation } = require('../../utlis');

const nc = NATS.connect('nats://public:thenewalbiondata@albion-online-data.com:4222');
var collection;
let quantityOfUpdatedOrders = 0;
let quantityOfCreatedOrders = 0;
let quantityOfFilteredOrders = 0;
let daysWhileOrderCanLive = 7;

let OrderIdFilter = {
  minBorderStart: 7e9,
  maxBorderStart: 7e9 + 1e8,
  startedDate: new Date("2021-05-22T22:24:21.436Z"),
  increasingPerDate: 5e6,
  increasingOfIncreasing: 1e5,

  get maxBorder() {
    const msecondInDay = 86400 * 1000;
    const daysPassedSinceFirstDay = Math.floor((new Date() - this.startedDate) / msecondInDay);
    const orderIdIncreasing = (this.increasingPerDate +  this.increasingOfIncreasing * daysPassedSinceFirstDay / 2) * (daysPassedSinceFirstDay + 1);

    return this.minBorderStart + orderIdIncreasing;
  },

  isValidOrderId(orderId) {
    return orderId >= this.minBorderStart && orderId <= this.maxBorder;
  }
};

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
  console.log('Filtered', quantityOfFilteredOrders, 'orders');

  quantityOfCreatedOrders = quantityOfUpdatedOrders = quantityOfFilteredOrders = 0;
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
    const idWithoutTier = item.ItemTypeId.replace(/T\d/, '');

    if (!items.some(name => idWithoutTier.includes(name)) || tier < 3 || !isAvailableLocation(getLocationFromLocationId(item.LocationId))) {
      continue;
    }

    const itemInDB = await collection.findOne({ OrderId: item.Id });

    if (itemInDB === null) {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
        item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
      }

      // Do not insert order if it's id doesn't look like a real one
      if (!OrderIdFilter.isValidOrderId(item.Id)) {
        quantityOfFilteredOrders++;

        continue;
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

      //console.log('Updated', item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);

      quantityOfUpdatedOrders++;
    }
  }
})
