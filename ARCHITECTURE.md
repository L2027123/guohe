# 果核 (ContentOS) 完整架构文档

> **项目代号**：果核  
> **内部名**：ContentOS V3  
> **版本**：3.0.0-beta  
> **最后更新**：2026-08-28  
> **部署地址**：Vercel（纯前端 + Serverless API）  

---

## 一、技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 前端框架 | React | 18.3 |
| 构建工具 | Vite | 5.4 |
| 路由 | React Router (HashRouter) | 6.26 |
| 状态管理 | Zustand (persist → localStorage) | 5.0 |
| AI 驱动 | DeepSeek API (`deepseek-chat` 模型) | — |
| 图片识别 | 智谱 GLM-4V-Flash (免费) + Tesseract.js 降级 | — |
| UI 框架 | Tailwind CSS | 3.4 |
| 图标 | Lucide React | 0.400 |
| 部署 | Vercel (静态 + Serverless Functions) | — |

### 依赖清单 (`package.json`)

```json
{
  "dependencies": {
    "lucide-react": "^0.400.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "tesseract.js": "^7.0.0",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.4.0",
    "vitest": "^4.1.10"
  }
}
```

---

## 二、目录结构

```
guohe/
├── api/
│   └── verify-order.js          # 面包多订单验证 (Vercel Serverless)
├── public/
│   ├── _headers                 # 安全头
│   ├── _redirects               # Netlify 重定向
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/
│   ├── deploy-final.cmd         # 一键部署脚本
│   └── get-token.cmd            # 获取 Vercel Token
├── src/
│   ├── main.jsx                 # 入口（HashRouter + 错误兜底）
│   ├── App.jsx                  # 路由配置（懒加载 + 守卫）
│   ├── index.css                # 全局样式
│   ├── components/
│   │   ├── AIErrorBanner.jsx    # AI 错误提示横幅
│   │   ├── ErrorBoundary.jsx    # 全局错误边界
│   │   ├── Layout.jsx           # 应用布局（侧边栏 + 主区域）
│   │   ├── PricingModal.jsx     # 付费方案弹窗
│   │   ├── ScrollToTop.jsx      # 路由切换滚动重置
│   │   ├── Sidebar.jsx          # 侧边导航
│   │   └── UpgradePrompt.jsx    # 升级提示组件
│   ├── pages/
│   │   ├── Landing.jsx          # 首页（极简输入框 + 截图上传）
│   │   ├── Onboarding.jsx       # 新手引导（53KB，最大页面之一）
│   │   ├── Settings.jsx         # API Key 配置 + 激活码
│   │   ├── Dashboard.jsx        # 仪表盘
│   │   ├── Pipeline.jsx         # 创作工厂（81KB，最大单文件）
│   │   ├── StyleDNA.jsx         # 风格 DNA（52KB）
│   │   ├── Inspiration.jsx      # 灵感中心
│   │   ├── Diagnosis.jsx       # 诊断中心
│   │   ├── ContentData.jsx      # 内容数据中心
│   │   ├── Assets.jsx           # 素材库
│   │   ├── Topics.jsx           # 选题管理
│   │   ├── AIOfficer.jsx        # AI 参谋
│   │   ├── CaseStudy.jsx        # 案例展示页（获客用）
│   │   ├── AdminAnalytics.jsx   # 行为分析后台
│   │   ├── Welcome.jsx          # 欢迎页
│   │   ├── Director.jsx         # 导演入口
│   │   ├── ViralElements.jsx    # 爆款元素（框架）
│   │   ├── Trends.jsx           # 趋势（框架）
│   │   ├── Pipeline.strategy.test.jsx  # 策略单元测试
│   │   └── Workbench/           # V3 工作台模块
│   │       ├── CompetitorAnalyzer.jsx      # 爆款拆解实验室 (81KB)
│   │       ├── VideoDirector.jsx           # AI 内容导演 (98KB)
│   │       ├── OptimizationDirector.jsx    # 优化导演 (56KB)
│   │       ├── TopicDirector.jsx           # 选题导演 (28KB)
│   │       ├── ContentReview.jsx           # AI 内容复盘 (34KB)
│   │       ├── PerformanceReview.jsx       # 表现复盘 (25KB)
│   │       ├── AccountBrain.jsx            # 账号大脑 (14KB)
│   │       ├── AssetsCenter.jsx            # 内容资产中心 (15KB)
│   │       ├── OpportunityRadar.jsx        # AI 机会雷达 (10KB)
│   │       ├── CaseLibrary.jsx             # 案例库 (9KB)
│   │       ├── analysisPrompt.mjs          # 分析 Prompt 模板
│   │       └── batch-test.mjs             # 批量测试脚本
│   ├── store/
│   │   └── useStore.js          # Zustand 全局状态 (42KB，版本 v11)
│   └── utils/
│       ├── apiKey.js            # API Key 管理（试用/付费分离）
│       ├── aiClient.js          # DeepSeek API 调用 + 错误分类
│       ├── license.js           # 激活码验证 + License 管理
│       ├── ocr.js               # Tesseract.js OCR 工具
│       ├── visionOCR.js         # 智谱 GLM-4V-Flash 图片识别
│       ├── exportScript.js      # 分镜表 CSV / Markdown 导出
│       ├── tracker.js           # 匿名行为埋点
│       └── usePageDwellTracking.js  # 页面停留追踪 Hook
├── .env.example                 # 环境变量模板
├── .env.production              # 生产环境变量
├── index.html                   # HTML 模板
├── vite.config.js               # Vite 构建配置
├── tailwind.config.js           # Tailwind 主题配置
├── postcss.config.js
├── vercel.json                  # Vercel 部署配置
├── RELEASE.md                   # 发布说明
└── package.json
```

---

## 三、路由架构

路由使用 `HashRouter`（兼容静态部署，无需服务端 rewrite）。

### 路由表

| 路径 | 组件 | 守卫 | 说明 |
|---|---|---|---|
| `/` | `Landing` | 无 | 首页：输入框 + 截图上传 + 示例 |
| `/onboarding` | `Onboarding` | 无 | 新手引导全屏页 |
| `/settings` | `Settings` | 无 | API Key 配置 + 激活码 |
| `/admin/analytics` | `AdminAnalytics` | 无 | 行为分析后台（仅管理员知道URL） |
| `/case-study` | `CaseStudy` | 无 | 案例展示页（获客用） |
| `/dashboard` | `Dashboard` | Layout（无守卫） | 仪表盘 |
| `/workbench/competitor-analyzer` | `CompetitorAnalyzer` | Layout（无守卫） | 爆款拆解 |
| `/workbench/optimization-director` | `OptimizationDirector` | Layout（无守卫） | 优化导演 |
| `/factory/pipeline` | `Pipeline` | Layout（无守卫） | 创作工厂 |
| `/workbench/opportunity-radar` | `OpportunityRadar` | **ProtectedGuard** | AI 机会雷达 |
| `/workbench/account-brain` | `AccountBrain` | **ProtectedGuard** | 账号大脑 |
| `/workbench/video-director` | `VideoDirector` | **ProtectedGuard** | AI 内容导演 |
| `/workbench/director` | `Director` | **ProtectedGuard** | 导演入口 |
| `/workbench/topic-director` | `TopicDirector` | **ProtectedGuard** | 选题导演 |
| `/workbench/assets-center` | `AssetsCenter` | **ProtectedGuard** | 内容资产中心 |
| `/workbench/content-review` | `ContentReview` | **ProtectedGuard** | AI 内容复盘 |
| `/workbench/case-library` | `CaseLibrary` | **ProtectedGuard** | 案例库 |
| `/workbench/performance-review` | `PerformanceReview` | **ProtectedGuard** | 表现复盘 |
| `/factory/video-director` | `VideoDirector` | **ProtectedGuard** | 视频导演别名 |
| `/intelligence/inspiration` | `Inspiration` | **ProtectedGuard** | 灵感中心 |
| `/intelligence/viral-elements` | `ViralElements` | **ProtectedGuard** | 爆款元素 |
| `/intelligence/trends` | `Trends` | **ProtectedGuard** | 趋势 |
| `/factory/style-dna` | `StyleDNA` | **ProtectedGuard** | 风格 DNA |
| `/factory/topics` | `Topics` | **ProtectedGuard** | 选题管理 |
| `/factory/assets` | `Assets` | **ProtectedGuard** | 素材库 |
| `/data-center/content-data` | `ContentData` | **ProtectedGuard** | 内容数据 |
| `/data-center/diagnosis` | `Diagnosis` | **ProtectedGuard** | 诊断 |
| `/ai-team/ai-officer` | `AIOfficer` | **ProtectedGuard** | AI 参谋 |

### 路由守卫

- **ProtectedGuard**：检查 `onboardingCompleted && projects.length > 0`，不满足则重定向到 `/onboarding`
- **Layout**：提供侧边栏 + 主区域布局
- 首屏同步加载：`Landing`、`Onboarding`、`Settings`；其余页面全部 `lazy` 懒加载

---

## 四、状态管理 (Zustand Store)

### 存储位置
- localStorage key: `contentos_v3_store`
- 当前版本: `v11`（内置迁移逻辑 v1→v11）

### Store 数据结构

```javascript
{
  version: 11,                // 数据版本号（迁移用）
  user: {
    id, name, email, avatar, createdAt
  },
  plan: {
    tier: 'free'|'pro'|'lifetime',
    status: 'trial'|'active'|'expired',
    startedAt, expiresAt
  },
  credits: {
    aiGenerate: 5,            // 免费 AI 生成次数（Pro = Infinity）
    aiDiagnosis: 1,
    competitorAnalyze: 2,
    performanceReview: 2,
    performanceRecords: 5,
    projects: 1,
    used: { aiGenerate, aiDiagnosis, competitorAnalyze, performanceReview },
    freeExperience: { ... }   // UI 展示用
  },
  projects: [],               // 项目列表
  currentProjectId: null,
  onboardingCompleted: false,
  styleDNA: [],               // 风格 DNA（9维度）
  styleRules: [],             // 可训练规则
  contents: [],               // 内容生产记录
  assets: [],                 // 已归档内容
  performanceRecords: [],     // 表现记录
  accountDiagnoses: [],
  topics: [],
  promptTemplates: [],
  contentPatterns: [],
  learningLogs: [],
  accountMemory: [],          // 账号级长期记忆
}
```

### 核心 Actions

| Action | 用途 |
|---|---|
| `setUser(user)` | 设置用户信息 |
| `completeOnboarding(userData)` | 完成新手引导 |
| `setPlan(plan)` | 设置套餐 |
| `upgradeToPro(tier)` | 升级到 Pro/终身版（credits → Infinity） |
| `syncFromLicense(license)` | 从激活码同步套餐状态 |
| `consumeCredit(type)` | 消耗一次额度（返回是否成功） |
| `hasCredit(type)` | 检查是否还有额度 |
| `getRemainingCredits(type)` | 获取剩余额度（Pro 返回 '无限'） |
| `addCredits(type, count)` | 分享奖励额度 |
| `createProject(data)` | 创建项目 |
| `resetStore()` | 重置全部数据 |

### 迁移逻辑

- v1→v6：完全重置为商业版结构
- v7→v8：补齐血缘字段（styleDNA / contents / assets / performanceRecords）
- v8→v9：新增 promptTemplates / contentPatterns / learningLogs
- v9→v10：StyleDNA 增加 topicPreference / hookPreference / contentStructurePreference + accountMemory
- v10→v11：accountMemory 增加 competitorAnalyses

---

## 五、API Key 管理体系

### 核心原则

> **付费用户都是自己的 Key。免费调用只限于试用期。**

### 文件：`src/utils/apiKey.js`

```javascript
const TRIAL_API_KEY = 'sk-298c925c46674a5f9d531867d5478acf'

getApiKey()        // 付费用户无Key→null；免费用户无Key→试用Key
isUsingTrialKey()  // 仅免费用户+未配Key 时为 true
hasUserKey()       // 是否已配置自己的 Key
isPaidUserMissingKey() // 付费用户+未配Key → true
```

### Key 逻辑流程

```
用户发起 AI 调用
    ↓
getApiKey()
    ↓
用户配了自己的 Key？→ 是 → 用用户的 Key
    ↓ 否
是付费用户(isPro)？→ 是 → 返回 null → 报错"请配置你自己的 Key"
    ↓ 否（免费用户）
回退到内置试用 Key（sk-298c...）
```

### 智谱 Key（图片识别）

- 文件：`src/utils/visionOCR.js`
- 内置试用 Key：`374acd1b81ae46e3954ef08f1bb8dcdf.JSiCwye3oiEstCMT`
- 模型：`glm-4v-flash`（永久免费）
- 降级策略：智谱失败 → Tesseract.js 本地 OCR

### localStorage Key 清单

| Key | 用途 |
|---|---|
| `contentos_v3_store` | Zustand 持久化数据 |
| `contentos_api_key` | 用户自配的 DeepSeek API Key |
| `zhipu_api_key` | 用户自配的智谱 API Key（可选） |
| `guohe_license` | 激活码 / License 数据 |
| `contentos_tracker` | 行为埋点数据 |

---

## 六、支付与 License 体系

### 文件结构

```
api/verify-order.js       → Vercel Serverless（面包多订单验证）
src/utils/license.js      → 前端 License 管理
src/components/PricingModal.jsx → 付费方案弹窗
```

### 支付流程

```
用户点击升级 → PricingModal 弹出
    ↓
选择方案（单次包 ¥2 / Pro ¥29/月 / 终身版 ¥199）
    ↓
跳转面包多购买链接 (MIANBAODUO_BUY_URL)
    ↓
付款后面包多返回订单号
    ↓
用户在 Settings 页输入订单号
    ↓
前端调 /api/verify-order
    ↓
Vercel Serverless 调面包多 API 验证订单
    ↓
验证通过 → 签名生成 License（orderId + tier + expiresAt + signature）
    ↓
前端存入 localStorage('guohe_license')
    ↓
syncFromLicense() → 更新 Store 套餐状态
```

### License 数据结构

```javascript
{
  orderId:   '面包多订单号',
  tier:      'single' | 'pro' | 'lifetime',
  expiresAt: 1234567890000,  // 时间戳，0=终身
  signature: '签名hash'      // 防篡改
}
```

### 签名机制

- 算法：自定义 hash（`Math.imul(31, h) + charCodeAt`）
- 密钥：`ACTIVATION_SECRET`（环境变量）
- 前端验证：`verifySignature()` 校验签名 + 过期时间
- `isPro()`：tier === 'pro' || tier === 'lifetime'

### 环境变量

| 变量名 | 用途 | 在哪配置 |
|---|---|---|
| `MIANBAODUO_TOKEN` | 面包多开发者 Key | Vercel Dashboard |
| `ACTIVATION_SECRET` | 激活码签名密钥 | Vercel Dashboard |
| `MIANBAODUO_PRODUCT_KEYS` | 合法商品 urlkey（逗号分隔） | Vercel Dashboard |
| `MIANBAODUO_SINGLE_PRODUCT_KEYS` | 单次包商品 urlkey | Vercel Dashboard |
| `VITE_MIANBAODUO_BUY_URL` | Pro 版购买链接 | Vercel Dashboard |
| `VITE_MIANBAODUO_BUY_URL_SINGLE` | 单次包购买链接 | Vercel Dashboard |

---

## 七、AI 调用架构

### 文件：`src/utils/aiClient.js`

### 核心函数

| 函数 | 用途 |
|---|---|
| `callAI(apiKey, prompt, options)` | 统一 AI 调用（30s 超时保护） |
| `classifyAIError(err)` | 错误分类（no_key/auth/quota/network/timeout/parse/unknown） |
| `testAPIConnection(apiKey)` | 测试 API 连接 |

### 调用流程

```
页面组件 → getApiKey() → callAI(key, prompt, options) → DeepSeek API
                                                              ↓
                                                        返回内容 / 抛出错误
                                                              ↓
                                                    classifyAIError(err)
                                                              ↓
                                                    AIErrorBanner 显示
```

### 错误分类

| 类型 | 触发条件 | 提示 |
|---|---|---|
| timeout | AbortController 30s | AI 请求超时，请检查网络 |
| network | TypeError + fetch | 网络连接失败 |
| auth | 401 / 403 | API Key 无效或已过期 |
| quota | 429 | API 额度不足 |
| parse | JSON 解析失败 | AI 返回格式异常 |
| unknown | 其他 | AI 调用失败 |

---

## 八、核心业务模块

### 8.1 爆款拆解实验室 (`CompetitorAnalyzer.jsx` — 81KB)

- 输入：竞品截图/链接
- 流程：智谱图片识别 → 结构化拆解 → 风格提取 → 一键改写
- 输出：爆款结构分析 + 可复用模板
- 额度：免费 2 次，Pro 无限

### 8.2 AI 内容导演 (`VideoDirector.jsx` — 98KB，最大文件)

- 输入：主题 + 风格 DNA + 账号记忆
- 流程：AI 生成结构化 JSON → 分镜表 → 口播稿 → BGM 推荐
- 输出：完整分镜脚本（可导出 CSV/Markdown）
- 额度：免费 5 次，Pro 无限

### 8.3 创作工厂 (`Pipeline.jsx` — 81KB)

- 多步骤内容生产流水线
- 从选题 → 生成 → 优化 → 归档

### 8.4 风格 DNA (`StyleDNA.jsx` — 52KB)

- 9 维度风格建模：内容人设 / 写作结构 / 视觉风格 / 常用表达 / 受众 / 标题公式 / 选题偏好 / Hook 偏好 / 结构偏好
- 支持手动 + AI 自动提取
- 每个项目独立存储

### 8.5 账号大脑 (`AccountBrain.jsx`)

- 人设定位 + 风格进化 + 数据诊断
- 基于 accountMemory 的长期学习

### 8.6 内容复盘 (`ContentReview.jsx` / `PerformanceReview.jsx`)

- 输入发布后的数据（曝光/互动/涨粉）
- AI 分析成功/失败模式
- 自动沉淀到 accountMemory

### 8.7 新手引导 (`Onboarding.jsx` — 54KB)

- 多步引导：账号信息 → 平台 → 目标 → 风格初步设定
- 完成后创建第一个项目 + 标记 onboardingCompleted

---

## 九、侧边栏导航

```
一级导航：
  └── 拆解（CompetitorAnalyzer）

二级导航：
  ├── 创作工厂（Pipeline）
  ├── 研究库（CaseLibrary）
  ├── 风格DNA（StyleDNA）
  ├── 数据复盘（PerformanceReview）
  └── 设置（Settings）
```

侧边栏底部显示当前套餐状态 + 升级按钮。

---

## 十、部署架构

### Vercel 部署（推荐）

```
vercel.json:
{
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

- 静态文件由 Vite 构建到 `dist/`
- `/api/*` 路由到 Vercel Serverless Functions
- 其他路径全部 fallback 到 `index.html`（SPA 路由）

### 构建配置

```javascript
vite.config.js:
{
  base: './',              // 相对路径，兼容子路径部署
  build: {
    outDir: 'dist',
    sourcemap: 非 production,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'zustand': ['zustand'],
          'lucide': ['lucide-react']
        }
      }
    }
  },
  define: {
    __APP_VERSION__: '3.0.0-beta',
    __BUILD_TIME__: ISO时间戳
  }
}
```

---

## 十一、安全设计

### API Key 安全

- 用户 Key 存 localStorage，**不**上传任何服务端
- 付费用户不提供内置 Key（必须自配）
- 内置试用 Key 硬编码在前端（免费用户兜底）

### License 防篡改

- 订单验证在 Vercel Serverless 完成（前端无法伪造）
- License 带签名（`ACTIVATION_SECRET`），前端验签
- 过期时间校验

### 错误兜底

- `main.jsx`：顶层 try-catch，render 失败显示重置页面
- `ErrorBoundary.jsx`：React 组件错误边界
- Store persist 反序列化失败自动清除

---

## 十二、已知问题与技术债

### 大文件（需拆分）

| 文件 | 大小 | 问题 |
|---|---|---|
| `VideoDirector.jsx` | 98KB | 最大文件，应拆子组件 |
| `CompetitorAnalyzer.jsx` | 81KB | 同上 |
| `Pipeline.jsx` | 81KB | 同上 |
| `OptimizationDirector.jsx` | 56KB | 同上 |
| `Onboarding.jsx` | 54KB | 同上 |
| `StyleDNA.jsx` | 52KB | 同上 |
| `useStore.js` | 42KB | 应拆分为多个 slice |

### 待完善

- [ ] 面包多审核通过后挂正式商品链接
- [ ] 大文件拆分为子组件目录
- [ ] Store 拆分为 userSlice / projectSlice / contentSlice / analyticsSlice
- [ ] 提取通用 UI 组件（Button / Input / Modal / Card）
- [ ] 删除冗余部署脚本（保留 1-2 个）
- [ ] 趋势 / 爆款元素页仅为框架，待实现
- [ ] 移动端适配验证

---

## 十三、环境变量速查

### `.env.example`

```env
# 面包多支付验证
MIANBAODUO_TOKEN=your_mianbaoduo_developer_key

# 可选：限制只接受特定商品的订单
MIANBAODUO_PRODUCT_KEYS=your_product_url_key

# 激活码签名密钥
ACTIVATION_SECRET=your_random_secret_string

# 前端展示：面包多购买链接
VITE_MIANBAODUO_BUY_URL=https://mbd.pub/o/bread/your_product_key
```

### Vercel 环境变量配置路径

`Vercel Dashboard → Project → Settings → Environment Variables`

---

## 十四、快速命令

```bash
# 开发
npm run dev          # http://localhost:5173

# 构建
npm run build        # 输出到 dist/

# 预览
npm run preview      # http://localhost:4173

# 测试
npm run test         # vitest run
npm run test:watch   # vitest watch

# 部署
vercel --prod        # 生产部署
```

---

## 十五、Tailwind 主题

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe',
          300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6',
          600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6',
          900: '#4c1d95',
        }
      }
    }
  }
}
```

品牌色为紫色系（`#7C3AED`），与 DeepSeek 品牌色呼应。

---

**文档结束。复制此文件到 TraeCode 项目根目录即可让 Agent 快速理解全貌。**
