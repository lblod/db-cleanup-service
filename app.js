import { CronJob } from 'cron';
import { app, query } from 'mu';
import CleanupJob from './cleanup-job';

import request from 'request';

/** Schedule export cron job */
const cronFrequency = process.env.PACKAGE_CRON_PATTERN || '*/30 * * * * *';

new CronJob(cronFrequency, function() {
  console.log(`cleanup triggered by cron job at ${new Date().toISOString()}`);
  request.post('http://localhost/cleanup/');
}, null, true);

const performAllCleanups = async function() {
  const jobs = await CleanupJob.findAll();
  for (let job of jobs) {
    await job.execute(); // 1 job at a time, being friendly to the database
  }
};

performAllCleanups();
const isRunning = async function() {
  return false;
};
app.post('/cleanup/', async function( req, res ) {
  try {
    if (await isRunning())
      return res.status(503).end();
    res.status(202).send({status: 202, title: 'processing'});
    performAllCleanups();

  }
  catch(e) {
    console.error(e);
  }
});

