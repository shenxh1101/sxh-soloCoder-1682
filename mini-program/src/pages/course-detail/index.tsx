import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { courseAPI, bookingAPI } from '@/services/api';
import { isCourseFull, getDifficultyText, getDifficultyColor, canCancelBooking } from '@/utils/date';
import { Course, Booking } from '@/types';
import styles from './index.module.scss';

const CourseDetailPage: React.FC = () => {
  const router = useRouter();
  const courseId = router.params.id || '';
  
  const [course, setCourse] = useState<Course | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const checkLogin = useCallback(() => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return false;
    }
    return true;
  }, []);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const data = await courseAPI.getCourseDetail(courseId);
      setCourse({
        id: data.id,
        name: data.name,
        coachId: data.coach_id,
        coachName: data.coach_name,
        coachAvatar: data.coach_avatar,
        coachBio: data.coach_bio,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        duration: data.duration,
        capacity: data.capacity,
        bookedCount: data.booked_count,
        waitlistCount: data.waitlist_count,
        description: data.description,
        difficulty: data.difficulty,
        category: data.category,
        room: data.room
      });
      Taro.setNavigationBarTitle({ title: data.name });
    } catch (error) {
      console.error('Load course error:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const loadBookings = useCallback(async () => {
    if (!checkLogin()) return;
    
    try {
      const data = await bookingAPI.getBookings();
      const raw = data.list || data || [];
      const mapped: Booking[] = raw.map((b: any) => ({
        id: b.id,
        courseId: b.course_id,
        courseName: b.course_name,
        coachName: b.coach_name || '待定',
        coachAvatar: b.coach_avatar,
        courseDate: b.course_date || b.date,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.has_checked_in === 1 ? 'checked_in' : b.status,
        bookedAt: b.booked_at,
        cancelledAt: b.cancelled_at,
        waitlistPosition: b.waitlist_position,
        room: b.room,
        hasCheckedIn: b.has_checked_in,
        checkinTime: b.checkin_time,
        checkinMethod: b.checkin_method
      }));
      setBookings(mapped);
    } catch (error) {
      console.error('Load bookings error:', error);
    }
  }, [checkLogin]);

  useDidShow(() => {
    loadCourse();
    loadBookings();
  });

  const myBooking = useMemo(() => {
    return bookings.find(b => b.courseId === courseId);
  }, [bookings, courseId]);

  const isBooked = useMemo(() => {
    return myBooking?.status === 'booked';
  }, [myBooking]);

  const isWaitlisted = useMemo(() => {
    return myBooking?.status === 'waitlist';
  }, [myBooking]);

  const hasCheckedIn = useMemo(() => {
    return myBooking?.status === 'checked_in' || myBooking?.hasCheckedIn === 1;
  }, [myBooking]);

  const isCancelled = useMemo(() => {
    return myBooking?.status === 'cancelled';
  }, [myBooking]);

  const canCancel = useMemo(() => {
    if (!course || !myBooking) return false;
    if (hasCheckedIn || isCancelled) return false;
    return canCancelBooking(course.date, course.startTime);
  }, [course, myBooking, hasCheckedIn, isCancelled]);

  const handleBook = async () => {
    if (!course) return;
    if (!checkLogin()) return;
    
    setActionLoading(true);
    try {
      const data = await bookingAPI.createBooking(courseId);
      Taro.showToast({
        title: data.message || (isCourseFull(course.bookedCount, course.capacity) ? '候补成功' : '预约成功'),
        icon: 'success',
        duration: 2000
      });
      await Promise.all([loadCourse(), loadBookings()]);
    } catch (error) {
      console.error('Book course error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!myBooking) return;

    const res = await Taro.showModal({
      title: '确认取消',
      content: '取消后名额会被释放，确定要取消预约吗？',
      confirmColor: '#F53F3F'
    });
    if (!res.confirm) return;

    setActionLoading(true);
    try {
      await bookingAPI.cancelBooking(myBooking.id);
      Taro.showToast({ title: '取消成功', icon: 'success' });
      await Promise.all([loadCourse(), loadBookings()]);
    } catch (error) {
      console.error('Cancel booking error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (!course && !loading) {
    return (
      <View className={styles.page}>
        <View style={{ padding: '100rpx 32rpx', textAlign: 'center' }}>
          <Text>课程不存在</Text>
        </View>
      </View>
    );
  }

  const full = course ? isCourseFull(course.bookedCount, course.capacity) : false;
  const remaining = course ? course.capacity - course.bookedCount : 0;
  const difficultyColor = course ? getDifficultyColor(course.difficulty) : '#86909C';

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
        {course && (
          <>
            <View className={styles.hero}>
              <Text className={styles.courseName}>{course.name}</Text>
              
              <View className={styles.courseMeta}>
                <View className={styles.metaItem}>
                  <Text className={styles.metaIcon}>⏰</Text>
                  <Text>{course.date} {course.startTime}-{course.endTime}</Text>
                </View>
                <View className={styles.metaItem}>
                  <Text className={styles.metaIcon}>📍</Text>
                  <Text>{course.room}</Text>
                </View>
                <View className={styles.metaItem}>
                  <Text className={styles.metaIcon}>⏱️</Text>
                  <Text>{course.duration}分钟</Text>
                </View>
              </View>

              <View className={styles.tags}>
                <View className={styles.tag}>{course.category}</View>
                <View className={styles.tag}>{getDifficultyText(course.difficulty)}</View>
              </View>
            </View>

            <View className={styles.content}>
              <View className={styles.card}>
                <Text className={styles.sectionTitle}>课程介绍</Text>
                <Text className={styles.description}>{course.description}</Text>
              </View>

              <View className={styles.card}>
                <Text className={styles.sectionTitle}>授课教练</Text>
                <View className={styles.coachSection}>
                  <Image 
                    className={styles.coachAvatar} 
                    src={course.coachAvatar} 
                    mode="aspectFill"
                  />
                  <View className={styles.coachInfo}>
                    <Text className={styles.coachName}>{course.coachName}</Text>
                    <Text className={styles.coachTitle}>{course.coachBio || `资深${course.category}教练`}</Text>
                  </View>
                </View>
              </View>

              <View className={styles.card}>
                <Text className={styles.sectionTitle}>课程信息</Text>
                <View className={styles.infoList}>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>课程时长</Text>
                    <Text className={styles.infoValue}>{course.duration} 分钟</Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>人数上限</Text>
                    <Text className={styles.infoValue}>{course.capacity} 人</Text>
                  </View>
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>已预约</Text>
                    <Text className={styles.infoValue}>{course.bookedCount} 人</Text>
                  </View>
                  {course.waitlistCount > 0 && (
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>候补人数</Text>
                      <Text className={styles.infoValue} style={{ color: '#FF7D00' }}>
                        {course.waitlistCount} 人
                      </Text>
                    </View>
                  )}
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>难度等级</Text>
                    <Text className={styles.infoValue} style={{ color: difficultyColor }}>
                      {getDifficultyText(course.difficulty)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {course && (
        <View className={styles.bottomBar}>
          <View className={styles.availabilityInfo}>
            {full ? (
              <>
                <Text className={styles.availabilityText}>已约满</Text>
                <Text className={styles.availabilityNum} style={{ color: '#FF7D00' }}>
                  候补 {course.waitlistCount} 人
                </Text>
              </>
            ) : (
              <>
                <Text className={styles.availabilityText}>剩余名额</Text>
                <Text className={styles.availabilityNum}>{remaining} 位</Text>
              </>
            )}
          </View>

          {canCancel && (
            <Button
              className={styles.cancelButton}
              onClick={handleCancel}
              loading={actionLoading}
              disabled={actionLoading}
            >
              取消预约
            </Button>
          )}
          
          <Button
            className={classnames(styles.bookButton, {
              [styles.booked]: isBooked || hasCheckedIn,
              [styles.waitlisted]: isWaitlisted,
              [styles.full]: full && !isWaitlisted
            })}
            onClick={handleBook}
            disabled={isBooked || isWaitlisted || hasCheckedIn || isCancelled || actionLoading}
            loading={actionLoading}
          >
            {hasCheckedIn ? '已签到' : isBooked ? '已预约' : isWaitlisted ? '候补中' : isCancelled ? '已取消' : full ? '加入候补' : '立即约课'}
          </Button>
        </View>
      )}
    </View>
  );
};

export default CourseDetailPage;
