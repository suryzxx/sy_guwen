<template>
  <div class="app-shell">
    <aside class="side-nav">
      <div class="brand">
        <div class="brand-mark">思</div>
        <div>
          <strong>规划师工作台</strong>
          <span>{{ user?.campus || '企业微信 H5' }}</span>
        </div>
      </div>

      <router-link v-for="item in navItems" :key="item.to" class="nav-item" :to="item.to">
        <span class="nav-icon">
          <AppIcon :name="item.icon" />
        </span>
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </router-link>
    </aside>

    <main class="shell-main">
      <slot />
    </main>

    <nav class="bottom-nav">
      <router-link
        v-for="item in mobileItems"
        :key="item.label"
        class="bottom-nav-item"
        :class="{ active: item.active }"
        :to="item.to"
      >
        <span class="bottom-nav-icon">
          <AppIcon :name="item.icon" />
          <span v-if="item.badge" class="bottom-nav-badge">{{ item.badge }}</span>
        </span>
        <strong>{{ item.label }}</strong>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWorkbenchStore } from '../stores/workbench'
import AppIcon from './AppIcon.vue'

const store = useWorkbenchStore()
const route = useRoute()
const router = useRouter()
const { user, unreadCount } = storeToRefs(store)

const navItems = computed(() => [
  { to: '/workbench', label: '学生管理', icon: 'home' },
  { to: '/contacts', label: '通讯录', icon: 'contacts' },
  { to: '/enrollment', label: '创建订单', icon: 'order' },
  { to: '/notifications', label: '消息通知', icon: 'message', badge: unreadCount.value || '' },
  { to: '/profile', label: '个人主页', icon: 'profile' }
])

const mobileItems = computed(() => [
  { to: '/workbench', label: '首页', icon: 'home', active: route.path === '/workbench' },
  { to: '/contacts', label: '通讯录', icon: 'contacts', active: route.path === '/contacts' },
  { to: '/profile', label: '我的', icon: 'profile', active: route.path === '/profile' }
])

watch(user, async (value) => {
  if (!value) return
  const student = await store.resolveSidebarContact()
  if (student && route.name !== 'student-detail') router.replace(`/students/${student.id}`)
}, { immediate: true })
</script>
