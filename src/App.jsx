import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
// 首屏需要的页面同步加载（保证 Landing/Onboarding 首屏速度）
import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Settings from './pages/Settings.jsx'
// 其余页面懒加载，减少首屏体积
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Inspiration = lazy(() => import('./pages/Inspiration.jsx'))
const ViralElements = lazy(() => import('./pages/ViralElements.jsx'))
const Trends = lazy(() => import('./pages/Trends.jsx'))
const StyleDNA = lazy(() => import('./pages/StyleDNA.jsx'))
const Topics = lazy(() => import('./pages/Topics.jsx'))
const Pipeline = lazy(() => import('./pages/Pipeline.jsx'))
const Assets = lazy(() => import('./pages/Assets.jsx'))
const ContentData = lazy(() => import('./pages/ContentData.jsx'))
const Diagnosis = lazy(() => import('./pages/Diagnosis.jsx'))
const AIOfficer = lazy(() => import('./pages/AIOfficer.jsx'))
// V3：工作台聚合入口页
const OpportunityRadar = lazy(() => import('./pages/Workbench/OpportunityRadar.jsx'))
const AccountBrain = lazy(() => import('./pages/Workbench/AccountBrain.jsx'))
const VideoDirector = lazy(() => import('./pages/Workbench/VideoDirector.jsx'))
const AssetsCenter = lazy(() => import('./pages/Workbench/AssetsCenter.jsx'))
const ContentReview = lazy(() => import('./pages/Workbench/ContentReview.jsx'))
const CompetitorAnalyzer = lazy(() => import('./pages/Workbench/CompetitorAnalyzer.jsx'))
const Director = lazy(() => import('./pages/Director.jsx'))
const OptimizationDirector = lazy(() => import('./pages/Workbench/OptimizationDirector.jsx'))
const TopicDirector = lazy(() => import('./pages/Workbench/TopicDirector.jsx'))
const PerformanceReview = lazy(() => import('./pages/Workbench/PerformanceReview.jsx'))
const CaseLibrary = lazy(() => import('./pages/Workbench/CaseLibrary.jsx'))
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics.jsx'))
const CaseStudy = lazy(() => import('./pages/CaseStudy.jsx'))
import { useStore } from './store/useStore'
import { initTracker } from './utils/tracker'

// 懒加载时的全局 fallback
function PageLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
}

// 受保护路由守卫：未完成 onboarding 或无项目时跳转 Onboarding，避免 Landing 死循环
function ProtectedGuard({ children }) {
  const projects = useStore((s) => s.projects)
  const onboardingCompleted = useStore((s) => s.onboardingCompleted)
  if (onboardingCompleted && projects.length > 0) return children
  return <Navigate to="/onboarding" replace />
}

// 首页：永远显示极简 Landing（输入框 + 截图上传 + 示例）
function HomeRoute() {
  return <Landing />
}

export default function App() {
  useEffect(() => {
    try { initTracker() } catch (_) { /* noop */ }
  }, [])

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
      <ScrollToTop />
      <Routes>
      {/* 首页：Landing（已登录用户自动跳 Dashboard） */}
      <Route path="/" element={<HomeRoute />} />
      {/* Onboarding 独立全屏路由（不受守卫） */}
      <Route path="/onboarding" element={<Onboarding />} />
      {/* /settings 独立全屏路由（允许未完成 onboarding 的用户配置 API Key） */}
      <Route path="/settings" element={<Settings />} />
      {/* /admin/analytics Beta 行为分析后台（仅管理员直接访问 URL） */}
      <Route path="/admin/analytics" element={<AdminAnalytics />} />
      {/* /case-study Beta 案例展示页（用于小红书获客，独立全屏） */}
      <Route path="/case-study" element={<CaseStudy />} />
      {/* 公开页面：新用户可直接体验，不需要完成 Onboarding */}
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="workbench/competitor-analyzer" element={<CompetitorAnalyzer />} />
        <Route path="workbench/optimization-director" element={<OptimizationDirector />} />
        <Route path="factory/pipeline" element={<Pipeline />} />
      </Route>
      {/* ===== 受保护路由：必须完成 onboarding + 至少有一个项目 ===== */}
      <Route element={<ProtectedGuard><Layout /></ProtectedGuard>}>
        {/* ===== V3：工作台路由 ===== */}
        <Route path="workbench/opportunity-radar" element={<OpportunityRadar />} />
        <Route path="workbench/account-brain" element={<AccountBrain />} />
        <Route path="workbench/video-director" element={<VideoDirector />} />
        <Route path="workbench/director" element={<Director />} />
        <Route path="workbench/topic-director" element={<TopicDirector />} />
        <Route path="workbench/assets-center" element={<AssetsCenter />} />
        <Route path="workbench/content-review" element={<ContentReview />} />
        <Route path="workbench/case-library" element={<CaseLibrary />} />
        <Route path="workbench/performance-review" element={<PerformanceReview />} />
        {/* factory/video-director 也是视频导演的别名入口 */}
        <Route path="factory/video-director" element={<VideoDirector />} />
        {/* ===== 原有路由：保持向后兼容 ===== */}
        <Route path="intelligence/inspiration" element={<Inspiration />} />
        <Route path="intelligence/viral-elements" element={<ViralElements />} />
        <Route path="intelligence/trends" element={<Trends />} />
        <Route path="factory/style-dna" element={<StyleDNA />} />
        <Route path="factory/topics" element={<Topics />} />
        <Route path="factory/assets" element={<Assets />} />
        <Route path="data-center/content-data" element={<ContentData />} />
        <Route path="data-center/diagnosis" element={<Diagnosis />} />
        <Route path="ai-team/ai-officer" element={<AIOfficer />} />
      </Route>
      {/* 兜底旧路径兼容：/dashboard 历史链接重定向 */}
      <Route path="/redirected-dashboard" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
