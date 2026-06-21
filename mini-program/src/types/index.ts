export interface Course {
  id: string;
  name: string;
  coach: string;
  coachAvatar: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  room: string;
}

export interface Booking {
  id: string;
  courseId: string;
  courseName: string;
  coach: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'booked' | 'waitlist' | 'checked_in' | 'cancelled' | 'missed';
  bookedAt: string;
  waitlistPosition?: number;
  room: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  remainingClasses: number;
  totalClasses: number;
  membershipType: string;
  joinDate: string;
}

export type DateTab = {
  date: string;
  dayOfWeek: string;
  dayNum: string;
  isToday: boolean;
};
