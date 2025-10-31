import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-context';
import Button from './button';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'Bill Split' }) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const navigation = user?.role === 'admin'
    ? [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Admin Panel', href: '/admin' },
        { name: 'Kullanıcılar', href: '/admin/users' },
        { name: 'Fatura Ekle', href: '/bills/upload' },
        { name: 'Faturalar', href: '/bills/list' },
        { name: 'Raporlar', href: '/reports' },
      ]
    : [
        { name: 'Ana Sayfa', href: '/dashboard' },
        { name: 'Fatura Ekle', href: '/bills/upload' },
        { name: 'Faturalar', href: '/bills/list' },
        { name: 'Raporlar', href: '/reports' },
      ];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Premium Desktop Navbar */}
      <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
                <div className="bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-2.5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-black bg-clip-text text-transparent bg-linear-to-r from-blue-600 via-purple-600 to-pink-600">
                    Bill Split
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Smart Finance</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation - Hidden on Mobile */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${
                    router.pathname === item.href
                      ? 'bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white/70 hover:shadow-md'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* User Info & Logout - Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg ${
                  user?.role === 'admin' 
                    ? 'bg-linear-to-br from-purple-600 to-pink-600' 
                    : 'bg-linear-to-br from-blue-600 to-cyan-600'
                }`}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500 font-medium">
                    {user?.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
                  </p>
                </div>
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleLogout}
                className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Çıkış
              </Button>
            </div>

            {/* Mobile User & Logout - Visible on Mobile */}
            <div className="flex md:hidden items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg ${
                user?.role === 'admin' 
                  ? 'bg-linear-to-br from-purple-600 to-pink-600' 
                  : 'bg-linear-to-br from-blue-600 to-cyan-600'
              }`}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleLogout}
                className="shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content with Better Spacing */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 max-w-7xl">
        {title && (
          <div className="mb-8">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-2">{title}</h2>
            <div className="w-24 h-1 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full"></div>
          </div>
        )}
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-2xl z-50">
        <div className="flex justify-around items-center py-2 px-4">
          {navigation.map((item, index) => {
            const isActive = router.pathname === item.href;
            const icons = user?.role === 'admin' 
              ? [
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4l2 2 4-4" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ]
              : [
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4l2 2 4-4" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                ];

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all duration-300 min-w-0 flex-1 ${
                  isActive
                    ? 'bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className={`mb-1 ${isActive ? 'animate-pulse' : ''}`}>
                  {icons[index]}
                </div>
                <span className={`text-xs font-bold truncate max-w-full ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Premium Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-linear-to-br from-blue-600 to-purple-600 rounded-xl p-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">
                © 2024 Bill Split - Harcamalarınızı kolayca paylaşın
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">v1.0.0</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-600">Online</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
