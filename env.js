import envvar from 'env-var';

export const SPARQL_ENDPOINT_CLEANUP_OPERATIONS = envvar
  .get('SPARQL_ENDPOINT_CLEANUP_OPERATIONS')
  .default('http://database:8890/sparql')
  .asUrlString();
