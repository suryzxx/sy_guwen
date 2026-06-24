<template>
  <section class="panel record-panel">
    <div class="panel-header">
      <h2>跟进记录</h2>
      <button class="small-button" type="button" @click="$emit('add')">+ 录入</button>
    </div>
    <div v-if="records.length" class="record-list">
      <article v-for="record in records" :key="record.id" class="record-item">
        <p>{{ record.content }}</p>
        <div>{{ record.time }} · {{ record.operator }}</div>
      </article>
    </div>
    <div v-else class="empty-state">暂无跟进记录</div>
  </section>
</template>

<script setup>
defineProps({
  records: { type: Array, default: () => [] }
})

defineEmits(['add'])
</script>
