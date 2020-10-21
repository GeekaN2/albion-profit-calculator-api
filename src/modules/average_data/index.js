const Router = require('koa-router');
const router = new Router();
const { isAvailableLocation } = require('../../utlis');

/**
 * Returns average data for requested items: 
 * Average price and average number of items sold per day
 */
router.get('/', async (ctx) => {
  let { items, locations } = ctx.request.query;
  
  items = items.split(',').filter(item => item.trim().length > 0);
  locations = locations.split(',').filter(location => isAvailableLocation(location));

  const cursor = await ctx.mongo.db('albion').collection('average_data').find({
    $and: [
      { itemName: { $in: items } },
      { location: { $in: locations } }]
  }, { projection: { _id: 0 } }).toArray();

  let normalizedData = {};

  await cursor.forEach(function (item) {
    const itemKey = `${item.itemName}:${item.location}`;

    if (!normalizedData[itemKey]) {
      normalizedData[itemKey] = item;
    }
  });

  for (let itemName of items) {
    for (let location of locations) {
      const itemKey = `${itemName}:${location}`;

      if (!normalizedData[itemKey]) {
        normalizedData[itemKey] = {
          itemName,
          location,
          averageItems: 0,
          averagePrice: 0,
          firstCheckDate: new Date(0),
          lastCheckDate: new Date(0)
        }
      }
    }
  }
  
  
  normalizedData = Object.values(normalizedData);

  ctx.body = normalizedData;
});

module.exports = router;