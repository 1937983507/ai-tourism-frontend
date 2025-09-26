<template>
  <div class="chat-container">
    <div class="chat-header">
      <div>
        <i class="fas fa-comment"></i> {{ currentConversationTitle }}
      </div>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="(message, index) in messages" 
        :key="index" 
        class="message"
        :class="message.role === 'user' ? 'user' : 'bot'"
      >
        <template v-if="message.role === 'user'">
          <div class="message-text" v-html="renderMarkdown(message.content)"></div>
        </template>
        <template v-else>
          <!-- 思考中状态 -->
          <div v-if="isThinking(message)" class="thinking-indicator">
            <div class="thinking-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <span class="thinking-text">{{ getThinkingText(message.content) }}</span>
          </div>
          <!-- 正常消息内容 -->
          <div 
            v-else
            class="message-text markdown-content" 
            v-html="renderMarkdown(message.content)"
          ></div>
        </template>
      </div>
    </div>
    <div class="chat-input">
      <input 
        type="text" 
        v-model="newMessage" 
        :placeholder="inputPlaceholder"
        @keyup.enter="handleSendMessage"
        @focus="handleInputFocus"
        :disabled="false"
      >
      <button @click="handleSendMessage" :disabled="!newMessage.trim()">
        <i class="fas fa-paper-plane"></i> 发送
      </button>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, watch, computed } from 'vue'
import { marked } from 'marked'

export default {
  name: 'ChatContainer',
  props: {
    currentConversationTitle: String,
    messages: Array,
    currentSessionId: String
  },
  emits: ['send-message', 'input-focus'],
  setup(props, { emit }) {
    const newMessage = ref('')
    const messagesContainer = ref(null)
    
    // 动态占位符文本
    const inputPlaceholder = computed(() => {
      if (!props.currentSessionId) {
        return '点击开始规划您的旅行...'
      }
      return '告诉我您的旅行需求...'
    })
    
    // 判断是否为思考中状态
    const isThinking = (message) => {
      return message.role === 'assistant' && 
             (message.content === '思考中...' ||
              message.content === '正在深入思考中，请稍候...' ||
              message.content.startsWith('思考中') ||
              message.content.startsWith('正在深入思考'))
    }

    // 获取思考状态文本
    const getThinkingText = (content) => {
      if (content === '正在深入思考中，请稍候...') {
        return '正在深入思考中，请稍候...'
      }
      return '正在思考中...'
    }


   // 创建自定义渲染器
    const renderer = new marked.Renderer()

    renderer.paragraph = (text) => {
      // console.log(text);
      return `<p style="margin-top: 1em; line-height: 1.6;">${text.text}</p>`
    }

    renderer.heading = (text, level) => {
      return `<h${text.depth} style="margin-top: 1.5em; line-height: 1.8">${text.text}</h${text.depth}>`
    }
    
    // 重写图片渲染方法
    renderer.image = (img) => {
      // console.log(img);
      // 设置图片最大宽度为100%，高度自适应，并添加圆角等样式
      return `<img src="${img.href}" alt="${img.text || ''}" title="${img.title || ''}" 
              style="max-width: 100%; height: auto; border-radius: 8px; 
                     box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 10px 0;" 
              onload="this.style.opacity=1" 
              onerror="this.style.display='none'">`
    }


    // Markdown 渲染函数
    const renderMarkdown = (markdown) => {
      // 将字符串中的 \n 转换为实际换行符
      // console.log(markdown);
      const processedMarkdown = markdown
          .replace(/\\n/g, '\n')
          .replace(/\n\s*\n/g, '\n\n')  // 将多个空行规范化为两个换行
      // console.log(processedMarkdown);
      return marked.parse(processedMarkdown, {
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        renderer: renderer  // 使用自定义渲染器
      })
    }

    function handleSendMessage() {
      if (!newMessage.value.trim()) return
      
      emit('send-message', newMessage.value.trim())
      newMessage.value = ''
      
      scrollToBottom()
    }

    function handleInputFocus() {
      emit('input-focus')
    }

    function scrollToBottom() {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    watch(() => props.messages, () => {
      scrollToBottom()
    }, { deep: true })

    return {
      newMessage,
      messagesContainer,
      inputPlaceholder,
      handleSendMessage,
      handleInputFocus,
      renderMarkdown,
      isThinking,
      getThinkingText
    }
  }
}
</script>

<style scoped>
/* 原有样式保持不变 */

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  min-width: 0;
}

.chat-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  max-width: 95%;
  padding: 0rem 1.5rem 1rem 1.5rem;
  border-radius: 12px;
  line-height: 1.4;
}

.message.user {
  align-self: flex-end;
  background-color: #3498db;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.bot {
  align-self: flex-start;
  background-color: #f8f9fa;
  color: #2c3e50;
  border-bottom-left-radius: 4px;
  border: 1px solid #ecf0f1;
}

.chat-input {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #eee;
  gap: 0.5rem;
}

.chat-input input {
  flex: 1;
  padding: 0.8rem 1.2rem;
  border: 1px solid #ddd;
  border-radius: 24px;
  outline: none;
  font-size: 1rem;
}

.chat-input button {
  padding: 0.8rem 1.5rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
}

.chat-input button:hover {
  background-color: #2980b9;
}

/* 为Markdown内容添加更多样式 */
.message-text {
  word-wrap: break-word;
}

.message-text img {
  max-width: 100%;
  border-radius: 8px;
}

.message-text code {
  background: #f1f2f6;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.message-text pre {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.message-text blockquote {
  border-left: 4px solid #3498db;
  background: #f8f9fa;
  margin: 1rem 0;
  padding: 1rem 1.5rem;
  border-radius: 0 6px 6px 0;
}

/* 思考中指示器样式 */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #3498db;
  animation: thinking-bounce 1.4s ease-in-out infinite both;
}

.thinking-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.thinking-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

.thinking-dots .dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes thinking-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.thinking-text {
  color: #666;
  font-size: 14px;
  font-style: italic;
  animation: thinking-pulse 2s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>