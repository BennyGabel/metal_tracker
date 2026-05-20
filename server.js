const app = require('./app');
const { sequelize } = require('./models');
const ftpPoller = require('./cron/ftpPoller');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    ftpPoller.start();
    app.listen(PORT, () => {
      console.log(`Metal Tracker running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
