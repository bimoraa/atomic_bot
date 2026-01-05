import { Pool } from "pg"

let pool: Pool | null = null
let connected         = false

export async function connect(): Promise<Pool | null> {
  if (pool) return pool

  const connection_string = process.env.DATABASE_URL

  if (!connection_string) {
    console.error("[ - POSTGRESQL - ] DATABASE_URL not found in environment variables")
    return null
  }

  try {
    pool = new Pool({
      connectionString        : connection_string,
      ssl                     : { rejectUnauthorized: false },
      max                     : 10,
      idleTimeoutMillis       : 30000,
      connectionTimeoutMillis : 15000,
    })

    pool.on('connect', async (client) => {
      await client.query("SET TIME ZONE 'Asia/Jakarta'")
    })

    const client = await pool.connect()
    
    await client.query("SET TIME ZONE 'Asia/Jakarta'")
    
    client.release()
    connected = true

    console.log("[ - POSTGRESQL - ] Connected to database (UTC+7)")
    
    await init_tables()
    
    return pool
  } catch (err) {
    console.error("[ - POSTGRESQL - ] Connection failed:", (err as Error).message)
    console.log("[ - POSTGRESQL - ] Bot will continue without database features")
    return null
  }
}

export function is_connected(): boolean {
  return connected
}

export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end()
    pool      = null
    connected = false
    console.log("[ - POSTGRESQL - ] Disconnected")
  }
}

export function get_pool(): Pool {
  if (!pool) throw new Error("Database not connected")
  return pool
}

async function init_tables(): Promise<void> {
  const client = await get_pool().connect()
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS reputation_records (
        id         SERIAL PRIMARY KEY,
        user_id    VARCHAR(255) NOT NULL,
        guild_id   VARCHAR(255) NOT NULL,
        points     INTEGER DEFAULT 0,
        given      INTEGER DEFAULT 0,
        received   INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, guild_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS reputation_logs (
        id         SERIAL PRIMARY KEY,
        from_id    VARCHAR(255) NOT NULL,
        to_id      VARCHAR(255) NOT NULL,
        guild_id   VARCHAR(255) NOT NULL,
        amount     INTEGER NOT NULL,
        reason     TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_channel_records (
        id          SERIAL PRIMARY KEY,
        user_id     VARCHAR(255) NOT NULL,
        guild_id    VARCHAR(255) NOT NULL,
        channel_id  VARCHAR(255) NOT NULL,
        joined_at   TIMESTAMP NOT NULL,
        left_at     TIMESTAMP,
        duration    INTEGER DEFAULT 0
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS server_tag_users (
        id         SERIAL PRIMARY KEY,
        user_id    VARCHAR(255) NOT NULL,
        guild_id   VARCHAR(255) NOT NULL,
        username   VARCHAR(255),
        tag        VARCHAR(255),
        added_at   BIGINT,
        UNIQUE(user_id, guild_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS free_script_users (
        id                  SERIAL PRIMARY KEY,
        user_id             VARCHAR(255) NOT NULL,
        guild_id            VARCHAR(255),
        username            VARCHAR(255),
        user_key            VARCHAR(255),
        created_at          BIGINT,
        whitelisted_at      TIMESTAMP DEFAULT NOW(),
        last_tag_check      TIMESTAMP,
        has_tag             BOOLEAN DEFAULT TRUE,
        warning_sent        BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS hwid_less_schedule (
        id             SERIAL PRIMARY KEY,
        guild_id       VARCHAR(255) NOT NULL,
        channel_id     VARCHAR(255) NOT NULL,
        scheduled_time BIGINT NOT NULL,
        enabled        BOOLEAN NOT NULL,
        created_by     VARCHAR(255) NOT NULL,
        executed       BOOLEAN DEFAULT FALSE,
        created_at     BIGINT
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS booster_whitelist (
        id            SERIAL PRIMARY KEY,
        user_id       VARCHAR(255) NOT NULL,
        guild_id      VARCHAR(255) NOT NULL,
        luarmor_key   VARCHAR(255),
        whitelisted   BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, guild_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_logs (
        id          SERIAL PRIMARY KEY,
        work_id     VARCHAR(255) NOT NULL,
        staff_id    VARCHAR(255) NOT NULL,
        staff_name  VARCHAR(255),
        type        VARCHAR(50),
        thread_link TEXT,
        proof_link  TEXT,
        amount      BIGINT DEFAULT 0,
        salary      BIGINT DEFAULT 0,
        week_number INTEGER,
        year        INTEGER,
        date        VARCHAR(255),
        created_at  BIGINT
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_reports (
        id                   SERIAL PRIMARY KEY,
        staff_id             VARCHAR(255) NOT NULL UNIQUE,
        staff_name           VARCHAR(255),
        total_work           INTEGER DEFAULT 0,
        total_work_this_week INTEGER DEFAULT 0,
        total_salary         BIGINT DEFAULT 0,
        salary_this_week     BIGINT DEFAULT 0,
        week_number          INTEGER,
        year                 INTEGER,
        last_work            BIGINT
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS loa_requests (
        id          SERIAL PRIMARY KEY,
        message_id  VARCHAR(255),
        user_id     VARCHAR(255) NOT NULL,
        user_tag    VARCHAR(255),
        guild_id    VARCHAR(255) NOT NULL,
        channel_id  VARCHAR(255),
        reason      TEXT,
        start_date  BIGINT,
        end_date    BIGINT,
        status      VARCHAR(50) DEFAULT 'pending',
        created_at  BIGINT
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS answer_stats (
        id        SERIAL PRIMARY KEY,
        staff_id  VARCHAR(255) NOT NULL UNIQUE,
        weekly    JSONB DEFAULT '{}',
        total     INTEGER DEFAULT 0
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS afk_users (
        id                 SERIAL PRIMARY KEY,
        user_id            VARCHAR(255) NOT NULL UNIQUE,
        reason             TEXT NOT NULL,
        timestamp          BIGINT NOT NULL,
        original_nickname  VARCHAR(255),
        created_at         TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS ghost_pings (
        id         SERIAL PRIMARY KEY,
        message_id VARCHAR(255) NOT NULL UNIQUE,
        author_id  VARCHAR(255) NOT NULL,
        author_tag VARCHAR(255),
        channel_id VARCHAR(255) NOT NULL,
        guild_id   VARCHAR(255) NOT NULL,
        content    TEXT,
        mentioned  TEXT[] NOT NULL,
        timestamp  BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS warnings (
        id           SERIAL PRIMARY KEY,
        warning_id   VARCHAR(255) NOT NULL UNIQUE,
        guild_id     VARCHAR(255) NOT NULL,
        user_id      VARCHAR(255) NOT NULL,
        moderator_id VARCHAR(255) NOT NULL,
        reason       TEXT,
        timestamp    BIGINT NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(guild_id, user_id)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ghost_pings_mentioned ON ghost_pings USING GIN(mentioned)
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS generic_data (
        id          SERIAL PRIMARY KEY,
        collection  VARCHAR(255) NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_generic_data_collection ON generic_data(collection)
    `)

    await migrate_tables(client)

    console.log("[ - POSTGRESQL - ] Tables initialized")
  } finally {
    client.release()
  }
}

async function migrate_tables(client: any): Promise<void> {
  try {
    await client.query(`
      ALTER TABLE server_tag_users 
      ADD COLUMN IF NOT EXISTS username VARCHAR(255)
    `)

    await client.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE server_tag_users 
          ALTER COLUMN added_at TYPE BIGINT USING EXTRACT(EPOCH FROM added_at)::BIGINT;
        EXCEPTION
          WHEN OTHERS THEN
            ALTER TABLE server_tag_users 
            DROP COLUMN IF EXISTS added_at;
            ALTER TABLE server_tag_users 
            ADD COLUMN added_at BIGINT;
        END;
      END $$;
    `).catch(() => {})

    await client.query(`
      ALTER TABLE loa_requests 
      ALTER COLUMN start_date TYPE BIGINT USING EXTRACT(EPOCH FROM start_date)::BIGINT
    `).catch(() => {})

    await client.query(`
      ALTER TABLE loa_requests 
      ALTER COLUMN end_date TYPE BIGINT USING EXTRACT(EPOCH FROM end_date)::BIGINT
    `).catch(() => {})

    await client.query(`
      ALTER TABLE loa_requests 
      ALTER COLUMN created_at TYPE BIGINT USING EXTRACT(EPOCH FROM created_at)::BIGINT
    `).catch(() => {})

    await client.query(`
      ALTER TABLE hwid_less_schedule 
      ALTER COLUMN scheduled_time TYPE BIGINT USING EXTRACT(EPOCH FROM scheduled_time)::BIGINT
    `).catch(() => {})

    await client.query(`
      ALTER TABLE hwid_less_schedule 
      ALTER COLUMN created_at TYPE BIGINT USING EXTRACT(EPOCH FROM created_at)::BIGINT
    `).catch(() => {})

    await client.query(`ALTER TABLE work_reports DROP COLUMN IF EXISTS guild_id`).catch(() => {})
    await client.query(`ALTER TABLE work_reports DROP COLUMN IF EXISTS total_actions`).catch(() => {})
    await client.query(`ALTER TABLE work_reports DROP COLUMN IF EXISTS weekly_actions`).catch(() => {})
    await client.query(`ALTER TABLE work_reports DROP COLUMN IF EXISTS created_at`).catch(() => {})
    await client.query(`ALTER TABLE work_reports DROP COLUMN IF EXISTS updated_at`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS total_work INTEGER DEFAULT 0`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS total_work_this_week INTEGER DEFAULT 0`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS total_salary BIGINT DEFAULT 0`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS salary_this_week BIGINT DEFAULT 0`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS week_number INTEGER`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS year INTEGER`).catch(() => {})
    await client.query(`ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS last_work BIGINT`).catch(() => {})

    await client.query(`ALTER TABLE work_logs DROP COLUMN IF EXISTS guild_id`).catch(() => {})
    await client.query(`ALTER TABLE work_logs DROP COLUMN IF EXISTS action`).catch(() => {})
    await client.query(`ALTER TABLE work_logs DROP COLUMN IF EXISTS details`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS work_id VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS type VARCHAR(50)`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS thread_link TEXT`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS proof_link TEXT`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 0`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS date VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ALTER COLUMN created_at TYPE BIGINT USING EXTRACT(EPOCH FROM created_at)::BIGINT * 1000`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ALTER COLUMN week_number DROP NOT NULL`).catch(() => {})
    await client.query(`ALTER TABLE work_logs ALTER COLUMN year DROP NOT NULL`).catch(() => {})

    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS message_id VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS user_tag VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS type VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS original_nickname VARCHAR(255)`).catch(() => {})
    
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'loa_requests' AND column_name = 'created_at' AND data_type != 'bigint'
        ) THEN
          ALTER TABLE loa_requests ALTER COLUMN created_at TYPE BIGINT USING EXTRACT(EPOCH FROM created_at)::BIGINT;
        END IF;
      END $$;
    `).catch(() => {})
    
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'loa_requests' AND column_name = 'start_date' AND data_type != 'bigint'
        ) THEN
          ALTER TABLE loa_requests ALTER COLUMN start_date TYPE BIGINT USING EXTRACT(EPOCH FROM start_date)::BIGINT;
        END IF;
      END $$;
    `).catch(() => {})
    
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'loa_requests' AND column_name = 'end_date' AND data_type != 'bigint'
        ) THEN
          ALTER TABLE loa_requests ALTER COLUMN end_date TYPE BIGINT USING EXTRACT(EPOCH FROM end_date)::BIGINT;
        END IF;
      END $$;
    `).catch(() => {})

    await client.query(`ALTER TABLE free_script_users ADD COLUMN IF NOT EXISTS username VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE free_script_users ADD COLUMN IF NOT EXISTS user_key VARCHAR(255)`).catch(() => {})
    await client.query(`ALTER TABLE free_script_users ADD COLUMN IF NOT EXISTS created_at BIGINT`).catch(() => {})

    console.log("[ - POSTGRESQL - ] Table migrations completed")
  } catch (err) {
    console.error("[ - POSTGRESQL - ] Migration error:", (err as Error).message)
  }
}

function get_table_name(collection: string): string {
  const table_map: Record<string, string> = {
    reputation_records    : "reputation_records",
    reputation_logs       : "reputation_logs",
    voice_channel_records : "voice_channel_records",
    server_tag_users      : "server_tag_users",
    free_script_users     : "free_script_users",
    hwid_less_schedule    : "hwid_less_schedule",
    booster_whitelist     : "booster_whitelist",
    work_logs             : "work_logs",
    work_reports          : "work_reports",
    loa_requests          : "loa_requests",
    answer_stats          : "answer_stats",
    afk_users             : "afk_users",
    ghost_pings           : "ghost_pings",
    warnings              : "warnings",
  }
  
  return table_map[collection] || "generic_data"
}

function build_where_clause(filter: object, start_index: number = 1): { clause: string; values: any[] } {
  const keys   = Object.keys(filter)
  const values = Object.values(filter)
  
  if (keys.length === 0) {
    return { clause: "", values: [] }
  }
  
  const conditions: string[] = []
  const final_values: any[]  = []
  let param_idx              = start_index
  
  for (let i = 0; i < keys.length; i++) {
    const key   = keys[i]
    const value = values[i]
    
    if (value === null) {
      conditions.push(`${key} IS NULL`)
    } else if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const operators = Object.keys(value)
      
      for (const op of operators) {
        const op_value = (value as any)[op]
        
        switch (op) {
          case "$lte":
            conditions.push(`${key} <= $${param_idx}`)
            final_values.push(op_value)
            param_idx++
            break
          case "$gte":
            conditions.push(`${key} >= $${param_idx}`)
            final_values.push(op_value)
            param_idx++
            break
          case "$lt":
            conditions.push(`${key} < $${param_idx}`)
            final_values.push(op_value)
            param_idx++
            break
          case "$gt":
            conditions.push(`${key} > $${param_idx}`)
            final_values.push(op_value)
            param_idx++
            break
          case "$ne":
            conditions.push(`${key} != $${param_idx}`)
            final_values.push(op_value)
            param_idx++
            break
          case "$in":
            if (Array.isArray(op_value)) {
              const placeholders = op_value.map(() => `$${param_idx++}`).join(", ")
              conditions.push(`${key} IN (${placeholders})`)
              final_values.push(...op_value)
            }
            break
          case "$nin":
            if (Array.isArray(op_value)) {
              const placeholders = op_value.map(() => `$${param_idx++}`).join(", ")
              conditions.push(`${key} NOT IN (${placeholders})`)
              final_values.push(...op_value)
            }
            break
          default:
            conditions.push(`${key} = $${param_idx}`)
            final_values.push(value)
            param_idx++
        }
      }
    } else {
      conditions.push(`${key} = $${param_idx}`)
      final_values.push(value)
      param_idx++
    }
  }
  
  return {
    clause : "WHERE " + conditions.join(" AND "),
    values : final_values,
  }
}

export async function find_one<T extends object>(
  coll: string,
  filter: object
): Promise<T | null> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const query  = `SELECT data FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""} LIMIT 1`
    const result = await get_pool().query<{ data: T }>(query, [coll, ...filter_entries.map(([, v]) => String(v))])
    
    if (result.rows.length === 0) return null
    return result.rows[0].data
  }
  
  const { clause, values } = build_where_clause(filter)
  const query              = `SELECT * FROM ${table} ${clause} LIMIT 1`
  const result             = await get_pool().query(query, values)
  
  if (result.rows.length === 0) return null
  return convert_row_to_object<T>(result.rows[0])
}

export async function find_many<T extends object>(
  coll: string,
  filter: object = {}
): Promise<T[]> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const query  = `SELECT data FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""}`
    const result = await get_pool().query<{ data: T }>(query, [coll, ...filter_entries.map(([, v]) => String(v))])
    
    return result.rows.map((row: { data: T }) => row.data)
  }
  
  const { clause, values } = build_where_clause(filter)
  const query              = `SELECT * FROM ${table} ${clause}`
  const result             = await get_pool().query(query, values)
  
  return result.rows.map((row: any) => convert_row_to_object<T>(row))
}

export async function insert_one<T extends object>(
  coll: string,
  doc: T
): Promise<string> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const query  = `INSERT INTO generic_data (collection, data) VALUES ($1, $2) RETURNING id`
    const result = await get_pool().query(query, [coll, JSON.stringify(doc)])
    return result.rows[0].id.toString()
  }
  
  const keys         = Object.keys(doc)
  const values       = Object.values(doc)
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ")
  const columns      = keys.join(", ")
  
  const query  = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING id`
  const result = await get_pool().query(query, values)
  
  return result.rows[0].id.toString()
}

export async function update_one<T extends object>(
  coll: string,
  filter: object,
  update: Partial<T>,
  upsert: boolean = false
): Promise<boolean> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const existing_query  = `SELECT id, data FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""} LIMIT 1`
    const existing_result = await get_pool().query(existing_query, [coll, ...filter_entries.map(([, v]) => String(v))])
    
    if (existing_result.rows.length > 0) {
      const merged_data  = { ...existing_result.rows[0].data, ...update }
      const update_query = `UPDATE generic_data SET data = $1 WHERE id = $2`
      await get_pool().query(update_query, [JSON.stringify(merged_data), existing_result.rows[0].id])
      return true
    } else if (upsert) {
      const new_doc = { ...filter, ...update }
      await insert_one(coll, new_doc)
      return true
    }
    return false
  }
  
  const { clause: where_clause, values: where_values } = build_where_clause(filter)
  
  const existing_query  = `SELECT id FROM ${table} ${where_clause} LIMIT 1`
  const existing_result = await get_pool().query(existing_query, where_values)
  
  if (existing_result.rows.length > 0) {
    const update_keys   = Object.keys(update)
    const update_values = Object.values(update)
    const set_clause    = update_keys.map((key, index) => `${key} = $${index + 1}`).join(", ")
    
    const adjusted_where = where_clause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + update_keys.length}`)
    const update_query   = `UPDATE ${table} SET ${set_clause} ${adjusted_where}`
    await get_pool().query(update_query, [...update_values, ...where_values])
    return true
  } else if (upsert) {
    const new_doc = { ...filter, ...update }
    await insert_one(coll, new_doc as T)
    return true
  }
  
  return false
}

export async function delete_one(
  coll: string,
  filter: object
): Promise<boolean> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const query  = `DELETE FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""}`
    const result = await get_pool().query(query, [coll, ...filter_entries.map(([, v]) => String(v))])
    return (result.rowCount ?? 0) > 0
  }
  
  const { clause, values } = build_where_clause(filter)
  const query              = `DELETE FROM ${table} ${clause}`
  const result             = await get_pool().query(query, values)
  
  return (result.rowCount ?? 0) > 0
}

export async function delete_many(
  coll: string,
  filter: object
): Promise<number> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const query  = `DELETE FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""}`
    const result = await get_pool().query(query, [coll, ...filter_entries.map(([, v]) => String(v))])
    return result.rowCount ?? 0
  }
  
  const { clause, values } = build_where_clause(filter)
  const query              = `DELETE FROM ${table} ${clause}`
  const result             = await get_pool().query(query, values)
  
  return result.rowCount ?? 0
}

export async function increment(
  coll: string,
  filter: object,
  field: string,
  amount: number = 1
): Promise<void> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const existing_query  = `SELECT id, data FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""} LIMIT 1`
    const existing_result = await get_pool().query(existing_query, [coll, ...filter_entries.map(([, v]) => String(v))])
    
    if (existing_result.rows.length > 0) {
      const data         = existing_result.rows[0].data
      data[field]        = (data[field] || 0) + amount
      const update_query = `UPDATE generic_data SET data = $1 WHERE id = $2`
      await get_pool().query(update_query, [JSON.stringify(data), existing_result.rows[0].id])
    } else {
      const new_doc = { ...filter, [field]: amount }
      await insert_one(coll, new_doc)
    }
    return
  }
  
  const { clause: where_clause, values: where_values } = build_where_clause(filter)
  
  const existing_query  = `SELECT id FROM ${table} ${where_clause} LIMIT 1`
  const existing_result = await get_pool().query(existing_query, where_values)
  
  if (existing_result.rows.length > 0) {
    const adjusted_where = where_clause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + 1}`)
    const update_query   = `UPDATE ${table} SET ${field} = COALESCE(${field}, 0) + $1 ${adjusted_where}`
    await get_pool().query(update_query, [amount, ...where_values])
  } else {
    const new_doc = { ...filter, [field]: amount }
    await insert_one(coll, new_doc as any)
  }
}

export async function count(
  coll: string,
  filter: object = {}
): Promise<number> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const query  = `SELECT COUNT(*) as count FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""}`
    const result = await get_pool().query(query, [coll, ...filter_entries.map(([, v]) => String(v))])
    return parseInt(result.rows[0].count)
  }
  
  const { clause, values } = build_where_clause(filter)
  const query              = `SELECT COUNT(*) as count FROM ${table} ${clause}`
  const result             = await get_pool().query(query, values)
  
  return parseInt(result.rows[0].count)
}

export async function find_many_sorted<T extends object>(
  coll: string,
  filter: object = {},
  sort_field: string,
  sort_order: "ASC" | "DESC" = "ASC"
): Promise<T[]> {
  const table = get_table_name(coll)
  
  if (table === "generic_data") {
    const filter_entries    = Object.entries(filter)
    const filter_conditions = filter_entries
      .map(([key], index) => `data->>'${key}' = $${index + 2}`)
      .join(" AND ")
    
    const query  = `SELECT data FROM generic_data WHERE collection = $1 ${filter_conditions ? "AND " + filter_conditions : ""} ORDER BY data->>'${sort_field}' ${sort_order}`
    const result = await get_pool().query<{ data: T }>(query, [coll, ...filter_entries.map(([, v]) => String(v))])
    
    return result.rows.map((row: { data: T }) => row.data)
  }
  
  const { clause, values } = build_where_clause(filter)
  const query              = `SELECT * FROM ${table} ${clause} ORDER BY ${sort_field} ${sort_order}`
  const result             = await get_pool().query(query, values)
  
  return result.rows.map((row: any) => convert_row_to_object<T>(row))
}

export async function update_jsonb_field(
  coll: string,
  filter: object,
  jsonb_field: string,
  jsonb_key: string,
  increment_value: number
): Promise<boolean> {
  const table = get_table_name(coll)
  
  const { clause: where_clause, values: where_values } = build_where_clause(filter)
  
  const existing_query  = `SELECT id, ${jsonb_field} FROM ${table} ${where_clause} LIMIT 1`
  const existing_result = await get_pool().query(existing_query, where_values)
  
  if (existing_result.rows.length === 0) {
    const new_doc = { ...filter, [jsonb_field]: { [jsonb_key]: increment_value }, total: increment_value }
    await insert_one(coll, new_doc as any)
    return true
  }
  
  const current_jsonb       = existing_result.rows[0][jsonb_field] || {}
  const current_value       = current_jsonb[jsonb_key] || 0
  current_jsonb[jsonb_key]  = current_value + increment_value
  
  const adjusted_where = where_clause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + 2}`)
  const update_query   = `UPDATE ${table} SET ${jsonb_field} = $1, total = COALESCE(total, 0) + $2 ${adjusted_where}`
  await get_pool().query(update_query, [JSON.stringify(current_jsonb), increment_value, ...where_values])
  
  return true
}

function convert_row_to_object<T>(row: any): T {
  const result: any       = {}
  const date_fields       = [
    "updated_at", "joined_at", "left_at", 
    "scheduled_time", "added_at", "whitelisted_at", 
    "last_tag_check", "start_date", "end_date"
  ]
  
  for (const [key, value] of Object.entries(row)) {
    if (date_fields.includes(key)) {
      result[key] = value ? new Date(value as string) : null
    } else {
      result[key] = value
    }
  }
  
  return result as T
}

export async function raw_query<T = any>(query: string, values: any[] = []): Promise<T[]> {
  const result = await get_pool().query(query, values)
  return result.rows as T[]
}
