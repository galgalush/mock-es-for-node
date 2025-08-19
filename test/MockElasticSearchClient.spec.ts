import { MockElasticSearchClient } from '../src/MockElasticSearchClient';
import { MockClock } from '../src/Clock';

describe('MockElasticSearchClient', () => {
  let client: MockElasticSearchClient;

  beforeEach(() => {
    client = new MockElasticSearchClient();
  });

  describe('index method', () => {
    it('should index a document with auto-generated ID', async () => {
      await client.index({
        index: 'test-index',
        body: {
          country: 'USA',
          city: 'New York',
        },
      });

      const results = await client.search({
        index: 'test-index',
        body: { query: { match_all: {} } },
      });

      expect(results.body.hits.hits).toHaveLength(1);
      expect(results.body.hits.hits[0]._source.country).toBe('USA');
      expect(results.body.hits.hits[0]._id).toBeDefined();
    });

    it('should index a document with provided ID', async () => {
      await client.index({
        index: 'test-index',
        id: 'custom-id',
        body: {
          country: 'Canada',
        },
      });

      const results = await client.search({
        index: 'test-index',
        body: { query: { match_all: {} } },
      });

      expect(results.body.hits.hits[0]._id).toBe('custom-id');
    });

    it('should index a document with _id in body', async () => {
      await client.index({
        index: 'test-index',
        body: {
          _id: 'body-id',
          country: 'France',
        },
      });

      const results = await client.search({
        index: 'test-index',
        body: { query: { match_all: {} } },
      });

      expect(results.body.hits.hits[0]._id).toBe('body-id');
    });

    it('should index multiple documents', async () => {
      await client.index({
        index: 'countries',
        body: {
          country: 'USA',
          continent: 'North America',
          population: 331000000,
        },
      });

      await client.index({
        index: 'countries',
        body: {
          country: 'Canada',
          continent: 'North America',
          population: 38000000,
        },
      });

      const results = await client.search({
        index: 'countries',
        body: { query: { match_all: {} } },
      });

      expect(results.body.hits.hits).toHaveLength(2);
    });
  });

  describe('search method', () => {
    beforeEach(async () => {
      // Index test data
      await client.index({
        index: 'countries',
        body: {
          country: 'USA',
          continent: 'North America',
          population: 331000000,
          capital: 'Washington DC',
          details: {
            currency: 'USD',
          },
        },
      });

      await client.index({
        index: 'countries',
        body: {
          country: 'Canada',
          continent: 'North America',
          population: 38000000,
          capital: 'Ottawa',
          details: {
            currency: 'CAD',
          },
        },
      });

      await client.index({
        index: 'countries',
        body: {
          country: 'France',
          continent: 'Europe',
          population: 67000000,
          capital: 'Paris',
          details: {
            currency: 'EUR',
          },
        },
      });
    });

    it('should return empty results for non-existent index', async () => {
      const results = await client.search({
        index: 'non-existent',
        body: { query: { match_all: {} } },
      });

      expect(results.body.hits.hits).toHaveLength(0);
    });

    it('should return all documents with match_all query', async () => {
      const results = await client.search({
        index: 'countries',
        body: { query: { match_all: {} } },
      });

      expect(results.body.hits.hits).toHaveLength(3);
    });

    it('should filter by term query', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            term: { continent: 'North America' }
          }
        },
      });

      expect(results.body.hits.hits).toHaveLength(2);
      results.body.hits.hits.forEach(hit => {
        expect(hit._source.continent).toBe('North America');
      });
    });

    it('should filter by terms query', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            terms: { country: ['USA', 'Canada'] }
          }
        },
      });

      expect(results.body.hits.hits).toHaveLength(2);
    });

    it('should handle bool query with filter', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            bool: {
              filter: [
                { terms: { country: ['USA'] } }
              ],
            },
          },
          size: 10,
        },
      });

      expect(results.body.hits.hits).toHaveLength(1);
      expect(results.body.hits.hits[0]._source.country).toBe('USA');
    });

    it('should handle bool query with must clauses', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            bool: {
              must: [
                { term: { continent: 'North America' } },
                { term: { country: 'USA' } }
              ]
            }
          }
        },
      });

      expect(results.body.hits.hits).toHaveLength(1);
      expect(results.body.hits.hits[0]._source.country).toBe('USA');
    });

    it('should handle bool query with must_not clauses', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            bool: {
              must_not: [
                { term: { continent: 'North America' } }
              ]
            }
          }
        },
      });

      expect(results.body.hits.hits).toHaveLength(1);
      expect(results.body.hits.hits[0]._source.continent).toBe('Europe');
    });

    it('should handle bool query with should clauses (OR logic)', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            bool: {
              should: [
                { term: { country: 'USA' } },
                { term: { country: 'France' } }
              ]
            }
          }
        },
      });

      expect(results.body.hits.hits).toHaveLength(2);
    });

    it('should handle nested field queries', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            term: { 'details.currency': 'USD' }
          }
        },
      });

      expect(results.body.hits.hits).toHaveLength(1);
      expect(results.body.hits.hits[0]._source.details.currency).toBe('USD');
    });

    it('should respect size parameter', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: { match_all: {} },
          size: 2
        },
      });

      expect(results.body.hits.hits).toHaveLength(2);
    });

    it('should return all documents when no query is provided', async () => {
      const results = await client.search({
        index: 'countries',
        body: {}
      });

      expect(results.body.hits.hits).toHaveLength(3);
    });

    it('should handle range queries with numbers', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            range: { population: { gte: 50000000 } }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(2); // USA and France
      results.body.hits.hits.forEach(hit => {
        expect(hit._source.population).toBeGreaterThanOrEqual(50000000);
      });
    });

    it('should handle range queries with multiple conditions', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            range: { 
              population: { 
                gte: 30000000,
                lte: 70000000 
              } 
            }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(2); // Canada and France
    });

    it('should handle combined bool and range queries', async () => {
      const results = await client.search({
        index: 'countries',
        body: {
          query: {
            bool: {
              must: [
                { term: { continent: 'North America' } },
                { range: { population: { gt: 40000000 } } }
              ]
            }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(1); // Only USA
      expect(results.body.hits.hits[0]._source.country).toBe('USA');
    });
  });

  describe('range queries with dates', () => {
    beforeEach(async () => {
      client.clear();
      
      // Index documents with date fields
      await client.index({
        index: 'events',
        body: {
          name: 'Event 1',
          createdAt: '2024-01-15T10:00:00Z',
          date: '2024-01-15'
        },
      });

      await client.index({
        index: 'events',
        body: {
          name: 'Event 2',
          createdAt: '2024-01-10T15:30:00Z',
          date: '2024-01-10'
        },
      });

      await client.index({
        index: 'events',
        body: {
          name: 'Event 3',
          createdAt: '2024-01-20T09:15:00Z',
          date: '2024-01-20'
        },
      });
    });

    it('should handle date range queries with ISO strings', async () => {
      const results = await client.search({
        index: 'events',
        body: {
          query: {
            range: {
              createdAt: {
                gte: '2024-01-12T00:00:00Z',
                lte: '2024-01-18T23:59:59Z'
              }
            }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(1);
      expect(results.body.hits.hits[0]._source.name).toBe('Event 1');
    });

    it('should handle date-only range queries', async () => {
      const results = await client.search({
        index: 'events',
        body: {
          query: {
            range: {
              date: {
                gte: '2024-01-15'
              }
            }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(2); // Event 1 and Event 3
    });
  });

  describe('date math integration with MockClock', () => {
    let mockClock: MockClock;
    let clientWithMockClock: MockElasticSearchClient;

    beforeEach(async () => {
      mockClock = new MockClock('2024-01-01');
      clientWithMockClock = new MockElasticSearchClient(mockClock);
      
      // Index test data
      await clientWithMockClock.index({
        index: 'events',
        body: {
          name: 'Recent Event',
          timestamp: '2023-12-31' // 1 day ago from mock time
        }
      });

      await clientWithMockClock.index({
        index: 'events',
        body: {
          name: 'Old Event',
          timestamp: '2023-12-27' // 5 days ago from mock time
        }
      });

      await clientWithMockClock.index({
        index: 'events',
        body: {
          name: 'Future Event',
          timestamp: '2024-01-02' // 1 day in future from mock time
        }
      });
    });

    it('should handle date math expressions in range queries', async () => {
      // Find events from the last 2 days
      const results = await clientWithMockClock.search({
        index: 'events',
        body: {
          query: {
            range: {
              timestamp: { gte: 'now-2d' }
            }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(2); // Recent Event and Future Event
      const eventNames = results.body.hits.hits.map(hit => hit._source.name);
      expect(eventNames).toContain('Recent Event');
      expect(eventNames).toContain('Future Event');
      expect(eventNames).not.toContain('Old Event');
    });

    it('should handle complex date math with bool queries', async () => {
      const results = await clientWithMockClock.search({
        index: 'events',
        body: {
          query: {
            bool: {
              must: [
                { range: { timestamp: { gte: 'now-3d' } } },
                { range: { timestamp: { lte: 'now+1d' } } }
              ]
            }
          }
        }
      });

      expect(results.body.hits.hits).toHaveLength(2); // Recent Event and Future Event (but not Old Event)
    });


  });



  describe('clear method', () => {
    it('should clear all indexed data', async () => {
      await client.index({
        index: 'test-index',
        body: { test: 'data' },
      });

      let results = await client.search({
        index: 'test-index',
        body: { query: { match_all: {} } },
      });
      expect(results.body.hits.hits).toHaveLength(1);

      client.clear();

      results = await client.search({
        index: 'test-index',
        body: { query: { match_all: {} } },
      });
      expect(results.body.hits.hits).toHaveLength(0);
    });
  });
});