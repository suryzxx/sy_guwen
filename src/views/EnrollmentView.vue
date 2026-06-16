<template>
  <AppShell title="创建订单" subtitle="顾问创建订单，家长在小程序确认并支付" :show-back="Boolean($route.query.studentId)">
    <div class="order-layout">
      <section class="panel">
        <div class="panel-header">
          <h2>选择学生</h2>
        </div>
        <van-search v-model="keyword" placeholder="搜索学生姓名、手机号" shape="round" />
        <div class="compact-list">
          <button
            v-for="student in candidateStudents"
            :key="student.id"
            class="select-row"
            :class="{ active: selectedStudentId === student.id }"
            type="button"
            @click="selectedStudentId = student.id"
          >
            <span>
              <strong>{{ student.name }}</strong>
              <small>{{ student.phone }} · {{ student.currentGrade }}</small>
            </span>
            <em v-if="student.evaluationScores">{{ student.evaluationScores.totalScore }}/{{ student.evaluationScores.fullScore }}</em>
          </button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>选择班级</h2>
        </div>
        <div class="class-options">
          <button
            v-for="classInfo in store.classes"
            :key="classInfo.id"
            class="class-option"
            :class="{ active: selectedClassId === classInfo.id }"
            type="button"
            @click="selectedClassId = classInfo.id"
          >
            <strong>{{ classInfo.name }}</strong>
            <span>{{ classInfo.schedule }} · {{ classInfo.location }}</span>
            <span>{{ classInfo.teacher }} · {{ classInfo.totalLectures }}课次</span>
            <div>
              <em v-for="tag in classInfo.matchTags" :key="tag">{{ tag }}</em>
            </div>
          </button>
        </div>
      </section>

      <section class="summary-pane">
        <div class="panel sticky-panel">
          <div class="panel-header">
            <h2>订单预览</h2>
          </div>
          <template v-if="selectedStudent && selectedClass">
            <div class="summary-row"><span>报名学生</span><strong>{{ selectedStudent.name }}</strong></div>
            <div class="summary-row"><span>报名班级</span><strong>{{ selectedClass.name }}</strong></div>
            <div class="summary-row"><span>课程费用</span><strong>¥{{ selectedClass.coursePrice }}</strong></div>
            <div class="summary-row"><span>教辅费</span><strong>¥{{ selectedClass.materialPrice }}</strong></div>
            <div class="summary-total"><span>合计</span><strong>¥{{ totalPrice }}</strong></div>
            <button class="primary-button" type="button" @click="submit">创建订单</button>
          </template>
          <div v-else class="empty-state">请选择学生和班级</div>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'

const route = useRoute()
const router = useRouter()
const store = useWorkbenchStore()
const keyword = ref('')
const selectedStudentId = ref('')
const selectedClassId = ref('')

onMounted(async () => {
  if (!store.students.length) await store.bootstrap()
  selectedStudentId.value = route.query.studentId || store.testedStudents[0]?.id || ''
  selectedClassId.value = store.classes[0]?.id || ''
})

const candidateStudents = computed(() => {
  const term = keyword.value.trim().toLowerCase()
  return store.testedStudents.filter((student) => {
    const canEnroll = student.evaluationResult
    const matchKeyword = !term || student.name.toLowerCase().includes(term) || student.phone.includes(term)
    return canEnroll && matchKeyword
  })
})

const selectedStudent = computed(() => store.studentById(selectedStudentId.value))
const selectedClass = computed(() => store.classes.find((item) => item.id === selectedClassId.value))
const totalPrice = computed(() => (selectedClass.value ? selectedClass.value.coursePrice + selectedClass.value.materialPrice : 0))

async function submit() {
  if (!selectedStudent.value || !selectedClass.value) {
    showToast('请选择学生和班级')
    return
  }
  const order = await store.submitOrder({
    studentId: selectedStudent.value.id,
    classId: selectedClass.value.id
  })
  showToast('订单已创建')
  router.push(`/orders/${order.id}`)
}
</script>
