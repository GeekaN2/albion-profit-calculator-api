const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');
const bcrypt = require('bcrypt');

router.post('/reset-password', async ctx => {
  const { nickname, password } = ctx.request.body;

  if (!nickname || !password) {
    ctx.body = 'Nickname and password cannot be empty';
  }

  const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });

  if (!user) {
    ctx.body = "User not found";

    return;
  }

  if (!user.resetPassword) {
    ctx.body = "Not allowed to reset the password";

    return;
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

  ctx.body = "Password updated";
});

module.exports = router;