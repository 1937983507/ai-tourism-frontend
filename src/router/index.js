import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../views/Home.vue')
const Login = () => import('../views/Login.vue')
const Register = () => import('../views/Register.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'Home', component: Home, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: Login },
    { path: '/register', name: 'Register', component: Register }
  ]
})

// 临时关闭鉴权放行开关，后端就绪后改为 false 恢复校验
const AUTH_DISABLED = false

router.beforeEach((to, from, next) => {
  if (AUTH_DISABLED) {
    return next()
  }
  const isAuthenticated = !!localStorage.getItem('token')
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next({ path: '/home' })
  } else {
    next()
  }
})

export default router


