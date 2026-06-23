import { createRouter, createWebHashHistory } from 'vue-router'
import WorkbenchView from '../views/WorkbenchView.vue'
import StudentDetailView from '../views/StudentDetailView.vue'
import EnrollmentView from '../views/EnrollmentView.vue'
import OrderDetailView from '../views/OrderDetailView.vue'
import NotificationsView from '../views/NotificationsView.vue'
import ProfileView from '../views/ProfileView.vue'
import DataPanelView from '../views/DataPanelView.vue'
import ContactsView from '../views/ContactsView.vue'
import WecomDebugView from '../views/WecomDebugView.vue'

const routes = [
  { path: '/', redirect: '/workbench' },
  { path: '/workbench', name: 'workbench', component: WorkbenchView, meta: { title: '学生管理' } },
  { path: '/contacts', name: 'contacts', component: ContactsView, meta: { title: '通讯录' } },
  { path: '/students/:id', name: 'student-detail', component: StudentDetailView, meta: { title: '学生详情' } },
  { path: '/enrollment', name: 'enrollment', component: EnrollmentView, meta: { title: '创建订单' } },
  { path: '/orders/:id', name: 'order-detail', component: OrderDetailView, meta: { title: '订单详情' } },
  { path: '/notifications', name: 'notifications', component: NotificationsView, meta: { title: '消息通知' } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { title: '个人主页' } },
  { path: '/data-panel', name: 'data-panel', component: DataPanelView, meta: { title: '数据面板' } },
  { path: '/wecom-debug', name: 'wecom-debug', component: WecomDebugView, meta: { title: '企微侧边栏调试' } }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title || '规划师工作台'
})

export default router
