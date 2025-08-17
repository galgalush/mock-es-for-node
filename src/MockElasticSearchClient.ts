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

export class MockElasticSearchClient {
  private documents: Map<string, Map<string, any>> = new Map();

  async index(request: IndexRequest): Promise<void> {
    // TODO: Implement indexing logic
    throw new Error('Not implemented yet');
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    // TODO: Implement search logic
    throw new Error('Not implemented yet');
  }

  // Helper method to clear all data (useful for tests)
  clear(): void {
    this.documents.clear();
  }
}
