# db-cleanup-service
Microservice that removes resources matching requirements specified in the configuration.

## installation
To add the service to your stack, add the following snippet to docker-compose.yml:

```
services:
  dbcleanup:
    image: lblod/db-cleanup-service
```

## configuration
The cleanup service will execute clean up jobs that are specified in the SPARQL endpoint.
The job should have the type `cleanup:Job` and at least the following properties:

* `mu:uuid`: an identifier for the job, typically the last part of its URI
* `dcterms:title`: a title describing the job
* `cleanup:selectPattern`: the pattern to match, resource to be deleted should be named `?resource`. This is used in COUNT queries and the cleanup query (a delete...where query)
* `cleanup:deletePattern`: the pattern to be deleted

For example:

```
PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
PREFIX mu: <http://mu.semte.ch/vocabularies/ext/cleanup/>
PREFIX dcterms: <http://purl.org/dc/terms/>
:job a cleanup:Job;
     mu:uuid "10724bc2-c9d0-4a35-a499-91a8b7cb023b";
     dcterms:title "clean up dangling file uploads";
     cleanup:selectPattern """
              ?resource a <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject>;
              ?p ?o;
              <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#dataSource> ?source;
              <http://purl.org/dc/terms/modified> ?modified.
              ?source ?sourcep ?sourceo.
              BIND(NOW() - 86400 AS ?oneDayAgo)
              FILTER(?modified <= ?oneDayAgo)
              FILTER(NOT EXISTS { ?foo <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#hasPart> ?resource})
              """;
    cleanup:deletePattern """
              ?resource ?p ?o.
              ?source ?sourcep ?sourceo.
              """.
```


## REST API
### POST /cleanup
Trigger cleanup
Returns `202 Accepted` if the process was started

## Development

```
services:
  dbcleanup:
    image: semtech/mu-javascript-template:1.3.1
    ports:
      - 8888:80
    environment:
      NODE_ENV: "development"
    volumes:
      - /path/to/the/project:/app/
```


## TODO
1. It seems useful to add a schedule property to clean up jobs, so jobs can run on different intervals (for example 'daily', 'monthly', ...). 
2. Provide some sort of locking for cleanup job execution. (perhaps jobs can/should indicate whether or not they can run in parallel)
