import {
  createStore,
  del,
  delMany,
  get,
  getMany,
  keys,
  set,
  setMany,
} from "idb-keyval"

let dbReady = false
let dbInitPromise: Promise<void> | null = null
let stores: Record<string, any> = {}

// Only run on client side
const isClient = typeof window !== "undefined"

const DB_NAME = "zola-db"
const DB_VERSION = 1

// Initialize the database with proper versioning
function initDatabase() {
  if (!isClient) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result

      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats")
      }
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages")
      }
      if (!db.objectStoreNames.contains("sync")) {
        db.createObjectStore("sync")
      }
    }

    request.onsuccess = () => {
      dbReady = true
      request.result.close()
      resolve()
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Initialize only on client side
if (isClient) {
  dbInitPromise = initDatabase()

  // Define stores AFTER DB is initialized
  dbInitPromise.then(() => {
    stores = {
      chats: createStore("zola-db", "chats"),
      messages: createStore("zola-db", "messages"),
      sync: createStore("zola-db", "sync"),
    }
  })
}

// Ensure DB is ready before operations (client-side only)
async function ensureDbReady() {
  if (!isClient) return
  if (!dbReady && dbInitPromise) {
    await dbInitPromise
  }
}

// read one or all items from a store
export async function readFromIndexedDB<T>(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<T | T[]> {
  if (!isClient) return key ? (null as any) : []

  await ensureDbReady()
  try {
    const store = stores[table]
    if (key) {
      const item = await get<T>(key, store)
      return item as T
    }

    const allKeys = await keys(store)
    const values = await getMany<T>(allKeys as string[], store)
    return values
  } catch (error) {
    console.log(`Error reading from IndexedDB store '${table}':`, error)
    return key ? (null as any) : []
  }
}

// write one or multiple items to a store
export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  if (!isClient) return

  await ensureDbReady()
  try {
    const store = stores[table]
    const entries: [IDBValidKey, T][] = Array.isArray(data)
      ? data.map((item) => [item.id, item])
      : [[data.id, data]]

    await setMany(entries, store)
  } catch (error) {
    console.error(`Error writing to IndexedDB store '${table}':`, error)
  }
}

// delete one or all items from a store
export async function deleteFromIndexedDB(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<void> {
  if (!isClient) return

  await ensureDbReady()
  try {
    const store = stores[table]
    if (key) {
      await del(key, store)
    } else {
      const allKeys = await keys(store)
      await delMany(allKeys as string[], store)
    }
  } catch (error) {
    console.error(`Error deleting from IndexedDB store '${table}':`, error)
  }
}

export async function clearAllIndexedDBStores() {
  if (!isClient) return

  await ensureDbReady()
  await deleteFromIndexedDB("chats")
  await deleteFromIndexedDB("messages")
  await deleteFromIndexedDB("sync")
}
