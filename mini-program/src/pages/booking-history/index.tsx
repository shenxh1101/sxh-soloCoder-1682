import { useState, useCallback } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { bookingAPI } from '../../services/api';
import styles from './index.module.scss';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'booked', label: '待上课' },
  { key: 'checked_in', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
];

export default function BookingHistory() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBookings = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const data = await bookingAPI.getBookings(status);
      const raw = data.list || data || [];
      setBookings(raw.map((b: any) => ({
        ...b,
        course_name: b.course_name || '课程',
        course_date: b.course_date || b.date || '',
        start_time: b.start_time || '',
        end_time: b.end_time || '',
        coach_name: b.coach_name || '待定',
        room: b.room || '',
        status: b.has_checked_in === 1 ? 'checked_in' : b.status
      })));
    } catch (error) {
      console.error('Load bookings error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    const status = activeTab === 'all' ? undefined : activeTab;
    loadBookings(status);
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const status = key === 'all' ? undefined : key;
    loadBookings(status);
  };

  const handleCancel = async (bookingId: string) => {
    try {
      const res = await Taro.showModal({
        title: '确认取消',
        content: '确定要取消这节课程的预约吗？',
        confirmText: '取消预约',
        confirmColor: '#FF6B35'
      });

      if (res.confirm) {
        await bookingAPI.cancelBooking(bookingId);
        Taro.showToast({
          title: '已取消预约',
          icon: 'success'
        });
        const status = activeTab === 'all' ? undefined : activeTab;
        loadBookings(status);
      }
    } catch (error) {
      console.error('Cancel booking error:', error);
    }
  };

  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      booked: styles.statusBooked,
      checked_in: styles.statusCheckedIn,
      missed: styles.statusMissed,
      cancelled: styles.statusCancelled,
      waitlist: styles.statusWaitlist
    };
    return classMap[status] || styles.statusBooked;
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      booked: '待上课',
      checked_in: '已完成',
      missed: '已爽约',
      cancelled: '已取消',
      waitlist: '候补中'
    };
    return textMap[status] || status;
  };

  const canCancel = (booking: any) => {
    if (booking.status !== 'booked') return false;
    const now = new Date();
    const dateStr = booking.course_date || booking.date;
    const courseTime = new Date(`${dateStr} ${booking.start_time}`);
    const diffHours = (courseTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 2;
  };

  return (
    <View className={styles.container}>
      <View className={styles.tabs}>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.list}>
        {bookings.length === 0 && !loading ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无预约记录</Text>
          </View>
        ) : (
          bookings.map(booking => (
            <View key={booking.id} className={styles.bookingItem}>
              <View className={styles.courseInfo}>
                <Text className={styles.courseName}>{booking.course_name}</Text>
                <View className={`${styles.status} ${getStatusClass(booking.status)}`}>
                  {getStatusText(booking.status)}
                </View>
              </View>

              <View className={styles.courseMeta}>
                <View className={styles.metaItem}>
                  <Text>📅</Text>
                  <Text>{booking.course_date}</Text>
                </View>
                <View className={styles.metaItem}>
                  <Text>⏰</Text>
                  <Text>{booking.start_time} - {booking.end_time}</Text>
                </View>
                <View className={styles.metaItem}>
                  <Text>📍</Text>
                  <Text>{booking.room}</Text>
                </View>
              </View>

              <View className={styles.bottomRow}>
                <View className={styles.coachInfo}>
                  <Text>教练：{booking.coach_name}</Text>
                </View>
                {booking.status === 'booked' && (
                  <View
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    onClick={() => handleCancel(booking.id)}
                  >
                    取消预约
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
