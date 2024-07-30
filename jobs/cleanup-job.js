import { sparqlEscapeUri } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';

const graph = process.env.MU_APPLICATION_GRAPH;

class CleanupJob {
  constructor({
    id,
    title,
    uri,
    description,
    selectPattern,
    deletePattern,
    cronPattern,
  }) {
    this.id = id;
    this.title = title;
    this.uri = uri;
    this.description = description;
    this.selectPattern = selectPattern;
    this.deletePattern = deletePattern;
    this.cronPattern = cronPattern;
  }

  async execute() {
    console.log(`running cleanup job ${this.title} (${this.id})`);

    let resources;
    try {
      resources = await this.matchingResources();
    } catch (e) {
      console.error('error fetching matching resources:', e);
      return;
    }

    if (!resources || resources.length === 0) {
      console.warn('no resources were found');
      return;
    }

    console.log(`found ${resources.length} matches to remove`);

    for (let resource of resources) {
      try {
        console.log('removing resource:', resource);
        await this.removeResource(resource);
      } catch (e) {
        console.warn(`failed to remove resource ${resource}`);
        console.error(e);
      }
    }

    console.log('cleanup job done');
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
      `);
    } catch (e) {
      console.error(`failed to remove resource ${resource}:`, e);
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
          'the query did not return the expected "resource" binding.'
        );
      }

      return result.results.bindings.map((r) => r.resource.value);
    } catch (e) {
      console.error('failed to retrieve matching resources:', e);
      throw e;
    }
  }

  static async findAll() {
    const result = await query(`
      PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
      PREFIX mu:      <http://mu.semte.ch/vocabularies/ext/cleanup/>
      PREFIX dcterms: <http://purl.org/dc/terms/>

      SELECT ?uri ?id ?title ?description ?selectPattern ?deletePattern ?cronPattern
      FROM <${graph}>
      WHERE {
        ?uri a cleanup:Job ;
          mu:uuid ?id ;
          dcterms:title ?title ;
          cleanup:selectPattern ?selectPattern ;
          cleanup:deletePattern ?deletePattern .

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
}

export default CleanupJob;
