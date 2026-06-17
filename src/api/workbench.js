import http from './http'
import { useMock } from '../config/env'
import { getMockState, updateMockState } from '../mock/storage'

function wait(data, delay = 180) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), delay)
  })
}

function nowText() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export async function loginByWecom() {
  if (!useMock) {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}`
      const { url } = await http.get('/wecom/oauth-url', {
        params: { redirect_uri: redirectUri }
      })
      window.location.href = url
      return new Promise(() => {})
    }

    const data = await http.post('/wecom/login', { code })
    localStorage.setItem('consultant_token', `Bearer ${data.token}`)
    window.history.replaceState({}, document.title, `${window.location.origin}${import.meta.env.BASE_URL}`)
    return data.user
  }
  return wait({
    id: 'u001',
    name: '规划师Ella',
    phone: '18756093437',
    gender: '女',
    region: '江苏省 / 南京市 / 鼓楼区',
    campus: '辰龙尚悦中心',
    roleName: '学习规划师',
    posterName: '宣传海报'
  })
}

export async function fetchWorkbenchData() {
  if (!useMock) return http.get('/consultant/workbench')
  return wait(getMockState())
}

export async function fetchStudentDetail(id) {
  if (!useMock) return http.get(`/consultant/students/${id}`)
  const state = getMockState()
  return wait({
    student: state.students.find((item) => item.id === id),
    trackRecords: state.trackRecords[id] || []
  })
}

export async function addTrackRecord(studentId, content) {
  if (!useMock) return http.post(`/consultant/students/${studentId}/track-records`, { content })
  const record = {
    id: `tr_${Date.now()}`,
    content,
    time: nowText(),
    operator: '张顾问'
  }
  updateMockState((state) => {
    state.trackRecords[studentId] = [record, ...(state.trackRecords[studentId] || [])]
    return state
  })
  return wait(record)
}

export async function updateEvaluationStatus(studentId, nextStatus) {
  if (!useMock) return http.patch(`/consultant/students/${studentId}/evaluation-status`, { status: nextStatus })
  updateMockState((state) => {
    const student = state.students.find((item) => item.id === studentId)
    if (student) student.status = nextStatus
    return state
  })
  return wait({ ok: true })
}

export async function createOrder(payload) {
  if (!useMock) return http.post('/consultant/orders', payload)
  let order
  updateMockState((state) => {
    const student = state.students.find((item) => item.id === payload.studentId)
    const classInfo = state.classes.find((item) => item.id === payload.classId)
    const totalPrice = classInfo.coursePrice + classInfo.materialPrice
    order = {
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
    return state
  })
  return wait(order)
}

export async function pushOrder(orderId) {
  if (!useMock) return http.post(`/consultant/orders/${orderId}/push`)
  let order
  updateMockState((state) => {
    order = state.orders.find((item) => item.id === orderId)
    if (order) {
      order.status = 'pushed'
      order.pushTime = nowText()
      state.notifications.unshift({
        id: `n_${Date.now()}`,
        type: 'order',
        title: '订单已推送给家长',
        content: `${order.studentName}的${order.className}订单已发送到家长小程序。`,
        time: nowText(),
        orderId,
        read: false
      })
    }
    return state
  })
  return wait(order)
}
