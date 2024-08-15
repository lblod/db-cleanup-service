import cron from 'node-cron';
import { app, errorHandler } from 'mu';
import CleanupJob from './jobs/cleanup-job';
import { scheduleCleanupJob, runCleanupJob } from './jobs/schedule-cleanup-job';
import { waitForDatabase } from './database-utils';
import * as env from './env';

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

// If a user wants the jobs to be scheduled as the service starts,
// the service first checks if the database is online and proceeds to schedule
// the cleanup jobs.
if (env.SCHEDULE_ON_SERVICE_START) {
  waitForDatabase().then(scheduleAllCleanups);
}

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
    if (cron.getTasks().has(req.query.cronJobID)) {
      const job = cron.getTasks().get(req.query.cronJobID);
      job.stop();
      console.log(`Cronjob with ID: ${req.query.cronJobID} has been disabled.`);
      return res.status(200).send();
    } else {
      console.error(`Cronjob with ID: ${req.query.cronJobID} does not exist.`);
      return res.status(404).send();
    }
  } else {
    console.error('Parameter to be passed has to be called: cronJobID.');
    return res.status(400).send();
  }
});

/*
 * This is the endpoint used to run a single cronjob.
 * Given jobs are currently defined in the database through migrations,
 * this endpoint can be handy to quickly run and debug certain cronjobs without
 * having to update the cron pattern in the database.
 */
app.get('/runCronjob', async function ( req, res ) {
  if (Object.keys(req.query || {}).length > 1 || Object.keys(req.query || {}).length === 0) {
    return res.status(406).send(
      {
        message: `Only one parameter must be passed.`
      }
    );
  }

  if (req.query.cronJobID) {
    const job = await CleanupJob.findJob(req.query.cronJobID);
    if (job) {
      await runCleanupJob(job);
      console.log(`Cronjob with ID: ${job.id} and title: "${job.title}" has been executed.`);
      return res.status(200).send();
    } else {
      console.error(`Cronjob with ID: ${job.id} and title: "${job.title}" does not exist.`);
      return res.status(404).send();
    }
  } else {
    console.error('Parameter to be passed has to be called: cronJobID.');
    return res.status(400).send();
  }
});

app.use(errorHandler);
