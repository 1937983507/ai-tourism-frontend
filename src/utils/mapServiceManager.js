// 地图服务管理器
import { MAP_SERVICES, getMapConfig, isFeatureSupported } from './mapConfig.js'

export class MapServiceManager {
  constructor() {
    this.currentService = null
    this.mapInstance = null
    this.routingService = null
  }

  // 初始化地图服务
  async initMapService(service, containerId) {
    this.currentService = service
    const config = getMapConfig(service)

    if (!config || !config.enabled) {
      throw new Error(`地图服务 ${service} 未启用或不存在`)
    }

    switch (service) {
      case MAP_SERVICES.AMAP:
        return await this.initAmapMap(containerId)
      case MAP_SERVICES.OSM:
        return await this.initOsmMap(containerId)
      default:
        throw new Error(`不支持的地图服务: ${service}`)
    }
  }

  // 初始化高德地图
  async initAmapMap(containerId) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof AMap === 'undefined') {
          reject(new Error('高德地图API未加载'))
          return
        }

        const map = new AMap.Map(containerId, {
          zoom: 12,
          center: [116.397, 39.905],
          features: ['bg', 'road', 'building'],
          mapStyle: 'amap://styles/normal'
        })

        // 初始化驾车导航插件
        AMap.plugin(['AMap.Driving'], () => {
          const driving = new AMap.Driving({
            map: map,
            policy: AMap.DrivingPolicy.LEAST_TIME,
            hideMarkers: true,
            showTraffic: true,
            autoFitView: false
          })
          
          this.mapInstance = map
          this.routingService = driving
          resolve({ map, routingService: driving })
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // 初始化OSM地图
  async initOsmMap(containerId) {
    return new Promise((resolve, reject) => {
      try {
        // 动态加载Leaflet
        if (typeof L === 'undefined') {
          this.loadLeaflet().then(() => {
            this.initLeafletMap(containerId, resolve, reject)
          }).catch(reject)
        } else {
          this.initLeafletMap(containerId, resolve, reject)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // 加载Leaflet库
  loadLeaflet() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('link[href*="leaflet"]')) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // 初始化Leaflet地图
  initLeafletMap(containerId, resolve, reject) {
    try {
      const config = getMapConfig(MAP_SERVICES.OSM)
      const map = L.map(containerId, {
        preferCanvas: true,
        zoomControl: true,
        attributionControl: true
      }).setView([39.905, 116.397], 13)

      // 添加OSM瓦片图层（使用默认样式）
      const defaultTileLayer = config.tileLayers.monochrome
      L.tileLayer(defaultTileLayer.url, {
        attribution: defaultTileLayer.attribution,
        maxZoom: defaultTileLayer.maxZoom || 19,
        noWrap: true
      }).addTo(map)

      // 确保地图正确适应容器大小
      setTimeout(() => {
        map.invalidateSize()
      }, 100)

      // 创建OSRM路线规划服务
      const routingService = new OSRMRoutingService()

      this.mapInstance = map
      this.routingService = routingService
      resolve({ map, routingService })
    } catch (error) {
      reject(error)
    }
  }

  // 获取当前地图实例
  getMapInstance() {
    return this.mapInstance
  }

  // 获取路线规划服务
  getRoutingService() {
    return this.routingService
  }

  // 获取当前服务类型
  getCurrentService() {
    return this.currentService
  }

  // 清理资源
  destroy() {
    if (this.mapInstance) {
      if (this.currentService === MAP_SERVICES.AMAP) {
        this.mapInstance.destroy()
      } else if (this.currentService === MAP_SERVICES.OSM) {
        this.mapInstance.remove()
      }
      this.mapInstance = null
      this.routingService = null
      this.currentService = null
    }
  }
}

// OSRM路线规划服务
export class OSRMRoutingService {
  constructor() {
    this.baseUrl = 'https://router.project-osrm.org'
    this.profile = 'driving'
  }

  // 搜索路线
  search(waypoints, callback) {
    if (!waypoints || waypoints.length === 0) {
      callback('error', { message: '没有提供路线点' })
      return
    }

    // 如果只有一个点，创建单点路线
    if (waypoints.length === 1) {
      this.handleSinglePoint(waypoints[0], callback)
      return
    }

    // 将关键词转换为坐标
    this.geocodeWaypoints(waypoints)
      .then(coordinates => {
        return this.getRoute(coordinates)
      })
      .then(route => {
        callback('complete', route)
      })
      .catch(error => {
        console.error('OSRM路线规划失败:', error)
        callback('error', { message: error.message })
      })
  }

  // 处理单点情况
  async handleSinglePoint(waypoint, callback) {
    try {
      // 地理编码获取坐标
      const coord = await this.geocode(waypoint.keyword, waypoint.city, waypoint.province)
      
      // 创建单点路线数据
      const singlePointRoute = {
        routes: [{
          distance: 0,
          duration: 0,
          steps: [{
            path: [coord],
            distance: 0,
            duration: 0,
            instruction: '单点位置',
            road: waypoint.keyword
          }]
        }],
        waypoints: [{
          location: new L.LatLng(coord[1], coord[0])
        }]
      }
      
      callback('complete', singlePointRoute)
    } catch (error) {
      console.error('单点地理编码失败:', error)
      callback('error', { message: error.message })
    }
  }

  // 地理编码（将关键词转换为坐标）
  async geocodeWaypoints(waypoints) {
    const coordinates = []
    
    for (const waypoint of waypoints) {
      try {
        const coord = await this.geocode(waypoint.keyword, waypoint.city, waypoint.province)
        coordinates.push(coord)
      } catch (error) {
        console.error(`地理编码完全失败: ${waypoint.keyword}`, error)
        // 最后的保险：使用城市默认坐标
        const fallbackCoord = this.getCityDefaultCoordinates(waypoint.city || '北京')
        coordinates.push(fallbackCoord)
      }
    }
    
    return coordinates
  }

  // 单个地点地理编码
  async geocode(keyword, city = '', province = '') {
    // 构建更精确的搜索查询
    let searchQuery = keyword
    if (city) {
      searchQuery = `${keyword}, ${city}`
    }
    if (province) {
      searchQuery += `, ${province}`
    }
    
    try {
      // 第一优先级：Nominatim服务
      const result = await this.geocodeWithTimeout(
        () => this.geocodeWithNominatim(searchQuery, keyword, city, province),
        3000,
        'Nominatim'
      )
      return result
    } catch (error) {
      console.warn('Nominatim地理编码失败，尝试Photon服务:', error)
      try {
        // 第二优先级：Photon服务
        const result = await this.geocodeWithTimeout(
          () => this.geocodeWithPhoton(searchQuery, keyword, city, province),
          3000,
          'Photon'
        )
        return result
      } catch (backupError) {
        console.warn('Photon地理编码失败，尝试高德地图API:', backupError)
        try {
          // 第三优先级：高德地图API
          const result = await this.geocodeWithTimeout(
            () => this.geocodeWithAmap(searchQuery, keyword, city, province),
            3000,
            '高德地图'
          )
          return result
        } catch (amapError) {
          console.warn('高德地图API失败，使用城市级别降级方案:', amapError)
          // 第四优先级：城市级别降级
          return await this.geocodeCityFallback(city, province)
        }
      }
    }
  }

  // 带超时的地理编码包装器
  async geocodeWithTimeout(geocodeFunction, timeoutMs, serviceName) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${serviceName}服务超时 (${timeoutMs}ms)`))
      }, timeoutMs)

      try {
        const result = await geocodeFunction()
        clearTimeout(timeoutId)
        resolve(result)
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  // 使用Nominatim进行地理编码
  async geocodeWithNominatim(searchQuery, keyword, city, province) {
    const params = new URLSearchParams({
      format: 'json',
      q: searchQuery,
      limit: 5,
      countrycodes: 'cn',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1',
      dedupe: '1'
    })
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'AI-Tourism-App/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Nominatim请求失败: ${response.status}`)
    }
    
    const results = await response.json()
    
    if (results && results.length > 0) {
      const bestResult = this.selectBestResult(results, keyword, city, province)
      return [parseFloat(bestResult.lon), parseFloat(bestResult.lat)]
    } else {
      throw new Error(`未找到地点: ${searchQuery}`)
    }
  }

  // 使用Photon作为备用地理编码服务
  async geocodeWithPhoton(searchQuery, keyword, city, province) {
    const params = new URLSearchParams({
      q: searchQuery,
      limit: 5,
      osm_tag: 'tourism,amenity,shop'
      // 移除lang参数，因为Photon不支持zh
    })
    
    const response = await fetch(
      `https://photon.komoot.io/api?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Photon请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const bestFeature = this.selectBestPhotonResult(data.features, keyword, city, province)
      const [lon, lat] = bestFeature.geometry.coordinates
      return [lon, lat]
    } else {
      throw new Error(`未找到地点: ${searchQuery}`)
    }
  }

  // 选择最佳Photon结果
  selectBestPhotonResult(features, keyword, city, province) {
    const scoredFeatures = features.map(feature => {
      let score = 0
      
      // 基础分数
      if (feature.properties.importance) {
        score += feature.properties.importance * 100
      }
      
      // 名称匹配
      if (feature.properties.name) {
        const name = feature.properties.name.toLowerCase()
        const keywordLower = keyword.toLowerCase()
        if (name.includes(keywordLower)) {
          score += 20
        }
      }
      
      // 类型匹配
      if (feature.properties.type) {
        const type = feature.properties.type.toLowerCase()
        if (type.includes('tourism') || type.includes('attraction')) {
          score += 25
        }
      }
      
      return { ...feature, score }
    })
    
    scoredFeatures.sort((a, b) => b.score - a.score)
    return scoredFeatures[0]
  }

  // 使用高德地图Web API进行地理编码
  async geocodeWithAmap(searchQuery, keyword, city, province) {
    // 从配置文件获取高德地图Web API密钥
    const { getMapConfig, MAP_SERVICES } = await import('./mapConfig.js')
    const amapConfig = getMapConfig(MAP_SERVICES.AMAP)
    
    if (!amapConfig || !amapConfig.webApiKey || amapConfig.webApiKey === 'your_amap_web_api_key_here') {
      throw new Error('高德地图Web API密钥未配置')
    }

    try {
      // 构建请求参数
      const params = new URLSearchParams({
        key: amapConfig.webApiKey,
        address: keyword,
        city: city || '',
        output: 'json'
      })

      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/geo?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`高德地图API请求失败: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const geocode = data.geocodes[0]
        const location = geocode.location.split(',')
        const lng = parseFloat(location[0])
        const lat = parseFloat(location[1])
        
        if (!isNaN(lng) && !isNaN(lat)) {
          return [lng, lat]
        } else {
          throw new Error('高德地图返回的坐标格式无效')
        }
      } else {
        throw new Error(`高德地图地理编码失败: ${data.info || '未知错误'}`)
      }
    } catch (error) {
      throw new Error(`高德地图API调用失败: ${error.message}`)
    }
  }

  // 城市级别降级方案
  async geocodeCityFallback(city, province) {
    console.log(`使用城市级别降级方案: ${city || '未知城市'}`)
    
    // 如果连城市都没有，返回默认坐标（北京）
    if (!city) {
      return [116.397, 39.905] // 北京天安门
    }

    try {
      // 尝试获取城市中心坐标
      const cityQuery = province ? `${city}, ${province}` : city
      
      // 使用Nominatim获取城市坐标
      const params = new URLSearchParams({
        format: 'json',
        q: cityQuery,
        limit: 1,
        countrycodes: 'cn',
        featuretype: 'city'
      })
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'AI-Tourism-App/1.0'
          }
        }
      )
      
      if (response.ok) {
        const results = await response.json()
        if (results && results.length > 0) {
          const result = results[0]
          return [parseFloat(result.lon), parseFloat(result.lat)]
        }
      }
    } catch (error) {
      console.warn('城市级别地理编码失败:', error)
    }

    // 最后的降级方案：使用预定义的城市坐标
    return this.getCityDefaultCoordinates(city)
  }

  // 获取城市默认坐标
  getCityDefaultCoordinates(city) {
    const cityCoordinates = {
      '北京': [116.397, 39.905],
      '上海': [121.473, 31.230],
      '广州': [113.264, 23.129],
      '深圳': [114.057, 22.543],
      '杭州': [120.155, 30.274],
      '南京': [118.767, 32.041],
      '苏州': [120.585, 31.299],
      '成都': [104.066, 30.572],
      '重庆': [106.551, 29.563],
      '武汉': [114.305, 30.593],
      '西安': [108.940, 34.341],
      '天津': [117.200, 39.084],
      '青岛': [120.382, 36.067],
      '大连': [121.614, 38.914],
      '厦门': [118.110, 24.490],
      '宁波': [121.544, 29.868],
      '福州': [119.306, 26.075],
      '长沙': [112.982, 28.194],
      '郑州': [113.625, 34.746],
      '济南': [117.000, 36.651],
      '沈阳': [123.429, 41.796],
      '哈尔滨': [126.642, 45.756],
      '长春': [125.324, 43.817],
      '石家庄': [114.502, 38.045],
      '太原': [112.549, 37.857],
      '呼和浩特': [111.670, 40.818],
      '兰州': [103.823, 36.058],
      '西宁': [101.778, 36.623],
      '银川': [106.278, 38.487],
      '乌鲁木齐': [87.617, 43.792],
      '拉萨': [91.140, 29.645],
      '昆明': [102.833, 24.880],
      '贵阳': [106.713, 26.578],
      '南宁': [108.320, 22.824],
      '海口': [110.331, 20.031],
      '三亚': [109.508, 18.247],
      '台北': [121.565, 25.033],
      '香港': [114.173, 22.320],
      '澳门': [113.549, 22.198]
    }

    // 精确匹配
    if (cityCoordinates[city]) {
      return cityCoordinates[city]
    }

    // 模糊匹配
    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      if (city.includes(cityName) || cityName.includes(city)) {
        return coords
      }
    }

    // 如果都没有匹配，返回北京坐标
    console.warn(`未找到城市 ${city} 的坐标，使用北京坐标作为默认值`)
    return [116.397, 39.905]
  }

  // 选择最佳匹配结果
  selectBestResult(results, keyword, city, province) {
    // 按重要性排序
    const scoredResults = results.map(result => {
      let score = 0
      
      // 基础重要性分数
      if (result.importance) {
        score += parseFloat(result.importance) * 100
      }
      
      // 地址匹配加分
      if (result.display_name) {
        const displayName = result.display_name.toLowerCase()
        const keywordLower = keyword.toLowerCase()
        const cityLower = city ? city.toLowerCase() : ''
        const provinceLower = province ? province.toLowerCase() : ''
        
        // 关键词匹配
        if (displayName.includes(keywordLower)) {
          score += 20
        }
        
        // 城市匹配
        if (cityLower && displayName.includes(cityLower)) {
          score += 15
        }
        
        // 省份匹配
        if (provinceLower && displayName.includes(provinceLower)) {
          score += 10
        }
      }
      
      // 类型匹配加分
      if (result.type) {
        const type = result.type.toLowerCase()
        if (type.includes('tourism') || type.includes('attraction')) {
          score += 25
        } else if (type.includes('restaurant') || type.includes('food')) {
          score += 15
        } else if (type.includes('hotel') || type.includes('accommodation')) {
          score += 15
        }
      }
      
      return { ...result, score }
    })
    
    // 按分数排序，返回最佳匹配
    scoredResults.sort((a, b) => b.score - a.score)
    return scoredResults[0]
  }

  // 获取路线
  async getRoute(coordinates) {
    const coordsString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';')
    const url = `${this.baseUrl}/route/v1/${this.profile}/${coordsString}?overview=full&steps=true&alternatives=false`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return this.formatOSRMResponse(data, coordinates)
      } else {
        throw new Error('路线规划失败')
      }
    } catch (error) {
      console.error('OSRM请求失败:', error)
      throw error
    }
  }

  // 格式化OSRM响应为高德地图兼容格式
  formatOSRMResponse(osrmData, waypoints) {
    const route = osrmData.routes[0]
    
    return {
      routes: [{
        distance: route.distance,
        duration: route.duration,
        steps: this.formatOSRMSteps(route.legs, waypoints)
      }],
      waypoints: waypoints.map((coord, index) => ({
        location: new L.LatLng(coord[1], coord[0])
      }))
    }
  }

  // 格式化OSRM步骤
  formatOSRMSteps(legs, waypoints) {
    const steps = []
    let pathIndex = 0
    
    legs.forEach((leg, legIndex) => {
      leg.steps.forEach((step, stepIndex) => {
        // 将OSRM的几何路径转换为坐标数组
        const path = this.decodePolyline(step.geometry)
        
        steps.push({
          path: path.map(coord => [coord[1], coord[0]]), // 转换为[lng, lat]格式
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction || '',
          road: step.name || ''
        })
      })
    })
    
    return steps
  }

  // 解码Polyline（简化版本）
  decodePolyline(encoded) {
    // 这里使用简化的解码，实际项目中可能需要更完整的polyline解码库
    try {
      const coordinates = []
      let index = 0
      let lat = 0
      let lng = 0
      
      while (index < encoded.length) {
        let shift = 0
        let result = 0
        let byte
        
        do {
          byte = encoded.charCodeAt(index++) - 63
          result |= (byte & 0x1f) << shift
          shift += 5
        } while (byte >= 0x20)
        
        const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lat += deltaLat
        
        shift = 0
        result = 0
        
        do {
          byte = encoded.charCodeAt(index++) - 63
          result |= (byte & 0x1f) << shift
          shift += 5
        } while (byte >= 0x20)
        
        const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1))
        lng += deltaLng
        
        coordinates.push([lat / 1e5, lng / 1e5])
      }
      
      return coordinates
    } catch (error) {
      console.error('Polyline解码失败:', error)
      return []
    }
  }

  // 清除路线
  clear() {
    // OSM/Leaflet的清除逻辑将在MapContainer中处理
  }
}
