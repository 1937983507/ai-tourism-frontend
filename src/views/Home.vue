<template>
  <div id="home">
    <header class="header">
      <h1><i class="fas fa-comments"></i> AI 旅游生活助手</h1>
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
        @toggle-sidebar="toggleSidebar"
        @select-conversation="selectConversation"
        @new-conversation="startNewConversation"
      />
      <ChatContainer
        :current-conversation-title="currentConversationTitle"
        :messages="currentMessages"
        :current-session-id="currentSessionId"
        @send-message="sendMessage"
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
import { generateUUID, fetchSessionList, fetchConversationHistory, sendMessageToAI } from '../utils/api.js'
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
      setTimeout(() => {
        currentMessages.value.push({
          msg_id: generateUUID(),
          role: 'assistant',
          content: '您好！这是一个新的对话。我可以为您提供什么帮助？'
        })
      }, 500)
    }

    async function sendMessage(message) {
      if (!message.trim() || !currentSessionId.value) return
      const userMessage = { msg_id: generateUUID(), role: 'user', content: message }
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

    onMounted(async () => {
      fetchSessionList(sessionList, isLoading, localStorage.getItem('user_id'))
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
      selectedRouteData,
      updateTime,
      displayNickname,
      showUserMenu
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




