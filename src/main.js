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
  const store = useWorkbenchStore()
  try {
    if (!store.user) await store.bootstrap()
    const student = await store.resolveSidebarContact()
    if (student?.id) {
      return { path: `/students/${student.id}`, replace: true, query: { from: 'sidebar' } }
    }
  } catch {
    // Non-WeCom entry or unbound contact: keep the normal home page.
  }
  return true
})

app.use(router).use(Vant).mount('#app')
