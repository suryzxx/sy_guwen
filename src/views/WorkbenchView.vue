<template>
  <AppShell>
    <section v-if="!activeWork" class="home-dashboard">
      <section class="home-card reminder-card">
        <button class="home-card-title" type="button" @click="openWork('pending_add')">
          <strong>今日待办</strong>
          <span>共 {{ totalTodoCount }} 项待处理</span>
          <AppIcon name="chevron-right" />
        </button>
        <div class="reminder-grid">
          <button v-for="item in todoStats" :key="item.id" type="button" @click="openWork(item.id)">
            <span>{{ item.title }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </div>
      </section>

      <button class="home-card data-card" type="button" @click="router.push('/data-panel')">
        <strong>数据统计</strong>
        <span>未回款金额 <em>¥{{ unpaidAmount }}</em></span>
        <AppIcon name="chevron-right" />
      </button>

      <section class="home-card recent-card">
        <button class="home-card-title recent-title" type="button" @click="openWork('all_students')">
          <strong>最近操作</strong>
          <span>查看全部学生</span>
          <AppIcon name="chevron-right" />
        </button>
        <button
          v-for="(item, index) in recentOperations"
          :key="item.id"
          class="recent-row"
          type="button"
          @click="selectStudent(item.student)"
        >
          <img
            v-if="avatarSrc(item.student)"
            class="recent-avatar image-avatar"
            :src="avatarSrc(item.student)"
            :alt="`${item.student.name}头像`"
          />
          <span v-else class="recent-avatar" :class="`avatar-tone-${index % 5}`">{{ item.student.name.slice(0, 1) }}</span>
          <span class="recent-copy">
            <strong>{{ item.student.name }}</strong>
            <small>{{ item.content }}</small>
          </span>
          <time>{{ relativeTime(item.time) }}</time>
        </button>
        <div v-if="!recentOperations.length" class="recent-empty">暂无最近操作</div>
      </section>
    </section>

    <div v-else class="todo-workspace">
      <section class="list-pane">
        <button class="back-button todo-workspace-back" type="button" @click="backToWorkOverview">
          <AppIcon name="chevron-left" />
          返回
        </button>
        <section class="home-card todo-filter-card">
          <div class="reminder-grid">
            <button
              v-for="item in todoStats"
              :key="item.id"
              type="button"
              :class="{ active: activeWorkId === item.id }"
              @click="openWork(item.id)"
            >
              <span>{{ item.title }}</span>
              <strong>{{ item.count }}</strong>
            </button>
          </div>
        </section>

        <div class="student-list">
          <StudentCard
            v-for="student in filteredStudents"
            :key="student.id"
            :student="student"
            :task="taskForStudent(student.id)"
            :todo-label="activeWork.title"
            compact-todo
            @select="selectStudent"
          />
          <div v-if="!filteredStudents.length" class="empty-state work-list-empty">
            这项工作已经处理完成
          </div>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import AppShell from '../components/AppShell.vue'
import StudentCard from '../components/StudentCard.vue'
import {
  TODAY_WORK_ITEMS,
  matchesWorkItem,
  pendingTaskFor,
  studentWorkDeadline,
  taskTimestamp
} from '../config/today-work'
import { useWorkbenchStore } from '../stores/workbench'

const router = useRouter()
const route = useRoute()
const store = useWorkbenchStore()
const activeWorkId = ref('')
const selectedId = ref('')
const now = new Date()
const allStudentsWorkItem = {
  id: 'all_students',
  title: '全部学生',
  description: '按姓名或手机号查询全部学生'
}

onMounted(async () => {
  if (!store.students.length) await store.bootstrap()
  if (route.query.work) openWork(String(route.query.work))
  if (route.query.view === 'all') openWork('all_students')
})

const activeWork = computed(() => (
  activeWorkId.value === allStudentsWorkItem.id
    ? allStudentsWorkItem
    : TODAY_WORK_ITEMS.find((item) => item.id === activeWorkId.value)
))

const workCards = computed(() => TODAY_WORK_ITEMS.map((item) => {
  const students = store.students.filter((student) => matchesWorkItem(item.id, student, tasksForStudent(student.id), now))
  const deadlines = students
    .map((student) => studentWorkDeadline(item.id, student, taskForStudent(student.id)))
    .filter(Boolean)
    .sort()
  return {
    ...item,
    count: students.length,
    earliestDue: deadlines[0] || ''
  }
}))

const todoStats = computed(() => workCards.value)
const totalTodoCount = computed(() => todoStats.value.reduce((sum, item) => sum + item.count, 0))

const unpaidAmount = computed(() => new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(store.orders
  .filter((order) => order.status !== 'paid')
  .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)))

const recentOperations = computed(() => Object.entries(store.trackRecords)
  .flatMap(([studentId, records]) => {
    const student = store.studentById(studentId)
    return student ? records.map((record) => ({ ...record, student })) : []
  })
  .sort((left, right) => right.time.localeCompare(left.time))
  .slice(0, 5))

const filteredStudents = computed(() => {
  if (!activeWork.value) return []
  return store.students
    .filter((student) => activeWork.value.id === 'all_students' || matchesWorkItem(activeWork.value.id, student, tasksForStudent(student.id), now))
    .sort(compareStudents)
})

watch(filteredStudents, (students) => {
  if (!students.some((student) => student.id === selectedId.value)) {
    selectedId.value = students[0]?.id || ''
  }
})

watch(() => route.query.view, (view) => {
  if (view === 'all') openWork('all_students')
  else if (activeWorkId.value === 'all_students') backToWorkOverview()
})

watch(() => route.query.work, (workId) => {
  if (workId) openWork(String(workId))
})

function tasksForStudent(studentId) {
  return store.studentTasks[studentId] || []
}

function taskForStudent(studentId) {
  return pendingTaskFor(tasksForStudent(studentId))
}

function compareStudents(left, right) {
  const leftTask = taskForStudent(left.id)
  const rightTask = taskForStudent(right.id)
  const dueDifference = taskTimestamp(leftTask) - taskTimestamp(rightTask)
  if (Number.isFinite(dueDifference) && dueDifference) return dueDifference
  return (left.stageEnteredAt || '').localeCompare(right.stageEnteredAt || '')
}

function openWork(workId) {
  activeWorkId.value = workId
  selectedId.value = filteredStudents.value[0]?.id || ''
}

function backToWorkOverview() {
  activeWorkId.value = ''
  selectedId.value = ''
  if (route.query.view) router.replace('/workbench')
}

function selectStudent(student) {
  selectedId.value = student.id
  router.push({
    path: `/students/${student.id}`,
    query: activeWorkId.value ? { from: 'todo', work: activeWorkId.value } : {}
  })
}

function avatarSrc(student) {
  if (!student?.avatar) return ''
  return `${import.meta.env.BASE_URL}${student.avatar.replace(/^\/+/, '')}`
}

function relativeTime(value) {
  const timestamp = new Date(value.replace(' ', 'T')).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}天前` : value.slice(5, 10)
}

</script>
