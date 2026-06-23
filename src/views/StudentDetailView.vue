<template>
  <AppShell>
    <div class="student-detail-page">
      <button class="back-button student-detail-back" type="button" @click="goBack">
        <AppIcon name="chevron-left" />
        返回
      </button>
      <StudentDetailContent :student-id="$route.params.id" @create-order="goCreateOrder" />
    </div>
  </AppShell>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import AppIcon from '../components/AppIcon.vue'
import StudentDetailContent from './parts/StudentDetailContent.vue'

const router = useRouter()
const route = useRoute()

function goBack() {
  router.push({ path: '/workbench', query: { work: route.query.work || 'pending_add' } })
}

function goCreateOrder(studentId) {
  router.push({ path: '/enrollment', query: { studentId } })
}
</script>
