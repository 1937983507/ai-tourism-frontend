<template>
  <div class="auth-wrapper theme-journey">
    <div class="bg-journey" aria-hidden="true"></div>
    <div class="auth-card light">
      <div class="brand">
        <i class="fas fa-sun"></i>
        <div class="brand-text">
          <strong>AI 旅游生活助手</strong>
          <small>探索·灵感·陪伴</small>
        </div>
      </div>
      <h2><i class="fas fa-right-to-bracket"></i> 登录</h2>
      <form @submit.prevent="onSubmit">
        <div class="form-item icon">
          <i class="fas fa-mobile-screen-button"></i>
          <input v-model.trim="form.phone" type="tel" placeholder="请输入手机号" required />
        </div>
        <div class="form-item icon">
          <i class="fas fa-lock"></i>
          <input v-model.trim="form.password" type="password" placeholder="请输入密码" required />
        </div>
        <label class="remember">
          <input type="checkbox" v-model="form.remember" />
          <span class="checkbox-ui"></span>
          <span>记住密码</span>
        </label>
        <button class="primary bright-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      <p class="helper">没有账号？<router-link to="/register">去注册</router-link></p>
    </div>
  </div>

</template>

<script>
import { ref, onMounted } from 'vue'
import { login } from '../utils/api.js'

export default {
  name: 'Login',
  setup(_, { emit }) {
    const form = ref({ phone: '', password: '', remember: true })
    const loading = ref(false)
    const FIRST_DEFAULT_PHONE = '13859211947'
    const FIRST_DEFAULT_PWD = '123456'

    const onSubmit = async () => {
      if (loading.value) return
      loading.value = true
      try {
        const res = await login({ phone: form.value.phone, password: form.value.password })
        // console.log("登录请求后", res)
        if (res && res.token) {
          localStorage.setItem('token', res.token)
          localStorage.setItem('nickname', res.user.nickname || '')
          localStorage.setItem('user_id', res.user.user_id || '')
          localStorage.setItem('avatar', res.user.avatar || '')
          localStorage.setItem('last_phone', form.value.phone)
          if (form.value.remember) {
            localStorage.setItem('remember', '1')
            localStorage.setItem('remember_pwd', form.value.password)
          } else {
            localStorage.removeItem('remember')
            localStorage.removeItem('remember_pwd')
          }
          
          const redirect = new URLSearchParams(location.search).get('redirect') || '/home'
          window.location.replace(redirect)
        }
      } catch (e) {
        alert(e.message || '登录失败')
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      const lastPhone = localStorage.getItem('last_phone')
      const remembered = localStorage.getItem('remember') === '1'
      const rememberedPwd = localStorage.getItem('remember_pwd')
      if (!lastPhone) {
        form.value.phone = FIRST_DEFAULT_PHONE
        form.value.password = FIRST_DEFAULT_PWD
        form.value.remember = true
      } else {
        form.value.phone = lastPhone
        form.value.remember = remembered
        if (remembered && rememberedPwd) {
          form.value.password = rememberedPwd
        }
      }
    })

    return { form, loading, onSubmit }
  }
}
</script>

<style scoped>
.auth-wrapper.theme-journey {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #ffffff 0%, #f5fbff 100%);
  padding: 24px;
  overflow: hidden;
}
.bg-journey {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(1000px 420px at 0% 0%, rgba(56,189,248,.18), transparent 60%),
    radial-gradient(1000px 420px at 100% 100%, rgba(251,191,36,.18), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}
/* 旅途虚线路径与定位点（使用多重渐变模拟，位置避开中心卡片） */
.bg-journey::before,
.bg-journey::after { content: none; }

.auth-card.light {
  width: 400px;
  border-radius: 16px;
  padding: 28px 26px;
  background: #ffffff;
  border: 1px solid rgba(15,23,42,.06);
  box-shadow: 0 20px 50px rgba(15,23,42,.06);
  position: relative; z-index: 1;
}
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: #0f172a; }
.brand i { font-size: 20px; color: #f59e0b; }
.brand-text strong { display: block; font-size: 15px; letter-spacing: .4px; }
.brand-text small { opacity: .7; font-size: 12px; }

h2 {
  margin: 6px 0 18px 0;
  text-align: center;
  font-weight: 800;
  font-size: 20px;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.form-item { position: relative; margin-bottom: 14px; display: flex; align-items: center; }
.form-item.icon i { position: absolute; left: 12px; color: #94a3b8; font-size: 14px; }
.form-item.icon input { padding-left: 36px; }
input { height: 44px; width: 100%; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; color: #0f172a; }
input::placeholder { color: #94a3b8; }

.primary.bright-btn {
  position: relative;
  width: 100%; height: 46px; border: none; color: #fff;
  background: var(--brand-primary);
  border-radius: 12px; cursor: pointer; font-weight: 700;
  letter-spacing: .2px; box-shadow: 0 6px 16px rgba(52,152,219,.22);
}
.primary[disabled] { opacity: .9; cursor: not-allowed; }

.helper { margin-top: 12px; text-align: center; font-size: 13px; color: #6b7280; }

.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; display: inline-block; margin-right: 6px; animation: spin .7s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>

<style scoped>
.remember { display: inline-flex; align-items: center; gap: 8px; margin: 6px 0 10px 2px; user-select: none; color: #475569; font-size: 13px; }
.remember input { position: absolute; opacity: 0; width: 0; height: 0; }
.checkbox-ui { width: 16px; height: 16px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; display: inline-block; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,.04) inset; }
.remember input:checked + .checkbox-ui { background: var(--brand-primary); border-color: var(--brand-primary); }
.remember input:checked + .checkbox-ui::after { content: ""; position: absolute; left: 4px; top: 1px; width: 5px; height: 9px; border: 2px solid #fff; border-top: 0; border-left: 0; transform: rotate(45deg); }
</style>


