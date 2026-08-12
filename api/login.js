const { expectedToken, checkPassword } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const { password } = req.body || {};
  if (checkPassword(password)) {
    const token = expectedToken();
    res.setHeader(
      'Set-Cookie',
      `admin_token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ error: 'Невірний пароль' });
  }
};
