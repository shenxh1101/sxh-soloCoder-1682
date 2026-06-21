import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import BookingCard from '@/components/BookingCard';
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types';
import styles from './index.module.scss';

type TabType = 'upcoming' | 'past';

const BookingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      setBookings([]);
      return;
    }

    setLoading(true);
    try {
      const data = await bookingAPI.getBookings();
      const list = data.list || data || [];
      setBookings(list.map((b: any) => ({
        id: b.id,
        courseId: b.course_id,
        courseName: b.course_name,
        courseDate: b.course_date,
        startTime: b.start_time,
        endTime: b.end_time,
        coachName: b.coach_name,
        coachAvatar: b.coach_avatar,
        room: b.room,
        status: b.status,
        waitlistPosition: b.waitlist_position,
        bookedAt: b.booked_at
      })));
    } catch (error) {
      console.error('Load bookings error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    loadBookings();
  });

  const upcomingBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'booked' || b.status === 'waitlist')
      .sort((a, b) => {
        const dateCompare = a.courseDate.localeCompare(b.courseDate);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [bookings]);

  const pastBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'checked_in' || b.status === 'missed' || b.status === 'cancelled')
      .sort((a, b) => {
        const dateCompare = b.courseDate.localeCompare(a.courseDate);
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
      success: async (res) => {
        if (res.confirm) {
          try {
            await bookingAPI.cancelBooking(bookingId);
            Taro.showToast({
              title: '已取消预约',
              icon: 'success',
              duration: 2000
            });
            loadBookings();
          } catch (error) {
            console.error('Cancel booking error:', error);
          }
        }
      }
    });
  };

  const handleShowCheckinCode = (bookingId: string) => {
    Taro.navigateTo({
      url: `/pages/checkin-code/index?id=${bookingId}`
    });
  };

  const handleShowDetail = (bookingId: string) => {
    Taro.navigateTo({
      url: `/pages/booking-detail/index?id=${bookingId}`
    });
  };

  const goToSchedule = () => {
    Taro.switchTab({
      url: '/pages/schedule/index'
    });
  };

  const goLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const isLoggedIn = Taro.getStorageSync('token');

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
        {!isLoggedIn ? (
          <View className={styles.emptyState}>
            <View className={styles.emptyIcon}>🔐</View>
            <Text className={styles.emptyText}>请先登录查看预约</Text>
            <Button className={styles.goBookButton} onClick={goLogin}>
              去登录
            </Button>
          </View>
        ) : displayBookings.length === 0 ? (
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
                onShowCheckinCode={() => handleShowCheckinCode(booking.id)}
                onDetail={() => handleShowDetail(booking.id)}
                showCancel={activeTab === 'upcoming' && booking.status === 'booked'}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default BookingsPage;
