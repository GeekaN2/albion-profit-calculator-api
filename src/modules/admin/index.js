const Router = require('koa-router');
const router = new Router();
const mongo = require('koa-mongo');
const { roles } = require('../../utlis');

/**
 * Allow user to reset their password 
 */
router.post('/allow-reset-password', async ctx => {
  const { id: userId } = ctx.state.user;
  const { nickname } = ctx.request.body;

  const admin = await isAdmin(userId, ctx);

  if (!admin.isAdmin) {
    ctx.body = admin.message;

    return;
  }

  const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });
  
  if (!user) {
    ctx.body = 'User not found';

    return;
  }

  await ctx.mongo.db('albion').collection('users').updateOne({
    nickname: nickname
  }, {
    $set: {
      resetPassword: true
    }
  })

  ctx.body = `${nickname} user allowed to change password`;
});

/**
 * Change user role
 */
router.post('/change-role', async ctx => {
  const { id: userId } = ctx.state.user;
  const { nickname, role } = ctx.request.body;

  if (!roles.includes(role)) {
    ctx.body = 'Invalid role';

    return;
  }

  const admin = await isAdmin(userId, ctx);

  if (!admin.isAdmin) {
    ctx.body = admin.message;

    return;
  }
  
  const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });
  
  if (!user) {
    ctx.body = 'User not found';

    return;
  }

  if (user.role == 'admin') {
    ctx.body = 'You can\'t change admin role';

    return;
  }

  await ctx.mongo.db('albion').collection('users').updateOne({ 
    nickname: nickname
  }, {
    $set: {
      role: role
    }
  });

  ctx.body = {
    role: role,
    message: 'User role changed'
  }
});

/**
 * Get possible user roles
 */
router.get('/roles', async ctx => {
  ctx.body = roles;
});

router.get('/users', async ctx => {
  let users = await ctx.mongo.db('albion').collection('users').find({}).toArray();

  users = users.map(user => {
    return {
      nickname: user.nickname,
      role: user.role,
      resetPassword: user.resetPassword || false
    }
  })

  ctx.body = users;
});

async function isAdmin(userId, ctx) {
  const admin = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId)});

  if (!admin) {
    return {
      isAdmin: false,
      message: 'Admin not found'
    };
  }

  if (admin.role != 'admin') {
    return  {
      isAdmin: false,
      message: 'You are not an admin'
    };
  }

  return {
    isAdmin: true
  }
}

module.exports = router;