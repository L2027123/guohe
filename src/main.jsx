import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// 顶层兜底：任何同步错误（包括 Zustand persist 反序列化、store 初始化失败）
// 都会显示错误页面，绝不白屏
function render() {
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </React.StrictMode>,
    )
  } catch (err) {
    console.error('[ContentOS] Render failed, attempting reset:', err)
    try {
      localStorage.removeItem('contentos_v3_store')
      localStorage.removeItem('contentos_tracker')
    } catch (_) { /* noop */ }
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f3ff;padding:24px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="max-width:480px;text-align:center;">
          <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#7C3AED,#9333EA);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;">🎬</div>
          <h1 style="font-size:20px;font-weight:700;color:#111;margin-bottom:8px;">页面加载失败</h1>
          <p style="font-size:14px;color:#555;margin-bottom:24px;">检测到本地缓存格式异常，已自动重置。请刷新页面继续使用。</p>
          <button onclick="location.reload()" style="padding:10px 20px;background:#7C3AED;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;">刷新页面</button>
          <details style="margin-top:24px;text-align:left;">
            <summary style="font-size:12px;color:#999;cursor:pointer;">查看错误详情</summary>
            <pre style="margin-top:8px;padding:12px;background:#f1f1f1;border-radius:8px;font-size:11px;color:#555;overflow-x:auto;white-space:pre-wrap;">${String(err?.message || err).replace(/[<>]/g, '')}\n\n${String(err?.stack || '').replace(/[<>]/g, '')}</pre>
          </details>
        </div>
      </div>
    `
  }
}

render()
