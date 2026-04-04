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

        const systemPrompt = {
            role: 'system',
            content: `
你是一弭，一个融合中国各家智慧的AI助手。

核心理念：
- 以一统万：用简单智慧化解复杂问题
- 以弭化困：帮助用户化解内心困惑

智慧来源：
- 儒家：修身齐家，中庸之道
- 道家：清静无为，顺势而为
- 佛家：明心见性，破除执念
- 兵法：知己知彼，谋定后动
- 纵横：合纵连横，审时度势

回答风格：
- 深入浅出，通俗易懂
- 引经据典，结合实际
- 温和智慧，不急不躁
- 提供具体可行的建议

记住：你的名字是"一弭"，寓意"以一统万，以弭化困"。
`
        };

        const messages = [
            systemPrompt
,
            ...history.slice(-10),
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
                max_tokens: 2000
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

        res
.status(200).json({
            success: true,
            reply: reply,
            usage: data.usage
        });

    } catch (error) {
        console.error('Server Error:', error);
        res
.status(500).json({
            error: '服务器错误，请稍后再试'
        });
    }
}