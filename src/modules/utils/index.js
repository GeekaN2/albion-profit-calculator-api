const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');
const bcrypt = require('bcrypt');

router.post('/reset-password', async ctx => {
  const { nickname, password } = ctx.request.body;

  const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });

  if (!user) {
    ctx.body = "User not found";

    return;
  }

  if (!user.resetPassword) {
    ctx.status = 403;

    ctx.body = "Not allowed to reset the password";
  }

  await bcrypt.hash(password, 10).then(async function (hash) {
    await ctx.mongo.db('albion').collection('users').updateOne({ 
      nickname: nickname 
    }, { 
      $set: 
      { 
        password: hash, 
        resetPassword: false
      }
    });
  });

  ctx.body = "Password udpated";
});

module.exports = router;