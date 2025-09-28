// 地图服务配置文件
export const MAP_SERVICES = {
  AMAP: 'amap',
  OSM: 'osm'
}

// 默认地图服务
export const DEFAULT_MAP_SERVICE = MAP_SERVICES.OSM   // OSM 或是 AMAP

// 地图服务配置
export const MAP_CONFIG = {
  [MAP_SERVICES.AMAP]: {
    name: '高德地图',
    enabled: true,
    // JavaScript API密钥（用于前端地图显示）
    apiKey: '80838eddfb922202b289fd1ad6fa4e58',
    securityJsCode: 'a45b8fdd549065da27a9395c8d5d87bd',
    scriptUrl: 'https://webapi.amap.com/maps?v=2.0&key=80838eddfb922202b289fd1ad6fa4e58&plugin=AMap.Driving,AMap.Adaptor',
    // Web API密钥（用于地理编码服务）
    webApiKey: 'a7a5be837d1645cd49c74a601187bc35', // 需要替换为实际的Web API密钥
    features: {
      routing: true,
      satellite: true,
      traffic: true,
      geocoding: true
    }
  },
  [MAP_SERVICES.OSM]: {
    name: 'OpenStreetMap',
    enabled: true,
    features: {
      routing: true,
      satellite: false, // 暂时舍弃卫星图
      traffic: false,
      geocoding: true,
      tileSwitching: true // 支持底图样式切换
    },
    tileLayers: {
        // 单色简洁
        monochrome: {
            name: '单色简洁',
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        },        
        standard: {
            name: '标准地图',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        },
        // 极简纯净 - 最少路网
        minimal_clean: {
            name: '极简纯净',
            url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        },
        // 无路网卫星风格
        satellite_clean: {
            name: '卫星地图',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        },
        // 无路网地形
        terrain_clean: {
            name: '地形纯净',
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
            maxZoom: 17
        },
    },
    routing: {
      // OSRM服务器配置 - 可以使用公共服务器或自建
      baseUrl: 'https://router.project-osrm.org',
      profile: 'driving', // driving, walking, cycling
      alternatives: true,
      steps: true,
      geometries: 'polyline',
      overview: 'full'
    }
  }
}


// 获取当前地图服务配置
export function getCurrentMapService() {
  return localStorage.getItem('mapService') || DEFAULT_MAP_SERVICE
}

// 设置地图服务
export function setMapService(service) {
  if (MAP_CONFIG[service] && MAP_CONFIG[service].enabled) {
    localStorage.setItem('mapService', service)
    return true
  }
  return false
}

// 获取地图服务配置
export function getMapConfig(service = null) {
  const currentService = service || getCurrentMapService()
  return MAP_CONFIG[currentService]
}

// 检查功能是否支持
export function isFeatureSupported(feature, service = null) {
  const config = getMapConfig(service)
  return config && config.features && config.features[feature] === true
}
