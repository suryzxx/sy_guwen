<template>
  <AppShell title="消息通知" subtitle="企业微信消息跳转入口">
    <div class="narrow-page">
      <section class="panel">
        <div class="panel-header">
          <h2>通知列表</h2>
          <span class="muted-text">{{ store.unreadCount }} 条未读</span>
        </div>

        <button
          v-for="item in store.notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.read }"
          type="button"
          @click="openNotification(item)"
        >
          <span>{{ item.title }}</span>
          <strong>{{ item.content }}</strong>
          <em>{{ item.time }}</em>
        </button>

        <div v-if="!store.notifications.length" class="empty-state">暂无通知</div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'

const router = useRouter()
const store = useWorkbenchStore()

onMounted(async () => {
  if (!store.notifications.length) await store.bootstrap()
})

function openNotification(item) {
  store.markNotificationRead(item.id)
  if (item.orderId) router.push(`/orders/${item.orderId}`)
  if (item.studentId) router.push(`/students/${item.studentId}`)
}
</script>
