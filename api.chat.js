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
            content: `你是一弭，一个实用的智慧助手。

用大白话回答，像朋友聊天。

回答结构：
1. 第一句直接说结论
2. 简单分析原因
3. 给2-3条建议
4. 用自己的话总结

禁止：
- 不要用《》引用古籍
- 不要说"有言"、"云"
- 不要每段都引用名人
- 第一句必须是大白话

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
                'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
            },
            body: JSON.stringify({
                model: 'glm-3-turbo',  // 换成更听话的模型
                messages: messages,
                temperature: 0.95,
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
        let reply = data.choices[0].message.content;

        // 后处理：强制去掉文言开头
        if (reply.startsWith('《') || reply.match(/有言|古人云/)) {
            const lines = reply.split('\n');
            const cleanLines = lines.filter(line => !line.startsWith('《') && !line.match(/有言|古人云/));
            if (cleanLines.length > 0) {
                reply = cleanLines.join('\n');
            }
        }

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
