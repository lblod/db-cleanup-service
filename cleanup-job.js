import { sparqlEscapeUri } from 'mu';
import { querySudo as query, updateSudo as update } from './auth-sudo';

const graph = process.env.MU_APPLICATION_GRAPH;

class CleanupJob {
  constructor({id, title, uri, description, selectPattern, deletePattern}) {
    this.id = id;
    this.title = title;
    this.uri = uri;
    this.description = description;
    this.selectPattern = selectPattern;
    this.deletePattern = deletePattern;
  }

  async execute() {
    console.log(`running cleanup job ${this.title} (${this.id})`);
    const resources = await this.matchingResources();
    console.log(`found ${resources.length} matches to remove`);
    for(let resource in resources) {
      try {
        await this.removeResource(resource);
      }
      catch(e) {
        console.warn(`failed to remove ${resource}`);
        console.log(e);
      }
    }
    console.log('done');
  }

  async removeResource(resource) {
    await update(`
          DELETE {
            ${this.deletePattern}
          }
          WHERE {
            ${this.selectPattern}
            FILTER(?resource = ${sparqlEscapeUri(resource)})
          }`);
  }

  /**
   * retrieve resources to be deleted
   */
  async matchingResources() {
    const result  = await query(`
      SELECT DISTINCT ?resource
      WHERE {
           ${this.selectPattern}
      }
   `);
    const bindingKeys = result.head.vars;
    return result.results.bindings.map( (r) => r.resource.value);
  }

  static async findAll() {
    const result = await query(`
                           PREFIX cleanup: <http://mu.semte.ch/vocabularies/ext/cleanup/>
                           PREFIX mu: <http://mu.semte.ch/vocabularies/ext/cleanup/>
                           PREFIX dcterms: <http://purl.org/dc/terms/>
                           SELECT ?uri ?id ?title ?description ?selectPattern ?deletePattern
                           FROM <${graph}>
                           WHERE {
                               ?uri a cleanup:Job;
                                    mu:uuid ?id;
                                    dcterms:title ?title;
                                    cleanup:selectPattern ?selectPattern;
                                    cleanup:deletePattern ?deletePattern.
                               OPTIONAL {?uri dcterms:description ?description}
                           }
                   `);
    const bindingKeys = result.head.vars;

    return result.results.bindings.map( (r) => {
      const obj = {};
      bindingKeys.forEach((key) => {
        if (r[key])
          obj[key] = r[key].value;
      });
      return new this(obj);
    });
  }
}

export default CleanupJob;
