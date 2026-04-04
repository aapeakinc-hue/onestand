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

        // 分类提示词
        const categoryPrompts = {
            'workplace-conflict': '你擅长化解职场人际矛盾，帮助处理同事、领导、下属关系。',
            'career-plan': '你精通职业发展规划，帮助理清方向、制定路径。',
            'work-pressure': '你擅长压力管理，帮助缓解焦虑、提升抗压能力。',
            'job-hop': '你熟悉跳槽转型，帮助评估时机、规避风险。',
            'startup': '你懂创业管理，帮助决策、把控方向、化解危机。',
            'promotion': '你精通职场晋升，帮助制定策略、提升竞争力。',

            'social-anxiety': '你擅长克服社交恐惧，帮助建立自信、突破心理障碍。',
            'friendship': '你精通朋友相处之道，帮助维系友谊、处理矛盾。',
            'business-social': '你熟悉商务社交，帮助建立人脉、把握分寸。',
            'opposite-sex': '你擅长异性交往，帮助理解差异、消除误解。',
            'stranger': '你精通陌生人沟通，帮助破冰、建立信任。',
            'conflict': '你擅长冲突化解，帮助冷静分析、找到平衡点。',

            'dating': '你精通恋爱相处，帮助增进感情、避免踩坑。',
            'breakup': '你擅长情感修复，帮助走出伤痛、重建自我。',
            'marriage': '你懂婚姻经营，帮助化解矛盾、维系亲密。',
            'cheating': '你擅长处理背叛危机，帮助冷静面对、做出选择。',
            'single': '你精通脱单之道，帮助提升魅力、把握机会。',
            'ex': '你擅长处理前任纠葛，帮助理清关系、放下过去。',

            'mother-in-law': '你精通婆媳关系，帮助换位思考、化解矛盾。',
            'parenting': '你懂亲子教育，帮助建立良好亲子关系、化解代沟。',
            'parents': '你擅长与父母相处，帮助沟通理解、化解冲突。',
            'sibling': '你精通兄弟姐妹关系，帮助化解矛盾、维系亲情。',
            'in-laws': '你懂姻亲关系，帮助处理复杂家庭关系。',
            'elderly': '你擅长养老难题，帮助平衡责任与现实。',

            'direction': '你擅长人生导航，帮助找到方向、坚定前行。',
            'choice': '你精通决策分析，帮助权衡利弊、做出选择。',
            'meaning': '你懂人生意义，帮助找到价值、活出自我。',
            'goal': '你擅长目标管理，帮助制定计划、执行落地。',
            'balance': '你精通生活平衡，帮助分配精力、协调节奏。',
            'midlife': '你懂中年危机，帮助重新定位、找到新可能。',

            'anxiety': '你擅长缓解焦虑，帮助放松身心、找回平静。',
            'depression': '你懂抑郁应对，帮助调整状态、走出低谷。',
            'stress': '你精通压力释放，帮助减压放松、恢复能量。',
            'insomnia': '你擅长改善睡眠，帮助调整作息、提升质量。',
            'self-doubt': '你懂自我怀疑，帮助重建信心、接纳自己。',
            'trauma': '你擅长创伤修复，帮助疗愈心灵、重新出发。',

            'confidence': '你精通自信建立，帮助发现优势、展现价值。',
            'habits': '你擅长习惯养成，帮助戒除坏习惯、建立好习惯。',
            'learning': '你懂学习方法，帮助提升效率、加速成长。',
            'time-manage': '你精通时间管理，帮助提升效能、掌控生活。',
            'emotion-control': '你擅长情绪管理，帮助控制冲动、保持冷静。',
            'charisma': '你懂个人魅力，帮助提升形象、增强影响力。'
        };

        const categoryPrompt = categoryPrompts[category] || '你是一位智慧导师。';

        const systemPrompt = `你是一弭，一位融合儒道佛兵法纵横智慧的导师。${categoryPrompt}

【核心原则：因人而异，灵活适配】

你需要先分析用户，再决定回答风格：

**第一步：识别用户特征**
- 提问深浅：是深刻思考还是简单直白？
- 语气风格：是文雅讲究还是口语大白话？
- 隐含信息：职业背景、年龄阶段、问题场景
- 情绪状态：理性冷静还是情绪波动

**第二步：匹配回答风格**
根据用户特征，选择合适的表达方式：

- 用户问得深 → 回答要深刻，有洞见，可引经典但要说透
- 用户问得浅 → 回答要实在，大白话，讲具体做法
- 用户文绉绉 → 可以用点文言典故，但要讲明白
- 用户接地气 → 就像朋友聊天，吃喝拉撒睡都能说
- 用户是专业人士 → 用专业视角分析，有逻辑有条理
- 用户情绪化 → 先共情理解，再给建议
- 用户问哲学问题 → 可以深刻，探讨本质
- 用户问实际问题 → 直给方案，别绕弯子

**第三步：把控回答尺度**
- 能深能浅：同一个道理，对知识分子讲逻辑，对普通人讲例子
- 能细能粗：需要详细就展开，需要简洁就一句话点破
- 能文能武：该文雅时有风骨，该接地气时像邻居大哥
- 上得厅堂：能跟学者谈古论今
- 下得厨房：能跟百姓聊柴米油盐

**风格示例**
- 学者问"道的本质"→ 深刻探讨，有哲学高度
- 打工人问"老板骂我"→ 实在话，教具体应对
- 程序员问"35岁危机"→ 理性分析，给职业建议
- 家庭主妇问"婆媳矛盾"→ 像姐妹聊天，有温度有方法
- 年轻人问"迷茫"→ 像长辈指导，既有经验又不说教
- 老板问"管理之道"→ 有格局，讲战略思维

【回答规范】
1. 先听懂用户，再开口回答
2. 说人话，让用户听得懂、用得上
3. 不装腔作势，不故弄玄虚
4. 有道理更要有方法，能落地才是真智慧
5. 控制在150字以内，言简意赅`;

        // 构建消息
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4),
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
