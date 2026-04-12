// ==================== Vercel Serverless Function ====================

export default async function handler(req, res) {
    // 只处理POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        // 打印请求信息（用于调试）
        console.log('=== 收到请求 ===');
        console.log('请求体:', JSON.stringify(req.body, null, 2));
        
        const { message, category, history } = req.body;

        // 验证必要参数
        if (!message || typeof message !== 'string') {
            console.error('错误: 消息内容为空或格式错误');
            return res.status(400).json({ 
                success: false,
                error: '消息内容不能为空' 
            });
        }

        console.log('消息内容:', message);

        // 从config.js导入提示词
        const { SYSTEM_PROMPT } = await import('../config.js');
        console.log('提示词长度:', SYSTEM_PROMPT.length);

        // 构建消息历史
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
        ];

        // 如果有历史对话
        if (history && Array.isArray(history) && history.length > 0) {
            console.log('历史对话数量:', history.length);
            const recentHistory = history.slice(-8);
            messages.splice(1, 0, ...recentHistory);
        }

        console.log('发送给通义千问的消息数量:', messages.length);

        // 通义千问API调用
        console.log('开始调用通义千问API...');
        const qwenResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
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

        const qwenData = await qwenResponse.json();
        console.log('通义千问响应状态:', qwenResponse.status);
        console.log('通义千问响应数据:', JSON.stringify(qwenData, null, 2));

        // 检查通义千问响应
        if (!qwenResponse.ok) {
            console.error('通义千问API错误:', qwenData);
            return res.status(qwenResponse.status).json({ 
                success: false,
                error: qwenData.message || `通义千问API错误: ${qwenResponse.status}`,
                details: qwenData
            });
        }

        // 检查返回数据
        if (qwenData.output && qwenData.output.text) {
            console.log('成功获取AI回答');
            return res.status(200).json({
                success: true,
                reply: qwenData.output.text
            });
        } else {
            console.error('通义千问返回数据异常:', qwenData);
            return res.status(500).json({ 
                success: false,
                error: 'AI返回数据格式异常',
                details: qwenData
            });
        }

    } catch (error) {
        console.error('API调用失败:', error);
        return res.status(500).json({ 
            success: false,
            error: error.message || '服务器错误',
            stack: error.stack
        });
    }
}
