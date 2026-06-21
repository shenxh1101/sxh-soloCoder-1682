const db = require('../db');
const dayjs = require('dayjs');
const ExcelJS = require('exceljs');

const getWeeklyStats = (req, res) => {
  const { startDate, endDate } = req.query;
  
  let start, end;
  
  if (startDate && endDate) {
    start = dayjs(startDate);
    end = dayjs(endDate);
  } else {
    start = dayjs().startOf('week');
    end = dayjs().endOf('week');
  }

  const courses = db.prepare(`
    SELECT c.*, co.name as coach_name, co.hourly_rate
    FROM courses c
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE c.date BETWEEN ? AND ?
    ORDER BY c.date ASC, c.start_time ASC
  `).all(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));

  const stats = courses.map(course => {
    const checkedCount = db.prepare(
      "SELECT COUNT(*) as count FROM checkins WHERE course_id = ?"
    ).get(course.id).count;

    const bookedCount = db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE course_id = ? AND status IN ('booked', 'checked_in', 'missed')"
    ).get(course.id).count;

    const waitlistCount = course.waitlist_count;
    
    const missedCount = bookedCount - checkedCount > 0 ? bookedCount - checkedCount : 0;
    const attendanceRate = bookedCount > 0 ? ((checkedCount / bookedCount) * 100).toFixed(1) : 0;
    const coachFee = course.hourly_rate * (course.duration / 60);

    return {
      ...course,
      booked_count: bookedCount,
      checked_count: checkedCount,
      missed_count: missedCount,
      waitlist_count: waitlistCount,
      attendance_rate: attendanceRate,
      coach_fee: coachFee.toFixed(2)
    };
  });

  const totalStats = {
    total_courses: stats.length,
    total_booked: stats.reduce((sum, s) => sum + s.booked_count, 0),
    total_checked: stats.reduce((sum, s) => sum + s.checked_count, 0),
    total_missed: stats.reduce((sum, s) => sum + s.missed_count, 0),
    total_waitlist: stats.reduce((sum, s) => sum + s.waitlist_count, 0),
    total_coach_fee: stats.reduce((sum, s) => sum + parseFloat(s.coach_fee), 0).toFixed(2),
    avg_attendance_rate: stats.length > 0 
      ? (stats.reduce((sum, s) => sum + parseFloat(s.attendance_rate), 0) / stats.length).toFixed(1)
      : 0
  };

  res.json({
    success: true,
    data: {
      start_date: start.format('YYYY-MM-DD'),
      end_date: end.format('YYYY-MM-DD'),
      courses: stats,
      summary: totalStats
    }
  });
};

const getCoachStats = (req, res) => {
  const { startDate, endDate } = req.query;
  
  let start, end;
  
  if (startDate && endDate) {
    start = dayjs(startDate);
    end = dayjs(endDate);
  } else {
    start = dayjs().startOf('week');
    end = dayjs().endOf('week');
  }

  const coaches = db.prepare(`
    SELECT co.id, co.name, co.hourly_rate,
      COUNT(c.id) as course_count,
      SUM(c.duration) as total_duration
    FROM coaches co
    LEFT JOIN courses c ON co.id = c.coach_id AND c.date BETWEEN ? AND ?
    GROUP BY co.id
    ORDER BY course_count DESC
  `).all(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));

  const stats = coaches.map(coach => {
    const checkedCount = db.prepare(`
      SELECT COUNT(*) as count FROM checkins ch
      JOIN courses c ON ch.course_id = c.id
      WHERE c.coach_id = ? AND c.date BETWEEN ? AND ?
    `).get(coach.id, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')).count;

    const totalFee = coach.total_duration 
      ? (coach.hourly_rate * coach.total_duration / 60).toFixed(2) 
      : '0.00';

    return {
      ...coach,
      total_checked: checkedCount,
      total_fee: totalFee,
      avg_attendance: coach.course_count > 0 
        ? (checkedCount / coach.course_count).toFixed(1)
        : 0
    };
  });

  res.json({
    success: true,
    data: stats
  });
};

const exportWeeklyStats = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let start, end;
  
  if (startDate && endDate) {
    start = dayjs(startDate);
    end = dayjs(endDate);
  } else {
    start = dayjs().startOf('week');
    end = dayjs().endOf('week');
  }

  const courses = db.prepare(`
    SELECT c.*, co.name as coach_name, co.hourly_rate
    FROM courses c
    LEFT JOIN coaches co ON c.coach_id = co.id
    WHERE c.date BETWEEN ? AND ?
    ORDER BY c.date ASC, c.start_time ASC
  `).all(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('课表出席统计');

  worksheet.columns = [
    { header: '日期', key: 'date', width: 12 },
    { header: '时间', key: 'time', width: 18 },
    { header: '课程名称', key: 'name', width: 20 },
    { header: '教练', key: 'coach_name', width: 10 },
    { header: '教室', key: 'room', width: 15 },
    { header: '人数上限', key: 'capacity', width: 10 },
    { header: '预约人数', key: 'booked', width: 10 },
    { header: '实到人数', key: 'checked', width: 10 },
    { header: '爽约人数', key: 'missed', width: 10 },
    { header: '候补人数', key: 'waitlist', width: 10 },
    { header: '出席率', key: 'attendance_rate', width: 10 },
    { header: '教练课时费', key: 'coach_fee', width: 12 }
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6B35' }
  };
  worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  let totalBooked = 0;
  let totalChecked = 0;
  let totalMissed = 0;
  let totalWaitlist = 0;
  let totalFee = 0;

  for (const course of courses) {
    const checkedCount = db.prepare(
      "SELECT COUNT(*) as count FROM checkins WHERE course_id = ?"
    ).get(course.id).count;

    const bookedCount = db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE course_id = ? AND status IN ('booked', 'checked_in', 'missed')"
    ).get(course.id).count;

    const missedCount = bookedCount - checkedCount > 0 ? bookedCount - checkedCount : 0;
    const attendanceRate = bookedCount > 0 ? `${((checkedCount / bookedCount) * 100).toFixed(1)}%` : '0%';
    const coachFee = course.hourly_rate * (course.duration / 60);

    totalBooked += bookedCount;
    totalChecked += checkedCount;
    totalMissed += missedCount;
    totalWaitlist += course.waitlist_count;
    totalFee += coachFee;

    worksheet.addRow({
      date: course.date,
      time: `${course.start_time} - ${course.end_time}`,
      name: course.name,
      coach_name: course.coach_name,
      room: course.room,
      capacity: course.capacity,
      booked: bookedCount,
      checked: checkedCount,
      missed: missedCount,
      waitlist: course.waitlist_count,
      attendance_rate: attendanceRate,
      coach_fee: `¥${coachFee.toFixed(2)}`
    });
  }

  const summaryRow = worksheet.addRow({
    date: '合计',
    name: `共 ${courses.length} 节课`,
    booked: totalBooked,
    checked: totalChecked,
    missed: totalMissed,
    waitlist: totalWaitlist,
    attendance_rate: totalBooked > 0 ? `${((totalChecked / totalBooked) * 100).toFixed(1)}%` : '0%',
    coach_fee: `¥${totalFee.toFixed(2)}`
  });

  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF1EB' }
  };

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const fileName = `课表出席统计_${start.format('YYYYMMDD')}-${end.format('YYYYMMDD')}.xlsx`;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
};

const getMemberStats = (req, res) => {
  const userId = req.user.id;

  const totalBooked = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE user_id = ?"
  ).get(userId).count;

  const checkedIn = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'checked_in'"
  ).get(userId).count;

  const missed = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'missed'"
  ).get(userId).count;

  const cancelled = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'cancelled'"
  ).get(userId).count;

  const attendanceRate = totalBooked > 0 
    ? ((checkedIn / (totalBooked - cancelled)) * 100).toFixed(1) 
    : 0;

  const card = db.prepare(
    "SELECT * FROM membership_cards WHERE user_id = ? AND status = 'active' ORDER BY remaining_classes DESC LIMIT 1"
  ).get(userId);

  res.json({
    success: true,
    data: {
      total_booked: totalBooked,
      checked_in: checkedIn,
      missed: missed,
      cancelled: cancelled,
      attendance_rate: attendanceRate,
      membership_card: card
    }
  });
};

module.exports = {
  getWeeklyStats,
  getCoachStats,
  exportWeeklyStats,
  getMemberStats
};
