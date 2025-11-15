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

  const [bulkPaymentModal, setBulkPaymentModal] = useState<{
    isOpen: boolean;
    toUserId: string | null;
    toUserName: string | null;
    totalAmount: string;
    currentDebt: number;
    theirDebt: number;
  }>({
    isOpen: false,
    toUserId: null,
    toUserName: null,
    totalAmount: '',
    currentDebt: 0,
    theirDebt: 0
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchDebts();
      }
    }
  }, [authLoading, user, router]);

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
            billId: debt.billId, // Artık API'den populate edilmiş olarak geliyor
            fromUser: { _id: user?.userId || '', name: 'Ben', username: user?.username || '' },
            toUser: { 
              _id: debt.creditor?._id || '', 
              name: debt.creditor?.name || 'Bilinmiyor', 
              username: debt.creditor?.username || '' 
            },
            isPaid: false,
            createdAt: debt.createdAt
          })),
          unpaidCredits: (apiResponse.data?.debtsToMe || []).map((credit: any) => ({
            _id: credit.transactionId,
            amount: credit.amount,
            billId: credit.billId, // Artık API'den populate edilmiş olarak geliyor
            fromUser: { 
              _id: credit.debtor?._id || '', 
              name: credit.debtor?.name || 'Bilinmiyor', 
              username: credit.debtor?.username || '' 
            },
            toUser: { _id: user?.userId || '', name: user?.name || 'Ben', username: user?.username || '' },
            isPaid: false,
            createdAt: credit.createdAt
          })),
          paidTransactions: (apiResponse.data?.paidTransactions || []).map((paid: any) => {
            console.log('🔍 Processing paid transaction:', {
              transactionId: paid.transactionId,
              amount: paid.amount,
              isMyPayment: paid.isMyPayment,
              creditor: paid.creditor,
              debtor: paid.debtor,
              currentUserId: user?.userId
            });
            
            return {
              _id: paid.transactionId,
              amount: paid.amount,
              isPaid: paid.isPaid,
              paidAt: paid.paidAt,
              billId: paid.billId,
              fromUser: paid.isMyPayment 
                ? { _id: user?.userId || '', name: 'Ben', username: user?.username || '' }
                : paid.debtor,
              toUser: paid.isMyPayment 
                ? paid.creditor 
                : { _id: user?.userId || '', name: 'Ben', username: user?.username || '' },
              isMyPayment: paid.isMyPayment, // Bu bilgiyi saklayalım
              createdAt: paid.createdAt
            };
          })
        };
        console.log('📊 Debt data transformed:', {
          originalResponse: apiResponse,
          transformedData,
          unpaidDebtsCount: transformedData.unpaidDebts.length,
          unpaidCreditsCount: transformedData.unpaidCredits.length
        });
        
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

  const openBulkPaymentModal = async (toUserId: string, toUserName: string) => {
    // Basit kontrol
    if (!toUserId || !toUserName) {
      toast.error('Kullanıcı bilgileri eksik');
      return;
    }

    if (!debtData) {
      toast.error('Borç bilgileri henüz yüklenmedi');
      return;
    }

    // Bu kişiye olan toplam borcumuzu hesapla
    const myDebtToThisPerson = debtData.unpaidDebts
      .filter(debt => debt.toUser._id === toUserId)
      .reduce((sum, debt) => sum + debt.amount, 0);

    // Bu kişinin bize olan toplam borcunu hesapla
    const theirDebtToMe = debtData.unpaidCredits
      .filter(credit => credit.fromUser._id === toUserId)
      .reduce((sum, credit) => sum + credit.amount, 0);

    // Net borcu hesapla
    const netDebt = Math.max(0, myDebtToThisPerson - theirDebtToMe);

    // State'i set et
    const newModalState = {
      isOpen: true,
      toUserId: toUserId,
      toUserName: toUserName,
      totalAmount: netDebt > 0 ? netDebt.toString() : '',
      currentDebt: myDebtToThisPerson,
      theirDebt: theirDebtToMe
    };

    setBulkPaymentModal(newModalState);
  };

  const markAsReceived = async (transactionId: string) => {
    try {
      const response = await fetch('/api/transactions/mark-received', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
      });

      if (response.ok) {
        toast.success('Ödeme alındı olarak işaretlendi');
        fetchDebts(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.message || 'İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleBulkPayment = async () => {
    console.log('🔄 handleBulkPayment çağrıldı:', {
      isOpen: bulkPaymentModal.isOpen,
      toUserId: bulkPaymentModal.toUserId,
      toUserName: bulkPaymentModal.toUserName,
      totalAmount: bulkPaymentModal.totalAmount,
      totalAmountType: typeof bulkPaymentModal.totalAmount,
      totalAmountLength: bulkPaymentModal.totalAmount?.length,
      currentDebt: bulkPaymentModal.currentDebt,
      theirDebt: bulkPaymentModal.theirDebt
    });

    // Modal açık mı kontrol et
    if (!bulkPaymentModal.isOpen) {
      toast.error('Modal açık değil');
      return;
    }

    // Kullanıcı ID kontrolü
    if (!bulkPaymentModal.toUserId) {
      toast.error('Kullanıcı seçilmedi');
      return;
    }

    // Tutar kontrolü
    if (!bulkPaymentModal.totalAmount || bulkPaymentModal.totalAmount.trim() === '') {
      toast.error('Lütfen ödeme tutarını girin');
      return;
    }

    const paymentAmount = parseFloat(bulkPaymentModal.totalAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Geçersiz ödeme tutarı');
      return;
    }

    try {
      console.log('💸 Bulk payment request:', {
        toUserId: bulkPaymentModal.toUserId,
        paymentAmount,
        currentDebt: bulkPaymentModal.currentDebt,
        theirDebt: bulkPaymentModal.theirDebt
      });

      const response = await fetch('/api/transactions/bulk-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentType: 'bulk',
          payments: [{
            toUserId: bulkPaymentModal.toUserId,
            amount: paymentAmount
          }],
          totalAmount: paymentAmount
        }),
      });

      if (response.ok) {
        const result = await response.json();
        let message = `₺${result.totalPaid.toFixed(2)} ödeme başarıyla işlendi`;
        
        if (result.nettingAmount > 0) {
          message += ` (₺${result.nettingAmount.toFixed(2)} karşılıklı mahsup)`;
        }
        
        if (result.unusedAmount > 0) {
          message += `. ₺${result.unusedAmount.toFixed(2)} kullanılmadı`;
        }

        toast.success(message);
        setBulkPaymentModal({ 
          isOpen: false, 
          toUserId: null, 
          toUserName: null, 
          totalAmount: '', 
          currentDebt: 0, 
          theirDebt: 0 
        });
        fetchDebts(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Ödeme işlenemedi');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
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
                // Borçları kişi bazında grupla - ESKİ HALİNE DÖN
                (() => {
                  console.log('🔍 Unpaid debts:', debtData.unpaidDebts);
                  
                  const groupedDebts = debtData.unpaidDebts.reduce((groups: Record<string, Transaction[]>, transaction) => {
                    const userId = transaction.toUser._id; // Eskisi gibi basit erişim
                    
                    if (!groups[userId]) {
                      groups[userId] = [];
                    }
                    groups[userId].push(transaction);
                    return groups;
                  }, {});
                  
                  console.log('🔍 Grouped debts:', groupedDebts);

                  return Object.entries(groupedDebts).map(([userId, transactions]) => {
                    const totalDebtToPerson = transactions.reduce((sum, t) => sum + t.amount, 0);
                    const firstTransaction = transactions[0];
                    
                    // Bu kişinin bize olan borcu
                    const theirDebtToMe = debtData.unpaidCredits
                      .filter(credit => credit.fromUser._id === userId)
                      .reduce((sum, credit) => sum + credit.amount, 0);

                    return (
                      <div key={userId} className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-red-100 hover:shadow-3xl transition-all duration-300">
                        {/* Kişi Header */}
                        <div className="p-6 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-gray-900">
                                  {firstTransaction.toUser.name}
                                </h4>
                                <p className="text-sm text-gray-500">@{firstTransaction.toUser.username}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-red-600">₺{totalDebtToPerson.toFixed(2)}</p>
                              <p className="text-sm text-gray-500">{transactions.length} fatura</p>
                            </div>
                          </div>

                          {/* Karşılıklı borç durumu */}
                          {theirDebtToMe > 0 && (
                            <div className="bg-blue-50 rounded-2xl p-3 mb-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-blue-700">Bu kişinin size borcu:</span>
                                <span className="text-lg font-black text-blue-600">₺{theirDebtToMe.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm font-bold text-green-700">Net borcunuz:</span>
                                <span className="text-lg font-black text-green-600">
                                  ₺{Math.max(0, totalDebtToPerson - theirDebtToMe).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Toplu Ödeme Butonu */}
                          <div className="flex gap-3">
                            <Button
                              onClick={() => openBulkPaymentModal(userId, firstTransaction.toUser.name)}
                              className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 text-white font-bold"
                            >
                              💰 Toplu Ödeme Yap
                            </Button>
                          </div>
                        </div>

                        {/* Fatura Detayları */}
                        <div className="p-6 space-y-4">
                          {transactions.map((transaction) => (
                            <div key={transaction._id} className="bg-gray-50 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-bold text-gray-900">{transaction.billId?.market_adi || 'Bilinmiyor'}</h5>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-red-600">₺{transaction.amount.toFixed(2)}</p>
                                  <Button
                                    onClick={() => openPaymentModal(transaction)}
                                    size="sm"
                                    className="bg-linear-to-r from-blue-500 to-purple-500 text-white text-xs mt-1"
                                  >
                                    Tek Öde
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
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
                          ))}
                        </div>
                      </div>
                    );
                  }); // filter(Boolean) kaldırıldı - hiçbir şeyi filtreleme
                })()
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
                        <div className="mt-2 space-y-2">
                          <div className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-bold">
                            Ödeme Bekleniyor
                          </div>
                          <Button
                            onClick={() => markAsReceived(transaction._id)}
                            size="sm"
                            className="bg-linear-to-r from-green-500 to-emerald-500 text-white text-xs w-full"
                          >
                            ✅ Ödendi
                          </Button>
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
                            {(transaction as any).isMyPayment 
                              ? `${transaction.toUser.name} kişisine ödeme yaptım`
                              : `${transaction.fromUser.name} kişisinden ödeme aldım`
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

        {/* Bulk Payment Modal */}
        {bulkPaymentModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="bg-linear-to-r from-green-500 to-emerald-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Toplu Ödeme</h3>
                <p className="text-gray-600">
                  {bulkPaymentModal.toUserName} kişisine toplu ödeme yapın
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Borç Durumu Özeti */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="font-bold text-gray-900 text-sm mb-3">Borç Durumu:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-600 font-bold">Toplam borcunuz:</span>
                      <span className="font-black text-red-600">₺{bulkPaymentModal.currentDebt.toFixed(2)}</span>
                    </div>
                    {bulkPaymentModal.theirDebt > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-blue-600 font-bold">Onların size borcu:</span>
                          <span className="font-black text-blue-600">₺{bulkPaymentModal.theirDebt.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                          <span className="text-green-600 font-bold">Net borcunuz:</span>
                          <span className="font-black text-green-600">
                            ₺{Math.max(0, bulkPaymentModal.currentDebt - bulkPaymentModal.theirDebt).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Ödeme Tutarı */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ödeyeceğiniz Tutar</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bulkPaymentModal.totalAmount}
                      onChange={(e) => setBulkPaymentModal({ ...bulkPaymentModal, totalAmount: e.target.value })}
                      step="0.01"
                      min="0.01"
                      className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors bg-white shadow-sm text-lg font-bold"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">₺</span>
                  </div>
                  
                  {/* Net Borç Bilgisi */}
                  <div className="mt-2 p-3 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-green-700">Net borcunuz:</span>
                      <span className="text-lg font-black text-green-600">
                        ₺{Math.max(0, bulkPaymentModal.currentDebt - bulkPaymentModal.theirDebt).toFixed(2)}
                      </span>
                    </div>
                    {bulkPaymentModal.theirDebt > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Karşılıklı mahsup ile ₺{bulkPaymentModal.theirDebt.toFixed(2)} düşüldü
                      </p>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    İstediğiniz tutarı girebilirsiniz. Sistem önce karşılıklı mahsup yapar, sonra borçlarınızı öder.
                  </p>
                </div>

                {/* Açıklama */}
                <div className="bg-blue-50 rounded-2xl p-4">
                  <h4 className="font-bold text-blue-900 text-sm mb-2">Nasıl Çalışır?</h4>
                  <ol className="text-xs text-blue-800 space-y-1">
                    <li>1. Önce karşılıklı borçlar mahsup edilir</li>
                    <li>2. Kalan tutar size olan borçlarınızı öder</li>
                    <li>3. Artan tutar varsa iade edilir</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setBulkPaymentModal({ 
                    isOpen: false, 
                    toUserId: null, 
                    toUserName: null, 
                    totalAmount: '', 
                    currentDebt: 0, 
                    theirDebt: 0 
                  })}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleBulkPayment}
                  className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 text-white"
                >
                  Toplu Ödeme Yap
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