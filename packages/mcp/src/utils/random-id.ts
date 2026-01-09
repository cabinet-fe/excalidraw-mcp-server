/**
 * 生成随机 ID
 * 使用 nanoid 风格的短 ID 格式
 */
export function randomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
