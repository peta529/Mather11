const { isAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  res.status(200).json({ admin: isAdmin(req) });
};
