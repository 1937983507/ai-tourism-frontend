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
        v-for="section in groupedSections" 
        :key="section.key"
        class="conversation-section"
      >
        <div class="section-label">{{ section.label }}</div>
        <div 
          v-for="(conversation, index) in section.items" 
          :key="section.key + '-' + index" 
          class="conversation-item"
          :class="{ active: currentSessionId === conversation.session_id }"
          @click="$emit('select-conversation', conversation)"
        >
          <i class="fas fa-comment-dots conversation-icon"></i>
          {{ conversation.title }}
        </div>
      </div>
      <div v-if="isLoadingMore" class="loading-more">加载中...</div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, watch, computed } from 'vue'
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

    function parseDateTime(dateTimeStr) {
      if (!dateTimeStr) return null
      // expected format: YYYY-MM-DD HH:mm:ss
      const [datePart, timePart] = dateTimeStr.split(' ')
      if (!datePart) return null
      const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10))
      let hh = 0, mm = 0, ss = 0
      if (timePart) {
        const parts = timePart.split(':').map(n => parseInt(n, 10))
        hh = parts[0] || 0; mm = parts[1] || 0; ss = parts[2] || 0
      }
      return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss)
    }

    function isSameDay(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    }

    function daysDiff(from, to) {
      // normalize to local midnight
      const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
      const ms = b.getTime() - a.getTime()
      return Math.round(ms / 86400000)
    }

    const groupedSections = computed(() => {
      const now = new Date()
      const todayItems = []
      const yesterdayItems = []
      const sevenDaysItems = []
      const withinThirtyItems = []
      const monthGroups = new Map()

      const list = Array.isArray(props.sessionList) ? props.sessionList : []
      for (const conv of list) {
        const dt = parseDateTime(conv.last_time)
        if (!dt) { withinThirtyItems.push(conv); continue }
        if (isSameDay(dt, now)) {
          todayItems.push(conv)
          continue
        }
        const diff = daysDiff(dt, now)
        if (diff === 1) {
          yesterdayItems.push(conv)
        } else if (diff > 1 && diff <= 7) {
          sevenDaysItems.push(conv)
        } else if (diff > 7 && diff <= 30) {
          withinThirtyItems.push(conv)
        } else {
          const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
          if (!monthGroups.has(ym)) monthGroups.set(ym, [])
          monthGroups.get(ym).push(conv)
        }
      }

      const sections = []
      if (todayItems.length) sections.push({ key: 'today', label: '今天', items: todayItems })
      if (yesterdayItems.length) sections.push({ key: 'yesterday', label: '昨天', items: yesterdayItems })
      if (sevenDaysItems.length) sections.push({ key: 'within7', label: '7天内', items: sevenDaysItems })
      if (withinThirtyItems.length) sections.push({ key: 'within30', label: '30天内', items: withinThirtyItems })

      // Append monthly sections for >30 days, sorted newest -> oldest
      const monthKeys = Array.from(monthGroups.keys()).sort((a, b) => b.localeCompare(a))
      for (const key of monthKeys) {
        sections.push({ key: `month-${key}`, label: key, items: monthGroups.get(key) })
      }
      return sections
    })

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

    return { listRef, onScroll, isLoadingMore, groupedSections }
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

.conversation-section {
  margin-bottom: 10px;
}

.section-label {
  color: rgba(255,255,255,.7);
  font-size: 12px;
  margin: 8px 0 6px 2px;
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