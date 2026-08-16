import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock aiClient 的 callAI —— 核心依赖，控制返回内容
vi.mock('../utils/aiClient', () => ({
  callAI: vi.fn(),
  classifyAIError: vi.fn((err) => ({ type: 'unknown', message: err?.message || '未知错误' })),
}))

// Mock 其他非关键依赖，避免导入 React 组件时报错
vi.mock('../store/useStore', () => ({ useStore: vi.fn(() => ({})) }))
vi.mock('../utils/tracker', () => ({
  trackFirstContentGeneration: vi.fn(),
  trackEvent: vi.fn(),
}))
vi.mock('../utils/usePageDwellTracking', () => ({ usePageDwellTracking: vi.fn() }))
vi.mock('../components/AIErrorBanner', () => ({ default: vi.fn(() => null) }))
vi.mock('../components/UpgradePrompt', () => ({ default: vi.fn(() => null) }))

import { callAI } from '../utils/aiClient'
import { generateStrategiesViaAI, generateContentViaAI } from './Pipeline.jsx'

describe('反向设计功能 — 策略生成 (generateStrategiesViaAI)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========== 测试 1：正确解析标准 JSON 数组 ==========
  it('应正确解析标准 JSON 数组响应，返回策略列表', async () => {
    const mockStrategies = [
      {
        name: '预算拆解对赌',
        hook: '直接亮出总价3000元，制造对立悬念',
        structure: '对比图→逐项花费→教训→反问',
        interaction: '每个价格后问贵还是值，结尾投票式提问',
        reason: '对赌机制激发用户站队评论',
      },
      {
        name: '痛点吐槽大会',
        hook: '喊话评论区人均改造大师',
        structure: '挑战清单→省钱技巧→值得/不值得→挑战规则',
        interaction: '抛出挑战规则引导评论区晒图',
        reason: '挑衅式激发胜负欲和互动',
      },
    ]
    callAI.mockResolvedValue(JSON.stringify(mockStrategies))

    const result = await generateStrategiesViaAI(
      '3000元出租屋改造清单', '家居', 'comments', 'fake-key', null, [], null
    )

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('预算拆解对赌')
    expect(result[0].hook).toContain('3000元')
    expect(result[1].name).toBe('痛点吐槽大会')
    expect(result[1].interaction).toContain('挑战')
  })

  // ========== 测试 2：处理 Markdown 代码块包裹的 JSON ==========
  it('应正确解析 Markdown 代码块包裹的 JSON', async () => {
    const mockJSON = `以下是策略方案：

\`\`\`json
[
  {
    "name": "价格竞猜互动",
    "hook": "猜猜这套改造花了多少钱",
    "structure": "成品展示→逐项竞猜→揭晓价格→总结",
    "interaction": "让用户在评论区猜每件物品价格",
    "reason": "竞猜机制天然激发讨论"
  }
]
\`\`\``

    callAI.mockResolvedValue(mockJSON)

    const result = await generateStrategiesViaAI(
      '出租屋改造', '家居', 'comments', 'fake-key', null, [], null
    )

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('价格竞猜互动')
  })

  // ========== 测试 3：处理尾逗号 ==========
  it('应处理 JSON 中的尾逗号', async () => {
    const badJSON = `[
      {
        "name": "策略A",
        "hook": "hook A",
        "structure": "struct A",
        "interaction": "interact A",
        "reason": "reason A",
      },
    ]`

    callAI.mockResolvedValue(badJSON)

    const result = await generateStrategiesViaAI(
      '测试选题', '家居', 'growth', 'fake-key', null, [], null
    )

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('策略A')
  })

  // ========== 测试 4：解析失败时返回默认策略 ==========
  it('当 AI 返回非 JSON 内容时，应降级返回默认策略', async () => {
    callAI.mockResolvedValue('抱歉，我无法生成策略方案。')

    const result = await generateStrategiesViaAI(
      '测试选题', '家居', 'comments', 'fake-key', null, [], null
    )

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('默认策略')
    expect(result[0].hook).toBeTruthy()
    expect(result[0].interaction).toBeTruthy()
  })

  // ========== 测试 5：最多返回 3 个策略 ==========
  it('应限制最多返回 3 个策略', async () => {
    const fourStrategies = Array.from({ length: 4 }, (_, i) => ({
      name: `策略${String.fromCharCode(65 + i)}`,
      hook: `hook ${i}`,
      structure: `structure ${i}`,
      interaction: `interaction ${i}`,
      reason: `reason ${i}`,
    }))
    callAI.mockResolvedValue(JSON.stringify(fourStrategies))

    const result = await generateStrategiesViaAI(
      '测试选题', '家居', 'comments', 'fake-key', null, [], null
    )

    expect(result).toHaveLength(3)
  })

  // ========== 测试 6：Prompt 中包含选题和目标 ==========
  it('应将选题标题和目标注入 AI prompt', async () => {
    callAI.mockResolvedValue('[]')

    await generateStrategiesViaAI(
      '30岁前必须知道的赚钱真相', '职场', 'growth', 'fake-key', null, [], null
    )

    expect(callAI).toHaveBeenCalledTimes(1)
    const promptArg = callAI.mock.calls[0][1]
    expect(promptArg).toContain('30岁前必须知道的赚钱真相')
    expect(promptArg).toContain('涨粉')
  })

  // ========== 测试 7：Prompt 中注入 StyleDNA ==========
  it('应将 StyleDNA 数据注入 prompt', async () => {
    callAI.mockResolvedValue('[]')

    const mockDNA = {
      contentPersona: '犀利姐',
      titleFormula: '数字+反常识',
      frequentExpressions: ['所有人都说', '但我发现'],
    }

    await generateStrategiesViaAI(
      '测试选题', '家居', 'comments', 'fake-key', mockDNA, [], null
    )

    const promptArg = callAI.mock.calls[0][1]
    expect(promptArg).toContain('犀利姐')
    expect(promptArg).toContain('数字+反常识')
    expect(promptArg).toContain('所有人都说')
  })

  // ========== 测试 8：Prompt 中注入 accountMemory ==========
  it('应将 accountMemory 历史经验注入 prompt', async () => {
    callAI.mockResolvedValue('[]')

    const mockMemory = {
      winningPatterns: { hooks: ['反问式开头', '数字对比'] },
      failedPatterns: { reasons: ['泛泛而谈没有冲突'] },
    }

    await generateStrategiesViaAI(
      '测试选题', '家居', 'comments', 'fake-key', null, [], mockMemory
    )

    const promptArg = callAI.mock.calls[0][1]
    expect(promptArg).toContain('反问式开头')
    expect(promptArg).toContain('泛泛而谈没有冲突')
  })

  // ========== 测试 9：兼容 AI 返回的替代字段名 ==========
  it('应兼容 AI 返回的替代字段名（hookDesign, contentStructure 等）', async () => {
    callAI.mockResolvedValue(JSON.stringify([
      {
        name: '策略X',
        hookDesign: '用 hookDesign 字段',
        contentStructure: '用 contentStructure 字段',
        interactionDesign: '用 interactionDesign 字段',
        why: '用 why 字段',
      },
    ]))

    const result = await generateStrategiesViaAI(
      '测试选题', '家居', 'comments', 'fake-key', null, [], null
    )

    expect(result[0].hook).toBe('用 hookDesign 字段')
    expect(result[0].structure).toBe('用 contentStructure 字段')
    expect(result[0].interaction).toBe('用 interactionDesign 字段')
    expect(result[0].reason).toBe('用 why 字段')
  })
})

describe('反向设计功能 — 策略注入 (generateContentViaAI)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========== 测试 1：策略被注入 content generation prompt ==========
  it('应将选定策略的完整信息注入内容生成 prompt', () => {
    callAI.mockResolvedValue('生成的内容')

    const strategy = {
      name: '预算拆解对赌',
      hook: '直接亮出总价3000元，制造对立悬念',
      structure: '对比图→逐项花费→教训→反问',
      interaction: '每个价格后问贵还是值',
      reason: '对赌机制激发评论',
    }

    generateContentViaAI(
      '3000元出租屋改造', '家居', 'fake-key', [], null, [], null, strategy
    )

    const promptArg = callAI.mock.calls[0][1]
    expect(promptArg).toContain('预算拆解对赌')
    expect(promptArg).toContain('直接亮出总价3000元')
    expect(promptArg).toContain('对比图→逐项花费→教训→反问')
    expect(promptArg).toContain('每个价格后问贵还是值')
    expect(promptArg).toContain('对赌机制激发评论')
  })

  // ========== 测试 2：策略注入包含「严格按照策略」指令 ==========
  it('prompt 中应包含要求 AI 严格按照策略生成的指令', () => {
    callAI.mockResolvedValue('生成的内容')

    const strategy = {
      name: '测试策略',
      hook: 'test hook',
      structure: 'test structure',
      interaction: 'test interaction',
      reason: 'test reason',
    }

    generateContentViaAI(
      '测试选题', '家居', 'fake-key', [], null, [], null, strategy
    )

    const promptArg = callAI.mock.calls[0][1]
    expect(promptArg).toContain('本次内容设计策略')
    expect(promptArg).toContain('严格按照以上策略生成内容')
    expect(promptArg).toContain('Hook 设计和互动埋点必须体现在正文中')
  })

  // ========== 测试 3：无策略时向后兼容 ==========
  it('不传策略时应正常生成内容（向后兼容）', () => {
    callAI.mockResolvedValue('生成的内容')

    generateContentViaAI(
      '测试选题', '家居', 'fake-key', [], null, [], null, null
    )

    expect(callAI).toHaveBeenCalledTimes(1)
    const promptArg = callAI.mock.calls[0][1]
    expect(promptArg).not.toContain('本次内容设计策略')
    // 但仍应包含选题
    expect(promptArg).toContain('测试选题')
  })

  // ========== 测试 4：策略 + StyleDNA 同时注入 ==========
  it('策略和 StyleDNA 应同时注入 prompt', () => {
    callAI.mockResolvedValue('生成的内容')

    const strategy = {
      name: '策略A',
      hook: 'hook A',
      structure: 'structure A',
      interaction: 'interaction A',
      reason: 'reason A',
    }
    const dna = {
      contentPersona: '温暖系博主',
      titleFormula: '数字+情绪词',
      frequentExpressions: ['姐妹们', '真的绝了'],
    }

    generateContentViaAI(
      '测试选题', '家居', 'fake-key', [], dna, [], null, strategy
    )

    const promptArg = callAI.mock.calls[0][1]
    // 策略
    expect(promptArg).toContain('策略A')
    expect(promptArg).toContain('hook A')
    // DNA
    expect(promptArg).toContain('温暖系博主')
    expect(promptArg).toContain('数字+情绪词')
    expect(promptArg).toContain('姐妹们')
  })

  // ========== 测试 5：策略 + accountMemory 同时注入 ==========
  it('策略和 accountMemory 应同时注入 prompt', () => {
    callAI.mockResolvedValue('生成的内容')

    const strategy = {
      name: '策略B',
      hook: 'hook B',
      structure: 'structure B',
      interaction: 'interaction B',
      reason: 'reason B',
    }
    const memory = {
      winningPatterns: { hooks: ['成功hook1'], structures: ['总分总'] },
      failedPatterns: { reasons: ['失败原因1'] },
      contentHistory: [{ topic: '旧选题', hook: '旧hook', performance: { views: 1000, likes: 50, comments: 10 } }],
    }

    generateContentViaAI(
      '测试选题', '家居', 'fake-key', [], null, [], memory, strategy
    )

    const promptArg = callAI.mock.calls[0][1]
    // 策略
    expect(promptArg).toContain('策略B')
    // 记忆
    expect(promptArg).toContain('成功hook1')
    expect(promptArg).toContain('失败原因1')
    expect(promptArg).toContain('旧选题')
  })

  // ========== 测试 6：策略出现在 DNA 之前（策略优先级更高） ==========
  it('策略注入位置应在 StyleDNA 之前', () => {
    callAI.mockResolvedValue('生成的内容')

    const strategy = { name: '策略C', hook: 'hook C', structure: '', interaction: '', reason: '' }
    const dna = { contentPersona: 'DNA角色' }

    generateContentViaAI(
      '测试选题', '家居', 'fake-key', [], dna, [], null, strategy
    )

    const promptArg = callAI.mock.calls[0][1]
    const strategyIdx = promptArg.indexOf('策略C')
    const dnaIdx = promptArg.indexOf('DNA角色')
    expect(strategyIdx).toBeGreaterThan(-1)
    expect(dnaIdx).toBeGreaterThan(-1)
    expect(strategyIdx).toBeLessThan(dnaIdx)
  })

  // ========== 测试 7：不同目标类型生成不同 prompt ==========
  it('不同目标类型应映射到不同的人类可读文本', async () => {
    callAI.mockResolvedValue('[]')

    const goals = [
      { id: 'comments', keyword: '爆评论区' },
      { id: 'growth', keyword: '涨粉' },
      { id: 'conversion', keyword: '种草转化' },
      { id: 'branding', keyword: '品牌建设' },
    ]

    for (const goal of goals) {
      vi.clearAllMocks()
      callAI.mockResolvedValue('[]')

      await generateStrategiesViaAI(
        '测试选题', '家居', goal.id, 'fake-key', null, [], null
      )

      const promptArg = callAI.mock.calls[0][1]
      expect(promptArg).toContain(goal.keyword)
    }
  })
})
