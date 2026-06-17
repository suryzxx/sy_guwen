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
          <h2>学生与线索</h2>
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

const store = useWorkbenchStore()

onMounted(async () => {
  if (!store.user) await store.bootstrap()
})

const leadCount = computed(() => store.students.filter((item) => item.primaryType === 'lead').length)
const evaluationCount = computed(() => store.students.filter((item) => item.primaryType === 'evaluation').length)
const activeStudentCount = computed(() => store.students.filter((item) => item.primaryType === 'student').length)
const pendingOrderCount = computed(() => store.orders.filter((item) => item.status === 'pending').length)
const pushedOrderCount = computed(() => store.orders.filter((item) => item.status === 'pushed').length)
const paidOrderCount = computed(() => store.orders.filter((item) => item.status === 'paid').length)
const testedCount = computed(() => store.students.filter((item) => item.status === 'tested').length)

const overviewMetrics = computed(() => [
  { label: '线索总数', value: leadCount.value, hint: '线索资源池' },
  { label: '可报名学生', value: testedCount.value, hint: '已测评且可转订单' },
  { label: '未读通知', value: store.unreadCount, hint: '企微消息提醒' },
  { label: '订单总数', value: store.orders.length, hint: '已创建报名订单' }
])

const studentMetrics = computed(() => [
  { label: '线索资源', value: leadCount.value },
  { label: '评测学生', value: evaluationCount.value },
  { label: '在读学员', value: activeStudentCount.value },
  { label: '已测评', value: testedCount.value },
  { label: '待到访', value: store.students.filter((item) => item.status === 'pending').length },
  { label: '已取消', value: store.students.filter((item) => item.status === 'cancelled').length }
])

const orderMetrics = computed(() => [
  { label: '待推送', value: pendingOrderCount.value },
  { label: '等待支付', value: pushedOrderCount.value },
  { label: '已支付', value: paidOrderCount.value },
  { label: '订单总数', value: store.orders.length }
])
</script>
