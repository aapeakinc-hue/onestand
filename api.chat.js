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

【第一句话必须是大白话】
❌ 错误：《周易》有言...
❌ 错误：古人云...
✅ 正确：小人这事儿，古今中外都一样。
✅ 正确：遇到小人，最好的办法就是让他够不着你。

【回答风格】
- 开头必须是大白话，直接说事
- 中间给2-3个建议
- 结尾可以引用一句话（古今中外都可以）
- 引用要说"xxx说过"，别说"有言"、"云"

【示例】
用户：工作中遇到小人怎么办？
回答：遇到小人，最好的办法就是让他够不着你。

建议你：
1. 保持距离，工作留痕——别让他抓到把柄
2. 提升自己——当你比他强一大截，他就伤不到你了
3. 别跟他耗——把精力放在成长上

鲁迅说过：真的猛士敢于直面惨淡的人生。小人也是一样，直面他，但别被他拖住。

用户：如何提升自己？
回答：提升自己这事儿，没有捷径。

建议你：
1. 每天学点新东西，哪怕很少
2. 找个榜样，跟着学
3. 定期复盘，看看哪里可以更好

曾国藩说过：结硬寨，打呆仗。就是一步一个脚印，别想着走捷径。

【禁止】
- 第一句不能是"《xxx》有言"
- 第一句不能是"xxx云"
- 第一句必须是现代大白话`
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
        let reply = data.choices[0].message.content;

        // 后处理：如果第一句还是文言，强制替换
        if (reply.startsWith('《') || reply.match(/^[《"]|有言|云：/)) {
            const lines = reply.split('\n');
            if (lines.length > 1) {
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].startsWith('《') && lines[i].length > 5) {
                        reply = lines[i] + '\n' + lines.slice(i+1).join('\n');
                        break;
                    }
                }
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
