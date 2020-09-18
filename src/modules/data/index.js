const Router = require('koa-router');
const router = new Router();
const { isAvailableLocation } = require('../../utlis');

/**
 * Returns data for requested items
 */
router.get('/', async (ctx) => {
  let { items = '', locations = '', qualities = '1,2,3,4,5'} = ctx.request.query;

  items = items.split(',').filter(item => item.trim().length > 0) || [];
  locations = locations.split(',').filter(location => isAvailableLocation(location)) || [];
  qualities = qualities.split(',').map(quality => Number(quality)) || [];
  
  let cursor = await ctx.mongo.db('albion').collection('items_data').find({
    $and: [
      { itemId: { $in: items } },
      { location: { $in: locations } },
      { quality: { $in: qualities } }]
  }, { projection: { _id: 0 } });

  const normalizedData = {};

  await cursor.forEach(function(doc) {
    const individualName = `${doc.itemId}:${doc.location}:${doc.quality}`;

    normalizedData[individualName] = {
      itemId: doc.itemId,
      location: doc.location,
      quality: doc.quality,
      sellPrice: doc.sellPrice || 0,
      sellPriceDate: doc.sellPriceDate || new Date(0),
      buyPrice: doc.buyPrice || 0,
      buyPriceDate: doc.buyPriceDate || new Date(0)
    }
  });

  const response = [];

  for (let item of items) {
    for (let location of locations) {
      for (let quality of qualities) {
        const individualName = `${item}:${location}:${quality}`;

        if (normalizedData[individualName]) {
          response.push(normalizedData[individualName]);
        } else {
          response.push({
            itemId: item,
            location: location,
            quality: quality,
            sellPrice: 0,
            sellPriceDate: "1970-01-01T00:00:00.000Z",
            buyPrice: 0,
            buyPriceDate: "1970-01-01T00:00:00.000Z"
          });
        }
      }
    }
  }
  
  ctx.body = response;
});

module.exports = router;