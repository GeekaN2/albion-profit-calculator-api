const config = require('../config');
const axios = require('axios');

function telegramNotify(message) {
    if (!config.notifyWebhook) {
        return;
    }

    const params = new URLSearchParams();
    params.append('message', message);

    axios.post(config.notifyWebhook, params)   
}

module.exports = {
    telegramNotify,
}