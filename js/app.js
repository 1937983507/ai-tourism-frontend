const { createApp, ref, computed, onMounted, nextTick } = Vue;
    
// 生成UUID的函数
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

createApp({
    setup() {
        const isSidebarCollapsed = ref(false);
        const newMessage = ref('');
        const locationUpdateTime = ref(new Date().toLocaleTimeString());
        const currentLocation = ref('北京市海淀区');
        const messagesContainer = ref(null);
        const userId = ref(Math.floor(Math.random() * 1000));
        const currentTime = ref(new Date().toLocaleTimeString());
        const sessionList = ref([]);
        const currentSessionId = ref(null);
        const currentMessages = ref([]);
        const isLoading = ref(false);

        // API基础URL - 请根据实际情况修改
        const API_BASE_URL = 'http://127.0.0.1:8080';
        
        const currentConversationTitle = computed(() => {
            if (!currentSessionId.value) return '请选择或创建对话';
            const session = sessionList.value.find(s => s.session_id === currentSessionId.value);
            return session ? session.title : '未知对话';
        });
        
        // 获取会话列表
        async function fetchSessionList() {
            try {
                isLoading.value = true;
                const response = await fetch(`${API_BASE_URL}/ai_assistant/session_list`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        page: 1,
                        page_size: 10
                    })
                });
                
                if (!response.ok) {
                    throw new Error('获取会话列表失败');
                }
                
                const data = await response.json();
                
                if (data.code === 0) {
                    sessionList.value = data.data.session_list;
                } else {
                    console.error('获取会话列表失败:', data.msg);
                }
            } catch (error) {
                console.error('获取会话列表出错:', error);
                // // 使用模拟数据作为后备
                // sessionList.value = [
                //     {
                //         session_id: '123456',
                //         last_time: '2025-07-26 01:40:54',
                //         title: '深圳旅游攻略'
                //     },
                //     {
                //         session_id: '124594',
                //         last_time: '2024-12-07 16:36:24',
                //         title: '北京旅游攻略'
                //     }
                // ];
            } finally {
                isLoading.value = false;
            }
        }
        
        // 获取会话历史
        async function fetchConversationHistory(sessionId) {
            try {
                isLoading.value = true;
                const response = await fetch(`${API_BASE_URL}/ai_assistant/get_history`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_id: sessionId
                    })
                });
                
                if (!response.ok) {
                    throw new Error('获取会话历史失败');
                }
                
                const data = await response.json();
                
                if (data.code === 0) {
                    currentMessages.value = data.data;
                } else {
                    console.error('获取会话历史失败:', data.msg);
                    currentMessages.value = [];
                }
            } catch (error) {
                console.error('获取会话历史出错:', error);
                // 使用模拟数据作为后备
                // currentMessages.value = [
                //     { msg_id: "123456", role: "user", content: "你好" },
                //     { msg_id: "123456", role: "assistant", content: "你好呀，请问有什么能为您服务呢" }
                // ];
            } finally {
                isLoading.value = false;
                scrollToBottom();
            }
        }
        
        // 发送消息到AI助手
        async function sendMessageToAI(sessionId, message) {
            try {
                const response = await fetch(`${API_BASE_URL}/ai_assistant/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        messages: message
                    })
                });
                
                if (!response.ok) {
                    throw new Error('发送消息失败');
                }
                
                // 假设API返回的是AI的回复
                // 实际实现可能需要根据API响应格式进行调整
                const data = await response.json();
                
                if (data.code === 0) {
                    // 添加AI回复到消息列表
                    currentMessages.value.push({
                        msg_id: generateUUID(),
                        role: 'assistant',
                        content: data.data || '收到您的消息'
                    });
                    
                    // 刷新会话列表以更新最后时间
                    fetchSessionList();
                } else {
                    console.error('发送消息失败:', data.msg);
                }
            } catch (error) {
                console.error('发送消息出错:', error);
                // 模拟AI回复作为后备
                currentMessages.value.push({
                    msg_id: generateUUID(),
                    role: 'assistant',
                    content: '收到您的消息: ' + message
                });
            } finally {
                scrollToBottom();
            }
        }
        
        function toggleSidebar() {
            isSidebarCollapsed.value = !isSidebarCollapsed.value;
        }
        
        function selectConversation(conversation) {
            currentSessionId.value = conversation.session_id;
            fetchConversationHistory(conversation.session_id);
        }
        
        async function startNewConversation() {
            const newSessionId = generateUUID();
            
            // 添加到会话列表
            sessionList.value.unshift({
                session_id: newSessionId,
                last_time: new Date().toLocaleString(),
                title: '新对话'
            });
            
            // 设置为当前会话
            currentSessionId.value = newSessionId;
            currentMessages.value = [];
            
            // 在实际应用中，可能需要调用API创建新会话
            // 这里使用模拟数据
            setTimeout(() => {
                currentMessages.value.push({
                    msg_id: generateUUID(),
                    role: 'assistant',
                    content: '您好！这是一个新的对话。我可以为您提供什么帮助？'
                });
                scrollToBottom();
            }, 500);
        }
        
        // 单击【发送】按钮
        async function sendMessage() {
            if (!newMessage.value.trim() || !currentSessionId.value) return;
            
            // 添加用户消息到列表
            const userMessage = {
                msg_id: generateUUID(),
                role: 'user',
                content: newMessage.value
            };
            
            currentMessages.value.push(userMessage);
            scrollToBottom();
            
            // 保存用户消息
            const messageToSend = newMessage.value;
            newMessage.value = '';
            
            // 发送到AI助手
            await sendMessageToAI(currentSessionId.value, messageToSend);
        }
        
        function scrollToBottom() {
            nextTick(() => {
                if (messagesContainer.value) {
                    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
                }
            });
        }
        
        function refreshLocation() {
            locationUpdateTime.value = new Date().toLocaleTimeString();
            // 这里可以添加实际的位置更新逻辑
        }
        
        // 初始化地图
        onMounted(() => {
            // 获取会话列表
            fetchSessionList();
            
            try {
                const map = new AMap.Map('map', {
                    zoom: 13,
                    center: [116.397428, 39.90923], // 北京市中心
                    viewMode: '3D'
                });
                
                // // 添加标记
                // const marker = new AMap.Marker({
                //     position: [116.397428, 39.90923],
                //     map: map
                // });
            } catch (error) {
                console.error('地图初始化失败:', error);
                document.getElementById('map').innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>地图加载失败</p>
                        <p>请检查高德地图API密钥配置</p>
                    </div>
                `;
            }
        });
        
        return {
            isSidebarCollapsed,
            newMessage,
            locationUpdateTime,
            currentLocation,
            sessionList,
            currentSessionId,
            currentMessages,
            messagesContainer,
            userId,
            currentTime,
            currentConversationTitle,
            isLoading,
            toggleSidebar,
            selectConversation,
            startNewConversation,
            sendMessage,
            refreshLocation
        };
    }
}).mount('#app');