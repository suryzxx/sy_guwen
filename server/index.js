import { createServer } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { URL } from 'node:url'
import {
  addTrackRecord,
  bindExternalContact,
  createOrder,
  createSession,
  completeStudentTask,
  dbPath,
  findStudentByName,
  findOrCreatePlanner,
  getPlannerByToken,
  getStudent,
  getStudentByExternalUserid,
  getStudentTasks,
  getStageHistory,
  getTrackRecords,
  getWorkbench,
  pushOrder,
  updateStudentEvaluation,
  updateStudentStage
} from './database.js'

function loadLocalEnv() {
  for (const file of ['.env.local', '.env.development']) {
    if (!existsSync(file)) continue
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match || process.env[match[1]] !== undefined) continue
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

loadLocalEnv()

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'
const CORP_ID = process.env.WECOM_CORP_ID || ''
const AGENT_ID = process.env.WECOM_AGENT_ID || ''
const CORP_SECRET = process.env.WECOM_CORP_SECRET || ''
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*'
let accessTokenCache
let jsapiTicketCache
let agentTicketCache

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
  })
  res.end(JSON.stringify(data))
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

function requireWecomConfig() {
  if (!CORP_ID || !AGENT_ID || !CORP_SECRET) {
    const error = new Error('缺少企业微信配置')
    error.status = 500
    throw error
  }
}

async function getAccessToken() {
  requireWecomConfig()
  if (accessTokenCache?.expiresAt > Date.now() + 60_000) return accessTokenCache.token
  const url = new URL('https://qyapi.weixin.qq.com/cgi-bin/gettoken')
  url.searchParams.set('corpid', CORP_ID)
  url.searchParams.set('corpsecret', CORP_SECRET)
  const data = await fetch(url).then((response) => response.json())
  if (data.errcode) throw Object.assign(new Error(data.errmsg), { status: 502 })
  accessTokenCache = { token: data.access_token, expiresAt: Date.now() + 7_000_000 }
  return data.access_token
}

async function getTicket(type = 'jsapi') {
  const cache = type === 'agent_config' ? agentTicketCache : jsapiTicketCache
  if (cache?.expiresAt > Date.now() + 60_000) return cache.ticket
  const accessToken = await getAccessToken()
  const ticketUrl = type === 'agent_config'
    ? new URL('https://qyapi.weixin.qq.com/cgi-bin/ticket/get')
    : new URL('https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket')
  ticketUrl.searchParams.set('access_token', accessToken)
  if (type === 'agent_config') ticketUrl.searchParams.set('type', 'agent_config')
  const data = await fetch(ticketUrl).then((response) => response.json())
  if (data.errcode) throw Object.assign(new Error(data.errmsg), { status: 502 })
  const next = { ticket: data.ticket, expiresAt: Date.now() + 7_000_000 }
  if (type === 'agent_config') agentTicketCache = next
  else jsapiTicketCache = next
  return data.ticket
}

function signJsapi(ticket, nonceStr, timestamp, pageUrl) {
  return createHash('sha1')
    .update(`jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${pageUrl}`)
    .digest('hex')
}

async function createJsConfig(pageUrl) {
  requireWecomConfig()
  const timestamp = Math.floor(Date.now() / 1000)
  const nonceStr = randomUUID().replace(/-/g, '')
  const [jsapiTicket, agentTicket] = await Promise.all([getTicket(), getTicket('agent_config')])
  return {
    corpId: CORP_ID,
    agentId: AGENT_ID,
    timestamp,
    nonceStr,
    signature: signJsapi(jsapiTicket, nonceStr, timestamp, pageUrl),
    agentSignature: signJsapi(agentTicket, nonceStr, timestamp, pageUrl),
    jsApiList: ['getContext', 'getCurExternalContact']
  }
}

async function getWecomIdentity(code) {
  const accessToken = await getAccessToken()
  const authUrl = new URL('https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo')
  authUrl.searchParams.set('access_token', accessToken)
  authUrl.searchParams.set('code', code)
  const auth = await fetch(authUrl).then((response) => response.json())
  if (auth.errcode) throw Object.assign(new Error(auth.errmsg), { status: 502 })

  const userid = auth.userid || auth.UserId
  if (!userid) return { userid: auth.open_userid }
  const userUrl = new URL('https://qyapi.weixin.qq.com/cgi-bin/user/get')
  userUrl.searchParams.set('access_token', accessToken)
  userUrl.searchParams.set('userid', userid)
  const user = await fetch(userUrl).then((response) => response.json())
  return { userid, mobile: user.mobile, unionid: user.unionid, name: user.name }
}

async function getExternalContact(externalUserid) {
  const accessToken = await getAccessToken()
  const contactUrl = new URL('https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get')
  contactUrl.searchParams.set('access_token', accessToken)
  contactUrl.searchParams.set('external_userid', externalUserid)
  const data = await fetch(contactUrl).then((response) => response.json())
  if (data.errcode) throw Object.assign(new Error(data.errmsg), { status: 502, wecom: data })
  return data
}

async function debugExternalContact(externalUserid) {
  const result = {
    externalUserid,
    existingBinding: null,
    contactLookup: null,
    candidateNames: [],
    matchedStudent: null,
    canAutoBind: false
  }

  const existingBinding = getStudentByExternalUserid(CORP_ID, externalUserid)
  if (existingBinding) {
    result.existingBinding = existingBinding
    result.matchedStudent = existingBinding.student
    return result
  }

  try {
    const contact = await getExternalContact(externalUserid)
    const candidateNames = [
      contact.external_contact?.name,
      ...(contact.follow_user || []).map((item) => item.remark)
    ].filter(Boolean)

    result.contactLookup = { ok: true }
    result.candidateNames = [...new Set(candidateNames)]
    for (const name of result.candidateNames) {
      const student = findStudentByName(name)
      if (student) {
        result.matchedStudent = student
        result.canAutoBind = true
        break
      }
    }
  } catch (error) {
    result.contactLookup = {
      ok: false,
      message: error.message || '企业微信客户详情接口调用失败',
      errcode: error.wecom?.errcode,
      errmsg: error.wecom?.errmsg,
      hint: error.wecom?.hint
    }
  }

  return result
}

async function autoBindExternalContact(externalUserid) {
  const contact = await getExternalContact(externalUserid)
  const names = [
    contact.external_contact?.name,
    ...(contact.follow_user || []).map((item) => item.remark)
  ].filter(Boolean)

  for (const name of names) {
    const student = findStudentByName(name)
    if (student) {
      return bindExternalContact({
        corpId: CORP_ID,
        externalUserid,
        studentId: student.id,
        displayName: name
      })
    }
  }
  return null
}

function requirePlanner(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const planner = token && getPlannerByToken(token)
  if (!planner) sendJson(res, 401, { error: 'Unauthorized' })
  return planner
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {})
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/health') return sendJson(res, 200, { ok: true, database: dbPath })

    if (req.method === 'GET' && path === '/wecom/oauth-url') {
      requireWecomConfig()
      const oauthUrl = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
      oauthUrl.searchParams.set('appid', CORP_ID)
      oauthUrl.searchParams.set('redirect_uri', url.searchParams.get('redirect_uri'))
      oauthUrl.searchParams.set('response_type', 'code')
      oauthUrl.searchParams.set('scope', 'snsapi_base')
      oauthUrl.searchParams.set('agentid', AGENT_ID)
      oauthUrl.searchParams.set('state', randomUUID())
      return sendJson(res, 200, { url: `${oauthUrl}#wechat_redirect` })
    }

    if (req.method === 'POST' && path === '/wecom/login') {
      const body = await readJson(req)
      const identity = body.code ? await getWecomIdentity(body.code) : body
      const planner = findOrCreatePlanner(identity)
      return sendJson(res, 200, { token: createSession(planner.id), user: planner })
    }

    const planner = requirePlanner(req, res)
    if (!planner) return

    if (req.method === 'GET' && path === '/wecom/js-config') {
      const pageUrl = url.searchParams.get('url')
      if (!pageUrl) return sendJson(res, 400, { error: 'Missing url' })
      return sendJson(res, 200, await createJsConfig(pageUrl))
    }

    if (req.method === 'POST' && path === '/wecom/external-contact/resolve') {
      const { externalUserid } = await readJson(req)
      if (!externalUserid) return sendJson(res, 400, { error: 'Missing externalUserid' })
      const binding = getStudentByExternalUserid(CORP_ID, externalUserid)
      if (binding) return sendJson(res, 200, binding)
      const autoBinding = await autoBindExternalContact(externalUserid)
      return autoBinding ? sendJson(res, 200, autoBinding) : sendJson(res, 404, { error: 'External contact is not bound' })
    }

    if (req.method === 'POST' && path === '/wecom/external-contact/debug') {
      const { externalUserid } = await readJson(req)
      if (!externalUserid) return sendJson(res, 200, {
        externalUserid: '',
        externalUseridError: '未拿到企业微信当前外部联系人 external_userid'
      })
      return sendJson(res, 200, await debugExternalContact(externalUserid))
    }

    if (req.method === 'POST' && path === '/wecom/external-contact/bind') {
      const { externalUserid, studentId, displayName } = await readJson(req)
      if (!externalUserid || !studentId) return sendJson(res, 400, { error: 'Missing externalUserid or studentId' })
      const binding = bindExternalContact({ corpId: CORP_ID, externalUserid, studentId, displayName })
      return binding ? sendJson(res, 200, binding) : sendJson(res, 404, { error: 'Student not found' })
    }

    if (req.method === 'GET' && path === '/planner/workbench') {
      return sendJson(res, 200, getWorkbench(planner.id))
    }

    const studentMatch = path.match(/^\/planner\/students\/([^/]+)$/)
    if (req.method === 'GET' && studentMatch) {
      const id = decodeURIComponent(studentMatch[1])
      return sendJson(res, 200, {
        student: getStudent(id),
        trackRecords: getTrackRecords(id),
        tasks: getStudentTasks(id),
        stageHistory: getStageHistory(id)
      })
    }

    const trackMatch = path.match(/^\/planner\/students\/([^/]+)\/track-records$/)
    if (req.method === 'POST' && trackMatch) {
      const { content } = await readJson(req)
      return sendJson(res, 200, addTrackRecord(decodeURIComponent(trackMatch[1]), content, planner.name))
    }

    const stageMatch = path.match(/^\/planner\/students\/([^/]+)\/stage$/)
    if (req.method === 'PATCH' && stageMatch) {
      const { stage, reason, cancellationReason, appointment } = await readJson(req)
      const result = updateStudentStage(
        decodeURIComponent(stageMatch[1]),
        stage,
        { reason, cancellationReason, appointment },
        planner.name
      )
      return sendJson(res, result.status || 200, result.status ? { error: result.error } : result)
    }

    const evaluationMatch = path.match(/^\/planner\/students\/([^/]+)\/evaluation$/)
    if (req.method === 'PATCH' && evaluationMatch) {
      const result = updateStudentEvaluation(decodeURIComponent(evaluationMatch[1]), await readJson(req), planner.name)
      return sendJson(res, result.status || 200, result.status ? { error: result.error } : result)
    }

    const taskMatch = path.match(/^\/planner\/tasks\/([^/]+)\/complete$/)
    if (req.method === 'PATCH' && taskMatch) {
      const task = completeStudentTask(decodeURIComponent(taskMatch[1]), planner.name)
      return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: 'Task not found' })
    }

    if (req.method === 'POST' && path === '/planner/orders') {
      const { studentId, classId } = await readJson(req)
      const order = createOrder(planner.id, studentId, classId, planner.name)
      return order ? sendJson(res, 200, order) : sendJson(res, 400, { error: 'Invalid studentId or classId' })
    }

    const pushMatch = path.match(/^\/planner\/orders\/([^/]+)\/push$/)
    if (req.method === 'POST' && pushMatch) {
      const order = pushOrder(planner.id, decodeURIComponent(pushMatch[1]), planner.name)
      return order ? sendJson(res, 200, order) : sendJson(res, 404, { error: 'Order not found' })
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || 'Server error' })
  }
}

createServer(handleRequest).listen(PORT, HOST, () => {
  console.log(`Planner API: http://${HOST}:${PORT}`)
  console.log(`SQLite: ${dbPath}`)
})
