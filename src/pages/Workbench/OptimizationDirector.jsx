import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { callAI, classifyAIError } from '../../utils/aiClient'
import { trackModuleClick } from '../../utils/tracker'
import { getApiKey, isUsingTrialKey } from '../../utils/apiKey'
import {
  ArrowLeft,
  Upload,
  Wand2,
  Loader2,
  AlertCircle,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Film,
  Image,
  Type,
  ArrowRight,
  FileText,
  Sparkles,
} from 'lucide-react'

export default function OptimizationDirector() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const ensureAccountMemory = useStore((s) => s.ensureAccountMemory)
  const updateMemoryPatterns = useStore((s) => s.updateMemoryPatterns)
  const performanceRecords = useStore((s) => s.performanceRecords)

  const project = projects.find((p) => p.id === currentProjectId)
  const currentDNA = allStyleDNA[currentProjectId]

  // ===== 双输入模式：video（上传视频） / script（来自创作导演的方案） =====
  const [inputMode, setInputMode] = useState('video') // 'video' | 'script'

  // script 模式方案数据（来自 location.state）
  const [scriptPlan, setScriptPlan] = useState(null) // { hook, script, structure, title, cover, shootingPlan, projectId }

  // 初始化：检测 location.state 自动进入 script 模式
  useEffect(() => {
    if (location.state?.source === 'video-director-script') {
      setInputMode('script')
      setScriptPlan({
        hook: location.state.hook || null,
        script: location.state.script || '',
        structure: location.state.structure || null,
        title: location.state.title || '',
        cover: location.state.cover || null,
        shootingPlan: location.state.shootingPlan || null,
        projectId: location.state.projectId || null,
      })
    }
  }, [location.state])

  const [material, setMaterial] = useState(null) // { videoUrl, fileName, duration } 用于 video 模式
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const usingTrial = isUsingTrialKey()

  const getApiKeySafe = () => {
    const key = getApiKey()
    if (!key) {
      setError('请先在设置页面配置 DeepSeek API Key')
      return null
    }
    return key
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(mp4|mov)$/i)) {
      setError('只支持 mp4 / mov 格式')
      return
    }
    setError('')
    const videoUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = videoUrl
    const applyMaterial = (extra = {}) => {
      setMaterial({
        videoUrl,
        fileName: file.name,
        fileSize: file.size || 0,
        fileType: file.type || 'video/unknown',
        duration: 0,
        hasVideo: false,
        hasAudio: false,
        width: 0,
        height: 0,
        ...extra,
      })
    }
    video.onloadedmetadata = () => {
      const trackInfo = video.videoWidth
        ? { hasVideo: true, width: video.videoWidth, height: video.videoHeight }
        : {}
      applyMaterial({
        duration: Math.round(video.duration || 0),
        hasAudio: (video.audioTracks?.length || 0) > 0 || video.mozHasAudio || !!video.webkitAudioDecodedByteCount,
        ...trackInfo,
      })
    }
    video.onerror = () => applyMaterial()
  }

  const buildPrompt = () => {
    const accountInfo = project
      ? `账号名称：${project.name}\n平台：${project.platform || '小红书'}\n领域：${project.category || '未指定'}\n目标受众：${project.targetAudience || '未指定'}`
      : '账号信息未配置'

    const styleInfo = currentDNA
      ? `内容风格：${currentDNA.toneDescription || '未分析'}\n常用表达：${currentDNA.signaturePhrases?.join('、') || '无'}`
      : '风格未分析'

    // ===== script 模式：基于创作导演方案复盘 =====
    if (inputMode === 'script' && scriptPlan) {
      const hookText = scriptPlan.hook?.text ? `${scriptPlan.hook.text}（类型：${scriptPlan.hook.type || '未指定'}，原理：${scriptPlan.hook.whyItWorks || '无'}）` : '未提供'
      const structureText = (() => {
        const cf = scriptPlan.structure?.contentFlow
        if (!cf || cf.length === 0) return '未提供结构'
        return cf.map(s => `[${s.order}] ${s.segment} | 用户问题：${s.viewerQuestion || '-'} | 情绪：${s.emotion || '-'} | 脚本：${(s.script || '').slice(0, 100)}`).join('\n')
      })()
      const emotionCurve = scriptPlan.structure?.emotionCurve || '未提供'
      const coreConflict = scriptPlan.structure?.hook?.hookAnalysis ? '' : ''
      const shootingSummary = scriptPlan.shootingPlan
        ? [`时长：${scriptPlan.shootingPlan.duration || '-'}`,
           scriptPlan.shootingPlan.basicSetup ? `拍摄：${JSON.stringify(scriptPlan.shootingPlan.basicSetup).slice(0, 80)}` : null,
           scriptPlan.shootingPlan.shootingNotes?.length ? `注意：${scriptPlan.shootingPlan.shootingNotes.slice(0, 3).join('；')}` : null,
        ].filter(Boolean).join('\n')
        : ''
      const fullScriptPreview = (scriptPlan.script || '').slice(0, 1500)
      const titleOriginal = scriptPlan.title || '未提供'
      const coverOriginal = scriptPlan.cover
        ? `${scriptPlan.cover.style || ''} | 文字：${scriptPlan.cover.textSuggestion || ''} | 情绪：${scriptPlan.cover.emotion || ''}`
        : '未提供'

      // 查找该内容的真实发布数据
      const perfRecord = performanceRecords.find(
        (r) => r.projectId === currentProjectId && r.title === scriptPlan.title
      )
      let performanceDataText = ''
      if (perfRecord && perfRecord.metrics) {
        const m = perfRecord.metrics
        const dm = perfRecord.derivedMetrics || {}
        performanceDataText = `\n### 6. 真实发布数据\n- 播放量：${m.views || 0}\n- 点赞：${m.likes || 0}\n- 收藏：${m.saves || 0}\n- 评论：${m.comments || 0}\n- 分享：${m.shares || 0}\n- 点赞率：${((dm.likeRate) || 0).toFixed(1)}%\n- 收藏率：${((dm.saveRate) || 0).toFixed(1)}%\n- 互动率：${((dm.engagementRate) || 0).toFixed(1)}%`
      } else {
        performanceDataText = '\n### 6. 真实发布数据\n该内容暂无真实发布数据，请基于内容结构分析。'
      }

      return `你是【AI 内容复盘优化助手】。你的工作是基于用户已经写好的【脚本】和【创作方案文本】以及真实发布数据，帮他复盘并给出下一版优化方向。

【严格禁止】不要用任何形式声称：
- 你看到了视频画面、镜头、截图、场景
- 你听到了声音、音频、BGM、说话语速、语气
- 你分析了剪辑节奏、转场、镜头运动、字幕时间点
- 任何"第X秒镜头/画面/声音"之类的描述

你只能基于下面提供的纯文本数据（脚本、结构、标题、拍摄说明、账号定位、风格 DNA）做文字层面的优化分析。

## 账号信息
${accountInfo}

## 风格信息
${styleInfo}

## 输入模式：方案复盘（基于脚本与创作方案文本，非视频文件）

### 1. 3秒 Hook
${hookText}

### 2. 内容结构（段落设计）
${structureText}
情绪曲线：${emotionCurve}

### 3. 完整脚本（前 1500 字）
${fullScriptPreview}

### 4. 原始标题 & 封面
- 标题：${titleOriginal}
- 封面建议：${coverOriginal}

### 5. 拍摄方案摘要
${shootingSummary || '未提供'}
${performanceDataText}

## 输出要求
直接输出严格 JSON，不要任何解释、markdown 或代码块标记。JSON 结构如下（所有字段必须存在，数组不能为空）：

{
  "score": {
    "hook": 0-100,
    "retention": 0-100,
    "conversion": 0-100,
    "total": 0-100
  },
  "assessmentBasis": "说明本次评估基于【脚本文本 + 创作方案结构 + 账号定位匹配度 + 真实发布数据】进行，不涉及视频画面/音频分析",
  "problems": ["问题1（文字层面，如'Hook 缺少明确反常识冲突'）", "问题2"],
  "strengths": ["优点1", "优点2"],
  "structureChange": {
    "original": "根据传入的 contentFlow 总结的当前结构（简短）",
    "optimized": "优化后的结构建议"
  },
  "editingAdvice": ["脚本层面的改写建议1", "脚本层面的改写建议2"],
  "packaging": {
    "title": "优化后的标题",
    "cover": "封面画面建议",
    "subtitle": "封面文字建议"
  },
  "nextVersionPlan": ["下一版优化方向第 1 条（具体可执行）", "下一版优化方向第 2 条", "下一版优化方向第 3 条"]
}

强制：
- problems/strengths/editingAdvice/nextVersionPlan 至少各 2 条
- assessmentBasis 必须明确写出"不涉及视频画面/音频分析"
- 严禁出现视频画面、镜头、声音、剪辑等违规用语
- 如果有真实发布数据：复盘时必须结合数据判断，哪些设计导致了当前数据表现，哪些问题影响了关键指标，下一版应优先优化影响数据最大的环节
- 如果没有真实发布数据：基于内容结构和账号定位做通用分析
`
    }

    // ===== video 模式：基于视频元信息优化（保持原有 + 加强禁止） =====
    const materialInfo = [
      `文件名：${material.fileName}`,
      `文件大小：${formatFileSize(material.fileSize)}`,
      `格式：${material.fileType}`,
      `时长：${material.duration}秒`,
      `视频轨：${material.hasVideo ? '有' : '未检测到'}（${material.width}x${material.height}）`,
      `音频轨：${material.hasAudio ? '有' : '未检测到'}`,
    ].join('\n')

    return `你是【AI 内容复盘优化助手】。你的工作是基于下面的【视频元信息】进行通用优化建议。

【严格禁止】不要用任何形式声称：
- 你看到了视频画面、镜头、截图、场景
- 你听到了声音、音频、BGM、说话语速、语气
- 你分析了剪辑节奏、转场、镜头运动、字幕时间点
- 任何"第X秒镜头/画面/声音"之类的描述

当前系统只能读取文件格式、时长、分辨率、是否有音视频轨等元数据，不能读取视频内容内容。请基于账号定位 + 风格 DNA + 元信息匹配度，给出通用建议。

## 视频元信息
${materialInfo}

## 账号信息
${accountInfo}

## 风格信息
${styleInfo}

## 平台
小红书短视频

## 输出要求
直接输出 JSON，不要任何解释或代码块标记。JSON 结构如下（所有字段必须存在）：

{
  "score": {
    "hook": 0-100,
    "retention": 0-100,
    "conversion": 0-100,
    "total": 0-100
  },
  "assessmentBasis": "根据元信息与账号定位匹配度评估（当前版本不读取视频画面/音频内容，仅基于元数据）",
  "problems": ["问题1", "问题2"],
  "strengths": ["优点1", "优点2"],
  "structureChange": {
    "original": "根据文件名/时长推断的原始结构（如果无法判断就写'元信息不足，建议基于账号爆款经验重构'）",
    "optimized": "优化后的结构建议"
  },
  "editingAdvice": ["通用优化建议1", "通用优化建议2"],
  "packaging": {
    "title": "优化后的标题",
    "cover": "封面画面建议",
    "subtitle": "封面文字建议"
  },
  "nextVersionPlan": ["下一版方向1", "下一版方向2", "下一版方向3"]
}

强制：
- assessmentBasis 必须明确写出"不读取视频画面/音频内容，仅基于元数据"
- 严禁出现视频画面、镜头、声音、剪辑等违规用语
`
  }

  // ===== JSON 修复兜底（同 VideoDirector 修复，避免 AI 返回不规范 JSON） =====
  function sanitizeJSONForParsing(str) {
    if (!str) return str
    let s = str.trim()
    if (s.startsWith('```')) s = s.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const firstBrace = s.indexOf('{')
    const lastBrace = s.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) s = s.substring(firstBrace, lastBrace + 1)
    s = s.replace(/,(\s*[}\]])/g, '$1')
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    let inString = false, quote = '', out = ''
    for (let i = 0; i < s.length; i++) {
      const c = s[i], prev = s[i - 1]
      if (!inString && (c === '"' || c === "'")) { inString = true; quote = c; out += '"'; continue }
      if (inString && c === quote && prev !== '\\') { inString = false; out += '"'; continue }
      if (inString && c === '\n' && prev !== '\\') { out += '\\n'; continue }
      if (inString && c === '\r' && prev !== '\\') continue
      out += c
    }
    return out
  }

  const parseResult = (text) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const raw = jsonMatch ? jsonMatch[0] : text.trim()
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (_e) {
        const sanitized = sanitizeJSONForParsing(text)
        parsed = JSON.parse(sanitized)
      }
      if (!parsed.score || !parsed.problems || !parsed.packaging) {
        throw new Error('AI 返回数据不完整')
      }
      // 兜底：nextVersionPlan 为空数组时补默认
      if (!Array.isArray(parsed.nextVersionPlan) || parsed.nextVersionPlan.length === 0) {
        parsed.nextVersionPlan = ['结合复盘问题重新调整 Hook 冲突点', '根据优化结构改写脚本段落顺序']
      }
      return parsed
    } catch (e) {
      throw new Error('AI 返回格式错误：' + (e.message || '解析失败'))
    }
  }

  const FORBIDDEN_PATTERNS = [
    /我看到了/, /画面显示/, /你的第.{0,3}秒/, /你的镜头/,
    /字幕内容/, /语速/, /BGM/, /声音/, /音频/,
    /画面中/, /镜头中/, /听到了/, /听到的/,
    /视频节奏/, /剪辑点/, /转场/, /背景音乐/, /镜头运动/,
    /看到画面/, /看到你的/, /画面里/, /视频画面/,
  ]
  const REPLACEMENT = '该项无法基于当前版本判断，建议结合人工检查优化。'

  const validateResult = (result) => {
    // 合法声明白名单：先把这些"官方推荐的合规表达"替换为占位符，避免被禁止词误伤
    const SAFE_MARKER = '__CONTENTOS_SAFE__'
    const safePhrases = [
      '不涉及视频画面/音频分析',
      '不涉及视频画面/音频/剪辑分析',
      '不读取视频画面/音频内容',
      '不读取视频画面、字幕或语音内容',
      '视频画面理解',
      '不涉及视频画面',
    ]
    const scanText = (text) => {
      if (!text || typeof text !== 'string') return text
      let cleaned = text
      // 1) 先把合法声明占位，避免被禁止词正则误伤
      const preserved = []
      safePhrases.forEach((phrase, idx) => {
        const marker = `${SAFE_MARKER}${idx}__`
        if (cleaned.includes(phrase)) {
          cleaned = cleaned.split(phrase).join(marker)
          preserved.push({ idx, phrase })
        }
      })
      // 2) 扫描禁止词
      FORBIDDEN_PATTERNS.forEach(p => {
        if (p.test(cleaned)) cleaned = REPLACEMENT
      })
      // 3) 如果没有被整体替换，把占位符还原回合法声明
      if (cleaned !== REPLACEMENT) {
        preserved.forEach(({ idx, phrase }) => {
          cleaned = cleaned.split(`${SAFE_MARKER}${idx}__`).join(phrase)
        })
      }
      return cleaned
    }
    const scanArray = (arr) => {
      if (!Array.isArray(arr)) return arr
      return arr.map(item => typeof item === 'string' ? scanText(item) : item)
    }

    const validated = { ...result }
    if (validated.assessmentBasis) validated.assessmentBasis = scanText(validated.assessmentBasis)
    if (validated.problems) validated.problems = scanArray(validated.problems)
    if (validated.strengths) validated.strengths = scanArray(validated.strengths)
    if (validated.editingAdvice) validated.editingAdvice = scanArray(validated.editingAdvice)
    if (validated.nextVersionPlan) validated.nextVersionPlan = scanArray(validated.nextVersionPlan)
    if (validated.structureChange) {
      validated.structureChange = {
        ...validated.structureChange,
        original: scanText(validated.structureChange.original),
        optimized: scanText(validated.structureChange.optimized),
      }
    }
    if (validated.packaging) {
      validated.packaging = {
        ...validated.packaging,
        title: scanText(validated.packaging.title),
        cover: scanText(validated.packaging.cover),
        subtitle: scanText(validated.packaging.subtitle),
      }
    }
    return validated
  }

  const handleAnalyze = async () => {
    // script 模式：要求有 scriptPlan；video 模式：要求有 material
    if (inputMode === 'script') {
      if (!scriptPlan) {
        setError('没有接收到方案数据，请从创作导演重新点击「让 AI 复盘这个方案」')
        return
      }
    } else {
      if (!material) {
        setError('请先上传视频')
        return
      }
    }
    const apiKey = getApiKeySafe()
    if (!apiKey) return

    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const prompt = buildPrompt()
      const text = await callAI(apiKey, prompt, { temperature: 0.7, max_tokens: 2000 })
      const parsed = parseResult(text)
      const validated = validateResult(parsed)
      setResult(validated)

      // ===== 沉淀复盘结论到 accountMemory =====
      // 将 AI 复盘结果分类为可迁移经验，禁止写入原始标题/Hook文案
      if (currentProjectId) {
        ensureAccountMemory(currentProjectId)

        // 关键词分类器：判断一条 insight 属于哪个维度
        const classifyInsight = (text) => {
          if (!text || typeof text !== 'string') return null
          const t = text.toLowerCase()
          // 选题方向：提到选题、方向、主题、机会、痛点、受众
          if (/选题|方向|主题|机会|痛点|受众|场景|人群|细分/.test(t)) return 'topics'
          // Hook/开头：提到 hook、开头、前3秒、引入、抓眼球
          if (/hook|开头|前3秒|引入|抓|注意力|第一句|开场/.test(t)) return 'hooks'
          // 结构：提到结构、节奏、段落、流程、中段、结尾、转折
          if (/结构|节奏|段落|流程|中段|结尾|转折|信息密度|递进/.test(t)) return 'structures'
          // 表达方式：提到语气、口吻、表达、用词、文案、话术、情绪
          if (/语气|口吻|表达|用词|文案|话术|情绪|措辞|风格/.test(t)) return 'expressions'
          // 无法分类
          return null
        }

        // 分类 strengths → winningPatterns
        const winTopics = [], winHooks = [], winStructures = [], winExpressions = []
        ;(validated.strengths || []).forEach(s => {
          const cat = classifyInsight(s)
          if (cat === 'topics') winTopics.push(s)
          else if (cat === 'hooks') winHooks.push(s)
          else if (cat === 'structures') winStructures.push(s)
          else if (cat === 'expressions') winExpressions.push(s)
          // 无法分类的不写入，避免污染
        })

        // 分类 problems → failedPatterns
        const failTopics = [], failStructures = [], failReasons = []
        ;(validated.problems || []).forEach(p => {
          const cat = classifyInsight(p)
          if (cat === 'topics') failTopics.push(p)
          else if (cat === 'structures') failStructures.push(p)
          else failReasons.push(p) // 无法明确分类的保守写入 reasons
        })

        updateMemoryPatterns(currentProjectId, {
          winningPatterns: {
            topics: winTopics.slice(0, 3),
            hooks: winHooks.slice(0, 3),
            structures: winStructures.slice(0, 3),
            expressions: winExpressions.slice(0, 3),
          },
          failedPatterns: {
            topics: failTopics.slice(0, 3),
            hooks: [],
            reasons: [...failReasons, ...failStructures].slice(0, 3),
          },
        })
      }
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message || '分析失败，请重试')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部栏 */}
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-purple-600" />
          <h1 className="text-xl font-semibold text-gray-900">AI 内容复盘优化助手</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 font-medium ml-1">V1 · 复盘模式</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 试用模式提示 */}
          {usingTrial && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">🎉 试用模式 · 免费体验中</div>
                  <div className="text-xs text-gray-500 mt-0.5">无需配置 API Key，直接开始分析。购买后可在「设置」配置自己的 Key</div>
                </div>
              </div>
              <button onClick={() => navigate('/settings')} className="text-xs text-green-700 hover:underline whitespace-nowrap shrink-0">配置自己的 Key →</button>
            </div>
          )}
          {/* 副标题 */}
          <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">复盘你的内容，找到下一版优化方向</h2>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                支持从创作导演导入方案复盘，或上传视频元信息复盘。不读取视频画面/音频，基于文本与元信息分析。
              </p>
            </div>
          </div>

          {/* 能力说明 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-emerald-600 mb-2">✅ 支持</div>
                <ul className="space-y-1">
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-emerald-400">·</span>内容结构优化（Hook / 痛点 / 情绪曲线）</li>
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-emerald-400">·</span>标题封面优化</li>
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-emerald-400">·</span>账号定位匹配 & 风格 DNA 检查</li>
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-emerald-400">·</span>基于脚本 & 创作方案生成下一版方向</li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-red-500 mb-2">❌ 不支持</div>
                <ul className="space-y-1">
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-red-400">·</span>视频画面理解</li>
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-red-400">·</span>语音分析 / 语速检测</li>
                  <li className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-red-400">·</span>剪辑节奏检测 / 镜头分析</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 模式切换 Tab */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setInputMode('script')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  inputMode === 'script'
                    ? 'text-brand-700 bg-brand-50/60 border-b-2 border-brand-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={14} /> 方案复盘
                  {scriptPlan && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-1">已接收方案</span>}
                </span>
              </button>
              <button
                onClick={() => setInputMode('video')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  inputMode === 'video'
                    ? 'text-brand-700 bg-brand-50/60 border-b-2 border-brand-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Upload size={14} /> 视频元信息
                </span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 免责声明（根据模式） */}
              <div className={`rounded-xl p-3 border ${
                inputMode === 'script'
                  ? 'bg-blue-50 border-blue-100'
                  : 'bg-amber-50 border-amber-100'
              }`}>
                <div className={`text-xs leading-relaxed ${
                  inputMode === 'script' ? 'text-blue-700' : 'text-amber-700'
                }`}>
                  {inputMode === 'script'
                    ? 'ℹ️ 当前为方案复盘模式：基于脚本和创作方案文本优化，不涉及视频画面/音频/剪辑分析。'
                    : '⚠️ 当前版本不读取视频画面、字幕或语音内容，分析仅基于视频元信息和账号定位，仅供优化参考。'}
                </div>
              </div>

              {/* ===== script 模式：方案摘要展示 ===== */}
              {inputMode === 'script' && (
                <div className="space-y-3">
                  {!scriptPlan ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                      <FileText size={28} className="mx-auto text-gray-300 mb-3" />
                      <div className="text-sm text-gray-500 mb-1">暂未接收到创作导演方案</div>
                      <div className="text-xs text-gray-400 mb-3">请先到「创作导演」生成方案，然后点击「让 AI 复盘这个方案」按钮</div>
                      <button
                        onClick={() => navigate('/workbench/video-director')}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                      >
                        前往创作导演 <ArrowRight size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Hook 卡片 */}
                      {scriptPlan.hook?.text && (
                        <div className="rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb size={14} className="text-brand-600" />
                            <span className="text-xs font-medium text-brand-700">3 秒 Hook</span>
                            {scriptPlan.hook.type && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{scriptPlan.hook.type}</span>
                            )}
                          </div>
                          <div className="text-base font-semibold text-gray-900 leading-snug mb-2">"{scriptPlan.hook.text}"</div>
                          {scriptPlan.hook.whyItWorks && (
                            <div className="text-xs text-gray-600 bg-white/70 rounded-lg px-3 py-2">💡 {scriptPlan.hook.whyItWorks}</div>
                          )}
                        </div>
                      )}

                      {/* 标题 */}
                      {scriptPlan.title && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">原标题</div>
                          <div className="text-sm font-medium text-gray-900">{scriptPlan.title}</div>
                        </div>
                      )}

                      {/* 脚本摘要 */}
                      {scriptPlan.script && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">
                            完整脚本（{scriptPlan.script.length} 字）
                            {scriptPlan.shootingPlan?.duration && <> · 预估 {scriptPlan.shootingPlan.duration}</>}
                          </div>
                          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3">
                            {scriptPlan.script.slice(0, 180)}{scriptPlan.script.length > 180 ? '...' : ''}
                          </div>
                        </div>
                      )}

                      {/* 结构摘要 */}
                      {scriptPlan.structure?.contentFlow?.length > 0 && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-2">结构（{scriptPlan.structure.contentFlow.length} 段）</div>
                          <div className="space-y-1.5">
                            {scriptPlan.structure.contentFlow.map((seg, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {seg.order ?? i + 1}
                                </span>
                                <span className="font-medium text-gray-800">{seg.segment}</span>
                                {seg.emotion && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{seg.emotion}</span>
                                )}
                              </div>
                            ))}
                            {scriptPlan.structure.emotionCurve && (
                              <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                                情绪曲线：{scriptPlan.structure.emotionCurve}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 封面 */}
                      {scriptPlan.cover && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">封面建议</div>
                          <div className="text-xs text-gray-700 space-y-0.5">
                            <div>风格：{scriptPlan.cover.style || '-'}</div>
                            <div>文字：{scriptPlan.cover.textSuggestion || '-'}</div>
                            <div>情绪：{scriptPlan.cover.emotion || '-'}</div>
                          </div>
                        </div>
                      )}

                      {/* 分析按钮 */}
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            AI 复盘方案中...
                          </>
                        ) : (
                          <>
                            <Wand2 size={16} />
                            开始复盘并生成优化方向
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ===== video 模式：上传区（保持原有） ===== */}
              {inputMode === 'video' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Upload size={18} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-900">上传视频素材（元信息模式）</h3>
                  </div>

                  {!material ? (
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors">
                        <Upload size={30} className="mx-auto text-gray-300 mb-3" />
                        <div className="text-sm text-gray-500 mb-1">点击上传视频文件</div>
                        <div className="text-xs text-gray-400">支持 mp4 / mov 格式 · 仅读取元信息</div>
                      </div>
                      <input type="file" accept=".mp4,.mov,video/mp4,video/quicktime" onChange={handleFileSelect} className="hidden" />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-gray-50 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <Film size={18} className="text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{material.fileName}</div>
                          </div>
                          <button
                            onClick={() => setMaterial(null)}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            重新上传
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div className="bg-white/70 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 mb-0.5">格式</div>
                            <div className="text-xs text-gray-700">{material.fileType || '未知'}</div>
                          </div>
                          <div className="bg-white/70 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 mb-0.5">文件大小</div>
                            <div className="text-xs text-gray-700">{formatFileSize(material.fileSize)}</div>
                          </div>
                          <div className="bg-white/70 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 mb-0.5">时长</div>
                            <div className="text-xs text-gray-700">{material.duration}秒</div>
                          </div>
                          <div className="bg-white/70 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 mb-0.5">分辨率</div>
                            <div className="text-xs text-gray-700">{material.hasVideo ? `${material.width}x${material.height}` : '未检测到'}</div>
                          </div>
                          <div className="bg-white/70 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 mb-0.5">视频轨</div>
                            <div className="text-xs text-gray-700">{material.hasVideo ? '有' : '无'}</div>
                          </div>
                          <div className="bg-white/70 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 mb-0.5">音频轨</div>
                            <div className="text-xs text-gray-700">{material.hasAudio ? '有' : '无'}</div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            AI 分析中...
                          </>
                        ) : (
                          <>
                            <Wand2 size={16} />
                            开始 AI 分析（元信息模式）
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-1 flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* 分析结果 */}
          {result && (
            <div className="space-y-4">
              {/* 视频评分 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gauge size={18} className="text-purple-600" />
                  <h3 className="font-semibold text-gray-900">视频评分</h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Hook', value: result.score.hook, color: 'text-brand-600' },
                    { label: '留存', value: result.score.retention, color: 'text-blue-600' },
                    { label: '转化', value: result.score.conversion, color: 'text-purple-600' },
                    { label: '总分', value: result.score.total, color: 'text-orange-600' },
                  ].map((s) => (
                    <div key={s.label} className="text-center rounded-xl bg-gray-50 p-4">
                      <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 存在问题 */}
              {result.problems?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={18} className="text-red-500" />
                    <h3 className="font-semibold text-gray-900">存在问题</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.problems.map((p, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 优化方向 */}
              {result.strengths?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <h3 className="font-semibold text-gray-900">优化方向</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 重构结构 */}
              {result.structureChange && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Film size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">重构结构</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">原结构</div>
                      <div className="text-sm text-gray-700">{result.structureChange.original}</div>
                    </div>
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                      <div className="text-xs font-medium text-blue-500 mb-2">优化后</div>
                      <div className="text-sm text-gray-700">{result.structureChange.optimized}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 剪辑建议 */}
              {result.editingAdvice?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={18} className="text-amber-500" />
                    <h3 className="font-semibold text-gray-900">剪辑建议</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.editingAdvice.map((a, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 评估依据 */}
              {result.assessmentBasis && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="text-[11px] text-gray-400 mb-1">评估依据</div>
                  <div className="text-xs text-gray-600 leading-relaxed">{result.assessmentBasis}</div>
                </div>
              )}

              {/* 下一版优化方向（新增） */}
              {result.nextVersionPlan?.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowRight size={18} className="text-orange-600" />
                    <h3 className="font-semibold text-gray-900">下一版优化方向</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">N+1 版重点</span>
                  </div>
                  <ol className="space-y-2.5">
                    {result.nextVersionPlan.map((s, i) => (
                      <li key={i} className="text-sm text-gray-800 flex items-start gap-3 bg-white/70 rounded-xl px-4 py-3 border border-amber-100">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 标题 & 封面建议 */}
              {result.packaging && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Type size={18} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-900">标题 & 封面建议</h3>
                  </div>

                  {result.packaging.title && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-400 mb-1">标题建议</div>
                      <div className="rounded-xl bg-brand-50 border border-brand-100 p-4">
                        <div className="text-base font-semibold text-gray-900">{result.packaging.title}</div>
                      </div>
                    </div>
                  )}

                  {result.packaging.cover && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-400 mb-1">封面画面</div>
                      <div className="rounded-xl bg-gray-50 p-4">
                        <div className="text-sm text-gray-700 flex items-start gap-2">
                          <Image size={14} className="text-gray-400 mt-0.5 shrink-0" />
                          <span>{result.packaging.cover}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.packaging.subtitle && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">封面文字</div>
                      <div className="rounded-xl bg-gray-50 p-4">
                        <div className="text-sm text-gray-700">{result.packaging.subtitle}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 返回 / 去创作导演生成下一版 */}
              <div className="flex flex-col items-center gap-2 pt-2 pb-4">
                <button
                  onClick={() => navigate('/workbench/video-director')}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors"
                >
                  <ArrowRight size={14} />
                  返回创作导演，生成下一版
                </button>
                <button
                  onClick={() => navigate('/workbench/director')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  返回导演选择
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
