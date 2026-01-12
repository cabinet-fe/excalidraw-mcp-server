/**
 * 最后使用场景记录服务
 * 记录用户最后使用的场景 ID，便于下次自动加载
 */

const LAST_SCENE_KEY = 'excalidraw-last-scene-id'

/**
 * 获取最后使用的场景 ID
 */
export function getLastSceneId(): string | null {
  try {
    return localStorage.getItem(LAST_SCENE_KEY)
  } catch {
    return null
  }
}

/**
 * 保存最后使用的场景 ID
 */
export function setLastSceneId(sceneId: string): void {
  try {
    localStorage.setItem(LAST_SCENE_KEY, sceneId)
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 清除最后使用的场景 ID
 */
export function clearLastSceneId(): void {
  try {
    localStorage.removeItem(LAST_SCENE_KEY)
  } catch {
    // localStorage 不可用时静默失败
  }
}
