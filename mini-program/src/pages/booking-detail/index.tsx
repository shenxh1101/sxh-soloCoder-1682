import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { bookingAPI } from '@/services/api';
import { getBookingStatusText, getBookingStatusColor } from '@/utils/date';
import styles from './index.module.scss';

const BookingDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!bookingId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await bookingAPI.getBookingDetail(bookingId);
      setDetail(data);
      if (data.course_name) {
        Taro.setNavigationBarTitle({ title: data.course_name });
      }
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
      'scan': '扫码签到',
      'system': '系统签到'
    };
    return map[method] || method;
  };

  const status = detail?.status || '';
  const statusColor = getBookingStatusColor(status);
  const checkinInfo = detail?.checkin_info || null;
  const transaction = checkinInfo?.transaction || null;

  const handleGoToCards = () => {
    Taro.navigateTo({ url: '/pages/my-cards/index' });
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
              <Text className={styles.courseName}>{detail.course_name}</Text>
              <View 
                className={styles.statusBadge}
                style={{ 
                  backgroundColor: `${statusColor}15`, 
                  color: statusColor 
                }}
              >
                {status === 'waitlist' && detail.waitlist_position
                  ? `候补第${detail.waitlist_position}位`
                  : getBookingStatusText(status)}
              </View>
            </View>

            <View className={styles.card}>
              <Text className={styles.sectionTitle}>课程信息</Text>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>日期时间</Text>
                <Text className={styles.infoValue}>
                  {detail.course_date || detail.date} {detail.start_time}-{detail.end_time}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>授课教练</Text>
                <Text className={styles.infoValue}>{detail.coach_name || '待定'}</Text>
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
                <Text className={styles.infoValue}>{detail.booked_at}</Text>
              </View>
              {detail.cancelled_at && (
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>取消时间</Text>
                  <Text className={styles.infoValue} style={{ color: '#F53F3F' }}>
                    {detail.cancelled_at}
                  </Text>
                </View>
              )}
            </View>

            <View className={styles.card}>
              <Text className={styles.sectionTitle}>签到信息</Text>
              {checkinInfo ? (
                <>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>签到状态</Text>
                    <Text className={styles.infoValue} style={{ color: '#00B42A' }}>
                      ✓ 已签到
                    </Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>签到时间</Text>
                    <Text className={styles.infoValue}>{checkinInfo.checkin_time}</Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>签到方式</Text>
                    <Text className={styles.infoValue}>
                      {getCheckinMethodText(checkinInfo.checkin_method)}
                    </Text>
                  </View>
                </>
              ) : (
                <View className={styles.emptyInfo}>
                  <Text className={styles.emptyText}>
                    {status === 'cancelled' 
                      ? '预约已取消' 
                      : status === 'missed' 
                        ? '未签到（爽约）' 
                        : '尚未签到'}
                  </Text>
                </View>
              )}
            </View>

            {checkinInfo && (
              <View className={styles.card}>
                <Text className={styles.sectionTitle}>扣次明细</Text>
                {transaction ? (
                  <>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>使用卡种</Text>
                      <Text 
                        className={styles.infoValue}
                        style={{ color: '#FF6B35' }}
                        onClick={handleGoToCards}
                      >
                        {checkinInfo.card_name} →
                      </Text>
                    </View>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>扣减次数</Text>
                      <Text className={styles.infoValue} style={{ color: '#F53F3F' }}>
                        {transaction.change_amount} 次
                      </Text>
                    </View>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>扣次后剩余</Text>
                      <Text className={styles.infoValue}>
                        {transaction.balance_after} 次
                      </Text>
                    </View>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>扣次时间</Text>
                      <Text className={styles.infoValue}>{transaction.created_at}</Text>
                    </View>
                  </>
                ) : (
                  <View className={styles.emptyInfo}>
                    <Text className={styles.emptyText}>暂无扣次记录</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default BookingDetailPage;
