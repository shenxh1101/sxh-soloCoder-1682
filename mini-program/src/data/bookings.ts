import { Booking } from '@/types';

export const bookings: Booking[] = [
  {
    id: 'b1',
    courseId: '1',
    courseName: '动感单车',
    coach: '李教练',
    date: '2026-06-22',
    startTime: '07:00',
    endTime: '07:50',
    status: 'checked_in',
    bookedAt: '2026-06-20 14:30',
    room: '动感单车房'
  },
  {
    id: 'b2',
    courseId: '2',
    courseName: '瑜伽冥想',
    coach: '王教练',
    date: '2026-06-22',
    startTime: '09:30',
    endTime: '10:30',
    status: 'booked',
    bookedAt: '2026-06-21 09:00',
    room: '瑜伽室A'
  },
  {
    id: 'b3',
    courseId: '3',
    courseName: 'HIIT燃脂',
    coach: '张教练',
    date: '2026-06-22',
    startTime: '18:00',
    endTime: '18:45',
    status: 'waitlist',
    bookedAt: '2026-06-21 16:00',
    waitlistPosition: 2,
    room: '多功能训练区'
  },
  {
    id: 'b4',
    courseId: '6',
    courseName: '搏击操',
    coach: '陈教练',
    date: '2026-06-23',
    startTime: '12:00',
    endTime: '12:50',
    status: 'booked',
    bookedAt: '2026-06-22 10:00',
    room: '操房'
  },
  {
    id: 'b5',
    courseId: '10',
    courseName: '尊巴舞',
    coach: '赵教练',
    date: '2026-06-24',
    startTime: '10:00',
    endTime: '11:00',
    status: 'booked',
    bookedAt: '2026-06-22 15:30',
    room: '操房'
  },
  {
    id: 'b6',
    courseId: '9',
    courseName: '动感单车',
    coach: '李教练',
    date: '2026-06-21',
    startTime: '07:00',
    endTime: '07:50',
    status: 'missed',
    bookedAt: '2026-06-19 08:00',
    room: '动感单车房'
  },
  {
    id: 'b7',
    courseId: '8',
    courseName: '阴瑜伽',
    coach: '刘教练',
    date: '2026-06-20',
    startTime: '20:00',
    endTime: '21:00',
    status: 'cancelled',
    bookedAt: '2026-06-18 12:00',
    room: '瑜伽室A'
  }
];

export const getBookingsByStatus = (status?: Booking['status']): Booking[] => {
  if (!status) return bookings;
  return bookings.filter(booking => booking.status === status);
};

export const getUpcomingBookings = (): Booking[] => {
  return bookings.filter(b => b.status === 'booked' || b.status === 'waitlist');
};

export const getPastBookings = (): Booking[] => {
  return bookings.filter(b => b.status === 'checked_in' || b.status === 'missed' || b.status === 'cancelled');
};
