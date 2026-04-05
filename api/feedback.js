export default async function handler(req, res) {
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
        const feedback = req.body;
        
        // 记录反馈到日志
        console.log('=== 用户反馈 ===');
        console.log('时间:', new Date().toLocaleString('zh-CN'));
        console.log('分类:', feedback.category);
        console.log('评分:', feedback.rating);
        console.log('问题:', feedback.question?.substring(0, 50) + '...');
        console.log('回答:', feedback.answer?.substring(0, 100) + '...');
        if (feedback.tags && feedback.tags.length > 0) {
            console.log('问题标签:', feedback.tags.join(', '));
        }
        if (feedback.comment) {
            console.log('用户建议:', feedback.comment);
        }
        console.log('================\n');

        res.json({ success: true, message: '反馈已记录' });

    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: '记录反馈失败' });
    }
}