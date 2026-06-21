import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { bookingAPI, userAPI } from '@/services/api';
import { getBookingStatusText, getBookingStatusColor } from '@/utils/date';
import styles from './index.module.scss';

interface BookingDetail {
  id: string;
  courseId: string;
  courseName: string;
  courseDate: string;
  startTime: string;
  endTime: string;
  coachName: string;
  coachAvatar: string;
  room: string;
  status: string;
  waitlistPosition: number;
  bookedAt: string;
  cancelledAt: string;
  checkin: {
    id: string;
    checkinTime: string;
    checkinMethod: string;
  } | null;
  cardTransaction: {
    id: string;
    cardId: string;
    cardName: string;
    changeAmount: number;
    balanceAfter: number;
    createdAt: string;
  } | null;
}

const BookingDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!bookingId) return;
    
    setLoading(true);
    setError(null);
    try {
      const [bookingRes, transactionsRes] = await Promise.all([
        bookingAPI.getBookings(),
        userAPI.getCardTransactions(1, 100)
      ]);
      
      const bookings = bookingRes.list || bookingRes || [];
      const booking = bookings.find((b: any) => b.id === bookingId);
      
      if (!booking) {
        setError('预约记录不存在');
        return;
      }
      
      const transactions = transactionsRes.list || transactionsRes || [];
      const transaction = transactions.find((t: any) => t.related_booking_id === bookingId);
      
      const checkinData = booking.has_checked_in === 1 ? {
        id: booking.checkin_id || '',
        checkinTime: booking.checkin_time || '',
        checkinMethod: booking.checkin_method || 'manual'
      } : null;
      
      let cardTransData = null;
      if (transaction) {
        cardTransData = {
          id: transaction.id,
          cardId: transaction.card_id,
          cardName: transaction.card_name || '团课卡',
          changeAmount: transaction.change_amount,
          balanceAfter: transaction.balance_after,
          createdAt: transaction.created_at
        };
      }
      
      setDetail({
        id: booking.id,
        courseId: booking.course_id,
        courseName: booking.course_name,
        courseDate: booking.course_date || booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        coachName: booking.coach_name,
        coachAvatar: booking.coach_avatar,
        room: booking.room,
        status: booking.status,
        waitlistPosition: booking.waitlist_position,
        bookedAt: booking.booked_at,
        cancelledAt: booking.cancelled_at,
        checkin: checkinData,
        cardTransaction: cardTransData
      });
      
      Taro.setNavigationBarTitle({ title: booking.course_name });
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useDidShow(() => {
    loadDetail();
  });

  const getCheckinMethodText = (method: string) => {
    const map: Record<string, string> = {
      'manual': '手动签到',
      'scan': '扫码签到'
    };
    return map[method] || method;
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
        {loading && (
          <View className={styles.loading}>
            <Text>加载中...</Text>
          </View>
        )}

        {error && !loading && (
          <View className={styles.error}>
            <Text className={styles.errorIcon}>⚠️</Text>
            <Text className={styles.errorText}>{error}</Text>
          </View>
        )}

        {detail && !loading && (
          <View className={styles.content}>
            <View className={styles.header}>
              <Text className={styles.courseName}>{detail.courseName}</Text>
              <View 
                className={styles.statusBadge}
                style={{ 
                  backgroundColor: `${getBookingStatusColor(detail.status)}15`, 
                  color: getBookingStatusColor(detail.status) 
                }}
              >
                {detail.status === 'waitlist' && detail.waitlistPosition
                  ? `候补第${detail.waitlistPosition}位`
                  : getBookingStatusText(detail.status)}
              </View>
            </View>

            <View className={styles.card}>
              <Text className={styles.sectionTitle}>课程信息</Text>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>日期时间</Text>
                <Text className={styles.infoValue}>
                  {detail.courseDate} {detail.startTime}-{detail.endTime}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>授课教练</Text>
                <Text className={styles.infoValue}>{detail.coachName}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>上课地点</Text>
                <Text className={styles.infoValue}>{detail.room}</Text>
              </View>
            </View>

            <View className={styles.card}>
              <Text className={styles.sectionTitle}>预约信息</Text>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>预约时间</Text>
                <Text className={styles.infoValue}>{detail.bookedAt}</Text>
              </View>
              {detail.cancelledAt && (
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>取消时间</Text>
                  <Text className={styles.infoValue} style={{ color: '#F53F3F' }}>
                    {detail.cancelledAt}
                  </Text>
                </View>
              )}
            </View>

            <View className={styles.card}>
              <Text className={styles.sectionTitle}>签到信息</Text>
              {detail.checkin ? (
                <>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>签到状态</Text>
                    <Text className={styles.infoValue} style={{ color: '#00B42A' }}>
                      ✓ 已签到
                    </Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>签到时间</Text>
                    <Text className={styles.infoValue}>{detail.checkin.checkinTime}</Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>签到方式</Text>
                    <Text className={styles.infoValue}>
                      {getCheckinMethodText(detail.checkin.checkinMethod)}
                    </Text>
                  </View>
                </>
              ) : (
                <View className={styles.emptyInfo}>
                  <Text className={styles.emptyText}>
                    {detail.status === 'cancelled' 
                      ? '预约已取消' 
                      : detail.status === 'missed' 
                        ? '未签到（爽约）' 
                        : '尚未签到'}
                  </Text>
                </View>
              )}
            </View>

            <View className={styles.card}>
              <Text className={styles.sectionTitle}>扣次明细</Text>
              {detail.cardTransaction ? (
                <>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>使用卡种</Text>
                    <Text className={styles.infoValue}>{detail.cardTransaction.cardName}</Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>扣减次数</Text>
                    <Text className={styles.infoValue} style={{ color: '#F53F3F' }}>
                      {detail.cardTransaction.changeAmount} 次
                    </Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>扣次后剩余</Text>
                    <Text className={styles.infoValue}>
                      {detail.cardTransaction.balanceAfter} 次
                    </Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>扣次时间</Text>
                    <Text className={styles.infoValue}>{detail.cardTransaction.createdAt}</Text>
                  </View>
                </>
              ) : (
                <View className={styles.emptyInfo}>
                  <Text className={styles.emptyText}>
                    {detail.status === 'checked_in' || detail.status === 'missed'
                      ? '暂无扣次记录'
                      : '签到成功后将自动扣次'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default BookingDetailPage;
