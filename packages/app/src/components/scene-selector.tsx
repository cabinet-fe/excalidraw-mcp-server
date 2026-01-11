import { useState, useEffect } from 'react'
import type { SceneMeta } from '../services/scene-storage'
import { listScenes, generateSceneId, deleteScene } from '../services/scene-storage'

interface SceneSelectorProps {
  onSelect: (sceneId: string, isNew: boolean) => void
}

/**
 * 场景选择器组件
 * 首次加载时显示，用于选择或创建场景
 */
export function SceneSelector({ onSelect }: SceneSelectorProps) {
  const [scenes, setScenes] = useState<SceneMeta[]>([])
  const [newSceneInput, setNewSceneInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载场景列表
  useEffect(() => {
    listScenes()
      .then(setScenes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // 创建新场景
  const handleCreateScene = async () => {
    if (!newSceneInput.trim()) {
      setError('请输入场景名称')
      return
    }

    const sceneId = generateSceneId(newSceneInput)
    onSelect(sceneId, true)
  }

  // 选择已有场景
  const handleSelectScene = (sceneId: string) => {
    onSelect(sceneId, false)
  }

  // 删除场景
  const handleDeleteScene = async (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`确定删除场景 "${sceneId}" 吗？`)) return

    try {
      await deleteScene(sceneId)
      setScenes((prev) => prev.filter((s) => s.id !== sceneId))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <div className="scene-selector-overlay">
      <div className="scene-selector-modal">
        <h2>选择或创建场景</h2>

        {/* 创建新场景 */}
        <div className="scene-create-section">
          <h3>创建新场景</h3>
          <div className="scene-create-form">
            <input
              type="text"
              value={newSceneInput}
              onChange={(e) => {
                setNewSceneInput(e.target.value)
                setError(null)
              }}
              placeholder="输入场景名称..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateScene()}
            />
            <button onClick={handleCreateScene} className="btn-primary">
              创建
            </button>
          </div>
          <p className="hint">系统将自动添加时间戳以确保唯一性</p>
        </div>

        {/* 已有场景列表 */}
        {scenes.length > 0 && (
          <div className="scene-list-section">
            <h3>已有场景</h3>
            <div className="scene-list">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="scene-item"
                  onClick={() => handleSelectScene(scene.id)}
                >
                  <div className="scene-info">
                    <span className="scene-id">{scene.id}</span>
                    <span className="scene-time">
                      最后修改: {formatTime(scene.lastModified)}
                    </span>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={(e) => handleDeleteScene(scene.id, e)}
                    title="删除场景"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 状态提示 */}
        {loading && <p className="loading">加载中...</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <style>{`
        .scene-selector-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .scene-selector-modal {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          min-width: 400px;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .scene-selector-modal h2 {
          margin: 0 0 20px;
          font-size: 20px;
          color: #333;
        }

        .scene-selector-modal h3 {
          margin: 0 0 12px;
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .scene-create-section {
          margin-bottom: 24px;
        }

        .scene-create-form {
          display: flex;
          gap: 8px;
        }

        .scene-create-form input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .scene-create-form input:focus {
          outline: none;
          border-color: #6965db;
        }

        .btn-primary {
          padding: 10px 20px;
          background: #6965db;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #5651c9;
        }

        .hint {
          margin: 8px 0 0;
          font-size: 12px;
          color: #999;
        }

        .scene-list-section {
          border-top: 1px solid #eee;
          padding-top: 20px;
        }

        .scene-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .scene-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f7f7f7;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scene-item:hover {
          background: #efefff;
          transform: translateX(4px);
        }

        .scene-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .scene-id {
          font-weight: 500;
          color: #333;
          word-break: break-all;
        }

        .scene-time {
          font-size: 12px;
          color: #888;
        }

        .btn-delete {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: #999;
          font-size: 20px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-delete:hover {
          background: #ffeded;
          color: #e53935;
        }

        .loading, .error {
          margin: 16px 0 0;
          text-align: center;
        }

        .error {
          color: #e53935;
        }
      `}</style>
    </div>
  )
}
