import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ExcalidrawClient } from '../client'
import { randomId } from '../utils/random-id'

/** 元素类型枚举 */
const ElementTypeSchema = z.enum([
  'rectangle',
  'ellipse',
  'diamond',
  'arrow',
  'line',
  'freedraw',
  'text',
  'image',
  'frame',
  'group',
])

/** 填充样式枚举 */
const FillStyleSchema = z.enum(['hachure', 'cross-hatch', 'solid'])

/** 线条样式枚举 */
const StrokeStyleSchema = z.enum(['solid', 'dashed', 'dotted'])

/** 箭头类型枚举 */
const ArrowheadSchema = z.enum(['arrow', 'bar', 'dot', 'triangle']).nullable()

/**
 * 创建 Excalidraw 元素
 */
function createExcalidrawElement(params: {
  type: string
  x: number
  y: number
  width?: number
  height?: number
  strokeColor?: string
  backgroundColor?: string
  fillStyle?: string
  strokeWidth?: number
  strokeStyle?: string
  roughness?: number
  opacity?: number
  text?: string
  fontSize?: number
  fontFamily?: number
  points?: { x: number; y: number }[]
  startArrowhead?: string | null
  endArrowhead?: string | null
}): Record<string, unknown> {
  const id = randomId()
  const now = Date.now()

  const baseElement: Record<string, unknown> = {
    id,
    type: params.type,
    x: params.x,
    y: params.y,
    width: params.width ?? 100,
    height: params.height ?? 100,
    angle: 0,
    strokeColor: params.strokeColor ?? '#1e1e1e',
    backgroundColor: params.backgroundColor ?? 'transparent',
    fillStyle: params.fillStyle ?? 'solid',
    strokeWidth: params.strokeWidth ?? 2,
    strokeStyle: params.strokeStyle ?? 'solid',
    roughness: params.roughness ?? 1,
    opacity: params.opacity ?? 100,
    groupIds: [],
    frameId: null,
    index: `a${id.slice(0, 5)}`,
    roundness: { type: 3 },
    seed: Math.floor(Math.random() * 2147483647),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2147483647),
    isDeleted: false,
    boundElements: null,
    updated: now,
    link: null,
    locked: false,
  }

  // 文本元素
  if (params.type === 'text') {
    return {
      ...baseElement,
      text: params.text ?? '',
      fontSize: params.fontSize ?? 20,
      fontFamily: params.fontFamily ?? 1,
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: null,
      originalText: params.text ?? '',
      autoResize: true,
      lineHeight: 1.25,
    }
  }

  // 线性元素（箭头、线条）
  if (params.type === 'arrow' || params.type === 'line') {
    const points = params.points
      ? params.points.map(p => [p.x, p.y] as [number, number])
      : [[0, 0], [params.width ?? 100, params.height ?? 0]]
    return {
      ...baseElement,
      points,
      startBinding: null,
      endBinding: null,
      startArrowhead: params.type === 'arrow' ? (params.startArrowhead ?? null) : null,
      endArrowhead: params.type === 'arrow' ? (params.endArrowhead ?? 'arrow') : null,
      lastCommittedPoint: null,
    }
  }

  // 自由绘制
  if (params.type === 'freedraw') {
    return {
      ...baseElement,
      points: params.points ? params.points.map(p => [p.x, p.y]) : [[0, 0]],
      pressures: [],
      simulatePressure: true,
      lastCommittedPoint: null,
    }
  }

  return baseElement
}

/**
 * 注册元素操作 Tools
 */
export function registerElementTools(server: McpServer, client: ExcalidrawClient): void {
  /**
   * 添加元素
   */
  server.registerTool(
    'add_element',
    {
      description: 'Add a new element to the canvas. Supported types: rectangle, ellipse, diamond, arrow, line, freedraw, text, image, frame, group',
      inputSchema: {
        type: ElementTypeSchema.describe('Type of element to add'),
        x: z.number().describe('X coordinate'),
        y: z.number().describe('Y coordinate'),
        width: z.number().optional().default(100).describe('Width of the element'),
        height: z.number().optional().default(100).describe('Height of the element'),
        strokeColor: z.string().optional().default('#1e1e1e').describe('Stroke color (hex)'),
        backgroundColor: z.string().optional().default('transparent').describe('Background color (hex or "transparent")'),
        fillStyle: FillStyleSchema.optional().default('solid').describe('Fill style'),
        strokeWidth: z.number().optional().default(2).describe('Stroke width in pixels'),
        strokeStyle: StrokeStyleSchema.optional().default('solid').describe('Stroke style'),
        roughness: z.number().optional().default(1).describe('Roughness level (0-2)'),
        opacity: z.number().min(0).max(100).optional().default(100).describe('Opacity (0-100)'),
        text: z.string().optional().describe('Text content (for text elements)'),
        fontSize: z.number().optional().default(20).describe('Font size (for text elements)'),
        fontFamily: z.number().optional().default(1).describe('Font family (1=Virgil, 2=Helvetica, 3=Cascadia)'),
        points: z.array(z.object({ x: z.number(), y: z.number() })).optional()
          .describe('Points for linear elements (arrow, line, freedraw). Each point has x and y coordinates.'),
        startArrowhead: ArrowheadSchema.optional().describe('Start arrowhead type (for arrows)'),
        endArrowhead: ArrowheadSchema.optional().default('arrow').describe('End arrowhead type (for arrows)'),
      },
    },
    async (args: any) => {
      const element = createExcalidrawElement(args)
      const result = await client.addElement(element)
      return {
        content: [{ type: 'text', text: `Element added successfully with ID: ${result.id}` }],
      }
    }
  )

  /**
   * 更新元素
   */
  server.registerTool(
    'update_element',
    {
      description: 'Update an existing element by ID. Only provide the properties you want to change.',
      inputSchema: {
        id: z.string().describe('Element ID to update'),
        x: z.number().optional().describe('New X coordinate'),
        y: z.number().optional().describe('New Y coordinate'),
        width: z.number().optional().describe('New width'),
        height: z.number().optional().describe('New height'),
        strokeColor: z.string().optional().describe('New stroke color'),
        backgroundColor: z.string().optional().describe('New background color'),
        fillStyle: FillStyleSchema.optional().describe('New fill style'),
        strokeWidth: z.number().optional().describe('New stroke width'),
        strokeStyle: StrokeStyleSchema.optional().describe('New stroke style'),
        roughness: z.number().optional().describe('New roughness'),
        opacity: z.number().min(0).max(100).optional().describe('New opacity'),
        text: z.string().optional().describe('New text content (for text elements)'),
        fontSize: z.number().optional().describe('New font size'),
        angle: z.number().optional().describe('Rotation angle in radians'),
        locked: z.boolean().optional().describe('Lock/unlock the element'),
      },
    },
    async (args: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = args
      // 过滤掉 undefined 值
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      )
      await client.updateElement(id, filteredUpdates)
      return {
        content: [{ type: 'text', text: `Element ${id} updated successfully` }],
      }
    }
  )

  /**
   * 删除元素
   */
  server.registerTool(
    'delete_element',
    {
      description: 'Delete an element by ID (soft delete - marks as deleted but preserves in history)',
      inputSchema: {
        id: z.string().describe('Element ID to delete'),
      },
    },
    async (args: { id: string }) => {
      await client.deleteElement(args.id)
      return {
        content: [{ type: 'text', text: `Element ${args.id} deleted successfully` }],
      }
    }
  )

  /**
   * 滚动到内容
   */
  server.registerTool(
    'scroll_to_content',
    {
      description: 'Scroll the canvas to show specific element(s) or all content',
      inputSchema: {
        elementId: z.string().optional().describe('Single element ID to scroll to'),
        elementIds: z.array(z.string()).optional().describe('Multiple element IDs to scroll to'),
      },
    },
    async (args: { elementId?: string; elementIds?: string[] }) => {
      await client.scrollToContent({
        elementId: args.elementId,
        elementIds: args.elementIds,
      })
      const target = args.elementId
        ? `element ${args.elementId}`
        : args.elementIds
          ? `${args.elementIds.length} elements`
          : 'all content'
      return {
        content: [{ type: 'text', text: `Scrolled to ${target}` }],
      }
    }
  )
}
