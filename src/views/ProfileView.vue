<template>
  <AppShell>
    <div class="narrow-page">
      <section class="profile-hero">
        <img class="profile-avatar" :src="profileAvatar" alt="顾问头像" />
        <div>
          <h2>{{ user?.name || '张顾问' }}</h2>
          <p>{{ user?.campus || '五台山校区' }}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>数据面板</h2>
          <router-link class="panel-link" to="/data-panel">查看更多</router-link>
        </div>
        <div class="stats-grid compact">
          <div class="stat-card">
            <span>线索总数</span>
            <strong>{{ leadCount }}</strong>
          </div>
          <div class="stat-card">
            <span>待推送订单</span>
            <strong>{{ pendingOrderCount }}</strong>
          </div>
          <div class="stat-card">
            <span>未读通知</span>
            <strong>{{ store.unreadCount }}</strong>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>个人信息</h2>
        </div>
        <div class="readonly-form">
          <div v-for="field in profileFields" :key="field.label" class="readonly-field">
            <span class="required-label">{{ field.label }}</span>
            <div class="readonly-value">{{ field.value }}</div>
          </div>

          <div class="readonly-field">
            <span>头像</span>
            <div class="readonly-image-box">
              <img :src="profileAvatar" alt="顾问头像" />
            </div>
          </div>

          <div class="readonly-field">
            <span>宣传海报</span>
            <div class="poster-preview" aria-label="宣传海报预览">
              <div class="poster-card">
                <div class="poster-avatar"></div>
                <div class="poster-lines">
                  <i></i>
                  <i></i>
                </div>
                <div class="poster-qr">
                  <b v-for="index in 25" :key="index"></b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppShell from '../components/AppShell.vue'
import profileAvatar from '../assets/avatar.png'
import { useWorkbenchStore } from '../stores/workbench'

const store = useWorkbenchStore()
const { user } = storeToRefs(store)

onMounted(async () => {
  if (!store.user) await store.bootstrap()
})

const pendingOrderCount = computed(() => store.orders.filter((item) => item.status === 'pending').length)
const leadCount = computed(() => store.students.filter((item) => item.primaryType === 'lead').length)
const profileFields = computed(() => [
  { label: '员工姓名', value: user.value?.name || '规划师Ella' },
  { label: '联系电话', value: user.value?.phone || '18756093437' },
  { label: '性别', value: user.value?.gender || '女' },
  { label: '所属地区', value: user.value?.region || '江苏省 / 南京市 / 鼓楼区' },
  { label: '所属校区', value: user.value?.campus || '辰龙尚悦中心' },
  { label: '用户职位', value: user.value?.roleName || '学习规划师' }
])
</script>
