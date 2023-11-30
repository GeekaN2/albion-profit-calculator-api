const servers = require('../servers.json'); // eslint-disable-line node/no-unpublished-require

module.exports = {
    async up(db, client) {
        if (!servers) {
            return;
        }

        const enhancedServers = servers.map(server => ({
            id: server.id,
            name: server.id,
            description: server.description,
            natsUrl: server.natsUrl,
            healthCheck: server.healthCheck,
            state: 'public'
        }))

        db.collection('servers').insertMany(enhancedServers);
    },

    async down(db, client) {
        if (!servers) {
            return;
        }

        db.collection('servers').deleteMany({
            id: { $in: servers.map(server => server.id) }
        });
    }
};
