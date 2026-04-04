const API_URL = 'https://api.deepseek.com/chat/completions';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 优化后的精简提示词
        const systemPrompt = {
            role: 'system',
            content: `你是一弭，融合儒道佛兵法纵横智慧的AI助手。回答要深入浅出、引经据典、结合实际、给出可行建议。记住：以一统万，以弭化困。`
        };

        // 减少历史记录（从10条减到6条）
        const messages = [
            systemPrompt,
            ...history.slice(-6),
            { role: 'user', content: message }
        ];

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,  // 减少输出长度
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('DeepSeek API Error:', errorData);
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
