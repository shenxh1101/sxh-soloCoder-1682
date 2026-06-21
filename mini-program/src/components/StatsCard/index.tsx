import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface StatsCardProps {
  value: number | string;
  label: string;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ value, label, color = '#FF6B35' }) => {
  return (
    <View className={styles.card}>
      <Text className={styles.value} style={{ color }}>{value}</Text>
      <Text className={styles.label}>{label}</Text>
    </View>
  );
};

export default StatsCard;
