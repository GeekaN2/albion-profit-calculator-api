module.exports = {
  async up(db, client) {
    const freemiumDate = new Date("2021-02-10T18:30:00");

    await db.collection('users').updateMany({ 
      dtCreated: { $lt: freemiumDate },
      role: 'user'
    }, {
      $set: {
        role: 'supporter'
      }
    });
  },

  async down(db, client) {
    const freemiumDate = new Date("2021-02-10T18:30:00");

    await db.collection('users').updateMany({ 
      dtCreated: { $lt: freemiumDate },
      role: 'supporter'
    }, {
      $set: {
        role: 'user'
      }
    });
  }
};
