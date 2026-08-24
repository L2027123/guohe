import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STORAGE_KEY = 'contentos_v3_store'

// ── 默认数据 ──
const DEFAULT_USER = {
  id: null,
  name: '',
  email: '',
  avatar: '',
  createdAt: null,
}

const DEFAULT_PLAN = {
  tier: 'free',          // free | pro | lifetime
  status: 'trial',       // trial | active | expired
  startedAt: null,
  expiresAt: null,
}

const DEFAULT_CREDITS = {
  aiGenerate: 5,         // 免费AI生成次数（够走完1.5个闭环）
  aiDiagnosis: 1,        // 免费AI诊断次数
  competitorAnalyze: 2,  // 免费爆款拆解次数
  performanceReview: 2,  // 免费作品复盘次数
  performanceRecords: 5, // 免费表现记录上限
  projects: 1,           // 免费项目上限
  used: {
    aiGenerate: 0,
    aiDiagnosis: 0,
    competitorAnalyze: 0,
    performanceReview: 0,
  },
  // 免费体验展示用：UI 展示「免费体验剩余 X/Y」
  freeExperience: {
    competitorAnalyze: 2,
    aiGenerate: 5,
    performanceReview: 2,
  },
}

function getInitialState() {
  return {
    version: 11,
    user: { ...DEFAULT_USER },
    plan: { ...DEFAULT_PLAN },
    credits: { ...DEFAULT_CREDITS, used: { ...DEFAULT_CREDITS.used } },
    projects: [],
    currentProjectId: null,
    onboardingCompleted: false,
    styleDNA: [],           // 每个项目独立存储（v10：含 topicPreference/hookPreference/contentStructurePreference）
    styleRules: [],         // 可训练规则
    contents: [],           // 内容生产
    assets: [],             // 已归档内容
    performanceRecords: [], // 表现记录
    accountDiagnoses: [],
    topics: [],
    // v9 集合
    promptTemplates: [],
    contentPatterns: [],
    learningLogs: [],
    // v10 新增：内容记忆
    accountMemory: [],      // [{projectId, contentHistory, winningPatterns, failedPatterns}]
  }
}

// ── 迁移逻辑 ──
function migrate(state) {
  if (!state) return getInitialState()
  let s = { ...state }
  let version = s.version || 1

  // v1→v6: 完全重置为商业版结构
  if (version < 7) {
    return getInitialState()
  }

  // v7→v8: 补齐血缘字段 + 学习字段
  if (version < 8) {
    s.version = 8
    // styleDNA: 旧数据无四维度，补默认值
    s.styleDNA = (s.styleDNA || []).map((d) => ({
      ...d,
      version: d.version || 1,
      status: d.status || 'active',
      contentPersona: d.contentPersona || '',
      writingStructure: d.writingStructure || '',
      visualStyle: d.visualStyle || '',
      frequentExpressions: d.frequentExpressions || [],
      audience: d.audience || '',
      titleFormula: d.titleFormula || '',
      performanceScore: d.performanceScore || 0,
      usageCount: d.usageCount || 0,
      source: d.source || 'manual',
    }))
    // styleRules: 补齐学习字段
    s.styleRules = (s.styleRules || []).map((r) => ({
      ...r,
      ruleType: r.ruleType || 'style',
      effectivenessScore: r.effectivenessScore ?? 0,
      usageCount: r.usageCount ?? 0,
      avgEngagementRate: r.avgEngagementRate ?? 0,
      priority: r.priority ?? 50,
      lastUsedAt: r.lastUsedAt ?? null,
      optimizationStatus: r.optimizationStatus || (r.confirmed ? 'active' : 'new'),
    }))
    // contents: 补齐血缘字段
    s.contents = (s.contents || []).map((c) => ({
      ...c,
      styleDNAId: c.styleDNAId ?? null,
      styleRuleIds: c.styleRuleIds || [],
      promptId: c.promptId ?? null,
      generationSource: c.generationSource || {
        type: c.body ? 'ai' : 'manual',
        model: 'deepseek-chat',
        humanEdited: false,
      },
    }))
    // assets: 反查 content 补齐血缘
    s.assets = (s.assets || []).map((a) => {
      const content = (s.contents || []).find((c) => c.id === a.contentId)
      return {
        ...a,
        topicId: a.topicId ?? content?.topicId ?? null,
        styleDNAId: a.styleDNAId ?? content?.styleDNAId ?? null,
        styleRuleIds: a.styleRuleIds || content?.styleRuleIds || [],
        promptId: a.promptId ?? content?.promptId ?? null,
      }
    })
    // performanceRecords: 反查 asset/content 补齐血缘
    s.performanceRecords = (s.performanceRecords || []).map((r) => {
      const asset = (s.assets || []).find((a) => a.id === r.assetId)
      const content = asset ? (s.contents || []).find((c) => c.id === asset.contentId) : null
      return {
        ...r,
        contentId: r.contentId ?? asset?.contentId ?? null,
        topicId: r.topicId ?? asset?.topicId ?? content?.topicId ?? null,
        styleDNAId: r.styleDNAId ?? asset?.styleDNAId ?? content?.styleDNAId ?? null,
        styleRuleIds: r.styleRuleIds || asset?.styleRuleIds || content?.styleRuleIds || [],
        promptId: r.promptId ?? asset?.promptId ?? content?.promptId ?? null,
      }
    })
  }

  // v8→v9: 新增集合
  if (version < 9) {
    s.version = 9
    s.promptTemplates = s.promptTemplates || []
    s.contentPatterns = s.contentPatterns || []
    s.learningLogs = s.learningLogs || []
  }

  // v9→v10: StyleDNA 增加选题/爆款偏好 + accountMemory
  if (s.version < 10) {
    s.version = 10
    s.styleDNA = (s.styleDNA || []).map((d) => ({
      ...d,
      topicPreference: d.topicPreference || { preferredTopics: [], avoidTopics: [] },
      hookPreference: d.hookPreference || { bestHooks: [], weakHooks: [] },
      contentStructurePreference: d.contentStructurePreference || { bestStructures: [] },
    }))
    s.accountMemory = s.accountMemory || []
  }

  // v10→v11: accountMemory 增加 competitorAnalyses
  if (s.version < 11) {
    s.version = 11
    s.accountMemory = (s.accountMemory || []).map((m) => ({
      ...m,
      competitorAnalyses: m.competitorAnalyses || [],
    }))
  }

  return s
}

// ── 辅助函数 ──
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...getInitialState(),

      // ── 用户 ──
      setUser: (user) => {
        set({ user: { ...get().user, ...user } })
      },

      completeOnboarding: (userData) => {
        set({
          user: { ...get().user, ...userData, createdAt: Date.now() },
          onboardingCompleted: true,
        })
      },

      // ── 计划与额度 ──
      setPlan: (plan) => {
        set({ plan: { ...get().plan, ...plan } })
      },

      upgradeToPro: (tier = 'pro') => {
        set({
          plan: {
            tier,
            status: 'active',
            startedAt: Date.now(),
            expiresAt: tier === 'lifetime' ? null : Date.now() + 30 * 86400000,
          },
          credits: {
            aiGenerate: Infinity,
            aiDiagnosis: Infinity,
            performanceRecords: Infinity,
            projects: 10,
            used: { aiGenerate: 0, aiDiagnosis: 0 },
          },
        })
      },

      syncFromLicense: (license) => {
        if (!license) return
        const tier = license.tier === 'lifetime' ? 'lifetime' : 'pro'
        set({
          plan: {
            tier,
            status: 'active',
            startedAt: license.startedAt || Date.now(),
            expiresAt: license.expiresAt || null,
          },
          credits: {
            aiGenerate: Infinity,
            aiDiagnosis: Infinity,
            performanceRecords: Infinity,
            projects: 10,
            used: { aiGenerate: 0, aiDiagnosis: 0 },
          },
        })
      },

      consumeCredit: (type) => {
        const credits = get().credits
        if (credits[type] === Infinity) return true
        if (credits.used[type] >= credits[type]) return false
        set({
          credits: {
            ...credits,
            used: { ...credits.used, [type]: credits.used[type] + 1 },
          },
        })
        return true
      },

      hasCredit: (type) => {
        const credits = get().credits
        if (credits[type] === Infinity) return true
        return credits.used[type] < credits[type]
      },

      getRemainingCredits: (type) => {
        const credits = get().credits
        if (credits[type] === Infinity) return '无限'
        // 防御：旧数据可能缺 type 或 used[type]，避免 NaN 显示
        const total = typeof credits[type] === 'number' ? credits[type] : 0
        const used = typeof credits.used?.[type] === 'number' ? credits.used[type] : 0
        return Math.max(0, total - used)
      },

      // ── 分享解锁：奖励额度（不扣 used，直接增加总配额）──
      addCredits: (type, count = 3) => {
        const credits = get().credits
        const currentTotal = typeof credits[type] === 'number' ? credits[type] : 0
        if (currentTotal === Infinity) return
        set({
          credits: {
            ...credits,
            [type]: currentTotal + count,
            // freeExperience 同步放大展示用
            freeExperience: credits.freeExperience
              ? {
                  ...credits.freeExperience,
                  [type]:
                    typeof credits.freeExperience[type] === 'number'
                      ? credits.freeExperience[type] + count
                      : currentTotal + count,
                }
              : credits.freeExperience,
          },
        })
      },

      // ── 项目 ──
      createProject: (data) => {
        const id = generateId('project')
        const project = {
          id,
          name: data.name || '新账号',
          platform: data.platform || '小红书',
          category: data.category || '生活方式',
          targetAudience: data.targetAudience || '',
          goal: data.goal || '涨粉 + 互动',
          positioning: data.positioning || '',
          audience: data.audience || '',
          styleDNA: null,
          contentRules: null,
          createdAt: Date.now(),
        }
        set({
          projects: [...get().projects, project],
          currentProjectId: id,
        })
        return id
      },

      switchProject: (projectId) => {
        set({ currentProjectId: projectId })
      },

      deleteProject: (projectId) => {
        set((state) => {
          const projects = state.projects.filter((p) => p.id !== projectId)
          const filterByProject = (arr) => arr.filter((x) => x.projectId !== projectId)
          return {
            projects,
            currentProjectId:
              state.currentProjectId === projectId
                ? projects[0]?.id || null
                : state.currentProjectId,
            styleDNA: filterByProject(state.styleDNA),
            styleRules: filterByProject(state.styleRules),
            contents: filterByProject(state.contents),
            assets: filterByProject(state.assets),
            performanceRecords: filterByProject(state.performanceRecords),
            accountDiagnoses: filterByProject(state.accountDiagnoses),
            topics: filterByProject(state.topics),
            // v9 新增集合级联清理
            promptTemplates: filterByProject(state.promptTemplates),
            contentPatterns: filterByProject(state.contentPatterns),
            learningLogs: filterByProject(state.learningLogs),
            accountMemory: state.accountMemory.filter((m) => m.projectId !== projectId),
          }
        })
      },

      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, ...updates } : p
          ),
        }))
      },

      // ── StyleDNA ──
      // 旧方法保留向后兼容
      addStyleDNA: (projectId, dna) => {
        const id = generateId('dna')
        set((state) => ({
          styleDNA: [...state.styleDNA, { id, projectId, createdAt: Date.now(), ...dna }],
        }))
        return id
      },

      // v9 新增：保存 StyleDNA（归档旧的 active，创建新的 active）
      saveStyleDNA: (projectId, dna) => {
        const id = generateId('dna')
        set((state) => {
          // 当前 active DNA 改为 archived
          const updatedDNA = state.styleDNA.map((d) =>
            d.projectId === projectId && d.status === 'active'
              ? { ...d, status: 'archived' }
              : d
          )
          // 计算版本号
          const projectDNA = state.styleDNA.filter((d) => d.projectId === projectId)
          const maxVersion = projectDNA.reduce((max, d) => Math.max(max, d.version || 0), 0)
          // 创建新的 active DNA
          const newDNA = {
            id,
            projectId,
            version: maxVersion + 1,
            status: 'active',
            contentPersona: dna.contentPersona || '',
            writingStructure: dna.writingStructure || '',
            visualStyle: dna.visualStyle || '',
            frequentExpressions: dna.frequentExpressions || [],
            audience: dna.audience || '',
            titleFormula: dna.titleFormula || '',
            performanceScore: 0,
            usageCount: 0,
            source: dna.source || 'ai_analyze',
            createdAt: Date.now(),
            // v10 新增：选题/爆款偏好（初始为空，后续从复盘积累）
            topicPreference: dna.topicPreference || { preferredTopics: [], avoidTopics: [] },
            hookPreference: dna.hookPreference || { bestHooks: [], weakHooks: [] },
            contentStructurePreference: dna.contentStructurePreference || { bestStructures: [] },
          }
          return { styleDNA: [...updatedDNA, newDNA] }
        })
        return id
      },

      // ── StyleRules（可训练规则） ──
      addStyleRule: (projectId, rule) => {
        const id = generateId('rule')
        set((state) => ({
          styleRules: [
            ...state.styleRules,
            {
              id,
              projectId,
              ruleType: rule.ruleType || 'style',
              category: rule.category || '内容人格',
              rule: rule.rule || '',
              source: rule.source || 'AI分析样本',
              confidence: rule.confidence ?? 0.8,
              confirmed: rule.confirmed ?? false,
              // v9 学习字段
              effectivenessScore: rule.effectivenessScore ?? 0,
              usageCount: rule.usageCount ?? 0,
              avgEngagementRate: rule.avgEngagementRate ?? 0,
              priority: rule.priority ?? 50,
              lastUsedAt: rule.lastUsedAt ?? null,
              optimizationStatus: rule.optimizationStatus || 'new',
              createdAt: Date.now(),
            },
          ],
        }))
        return id
      },

      addStyleRules: (projectId, rules) => {
        const newRules = rules.map((r, i) => ({
          id: generateId('rule'),
          projectId,
          ruleType: r.ruleType || 'style',
          category: r.category || '内容人格',
          rule: r.rule || '',
          source: r.source || 'AI分析样本',
          confidence: r.confidence ?? 0.8,
          confirmed: r.confirmed ?? false,
          // v9 学习字段
          effectivenessScore: 0,
          usageCount: 0,
          avgEngagementRate: 0,
          priority: 50,
          lastUsedAt: null,
          optimizationStatus: 'new',
          createdAt: Date.now() + i,
        }))
        set((state) => ({
          styleRules: [...state.styleRules, ...newRules],
        }))
        return newRules.map((r) => r.id)
      },

      updateStyleRule: (ruleId, updates) => {
        set((state) => ({
          styleRules: state.styleRules.map((r) =>
            r.id === ruleId ? { ...r, ...updates } : r
          ),
        }))
      },

      confirmStyleRule: (ruleId) => {
        set((state) => ({
          styleRules: state.styleRules.map((r) =>
            r.id === ruleId
              ? {
                  ...r,
                  confirmed: !r.confirmed,
                  optimizationStatus: !r.confirmed ? 'active' : r.optimizationStatus,
                }
              : r
          ),
        }))
      },

      deleteStyleRule: (ruleId) => {
        set((state) => ({
          styleRules: state.styleRules.filter((r) => r.id !== ruleId),
        }))
      },

      clearStyleRules: (projectId) => {
        set((state) => ({
          styleRules: state.styleRules.filter((r) => r.projectId !== projectId),
        }))
      },

      // v9 新增：更新规则效果分
      updateRuleEffectiveness: (ruleId, data) => {
        set((state) => ({
          styleRules: state.styleRules.map((r) =>
            r.id === ruleId
              ? {
                  ...r,
                  effectivenessScore: data.effectivenessScore ?? r.effectivenessScore,
                  usageCount: data.usageCount ?? r.usageCount,
                  avgEngagementRate: data.avgEngagementRate ?? r.avgEngagementRate,
                  lastUsedAt: data.lastUsedAt ?? r.lastUsedAt,
                  optimizationStatus: data.optimizationStatus || r.optimizationStatus,
                }
              : r
          ),
        }))
      },

      // ── 内容 ──
      addContent: (projectId, content) => {
        const id = generateId('content')
        set((state) => ({
          contents: [
            {
              id,
              projectId,
              status: 'draft',
              createdAt: Date.now(),
              // v9 血缘字段
              styleDNAId: content.styleDNAId || null,
              styleRuleIds: content.styleRuleIds || [],
              promptId: content.promptId || null,
              generationSource: content.generationSource || {
                type: 'ai',
                model: 'deepseek-chat',
                humanEdited: false,
              },
              ...content,
            },
            ...state.contents,
          ],
        }))
        return id
      },

      updateContent: (contentId, updates) => {
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === contentId ? { ...c, ...updates } : c
          ),
        }))
      },

      deleteContent: (contentId) => {
        set((state) => ({
          contents: state.contents.filter((c) => c.id !== contentId),
        }))
      },

      moveContentToAsset: (contentId) => {
        const state = get()
        const content = state.contents.find((c) => c.id === contentId)
        if (!content) return null

        const assetId = generateId('asset')
        const asset = {
          id: assetId,
          projectId: content.projectId,
          contentId: content.id,
          type: 'note',
          title: content.title,
          body: content.body,
          hook: content.hook,
          structure: content.structure,
          cta: content.cta,
          createdAt: Date.now(),
          // v9 血缘字段（从 content 复制）
          topicId: content.topicId || null,
          styleDNAId: content.styleDNAId || null,
          styleRuleIds: content.styleRuleIds || [],
          promptId: content.promptId || null,
        }

        set((s) => ({
          assets: [asset, ...s.assets],
          contents: s.contents.map((c) =>
            c.id === contentId ? { ...c, status: 'archived' } : c
          ),
        }))
        return assetId
      },

      deleteAsset: (assetId) => {
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== assetId),
        }))
      },

      // ── 表现记录 ──
      addPerformanceRecord: (projectId, record) => {
        const id = generateId('perf')
        const metrics = record.metrics || { views: 0, likes: 0, saves: 0, comments: 0, shares: 0 }
        const derivedMetrics = calculateDerivedMetrics(metrics)
        // v9: 从 asset 反查血缘字段
        const asset = record.assetId
          ? get().assets.find((a) => a.id === record.assetId)
          : null
        set((state) => ({
          performanceRecords: [
            {
              id,
              projectId,
              assetId: record.assetId || null,
              title: record.title || '',
              body: record.body || '',
              hook: record.hook || '',
              structure: record.structure || '',
              cta: record.cta || '',
              platformUrl: record.platformUrl || '',
              publishedAt: record.publishedAt || null,
              recordedAt: Date.now(),
              metrics,
              derivedMetrics,
              status: 'recorded',
              analysis: null,
              // v9 血缘字段（从 asset 自动反查）
              contentId: record.contentId || asset?.contentId || null,
              topicId: record.topicId || asset?.topicId || null,
              styleDNAId: record.styleDNAId || asset?.styleDNAId || null,
              styleRuleIds: record.styleRuleIds || asset?.styleRuleIds || [],
              promptId: record.promptId || asset?.promptId || null,
            },
            ...state.performanceRecords,
          ],
        }))
        return id
      },

      updatePerformanceRecord: (recordId, updates) => {
        set((state) => ({
          performanceRecords: state.performanceRecords.map((r) => {
            if (r.id !== recordId) return r
            const merged = { ...r, ...updates }
            if (updates.metrics) {
              merged.metrics = updates.metrics
              merged.derivedMetrics = calculateDerivedMetrics(updates.metrics)
            }
            return merged
          }),
        }))
      },

      deletePerformanceRecord: (recordId) => {
        set((state) => ({
          performanceRecords: state.performanceRecords.filter((r) => r.id !== recordId),
        }))
      },

      analyzePerformanceRecord: (recordId, analysis) => {
        set((state) => ({
          performanceRecords: state.performanceRecords.map((r) =>
            r.id === recordId
              ? { ...r, analysis: { ...analysis, analyzedAt: Date.now() }, status: 'analyzed' }
              : r
          ),
        }))
      },

      // ── 账号诊断 ──
      addAccountDiagnosis: (projectId, data) => {
        const id = generateId('diag')
        const snapshot = data.snapshot || {}
        set((state) => ({
          accountDiagnoses: [
            {
              id,
              projectId,
              summary: data.summary || '',
              strengths: Array.isArray(data.strengths) ? data.strengths : [],
              weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
              strategies: Array.isArray(data.strategies) ? data.strategies : [],
              snapshot: {
                assetsCount: snapshot.assetsCount || 0,
                rulesCount: snapshot.rulesCount || 0,
                confirmedRulesCount: snapshot.confirmedRulesCount || 0,
                performanceCount: snapshot.performanceCount || 0,
                avgViews: snapshot.avgViews || 0,
                avgEngagementRate: snapshot.avgEngagementRate || 0,
                learningStage: snapshot.learningStage || '建立认知',
              },
              createdAt: Date.now(),
            },
            ...state.accountDiagnoses,
          ],
        }))
        return id
      },

      deleteAccountDiagnosis: (id) => {
        set((state) => ({
          accountDiagnoses: state.accountDiagnoses.filter((d) => d.id !== id),
        }))
      },

      clearAccountDiagnoses: (projectId) => {
        set((state) => ({
          accountDiagnoses: state.accountDiagnoses.filter((d) => d.projectId !== projectId),
        }))
      },

      // ── 选题 ──
      addTopic: (projectId, topicData) => {
        const id = generateId('topic')
        set((state) => ({
          topics: [
            ...state.topics,
            {
              id,
              projectId,
              ...topicData,
              styleDNAId: topicData.styleDNAId || null,
              status: 'pending',
              createdAt: Date.now(),
            },
          ],
        }))
        return id
      },

      adoptTopic: (id) => {
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === id ? { ...t, status: 'adopted' } : t
          ),
        }))
      },

      // ── v9 新增：AI Brain 学习层 ──

      // 从表现数据学习：按 styleRuleId 分组统计，更新规则效果分
      learnFromPerformance: (projectId) => {
        const state = get()
        const records = state.performanceRecords.filter((r) => r.projectId === projectId)
        if (records.length === 0) return

        // 收集所有 styleRuleIds 并按 ruleId 分组
        const ruleStats = {} // { ruleId: { records: [], engagementRates: [], views: [] } }
        records.forEach((r) => {
          const ruleIds = r.styleRuleIds || []
          ruleIds.forEach((rid) => {
            if (!ruleStats[rid]) ruleStats[rid] = { records: [], engagementRates: [], views: [] }
            ruleStats[rid].records.push(r)
            ruleStats[rid].engagementRates.push(r.derivedMetrics?.engagementRate || 0)
            ruleStats[rid].views.push(r.metrics?.views || 0)
          })
        })

        // 计算每条规则的效果分并更新
        const logId = generateId('log')
        const updatedRuleIds = []
        Object.keys(ruleStats).forEach((ruleId) => {
          const stats = ruleStats[ruleId]
          const usageCount = stats.records.length
          const avgEngagementRate =
            stats.engagementRates.reduce((a, b) => a + b, 0) / usageCount
          const avgViews = stats.views.reduce((a, b) => a + b, 0) / usageCount
          // 效果分 = 互动率 * 40 + 使用次数 * 5 + 平均浏览/100（上限100）
          const effectivenessScore = Math.min(
            100,
            Math.round(avgEngagementRate * 100 * 40 + usageCount * 5 + avgViews / 100)
          )
          const optimizationStatus =
            effectivenessScore > 60 ? 'active' : effectivenessScore > 30 ? 'underperforming' : 'archived'

          get().updateRuleEffectiveness(ruleId, {
            effectivenessScore,
            usageCount,
            avgEngagementRate: +avgEngagementRate.toFixed(4),
            lastUsedAt: Math.max(...stats.records.map((r) => r.recordedAt || 0)),
            optimizationStatus,
          })
          updatedRuleIds.push(ruleId)
        })

        // 记录学习日志
        set((s) => ({
          learningLogs: [
            {
              id: logId,
              projectId,
              action: 'learnFromPerformance',
              sourceIds: records.map((r) => r.id),
              result: { updatedRuleIds, ruleCount: updatedRuleIds.length },
              createdAt: Date.now(),
            },
            ...s.learningLogs,
          ],
        }))
      },

      // 从高表现内容提取爆款模式
      extractPattern: (projectId) => {
        const state = get()
        const records = state.performanceRecords
          .filter((r) => r.projectId === projectId)
          .sort((a, b) => (b.derivedMetrics?.engagementRate || 0) - (a.derivedMetrics?.engagementRate || 0))
          .slice(0, 3) // Top 3

        if (records.length === 0) return []

        const newPatterns = []
        const types = [
          { key: 'title_formula', field: 'title', label: '标题套路' },
          { key: 'hook_style', field: 'hook', label: 'Hook 风格' },
          { key: 'structure', field: 'structure', label: '内容结构' },
          { key: 'cta_style', field: 'cta', label: 'CTA 风格' },
        ]

        types.forEach(({ key, field, label }) => {
          const values = records.map((r) => r[field]).filter(Boolean)
          if (values.length === 0) return
          // 简单提取共性：取所有值的共同特征（这里简化为取第一个作为代表模式）
          const avgViews = records.reduce((s, r) => s + (r.metrics?.views || 0), 0) / records.length
          const avgEngagementRate =
            records.reduce((s, r) => s + (r.derivedMetrics?.engagementRate || 0), 0) / records.length

          newPatterns.push({
            id: generateId('pattern'),
            projectId,
            type: key,
            pattern: values[0],
            description: `${label}：从 Top ${records.length} 高表现内容提取`,
            sourceRecords: records.map((r) => r.id),
            confidence: Math.min(1, records.length / 5),
            usageCount: 0,
            avgPerformance: +avgEngagementRate.toFixed(4),
            validated: false,
            createdAt: Date.now(),
          })
        })

        if (newPatterns.length === 0) return []

        set((s) => ({
          contentPatterns: [...newPatterns, ...s.contentPatterns],
          learningLogs: [
            {
              id: generateId('log'),
              projectId,
              action: 'extractPattern',
              sourceIds: records.map((r) => r.id),
              result: { patternCount: newPatterns.length },
              createdAt: Date.now(),
            },
            ...s.learningLogs,
          ],
        }))
        return newPatterns.map((p) => p.id)
      },

      // v9：手动保存爆款模式（用户上传优秀内容 → AI 拆解 → 保存）
      // V2 扩展：支持爆款实验室完整字段（decisionPrinciples/viralMechanism/transferability/notTransferable/fireScore）
      addContentPattern: (projectId, pattern) => {
        const id = generateId('pattern')
        const newPattern = {
          id,
          projectId,
          type: pattern.type || 'viral_structure',
          pattern: pattern.pattern || '',
          description: pattern.description || '',
          deconstruction: pattern.deconstruction || {},
          source: pattern.source || 'user_upload',
          // 兼容字段：旧版本用 sourceText，V2 用 sourceTitle/sourcePlatform
          sourceText: pattern.sourceText || pattern.sourceTitle || '',
          sourceTitle: pattern.sourceTitle || pattern.sourceText || '',
          sourcePlatform: pattern.sourcePlatform || '',
          // V2 新增：爆款实验室决策字段
          decisionPrinciples: pattern.decisionPrinciples || [],
          viralMechanism: pattern.viralMechanism || '',
          transferability: pattern.transferability || {},
          notTransferable: pattern.notTransferable || [],
          fireScore: pattern.fireScore || {},
          confidence: pattern.confidence ?? 0.8,
          // V1.1 新增：操作公式 + 具体迁移示例
          killerMoveFormula: pattern.killerMoveFormula || '',
          migrationExamples: pattern.migrationExamples || [],
          usageCount: 0,
          avgPerformance: 0,
          validated: false,
          createdAt: Date.now(),
        }
        set((s) => ({ contentPatterns: [newPattern, ...s.contentPatterns] }))
        return id
      },

      // 删除爆款模式
      deleteContentPattern: (patternId) => {
        set((s) => ({
          contentPatterns: s.contentPatterns.filter((p) => p.id !== patternId),
        }))
      },

      // 从 AI 复盘分析结果生成规则（待人工确认）
      generateRuleFromAnalysis: (recordId) => {
        const state = get()
        const record = state.performanceRecords.find((r) => r.id === recordId)
        if (!record || !record.analysis) return []

        const suggestions = record.analysis.suggestions || []
        if (suggestions.length === 0) return []

        const newRuleIds = suggestions.map((suggestion, i) => {
          const ruleId = generateId('rule')
          return {
            id: ruleId,
            projectId: record.projectId,
            ruleType: 'optimization',
            category: '优化建议',
            rule: suggestion,
            source: 'AI复盘',
            confidence: 0.7,
            confirmed: false,
            effectivenessScore: 0,
            usageCount: 0,
            avgEngagementRate: 0,
            priority: 50,
            lastUsedAt: null,
            optimizationStatus: 'new',
            createdAt: Date.now() + i,
          }
        })

        set((s) => ({
          styleRules: [...s.styleRules, ...newRuleIds],
          learningLogs: [
            {
              id: generateId('log'),
              projectId: record.projectId,
              action: 'generateRuleFromAnalysis',
              sourceIds: [recordId],
              result: { ruleCount: newRuleIds.length },
              createdAt: Date.now(),
            },
            ...s.learningLogs,
          ],
        }))
        return newRuleIds.map((r) => r.id)
      },

      // ── v10 新增：内容记忆（Content Memory） ──

      // 纯 getter：只读取，不触发 set（安全用于 useMemo / render）
      getAccountMemory: (projectId) => {
        const state = get()
        return state.accountMemory.find((m) => m.projectId === projectId) || null
      },

      // 初始化方法：在 useEffect 中调用，确保 memory 存在
      ensureAccountMemory: (projectId) => {
        const state = get()
        const exists = state.accountMemory.find((m) => m.projectId === projectId)
        if (exists) return exists

        const memory = {
          id: generateId('memory'),
          projectId,
          contentHistory: [],
          winningPatterns: { topics: [], hooks: [], structures: [], expressions: [] },
          failedPatterns: { topics: [], hooks: [], reasons: [] },
          competitorAnalyses: [],  // v11 新增：爆款拆解记录
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ accountMemory: [...s.accountMemory, memory] }))
        return memory
      },

      // 存储爆款拆解分析结果
      storeCompetitorAnalysis: (projectId, analysis) => {
        set((state) => {
          const memory = state.accountMemory.find((m) => m.projectId === projectId)
          if (!memory) return state
          const updatedMemory = {
            ...memory,
            competitorAnalyses: [analysis, ...(memory.competitorAnalyses || [])].slice(0, 20),
            updatedAt: Date.now(),
          }
          return {
            accountMemory: state.accountMemory.map((m) =>
              m.projectId === projectId ? updatedMemory : m
            ),
          }
        })
      },

      // 删除一条爆款拆解记录
      deleteCompetitorAnalysis: (projectId, analysisId) => {
        set((state) => {
          const memory = state.accountMemory.find((m) => m.projectId === projectId)
          if (!memory) return state
          const updatedMemory = {
            ...memory,
            competitorAnalyses: (memory.competitorAnalyses || []).filter((a) => a.id !== analysisId),
            updatedAt: Date.now(),
          }
          return {
            accountMemory: state.accountMemory.map((m) =>
              m.projectId === projectId ? updatedMemory : m
            ),
          }
        })
      },

      // 添加一条内容历史（发布后录入数据时调用）
      addContentHistory: (projectId, entry) => {
        const id = generateId('hist')
        set((state) => {
          const memory = state.accountMemory.find((m) => m.projectId === projectId)
          if (!memory) return state
          const newEntry = {
            id,
            topic: entry.topic || '',
            hook: entry.hook || '',
            style: entry.style || '',
            script: entry.script || '',
            publishDate: entry.publishDate || Date.now(),
            performance: entry.performance || {
              views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followers: 0, completionRate: 0,
            },
            aiAnalysis: entry.aiAnalysis || { whyWorked: '', whyFailed: '', lessons: [] },
          }
          return {
            accountMemory: state.accountMemory.map((m) =>
              m.projectId === projectId
                ? { ...m, contentHistory: [newEntry, ...m.contentHistory], updatedAt: Date.now() }
                : m
            ),
          }
        })
        return id
      },

      // 更新历史条目（复盘后调用，写入 aiAnalysis 和 performance）
      updateContentHistory: (projectId, historyId, updates) => {
        set((state) => {
          const memory = state.accountMemory.find((m) => m.projectId === projectId)
          if (!memory) return state
          return {
            accountMemory: state.accountMemory.map((m) =>
              m.projectId === projectId
                ? {
                    ...m,
                    contentHistory: m.contentHistory.map((h) =>
                      h.id === historyId ? { ...h, ...updates } : h
                    ),
                    updatedAt: Date.now(),
                  }
                : m
            ),
          }
        })
      },

      // 更新 winningPatterns / failedPatterns（复盘后自动沉淀）
      updateMemoryPatterns: (projectId, { winningPatterns, failedPatterns }) => {
        set((state) => {
          const memory = state.accountMemory.find((m) => m.projectId === projectId)
          if (!memory) return state
          const mergedWinning = {
            topics: [...new Set([...(memory.winningPatterns.topics || []), ...(winningPatterns?.topics || [])])].slice(-10),
            hooks: [...new Set([...(memory.winningPatterns.hooks || []), ...(winningPatterns?.hooks || [])])].slice(-10),
            structures: [...new Set([...(memory.winningPatterns.structures || []), ...(winningPatterns?.structures || [])])].slice(-10),
            expressions: [...new Set([...(memory.winningPatterns.expressions || []), ...(winningPatterns?.expressions || [])])].slice(-10),
          }
          const mergedFailed = {
            topics: [...new Set([...(memory.failedPatterns.topics || []), ...(failedPatterns?.topics || [])])].slice(-10),
            hooks: [...new Set([...(memory.failedPatterns.hooks || []), ...(failedPatterns?.hooks || [])])].slice(-10),
            reasons: [...new Set([...(memory.failedPatterns.reasons || []), ...(failedPatterns?.reasons || [])])].slice(-10),
          }
          return {
            accountMemory: state.accountMemory.map((m) =>
              m.projectId === projectId
                ? { ...m, winningPatterns: mergedWinning, failedPatterns: mergedFailed, updatedAt: Date.now() }
                : m
            ),
          }
        })
      },

      // 获取最近 N 条复盘结论
      getRecentReviews: (projectId, limit = 3) => {
        const state = get()
        const memory = state.accountMemory.find((m) => m.projectId === projectId)
        if (!memory) return { winningPatterns: null, failedPatterns: null, recentHistory: [] }
        const recentHistory = memory.contentHistory
          .filter((h) => h.aiAnalysis?.whyWorked || h.aiAnalysis?.whyFailed)
          .slice(0, limit)
        return {
          winningPatterns: memory.winningPatterns,
          failedPatterns: memory.failedPatterns,
          recentHistory,
        }
      },

      // ── 重置 ──
      resetStore: () => {
        set(getInitialState())
      },
    }),
    {
      name: STORAGE_KEY,
      version: 10,
      partialize: (state) => ({
        version: state.version,
        user: state.user,
        plan: state.plan,
        credits: state.credits,
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        onboardingCompleted: state.onboardingCompleted,
        styleDNA: state.styleDNA,
        styleRules: state.styleRules,
        contents: state.contents,
        assets: state.assets,
        performanceRecords: state.performanceRecords,
        accountDiagnoses: state.accountDiagnoses,
        topics: state.topics,
        // v9 新增集合持久化
        promptTemplates: state.promptTemplates,
        contentPatterns: state.contentPatterns,
        learningLogs: state.learningLogs,
        // v10 新增：内容记忆持久化
        accountMemory: state.accountMemory,
      }),
      migrate: (persistedState, version) => {
        try {
          if (!persistedState) return getInitialState()
          if (version < 7) return getInitialState()
          return migrate(persistedState)
        } catch (e) {
          console.error('[ContentOS] Store migration failed:', e)
          try {
            localStorage.removeItem('contentos_v3_store')
          } catch (_) { /* noop */ }
          return getInitialState()
        }
      },
      onRehydrateStorage: () => (state) => {
        // 兜底：反序列化或 migrate 全部失败，state 不是合法对象
        if (!state || typeof state !== 'object') {
          try { localStorage.removeItem('contentos_v3_store') } catch (_) {}
        }
      },
    }
  )
)

// ── 辅助函数 ──
function calculateDerivedMetrics(metrics) {
  const views = metrics.views || 0
  const likes = metrics.likes || 0
  const saves = metrics.saves || 0
  const comments = metrics.comments || 0
  const shares = metrics.shares || 0
  return {
    likeRate: views > 0 ? +(likes / views).toFixed(4) : 0,
    saveRate: views > 0 ? +(saves / views).toFixed(4) : 0,
    commentRate: views > 0 ? +(comments / views).toFixed(4) : 0,
    shareRate: views > 0 ? +(shares / views).toFixed(4) : 0,
    engagementRate: views > 0 ? +((likes + saves + comments + shares) / views).toFixed(4) : 0,
  }
}
