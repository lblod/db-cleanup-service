import { CronJob } from 'cron';
import { app, errorHandler } from 'mu';
import CleanupJob from './cleanup-job';
import request from 'request';

/** Schedule export cron job */
const cronFrequency = process.env.CRON_PATTERN || '0 5 1 * * *';

new CronJob(cronFrequency, function() {
  console.log(`DB cleanup service triggered by cron job at ${new Date().toISOString()}`);
  request.post('http://localhost/cleanup/');
}, null, true);

const performAllCleanups = async function() {
  const jobs = await CleanupJob.findAll();
  for (let job of jobs) {
    await job.execute(); // 1 job at a time, being friendly to the database
  }
};

const isRunning = async function() {
  return false;
};

app.post('/cleanup/', async function( req, res, next ) {
  try {
    if (await isRunning())
      return res.status(503).end();
    performAllCleanups();
    return res.status(202).send({status: 202, title: 'processing'});
  }
  catch(e) {
    console.error(e);
    return next(new Error(e.message));
  }
});

app.use(errorHandler);
