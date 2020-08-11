const { Worker } = require('worker_threads');

/**
 * Run worker
 */
function runService() {
    return new Promise((resolve, reject) => {
    const worker = new Worker('./src/modules/worker/service.js');
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
 * Run worker every midnight
 */
let runAtMidnight = setTimeout(async function tick() {
  await runService().catch(err => console.log('Something went wrong in worker', err));

  const nextDay = (new Date()).setUTCHours(24, 0, 0, 0);

  runAtMidnight = setTimeout(tick, nextDay - Date.now());
}, 0);