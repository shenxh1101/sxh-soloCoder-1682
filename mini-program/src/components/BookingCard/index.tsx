import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { Booking } from '@/types';
import { getBookingStatusText, getBookingStatusColor, canCancelBooking } from '@/utils/date';

interface BookingCardProps {
  booking: Booking;
  onCancel?: () => void;
  onDetail?: () => void;
  showCancel?: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onDetail,
  showCancel = true
}) => {
  const statusColor = getBookingStatusColor(booking.status);
  const canCancel = showCancel && canCancelBooking(booking.date, booking.startTime) 
    && (booking.status === 'booked' || booking.status === 'waitlist');

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.();
  };

  return (
    <View className={styles.card} onClick={onDetail}>
      <View className={styles.cardHeader}>
        <View className={styles.dateTime}>
          <Text className={styles.date}>{booking.date}</Text>
          <Text className={styles.time}>
            {booking.startTime} - {booking.endTime}
          </Text>
        </View>
        <View 
          className={styles.statusBadge}
          style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
        >
          {booking.status === 'waitlist' && booking.waitlistPosition
            ? `候补第${booking.waitlistPosition}位`
            : getBookingStatusText(booking.status)}
        </View>
      </View>

      <View className={styles.cardBody}>
        <Text className={styles.courseName}>{booking.courseName}</Text>
        <View className={styles.infoRow}>
          <Text className={styles.coach}>教练：{booking.coach}</Text>
          <Text className={styles.room}>{booking.room}</Text>
        </View>
      </View>

      {canCancel && (
        <View className={styles.cardFooter}>
          <Button className={styles.cancelButton} onClick={handleCancel}>
            取消预约
          </Button>
        </View>
      )}
    </View>
  );
};

export default BookingCard;
