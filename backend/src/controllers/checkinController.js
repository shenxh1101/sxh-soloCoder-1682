const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const deductClass = (userId, bookingId, checkinId, method) => {
  const card = db.prepare(
    "SELECT * FROM membership_cards WHERE user_id = ? AND status = 'active' AND remaining_classes > 0 ORDER BY remaining_classes ASC LIMIT 1"
  ).get(userId);

  if (!card) {
    return { success: false, message: '剩余团课次数不足' };
  }

  const newBalance = card.remaining_classes - 1;
  
  db.prepare('UPDATE membership_cards SET remaining_classes = ? WHERE id = ?').run(newBalance, card.id);

  const transId = uuidv4();
  db.prepare(`
    INSERT INTO card_transactions (id, card_id, user_id, type, change_amount, balance_after, related_booking_id, related_checkin_id, remark)
    VALUES (?, ?, ?, 'deduct', ?, ?, ?, ?, '签到扣次')
  `).run(transId, card.id, userId, -1, newBalance, bookingId, checkinId);

  return { success: true, cardId: card.id };
};

const checkin = (req, res) => {
  const { bookingId, userId, courseId, method = 'manual' } = req.body;
  const operatorId = req.user?.id;

  let booking;
  
  if (bookingId) {
    booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  } else if (userId && courseId) {
    booking = db.prepare(
      "SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status = 'booked' LIMIT 1"
    ).get(userId, courseId);
  }

  if (!booking) {
    return res.status(400).json({ success: false, message: '预约记录不存在' });
  }

  const existingCheckin = db.prepare('SELECT id FROM checkins WHERE booking_id = ?').get(booking.id);
  
  if (existingCheckin) {
    const checkinRecord = db.prepare(`
      SELECT ch.*, u.name as user_name, c.name as course_name
      FROM checkins ch
      LEFT JOIN users u ON ch.user_id = u.id
      LEFT JOIN courses c ON ch.course_id = c.id
      WHERE ch.id = ?
    `).get(existingCheckin.id);
    
    return res.status(200).json({ 
      success: true, 
      message: '已签到', 
      alreadyCheckedIn: true,
      data: checkinRecord 
    });
  }

  if (booking.status !== 'booked' && booking.status !== 'waitlist') {
    return res.status(400).json({ success: false, message: '该预约状态无法签到' });
  }

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(booking.course_id);
  
  if (!course) {
    return res.status(400).json({ success: false, message: '课程不存在' });
  }

  const courseDate = dayjs(`${course.date} ${course.start_time}`);
  const now = dayjs();
  
  if (now.isBefore(courseDate.subtract(30, 'minute'))) {
    return res.status(400).json({ success: false, message: '开课前30分钟才可签到' });
  }

  const checkinId = uuidv4();

  const transaction = db.transaction(() => {
    const deductResult = deductClass(booking.user_id, booking.id, checkinId, method);
    
    if (!deductResult.success) {
      return deductResult;
    }

    db.prepare(`
      INSERT INTO checkins (id, booking_id, user_id, course_id, card_id, checkin_method, operator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(checkinId, booking.id, booking.user_id, booking.course_id, deductResult.cardId, method, operatorId);

    db.prepare("UPDATE bookings SET status = 'checked_in' WHERE id = ?").run(booking.id);

    if (booking.status === 'waitlist') {
      db.prepare('UPDATE courses SET waitlist_count = waitlist_count - 1 WHERE id = ?').run(course.id);
    }

    return { success: true };
  });

  const result = transaction();

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }

  const checkinRecord = db.prepare(`
    SELECT ch.*, u.name as user_name, u.phone, c.name as course_name, c.date, c.start_time, c.room
    FROM checkins ch
    LEFT JOIN users u ON ch.user_id = u.id
    LEFT JOIN courses c ON ch.course_id = c.id
    WHERE ch.id = ?
  `).get(checkinId);

  res.json({
    success: true,
    message: '签到成功，已扣除1次团课',
    data: checkinRecord
  });
};

const scanCheckin = (req, res) => {
  const { code } = req.body;
  const operatorId = req.user?.id;

  if (!code) {
    return res.status(400).json({ success: false, message: '签到码无效' });
  }

  const course = db.prepare('SELECT * FROM courses WHERE checkin_code = ?').get(code);
  
  if (!course) {
    return res.status(404).json({ success: false, message: '签到码无效或课程不存在' });
  }

  return res.json({
    success: true,
    data: {
      courseId: course.id,
      courseName: course.name,
      date: course.date,
      startTime: course.start_time,
      endTime: course.end_time,
      room: course.room,
      coachId: course.coach_id
    }
  });
};

const scanCheckinConfirm = (req, res) => {
  const { code, userId } = req.body;
  const operatorId = req.user?.id;

  if (!code || !userId) {
    return res.status(400).json({ success: false, message: '参数错误' });
  }

  const course = db.prepare('SELECT * FROM courses WHERE checkin_code = ?').get(code);
  
  if (!course) {
    return res.status(404).json({ success: false, message: '签到码无效' });
  }

  const booking = db.prepare(
    "SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status = 'booked' LIMIT 1"
  ).get(userId, course.id);

  if (!booking) {
    return res.status(400).json({ success: false, message: '未找到该会员的预约记录' });
  }

  const existingCheckin = db.prepare('SELECT id FROM checkins WHERE booking_id = ?').get(booking.id);
  
  if (existingCheckin) {
    const checkinRecord = db.prepare(`
      SELECT ch.*, u.name as user_name, c.name as course_name
      FROM checkins ch
      LEFT JOIN users u ON ch.user_id = u.id
      LEFT JOIN courses c ON ch.course_id = c.id
      WHERE ch.id = ?
    `).get(existingCheckin.id);
    
    return res.json({ 
      success: true, 
      message: '该会员已签到', 
      alreadyCheckedIn: true,
      data: checkinRecord 
    });
  }

  const checkinId = uuidv4();

  const transaction = db.transaction(() => {
    const deductResult = deductClass(userId, booking.id, checkinId, 'scan');
    
    if (!deductResult.success) {
      return deductResult;
    }

    db.prepare(`
      INSERT INTO checkins (id, booking_id, user_id, course_id, card_id, checkin_method, operator_id)
      VALUES (?, ?, ?, ?, ?, 'scan', ?)
    `).run(checkinId, booking.id, userId, course.id, deductResult.cardId, operatorId);

    db.prepare("UPDATE bookings SET status = 'checked_in' WHERE id = ?").run(booking.id);

    return { success: true };
  });

  const result = transaction();

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }

  const checkinRecord = db.prepare(`
    SELECT ch.*, u.name as user_name, u.phone, c.name as course_name, c.date, c.start_time, c.room
    FROM checkins ch
    LEFT JOIN users u ON ch.user_id = u.id
    LEFT JOIN courses c ON ch.course_id = c.id
    WHERE ch.id = ?
  `).get(checkinId);

  res.json({
    success: true,
    message: '签到成功，已扣除1次团课',
    data: checkinRecord
  });
};

const getCheckinsByCourse = (req, res) => {
  const { courseId } = req.params;

  const checkins = db.prepare(`
    SELECT c.*, u.name as user_name, u.phone, u.avatar
    FROM checkins c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.course_id = ?
    ORDER BY c.checkin_time ASC
  `).all(courseId);

  res.json({
    success: true,
    data: checkins
  });
};

const getTodayCheckins = (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');

  const checkins = db.prepare(`
    SELECT c.*, u.name as user_name, u.phone, co.name as course_name, co.start_time, co.room
    FROM checkins c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN courses co ON c.course_id = co.id
    WHERE date(c.checkin_time) = ?
    ORDER BY c.checkin_time DESC
  `).all(today);

  res.json({
    success: true,
    data: checkins
  });
};

const batchCheckin = (req, res) => {
  const { courseId, userIds, method = 'manual' } = req.body;
  const operatorId = req.user?.id;

  if (!courseId || !userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ success: false, message: '参数错误' });
  }

  const results = {
    success: [],
    failed: []
  };

  const transaction = db.transaction(() => {
    for (const userId of userIds) {
      const booking = db.prepare(
        "SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status = 'booked'"
      ).get(userId, courseId);

      if (!booking) {
        results.failed.push({ userId, reason: '未找到预约记录' });
        continue;
      }

      const existingCheckin = db.prepare('SELECT id FROM checkins WHERE booking_id = ?').get(booking.id);
      
      if (existingCheckin) {
        results.failed.push({ userId, reason: '已签到' });
        continue;
      }

      const checkinId = uuidv4();
      const deductResult = deductClass(userId, booking.id, checkinId, method);
      
      if (!deductResult.success) {
        results.failed.push({ userId, reason: deductResult.message });
        continue;
      }

      db.prepare(`
        INSERT INTO checkins (id, booking_id, user_id, course_id, card_id, checkin_method, operator_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(checkinId, booking.id, userId, courseId, deductResult.cardId, method, operatorId);

      db.prepare("UPDATE bookings SET status = 'checked_in' WHERE id = ?").run(booking.id);
      
      results.success.push(userId);
    }
  });

  transaction();

  res.json({
    success: true,
    message: `成功签到 ${results.success.length} 人，失败 ${results.failed.length} 人`,
    data: results
  });
};

const generateCheckinCode = (req, res) => {
  const { courseId } = req.params;

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  
  if (!course) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }

  let code = course.checkin_code;

  if (!code) {
    code = `CK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    db.prepare('UPDATE courses SET checkin_code = ? WHERE id = ?').run(code, courseId);
  }

  res.json({
    success: true,
    data: {
      courseId,
      checkinCode: code,
      courseName: course.name,
      date: course.date,
      startTime: course.start_time
    }
  });
};

module.exports = {
  checkin,
  scanCheckin,
  scanCheckinConfirm,
  getCheckinsByCourse,
  getTodayCheckins,
  batchCheckin,
  generateCheckinCode
};
