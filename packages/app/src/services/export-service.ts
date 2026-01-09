import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { exportToSvg as excalidrawExportToSvg, exportToBlob } from '@excalidraw/excalidraw'

/**
 * 导出为 SVG
 */
export async function exportToSvg(api: ExcalidrawImperativeAPI): Promise<string> {
  const elements = api.getSceneElements()
  const appState = api.getAppState()
  const files = api.getFiles()

  const svg = await excalidrawExportToSvg({
    elements,
    appState: {
      ...appState,
      exportWithDarkMode: false,
      exportBackground: true,
    },
    files,
  })

  return svg.outerHTML
}

/**
 * 导出为 PNG Blob
 */
export async function exportToPng(api: ExcalidrawImperativeAPI): Promise<Blob> {
  const elements = api.getSceneElements()
  const appState = api.getAppState()
  const files = api.getFiles()

  const blob = await exportToBlob({
    elements,
    appState: {
      ...appState,
      exportWithDarkMode: false,
      exportBackground: true,
    },
    files,
    mimeType: 'image/png',
  })

  return blob
}

/**
 * 导出为 JSON 字符串
 */
export function exportToJson(api: ExcalidrawImperativeAPI): string {
  const elements = api.getSceneElements()
  const appState = api.getAppState()
  const files = api.getFiles()

  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'excalidraw-mcp-server',
    elements,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      gridSize: appState.gridSize,
    },
    files,
  }, null, 2)
}
