const { Worker } = require('worker_threads');

/**
 * Run worker which will get average data for all items
 */
function runWorker(workerPath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath);

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }

      resolve();
    })
  })
}


/**
 * Run average data worker every midnight
 */
/*let runAtMidnight = setTimeout(async function tickMidnight() {
  await runWorker('./src/modules/worker/averageDataWorker.js').catch(err => console.log('Something went wrong in average data worker', err));

  const nextDay = (new Date()).setUTCHours(24, 0, 0, 0);

  runAtMidnight = setTimeout(tickMidnight, nextDay - Date.now());
}, 0);*/

/**
 * Run transportations worker every 5 minutes
 */
let runEvery5Minutes = setTimeout(async function tick5Minutes() {
  await runWorker('./src/modules/worker/transportationsWorker.js').catch(err => console.log('Something went wrong in transportaions worker', err));

  runEvery5Minutes = setTimeout(tick5Minutes, 5 * 60 * 1000);
}, 0);