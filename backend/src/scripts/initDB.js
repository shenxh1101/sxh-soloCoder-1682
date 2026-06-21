const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const dbPath = path.join(__dirname, '../../data/fitstudio.db');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('已删除旧数据库');
}

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const Database = require('better-sqlite3');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initDB = () => {
  console.log('开始初始化数据库...');

  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE coaches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      phone TEXT,
      bio TEXT,
      hourly_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE membership_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_classes INTEGER NOT NULL,
      remaining_classes INTEGER NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      expire_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE card_transactions (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      change_amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      related_booking_id TEXT,
      related_checkin_id TEXT,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (card_id) REFERENCES membership_cards(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 15,
      booked_count INTEGER NOT NULL DEFAULT 0,
      waitlist_count INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL,
      room TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      checkin_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (coach_id) REFERENCES coaches(id)
    );

    CREATE TABLE bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      waitlist_position INTEGER,
      booked_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      cancelled_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE checkins (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      card_id TEXT,
      checkin_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      checkin_method TEXT NOT NULL DEFAULT 'manual',
      operator_id TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (card_id) REFERENCES membership_cards(id)
    );

    CREATE INDEX IF NOT EXISTS idx_courses_date ON courses(date);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_course ON bookings(course_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_course ON checkins(course_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
    CREATE INDEX IF NOT EXISTS idx_card_trans_user ON card_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_card_trans_card ON card_transactions(card_id);
  `);

  console.log('数据库表创建完成');

  console.log('插入教练数据...');
  const coaches = [
    { id: 'c1', name: '李教练', avatar: 'https://picsum.photos/id/64/200/200', phone: '13800138001', bio: '10年健身教练经验，动感单车认证教练', hourly_rate: 200 },
    { id: 'c2', name: '王教练', avatar: 'https://picsum.photos/id/91/200/200', phone: '13800138002', bio: '瑜伽高级导师，印度瑜伽学院认证', hourly_rate: 250 },
    { id: 'c3', name: '张教练', avatar: 'https://picsum.photos/id/177/200/200', phone: '13800138003', bio: 'CrossFit认证教练，力量训练专家', hourly_rate: 220 },
    { id: 'c4', name: '刘教练', avatar: 'https://picsum.photos/id/338/200/200', phone: '13800138004', bio: '普拉提认证教练，产后康复专家', hourly_rate: 230 },
    { id: 'c5', name: '陈教练', avatar: 'https://picsum.photos/id/1027/200/200', phone: '13800138005', bio: '搏击操认证教练，前职业拳击手', hourly_rate: 210 },
    { id: 'c6', name: '赵教练', avatar: 'https://picsum.photos/id/1027/200/200', phone: '13800138006', bio: '尊巴舞认证教练，舞蹈专业背景', hourly_rate: 200 }
  ];

  const insertCoach = db.prepare(`
    INSERT INTO coaches (id, name, avatar, phone, bio, hourly_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const coach of coaches) {
    insertCoach.run(coach.id, coach.name, coach.avatar, coach.phone, coach.bio, coach.hourly_rate);
  }
  console.log(`插入 ${coaches.length} 位教练`);

  console.log('插入用户数据...');
  const users = [
    { id: 'u1', name: '小明', phone: '13888888888', avatar: 'https://picsum.photos/id/1027/200/200', role: 'member', password: '123456' },
    { id: 'u2', name: '小红', phone: '13888888889', avatar: 'https://picsum.photos/id/64/200/200', role: 'member', password: '123456' },
    { id: 'u3', name: '小刚', phone: '13888888890', avatar: 'https://picsum.photos/id/177/200/200', role: 'member', password: '123456' },
    { id: 'u4', name: '小丽', phone: '13888888891', avatar: 'https://picsum.photos/id/338/200/200', role: 'member', password: '123456' },
    { id: 'u5', name: '小华', phone: '13888888892', avatar: 'https://picsum.photos/id/91/200/200', role: 'member', password: '123456' },
    { id: 'a1', name: '管理员', phone: 'admin', avatar: 'https://picsum.photos/id/177/200/200', role: 'admin', password: 'admin123' }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, phone, avatar, role, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const user of users) {
    const hash = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.id, user.name, user.phone, user.avatar, user.role, hash);
  }
  console.log(`插入 ${users.length} 个用户`);

  console.log('插入会员卡数据...');
  const cards = [
    { id: 'card1', user_id: 'u1', name: '月卡-30次', total_classes: 30, remaining_classes: 18, type: 'monthly', price: 299, purchase_date: '2026-05-01', expire_date: '2026-06-30' },
    { id: 'card2', user_id: 'u2', name: '季卡-100次', total_classes: 100, remaining_classes: 85, type: 'quarterly', price: 799, purchase_date: '2026-04-01', expire_date: '2026-07-01' },
    { id: 'card3', user_id: 'u3', name: '月卡-30次', total_classes: 30, remaining_classes: 22, type: 'monthly', price: 299, purchase_date: '2026-05-10', expire_date: '2026-06-10' },
    { id: 'card4', user_id: 'u4', name: '年卡-365次', total_classes: 365, remaining_classes: 320, type: 'yearly', price: 2999, purchase_date: '2026-01-01', expire_date: '2026-12-31' },
    { id: 'card5', user_id: 'u5', name: '体验卡-10次', total_classes: 10, remaining_classes: 5, type: 'trial', price: 0, purchase_date: '2026-06-01', expire_date: '2026-07-01' }
  ];

  const insertCard = db.prepare(`
    INSERT INTO membership_cards (id, user_id, name, total_classes, remaining_classes, type, price, purchase_date, expire_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const card of cards) {
    insertCard.run(card.id, card.user_id, card.name, card.total_classes, card.remaining_classes, card.type, card.price, card.purchase_date, card.expire_date);

    const transId = uuidv4();
    db.prepare(`
      INSERT INTO card_transactions (id, card_id, user_id, type, change_amount, balance_after, remark)
      VALUES (?, ?, ?, 'purchase', ?, ?, '购卡充值')
    `).run(transId, card.id, card.user_id, card.total_classes, card.remaining_classes);
  }
  console.log(`插入 ${cards.length} 张会员卡`);

  console.log('生成本周课程...');
  const today = dayjs();
  const startOfWeek = today.startOf('week');
  const courses = [];
  const courseTemplates = [
    { name: '动感单车', coach_id: 'c1', start: '07:00', end: '07:50', duration: 50, capacity: 15, desc: '高强度有氧训练，燃烧脂肪，提升心肺功能。适合有一定运动基础的会员。', difficulty: 'medium', category: '有氧', room: '动感单车房' },
    { name: '瑜伽冥想', coach_id: 'c2', start: '09:30', end: '10:30', duration: 60, capacity: 15, desc: '舒缓身心的瑜伽课程，结合呼吸与体式，帮助释放压力，提升柔韧性。', difficulty: 'easy', category: '瑜伽', room: '瑜伽室A' },
    { name: 'HIIT燃脂', coach_id: 'c3', start: '18:00', end: '18:45', duration: 45, capacity: 15, desc: '高强度间歇训练，短时间内达到最佳燃脂效果，提升代谢率。', difficulty: 'hard', category: '力量', room: '多功能训练区' },
    { name: '普拉提核心', coach_id: 'c4', start: '19:30', end: '20:30', duration: 60, capacity: 15, desc: '专注核心力量训练，塑造紧致腰腹，改善体态。', difficulty: 'medium', category: '塑形', room: '瑜伽室B' }
  ];

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, name, coach_id, date, start_time, end_time, duration, capacity, description, difficulty, category, room, checkin_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let day = 0; day < 7; day++) {
    const date = startOfWeek.add(day, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    const dayOfWeek = date.day();
    const dayCourses = [...courseTemplates];

    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      dayCourses.push({ name: '搏击操', coach_id: 'c5', start: '12:00', end: '12:50', duration: 50, capacity: 15, desc: '结合拳击动作的有氧课程，释放压力，燃烧卡路里。', difficulty: 'medium', category: '有氧', room: '操房' });
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayCourses.push({ name: '周末活力瑜伽', coach_id: 'c2', start: '09:00', end: '10:15', duration: 75, capacity: 15, desc: '周末特别课程，更长时间的沉浸式瑜伽体验。', difficulty: 'medium', category: '瑜伽', room: '瑜伽室A' });
    }

    dayCourses.forEach((c, idx) => {
      const courseId = `course_${day}_${idx}`;
      const checkinCode = `CK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      insertCourse.run(courseId, c.name, c.coach_id, dateStr, c.start, c.end, c.duration, c.capacity, c.desc, c.difficulty, c.category, c.room, checkinCode);
      courses.push({ id: courseId, ...c, date: dateStr });
    });
  }
  console.log(`生成 ${courses.length} 节课程`);

  console.log('生成预约和签到记录...');
  const memberIds = ['u1', 'u2', 'u3', 'u4', 'u5'];
  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, user_id, course_id, status, waitlist_position, booked_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertCheckin = db.prepare(`
    INSERT INTO checkins (id, booking_id, user_id, course_id, card_id, checkin_method)
    VALUES (?, ?, ?, ?, ?, 'system')
  `);

  const insertCardTrans = db.prepare(`
    INSERT INTO card_transactions (id, card_id, user_id, type, change_amount, balance_after, related_booking_id, related_checkin_id, remark)
    VALUES (?, ?, ?, 'deduct', ?, ?, ?, ?, '签到扣次')
  `);

  const updateCourseBooked = db.prepare('UPDATE courses SET booked_count = booked_count + 1 WHERE id = ?');
  const updateCourseWaitlist = db.prepare('UPDATE courses SET waitlist_count = waitlist_count + 1 WHERE id = ?');

  const userCardMap = {
    'u1': 'card1',
    'u2': 'card2',
    'u3': 'card3',
    'u4': 'card4',
    'u5': 'card5'
  };

  let totalBookings = 0;
  let totalCheckins = 0;

  const pastCourses = courses.filter(c => dayjs(`${c.date} ${c.start}`).isBefore(today));
  const todayCourses = courses.filter(c => c.date === today.format('YYYY-MM-DD') && dayjs(`${c.date} ${c.start}`).isAfter(today));
  const futureCourses = courses.filter(c => dayjs(c.date).isAfter(today));

  for (const course of pastCourses) {
    const bookedCount = Math.floor(Math.random() * 8) + 5;
    const checkinCount = Math.floor(bookedCount * (0.7 + Math.random() * 0.25));
    const waitlistCount = bookedCount >= course.capacity ? Math.floor(Math.random() * 3) : 0;

    for (let i = 0; i < Math.min(bookedCount, memberIds.length); i++) {
      const userId = memberIds[i];
      const bookingId = uuidv4();
      const bookedAt = dayjs(course.date).subtract(1 + Math.floor(Math.random() * 3), 'day').format('YYYY-MM-DD HH:mm:ss');
      
      const status = i < checkinCount ? 'checked_in' : (Math.random() < 0.5 ? 'missed' : 'cancelled');
      const isCancelled = status === 'cancelled';
      
      insertBooking.run(bookingId, userId, course.id, status, null, bookedAt);
      
      if (!isCancelled) {
        updateCourseBooked.run(course.id);
        totalBookings++;
      }

      if (status === 'checked_in') {
        const cardId = userCardMap[userId];
        const checkinId = uuidv4();
        const checkinTime = dayjs(`${course.date} ${course.start}`).add(Math.floor(Math.random() * 10), 'minute').format('YYYY-MM-DD HH:mm:ss');
        
        insertCheckin.run(checkinId, bookingId, userId, course.id, cardId);
        db.prepare('UPDATE checkins SET checkin_time = ? WHERE id = ?').run(checkinTime, checkinId);
        
        const card = db.prepare('SELECT remaining_classes FROM membership_cards WHERE id = ?').get(cardId);
        const newBalance = card.remaining_classes - 1;
        db.prepare('UPDATE membership_cards SET remaining_classes = ? WHERE id = ?').run(newBalance, cardId);
        
        const transId = uuidv4();
        insertCardTrans.run(transId, cardId, userId, -1, newBalance, bookingId, checkinId);
        
        totalCheckins++;
      }
    }

    for (let i = 0; i < waitlistCount; i++) {
      const userId = memberIds[(i + bookedCount) % memberIds.length];
      const bookingId = uuidv4();
      const bookedAt = dayjs(course.date).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
      
      insertBooking.run(bookingId, userId, course.id, 'waitlist', i + 1, bookedAt);
      updateCourseWaitlist.run(course.id);
    }
  }

  for (const course of todayCourses) {
    const bookedCount = Math.floor(Math.random() * 8) + 4;
    const waitlistCount = bookedCount >= course.capacity ? Math.floor(Math.random() * 3) + 1 : 0;

    for (let i = 0; i < Math.min(bookedCount, memberIds.length); i++) {
      const userId = memberIds[i];
      const bookingId = uuidv4();
      const bookedAt = dayjs().subtract(1 + Math.floor(Math.random() * 2), 'day').format('YYYY-MM-DD HH:mm:ss');
      
      insertBooking.run(bookingId, userId, course.id, 'booked', null, bookedAt);
      updateCourseBooked.run(course.id);
      totalBookings++;
    }

    for (let i = 0; i < waitlistCount; i++) {
      const userId = memberIds[(i + bookedCount) % memberIds.length];
      const bookingId = uuidv4();
      const bookedAt = dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
      
      insertBooking.run(bookingId, userId, course.id, 'waitlist', i + 1, bookedAt);
      updateCourseWaitlist.run(course.id);
    }
  }

  for (const course of futureCourses) {
    const bookedCount = Math.floor(Math.random() * 6) + 2;
    const waitlistCount = bookedCount >= course.capacity ? Math.floor(Math.random() * 2) + 1 : 0;

    for (let i = 0; i < Math.min(bookedCount, memberIds.length); i++) {
      const userId = memberIds[i];
      const bookingId = uuidv4();
      const bookedAt = dayjs(course.date).subtract(2 + Math.floor(Math.random() * 3), 'day').format('YYYY-MM-DD HH:mm:ss');
      
      insertBooking.run(bookingId, userId, course.id, 'booked', null, bookedAt);
      updateCourseBooked.run(course.id);
      totalBookings++;
    }

    for (let i = 0; i < waitlistCount; i++) {
      const userId = memberIds[(i + bookedCount) % memberIds.length];
      const bookingId = uuidv4();
      
      insertBooking.run(bookingId, userId, course.id, 'waitlist', i + 1, bookedAt);
      updateCourseWaitlist.run(course.id);
    }
  }

  console.log(`生成 ${totalBookings} 条有效预约记录，${totalCheckins} 条签到记录`);
  console.log('数据库初始化完成！');
};

initDB();

module.exports = initDB;
