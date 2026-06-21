const db = require('../db');

const getProfile = (req, res) => {
  const userId = req.user.id;

  const user = db.prepare(
    'SELECT id, name, phone, avatar, role, created_at FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const cards = db.prepare(
    "SELECT * FROM membership_cards WHERE user_id = ? AND status = 'active' ORDER BY remaining_classes DESC"
  ).all(userId);

  const primaryCard = cards.length > 0 ? cards[0] : null;

  const totalBooked = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status IN ('booked', 'checked_in', 'missed')"
  ).get(userId).count;

  const checkedIn = db.prepare(
    "SELECT COUNT(*) as count FROM checkins WHERE user_id = ?"
  ).get(userId).count;

  const missed = totalBooked - checkedIn > 0 ? totalBooked - checkedIn : 0;

  res.json({
    success: true,
    data: {
      user,
      membershipCard: primaryCard,
      membershipCards: cards,
      stats: {
        total_booked: totalBooked,
        checked_in: checkedIn,
        missed,
        cancelled: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'cancelled'").get(userId).count
      }
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

  const result = cards.map(card => {
    const used = card.total_classes - card.remaining_classes;
    return {
      ...card,
      used_classes: used
    };
  });

  res.json({
    success: true,
    data: result
  });
};

const getCardTransactions = (req, res) => {
  const userId = req.user.id;
  const { cardId, page = 1, pageSize = 20 } = req.query;

  let query = `
    SELECT ct.*, c.name as course_name, co.name as coach_name
    FROM card_transactions ct
    LEFT JOIN bookings b ON ct.related_booking_id = b.id
    LEFT JOIN courses c ON b.course_id = c.id
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE ct.user_id = ?
  `;
  
  const params = [userId];

  if (cardId) {
    query += ' AND ct.card_id = ?';
    params.push(cardId);
  }

  const offset = (page - 1) * pageSize;
  query += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const transactions = db.prepare(query).all(...params);

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM card_transactions WHERE user_id = ?' + (cardId ? ' AND card_id = ?' : '')
  ).get(userId, ...(cardId ? [cardId] : [])).count;

  res.json({
    success: true,
    data: {
      list: transactions,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }
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
    SELECT b.*, c.name as course_name, c.date, c.start_time, c.end_time,
      CASE 
        WHEN EXISTS (SELECT 1 FROM checkins ch WHERE ch.booking_id = b.id) THEN 1
        ELSE 0 
      END as has_checked_in
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    WHERE b.user_id = ?
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT 20
  `).all(id);

  const bookingList = bookings.map(b => ({
    ...b,
    status: b.has_checked_in ? 'checked_in' : b.status
  }));

  const totalBooked = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status IN ('booked', 'checked_in', 'missed')"
  ).get(id).count;

  const checkedIn = db.prepare(
    "SELECT COUNT(*) as count FROM checkins WHERE user_id = ?"
  ).get(id).count;

  const missed = totalBooked - checkedIn > 0 ? totalBooked - checkedIn : 0;

  res.json({
    success: true,
    data: {
      user,
      cards,
      recent_bookings: bookingList,
      stats: {
        total_booked: totalBooked,
        checked_in: checkedIn,
        missed
      }
    }
  });
};

module.exports = {
  getProfile,
  updateProfile,
  getMembershipCards,
  getCardTransactions,
  getMembers,
  getMemberDetail
};
