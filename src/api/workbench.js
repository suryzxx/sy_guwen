import http from './http'

export async function loginByWecom() {
  const params = new URLSearchParams(window.location.search)
  const externalUserid = params.get('external_userid') || params.get('externalUserid')
  if (externalUserid) sessionStorage.setItem('external_userid', externalUserid)
  const payload = {
    code: params.get('code') || undefined,
    userid: params.get('userid') || undefined,
    mobile: params.get('mobile') || undefined,
    unionid: params.get('unionid') || undefined,
    name: params.get('name') || undefined
  }
  const data = await http.post('/wecom/login', payload)
  localStorage.setItem('planner_token', `Bearer ${data.token}`)
  if ([...params.keys()].length) {
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`)
  }
  return data.user
}

export function fetchWorkbenchData() {
  return http.get('/planner/workbench')
}

export function fetchStudentDetail(id) {
  return http.get(`/planner/students/${id}`)
}

export function addTrackRecord(studentId, content) {
  return http.post(`/planner/students/${studentId}/track-records`, { content })
}

export function updateStudentStage(studentId, payload) {
  return http.patch(`/planner/students/${studentId}/stage`, payload)
}

export function updateStudentEvaluation(studentId, payload) {
  return http.patch(`/planner/students/${studentId}/evaluation`, payload)
}

export function completeStudentTask(taskId) {
  return http.patch(`/planner/tasks/${taskId}/complete`)
}

export function createOrder(payload) {
  return http.post('/planner/orders', payload)
}

export function pushOrder(orderId) {
  return http.post(`/planner/orders/${orderId}/push`)
}
