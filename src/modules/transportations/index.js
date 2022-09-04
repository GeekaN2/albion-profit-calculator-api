const Router = require('koa-router');
const axios = require('axios');
const router = new Router();
const config = require('../../config');
const { isAvailableLocation, generateOrderKey, getLocationFromLocationId, getDbByServerId } = require('../../utlis');

/**
 * Returns the best routes between all locations for one item 
 */
router.get('/', async (ctx) => {
  let { items = 'T4_BAG', locations = 'Caerleon', serverId } = ctx.request.query;

  items = items.split(',').filter(item => item.trim().length > 0);
  locations = locations.split(',').filter(location => isAvailableLocation(location));

  let cursor = await ctx.mongo.db(getDbByServerId(serverId)).collection('normalized_prices').find({
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
  let { skip = 0, count = 20, from = 'Caerleon', to = 'Caerleon', useHeuristicSort = false, serverId } = ctx.request.query;

  skip = Number(skip) || 0;
  count = Math.min(Number(count) || 0, 200);
  useHeuristicSort = useHeuristicSort === 'true'

  let cursor = await ctx.mongo.db(getDbByServerId(serverId)).collection('normalized_prices').find(
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

/**
 * Grouping by [Location][ItemId] format
 */
router.get('/transportations-data', async (ctx) => {
  const {
    from = 'Caerleon',
    to = 'Caerleon',
  } = ctx.request.query;

  let cursor = await ctx.mongo.db('albion').collection('normalized_prices').find(
    {
      location: { $in: [from, to] }
    }, {
    projection: { _id: 0 }
  });

  let groupedItemsByLocation = {};

  await cursor.forEach(item => {
    if (!groupedItemsByLocation[item.location]) {
      groupedItemsByLocation[item.location] = {};
    }

    groupedItemsByLocation[item.location][item.itemId] = item;
  });

  ctx.body = groupedItemsByLocation;
})

/**
 * Get cashed sorted data for 2 cities
 */
router.get('/sort', async (ctx) => {
  let {
    skip = 0,
    count = 20,
    from = 'Caerleon',
    to = 'Caerleon',
    sort = 'BY_LAST_TIME_CHECKED,BY_PERCENTAGE_PROFIT',
  } = ctx.request.query;

  try {
    const sortings = ['BY_PERCENTAGE_PROFIT', 'BY_PROFIT', 'BY_LAST_TIME_CHECKED', 'BY_MOUNT_PROFIT', 'BY_PROFIT_VOLUME'];

    sort = sort.split(',').filter(userSort => sortings.includes(userSort));
  
    const groupedItemsByLocation = (await axios.get(`${config.apiUrl}/transportations/transportations-data?from=${from}&to=${to}`)).data;

    skip = Number(skip) || 0;
    count = Math.min(Number(count) || 0, 200);

    const isOutdated = (date) => {
      const oneDayBefore = new Date().valueOf() - 24 * 60 * 60 * 1000;

      return new Date(date).valueOf() <= oneDayBefore;
    }

    const itemIds = Object.keys(groupedItemsByLocation[from]);

    const groupedItemsFromTo = itemIds.map(itemId => ({
      from: groupedItemsByLocation[from][itemId],
      to: groupedItemsByLocation[to][itemId],
    }));

    const getFromItemPrice = (itemFromTo) => {
      return itemFromTo.from.sellPriceMin;
    }

    const getToItemPrice = (itemFromTo) => {
      const feePercentage = 3.5;

      return itemFromTo.to.sellPriceMin * (100 - feePercentage) / 100;
    }

    /**
     * ItemFrom price is zero. Means we can't calculate profit properly
     */
    const isNotValidTransportation = (itemFromTo) => {
      return itemFromTo.from.sellPriceMin === 0;
    }
    
    /**
     * For each order that is not outdated, we add one
     * More means better
     */
    const getOudationValue = (itemFromTo) => {
      if (isNotValidTransportation(itemFromTo)) {
        return -Infinity;
      }

      return !isOutdated(itemFromTo.from.sellPriceMinDate) + !isOutdated(itemFromTo.to.sellPriceMinDate);
    }

    const getRealProfit = (itemFromTo) => {
      if (isNotValidTransportation(itemFromTo)) {
        return -Infinity;
      }

      return getToItemPrice(itemFromTo) - getFromItemPrice(itemFromTo);
    }

    const getPercentageProfit = (itemFromTo) => {
      if (isNotValidTransportation(itemFromTo)) {
        return -Infinity;
      }

      return (getRealProfit(itemFromTo) / getFromItemPrice(itemFromTo)) * 100;
    }

    const getProfitVolume = (itemFromTo) => {
      if (isNotValidTransportation(itemFromTo)) {
        return -Infinity;
      }

      return (getRealProfit(itemFromTo) * itemFromTo.to.averageItems);
    }

    groupedItemsFromTo.sort((items1, items2) => {
      if (sort.includes('BY_LAST_TIME_CHECKED')) {
        if (getOudationValue(items1) < getOudationValue(items2)) {
          return 1;
        } else if (getOudationValue(items1) > getOudationValue(items2)) {
          return -1;
        }
      }

      if (sort.includes('BY_PERCENTAGE_PROFIT')) {
        return getPercentageProfit(items2) - getPercentageProfit(items1);
      }

      if (sort.includes('BY_PROFIT')) {
        return getRealProfit(items2) - getRealProfit(items1);
      }

      if (sort.includes('BY_PROFIT_VOLUME')) {
        return getProfitVolume(items2) - getProfitVolume(items1);
      }

      return 0;
    });

    ctx.body = groupedItemsFromTo.slice(skip, count + skip);
  } catch (err) {
    console.info(err);
  }
});

module.exports = router;