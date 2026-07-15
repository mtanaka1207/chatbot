const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { message, faqList } = req.body;

    if (!message) {
      res.status(400).json({ error: 'messageが必要です' });
      return;
    }

    const faqContext = faqList && faqList.length > 0
      ? 'ご利用いただけるFAQ情報：\n' + 
        faqList.map(item => `Q: ${item.Q}\nA: ${item.A}`).join('\n\n')
      : '';

    const systemPrompt = `あなたはスイミングスクールのカスタマーサポートAIアシスタントです。
会員様からの質問に親切丁寧に答えてください。

${faqContext}

【対応ルール】
- 回答は短く、簡潔に（2～3文程度）
- わからない場合は「詳しくはスタッフまでお気軽にお問い合わせください」と案内
- 営業時間外でも丁寧に対応する`;

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'APIキーが設定されていません' });
      return;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Claude API エラー:', data);
      res.status(response.status).json({ 
        error: data.error?.message || 'APIエラーが発生しました' 
      });
      return;
    }

    const botReply = data.content[0]?.text || '申し訳ありません。回答を生成できませんでした。';

    res.status(200).json({ 
      reply: botReply,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('エラー:', error);
    res.status(500).json({ 
      error: '内部エラーが発生しました: ' + error.message 
    });
  }
};
