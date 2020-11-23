const Router = require('koa-router');
const router = new Router();
const config = require('../../config');
const axios = require('axios');
const { isAvailableLocation, generateOrderKey, getLocationIdFromLocation, getLocationFromLocationId } = require('../../utlis');

const OVERPRICED_MULTIPLIER = 1000;

/**
 * Returns data for requested items
 */
router.get('/', async (ctx) => {
  let { items = '', locations = '', qualities = '1' } = ctx.request.query;

  const averageData = (await axios.get(`${config.apiUrl}/average_data?items=${items}&locations=${locations}`)).data;
  let averageDataObject = {};
  averageData.forEach(item => averageDataObject[item.itemName] = item);

  items = items.split(',').filter(item => item.trim().length > 0) || [];
  locations = locations.split(',').filter(location => isAvailableLocation(location)) || [];
  locations = locations.map(location => getLocationIdFromLocation(location));
  qualities = qualities.split(',').map(quality => Number(quality)) || [];

  let cursor = await ctx.mongo.db('albion').collection('market_orders').find({
    $and: [
      { ItemId: { $in: items } },
      { LocationId: { $in: locations } },
      { QualityLevel: { $in: qualities } }]
  }, { projection: { _id: 0 } });

  const normalizedData = {};

  // console.log(averageDataObject);

  await cursor.forEach(function (order) {
    const orderKey = generateOrderKey(order.ItemId, order.LocationId, order.QualityLevel);

    if (!normalizedData[orderKey]) {
      normalizedData[orderKey] = {
        itemId: order.ItemId,
        location: getLocationFromLocationId(order.LocationId),
        quality: order.QualityLevel,
        sellPriceMin: 0,
        sellPriceMinDate: "1970-01-01T00:00:00.000Z",
        buyPriceMax: 0,
        buyPriceMaxDate: "1970-01-01T00:00:00.000Z"
      }
    }

    // If the offer price is too high, i.e. more than the average price by 100 times, we discard it and take another one, if any
    if (order.AuctionType == 'offer' &&
      (normalizedData[orderKey].sellPriceMin == 0 ||
        (averageDataObject[order.ItemId].averagePrice > 0 && normalizedData[orderKey].sellPriceMin > averageDataObject[order.ItemId].averagePrice * OVERPRICED_MULTIPLIER) ||
        (order.UnitPriceSilver < normalizedData[orderKey].sellPriceMin && normalizedData[orderKey].sellPriceMinDate - order.UpdatedAt <= 300 * 100) &&
        !(averageDataObject[order.ItemId].averagePrice > 0 && order.UnitPriceSilver > averageDataObject[order.ItemId].averagePrice * OVERPRICED_MULTIPLIER))) {
      normalizedData[orderKey] = {
        ...normalizedData[orderKey],
        sellPriceMin: order.UnitPriceSilver,
        sellPriceMinDate: order.UpdatedAt
      }
    } else if (order.AuctionType == 'request' &&
      (normalizedData[orderKey].buyPriceMax == 0 ||
        (order.UnitPriceSilver > normalizedData[orderKey].buyPriceMax && normalizedData[orderKey].buyPriceMaxDate - order.UpdatedAt <= 300 * 1000))) {

      normalizedData[orderKey] = {
        ...normalizedData[orderKey],
        buyPriceMax: order.UnitPriceSilver,
        buyPriceMaxDate: order.UpdatedAt
      }
    }
  });

  const response = [];

  for (let item of items) {
    for (let location of locations) {
      for (let quality of qualities) {
        const orderKey = generateOrderKey(item, location, quality);

        if (normalizedData[orderKey]) {
          response.push(normalizedData[orderKey]);
        } else {
          response.push({
            itemId: item,
            location: getLocationFromLocationId(location),
            quality: quality,
            sellPriceMin: 0,
            sellPriceMinDate: "1970-01-01T00:00:00.000Z",
            buyPriceMax: 0,
            buyPriceMaxDate: "1970-01-01T00:00:00.000Z"
          });
        }
      }
    }
  }

  ctx.body = response;
});
module.exports = router;