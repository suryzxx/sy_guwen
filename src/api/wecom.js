import http from './http'

const SDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js'

function cachedExternalUserid() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('external_userid') || params.get('externalUserid')
  if (value) sessionStorage.setItem('external_userid', value)
  return value || sessionStorage.getItem('external_userid') || ''
}

function loadWecomSdk() {
  if (window.wx) return Promise.resolve(window.wx)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => resolve(window.wx)
    script.onerror = () => reject(new Error('企业微信 JS-SDK 加载失败'))
    document.head.appendChild(script)
  })
}

function currentSignatureUrl() {
  return window.location.href.split('#')[0]
}

function normalizeWecomError(error, fallback = '企业微信 JS-SDK 调用失败') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  return error.errMsg || error.err_msg || error.message || error.error || JSON.stringify(error)
}

function safeDetail(detail) {
  if (!detail) return null
  try {
    return JSON.parse(JSON.stringify(detail))
  } catch {
    return { text: String(detail) }
  }
}

const EXTERNAL_CONTACT_INVOKE_OPTIONS = [
  { label: '默认参数', params: {} },
  { label: '客户联系聊天工具栏', params: { entry: 'single_chat_tools' } },
  { label: '客户详情入口', params: { entry: 'contact_profile' } }
]

async function configureWecomSdk(wx) {
  const config = await http.get('/wecom/js-config', { params: { url: currentSignatureUrl() } })
  await new Promise((resolve, reject) => {
    wx.config({
      beta: true,
      debug: false,
      appId: config.corpId,
      timestamp: config.timestamp,
      nonceStr: config.nonceStr,
      signature: config.signature,
      jsApiList: config.jsApiList
    })
    wx.ready(resolve)
    wx.error(reject)
  })

  if (!wx.agentConfig) return
  await new Promise((resolve, reject) => {
    wx.agentConfig({
      beta: true,
      corpid: config.corpId,
      agentid: config.agentId,
      timestamp: config.timestamp,
      nonceStr: config.nonceStr,
      signature: config.agentSignature,
      jsApiList: config.jsApiList,
      success: resolve,
      fail: reject
    })
  })
}

function invokeExternalContactOnce(wx, params) {
  return new Promise((resolve) => {
    wx.invoke('getCurExternalContact', params, (res) => {
      resolve(res)
    })
  })
}

function invokeContext(wx) {
  return new Promise((resolve) => {
    wx.invoke('getContext', {}, (res) => {
      resolve(res)
    })
  })
}

async function invokeCurrentExternalContact(wx) {
  const attempts = []
  for (const option of EXTERNAL_CONTACT_INVOKE_OPTIONS) {
    const result = await invokeExternalContactOnce(wx, option.params)
    attempts.push({ label: option.label, params: option.params, result })
    if (result?.err_msg === 'getCurExternalContact:ok' && result.userId) {
      return { externalUserid: result.userId, attempts }
    }
  }
  const lastResult = attempts[attempts.length - 1]?.result
  const error = new Error(normalizeWecomError(lastResult, '未获取到当前外部联系人'))
  error.attempts = attempts
  error.result = lastResult
  throw error
}

export async function getCurrentExternalUserid() {
  const debugUserid = cachedExternalUserid()
  if (debugUserid) return debugUserid
  const wx = await loadWecomSdk()
  await configureWecomSdk(wx)
  const result = await invokeCurrentExternalContact(wx)
  return result.externalUserid
}

export async function inspectCurrentExternalContact() {
  const steps = []
  const pushStep = (key, title, status, message, detail) => {
    steps.push({ key, title, status, message, detail: safeDetail(detail) })
  }

  const debugUserid = cachedExternalUserid()
  if (debugUserid) {
    pushStep('url-param', 'URL 参数', 'ok', `已从 URL 或缓存读取 external_userid：${debugUserid}`)
    return { externalUserid: debugUserid, steps }
  }

  let wx
  try {
    wx = await loadWecomSdk()
    pushStep('sdk', 'JS-SDK 加载', 'ok', '已加载企业微信 JS-SDK。', {
      hasWx: Boolean(wx),
      hasAgentConfig: Boolean(wx?.agentConfig),
      userAgent: window.navigator.userAgent
    })
  } catch (error) {
    pushStep('sdk', 'JS-SDK 加载', 'error', normalizeWecomError(error, '企业微信 JS-SDK 加载失败'))
    return { externalUserid: '', steps }
  }

  let config
  try {
    config = await http.get('/wecom/js-config', { params: { url: currentSignatureUrl() } })
    pushStep('js-config-api', '后端签名配置', 'ok', '已从后端取得 JS-SDK 签名配置。', {
      corpId: config.corpId,
      agentId: config.agentId,
      jsApiList: config.jsApiList,
      signatureUrl: currentSignatureUrl()
    })
  } catch (error) {
    pushStep('js-config-api', '后端签名配置', 'error', normalizeWecomError(error, '后端签名配置接口失败'))
    return { externalUserid: '', steps }
  }

  try {
    await new Promise((resolve, reject) => {
      wx.config({
        beta: true,
        debug: false,
        appId: config.corpId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: config.jsApiList
      })
      wx.ready(resolve)
      wx.error(reject)
    })
    pushStep('wx-config', 'wx.config', 'ok', 'wx.config 校验成功。')
  } catch (error) {
    pushStep('wx-config', 'wx.config', 'error', normalizeWecomError(error, 'wx.config 校验失败'), error)
    return { externalUserid: '', steps }
  }

  if (!wx.agentConfig) {
    pushStep('agent-config', 'wx.agentConfig', 'error', '当前 JS-SDK 没有 wx.agentConfig，无法调用应用级 JSAPI。')
    return { externalUserid: '', steps }
  }

  try {
    await new Promise((resolve, reject) => {
      wx.agentConfig({
        beta: true,
        corpid: config.corpId,
        agentid: config.agentId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.agentSignature,
        jsApiList: config.jsApiList,
        success: resolve,
        fail: reject
      })
    })
    pushStep('agent-config', 'wx.agentConfig', 'ok', 'wx.agentConfig 校验成功。')
  } catch (error) {
    pushStep('agent-config', 'wx.agentConfig', 'error', normalizeWecomError(error, 'wx.agentConfig 校验失败'), error)
    return { externalUserid: '', steps }
  }

  const contextResult = await invokeContext(wx)
  const isSupportedContext = contextResult?.err_msg === 'getContext:ok'
  pushStep(
    'get-context',
    'getContext',
    isSupportedContext ? 'ok' : 'error',
    isSupportedContext
      ? `当前企微入口：${contextResult.entry || '未知'}`
      : normalizeWecomError(contextResult, '未能识别当前企微入口'),
    contextResult
  )

  try {
    const invokeResult = await invokeCurrentExternalContact(wx)
    pushStep('get-cur-external-contact', 'getCurExternalContact', 'ok', `已取得 external_userid：${invokeResult.externalUserid}`, invokeResult)
    return { externalUserid: invokeResult.externalUserid, steps }
  } catch (error) {
    const attempts = error.attempts || []
    for (const [index, attempt] of attempts.entries()) {
      pushStep(
        `get-cur-external-contact-${index + 1}`,
        `getCurExternalContact - ${attempt.label}`,
        'error',
        normalizeWecomError(attempt.result, '未获取到当前外部联系人'),
        { params: attempt.params, result: attempt.result }
      )
    }
    pushStep(
      'get-cur-external-contact',
      'getCurExternalContact',
      'error',
      '所有调用方式都被企业微信拒绝。wx.config 和 wx.agentConfig 已通过，剩余问题是客户联系 JSAPI 权限或入口上下文。请在企业微信后台确认该应用已被配置为客户联系聊天工具栏，并且当前入口来自外部联系人单聊。',
      error.result || error
    )
    return { externalUserid: '', steps }
  }
}

export function resolveExternalContactStudent(externalUserid) {
  return http.post('/wecom/external-contact/resolve', { externalUserid })
}

export function debugExternalContactStudent(externalUserid) {
  return http.post('/wecom/external-contact/debug', { externalUserid })
}

export function bindExternalContactStudent(payload) {
  return http.post('/wecom/external-contact/bind', payload)
}
