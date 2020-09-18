require('dotenv').config();

const Koa = require('koa');
const Router = require('koa-router');
const jwtMiddleware = require('koa-jwt');
const koaBody = require('koa-body');
const config = require('./config');
const mongo = require('koa-mongo');
const cors = require('@koa/cors');

const userModule = require('./modules/user');
const registerModule = require('./modules/register');
const authModule = require('./modules/auth');
const averageDataModule = require('./modules/average_data');
const dataModule = require('./modules/data');

function createApp() {
  const app = new Koa();
  const router = new Router();

  router.get('/api', ctx => {
    ctx.body = 'ok';
  });

  router.use('/api/register', registerModule.routes());
  router.use('/api/auth', authModule.routes());
  router.use('/api/average_data', averageDataModule.routes());
  router.use('/api/data', dataModule.routes());

  router.use(
    jwtMiddleware({
      secret: config.secret,
    })
  );
  router.use('/api/user', userModule.routes());
  
  app.use(koaBody());
  app.use(cors());
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