import { create } from 'zustand';
import { Course, Booking, User } from '@/types';
import { courses as mockCourses } from '@/data/courses';
import { bookings as mockBookings } from '@/data/bookings';
import { currentUser } from '@/data/user';

interface AppState {
  courses: Course[];
  bookings: Booking[];
  user: User;
  selectedDate: string;
  
  setSelectedDate: (date: string) => void;
  bookCourse: (courseId: string) => { success: boolean; message: string };
  joinWaitlist: (courseId: string) => { success: boolean; message: string };
  cancelBooking: (bookingId: string) => { success: boolean; message: string };
  getBookedCourseIds: () => string[];
  getWaitlistCourseIds: () => string[];
}

export const useStore = create<AppState>((set, get) => ({
  courses: mockCourses,
  bookings: mockBookings,
  user: currentUser,
  selectedDate: new Date().toISOString().split('T')[0],

  setSelectedDate: (date: string) => set({ selectedDate: date }),

  bookCourse: (courseId: string) => {
    const { courses, bookings, user } = get();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
      return { success: false, message: '课程不存在' };
    }
    
    if (user.remainingClasses <= 0) {
      return { success: false, message: '剩余团课次数不足，请先充值' };
    }
    
    if (course.bookedCount >= course.capacity) {
      return { success: false, message: '课程已满员，可加入候补队列' };
    }
    
    const hasBooked = bookings.some(b => b.courseId === courseId && (b.status === 'booked' || b.status === 'waitlist'));
    if (hasBooked) {
      return { success: false, message: '您已预约该课程' };
    }
    
    const newBooking: Booking = {
      id: `b${Date.now()}`,
      courseId: course.id,
      courseName: course.name,
      coach: course.coach,
      date: course.date,
      startTime: course.startTime,
      endTime: course.endTime,
      status: 'booked',
      bookedAt: new Date().toLocaleString(),
      room: course.room
    };
    
    set(state => ({
      bookings: [...state.bookings, newBooking],
      courses: state.courses.map(c => 
        c.id === courseId ? { ...c, bookedCount: c.bookedCount + 1 } : c
      ),
      user: { ...state.user, remainingClasses: state.user.remainingClasses - 1 }
    }));
    
    return { success: true, message: '预约成功！' };
  },

  joinWaitlist: (courseId: string) => {
    const { courses, bookings, user } = get();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
      return { success: false, message: '课程不存在' };
    }
    
    if (user.remainingClasses <= 0) {
      return { success: false, message: '剩余团课次数不足，请先充值' };
    }
    
    const hasBooked = bookings.some(b => b.courseId === courseId && (b.status === 'booked' || b.status === 'waitlist'));
    if (hasBooked) {
      return { success: false, message: '您已预约该课程' };
    }
    
    const waitlistPosition = course.waitlistCount + 1;
    
    const newBooking: Booking = {
      id: `b${Date.now()}`,
      courseId: course.id,
      courseName: course.name,
      coach: course.coach,
      date: course.date,
      startTime: course.startTime,
      endTime: course.endTime,
      status: 'waitlist',
      bookedAt: new Date().toLocaleString(),
      waitlistPosition,
      room: course.room
    };
    
    set(state => ({
      bookings: [...state.bookings, newBooking],
      courses: state.courses.map(c => 
        c.id === courseId ? { ...c, waitlistCount: c.waitlistCount + 1 } : c
      )
    }));
    
    return { success: true, message: `已加入候补队列，当前第${waitlistPosition}位` };
  },

  cancelBooking: (bookingId: string) => {
    const { bookings, courses } = get();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
      return { success: false, message: '预约记录不存在' };
    }
    
    if (booking.status !== 'booked' && booking.status !== 'waitlist') {
      return { success: false, message: '该状态无法取消' };
    }
    
    set(state => {
      const updatedCourses = state.courses.map(c => {
        if (c.id === booking.courseId) {
          if (booking.status === 'booked') {
            let newBookedCount = c.bookedCount - 1;
            let newWaitlistCount = c.waitlistCount;
            let promotedFromWaitlist = false;
            
            if (c.waitlistCount > 0) {
              newWaitlistCount = c.waitlistCount - 1;
              newBookedCount = c.bookedCount;
              promotedFromWaitlist = true;
            }
            
            return {
              ...c,
              bookedCount: newBookedCount,
              waitlistCount: newWaitlistCount
            };
          } else {
            return { ...c, waitlistCount: c.waitlistCount - 1 };
          }
        }
        return c;
      });
      
      const updatedBookings = state.bookings.map(b => {
        if (b.id === bookingId) {
          return { ...b, status: 'cancelled' as const };
        }
        if (b.courseId === booking.courseId && b.status === 'waitlist' && booking.status === 'booked') {
          if (b.waitlistPosition === 1) {
            return { ...b, status: 'booked' as const, waitlistPosition: undefined };
          }
          return { ...b, waitlistPosition: (b.waitlistPosition || 1) - 1 };
        }
        return b;
      });
      
      const refundClasses = booking.status === 'booked' ? 1 : 0;
      
      return {
        bookings: updatedBookings,
        courses: updatedCourses,
        user: { ...state.user, remainingClasses: state.user.remainingClasses + refundClasses }
      };
    });
    
    return { success: true, message: '取消成功，名额已释放' };
  },

  getBookedCourseIds: () => {
    const { bookings } = get();
    return bookings.filter(b => b.status === 'booked').map(b => b.courseId);
  },

  getWaitlistCourseIds: () => {
    const { bookings } = get();
    return bookings.filter(b => b.status === 'waitlist').map(b => b.courseId);
  }
}));
