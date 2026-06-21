import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useStore } from '@/store/useStore';
import { isCourseFull, getDifficultyText, getDifficultyColor } from '@/utils/date';
import styles from './index.module.scss';

const CourseDetailPage: React.FC = () => {
  const router = useRouter();
  const { 
    courses, 
    bookCourse, 
    joinWaitlist, 
    getBookedCourseIds, 
    getWaitlistCourseIds 
  } = useStore();
  
  const courseId = router.params.id || '';
  
  const course = useMemo(() => {
    return courses.find(c => c.id === courseId);
  }, [courses, courseId]);

  const bookedIds = getBookedCourseIds();
  const waitlistIds = getWaitlistCourseIds();
  const isBooked = bookedIds.includes(courseId);
  const isWaitlisted = waitlistIds.includes(courseId);

  useEffect(() => {
    if (course) {
      Taro.setNavigationBarTitle({ title: course.name });
    }
  }, [course]);

  const handleBook = () => {
    if (!course) return;
    
    const full = isCourseFull(course.bookedCount, course.capacity);
    let result;
    
    if (full) {
      result = joinWaitlist(course.id);
    } else {
      result = bookCourse(course.id);
    }
    
    Taro.showToast({
      title: result.message,
      icon: result.success ? 'success' : 'none',
      duration: 2000
    });
  };

  if (!course) {
    return (
      <View className={styles.page}>
        <View style={{ padding: '100rpx 32rpx', textAlign: 'center' }}>
          <Text>课程不存在</Text>
        </View>
      </View>
    );
  }

  const full = isCourseFull(course.bookedCount, course.capacity);
  const remaining = course.capacity - course.bookedCount;
  const difficultyColor = getDifficultyColor(course.difficulty);

  return (
    <View className={styles.page}>
      <ScrollView scrollY>
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
                <Text className={styles.coachName}>{course.coach}</Text>
                <Text className={styles.coachTitle}>资深{course.category}教练</Text>
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
      </ScrollView>

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
            [styles.booked]: isBooked,
            [styles.waitlisted]: isWaitlisted,
            [styles.full]: full && !isWaitlisted
          })}
          onClick={handleBook}
          disabled={isBooked}
        >
          {isBooked ? '已预约' : isWaitlisted ? '候补中' : full ? '加入候补' : '立即约课'}
        </Button>
      </View>
    </View>
  );
};

export default CourseDetailPage;
