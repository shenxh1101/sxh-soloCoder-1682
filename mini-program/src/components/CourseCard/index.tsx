import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { Course } from '@/types';
import { isCourseFull, getDifficultyText, getDifficultyColor } from '@/utils/date';

interface CourseCardProps {
  course: Course;
  isBooked?: boolean;
  isWaitlisted?: boolean;
  onBook?: () => void;
  onWaitlist?: () => void;
  onDetail?: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isBooked = false,
  isWaitlisted = false,
  onBook,
  onWaitlist,
  onDetail
}) => {
  const full = isCourseFull(course.bookedCount, course.capacity);
  const remaining = course.capacity - course.bookedCount;
  const difficultyColor = getDifficultyColor(course.difficulty);

  const handleCardClick = () => {
    onDetail?.();
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (full) {
      onWaitlist?.();
    } else {
      onBook?.();
    }
  };

  return (
    <View className={styles.card} onClick={handleCardClick}>
      <View className={styles.cardHeader}>
        <View className={styles.timeSection}>
          <Text className={styles.startTime}>{course.startTime}</Text>
          <Text className={styles.endTime}>- {course.endTime}</Text>
        </View>
        <View className={styles.tags}>
          <View className={styles.categoryTag}>{course.category}</View>
          <View 
            className={styles.difficultyTag} 
            style={{ backgroundColor: `${difficultyColor}15`, color: difficultyColor }}
          >
            {getDifficultyText(course.difficulty)}
          </View>
        </View>
      </View>

      <View className={styles.cardBody}>
        <Text className={styles.courseName}>{course.name}</Text>
        
        <View className={styles.coachInfo}>
          <Image 
            className={styles.coachAvatar} 
            src={course.coachAvatar} 
            mode="aspectFill"
          />
          <Text className={styles.coachName}>{course.coach}</Text>
          <Text className={styles.room}>{course.room}</Text>
        </View>
      </View>

      <View className={styles.cardFooter}>
        <View className={styles.availability}>
          {full ? (
            <Text className={styles.fullText}>
              已满员 · 候补{course.waitlistCount}人
            </Text>
          ) : (
            <Text className={styles.remainingText}>
              剩余 <Text className={styles.remainingNum}>{remaining}</Text> 个名额
            </Text>
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
          {isBooked ? '已预约' : isWaitlisted ? '候补中' : full ? '候补' : '约课'}
        </Button>
      </View>
    </View>
  );
};

export default CourseCard;
