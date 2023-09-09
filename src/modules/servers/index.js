const Router = require('koa-router');
const router = new Router();
const { getServers, getDbByServerId } = require('../../utlis');
const { isSupporter } = require('../admin/utils');
const mongo = require('koa-mongo');

/**
 * Return game servers configured in the database
 * Various NATS connections to which users send their data to then get at the frontend
 */
router.get('/', async (ctx) => {
  ctx.body = getServers();
});

router.get('/available', async (ctx) => {
  let cursor = ctx.mongo.db('albion').collection('servers').find({})
  let servers = await cursor.toArray();

  ctx.body = servers;
})

router.put('/create', async (ctx, next) => {
  const user = ctx.state.user;

  console.log(ctx.state);
  if (!user || !user.id) {
    ctx.body = 'No user logged in';
    ctx.status = 400;
    return;
  }

  const userId = ctx.state.user.id;
  const serverData = ctx.request.body;

  const supporter = await isSupporter(userId, ctx);

  if (!supporter.isSupporter) {
    ctx.body = supporter.message;
    ctx.status = 403;
    return;
  }

  const id = String(serverData.id);
  const description = String(serverData.description);
  const natsUrl = String(serverData.natsUrl);
  const state = String(serverData.state);
  const healthCheckUrl = String(serverData.healthCheckUrl);

  if (!id || !description || !natsUrl || !state) {
    ctx.body = 'Not enough params. id, description, natsUrl, state are required';
    ctx.status = 400;

    return;
  }

  let response = await ctx.mongo.db('albion').collection('servers').insertOne({
    id,
    description,
    natsUrl,
    state,
    healthCheckUrl,
    access: [],
    creatorId: mongo.ObjectId(userId),
  });

  console.log('Resp?', response);

  ctx.body = 'ok';

  // TODO: add server to DB
})

module.exports = router;