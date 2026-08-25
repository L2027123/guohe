/**
 * API Key 统一管理
 * - 用户自己配了 Key → 用用户的
 * - 没配 → 用内置试用 Key（新用户免费体验）
 */

const TRIAL_API_KEY = 'sk-298c925c46674a5f9d531867d5478acf'

/** 获取当前生效的 API Key（优先用户自己的，没有则用内置试用 Key） */
export function getApiKey() {
  return localStorage.getItem('contentos_api_key') || TRIAL_API_KEY
}

/** 是否正在使用内置试用 Key */
export function isUsingTrialKey() {
  return !localStorage.getItem('contentos_api_key')
}

/** 用户是否已配置自己的 Key */
export function hasUserKey() {
  return Boolean(localStorage.getItem('contentos_api_key'))
}
