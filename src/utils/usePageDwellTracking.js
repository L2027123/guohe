import { useEffect, useRef } from 'react'
import { trackPageEnter, trackPageLeave } from './tracker'

/**
 * 页面停留时间埋点 hook
 * @param {string} page 页面名称（如 'Landing' / 'Dashboard' / 'StyleDNA' / 'Topics' / 'Pipeline'）
 *
 * 用法：在页面组件顶部调用 usePageDwellTracking('Dashboard')
 * 自动记录进入 / 离开时间和停留秒数。
 */
export function usePageDwellTracking(page) {
  const pageRef = useRef(page)
  pageRef.current = page

  useEffect(() => {
    trackPageEnter(pageRef.current)

    // 页面关闭 / 刷新时补记离开
    const handleUnload = () => {
      trackPageLeave(pageRef.current)
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      trackPageLeave(pageRef.current)
      window.removeEventListener('beforeunload', handleUnload)
    }
    // 仅在挂载/卸载时执行，page 变化由组件自身重新挂载处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
