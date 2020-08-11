const rc = require('rc');
require('dotenv').config();

module.exports = rc('JWT', {
  port: process.env.PORT || 4000,
  secret: process.env.JWT_SECRET,
  connection: process.env.MONGO_URI,
  register_secret: process.env.REGISTER_SECRET
});