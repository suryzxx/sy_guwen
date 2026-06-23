<template>
  <AppShell>
    <div class="narrow-page profile-page">
      <section class="profile-hero">
        <img class="profile-avatar" :src="profileAvatar" alt="规划师头像" />
        <div>
          <h2>{{ user?.name || '规划师Ella' }}</h2>
          <p>{{ user?.campus || '五台山校区' }}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>个人信息</h2>
        </div>
        <div class="profile-info-list">
          <div v-for="field in profileFields" :key="field.label" class="profile-info-row">
            <span>{{ field.label }}</span>
            <strong>{{ field.value }}</strong>
          </div>

          <div class="profile-info-row profile-info-media">
            <span>头像</span>
            <div class="profile-image-box">
              <img :src="profileAvatar" alt="规划师头像" />
            </div>
          </div>

          <div class="profile-info-row profile-info-media">
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

const profileFields = computed(() => [
  { label: '员工姓名', value: user.value?.name || '规划师Ella' },
  { label: '联系电话', value: user.value?.phone || '18756093437' },
  { label: '性别', value: user.value?.gender || '女' },
  { label: '所属地区', value: user.value?.region || '江苏省 / 南京市 / 鼓楼区' },
  { label: '所属校区', value: user.value?.campus || '辰龙尚悦中心' },
  { label: '用户职位', value: user.value?.roleName || '学习规划师' }
])
</script>
