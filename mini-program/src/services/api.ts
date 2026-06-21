const BASE_URL = 'http://localhost:3000/api';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  needAuth?: boolean;
}

const request = <T = any>(options: RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', data, needAuth = true } = options;
    
    const header: any = {
      'Content-Type': 'application/json'
    };

    if (needAuth) {
      const token = Taro.getStorageSync('token');
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }
    }

    Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: (res: any) => {
        if (res.statusCode === 401) {
          Taro.removeStorageSync('token');
          Taro.removeStorageSync('userInfo');
          Taro.navigateTo({ url: '/pages/login/index' });
          reject(new Error('请先登录'));
          return;
        }
        
        if (res.data && res.data.success) {
          resolve(res.data.data);
        } else {
          Taro.showToast({
            title: res.data?.message || '请求失败',
            icon: 'none'
          });
          reject(new Error(res.data?.message || '请求失败'));
        }
      },
      fail: (err: any) => {
        console.error('Request failed:', err);
        Taro.showToast({
          title: '网络错误',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

export const authAPI = {
  login: (phone: string, password: string) => {
    return request<any>({
      url: '/auth/login',
      method: 'POST',
      data: { phone, password },
      needAuth: false
    });
  },

  register: (phone: string, password: string, name: string) => {
    return request<any>({
      url: '/auth/register',
      method: 'POST',
      data: { phone, password, name },
      needAuth: false
    });
  }
};

export const courseAPI = {
  getCourses: (date?: string, startDate?: string, endDate?: string) => {
    let params = '';
    if (date) {
      params = `?date=${date}`;
    } else if (startDate && endDate) {
      params = `?startDate=${startDate}&endDate=${endDate}`;
    }
    return request<any>({
      url: `/courses${params}`,
      needAuth: false
    });
  },

  getCourseDetail: (id: string) => {
    return request<any>({
      url: `/courses/${id}`,
      needAuth: false
    });
  }
};

export const bookingAPI = {
  getBookings: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return request<any>({
      url: `/bookings${params}`
    });
  },

  createBooking: (courseId: string) => {
    return request<any>({
      url: '/bookings',
      method: 'POST',
      data: { courseId }
    });
  },

  cancelBooking: (bookingId: string) => {
    return request<any>({
      url: `/bookings/${bookingId}/cancel`,
      method: 'POST'
    });
  },

  getCheckinCode: (bookingId: string) => {
    return request<any>({
      url: `/bookings/${bookingId}/checkin-code`
    });
  },

  getBookingDetail: (bookingId: string) => {
    return request<any>({
      url: `/bookings/${bookingId}`
    });
  }
};

export const userAPI = {
  getProfile: () => {
    return request<any>({
      url: '/user/profile'
    });
  },

  getCards: () => {
    return request<any>({
      url: '/user/cards'
    });
  },

  getCardTransactions: (page: number = 1, pageSize: number = 20) => {
    return request<any>({
      url: `/user/card-transactions?page=${page}&pageSize=${pageSize}`
    });
  }
};

export const statsAPI = {
  getMemberStats: () => {
    return request<any>({
      url: '/stats/member'
    });
  }
};

export default request;
