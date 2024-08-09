import cron from 'node-cron';
import { app, errorHandler } from 'mu';
import CleanupJob from './jobs/cleanup-job';
import scheduleCleanupJob from './jobs/schedule-cleanup-job';
import { waitForDatabase } from './database-utils';

const scheduleAllCleanups = async function() {
  const jobs = await CleanupJob.findAll();
  for (let job of jobs) {
    console.log(`Scheduling job with ID: ${job.id}, entitled: "${job.title}"`);
    scheduleCleanupJob(job);
  }
};

const disableCronjobs = async function() {
  const jobs = cron.getTasks();
  for (const [jobId, job] of jobs) {
    job.stop();
    console.log(`Stopped cronjob with ID: ${jobId}`);
  }
};

waitForDatabase().then(scheduleAllCleanups);

app.post('/cleanup', async function( req, res, next ) {
  try {
    await scheduleAllCleanups();
    return res.status(201).send();
  }
  catch(e) {
    console.error(e);
    return next(new Error(e.message));
  }
});

/*
 * This is endpoint used to disable all scheduled cronjob. It can be useful
 * if the cronjobs need to be updated or disabled based on requirements.
 */
app.post('/disableCronjobs', async function( req, res, next ) {
  try {
    await disableCronjobs();
    return res.status(200).send();
  }
  catch(e) {
    console.error(e);
    return next(new Error(e.message));
  }
});

/*
 * This is the endpoint used to disable a single cronjob.
 */
app.get('/disableCronjob', async function ( req, res ) {
  if (Object.keys(req.query || {}).length > 1 || Object.keys(req.query || {}).length === 0) {
    return res.status(406).send(
      {
        message: `Only one parameter must be passed.`
      }
    );
  }

  if (req.query.cronJobID) {
    console.log(`Cronjob to be disabled has the following ID: ${req.query.cronJobID}`);
    const job = cron.getTasks().get(req.query.cronJobID);
    job.stop();
    console.log(`Cronjob with ID: ${req.query.cronJobID} has been disabled.`);
    return res.status(200).send();
  }
});

app.use(errorHandler);
