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

module.exports = router;