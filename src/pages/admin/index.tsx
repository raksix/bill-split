import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

const AdminPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalBills: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      } else {
        fetchStats();
      }
    }
  }, [user, authLoading, router]);

  const fetchStats = async () => {
    try {
      const [usersRes, billsRes] = await Promise.all([
        fetch('/api/users/list'),
        fetch('/api/bills/list'),
      ]);

      if (usersRes.ok && billsRes.ok) {
        const usersData = await usersRes.json();
        const billsData = await billsRes.json();
        
        setStats({
          totalUsers: usersData.users?.length || 0,
          totalBills: billsData.bills?.length || 0,
        });
      }
    } catch (error) {
      toast.error('İstatistikler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Head>
        <title>Admin Panel - Bill Split</title>
      </Head>

      <Layout>
        {/* Hero Admin Header */}
        <div className="relative overflow-hidden bg-linear-to-br from-purple-700 via-pink-600 to-red-600 rounded-3xl shadow-2xl p-10 mb-10 text-white">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-5xl font-black mb-3 tracking-tight">
                    Admin Panel
                    <span className="ml-3 text-4xl">👑</span>
                  </h1>
                  <p className="text-white/90 text-xl font-medium">
                    Hoş geldin, <span className="font-bold text-yellow-200">{user?.name}</span>! 
                  </p>
                  <p className="text-white/70 text-lg mt-1">Sistem kontrol merkezi</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                  <p className="text-white/80 text-sm uppercase tracking-wider font-semibold">Sistem Durumu</p>
                  <p className="text-2xl font-black text-green-300 mt-1">🟢 Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Kullanıcı İstatistiği - Glassmorphism Style */}
          <div className="group relative overflow-hidden bg-linear-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-3xl shadow-2xl p-8 text-white transform transition-all duration-500 hover:scale-110 hover:rotate-1 hover:shadow-3xl">
            {/* Glowing Border Effect */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-400/30 to-cyan-400/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-blue-100 text-xs font-bold uppercase tracking-wider">USERS</span>
                  <p className="text-blue-200 text-sm font-medium">Active Members</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-6xl font-black mb-3 bg-clip-text text-transparent bg-linear-to-r from-white to-blue-100">
                  {stats.totalUsers}
                </p>
                <p className="text-blue-100 text-base font-semibold">Toplam Kayıtlı Kullanıcı</p>
                <div className="mt-4 bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 w-3/4 group-hover:w-full transition-all duration-1000"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Fatura İstatistiği - Enhanced Design */}
          <div className="group relative overflow-hidden bg-linear-to-br from-purple-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white transform transition-all duration-500 hover:scale-110 hover:-rotate-1 hover:shadow-3xl">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-4 w-20 h-20 bg-white rounded-full animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-purple-100 text-xs font-bold uppercase tracking-wider">BILLS</span>
                  <p className="text-purple-200 text-sm font-medium">Total Invoices</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-6xl font-black mb-3 bg-clip-text text-transparent bg-linear-to-r from-white to-purple-100">
                  {stats.totalBills}
                </p>
                <p className="text-purple-100 text-base font-semibold">Yüklenen Fatura Sayısı</p>
                <div className="mt-4 flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sistem Durumu - Ultra Premium */}
          <div className="group relative overflow-hidden bg-linear-to-br from-green-500 via-emerald-600 to-teal-600 rounded-3xl shadow-2xl p-8 text-white transform transition-all duration-500 hover:scale-110 hover:shadow-3xl">
            {/* Pulsing Background */}
            <div className="absolute inset-0 bg-linear-to-br from-green-400/20 to-teal-400/20 animate-pulse"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-white/25 backdrop-blur-lg rounded-2xl p-4 shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.25-4.5a9 9 0 11-7.5 16.5c-1.105 0-2.25-.15-3.75-.25m15.75-8.25l.75 15" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-green-100 text-xs font-bold uppercase tracking-wider">STATUS</span>
                  <p className="text-green-200 text-sm font-medium">System Health</p>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-4 h-4 bg-green-300 rounded-full animate-pulse mr-3"></div>
                  <p className="text-4xl font-black">ONLINE</p>
                </div>
                <p className="text-green-100 text-base font-semibold">Tüm Sistemler Aktif</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="h-3 bg-green-300 rounded-full animate-pulse"></div>
                  <div className="h-3 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="h-3 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Premium Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <button
            onClick={() => router.push('/admin/users')}
            className="group relative overflow-hidden bg-linear-to-br from-blue-50 via-white to-cyan-50 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transform transition-all duration-500 hover:scale-110 hover:-translate-y-3 border border-blue-100"
          >
            {/* Glowing Background Effect */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            
            {/* Floating Particles */}
            <div className="absolute top-4 right-4 w-3 h-3 bg-blue-300 rounded-full animate-ping"></div>
            <div className="absolute top-8 right-8 w-2 h-2 bg-cyan-300 rounded-full animate-pulse"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-6">
                <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                    Kullanıcı Yönetimi
                  </h3>
                  <p className="text-gray-600 font-medium">Tüm kullanıcıları düzenle ve yönet</p>
                </div>
              </div>
              
              {/* Stats Preview */}
              <div className="bg-blue-50 rounded-2xl p-4 mb-6 group-hover:bg-blue-100 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-semibold text-sm">Aktif Kullanıcılar</span>
                  <span className="text-2xl font-black text-blue-800">{stats.totalUsers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-end text-blue-600 font-bold text-lg group-hover:gap-3 transition-all group-hover:translate-x-2">
                <span>Yönet</span>
                <svg className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/bills/list')}
            className="group relative overflow-hidden bg-linear-to-br from-purple-50 via-white to-pink-50 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transform transition-all duration-500 hover:scale-110 hover:-translate-y-3 border border-purple-100"
          >
            {/* Animated Background Shapes */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full opacity-20 group-hover:opacity-40 group-hover:scale-150 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-pink-200 rounded-full opacity-20 group-hover:opacity-40 group-hover:scale-125 transition-all duration-700"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-6">
                <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl p-5 shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                    Fatura Yönetimi
                  </h3>
                  <p className="text-gray-600 font-medium">Tüm faturaları görüntüle ve yönet</p>
                </div>
              </div>
              
              {/* Stats Preview */}
              <div className="bg-purple-50 rounded-2xl p-4 mb-6 group-hover:bg-purple-100 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-purple-700 font-semibold text-sm">Toplam Faturalar</span>
                  <span className="text-2xl font-black text-purple-800">{stats.totalBills}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-end text-purple-600 font-bold text-lg group-hover:gap-3 transition-all group-hover:translate-x-2">
                <span>Görüntüle</span>
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="group relative overflow-hidden bg-linear-to-br from-green-50 via-white to-emerald-50 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transform transition-all duration-500 hover:scale-110 hover:-translate-y-3 border border-green-100"
          >
            {/* Chart Animation Background */}
            <div className="absolute bottom-6 right-6 flex items-end space-x-1 opacity-20 group-hover:opacity-50 transition-opacity">
              <div className="w-3 bg-green-400 rounded-t animate-pulse" style={{ height: '25px' }}></div>
              <div className="w-3 bg-green-500 rounded-t animate-pulse" style={{ height: '35px', animationDelay: '0.2s' }}></div>
              <div className="w-3 bg-green-600 rounded-t animate-pulse" style={{ height: '30px', animationDelay: '0.4s' }}></div>
              <div className="w-3 bg-green-700 rounded-t animate-pulse" style={{ height: '40px', animationDelay: '0.6s' }}></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-6">
                <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-5 shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                    Raporlar & Analiz
                  </h3>
                  <p className="text-gray-600 font-medium">Detaylı istatistikleri incele</p>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="bg-green-50 rounded-2xl p-4 mb-6 group-hover:bg-green-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-700 font-semibold text-sm">Veri Analizi</span>
                  <span className="text-green-600 text-xs font-bold">%100</span>
                </div>
                <div className="bg-green-200 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2 w-full group-hover:animate-pulse"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-end text-green-600 font-bold text-lg group-hover:gap-3 transition-all group-hover:translate-x-2">
                <span>İncele</span>
                <svg className="w-6 h-6 group-hover:scale-125 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 12l3-3l3 3l4-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 21l4-4l-4-4M16 21l4-4l-4-4" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Ultra Premium Sistem Bilgileri */}
        <div className="bg-linear-to-br from-white via-gray-50 to-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl p-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">Sistem Durumu</h3>
              <p className="text-gray-600 font-medium">Canlı sistem metrikleri ve bilgileri</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Admin Profil Kartı */}
            <div className="group relative overflow-hidden bg-linear-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-200">
              <div className="absolute top-3 right-3 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-500 rounded-xl p-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-blue-700 font-semibold text-sm uppercase tracking-wider">Admin</span>
                </div>
                <p className="text-2xl font-black text-blue-900 mb-2">{user?.username}</p>
                <p className="text-blue-600 text-sm font-medium">Sistem Yöneticisi</p>
                <div className="mt-4 bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2 w-full group-hover:animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Yetki Seviyesi Kartı */}
            <div className="group relative overflow-hidden bg-linear-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-200">
              <div className="absolute top-0 right-0 w-8 h-8 bg-purple-300 rounded-full opacity-20 animate-ping"></div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-500 rounded-xl p-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <span className="text-purple-700 font-semibold text-sm uppercase tracking-wider">Yetki</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-2xl font-black text-purple-900">Süper Admin</p>
                  <span className="text-2xl">👑</span>
                </div>
                <p className="text-purple-600 text-sm font-medium">Tüm yetkilere sahip</p>
                <div className="mt-4 flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>

            {/* Sistem Versiyonu Kartı */}
            <div className="group relative overflow-hidden bg-linear-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-green-200">
              <div className="absolute bottom-2 right-2 w-6 h-6 border-2 border-green-300 rounded-full animate-spin opacity-30"></div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-500 rounded-xl p-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span className="text-green-700 font-semibold text-sm uppercase tracking-wider">Sistem</span>
                </div>
                <p className="text-2xl font-black text-green-900 mb-2">v1.0.0</p>
                <p className="text-green-600 text-sm font-medium">Güncel Versiyon</p>
                <div className="mt-4 bg-green-200 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2 w-4/5 group-hover:w-full transition-all duration-1000"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sistem Sağlık Göstergesi */}
          <div className="mt-8 bg-linear-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-bold text-lg">Tüm Sistemler Çalışıyor</span>
              </div>
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <span>Uptime: 99.9%</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default AdminPage;
