import { Clock, SystemClock } from './Clock';

export interface RangeQuery {
  gt?: any;
  gte?: any;
  lt?: any;
  lte?: any;
}

export class RangeFilter {
  private clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock || new SystemClock();
  }

  /**
   * Check if a field value matches the range criteria
   */
  public isMatch(rangeQuery: RangeQuery, fieldValue: any): boolean {
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    const normalizedValue = this.normalizeValue(fieldValue);
    
    // Check each range condition
    if (rangeQuery.gt !== undefined) {
      const compareValue = this.normalizeValue(rangeQuery.gt);
      if (normalizedValue <= compareValue) return false;
    }
    
    if (rangeQuery.gte !== undefined) {
      const compareValue = this.normalizeValue(rangeQuery.gte);
      if (normalizedValue < compareValue) return false;
    }
    
    if (rangeQuery.lt !== undefined) {
      const compareValue = this.normalizeValue(rangeQuery.lt);
      if (normalizedValue >= compareValue) return false;
    }
    
    if (rangeQuery.lte !== undefined) {
      const compareValue = this.normalizeValue(rangeQuery.lte);
      if (normalizedValue > compareValue) return false;
    }
    
    return true;
  }

  /**
   * Convert various value types to comparable numbers
   */
  private normalizeValue(value: any): number {
    // Handle numbers directly
    if (typeof value === 'number') {
      return value;
    }
    
    // Handle strings
    if (typeof value === 'string') {
      // Handle date math expressions (now, now-1d, etc.)
      if (value.startsWith('now')) {
        return this.parseDateMath(value);
      }
      
      // Handle ISO date strings (yyyy-mm-dd format)
      if (this.isDateString(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
      
      // Try to parse as number
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
      
      // For non-date strings, use character code sum for basic string comparison
      return this.stringToNumber(value);
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      return value.getTime();
    }
    
    // Fallback for other types
    return 0;
  }

  /**
   * Parse date math expressions like "now", "now-1d", "now+2h"
   */
  private parseDateMath(expression: string): number {
    const now = this.clock.now();
    
    if (expression === 'now') {
      return now;
    }
    
    // Parse expressions like "now-1d", "now+2h", etc.
    const match = expression.match(/^now([+-])(\d+)([smhdwMy])$/);
    if (!match) {
      // If we can't parse it, just return now
      return now;
    }
    
    const [, operator, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);
    
    if (isNaN(amount)) {
      return now;
    }
    
    // Convert units to milliseconds
    const unitMultipliers: Record<string, number> = {
      's': 1000,           // seconds
      'm': 60 * 1000,      // minutes
      'h': 60 * 60 * 1000, // hours
      'd': 24 * 60 * 60 * 1000, // days
      'w': 7 * 24 * 60 * 60 * 1000, // weeks
      'M': 30 * 24 * 60 * 60 * 1000, // months (approximate)
      'y': 365 * 24 * 60 * 60 * 1000, // years (approximate)
    };
    
    const multiplier = unitMultipliers[unit] || 0;
    const offset = amount * multiplier;
    
    if (operator === '+') {
      return now + offset;
    } else {
      return now - offset;
    }
  }

  /**
   * Check if a string looks like a date
   */
  private isDateString(value: string): boolean {
    // Check for ISO date format patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // yyyy-mm-dd
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // yyyy-mm-ddThh:mm:ss
    ];
    
    return datePatterns.some(pattern => pattern.test(value));
  }

  /**
   * Convert string to number for basic string comparison
   */
  private stringToNumber(str: string): number {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    return sum;
  }


}
