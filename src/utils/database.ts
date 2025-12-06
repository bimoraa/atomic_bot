import { MongoClient, Db, Collection } from "mongodb"

let client: MongoClient | null = null
let db: Db | null = null
let connected = false

export async function connect(): Promise<Db | null> {
  if (db) return db

  const uri     = process.env.MONGO_URI || "mongodb://localhost:27017"
  const db_name = process.env.MONGO_DB_NAME || "atomic_bot"

  try {
    client = new MongoClient(uri, {
      retryWrites: true,
      w: "majority",
      serverSelectionTimeoutMS: 15000,
      directConnection: false,
    })
    await client.connect()
    db = client.db(db_name)
    connected = true

    console.log(`[MongoDB] Connected to ${db_name}`)
    return db
  } catch (err) {
    console.error("[MongoDB] Connection failed:", (err as Error).message)
    console.log("[MongoDB] Bot will continue without database features")
    return null
  }
}

export function is_connected(): boolean {
  return connected
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log("[MongoDB] Disconnected")
  }
}

export function get_db(): Db {
  if (!db) throw new Error("Database not connected")
  return db
}

export function collection<T extends object>(name: string): Collection<T> {
  return get_db().collection<T>(name)
}

export async function find_one<T extends object>(
  coll: string,
  filter: object
): Promise<T | null> {
  return collection<T>(coll).findOne(filter as any) as Promise<T | null>
}

export async function find_many<T extends object>(
  coll: string,
  filter: object = {}
): Promise<T[]> {
  return collection<T>(coll).find(filter as any).toArray() as Promise<T[]>
}

export async function insert_one<T extends object>(
  coll: string,
  doc: T
): Promise<string> {
  const result = await collection<T>(coll).insertOne(doc as any)
  return result.insertedId.toString()
}

export async function update_one<T extends object>(
  coll: string,
  filter: object,
  update: Partial<T>,
  upsert: boolean = false
): Promise<boolean> {
  const result = await collection<T>(coll).updateOne(
    filter as any,
    { $set: update } as any,
    { upsert }
  )
  return result.modifiedCount > 0 || result.upsertedCount > 0
}

export async function delete_one(
  coll: string,
  filter: object
): Promise<boolean> {
  const result = await collection(coll).deleteOne(filter as any)
  return result.deletedCount > 0
}

export async function increment(
  coll: string,
  filter: object,
  field: string,
  amount: number = 1
): Promise<void> {
  await collection(coll).updateOne(
    filter as any,
    { $inc: { [field]: amount } },
    { upsert: true }
  )
}
