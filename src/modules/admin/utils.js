const Router = require('koa-router');
const mongo = require('koa-mongo');

async function isAdmin(userId, ctx) {
    const admin = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId) });

    if (!admin) {
        return {
            isAdmin: false,
            message: 'Admin not found'
        };
    }

    if (admin.role != 'admin') {
        return {
            isAdmin: false,
            message: 'You are not an admin'
        };
    }

    return {
        isAdmin: true
    }
}

async function isSupporter(userId, ctx) {
    const supporter = await ctx.mongo.db('albion').collection('users').findOne({ _id: mongo.ObjectId(userId) });

    if (!supporter) {
        return {
            isSupporter: false,
            message: 'Supporter not found'
        };
    }

    if (supporter.role != 'supporter') {
        return {
            isSupporter: false,
            message: 'You are not supporter'
        };
    }

    return {
        isSupporter: true
    }
}

module.exports = {
    isAdmin,
    isSupporter
}