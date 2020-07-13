const Router = require('koa-router');

const router = new Router();

router.post('/', async ctx => {
  const { nickname } = ctx.request.body; // there will be jwt.nickname or smth like that
  ctx.body = {
    nickname: nickname
  };
});

router.get('/:id', async ctx => {
  ctx.body = ctx.params.id;
});

module.exports = router;