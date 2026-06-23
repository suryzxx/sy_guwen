<template>
  <article v-if="compactTodo" class="student-card todo-student-card" @click="$emit('select', student)">
    <div>
      <strong>{{ student.name }}</strong>
      <span>{{ student.phone }}</span>
    </div>
    <span class="chevron">
      <AppIcon name="chevron-right" />
    </span>
  </article>

  <article v-else class="student-card" :class="{ active }" @click="$emit('select', student)">
    <div class="card-title-row">
      <div class="student-card-heading">
        <img v-if="avatarSrc" class="student-card-avatar" :src="avatarSrc" :alt="`${student.name}头像`" />
        <span v-else class="student-card-avatar avatar-fallback">{{ student.name.slice(0, 1) }}</span>
      </div>
      <div class="student-card-copy">
        <strong>{{ student.name }}</strong>
        <span>{{ student.currentGrade }} · {{ student.campus }}</span>
        <span>{{ student.phone }}</span>
      </div>
      <span class="chevron">
        <AppIcon name="chevron-right" />
      </span>
    </div>
    <div v-if="task" class="student-task-row">
      <div>
        <span>当前待办</span>
        <strong>{{ task.title }}</strong>
      </div>
      <span class="task-deadline">
        截止 {{ compactDeadline }}
      </span>
    </div>
    <div class="student-card-meta">
      <span>{{ stageLabel(student.stage) }}</span>
      <span v-if="student.stageEnteredAt">停留 {{ stageDuration }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { stageLabel } from '../../shared/student-workflow.js'

const props = defineProps({
  student: { type: Object, required: true },
  task: { type: Object, default: null },
  active: { type: Boolean, default: false },
  compactTodo: { type: Boolean, default: false },
  todoLabel: { type: String, default: '' }
})

defineEmits(['select'])

const compactDeadline = computed(() => {
  if (!props.task?.dueAt) return '未设置'
  return props.task.dueAt.slice(5)
})

const avatarSrc = computed(() => {
  if (!props.student.avatar) return ''
  return `${import.meta.env.BASE_URL}${props.student.avatar.replace(/^\/+/, '')}`
})

const stageDuration = computed(() => {
  if (!props.student.stageEnteredAt) return '未知'
  const startedAt = new Date(props.student.stageEnteredAt.replace(' ', 'T')).getTime()
  if (!Number.isFinite(startedAt)) return '未知'
  const hours = Math.max(0, Math.floor((Date.now() - startedAt) / 3_600_000))
  if (hours < 24) return `${hours}小时`
  return `${Math.floor(hours / 24)}天`
})
</script>
