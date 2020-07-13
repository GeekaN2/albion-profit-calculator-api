const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const { v4 : uuid } = require('uuid');
const config = require('../../config');
const { compareSync } = require('bcrypt');
const jwtMiddleware = require('koa-jwt');

const router = new Router();

router.post('/login', async ctx => {
	const { nickname, password } = ctx.request.body;
	// ctx.body = `${nickname} : ${password}`;

	const user = await ctx.mongo.db('albion').collection('users').findOne({ nickname: nickname });

	if (!user || !compareSync(password, user.password)) {
		ctx.body = 'Nickname or password are incorrect';

		return;
	}

	const refreshToken = uuid();
	const insertNewToken = await ctx.mongo.db('albion').collection('refresh_tokens').insertOne({ userId: user._id.toString(), token: refreshToken });

	ctx.body = {
		token: jwt.sign({ id: user._id }, config.secret, { expiresIn: '15min' }),
		refreshToken: refreshToken
	};
});

router.post('/refresh', async ctx => {
	const { refreshToken } = ctx.request.body;
	const dbToken = await ctx.mongo.db('albion').collection('refresh_tokens').findOne({ token: refreshToken });
	
	if (!dbToken) {
		ctx.status = 404;
		return;
	}

	const removeOldToken = await ctx.mongo.db('albion').collection('refresh_tokens').removeOne({ token: refreshToken });

	const newRefreshToken = uuid();
	const insertNewToken = await ctx.mongo.db('albion').collection('refresh_tokens').insertOne({ userId: dbToken.userId, token: newRefreshToken });

	ctx.body = {
		token: jwt.sign({ id: dbToken.userId }, config.secret, { expiresIn: '15min' }),
		refreshToken: newRefreshToken
	}
})

router.post('/logout', jwtMiddleware({ secret: config.secret }), async ctx => {
	const { id: userId } = ctx.state.user;

	const removeAllRefreshTokens = await ctx.mongo.db('albion').collection('refresh_tokens').remove({ userId: userId });

	ctx.body = {
		success: true
	};
})

module.exports = router;