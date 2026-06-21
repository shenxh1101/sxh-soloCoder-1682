const db = require('../db');

const getProfile = (req, res) => {
  const userId = req.user.id;

  const user = db.prepare(
    'SELECT id, name, phone, avatar, role, created_at FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const card = db.prepare(
    "SELECT * FROM membership_cards WHERE user_id = ? AND status = 'active' ORDER BY remaining_classes DESC LIMIT 1"
  ).get(userId);

  const stats = {
    total_booked: db.prepare(
      'SELECT COUNT(*) as count FROM bookings WHERE user_id = ?'
    ).get(userId).count,
    checked_in: db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'checked_in'"
    ).get(userId).count,
    missed: db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'missed'"
    ).get(userId).count
  };

  res.json({
    success: true,
    data: {
      user,
      membershipCard: card || null,
      stats
    }
  });
};

const updateProfile = (req, res) => {
  const userId = req.user.id;
  const { name, avatar } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(avatar);
  }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: '没有更新字段' });
  }

  values.push(userId);
  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  
  db.prepare(query).run(...values);

  const user = db.prepare(
    'SELECT id, name, phone, avatar, role, created_at FROM users WHERE id = ?'
  ).get(userId);

  res.json({
    success: true,
    message: '更新成功',
    data: user
  });
};

const getMembershipCards = (req, res) => {
  const userId = req.user.id;

  const cards = db.prepare(
    'SELECT * FROM membership_cards WHERE user_id = ? ORDER BY status DESC, created_at DESC'
  ).all(userId);

  res.json({
    success: true,
    data: cards
  });
};

const getMembers = (req, res) => {
  const { keyword, page = 1, pageSize = 20 } = req.query;

  let query = 'SELECT id, name, phone, avatar, role, created_at FROM users WHERE role = ?';
  const params = ['member'];

  if (keyword) {
    query += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const offset = (page - 1) * pageSize;
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const users = db.prepare(query).all(...params);

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE role = ?' + (keyword ? ' AND (name LIKE ? OR phone LIKE ?)' : '')
  ).get('member', ...(keyword ? [`%${keyword}%`, `%${keyword}%`] : [])).count;

  res.json({
    success: true,
    data: {
      list: users,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }
  });
};

const getMemberDetail = (req, res) => {
  const { id } = req.params;

  const user = db.prepare(
    'SELECT id, name, phone, avatar, role, created_at FROM users WHERE id = ?'
  ).get(id);

  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const cards = db.prepare(
    'SELECT * FROM membership_cards WHERE user_id = ? ORDER BY created_at DESC'
  ).all(id);

  const bookings = db.prepare(`
    SELECT b.*, c.name as course_name, c.date, c.start_time, c.end_time
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    WHERE b.user_id = ?
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT 20
  `).all(id);

  const stats = {
    total_booked: db.prepare('SELECT COUNT(*) as count FROM bookings WHERE user_id = ?').get(id).count,
    checked_in: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'checked_in'").get(id).count,
    missed: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'missed'").get(id).count
  };

  res.json({
    success: true,
    data: {
      user,
      cards,
      recent_bookings: bookings,
      stats
    }
  });
};

module.exports = {
  getProfile,
  updateProfile,
  getMembershipCards,
  getMembers,
  getMemberDetail
};
