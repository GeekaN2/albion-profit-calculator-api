const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const config = require('../../config');
const { compareSync } = require('bcrypt');
const mongo = require('koa-mongo');
const jwtMiddleware = require('koa-jwt');
const { generateRefreshToken, generateAccessToken } = require('../../utlis');

const router = new Router();

router.post('/login', async ctx => {
  const { nickname, password } = ctx.request.body;
  const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });

  if (!user || !compareSync(password, user.password)) {
    ctx.body = 'Nickname or password are incorrect';

    return;
  }

  if (user.role == 'tester' && new Date(user.dtCreated) < new Date(new Date() - config.testPeriod)) {
    ctx.body = 'The test account has expired';

    await ctx.mongo.db('albion').collection('testers_history').insertOne(user);
    await ctx.mongo.db('albion').collection('users').deleteOne({ _id: user._id });

    return;
  }

  const refreshToken = generateRefreshToken(user._id.toString());

  // Insert new refresh token
  await ctx.mongo.db('albion').collection('refresh_tokens').insertOne(refreshToken);

  ctx.body = {
    token: generateAccessToken(user._id.toString()),
    refreshToken: refreshToken.token
  };
});

router.post('/refresh', async ctx => {
  const { refreshToken } = ctx.request.body;
  const dbToken = await ctx.mongo.db('albion').collection('refresh_tokens').findOne({ token: refreshToken });

  if (!dbToken) {
    ctx.status = 404;
    return;
  }

  // Remove previous token
  await ctx.mongo.db('albion').collection('refresh_tokens').deleteOne({ token: refreshToken });

  const newRefreshToken = generateRefreshToken(dbToken.userId);

  // Insert new refresh token
  await ctx.mongo.db('albion').collection('refresh_tokens').insertOne(newRefreshToken);

  ctx.body = {
    token: generateAccessToken(dbToken.userId),
    refreshToken: newRefreshToken.token
  }

  ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(dbToken.userId) }).then(user => {
    if (user.role == 'tester' && user.dtCreated && new Date(user.dtCreated) < new Date(new Date() - config.testPeriod)) {
      ctx.mongo.db('albion').collection('testers_history').insertOne(user);
      ctx.mongo.db('albion').collection('users').deleteOne({ _id: user._id });
    }
  });
})

router.post('/logout', jwtMiddleware({ secret: config.secret }), async ctx => {
  const { id: userId } = ctx.state.user;

  // Remove all refresh tokens
  await ctx.mongo.db('albion').collection('refresh_tokens').deleteMany({ userId: userId });

  ctx.body = {
    success: true
  };
})

module.exports = router;
