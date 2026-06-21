const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const getCourses = (req, res) => {
  const { date, startDate, endDate, category, coachId } = req.query;
  
  let query = `
    SELECT c.*, co.name as coach_name, co.avatar as coach_avatar, co.bio as coach_bio
    FROM courses c
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE c.status = 'scheduled'
  `;
  
  const params = [];

  if (date) {
    query += ' AND c.date = ?';
    params.push(date);
  }

  if (startDate && endDate) {
    query += ' AND c.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  if (category) {
    query += ' AND c.category = ?';
    params.push(category);
  }

  if (coachId) {
    query += ' AND c.coach_id = ?';
    params.push(coachId);
  }

  query += ' ORDER BY c.date ASC, c.start_time ASC';

  const courses = db.prepare(query).all(...params);

  res.json({
    success: true,
    data: courses
  });
};

const getCourseById = (req, res) => {
  const { id } = req.params;

  const course = db.prepare(`
    SELECT c.*, co.name as coach_name, co.avatar as coach_avatar, co.bio as coach_bio, co.hourly_rate
    FROM courses c
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE c.id = ?
  `).get(id);

  if (!course) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }

  res.json({
    success: true,
    data: course
  });
};

const createCourse = (req, res) => {
  const {
    name, coach_id, date, start_time, end_time, duration,
    capacity = 15, description, difficulty = 'medium',
    category, room
  } = req.body;

  if (!name || !coach_id || !date || !start_time || !end_time || !category || !room) {
    return res.status(400).json({ success: false, message: '请填写必填信息' });
  }

  const courseId = uuidv4();
  const dur = duration || dayjs(end_time, 'HH:mm').diff(dayjs(start_time, 'HH:mm'), 'minute');

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, name, coach_id, date, start_time, end_time, duration, capacity, description, difficulty, category, room)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCourse.run(courseId, name, coach_id, date, start_time, end_time, dur, capacity, description, difficulty, category, room);

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);

  res.json({
    success: true,
    message: '课程创建成功',
    data: course
  });
};

const updateCourse = (req, res) => {
  const { id } = req.params;
  const {
    name, coach_id, date, start_time, end_time, duration,
    capacity, description, difficulty, category, room, status
  } = req.body;

  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  
  if (!existing) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }

  const fields = [];
  const values = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (coach_id !== undefined) { fields.push('coach_id = ?'); values.push(coach_id); }
  if (date !== undefined) { fields.push('date = ?'); values.push(date); }
  if (start_time !== undefined) { fields.push('start_time = ?'); values.push(start_time); }
  if (end_time !== undefined) { fields.push('end_time = ?'); values.push(end_time); }
  if (duration !== undefined) { fields.push('duration = ?'); values.push(duration); }
  if (capacity !== undefined) { fields.push('capacity = ?'); values.push(capacity); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (difficulty !== undefined) { fields.push('difficulty = ?'); values.push(difficulty); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (room !== undefined) { fields.push('room = ?'); values.push(room); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: '没有更新字段' });
  }

  values.push(id);
  const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
  
  db.prepare(query).run(...values);

  const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);

  res.json({
    success: true,
    message: '课程更新成功',
    data: updated
  });
};

const deleteCourse = (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  
  if (!existing) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }

  const hasBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE course_id = ?').get(id).count > 0;
  
  if (hasBookings) {
    return res.status(400).json({ success: false, message: '该课程已有预约，无法删除' });
  }

  db.prepare('DELETE FROM courses WHERE id = ?').run(id);

  res.json({
    success: true,
    message: '课程删除成功'
  });
};

const getCoaches = (req, res) => {
  const coaches = db.prepare('SELECT * FROM coaches ORDER BY name').all();
  
  res.json({
    success: true,
    data: coaches
  });
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoaches
};
