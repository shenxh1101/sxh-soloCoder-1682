const http = require('http');

const BASE = 'http://localhost:3000/api';
let token = '';
let adminToken = '';
let bookingId = '';
let checkinCode = '';

function request(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } 
        catch { resolve({ statusCode: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('=== 1. 会员登录 ===');
  const login = await request('POST', '/auth/login', { phone: '13888888888', password: '123456' });
  console.log('登录:', login.success ? '成功' : '失败');
  token = login.data?.token || '';

  console.log('\n=== 2. 管理员登录 ===');
  const adminLogin = await request('POST', '/auth/login', { phone: 'admin', password: 'admin123' });
  console.log('管理员登录:', adminLogin.success ? '成功' : '失败');
  adminToken = adminLogin.data?.token || '';

  console.log('\n=== 3. 获取课程列表 ===');
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const fmt = d => d.toISOString().split('T')[0];
  const courses = await request('GET', `/courses?startDate=${fmt(startOfWeek)}&endDate=${fmt(endOfWeek)}`, null);
  const courseList = courses.data || [];
  console.log('课程数量:', courseList.length);
  if (courseList.length > 0) {
    const c = courseList[0];
    console.log('第一节课:', c.name, '| 教练:', c.coach_name, '| 已约:', c.booked_count, '/', c.capacity);
  }

  console.log('\n=== 4. 获取会员预约列表 ===');
  const bookings = await request('GET', '/bookings', null, { Authorization: `Bearer ${token}` });
  const bookingList = bookings.data || [];
  console.log('预约数量:', bookingList.length);
  if (bookingList.length > 0) {
    const b = bookingList[0];
    bookingId = b.id;
    console.log('第一个预约:', b.course_name, '| 教练:', b.coach_name, '| 状态:', b.status, '| 日期:', b.course_date || b.date);
    console.log('  has_checked_in:', b.has_checked_in);
  }

  console.log('\n=== 5. 获取预约详情（签到+扣次）===');
  if (bookingId) {
    const detail = await request('GET', `/bookings/${bookingId}/detail`, null, { Authorization: `Bearer ${token}` });
    console.log('详情获取:', detail.success ? '成功' : '失败');
    if (detail.data) {
      const d = detail.data;
      console.log('  课程:', d.course_name, '| 状态:', d.status);
      if (d.checkin_info) {
        console.log('  签到时间:', d.checkin_info.checkin_time);
        console.log('  签到方式:', d.checkin_info.checkin_method);
        console.log('  使用卡:', d.checkin_info.card_name);
        if (d.checkin_info.transaction) {
          console.log('  扣减次数:', d.checkin_info.transaction.change_amount);
          console.log('  剩余次数:', d.checkin_info.transaction.balance_after);
        }
      } else {
        console.log('  无签到信息');
      }
    }
  }

  console.log('\n=== 6. 获取预约签到码 ===');
  const checkedInBooking = bookingList.find(b => b.has_checked_in === 1 || b.status === 'checked_in');
  const bookedBooking = bookingList.find(b => b.status === 'booked');
  const testBooking = bookedBooking || checkedInBooking;
  if (testBooking) {
    const codeResult = await request('GET', `/bookings/${testBooking.id}/checkin-code`, null, { Authorization: `Bearer ${token}` });
    console.log('签到码获取:', codeResult.success ? '成功' : '失败', codeResult.message || '');
    if (codeResult.data) {
      checkinCode = codeResult.data.checkin_code;
      console.log('  签到码:', checkinCode);
      console.log('  课程:', codeResult.data.course_name);
      console.log('  已签到:', codeResult.data.has_checked_in);
    }
  }

  console.log('\n=== 7. 扫码签到接口测试 ===');
  if (checkinCode && adminToken) {
    const scanResult = await request('POST', '/checkins/scan-booking', { code: checkinCode }, { Authorization: `Bearer ${adminToken}` });
    console.log('扫码签到:', scanResult.success ? '成功' : '失败');
    if (scanResult.alreadyCheckedIn) {
      console.log('  结果: 已签到');
      console.log('  会员:', scanResult.data?.user_name);
      console.log('  签到时间:', scanResult.data?.checkin_time);
    } else if (scanResult.data) {
      console.log('  结果: 签到成功');
      console.log('  会员:', scanResult.data.user_name);
      console.log('  课程:', scanResult.data.course_name);
    }
    if (scanResult.message) console.log('  消息:', scanResult.message);
  }

  console.log('\n=== 8. 统计数据一致性 ===');
  const stats = await request('GET', '/stats/weekly', null, { Authorization: `Bearer ${adminToken}` });
  if (stats.data) {
    const s = stats.data.summary;
    console.log('课程数:', s.total_courses);
    console.log('总预约:', s.total_booked);
    console.log('总签到:', s.total_checked);
    console.log('总爽约:', s.total_missed);
    console.log('平均出席率:', s.avg_attendance_rate + '%');
    console.log('总课时费:', '¥' + s.total_coach_fee);
  }

  console.log('\n=== 9. 会员统计 ===');
  const memberStats = await request('GET', '/stats/member', null, { Authorization: `Bearer ${token}` });
  if (memberStats.data) {
    const ms = memberStats.data;
    console.log('总预约:', ms.total_booked);
    console.log('已签到:', ms.checked_in);
    console.log('爽约:', ms.missed);
    console.log('出席率:', ms.attendance_rate + '%');
  }

  console.log('\n=== 所有测试完成 ===');
}

test().catch(console.error);
