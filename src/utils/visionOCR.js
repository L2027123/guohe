// 截图识别工具 — 使用智谱 GLM-4V-Flash 视觉模型
// 智谱 API 支持 CORS，浏览器可直接调用，无需代理
// GLM-4V-Flash 永久免费，中文 OCR 准确率 95%+

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const ZHIPU_MODEL = 'glm-4v-flash'

// 压缩图片到 maxWidth 并转 base64
function imageToBase64(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        let { width, height } = img
        if (width > maxWidth) {
          const ratio = maxWidth / width
          width = maxWidth
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          async (blob) => {
            const buffer = await blob.arrayBuffer()
            const bytes = new Uint8Array(buffer)
            let binary = ''
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
            resolve(btoa(binary))
          },
          'image/jpeg',
          quality,
        )
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 用 GLM-4V-Flash 识别截图中的文字
 * @param {File} file 图片文件
 * @param {(phase: string, pct: number) => void} onProgress 进度回调
 * @returns {Promise<{ text: string, method: 'vision' }>}
 */
export async function smartRecognize(file, onProgress) {
  // 智谱 API Key（用户在设置页配置，存 localStorage）
  const apiKey = localStorage.getItem('zhipu_api_key') || localStorage.getItem('contentos_api_key_zhipu')

  if (!apiKey) {
    throw new Error('NO_ZHIPU_KEY')
  }

  if (onProgress) onProgress('vision', 10)

  // 压缩图片
  const b64 = await imageToBase64(file, 1600, 0.85)
  if (!b64) throw new Error('图片处理失败')

  if (onProgress) onProgress('vision', 30)

  const prompt = `请仔细识别这张截图中的所有文字内容。要求：
1. 完整保留原文，不要改写或总结
2. 保持原有的段落、换行、列表结构
3. 如果是社交平台内容，请识别正文、标题、话题标签
4. 如果有 emoji 也请保留
5. 只输出识别到的文字，不要添加任何解释或前缀`

  if (onProgress) onProgress('vision', 50)

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ZHIPU_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${b64}`,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  })

  if (onProgress) onProgress('vision', 80)

  if (!response.ok) {
    if (response.status === 401) throw new Error('智谱 API Key 无效')
    if (response.status === 429) throw new Error('请求过于频繁，请稍后再试')
    throw new Error(`识别服务异常 (${response.status})`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  if (onProgress) onProgress('vision', 100)

  if (!text || text.trim().length < 3) {
    throw new Error('未能识别到文字内容')
  }

  return { text: text.trim(), method: 'vision' }
}
