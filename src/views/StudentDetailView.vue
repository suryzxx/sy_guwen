<template>
  <AppShell>
    <StudentDetailContent :student-id="$route.params.id" @create-order="goCreateOrder" />
  </AppShell>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import StudentDetailContent from './parts/StudentDetailContent.vue'

const router = useRouter()

function goCreateOrder(studentId) {
  router.push({ path: '/enrollment', query: { studentId } })
}
</script>
