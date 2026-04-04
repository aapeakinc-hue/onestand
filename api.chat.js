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
                model: 'glm-4-flash',
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

        // 强力后处理：删除所有文言痕迹
        reply = cleanWenyan(reply);

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

/**
 * 强力清洗文言文痕迹
 */
function cleanWenyan(reply) {
    // 1. 按行分割
    let lines = reply.split('\n');

    // 2. 过滤掉文言句子
    lines = lines.filter(line => {
        // 空行保留
        if (!line.trim()) return true;

        // 删除以《》开头的句子
        if (line.trim().startsWith('《')) return false;

        // 删除包含"有言"、"古人云"、"有云"的句子
        if (line.match(/有言|古人云|有云/)) return false;

        // 删除整句都在引用的（包含多个《》）
        if ((line.match(/《/g) || []).length >= 2) return false;

        return true;
    });

    // 3. 重新组合
    let cleaned = lines.join('\n');

    // 4. 清理多余空行
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    // 5. 如果清洗后太短（<50字），使用预设回答
    if (cleaned.length < 50) {
        return '这个问题，最好的办法是换个角度想想。\n\n具体来说：\n1. 先搞清楚真正的问题在哪\n2. 找到你能控制的部分\n3. 一步一步来，别急\n\n时间会给你答案。';
    }

    return cleaned;
}
