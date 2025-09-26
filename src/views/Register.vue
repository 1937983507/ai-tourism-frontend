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
      <h2><i class="fas fa-user-plus"></i> 注册</h2>
      <form @submit.prevent="onSubmit">
        <div class="form-item icon">
          <i class="fas fa-mobile-screen-button"></i>
          <input v-model.trim="form.phone" type="tel" placeholder="请输入手机号" required />
        </div>
        <div class="form-item icon">
          <i class="fas fa-lock"></i>
          <input v-model.trim="form.password" type="password" placeholder="设置登录密码" required />
        </div>
        <div class="form-item icon">
          <i class="fas fa-lock"></i>
          <input v-model.trim="form.confirm" type="password" placeholder="请再次输入密码" required />
        </div>
        <div class="form-item icon">
          <i class="fas fa-user"></i>
          <input v-model.trim="form.nickname" type="text" placeholder="请输入昵称" />
        </div>
        <button class="primary bright-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>
      <p class="helper">已有账号？<router-link to="/login">去登录</router-link></p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { register } from '../utils/api.js'

export default {
  name: 'Register',
  setup() {
    const form = ref({ phone: '', password: '', confirm: '', nickname: '' })
    const loading = ref(false)

    const onSubmit = async () => {
      if (loading.value) return
      loading.value = true
      try {
        if (form.value.password !== form.value.confirm) {
          alert('两次输入的密码不一致')
          return
        }
        const res = await register({ phone: form.value.phone, password: form.value.password, nickname: form.value.nickname })
        if (res && res.success) {
          alert('注册成功，请登录')
          // 将注册手机号写入 last_phone，方便登录页回填；不写入密码
          localStorage.setItem('last_phone', form.value.phone)
          localStorage.removeItem('remember_pwd')
          window.location.replace('/login')
        }
      } catch (e) {
        alert(e.message || '注册失败')
      } finally {
        loading.value = false
      }
    }

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
    radial-gradient(1000px 420px at 0% 0%, rgba(168,85,247,.15), transparent 60%),
    radial-gradient(1000px 420px at 100% 100%, rgba(59,130,246,.15), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}
.bg-journey::before,
.bg-journey::after { content: none; }

.auth-card.light { width: 400px; border-radius: 16px; padding: 28px 26px; background: #ffffff; border: 1px solid rgba(15,23,42,.06); box-shadow: 0 20px 50px rgba(15,23,42,.06); position: relative; z-index: 1; }
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: #0f172a; }
.brand i { font-size: 20px; color: #f59e0b; }
.brand-text strong { display: block; font-size: 15px; letter-spacing: .4px; }
.brand-text small { opacity: .7; font-size: 12px; }

h2 { margin: 6px 0 18px 0; text-align: center; font-weight: 800; font-size: 20px; color: #111827; display: flex; align-items: center; justify-content: center; gap: 8px; }
.form-item { position: relative; margin-bottom: 14px; display: flex; align-items: center; }
.form-item.icon i { position: absolute; left: 12px; color: #94a3b8; font-size: 14px; }
.form-item.icon input { padding-left: 36px; }
input { height: 44px; width: 100%; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; color: #0f172a; }
input::placeholder { color: #94a3b8; }

.primary.bright-btn { position: relative; width: 100%; height: 46px; border: none; color: #fff; background: var(--brand-primary); border-radius: 12px; cursor: pointer; font-weight: 700; letter-spacing: .2px; box-shadow: 0 6px 16px rgba(52,152,219,.22); }
.primary[disabled] { opacity: .9; cursor: not-allowed; }

.helper { margin-top: 12px; text-align: center; font-size: 13px; color: #6b7280; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; display: inline-block; margin-right: 6px; animation: spin .7s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>


