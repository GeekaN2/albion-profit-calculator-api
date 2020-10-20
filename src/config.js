const rc = require('rc');
require('dotenv').config();

module.exports = rc('config', {
  port: process.env.PORT || 4000,
  secret: process.env.JWT_SECRET,
  connection: process.env.MONGO_URI,
  registerSecret: process.env.REGISTER_SECRET,
  registerJwtSecret: process.env.REGISTER_JWT_SECRET,
  apiUrl: process.env.DATA_API_URL,
  testPeriod: 14 * 24 * 60 * 60 * 1000 // two weeks in ms
});