const { createApp, ref, computed, onMounted, nextTick } = Vue;
        
createApp({
    setup() {
        const isSidebarCollapsed = ref(false);
        const newMessage = ref('');
        const locationUpdateTime = ref(new Date().toLocaleTimeString());
        const currentLocation = ref('北京市海淀区');
        const messagesContainer = ref(null);
        const userId = ref(Math.floor(Math.random() * 1000));
        const currentTime = ref(new Date().toLocaleTimeString());
        
        const conversations = ref([
            {
                title: '讨论项目需求',
                messages: [
                    { sender: 'user', text: '你好，我想了解这个项目的具体情况。' },
                    { sender: 'bot', text: '很高兴为您服务。这个项目需要集成地图功能到聊天界面中。' }
                ]
            },
            {
                title: '技术实现讨论',
                messages: [
                    { sender: 'user', text: '我们应该使用什么地图API？' },
                    { sender: 'bot', text: '建议使用高德地图API，它提供了丰富的功能和良好的文档支持。' }
                ]
            },
            {
                title: '界面设计讨论',
                messages: [
                    { sender: 'user', text: '左侧边栏可以折叠吗？' },
                    { sender: 'bot', text: '是的，我们将实现可折叠的左侧边栏，类似于Deepseek界面。' }
                ]
            }
        ]);
        
        const currentConversation = ref(0);
        
        const currentConversationData = computed(() => {
            return conversations.value[currentConversation.value];
        });
        
        function toggleSidebar() {
            isSidebarCollapsed.value = !isSidebarCollapsed.value;
        }
        
        function selectConversation(index) {
            currentConversation.value = index;
            scrollToBottom();
        }
        
        function startNewConversation() {
            const newConv = {
                title: '新对话 ' + (conversations.value.length + 1),
                messages: [
                    { sender: 'bot', text: '您好！这是一个新的对话。我可以为您提供什么帮助？' }
                ]
            };
            
            conversations.value.push(newConv);
            currentConversation.value = conversations.value.length - 1;
            scrollToBottom();
        }
        
        function sendMessage() {
            if (!newMessage.value.trim()) return;
            
            // 添加用户消息
            currentConversationData.value.messages.push({
                sender: 'user',
                text: newMessage.value
            });
            
            scrollToBottom();
            
            // 模拟机器人回复
            setTimeout(() => {
                currentConversationData.value.messages.push({
                    sender: 'bot',
                    text: '收到您的消息: ' + newMessage.value + '。这是我根据您的查询提供的回复。'
                });
                
                scrollToBottom();
            }, 500);
            
            newMessage.value = '';
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
            
            scrollToBottom();
        });
        
        return {
            isSidebarCollapsed,
            newMessage,
            locationUpdateTime,
            currentLocation,
            conversations,
            currentConversation,
            currentConversationData,
            messagesContainer,
            userId,
            currentTime,
            toggleSidebar,
            selectConversation,
            startNewConversation,
            sendMessage,
            refreshLocation
        };
    }
}).mount('#app');