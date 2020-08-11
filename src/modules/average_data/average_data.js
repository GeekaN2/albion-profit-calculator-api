const Router = require('koa-router');
const router = new Router();
const { isAvailableLocation } = require('../../utlis');

/**
 * Returns average data for requested items: 
 * Average price and average number of items sold per day
 */
router.get('/', async (ctx) => {
	const query = ctx.request.query;
	const items = query.items.split(',').filter(item => item.trim().length > 0);
	const locations = query.locations.split(',').filter(location => isAvailableLocation(location));

	const results = await ctx.mongo.db('albion').collection('average_data').find({
		$and: [
			{ itemName: { $in: items } },
			{ location: { $in: locations } }]
	}, { projection: { _id: 0 } }).toArray();

	ctx.body = results;
});

module.exports = router;