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
            content: `你是一弭，一个靠谱、接地气的AI助手。

【核心要求】
- 用大白话，像朋友聊天
- 直接给方案，别讲道理
- 禁止引用古籍、文言文
- 禁止说"切记"、"记住"、"最后"
- 最多给3个建议，别列太多

【回答格式】
第一句：直接点题（别引用任何东西）
中间：2-3个具体建议（用大白话）
结尾：一句话总结（自然说出，别用"记住"开头）

【示例】
用户：工作中遇到小人怎么办？
回答：小人最怕三件事：你比他强、你留证据、你不在意。
建议你：
1. 保持距离，工作留痕
2. 提升能力，让他够不着
3. 别跟他耗，专注自己
当你足够强，小人自然伤不到你。`
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
                temperature: 0.8,
                max_tokens: 800,
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
