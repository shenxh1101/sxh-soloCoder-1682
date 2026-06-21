import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import StatsCard from '@/components/StatsCard';
import { userAPI, statsAPI } from '@/services/api';
import styles from './index.module.scss';

const ProfilePage: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      setUserInfo(null);
      setStats(null);
      setCards([]);
      return;
    }

    setLoading(true);
    try {
      const [profileData, statsData, cardsData] = await Promise.all([
        userAPI.getProfile().catch(() => null),
        statsAPI.getMemberStats().catch(() => null),
        userAPI.getCards().catch(() => [])
      ]);

      if (profileData) {
        setUserInfo(profileData.user || profileData);
      }
      
      if (statsData) {
        setStats(statsData);
      }
      
      if (cardsData) {
        setCards(Array.isArray(cardsData) ? cardsData : cardsData.list || []);
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    loadData();
  });

  const totalRemaining = useMemo(() => {
    return cards.reduce((sum, card) => sum + (card.remaining_classes || 0), 0);
  }, [cards]);

  const totalClasses = useMemo(() => {
    return cards.reduce((sum, card) => sum + (card.total_classes || 0), 0);
  }, [cards]);

  const progressPercent = useMemo(() => {
    if (totalClasses === 0) return 0;
    const used = totalClasses - totalRemaining;
    return Math.round((used / totalClasses) * 100);
  }, [totalClasses, totalRemaining]);

  const handleMenuItemClick = (type: string) => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }

    if (type === 'history') {
      Taro.navigateTo({ url: '/pages/booking-history/index' });
    } else if (type === 'cards') {
      Taro.navigateTo({ url: '/pages/my-cards/index' });
    } else {
      Taro.showToast({
        title: '功能开发中...',
        icon: 'none'
      });
    }
  };

  const goLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token');
          Taro.removeStorageSync('userInfo');
          loadData();
          Taro.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  };

  const isLoggedIn = !!Taro.getStorageSync('token');
  const storedUser = Taro.getStorageSync('userInfo');

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <Image 
            className={styles.avatar} 
            src={userInfo?.avatar || storedUser?.avatar || 'https://picsum.photos/200/200'} 
            mode="aspectFill" 
          />
          <View className={styles.userDetail}>
            <Text className={styles.userName}>
              {isLoggedIn ? (userInfo?.name || storedUser?.name || '会员') : '未登录'}
            </Text>
            {isLoggedIn ? (
              <Text className={styles.membership}>共 {cards.length} 张会员卡</Text>
            ) : (
              <Text className={styles.loginTip} onClick={goLogin}>点击登录</Text>
            )}
          </View>
        </View>
      </View>

      {isLoggedIn && (
        <>
          <View className={styles.cardSection}>
            <View className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.cardTitle}>团课卡</Text>
                <Text className={styles.cardType}>共 {cards.length} 张</Text>
              </View>
              
              <View className={styles.remainingInfo}>
                <Text className={styles.remainingNum}>{totalRemaining}</Text>
                <Text className={styles.remainingLabel}>次剩余</Text>
              </View>

              <View className={styles.progressBar}>
                <View 
                  className={styles.progressFill} 
                  style={{ width: `${progressPercent}%` }} 
                />
              </View>
              <Text className={styles.progressText}>
                已使用 {totalClasses - totalRemaining}/{totalClasses} 次
              </Text>
            </View>
          </View>

          <View className={styles.statsSection}>
            <View className={styles.statsGrid}>
              <StatsCard value={stats?.checked_in || 0} label="已完成" color="#00B42A" />
              <StatsCard value={stats?.missed || 0} label="爽约" color="#F53F3F" />
              <StatsCard value={stats?.cancelled || 0} label="已取消" color="#86909C" />
            </View>
          </View>
        </>
      )}

      <View className={styles.menuSection}>
        <View className={styles.menuCard}>
          <View className={styles.menuItem} onClick={() => handleMenuItemClick('history')}>
            <View className={styles.menuIcon}>📋</View>
            <Text className={styles.menuText}>约课记录</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={() => handleMenuItemClick('cards')}>
            <View className={styles.menuIcon}>💳</View>
            <Text className={styles.menuText}>我的卡包</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={() => handleMenuItemClick('notifications')}>
            <View className={styles.menuIcon}>🔔</View>
            <Text className={styles.menuText}>消息通知</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={() => handleMenuItemClick('settings')}>
            <View className={styles.menuIcon}>⚙️</View>
            <Text className={styles.menuText}>设置</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>

      {isLoggedIn && (
        <View className={styles.logoutSection}>
          <View className={styles.logoutBtn} onClick={handleLogout}>
            退出登录
          </View>
        </View>
      )}
    </View>
  );
};

export default ProfilePage;
