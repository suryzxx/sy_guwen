<template>
  <div class="detail-content">
    <div v-if="!student" class="placeholder-panel">学生信息不存在</div>
    <template v-else>
      <section class="profile-panel">
        <div class="student-profile-summary">
          <img v-if="avatarSrc" class="student-profile-avatar" :src="avatarSrc" :alt="`${student.name}头像`" />
          <span v-else class="student-profile-avatar avatar-fallback">{{ student.name.slice(0, 1) }}</span>
          <div>
            <span class="eyebrow">基本信息</span>
            <h2>{{ student.name }}</h2>
            <p>{{ student.englishName || '未填写英文名' }} · {{ genderText }} · {{ student.currentGrade }}</p>
          </div>
        </div>
        <button class="secondary-button" type="button" @click="contactParent">联系家长</button>
      </section>

      <section class="panel current-work-panel">
        <div class="panel-header">
          <h2>当前进度</h2>
          <span class="status-pill">{{ stageLabel(student.stage) }}</span>
        </div>
        <div v-if="pendingTask" class="current-task">
          <div>
            <span>当前待办</span>
            <strong>{{ pendingTask.title }}</strong>
            <small :class="{ overdue: isOverdue(pendingTask) }">
              {{ pendingTask.dueAt ? `截止 ${pendingTask.dueAt}` : '未设置截止时间' }}
            </small>
          </div>
          <button class="small-button" type="button" @click="finishTask(pendingTask.id)">标记完成</button>
        </div>
        <div v-else class="empty-state">当前没有待办</div>
        <div v-if="manualTransitions.length" class="stage-actions">
          <span>推进阶段</span>
          <button
            v-for="stage in manualTransitions"
            :key="stage"
            class="secondary-button"
            type="button"
            @click="prepareTransition(stage)"
          >
            {{ stageLabel(stage) }}
          </button>
        </div>
      </section>

      <section class="panel">
        <div class="info-grid">
          <div><span>家长手机号</span><strong>{{ student.phone }}</strong></div>
          <div><span>学校</span><strong>{{ student.school }}</strong></div>
          <div><span>城市校区</span><strong>{{ student.city }} · {{ student.campus }}</strong></div>
          <div><span>进入阶段时间</span><strong>{{ student.stageEnteredAt || '未记录' }}</strong></div>
        </div>
        <div v-if="student.cancellationReason" class="notice-box">
          <span>取消原因</span>
          <strong>{{ student.cancellationReason }}</strong>
        </div>
      </section>

      <section v-if="student.stage === STUDENT_STAGES.ENROLLED_STUDENT" class="panel">
        <div class="panel-header"><h2>班级信息</h2></div>
        <div class="class-strip">
          <strong>{{ student.className || '暂无班级' }}</strong>
          <span>{{ student.classSchedule || '暂无排课' }}</span>
        </div>
      </section>

      <RecordList :records="records" @add="showRecordForm = true" />

      <section v-if="showAssessment" class="panel">
        <div class="panel-header">
          <h2>评测信息</h2>
          <button
            v-if="[STUDENT_STAGES.PENDING_LEVEL, STUDENT_STAGES.ASSESSED, STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED].includes(student.stage)"
            class="small-button"
            type="button"
            @click="openEvaluationForm"
          >
            录入结果
          </button>
        </div>
        <div class="info-grid compact">
          <div><span>预约日期</span><strong>{{ student.appointment?.date || '未填写' }}</strong></div>
          <div><span>预约时间</span><strong>{{ student.appointment?.time || '未填写' }}</strong></div>
          <div><span>评测校区</span><strong>{{ student.appointment?.campus || '未填写' }}</strong></div>
          <div><span>评测老师</span><strong>{{ student.appointment?.teacher || '未填写' }}</strong></div>
        </div>
        <div v-if="student.evaluationResult" class="score-box">
          <div>
            <span>评测等级</span>
            <strong>{{ student.evaluationResult.level || '未填写' }}</strong>
          </div>
          <div v-if="student.evaluationScores" class="result-tags">
            <span>{{ student.evaluationScores.totalScore }}/{{ student.evaluationScores.fullScore }}</span>
            <span>{{ student.evaluationResult.grade }}</span>
            <span>{{ student.evaluationResult.classType }}</span>
          </div>
          <p v-if="student.evaluationResult.conclusion">{{ student.evaluationResult.conclusion }}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><h2>阶段历史</h2></div>
        <div v-if="history.length" class="record-list">
          <article v-for="item in history" :key="item.id" class="record-item">
            <p>{{ item.fromStage ? `${stageLabel(item.fromStage)} → ` : '' }}{{ stageLabel(item.toStage) }}</p>
            <div>{{ item.changedAt }} · {{ item.operator }}<template v-if="item.reason"> · {{ item.reason }}</template></div>
          </article>
        </div>
        <div v-else class="empty-state">暂无阶段历史</div>
      </section>

      <div class="fixed-action">
        <button
          v-if="student.stage === STUDENT_STAGES.ADAPTED_NOT_CONVERTED && student.evaluationResult?.level"
          class="primary-button"
          type="button"
          @click="$emit('create-order', student.id)"
        >
          创建报名订单
        </button>
        <button
          v-else-if="[STUDENT_STAGES.PENDING_LEVEL, STUDENT_STAGES.ASSESSED, STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED].includes(student.stage)"
          class="primary-button"
          type="button"
          @click="openEvaluationForm"
        >
          {{ student.evaluationResult?.level ? '调整评测结果' : '录入评测结果' }}
        </button>
        <button v-else class="primary-button" type="button" @click="contactParent">联系家长</button>
      </div>

      <van-dialog v-model:show="showRecordForm" title="录入跟进记录" show-cancel-button @confirm="saveRecord">
        <div class="dialog-body">
          <van-field v-model="recordInput" type="textarea" maxlength="500" show-word-limit rows="5" placeholder="请输入跟进记录内容..." />
        </div>
      </van-dialog>

      <van-dialog v-model:show="showCancellationForm" title="记录取消原因" show-cancel-button @confirm="confirmCancellation">
        <div class="dialog-body">
          <van-field v-model="cancellationReason" type="textarea" maxlength="200" show-word-limit rows="4" placeholder="请填写家长取消评测的原因" />
        </div>
      </van-dialog>

      <van-dialog v-model:show="showAppointmentForm" title="填写评测预约" show-cancel-button @confirm="confirmAppointment">
        <div class="dialog-body">
          <van-field v-model="appointment.date" label="日期" type="date" />
          <van-field v-model="appointment.time" label="时间" type="time" />
          <van-field v-model="appointment.campus" label="校区" placeholder="请输入评测校区" />
          <van-field v-model="appointment.teacher" label="老师" placeholder="请输入评测老师" />
        </div>
      </van-dialog>

      <van-dialog v-model:show="showEvaluationForm" title="录入评测结果" show-cancel-button @confirm="saveEvaluation">
        <div class="dialog-body">
          <van-field v-model="evaluation.level" required label="评测等级" placeholder="例如 A+" />
          <div class="dialog-field">
            <span>适配结果</span>
            <div class="stage-actions inline">
              <button
                type="button"
                class="secondary-button"
                :class="{ active: evaluation.fitResult === 'adapted' }"
                @click="evaluation.fitResult = 'adapted'"
              >
                适配未转化
              </button>
              <button
                type="button"
                class="secondary-button"
                :class="{ active: evaluation.fitResult === 'not_adapted' }"
                @click="evaluation.fitResult = 'not_adapted'"
              >
                无适配
              </button>
            </div>
          </div>
          <van-field v-model="evaluation.totalScore" label="评测得分" type="number" placeholder="选填" />
          <van-field v-model="evaluation.fullScore" label="满分" type="number" placeholder="选填" />
          <van-field v-model="evaluation.classType" label="适合班型" placeholder="选填" />
          <van-field v-model="evaluation.conclusion" label="评测结论" type="textarea" rows="3" maxlength="300" show-word-limit placeholder="选填" />
        </div>
      </van-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { showToast } from 'vant'
import RecordList from '../../components/RecordList.vue'
import { useWorkbenchStore } from '../../stores/workbench'
import { STAGE_META, STAGE_TRANSITIONS, STUDENT_STAGES, stageLabel } from '../../../shared/student-workflow.js'

const props = defineProps({
  studentId: { type: String, required: true },
  embedded: { type: Boolean, default: false }
})

defineEmits(['create-order'])

const store = useWorkbenchStore()
const showRecordForm = ref(false)
const showCancellationForm = ref(false)
const showAppointmentForm = ref(false)
const showEvaluationForm = ref(false)
const recordInput = ref('')
const cancellationReason = ref('')
const appointment = reactive({ date: '', time: '', campus: '', teacher: '' })
const evaluation = reactive({ level: '', fitResult: 'adapted', totalScore: '', fullScore: '', classType: '', conclusion: '' })

onMounted(() => load())
watch(() => props.studentId, () => load())

const student = computed(() => store.studentById(props.studentId))
const records = computed(() => store.trackRecords[props.studentId] || [])
const tasks = computed(() => store.studentTasks[props.studentId] || [])
const history = computed(() => store.stageHistory[props.studentId] || [])
const pendingTask = computed(() => tasks.value.find((item) => item.status === 'pending'))
const genderText = computed(() => (student.value?.gender === 'female' ? '女' : '男'))
const showAssessment = computed(() => STAGE_META[student.value?.stage]?.group === 'assessment' || Boolean(student.value?.evaluationResult))
const avatarSrc = computed(() => {
  if (!student.value?.avatar) return ''
  return `${import.meta.env.BASE_URL}${student.value.avatar.replace(/^\/+/, '')}`
})
const manualTransitions = computed(() => {
  const systemStages = [STUDENT_STAGES.ASSESSED, STUDENT_STAGES.ENROLLED_STUDENT]
  return (STAGE_TRANSITIONS[student.value?.stage] || []).filter((stage) => !systemStages.includes(stage))
})

async function load() {
  if (props.studentId) await store.loadStudent(props.studentId)
}

function contactParent() {
  showToast(`联系家长：${student.value.phone}`)
}

function isOverdue(task) {
  if (!task.dueAt || task.status !== 'pending') return false
  const normalized = task.dueAt.replace(' ', 'T')
  return new Date(normalized).getTime() < Date.now()
}

async function finishTask(taskId) {
  await store.completeTask(props.studentId, taskId)
  showToast('待办已完成')
}

function prepareTransition(stage) {
  if (stage === STUDENT_STAGES.CANCELLED) {
    cancellationReason.value = ''
    showCancellationForm.value = true
    return
  }
  if (stage === STUDENT_STAGES.PENDING_VISIT) {
    Object.assign(appointment, student.value.appointment || { date: '', time: '', campus: student.value.campus || '', teacher: '' })
    showAppointmentForm.value = true
    return
  }
  changeStage(stage)
}

async function changeStage(stage, extra = {}) {
  await store.setStudentStage(props.studentId, { stage, reason: `规划师推进至${stageLabel(stage)}`, ...extra })
  showToast(`已进入${stageLabel(stage)}`)
}

async function confirmCancellation() {
  if (!cancellationReason.value.trim()) {
    showToast('请填写取消原因')
    return false
  }
  await changeStage(STUDENT_STAGES.CANCELLED, { cancellationReason: cancellationReason.value.trim() })
  return true
}

async function confirmAppointment() {
  if (!appointment.date || !appointment.time || !appointment.campus.trim()) {
    showToast('请填写预约日期、时间和校区')
    return false
  }
  await changeStage(STUDENT_STAGES.PENDING_VISIT, { appointment: { ...appointment } })
  return true
}

function openEvaluationForm() {
  Object.assign(evaluation, {
    level: student.value.evaluationResult?.level || '',
    fitResult: student.value.stage === STUDENT_STAGES.NOT_ADAPTED ? 'not_adapted' : 'adapted',
    totalScore: student.value.evaluationScores?.totalScore ?? '',
    fullScore: student.value.evaluationScores?.fullScore ?? '',
    classType: student.value.evaluationResult?.classType || '',
    conclusion: student.value.evaluationResult?.conclusion || ''
  })
  showEvaluationForm.value = true
}

async function saveEvaluation() {
  if (!evaluation.level.trim()) {
    showToast('请填写评测等级')
    return false
  }
  if (!['adapted', 'not_adapted'].includes(evaluation.fitResult)) {
    showToast('请填写适配结果：adapted 或 not_adapted')
    return false
  }
  const payload = {
    level: evaluation.level.trim(),
    fitResult: evaluation.fitResult,
    classType: evaluation.classType.trim(),
    conclusion: evaluation.conclusion.trim()
  }
  if (evaluation.totalScore !== '') payload.totalScore = Number(evaluation.totalScore)
  if (evaluation.fullScore !== '') payload.fullScore = Number(evaluation.fullScore)
  await store.saveEvaluation(props.studentId, payload)
  showToast('评测结果已保存')
  return true
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
