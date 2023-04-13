const Router = require('koa-router');
const router = new Router();
const { getServers } = require('../../utlis');

/**
 * Return game servers configured in the database
 * Various NATS connections to which users send their data to then get at the frontend
 */
router.get('/', async (ctx) => {
  ctx.body = getServers();
});

module.exports = router;