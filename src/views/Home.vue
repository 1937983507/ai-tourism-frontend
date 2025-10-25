<template>
  <div id="home">
    <header class="header">
      <h1>
        <img src="/logo-white.svg" alt="logo" style="width:22px;height:22px;display:inline-block;vertical-align:middle;" />
        AI 智能旅游规划助手 
      </h1>
      <div class="user-info" @click="toggleUserMenu">
        <span class="nickname">{{ displayNickname }}</span>
        <i class="fas fa-caret-down"></i>
        <div class="dropdown" v-if="showUserMenu">
          <button class="dropdown-item" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </header>
    <div class="container">
      <Sidebar 
        :is-collapsed="isSidebarCollapsed"
        :session-list="sessionList"
        :current-session-id="currentSessionId"
        :has-more="hasMoreSessions"
        @toggle-sidebar="toggleSidebar"
        @load-more="handleLoadMoreSessions"
        @select-conversation="selectConversation"
        @new-conversation="startNewConversation"
        @rename-conversation="onRenameConversation"
        @delete-conversation="onDeleteConversation"
      />
      <ChatContainer
        :current-conversation-title="currentConversationTitle"
        :messages="currentMessages"
        :current-session-id="currentSessionId"
        @send-message="sendMessage"
        @input-focus="handleInputFocus"
      />
      <MapContainer
        :location="currentLocation"
        :updateTime="updateTime"
        :routeData="selectedRouteData"
      />
    </div>
    <button 
      class="floating-toggle" 
      @click="toggleSidebar" 
      v-if="isSidebarCollapsed"
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { logout, me } from '../utils/api.js'
import Sidebar from '../components/Sidebar.vue'
import ChatContainer from '../components/ChatContainer.vue'
import MapContainer from '../components/MapContainer.vue'
import { generateUUID, fetchSessionList, fetchConversationHistory, sendMessageToAI, modifySession } from '../utils/api.js'
import '../assets/style.css'

export default {
  name: 'Home',
  components: { Sidebar, ChatContainer, MapContainer },
  setup() {
    const isSidebarCollapsed = ref(false)
    const locationUpdateTime = ref(new Date().toLocaleTimeString())
    const currentLocation = ref('北京市海淀区')
    const userId = ref(Math.floor(Math.random() * 1000))
    const showUserMenu = ref(false)
    const displayNickname = computed(() => {
      const nick = localStorage.getItem('nickname')
      if (nick && nick.trim()) return nick
      return `游客${userId.value}`
    })

    const sessionList = ref([])
    const sessionPage = ref(1)
    const sessionPageSize = ref(10)
    const hasMoreSessions = ref(true)
    const currentSessionId = ref(null)
    const currentMessages = ref([])
    const isLoading = ref(false)
    const selectedRouteData = ref(null)
    const updateTime = ref('2025-09-24 19:00:00')

    const currentConversationTitle = computed(() => {
      if (!currentSessionId.value) return '请选择或创建对话'
      const session = sessionList.value.find(s => s.session_id === currentSessionId.value)
      return session ? session.title : '未知对话'
    })

    async function onDeleteConversation(conversation) {
      if (!conversation || !conversation.session_id) return
      if (!confirm('确认要删除该会话及其消息吗？此操作不可恢复')) return
      try {
        await modifySession({ sessionId: conversation.session_id, opType: 2 })
        // 前端本地移除
        sessionList.value = sessionList.value.filter(s => s.session_id !== conversation.session_id)
        if (currentSessionId.value === conversation.session_id) {
          currentSessionId.value = null
          currentMessages.value = []
          selectedRouteData.value = null
        }
      } catch (e) {
        alert(e.message || '删除失败')
      }
    }

    async function onRenameConversation(conversation) {
      if (!conversation || !conversation.session_id) return
      const newTitle = prompt('请输入新的标题', conversation.title || '')
      if (newTitle === null) return
      const trimmed = newTitle.trim()
      if (!trimmed) { alert('标题不能为空'); return }
      try {
        await modifySession({ sessionId: conversation.session_id, opType: 3, title: trimmed })
        // 本地更新标题
        const target = sessionList.value.find(s => s.session_id === conversation.session_id)
        if (target) target.title = trimmed
      } catch (e) {
        alert(e.message || '修改标题失败')
      }
    }

    function toggleSidebar() {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }

    function toggleUserMenu() {
      showUserMenu.value = !showUserMenu.value
    }

    function handleClickOutside(event) {
      const headerEl = document.querySelector('.header .user-info')
      if (headerEl && !headerEl.contains(event.target)) {
        showUserMenu.value = false
      }
    }

    async function handleLogout() {
      try {
        await logout()
      } catch (e) {
        console.error(e)
      } finally {
        const lastPhone = localStorage.getItem('last_phone') || ''
        const remember = localStorage.getItem('remember') === '1'
        const rememberPwd = localStorage.getItem('remember_pwd') || ''
        // 清除会话令牌与昵称
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('nickname')
        // 跳回登录页，并依赖本地存储完成回填（上面已保留 last_phone/remember/remember_pwd）
        window.location.replace('/login')
      }
    }

    const selectConversation = (conversation) => {
      currentSessionId.value = conversation.session_id
      fetchConversationHistory(conversation.session_id, currentMessages)
      if (conversation.daily_routes) {
        selectedRouteData.value = { ...conversation, daily_routes: conversation.daily_routes }
      } else {
        selectedRouteData.value = null
      }
    }

    const updateMapFromSessionId = (sessionId) => {
      const conversation = sessionList.value.find(session => session.session_id === sessionId)
      if (conversation) {
        if (conversation.daily_routes) {
          selectedRouteData.value = { ...conversation, daily_routes: conversation.daily_routes }
        } else {
          selectedRouteData.value = null
        }
      }
    }

    async function startNewConversation() {
      const newSessionId = generateUUID()
      sessionList.value.unshift({
        session_id: newSessionId,
        last_time: new Date().toLocaleString(),
        title: '新对话'
      })
      currentSessionId.value = newSessionId
      currentMessages.value = []
      
      // 立即添加欢迎消息，不需要延迟
      currentMessages.value.push({
        msg_id: generateUUID(),
        role: 'assistant',
        content: '您好！我是您的AI旅游生活助手 🌟\n\n我可以为您提供：\n - 🚗 天气及出行建议\n - 📍 个性化旅游路线规划\n - 🎯 景点详细介绍\n\n请告诉我您的需求，比如：\n"请为我生成北京市旅游攻略，有3天2夜时间，我喜欢人文风景"',
        modifyTime: new Date().toISOString()
      })
      
      // 强制触发响应式更新
      currentMessages.value = [...currentMessages.value]
    }

    async function sendMessage(message) {
      if (!message.trim()) return
      
      // 如果没有当前会话，自动创建新会话
      if (!currentSessionId.value) {
        await startNewConversation()
      }
      
      const userMessage = { msg_id: generateUUID(), role: 'user', content: message, modifyTime: new Date().toISOString() }
      currentMessages.value.push(userMessage)
      
      // 强制触发响应式更新
      currentMessages.value = [...currentMessages.value]
      
      const result = await sendMessageToAI(currentSessionId.value, message, currentMessages, sessionList, localStorage.getItem('user_id'))
      if (result && result.success) {
        updateMapFromSessionId(currentSessionId.value)
      }
    }

    function refreshLocation() {
      locationUpdateTime.value = new Date().toLocaleTimeString()
    }

    // 处理输入框焦点事件，自动创建新会话
    async function handleInputFocus() {
      if (!currentSessionId.value) {
        await startNewConversation()
      }
    }

    onMounted(async () => {
      const res = await fetchSessionList(sessionList, isLoading, localStorage.getItem('user_id'), sessionPage.value, sessionPageSize.value)
      hasMoreSessions.value = !!(res && res.hasMore)
      // token 未过期直达首页时，尝试刷新昵称
      try {
        // console.log('token 未过期直达首页时，尝试刷新昵称')
        const info = await me()
        if (info && info.nickname) {
          localStorage.setItem('nickname', info.nickname)
        }
      } catch (e) {
        // 忽略
      }
      document.addEventListener('click', handleClickOutside)
    })
    async function handleLoadMoreSessions(done) {
      if (!hasMoreSessions.value) { if (done) done(); return }
      sessionPage.value += 1
      const res = await fetchSessionList(sessionList, isLoading, localStorage.getItem('user_id'), sessionPage.value, sessionPageSize.value, true)
      hasMoreSessions.value = !!(res && res.hasMore)
      if (done) done()
    }

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      isSidebarCollapsed,
      locationUpdateTime,
      currentLocation,
      userId,
      sessionList,
      currentSessionId,
      currentMessages,
      isLoading,
      currentConversationTitle,
      toggleSidebar,
      toggleUserMenu,
      handleLogout,
      selectConversation,
      startNewConversation,
      sendMessage,
      refreshLocation,
      handleInputFocus,
      selectedRouteData,
      updateTime,
      displayNickname,
      showUserMenu,
      handleLoadMoreSessions
      , onDeleteConversation
      , onRenameConversation
    }
  }
}
</script>

<style>
#home {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.header .user-info { position: relative; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.header .user-info .dropdown { position: absolute; right: 0; top: 36px; background: #fff; border: 1px solid rgba(15,23,42,.08); border-radius: 10px; box-shadow: 0 12px 30px rgba(15,23,42,.12); overflow: hidden; z-index: 20; }
.header .user-info .dropdown-item { display: block; padding: 10px 14px; background: #fff; border: none; width: 140px; text-align: left; cursor: pointer; }
.header .user-info .dropdown-item:hover { background: #f5f7fb; }
</style>




