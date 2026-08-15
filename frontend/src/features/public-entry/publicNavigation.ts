export type PublicNavigationItem = {
  label: string;
  to: string;
  emphasis?: 'primary' | 'merchant';
  reservationLoginNotice?: boolean;
};

export function publicNavigationItems(isCustomer: boolean): PublicNavigationItem[] {
  return isCustomer
    ? [
        { label: '儀表板', to: '/dashboard' },
        { label: '前往預約', to: '/reservation/new', emphasis: 'primary' },
        { label: '我的預約', to: '/my/reservations' }
      ]
    : [
        { label: '我要預約', to: '/reservation/new', reservationLoginNotice: true },
        { label: '我是商家', to: '/register-business' },
        { label: '登入', to: '/login' },
        { label: '建立帳號', to: '/register', emphasis: 'primary' }
      ];
}
