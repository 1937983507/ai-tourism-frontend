<template>
  <div class="map-container">
    <div class="map-header">
      <div><i class="fas fa-map-marked-alt"></i> 位置信息</div>
      <button class="toggle-btn" @click="$emit('refresh-location')">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>
    <div id="map"></div>
    <div class="location-info">
      <p><i class="fas fa-map-marker-alt"></i> 当前位置: {{ location }}</p>
      <p><i class="fas fa-clock"></i> 上次更新: {{ updateTime }}</p>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue'

export default {
  name: 'MapContainer',
  props: {
    location: String,
    updateTime: String
  },
  emits: ['refresh-location'],
  setup() {
    onMounted(() => {
      try {
        const map = new AMap.Map('map', {
          zoom: 13,
          center: [116.397428, 39.90923],
          viewMode: '3D'
        })
      } catch (error) {
        console.error('地图初始化失败:', error)
        const mapElement = document.getElementById('map')
        if (mapElement) {
          mapElement.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
              <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
              <p>地图加载失败</p>
              <p>请检查高德地图API密钥配置</p>
            </div>
          `
        }
      }
    })

    return {}
  }
}
</script>

<style scoped>
.map-container {
  flex: 2;
  display: flex;
  flex-direction: column;
  max-width: 1300px;
  border-left: 1px solid #ddd;
  background-color: white;
  min-width: 0;
}

.map-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#map {
  flex: 1;
  min-height: 200px;
}

.location-info {
  padding: 1rem;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
}

.location-info p {
  margin-bottom: 0.5rem;
}

@media (max-width: 992px) {
  .map-container {
    max-width: 300px;
  }
}

@media (max-width: 768px) {
  .map-container {
    max-width: 100%;
    height: 300px;
    border-left: none;
    border-top: 1px solid #ddd;
  }
}
</style>