import { defineStore } from 'pinia'
import {
  addTrackRecord,
  completeStudentTask,
  createOrder,
  fetchStudentDetail,
  fetchWorkbenchData,
  loginByWecom,
  pushOrder,
  updateStudentEvaluation,
  updateStudentStage
} from '../api/workbench'
import { getCurrentExternalUserid, resolveExternalContactStudent } from '../api/wecom'
import { STUDENT_STAGES } from '../../shared/student-workflow.js'

export const useWorkbenchStore = defineStore('workbench', {
  state: () => ({
    user: null,
    students: [],
    classes: [],
    orders: [],
    notifications: [],
    trackRecords: {},
    studentTasks: {},
    stageHistory: {},
    sidebarExternalUserid: '',
    sidebarStudent: null,
    sidebarContactChecked: false,
    showInlineWecomDebug: false,
    loading: false
  }),
  getters: {
    unreadCount: (state) => state.notifications.filter((item) => !item.read).length,
    assessedStudents: (state) => state.students.filter((item) => item.stage === STUDENT_STAGES.ADAPTED_NOT_CONVERTED && item.evaluationResult?.level),
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
        this.studentTasks = data.studentTasks || {}
      } finally {
        this.loading = false
      }
    },
    async resolveSidebarContact() {
      if (this.sidebarContactChecked) return this.sidebarStudent
      this.sidebarContactChecked = true
      try {
        const externalUserid = await getCurrentExternalUserid()
        this.sidebarExternalUserid = externalUserid
        const data = await resolveExternalContactStudent(externalUserid)
        this.sidebarStudent = data.student
        if (data.student && !this.students.some((item) => item.id === data.student.id)) {
          this.students.push(data.student)
        }
        return data.student
      } catch {
        return null
      }
    },
    openInlineWecomDebug() {
      this.showInlineWecomDebug = true
    },
    closeInlineWecomDebug() {
      this.showInlineWecomDebug = false
    },
    async loadStudent(id) {
      const data = await fetchStudentDetail(id)
      const index = this.students.findIndex((item) => item.id === id)
      if (data.student && index >= 0) {
        this.students[index] = data.student
      } else if (data.student) {
        this.students.push(data.student)
      }
      this.trackRecords[id] = data.trackRecords || []
      this.studentTasks[id] = data.tasks || []
      this.stageHistory[id] = data.stageHistory || []
      return data
    },
    async saveTrackRecord(studentId, content) {
      const record = await addTrackRecord(studentId, content)
      this.trackRecords[studentId] = [record, ...(this.trackRecords[studentId] || [])]
      return record
    },
    applyStudentWorkflow(studentId, data) {
      const index = this.students.findIndex((item) => item.id === studentId)
      if (data.student && index >= 0) this.students[index] = data.student
      if (data.tasks) this.studentTasks[studentId] = data.tasks
      if (data.stageHistory) this.stageHistory[studentId] = data.stageHistory
    },
    async setStudentStage(studentId, payload) {
      const data = await updateStudentStage(studentId, payload)
      this.applyStudentWorkflow(studentId, data)
      return data.student
    },
    async saveEvaluation(studentId, payload) {
      const data = await updateStudentEvaluation(studentId, payload)
      this.applyStudentWorkflow(studentId, data)
      return data.student
    },
    async completeTask(studentId, taskId) {
      const task = await completeStudentTask(taskId)
      const tasks = this.studentTasks[studentId] || []
      const index = tasks.findIndex((item) => item.id === taskId)
      if (index >= 0) tasks[index] = task
      return task
    },
    async submitOrder(payload) {
      const order = await createOrder(payload)
      this.orders.unshift(order)
      await this.loadStudent(payload.studentId)
      return order
    },
    async sendOrder(orderId) {
      const order = await pushOrder(orderId)
      const index = this.orders.findIndex((item) => item.id === orderId)
      if (index >= 0 && order) this.orders[index] = order
      if (order?.studentId) await this.loadStudent(order.studentId)
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
