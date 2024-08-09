# db-cleanup-service

Microservice that removes resources matching requirements specified in the configuration.

## Installation

To add the service to your stack, add the following snippet to `docker-compose.yml`:

```yaml
services:
  dbcleanup:
    image: lblod/db-cleanup-service:x.y.z
```

## Configuration

The cleanup service will execute cleanup jobs that are specified in the SPARQL endpoint. Each job should have the type `cleanup:Job` and at least the following properties:
- `mu:uuid`: an identifier for the job, typically the last part of its URI
- `dcterms:title`: a title describing the job
- `cleanup:selectPattern`: the pattern to match; resource to be deleted should be named `?resource`. This is used in COUNT queries and the cleanup query (a `DELETE...WHERE` query). Needs to specified in conjunction with `cleanup:deletePattern`.
- `cleanup:deletePattern`: the pattern to be deleted. Needs to specified in conjuntion with `cleanup:selectPattern`.
- `cleanup:cronPattern` (optional): a cron pattern to schedule the job execution. If not provided, the default pattern will be used.
- `cleanup:randomQuery`: If a random query just needs exection; specify the query here. Mutually exclusive with other patterns.
These jobs are located in `http://mu.semte.ch/graphs/public` graph, and additional migrations can be added to the migration folder of your stack or directly through your SPARQL editor.

For example:

```sparql
PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
PREFIX mu:      <http://mu.semte.ch/vocabularies/core/>
PREFIX dcterms: <http://purl.org/dc/terms/>

:job a cleanup:Job;
  mu:uuid "10724bc2-c9d0-4a35-a499-91a8b7cb023b";
  dcterms:title "clean up dangling file uploads";
  cleanup:selectPattern """
    GRAPH <http://mu.semte.ch/graphs/public> {
      ?resource a <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject> ;
        <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?source ;
        <http://purl.org/dc/terms/modified> ?modified ;
        ?p ?o .

      ?source ?sourcep ?sourceo .

      BIND(NOW() - xsd:dayTimeDuration("P1D") AS ?oneDayAgo)
     FILTER(?modified <= ?oneDayAgo)
      FILTER(NOT EXISTS { ?foo <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#hasPart> ?resource })
    }
    """;
  cleanup:deletePattern """
    GRAPH <http://mu.semte.ch/graphs/public> {
      ?resource ?p ?o.
      ?source ?sourcep ?sourceo.
    }
    """;
  cleanup:cronPattern "0 0 * * *". # Runs daily at midnight
```

Other example, executing a random query:
```sparql
PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
PREFIX mu:      <http://mu.semte.ch/vocabularies/core/>
PREFIX dcterms: <http://purl.org/dc/terms/>

:job a cleanup:Job;
  mu:uuid "ecf0c526-04bb-4e16-86a2-85b5a62cb849";
  dcterms:title "Flush a triple in a graph";
  cleanup:randomQuery """
    DELETE DATA {
      GRAPH <http://a/graph/ecf0c526-04bb-4e16-86a2-85b5a62cb849> {
        <http://ecf0c526-04bb-4e16-86a2-85b5a62cb849> <http://bar> <http://baz>.
    }
    """;;
  cleanup:cronPattern "0 0 * * *". # Runs daily at midnight
```

**Note that a graph is specified in each pattern; this is needed in order to run the query.**

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

Triggers the cleanup cronjobs.

#### Response

- `201 Created` if the process was started and cronjobs were created.

### POST /disableCronjobs

Disables all cronjobs that had been triggered at an earlier point in time.

#### Response

- `200 OK` if the cronjobs were disabled successfully.

### GET /disableCronjob

Disables a single cronjob.

#### Parameters

This GET call accepts only one parameter.

- `cronjobID`: The call in this case would be `/disableCronjob?cronjobID=a53a0b8b-fdaf-41d5-a39b-20ddb3a36e6b`.

#### Response

- `406 Not Acceptable` if no or multiple parameters were passed.
- `200 OK` if the cronjob was successfully disabled.

## Development

To set up a development environment, use the following configuration in `docker-compose.yml`:

```yaml
services:
  dbcleanup:
    image: lblod/db-cleanup-service:x.y.z
    ports:
      - 8888:80
    environment:
      NODE_ENV: "development"
    volumes:
      - /path/to/the/project:/app/
```
