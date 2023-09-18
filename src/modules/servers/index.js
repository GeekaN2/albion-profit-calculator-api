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
  const userId = ctx.state && ctx.state.user && ctx.state.user.id;
  let userNickname = '';

  if (userId) {
    const user = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId) });
    
    if (user) {
      userNickname = user.nickname;
    }
  }

  let serversRequest = {
    state: 'public'
  }

  if (userId && userNickname) {
    serversRequest = {
      $or: [{
        state: 'public'
      }, {
        access: {
          $in: [{
            type: 'user',
            nickname: userNickname
          }]
        }
      }, {
        creatorId: mongo.ObjectId(userId)
      }]
    }
  }

  let cursor = ctx.mongo.db('albion').collection('servers').find(serversRequest, { projection: { _id: 0 } })
  let servers = await cursor.toArray();

  ctx.body = servers;
})

router.put('/create', async (ctx) => {
  const userId = ctx.state && ctx.state.user && ctx.state.user.id;

  if (!userId) {
    ctx.body = 'No user logged in';
    ctx.status = 400;
    return;
  }

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

router.patch('/update', async (ctx) => {
  const userId = ctx.state && ctx.state.user && ctx.state.user.id;

  if (!userId) {
    ctx.body = 'No user logged in';
    ctx.status = 400;
    return;
  }

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
  const access = Array(serverData.access);

  const server = await ctx.mongo.db('albion').collection('servers').findOne({
    id
  });

  if (!server) {
    ctx.body = 'There is no server with such id';
    ctx.status = 400;

    return;
  }

  if (!description || !natsUrl || !state || !healthCheckUrl || !access) {
    ctx.body = 'Not enough params. id, description, natsUrl, state, healthCheckUrl, access are required';
    ctx.status = 400;

    return;
  }

  const response  = await ctx.mongo.db('albion').collection('servders').updateOne({
    id
  }, {
    description,
    natsUrl,
    state,
    healthCheckUrl,
    access,
  });

  ctx.body = {
    id,
    description,
    natsUrl,
    state,
    healthCheckUrl,
    access,
  }
})

module.exports = router;