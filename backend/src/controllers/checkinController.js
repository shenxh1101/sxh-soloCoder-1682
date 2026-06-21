const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

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

  if (booking.status !== 'booked') {
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

  const existingCheckin = db.prepare('SELECT id FROM checkins WHERE booking_id = ?').get(booking.id);
  
  if (existingCheckin) {
    return res.status(400).json({ success: false, message: '已签到，请勿重复签到' });
  }

  const checkinId = uuidv4();

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO checkins (id, booking_id, user_id, course_id, checkin_method, operator_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(checkinId, booking.id, booking.user_id, booking.course_id, method, operatorId);

    db.prepare("UPDATE bookings SET status = 'checked_in' WHERE id = ?").run(booking.id);
  });

  transaction();

  const checkinRecord = db.prepare('SELECT * FROM checkins WHERE id = ?').get(checkinId);

  res.json({
    success: true,
    message: '签到成功',
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
      
      db.prepare(`
        INSERT INTO checkins (id, booking_id, user_id, course_id, checkin_method, operator_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(checkinId, booking.id, userId, courseId, method, operatorId);

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

module.exports = {
  checkin,
  getCheckinsByCourse,
  getTodayCheckins,
  batchCheckin
};
