import envvar from 'env-var';

export const SPARQL_ENDPOINT = envvar
  .get('SPARQL_ENDPOINT')
  .default('http://database:8890/sparql')
  .asUrlString();

export const PING_DB_INTERVAL = envvar
  .get('PING_DB_INTERVAL')
  .default(2) // 2 milliseconds
  .asInt();
