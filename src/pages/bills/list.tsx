import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

const BillListPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchBills();
    }
  }, [user, authLoading, router]);

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills/list');
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills || []);
      }
    } catch (error) {
      toast.error('Faturalar alınamadı');
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
        <title>Fatura Listesi - Bill Split</title>
      </Head>

      <Layout title="Fatura Listesi">
        {bills.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-linear-to-br from-gray-400 to-gray-600 rounded-3xl p-6 shadow-lg">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v1m3 0h6m3 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V8m3 0V7a2 2 0 012-2h3a2 2 0 012 2v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Henüz fatura yok</h3>
                <p className="text-gray-600 mb-6">İlk faturanızı yüklemek için butona tıklayın</p>
                <Button
                  onClick={() => router.push('/bills/upload')}
                  className="bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Fatura Yükle
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bills.map((bill) => (
              <div
                key={bill._id}
                className="group bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-gray-100 hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer"
                onClick={() => router.push(`/bills/${bill._id}`)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v1m3 0h6m3 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V8m3 0V7a2 2 0 012-2h3a2 2 0 012 2v1" />
                    </svg>
                  </div>
                  <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    {bill.participants?.length || 0} Kişi
                  </div>
                </div>

                {/* Market Adı */}
                <div className="mb-4">
                  <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    {bill.market_adi || 'Market Belirtilmemiş'}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">{bill.tarih}</p>
                </div>

                {/* Tutar */}
                <div className="mb-6">
                  <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Toplam Tutar</p>
                    <p className="text-2xl font-black text-green-700">₺{bill.toplam_tutar.toFixed(2)}</p>
                  </div>
                </div>

                {/* Yükleyen */}
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                      {(bill.uploadedBy?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Yükleyen</p>
                      <p className="text-sm font-bold text-gray-900">{bill.uploadedBy?.name || 'Bilinmiyor'}</p>
                    </div>
                  </div>
                </div>

                {/* Katılımcılar */}
                {bill.participants && bill.participants.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Katılımcılar</p>
                    <div className="flex flex-wrap gap-1">
                      {bill.participants.slice(0, 3).map((participant: any, index: number) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full"
                        >
                          {participant.name}
                        </span>
                      ))}
                      {bill.participants.length > 3 && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                          +{bill.participants.length - 3} kişi
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/bills/${bill._id}`);
                    }}
                    className="flex-1 bg-linear-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-xl font-bold text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    Detaylar
                  </button>
                  {(user?.userId === bill.uploadedBy?._id || user?.role === 'admin') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const confirmDelete = window.confirm('Bu faturayı silmek istediğinizden emin misiniz?');
                        if (confirmDelete) {
                          fetch(`/api/bills/${bill._id}`, { method: 'DELETE' })
                            .then(() => {
                              toast.success('Fatura silindi');
                              fetchBills();
                            })
                            .catch(() => toast.error('Silme işlemi başarısız'));
                        }
                      }}
                      className="bg-red-100 text-red-600 hover:bg-red-200 py-2 px-4 rounded-xl font-bold text-sm hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </>
  );
};

export default BillListPage;
