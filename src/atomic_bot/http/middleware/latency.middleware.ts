/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 超轻量响应延迟追踪中间件，使用固定大小的 Float64Array 环形缓冲区，零 GC 压力 - \\
// - ultra-lightweight response latency middleware using a fixed Float64Array ring buffer, zero GC pressure - \\

import { Request, Response, NextFunction } from "express"

// - ring buffer: power-of-2 size enables bitmask O(1) wrap instead of modulo - \\
const __WINDOW_SIZE = 2048
const __MASK        = __WINDOW_SIZE - 1

// - preallocated typed array — no heap growth, no GC across requests - \\
const __samples    = new Float64Array(__WINDOW_SIZE)
const __sort_buf   = new Float64Array(__WINDOW_SIZE)
let   __write_pos  = 0
let   __fill_count = 0

// - ─────────────────────────────────────── - \\

/**
 * @description express middleware that measures response latency via process.hrtime.bigint()
 *              and injects X-Response-Time header before the response is flushed.
 *              samples are stored in a ring buffer for stats computation — zero allocations per request.
 * @param {Request}      req  - inbound express request
 * @param {Response}     res  - outbound express response
 * @param {NextFunction} next - next middleware
 * @returns {void}
 */
export function latency_middleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()

  // - override res.end once to capture timing before headers seal - \\
  const _end = res.end.bind(res) as typeof res.end

  ;(res as any).end = function (this: Response, ...args: Parameters<typeof res.end>) {
    const elapsed_ms = Number(process.hrtime.bigint() - start) / 1_000_000

    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${elapsed_ms.toFixed(2)}ms`)
    }

    // - record into ring buffer, bitmask replaces modulo - \\
    __samples[__write_pos & __MASK] = elapsed_ms
    __write_pos++
    if (__fill_count < __WINDOW_SIZE) __fill_count++

    return _end.apply(res, args)
  }

  next()
}

// - ─────────────────────────────────────── - \\

/**
 * @description compute latency percentile stats from the current ring buffer window.
 *              copies into a scratch Float64Array and sorts in-place — no heap allocation.
 * @returns {{ p50: number, p95: number, p99: number, avg: number, min: number, max: number, samples: number }}
 */
export function get_latency_stats(): {
  p50    : number
  p95    : number
  p99    : number
  avg    : number
  min    : number
  max    : number
  samples: number
} {
  if (__fill_count === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0, samples: 0 }
  }

  const count = __fill_count

  // - copy active slice into scratch buffer and sort - \\
  __sort_buf.set(__samples.subarray(0, count))
  __sort_buf.subarray(0, count).sort()

  let sum = 0
  for (let i = 0; i < count; i++) sum += __sort_buf[i]!

  const idx_p50 = Math.floor(count * 0.50)
  const idx_p95 = Math.floor(count * 0.95)
  const idx_p99 = Math.floor(count * 0.99)

  return {
    p50    : +(__sort_buf[idx_p50]!.toFixed(3)),
    p95    : +(__sort_buf[idx_p95]!.toFixed(3)),
    p99    : +(__sort_buf[idx_p99]!.toFixed(3)),
    avg    : +(sum / count).toFixed(3),
    min    : +(__sort_buf[0]!.toFixed(3)),
    max    : +(__sort_buf[count - 1]!.toFixed(3)),
    samples: count,
  }
}

/**
 * @description resets the ring buffer — useful for tests or manual resets
 * @returns {void}
 */
export function reset_latency_stats(): void {
  __samples.fill(0)
  __write_pos  = 0
  __fill_count = 0
}
