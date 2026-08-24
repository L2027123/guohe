// 脚本导出工具 —— 纯前端 Blob 下载，无需后端
// 支持：分镜表 CSV、Markdown 脚本、纯口播稿 TXT

function downloadFile(content, filename, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeCSV(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * 导出分镜表 CSV（可导入剪映 / CapCut / 表格工具）
 * @param {object} result - AI 返回的完整结果对象
 * @param {string} title - 视频标题
 */
export function exportStoryboardCSV(result, title = '脚本') {
  const storyboard = result?.production?.storyboard || []
  const bgm = result?.production?.bgmRecommendation

  const header = [
    '镜号',
    '时长',
    '画面',
    '台词',
    '运镜',
    '字幕/贴纸',
    'B-roll',
  ]

  const rows = storyboard.map((s) => [
    s.shot,
    s.duration,
    s.scene,
    s.dialogue,
    s.cameraMovement,
    s.onscreenText,
    s.bRoll,
  ])

  const csvLines = [header.join(',')]
  rows.forEach((r) => csvLines.push(r.map(escapeCSV).join(',')))

  if (bgm) {
    csvLines.push('')
    csvLines.push(`BGM风格,${escapeCSV(bgm.style)}`)
    csvLines.push(`情绪匹配,${escapeCSV(bgm.moodMatch)}`)
    csvLines.push(`BPM,${escapeCSV(bgm.tempoBpm)}`)
    csvLines.push(`参考曲目,${escapeCSV((bgm.referenceTracks || []).join(' / '))}`)
    csvLines.push(`音量建议,${escapeCSV(bgm.volumeAdvice)}`)
  }

  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 50)
  downloadFile('\uFEFF' + csvLines.join('\n'), `${safeTitle}_分镜表.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出完整脚本 Markdown（包含分镜+BGM+拍摄提示，适合 Notion / 飞书文档）
 */
export function exportScriptMarkdown(result, title = '脚本') {
  const prod = result?.production || {}
  const structure = result?.structure || {}
  const storyboard = prod.storyboard || []
  const bgm = prod.bgmRecommendation
  const setup = prod.basicSetup || {}
  const notes = prod.shootingNotes || []
  const materials = prod.availableMaterial || []
  const publish = result?.publish || {}

  const lines = []

  lines.push(`# ${title}`)
  lines.push('')

  if (prod.estimatedDuration) {
    lines.push(`> 时长：${prod.estimatedDuration}　｜　字数：${prod.scriptWordCount || 0}字`)
    lines.push('')
  }

  // Hook
  if (structure.hook?.text) {
    lines.push('## 🎣 Hook')
    lines.push(`**${structure.hook.text}**`)
    lines.push('')
    lines.push(`- 类型：${structure.hook.type || ''}`)
    lines.push(`- 为什么有效：${structure.hook.whyItWorks || ''}`)
    lines.push('')
  }

  // 分镜表
  if (storyboard.length > 0) {
    lines.push('## 🎬 分镜脚本')
    lines.push('')
    lines.push('| 镜号 | 时长 | 画面 | 台词 | 运镜 | 字幕 | B-roll |')
    lines.push('|------|------|------|------|------|------|--------|')
    storyboard.forEach((s) => {
      lines.push(
        `| ${s.shot} | ${s.duration} | ${s.scene || ''} | ${s.dialogue || ''} | ${s.cameraMovement || ''} | ${s.onscreenText || ''} | ${s.bRoll || ''} |`
      )
    })
    lines.push('')
  }

  // 完整口播稿
  if (prod.fullScript) {
    lines.push('## 📝 完整口播稿')
    lines.push('')
    lines.push(prod.fullScript)
    lines.push('')
  }

  // BGM 推荐
  if (bgm) {
    lines.push('## 🎵 BGM 推荐')
    lines.push('')
    lines.push(`- **风格**：${bgm.style || ''}`)
    lines.push(`- **情绪匹配**：${bgm.moodMatch || ''}`)
    lines.push(`- **BPM**：${bgm.tempoBpm || ''}`)
    if (bgm.referenceTracks?.length) {
      lines.push(`- **参考**：${bgm.referenceTracks.join('、')}`)
    }
    lines.push(`- **音量建议**：${bgm.volumeAdvice || ''}`)
    lines.push('')
  }

  // 拍摄提示
  if (setup.camera || setup.environment || setup.materialPreparation) {
    lines.push('## 📸 拍摄设置')
    lines.push('')
    if (setup.camera) lines.push(`- **机位**：${setup.camera}`)
    if (setup.environment) lines.push(`- **场景**：${setup.environment}`)
    if (setup.materialPreparation) lines.push(`- **道具准备**：${setup.materialPreparation}`)
    lines.push('')
  }

  if (notes.length > 0) {
    lines.push('## 💡 拍摄提示')
    lines.push('')
    notes.forEach((n, i) => lines.push(`${i + 1}. ${n}`))
    lines.push('')
  }

  if (materials.length > 0) {
    lines.push('## 🎞️ 素材清单')
    lines.push('')
    materials.forEach((m, i) => {
      lines.push(`${i + 1}. **${m.item}** — ${m.source}（${m.whenToShow}）`)
    })
    lines.push('')
  }

  // 发布信息
  if (publish.title) {
    lines.push('## 📤 发布信息')
    lines.push('')
    lines.push(`**标题**：${publish.title}`)
    if (publish.titleAlternatives?.length) {
      lines.push('')
      lines.push('**备选标题**：')
      publish.titleAlternatives.forEach((t) => lines.push(`- ${t}`))
    }
    if (publish.tags?.length) {
      lines.push('')
      lines.push(`**话题标签**：${publish.tags.join(' ')}`)
    }
    if (publish.bestPostTime) {
      lines.push('')
      lines.push(`**建议发布时间**：${publish.bestPostTime}`)
    }
    lines.push('')
  }

  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 50)
  downloadFile(lines.join('\n'), `${safeTitle}_脚本.md`, 'text/markdown;charset=utf-8')
}

/**
 * 导出纯口播稿 TXT（提词器用）
 */
export function exportScriptTXT(result, title = '脚本') {
  const script = result?.production?.fullScript || ''
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 50)
  downloadFile(script, `${safeTitle}_口播稿.txt`, 'text/plain;charset=utf-8')
}
