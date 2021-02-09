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
  const { nickname, password, registerToken } = ctx.request.body;

  if (!validateRegister(nickname, password, registerToken)) {
    ctx.status = 200;
    ctx.body = 'Incorrect data format';

    return;
  }

  const token = await ctx.mongo.db('albion').collection('tokens').findOne({
    token: registerToken
  });

  if (token === null) {
    ctx.body = 'Bad register token';

    return;
  }

  const decodedToken = jwt.verify(token.token, config.registerJwtSecret);

  const user = await ctx.mongo.db('albion').collection('users').findOne({
    nickname: nickname
  });

  if (user === null) {
    await bcrypt.hash(password, 10).then(async function (hash) {
      const result = await ctx.mongo.db('albion').collection('users').insertOne({
        nickname: nickname,
        password: hash,
        role: decodedToken.role,
        dtCreated: new Date()
      });
      const deletedToken = await ctx.mongo.db('albion').collection('tokens').deleteOne({ token: registerToken });
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