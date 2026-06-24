<template>
  <AppShell v-if="store.showInlineWecomDebug">
    <div class="narrow-page wecom-debug-page">
      <WecomDebugPanel />
    </div>
  </AppShell>
  <router-view v-else />
</template>

<script setup>
import AppShell from './components/AppShell.vue'
import WecomDebugPanel from './components/WecomDebugPanel.vue'
import { useWorkbenchStore } from './stores/workbench'

const store = useWorkbenchStore()
</script>
