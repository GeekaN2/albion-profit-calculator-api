const workerpool = require('workerpool');
const cron = require('node-cron');
const config = require('../../config');
const { default: axios } = require('axios');
const colors = require('colors/safe');

// create a worker pool using an external worker script
const transportationsPool = workerpool.pool(__dirname + '/transportationsWorker.js', {
  maxWorkers: config.maxTransportationWorkers || 1,
});
const averageWorkerPool = workerpool.pool(__dirname + '/averageDataWorker.js', {
  maxWorkers: 1
});

async function getAvailableServers() {
  const availableServers = (await axios.get(`${config.apiUrl}/servers/available`)).data;

  if (!availableServers) {
    console.log(new Error('No available servers'));
    return [];
  }

  return availableServers;
}

// Every day at 12:00am
cron.schedule('0 0 * * *', async () => {
  console.log('start');
  const availableServers = await getAvailableServers();

  averageWorkerPool
    .proxy()
    .then(function (worker) {
      const promises = [];
      availableServers.forEach((server) => {
        const promise = worker.averageDataWorker(server.id);

        promises.push(promise)
      });

      return Promise.allSettled(promises);
    })
    .then(function (result) {
      console.log('Average workers, done: ' + JSON.stringify(result));
    })
    .catch(function (err) {
      console.error(err);
    })
    .then(function () {
      // averageWorkerPool.terminate(); // terminate all workers when done
    });
});

// Show stats every hour
cron.schedule('0 * * * *', () => {
  console.log('STATS', averageWorkerPool.stats());
});

async function transportationsRunner() {
  let serverIds = [];

  const refetchServers = async () => {
    const availableServers = await getAvailableServers();

    serverIds = availableServers.map(server => server.id);
  }

  const runWorkers = async () => {
    await transportationsPool
      .proxy()
      .then(async function (worker) {
        await refetchServers();
        const promises = [];

        serverIds.forEach(serverId => {
          const promise = worker.transportationsWorker(serverId, false);

          promises.push(promise)
        });

        return Promise.allSettled(promises);
      })
      .then(function (result) {
        const formatResponseValue = (responseValue) => `
Worker for server ${colors.yellow(responseValue.serverId)} finished with:
Processed successfully: ${responseValue.successCounter > 0 ? colors.green(responseValue.successCounter) : colors.red(responseValue.successCounter)}
Processed with errors: ${responseValue.errorsCounter > 0 ? colors.red(responseValue.errorsCounter) : responseValue.errorsCounter}
Worked for: ${colors.green(responseValue.workTime / 1000)} seconds`;

        console.log('Transportation workers: round is over');
        result.forEach(({ value }) => console.log(formatResponseValue(value)));
      })
      .catch(function (err) {
        console.error(err);
      })
      .then(function () {
        runWorkers();
      });
  }

  runWorkers();
}

transportationsRunner();