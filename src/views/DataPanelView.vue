<template>
  <AppShell>
    <div class="narrow-page data-page">
      <button class="back-button data-page-back" type="button" @click="router.push('/workbench')">
        <AppIcon name="chevron-left" />
        返回首页
      </button>

      <section class="panel data-period-panel">
        <div class="period-tabs" aria-label="时间维度">
          <button
            v-for="item in periodTypes"
            :key="item.value"
            type="button"
            :class="{ active: periodType === item.value }"
            @click="setPeriodType(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="period-switcher">
          <button type="button" aria-label="上一个周期" @click="periodOffset -= 1">
            <AppIcon name="chevron-left" />
          </button>
          <strong>{{ periodLabel }}</strong>
          <button type="button" aria-label="下一个周期" @click="periodOffset += 1">
            <AppIcon name="chevron-right" />
          </button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>金额统计</h2>
          <span class="muted-text">{{ periodRangeLabel }}</span>
        </div>
        <div class="amount-grid">
          <article v-for="item in amountMetrics" :key="item.label" class="amount-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.count }} 单</em>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>链路漏斗</h2>
          <span class="muted-text">从线索到入班</span>
        </div>
        <div class="funnel-list">
          <article v-for="item in funnelMetrics" :key="item.label" class="funnel-row">
            <div>
              <strong>{{ item.label }}</strong>
              <span>{{ item.hint }}</span>
            </div>
            <em>{{ item.count }}</em>
            <i :style="{ width: item.width }"></i>
          </article>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'
import { STUDENT_STAGES } from '../../shared/student-workflow.js'

const store = useWorkbenchStore()
const router = useRouter()
const periodType = ref('week')
const periodOffset = ref(0)
const periodTypes = [
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' }
]

onMounted(async () => {
  if (!store.user) await store.bootstrap()
})

const periodRange = computed(() => getPeriodRange(periodType.value, periodOffset.value))
const periodLabel = computed(() => formatPeriodLabel(periodType.value, periodRange.value.start))
const periodRangeLabel = computed(() => `${formatDate(periodRange.value.start)} - ${formatDate(addDays(periodRange.value.end, -1))}`)

const periodOrders = computed(() => store.orders.filter((order) => isInPeriod(orderDate(order), periodRange.value)))
const amountMetrics = computed(() => {
  const sourceOrders = periodOrders.value.length ? periodOrders.value : mockOrders.value
  const pendingOrders = sourceOrders.filter((order) => order.status === 'pending')
  const pushedOrders = sourceOrders.filter((order) => order.status === 'pushed')
  const paidOrders = sourceOrders.filter((order) => order.status === 'paid')
  return [
    { label: '总金额', value: money(sourceOrders), count: sourceOrders.length },
    { label: '待报名', value: money(pendingOrders), count: pendingOrders.length },
    { label: '待支付', value: money(pushedOrders), count: pushedOrders.length },
    { label: '已支付', value: money(paidOrders), count: paidOrders.length }
  ]
})

const mockOrders = computed(() => {
  const seed = periodRange.value.start.getFullYear() + periodRange.value.start.getMonth() + periodRange.value.start.getDate()
  return [
    { status: 'pending', totalPrice: 3680 + (seed % 3) * 300 },
    { status: 'pending', totalPrice: 3980 },
    { status: 'pushed', totalPrice: 4280 + (seed % 2) * 200 },
    { status: 'paid', totalPrice: 4680 },
    { status: 'paid', totalPrice: 5280 }
  ]
})

const periodStudents = computed(() => store.students.filter((student) => isInPeriod(parseDate(student.stageEnteredAt), periodRange.value)))
const funnelMetrics = computed(() => {
  const rows = [
    { label: '待添加', hint: '待添加家长企微', stages: [STUDENT_STAGES.PENDING_ADD] },
    { label: '待约测', hint: '已加企微，待预约评测', stages: [STUDENT_STAGES.ADDED, STUDENT_STAGES.PENDING_ACTIVATION, STUDENT_STAGES.CANCELLED] },
    { label: '待到访', hint: '已预约，待签到', stages: [STUDENT_STAGES.PENDING_VISIT] },
    { label: '待分配试卷', hint: '已签到，待分配试卷', stages: [STUDENT_STAGES.VISITED] },
    { label: '待定级', hint: '已测试，待定级', stages: [STUDENT_STAGES.PENDING_LEVEL, STUDENT_STAGES.ASSESSED] },
    { label: '待报名', hint: '已定级，待报名支付', stages: [STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED] },
    { label: '进入班级', hint: '报名入班', stages: [STUDENT_STAGES.ENROLLED_STUDENT] }
  ].map((item) => ({
    ...item,
    count: periodStudents.value.filter((student) => item.stages.includes(student.stage)).length
  }))
  const max = Math.max(...rows.map((item) => item.count), 1)
  return rows.map((item) => ({
    ...item,
    width: `${Math.max(8, Math.round((item.count / max) * 100))}%`
  }))
})

function setPeriodType(value) {
  periodType.value = value
  periodOffset.value = 0
}

function getPeriodRange(type, offset) {
  const now = new Date()
  if (type === 'year') {
    const start = new Date(now.getFullYear() + offset, 0, 1)
    return { start, end: new Date(start.getFullYear() + 1, 0, 1) }
  }
  if (type === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) }
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = today.getDay() || 7
  const start = addDays(today, 1 - day + offset * 7)
  return { start, end: addDays(start, 7) }
}

function formatPeriodLabel(type, start) {
  if (type === 'year') return `${start.getFullYear()}年`
  if (type === 'month') return `${start.getFullYear()}年${start.getMonth() + 1}月`
  return `${formatDate(start)} 本周`
}

function orderDate(order) {
  if (order.status === 'paid') return parseDate(order.payTime || order.pushTime || order.createTime)
  if (order.status === 'pushed') return parseDate(order.pushTime || order.createTime)
  return parseDate(order.createTime)
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isFinite(date.getTime()) ? date : null
}

function isInPeriod(date, range) {
  return Boolean(date && date >= range.start && date < range.end)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function money(orders) {
  const total = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
  return `¥${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}`
}
</script>
