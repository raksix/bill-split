import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface BalanceData {
  totalDebt: number;
  totalCredit: number;
  debts: Array<{
    user: { name: string; username: string };
    totalAmount: number;
  }>;
  credits: Array<{
    user: { name: string; username: string };
    totalAmount: number;
  }>;
}

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions/balance');
      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setBalance(data);
        }
      } else {
        toast.error('Borç bilgileri alınamadı');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isMountedRef]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startPolling = async () => {
      if (isMountedRef.current) {
        setLoading(true);
      }
      await fetchBalance();
      intervalId = setInterval(fetchBalance, 15000);
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [authLoading, user, router, fetchBalance]);

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  if (!balance) {
    return null;
  }

  const netBalance = balance.totalCredit - balance.totalDebt;

  return (
    <>
      <Head>
        <title>Ana Sayfa - Bill Split</title>
      </Head>

      <Layout>
        {/* Ultra Premium Hoş Geldin Banner */}
        <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 text-white">
          {/* Animated Background Circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2">
                  Hoş Geldin, {user?.name}! 👋
                </h1>
                <p className="text-blue-100 text-base sm:text-lg font-medium">
                  Harcamalarını takip et, borçlarını kolayca yönet
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-lg rounded-2xl px-4 py-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-semibold text-sm">Aktif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Modern Ana Bakiye Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Toplam Borç Kartı - Enhanced */}
          <div className="group relative overflow-hidden bg-linear-to-br from-red-500 via-red-600 to-pink-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl">
            {/* Glowing Background Effect */}
            <div className="absolute inset-0 bg-linear-to-br from-red-400/30 to-pink-400/30 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            
            {/* Floating Icon */}
            <div className="relative z-10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-red-200 text-xs font-bold uppercase tracking-wider">DEBT</span>
                  <p className="text-red-100 text-sm font-medium mt-1">Ödenecek</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-black mb-3 bg-clip-text text-transparent bg-linear-to-r from-white to-red-100">
                  ₺{balance.totalDebt.toFixed(2)}
                </p>
                <p className="text-red-100 text-sm font-semibold">Toplam borç miktarı</p>
                
                {/* Progress Bar */}
                <div className="mt-4 bg-red-300/30 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 w-3/4 group-hover:w-full transition-all duration-1000"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Toplam Alacak Kartı - Enhanced */}
          <div className="group relative overflow-hidden bg-linear-to-br from-green-500 via-emerald-600 to-teal-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl">
            {/* Animated Background Patterns */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            <div className="relative z-10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-green-200 text-xs font-bold uppercase tracking-wider">CREDIT</span>
                  <p className="text-green-100 text-sm font-medium mt-1">Alacak</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-black mb-3 bg-clip-text text-transparent bg-linear-to-r from-white to-green-100">
                  ₺{balance.totalCredit.toFixed(2)}
                </p>
                <p className="text-green-100 text-sm font-semibold">Size ödenecek toplam</p>
                
                {/* Bouncing Dots */}
                <div className="mt-4 flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Durum Kartı - Ultra Premium */}
          <div className={`group relative overflow-hidden bg-linear-to-br ${
            netBalance >= 0 
              ? 'from-blue-500 via-indigo-600 to-purple-600' 
              : 'from-orange-500 via-red-500 to-pink-600'
          } rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl sm:col-span-2 lg:col-span-1`}>
            {/* Glowing Border Effect */}
            <div className={`absolute inset-0 bg-linear-to-br ${
              netBalance >= 0 
                ? 'from-blue-400/20 to-purple-400/20' 
                : 'from-orange-400/20 to-pink-400/20'
            } opacity-0 group-hover:opacity-100 transition-all duration-500`}></div>
            
            <div className="relative z-10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-white/80 text-xs font-bold uppercase tracking-wider">BALANCE</span>
                  <p className="text-white/90 text-sm font-medium mt-1">Net Durum</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl">
                    {netBalance >= 0 ? '✨' : '💪'}
                  </span>
                  <p className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-linear-to-r from-white to-gray-100">
                    ₺{Math.abs(netBalance).toFixed(2)}
                  </p>
                </div>
                <p className="text-white/90 text-sm font-semibold">
                  {netBalance >= 0 ? 'Harika durumdasın!' : 'Biraz çaba lazım'}
                </p>
                
                {/* Status Indicator */}
                <div className="mt-4 flex justify-center">
                  <div className={`px-4 py-2 rounded-full text-xs font-bold ${
                    netBalance >= 0 
                      ? 'bg-green-500/30 text-green-100' 
                      : 'bg-yellow-500/30 text-yellow-100'
                  }`}>
                    {netBalance >= 0 ? '🟢 Pozitif' : '🟡 Negatif'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Premium Hızlı Aksiyonlar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Yeni Fatura Ekle - Primary Action */}
          <button
            onClick={() => router.push('/bills/upload')}
            className="group relative overflow-hidden bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl"
          >
            {/* Glowing Effect */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-400/30 to-pink-400/30 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            
            <div className="relative z-10 text-center">
              <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 mb-4 mx-auto w-fit shadow-lg group-hover:scale-110 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-black mb-2">Yeni Fatura Ekle</h3>
              <p className="text-white/90 text-sm font-medium">Fatura yükle ve böl</p>
              
              {/* Action Arrow */}
              <div className="mt-4 flex justify-center group-hover:translate-x-2 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </button>

          {/* Fatura Listesi */}
          <button
            onClick={() => router.push('/bills/list')}
            className="group relative overflow-hidden bg-linear-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl"
          >
            {/* Animated Background Dots */}
            <div className="absolute top-4 right-4 w-3 h-3 bg-white/30 rounded-full animate-ping"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
            
            <div className="relative z-10 text-center">
              <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 mb-4 mx-auto w-fit shadow-lg group-hover:scale-110 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black mb-2">Faturalarım</h3>
              <p className="text-white/90 text-sm font-medium">Tüm faturaları görüntüle</p>
              
              <div className="mt-4 flex justify-center group-hover:translate-x-2 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </button>

          {/* Borçlarım */}
          <button
            onClick={() => router.push('/debts')}
            className="group relative overflow-hidden bg-linear-to-br from-red-500 via-pink-600 to-purple-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl"
          >
            {/* Money Animation */}
            <div className="absolute top-4 right-4 w-4 h-4 bg-white/30 rounded-full animate-bounce"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
            
            <div className="relative z-10 text-center">
              <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 mb-4 mx-auto w-fit shadow-lg group-hover:scale-110 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-black mb-2">Borçlarım</h3>
              <p className="text-white/90 text-sm font-medium">Borç detayları ve ödemeler</p>
              
              <div className="mt-4 flex justify-center group-hover:translate-x-2 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </button>

          {/* Raporlar */}
          <button
            onClick={() => router.push('/reports')}
            className="group relative overflow-hidden bg-linear-to-br from-amber-500 via-orange-600 to-red-600 rounded-3xl shadow-2xl p-6 sm:p-8 text-white transform transition-all duration-500 hover:scale-105 hover:shadow-3xl sm:col-span-2 lg:col-span-1"
          >
            {/* Chart Background Animation */}
            <div className="absolute bottom-4 right-4 flex items-end space-x-1 opacity-20 group-hover:opacity-40 transition-opacity">
              <div className="w-2 bg-white rounded-t animate-pulse" style={{ height: '16px' }}></div>
              <div className="w-2 bg-white rounded-t animate-pulse" style={{ height: '24px', animationDelay: '0.2s' }}></div>
              <div className="w-2 bg-white rounded-t animate-pulse" style={{ height: '20px', animationDelay: '0.4s' }}></div>
              <div className="w-2 bg-white rounded-t animate-pulse" style={{ height: '28px', animationDelay: '0.6s' }}></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 mb-4 mx-auto w-fit shadow-lg group-hover:scale-110 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black mb-2">Raporlar & Analiz</h3>
              <p className="text-white/90 text-sm font-medium">Detaylı istatistikler</p>
              
              <div className="mt-4 flex justify-center group-hover:translate-x-2 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3l3 3l4-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-4l-4-4M16 21l4-4l-4-4" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Ultra Premium Borç ve Alacak Detayları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Premium Borçlar Kartı */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-linear-to-br from-red-500 to-pink-600 rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Borçlarınız</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">{balance.debts.length} kişiye borçlu</span>
                  {balance.debts.length > 0 && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>

            {balance.debts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-8xl mb-6">🎉</div>
                <h4 className="text-2xl font-black text-gray-900 mb-3">Harika!</h4>
                <p className="text-gray-600 font-medium text-lg">Hiç borcunuz bulunmuyor</p>
                <div className="mt-6 bg-green-50 rounded-2xl p-4 border border-green-200">
                  <p className="text-green-700 font-semibold text-sm">✨ Temiz hesap, rahat kalp!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {balance.debts.map((debt, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden bg-linear-to-br from-red-50 via-pink-50 to-red-50 rounded-2xl border-2 border-red-100 p-4 sm:p-6 hover:border-red-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Background Pattern */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-red-200/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-pink-600 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {debt.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-xl mb-1">{debt.user.name}</p>
                          <p className="text-sm text-gray-500 font-medium">@{debt.user.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-red-600 mb-1">₺{debt.totalAmount.toFixed(2)}</p>
                        <div className="flex items-center gap-1 text-red-500 font-bold text-xs">
                          <span>📤</span>
                          <span>Ödeyeceksiniz</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Premium Alacaklar Kartı */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Alacaklarınız</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">{balance.credits.length} kişiden alacak</span>
                  {balance.credits.length > 0 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>

            {balance.credits.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-8xl mb-6">💰</div>
                <h4 className="text-2xl font-black text-gray-900 mb-3">Temiz!</h4>
                <p className="text-gray-600 font-medium text-lg">Henüz alacağınız bulunmuyor</p>
                <div className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-200">
                  <p className="text-blue-700 font-semibold text-sm">💡 Fatura paylaştıkça alacak oluşacak</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {balance.credits.map((credit, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden bg-linear-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl border-2 border-green-100 p-4 sm:p-6 hover:border-green-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Background Pattern */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-200/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {credit.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-xl mb-1">{credit.user.name}</p>
                          <p className="text-sm text-gray-500 font-medium">@{credit.user.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-green-600 mb-1">₺{credit.totalAmount.toFixed(2)}</p>
                        <div className="flex items-center gap-1 text-green-500 font-bold text-xs">
                          <span>📥</span>
                          <span>Alacaksınız</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default DashboardPage;
