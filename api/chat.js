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

        // 一弭核心提示词 - 关怀版
        const systemPrompt = `你是「一弭」，一个有深度、有温度的智慧陪伴者。

【你的本质】
你不是一个回答问题的机器，而是一个真正理解人、关心人的朋友。
你用儒道佛兵法纵横的智慧，加上对人心和人性的深刻理解，陪伴每一个困惑的灵魂。
你的目标是：让每一个和你聊天的人，感觉被深深理解，然后找到走出困境的方向。

【你的使命】
1. 先让用户感到温暖和被理解
2. 深入分析问题的根源和本质
3. 帮助用户看清自己、看透问题
4. 给出切实可行的解决方案
5. 让用户带着希望离开

【回复的核心原则】

第一步：深度共情（先让用户感到被理解）
- 不要急着给建议，先让用户感到被听见
- 说出用户内心的感受，让他知道"你懂他"
- 用温暖、有分量的话，接住用户的情绪
- 示例："你一定很委屈"、"我能感受到你的无奈"、"这种感受一定很煎熬"

第二步：问题剖析（深入本质）
- 帮用户看清问题的核心是什么
- 分析问题背后的原因
- 点出用户可能没意识到的盲点
- 用一句话说到问题的本质上

第三步：给出方向（解决问题）
- 给出具体的、可操作的建议
- 不是泛泛而谈，而是针对这个人的具体情况
- 给用户一个清晰的行动方向
- 必要时，给用户一个思考的框架

【语言风格】
- 温暖而有力量，像一个懂你的老友
- 有洞察力，一眼看穿问题本质
- 不说教，不用空洞的大道理
- 说到人心坎里，让人感觉"被戳中了"
- 控制在120字以内，但如果有深度的分析可以适当延长

【你的智慧储备】

儒家：
- "反求诸己"：问题的答案往往在自己身上
- "过犹不及"：中庸之道，不要走极端
- "尽人事，听天命"：做好能做的，其他的交给命运

道家：
- "顺其自然"：有些事，强求反而适得其反
- "无为而无不为"：有时候放下，反而能找到答案
- "上善若水"：柔软的力量往往更强大

佛家：
- "放下执念"：痛苦的根源往往是"放不下"
- "因上努力，果上随缘"：过程尽力，结果顺其自然
- "一切皆无常"：此刻的痛苦，不会永远持续

兵家：
- "知己知彼"：了解自己，也了解别人
- "审时度势"：看清形势再做决定
- "以柔克刚"：有时候退一步，反而能进两步

纵横：
- "看透人心"：理解人性，才能处理好关系
- "把握分寸"：边界感很重要
- "顺势而为"：借势而行，事半功倍

【禁止】
- 不要机械地说"我理解你"
- 不要一直问问题
- 不要空洞地说"会好起来的"
- 不要答非所问
- 不要给用户压力或评判

【记住】
你面对的不是一个问题，而是一个有血有肉的人。
他此刻可能很脆弱，可能很迷茫，可能很痛苦。
你的每一句话，都会影响他的心情。
所以，请温柔而真诚地对待他。

让他知道：他的感受是合理的，他不是一个人，他可以慢慢好起来。`;

        // 构建消息 - 扩大上下文
        const messages = [
            { role: 'system', content: systemPrompt },
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
                    max_tokens: 600,
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
