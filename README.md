# mock-es-for-node

A lightweight, in-memory ElasticSearch mock for Node.js unit testing with full TypeScript support.

## Features

- 🚀 **Zero dependencies** - No external dependencies in production
- 📦 **TypeScript first** - Built with TypeScript, includes type definitions
- 🧪 **Perfect for testing** - In-memory storage, easy to reset between tests
- ⚡ **Fast and lightweight** - No need to spin up real ElasticSearch instances
- 🔍 **Rich query support** - Supports term, terms, range, and bool queries with must/must_not/should/filter clauses
- 📅 **Date math support** - Range queries with relative date expressions (now-1d, now+2h, etc.)
- 🎯 **Simple API** - Drop-in replacement for basic ElasticSearch operations

## Installation

```bash
npm install mock-es-for-node
# or
yarn add mock-es-for-node
# or
pnpm add mock-es-for-node
```

## Quick Start

```typescript
import { MockElasticSearchClient } from 'mock-es-for-node';

// Create a mock client
const client = new MockElasticSearchClient();

// Index some documents
await client.index({
  index: 'countries',
  body: {
    country: 'USA',
    continent: 'North America',
    population: 331000000,
  },
});

// Search for documents
const results = await client.search({
  index: 'countries',
  body: {
    query: {
      term: { continent: 'North America' }
    },
    size: 10,
  },
});

console.log(results.body.hits.hits); // Array of matching documents
```

## API Reference

### `index(request: IndexRequest): Promise<void>`

Index a document in the specified index.

```typescript
interface IndexRequest {
  index: string;      // Index name
  body: any;          // Document to index
  id?: string;        // Optional document ID
}
```

**Example:**
```typescript
await client.index({
  index: 'products',
  id: 'product-1',  // Optional: will auto-generate if not provided
  body: {
    name: 'Laptop',
    category: 'Electronics',
    price: 999.99,
  },
});
```

### `search(request: SearchRequest): Promise<SearchResponse>`

Search for documents matching the query.

```typescript
interface SearchRequest {
  index: string;
  body: {
    query?: any;      // ElasticSearch query DSL
    size?: number;    // Maximum number of results (default: 10)
  };
}
```

**Example:**
```typescript
const results = await client.search({
  index: 'products',
  body: {
    query: {
      bool: {
        must: [
          { term: { category: 'Electronics' } },
          { range: { price: { gte: 500 } } }
        ]
      }
    },
    size: 20,
  },
});
```

### `clear(): void`

Clear all indexed data. Useful for resetting state between tests.

```typescript
client.clear();
```

## Supported Query Types

### Term Query
Exact match for a field value:
```typescript
{
  query: {
    term: { category: 'Electronics' }
  }
}
```

### Terms Query
Match any of the provided values:
```typescript
{
  query: {
    terms: { country: ['USA', 'Canada', 'Mexico'] }
  }
}
```

### Range Query
Filter by value ranges with support for numbers, dates, and date math:
```typescript
// Numerical ranges
{
  query: {
    range: { 
      price: { 
        gte: 100,    // greater than or equal
        lte: 500     // less than or equal
      } 
    }
  }
}

// Date ranges with absolute dates
{
  query: {
    range: {
      timestamp: {
        gte: "2024-01-01T00:00:00Z",
        lte: "2024-01-31T23:59:59Z"
      }
    }
  }
}

// Date ranges with relative expressions
{
  query: {
    range: {
      createdAt: {
        gte: "now-7d",    // 7 days ago
        lte: "now"        // current time
      }
    }
  }
}
```

**Range Operators:**
- `gt`: greater than
- `gte`: greater than or equal to  
- `lt`: less than
- `lte`: less than or equal to

**Date Math Expressions:**
- `now`: current timestamp
- `now-1d`: 1 day ago
- `now-2h`: 2 hours ago
- `now+3m`: 3 minutes in the future

**Supported time units:**
- `s`: seconds
- `m`: minutes  
- `h`: hours
- `d`: days
- `w`: weeks
- `M`: months
- `y`: years

### Bool Query
Combine multiple queries with boolean logic:
```typescript
{
  query: {
    bool: {
      must: [        // All conditions must match (AND)
        { term: { category: 'Electronics' } }
      ],
      must_not: [    // Conditions must NOT match (NOT)
        { term: { discontinued: true } }
      ],
      should: [      // At least one should match (OR)
        { term: { brand: 'Apple' } },
        { term: { brand: 'Samsung' } }
      ],
      filter: [      // Same as must, but used for filtering
        { term: { in_stock: true } }
      ]
    }
  }
}
```

### Nested Field Queries
Query nested object fields using dot notation:
```typescript
{
  query: {
    term: { 'details.color': 'red' }
  }
}
```

### Match All Query
Return all documents:
```typescript
{
  query: {
    match_all: {}
  }
}
```

## Testing Example

```typescript
import { MockElasticSearchClient } from 'mock-es-for-node';

describe('My Service', () => {
  let elasticClient: MockElasticSearchClient;

  beforeEach(() => {
    elasticClient = new MockElasticSearchClient();
  });

  afterEach(() => {
    elasticClient.clear(); // Reset between tests
  });

  test('should find products by category', async () => {
    // Setup test data
    await elasticClient.index({
      index: 'products',
      body: { name: 'iPhone', category: 'Electronics', price: 999 },
    });

    // Test your service
    const myService = new MyService(elasticClient);
    const results = await myService.findElectronics();

    // Assert results
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('iPhone');
  });

  test('should find products within price range', async () => {
    // Setup test data
    await elasticClient.index({
      index: 'products',
      body: { name: 'Budget Phone', price: 200 },
    });
    await elasticClient.index({
      index: 'products', 
      body: { name: 'Premium Phone', price: 1200 },
    });

    // Test range query
    const results = await elasticClient.search({
      index: 'products',
      body: {
        query: {
          range: { price: { gte: 100, lte: 500 } }
        }
      }
    });

    expect(results.body.hits.hits).toHaveLength(1);
    expect(results.body.hits.hits[0]._source.name).toBe('Budget Phone');
  });

  test('should find recent events', async () => {
    // Setup test data
    await elasticClient.index({
      index: 'events',
      body: { 
        name: 'Recent Event', 
        timestamp: '2024-01-15T10:00:00Z' 
      },
    });

    // Test date math query
    const results = await elasticClient.search({
      index: 'events',
      body: {
        query: {
          range: { 
            timestamp: { gte: 'now-30d' } // Events from last 30 days
          }
        }
      }
    });

    expect(results.body.hits.hits).toHaveLength(1);
  });
});
```

## Document ID Handling

The mock client handles document IDs in the following priority order:

1. **Explicit ID**: Use the `id` parameter in the index request
2. **Body ID**: Use `_id` field from the document body
3. **Auto-generated**: Generate a random UUID if no ID is provided

```typescript
// Explicit ID
await client.index({
  index: 'products',
  id: 'custom-id',
  body: { name: 'Product' }
});

// ID from body
await client.index({
  index: 'products',
  body: { _id: 'body-id', name: 'Product' }
});

// Auto-generated ID
await client.index({
  index: 'products',
  body: { name: 'Product' } // Will get a random UUID
});
```

## Limitations

This is a testing utility, not a full ElasticSearch replacement. Current limitations:

- No aggregations support
- No text analysis or scoring
- No geo queries
- No fuzzy queries
- No wildcard queries
- Simple in-memory storage (data is lost when process exits)
- Date math expressions use approximate month/year calculations (30 days = 1 month, 365 days = 1 year)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.
