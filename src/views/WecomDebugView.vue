<template>
  <AppShell>
    <div class="narrow-page wecom-debug-page">
      <button class="back-button" type="button" @click="router.push('/workbench')">
        <AppIcon name="chevron-left" />
        返回首页
      </button>

      <section class="panel">
        <div class="panel-header">
          <h2>企微侧边栏调试</h2>
          <span class="muted-text">{{ loading ? '检测中' : '检测完成' }}</span>
        </div>
        <p class="wecom-debug-intro">
          这个页面用于判断从客户聊天侧边栏进入时，系统能否拿到当前客户并匹配学生。
        </p>

        <div class="debug-steps">
          <article
            v-for="(step, index) in sdkSteps"
            :key="step.key || index"
            class="debug-step"
            :class="step.status"
          >
            <span>{{ index + 1 }}</span>
            <div>
              <strong>{{ step.title }}</strong>
              <p>{{ step.message }}</p>
              <pre v-if="step.detail" class="debug-detail">{{ formatDetail(step.detail) }}</pre>
            </div>
          </article>

          <article class="debug-step" :class="externalUserid ? 'ok' : externalError ? 'error' : ''">
            <span>{{ sdkSteps.length + 1 }}</span>
            <div>
              <strong>当前外部联系人 ID</strong>
              <p>{{ externalUserid || externalError || '正在获取 external_userid...' }}</p>
            </div>
          </article>

          <article class="debug-step" :class="contactLookupClass">
            <span>{{ sdkSteps.length + 2 }}</span>
            <div>
              <strong>后端查询企微客户详情</strong>
              <p>{{ contactLookupText }}</p>
              <small v-if="debugResult?.contactLookup?.hint">{{ debugResult.contactLookup.hint }}</small>
            </div>
          </article>

          <article class="debug-step" :class="studentMatchClass">
            <span>{{ sdkSteps.length + 3 }}</span>
            <div>
              <strong>学生绑定 / 姓名匹配</strong>
              <p>{{ studentMatchText }}</p>
              <button
                v-if="debugResult?.matchedStudent?.id"
                class="secondary-button"
                type="button"
                @click="router.replace(`/students/${debugResult.matchedStudent.id}`)"
              >
                进入学生详情
              </button>
            </div>
          </article>
        </div>

        <section v-if="showManualFallback" class="wecom-manual-fallback">
          <div class="panel-header compact">
            <h3>手动进入学生详情</h3>
            <span class="muted-text">企微未返回当前客户</span>
          </div>
          <label class="manual-student-search">
            <AppIcon name="search" />
            <input v-model="studentKeyword" type="search" placeholder="搜索学生姓名、手机号" />
          </label>
          <div class="manual-student-list">
            <button
              v-for="student in manualStudents"
              :key="student.id"
              class="manual-student-row"
              type="button"
              @click="router.replace(`/students/${student.id}?from=sidebar-manual`)"
            >
              <span>
                <strong>{{ student.name }}</strong>
                <small>{{ student.phone || student.school || student.campus }}</small>
              </span>
              <AppIcon name="chevron-right" />
            </button>
            <p v-if="!manualStudents.length" class="manual-empty">没有匹配的学生</p>
          </div>
        </section>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'
import { debugExternalContactStudent, inspectCurrentExternalContact } from '../api/wecom'

const router = useRouter()
const store = useWorkbenchStore()
const loading = ref(true)
const externalUserid = ref('')
const externalError = ref('')
const debugResult = ref(null)
const sdkSteps = ref([])
const studentKeyword = ref('')

onMounted(async () => {
  try {
    if (!store.user) await store.bootstrap()
    const inspectResult = await inspectCurrentExternalContact()
    sdkSteps.value = inspectResult.steps || []
    externalUserid.value = inspectResult.externalUserid || ''
    if (!externalUserid.value) {
      externalError.value = sdkSteps.value.find((step) => step.status === 'error')?.message || '未能获取企微当前外部联系人'
      return
    }
    debugResult.value = await debugExternalContactStudent(externalUserid.value)
  } catch (error) {
    externalError.value = error?.message || error?.error || '未能获取企微当前外部联系人'
    if (externalUserid.value) {
      debugResult.value = await debugExternalContactStudent(externalUserid.value).catch((debugError) => ({
        contactLookup: { ok: false, message: debugError?.message || debugError?.error || '后端调试接口调用失败' }
      }))
    }
  } finally {
    loading.value = false
  }
})

function formatDetail(detail) {
  return typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)
}

const contactLookupClass = computed(() => {
  if (!externalUserid.value || loading.value) return ''
  return debugResult.value?.contactLookup?.ok ? 'ok' : 'error'
})

const contactLookupText = computed(() => {
  if (!externalUserid.value) return '还没有拿到 external_userid，暂未请求后端。'
  if (loading.value) return '正在请求后端...'
  const lookup = debugResult.value?.contactLookup
  if (lookup?.ok) {
    const names = debugResult.value?.candidateNames || []
    return names.length ? `已查到客户名称/备注：${names.join('、')}` : '已查到客户详情，但没有可用于匹配的名称。'
  }
  return lookup?.errmsg || lookup?.message || debugResult.value?.externalUseridError || '后端未能查到客户详情。'
})

const studentMatchClass = computed(() => {
  if (loading.value) return ''
  return debugResult.value?.matchedStudent ? 'ok' : 'error'
})

const studentMatchText = computed(() => {
  if (loading.value) return '正在匹配学生...'
  const student = debugResult.value?.matchedStudent
  if (student) {
    return debugResult.value?.existingBinding
      ? `已绑定学生：${student.name}`
      : `可按客户名称自动匹配学生：${student.name}`
  }
  return '没有找到已绑定学生，也没有按客户名称匹配到唯一学生。'
})

const showManualFallback = computed(() => !loading.value && !externalUserid.value && store.students.length)

const manualStudents = computed(() => {
  const keyword = studentKeyword.value.trim().toLowerCase()
  const students = store.students
  if (!keyword) return students.slice(0, 8)
  return students
    .filter((student) => {
      return student.name.toLowerCase().includes(keyword)
        || String(student.phone || '').includes(keyword)
        || String(student.school || '').toLowerCase().includes(keyword)
    })
    .slice(0, 12)
})
</script>
