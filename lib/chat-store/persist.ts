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

const isClient = typeof window !== "undefined"
const DB_NAME = "zola-db"
const DB_VERSION = 1

function initDatabase() {
  if (!isClient) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("chats")) db.createObjectStore("chats")
      if (!db.objectStoreNames.contains("messages"))
        db.createObjectStore("messages")
      if (!db.objectStoreNames.contains("sync")) db.createObjectStore("sync")
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

if (isClient) {
  const checkRequest = indexedDB.open(DB_NAME)

  checkRequest.onsuccess = () => {
    const db = checkRequest.result
    if (db.version > DB_VERSION) {
      db.close()
      indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
        init()
      }
    } else {
      db.close()
      init()
    }
  }

  checkRequest.onerror = () => {
    init()
  }

  function init() {
    dbInitPromise = initDatabase()
    dbInitPromise.then(() => {
      const openRequest = indexedDB.open(DB_NAME)
      openRequest.onsuccess = () => {
        const objectStores = Array.from(openRequest.result.objectStoreNames)
        if (objectStores.includes("chats"))
          stores.chats = createStore(DB_NAME, "chats")
        if (objectStores.includes("messages"))
          stores.messages = createStore(DB_NAME, "messages")
        if (objectStores.includes("sync"))
          stores.sync = createStore(DB_NAME, "sync")
        openRequest.result.close()
      }
    })
  }
}

async function ensureDbReady() {
  if (!isClient) return
  if (!dbReady && dbInitPromise) await dbInitPromise
}

export async function readFromIndexedDB<T>(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<T | T[]> {
  if (!isClient || !stores[table]) {
    return key ? (null as any) : []
  }

  try {
    const store = stores[table]
    if (key) {
      const result = await get<T>(key, store)
      return result ? [result] : []
    }

    const allKeys = await keys(store)
    return await getMany<T>(allKeys as string[], store)
  } catch (error) {
    console.warn(`📦 readFromIndexedDB failed (${table}):`, error)
    return key ? (null as any) : []
  }
}

export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  if (!isClient || !stores[table]) return

  try {
    const store = stores[table]
    const entries: [IDBValidKey, T][] = Array.isArray(data)
      ? data.map((item) => [item.id, item])
      : [[data.id, data]]
    await setMany(entries, store)
  } catch (error) {
    console.warn(`📦 writeToIndexedDB failed (${table}):`, error)
  }
}

export async function deleteFromIndexedDB(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<void> {
  if (!isClient || !stores[table]) return

  const store = stores[table]
  if (!store) {
    console.warn(`Store '${table}' not initialized.`)
    return
  }

  try {
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
