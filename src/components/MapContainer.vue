<template>
  <div class="map-container">
    <div class="map-header">
      <div><i class="fas fa-map-marked-alt"></i> 旅游路线规划</div>
      <div class="map-controls">
        <button class="control-btn" @click="toggleSatelliteView" v-if="canShowSatellite">
          <i :class="isSatelliteView ? 'fas fa-map' : 'fas fa-satellite'"></i>
          {{ isSatelliteView ? '街道图' : '卫星图' }}
        </button>
        <div class="tile-style-dropdown" v-if="canSwitchTileStyle">
          <button class="control-btn dropdown-btn" @click="toggleTileStyleDropdown">
            <i class="fas fa-palette"></i>
            {{ currentTileStyle.name }}
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-menu" v-if="showTileStyleDropdown">
            <button 
              v-for="(style, key) in availableTileStyles" 
              :key="key"
              :class="['dropdown-item', { active: currentTileStyleKey === key }]"
              @click="switchTileStyle(key)"
            >
              {{ style.name }}
            </button>
          </div>
        </div>
        <button class="control-btn" @click="fitToRoutes">
          <i class="fas fa-expand-alt"></i>
          适应路线
        </button>
      </div>
    </div>
    
    <div id="map" :class="{ 'loading': isLoading }">
      <!-- 加载指示器 -->
      <div v-if="isLoading" class="map-loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <div class="loading-text">{{ loadingText }}</div>
          <div class="loading-progress" v-if="loadingProgress > 0">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ loadingProgress }}%</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="route-panel" v-if="currentRoute">
      <div class="panel-header">
        <h4><i class="fas fa-route"></i> {{ currentRoute.title }}</h4>
        <button class="close-btn" @click="clearAll">×</button>
      </div>
      
      <div class="days-tabs">
        <button 
          v-for="(day, dayIndex) in currentRoute.days" 
          :key="dayIndex"
          :class="['tab-btn', { active: activeDay === dayIndex }]"
          @click="activeDay = dayIndex"
        >
          第 {{ dayIndex + 1 }} 天
        </button>
      </div>
      
      <div class="day-details" v-if="activeDay !== null">
        <div class="day-summary">
          <i class="fas fa-walking"></i>
          共 {{ currentRoute.days[activeDay].points.length }} 个景点
          <span class="distance" v-if="currentRoute.days[activeDay].distance">
            · 约 {{ currentRoute.days[activeDay].distance }} km
          </span>
        </div>
        
        <div class="points-list">
          <div 
            v-for="(point, pointIndex) in currentRoute.days[activeDay].points" 
            :key="pointIndex"
            :class="['point-item', { active: activePoint === pointIndex }]"
            @click="focusOnPoint(activeDay, pointIndex)"
            @mouseenter="highlightPoint(activeDay, pointIndex)"
            @mouseleave="unhighlightPoint(activeDay, pointIndex)"
          >
            <div class="point-marker">
              <span class="marker-number">{{ pointIndex + 1 }}</span>
            </div>
            <div class="point-info">
              <div class="point-name">{{ point.keyword }}</div>
              <div class="point-city">{{ point.city }}</div>
            </div>
            <i class="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <i class="fas fa-map-marked-alt"></i>
      <p>选择包含路线的会话查看地图</p>
    </div>
  </div>
</template>

<script>
import { onMounted, ref, watch, nextTick, computed } from 'vue'
import { MapServiceManager } from '../utils/mapServiceManager.js'
import { MAP_SERVICES, DEFAULT_MAP_SERVICE, getCurrentMapService, setMapService, isFeatureSupported, getMapConfig } from '../utils/mapConfig.js'

export default {
  name: 'MapContainer',
  props: {
    location: String,
    updateTime: String,
    routeData: Object
  },
  emits: ['refresh-location'],
  setup(props) {
    // 地图服务相关
    const mapServiceManager = ref(new MapServiceManager())
    const currentMapService = ref(getCurrentMapService())
    const map = ref(null)
    const driving = ref(null)
    
    // 调试信息
    console.log('当前地图服务:', currentMapService.value)
    console.log('默认地图服务:', DEFAULT_MAP_SERVICE)
    console.log('localStorage中的mapService:', localStorage.getItem('mapService'))
    
    // 路线和UI状态
    const currentRoute = ref(null)
    const activeDay = ref(0)
    const activePoint = ref(null)
    const isSatelliteView = ref(false)
    const markers = ref([]) // 保存所有标记点
    const infoWindows = ref([]) // 保存信息窗口
    const dayLabels = ref([])
    const satellite = ref(null)
    const polylines = ref([])
    
    // 底图样式切换相关
    const currentTileStyleKey = ref('monochrome')
    const showTileStyleDropdown = ref(false)
    const currentTileLayer = ref(null)
    
    // 加载状态相关
    const isLoading = ref(false)
    const loadingText = ref('正在加载地图...')
    const loadingProgress = ref(0)
    const renderTimeout = ref(null)

    // 计算属性
    const canShowSatellite = computed(() => {
      return isFeatureSupported('satellite', currentMapService.value)
    })
    
    const canSwitchTileStyle = computed(() => {
      return currentMapService.value === MAP_SERVICES.OSM && isFeatureSupported('tileSwitching', currentMapService.value)
    })
    
    const availableTileStyles = computed(() => {
      if (currentMapService.value === MAP_SERVICES.OSM) {
        const config = getMapConfig(MAP_SERVICES.OSM)
        return config.tileLayers || {}
      }
      return {}
    })
    
    const currentTileStyle = computed(() => {
      return availableTileStyles.value[currentTileStyleKey.value] || availableTileStyles.value.monochrome
    })

    // 自定义标记图标
    const createMarkerIcon = (number, color = '#1890FF') => {
      return `
        <div style="
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${number}</div>
      `
    }


    // 创建天数标签
    const createDayLabel = (dayIndex, position, color) => {
      if (currentMapService.value === MAP_SERVICES.AMAP) {
        return new AMap.Text({
          text: `第${dayIndex + 1}天`,
          position: position,
          style: {
            'background-color': color,
            'color': '#fff',
            'border': '2px solid white',
            'border-radius': '15px',
            'padding': '4px 10px',
            'font-size': '12px',
            'font-weight': 'bold',
            'box-shadow': '0 2px 6px rgba(0,0,0,0.3)'
          },
          offset: new AMap.Pixel(0, -10)
        })
      } else if (currentMapService.value === MAP_SERVICES.OSM) {
        // Leaflet文本标记
        const div = document.createElement('div')
        div.innerHTML = `第${dayIndex + 1}天`
        div.style.cssText = `
          background-color: ${color};
          color: white;
          border: 2px solid white;
          border-radius: 15px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          white-space: nowrap;
          pointer-events: none;
          display: inline-block;
          min-width: fit-content;
        `
        // 确保元素被添加到DOM中以便计算尺寸
        div.style.visibility = 'hidden'
        div.style.position = 'absolute'
        div.style.top = '-9999px'
        document.body.appendChild(div)
        const width = div.offsetWidth
        const height = div.offsetHeight
        document.body.removeChild(div)
        
        // 重置样式，确保标记可见
        div.style.visibility = 'visible'
        div.style.position = 'static'
        div.style.top = 'auto'
        
        return L.marker([position[1], position[0]], {
          icon: L.divIcon({
            html: div,
            className: 'custom-day-label',
            iconSize: [width, height],
            iconAnchor: [width / 2, height],
            popupAnchor: [0, -height]
          })
        })
      }
    }


    // 初始化地图
    const initMap = async () => {
      try {
        isLoading.value = true
        loadingText.value = '正在初始化地图服务...'
        
        // 强制使用默认地图服务（如果localStorage中的值不正确）
        if (currentMapService.value !== DEFAULT_MAP_SERVICE) {
          console.log('检测到地图服务不匹配，强制使用默认服务:', DEFAULT_MAP_SERVICE)
          currentMapService.value = DEFAULT_MAP_SERVICE
          setMapService(DEFAULT_MAP_SERVICE)
        }
        
        const result = await mapServiceManager.value.initMapService(currentMapService.value, 'map')
        map.value = result.map
        driving.value = result.routingService
        
        // 如果是高德地图，初始化卫星图层
        if (currentMapService.value === MAP_SERVICES.AMAP && typeof AMap !== 'undefined') {
          satellite.value = new AMap.TileLayer.Satellite()
          map.value.addLayer(satellite.value)
          satellite.value.hide()
        }
        
        // 如果是OSM地图，确保地图正确适应容器
        if (currentMapService.value === MAP_SERVICES.OSM) {
          setTimeout(() => {
            if (map.value && map.value.invalidateSize) {
              map.value.invalidateSize()
            }
          }, 200)
        }
        
        isLoading.value = false
      } catch (error) {
        console.error('地图初始化失败:', error)
        isLoading.value = false
        showMapError()
      }
    }


    // 显示地图错误
    const showMapError = () => {
      const mapElement = document.getElementById('map')
      if (mapElement) {
        mapElement.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #666;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #ff4d4f;"></i>
            <h3 style="margin: 0 0 10px 0;">地图加载失败</h3>
            <p style="margin: 0;">请检查高德地图API密钥配置或网络连接</p>
          </div>
        `
      }
    }

    // 清除所有标记和路线
    const clearAll = () => {
      if (driving.value && driving.value.clear) {
        driving.value.clear()
      }
      
      // 清除所有标记
      markers.value.forEach(dayMarkers => {
        dayMarkers.forEach(marker => {
          if (currentMapService.value === MAP_SERVICES.AMAP) {
            map.value.remove(marker)
          } else if (currentMapService.value === MAP_SERVICES.OSM) {
            map.value.removeLayer(marker)
          }
        })
      })
      markers.value = []
      
      // 清除所有信息窗口
      infoWindows.value.forEach(dayWindows => {
        dayWindows.forEach(window => {
          if (window.close) {
            window.close()
          }
        })
      })
      infoWindows.value = []

      // 清除所有路线
      polylines.value.forEach(polyline => {
        if (currentMapService.value === MAP_SERVICES.AMAP) {
          map.value.remove(polyline)
        } else if (currentMapService.value === MAP_SERVICES.OSM) {
          map.value.removeLayer(polyline)
        }
      })
      polylines.value = []

      // 清除所有天数标签
      dayLabels.value.forEach(label => {
        if (currentMapService.value === MAP_SERVICES.AMAP) {
          map.value.remove(label)
        } else if (currentMapService.value === MAP_SERVICES.OSM) {
          map.value.removeLayer(label)
        }
      })
      dayLabels.value = []
      
      currentRoute.value = null
      activeDay.value = 0
      activePoint.value = null
    }

    // 创建信息窗口内容
    const createInfoWindowContent = (point, dayIndex, pointIndex) => {
      return `
        <div class="custom-info-window">
          <div class="info-header">
            <span class="point-number">${pointIndex + 1}</span>
            <h4>${point.keyword}</h4>
          </div>
          <div class="info-body">
            <p><i class="fas fa-city"></i> ${point.city}</p>
            <p><i class="fas fa-calendar-day"></i> 第 ${dayIndex + 1} 天 · 第 ${pointIndex + 1} 站</p>
        </div>
      `
    }

      // </div>
      // <div class="info-footer">
      //   <button onclick="this.dispatchEvent(new CustomEvent('navigate', { detail: { keyword: '${point.keyword}', city: '${point.city}' } }))">
      //     <i class="fas fa-directions"></i> 导航至此
      //   </button>
      // </div>


    // 计算路径中间点位置
    const getPathMidpoint = (path) => {
      if (!path || path.length === 0) return null
      const midIndex = Math.floor(path.length / 2)
      return path[midIndex]
    }

    // 防抖渲染函数
    const debouncedRenderRoute = (routeData) => {
      if (renderTimeout.value) {
        clearTimeout(renderTimeout.value)
      }
      
      renderTimeout.value = setTimeout(() => {
        renderRoute(routeData)
      }, 300) // 300ms防抖
    }

    // 渲染路线和标记 - 优化版本
    const renderRoute = async (routeData) => {
      if (!driving.value || !map.value) return
      
      // 开始加载状态
      isLoading.value = true
      loadingText.value = '正在解析路线数据...'
      loadingProgress.value = 0
      
      try {
        clearAll()
        
        const parsedData = JSON.parse(routeData.daily_routes)
        const dailyRoutes = parsedData.dailyRoutes
        
        if (!dailyRoutes || dailyRoutes.length === 0) {
          isLoading.value = false
          return
        }
        
        currentRoute.value = {
          title: routeData.title,
          days: []
        }

        const colors = [
          { primary: '#1890FF', light: '#E6F7FF' }, // 蓝色
          { primary: '#52C41A', light: '#F6FFED' }, // 绿色
          { primary: '#722ED1', light: '#F9F0FF' },  // 紫色
          { primary: '#F5222D', light: '#FFF1F0' }, // 红色
          { primary: '#FAAD14', light: '#FFFBE6' } // 橙色
        ]

        // 初始化标记和窗口数组
        markers.value = []
        infoWindows.value = []
        
        // 批量收集所有需要添加的元素
        const elementsToAdd = []
        
        for (let dayIndex = 0; dayIndex < dailyRoutes.length; dayIndex++) {
          loadingText.value = `正在生成第 ${dayIndex + 1} 天路线...`
          loadingProgress.value = Math.round((dayIndex / dailyRoutes.length) * 80)
          
          const dayRoute = dailyRoutes[dayIndex]
          const points = dayRoute.points
          const color = colors[dayIndex % colors.length]
          
          // 保存当天的景点信息
          const dayInfo = {
            points: points.map(p => ({ keyword: p.keyword, city: p.city })),
            distance: 0
          }
          
          currentRoute.value.days.push(dayInfo)
          
          const searchPoints = points.map(point => ({
            keyword: point.keyword,
            city: point.city
          }))
          
          await new Promise((resolve) => {
            driving.value.search(searchPoints, (status, result) => {
              if (status === 'complete') {
                if (result.routes && result.routes.length > 0) {
                  const route = result.routes[0]
                  
                  // 计算距离
                  dayInfo.distance = (route.distance / 1000).toFixed(1)
                  
                  // 绘制路线
                  const path = route.steps.reduce((acc, step) => {
                    return acc.concat(step.path)
                  }, [])
                  
                  let polyline
                  if (currentMapService.value === MAP_SERVICES.AMAP) {
                    polyline = new AMap.Polyline({
                      path: path,
                      strokeColor: color.primary,
                      strokeWeight: 6,
                      strokeOpacity: 0.8,
                      strokeStyle: 'solid',
                      strokeDasharray: dayIndex === 0 ? [] : [5, 5]
                    })
                  } else if (currentMapService.value === MAP_SERVICES.OSM) {
                    // 转换路径格式为Leaflet格式 [lat, lng]
                    const leafletPath = path.map(coord => [coord[1], coord[0]])
                    polyline = L.polyline(leafletPath, {
                      color: color.primary,
                      weight: 6,
                      opacity: 0.8,
                      dashArray: dayIndex === 0 ? null : '5, 5'
                    })
                  }
                  
                  elementsToAdd.push(polyline)
                  polylines.value.push(polyline)

                  // 在路线中间添加天数标签
                  const midpoint = getPathMidpoint(path)
                  if (midpoint) {
                    const dayLabel = createDayLabel(dayIndex, midpoint, color.primary)
                    elementsToAdd.push(dayLabel)
                    dayLabels.value.push(dayLabel)
                  }

                  // 初始化当天的标记数组
                  markers.value[dayIndex] = []
                  infoWindows.value[dayIndex] = []

                  // 创建起点标记
                  let startMarker
                  if (currentMapService.value === MAP_SERVICES.AMAP) {
                    startMarker = new AMap.Marker({
                      position: path[0],
                      content: `
                        <div style="
                          background-color: ${color.primary};
                          color: white;
                          padding: 4px 8px;
                          border-radius: 12px;
                          font-size: 12px;
                          font-weight: bold;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          white-space: nowrap;
                        ">起点</div>
                      `,
                      offset: new AMap.Pixel(-20, -10)
                    })
                  } else if (currentMapService.value === MAP_SERVICES.OSM) {
                    const startDiv = document.createElement('div')
                    startDiv.innerHTML = '起点'
                    startDiv.style.cssText = `
                      background-color: ${color.primary};
                      color: white;
                      padding: 6px 12px;
                      border-radius: 12px;
                      font-size: 12px;
                      font-weight: bold;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                      white-space: nowrap;
                      display: inline-block;
                      min-width: fit-content;
                    `
                    // 确保元素被添加到DOM中以便计算尺寸
                    startDiv.style.visibility = 'hidden'
                    startDiv.style.position = 'absolute'
                    startDiv.style.top = '-9999px'
                    document.body.appendChild(startDiv)
                    const width = startDiv.offsetWidth
                    const height = startDiv.offsetHeight
                    document.body.removeChild(startDiv)
                    
                    // 重置样式，确保标记可见
                    startDiv.style.visibility = 'visible'
                    startDiv.style.position = 'static'
                    startDiv.style.top = 'auto'
                    
                    startMarker = L.marker([path[0][1], path[0][0]], {
                      icon: L.divIcon({
                        html: startDiv,
                        className: 'custom-marker',
                        iconSize: [width, height],
                        iconAnchor: [width / 2, height],
                        popupAnchor: [0, -height]
                      })
                    })
                  }

                  let startInfoWindow
                  if (currentMapService.value === MAP_SERVICES.AMAP) {
                    startInfoWindow = new AMap.InfoWindow({
                      content: createInfoWindowContent(
                        points[0] || { keyword: '未知地点', city: '未知城市' },
                        dayIndex,
                        0
                      ),
                      offset: new AMap.Pixel(0, -30),
                      closeWhenClickMap: true
                    })
                    
                    startMarker.on('click', () => {
                      infoWindows.value.forEach(dayWindows => {
                        dayWindows.forEach(w => w.close())
                      })
                      startInfoWindow.open(map.value, startMarker.getPosition())
                      activeDay.value = dayIndex
                      activePoint.value = 0
                    })
                  } else if (currentMapService.value === MAP_SERVICES.OSM) {
                    const popup = L.popup({
                      closeButton: true,
                      autoClose: true,
                      closeOnClick: true
                    }).setContent(createInfoWindowContent(
                      points[0] || { keyword: '未知地点', city: '未知城市' },
                      dayIndex,
                      0
                    ))
                    
                    startMarker.bindPopup(popup)
                    startInfoWindow = popup
                    
                    startMarker.on('click', () => {
                      // 关闭其他弹窗
                      map.value.closePopup()
                      popup.openOn(map.value)
                      activeDay.value = dayIndex
                      activePoint.value = 0
                    })
                  }
                  
                  elementsToAdd.push(startMarker)
                  infoWindows.value[dayIndex].push(startInfoWindow)  
                  markers.value[dayIndex].push(startMarker)

                  // 添加中间标记点
                  if (result.waypoints && result.waypoints.length > 0) {
                    result.waypoints.forEach((waypoint, pointIndex) => {
                      let marker
                      if (currentMapService.value === MAP_SERVICES.AMAP) {
                        marker = new AMap.Marker({
                          position: waypoint.location,
                          offset: new AMap.Pixel(-16, -16),
                          title: points[pointIndex]?.keyword || '未知地点'
                        })
                      } else if (currentMapService.value === MAP_SERVICES.OSM) {
                        const location = waypoint.location
                        marker = L.marker([location.lat, location.lng], {
                          title: points[pointIndex]?.keyword || '未知地点'
                        })
                      }
                      
                      let infoWindow
                      if (currentMapService.value === MAP_SERVICES.AMAP) {
                        infoWindow = new AMap.InfoWindow({
                          content: createInfoWindowContent(
                            points[pointIndex+1] || { keyword: '未知地点', city: '未知城市' },
                            dayIndex,
                            pointIndex+1
                          ),
                          offset: new AMap.Pixel(0, -30),
                          closeWhenClickMap: true
                        })
                        
                        marker.on('click', () => {
                          infoWindows.value.forEach(dayWindows => {
                            dayWindows.forEach(w => w.close())
                          })
                          infoWindow.open(map.value, marker.getPosition())
                          activeDay.value = dayIndex
                          activePoint.value = pointIndex + 1
                        })
                      } else if (currentMapService.value === MAP_SERVICES.OSM) {
                        const popup = L.popup({
                          closeButton: true,
                          autoClose: true,
                          closeOnClick: true
                        }).setContent(createInfoWindowContent(
                          points[pointIndex+1] || { keyword: '未知地点', city: '未知城市' },
                          dayIndex,
                          pointIndex+1
                        ))
                        
                        marker.bindPopup(popup)
                        infoWindow = popup
                        
                        marker.on('click', () => {
                          map.value.closePopup()
                          popup.openOn(map.value)
                          activeDay.value = dayIndex
                          activePoint.value = pointIndex + 1
                        })
                      }
                      
                      elementsToAdd.push(marker)
                      markers.value[dayIndex].push(marker)
                      infoWindows.value[dayIndex].push(infoWindow)
                    })
                  }
                  
                  // 创建终点标记
                  let endMarker
                  if (currentMapService.value === MAP_SERVICES.AMAP) {
                    endMarker = new AMap.Marker({
                      position: path[path.length - 1],
                      content: `
                        <div style="
                          background-color: ${color.primary};
                          color: white;
                          padding: 4px 8px;
                          border-radius: 12px;
                          font-size: 12px;
                          font-weight: bold;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          white-space: nowrap;
                        ">终点</div>
                      `,
                      offset: new AMap.Pixel(-20, -10)
                    })
                  } else if (currentMapService.value === MAP_SERVICES.OSM) {
                    const endDiv = document.createElement('div')
                    endDiv.innerHTML = '终点'
                    endDiv.style.cssText = `
                      background-color: ${color.primary};
                      color: white;
                      padding: 6px 12px;
                      border-radius: 12px;
                      font-size: 12px;
                      font-weight: bold;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                      white-space: nowrap;
                      display: inline-block;
                      min-width: fit-content;
                    `
                    // 确保元素被添加到DOM中以便计算尺寸
                    endDiv.style.visibility = 'hidden'
                    endDiv.style.position = 'absolute'
                    endDiv.style.top = '-9999px'
                    document.body.appendChild(endDiv)
                    const width = endDiv.offsetWidth
                    const height = endDiv.offsetHeight
                    document.body.removeChild(endDiv)
                    
                    // 重置样式，确保标记可见
                    endDiv.style.visibility = 'visible'
                    endDiv.style.position = 'static'
                    endDiv.style.top = 'auto'
                    
                    endMarker = L.marker([path[path.length - 1][1], path[path.length - 1][0]], {
                      icon: L.divIcon({
                        html: endDiv,
                        className: 'custom-marker',
                        iconSize: [width, height],
                        iconAnchor: [width / 2, height],
                        popupAnchor: [0, -height]
                      })
                    })
                  }

                  let endInfoWindow
                  if (currentMapService.value === MAP_SERVICES.AMAP) {
                    endInfoWindow = new AMap.InfoWindow({
                      content: createInfoWindowContent(
                        points[points.length-1] || { keyword: '未知地点', city: '未知城市' },
                        dayIndex,
                        points.length - 1
                      ),
                      offset: new AMap.Pixel(0, -30),
                      closeWhenClickMap: true
                    })
                    
                    endMarker.on('click', () => {
                      infoWindows.value.forEach(dayWindows => {
                        dayWindows.forEach(w => w.close())
                      })
                      endInfoWindow.open(map.value, endMarker.getPosition())
                      activeDay.value = dayIndex
                      activePoint.value = points.length - 1
                    })
                  } else if (currentMapService.value === MAP_SERVICES.OSM) {
                    const popup = L.popup({
                      closeButton: true,
                      autoClose: true,
                      closeOnClick: true
                    }).setContent(createInfoWindowContent(
                      points[points.length-1] || { keyword: '未知地点', city: '未知城市' },
                      dayIndex,
                      points.length - 1
                    ))
                    
                    endMarker.bindPopup(popup)
                    endInfoWindow = popup
                    
                    endMarker.on('click', () => {
                      map.value.closePopup()
                      popup.openOn(map.value)
                      activeDay.value = dayIndex
                      activePoint.value = points.length - 1
                    })
                  }
                  
                  elementsToAdd.push(endMarker)
                  infoWindows.value[dayIndex].push(endInfoWindow)  
                  markers.value[dayIndex].push(endMarker)
                }
                resolve()
              } else {
                console.error(`第${dayIndex + 1}天路线规划失败:`, result)
                resolve()
              }
            })
          })
        }
        
        // 批量添加所有元素到地图
        loadingText.value = '正在渲染地图元素...'
        loadingProgress.value = 85
        
        if (elementsToAdd.length > 0) {
          if (currentMapService.value === MAP_SERVICES.AMAP) {
            map.value.add(elementsToAdd)
          } else if (currentMapService.value === MAP_SERVICES.OSM) {
            elementsToAdd.forEach(element => {
              if (element.addTo) {
                element.addTo(map.value)
              }
            })
          }
        }
        
        // 适应视图显示所有标记
        loadingText.value = '正在调整地图视图...'
        loadingProgress.value = 95
        
        await nextTick()
        fitToRoutes()
        
        // 完成加载
        loadingProgress.value = 100
        setTimeout(() => {
          isLoading.value = false
        }, 500)
        
      } catch (error) {
        console.error('路线数据解析失败:', error)
        isLoading.value = false
      }
    }

    // 聚焦到特定点
    const focusOnPoint = (dayIndex, pointIndex) => {
      activePoint.value = pointIndex
      const marker = markers.value[dayIndex][pointIndex]
      if (marker) {
        if (currentMapService.value === MAP_SERVICES.AMAP) {
          map.value.setCenter(marker.getPosition(), true, 100)
          map.value.setZoom(15)
        } else if (currentMapService.value === MAP_SERVICES.OSM) {
          const position = marker.getLatLng()
          map.value.setView(position, 15)
        }
      }

      // 显示信息窗口
      if (infoWindows.value[dayIndex] && infoWindows.value[dayIndex][pointIndex]) {
        // 关闭所有其他信息窗口
        infoWindows.value.forEach(dayWindows => {
          dayWindows.forEach((window, index) => {
            if(window && window.close) window.close()
          })
        })
        
        // 打开当前信息窗口
        setTimeout(() => {
          const infoWindow = infoWindows.value[dayIndex][pointIndex]
          if (currentMapService.value === MAP_SERVICES.AMAP) {
            infoWindow.open(map.value, marker.getPosition())
          } else if (currentMapService.value === MAP_SERVICES.OSM) {
            infoWindow.openOn(map.value)
          }
        }, 100)
      }
    }

    // 高亮标记点
    const highlightPoint = (dayIndex, pointIndex) => {
      // 可以在这里实现鼠标悬停效果
    }

    const unhighlightPoint = (dayIndex, pointIndex) => {
      // 取消高亮
    }


    // 切换卫星视图
    const toggleSatelliteView = () => {
      if (currentMapService.value === MAP_SERVICES.AMAP && satellite.value) {
        isSatelliteView.value = !isSatelliteView.value
        if(isSatelliteView.value){
          satellite.value.show();
        }else{
          satellite.value.hide();
        }
      }
    }

    // 适应路线视图
    const fitToRoutes = () => {
      if (markers.value.length > 0) {
        // 初始化边界值
        let minLng = Infinity;
        let minLat = Infinity;
        let maxLng = -Infinity;
        let maxLat = -Infinity;
        
        // 遍历所有 markers
        for (let i = 0; i < markers.value.length; i++) {
            const markerGroup = markers.value[i];
            
            for (let j = 0; j < markerGroup.length; j++) {
                const marker = markerGroup[j];
                let position
                
                if (currentMapService.value === MAP_SERVICES.AMAP) {
                  position = marker.getPosition();
                  minLng = Math.min(minLng, position.lng);
                  minLat = Math.min(minLat, position.lat);
                  maxLng = Math.max(maxLng, position.lng);
                  maxLat = Math.max(maxLat, position.lat);
                } else if (currentMapService.value === MAP_SERVICES.OSM) {
                  position = marker.getLatLng();
                  minLng = Math.min(minLng, position.lng);
                  minLat = Math.min(minLat, position.lat);
                  maxLng = Math.max(maxLng, position.lng);
                  maxLat = Math.max(maxLat, position.lat);
                }
            }
        }
        
        // 如果没有有效的 markers，返回 null 或默认值
        if (minLng === Infinity) {
            return null; // 或者返回默认范围
        }

        if (currentMapService.value === MAP_SERVICES.AMAP) {
          let lng = maxLng-minLng;
          let lat = maxLat-minLat;
          var mybounds = new AMap.Bounds([minLng-lng*0.4, minLat-lat*0.4], [maxLng+lng*0.4, maxLat+lat*0.4]);
          map.value.setBounds(mybounds);
        } else if (currentMapService.value === MAP_SERVICES.OSM) {
          const bounds = L.latLngBounds(
            L.latLng(minLat - (maxLat - minLat) * 0.2, minLng - (maxLng - minLng) * 0.2),
            L.latLng(maxLat + (maxLat - minLat) * 0.2, maxLng + (maxLng - minLng) * 0.2)
          );
          map.value.fitBounds(bounds);
        }
      }
    }

    // 监听routeData变化 - 使用防抖版本
    watch(() => props.routeData, (newVal) => {
      if (newVal && newVal.daily_routes) {
        debouncedRenderRoute(newVal)
      } else {
        clearAll()
      }
    })


    // 切换底图样式下拉菜单
    const toggleTileStyleDropdown = () => {
      showTileStyleDropdown.value = !showTileStyleDropdown.value
    }

    // 切换底图样式
    const switchTileStyle = async (styleKey) => {
      if (currentMapService.value === MAP_SERVICES.OSM && map.value) {
        try {
          const style = availableTileStyles.value[styleKey]
          if (style) {
            // 移除当前底图图层
            if (currentTileLayer.value) {
              map.value.removeLayer(currentTileLayer.value)
            }
            
            // 添加新的底图图层
            currentTileLayer.value = L.tileLayer(style.url, {
              attribution: style.attribution,
              maxZoom: style.maxZoom || 19
            })
            
            currentTileLayer.value.addTo(map.value)
            currentTileStyleKey.value = styleKey
            showTileStyleDropdown.value = false
            
            console.log('底图样式已切换为:', style.name)
          }
        } catch (error) {
          console.error('切换底图样式失败:', error)
        }
      }
    }

    onMounted(() => {
      initMap()
    })

    return {
      currentRoute,
      activeDay,
      activePoint,
      isSatelliteView,
      isLoading,
      loadingText,
      loadingProgress,
      currentMapService,
      canShowSatellite,
      canSwitchTileStyle,
      availableTileStyles,
      currentTileStyle,
      currentTileStyleKey,
      showTileStyleDropdown,
      clearAll,
      focusOnPoint,
      highlightPoint,
      unhighlightPoint,
      toggleSatelliteView,
      toggleTileStyleDropdown,
      switchTileStyle,
      fitToRoutes
    }
  }
}
</script>

<style scoped>
.map-container {
  flex: 2;
  display: flex;
  flex-direction: column;
  position: relative;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #3498db, #2c3e50);
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.map-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}


.control-btn {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.control-btn:hover {
  background: rgba(255,255,255,0.3);
}

/* 底图样式切换下拉菜单 */
.tile-style-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dropdown-btn .fas.fa-chevron-down {
  font-size: 10px;
  transition: transform 0.3s;
}

.dropdown-btn:hover .fas.fa-chevron-down {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 150px;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 15px;
  border: none;
  background: none;
  text-align: left;
  color: #333;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
  font-weight: bold;
}

.dropdown-item.active::after {
  content: "✓";
  float: right;
  color: #1890ff;
}

#map {
  flex: 1;
  min-height: 400px;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

#map.loading {
  pointer-events: none;
}

.map-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  font-weight: 500;
}

.loading-progress {
  margin-top: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
}

.route-panel {
  position: absolute;
  top: 70px;
  left: 20px;
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: calc(100% - 90px);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h4 {
  margin: 0;
  color: #1890ff;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.days-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  border-bottom-color: #1890ff;
  color: #1890ff;
}

.day-details {
  flex: 1;
  overflow-y: auto;
}

.day-summary {
  padding: 15px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  color: #666;
  font-size: 14px;
}

.distance {
  color: #1890ff;
  font-weight: bold;
}

.points-list {
  padding: 10px 0;
}

.point-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.3s;
}

.point-item:hover {
  background: #f5f5f5;
  border-left-color: #1890ff;
}

.point-item.active {
  background: #e6f7ff;
  border-left-color: #1890ff;
}

.point-marker {
  margin-right: 10px;
}

.marker-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.point-info {
  flex: 1;
}

.point-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.point-city {
  font-size: 12px;
  color: #999;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #999;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 10px;
  opacity: 0.5;
}

/* 自定义信息窗口样式 */
:deep(.custom-info-window) {
  padding: 0;
  min-width: 200px;
}

:deep(.info-header) {
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: white;
  padding: 12px;
  display: flex;
  align-items: center;
}

:deep(.info-header .point-number) {
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-weight: bold;
}

:deep(.info-header h4) {
  margin: 0;
  font-size: 14px;
}

:deep(.info-body) {
  padding: 12px;
  font-size: 12px;
  color: #666;
}

:deep(.info-body p) {
  margin: 4px 0;
}

:deep(.info-footer) {
  padding: 8px 12px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

:deep(.info-footer button) {
  background: #1890ff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/* Leaflet地图样式调整 */
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.leaflet-control-container) {
  z-index: 100;
}

:deep(.leaflet-popup) {
  z-index: 1000;
}

:deep(.leaflet-marker-icon) {
  z-index: 500;
}

/* 隐藏Leaflet默认定位点图标 */
:deep(.leaflet-default-icon) {
  display: none !important;
}

:deep(.leaflet-marker-icon:not(.custom-marker):not(.custom-day-label)) {
  display: none !important;
}

/* 确保自定义标记显示 */
:deep(.leaflet-marker-icon.custom-marker),
:deep(.leaflet-marker-icon.custom-day-label) {
  display: block !important;
}

/* 自定义标记样式优化 */
:deep(.custom-marker) {
  background: transparent !important;
  border: none !important;
}

:deep(.custom-day-label) {
  background: transparent !important;
  border: none !important;
}

/* 确保自定义标记内容正确显示 */
:deep(.custom-marker div),
:deep(.custom-day-label div) {
  position: relative;
  z-index: 1000;
}

/* 确保标记在地图缩放时保持稳定 */
:deep(.leaflet-marker-icon.custom-marker),
:deep(.leaflet-marker-icon.custom-day-label) {
  transform-origin: center bottom;
  transition: none;
}

/* 防止标记在缩放时漂移 */
:deep(.leaflet-zoom-animated .leaflet-marker-icon.custom-marker),
:deep(.leaflet-zoom-animated .leaflet-marker-icon.custom-day-label) {
  transform: none !important;
}

/* 确保自定义标记可见 */
:deep(.custom-marker),
:deep(.custom-day-label) {
  visibility: visible !important;
  opacity: 1 !important;
}

:deep(.custom-marker div),
:deep(.custom-day-label div) {
  visibility: visible !important;
  opacity: 1 !important;
}
</style>