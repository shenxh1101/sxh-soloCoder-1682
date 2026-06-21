import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import { courseAPI, bookingAPI } from '@/services/api';
import { isCourseFull, getDifficultyText, getDifficultyColor } from '@/utils/date';
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
      setBookings(data.list || data || []);
    } catch (error) {
      console.error('Load bookings error:', error);
    }
  }, [checkLogin]);

  useDidShow(() => {
    loadCourse();
    loadBookings();
  });

  const isBooked = useMemo(() => {
    return bookings.some(b => b.courseId === courseId && b.status === 'booked');
  }, [bookings, courseId]);

  const isWaitlisted = useMemo(() => {
    return bookings.some(b => b.courseId === courseId && b.status === 'waitlist');
  }, [bookings, courseId]);

  const hasCheckedIn = useMemo(() => {
    return bookings.some(b => b.courseId === courseId && b.status === 'checked_in');
  }, [bookings, courseId]);

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
      loadCourse();
      loadBookings();
    } catch (error) {
      console.error('Book course error:', error);
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
          
          <Button
            className={classnames(styles.bookButton, {
              [styles.booked]: isBooked || hasCheckedIn,
              [styles.waitlisted]: isWaitlisted,
              [styles.full]: full && !isWaitlisted
            })}
            onClick={handleBook}
            disabled={isBooked || hasCheckedIn || actionLoading}
            loading={actionLoading}
          >
            {hasCheckedIn ? '已签到' : isBooked ? '已预约' : isWaitlisted ? '候补中' : full ? '加入候补' : '立即约课'}
          </Button>
        </View>
      )}
    </View>
  );
};

export default CourseDetailPage;
