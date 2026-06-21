const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FitStudio API Server' });
});

app.use((err, req, res, next) => {
  console.error('[Error:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误' 
  });
});

app.listen(PORT, () => {
  console.log(`FitStudio API 服务已启动: http://localhost:${PORT}`);
  console.log('');
  console.log('测试账号:');
  console.log('  管理员: admin / admin123');
  console.log('  会员: 13888888888 / 123456');
});

module.exports = app;
