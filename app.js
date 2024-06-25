import cron from 'node-cron';
import { app, errorHandler } from 'mu';
import CleanupJob from './jobs/cleanup-job';
import request from 'request';
import scheduleCleanupJob from './jobs/schedule-cleanup-job';

/** Schedule export cron job */
const cronFrequency = process.env.CRON_PATTERN || '0 5 1 * * *';

cron.schedule(cronFrequency, function() {
  console.log(`DB cleanup service triggered by cron job at ${new Date().toISOString()}`);
  request.post('http://localhost/cleanup/');
});

const performAllCleanups = async function() {
  const jobs = await CleanupJob.findAll();
  for (let job of jobs) {
    scheduleCleanupJob(job);
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
