import type {
  ExcalidrawElement,
  PartialAppState,
  BinaryFiles,
  SceneData,
  SceneUpdateData,
} from '../types'

/**
 * 场景服务
 * 管理多个画布场景的状态，提供读写接口供 API 和 WebSocket 使用
 * 注意：场景数据主要存储在前端 IndexedDB，服务器仅作为中转缓存
 */
export class SceneService {
  /** 场景缓存：sceneId -> SceneData */
  private scenes: Map<string, SceneData> = new Map()

  /**
   * 获取场景数据
   */
  getScene(sceneId: string): SceneData | null {
    return this.scenes.get(sceneId) ?? null
  }

  /**
   * 获取场景的元素（不含已删除）
   */
  getElements(sceneId: string): readonly ExcalidrawElement[] {
    const scene = this.scenes.get(sceneId)
    if (!scene) return []
    return (scene.elements as ExcalidrawElement[]).filter((el) => !el.isDeleted)
  }

  /**
   * 获取场景的所有元素（含已删除）
   */
  getAllElements(sceneId: string): readonly ExcalidrawElement[] {
    const scene = this.scenes.get(sceneId)
    if (!scene) return []
    return scene.elements as ExcalidrawElement[]
  }

  /**
   * 根据 ID 获取元素
   */
  getElementById(sceneId: string, elementId: string): ExcalidrawElement | undefined {
    const scene = this.scenes.get(sceneId)
    if (!scene) return undefined
    return (scene.elements as ExcalidrawElement[]).find((el) => el.id === elementId)
  }

  /**
   * 获取场景的应用状态
   */
  getAppState(sceneId: string): PartialAppState {
    const scene = this.scenes.get(sceneId)
    return scene?.appState ?? { viewBackgroundColor: '#ffffff' }
  }

  /**
   * 获取场景的文件
   */
  getFiles(sceneId: string): BinaryFiles {
    const scene = this.scenes.get(sceneId)
    return (scene?.files ?? {}) as BinaryFiles
  }

  /**
   * 更新场景
   */
  updateScene(sceneId: string, data: SceneUpdateData): void {
    const existing = this.scenes.get(sceneId) ?? {
      elements: [],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    }

    const updated: SceneData = {
      elements: data.elements ?? existing.elements,
      appState: data.appState ? { ...existing.appState, ...data.appState } : existing.appState,
      files: data.files ? { ...existing.files, ...data.files } : existing.files,
    }

    this.scenes.set(sceneId, updated)
  }

  /**
   * 重置场景
   */
  resetScene(sceneId: string): void {
    this.scenes.set(sceneId, {
      elements: [],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    })
  }

  /**
   * 删除场景缓存
   */
  deleteScene(sceneId: string): boolean {
    return this.scenes.delete(sceneId)
  }

  /**
   * 添加元素
   */
  addElement(sceneId: string, element: ExcalidrawElement): void {
    const existing = this.getScene(sceneId)
    const elements = existing ? [...existing.elements, element] : [element]
    this.updateScene(sceneId, { elements })
  }

  /**
   * 批量添加元素
   */
  addElements(sceneId: string, newElements: readonly ExcalidrawElement[]): void {
    const existing = this.getScene(sceneId)
    const elements = existing ? [...existing.elements, ...newElements] : [...newElements]
    this.updateScene(sceneId, { elements })
  }

  /**
   * 更新元素
   */
  updateElement(sceneId: string, elementId: string, updates: Partial<ExcalidrawElement>): boolean {
    const scene = this.scenes.get(sceneId)
    if (!scene) return false

    const elements = scene.elements as ExcalidrawElement[]
    const index = elements.findIndex((el) => el.id === elementId)
    if (index === -1) return false

    const element = elements[index]
    if (!element) return false

    const updatedElements = [
      ...elements.slice(0, index),
      { ...element, ...updates, version: element.version + 1 },
      ...elements.slice(index + 1),
    ]

    this.updateScene(sceneId, { elements: updatedElements })
    return true
  }

  /**
   * 删除元素（软删除）
   */
  deleteElement(sceneId: string, elementId: string): boolean {
    return this.updateElement(sceneId, elementId, { isDeleted: true })
  }

  /**
   * 添加文件
   */
  addFiles(sceneId: string, files: BinaryFiles): void {
    const existing = this.getFiles(sceneId)
    this.updateScene(sceneId, { files: { ...existing, ...files } })
  }

  /**
   * 获取所有活跃场景 ID
   */
  getActiveSceneIds(): string[] {
    return Array.from(this.scenes.keys())
  }

  /**
   * 检查场景是否存在缓存
   */
  hasScene(sceneId: string): boolean {
    return this.scenes.has(sceneId)
  }
}

/** 全局场景服务实例 */
export const sceneService = new SceneService()
