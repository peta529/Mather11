const { put } = require('@vercel/blob');
const crypto = require('crypto');
const { isAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const { dataUrl } = req.body || {};
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: 'bad image' });
    return;
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = `products/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    res.status(200).json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: 'upload failed' });
  }
};
