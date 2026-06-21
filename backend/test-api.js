const http = require('http');

function testAPI(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 测试 API ===\n');

  try {
    // 1. 登录测试
    console.log('1. 测试登录...');
    const loginRes = await testAPI('/auth/login', {
      method: 'POST',
      body: { phone: '13888888888', password: '123456' }
    });
    console.log('   状态码:', loginRes.status);
    console.log('   成功:', loginRes.data.success);
    const token = loginRes.data.data?.token;
    console.log('   Token:', token ? '获取成功' : '失败');
    console.log();

    if (!token) {
      console.log('登录失败，停止测试');
      return;
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 2. 测试获取课程
    console.log('2. 测试获取课程列表...');
    const today = new Date().toISOString().split('T')[0];
    const coursesRes = await testAPI(`/courses?date=${today}`, { headers: authHeaders });
    console.log('   状态码:', coursesRes.status);
    console.log('   课程数量:', coursesRes.data.data?.length || 0);
    if (coursesRes.data.data?.length > 0) {
      const firstCourse = coursesRes.data.data[0];
      console.log('   第一个课程:', firstCourse.name, '-', firstCourse.date, firstCourse.start_time);
      console.log('   booked_count:', firstCourse.booked_count);
    }
    console.log();

    // 3. 测试获取预约
    console.log('3. 测试获取我的预约...');
    const bookingsRes = await testAPI('/bookings', { headers: authHeaders });
    console.log('   状态码:', bookingsRes.status);
    const bookings = bookingsRes.data.data || [];
    console.log('   预约数量:', bookings.length);
    if (bookings.length > 0) {
      const statusCounts = {};
      bookings.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      console.log('   状态分布:', statusCounts);
    }
    console.log();

    // 4. 测试获取个人信息
    console.log('4. 测试获取个人信息...');
    const profileRes = await testAPI('/user/profile', { headers: authHeaders });
    console.log('   状态码:', profileRes.status);
    console.log('   用户名:', profileRes.data.data?.user?.name || profileRes.data.data?.name);
    console.log();

    // 5. 测试获取会员卡
    console.log('5. 测试获取会员卡...');
    const cardsRes = await testAPI('/user/cards', { headers: authHeaders });
    console.log('   状态码:', cardsRes.status);
    const cards = cardsRes.data.data || [];
    console.log('   会员卡数量:', cards.length);
    cards.forEach(c => {
      console.log(`   - ${c.name}: ${c.remaining_classes}/${c.total_classes} 次`);
    });
    console.log();

    // 6. 测试会员统计
    console.log('6. 测试会员统计...');
    const statsRes = await testAPI('/stats/member', { headers: authHeaders });
    console.log('   状态码:', statsRes.status);
    if (statsRes.data.data) {
      console.log('   总预约:', statsRes.data.data.total_booked);
      console.log('   已签到:', statsRes.data.data.checked_in);
      console.log('   爽约:', statsRes.data.data.missed);
      console.log('   出席率:', statsRes.data.data.attendance_rate + '%');
    }
    console.log();

    // 7. 测试管理员登录
    console.log('7. 测试管理员登录...');
    const adminLoginRes = await testAPI('/auth/login', {
      method: 'POST',
      body: { phone: 'admin', password: 'admin123' }
    });
    console.log('   状态码:', adminLoginRes.status);
    console.log('   成功:', adminLoginRes.data.success);
    const adminToken = adminLoginRes.data.data?.token;
    console.log('   Token:', adminToken ? '获取成功' : '失败');
    console.log();

    if (adminToken) {
      const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

      // 8. 测试周统计
      console.log('8. 测试周统计（管理员）...');
      const weeklyRes = await testAPI('/stats/weekly', { headers: adminHeaders });
      console.log('   状态码:', weeklyRes.status);
      if (weeklyRes.data.data) {
        const summary = weeklyRes.data.data.summary;
        console.log('   课程总数:', summary.total_courses);
        console.log('   总预约:', summary.total_booked);
        console.log('   总签到:', summary.total_checked);
        console.log('   总爽约:', summary.total_missed);
        console.log('   平均出席率:', summary.avg_attendance_rate + '%');
        console.log('   课时费合计: ¥' + summary.total_coach_fee);
      }
      console.log();

      // 9. 测试教练统计
      console.log('9. 测试教练统计（管理员）...');
      const coachStatsRes = await testAPI('/stats/coaches', { headers: adminHeaders });
      console.log('   状态码:', coachStatsRes.status);
      console.log('   教练数量:', coachStatsRes.data.data?.length || 0);
      console.log();
    }

    console.log('=== 测试完成 ===');

  } catch (error) {
    console.error('测试出错:', error.message);
  }
}

runTests();
