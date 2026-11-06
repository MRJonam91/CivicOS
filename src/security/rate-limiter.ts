// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(options: RateLimitOptions = { windowMs: 60000, maxRequests: 60 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  public check(key: string, now: number = Date.now()): { allowed: boolean; remaining: number; resetMs: number } {
    const timestamps = this.requests.get(key) || [];
    const windowStart = now - this.windowMs;

    // Prune expired timestamps
    const active = timestamps.filter(t => t > windowStart);

    if (active.length >= this.maxRequests) {
      const oldest = active[0] || now;
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return { allowed: false, remaining: 0, resetMs };
    }

    active.push(now);
    this.requests.set(key, active);

    return {
      allowed: true,
      remaining: this.maxRequests - active.length,
      resetMs: this.windowMs
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}
