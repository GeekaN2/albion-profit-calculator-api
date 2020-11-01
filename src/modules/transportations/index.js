const Router = require('koa-router');
const axios = require('axios');
const router = new Router();
const config = require('../../config');
const { isAvailableLocation, generateOrderKey, getLocationFromLocationId } = require('../../utlis');

/**
 * Returns the best routes between all locations for one item 
 */
router.get('/', async (ctx) => {
  let { items = 'T4_BAG', locations = 'Caerleon' } = ctx.request.query;

  items = items.split(',').filter(item => item.trim().length > 0);
  locations = locations.split(',').filter(location => isAvailableLocation(location));

  let cursor = await ctx.mongo.db('albion').collection('normalized_prices').find({
    $and: [
      { itemId: { $in: items } },
      { location: { $in: locations } },
    ]
  }, { projection: { _id: 0 } });

  let normalizedData = {};

  await cursor.forEach(function (item) {
    const itemKey = `${item.itemId}:${item.location}`;

    if (!normalizedData[itemKey]) {
      normalizedData[itemKey] = item;
    }
  });

  for (let itemId of items) {
    for (let location of locations) {
      const itemKey = `${itemId}:${location}`;

      if (!normalizedData[itemKey]) {
        normalizedData[itemKey] = {
          itemId,
          location,
          date: new Date(0),
          marketFee: 3,
          price: 0,
          quality: 1
        }
      }
    }
  }

  normalizedData = Object.values(normalizedData);

  ctx.body = normalizedData;
});

/**
 * Get normalized items data sorted by
 * 
 * @param {number} skip - number of sorted items to skip
 * @param {number} count - number of sorted items to return
 * @param {string} from - location to buy items
 * @param {string} to - location to sell items
 */
router.get('/analyze', async (ctx) => {
  let { skip = 0, count = 20, from = 'Caerleon', to = 'Caerleon' } = ctx.request.query;

  skip = Number(skip) || 0;
  count = Math.min(Number(count) || 0, 200);

  let cursor = await ctx.mongo.db('albion').collection('normalized_prices').find(
    {
      location: { $in: [from, to] }
    }, {
    projection: { _id: 0 }
  });

  let itemsByLocation = {};

  await cursor.forEach(item => {
    if (!itemsByLocation[item.location]) {
      itemsByLocation[item.location] = {};
    }
    
    itemsByLocation[item.location][item.itemId] = item;
  });

  let transportationPrices = [];

  for (let itemId in itemsByLocation[from]) {
    if (itemsByLocation[from][itemId].price == 0 || itemsByLocation[to][itemId].price == 0) {
      continue;
    }
    
    const marketFee = itemsByLocation[to][itemId].marketFee;
    const priceFrom = itemsByLocation[from][itemId].price;
    const priceTo = itemsByLocation[to][itemId].price;
    const profit = priceTo - priceFrom;
    const percentageProfit = profit / priceFrom * 100;

    // If the profit is so big just skip this item
    if (percentageProfit > 1000) {
      continue;
    }
    transportationPrices.push({
      itemId,
      profit,
      percentageProfit
    });
  }

  transportationPrices.sort((item1, item2) => item2.percentageProfit - item1.percentageProfit);
  transportationPrices = transportationPrices.slice(skip, skip + count);

  ctx.body = transportationPrices;
})

module.exports = router;