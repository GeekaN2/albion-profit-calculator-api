const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');
const koaBody = require('koa-body');
const bcrypt = require('bcrypt');

router.use(mongo({
  uri: 'mongodb://localhost:27017/?readPreference=primary&ssl=false',
  max: 100,
  min: 1
}));

/**
 * Layout
 */
router.all('/', async (ctx) => {
  ctx.body = 'Main page';
});

router.get('/add-random-token', async (ctx) => {
  const tokens = ctx.mongo.db('albion').collection('tokens');
  
  const token = await tokens.findOne({ token: 'omega_hard_token_lul'});

  if (token === null) {
    const result = await tokens.insertOne({ token: 'omega_hard_token_lul'});
    console.log(JSON.parse(result).ok);
    ctx.body = 'Token inserted';
  } else {
    ctx.body = 'Token already exists';
  }
  
  
})

router.post('/register', async (ctx) => {
  const {nickname, password, registerToken} = ctx.request.body;

  if (!validate(nickname, password, registerToken)) {
    ctx.status = 200;
    ctx.body = 'Incorrect data format';
  } else {
    const token = await ctx.mongo.db('albion').collection('tokens').findOne({ token: registerToken });
    console.log(token);

    if (token === null) {
      ctx.body = 'Bad register token';
    } else {
      const user = await ctx.mongo.db('albion').collection('users').findOne({ name: nickname });

      if (user === null) {
        bcrypt.hash(password, 10).then(function(hash) {
          const result = ctx.mongo.db('albion').collection('users').insert({name: nickname, password: hash});
          const deletedToken = ctx.mongo.db('albion').collection('tokens').remove({ token: registerToken });
        });

        ctx.body = 'Registered successfully';
      } else {
        ctx.body = 'User already exists';
      }
    }
  }
});

/**
 * @param {(string | undefined)[]} data - array of string to validate
 */
function validate(...data) {
  return data.every((elem) => {
    return elem != undefined && elem.trim() != '';
  });
}

module.exports = router;