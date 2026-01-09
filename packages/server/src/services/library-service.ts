import type { LibraryItem } from '../types'

/**
 * 库服务
 * 管理 Excalidraw 组件库
 */
export class LibraryService {
  private items: LibraryItem[] = []

  /** 库变更回调列表 */
  private changeListeners: Set<(items: readonly LibraryItem[]) => void> = new Set()

  /**
   * 获取所有库项目
   */
  getItems(): readonly LibraryItem[] {
    return [...this.items]
  }

  /**
   * 根据 ID 获取库项目
   */
  getItemById(id: string): LibraryItem | undefined {
    return this.items.find((item) => item.id === id)
  }

  /**
   * 更新整个库
   */
  updateLibrary(items: readonly LibraryItem[]): void {
    this.items = [...items]
    this.notifyListeners()
  }

  /**
   * 添加库项目
   */
  addItem(item: LibraryItem): void {
    // 检查是否已存在
    const existingIndex = this.items.findIndex((i) => i.id === item.id)
    if (existingIndex !== -1) {
      // 更新已存在的项目
      this.items = [
        ...this.items.slice(0, existingIndex),
        item,
        ...this.items.slice(existingIndex + 1),
      ]
    } else {
      this.items = [...this.items, item]
    }
    this.notifyListeners()
  }

  /**
   * 批量添加库项目
   */
  addItems(items: readonly LibraryItem[]): void {
    for (const item of items) {
      const existingIndex = this.items.findIndex((i) => i.id === item.id)
      if (existingIndex !== -1) {
        this.items[existingIndex] = item
      } else {
        this.items.push(item)
      }
    }
    this.notifyListeners()
  }

  /**
   * 删除库项目
   */
  removeItem(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id)
    if (index === -1) return false

    this.items = [...this.items.slice(0, index), ...this.items.slice(index + 1)]
    this.notifyListeners()
    return true
  }

  /**
   * 清空库
   */
  clearLibrary(): void {
    this.items = []
    this.notifyListeners()
  }

  /**
   * 订阅库变更
   */
  subscribe(listener: (items: readonly LibraryItem[]) => void): () => void {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  private notifyListeners(): void {
    const items = this.getItems()
    for (const listener of this.changeListeners) {
      listener(items)
    }
  }
}

/** 全局库服务实例 */
export const libraryService = new LibraryService()
