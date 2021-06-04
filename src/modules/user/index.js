const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');

router.get('/', async ctx => {
  const { id: userId } = ctx.state.user;
  const user = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId) });
  
  if (!user) {
    return;
  }

  ctx.body = {
    nickname: user.nickname,
    role: user.role
  }
});

router.put('/tree-settings', async ctx => {
  const { id: userId } = ctx.state.user;
  const settings = ctx.request.body;

  await ctx.mongo.db('albion').collection('user_settings').updateOne({ userId: mongo.ObjectId(userId) }, { $set: { treeSettings: settings }}, { upsert: true });

  ctx.body = 'User settings updated'
})

router.get('/tree-settings', async ctx => {
  const { id: userId } = ctx.state.user;

  const settings = await ctx.mongo.db('albion').collection('user_settings').findOne({ userId: mongo.ObjectId(userId)});
  
  if (!settings) {
    ctx.body = {};

    return;
  }

  ctx.body = settings.treeSettings || {};
});

module.exports = router;