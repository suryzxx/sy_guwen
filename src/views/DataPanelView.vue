<template>
  <AppShell>
    <div class="narrow-page">
      <section class="panel">
        <div class="panel-header">
          <h2>数据概览</h2>
          <span class="muted-text">模拟数据</span>
        </div>
        <div class="metric-grid">
          <div v-for="item in overviewMetrics" :key="item.label" class="metric-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.hint }}</em>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>学生进度</h2>
        </div>
        <div class="metric-grid">
          <div v-for="item in studentMetrics" :key="item.label" class="metric-card soft">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>订单状态</h2>
        </div>
        <div class="metric-grid">
          <div v-for="item in orderMetrics" :key="item.label" class="metric-card soft">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'
import { STAGE_META, STUDENT_STAGES } from '../../shared/student-workflow.js'

const store = useWorkbenchStore()

onMounted(async () => {
  if (!store.user) await store.bootstrap()
})

const evaluationCount = computed(() => store.students.filter((item) => STAGE_META[item.stage]?.group === 'assessment').length)
const leadResourceCount = computed(() => store.students.filter((item) => STAGE_META[item.stage]?.group === 'lead_resource').length)
const activeStudentCount = computed(() => store.students.filter((item) => item.stage === STUDENT_STAGES.ENROLLED_STUDENT).length)
const pendingOrderCount = computed(() => store.orders.filter((item) => item.status === 'pending').length)
const pushedOrderCount = computed(() => store.orders.filter((item) => item.status === 'pushed').length)
const paidOrderCount = computed(() => store.orders.filter((item) => item.status === 'paid').length)
const adaptedCount = computed(() => store.students.filter((item) => item.stage === STUDENT_STAGES.ADAPTED_NOT_CONVERTED).length)

const overviewMetrics = computed(() => [
  { label: '线索资源', value: leadResourceCount.value, hint: '待添加、已添加、待激活、历史学生' },
  { label: '可报名学生', value: adaptedCount.value, hint: '适配未转化' },
  { label: '未读通知', value: store.unreadCount, hint: '企微消息提醒' },
  { label: '订单总数', value: store.orders.length, hint: '已创建报名订单' }
])

const studentMetrics = computed(() => [
  { label: '线索资源', value: leadResourceCount.value },
  { label: '评测学生', value: evaluationCount.value },
  { label: '在读学生', value: activeStudentCount.value },
  { label: '适配未转化', value: adaptedCount.value },
  { label: '待到访', value: store.students.filter((item) => item.stage === STUDENT_STAGES.PENDING_VISIT).length },
  { label: '已取消', value: store.students.filter((item) => item.stage === STUDENT_STAGES.CANCELLED).length }
])

const orderMetrics = computed(() => [
  { label: '待推送', value: pendingOrderCount.value },
  { label: '等待支付', value: pushedOrderCount.value },
  { label: '已支付', value: paidOrderCount.value },
  { label: '订单总数', value: store.orders.length }
])
</script>
