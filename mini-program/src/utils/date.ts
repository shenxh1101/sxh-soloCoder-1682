import dayjs from 'dayjs';
import { DateTab } from '@/types';

export const generateWeekDates = (): DateTab[] => {
  const today = dayjs();
  const startOfWeek = today.startOf('week');
  const dates: DateTab[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = startOfWeek.add(i, 'day');
    dates.push({
      date: date.format('YYYY-MM-DD'),
      dayOfWeek: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.day()],
      dayNum: date.format('MM/DD'),
      isToday: date.isSame(today, 'day')
    });
  }
  
  return dates;
};

export const formatDate = (date: string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const isCourseFull = (bookedCount: number, capacity: number): boolean => {
  return bookedCount >= capacity;
};

export const canCancelBooking = (date: string, startTime: string): boolean => {
  const courseDateTime = dayjs(`${date} ${startTime}`);
  const now = dayjs();
  const diffHours = courseDateTime.diff(now, 'hour');
  return diffHours >= 2;
};

export const getDifficultyText = (difficulty: string): string => {
  const map: Record<string, string> = {
    easy: '初级',
    medium: '中级',
    hard: '高级'
  };
  return map[difficulty] || difficulty;
};

export const getDifficultyColor = (difficulty: string): string => {
  const map: Record<string, string> = {
    easy: '#00B42A',
    medium: '#FF7D00',
    hard: '#F53F3F'
  };
  return map[difficulty] || '#86909C';
};

export const getBookingStatusText = (status: string): string => {
  const map: Record<string, string> = {
    booked: '已预约',
    waitlist: '候补中',
    checked_in: '已签到',
    cancelled: '已取消',
    missed: '已爽约'
  };
  return map[status] || status;
};

export const getBookingStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    booked: '#FF6B35',
    waitlist: '#FF7D00',
    checked_in: '#00B42A',
    cancelled: '#86909C',
    missed: '#F53F3F'
  };
  return map[status] || '#86909C';
};
