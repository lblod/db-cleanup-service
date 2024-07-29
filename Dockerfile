FROM semtech/mu-javascript-template:1.8.0
LABEL maintainer=info@redpencil.io

ENV CRON_PATTERN '0 5 1 * * *'
ENV MU_APPLICATION_GRAPH 'http://mu.semte.ch/graphs/public'
