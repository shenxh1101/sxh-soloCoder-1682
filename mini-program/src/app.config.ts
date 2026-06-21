export default defineAppConfig({
  pages: [
    'pages/schedule/index',
    'pages/bookings/index',
    'pages/profile/index',
    'pages/course-detail/index',
    'pages/login/index',
    'pages/booking-history/index',
    'pages/my-cards/index',
    'pages/checkin-code/index',
    'pages/booking-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FF6B35',
    navigationBarTitleText: 'FitStudio 约课',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/schedule/index',
        text: '课表'
      },
      {
        pagePath: 'pages/bookings/index',
        text: '我的预约'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的'
      }
    ]
  }
})
