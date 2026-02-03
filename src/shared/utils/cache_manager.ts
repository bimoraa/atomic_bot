import { guild_cache, user_cache, db_cache, log_all_cache_stats, cache_stats } from "./cache"
import * as db_cache_util from "./db_cache"

/**
 * - CACHE WARMUP ON STARTUP - \\
 * @returns {Promise<void>}
 */
export async function warm_caches(): Promise<void> {
    console.log('[ - CACHE MANAGER - ] Starting cache warmup...')

    try {
        await db_cache_util.warm_collection_cache('guild_settings', 5 * 60 * 1000)

        console.log('[ - CACHE MANAGER - ] Cache warmup completed')
    } catch (error) {
        console.error('[ - CACHE MANAGER - ] Cache warmup failed:', error)
    }
}

/**
 * - START PERIODIC CACHE STATISTICS LOGGING - \\
 * @param {number} interval_ms - Logging interval in milliseconds
 * @returns {NodeJS.Timeout} Interval timer
 */
export function start_cache_stats_logging(interval_ms: number = 10 * 60 * 1000): NodeJS.Timeout {
    console.log(`[ - CACHE MANAGER - ] Starting cache stats logging every ${interval_ms / 1000}s`)

    return setInterval(() => {
        log_all_cache_stats()
    }, interval_ms)
}

/**
 * - INVALIDATE ALL CACHES - \\
 * @returns {void}
 */
export function invalidate_all_caches(): void {
    console.log('[ - CACHE MANAGER - ] Invalidating all caches...')

    guild_cache.clear()
    user_cache.clear()
    db_cache.clear()

    console.log('[ - CACHE MANAGER - ] All caches invalidated')
}

/**
 * - GET CACHE HEALTH - \\
 * @returns {object} Cache health metrics
 */
export function get_cache_health(): {
    healthy: boolean
    stats: Record<string, cache_stats>
    warnings: string[]
} {
    const stats = {
        guild: guild_cache.get_stats(),
        user: user_cache.get_stats(),
        database: db_cache.get_stats(),
    }

    const warnings: string[] = []
    let healthy = true

    for (const [name, cache_stats] of Object.entries(stats)) {
        if (cache_stats.hit_rate < 50 && cache_stats.hits + cache_stats.misses > 100) {
            warnings.push(`${name} cache hit rate is low: ${cache_stats.hit_rate}%`)
            healthy = false
        }

        if (cache_stats.evictions > 1000) {
            warnings.push(`${name} cache has high evictions: ${cache_stats.evictions}`)
        }
    }

    return {
        healthy,
        stats,
        warnings,
    }
}

/**
 * - OPTIMIZE CACHE SIZES - \\
 * @returns {void}
 */
export function optimize_cache_sizes(): void {
    const health = get_cache_health()

    console.log('[ - CACHE MANAGER - ] Cache health check:')
    console.log(`[ - CACHE MANAGER - ] Healthy: ${health.healthy}`)

    if (health.warnings.length > 0) {
        console.log('[ - CACHE MANAGER - ] Warnings:')
        for (const warning of health.warnings) {
            console.log(`[ - CACHE MANAGER - ]   - ${warning}`)
        }
    }

    log_all_cache_stats()
}

/**
 * - PERIODIC CACHE OPTIMIZATION - \\
 * @param {number} interval_ms - Optimization interval in milliseconds
 * @returns {NodeJS.Timeout} Interval timer
 */
export function start_cache_optimization(interval_ms: number = 30 * 60 * 1000): NodeJS.Timeout {
    console.log(`[ - CACHE MANAGER - ] Starting periodic cache optimization every ${interval_ms / 1000}s`)

    return setInterval(() => {
        optimize_cache_sizes()
    }, interval_ms)
}
