const workerpool = require('workerpool');
const cron = require('node-cron');
const config = require('../../config');
const { default: axios } = require('axios');
const colors = require('colors/safe');
const { telegramNotify } = require('../../scripts/telegramNotify');

// create a worker pool using an external worker script
const natsSubscribersPool = workerpool.pool(__dirname + '/natsSubscriber.js');

async function getAvailableServers() {
    const availableServers = (await axios.get(`${config.apiUrl}/servers/available?bypass=${config.availableServersBypass}`)).data;

    if (!availableServers) {
        console.log(new Error('No available servers'));
        return [];
    }

    return availableServers;
}

const runNatsSubscribers = async () => {
    try {
        await natsSubscribersPool.terminate();

        console.log(`${colors.cyan('Rerun nats subscribers')}`)

        const availableServers = await getAvailableServers();

        natsSubscribersPool
            .proxy()
            .then(function (workerpool) {
                availableServers.forEach((server) => {
                    workerpool.natsSubscriber(server.id, server.natsUrl);
                });
            })
            .catch(function (err) {
                console.error(colors.red('🏮 [APC NATS] WORKER POOL IS SHATTERING'), String(err));

                telegramNotify(`
🏮 [APC NATS] WORKER POOL
${err.slice(0, 300)}`);

            });
    } catch (error) {
        console.log('🏮 [APC NATS]', String(error));
        telegramNotify(`
🏮 [APC NATS] ERROR
${error}`);

        // Restart workers on error every 10 seconds
        setTimeout(runNatsSubscribers, 10000)
    }
}

// Every hour rerun
cron.schedule('0 * * * *', runNatsSubscribers);

runNatsSubscribers();