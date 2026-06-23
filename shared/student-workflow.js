export const STUDENT_STAGES = {
  PENDING_ADD: 'pending_add',
  ADDED: 'added',
  PENDING_ACTIVATION: 'pending_activation',
  HISTORICAL_STUDENT: 'historical_student',
  PENDING_VISIT: 'pending_visit',
  CANCELLED: 'cancelled',
  VISITED: 'visited',
  PENDING_LEVEL: 'pending_level',
  ASSESSED: 'assessed',
  ADAPTED_NOT_CONVERTED: 'adapted_not_converted',
  NOT_ADAPTED: 'not_adapted',
  ENROLLED_STUDENT: 'enrolled_student'
}

export const SERVICE_STATUSES = {
  NOT_STARTED: 'not_started',
  PENDING_PAYMENT: 'pending_payment',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  REFUNDED: 'refunded'
}

export const STAGE_META = {
  [STUDENT_STAGES.PENDING_ADD]: {
    label: '待添加',
    group: 'lead_resource',
    description: '已授权手机号，未加企微',
    taskTitle: '添加家长企微',
    dueHours: 24
  },
  [STUDENT_STAGES.ADDED]: {
    label: '已添加',
    group: 'lead_resource',
    description: '已加企微，3个月内有效活跃资源，未约测',
    taskTitle: '沟通学生情况并邀约评测',
    dueHours: 72
  },
  [STUDENT_STAGES.PENDING_ACTIVATION]: {
    label: '待激活',
    group: 'lead_resource',
    description: '180天内无约测动作，自动转待激活状态',
    taskTitle: '重新触达家长并判断是否激活',
    dueHours: 72
  },
  [STUDENT_STAGES.HISTORICAL_STUDENT]: {
    label: '历史学生',
    group: 'lead_resource',
    description: '已结课或退费'
  },
  [STUDENT_STAGES.PENDING_VISIT]: {
    label: '待到访',
    group: 'assessment',
    description: '已预约，未签到',
    taskTitle: '确认评测到访',
    dueHours: 24,
    useAppointmentDue: true
  },
  [STUDENT_STAGES.CANCELLED]: {
    label: '已取消',
    group: 'assessment',
    description: '取消预约，需回访',
    taskTitle: '回访取消预约家长',
    dueHours: 24
  },
  [STUDENT_STAGES.VISITED]: {
    label: '已到访',
    group: 'assessment',
    description: '已签到，分配试卷',
    taskTitle: '跟进测试或试听完成情况',
    dueHours: 24
  },
  [STUDENT_STAGES.PENDING_LEVEL]: {
    label: '待定级',
    group: 'assessment',
    description: '已完成测试或试听，需要录入等级和适配结果',
    taskTitle: '录入评测等级和适配结果',
    dueHours: 24
  },
  [STUDENT_STAGES.ASSESSED]: {
    label: '已评测',
    group: 'assessment',
    description: '已到访，且完成测试或试听',
    taskTitle: '判断适配结果',
    dueHours: 24
  },
  [STUDENT_STAGES.ADAPTED_NOT_CONVERTED]: {
    label: '适配未转化',
    group: 'assessment',
    description: '评测达标、未报名，需要强跟进',
    taskTitle: '跟进适配班级和报名意向',
    dueHours: 24
  },
  [STUDENT_STAGES.NOT_ADAPTED]: {
    label: '无适配',
    group: 'assessment',
    description: '评测不达标，没有适配班级可以报名'
  },
  [STUDENT_STAGES.ENROLLED_STUDENT]: {
    label: '在读学生',
    group: 'enrolled',
    description: '正常报名入班上课的学生'
  }
}

export const STAGE_GROUPS = [
  { value: 'lead_resource', label: '线索资源' },
  { value: 'assessment', label: '评测状态' },
  { value: 'enrolled', label: '在读学员' }
]

export const STAGE_TRANSITIONS = {
  [STUDENT_STAGES.PENDING_ADD]: [STUDENT_STAGES.ADDED, STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.HISTORICAL_STUDENT],
  [STUDENT_STAGES.ADDED]: [STUDENT_STAGES.PENDING_VISIT, STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.HISTORICAL_STUDENT],
  [STUDENT_STAGES.PENDING_ACTIVATION]: [STUDENT_STAGES.ADDED, STUDENT_STAGES.PENDING_VISIT, STUDENT_STAGES.HISTORICAL_STUDENT],
  [STUDENT_STAGES.HISTORICAL_STUDENT]: [STUDENT_STAGES.ADDED],
  [STUDENT_STAGES.PENDING_VISIT]: [STUDENT_STAGES.CANCELLED, STUDENT_STAGES.VISITED],
  [STUDENT_STAGES.CANCELLED]: [STUDENT_STAGES.ADDED, STUDENT_STAGES.PENDING_VISIT, STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.HISTORICAL_STUDENT],
  [STUDENT_STAGES.VISITED]: [STUDENT_STAGES.PENDING_LEVEL],
  [STUDENT_STAGES.PENDING_LEVEL]: [STUDENT_STAGES.ASSESSED],
  [STUDENT_STAGES.ASSESSED]: [STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED],
  [STUDENT_STAGES.ADAPTED_NOT_CONVERTED]: [STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.HISTORICAL_STUDENT],
  [STUDENT_STAGES.NOT_ADAPTED]: [STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.HISTORICAL_STUDENT],
  [STUDENT_STAGES.ENROLLED_STUDENT]: [STUDENT_STAGES.HISTORICAL_STUDENT]
}

export const LEGACY_STAGE_MAP = {
  awaiting_parent_add: STUDENT_STAGES.PENDING_ADD,
  added_pending_contact: STUDENT_STAGES.ADDED,
  pending_assessment_booking: STUDENT_STAGES.ADDED,
  pending_visit: STUDENT_STAGES.PENDING_VISIT,
  visited_pending_result: STUDENT_STAGES.VISITED,
  assessed_pending_class: STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
  order_pending_push: STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
  pending_payment: STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
  in_service: STUDENT_STAGES.ENROLLED_STUDENT,
  cancelled_assessment: STUDENT_STAGES.CANCELLED,
  follow_up_paused: STUDENT_STAGES.PENDING_ACTIVATION,
  unreachable: STUDENT_STAGES.PENDING_ACTIVATION,
  closed: STUDENT_STAGES.HISTORICAL_STUDENT,
  to_add: STUDENT_STAGES.PENDING_ADD,
  new_resource: STUDENT_STAGES.ADDED,
  potential: STUDENT_STAGES.ADDED,
  history: STUDENT_STAGES.HISTORICAL_STUDENT,
  pending: STUDENT_STAGES.PENDING_VISIT,
  arrived: STUDENT_STAGES.VISITED,
  tested: STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
  cancelled: STUDENT_STAGES.CANCELLED,
  presale: STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
  serving: STUDENT_STAGES.ENROLLED_STUDENT,
  active: STUDENT_STAGES.ENROLLED_STUDENT
}

export const SYSTEM_CONTROLLED_STAGES = new Set([
  STUDENT_STAGES.ASSESSED,
  STUDENT_STAGES.ENROLLED_STUDENT
])

export function isStudentStage(value) {
  return Boolean(STAGE_META[value])
}

export function normalizeStudentStage(value, fallback = STUDENT_STAGES.PENDING_ADD) {
  if (isStudentStage(value)) return value
  return LEGACY_STAGE_MAP[value] || fallback
}

export function canTransitionStage(fromStage, toStage) {
  return fromStage === toStage || Boolean(STAGE_TRANSITIONS[fromStage]?.includes(toStage))
}

export function stageLabel(stage) {
  return STAGE_META[stage]?.label || '未分类'
}

export function stagesByGroup(group) {
  return Object.entries(STAGE_META)
    .filter(([, meta]) => meta.group === group)
    .map(([value, meta]) => ({ value, label: meta.label }))
}
