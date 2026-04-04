const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET请求用于测试环境变量
    if (req.method === 'GET') {
        const apiKey = process.env.DASHSCOPE_API_KEY;

        // 测试API是否可用
        let apiTest = null;
        if (apiKey) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'qwen-turbo',
                        input: {
                            messages: [{ role: 'user', content: '你好' }]
                        },
                        parameters: {
                            result_format: 'text'
                        }
                    })
                });

                const data = await response.json();
                apiTest = {
                    status: response.status,
                    success: response.ok,
                    preview: data.output?.text?.substring(0, 50) || data
                };
            } catch (e) {
                apiTest = { error: e.message };
            }
        }

        return res.status(200).json({
            status: 'API状态检查',
            environment: {
                hasKey: !!apiKey,
                keyLength: apiKey ? apiKey.length : 0,
                keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none'
            },
            apiTest: apiTest,
            codeVersion: 'qwen-turbo-v1',
            timestamp: new Date().toISOString()
        });
    }

    // POST请求正常处理对话
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const apiKey = process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'API Key未配置，请访问 /api/chat 查看状态'
            });
        }

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

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-turbo',
                input: {
                    messages: messages
                },
                parameters: {
                    temperature: 0.95,
                    max_tokens: 400,
                    result_format: 'text'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('通义千问 API Error:', errorText);
            return res.status(response.status).json({
                error: 'AI服务暂时不可用',
                details: errorText
            });
        }

        const data = await response.json();
        const reply = data.output?.text || data.output?.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({
                error: 'AI返回数据格式异常'
            });
        }

        res.status(200).json({
            success: true,
            reply: reply,
            usage: data.usage
        });

    } catch (error) {
        console.error('服务器错误:', error);
        res.status(500).json({
            error: '服务器错误: ' + error.message
        });
    }
}
