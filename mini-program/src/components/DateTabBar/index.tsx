import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { DateTab } from '@/types';

interface DateTabBarProps {
  dates: DateTab[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

const DateTabBar: React.FC<DateTabBarProps> = ({ dates, selectedDate, onSelect }) => {
  return (
    <View className={styles.container}>
      <ScrollView scrollX className={styles.scrollView} showScrollbar={false}>
        <View className={styles.tabList}>
          {dates.map((item) => (
            <View
              key={item.date}
              className={classnames(styles.tabItem, {
                [styles.active]: item.date === selectedDate,
                [styles.today]: item.isToday
              })}
              onClick={() => onSelect(item.date)}
            >
              <Text className={styles.dayOfWeek}>{item.dayOfWeek}</Text>
              <Text className={styles.dayNum}>{item.dayNum}</Text>
              {item.isToday && <View className={styles.todayDot} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default DateTabBar;
