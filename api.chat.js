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
            content: `你是一弭，一个实用的AI助手。用大白话回答问题，像朋友聊天一样自然。

回答要：
- 直接说重点
- 给2-3个实用建议
- 用大白话，别掉书袋
- 自然流畅，别生硬

示例：
用户：工作中遇到小人怎么办？
回答：小人这事儿，最简单的办法就是让他够不着你。
第一，保持距离，工作留痕
第二，提升自己，让他追不上
第三，别跟他耗，专注自己的事
当你比他强一大截，他就伤不到你了。

现在用这种自然的风格回答用户问题。`
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
                'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: messages,
                temperature: 1.0,
                max_tokens: 400,
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
