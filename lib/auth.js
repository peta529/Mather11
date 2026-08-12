const crypto = require('crypto');

// Пароль для входу в адмінку. Захований у коді (не показується в
// браузері й не потрапляє на клієнт — перевіряється лише на сервері).
// Щоб змінити пароль пізніше: відредагуйте рядок нижче і задеплойте
// сайт ще раз (vercel --prod).
const ADMIN_PASSWORD = 'Podium53001';

// Окремий секрет для підпису cookie сесії. Ніде не показується,
// міняти його не обов'язково.
const SESSION_SECRET = 'f3b7c9a1-shoe-catalog-session-secret-2026';

function expectedToken() {
  return crypto.createHmac('sha256', SESSION_SECRET).update('admin-session').digest('hex');
}

function checkPassword(pw) {
  return typeof pw === 'string' && pw.trim() === ADMIN_PASSWORD;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  });
  return out;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  return Boolean(cookies.admin_token) && cookies.admin_token === expectedToken();
}

module.exports = { expectedToken, checkPassword, parseCookies, isAdmin };
