const { readData, writeData } = require('../lib/blob-store');
const { isAdmin } = require('../lib/auth');

const DEFAULT_DATA = { settings: null, products: [] };

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const data = await readData();
    res.status(200).json(data || DEFAULT_DATA);
    return;
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || !Array.isArray(body.products)) {
      res.status(400).json({ error: 'bad body' });
      return;
    }
    try {
      await writeData(body);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося зберегти дані. Перевірте, чи підключено Vercel Blob сховище до проєкту (Storage → Blob → Connect to Project).' });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
