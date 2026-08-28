// 面包多订单验证 —— Vercel Serverless Function
// 用户在面包多付款后拿到订单号，输入到果核，前端调此接口验证
// 验证通过返回激活码，前端用激活码解锁 Pro
//
// 环境变量（在 Vercel 或 .env 设置）：
//   MIANBAODUO_TOKEN  —— 面包多开发者 Key
//   ACTIVATION_SECRET  —— 激活码签名密钥（任意随机字符串）

const VALID_PRODUCTS = process.env.MIANBAODUO_PRODUCT_KEYS?.split(',').map(s => s.trim()) || []
const SINGLE_PRODUCT_KEYS = process.env.MIANBAODUO_SINGLE_PRODUCT_KEYS?.split(',').map(s => s.trim()) || []

function sign(data, secret) {
  let h = 0
  const str = data + '|' + secret
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { order_id } = req.body || {}

  if (!order_id) {
    return res.status(400).json({ error: '请输入订单号' })
  }

  const token = process.env.MIANBAODUO_TOKEN
  if (!token) {
    return res.status(500).json({ error: '支付验证服务未配置' })
  }

  try {
    const apiUrl = `https://x.mbd.pub/api/order-detail?order_id=${encodeURIComponent(order_id)}`
    const resp = await fetch(apiUrl, {
      headers: { 'x-token': token },
    })
    const data = await resp.json()

    if (data.code !== 200 || !data.result) {
      return res.status(400).json({ error: '订单号无效，请检查后重试' })
    }

    const order = data.result

    if (order.state !== 'success') {
      return res.status(400).json({ error: '订单未完成支付' })
    }

    if (VALID_PRODUCTS.length > 0 && !VALID_PRODUCTS.includes(order.urlkey) && !SINGLE_PRODUCT_KEYS.includes(order.urlkey)) {
      return res.status(400).json({ error: '此订单不是果核产品，请确认购买的商品正确' })
    }

    const isSingle = SINGLE_PRODUCT_KEYS.includes(order.urlkey)
    const now = Math.floor(Date.now() / 1000)
    if (order.expire_at && order.expire_at < now) {
      return res.status(400).json({ error: '订单已过期，请重新购买' })
    }

    let tier
    let expiresAt
    if (isSingle) {
      tier = 'single'
      expiresAt = 0
    } else {
      const isSubscription = order.rounds != null && order.rounds > 0
      tier = isSubscription ? 'pro' : 'pro'
      expiresAt = order.expire_at
        ? order.expire_at * 1000
        : Date.now() + 30 * 86400000
    }

    const secret = process.env.ACTIVATION_SECRET || 'guohe-default-secret'
    const signature = sign(order_id + '|' + tier + '|' + expiresAt, secret)

    return res.status(200).json({
      valid: true,
      tier,
      expiresAt,
      orderId: order.orderid || order_id,
      signature,
    })
  } catch (err) {
    console.error('verify-order error:', err)
    return res.status(500).json({ error: '验证服务暂时不可用，请稍后重试' })
  }
}
