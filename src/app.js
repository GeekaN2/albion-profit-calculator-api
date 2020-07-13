require('dotenv').config();

const Koa = require('koa');
const Router = require('koa-router');
const jwtMiddleware = require('koa-jwt');
const koaBody = require('koa-body');
const config = require('./config');
const mongo = require('koa-mongo');

const userModule = require('./modules/user/user');
const registerModule = require('./modules/register/register');
const authModule = require('./modules/auth/auth');
// const authModule = require('./modules/auth/auth');

function createApp() {
  const app = new Koa();
  const router = new Router();

  router.get('/', ctx => {
    ctx.body = 'ok';
  });

  router.use('/register', registerModule.routes());
  router.use('/auth', authModule.routes());
  router.use(
    jwtMiddleware({
      secret: config.secret,
    })
  );
  router.use('/user', userModule.routes());
  

  app.use(koaBody());
  app.use(mongo({
    uri: config.connection,
    max: 100,
    min: 1
  }));
  app.use(router.allowedMethods());
  app.use(router.routes());
  

  return app;
}

createApp().listen(config.port, () => {
    console.log(`Listening on port ${config.port}`)
});

module.exports = createApp;