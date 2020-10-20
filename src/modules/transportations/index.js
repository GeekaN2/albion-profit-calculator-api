const Router = require('koa-router');
const axios = require('axios');
const router = new Router();
const config = require('../../config');
const { isAvailableLocation, getLocationIdFromLocation } = require('../../utlis');

/**
 * Returns the best routes between all locations for one item 
 */
router.get('/', async (ctx) => {
  let { items = 'T4_BAG', locations = 'Caerleon', qualities = '1' } = ctx.request.query;

	items = items.split(',').filter(item => item.trim().length > 0);
  locations = locations.split(',').filter(location => isAvailableLocation(location));
  qualities = qualities.split(',').map(quality => Number(quality));

  let itemsData = (await axios.get(`${config.apiUrl}/data?items=${items.join()}&locations=${locations.join()}&qualities=${qualities.join()}`)).data;
  console.log(itemsData);

	ctx.body = itemsData;
});

module.exports = router;