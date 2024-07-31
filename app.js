import cron from 'node-cron';
import { app, errorHandler } from 'mu';
import CleanupJob from './jobs/cleanup-job';
import scheduleCleanupJob from './jobs/schedule-cleanup-job';

const performAllCleanups = async function() {
  const jobs = await CleanupJob.findAll();
  for (let job of jobs) {
    console.log(`Creating cronjob with ID: ${job.id}`);
    scheduleCleanupJob(job);
  }
};

const disableCronjobs = async function() {
  const jobs = cron.getTasks();
  for (const [jobId, job] of jobs) {
    job.stop();
    console.log(`Stopped cronjob with ID: ${jobId}`);
  }
}

app.post('/cleanup', async function( req, res, next ) {
  try {
    await performAllCleanups();
    return res.status(202).send({status: 202, title: 'processing'});
  }
  catch(e) {
    console.error(e);
    return next(new Error(e.message));
  }
});

/*
 * This is endpoint used to disable all scheduled cron jobs. It is needed
 * in case the jobs need to be updated or
 */
app.post('/disableCronjobs', async function( req, res, next ) {
  try {
    await disableCronjobs();
    return res.status(202).send({status: 202, title: 'processing'});
  }
  catch(e) {
    console.error(e);
    return next(new Error(e.message));
  }
});

app.use(errorHandler);
