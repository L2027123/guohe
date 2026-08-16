// 简单匿名行为记录工具（Beta 用户行为分析）
const TRACKER_KEY = 'contentos_tracker'

// 事件 / 页面停留记录上限，防止 localStorage 无限增长
const MAX_EVENTS = 500
const MAX_PAGE_VIEWS = 200
const MAX_STEP_VIEWS = 100

function getTracker() {
  try {
    const raw = localStorage.getItem(TRACKER_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveTracker(data) {
  try {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(data))
  } catch {
    // 忽略存储错误
  }
}

// 初始化埋点
export function initTracker() {
  let tracker = getTracker()
  if (!tracker) {
    tracker = {
      firstVisit: Date.now(),
      lastVisit: Date.now(),
      moduleClicks: {},
      firstContentGenerated: null,
      totalVisits: 1,
      // Beta 行为分析新增字段
      events: [],
      pageViews: [],
      onboardingSteps: [],
    }
    saveTracker(tracker)
  } else {
    tracker.lastVisit = Date.now()
    tracker.totalVisits = (tracker.totalVisits || 0) + 1
    // 兼容旧数据：补齐新字段
    if (!tracker.events) tracker.events = []
    if (!tracker.pageViews) tracker.pageViews = []
    if (!tracker.onboardingSteps) tracker.onboardingSteps = []
    saveTracker(tracker)
  }
  return tracker
}

// 记录模块点击
export function trackModuleClick(modulePath) {
  const tracker = ensureFields(getTracker() || initTracker())
  tracker.moduleClicks[modulePath] = (tracker.moduleClicks[modulePath] || 0) + 1
  saveTracker(tracker)
}

// 记录首次内容生成
export function trackFirstContentGeneration() {
  const tracker = ensureFields(getTracker() || initTracker())
  if (!tracker.firstContentGenerated) {
    tracker.firstContentGenerated = Date.now()
    saveTracker(tracker)
  }
}

// ===== Beta 行为分析：核心行为事件 =====
// 事件名：landing_view / click_start_analysis / onboarding_complete /
//        diagnosis_success / topics_generate / content_generate /
//        view_style_dna / view_topics
export function trackEvent(name, data = {}) {
  const tracker = ensureFields(getTracker() || initTracker())
  tracker.events.push({ name, timestamp: Date.now(), data })
  // 超出上限裁剪旧数据
  if (tracker.events.length > MAX_EVENTS) {
    tracker.events = tracker.events.slice(-MAX_EVENTS)
  }
  saveTracker(tracker)
}

// ===== 错误上报（ErrorBoundary 调用）=====
export function trackError(error, errorInfo) {
  const tracker = ensureFields(getTracker() || initTracker())
  tracker.events.push({
    name: 'js_error',
    timestamp: Date.now(),
    data: {
      message: error?.message || String(error),
      stack: (error?.stack || '').slice(0, 1000),
      componentStack: (errorInfo?.componentStack || '').slice(0, 1000),
    },
  })
  if (tracker.events.length > MAX_EVENTS) {
    tracker.events = tracker.events.slice(-MAX_EVENTS)
  }
  saveTracker(tracker)
}

// 字段补全：兼容所有历史版本 + 任何异常读取
function ensureFields(tracker) {
  if (!tracker.events) tracker.events = []
  if (!tracker.pageViews) tracker.pageViews = []
  if (!tracker.onboardingSteps) tracker.onboardingSteps = []
  if (!tracker.moduleClicks) tracker.moduleClicks = {}
  if (typeof tracker.totalVisits !== 'number') tracker.totalVisits = 1
  if (!tracker.firstVisit) tracker.firstVisit = Date.now()
  tracker.lastVisit = Date.now()
  return tracker
}

// ===== Beta 行为分析：页面停留时间 =====
// 记录进入页面
export function trackPageEnter(page) {
  const tracker = ensureFields(getTracker() || initTracker())
  tracker.pageViews.push({ page, enterTime: Date.now(), leaveTime: null, duration: 0 })
  if (tracker.pageViews.length > MAX_PAGE_VIEWS) {
    tracker.pageViews = tracker.pageViews.slice(-MAX_PAGE_VIEWS)
  }
  saveTracker(tracker)
}

// 记录离开页面（计算停留时长）
export function trackPageLeave(page) {
  const tracker = ensureFields(getTracker() || initTracker())
  // 找到最近一条该页面且未离开的记录
  for (let i = tracker.pageViews.length - 1; i >= 0; i--) {
    const v = tracker.pageViews[i]
    if (v.page === page && v.leaveTime == null) {
      v.leaveTime = Date.now()
      v.duration = Math.max(0, Math.round((v.leaveTime - v.enterTime) / 1000))
      break
    }
  }
  saveTracker(tracker)
}

// ===== Beta 行为分析：Onboarding 每一步停留 =====
export function trackOnboardingStepEnter(step) {
  const tracker = ensureFields(getTracker() || initTracker())
  // 若上一步尚未记录离开，先补离开
  const last = tracker.onboardingSteps[tracker.onboardingSteps.length - 1]
  if (last && last.leaveTime == null) {
    last.leaveTime = Date.now()
    last.duration = Math.max(0, Math.round((last.leaveTime - last.enterTime) / 1000))
  }
  tracker.onboardingSteps.push({ step, enterTime: Date.now(), leaveTime: null, duration: 0 })
  if (tracker.onboardingSteps.length > MAX_STEP_VIEWS) {
    tracker.onboardingSteps = tracker.onboardingSteps.slice(-MAX_STEP_VIEWS)
  }
  saveTracker(tracker)
}

// ===== Beta 行为分析：用户兴趣评分 =====
// +10 完成账号分析 (onboarding_complete)
// +10 查看 Style DNA (view_style_dna)
// +10 生成选题 (topics_generate)
// +20 生成内容 (content_generate)
// +5 每个停留超过 60 秒的页面
// 停留 < 10 秒离开视为流失信号
export function getUserInterest() {
  const tracker = ensureFields(getTracker() || initTracker())
  const events = tracker.events
  const pageViews = tracker.pageViews

  let score = 0
  const signals = []

  if (events.some((e) => e.name === 'onboarding_complete')) {
    score += 10
    signals.push('完成账号分析 +10')
  }
  if (events.some((e) => e.name === 'view_style_dna')) {
    score += 10
    signals.push('查看风格模型 +10')
  }
  if (events.some((e) => e.name === 'topics_generate')) {
    score += 10
    signals.push('生成选题 +10')
  }
  const contentCount = events.filter((e) => e.name === 'content_generate').length
  if (contentCount > 0) {
    score += 20
    signals.push(`生成内容 +20（共 ${contentCount} 次）`)
  }

  // 停留超过 60 秒的页面，每个 +5
  const longDwellPages = pageViews.filter((v) => v.duration >= 60)
  if (longDwellPages.length > 0) {
    score += longDwellPages.length * 5
    signals.push(`长时间停留 +${longDwellPages.length * 5}（${longDwellPages.length} 个页面超 60 秒）`)
  }

  // 流失信号：停留 < 10 秒离开的页面
  const churnPages = pageViews.filter((v) => v.duration > 0 && v.duration < 10)
  let level = 'A'
  if (score >= 30) level = 'A'
  else if (score >= 10) level = 'B'
  else level = 'C'

  // 若流失页面过多，降级
  if (churnPages.length >= 3 && level !== 'C') {
    level = level === 'A' ? 'B' : 'C'
    signals.push(`流失信号：${churnPages.length} 个页面停留不足 10 秒`)
  }

  return { score, level, signals }
}

// ===== Beta 行为分析：管理后台汇总 =====
function isSameDay(ts1, ts2) {
  const d1 = new Date(ts1)
  const d2 = new Date(ts2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function getAnalyticsSummary() {
  const tracker = ensureFields(getTracker() || initTracker())
  const events = tracker.events
  const pageViews = tracker.pageViews
  const now = Date.now()

  const todayEvents = events.filter((e) => isSameDay(e.timestamp, now))
  const todayVisits = todayEvents.filter((e) => e.name === 'landing_view').length
  const completedAnalysis = events.filter((e) => e.name === 'onboarding_complete').length
  const generatedContent = events.filter((e) => e.name === 'content_generate').length

  // 平均停留（秒 → 分钟）
  const validViews = pageViews.filter((v) => v.duration > 0)
  const avgDwellSec =
    validViews.length > 0
      ? validViews.reduce((sum, v) => sum + v.duration, 0) / validViews.length
      : 0
  const avgDwellMin = Math.round((avgDwellSec / 60) * 10) / 10

  // 最高流失页面：停留 < 10 秒次数最多的页面
  const churnCount = {}
  validViews
    .filter((v) => v.duration < 10)
    .forEach((v) => {
      churnCount[v.page] = (churnCount[v.page] || 0) + 1
    })
  let topChurnPage = '—'
  let topChurnCount = 0
  Object.entries(churnCount).forEach(([page, count]) => {
    if (count > topChurnCount) {
      topChurnPage = page
      topChurnCount = count
    }
  })

  // 各页面平均停留
  const pageDwellMap = {}
  validViews.forEach((v) => {
    if (!pageDwellMap[v.page]) pageDwellMap[v.page] = { total: 0, count: 0 }
    pageDwellMap[v.page].total += v.duration
    pageDwellMap[v.page].count += 1
  })
  const pageDwell = Object.entries(pageDwellMap).map(([page, { total, count }]) => ({
    page,
    avgDuration: Math.round((total / count) * 10) / 10,
    count,
  }))

  // 事件统计
  const eventCounts = {}
  events.forEach((e) => {
    eventCounts[e.name] = (eventCounts[e.name] || 0) + 1
  })

  const interest = getUserInterest()

  return {
    todayVisits,
    completedAnalysis,
    generatedContent,
    avgDwellMin,
    topChurnPage,
    topChurnCount,
    pageDwell,
    eventCounts,
    interest,
    totalVisits: tracker.totalVisits || 1,
    firstVisit: tracker.firstVisit,
  }
}

// 获取埋点数据
export function getTrackerData() {
  return ensureFields(getTracker() || initTracker())
}
