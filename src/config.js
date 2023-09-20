const rc = require('rc');
require('dotenv').config();

module.exports = rc('config', {
  port: process.env.PORT || 4000,
  secret: process.env.JWT_SECRET,
  connection: process.env.MONGO_URI,
  registerSecret: process.env.REGISTER_SECRET,
  registerJwtSecret: process.env.REGISTER_JWT_SECRET,
  apiUrl: process.env.DATA_API_URL,
  maxTransportationWorkers: Number(process.env.MAX_TRANSPORTATION_WORKERS),
  maxParallelTransportationWorkerRequests: Number(process.env.MAX_PARALLEL_TRANSPORTATION_WORKER_REQUESTS),
  testPeriod: 14 * 24 * 60 * 60 * 1000, // two weeks in ms
  notifyWebhook: process.env.NOTIFY_WEBHOOK,
  availableServersBypass: process.env.AVAILABLE_SERVERS_BYPASS,
});