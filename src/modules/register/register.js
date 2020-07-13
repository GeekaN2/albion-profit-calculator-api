const Router = require('koa-router');
const router = new Router();
const bcrypt = require('bcrypt');
const { generateRandomRegisterToken, validateRegister } = require('../../utlis');

/**
 * Register user
 */
router.all('/', async (ctx) => {
    const {nickname, password, registerToken} = ctx.request.body;

    if (!validateRegister(nickname, password, registerToken)) {
      ctx.status = 200;
      ctx.body = 'Incorrect data format';

      return;
    }

    const token = await ctx.mongo.db('albion').collection('tokens').findOne({ token: registerToken });
    console.log(token);

    if (token === null) {
      ctx.body = 'Bad register token';

      return;
    }
      
    const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });

    if (user === null) {
      bcrypt.hash(password, 10).then(function(hash) {
        const result = ctx.mongo.db('albion').collection('users').insert({ nickname: nickname, password: hash});
        const deletedToken = ctx.mongo.db('albion').collection('tokens').remove({ token: registerToken });
      });

      ctx.body = 'Registered successfully';
    } else {
      ctx.body = 'User already exists';
    }
});

router.get('/add-random-token', async (ctx) => {
  const tokens = ctx.mongo.db('albion').collection('tokens');
  const hexToken = generateRandomRegisterToken();
  const findToken = await tokens.findOne({ token: hexToken});

  if (findToken) {
    ctx.body = 'Token already exists';

    return;
  }

  const result = await tokens.insertOne({ token: hexToken});

  if (JSON.parse(result).ok) {
    ctx.body = 'Token inserted';
  } else {
    ctx.body = 'Token inserting failed';
  }  
})

module.exports = router;