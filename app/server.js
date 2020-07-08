const koa = require('koa');
const koaBody = require('koa-body');
const router = require('./router');

const app = new koa();  

app.use(koaBody());
app.use(router.routes());
app.use(router.allowedMethods());


app.listen(3000, () => {
  console.log('Listen http://localhost:3000');
});