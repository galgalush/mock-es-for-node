import { randomUUID } from 'crypto';

export interface IndexRequest {
  index: string;
  body: any;
  id?: string;
}

export interface SearchRequest {
  index: string;
  body: {
    query?: any;
    size?: number;
  };
}

export interface SearchResponse {
  body: {
    hits: {
      hits: Array<{
        _source: any;
        _id: string;
      }>;
    };
  };
}

type Index = Map<string, any>;

export class MockElasticSearchClient {
  private indexes: Map<string, Index> = new Map();

  async index(request: IndexRequest): Promise<void> {
    const { index: indexName, body, id } = request;
    
    // Get or create the index
    if (!this.indexes.has(indexName)) {
      this.indexes.set(indexName, new Map());
    }
    
    const index = this.indexes.get(indexName)!;
    
    // Use provided id, or _id from body, or generate a random UUID
    const documentId = id || body._id || randomUUID();
    
    // Store the document
    index.set(documentId, { ...body, _id: documentId });
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const { index: indexName, body } = request;
    const { query, size = 10 } = body;
    
    // Get the index
    const index = this.indexes.get(indexName);
    if (!index) {
      return {
        body: {
          hits: {
            hits: []
          }
        }
      };
    }
    
    // Get all documents from the index
    let documents = Array.from(index.values());
    
    // Apply query filters if provided
    if (query) {
      documents = this.filterDocuments(documents, query);
    }
    
    // Apply size limit
    documents = documents.slice(0, size);
    
    // Format response
    return {
      body: {
        hits: {
          hits: documents.map(doc => ({
            _source: doc,
            _id: doc._id
          }))
        }
      }
    };
  }

  // Helper method to clear all data (useful for tests)
  clear(): void {
    this.indexes.clear();
  }
  
  private filterDocuments(documents: any[], query: any): any[] {
    return documents.filter(doc => this.matchesQuery(doc, query));
  }
  
  private matchesQuery(document: any, query: any): boolean {
    if (!query) return true;
    
    // Handle bool queries
    if (query.bool) {
      return this.matchesBoolQuery(document, query.bool);
    }
    
    // Handle term queries
    if (query.term) {
      return this.matchesTermQuery(document, query.term);
    }
    
    // Handle terms queries
    if (query.terms) {
      return this.matchesTermsQuery(document, query.terms);
    }
    
    // Handle match_all queries
    if (query.match_all) {
      return true;
    }
    
    return false;
  }
  
  private matchesBoolQuery(document: any, boolQuery: any): boolean {
    // Handle must clauses (all must match - AND logic)
    if (boolQuery.must) {
      const mustClauses = Array.isArray(boolQuery.must) ? boolQuery.must : [boolQuery.must];
      if (!mustClauses.every((clause: any) => this.matchesQuery(document, clause))) {
        return false;
      }
    }
    
    // Handle filter clauses (same as must, but without scoring)
    if (boolQuery.filter) {
      const filterClauses = Array.isArray(boolQuery.filter) ? boolQuery.filter : [boolQuery.filter];
      if (!filterClauses.every((clause: any) => this.matchesQuery(document, clause))) {
        return false;
      }
    }
    
    // Handle must_not clauses (none must match - NOT logic)
    if (boolQuery.must_not) {
      const mustNotClauses = Array.isArray(boolQuery.must_not) ? boolQuery.must_not : [boolQuery.must_not];
      if (mustNotClauses.some((clause: any) => this.matchesQuery(document, clause))) {
        return false;
      }
    }
    
    // Handle should clauses (at least one should match - OR logic)
    if (boolQuery.should) {
      const shouldClauses = Array.isArray(boolQuery.should) ? boolQuery.should : [boolQuery.should];
      // If there are only should clauses, at least one must match
      // If there are must/filter clauses, should clauses are optional (boost scoring)
      const hasRequiredClauses = boolQuery.must || boolQuery.filter;
      if (!hasRequiredClauses && !shouldClauses.some((clause: any) => this.matchesQuery(document, clause))) {
        return false;
      }
    }
    
    return true;
  }
  
  private matchesTermQuery(document: any, termQuery: any): boolean {
    for (const [field, value] of Object.entries(termQuery)) {
      const docValue = this.getNestedValue(document, field);
      if (docValue !== value) {
        return false;
      }
    }
    return true;
  }
  
  private matchesTermsQuery(document: any, termsQuery: any): boolean {
    for (const [field, values] of Object.entries(termsQuery)) {
      const docValue = this.getNestedValue(document, field);
      const valueArray = Array.isArray(values) ? values : [values];
      if (!valueArray.includes(docValue)) {
        return false;
      }
    }
    return true;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
