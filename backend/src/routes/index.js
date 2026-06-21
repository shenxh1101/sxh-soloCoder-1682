const express = require('express');
const router = express.Router();
const { login, register, authMiddleware, adminMiddleware } = require('../controllers/authController');
const { 
  getCourses, 
  getCourseById, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  getCoaches 
} = require('../controllers/courseController');
const { 
  getBookings, 
  createBooking, 
  cancelBooking,
  getCourseBookings
} = require('../controllers/bookingController');
const { 
  checkin, 
  getCheckinsByCourse,
  getTodayCheckins,
  batchCheckin
} = require('../controllers/checkinController');
const { 
  getWeeklyStats, 
  getCoachStats,
  exportWeeklyStats,
  getMemberStats
} = require('../controllers/statsController');
const { 
  getProfile, 
  updateProfile,
  getMembershipCards,
  getMembers,
  getMemberDetail
} = require('../controllers/userController');

router.post('/auth/login', login);
router.post('/auth/register', register);

router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.get('/coaches', getCoaches);

router.get('/bookings', authMiddleware, getBookings);
router.post('/bookings', authMiddleware, createBooking);
router.post('/bookings/:id/cancel', authMiddleware, cancelBooking);

router.get('/courses/:courseId/bookings', authMiddleware, adminMiddleware, getCourseBookings);
router.post('/courses', authMiddleware, adminMiddleware, createCourse);
router.put('/courses/:id', authMiddleware, adminMiddleware, updateCourse);
router.delete('/courses/:id', authMiddleware, adminMiddleware, deleteCourse);

router.post('/checkins', authMiddleware, adminMiddleware, checkin);
router.get('/checkins/today', authMiddleware, adminMiddleware, getTodayCheckins);
router.get('/courses/:courseId/checkins', authMiddleware, adminMiddleware, getCheckinsByCourse);
router.post('/checkins/batch', authMiddleware, adminMiddleware, batchCheckin);

router.get('/stats/weekly', authMiddleware, adminMiddleware, getWeeklyStats);
router.get('/stats/coaches', authMiddleware, adminMiddleware, getCoachStats);
router.get('/stats/weekly/export', authMiddleware, adminMiddleware, exportWeeklyStats);
router.get('/stats/member', authMiddleware, getMemberStats);

router.get('/user/profile', authMiddleware, getProfile);
router.put('/user/profile', authMiddleware, updateProfile);
router.get('/user/cards', authMiddleware, getMembershipCards);

router.get('/members', authMiddleware, adminMiddleware, getMembers);
router.get('/members/:id', authMiddleware, adminMiddleware, getMemberDetail);

module.exports = router;
