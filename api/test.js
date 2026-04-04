export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const apiKey = process.env.DASHSCOPE_API_KEY;
    
    res.status(200).json({
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
        message: apiKey ? 'API Key已配置' : 'API Key未配置，请检查环境变量'
    });
}