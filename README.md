# db-cleanup-service

Microservice that removes resources matching requirements specified in the configuration.

## Installation

To add the service to your stack, add the following snippet to `docker-compose.yml`:

```yaml
services:
  dbcleanup:
    image: lblod/db-cleanup-service
```

## Configuration

The cleanup service will execute cleanup jobs that are specified in the SPARQL endpoint. Each job should have the type `cleanup:Job` and at least the following properties:

- `mu:uuid`: an identifier for the job, typically the last part of its URI
- `dcterms:title`: a title describing the job
- `cleanup:selectPattern`: the pattern to match; resource to be deleted should be named `?resource`. This is used in COUNT queries and the cleanup query (a delete...where query)
- `cleanup:deletePattern`: the pattern to be deleted
- `cleanup:cronPattern` (optional): a cron pattern to schedule the job execution. If not provided, the default pattern will be used.

These jobs are located in `http://mu.semte.ch/graphs/public` graph, and additional migrations can be added to the migration folder of your stack or directly through your SPARQL editor.

For example:

```sparql
PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
PREFIX mu: <http://mu.semte.ch/vocabularies/ext/cleanup/>
PREFIX dcterms: <http://purl.org/dc/terms/>

:job a cleanup:Job;
     mu:uuid "10724bc2-c9d0-4a35-a499-91a8b7cb023b";
     dcterms:title "clean up dangling file uploads";
     cleanup:selectPattern """
              GRAPH <http://mu.semte.ch/graphs/public> {
              ?resource a <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject>;
              ?p ?o;
              <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?source;
              <http://purl.org/dc/terms/modified> ?modified.
              ?source ?sourcep ?sourceo. }
              BIND(NOW() - xsd:dayTimeDuration("P1D") AS ?oneDayAgo)
              FILTER(?modified <= ?oneDayAgo)
              FILTER(NOT EXISTS { ?foo <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#hasPart> ?resource})
              """;
     cleanup:deletePattern """
              GRAPH <http://mu.semte.ch/graphs/public> {
              ?resource ?p ?o.
              ?source ?sourcep ?sourceo. }
              """;
     cleanup:cronPattern "0 0 * * *"; # Runs daily at midnight
```

**Note that in each pattern a graph is specified, this is needed in order to run the query**

## Scheduling Feature

The service supports scheduling cleanup jobs using cron patterns. Each job can specify its own cron pattern using the `cleanup:cronPattern` property. If no pattern is specified, a default pattern from the environment variable `CRON_PATTERN` will be used.

### Default Cron Pattern

You can set a default cron pattern by defining the `CRON_PATTERN` environment variable in your configuration:

```env
CRON_PATTERN="0 5 1 * * *" # Example: runs at 5:00 AM on the first day of every month
```

### How Scheduling Works

1. **Job Definition:** Each job can specify a `cleanup:cronPattern`. If not provided, the default pattern is used.
2. **Job Scheduling:** Jobs are scheduled based on their cron pattern.
3. **Execution:** When the scheduled time arrives, the job executes, deleting resources that match the `selectPattern` and `deletePattern`.

### Locking Mechanism

To ensure that only one cleanup job runs at a time and to prevent database conflicts, the service uses a locking mechanism provided by the `async-await-mutex-lock` library.

#### How Locking Works

1. **Acquiring the Lock:** Before a job executes, it acquires a lock. This ensures that no other job can run concurrently.
2. **Job Execution:** The job executes its cleanup logic while holding the lock.
3. **Releasing the Lock:** Once the job completes or an error occurs, the lock is released, allowing the next scheduled job to run.

## REST API

### POST /cleanup

Trigger cleanup.

#### Response

- `202 Accepted` if the process was started
- `503 Service Unavailable` if the process is already running

## Development

To set up a development environment, use the following configuration in `docker-compose.yml`:

```yaml
services:
  dbcleanup:
    image: semtech/mu-javascript-template:1.8.0
    ports:
      - 8888:80
    environment:
      NODE_ENV: "development"
    volumes:
      - /path/to/the/project:/app/
```