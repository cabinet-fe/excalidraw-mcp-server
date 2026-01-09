import type {
  ExcalidrawElement,
  PartialAppState,
  BinaryFiles,
  SceneData,
  SceneUpdateData,
} from '../types'

/** 历史记录快照 */
interface HistorySnapshot {
  elements: ExcalidrawElement[]
  appState: PartialAppState
  timestamp: number
}

/** 历史记录配置 */
interface HistoryConfig {
  maxSize: number
}

const DEFAULT_HISTORY_CONFIG: HistoryConfig = {
  maxSize: 100,
}

const DEFAULT_APP_STATE: PartialAppState = {
  viewBackgroundColor: '#ffffff',
}

/**
 * 场景服务
 * 管理当前画布场景的状态，提供读写接口供 API 和 WebSocket 使用
 * 支持历史记录管理（undo/redo）
 */
export class SceneService {
  private elements: ExcalidrawElement[] = []
  private appState: PartialAppState = { ...DEFAULT_APP_STATE }
  private files: BinaryFiles = {}

  /** 历史记录栈（undo） */
  private historyStack: HistorySnapshot[] = []
  /** 重做栈 */
  private redoStack: HistorySnapshot[] = []
  /** 历史记录配置 */
  private historyConfig: HistoryConfig

  /** 场景变更回调列表 */
  private changeListeners: Set<(scene: SceneData) => void> = new Set()

  constructor(config?: Partial<HistoryConfig>) {
    this.historyConfig = { ...DEFAULT_HISTORY_CONFIG, ...config }
  }

  // ===========================================================================
  // 读取方法
  // ===========================================================================

  /**
   * 获取当前场景的所有元素（不含已删除）
   */
  getElements(): readonly ExcalidrawElement[] {
    return this.elements.filter((el) => !el.isDeleted)
  }

  /**
   * 获取当前场景的所有元素（含已删除）
   */
  getAllElements(): readonly ExcalidrawElement[] {
    return [...this.elements]
  }

  /**
   * 根据 ID 获取元素
   */
  getElementById(id: string): ExcalidrawElement | undefined {
    return this.elements.find((el) => el.id === id)
  }

  /**
   * 获取当前应用状态
   */
  getAppState(): PartialAppState {
    return { ...this.appState }
  }

  /**
   * 获取当前场景的所有文件
   */
  getFiles(): BinaryFiles {
    return { ...this.files }
  }

  /**
   * 获取完整场景数据
   */
  getScene(): SceneData {
    return {
      elements: this.getElements(),
      appState: this.getAppState(),
      files: this.getFiles(),
    }
  }

  /**
   * 获取完整场景数据（含已删除元素）
   */
  getFullScene(): SceneData {
    return {
      elements: this.getAllElements(),
      appState: this.getAppState(),
      files: this.getFiles(),
    }
  }

  // ===========================================================================
  // 写入方法
  // ===========================================================================

  /**
   * 更新场景
   * @param data 场景更新数据
   * @param saveHistory 是否保存到历史记录，默认 true
   */
  updateScene(data: SceneUpdateData, saveHistory = true): void {
    if (saveHistory) {
      this.saveToHistory()
    }

    if (data.elements !== undefined) {
      this.elements = [...data.elements] as ExcalidrawElement[]
    }
    if (data.appState !== undefined) {
      this.appState = { ...this.appState, ...data.appState }
    }
    if (data.files !== undefined) {
      this.files = { ...this.files, ...data.files }
    }

    // 清空重做栈（新操作会使重做失效）
    if (saveHistory) {
      this.redoStack = []
    }

    this.notifyListeners()
  }

  /**
   * 重置场景
   */
  resetScene(): void {
    this.saveToHistory()
    this.elements = []
    this.appState = { ...DEFAULT_APP_STATE }
    this.files = {}
    this.redoStack = []
    this.notifyListeners()
  }

  /**
   * 添加元素
   */
  addElement(element: ExcalidrawElement): void {
    this.saveToHistory()
    this.elements = [...this.elements, element]
    this.redoStack = []
    this.notifyListeners()
  }

  /**
   * 批量添加元素
   */
  addElements(elements: readonly ExcalidrawElement[]): void {
    this.saveToHistory()
    this.elements = [...this.elements, ...elements]
    this.redoStack = []
    this.notifyListeners()
  }

  /**
   * 更新元素
   */
  updateElement(id: string, updates: Partial<ExcalidrawElement>): boolean {
    const index = this.elements.findIndex((el) => el.id === id)
    if (index === -1) return false

    const element = this.elements[index]
    if (!element) return false

    this.saveToHistory()
    this.elements = [
      ...this.elements.slice(0, index),
      { ...element, ...updates, version: element.version + 1 },
      ...this.elements.slice(index + 1),
    ]
    this.redoStack = []
    this.notifyListeners()
    return true
  }

  /**
   * 删除元素（软删除）
   */
  deleteElement(id: string): boolean {
    return this.updateElement(id, { isDeleted: true })
  }

  /**
   * 添加文件
   */
  addFiles(files: BinaryFiles): void {
    this.files = { ...this.files, ...files }
    this.notifyListeners()
  }

  // ===========================================================================
  // 历史记录方法
  // ===========================================================================

  /**
   * 撤销操作
   */
  undo(): boolean {
    const snapshot = this.historyStack.pop()
    if (!snapshot) return false

    // 保存当前状态到重做栈
    this.redoStack.push({
      elements: [...this.elements],
      appState: { ...this.appState },
      timestamp: Date.now(),
    })

    // 恢复快照
    this.elements = snapshot.elements
    this.appState = snapshot.appState
    this.notifyListeners()
    return true
  }

  /**
   * 重做操作
   */
  redo(): boolean {
    const snapshot = this.redoStack.pop()
    if (!snapshot) return false

    // 保存当前状态到历史栈
    this.historyStack.push({
      elements: [...this.elements],
      appState: { ...this.appState },
      timestamp: Date.now(),
    })

    // 恢复快照
    this.elements = snapshot.elements
    this.appState = snapshot.appState
    this.notifyListeners()
    return true
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.historyStack = []
    this.redoStack = []
  }

  /**
   * 获取历史记录状态
   */
  getHistoryState(): { canUndo: boolean; canRedo: boolean; undoCount: number; redoCount: number } {
    return {
      canUndo: this.historyStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.historyStack.length,
      redoCount: this.redoStack.length,
    }
  }

  // ===========================================================================
  // 订阅方法
  // ===========================================================================

  /**
   * 订阅场景变更
   */
  subscribe(listener: (scene: SceneData) => void): () => void {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  // ===========================================================================
  // 私有方法
  // ===========================================================================

  private saveToHistory(): void {
    this.historyStack.push({
      elements: [...this.elements],
      appState: { ...this.appState },
      timestamp: Date.now(),
    })

    // 限制历史记录大小
    if (this.historyStack.length > this.historyConfig.maxSize) {
      this.historyStack.shift()
    }
  }

  private notifyListeners(): void {
    const scene = this.getScene()
    for (const listener of this.changeListeners) {
      listener(scene)
    }
  }
}

/** 全局场景服务实例 */
export const sceneService = new SceneService()
