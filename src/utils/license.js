// 激活码验证 —— 前端模块
// 用户在面包多付款后拿到订单号，输入到果核，前端调 /api/verify-order 验证
// 验证通过后，用签名校验确保激活态未被篡改

const STORAGE_KEY = 'guohe_license'

function verifySignature(orderId, tier, expiresAt, signature) {
  const secret = 'guohe-default-secret'
  let h = 0
  const str = orderId + '|' + tier + '|' + expiresAt + '|' + secret
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  const expected = (h >>> 0).toString(36)
  return expected === signature
}

export function getStoredLicense() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const license = JSON.parse(raw)
    if (!verifySignature(license.orderId, license.tier, license.expiresAt, license.signature)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (license.expiresAt && license.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return license
  } catch {
    return null
  }
}

export function isPro() {
  const license = getStoredLicense()
  return license?.tier === 'pro' || license?.tier === 'lifetime'
}

export async function activateWithOrder(orderId) {
  const resp = await fetch('/api/verify-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId }),
  })
  const data = await resp.json()

  if (!resp.ok) {
    return { success: false, error: data.error || '验证失败' }
  }

  const license = {
    orderId: data.orderId,
    tier: data.tier,
    expiresAt: data.expiresAt,
    signature: data.signature,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(license))
  return { success: true, license }
}

export function clearLicense() {
  localStorage.removeItem(STORAGE_KEY)
}

export const MIANBAODUO_BUY_URL = import.meta.env.VITE_MIANBAODUO_BUY_URL || 'https://mbd.pub/o/bread/******'
