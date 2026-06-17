<template>
  <AppShell>
    <div class="workspace-grid">
      <section class="list-pane">
        <div class="search-panel">
          <van-search v-model="keyword" placeholder="搜索学生姓名、手机号" shape="round" />
          <div class="segmented">
            <button
              v-for="item in labels.primaryTabs"
              :key="item.value"
              type="button"
              :class="{ active: primaryTab === item.value }"
              @click="switchPrimary(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="tab-row">
            <button
              v-for="item in currentTabs"
              :key="item.value"
              type="button"
              :class="{ active: secondaryTab === item.value }"
              @click="secondaryTab = item.value"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="student-list">
          <StudentCard
            v-for="student in filteredStudents"
            :key="student.id"
            :student="student"
            :mode="primaryTab"
            :active="selectedId === student.id"
            @select="selectStudent"
            @action="handleCardAction"
          />
          <div v-if="!filteredStudents.length" class="empty-state">暂无数据</div>
        </div>
      </section>

      <section class="detail-pane desktop-only">
        <StudentDetailContent
          v-if="selectedStudent"
          :student-id="selectedStudent.id"
          embedded
          @create-order="goCreateOrder"
        />
        <div v-else class="placeholder-panel">请选择左侧学生查看详情</div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppShell from '../components/AppShell.vue'
import StudentCard from '../components/StudentCard.vue'
import StudentDetailContent from './parts/StudentDetailContent.vue'
import { labels } from '../mock/data'
import { useWorkbenchStore } from '../stores/workbench'

const router = useRouter()
const store = useWorkbenchStore()
const keyword = ref('')
const primaryTab = ref('lead')
const secondaryTab = ref('to_add')
const selectedId = ref('')

onMounted(async () => {
  if (!store.students.length) await store.bootstrap()
  if (!selectedId.value && filteredStudents.value[0]) selectedId.value = filteredStudents.value[0].id
})

const currentTabs = computed(() => labels[primaryTab.value] || [])

const filteredStudents = computed(() => {
  const term = keyword.value.trim().toLowerCase()
  return store.students.filter((student) => {
    const matchPrimary = student.primaryType === primaryTab.value
    const matchSecondary =
      primaryTab.value === 'lead'
        ? student.leadStatus === secondaryTab.value
        : primaryTab.value === 'student'
          ? student.studentStatus === secondaryTab.value
          : student.status === secondaryTab.value
    const matchKeyword = !term || student.name.toLowerCase().includes(term) || student.phone.includes(term)
    return matchPrimary && matchSecondary && matchKeyword
  })
})

const selectedStudent = computed(() => store.studentById(selectedId.value) || filteredStudents.value[0])

watch(filteredStudents, (list) => {
  if (!list.some((item) => item.id === selectedId.value)) {
    selectedId.value = list[0]?.id || ''
  }
})

function switchPrimary(value) {
  primaryTab.value = value
  secondaryTab.value = labels[value][0].value
  keyword.value = ''
}

function selectStudent(student) {
  selectedId.value = student.id
  if (window.matchMedia('(max-width: 859px)').matches) {
    router.push(`/students/${student.id}`)
  }
}

async function handleCardAction(student) {
  if (student.status === 'pending') {
    await store.setEvaluationStatus(student.id, 'arrived')
    showToast('签到成功')
    return
  }
  if (student.status === 'arrived') {
    await store.setEvaluationStatus(student.id, 'tested')
    showToast('试卷已分配')
    return
  }
  if (student.status === 'tested' && student.evaluationResult) {
    goCreateOrder(student.id)
    return
  }
  showToast(`联系客户：${student.phone}`)
}

function goCreateOrder(studentId) {
  router.push({ path: '/enrollment', query: { studentId } })
}
</script>
