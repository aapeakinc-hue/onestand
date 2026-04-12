// ==================== API接口（调用Vercel Serverless Function）====================

// 发送消息到AI（通过Vercel API路由）
export async function sendMessage(message, category, history = []) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                category: category,
                history: history
            })
        });

        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                reply: data.reply
            };
        } else {
            return {
                success: false,
                error: data.error || 'AI返回错误'
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
