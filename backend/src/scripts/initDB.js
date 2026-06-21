const fs = require('fs');
const path = require('path');
const db = require('../db');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const initDB = () => {
  console.log('开始初始化数据库...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      phone TEXT,
      bio TEXT,
      hourly_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS membership_cards (
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

    CREATE TABLE IF NOT EXISTS courses (
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
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (coach_id) REFERENCES coaches(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
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

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      checkin_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      checkin_method TEXT NOT NULL DEFAULT 'manual',
      operator_id TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_courses_date ON courses(date);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_course ON bookings(course_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_course ON checkins(course_id);
  `);

  console.log('数据库表创建完成');

  const coachCount = db.prepare('SELECT COUNT(*) as count FROM coaches').get().count;
  if (coachCount === 0) {
    console.log('插入初始教练数据...');
    
    const insertCoach = db.prepare(`
      INSERT INTO coaches (id, name, avatar, phone, bio, hourly_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const coaches = [
      { id: 'c1', name: '李教练', avatar: 'https://picsum.photos/id/64/200/200', phone: '13800138001', bio: '10年健身教练经验，动感单车认证教练', hourly_rate: 200 },
      { id: 'c2', name: '王教练', avatar: 'https://picsum.photos/id/91/200/200', phone: '13800138002', bio: '瑜伽高级导师，印度瑜伽学院认证', hourly_rate: 250 },
      { id: 'c3', name: '张教练', avatar: 'https://picsum.photos/id/177/200/200', phone: '13800138003', bio: 'CrossFit认证教练，力量训练专家', hourly_rate: 220 },
      { id: 'c4', name: '刘教练', avatar: 'https://picsum.photos/id/338/200/200', phone: '13800138004', bio: '普拉提认证教练，产后康复专家', hourly_rate: 230 },
      { id: 'c5', name: '陈教练', avatar: 'https://picsum.photos/id/1027/200/200', phone: '13800138005', bio: '搏击操认证教练，前职业拳击手', hourly_rate: 210 },
      { id: 'c6', name: '赵教练', avatar: 'https://picsum.photos/id/1027/200/200', phone: '13800138006', bio: '尊巴舞认证教练，舞蹈专业背景', hourly_rate: 200 }
    ];

    const insertMany = db.transaction((coaches) => {
      for (const coach of coaches) {
        insertCoach.run(coach.id, coach.name, coach.avatar, coach.phone, coach.bio, coach.hourly_rate);
      }
    });

    insertMany(coaches);
    console.log(`插入 ${coaches.length} 位教练`);
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('插入初始用户数据...');
    
    const bcrypt = require('bcryptjs');
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, phone, avatar, role, password)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const users = [
      { id: 'u1', name: '小明', phone: '13888888888', avatar: 'https://picsum.photos/id/1027/200/200', role: 'member', password: '123456' },
      { id: 'u2', name: '小红', phone: '13888888889', avatar: 'https://picsum.photos/id/64/200/200', role: 'member', password: '123456' },
      { id: 'a1', name: '管理员', phone: 'admin', avatar: 'https://picsum.photos/id/177/200/200', role: 'admin', password: 'admin123' }
    ];

    const insertMany = db.transaction((users) => {
      for (const user of users) {
        const hash = bcrypt.hashSync(user.password, 10);
        insertUser.run(user.id, user.name, user.phone, user.avatar, user.role, hash);
      }
    });

    insertMany(users);
    console.log(`插入 ${users.length} 个用户`);

    console.log('插入初始会员卡数据...');
    const insertCard = db.prepare(`
      INSERT INTO membership_cards (id, user_id, name, total_classes, remaining_classes, type, price, purchase_date, expire_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cards = [
      { id: 'card1', user_id: 'u1', name: '月卡-30次', total_classes: 30, remaining_classes: 18, type: 'monthly', price: 299, purchase_date: '2026-05-01', expire_date: '2026-06-30' },
      { id: 'card2', user_id: 'u2', name: '季卡-100次', total_classes: 100, remaining_classes: 85, type: 'quarterly', price: 799, purchase_date: '2026-04-01', expire_date: '2026-07-01' }
    ];

    const insertCards = db.transaction((cards) => {
      for (const card of cards) {
        insertCard.run(card.id, card.user_id, card.name, card.total_classes, card.remaining_classes, card.type, card.price, card.purchase_date, card.expire_date);
      }
    });

    insertCards(cards);
    console.log(`插入 ${cards.length} 张会员卡`);
  }

  const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  if (courseCount === 0) {
    console.log('插入初始课程数据...');
    
    const insertCourse = db.prepare(`
      INSERT INTO courses (id, name, coach_id, date, start_time, end_time, duration, capacity, booked_count, waitlist_count, description, difficulty, category, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const today = new Date();
    const courses = [];
    
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      const dayCourses = [
        { name: '动感单车', coach_id: 'c1', start: '07:00', end: '07:50', duration: 50, capacity: 15, desc: '高强度有氧训练，燃烧脂肪，提升心肺功能。', difficulty: 'medium', category: '有氧', room: '动感单车房' },
        { name: '瑜伽冥想', coach_id: 'c2', start: '09:30', end: '10:30', duration: 60, capacity: 15, desc: '舒缓身心的瑜伽课程，结合呼吸与体式。', difficulty: 'easy', category: '瑜伽', room: '瑜伽室A' },
        { name: 'HIIT燃脂', coach_id: 'c3', start: '18:00', end: '18:45', duration: 45, capacity: 15, desc: '高强度间歇训练，短时间内达到最佳燃脂效果。', difficulty: 'hard', category: '力量', room: '多功能训练区' },
        { name: '普拉提核心', coach_id: 'c4', start: '19:30', end: '20:30', duration: 60, capacity: 15, desc: '专注核心力量训练，塑造紧致腰腹。', difficulty: 'medium', category: '塑形', room: '瑜伽室B' }
      ];

      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        dayCourses.push({ name: '搏击操', coach_id: 'c5', start: '12:00', end: '12:50', duration: 50, capacity: 15, desc: '结合拳击动作的有氧课程，释放压力。', difficulty: 'medium', category: '有氧', room: '操房' });
      }

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayCourses.push({ name: '周末活力瑜伽', coach_id: 'c2', start: '09:00', end: '10:15', duration: 75, capacity: 15, desc: '周末特别课程，更长时间的沉浸式瑜伽体验。', difficulty: 'medium', category: '瑜伽', room: '瑜伽室A' });
      }

      dayCourses.forEach((c, idx) => {
        const bookedCount = Math.floor(Math.random() * 12) + 3;
        const waitlistCount = bookedCount >= 15 ? Math.floor(Math.random() * 5) + 1 : 0;
        
        courses.push({
          id: `course_${day}_${idx}`,
          ...c,
          date: dateStr,
          booked_count: Math.min(bookedCount, c.capacity),
          waitlist_count: waitlistCount
        });
      });
    }

    const insertMany = db.transaction((courses) => {
      for (const c of courses) {
        insertCourse.run(c.id, c.name, c.coach_id, c.date, c.start, c.end, c.duration, c.capacity, c.booked_count, c.waitlist_count, c.desc, c.difficulty, c.category, c.room);
      }
    });

    insertMany(courses);
    console.log(`插入 ${courses.length} 节课程`);
  }

  console.log('数据库初始化完成！');
};

initDB();

module.exports = initDB;
