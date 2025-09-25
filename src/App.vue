<template>
  <div id="app">
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
import Sidebar from './components/Sidebar.vue'
import ChatContainer from './components/ChatContainer.vue'
import MapContainer from './components/MapContainer.vue'
import { generateUUID, fetchSessionList, fetchConversationHistory, sendMessageToAI } from './utils/api.js'
import './assets/style.css' // 导入单独的CSS文件

export default {
  name: 'App',
  components: {
    Sidebar,
    ChatContainer,
    MapContainer
  },
  setup() {
    const isSidebarCollapsed = ref(false)
    const locationUpdateTime = ref(new Date().toLocaleTimeString())
    const currentLocation = ref('北京市海淀区')
    const userId = ref(Math.floor(Math.random() * 1000))
    const sessionList = ref([])
    const currentSessionId = ref(null)
    const currentMessages = ref([])
    const isLoading = ref(false)
    const selectedRouteData = ref(null) // 当前选中的路线数据
    const updateTime = ref('2025-09-24 19:00:00')

    const currentConversationTitle = computed(() => {
      if (!currentSessionId.value) return '请选择或创建对话'
      const session = sessionList.value.find(s => s.session_id === currentSessionId.value)
      return session ? session.title : '未知对话'
    })

    function toggleSidebar() {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }
    
    // async function selectConversation(conversation) {
    //   currentSessionId.value = conversation.session_id
    //   await fetchConversationHistory(conversation.session_id, currentMessages)
    // }

    // 选择会话
    const selectConversation = (conversation) => {
      currentSessionId.value = conversation.session_id
      fetchConversationHistory(conversation.session_id, currentMessages)
      
      // 如果会话有路线数据，传递给地图组件
      if (conversation.daily_routes) {
        selectedRouteData.value = {
          ...conversation,
          daily_routes: conversation.daily_routes
        }
      } else {
        selectedRouteData.value = null
      }
    }

    // 根据会话ID更新地图数据
    const updateMapFromSessionId = (sessionId) => {
      console.log("开始刷新")
      console.log(sessionId)
      // 从会话列表中查找对应的会话
      const conversation = sessionList.value.find(session => session.session_id === sessionId)
      console.log("获取会话", conversation)
      if (conversation) {
        // 如果会话有路线数据，传递给地图组件
        if (conversation.daily_routes) {
          selectedRouteData.value = {
            ...conversation,
            daily_routes: conversation.daily_routes
          }
        } else {
          selectedRouteData.value = null
        }
      }
    }

    // // 刷新位置
    // const refreshLocation = () => {
    //   // 实现位置刷新逻辑
    //   console.log('刷新位置')
    // }

    
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
      
      const userMessage = {
        msg_id: generateUUID(),
        role: 'user',
        content: message
      }
      
      currentMessages.value.push(userMessage)
      
      // 将消息发送给LLM
      const result = await sendMessageToAI(currentSessionId.value, message, currentMessages, sessionList)
      // 只有在 sendMessageToAI 完成后才更新地图
      if (result.success) {
        console.log("准备开始刷新")
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
/* 只保留最基础的样式，其他移到单独的CSS文件 */
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>