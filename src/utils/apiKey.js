/**
 * API Key 统一管理
 * - 免费/试用用户 → 没配 Key 时用内置试用 Key（运营承担成本）
 * - 付费用户（Pro / 终身版）→ 必须自己配置 Key，不提供内置 Key（运营不承担 Pro 用量）
 */

import { isPro } from './license'

const TRIAL_API_KEY = 'sk-298c925c46674a5f9d531867d5478acf'

/** 获取当前生效的 API Key
 * - 有用户自己配的 Key → 优先用
 * - 付费用户且没配 → 返回 null（强制自己配）
 * - 免费用户 → 回退到内置试用 Key
 */
export function getApiKey() {
  const userKey = localStorage.getItem('contentos_api_key')
  if (userKey) return userKey
  if (isPro()) return null
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
 * - 付费用户 + 没配置 → true，此时 AI 功能会提示需要配 Key
 * - 其他情况 → false
 */
export function isPaidUserMissingKey() {
  return isPro() && !localStorage.getItem('contentos_api_key')
}
