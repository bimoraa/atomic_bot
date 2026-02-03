import * as db from "./database"
import { db_cache } from "./cache"

/**
 * - GENERATE CACHE KEY FOR DATABASE QUERIES - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @returns {string} Cache key
 */
function generate_cache_key(collection: string, filter: object): string {
    const filter_str = JSON.stringify(filter, Object.keys(filter).sort())
    return `${collection}:${filter_str}`
}

/**
 * - INVALIDATE CACHE FOR COLLECTION - \\
 * @param {string} collection - Collection name
 * @returns {void}
 */
export function invalidate_collection_cache(collection: string): void {
    const keys = db_cache.keys()
    for (const key of keys) {
        if (key.startsWith(`${collection}:`)) {
            db_cache.delete(key)
        }
    }
}

/**
 * - CACHED FIND ONE WITH READ-THROUGH PATTERN - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @param {number} ttl_ms - Optional TTL override
 * @returns {Promise<T | null>} Query result
 */
export async function cached_find_one<T extends object>(
    collection: string,
    filter: object,
    ttl_ms?: number
): Promise<T | null> {
    const cache_key = generate_cache_key(collection, filter)

    return await db_cache.get_or_set_async(
        cache_key,
        async () => {
            return await db.find_one<T>(collection, filter)
        },
        ttl_ms
    )
}

/**
 * - CACHED FIND MANY WITH READ-THROUGH PATTERN - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @param {number} ttl_ms - Optional TTL override
 * @returns {Promise<T[]>} Query results
 */
export async function cached_find_many<T extends object>(
    collection: string,
    filter: object = {},
    ttl_ms?: number
): Promise<T[]> {
    const cache_key = generate_cache_key(collection, filter)

    return await db_cache.get_or_set_async(
        cache_key,
        async () => {
            return await db.find_many<T>(collection, filter)
        },
        ttl_ms
    )
}

/**
 * - UPDATE ONE WITH CACHE INVALIDATION - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @param {Partial<T>} update - Update data
 * @param {boolean} upsert - Upsert flag
 * @returns {Promise<boolean>} Success status
 */
export async function cached_update_one<T extends object>(
    collection: string,
    filter: object,
    update: Partial<T>,
    upsert: boolean = false
): Promise<boolean> {
    const result = await db.update_one<T>(collection, filter, update, upsert)

    if (result) {
        invalidate_collection_cache(collection)
    }

    return result
}

/**
 * - INSERT ONE WITH CACHE INVALIDATION - \\
 * @param {string} collection - Collection name
 * @param {T} doc - Document to insert
 * @returns {Promise<string>} Inserted ID
 */
export async function cached_insert_one<T extends object>(
    collection: string,
    doc: T
): Promise<string> {
    const result = await db.insert_one<T>(collection, doc)

    invalidate_collection_cache(collection)

    return result
}

/**
 * - DELETE ONE WITH CACHE INVALIDATION - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @returns {Promise<boolean>} Success status
 */
export async function cached_delete_one(
    collection: string,
    filter: object
): Promise<boolean> {
    const result = await db.delete_one(collection, filter)

    if (result) {
        invalidate_collection_cache(collection)
    }

    return result
}

/**
 * - DELETE MANY WITH CACHE INVALIDATION - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @returns {Promise<number>} Number deleted
 */
export async function cached_delete_many(
    collection: string,
    filter: object
): Promise<number> {
    const result = await db.delete_many(collection, filter)

    if (result > 0) {
        invalidate_collection_cache(collection)
    }

    return result
}

/**
 * - INCREMENT WITH CACHE INVALIDATION - \\
 * @param {string} collection - Collection name
 * @param {object} filter - Query filter
 * @param {string} field - Field to increment
 * @param {number} amount - Amount to increment
 * @returns {Promise<void>}
 */
export async function cached_increment(
    collection: string,
    filter: object,
    field: string,
    amount: number = 1
): Promise<void> {
    await db.increment(collection, filter, field, amount)

    invalidate_collection_cache(collection)
}

/**
 * - PREFETCH RELATED DATA - \\
 * @param {string} collection - Collection name
 * @param {object[]} filters - Array of filters to prefetch
 * @param {number} ttl_ms - Optional TTL override
 * @returns {Promise<void>}
 */
export async function prefetch_data<T extends object>(
    collection: string,
    filters: object[],
    ttl_ms?: number
): Promise<void> {
    const promises = filters.map(filter => cached_find_one<T>(collection, filter, ttl_ms))
    await Promise.all(promises)
}

/**
 * - WARM CACHE FOR COLLECTION - \\
 * @param {string} collection - Collection name
 * @param {number} ttl_ms - Optional TTL override
 * @returns {Promise<void>}
 */
export async function warm_collection_cache<T extends object>(
    collection: string,
    ttl_ms?: number
): Promise<void> {
    const data = await db.find_many<T>(collection, {})

    for (const item of data) {
        const cache_key = generate_cache_key(collection, item)
        db_cache.set(cache_key, item, ttl_ms)
    }

    console.log(`[ - DB CACHE - ] Warmed cache for ${collection}: ${data.length} items`)
}
