const rc = require('rc');

module.exports = rc('JWT', {
  port: process.env.PORT || 4000,
  secret: process.env.JWT_SECRET,
  connection: process.env.MONGO_URI,
  register_secret: process.env.REGISTER_SECRET
});