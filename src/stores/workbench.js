import { defineStore } from 'pinia'
import { addTrackRecord, createOrder, fetchStudentDetail, fetchWorkbenchData, loginByWecom, pushOrder, updateEvaluationStatus } from '../api/workbench'

export const useWorkbenchStore = defineStore('workbench', {
  state: () => ({
    user: null,
    students: [],
    classes: [],
    orders: [],
    notifications: [],
    trackRecords: {},
    loading: false
  }),
  getters: {
    unreadCount: (state) => state.notifications.filter((item) => !item.read).length,
    testedStudents: (state) => state.students.filter((item) => item.status === 'tested'),
    orderById: (state) => (id) => state.orders.find((item) => item.id === id),
    studentById: (state) => (id) => state.students.find((item) => item.id === id)
  },
  actions: {
    async bootstrap() {
      this.loading = true
      try {
        this.user = await loginByWecom()
        const data = await fetchWorkbenchData()
        this.students = data.students
        this.classes = data.classes
        this.orders = data.orders
        this.notifications = data.notifications
        this.trackRecords = data.trackRecords
      } finally {
        this.loading = false
      }
    },
    async loadStudent(id) {
      const data = await fetchStudentDetail(id)
      if (data.student && !this.students.some((item) => item.id === id)) {
        this.students.push(data.student)
      }
      this.trackRecords[id] = data.trackRecords || []
      return data
    },
    async saveTrackRecord(studentId, content) {
      const record = await addTrackRecord(studentId, content)
      this.trackRecords[studentId] = [record, ...(this.trackRecords[studentId] || [])]
      return record
    },
    async setEvaluationStatus(studentId, nextStatus) {
      await updateEvaluationStatus(studentId, nextStatus)
      const student = this.students.find((item) => item.id === studentId)
      if (student) student.status = nextStatus
    },
    async submitOrder(payload) {
      const order = await createOrder(payload)
      this.orders.unshift(order)
      return order
    },
    async sendOrder(orderId) {
      const order = await pushOrder(orderId)
      const index = this.orders.findIndex((item) => item.id === orderId)
      if (index >= 0 && order) this.orders[index] = order
      const data = await fetchWorkbenchData()
      this.notifications = data.notifications
      return order
    },
    markNotificationRead(id) {
      const notification = this.notifications.find((item) => item.id === id)
      if (notification) notification.read = true
    }
  }
})
