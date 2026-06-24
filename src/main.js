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

function shouldOpenWecomDebug() {
  const params = new URLSearchParams(window.location.search)
  return params.get('debug') === '1' || params.get('wecom_debug') === '1'
}

router.beforeEach(async (to) => {
  const isHomeEntry = to.path === '/' || to.path === '/workbench'
  if (!isHomeEntry || sidebarEntryChecked) return true

  sidebarEntryChecked = true
  const isWecomClient = /wxwork/i.test(window.navigator.userAgent)
  const openWecomDebug = shouldOpenWecomDebug()
  const store = useWorkbenchStore()
  try {
    if (!store.user) await store.bootstrap()
    if (isWecomClient) {
      if (openWecomDebug) {
        store.openInlineWecomDebug()
        return true
      }
      const student = await store.resolveSidebarContact()
      if (student?.id) {
        store.closeInlineWecomDebug()
        return { path: `/students/${student.id}`, replace: true, query: { from: 'sidebar' } }
      }
      store.openInlineWecomDebug()
      return true
    }
  } catch {
    if (isWecomClient) {
      store.openInlineWecomDebug()
      return true
    }
  }
  return true
})

app.use(router).use(Vant).mount('#app')
