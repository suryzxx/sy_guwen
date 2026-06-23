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

function invokeCurrentExternalContact(wx) {
  return new Promise((resolve, reject) => {
    wx.invoke('getCurExternalContact', {}, (res) => {
      if (res.err_msg === 'getCurExternalContact:ok' && res.userId) resolve(res.userId)
      else reject(new Error(res.err_msg || '未获取到当前外部联系人'))
    })
  })
}

export async function getCurrentExternalUserid() {
  const debugUserid = cachedExternalUserid()
  if (debugUserid) return debugUserid
  const wx = await loadWecomSdk()
  await configureWecomSdk(wx)
  return invokeCurrentExternalContact(wx)
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

  try {
    const invokeResult = await new Promise((resolve, reject) => {
      wx.invoke('getCurExternalContact', {}, (res) => {
        if (res.err_msg === 'getCurExternalContact:ok' && res.userId) resolve(res)
        else reject(res)
      })
    })
    pushStep('get-cur-external-contact', 'getCurExternalContact', 'ok', `已取得 external_userid：${invokeResult.userId}`, invokeResult)
    return { externalUserid: invokeResult.userId, steps }
  } catch (error) {
    pushStep(
      'get-cur-external-contact',
      'getCurExternalContact',
      'error',
      normalizeWecomError(error, '未获取到当前外部联系人'),
      error
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
