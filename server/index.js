import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { URL } from 'node:url'
import { classes, notifications, orders, students, trackRecords } from '../src/mock/data.js'

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'
const CORP_ID = process.env.WECOM_CORP_ID || ''
const AGENT_ID = process.env.WECOM_AGENT_ID || ''
const CORP_SECRET = process.env.WECOM_CORP_SECRET || ''
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*'
const OAUTH_SCOPE = process.env.WECOM_OAUTH_SCOPE || 'snsapi_base'

let accessTokenCache = null
const sessions = new Map()
const state = {
  students: clone(students),
  classes: clone(classes),
  trackRecords: clone(trackRecords),
  orders: clone(orders),
  notifications: clone(notifications)
}

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function nowText() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
  })
  res.end(JSON.stringify(data))
}

function sendError(res, status, message, details) {
  sendJson(res, status, { error: message, details })
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function requireWecomConfig() {
  const missing = []
  if (!CORP_ID) missing.push('WECOM_CORP_ID')
  if (!AGENT_ID) missing.push('WECOM_AGENT_ID')
  if (!CORP_SECRET) missing.push('WECOM_CORP_SECRET')
  if (missing.length) {
    const error = new Error(`Missing env: ${missing.join(', ')}`)
    error.status = 500
    throw error
  }
}

async function getAccessToken() {
  requireWecomConfig()
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.token
  }

  const url = new URL('https://qyapi.weixin.qq.com/cgi-bin/gettoken')
  url.searchParams.set('corpid', CORP_ID)
  url.searchParams.set('corpsecret', CORP_SECRET)

  const response = await fetch(url)
  const data = await response.json()
  if (data.errcode !== 0) {
    const error = new Error(data.errmsg || 'Failed to get WeCom access_token')
    error.status = 502
    error.details = data
    throw error
  }

  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 7200) - 120) * 1000
  }
  return accessTokenCache.token
}

async function getWecomUserInfo(code) {
  if (!code) {
    const error = new Error('Missing WeCom auth code')
    error.status = 400
    throw error
  }

  const accessToken = await getAccessToken()
  const url = new URL('https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('code', code)

  const response = await fetch(url)
  const data = await response.json()
  if (data.errcode !== 0) {
    const error = new Error(data.errmsg || 'Failed to get WeCom user info')
    error.status = 502
    error.details = data
    throw error
  }
  return data
}

function getSession(req) {
  const authorization = req.headers.authorization || ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  return token ? sessions.get(token) : null
}

function ensureSession(req, res) {
  const session = getSession(req)
  if (!session) {
    sendError(res, 401, 'Unauthorized')
    return null
  }
  return session
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && pathname === '/wecom/oauth-url') {
      requireWecomConfig()
      const redirectUri = url.searchParams.get('redirect_uri')
      if (!redirectUri) {
        sendError(res, 400, 'Missing redirect_uri')
        return
      }
      const oauthUrl = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
      oauthUrl.searchParams.set('appid', CORP_ID)
      oauthUrl.searchParams.set('redirect_uri', redirectUri)
      oauthUrl.searchParams.set('response_type', 'code')
      oauthUrl.searchParams.set('scope', OAUTH_SCOPE)
      oauthUrl.searchParams.set('agentid', AGENT_ID)
      oauthUrl.searchParams.set('state', randomUUID())
      sendJson(res, 200, { url: `${oauthUrl.toString()}#wechat_redirect` })
      return
    }

    if (req.method === 'POST' && pathname === '/wecom/login') {
      const { code } = await readJson(req)
      const wecomUser = await getWecomUserInfo(code)
      const token = randomUUID()
      const userId = wecomUser.userid || wecomUser.UserId || wecomUser.open_userid || 'wecom-user'
      const user = {
        id: userId,
        name: userId,
        roleName: '课程顾问',
        campus: '企微登录'
      }
      sessions.set(token, { user, wecomUser, createdAt: Date.now() })
      sendJson(res, 200, { token, user, wecomUser })
      return
    }

    if (req.method === 'GET' && pathname === '/consultant/workbench') {
      if (!ensureSession(req, res)) return
      sendJson(res, 200, state)
      return
    }

    const studentMatch = pathname.match(/^\/consultant\/students\/([^/]+)$/)
    if (req.method === 'GET' && studentMatch) {
      if (!ensureSession(req, res)) return
      const id = decodeURIComponent(studentMatch[1])
      sendJson(res, 200, {
        student: state.students.find((item) => item.id === id),
        trackRecords: state.trackRecords[id] || []
      })
      return
    }

    const trackMatch = pathname.match(/^\/consultant\/students\/([^/]+)\/track-records$/)
    if (req.method === 'POST' && trackMatch) {
      const session = ensureSession(req, res)
      if (!session) return
      const id = decodeURIComponent(trackMatch[1])
      const { content } = await readJson(req)
      const record = {
        id: `tr_${Date.now()}`,
        content,
        time: nowText(),
        operator: session.user.name
      }
      state.trackRecords[id] = [record, ...(state.trackRecords[id] || [])]
      sendJson(res, 200, record)
      return
    }

    const statusMatch = pathname.match(/^\/consultant\/students\/([^/]+)\/evaluation-status$/)
    if (req.method === 'PATCH' && statusMatch) {
      if (!ensureSession(req, res)) return
      const id = decodeURIComponent(statusMatch[1])
      const { status } = await readJson(req)
      const student = state.students.find((item) => item.id === id)
      if (student) student.status = status
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'POST' && pathname === '/consultant/orders') {
      if (!ensureSession(req, res)) return
      const payload = await readJson(req)
      const student = state.students.find((item) => item.id === payload.studentId)
      const classInfo = state.classes.find((item) => item.id === payload.classId)
      if (!student || !classInfo) {
        sendError(res, 400, 'Invalid studentId or classId')
        return
      }
      const totalPrice = classInfo.coursePrice + classInfo.materialPrice
      const order = {
        id: `o_${Date.now()}`,
        orderNo: `SY${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        classId: classInfo.id,
        className: classInfo.name,
        courseType: classInfo.courseType,
        schedule: classInfo.schedule,
        location: classInfo.location,
        teacher: classInfo.teacher,
        totalLectures: classInfo.totalLectures,
        coursePrice: classInfo.coursePrice,
        materialPrice: classInfo.materialPrice,
        totalPrice,
        status: 'pending',
        createTime: nowText()
      }
      state.orders.unshift(order)
      sendJson(res, 200, order)
      return
    }

    const pushMatch = pathname.match(/^\/consultant\/orders\/([^/]+)\/push$/)
    if (req.method === 'POST' && pushMatch) {
      if (!ensureSession(req, res)) return
      const id = decodeURIComponent(pushMatch[1])
      const order = state.orders.find((item) => item.id === id)
      if (!order) {
        sendError(res, 404, 'Order not found')
        return
      }
      order.status = 'pushed'
      order.pushTime = nowText()
      state.notifications.unshift({
        id: `n_${Date.now()}`,
        type: 'order',
        title: '订单已推送给家长',
        content: `${order.studentName}的${order.className}订单已发送到家长小程序。`,
        time: nowText(),
        orderId: id,
        read: false
      })
      sendJson(res, 200, order)
      return
    }

    sendError(res, 404, 'Not found')
  } catch (error) {
    sendError(res, error.status || 500, error.message || 'Server error', error.details)
  }
}

createServer(handleRequest).listen(PORT, HOST, () => {
  console.log(`WeCom test API listening on http://${HOST}:${PORT}`)
})
