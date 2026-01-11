/**
 * 场景存储服务
 * 使用 IndexedDB 在浏览器本地持久化场景数据
 */

/** 场景数据结构 */
export interface StoredScene {
  id: string
  elements: readonly unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
  createdAt: number
  lastModified: number
}

/** 场景元数据（用于列表展示） */
export interface SceneMeta {
  id: string
  createdAt: number
  lastModified: number
}

const DB_NAME = 'excalidraw-scenes'
const DB_VERSION = 1
const STORE_NAME = 'scenes'

/**
 * 打开 IndexedDB 数据库
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('lastModified', 'lastModified', { unique: false })
      }
    }
  })
}

/**
 * 生成带时间戳的场景 ID
 */
export function generateSceneId(userInput: string): string {
  const timestamp = Date.now()
  const sanitized = userInput.trim().replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
  return `${sanitized}_${timestamp}`
}

/**
 * 加载场景数据
 */
export async function loadScene(id: string): Promise<StoredScene | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result ?? null)
  })
}

/**
 * 保存场景数据
 */
export async function saveScene(
  id: string,
  data: {
    elements: readonly unknown[]
    appState: Record<string, unknown>
    files: Record<string, unknown>
  }
): Promise<void> {
  const db = await openDatabase()
  const existing = await loadScene(id)

  const scene: StoredScene = {
    id,
    elements: data.elements,
    appState: data.appState,
    files: data.files,
    createdAt: existing?.createdAt ?? Date.now(),
    lastModified: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(scene)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * 获取所有场景列表（按最后修改时间倒序）
 */
export async function listScenes(): Promise<SceneMeta[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('lastModified')
    const request = index.openCursor(null, 'prev')

    const scenes: SceneMeta[] = []
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        const value = cursor.value as StoredScene
        scenes.push({
          id: value.id,
          createdAt: value.createdAt,
          lastModified: value.lastModified,
        })
        cursor.continue()
      } else {
        resolve(scenes)
      }
    }
  })
}

/**
 * 删除场景
 */
export async function deleteScene(id: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * 检查场景 ID 是否存在
 */
export async function sceneExists(id: string): Promise<boolean> {
  const scene = await loadScene(id)
  return scene !== null
}
