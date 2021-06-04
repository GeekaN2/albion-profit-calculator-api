const Router = require('koa-router');
const router = new Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { generateRegisterToken, validateRegister, roles } = require('../../utlis');

/**
 * Register user
 */
router.all('/', async (ctx) => {
  const { nickname, password } = ctx.request.body;

  if (!validateRegister(nickname, password)) {
    ctx.status = 200;
    ctx.body = 'Incorrect data format';

    return;
  }

  const user = await ctx.mongo.db('albion').collection('users').findOne({
    nickname: nickname
  });

  if (user === null) {
    await bcrypt.hash(password, 10).then(async function (hash) {
      const result = await ctx.mongo.db('albion').collection('users').insertOne({
        nickname: nickname,
        password: hash,
        role: 'user',
        dtCreated: new Date()
      });
    });

    ctx.body = 'Registered successfully';
  } else {
    ctx.body = 'User already exists';
  }
});

router.post('/add-random-token', async (ctx) => {
  const { secret, role } = ctx.request.body;

  if (secret != config.registerSecret) {
    ctx.body = 'Invalid secret string';

    return;
  }

  if (!roles.includes(role)) {
    ctx.body = 'Invalid role';

    return;
  }

  const tokens = ctx.mongo.db('albion').collection('tokens');
  const hexToken = generateRegisterToken(role);
  const findToken = await tokens.findOne({ token: hexToken });

  if (findToken) {
    ctx.body = 'Token already exists';

    return;
  }

  const result = await tokens.insertOne({ token: hexToken });

  if (JSON.parse(result).ok) {
    ctx.body = hexToken;
  } else {
    ctx.body = 'Token inserting failed';
  }
});

module.exports = router;