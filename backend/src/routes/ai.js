import express from 'express';
import { get } from '../db.js';
import { authRequired, hackathonContext, adminOnly } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });
router.use(authRequired, hackathonContext);

router.post('/question', adminOnly, async (req, res) => {
  const { project_id, project_description, project_name } = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  let description = project_description || '';
  let name = project_name || '';

  if (project_id && !description) {
    const p = await get('SELECT name, short_description FROM projects WHERE id = ? AND hackathon_id = ?', [project_id, req.hackathonId]);
    if (p) { description = p.short_description || ''; name = p.name || ''; }
  }

  const prompt = description
    ? `You are a sharp hackathon judge. Based on this project:\n\nProject: "${name}"\nDescription: "${description}"\n\nGenerate one incisive, thought-provoking question a judge would ask this team during their demo. Be specific to their project, not generic. Output only the question, nothing else.`
    : `You are a sharp hackathon judge. Generate one strong, open-ended question to ask a hackathon team during their final demo presentation. Output only the question.`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.9,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(502).json({ error: err.error?.message || 'OpenAI error' });
    }
    const data = await resp.json();
    const question = data.choices?.[0]?.message?.content?.trim() || 'No question generated.';
    res.json({ question });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
