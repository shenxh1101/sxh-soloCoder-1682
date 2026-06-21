import React, { useState, useCallback } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { bookingAPI } from '@/services/api';
import styles from './index.module.scss';

const CheckinCodePage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  
  const [checkinCode, setCheckinCode] = useState<string | null>(null);
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheckinCode = useCallback(async () => {
    if (!bookingId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await bookingAPI.getCheckinCode(bookingId);
      setCheckinCode(data.checkin_code);
      setCourseInfo({
        courseName: data.course_name,
        courseDate: data.course_date,
        courseTime: data.course_time,
        room: data.room,
        coachName: data.coach_name
      });
      setHasCheckedIn(data.has_checked_in);
    } catch (err: any) {
      setError(err.message || '获取签到码失败');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useDidShow(() => {
    loadCheckinCode();
  });

  React.useEffect(() => {
    Taro.setNavigationBarTitle({ title: '签到码' });
  }, []);

  return (
    <View className={styles.page}>
      <View className={styles.container}>
        {loading && (
          <View className={styles.loading}>
            <Text>加载中...</Text>
          </View>
        )}

        {error && !loading && (
          <View className={styles.error}>
            <Text className={styles.errorIcon}>⚠️</Text>
            <Text className={styles.errorText}>{error}</Text>
            <Button className={styles.retryBtn} onClick={loadCheckinCode}>
              重试
            </Button>
          </View>
        )}

        {checkinCode && courseInfo && !loading && (
          <>
            <View className={styles.courseInfo}>
              <Text className={styles.courseName}>{courseInfo.courseName}</Text>
              <View className={styles.courseMeta}>
                <Text className={styles.metaText}>📍 {courseInfo.courseDate} {courseInfo.courseTime}</Text>
                <Text className={styles.metaText}>🏠 {courseInfo.room}</Text>
                <Text className={styles.metaText}>👤 {courseInfo.coachName}</Text>
              </View>
            </View>

            <View className={styles.qrContainer}>
              {hasCheckedIn ? (
                <View className={styles.checkedIn}>
                  <Text className={styles.checkIcon}>✓</Text>
                  <Text className={styles.checkedInText}>已签到</Text>
                </View>
              ) : (
                <View className={styles.codeBox}>
                  <Text className={styles.codeTitle}>签到码</Text>
                  <Text className={styles.codeText}>{checkinCode}</Text>
                  <Text className={styles.codeTip}>请向教练出示此签到码</Text>
                </View>
              )}
            </View>

            <View className={styles.tips}>
              <Text className={styles.tipTitle}>温馨提示</Text>
              <Text className={styles.tipText}>• 签到码仅在开课前30分钟至开课后1小时内有效</Text>
              <Text className={styles.tipText}>• 签到成功后将扣除1次团课次数</Text>
              <Text className={styles.tipText}>• 已签到后再次扫码将显示"已签到"提示</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default CheckinCodePage;
