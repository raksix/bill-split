import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface Transaction {
  _id: string;
  billId: {
    _id: string;
    market_adi: string;
    tarih: string;
    toplam_tutar: number;
  };
  fromUser: {
    _id: string;
    name: string;
    username: string;
  };
  toUser: {
    _id: string;
    name: string;
    username: string;
  };
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
}

interface DebtSummary {
  totalDebt: number;
  totalCredit: number;
  unpaidDebts: Transaction[];
  unpaidCredits: Transaction[];
  paidTransactions: Transaction[];
}

const DebtsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [debtData, setDebtData] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'debts' | 'credits' | 'history'>('debts');
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
    amount: string;
  }>({
    isOpen: false,
    transaction: null,
    amount: ''
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchDebts();
      }
    }
  }, [user, authLoading, router]);

  const fetchDebts = async () => {
    try {
      const response = await fetch('/api/transactions/debts');
      if (response.ok) {
        const apiResponse = await response.json();
        // API'den gelen veriyi client'ın beklediği yapıya dönüştür
        const transformedData: DebtSummary = {
          totalDebt: apiResponse.data?.summary?.totalIOwe || 0,
          totalCredit: apiResponse.data?.summary?.totalOwedToMe || 0,
          unpaidDebts: (apiResponse.data?.myDebts || []).map((debt: any) => ({
            _id: debt.transactionId,
            amount: debt.amount,
            billId: debt.billId || { market_adi: 'Bilinmiyor', tarih: '', toplam_tutar: 0 },
            fromUser: { name: 'Ben', username: user?.username || '' },
            toUser: debt.creditor || { name: 'Bilinmiyor', username: '' },
            isPaid: false,
            createdAt: debt.createdAt
          })),
          unpaidCredits: (apiResponse.data?.debtsToMe || []).map((credit: any) => ({
            _id: credit.transactionId,
            amount: credit.amount,
            billId: credit.billId || { market_adi: 'Bilinmiyor', tarih: '', toplam_tutar: 0 },
            fromUser: credit.debtor || { name: 'Bilinmiyor', username: '' },
            toUser: { name: user?.name || 'Ben', username: user?.username || '' },
            isPaid: false,
            createdAt: credit.createdAt
          })),
          paidTransactions: []
        };
        setDebtData(transformedData);
      } else {
        toast.error('Borç bilgileri alınamadı');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDebt = async () => {
    if (!paymentModal.transaction || !paymentModal.amount) {
      toast.error('Lütfen ödeme tutarını girin');
      return;
    }

    const paymentAmount = parseFloat(paymentModal.amount);
    if (paymentAmount <= 0 || paymentAmount > paymentModal.transaction.amount) {
      toast.error('Geçersiz ödeme tutarı');
      return;
    }

    try {
      const response = await fetch('/api/transactions/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: paymentModal.transaction._id,
          amount: paymentAmount,
        }),
      });

      if (response.ok) {
        toast.success('Ödeme başarıyla kaydedildi');
        setPaymentModal({ isOpen: false, transaction: null, amount: '' });
        fetchDebts(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Ödeme kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const openPaymentModal = (transaction: Transaction) => {
    setPaymentModal({
      isOpen: true,
      transaction,
      amount: transaction.amount.toString()
    });
  };

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  if (!debtData) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Borçlarım - Bill Split</title>
      </Head>

      <Layout>
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-linear-to-br from-red-600 via-pink-600 to-purple-600 rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2">Borç Yönetimi</h1>
                <p className="text-white/80 text-lg font-medium">Borçlarınızı ve alacaklarınızı yönetin</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 text-center">
                <p className="text-white/80 text-sm font-bold uppercase tracking-wider mb-1">Toplam Borcum</p>
                <p className="text-2xl font-black text-red-200">₺{(debtData.totalDebt || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 text-center">
                <p className="text-white/80 text-sm font-bold uppercase tracking-wider mb-1">Toplam Alacağım</p>
                <p className="text-2xl font-black text-green-200">₺{(debtData.totalCredit || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTab('debts')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
              activeTab === 'debts'
                ? 'bg-linear-to-r from-red-600 to-pink-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Borçlarım ({debtData.unpaidDebts.length})
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
              activeTab === 'credits'
                ? 'bg-linear-to-r from-green-600 to-emerald-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alacaklarım ({debtData.unpaidCredits.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
              activeTab === 'history'
                ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Geçmiş ({debtData.paidTransactions.length})
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'debts' && (
            <>
              {debtData.unpaidDebts.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
                  <div className="bg-green-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Hiç borcunuz yok!</h3>
                  <p className="text-gray-600">Tüm borçlarınızı ödemiş durumdasınız.</p>
                </div>
              ) : (
                debtData.unpaidDebts.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-red-100 hover:shadow-3xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-gray-900">
                            {transaction.toUser.name} kişisine borçlusunuz
                          </h4>
                          <p className="text-sm text-gray-500">@{transaction.toUser.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-red-600">₺{transaction.amount.toFixed(2)}</p>
                        <Button
                          onClick={() => openPaymentModal(transaction)}
                          className="mt-2 bg-linear-to-r from-green-600 to-emerald-600 text-white text-sm"
                        >
                          Borç Öde
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura</p>
                          <p className="text-gray-900 font-semibold">{transaction.billId?.market_adi || 'Bilinmiyor'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Tarih</p>
                          <p className="text-gray-900 font-semibold">{transaction.billId?.tarih || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura Toplamı</p>
                          <p className="text-gray-900 font-semibold">₺{(transaction.billId?.toplam_tutar || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'credits' && (
            <>
              {debtData.unpaidCredits.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
                  <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Henüz alacağınız yok</h3>
                  <p className="text-gray-600">Kimse size borcu olmadığı için alacağınız bulunmuyor.</p>
                </div>
              ) : (
                debtData.unpaidCredits.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-green-100 hover:shadow-3xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-gray-900">
                            {transaction.fromUser.name} size borçlu
                          </h4>
                          <p className="text-sm text-gray-500">@{transaction.fromUser.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-green-600">₺{transaction.amount.toFixed(2)}</p>
                        <div className="mt-2 bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-bold">
                          Ödeme Bekleniyor
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura</p>
                          <p className="text-gray-900 font-semibold">{transaction.billId?.market_adi || 'Bilinmiyor'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Tarih</p>
                          <p className="text-gray-900 font-semibold">{transaction.billId?.tarih || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura Toplamı</p>
                          <p className="text-gray-900 font-semibold">₺{(transaction.billId?.toplam_tutar || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {debtData.paidTransactions.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
                  <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V4l3 4H9l3-4v4zm0 0v4l-3-4h6l-3 4zm0 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Henüz ödeme geçmişi yok</h3>
                  <p className="text-gray-600">Hiç ödeme yapmadınız veya ödeme almadınız.</p>
                </div>
              ) : (
                debtData.paidTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-blue-100 hover:shadow-3xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-gray-900">
                            {user?.userId === transaction.fromUser._id 
                              ? `${transaction.toUser.name} kişisine ödedim`
                              : `${transaction.fromUser.name} kişisinden aldım`
                            }
                          </h4>
                          <p className="text-sm text-gray-500">
                            {transaction.paidAt && new Date(transaction.paidAt).toLocaleDateString('tr-TR')} tarihinde ödendi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-600">₺{transaction.amount.toFixed(2)}</p>
                        <div className="mt-2 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">
                          ✅ Ödendi
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura</p>
                          <p className="text-gray-900 font-semibold">{transaction.billId?.market_adi || 'Bilinmiyor'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura Tarihi</p>
                          <p className="text-gray-900 font-semibold">{transaction.billId?.tarih || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold mb-1">Fatura Toplamı</p>
                          <p className="text-gray-900 font-semibold">₺{(transaction.billId?.toplam_tutar || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Payment Modal */}
        {paymentModal.isOpen && paymentModal.transaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Borç Ödeme</h3>
                  <p className="text-sm text-gray-500">
                    {paymentModal.transaction.toUser.name} kişisine ödeme yapın
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ödeme Tutarı</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={paymentModal.amount}
                      onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                      step="0.01"
                      max={paymentModal.transaction.amount}
                      className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors bg-white shadow-sm text-lg font-bold"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">₺</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimum: ₺{paymentModal.transaction.amount.toFixed(2)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="font-bold text-gray-900 text-sm mb-2">Fatura Detayları:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Market:</span>
                      <span className="font-semibold">{paymentModal.transaction.billId?.market_adi || 'Bilinmiyor'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tarih:</span>
                      <span className="font-semibold">{paymentModal.transaction.billId?.tarih || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Toplam:</span>
                      <span className="font-semibold">₺{(paymentModal.transaction.billId?.toplam_tutar || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setPaymentModal({ isOpen: false, transaction: null, amount: '' })}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button
                  onClick={handlePayDebt}
                  className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 text-white"
                >
                  Ödemeyi Kaydet
                </Button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
};

export default DebtsPage;