import { MockElasticSearchClient } from '../src/MockElasticSearchClient';

describe('MockElasticSearchClient', () => {
  let client: MockElasticSearchClient;

  beforeEach(() => {
    client = new MockElasticSearchClient();
  });

  it('should create an instance', () => {
    expect(client).toBeInstanceOf(MockElasticSearchClient);
  });

  it('should have index method that throws not implemented error', async () => {
    await expect(client.index({
      index: 'test-index',
      body: { test: 'data' }
    })).rejects.toThrow('Not implemented yet');
  });

  it('should have search method that throws not implemented error', async () => {
    await expect(client.search({
      index: 'test-index',
      body: { query: { match_all: {} } }
    })).rejects.toThrow('Not implemented yet');
  });
});
