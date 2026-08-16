/**
 * ContentOS 拆解引擎批量测试
 * 10 个真实爆款案例 → AI 拆解 → 质量评分
 *
 * 运行：node src/pages/Workbench/batch-test.mjs
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildAnalysisPrompt } from './analysisPrompt.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')

// ========== DeepSeek API ==========
const API_KEY = process.env.DEEPSEEK_API_KEY || readFileSync(join(ROOT, '.env'), 'utf-8').match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim()
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

async function callAI(prompt, options = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4000,
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

// buildAnalysisPrompt 已提取到 ./analysisPrompt.mjs，与 CompetitorAnalyzer.jsx 共用

// ========== JSON 解析（与 Pipeline.jsx 两阶段策略一致）==========
function parseAnalysisResult(text) {
  // 阶段1：直接解析
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {}

  // 阶段2：清理后重试
  try {
    const cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/[\u0000-\u001F]/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {}

  return null
}

// ========== 10 个真实爆款案例 ==========
const TEST_CASES = [
  {
    id: 1,
    category: '情感心理',
    platform: '小红书',
    title: '分手后我才明白，爱自己不是买东西，是别再为难自己',
    content: '和前任分手第7天，朋友带我去逛街说"对自己好一点"。我买了一堆东西回家，拆快递时突然哭了。不是因为想他，是发现我一直在用消费填补那个洞。真正的爱自己，不是买一个包、吃一顿好的。是分手时不骂对方，不否定自己。是承认这段关系里自己也有问题，但不因此觉得自己不配被爱。是晚上一个人睡也不害怕，是饿了自己做饭，累了就休息。以前总等别人来爱我，现在学会了自己先爱自己。姐妹们，别等别人来救你，你自己就是那个救赎。',
    description: '点赞12.5万 收藏3.2万 评论8600',
  },
  {
    id: 2,
    category: '职场干货',
    platform: '公众号',
    title: '我在字节干了3年，离开时只带走了一句话',
    content: '入职第一天leader说："在这里，你的价值不是做了多少事，而是解决了多少别人解决不了的问题。"当时不懂，觉得不就是多干活吗？于是疯狂接需求、加班到凌晨、周末也在写文档。半年后绩效评估，我以为稳稳A，结果拿了B。leader说："你做了很多，但都是别人也能做的事。"这句话打醒了我。后来我开始挑难的事做：跨部门协作没人愿意碰的烂摊子、技术方案有争议需要拍板的项目。不是更努力，而是更敢选。3年后离开时，leader送我一句话：聪明人很多，敢做选择的人很少。',
    description: '阅读10万+ 在看3200 留言500+',
  },
  {
    id: 3,
    category: '美妆护肤',
    platform: '小红书',
    title: '用了3年贵妇面霜，换成了20块的它，皮肤反而好了',
    content: '先声明不是标题党。3年用了某贵妇面霜（1200元/50ml），皮肤确实不错但也没惊艳。上个月出差忘带，在便利店买了儿童霜（20块）。用了两周后同事说我皮肤变好了。我仔细对比了一下：贵妇霜成分表15行，儿童霜成分表5行。但儿童霜的封闭性更强，反而锁水效果更好。当然贵妇霜有抗老成分，但如果你只是要保湿+维稳，20块的真的够了。不是说贵的不好，而是想告诉姐妹们：别被价格绑架，护肤的核心是了解自己的皮肤需要什么，而不是牌子给了什么。',
    description: '点赞8.7万 收藏5.1万 评论4200',
  },
  {
    id: 4,
    category: '美食',
    platform: '抖音',
    title: '30块钱做一桌菜，婆婆吃完说以后不用下馆子了',
    content: '今天婆婆来吃饭，我预算只有30块。去菜市场买了：鸡腿8块、豆腐3块、土豆2块、青菜3块、鸡蛋4块、西红柿3块、米饭2块、调料5块。做了四菜一汤：红烧鸡腿、麻婆豆腐、酸辣土豆丝、西红柿炒蛋、紫菜蛋花汤。婆婆吃了三碗饭，说比外面饭店好吃。关键是她知道我只花了30块后，态度完全变了，以前觉得我不会过日子，现在天天催我教她做菜。其实不是厨艺多好，就是用心了。',
    description: '播放580万 点赞42万 评论1.8万',
  },
  {
    id: 5,
    category: '家居生活',
    platform: '小红书',
    title: '住了5年出租屋，房东说我是他见过最会住的租客',
    content: '搬进出租屋第一天，室友说"反正不是自己的房子，凑合住吧"。我没说话，花了200块：买了白色桌布遮住丑桌子、换了暖光灯泡、窗台上放了一盆绿萝、门口铺了个地垫。室友说"你折腾这些干嘛，又不是自己的"。一年后室友搬走了，新室友来第一天说"你这不像出租屋啊"。第三年房东来收租，看到屋子说"你是我遇到过最会住的租客"，主动给我减了200块房租。其实不是花钱多少的问题，是你愿不愿意把"暂住的地方"当成"生活的地方"。',
    description: '点赞6.3万 收藏8.9万 评论2100',
  },
  {
    id: 6,
    category: '财经理财',
    platform: '公众号',
    title: '月薪5000存了20万，不是靠省，是靠这个笨办法',
    content: '毕业第一年月薪5000，同事说这个工资能活下来就不错了。我没反驳，但定了一个规矩：每月发工资第一件事，转2000到一个没有绑卡没有APP的账户。剩下的3000块：房租1500、吃饭800、交通200、其他500。3年后那个账户有7万多。有朋友说"你过得太苦了"，但说实话我没觉得苦，因为花钱的预算一开始就定好了，花的是"被允许花的那部分"。不是克制，是设计。第4年跳槽涨薪到8000，但我还是只转2000吗？不，转3500。加薪的部分先存50%再花。5年存了20万。笨办法就是最好的办法。',
    description: '阅读15万+ 在看4800 留言800+',
  },
  {
    id: 7,
    category: '母婴育儿',
    platform: '小红书',
    title: '我3岁女儿说了一句话，让我辞掉了年薪30万的工作',
    content: '上周加班到10点回家，女儿已经睡了。第二天早上她抱着我说"妈妈你是不是不要我了，你每天走的时候我还没醒，你回来的时候我已经睡了"。我笑着说"妈妈去赚钱给你买好吃的"。她说"我不要好吃的，我要妈妈"。当天上班我一直在想这句话。想了三天，递了辞职信。不是冲动，是算了一笔账：请保姆带孩子一个月6000，我月薪2万5，扣除保姆和通勤，实际多赚1万。但这1万的代价是每天只见女儿1小时。1小时值1万吗？不值。辞职后做了自由职业，收入少了但每天能接她放学。有人说我傻，但我知道我在买什么。',
    description: '点赞15.2万 收藏2.8万 评论9800',
  },
  {
    id: 8,
    category: '健康养生',
    platform: '抖音',
    title: '体检报告出来后，我扔掉了冰箱里一半的东西',
    content: '32岁体检，脂肪肝+血脂偏高。医生说"你这不叫病，叫吃出来的"。回家打开冰箱：可乐、蛋糕、速冻水饺、火腿肠、沙拉酱。全扔了。老婆说我疯了。我说这些就是让我生病的"药"。然后去超市买了：鸡蛋、青菜、西红柿、鸡胸肉、燕麦。一个月后复查，指标降了一半。不是什么神奇养生法，就是把加工食品换成了天然食物。但难的不是换食物，是拒绝方便。你冰箱里装的是什么，你的身体就是什么。',
    description: '播放320万 点赞28万 评论9600',
  },
  {
    id: 9,
    category: '教育学习',
    platform: '小红书',
    title: '从二本到985研究生，我只做对了一件事',
    content: '本科二本，考研985，现在研二。很多人问我怎么做到的，以为我有什么聪明方法。真相是我只是把手机里的娱乐APP全删了，换成了一个背单词和看论文的APP。不是靠意志力，是靠环境设计。当你打开手机只能学习时，你自然会学习。室友打游戏时我在看论文，不是因为我更自律，而是因为我的手机里没有游戏。考研那一年我最大的感悟是：自律是伪命题，环境才是真相。你能控制的不是自己，是自己身边的东西。',
    description: '点赞9.4万 收藏12.1万 评论3400',
  },
  {
    id: 10,
    category: '科技数码',
    platform: 'B站',
    title: '用了5年iPhone换到安卓，第3天我就后悔了',
    content: '5年果粉，上周iPhone电池实在不行了，冲动买了安卓旗舰。第一天：爽！快充半小时满电、屏幕刷新率丝滑、信号终于满格。第二天：也还行，APP质量差点但能忍。第三天：开始后悔。不是手机不好，是生态断不开。AirDrop传不了图、MacBook接力用不了、Apple Watch变成了普通手表、iMessage里好多聊天记录没了。最终我退了安卓，又买了个iPhone。不是iPhone更好，是我已经被锁在苹果生态里了。这让我明白一个道理：产品竞争到最后，拼的不是功能，是切换成本。',
    description: '播放180万 弹幕1.2万 点赞15万',
  },
]

// ========== 评分维度 ==========
function scoreAnalysis(result, testCase) {
  let scores = {}
  let issues = []

  // 1. JSON 解析成功
  scores.parseSuccess = result ? 1 : 0
  if (!result) {
    return { total: 0, scores: { parseSuccess: 0 }, issues: ['JSON 解析失败'] }
  }

  // 2. killerMove 质量（反直觉？点破机关？）
  const km = result.diagnosis?.killerMove || ''
  scores.killerMove = km.length > 5 && km.length < 100 ? 1 : 0
  if (km.length >= 100) issues.push('killerMove 过长')
  if (km.length <= 5) issues.push('killerMove 过短')
  // 检查是否反直觉（不含"利用""通过"等泛词）
  if (/^(利用|通过|借助|凭借)/.test(km)) issues.push('killerMove 可能不是反直觉洞察')

  // 3. killerMoveFormula 质量（动作步骤？不是效果描述？）
  const kmf = result.diagnosis?.killerMoveFormula || ''
  const hasActionChain = /先.*[→再].*[→最后]|先.*再.*最后/.test(kmf)
  const hasEffectOnly = /^(制造|引发|提高|吸引|增强|利用|通过)/.test(kmf)
  scores.killerMoveFormula = hasActionChain && !hasEffectOnly ? 1 : 0
  if (!hasActionChain) issues.push('killerMoveFormula 缺少动作步骤链')
  if (hasEffectOnly) issues.push('killerMoveFormula 是效果描述而非操作公式')

  // 4. tradeoffType 多样性（不全是"主动设计"）
  const replays = result.decisionReplay || []
  const tradeoffTypes = replays.map(r => r.tradeoffType)
  const activeCount = tradeoffTypes.filter(t => t && t.includes('主动')).length
  const passiveCount = tradeoffTypes.filter(t => t && t.includes('被动')).length
  const allActive = tradeoffTypes.length > 0 && activeCount === tradeoffTypes.length
  const allPassive = tradeoffTypes.length > 0 && passiveCount === tradeoffTypes.length
  scores.tradeoffDiversity = (!allActive && !allPassive) ? 1 : 0
  if (allActive) issues.push('tradeoffType 全部是"主动设计"，缺乏多样性')
  if (allPassive) issues.push('tradeoffType 全部是"被动代价"，缺乏多样性')

  // 4b. sacrifice 字段（V1.2 新增）
  const sacrifice = result.diagnosis?.sacrifice || ''
  scores.sacrifice = sacrifice.trim().length > 0 ? 1 : 0
  if (!sacrifice.trim()) issues.push('diagnosis.sacrifice 为空')

  // 5. decisionReplay 数量 >= 3
  scores.replayCount = replays.length >= 3 ? 1 : 0
  if (replays.length < 3) issues.push(`decisionReplay 只有 ${replays.length} 个（应≥3）`)

  // 6. migrationExamples 数量 >= 2
  const migrations = result.migrationExamples || []
  scores.migrationCount = migrations.length >= 2 ? 1 : 0
  if (migrations.length < 2) issues.push(`migrationExamples 只有 ${migrations.length} 个（应≥2）`)

  // 7. migrationExamples 质量（不是泛化表达）
  const hasGenericMigration = migrations.some(m =>
    !m.originalMechanism || !m.replaceWith || !m.example ||
    m.example.length < 10
  )
  scores.migrationQuality = !hasGenericMigration ? 1 : 0
  if (hasGenericMigration) issues.push('migrationExamples 存在泛化/不完整表达')

  // 8. notTransferable 有内容
  const notTransferable = result.notTransferable || []
  scores.notTransferable = notTransferable.length >= 2 ? 1 : 0
  if (notTransferable.length < 2) issues.push(`notTransferable 只有 ${notTransferable.length} 个（应≥2）`)

  // 9. decisionPrinciples 数量 >= 3
  const principles = result.decisionPrinciples || []
  scores.principlesCount = principles.length >= 3 ? 1 : 0
  if (principles.length < 3) issues.push(`decisionPrinciples 只有 ${principles.length} 个（应≥3）`)

  // 10. 字段完整性
  const requiredFields = ['diagnosis', 'decisionReplay', 'deconstruction', 'decisionPrinciples', 'viralMechanism', 'transferability', 'notTransferable', 'migrationExamples']
  const missingFields = requiredFields.filter(f => !result[f])
  scores.completeness = missingFields.length === 0 ? 1 : 0
  if (missingFields.length > 0) issues.push(`缺失字段: ${missingFields.join(', ')}`)

  // 总分：11分制（V1.2 新增 sacrifice 维度）
  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  return { total, scores, issues, tradeoffStats: { active: activeCount, passive: passiveCount, total: tradeoffTypes.length } }
}

// ========== 主流程 ==========
async function main() {
  console.log('='.repeat(60))
  console.log('ContentOS 拆解引擎批量测试')
  console.log(`案例数: ${TEST_CASES.length} | API: DeepSeek`)
  console.log('='.repeat(60))

  const results = []

  for (const tc of TEST_CASES) {
    console.log(`\n[${tc.id}/${TEST_CASES.length}] ${tc.category} | ${tc.platform} | ${tc.title.substring(0, 30)}...`)
    process.stdout.write('  拆解中... ')

    try {
      const aiResponse = await callAI(
        buildAnalysisPrompt({ title: tc.title, content: tc.content, description: tc.description }),
        { temperature: 0.7, max_tokens: 4000 }
      )
      const parsed = parseAnalysisResult(aiResponse)

      if (!parsed) {
        console.log('❌ JSON 解析失败')
        results.push({ case: tc, score: 0, issues: ['JSON 解析失败'], raw: aiResponse.substring(0, 200) })
        continue
      }

      const { total, scores, issues, tradeoffStats } = scoreAnalysis(parsed, tc)
      console.log(`${total}/11 ${issues.length === 0 ? '✅' : '⚠️ ' + issues.join('; ')}`)

      results.push({
        case: tc,
        score: total,
        scores,
        issues,
        tradeoffStats,
        killerMove: parsed.diagnosis?.killerMove,
        sacrifice: parsed.diagnosis?.sacrifice,
        killerMoveFormula: parsed.diagnosis?.killerMoveFormula,
        viralMechanism: parsed.viralMechanism,
      })
    } catch (err) {
      console.log(`❌ API 错误: ${err.message}`)
      results.push({ case: tc, score: 0, issues: [`API 错误: ${err.message}`] })
    }

    // 间隔 2 秒避免 API 限流
    if (tc.id < TEST_CASES.length) await new Promise(r => setTimeout(r, 2000))
  }

  // ========== 输出报告 ==========
  console.log('\n' + '='.repeat(60))
  console.log('批量测试报告')
  console.log('='.repeat(60))

  const totalScores = results.map(r => r.score)
  const avg = (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(1)
  const passed = totalScores.filter(s => s >= 8).length
  const failed = totalScores.filter(s => s < 6).length

  console.log(`\n总案例: ${results.length}`)
  console.log(`平均分: ${avg}/11`)
  console.log(`≥8分(通过): ${passed}/${results.length} (${(passed/results.length*100).toFixed(0)}%)`)
  console.log(`<6分(不通过): ${failed}/${results.length} (${(failed/results.length*100).toFixed(0)}%)`)

  // tradeoffType 全局比例统计
  const validResults = results.filter(r => r.tradeoffStats)
  const totalActive = validResults.reduce((sum, r) => sum + r.tradeoffStats.active, 0)
  const totalPassive = validResults.reduce((sum, r) => sum + r.tradeoffStats.passive, 0)
  const totalTradeoffs = totalActive + totalPassive
  const allActiveCases = validResults.filter(r => r.tradeoffStats.active === r.tradeoffStats.total && r.tradeoffStats.total > 0)

  console.log('\n--- tradeoffType 比例统计 ---')
  console.log(`  主动设计: ${totalActive} (${(totalActive/totalTradeoffs*100).toFixed(0)}%)`)
  console.log(`  被动代价: ${totalPassive} (${(totalPassive/totalTradeoffs*100).toFixed(0)}%)`)
  console.log(`  全部"主动设计"的案例: ${allActiveCases.length}/${validResults.length}`)
  if (allActiveCases.length > 0) {
    console.log(`  ⚠️ 问题案例: ${allActiveCases.map(r => `[${r.case.id}]${r.case.title.substring(0, 15)}`).join(' | ')}`)
  }

  console.log('\n--- 逐案详情 ---')
  for (const r of results) {
    console.log(`\n[${r.case.id}] ${r.case.category} | ${r.case.platform}`)
    console.log(`  标题: ${r.case.title}`)
    console.log(`  得分: ${r.score}/11`)
    if (r.killerMove) console.log(`  killerMove: ${r.killerMove}`)
    if (r.sacrifice) console.log(`  sacrifice: ${r.sacrifice}`)
    if (r.killerMoveFormula) console.log(`  formula: ${r.killerMoveFormula}`)
    if (r.viralMechanism) console.log(`  爆款机制: ${r.viralMechanism}`)
    if (r.tradeoffStats) console.log(`  tradeoff: 主动${r.tradeoffStats.active}/被动${r.tradeoffStats.passive}`)
    if (r.issues.length > 0) console.log(`  问题: ${r.issues.join('; ')}`)
  }

  // 维度通过率
  console.log('\n--- 维度通过率 ---')
  const dimensions = ['parseSuccess', 'killerMove', 'killerMoveFormula', 'tradeoffDiversity', 'sacrifice', 'replayCount', 'migrationCount', 'migrationQuality', 'notTransferable', 'principlesCount', 'completeness']
  const dimLabels = {
    parseSuccess: 'JSON 解析',
    killerMove: 'killerMove 质量',
    killerMoveFormula: '操作公式质量',
    tradeoffDiversity: '取舍类型多样性',
    sacrifice: 'sacrifice 字段',
    replayCount: '决策回放≥3',
    migrationCount: '迁移示例≥2',
    migrationQuality: '迁移示例质量',
    notTransferable: '不可复制≥2',
    principlesCount: '原则≥3',
    completeness: '字段完整性',
  }
  for (const dim of dimensions) {
    const passed = results.filter(r => r.scores?.[dim] === 1).length
    console.log(`  ${dimLabels[dim]}: ${passed}/${results.length} (${(passed/results.length*100).toFixed(0)}%)`)
  }

  console.log('\n' + '='.repeat(60))
  if (avg >= 8) {
    console.log('✅ 结论：拆解引擎质量达标，可规模化')
  } else if (avg >= 6) {
    console.log('⚠️ 结论：质量基本可用，但部分维度需优化')
  } else {
    console.log('❌ 结论：质量不达标，需要优化 prompt 或引入更多约束')
  }
  console.log('='.repeat(60))
}

main().catch(console.error)
