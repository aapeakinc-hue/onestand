const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export default async function handler(req, res) {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history = [] } = req.body;

        console.log('收到请求:', { message, historyLength: history.length });

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 检查环境变量
        const apiKey = process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            console.error('错误: DASHSCOPE_API_KEY 未配置');
            return res.status(500).json({
                error: 'API Key未配置，请在Vercel环境变量中设置DASHSCOPE_API_KEY'
            });
        }

        console.log('API Key已配置，长度:', apiKey.length);

        const systemPrompt = {
            role: 'system',
            content: `你是一弭，一个实用的智慧助手。

用大白话回答，像朋友聊天。

回答结构：
1. 第一句直接说结论
2. 简单分析原因
3. 给2-3条建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文
- 用你自己的话说`
        };

        const messages = [
            systemPrompt,
            ...history.slice(-4),
            { role: 'user', content: message }
        ];

        const requestBody = {
            model: 'qwen-turbo',
            input: {
                messages: messages
            },
            parameters: {
                temperature: 0.95,
                max_tokens: 400,
                result_format: 'text'
            }
        };

        console.log('请求通义千问 API...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('API响应状态:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            return res.status(response.status).json({
                error: 'AI服务暂时不可用',
                details: errorText
            });
        }

        const data = await response.json();
        console.log('API返回数据:', JSON.stringify(data, null, 2));

        // 通义千问返回格式：{ output: { text: "..." }, usage: {...} }
        const reply = data.output?.text || data.output?.choices?.[0]?.message?.content;

        if (!reply) {
            console.error('无法提取回复内容:', data);
            return res.status(500).json({
                error: 'AI返回数据格式异常',
                data: data
            });
        }

        console.log('成功获取回复，长度:', reply.length);

        res.status(200).json({
            success: true,
            reply: reply,
            usage: data.usage
        });

    } catch (error) {
        console.error('服务器错误:', error);
        res.status(500).json({
            error: '服务器错误: ' + error.message,
            stack: error.stack
        });
    }
}
