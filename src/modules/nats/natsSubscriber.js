const NATS = require('nats');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');
const { getLocationFromLocationId, isAvailableLocation } = require('../../utlis');
const workerpool = require('workerpool');
const colors = require('colors/safe');

const daysWhileOrderCanLive = 14;

class NatsSubscriber {
  constructor(serverId, natsUrl) {
    this.serverId = serverId;
    this.natsUrl = natsUrl;
    this.gotMessages = false;
    this.quantityOfUpdatedOrders = 0;
    this.quantityOfCreatedOrders = 0;
    this.quantityOfFailedOrders = 0;

    console.log(`Connection to NATS: ${this.natsUrl}`);

    setInterval(() => {
      console.log(`[${this.serverId}] 1 minute past`, new Date());
      console.log(`[${this.serverId}] Updated`, this.quantityOfUpdatedOrders, 'orders');
      console.log(`[${this.serverId}] Created`, this.quantityOfCreatedOrders, 'orders');
      console.log(`[${this.serverId}] Failed to process`, this.quantityOfFailedOrders, 'orders');

      this.quantityOfCreatedOrders = this.quantityOfUpdatedOrders = this.quantityOfFailedOrders = 0;
    }, 60 * 1000);
  }

  async connect() {
    const connection = await new MongoClient(config.connection, { useUnifiedTopology: true, useNewUrlParser: true }).connect();
    const db = connection.db(this.serverId);
    this.collection = db.collection('market_orders');

    console.log(`[${this.serverId}] Connected to mongodb`, new Date());

    this.nc = NATS.connect(this.natsUrl);

    console.log(`[${this.serverId}] Connected to NATS`, new Date());
  }

  async sub() {
    this.nc.subscribe('marketorders.deduped.bulk', async (msg) => {
      const response = JSON.parse(msg);
      if (!this.gotMessages) {
        this.gotMessages = true;

        console.log(`[${this.serverId}] ${colors.cyan('Got some messages')}`);
      }

      const day = 24 * 60 * 60 * 1000;

      for (let item of response) {
        if (!isAvailableLocation(getLocationFromLocationId(item.LocationId))) {
          continue;
        }

        const itemInDB = await this.collection.findOne({ OrderId: item.Id });

        if (itemInDB === null) {
          item.Expires = new Date(item.Expires);

          if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
            item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
          }

          try {
            await this.collection.insertOne({
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

            this.quantityOfCreatedOrders++;
          } catch (error) {
            console.error(`[${this.serverId}] Failed to insert an item with id`, item.Id, error);

            this.quantityOfFailedOrders++;
          }

          // console.log(`[${this.serverId}] Created`, item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);

        } else {
          item.Expires = new Date(item.Expires);

          if (item.Expires - Date.now() > daysWhileOrderCanLive * day) {
            item.Expires = new Date(Date.now() + daysWhileOrderCanLive * day);
          }

          try {
            await this.collection.updateOne({
              OrderId: item.Id
            }, {
              $set: {
                UnitPriceSilver: item.UnitPriceSilver,
                Amount: item.Amount,
                UpdatedAt: new Date(),
              }
            });

            this.quantityOfUpdatedOrders++;
          } catch (error) {
            console.error(`[${this.serverId}] Failed to update an item with id`, item.Id, error);

            this.quantityOfFailedOrders++;
          }

          // console.log(`[${this.serverId}] Updated`, item.ItemTypeId, 'in', getLocationFromLocationId(item.LocationId), 'quality', item.QualityLevel);
        }
      }
    })
  }
}

async function natsSubscriber(serverId, natsUrl) {
  const subscriber = new NatsSubscriber(serverId, natsUrl);

  await subscriber.connect();

  subscriber.sub();
}

workerpool.worker({
  natsSubscriber: natsSubscriber,
});
