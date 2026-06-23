import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import './styles/index.css'
import App from './App.vue'
import router from './router'
import { useWorkbenchStore } from './stores/workbench'

const app = createApp(App)
const pinia = createPinia()
let sidebarEntryChecked = false

app.use(pinia)

router.beforeEach(async (to) => {
  const isHomeEntry = to.path === '/' || to.path === '/workbench'
  if (!isHomeEntry || sidebarEntryChecked) return true

  sidebarEntryChecked = true
  const isWecomClient = /wxwork/i.test(window.navigator.userAgent)
  const store = useWorkbenchStore()
  try {
    if (!store.user) await store.bootstrap()
    if (isWecomClient) {
      const student = await store.resolveSidebarContact()
      if (student?.id) {
        return { path: `/students/${student.id}`, replace: true, query: { from: 'sidebar' } }
      }
      return { path: '/wecom-debug', replace: true }
    }
  } catch {
    if (isWecomClient) return { path: '/wecom-debug', replace: true }
  }
  return true
})

app.use(router).use(Vant).mount('#app')
