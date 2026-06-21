import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import BookingCard from '@/components/BookingCard';
import { canCancelBooking } from '@/utils/date';
import styles from './index.module.scss';

type TabType = 'upcoming' | 'past';

const BookingsPage: React.FC = () => {
  const { bookings, cancelBooking } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const upcomingBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'booked' || b.status === 'waitlist')
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [bookings]);

  const pastBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'checked_in' || b.status === 'missed' || b.status === 'cancelled')
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.startTime.localeCompare(a.startTime);
      });
  }, [bookings]);

  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleCancel = (bookingId: string) => {
    Taro.showModal({
      title: '确认取消',
      content: '确定要取消这个预约吗？',
      confirmText: '确认取消',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          const result = cancelBooking(bookingId);
          Taro.showToast({
            title: result.message,
            icon: result.success ? 'success' : 'none',
            duration: 2000
          });
        }
      }
    });
  };

  const goToSchedule = () => {
    Taro.switchTab({
      url: '/pages/schedule/index'
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.tabBar}>
        <View
          className={classnames(styles.tabItem, { [styles.active]: activeTab === 'upcoming' })}
          onClick={() => setActiveTab('upcoming')}
        >
          <Text className={styles.tabText}>
            待上课 ({upcomingBookings.length})
          </Text>
        </View>
        <View
          className={classnames(styles.tabItem, { [styles.active]: activeTab === 'past' })}
          onClick={() => setActiveTab('past')}
        >
          <Text className={styles.tabText}>
            已完成 ({pastBookings.length})
          </Text>
        </View>
      </View>

      <ScrollView scrollY className={styles.content}>
        {displayBookings.length === 0 ? (
          <View className={styles.emptyState}>
            <View className={styles.emptyIcon}>
              {activeTab === 'upcoming' ? '📆' : '📋'}
            </View>
            <Text className={styles.emptyText}>
              {activeTab === 'upcoming' ? '暂无待上课预约' : '暂无历史记录'}
            </Text>
            {activeTab === 'upcoming' && (
              <Button className={styles.goBookButton} onClick={goToSchedule}>
                去约课
              </Button>
            )}
          </View>
        ) : (
          <View className={styles.list}>
            {displayBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={() => handleCancel(booking.id)}
                showCancel={activeTab === 'upcoming'}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default BookingsPage;
