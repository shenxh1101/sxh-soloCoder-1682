import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Input, Button } from '@tarojs/components';
import { authAPI } from '../../services/api';
import styles from './index.module.scss';

export default function Login() {
  const [phone, setPhone] = useState('13888888888');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    const token = Taro.getStorageSync('token');
    if (token) {
      Taro.switchTab({ url: '/pages/schedule/index' });
    }
  });

  const handleLogin = async () => {
    if (!phone || !password) {
      Taro.showToast({
        title: '请输入账号和密码',
        icon: 'none'
      });
      return;
    }

    setLoading(true);
    try {
      const data = await authAPI.login(phone, password);
      
      Taro.setStorageSync('token', data.token);
      Taro.setStorageSync('userInfo', data.user);
      
      Taro.showToast({
        title: '登录成功',
        icon: 'success'
      });

      setTimeout(() => {
        Taro.switchTab({ url: '/pages/schedule/index' });
      }, 1500);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.logoSection}>
        <View className={styles.logo}>💪</View>
        <Text className={styles.title}>FitStudio</Text>
        <Text className={styles.subtitle}>健身工作室 · 团课约课</Text>
      </View>

      <View className={styles.loginCard}>
        <View className={styles.formGroup}>
          <Text className={styles.label}>账号</Text>
          <Input
            className={styles.input}
            placeholder="请输入手机号"
            value={phone}
            onInput={(e) => setPhone(e.detail.value)}
            type="text"
          />
        </View>

        <View className={styles.formGroup}>
          <Text className={styles.label}>密码</Text>
          <Input
            className={styles.input}
            placeholder="请输入密码"
            value={password}
            onInput={(e) => setPassword(e.detail.value)}
            password
          />
        </View>

        <Button
          className={styles.loginBtn}
          onClick={handleLogin}
          loading={loading}
          disabled={loading}
        >
          {loading ? '登录中...' : '登 录'}
        </Button>

        <View className={styles.divider}>
          <View className={styles.dividerLine}></View>
          <Text className={styles.dividerText}>测试账号</Text>
          <View className={styles.dividerLine}></View>
        </View>

        <Text className={styles.tip}>
          会员：13888888888 / 123456{'\n'}
          管理员：admin / admin123
        </Text>
      </View>
    </View>
  );
}
