/**
 * Interface for getting the current time
 */
export interface Clock {
  /**
   * Get the current timestamp in milliseconds
   */
  now(): number;
}

/**
 * Real clock implementation that uses the system time
 */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

/**
 * Mock clock implementation that returns a fixed time
 */
export class MockClock implements Clock {
  private currentTime: number;

  constructor(fixedTime: string | number | Date) {
    if (typeof fixedTime === 'string') {
      this.currentTime = new Date(fixedTime).getTime();
    } else if (typeof fixedTime === 'number') {
      this.currentTime = fixedTime;
    } else if (fixedTime instanceof Date) {
      this.currentTime = fixedTime.getTime();
    } else {
      throw new Error('Invalid time format for MockClock');
    }
  }

  now(): number {
    return this.currentTime;
  }

  /**
   * Set a new fixed time
   */
  setTime(time: string | number | Date): void {
    if (typeof time === 'string') {
      this.currentTime = new Date(time).getTime();
    } else if (typeof time === 'number') {
      this.currentTime = time;
    } else if (time instanceof Date) {
      this.currentTime = time.getTime();
    }
  }
}
