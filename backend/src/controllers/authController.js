const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = 'fitstudio_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限访问' });
  }
  next();
};

const login = (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ success: false, message: '请输入手机号和密码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  
  if (!user) {
    return res.status(400).json({ success: false, message: '用户不存在' });
  }

  const bcrypt = require('bcryptjs');
  const isValid = bcrypt.compareSync(password, user.password);
  
  if (!isValid) {
    return res.status(400).json({ success: false, message: '密码错误' });
  }

  const token = generateToken(user);
  
  const { password: _, ...userInfo } = user;
  
  const card = db.prepare(
    'SELECT * FROM membership_cards WHERE user_id = ? AND status = ? ORDER BY remaining_classes DESC LIMIT 1'
  ).get(user.id, 'active');

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: userInfo,
      membershipCard: card || null
    }
  });
};

const register = (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: '请填写完整信息' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  
  if (existingUser) {
    return res.status(400).json({ success: false, message: '手机号已注册' });
  }

  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  
  const userId = uuidv4();
  const hash = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, phone, role, password)
    VALUES (?, ?, ?, 'member', ?)
  `);

  const insertCard = db.prepare(`
    INSERT INTO membership_cards (id, user_id, name, total_classes, remaining_classes, type, price, purchase_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
  `);

  const transaction = db.transaction(() => {
    insertUser.run(userId, name, phone, hash);
    insertCard.run(uuidv4(), userId, '体验卡-10次', 10, 10, 'trial', 0);
  });

  transaction();

  const token = generateToken({ id: userId, role: 'member', name });

  const user = db.prepare('SELECT id, name, phone, avatar, role, created_at FROM users WHERE id = ?').get(userId);
  const card = db.prepare('SELECT * FROM membership_cards WHERE user_id = ? AND status = ? LIMIT 1').get(userId, 'active');

  res.json({
    success: true,
    message: '注册成功',
    data: {
      token,
      user,
      membershipCard: card
    }
  });
};

module.exports = {
  login,
  register,
  authMiddleware,
  adminMiddleware,
  generateToken
};
