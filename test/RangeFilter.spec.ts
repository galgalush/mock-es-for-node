import { RangeFilter } from '../src/RangeFilter';
import { MockClock } from '../src/Clock';

describe('RangeFilter', () => {
  let rangeFilter: RangeFilter;
  
  beforeEach(() => {
    rangeFilter = new RangeFilter();
  });

  describe('numerical range queries', () => {
    it('should match gt (greater than)', () => {
      expect(rangeFilter.isMatch({ gt: 50 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ gt: 100 }, 100)).toBe(false);
      expect(rangeFilter.isMatch({ gt: 150 }, 100)).toBe(false);
    });

    it('should match gte (greater than or equal)', () => {
      expect(rangeFilter.isMatch({ gte: 50 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ gte: 100 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ gte: 150 }, 100)).toBe(false);
    });

    it('should match lt (less than)', () => {
      expect(rangeFilter.isMatch({ lt: 150 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ lt: 100 }, 100)).toBe(false);
      expect(rangeFilter.isMatch({ lt: 50 }, 100)).toBe(false);
    });

    it('should match lte (less than or equal)', () => {
      expect(rangeFilter.isMatch({ lte: 150 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ lte: 100 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ lte: 50 }, 100)).toBe(false);
    });

    it('should handle combined range conditions', () => {
      expect(rangeFilter.isMatch({ gte: 50, lte: 150 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ gt: 50, lt: 150 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ gte: 100, lte: 100 }, 100)).toBe(true);
      expect(rangeFilter.isMatch({ gt: 100, lt: 200 }, 100)).toBe(false);
      expect(rangeFilter.isMatch({ gte: 200, lte: 300 }, 100)).toBe(false);
    });

    it('should handle decimal numbers', () => {
      expect(rangeFilter.isMatch({ gt: 4.0 }, 4.5)).toBe(true);
      expect(rangeFilter.isMatch({ gte: 4.5 }, 4.5)).toBe(true);
      expect(rangeFilter.isMatch({ lt: 4.6 }, 4.5)).toBe(true);
      expect(rangeFilter.isMatch({ lte: 4.5 }, 4.5)).toBe(true);
      expect(rangeFilter.isMatch({ gt: 4.5 }, 4.5)).toBe(false);
    });

    it('should handle zero values', () => {
      expect(rangeFilter.isMatch({ gte: 0 }, 0)).toBe(true);
      expect(rangeFilter.isMatch({ gt: 0 }, 0)).toBe(false);
      expect(rangeFilter.isMatch({ lte: 0 }, 0)).toBe(true);
      expect(rangeFilter.isMatch({ lt: 0 }, 0)).toBe(false);
    });

    it('should handle negative numbers', () => {
      expect(rangeFilter.isMatch({ gt: -20 }, -10)).toBe(true);
      expect(rangeFilter.isMatch({ lt: 0 }, -10)).toBe(true);
      expect(rangeFilter.isMatch({ gte: -10 }, -10)).toBe(true);
      expect(rangeFilter.isMatch({ lt: -20 }, -10)).toBe(false);
    });
  });

  describe('string number range queries', () => {
    it('should parse numeric strings', () => {
      expect(rangeFilter.isMatch({ gt: 80 }, '85')).toBe(true);
      expect(rangeFilter.isMatch({ lt: 90 }, '85')).toBe(true);
      expect(rangeFilter.isMatch({ gte: 85 }, '85')).toBe(true);
      expect(rangeFilter.isMatch({ gt: 85 }, '85')).toBe(false);
    });

    it('should handle string numeric comparisons', () => {
      expect(rangeFilter.isMatch({ gt: '80' }, '85')).toBe(true);
      expect(rangeFilter.isMatch({ lt: '90' }, '85')).toBe(true);
      expect(rangeFilter.isMatch({ gte: '85' }, '85')).toBe(true);
    });

    it('should handle non-numeric strings with character sum comparison', () => {
      // 'abc123' has character sum: 97+98+99+49+50+51 = 444
      // 'aaa' has character sum: 97+97+97 = 291
      // 'zzz' has character sum: 122+122+122 = 366
      expect(rangeFilter.isMatch({ gt: 'aaa' }, 'abc123')).toBe(true); // 444 > 291
      expect(rangeFilter.isMatch({ gt: 'zzz' }, 'abc123')).toBe(true); // 444 > 366
      expect(rangeFilter.isMatch({ lt: 'abc124' }, 'abc123')).toBe(true); // 444 < 445
      expect(rangeFilter.isMatch({ gt: 'abc124' }, 'abc123')).toBe(false); // 444 < 445
    });
  });

  describe('date range queries', () => {
    it('should handle ISO date strings with absolute dates', () => {
      expect(rangeFilter.isMatch({
        gte: '2024-01-01T00:00:00Z',
        lte: '2024-01-31T23:59:59Z'
      }, '2024-01-15T10:30:00Z')).toBe(true);

      expect(rangeFilter.isMatch({
        gt: '2024-01-15T10:30:00Z'
      }, '2024-01-15T10:30:00Z')).toBe(false);

      expect(rangeFilter.isMatch({
        gte: '2024-01-15T10:30:00Z'
      }, '2024-01-15T10:30:00Z')).toBe(true);

      expect(rangeFilter.isMatch({
        lt: '2024-01-01T00:00:00Z'
      }, '2024-01-15T10:30:00Z')).toBe(false);
    });

    it('should handle date-only strings', () => {
      expect(rangeFilter.isMatch({
        gte: '2024-01-01',
        lte: '2024-01-31'
      }, '2024-01-15')).toBe(true);

      expect(rangeFilter.isMatch({
        gt: '2024-01-15'
      }, '2024-01-15')).toBe(false);

      expect(rangeFilter.isMatch({
        gte: '2024-01-15'
      }, '2024-01-15')).toBe(true);
    });

    it('should handle Date objects', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      
      expect(rangeFilter.isMatch({
        gte: new Date('2024-01-01'),
        lte: new Date('2024-01-31')
      }, testDate)).toBe(true);

      expect(rangeFilter.isMatch({
        gt: new Date('2024-01-15T10:30:00Z')
      }, testDate)).toBe(false);

      expect(rangeFilter.isMatch({
        gte: new Date('2024-01-15T10:30:00Z')
      }, testDate)).toBe(true);
    });

    it('should compare date strings with Date objects', () => {
      expect(rangeFilter.isMatch({
        gte: '2024-01-01T00:00:00Z'
      }, new Date('2024-01-15T10:30:00Z'))).toBe(true);

      expect(rangeFilter.isMatch({
        gte: new Date('2024-01-01T00:00:00Z')
      }, '2024-01-15T10:30:00Z')).toBe(true);
    });
  });

  describe('date math expressions', () => {
    let mockClock: MockClock;
    let range: RangeFilter;

    beforeEach(() => {
      mockClock = new MockClock('2024-01-01');
      range = new RangeFilter(mockClock);
    });

    it('should handle "now" expression', () => {
      // Test with date 1 day ago from 2024-01-01
      expect(range.isMatch({ lt: 'now' }, '2023-12-31')).toBe(true);
      // Test with date 1 day in future from 2024-01-01
      expect(range.isMatch({ gt: 'now' }, '2024-01-02')).toBe(true);
      // Test with current time (2024-01-01)
      expect(range.isMatch({ gte: 'now' }, '2024-01-01')).toBe(true);
      expect(range.isMatch({ gt: 'now' }, '2024-01-01')).toBe(false);
    });

    it('should handle "now-Xd" (days ago)', () => {
      // Date from yesterday should be greater than 2 days ago
      expect(range.isMatch({ gt: 'now-2d' }, '2023-12-31')).toBe(true);
      // Date from 2 days ago should not be greater than 1 day ago  
      expect(range.isMatch({ gt: 'now-1d' }, '2023-12-30')).toBe(false);
      // Exact match with 1 day ago
      expect(range.isMatch({ gte: 'now-1d' }, '2023-12-31')).toBe(true);
    });

    it('should handle "now-Xh" (hours ago)', () => {
      expect(range.isMatch({ gt: 'now-25h' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ gt: 'now-23h' }, '2023-12-31')).toBe(false);
      expect(range.isMatch({ gte: 'now-24h' }, '2023-12-31')).toBe(true);
    });

    it('should handle "now-Xm" (minutes ago)', () => {
      expect(range.isMatch({ gt: 'now-1500m' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ gte: 'now-1440m' }, '2023-12-31')).toBe(true); // 24h = 1440m
    });

    it('should handle "now-Xs" (seconds ago)', () => {
      expect(range.isMatch({ gt: 'now-90000s' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ gte: 'now-86400s' }, '2023-12-31')).toBe(true); // 24h = 86400s
    });

    it('should handle "now+X" (future)', () => {
      expect(range.isMatch({ lt: 'now+2d' }, '2024-01-02')).toBe(true);
      expect(range.isMatch({ gt: 'now+2d' }, '2024-01-02')).toBe(false);
      expect(range.isMatch({ lte: 'now+1d' }, '2024-01-02')).toBe(true);
    });

    it('should handle weeks, months, years', () => {
      expect(range.isMatch({ gt: 'now-1w' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ gt: 'now-1M' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ gt: 'now-1y' }, '2023-12-31')).toBe(true);
    });

    it('should fallback to now for invalid expressions', () => {
      expect(range.isMatch({ lt: 'now-invalid' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ lt: 'now-' }, '2023-12-31')).toBe(true);
      expect(range.isMatch({ lt: 'now+invalid' }, '2023-12-31')).toBe(true);
    });
  });

  describe('mixed type comparisons', () => {
    let mockClock: MockClock;
    let range: RangeFilter;

    beforeEach(() => {
      mockClock = new MockClock('2024-01-01');
      range = new RangeFilter(mockClock);
    });

    it('should compare numerical field values with date strings', () => {
      // Number vs ISO date string
      expect(range.isMatch({ gt: '2024-01-01T00:00:00Z' }, 1704067200000)).toBe(false); // same timestamp
      expect(range.isMatch({ gte: '2024-01-01T00:00:00Z' }, 1704067200000)).toBe(true); // same timestamp
      expect(range.isMatch({ lt: '2024-01-01T00:00:00Z' }, 1704060000000)).toBe(true); // earlier timestamp
      
      // Number vs simple date string
      expect(range.isMatch({ gt: '2024-01-01' }, 1704067200000)).toBe(false); // same day
      expect(range.isMatch({ gte: '2024-01-01' }, 1704067200000)).toBe(true); // same day
    });

    it('should compare numerical field values with date math expressions', () => {
      // Mock time is 2024-01-01T00:00:00Z = 1704067200000
      const mockTimestamp = 1704067200000;
      
      expect(range.isMatch({ gte: 'now' }, mockTimestamp)).toBe(true);
      expect(range.isMatch({ gt: 'now' }, mockTimestamp)).toBe(false);
      expect(range.isMatch({ lte: 'now' }, mockTimestamp)).toBe(true);
      expect(range.isMatch({ lt: 'now' }, mockTimestamp)).toBe(false);
      
      // Test with now-1d (day before = 1703980800000)
      expect(range.isMatch({ gt: 'now-1d' }, mockTimestamp)).toBe(true);
      expect(range.isMatch({ gte: 'now-1d' }, 1703980800000)).toBe(true); // exactly 1 day ago
      
      // Test with now+1d (day after = 1704153600000)
      expect(range.isMatch({ lt: 'now+1d' }, mockTimestamp)).toBe(true);
      expect(range.isMatch({ lte: 'now+1d' }, 1704153600000)).toBe(true); // exactly 1 day later
    });

    it('should compare date field values with numerical ranges', () => {
      // Date string vs number range
      expect(range.isMatch({ gt: 1704060000000 }, '2024-01-01T00:00:00Z')).toBe(true); // 2024-01-01 > earlier timestamp
      expect(range.isMatch({ lt: 1704160000000 }, '2024-01-01T00:00:00Z')).toBe(true); // 2024-01-01 < later timestamp
      
      // Date string vs timestamp that represents same moment
      expect(range.isMatch({ gte: 1704067200000 }, '2024-01-01T00:00:00Z')).toBe(true);
      expect(range.isMatch({ gt: 1704067200000 }, '2024-01-01T00:00:00Z')).toBe(false);
    });

    it('should handle mixed comparisons with invalid dates gracefully', () => {
      // When date parsing fails for the range value, it should fall back to string comparison
      // 'invalid-date' char sum: ~1200, number 1704067200000 > 1200
      expect(range.isMatch({ gt: 'invalid-date' }, 1704067200000)).toBe(true); // number > string sum
      expect(range.isMatch({ gt: 'not-a-date' }, 1000)).toBe(true); // 1000 > char sum of "not-a-date" (~900)
      
      // Invalid date math should fall back to 'now'
      expect(range.isMatch({ gte: 'now-invalid' }, 1704067200000)).toBe(true); // falls back to 'now'
    });

    it('should demonstrate practical mixed-type scenarios', () => {
      // Scenario: comparing Unix timestamps with relative dates
      const oneHourAgo = 1704067200000 - (60 * 60 * 1000); // 1 hour before mock time
      const oneHourLater = 1704067200000 + (60 * 60 * 1000); // 1 hour after mock time
      
      // Find events within last 2 hours
      expect(range.isMatch({ gte: 'now-2h' }, oneHourAgo)).toBe(true);
      expect(range.isMatch({ gte: 'now-2h' }, oneHourLater)).toBe(true);
      
      // Find events older than 3 hours
      const threeHoursAgo = 1704067200000 - (3 * 60 * 60 * 1000);
      expect(range.isMatch({ lt: 'now-2h' }, threeHoursAgo)).toBe(true);
    });

    it('should handle real-world log filtering scenarios', () => {
      // Scenario 1: Filter numerical timestamps with ISO date strings
      const systemStartup = 1704067200000; // 2024-01-01T00:00:00Z as number
      const userLogin = 1703980800000; // 2023-12-31T00:00:00Z as number (1 day ago)
      const systemError = 1704153600000; // 2024-01-02T00:00:00Z as number (1 day later)
      
      // Find logs where timestamp_ms (number) is after a specific ISO date
      expect(range.isMatch({ gte: '2024-01-01T00:00:00Z' }, systemStartup)).toBe(true);
      expect(range.isMatch({ gte: '2024-01-01T00:00:00Z' }, systemError)).toBe(true);
      expect(range.isMatch({ gte: '2024-01-01T00:00:00Z' }, userLogin)).toBe(false);
      
      // Scenario 2: Filter ISO date strings with numerical timestamps
      expect(range.isMatch({ lt: 1704067200000 }, '2023-12-31T00:00:00Z')).toBe(true); // User login before threshold
      expect(range.isMatch({ lt: 1704067200000 }, '2024-01-01T00:00:00Z')).toBe(false); // System startup at threshold
      expect(range.isMatch({ lt: 1704067200000 }, '2024-01-02T00:00:00Z')).toBe(false); // System error after threshold
    });

    it('should handle mixed-type date math scenarios', () => {
      // Scenario: Various timestamp formats with date math
      const mockTimestamp = 1704067200000; // Mock time as number
      const oneDayAgo = 1703980800000; // 2023-12-31 as number
      const oneDayLater = 1704153600000; // 2024-01-02 as number
      
      // Find logs where numerical timestamp is within last 2 days from mock time
      expect(range.isMatch({ gte: 'now-2d' }, mockTimestamp)).toBe(true);
      expect(range.isMatch({ gte: 'now-2d' }, oneDayAgo)).toBe(true);
      expect(range.isMatch({ gte: 'now-2d' }, oneDayLater)).toBe(true);
      
      // Complex scenario: timestamp >= now AND < now+1d
      expect(range.isMatch({ gte: 'now' }, mockTimestamp)).toBe(true);
      expect(range.isMatch({ lt: 'now+1d' }, mockTimestamp)).toBe(true);
      
      expect(range.isMatch({ gte: 'now' }, oneDayLater)).toBe(true);
      expect(range.isMatch({ lt: 'now+1d' }, oneDayLater)).toBe(false); // 2024-01-02 is NOT < 2024-01-02
      
      expect(range.isMatch({ gte: 'now' }, oneDayAgo)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for undefined/null field values', () => {
      expect(rangeFilter.isMatch({ gt: 0 }, null)).toBe(false);
      expect(rangeFilter.isMatch({ gt: 0 }, undefined)).toBe(false);
    });

    it('should handle empty range query', () => {
      expect(rangeFilter.isMatch({}, 100)).toBe(true);
      expect(rangeFilter.isMatch({}, 'any_value')).toBe(true);
      expect(rangeFilter.isMatch({}, null)).toBe(false);
    });

    it('should handle various data types as field values', () => {
      // Boolean (fallback to 0)
      expect(rangeFilter.isMatch({ gte: 0 }, true)).toBe(true);
      expect(rangeFilter.isMatch({ gt: 0 }, false)).toBe(false);
      
      // Arrays (fallback to 0)
      expect(rangeFilter.isMatch({ gte: 0 }, [])).toBe(true);
      expect(rangeFilter.isMatch({ gt: 0 }, [1, 2, 3])).toBe(false);
      
      // Objects (fallback to 0)
      expect(rangeFilter.isMatch({ gte: 0 }, {})).toBe(true);
      expect(rangeFilter.isMatch({ gt: 0 }, { key: 'value' })).toBe(false);
    });

    it('should handle scientific notation', () => {
      expect(rangeFilter.isMatch({ gt: 1e2 }, 150)).toBe(true); // 1e2 = 100
      expect(rangeFilter.isMatch({ lt: 1e3 }, 150)).toBe(true); // 1e3 = 1000
      expect(rangeFilter.isMatch({ gte: 1.5e2 }, 150)).toBe(true); // 1.5e2 = 150
    });
  });
});