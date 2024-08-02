import cron from 'node-cron';
import { Lock } from 'async-await-mutex-lock';

const defaultFrequency = process.env.CRON_PATTERN || '0 20 1 * *' ; // At 20:00 every first day of the month
const lock = new Lock();

/**
 * Schedule a cleanup job with the provided cron pattern.
 *
 * @param {Object} job - The cleanup job
 * @param {string} job.title - The title of the cleanup job
 * @param {string} job.cronPattern - The cron pattern for scheduling the cleanup job
 */
export default function scheduleCleanupJob(job) {
  if (!job.title)
    throw new Error('Cleanup jobs should have a descriptive title.');
  if (!job.cronPattern) {
    console.log(
      `cronPattern not provided for ${job.title} (${job.id}), running on default cronFrequency : ${defaultFrequency}`
    );
    job.cronPattern = defaultFrequency;
  }
  cron.schedule(job.cronPattern, async () => {
    await lock.acquire();
    try {
      await job.execute(); // 1 job at a time to not exhaust the database
    } catch (e) {
      console.error(
        new Error(
          `Something unexpected went wrong while running cleanup job [${
            job.title
          }]. ${JSON.stringify(e, null, 2)}`
        )
      );
    } finally {
      lock.release();
    }
  }, {
    name: job.id
  });
}
