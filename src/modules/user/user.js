const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');

router.post('/', async ctx => {
  const { id : userId } = ctx.state.user;
  const user = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId) });
  
  if (!user) {
    return;
  }

  ctx.body = {
    nickname: user.nickname
  }
});

module.exports = router;