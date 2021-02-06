const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');

router.post('/allow-reset-password', async ctx => {
  const { id: userId } = ctx.state.user;
  const { nickname } = ctx.request.body;

  const admin = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId)});

  if (!admin) {
    ctx.body = "Admin not found";

    return;
  }

  if (admin.role != 'admin') {
    ctx.body = "You are not an admin";

    return;
  }

  const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });
  
  if (!user) {
    ctx.body = "User not found";

    return;
  }

  const setResetPassword = await ctx.mongo.db('albion').collection('users').updateOne({
    nickname: nickname
  }, {
    $set: {
      resetPassword: true
    }
  })

  ctx.body = `${nickname} user allowed to change password`;
});

module.exports = router;