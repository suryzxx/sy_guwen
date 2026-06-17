<template>
  <AppShell>
    <div class="narrow-page">
      <section v-if="order" class="status-panel" :class="`order-${order.status}`">
        <h2>{{ statusTitle }}</h2>
        <p>{{ statusDesc }}</p>
      </section>

      <template v-if="order">
        <section class="panel">
          <div class="panel-header"><h2>班级信息</h2></div>
          <div class="summary-row"><span>班级</span><strong>{{ order.className }}</strong></div>
          <div class="summary-row"><span>课程类型</span><strong>{{ order.courseType }}</strong></div>
          <div class="summary-row"><span>上课时间</span><strong>{{ order.schedule }}</strong></div>
          <div class="summary-row"><span>上课地点</span><strong>{{ order.location }}</strong></div>
          <div class="summary-row"><span>主教老师</span><strong>{{ order.teacher }}</strong></div>
          <div class="summary-row"><span>报名学生</span><strong>{{ order.studentName }}</strong></div>
        </section>

        <section class="panel">
          <div class="panel-header"><h2>费用信息</h2></div>
          <div class="summary-row"><span>课程费用</span><strong>¥{{ order.coursePrice }}</strong></div>
          <div class="summary-row"><span>教辅费</span><strong>¥{{ order.materialPrice }}</strong></div>
          <div class="summary-total"><span>合计</span><strong>¥{{ order.totalPrice }}</strong></div>
        </section>

        <section class="panel">
          <div class="panel-header"><h2>订单信息</h2></div>
          <div class="summary-row"><span>订单编号</span><strong>{{ order.orderNo }}</strong></div>
          <div class="summary-row"><span>创建时间</span><strong>{{ order.createTime }}</strong></div>
          <div v-if="order.pushTime" class="summary-row"><span>推送时间</span><strong>{{ order.pushTime }}</strong></div>
          <div v-if="order.payTime" class="summary-row"><span>支付时间</span><strong>{{ order.payTime }}</strong></div>
        </section>

        <div class="fixed-action">
          <button v-if="order.status === 'pending'" class="primary-button" type="button" @click="push">
            推送给家长 ¥{{ order.totalPrice }}
          </button>
          <button v-else class="secondary-button full" type="button" @click="$router.push('/notifications')">查看通知</button>
        </div>
      </template>

      <div v-else class="placeholder-panel">订单不存在</div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'

const route = useRoute()
const store = useWorkbenchStore()

onMounted(async () => {
  if (!store.orders.length) await store.bootstrap()
})

const order = computed(() => store.orderById(route.params.id))
const statusTitle = computed(() => ({ pending: '待推送', pushed: '等待家长支付', paid: '家长已支付' }[order.value?.status] || '订单处理中'))
const statusDesc = computed(() => {
  if (order.value?.status === 'pending') return '顾问确认后推送给家长，家长将在微信小程序完成支付。'
  if (order.value?.status === 'pushed') return '订单已推送给家长，支付状态由统一后端回传。'
  return '企业微信已通知顾问支付完成。'
})

async function push() {
  await store.sendOrder(order.value.id)
  showToast('订单已推送给家长')
}
</script>
