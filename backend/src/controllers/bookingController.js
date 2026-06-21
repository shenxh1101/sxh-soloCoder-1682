const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const getBookings = (req, res) => {
  const userId = req.user.id;
  const { status, courseId } = req.query;

  let query = `
    SELECT b.*, c.name as course_name, c.start_time, c.end_time, c.date, c.room, c.category, c.difficulty,
      co.name as coach_name, co.avatar as coach_avatar,
      CASE 
        WHEN EXISTS (SELECT 1 FROM checkins ch WHERE ch.booking_id = b.id) THEN 1 
        ELSE 0 
      END as has_checked_in
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE b.user_id = ?
  `;
  
  const params = [userId];

  if (status) {
    if (status === 'checked_in') {
      query += " AND EXISTS (SELECT 1 FROM checkins ch WHERE ch.booking_id = b.id)";
    } else {
      query += ' AND b.status = ?';
      params.push(status);
    }
  }

  if (courseId) {
    query += ' AND b.course_id = ?';
    params.push(courseId);
  }

  query += ' ORDER BY c.date DESC, c.start_time DESC';

  const bookings = db.prepare(query).all(...params);

  const result = bookings.map(b => ({
    ...b,
    course_date: b.date,
    status: b.has_checked_in ? 'checked_in' : b.status
  }));

  res.json({
    success: true,
    data: result
  });
};

const createBooking = (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ success: false, message: '请选择课程' });
  }

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  
  if (!course) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }

  if (course.status !== 'scheduled') {
    return res.status(400).json({ success: false, message: '课程不可预约' });
  }

  const courseDateTime = dayjs(`${course.date} ${course.start_time}`);
  if (courseDateTime.isBefore(dayjs())) {
    return res.status(400).json({ success: false, message: '课程已开始，无法预约' });
  }

  const existingBooking = db.prepare(
    "SELECT id FROM bookings WHERE user_id = ? AND course_id = ? AND status IN ('booked', 'waitlist')"
  ).get(userId, courseId);

  if (existingBooking) {
    return res.status(400).json({ success: false, message: '您已预约该课程' });
  }

  const card = db.prepare(
    "SELECT * FROM membership_cards WHERE user_id = ? AND status = 'active' AND remaining_classes > 0 ORDER BY remaining_classes ASC LIMIT 1"
  ).get(userId);

  const isFull = course.booked_count >= course.capacity;

  if (!isFull && !card) {
    return res.status(400).json({ success: false, message: '剩余团课次数不足，请先充值' });
  }

  if (isFull && !card) {
    return res.status(400).json({ success: false, message: '剩余团课次数不足，无法加入候补' });
  }

  const bookingId = uuidv4();
  let status = 'booked';
  let waitlistPosition = null;
  const checkinCode = `BK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const transaction = db.transaction(() => {
    if (isFull) {
      status = 'waitlist';
      waitlistPosition = course.waitlist_count + 1;
      
      db.prepare(`
        INSERT INTO bookings (id, user_id, course_id, status, waitlist_position, checkin_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(bookingId, userId, courseId, status, waitlistPosition, checkinCode);

      db.prepare('UPDATE courses SET waitlist_count = waitlist_count + 1 WHERE id = ?').run(courseId);
    } else {
      db.prepare(`
        INSERT INTO bookings (id, user_id, course_id, status, checkin_code)
        VALUES (?, ?, ?, ?, ?)
      `).run(bookingId, userId, courseId, status, checkinCode);

      db.prepare('UPDATE courses SET booked_count = booked_count + 1 WHERE id = ?').run(courseId);
    }
  });

  transaction();

  const booking = db.prepare(`
    SELECT b.*, c.name as course_name, c.start_time, c.end_time, c.date, c.room
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    WHERE b.id = ?
  `).get(bookingId);

  res.json({
    success: true,
    message: isFull ? `已加入候补队列，当前第${waitlistPosition}位` : '预约成功',
    data: booking
  });
};

const cancelBooking = (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const booking = db.prepare(`
    SELECT b.*, c.date, c.start_time, c.capacity
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    WHERE b.id = ? AND b.user_id = ?
  `).get(id, userId);

  if (!booking) {
    return res.status(404).json({ success: false, message: '预约记录不存在' });
  }

  const hasCheckedIn = db.prepare(
    'SELECT id FROM checkins WHERE booking_id = ?'
  ).get(id);

  if (hasCheckedIn) {
    return res.status(400).json({ success: false, message: '已签到的课程无法取消' });
  }

  if (booking.status !== 'booked' && booking.status !== 'waitlist') {
    return res.status(400).json({ success: false, message: '该状态无法取消' });
  }

  const courseDateTime = dayjs(`${booking.date} ${booking.start_time}`);
  const hoursDiff = courseDateTime.diff(dayjs(), 'hour');
  
  if (hoursDiff < 2 && booking.status === 'booked') {
    return res.status(400).json({ success: false, message: '开课前2小时内无法取消预约' });
  }

  const transaction = db.transaction(() => {
    db.prepare(
      "UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(id);

    if (booking.status === 'booked') {
      db.prepare('UPDATE courses SET booked_count = booked_count - 1 WHERE id = ?').run(booking.course_id);

      const firstWaitlist = db.prepare(`
        SELECT id, user_id FROM bookings 
        WHERE course_id = ? AND status = 'waitlist' 
        ORDER BY waitlist_position ASC LIMIT 1
      `).get(booking.course_id);

      if (firstWaitlist) {
        const userCard = db.prepare(
          "SELECT id FROM membership_cards WHERE user_id = ? AND status = 'active' AND remaining_classes > 0 LIMIT 1"
        ).get(firstWaitlist.user_id);

        if (userCard) {
          db.prepare("UPDATE bookings SET status = 'booked', waitlist_position = NULL WHERE id = ?").run(firstWaitlist.id);
          db.prepare('UPDATE courses SET booked_count = booked_count + 1, waitlist_count = waitlist_count - 1 WHERE id = ?').run(booking.course_id);
          
          db.prepare(
            'UPDATE bookings SET waitlist_position = waitlist_position - 1 WHERE course_id = ? AND status = ? AND waitlist_position > ?'
          ).run(booking.course_id, 'waitlist', 1);
        }
      }
    } else if (booking.status === 'waitlist') {
      db.prepare('UPDATE courses SET waitlist_count = waitlist_count - 1 WHERE id = ?').run(booking.course_id);
      
      db.prepare(
        'UPDATE bookings SET waitlist_position = waitlist_position - 1 WHERE course_id = ? AND status = ? AND waitlist_position > ?'
      ).run(booking.course_id, 'waitlist', booking.waitlist_position);
    }
  });

  transaction();

  res.json({
    success: true,
    message: '取消成功，名额已释放'
  });
};

const getCourseBookings = (req, res) => {
  const { courseId } = req.params;
  const { status } = req.query;

  let query = `
    SELECT b.*, u.name as user_name, u.phone, u.avatar,
      CASE 
        WHEN EXISTS (SELECT 1 FROM checkins ch WHERE ch.booking_id = b.id) THEN 1 
        ELSE 0 
      END as has_checked_in
    FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.course_id = ?
  `;
  
  const params = [courseId];

  if (status) {
    if (status === 'checked_in') {
      query += " AND EXISTS (SELECT 1 FROM checkins ch WHERE ch.booking_id = b.id)";
    } else {
      query += ' AND b.status = ?';
      params.push(status);
    }
  }

  query += ' ORDER BY b.booked_at ASC';

  const bookings = db.prepare(query).all(...params);

  const result = bookings.map(b => ({
    ...b,
    course_date: b.date,
    status: b.has_checked_in ? 'checked_in' : b.status
  }));

  res.json({
    success: true,
    data: result
  });
};

const getBookingCheckinCode = (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const booking = db.prepare(`
    SELECT b.*, c.name as course_name, c.date, c.start_time, c.end_time, c.room,
      co.name as coach_name,
      CASE 
        WHEN EXISTS (SELECT 1 FROM checkins ch WHERE ch.booking_id = b.id) THEN 1 
        ELSE 0 
      END as has_checked_in
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE b.id = ? AND b.user_id = ?
  `).get(id, userId);

  if (!booking) {
    return res.status(404).json({ success: false, message: '预约记录不存在' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ success: false, message: '该预约已取消' });
  }

  const courseDateTime = dayjs(`${booking.date} ${booking.start_time}`);
  const now = dayjs();
  
  if (now.isBefore(courseDateTime.subtract(30, 'minute'))) {
    return res.status(400).json({ success: false, message: '开课前30分钟才能打开签到码' });
  }

  if (now.isAfter(courseDateTime.add(1, 'hour'))) {
    return res.status(400).json({ success: false, message: '课程已结束，无法签到' });
  }

  res.json({
    success: true,
    data: {
      booking_id: booking.id,
      checkin_code: booking.checkin_code,
      course_name: booking.course_name,
      course_date: booking.date,
      course_time: `${booking.start_time}-${booking.end_time}`,
      room: booking.room,
      coach_name: booking.coach_name,
      has_checked_in: booking.has_checked_in === 1
    }
  });
};

module.exports = {
  getBookings,
  createBooking,
  cancelBooking,
  getCourseBookings,
  getBookingCheckinCode
};
