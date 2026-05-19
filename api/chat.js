export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { message, category, history = [] } = req.body;

        if (!message) {
            res.status(400).json({ error: '消息不能为空' });
            return;
        }

        const apiKey = process.env.DASHSCOPE_API_KEY;

        if (!apiKey) {
            res.status(500).json({ error: 'API密钥未配置' });
            return;
        }

        // 一弭核心提示词 - 彻底重写
        const systemPrompt = `你是「一弭」，一个有智慧、有温度的陪伴者。

【你的定位】
你不是心理咨询师，不是人生导师，不是在线问答工具。
你是一个阅尽沧桑的老友，用最朴素的话，说出最真的道理。
你陪人聊天，让人感觉"被懂"，而不是"被审问"。

【核心原则：先答，再引】
用户说什么，先回应用户的问题/情绪，再适当引导。
绝对不要一直问问题！问1-2个就够了，主要给答案和方向。

【回复模式举例】
❌ 错误示范（一直问）：
用户："工作很累，想辞职"
AI："工作很累啊，能说说是什么让你觉得累吗？是身体累还是心累？是钱少还是人际关系的问题？"

✅ 正确示范（先答再引）：
用户："工作很累，想辞职"
AI："累了就歇歇，别硬撑。但辞职前想清楚：是这份工作真的不适合你，还是暂时遇到了坎？有时候换个环境能解决问题，有时候逃避只会让问题跟着你跑。"
（然后等用户回应，如果需要再问一个问题）

【语言风格】
- 口语化，像朋友聊天
- 简短有力，80字以内
- 说人话，不文绉绉
- 有洞察力，一句话说中要害
- 有温度，让人感到被理解

【禁止】
- 连续问超过2个问题
- 重复问用户已经说过的事
- 答非所问
- 说废话和正确的废话
- 机械地说"我理解你"然后继续问

【你的智慧】
你可以融入儒道佛兵法纵横的智慧，但用现代话说：
- 儒家：用平常心做该做的事
- 道家：顺其自然，不强求
- 佛家：放下执念，活在当下
- 兵家：知己知彼，审时度势
- 纵横：看透人心，把握关系

【记住】
你的每一句话，都是一个朋友在说话。
让人听完，心里舒服了一点。`;

        // 构建消息 - 扩大上下文
        const messages = [
            { role: 'system', content: systemPrompt },
            // 保留更多历史记录，让AI能理解对话脉络
            ...history.slice(-12),
            { role: 'user', content: message }
        ];

        // 调用通义千问
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-turbo',
                input: { messages },
                parameters: {
                    max_tokens: 512,
                    temperature: 0.7,
                    top_p: 0.9
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('API Error:', errorData);
            res.status(500).json({ error: 'AI服务暂时不可用' });
            return;
        }

        const data = await response.json();

        if (data.output && data.output.text) {
            res.json({
                success: true,
                reply: data.output.text.trim()
            });
        } else if (data.output && data.output.choices && data.output.choices[0]) {
            res.json({
                success: true,
                reply: data.output.choices[0].message.content.trim()
            });
        } else {
            console.error('Unexpected response:', data);
            res.status(500).json({ error: 'AI响应格式异常' });
        }

    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({ error: '服务异常，请稍后重试' });
    }
}
