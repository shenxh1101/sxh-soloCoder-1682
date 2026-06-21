import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import DateTabBar from '@/components/DateTabBar';
import CourseCard from '@/components/CourseCard';
import { generateWeekDates, isCourseFull } from '@/utils/date';
import { courseAPI, bookingAPI } from '@/services/api';
import { DateTab, Course, Booking } from '@/types';
import styles from './index.module.scss';

const SchedulePage: React.FC = () => {
  const [weekDates, setWeekDates] = useState<DateTab[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const initDates = useCallback(() => {
    const dates = generateWeekDates();
    setWeekDates(dates);
    if (dates.length > 0) {
      const today = dates.find(d => d.isToday) || dates[0];
      setSelectedDate(today.date);
    }
  }, []);

  const checkLogin = useCallback(() => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      return false;
    }
    return true;
  }, []);

  const loadCourses = useCallback(async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const data = await courseAPI.getCourses(selectedDate);
      setCourses(data.map((c: any) => ({
        id: c.id,
        name: c.name,
        coachId: c.coach_id,
        coachName: c.coach_name || '待定',
        coachAvatar: c.coach_avatar || '',
        coachBio: c.coach_bio || '',
        date: c.date,
        startTime: c.start_time,
        endTime: c.end_time,
        duration: c.duration,
        capacity: c.capacity,
        bookedCount: c.booked_count,
        waitlistCount: c.waitlist_count,
        description: c.description || '',
        difficulty: c.difficulty || 'medium',
        category: c.category || '',
        room: c.room || ''
      })));
    } catch (error) {
      console.error('Load courses error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const loadBookings = useCallback(async () => {
    if (!checkLogin()) {
      setBookings([]);
      return;
    }
    
    try {
      const data = await bookingAPI.getBookings();
      const list = data.list || data || [];
      setBookings(list.map((b: any) => ({
        id: b.id,
        courseId: b.course_id,
        courseName: b.course_name,
        coachName: b.coach_name || '待定',
        coachAvatar: b.coach_avatar || '',
        courseDate: b.course_date || b.date,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.has_checked_in === 1 ? 'checked_in' : b.status,
        waitlistPosition: b.waitlist_position,
        bookedAt: b.booked_at,
        room: b.room || ''
      })));
    } catch (error) {
      console.error('Load bookings error:', error);
    }
  }, [checkLogin]);

  useDidShow(() => {
    if (weekDates.length === 0) {
      initDates();
    }
    loadCourses();
    loadBookings();
  }, [selectedDate]);

  const dayCourses = useMemo(() => {
    return courses
      .filter(course => course.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [courses, selectedDate]);

  const bookedCourseIds = useMemo(() => {
    return bookings
      .filter(b => b.status === 'booked')
      .map(b => b.courseId);
  }, [bookings]);

  const waitlistCourseIds = useMemo(() => {
    return bookings
      .filter(b => b.status === 'waitlist')
      .map(b => b.courseId);
  }, [bookings]);

  const checkedInCourseIds = useMemo(() => {
    return bookings
      .filter(b => b.status === 'checked_in')
      .map(b => b.courseId);
  }, [bookings]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleBook = async (courseId: string) => {
    if (!checkLogin()) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }

    try {
      const data = await bookingAPI.createBooking(courseId);
      Taro.showToast({
        title: data.message || '预约成功',
        icon: 'success',
        duration: 2000
      });
      await Promise.all([loadCourses(), loadBookings()]);
    } catch (error) {
      console.error('Book course error:', error);
    }
  };

  const handleWaitlist = async (courseId: string) => {
    if (!checkLogin()) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }

    try {
      const data = await bookingAPI.createBooking(courseId);
      Taro.showToast({
        title: data.message || '候补成功',
        icon: 'success',
        duration: 2000
      });
      await Promise.all([loadCourses(), loadBookings()]);
    } catch (error) {
      console.error('Join waitlist error:', error);
    }
  };

  const goToDetail = (courseId: string) => {
    Taro.navigateTo({
      url: `/pages/course-detail/index?id=${courseId}`
    });
  };

  const onRefresh = () => {
    loadCourses();
    loadBookings();
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 1000);
  };

  return (
    <View className={styles.page}>
      <View className={styles.dateTabWrapper}>
        <DateTabBar 
          dates={weekDates} 
          selectedDate={selectedDate} 
          onSelect={handleDateSelect} 
        />
      </View>

      <ScrollView
        scrollY
        className={styles.content}
        onPullDownRefresh={onRefresh}
        refresherEnabled
        refresherTriggered={loading}
      >
        <Text className={styles.sectionTitle}>
          当日课程 · {dayCourses.length}节
        </Text>

        {dayCourses.length === 0 && !loading ? (
          <View className={styles.emptyState}>
            <View className={styles.emptyIcon}>📅</View>
            <Text className={styles.emptyText}>当日暂无课程安排</Text>
          </View>
        ) : (
          <View className={styles.courseList}>
            {dayCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isBooked={bookedCourseIds.includes(course.id)}
                isWaitlisted={waitlistCourseIds.includes(course.id)}
                isCheckedIn={checkedInCourseIds.includes(course.id)}
                onBook={() => handleBook(course.id)}
                onWaitlist={() => handleWaitlist(course.id)}
                onDetail={() => goToDetail(course.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SchedulePage;
