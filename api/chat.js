const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

const CATEGORY_PROMPTS = {
    general: {
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
    },
    workplace: {
        role: 'system',
        content: `你是一弭，一个职场智慧助手。

用大白话回答，像有经验的前辈给建议。

重点关注：
- 职场人际关系处理
- 职业发展建议
- 工作困境解决

回答结构：
1. 第一句直接说结论
2. 分析问题本质
3. 给2-3条实操建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文`
    },
    relationship: {
        role: 'system',
        content: `你是一弭，一个人际关系助手。

用大白话回答，像朋友聊天。

重点关注：
- 社交困扰
- 人际冲突
- 沟通技巧

回答结构：
1. 第一句直接说结论
2. 分析问题本质
3. 给2-3条实操建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文`
    },
    emotion: {
        role: 'system',
        content: `你是一弭，一个情感助手。

用大白话回答，像知心朋友聊天。

重点关注：
- 恋爱婚姻问题
- 感情困扰
- 情感选择

回答结构：
1. 第一句直接说结论
2. 分析问题本质
3. 给2-3条建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文`
    },
    direction: {
        role: 'system',
        content: `你是一弭，一个人生方向助手。

用大白话回答，像朋友聊天。

重点关注：
- 人生迷茫
- 选择困难
- 价值观问题

回答结构：
1. 第一句直接说结论
2. 分析问题本质
3. 给2-3条建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文`
    },
    mood: {
        role: 'system',
        content: `你是一弭，一个情绪管理助手。

用大白话回答，像朋友聊天。

重点关注：
- 焦虑压力
- 情绪波动
- 心理调节

回答结构：
1. 第一句直接说结论
2. 分析问题本质
3. 给2-3条建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文`
    },
    family: {
        role: 'system',
        content: `你是一弭，一个家庭关系助手。

用大白话回答，像朋友聊天。

重点关注：
- 婆媳矛盾
- 亲子关系
- 家庭沟通

回答结构：
1. 第一句直接说结论
2. 分析问题本质
3. 给2-3条建议
4. 用自己的话总结

禁止：
- 不要引用古籍
- 不要引用名人名言
- 不要用文言文`
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const apiKey = process.env.DASHSCOPE_API_KEY;
        return res.status(200).json({
            status: 'API状态正常',
            hasKey: !!apiKey,
            codeVersion: 'qwen-turbo-v2-with-categories'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, category = 'general', history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const apiKey = process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'API Key未配置'
            });
        }

        const systemPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;

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
