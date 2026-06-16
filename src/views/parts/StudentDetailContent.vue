<template>
  <div class="detail-content">
    <div v-if="!student" class="placeholder-panel">学生信息不存在</div>
    <template v-else>
      <section class="profile-panel">
        <div>
          <span class="eyebrow">基本信息</span>
          <h2>{{ student.name }}</h2>
          <p>{{ student.englishName || '未填写英文名' }} · {{ genderText }} · {{ student.currentGrade }}</p>
        </div>
        <button class="secondary-button" type="button" @click="callStudent">联系客户</button>
      </section>

      <section class="panel">
        <div class="info-grid">
          <div><span>手机号</span><strong>{{ student.phone }}</strong></div>
          <div><span>学校</span><strong>{{ student.school }}</strong></div>
          <div><span>城市校区</span><strong>{{ student.city }} · {{ student.campus }}</strong></div>
          <div><span>最近状态</span><strong>{{ stateText }}</strong></div>
        </div>
      </section>

      <section v-if="student.primaryType === 'student'" class="panel">
        <div class="panel-header">
          <h2>班级信息</h2>
        </div>
        <div class="class-strip">
          <strong>{{ student.className || '暂无班级' }}</strong>
          <span>{{ student.classSchedule || '暂无排课' }}</span>
        </div>
      </section>

      <RecordList :records="records" @add="showRecordForm = true" />

      <section v-if="student.primaryType === 'evaluation'" class="panel">
        <div class="panel-header">
          <h2>测评信息</h2>
          <span class="status-pill" :class="`status-${student.status}`">{{ stateText }}</span>
        </div>
        <div class="info-grid compact">
          <div><span>预约日期</span><strong>{{ student.appointment.date }}</strong></div>
          <div><span>预约时间</span><strong>{{ student.appointment.time }}</strong></div>
          <div><span>测评校区</span><strong>{{ student.appointment.campus }}</strong></div>
          <div><span>测评老师</span><strong>{{ student.appointment.teacher }}</strong></div>
        </div>

        <div v-if="student.evaluationScores" class="score-box">
          <div>
            <span>评测成绩</span>
            <strong>{{ student.evaluationScores.totalScore }}/{{ student.evaluationScores.fullScore }}</strong>
          </div>
          <div v-if="student.evaluationResult" class="result-tags">
            <span>{{ student.evaluationResult.year }} {{ student.evaluationResult.semester }}</span>
            <span>{{ student.evaluationResult.grade }}</span>
            <span>{{ student.evaluationResult.classType }}</span>
          </div>
        </div>
      </section>

      <div class="fixed-action">
        <button v-if="student.status === 'tested' && student.evaluationResult" class="primary-button" type="button" @click="$emit('create-order', student.id)">
          创建报名订单
        </button>
        <button v-else class="primary-button" type="button" @click="callStudent">联系客户</button>
      </div>

      <van-dialog v-model:show="showRecordForm" title="录入跟进记录" show-cancel-button @confirm="saveRecord">
        <div class="dialog-body">
          <van-field
            v-model="recordInput"
            type="textarea"
            maxlength="100"
            show-word-limit
            rows="4"
            placeholder="请输入跟进记录内容..."
          />
        </div>
      </van-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { showToast } from 'vant'
import RecordList from '../../components/RecordList.vue'
import { labels } from '../../mock/data'
import { useWorkbenchStore } from '../../stores/workbench'

const props = defineProps({
  studentId: { type: String, required: true },
  embedded: { type: Boolean, default: false }
})

defineEmits(['create-order'])

const store = useWorkbenchStore()
const showRecordForm = ref(false)
const recordInput = ref('')

onMounted(() => load())
watch(() => props.studentId, () => load())

const student = computed(() => store.studentById(props.studentId))
const records = computed(() => store.trackRecords[props.studentId] || [])
const genderText = computed(() => (student.value?.gender === 'female' ? '女' : '男'))
const stateText = computed(() => {
  const value = student.value?.status || student.value?.leadStatus || student.value?.studentStatus
  const allLabels = [...labels.lead, ...labels.evaluation, ...labels.student]
  return allLabels.find((item) => item.value === value)?.label || '未分类'
})

async function load() {
  if (!props.studentId) return
  await store.loadStudent(props.studentId)
}

function callStudent() {
  showToast(`联系客户：${student.value.phone}`)
}

async function saveRecord() {
  const content = recordInput.value.trim()
  if (!content) {
    showToast('请输入记录内容')
    return false
  }
  await store.saveTrackRecord(props.studentId, content)
  recordInput.value = ''
  showToast('记录已保存')
  return true
}
</script>
