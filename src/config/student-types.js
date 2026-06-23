import { STAGE_GROUPS, STAGE_META, SERVICE_STATUSES, stagesByGroup } from '../../shared/student-workflow.js'

export const labels = {
  primaryTabs: STAGE_GROUPS,
  stages: Object.entries(STAGE_META).map(([value, meta]) => ({ value, label: meta.label })),
  serviceStatuses: [
    { value: SERVICE_STATUSES.NOT_STARTED, label: '未开始' },
    { value: SERVICE_STATUSES.PENDING_PAYMENT, label: '待支付' },
    { value: SERVICE_STATUSES.ACTIVE, label: '在读中' },
    { value: SERVICE_STATUSES.COMPLETED, label: '已结课' },
    { value: SERVICE_STATUSES.REFUNDED, label: '已退费' }
  ]
}

for (const group of STAGE_GROUPS) {
  labels[group.value] = stagesByGroup(group.value)
}
