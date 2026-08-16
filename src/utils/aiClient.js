/**
 * AI 调用共享工具
 * 统一 DeepSeek API 调用、错误分类、错误提示
 */

const API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * 错误分类
 * @param {Error} err
 * @returns {{ type: 'no_key'|'auth'|'quota'|'network'|'timeout'|'parse'|'unknown', message: string }}
 */
export function classifyAIError(err) {
  const msg = err?.message || ''

  // 超时（AbortController 触发）
  if (err.name === 'AbortError' || msg.includes('超时') || msg.includes('timeout')) {
    return { type: 'timeout', message: 'AI 请求超时（30秒），请检查网络后重试' }
  }

  // 网络错误（fetch 本身失败）
  if (err instanceof TypeError && msg.includes('fetch')) {
    return { type: 'network', message: '网络连接失败，请检查网络后重试' }
  }

  // 从状态码判断
  if (msg.includes('401') || msg.includes('403')) {
    return { type: 'auth', message: 'API Key 无效或已过期' }
  }
  if (msg.includes('429')) {
    return { type: 'quota', message: 'API 额度不足，请充值后重试' }
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return { type: 'network', message: 'AI 服务暂时不可用，请稍后重试' }
  }

  // JSON 解析错误
  if (msg.includes('格式错误') || msg.includes('JSON') || msg.includes('Unexpected')) {
    return { type: 'parse', message: 'AI 返回格式异常，请重试' }
  }

  return { type: 'unknown', message: msg || 'AI 调用失败，请重试' }
}

/**
 * 统一 AI 调用
 * @param {string} apiKey
 * @param {string} prompt
 * @param {{ temperature?: number, max_tokens?: number, model?: string, timeout?: number }} options
 * @returns {Promise<string>} AI 返回的文本内容
 */
export async function callAI(apiKey, prompt, options = {}) {
  const {
    temperature = 0.7,
    max_tokens = 1500,
    model = 'deepseek-chat',
    timeout = 30000,
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`API 请求失败 (${response.status})`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 测试 API 连接
 * @param {string} apiKey
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function testAPIConnection(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: '请输入 API Key' }
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    if (response.ok) {
      return { success: true, message: 'API 连接成功' }
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'API Key 无效或已过期' }
    }
    if (response.status === 429) {
      return { success: false, message: 'API 额度不足' }
    }
    return { success: false, message: `API 异常 (${response.status})` }
  } catch (err) {
    if (err instanceof TypeError) {
      return { success: false, message: '网络连接失败' }
    }
    return { success: false, message: err.message || '连接失败' }
  }
}
