<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <h2><i class="fas fa-history"></i> 对话历史</h2>
      <button class="toggle-btn" @click="$emit('toggle-sidebar')">
        <i class="fas fa-chevron-left"></i>
      </button>
    </div>
    
    <button class="new-chat-btn" @click="$emit('new-conversation')">
      <i class="fas fa-plus"></i> 开启新对话
    </button>
    
    <div class="conversation-list" ref="listRef" @scroll="onScroll">
      <div 
        v-for="(conversation, index) in sessionList" 
        :key="index" 
        class="conversation-item"
        :class="{ active: currentSessionId === conversation.session_id }"
        @click="$emit('select-conversation', conversation)"
      >
        <i class="fas fa-comment-dots conversation-icon"></i>
        {{ conversation.title }}
      </div>
      <div v-if="isLoadingMore" class="loading-more">加载中...</div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, watch } from 'vue'
export default {
  name: 'Sidebar',
  props: {
    isCollapsed: Boolean,
    sessionList: Array,
    currentSessionId: String,
    hasMore: { type: Boolean, default: true }
  },
  emits: ['toggle-sidebar', 'select-conversation', 'new-conversation', 'load-more'],
  setup(props, { emit }) {
    const listRef = ref(null)
    const isLoadingMore = ref(false)
    const autoFillAttempts = ref(0)

    function onScroll(e) {
      const el = e.target
      if (!el || isLoadingMore.value) return
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
      if (nearBottom) {
        isLoadingMore.value = true
        emit('load-more', () => {
          isLoadingMore.value = false
        })
      }
    }

    async function ensureScrollable() {
      await nextTick()
      const el = listRef.value
      if (!el) return
      const canScroll = el.scrollHeight > el.clientHeight + 2
      if (!canScroll && props.hasMore && !isLoadingMore.value && autoFillAttempts.value < 5) {
        autoFillAttempts.value += 1
        isLoadingMore.value = true
        emit('load-more', async () => {
          isLoadingMore.value = false
          await ensureScrollable()
        })
      }
    }

    onMounted(() => {
      ensureScrollable()
    })

    watch(() => props.sessionList, () => {
      ensureScrollable()
    })

    watch(() => props.hasMore, () => {
      ensureScrollable()
    })

    return { listRef, onScroll, isLoadingMore }
  }
}
</script>

<style scoped>
.sidebar {
  width: 300px;
  background: linear-gradient(180deg, rgba(44,62,80,1) 0%, rgba(44,62,80,.96) 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
  border-right: 1px solid rgba(255,255,255,.06);
}

.sidebar.collapsed {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  padding: 16px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.toggle-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.toggle-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.new-chat-btn {
  background-color: #3498db;
  color: #fff;
  border: none;
  padding: 12px;
  margin: 14px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s, box-shadow .2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
}

.new-chat-btn:hover {
  background-color: #2980b9;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.loading-more {
  padding: 10px 12px;
  text-align: center;
  color: rgba(255,255,255,.8);
  font-size: 12px;
}

.conversation-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s, transform .05s ease;
  display: flex;
  align-items: center;
}

.conversation-item:hover {
  background-color: #34495e;
}

.conversation-item.active {
  background-color: #3498db;
}

.conversation-icon {
  margin-right: 10px;
  font-size: 0.95rem;
}

@media (max-width: 992px) {
  .sidebar {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    height: 100%;
    z-index: 10;
  }
}
</style>