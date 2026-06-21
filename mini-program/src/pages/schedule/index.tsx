import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useStore } from '@/store/useStore';
import DateTabBar from '@/components/DateTabBar';
import CourseCard from '@/components/CourseCard';
import { generateWeekDates, isCourseFull } from '@/utils/date';
import { DateTab } from '@/types';
import styles from './index.module.scss';

const SchedulePage: React.FC = () => {
  const { 
    courses, 
    selectedDate, 
    setSelectedDate,
    bookCourse,
    joinWaitlist,
    getBookedCourseIds,
    getWaitlistCourseIds
  } = useStore();
  
  const [weekDates, setWeekDates] = useState<DateTab[]>([]);

  useEffect(() => {
    const dates = generateWeekDates();
    setWeekDates(dates);
    if (dates.length > 0 && !selectedDate) {
      const today = dates.find(d => d.isToday) || dates[0];
      setSelectedDate(today.date);
    }
  }, []);

  const dayCourses = useMemo(() => {
    return courses
      .filter(course => course.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [courses, selectedDate]);

  const bookedIds = getBookedCourseIds();
  const waitlistIds = getWaitlistCourseIds();

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleBook = (courseId: string) => {
    const result = bookCourse(courseId);
    Taro.showToast({
      title: result.message,
      icon: result.success ? 'success' : 'none',
      duration: 2000
    });
  };

  const handleWaitlist = (courseId: string) => {
    const result = joinWaitlist(courseId);
    Taro.showToast({
      title: result.message,
      icon: result.success ? 'success' : 'none',
      duration: 2000
    });
  };

  const goToDetail = (courseId: string) => {
    Taro.navigateTo({
      url: `/pages/course-detail/index?id=${courseId}`
    });
  };

  const handleRefresh = () => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 1000);
  };

  useEffect(() => {
    Taro.eventCenter.on('pulldownrefresh', handleRefresh);
    return () => {
      Taro.eventCenter.off('pulldownrefresh', handleRefresh);
    };
  }, []);

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
        onPullDownRefresh={handleRefresh}
      >
        <Text className={styles.sectionTitle}>
          当日课程 · {dayCourses.length}节
        </Text>

        {dayCourses.length === 0 ? (
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
                isBooked={bookedIds.includes(course.id)}
                isWaitlisted={waitlistIds.includes(course.id)}
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
