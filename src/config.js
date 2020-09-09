const rc = require('rc');
require('dotenv').config();

module.exports = rc('config', {
  port: process.env.PORT || 4000,
  secret: process.env.JWT_SECRET,
  connection: process.env.MONGO_URI,
  register_secret: process.env.REGISTER_SECRET,
  registerJwtSecret: process.env.REGISTER_JWT_SECRET,
  testPeriod: 14 * 24 * 60 * 60 * 1000 // two weeks in ms
});