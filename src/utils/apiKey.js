/**
 * API Key 统一管理
 * - 免费/试用用户 → 没配 Key 时用内置试用 Key（免费体验）
 * - 付费用户（Pro / 终身版）→ 必须自己配置 Key，不提供内置 Key
 *
 * 设计原则：
 *   付费用户都是自己的 Key。免费调用只限于试用期。
 */

import { isPro } from './license'

const TRIAL_API_KEY = 'sk-298c925c46674a5f9d531867d5478acf'

/** 获取当前生效的 API Key
 * - 付费用户：只返回用户自己配置的 Key，没有则返回 null
 * - 免费用户：优先用户自己的 Key，没有则回退到内置试用 Key
 */
export function getApiKey() {
  const userKey = localStorage.getItem('contentos_api_key')
  if (userKey) return userKey

  // 付费用户不提供内置 Key
  if (isPro()) return null

  // 免费用户回退到试用 Key
  return TRIAL_API_KEY
}

/** 是否正在使用内置试用 Key（只有免费用户才可能为 true） */
export function isUsingTrialKey() {
  return !localStorage.getItem('contentos_api_key') && !isPro()
}

/** 用户是否已配置自己的 Key */
export function hasUserKey() {
  return Boolean(localStorage.getItem('contentos_api_key'))
}

/**
 * 付费用户是否缺少自己的 Key
 * - 付费用户 + 没配置 Key → true
 * - 其他情况 → false
 */
export function isPaidUserMissingKey() {
  return isPro() && !localStorage.getItem('contentos_api_key')
}
