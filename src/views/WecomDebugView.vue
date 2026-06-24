<template>
  <AppShell>
    <div class="narrow-page wecom-debug-page">
      <button class="back-button" type="button" @click="router.push('/workbench')">
        <AppIcon name="chevron-left" />
        返回首页
      </button>

      <WecomDebugPanel />
    </div>
  </AppShell>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import AppShell from '../components/AppShell.vue'
import WecomDebugPanel from '../components/WecomDebugPanel.vue'

const router = useRouter()
</script>
