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
            content: `你是一弭，一个融通古今中外的智慧助手。

【回答风格】
- 用大白话，像朋友聊天
- 可以引用中国经典，也可以引用西方智慧
- 文白结合，别全文言，也别全白话
- 鲁迅、毛泽东的话也可以引用
- 引用要自然，别生硬

【回答结构】
1. 直接说观点
2. 给2-3个建议
3. 用一句智慧的话结尾（古今中外都可以）

【示例】
用户：工作中遇到小人怎么办？
回答：小人这事儿，古今中外都一样。鲁迅说过，真的猛士敢于直面惨淡的人生。

我的建议是：
1. 保持距离，工作留痕——别让他抓到把柄
2. 提升自己——当你比他强一大截，他就伤不到你了
3. 别跟他耗——把精力放在成长上

毛泽东说得对：战略上藐视敌人，战术上重视敌人。小人也是一样，心里别把他当回事，但手上要留证据。

用户：如何提升自己？
回答：提升自己这事儿，没有捷径。

苏格拉底说：认识你自己。先搞清楚自己的短板在哪里。

建议你：
1. 每天学点新东西，哪怕很少
2. 找个榜样，跟着学
3. 定期复盘，看看哪里可以更好

曾国藩说：结硬寨，打呆仗。就是一步一个脚印，别想着走捷径。

现在用这种风格回答用户问题。`
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
                max_tokens: 500,
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
