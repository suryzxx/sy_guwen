<template>
  <AppShell title="个人主页" subtitle="顾问信息与工作概览">
    <div class="narrow-page">
      <section class="profile-hero">
        <div class="profile-avatar">{{ initial }}</div>
        <div>
          <span class="eyebrow">企业微信免登录</span>
          <h2>{{ user?.name || '张顾问' }}</h2>
          <p>{{ user?.roleName || '课程顾问' }} · {{ user?.campus || '五台山校区' }}</p>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <span>今日待跟进</span>
          <strong>{{ pendingFollowCount }}</strong>
        </div>
        <div class="stat-card">
          <span>待推送订单</span>
          <strong>{{ pendingOrderCount }}</strong>
        </div>
        <div class="stat-card">
          <span>未读通知</span>
          <strong>{{ store.unreadCount }}</strong>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>工作信息</h2>
        </div>
        <div class="summary-row"><span>账号角色</span><strong>{{ user?.roleName || '课程顾问' }}</strong></div>
        <div class="summary-row"><span>所属校区</span><strong>{{ user?.campus || '五台山校区' }}</strong></div>
        <div class="summary-row"><span>当前环境</span><strong>{{ appEnvText }}</strong></div>
        <div class="summary-row"><span>数据模式</span><strong>{{ useMock ? '模拟数据' : '后端接口' }}</strong></div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>快捷入口</h2>
        </div>
        <div class="quick-actions">
          <router-link class="secondary-button" to="/workbench">学生列表</router-link>
          <router-link class="secondary-button" to="/enrollment">创建订单</router-link>
          <router-link class="secondary-button" to="/notifications">消息通知</router-link>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppShell from '../components/AppShell.vue'
import { appEnv, useMock } from '../config/env'
import { useWorkbenchStore } from '../stores/workbench'

const store = useWorkbenchStore()
const { user } = storeToRefs(store)

onMounted(async () => {
  if (!store.user) await store.bootstrap()
})

const initial = computed(() => (user.value?.name || '顾问').slice(0, 1))
const pendingOrderCount = computed(() => store.orders.filter((item) => item.status === 'pending').length)
const pendingFollowCount = computed(() => store.students.filter((item) => item.primaryType === 'lead').length)
const appEnvText = computed(() => (appEnv === 'production' ? '正式环境' : '测试环境'))
</script>
