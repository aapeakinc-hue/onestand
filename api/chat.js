// ==================== Vercel Serverless Function ====================

export default async function handler(req, res) {
    // 只处理POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, category, history } = req.body;

        // 从config.js导入提示词
        const { SYSTEM_PROMPT } = await import('../config.js');

        // 构建消息历史
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
        ];

        // 如果有历史对话
        if (history && history.length > 0) {
            const recentHistory = history.slice(-8);
            messages.splice(1, 0, ...recentHistory);
        }

        // 通义千问API调用
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-turbo',
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
            return res.status(200).json({
                success: true,
                reply: data.output.text
            });
        } else {
            return res.status(400).json({
                success: false,
                error: data.message || 'AI返回错误'
            });
        }

    } catch (error) {
        console.error('API调用失败:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '服务器错误'
        });
    }
}
