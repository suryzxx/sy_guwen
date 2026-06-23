<template>
  <AppShell>
    <section class="contacts-page">
      <header class="contacts-toolbar">
        <label class="contacts-search">
          <AppIcon name="search" />
          <input v-model="keyword" type="search" placeholder="搜索学生姓名、手机号" />
        </label>

        <nav class="contacts-filter-tabs" aria-label="学生阶段筛选">
          <button
            v-for="item in contactFilters"
            :key="item.id"
            type="button"
            :class="{ active: contactFilter === item.id }"
            @click="contactFilter = item.id"
          >
            {{ item.label }}<span>({{ item.count }})</span>
          </button>
        </nav>
      </header>

      <div class="contact-list">
        <section v-for="group in contactGroups" :id="`contacts-${group.letter}`" :key="group.letter" class="contact-group">
          <h2>{{ group.letter }}</h2>
          <button
            v-for="(student, index) in group.students"
            :key="student.id"
            class="contact-row"
            type="button"
            @click="router.push(`/students/${student.id}`)"
          >
            <img
              v-if="avatarSrc(student)"
              class="contact-avatar image-avatar"
              :src="avatarSrc(student)"
              :alt="`${student.name}头像`"
            />
            <span v-else class="contact-avatar" :class="`avatar-tone-${index % 5}`">{{ student.name.slice(0, 1) }}</span>
            <span class="contact-copy">
              <strong>{{ student.name }}</strong>
              <small>{{ student.phone || student.campus }}</small>
            </span>
          </button>
        </section>
        <div v-if="!contactGroups.length" class="contacts-empty">没有符合搜索条件的学生</div>
      </div>

      <nav class="alphabet-index" aria-label="通讯录字母索引">
        <button
          v-for="letter in alphabet"
          :key="letter"
          type="button"
          :class="{ available: availableLetters.has(letter) }"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </button>
      </nav>

      <button class="floating-add-contact" type="button" aria-label="添加学生" @click="showAddHint">
        <AppIcon name="add-customer" />
      </button>
    </section>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppIcon from '../components/AppIcon.vue'
import AppShell from '../components/AppShell.vue'
import { useWorkbenchStore } from '../stores/workbench'
import { STAGE_META } from '../../shared/student-workflow.js'

const router = useRouter()
const store = useWorkbenchStore()
const keyword = ref('')
const contactFilter = ref('all')
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']

const surnameInitials = {
  白: 'B', 曹: 'C', 陈: 'C', 程: 'C', 方: 'F', 范: 'F', 冯: 'F', 顾: 'G', 何: 'H', 韩: 'H', 黄: 'H',
  江: 'J', 蒋: 'J', 林: 'L', 刘: 'L', 梁: 'L', 陆: 'L', 潘: 'P', 钱: 'Q', 沈: 'S', 邵: 'S',
  宋: 'S', 苏: 'S', 孙: 'S', 唐: 'T', 王: 'W', 温: 'W', 吴: 'W', 谢: 'X', 许: 'X', 叶: 'Y',
  赵: 'Z', 郑: 'Z', 周: 'Z'
}

onMounted(async () => {
  if (!store.students.length) await store.bootstrap()
})

const filteredStudents = computed(() => {
  const term = keyword.value.trim().toLowerCase()
  return store.students
    .filter((student) => contactFilter.value === 'all' || STAGE_META[student.stage]?.group === contactFilter.value)
    .filter((student) => !term
      || student.name.toLowerCase().includes(term)
      || student.phone.includes(term)
      || student.school?.toLowerCase().includes(term))
})

const contactFilters = computed(() => [
  { id: 'all', label: '全部', count: store.students.length },
  { id: 'lead_resource', label: '线索资源', count: groupCount('lead_resource') },
  { id: 'assessment', label: '评测状态', count: groupCount('assessment') },
  { id: 'enrolled', label: '在读学员', count: groupCount('enrolled') }
])

const contactGroups = computed(() => {
  const groups = new Map()
  for (const student of filteredStudents.value) {
    const first = student.name.trim().slice(0, 1)
    const letter = /^[a-z]$/i.test(first) ? first.toUpperCase() : surnameInitials[first] || '#'
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter).push(student)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left === '#' ? 1 : right === '#' ? -1 : left.localeCompare(right))
    .map(([letter, students]) => ({
      letter,
      students: students.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
    }))
})

const availableLetters = computed(() => new Set(contactGroups.value.map((group) => group.letter)))

function groupCount(group) {
  return store.students.filter((student) => STAGE_META[student.stage]?.group === group).length
}

function scrollToLetter(letter) {
  document.getElementById(`contacts-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function avatarSrc(student) {
  if (!student?.avatar) return ''
  return `${import.meta.env.BASE_URL}${student.avatar.replace(/^\/+/, '')}`
}

function showAddHint() {
  showToast('请通过家长注册链接添加新学生')
}
</script>
