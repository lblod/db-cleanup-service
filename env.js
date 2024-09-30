import envvar from 'env-var';

export const MU_SPARQL_ENDPOINT = envvar
  .get('MU_SPARQL_ENDPOINT')
  .default('http://database:8890/sparql')
  .asUrlString();

export const MU_APPLICATION_GRAPH = envvar
  .get('MU_APPLICATION_GRAPH')
  .default('http://mu.semte.ch/graphs/public')
  .asUrlString();

export const CRON_PATTERN = envvar
  .get('CRON_PATTERN')
  .default('0 20 1 * *') // At 20:00 every first day of the month
  .asString();

export const PING_DB_INTERVAL = envvar
  .get('PING_DB_INTERVAL')
  .default(2) // 2 milliseconds
  .asInt();

export const SCHEDULE_ON_SERVICE_START = envvar
  .get('SCHEDULE_ON_SERVICE_START')
  .default('true')
  .asBool();
