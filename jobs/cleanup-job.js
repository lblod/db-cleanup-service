import { sparqlEscapeUri, sparqlEscapeString } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import * as env from '../env';

const graph = env.MU_APPLICATION_GRAPH;

const sparqlConnectionOptions = {
  sparqlEndpoint: env.MU_SPARQL_ENDPOINT,
  mayRetry: true,
};

class CleanupJob {
  constructor({
    id,
    title,
    uri,
    description,
    selectPattern,
    deletePattern,
    randomQuery,
    cronPattern,
  }) {
    this.id = id;
    this.title = title;
    this.uri = uri;
    this.description = description;
    this.selectPattern = selectPattern;
    this.deletePattern = deletePattern;
    this.randomQuery = randomQuery;
    this.cronPattern = cronPattern;
  }

  async execute() {
    console.log(`Running cleanup job "${this.title}" (ID: ${this.id})`);

    if (this.selectPattern && this.deletePattern) {
      let resources;
      try {
        resources = await this.matchingResources();
      } catch (e) {
        console.error('Error fetching matching resources:', e);
        return;
      }

      if (!resources || resources.length === 0) {
        console.warn('No resources were found.');
        return;
      }

      console.log(`Found ${resources.length} match(es) to remove.`);

      for (let resource of resources) {
        try {
          console.log(`Removing resource: ${resource}`);
          await this.removeResource(resource);
        } catch (e) {
          console.warn(`Failed to remove resource: ${resource}`);
          console.error(e);
        }
      }

      console.log('Cleanup job done.');
    } else {
      try {
        await this.executeRandomQuery();
        console.log('Random query executed.');
      } catch (e) {
        console.warn('Failed to execute random query.');
        console.error(e);
      }
    }
  }

  /**
   * Remove a specific resource based on its URI.
   * @param {string} resource - URI of the resource to be deleted.
   */
  async removeResource(resource) {
    try {
      await update(`
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        DELETE {
          ${this.deletePattern}
        }
        WHERE {
          ${this.selectPattern}
          FILTER(?resource = ${sparqlEscapeUri(resource)})
        }
      `,
      {},
      sparqlConnectionOptions);
    } catch (e) {
      console.error(`Failed to remove resource ${resource}:`, e);
      throw e;
    }
  }

  /**
   * Retrieve resources to be deleted.
   * @returns {Promise<string[]>} - A promise that resolves to an array of resource URIs.
   */
  async matchingResources() {
    try {
      const result = await query(`
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        SELECT DISTINCT ?resource
        WHERE {
          ${this.selectPattern}
        }
    `);

      const bindingKeys = result.head.vars;
      if (!bindingKeys.includes('resource')) {
        throw new Error(
          'The query did not return the expected "resource" binding.'
        );
      }

      return result.results.bindings.map((r) => r.resource.value);
    } catch (e) {
      console.error('Failed to retrieve matching resources:', e);
      throw e;
    }
  }

  async executeRandomQuery() {
    try {
      console.log(`Executing random query: \n ${this.randomQuery}`);
      await update(this.randomQuery, {}, sparqlConnectionOptions);
    }
    catch (e) {
      console.error('Error executing random query: ', e);
      throw e;
    }
  }

  /**
   * Returns all cleanup jobs found in the database having either:
   *  - cleanup:selectPattern AND cleanup:deletePattern properties
   *  - a cleanup:randomQuery property
   * @returns {CleanupJob[]} - A list of cleanup jobs
   */
  static async findAll() {
    const result = await query(`
      PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
      PREFIX mu:      <http://mu.semte.ch/vocabularies/core/>
      PREFIX dcterms: <http://purl.org/dc/terms/>

      SELECT DISTINCT ?uri ?id ?title ?description ?selectPattern ?deletePattern ?cronPattern ?randomQuery
      FROM <${graph}>
      WHERE {
        ?uri a cleanup:Job ;
          mu:uuid ?id ;
          dcterms:title ?title .

        {
          ?uri cleanup:selectPattern ?selectPattern ;
            cleanup:deletePattern ?deletePattern .
        } UNION {
          ?uri cleanup:randomQuery ?randomQuery .
        }

        OPTIONAL { ?uri dcterms:description ?description . }
        OPTIONAL { ?uri cleanup:cronPattern ?cronPattern . }
      }
    `);
    const bindingKeys = result.head.vars;

    return result.results.bindings.map((r) => {
      const obj = {};
      bindingKeys.forEach((key) => {
        if (r[key]) obj[key] = r[key].value;
      });
      return new this(obj);
    });
  }

  /**
   * @param {string} jobID - The ID of the job to be retrieved.
   * @returns {CleanupJob} - The cleanup job having the input jobID.
   */
  static async findJob(jobID) {
    const result = await query(`
      PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
      PREFIX mu:      <http://mu.semte.ch/vocabularies/core/>
      PREFIX dcterms: <http://purl.org/dc/terms/>

      SELECT DISTINCT ?uri ?id ?title ?description ?selectPattern ?deletePattern ?cronPattern ?randomQuery
      FROM <${graph}>
      WHERE {
        BIND(${sparqlEscapeString(jobID)} AS ?id)

        ?uri a cleanup:Job ;
          mu:uuid ?id ;
          dcterms:title ?title .

        {
          ?uri cleanup:selectPattern ?selectPattern ;
            cleanup:deletePattern ?deletePattern .
        } UNION {
          ?uri cleanup:randomQuery ?randomQuery .
        }

        OPTIONAL { ?uri dcterms:description ?description . }
        OPTIONAL { ?uri cleanup:cronPattern ?cronPattern . }
      }
    `);
    const bindingKeys = result.head.vars;

    return result.results.bindings.map((r) => {
      const obj = {};
      bindingKeys.forEach((key) => {
        if (r[key]) obj[key] = r[key].value;
      });
      return new this(obj);
    })[0];
  }
}

export default CleanupJob;
