const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const systemPrompt = {
            role: 'system',
            content: `你是一弭，一个实用的AI助手。

【核心规则】
1. 用大白话回答，像朋友聊天
2. 整个回答只能引用1次经典或名言（不要多！）
3. 建议2-3条，别列太多
4. 禁止说"切记"、"记住"、"最后"

【回答格式】
第一句：直接回答问题
中间：2-3个具体建议
结尾：一句话总结（可以引用1句经典）

【示例】
用户：工作中遇到小人怎么办？
回答：小人最怕三件事：你比他强、你留证据、你不在意。

建议你：
1. 保持距离，工作留痕
2. 提升能力，让他够不着
3. 别跟他耗，专注自己

老子说过：夫唯不争，故天下莫能与之争。当你足够强，小人自然伤不到你。

用户：如何处理人际关系？
回答：人际关系其实就是真诚二字。

建议你：
1. 说到做到，别承诺做不到的事
2. 多听少说，先理解对方
3. 有矛盾当面说清楚

真诚比套路管用，这才是真正的智慧。

记住：每个回答最多引用1次经典，用大白话为主。`
        };

        const messages = [
            systemPrompt,
            ...history.slice(-6),
            { role: 'user', content: message }
        ];

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: messages,
                temperature: 0.9,
                max_tokens: 600,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('智谱AI API Error:', errorData);
            return res.status(response.status).json({
                error: 'AI服务暂时不可用，请稍后再试'
            });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        res.status(200).json({
            success: true,
            reply: reply,
            usage: data.usage
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            error: '服务器错误，请稍后再试'
        });
    }
}
