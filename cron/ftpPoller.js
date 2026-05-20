const cron = require('node-cron');
const ftpService = require('../services/ftpService');
const settingsService = require('../services/settingsService');

let task = null;

async function start() {
  try {
    const settings = await settingsService.getFtpSettings();
    const minutes = settings.ftp_poll_minutes || 60;
    const expression = `*/${minutes} * * * *`;

    if (task) task.stop();

    task = cron.schedule(expression, async () => {
      console.log(`[FTP Poller] Running import at ${new Date().toISOString()}`);
      const result = await ftpService.runImport(null);
      if (result.success) {
        console.log(`[FTP Poller] Done. Upserted: ${result.upserted}, Deactivated: ${result.deactivated}`);
      } else {
        console.error(`[FTP Poller] Failed: ${result.message}`);
      }
    });

    console.log(`[FTP Poller] Scheduled every ${minutes} minutes.`);
  } catch (err) {
    console.error('[FTP Poller] Setup error:', err.message);
  }
}

function stop() {
  if (task) task.stop();
}

module.exports = { start, stop };
