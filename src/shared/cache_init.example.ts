// - EXAMPLE: INTEGRATING CACHE MANAGER INTO BOT STARTUP - \\

import { Client } from 'discord.js'
import { cache_manager, cache, db } from './shared/utils'

/**
 * - INITIALIZE CACHE SYSTEM - \\
 * Call this when bot is ready to setup caching and monitoring
 */
export async function initialize_cache_system(client: Client): Promise<void> {
    console.log('[ - CACHE INIT - ] Initializing cache system...')

    try {
        // - Warm up caches with frequently accessed data - \\
        await cache_manager.warm_caches()

        // - Start periodic cache statistics logging (every 10 minutes) - \\
        const stats_timer = cache_manager.start_cache_stats_logging(10 * 60 * 1000)

        // - Start periodic cache optimization (every 30 minutes) - \\
        const optimize_timer = cache_manager.start_cache_optimization(30 * 60 * 1000)

        // - Log initial cache health - \\
        const health = cache_manager.get_cache_health()
        console.log(`[ - CACHE INIT - ] Initial cache health: ${health.healthy ? 'HEALTHY' : 'NEEDS ATTENTION'}`)

        if (health.warnings.length > 0) {
            console.log('[ - CACHE INIT - ] Warnings:')
            health.warnings.forEach(warning => console.log(`  - ${warning}`))
        }

        // - Log initial database pool stats - \\
        const pool_stats = db.get_pool_stats()
        if (pool_stats) {
            console.log(`[ - CACHE INIT - ] Database pool: total=${pool_stats.total}, idle=${pool_stats.idle}, waiting=${pool_stats.waiting}`)
        }

        console.log('[ - CACHE INIT - ] Cache system initialized successfully')

        // - Cleanup on bot shutdown - \\
        process.on('SIGINT', () => {
            clearInterval(stats_timer)
            clearInterval(optimize_timer)
            console.log('[ - CACHE INIT - ] Cache timers stopped')
        })

    } catch (error) {
        console.error('[ - CACHE INIT - ] Failed to initialize cache system:', error)
    }
}

/**
 * - EXAMPLE USAGE IN YOUR BOT'S INDEX.TS - \\
 */
/*
import { initialize_cache_system } from './shared/cache_init'

client.once('ready', async () => {
  console.log(`[ - BOT - ] Logged in as ${client.user?.tag}`)
  
  // - Initialize cache system - \\
  await initialize_cache_system(client)
  
  console.log(`[ - BOT - ] Bot is ready!`)
})
*/
