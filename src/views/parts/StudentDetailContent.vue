<template>
  <div class="detail-content">
    <div v-if="!student" class="placeholder-panel">学生信息不存在</div>
    <template v-else>
      <section class="profile-panel">
        <div class="student-profile-summary">
          <img v-if="avatarSrc" class="student-profile-avatar" :src="avatarSrc" :alt="`${student.name}头像`" />
          <span v-else class="student-profile-avatar avatar-fallback">{{ student.name.slice(0, 1) }}</span>
          <div>
            <h2>{{ student.name }}</h2>
            <p class="student-phone-line">
              {{ student.phone }}
              <AppIcon name="phone" />
            </p>
            <div class="student-basic-tags">
              <span>{{ genderText }}</span>
              <span>{{ student.currentGrade }}</span>
              <span>{{ student.campus }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="panel current-work-panel">
        <div class="panel-header">
          <h2>当前进度</h2>
          <span class="status-pill">{{ stageLabel(student.stage) }}</span>
        </div>
        <div class="work-action-area">
          <p v-if="currentWorkAction.kind === 'tip'">{{ currentWorkAction.text }}</p>
          <button
            v-else
            class="secondary-button"
            type="button"
            @click="runWorkAction"
          >
            {{ currentWorkAction.label }}
          </button>
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
        <div class="stage-progress">
          <div
            v-for="item in stageProgressItems"
            :key="item.label"
            class="stage-progress-item"
            :class="{ completed: item.completed }"
          >
            <span class="stage-progress-dot"></span>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <van-dialog v-model:show="showRecordForm" title="录入跟进记录" show-cancel-button @confirm="saveRecord">
        <div class="dialog-body">
          <van-field v-model="recordInput" type="textarea" maxlength="500" show-word-limit rows="5" placeholder="请输入跟进记录内容..." />
        </div>
      </van-dialog>

      <van-dialog v-model:show="showPaperDialog" title="分配试卷" show-cancel-button @confirm="confirmPaperAssignment">
        <div class="dialog-body">
          <div class="choice-list">
            <button
              v-for="paper in paperOptions"
              :key="paper"
              type="button"
              :class="{ active: selectedPaper === paper }"
              @click="selectedPaper = paper"
            >
              {{ paper }}
            </button>
          </div>
        </div>
      </van-dialog>

      <van-dialog v-model:show="showLevelDialog" title="定级" show-cancel-button @confirm="confirmLevel">
        <div class="dialog-body">
          <div class="dialog-choice-group">
            <span>年份</span>
            <div class="choice-list compact">
              <button
                v-for="year in levelYears"
                :key="year"
                type="button"
                :class="{ active: levelForm.year === year }"
                @click="levelForm.year = year"
              >
                {{ year }}
              </button>
            </div>
          </div>
          <div class="dialog-choice-group">
            <span>学期</span>
            <div class="choice-list compact">
              <button
                v-for="semester in levelSemesters"
                :key="semester"
                type="button"
                :class="{ active: levelForm.semester === semester }"
                @click="levelForm.semester = semester"
              >
                {{ semester }}
              </button>
            </div>
          </div>
          <div class="dialog-choice-group">
            <span>等级</span>
            <div class="choice-list compact">
              <button
                v-for="level in levelOptions"
                :key="level"
                type="button"
                :class="{ active: levelForm.level === level }"
                @click="levelForm.level = level"
              >
                {{ level }}
              </button>
            </div>
          </div>
        </div>
      </van-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import AppIcon from '../../components/AppIcon.vue'
import RecordList from '../../components/RecordList.vue'
import { useWorkbenchStore } from '../../stores/workbench'
import { STAGE_META, STUDENT_STAGES, stageLabel } from '../../../shared/student-workflow.js'

const props = defineProps({
  studentId: { type: String, required: true },
  embedded: { type: Boolean, default: false }
})

const store = useWorkbenchStore()
const showRecordForm = ref(false)
const showPaperDialog = ref(false)
const showLevelDialog = ref(false)
const recordInput = ref('')
const selectedPaper = ref('')
const levelForm = reactive({ year: '2026', semester: '暑', level: 'G1' })
const paperOptions = ['英语基础诊断卷 A', '英语基础诊断卷 B', '阅读能力测评卷', '语法专项测评卷']
const levelYears = ['2026', '2027']
const levelSemesters = ['春', '暑', '秋', '寒']
const levelOptions = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']
const stageProgressSteps = ['添加企微', '预约评测', '签到', '分配试卷', '定级', '报名', '进入班级']

onMounted(() => load())
watch(() => props.studentId, () => load())

const student = computed(() => store.studentById(props.studentId))
const records = computed(() => store.trackRecords[props.studentId] || [])
const genderText = computed(() => (student.value?.gender === 'female' ? '女' : '男'))
const showAssessment = computed(() => STAGE_META[student.value?.stage]?.group === 'assessment' || Boolean(student.value?.evaluationResult))
const currentWorkAction = computed(() => {
  switch (student.value?.stage) {
    case STUDENT_STAGES.PENDING_ADD:
      return { kind: 'tip', text: '请规划师添加家长企微，并完成首次触达。' }
    case STUDENT_STAGES.ADDED:
    case STUDENT_STAGES.PENDING_ACTIVATION:
    case STUDENT_STAGES.CANCELLED:
      return { kind: 'tip', text: '请规划师沟通学生情况，确认评测意向并预约评测时间。' }
    case STUDENT_STAGES.PENDING_VISIT:
      return { kind: 'action', action: 'checkin', label: '签到' }
    case STUDENT_STAGES.VISITED:
      return { kind: 'action', action: 'assign-paper', label: '分配试卷' }
    case STUDENT_STAGES.PENDING_LEVEL:
      return { kind: 'action', action: 'level', label: '定级' }
    case STUDENT_STAGES.ADAPTED_NOT_CONVERTED:
      return { kind: 'action', action: 'enrollment-placeholder', label: '报名操作' }
    default:
      return { kind: 'tip', text: '当前暂无需要处理的操作。' }
  }
})
const avatarSrc = computed(() => {
  if (!student.value?.avatar) return ''
  return `${import.meta.env.BASE_URL}${student.value.avatar.replace(/^\/+/, '')}`
})
const stageProgressItems = computed(() => {
  const activeIndex = stageProgressIndex(student.value?.stage)
  return stageProgressSteps.map((label, index) => ({
    label,
    completed: index <= activeIndex
  }))
})

function stageProgressIndex(stage) {
  switch (stage) {
    case STUDENT_STAGES.PENDING_ADD:
      return -1
    case STUDENT_STAGES.ADDED:
    case STUDENT_STAGES.PENDING_ACTIVATION:
    case STUDENT_STAGES.CANCELLED:
      return 0
    case STUDENT_STAGES.PENDING_VISIT:
      return 1
    case STUDENT_STAGES.VISITED:
      return 2
    case STUDENT_STAGES.PENDING_LEVEL:
      return 3
    case STUDENT_STAGES.ASSESSED:
    case STUDENT_STAGES.ADAPTED_NOT_CONVERTED:
    case STUDENT_STAGES.NOT_ADAPTED:
      return 4
    case STUDENT_STAGES.ENROLLED_STUDENT:
      return 6
    default:
      return -1
  }
}

async function load() {
  if (props.studentId) await store.loadStudent(props.studentId)
}

async function runWorkAction() {
  switch (currentWorkAction.value.action) {
    case 'checkin':
      await confirmCheckin()
      break
    case 'assign-paper':
      selectedPaper.value = paperOptions[0]
      showPaperDialog.value = true
      break
    case 'level':
      Object.assign(levelForm, {
        year: student.value?.evaluationResult?.year || '2026',
        semester: student.value?.evaluationResult?.semester || '暑',
        level: student.value?.evaluationResult?.level || 'G1'
      })
      showLevelDialog.value = true
      break
    case 'enrollment-placeholder':
      showToast('报名操作后续接入')
      break
    default:
      break
  }
}

async function confirmCheckin() {
  try {
    await showConfirmDialog({
      title: '确认签到',
      message: `确认 ${student.value.name} 已到访签到？`
    })
  } catch {
    return
  }
  await store.setStudentStage(props.studentId, {
    stage: STUDENT_STAGES.VISITED,
    reason: '规划师确认评测到访签到'
  })
  showToast('签到成功')
}

async function confirmPaperAssignment() {
  if (!selectedPaper.value) {
    showToast('请选择试卷')
    return false
  }
  await store.setStudentStage(props.studentId, {
    stage: STUDENT_STAGES.PENDING_LEVEL,
    reason: `已分配试卷：${selectedPaper.value}`
  })
  showToast('试卷已分配')
  return true
}

async function confirmLevel() {
  if (!levelForm.year || !levelForm.semester || !levelForm.level) {
    showToast('请选择年份、学期和等级')
    return false
  }
  await store.saveEvaluation(props.studentId, {
    year: levelForm.year,
    semester: levelForm.semester,
    grade: levelForm.level,
    level: levelForm.level,
    fitResult: 'adapted',
    classType: student.value?.evaluationResult?.classType || '',
    conclusion: student.value?.evaluationResult?.conclusion || ''
  })
  showToast('定级完成')
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
