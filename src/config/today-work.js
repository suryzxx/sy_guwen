import { STUDENT_STAGES } from '../../shared/student-workflow.js'

export const TODAY_WORK_ITEMS = [
  {
    id: 'pending_add',
    title: '待添加',
    description: '已授权手机号，尚未添加家长企微',
    tone: 'primary'
  },
  {
    id: 'pending_booking',
    title: '待约测',
    description: '已加企微，尚未预约评测',
    tone: 'primary'
  },
  {
    id: 'pending_visit',
    title: '待到访',
    description: '已预约，等待签到',
    tone: 'warning'
  },
  {
    id: 'pending_paper',
    title: '待分配试卷',
    description: '已签到，需要分配试卷或安排试听',
    tone: 'warning'
  },
  {
    id: 'pending_level',
    title: '待定级',
    description: '已完成测试或试听，需要录入等级和适配结果',
    tone: 'warning'
  },
  {
    id: 'pending_enrollment',
    title: '待报名',
    description: '评测达标但未报名，需要强跟进',
    tone: 'primary'
  }
]

export function dateKey(value = new Date()) {
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function pendingTaskFor(tasks = []) {
  return tasks.find((task) => task.status === 'pending') || null
}

export function taskTimestamp(task) {
  if (!task?.dueAt) return Number.POSITIVE_INFINITY
  const value = new Date(task.dueAt.replace(' ', 'T')).getTime()
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

export function isTaskOverdue(task, now = new Date()) {
  return Boolean(task?.status === 'pending' && task.dueAt && taskTimestamp(task) < now.getTime())
}

export function matchesWorkItem(workId, student) {
  switch (workId) {
    case 'pending_add':
      return student.stage === STUDENT_STAGES.PENDING_ADD
    case 'pending_booking':
      return [STUDENT_STAGES.ADDED, STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.CANCELLED].includes(student.stage)
    case 'pending_visit':
      return student.stage === STUDENT_STAGES.PENDING_VISIT
    case 'pending_paper':
      return student.stage === STUDENT_STAGES.VISITED
    case 'pending_level':
      return student.stage === STUDENT_STAGES.PENDING_LEVEL
    case 'pending_enrollment':
      return student.stage === STUDENT_STAGES.ADAPTED_NOT_CONVERTED
    default:
      return false
  }
}

export function studentWorkDeadline(workId, student, task) {
  if (workId === 'pending_visit' && student.appointment?.date) {
    return `${student.appointment.date} ${student.appointment.time || '00:00'}`
  }
  return task?.dueAt || ''
}
