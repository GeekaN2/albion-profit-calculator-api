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
  let { skip = 0, count = 20, from = 'Caerleon', to = 'Caerleon', useHeuristicSort = false } = ctx.request.query;

  skip = Number(skip) || 0;
  count = Math.min(Number(count) || 0, 200);
  useHeuristicSort = useHeuristicSort === 'true'

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
    if (itemsByLocation[from][itemId].normalizedPrice == 0 || itemsByLocation[to][itemId].normalizedPrice == 0) {
      continue;
    }

    const marketFee = itemsByLocation[to][itemId].marketFee;
    const itemFrom = itemsByLocation[from][itemId];
    const itemTo = itemsByLocation[to][itemId];

    const profit = itemTo.normalizedPrice * (1 - itemTo.marketFee / 100) - itemFrom.sellPriceMin;
    const percentageProfit = profit / itemFrom.sellPriceMin * 100;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // test new param
    const dateStat = (Number(new Date(itemFrom.date)) + Number(new Date(itemTo.date)) - 2 * dayAgo) / 100000;
    const secondDateStat = (Number(new Date(itemFrom.date)) - dayAgo) * (Number(new Date(itemTo.date)) - dayAgo) / (100000 ** 2);

    let heuristicStat = secondDateStat * (itemTo.averageItems + 1) * percentageProfit;
    heuristicStat = secondDateStat < 0 && percentageProfit < 0 ? -heuristicStat : heuristicStat;

    // If the profit is so big just skip this item
    if (percentageProfit > 1000) {
      continue;
    }

    transportationPrices.push({
      itemId,
      percentageProfit,
      heuristicStat
    });
  }

  if (useHeuristicSort) {
    transportationPrices.sort((item1, item2) => item2.heuristicStat - item1.heuristicStat);
  } else {
    transportationPrices.sort((item1, item2) => item2.percentageProfit - item1.percentageProfit);
  }

  transportationPrices = transportationPrices.slice(skip, skip + count);

  let response = [];

  transportationPrices.forEach(item => {
    const itemId = item.itemId;
    const itemFrom = itemsByLocation[from][itemId];
    const itemTo = itemsByLocation[to][itemId];

    response.push({
      itemId,
      locationFrom: from,
      locationTo: to,
      priceFrom: itemFrom.sellPriceMin,
      priceTo: itemTo.normalizedPrice,
      dateFrom: itemFrom.date,
      dateTo: itemTo.date,
      marketFee: itemTo.marketFee,
      qualityFrom: itemFrom.quality,
      qualityTo: itemTo.quality,
      averageItems: itemTo.averageItems
    });
  });

  ctx.body = response;
})

module.exports = router;