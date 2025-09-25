// API基础URL
const API_BASE_URL = 'http://127.0.0.1:8080'

// 生成UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 获取会话列表
export async function fetchSessionList(sessionList, isLoading, userId) {
  try {
    if (isLoading) isLoading.value = true
    
    // 模拟数据 - 实际使用时取消注释下面的fetch代码
    const response = await fetch(`${API_BASE_URL}/ai_assistant/session_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 1,
        page_size: 10,
        user_id: userId
      })
    })
    
    if (!response.ok) {
      throw new Error('获取会话列表失败')
    }
    
    const data = await response.json()
    
    if (data.code === 0) {
      sessionList.value = data.data.session_list
      return { success: true}
    } else {
      console.error('获取会话列表失败:', data.msg)
    }
    
    // 示例数据
    // setTimeout(() => {
    //   sessionList.value = [
    //     {
    //       session_id: '123456',
    //       last_time: '2025-07-26 01:40:54',
    //       title: '深圳旅游攻略'
    //     },
    //     {
    //       session_id: '124594',
    //       last_time: '2024-12-07 16:36:24',
    //       title: '北京旅游攻略'
    //     }
    //   ]
    //   if (isLoading) isLoading.value = false
    // }, 500)

    
  } catch (error) {
    console.error('获取会话列表出错:', error)
    if (isLoading) isLoading.value = false
  }
}

// 获取会话历史
export async function fetchConversationHistory(sessionId, currentMessages) {
  try {
    // 模拟数据 - 实际使用时取消注释下面的fetch代码
    const response = await fetch(`${API_BASE_URL}/ai_assistant/get_history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    })
    
    if (!response.ok) {
      throw new Error('获取会话历史失败')
    }
    
    const data = await response.json()
    
    if (data.code === 0) {
      currentMessages.value = data.data
    } else {
      console.error('获取会话历史失败:', data.msg)
      currentMessages.value = []
    }
    
    // // 示例数据
    // setTimeout(() => {
    //   currentMessages.value = [
    //     { msg_id: "123456", role: "user", content: "你好" },
    //     { msg_id: "123457", role: "assistant", content: "你好呀，请问有什么能为您服务呢" }
    //   ]
    // }, 300)
    
  } catch (error) {
    console.error('获取会话历史出错:', error)
  }
}

// 发送消息到AI助手（流式响应）
export async function sendMessageToAI(sessionId, message, currentMessages, sessionList, userId) {
  try {
    // 模拟AI回复 - 实际使用时取消注释下面的fetch代码
    const response = await fetch(`${API_BASE_URL}/ai_assistant/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        messages: message,
        user_id: userId
      })
    })
    
    if (!response.ok) {
      throw new Error('发送消息失败')
    }

    // 创建AI消息对象
    const currentMessage = {
      msg_id: generateUUID(),
      role: 'assistant',
      content: '思考中...\n'
    }
    
    // 添加到消息列表
    currentMessages.value.push(currentMessage)

    // // 模拟流式响应
    // const responses = [
    //   "您好！",
    //   "我是AI旅游生活助手，",
    //   "很高兴为您服务。",
    //   "请问您需要什么帮助？"
    // ]
    
    // let fullResponse = ''
    // for (let i = 0; i < responses.length; i++) {
    //   await new Promise(resolve => setTimeout(resolve, 500))
    //   fullResponse += responses[i]
    //   assistantMessage.content = fullResponse
    // }

    // 流式响应处理
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let data = '';
    // let currentMessage = {
    //     msg_id: generateUUID(),
    //     role: 'assistant',
    //     content: '' // 用于拼接token
    // };

    while (!done) {
        // 从流中读取数据
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        data = decoder.decode(value, { stream: true });

        // 处理数据并拼接 token
        const messages = processStreamedData(data);
        // console.log("messages：", messages)

        // 更新当前消息的 content
        for (let msg of messages) {
            // console.log("msg：", msg)
            currentMessage.content += msg; // 拼接新的token
        }

        // 更新消息列表（只有当消息完整时才加入列表）
        currentMessages.value = currentMessages.value.filter(m => m.msg_id !== currentMessage.msg_id); // 确保不会重复添加
        currentMessages.value.push(currentMessage);
    }

    // 刷新会话列表
    if (sessionList) {
      const res = await fetchSessionList(sessionList, false, localStorage.getItem('user_id') )
      // 会话列表数据刷新完毕后返回
      if (res.success) {
        return { success: true}
      }
    }

  
  } catch (error) {
    console.error('发送消息出错:', error)
    currentMessages.value.push({
      msg_id: generateUUID(),
      role: 'assistant',
      content: '抱歉，我暂时无法回复您的消息。错误: ' + error.message
    })
  }
}

// 处理流式返回的数据
export function processStreamedData(data) {
    // console.log("data:", data)
    let messages = [];
    const parts = data.split('data:'); // 分割每一行的响应
    for (let part of parts) {
        // 跳过空行
        if (part.trim() === '') continue;

        try {
            // 解析返回的JSON数据
            const jsonData = JSON.parse(part.replace('data: ', ''));
            if (jsonData.choices && jsonData.choices.length > 0) {
                // 提取返回的text内容
                const text = jsonData.choices[0].text || '';
                if (text) {
                    messages.push(text);
                }
            }
            else if(jsonData.dailyRoutes && jsonData.dailyRoutes.length > 0) {
                console.log(jsonData);
                
            }
        } catch (error) {
            console.error('解析流式数据出错:', error);
        }
    }

    return messages;
}



// 认证相关 API
// 开关：临时使用本地 Mock 放行（后端就绪后改为 false 恢复真实请求）
const AUTH_USE_MOCK = false

export async function login(payload) {
  if (AUTH_USE_MOCK) {
    // 模拟登录成功，返回一个临时 token
    return new Promise(resolve => {
      const phone = (payload && payload.phone) || ''
      const tail = phone ? phone.slice(-4) : '用户'
      setTimeout(() => resolve({ token: 'mock-token-123', nickname: `旅行家${tail}` }), 200)
    })
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) throw new Error('登录请求失败')
    const data = await response.json()
    if (data.code === 0 && data.data && data.data.token) {
      console.log("发起登录请求后，返回token:", data.data.token)
      return data.data
    }
    throw new Error(data.msg || '登录失败')
  } catch (e) {
    throw e
  }
}

export async function register(payload) {
  if (AUTH_USE_MOCK) {
    // 模拟注册成功
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true }), 200)
    })
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) throw new Error('注册请求失败')
    const data = await response.json()
    if (data.code === 0) {
      return { success: true }
    }
    throw new Error(data.msg || '注册失败')
  } catch (e) {
    throw e
  }
}

export async function logout() {
  if (AUTH_USE_MOCK) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 150))
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      }
    })
    if (!response.ok) throw new Error('登出请求失败')
    const data = await response.json()
    if (data.code === 0) return { success: true }
    throw new Error(data.msg || '登出失败')
  } catch (e) {
    throw e
  }
}

// 获取当前登录用户信息
export async function me() {
  // console.log("开始尝试获取个人信息")
  if (AUTH_USE_MOCK) {
    // 从本地已存手机号推导一个昵称，或返回默认
    const phone = localStorage.getItem('last_phone') || ''
    const tail = phone ? phone.slice(-4) : '用户'
    return new Promise(resolve => setTimeout(() => resolve({
      user_id: 'u_' + (phone || '0000'),
      nickname: `旅行家${tail}`,
      phone
    }), 150))
  }
  try {
    // console.log("开始发起请求")
    // console.log(localStorage.getItem('token'))
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      }
    })
    // console.log(response)
    if (!response.ok) throw new Error('获取用户信息失败')
    const data = await response.json()
    if (data.code === 0 && data.data) return data.data
    throw new Error(data.msg || '获取用户信息失败')
  } catch (e) {
    throw e
  }
}