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
            content: `你是一个实用的生活顾问，叫"一弭"。

【重要规则】
绝对禁止：
- 禁止引用任何古籍、经典、名言
- 禁止使用文言文、半文言
- 禁止说"切记"、"记住"、"最后"、"总之"
- 禁止列超过3条建议

必须做到：
- 用大白话，像朋友聊天
- 第一句直接回答问题
- 给2-3个具体建议
- 结尾自然说一句总结

【回答示例】

用户：工作中遇到小人怎么办？
回答：小人最怕三件事：你比他强、你留证据、你不在意。
建议你：
1. 保持距离，工作留痕
2. 提升能力，让他够不着
3. 别跟他耗，专注自己
当你足够强，小人自然伤不到你。

用户：如何处理人际关系？
回答：人际关系其实就两个字：真诚。
建议你：
1. 说到做到，不承诺做不到的事
2. 多听少说，先理解对方
3. 有矛盾当面说清楚，别背后嘀咕
真诚比套路管用。

用户：感到迷茫怎么办？
回答：迷茫是因为不知道自己要什么。
建议你：
1. 先搞清楚自己不想要什么
2. 从小事开始尝试，别光想
3. 允许自己犯错，慢慢找方向
走着走着就清楚了。

用户：如何提升自己？
回答：提升自己就是每天进步一点点。
建议你：
1. 每天学点新东西，哪怕很少
2. 定期复盘，看看哪里可以更好
3. 找个榜样，跟着学
时间长了，你就发现自己变了。

现在请按照上面的风格回答用户的问题。`
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
