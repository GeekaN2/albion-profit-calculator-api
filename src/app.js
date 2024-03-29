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
const transportationsModule = require('./modules/transportations');
const adminModule = require('./modules/admin');
const utilsModule = require('./modules/utils');
const serversModule = require('./modules/servers');

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
  router.use('/api/transportations', transportationsModule.routes());
  router.use('/api/utils', utilsModule.routes());

  router.use(
    jwtMiddleware({
      secret: config.secret,
      passthrough: true,
    })
  );

  router.use('/api/servers', serversModule.routes());

  router.use(
    jwtMiddleware({
      secret: config.secret,
    })
  );


  router.use('/api/user', userModule.routes());
  router.use('/api/admin', adminModule.routes());

  app.use(koaBody());
  app.use(cors());
  app.use(mongo({
    uri: config.connection,
    max: 100,
    min: 1
  }));
  app.use(router.allowedMethods());
  app.use(router.routes());
  // Custom 401 handling (first middleware)

  return app;
}

createApp().listen(config.port, () => {
  console.log(`Listening on port ${config.port}`)
});

module.exports = createApp;