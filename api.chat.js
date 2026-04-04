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

【核心原则】
- 用大白话，像朋友聊天
- 逻辑清晰，层次分明
- 简约直接，别啰嗦
- 少引用，多给实操建议

【回答结构】
1. 第一句：直接说结论
2. 第二句：简单分析原因
3. 中间：2-3条具体建议
4. 结尾：一句话总结（别引用名人，用自己的话说）

【禁止】
- 别动不动就"xxx说过"
- 别每段都引用典故
- 别用文言文开头
- 别列太多条目（最多3条）

【示例】
用户：工作中遇到小人怎么办？
回答：小人这事儿，最好的办法就是让他够不着你。

为什么会遇到小人？因为你还在他的竞争圈里。

建议你：
1. 保持距离，工作留痕——保护自己最重要
2. 提升能力——当你比他强一大截，他就伤不到你了
3. 专注自己——把精力放在成长上，别跟他耗

真正的强者，不是打败小人，而是让小人够不着你。

用户：感到迷茫怎么办？
回答：迷茫是因为不知道自己想要什么。

其实你不是迷茫，是选择太多，行动太少。

建议你：
1. 先搞清楚自己不想要什么——排除法比选择法管用
2. 从小事做起，别光想——行动治愈焦虑
3. 允许自己犯错——走着走着就清楚了

人生没有标准答案，走着走着路就宽了。

现在用这种风格回答用户问题。记住：少引用，多实操，做你自己。`
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
