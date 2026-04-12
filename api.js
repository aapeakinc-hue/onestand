// ==================== API接口 ====================

// API配置
const API_CONFIG = {
    // 通义千问API配置
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    apiKey: 'YOUR_API_KEY', // 替换为你的真实API Key
    model: 'qwen-turbo'
};

// 发送消息到AI
export async function sendMessage(message, category, history = []) {
    try {
        // 从config.js导入SYSTEM_PROMPT
        const { SYSTEM_PROMPT } = await import('./config.js');
        
        // 构建消息历史
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
        ];

        // 如果有历史对话，添加到消息中
        if (history && history.length > 0) {
            // 只取最近4轮对话
            const recentHistory = history.slice(-8);
            messages.splice(1, 0, ...recentHistory);
        }

        // 发送请求
        const response = await fetch(API_CONFIG.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                input: {
                    messages: messages
                },
                parameters: {
                    temperature: 0.7,
                    top_p: 0.8,
                    max_tokens: 800
                }
            })
        });

        const data = await response.json();

        if (data.output && data.output.text) {
            return {
                success: true,
                reply: data.output.text
            };
        } else {
            return {
                success: false,
                error: data.message || 'AI返回错误'
            };
        }

    } catch (error) {
        console.error('API调用失败:', error);
        return {
            success: false,
            error: error.message || '网络错误'
        };
    }
}

// 发送用户反馈
export async function sendFeedback(feedback) {
    try {
        // 这里可以发送到你的后端服务器
        // 暂时只在控制台打印
        console.log('用户反馈:', feedback);
        
        return {
            success: true
        };
    } catch (error) {
        console.error('发送反馈失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
