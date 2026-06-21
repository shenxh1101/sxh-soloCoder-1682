import React, { useMemo } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useStore } from '@/store/useStore';
import StatsCard from '@/components/StatsCard';
import styles from './index.module.scss';

const ProfilePage: React.FC = () => {
  const { user, bookings } = useStore();

  const stats = useMemo(() => {
    const checkedIn = bookings.filter(b => b.status === 'checked_in').length;
    const missed = bookings.filter(b => b.status === 'missed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    return { checkedIn, missed, cancelled };
  }, [bookings]);

  const progressPercent = useMemo(() => {
    const used = user.totalClasses - user.remainingClasses;
    return Math.round((used / user.totalClasses) * 100);
  }, [user]);

  const handleMenuItemClick = (type: string) => {
    Taro.showToast({
      title: '功能开发中...',
      icon: 'none'
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <Image className={styles.avatar} src={user.avatar} mode="aspectFill" />
          <View className={styles.userDetail}>
            <Text className={styles.userName}>{user.name}</Text>
            <Text className={styles.membership}>{user.membershipType}</Text>
          </View>
        </View>
      </View>

      <View className={styles.cardSection}>
        <View className={styles.card}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>团课卡</Text>
            <Text className={styles.cardType}>{user.membershipType}</Text>
          </View>
          
          <View className={styles.remainingInfo}>
            <Text className={styles.remainingNum}>{user.remainingClasses}</Text>
            <Text className={styles.remainingLabel}>次剩余</Text>
          </View>

          <View className={styles.progressBar}>
            <View 
              className={styles.progressFill} 
              style={{ width: `${progressPercent}%` }}
            />
          </View>
          <Text className={styles.progressText}>
            已使用 {user.totalClasses - user.remainingClasses}/{user.totalClasses} 次
          </Text>
        </View>
      </View>

      <View className={styles.statsSection}>
        <View className={styles.statsGrid}>
          <StatsCard value={stats.checkedIn} label="已完成" color="#00B42A" />
          <StatsCard value={stats.missed} label="爽约" color="#F53F3F" />
          <StatsCard value={stats.cancelled} label="已取消" color="#86909C" />
        </View>
      </View>

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
    </View>
  );
};

export default ProfilePage;
