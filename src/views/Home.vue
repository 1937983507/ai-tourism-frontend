<template>
  <div id="home">
    <header class="header">
      <h1><i class="fas fa-comments"></i> AI 旅游生活助手</h1>
      <div class="user-info">欢迎，用户 {{ userId }}</div>
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
import { ref, computed, onMounted } from 'vue'
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
      const result = await sendMessageToAI(currentSessionId.value, message, currentMessages, sessionList)
      if (result.success) {
        updateMapFromSessionId(currentSessionId.value)
      }
    }

    function refreshLocation() {
      locationUpdateTime.value = new Date().toLocaleTimeString()
    }

    onMounted(() => {
      fetchSessionList(sessionList, isLoading)
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
      selectConversation,
      startNewConversation,
      sendMessage,
      refreshLocation,
      selectedRouteData,
      updateTime
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
</style>




