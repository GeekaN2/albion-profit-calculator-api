const NATS = require('nats');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const items = require('../../static/items.json');

const nc = NATS.connect('nats://public:thenewalbiondata@albion-online-data.com:4222');
var collection;

(async function () {
  const connection = await MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true });
  const db = connection.db('albion');
  collection = db.collection('market_orders');

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

const kek = setInterval(function () {
  console.log('1 minute past', new Date());
}, 60 * 1000);

nc.subscribe('marketorders.deduped.bulk', async function (msg) {
  const response = JSON.parse(msg);

  if (!gotMessages) {
    gotMessages = true;

    console.log('Got some messages');
  }

  const day = 24 * 60 * 60 * 1000;

  for (let item of response) {
    if (!items.some(name => item.ItemTypeId.slice(2).includes(name)) || item.ItemTypeId.slice(1, 2) < 4 || !cityCode[item.LocationId]) {
      continue;
    }

    const itemInDB = await collection.findOne({ OrderId: item.Id });

    if (itemInDB === null) {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > 7 * day) {
        item.Expires = new Date(Date.now() + 7 * day);
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
      console.log('Created', item.ItemTypeId, 'in', cityCode[item.LocationId], 'quality', item.QualityLevel);
    } else {
      item.Expires = new Date(item.Expires);

      if (item.Expires - Date.now() > 30 * day) {
        item.Expires = new Date(Date.now() + 7 * day);
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

      console.log('Updated', item.ItemTypeId, 'in', cityCode[item.LocationId], 'quality', item.QualityLevel);
    }


    /**if (item.AuctionType == 'offer') {
      await collection.updateOne({
        itemId: item.ItemTypeId,
        quality: item.QualityLevel,
        location: cityCode[item.LocationId]
      }, {
        $set: {
          itemId: item.ItemTypeId,
          quality: item.QualityLevel,
          sellPrice: item.UnitPriceSilver,
          sellPriceDate: new Date(),
          location: cityCode[item.LocationId],
        }
      },
      { upsert: true });
    } else if (item.AuctionType == 'request') {
      await collection.updateOne({
        itemId: item.ItemTypeId,
        quality: item.QualityLevel,
        location: cityCode[item.LocationId]
      }, {
        $set: {
          itemId: item.ItemTypeId,
          quality: item.QualityLevel,
          buyPrice: item.UnitPriceSilver,
          buyPriceDate: new Date(),
          location: cityCode[item.LocationId]
        }
      },
      { upsert: true });
    }*/

    // console.log('Updated', item.ItemTypeId, 'in', cityCode[item.LocationId], 'quality', item.QualityLevel);
  }
})
