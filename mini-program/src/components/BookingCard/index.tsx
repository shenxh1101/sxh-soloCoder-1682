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
  onShowCheckinCode?: () => void;
  showCancel?: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onDetail,
  onShowCheckinCode,
  showCancel = true
}) => {
  const statusColor = getBookingStatusColor(booking.status);
  const canCancel = showCancel && canCancelBooking(booking.courseDate, booking.startTime) 
    && (booking.status === 'booked' || booking.status === 'waitlist');

  const canShowCheckinCode = booking.status === 'booked' || booking.status === 'checked_in';

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.();
  };

  const handleShowCheckinCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowCheckinCode?.();
  };

  return (
    <View className={styles.card} onClick={onDetail}>
      <View className={styles.cardHeader}>
        <View className={styles.dateTime}>
          <Text className={styles.date}>{booking.courseDate}</Text>
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
          <Text className={styles.coach}>教练：{booking.coachName}</Text>
          <Text className={styles.room}>{booking.room}</Text>
        </View>
      </View>

      {(canCancel || canShowCheckinCode) && (
        <View className={styles.cardFooter}>
          {canCancel && (
            <Button className={styles.cancelButton} onClick={handleCancel}>
              取消预约
            </Button>
          )}
          {canShowCheckinCode && (
            <Button className={styles.checkinCodeButton} onClick={handleShowCheckinCode}>
              {booking.status === 'checked_in' ? '查看签到码' : '签到码'}
            </Button>
          )}
        </View>
      )}
    </View>
  );
};

export default BookingCard;
