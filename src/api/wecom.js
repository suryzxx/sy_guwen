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

export async function getCurrentExternalUserid() {
  const debugUserid = cachedExternalUserid()
  if (debugUserid) return debugUserid
  const wx = await loadWecomSdk()
  await configureWecomSdk(wx)
  return new Promise((resolve, reject) => {
    wx.invoke('getCurExternalContact', {}, (res) => {
      if (res.err_msg === 'getCurExternalContact:ok' && res.userId) resolve(res.userId)
      else reject(new Error(res.err_msg || '未获取到当前外部联系人'))
    })
  })
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
