const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

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
- 用你自己的话说

示例：
用户：工作中遇到小人怎么办？
回答：最好的办法就是让他够不着你。

因为你还跟他在一个层次，才会被他影响。

建议你：
1. 保持距离，工作留痕
2. 提升自己，让他够不着
3. 别跟他耗，专注成长

真正的强者，是让小人够不着你。`
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
                'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`
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
            const errorData = await response.json();
            console.error('通义千问 API Error:', errorData);
            return res.status(response.status).json({
                error: 'AI服务暂时不可用，请稍后再试'
            });
        }

        const data = await response.json();
        const reply = data.output.text;

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
