<template>
  <article class="student-card" :class="{ active }" @click="$emit('select', student)">
    <div class="card-title-row">
      <div>
        <strong>{{ student.name }}</strong>
        <span>{{ student.currentGrade }} · {{ student.campus }}</span>
      </div>
      <span class="chevron">›</span>
    </div>
    <div class="muted-line">{{ student.phone }} · {{ student.school }}</div>
    <div v-if="student.appointment?.date && student.appointment.date !== '-'" class="muted-line">
      {{ student.appointment.date }} {{ student.appointment.time }} · {{ student.appointment.teacher }}
    </div>
    <div v-if="student.className" class="muted-line">班级：{{ student.className }}</div>
    <div class="card-meta">
      <span class="status-pill" :class="statusClass">{{ statusText }}</span>
      <button v-if="actionText" class="text-action" type="button" @click.stop="$emit('action', student)">
        {{ actionText }}
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  student: { type: Object, required: true },
  active: { type: Boolean, default: false },
  mode: { type: String, default: 'evaluation' }
})

defineEmits(['select', 'action'])

const statusMap = {
  pending: '待到访',
  arrived: '已到访',
  tested: '已评测',
  cancelled: '已取消',
  to_add: '待添加',
  new_resource: '已添加',
  potential: '待激活',
  history: '历史学生',
  serving: '服务中',
  active: '在读学生',
  presale: '预售学生'
}

const currentStatus = computed(() => props.student.status || props.student.leadStatus || props.student.studentStatus)
const statusText = computed(() => statusMap[currentStatus.value] || '未分类')
const statusClass = computed(() => `status-${currentStatus.value}`)
const actionText = computed(() => {
  if (props.student.status === 'pending') return '签到'
  if (props.student.status === 'arrived') return '分配试卷'
  if (props.student.status === 'tested' && props.student.evaluationResult) return '创建订单'
  if (props.student.status === 'cancelled' || props.mode !== 'evaluation') return '联系客户'
  return ''
})
</script>
