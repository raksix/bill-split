import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

const ReportsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const [billsRes, transactionsRes] = await Promise.all([
        fetch('/api/bills/list'),
        fetch('/api/transactions/history'),
      ]);

      if (billsRes.ok && transactionsRes.ok) {
        const billsData = await billsRes.json();
        const transactionsData = await transactionsRes.json();
        setBills(billsData.bills || []);
        setTransactions(transactionsData.transactions || []);
      }
    } catch (error) {
      toast.error('Veriler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = bills.reduce((sum, bill) => sum + bill.toplam_tutar, 0);
  const myBills = bills.filter(bill => bill.uploadedBy?._id === user?.userId);
  const mySpent = myBills.reduce((sum, bill) => sum + bill.toplam_tutar, 0);

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Head>
        <title>Raporlar - Bill Split</title>
      </Head>

      <Layout title="Raporlar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-blue-50 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Toplam Harcama</h3>
            <p className="text-3xl font-bold text-blue-600">₺{totalSpent.toFixed(2)}</p>
            <p className="text-sm text-blue-700 mt-1">{bills.length} fatura</p>
          </Card>

          <Card className="bg-purple-50 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Benim Harcamalarım</h3>
            <p className="text-3xl font-bold text-purple-600">₺{mySpent.toFixed(2)}</p>
            <p className="text-sm text-purple-700 mt-1">{myBills.length} fatura</p>
          </Card>

          <Card className="bg-green-50 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Toplam İşlem</h3>
            <p className="text-3xl font-bold text-green-600">{transactions.length}</p>
            <p className="text-sm text-green-700 mt-1">Borç/Alacak</p>
          </Card>
        </div>

        <Card title="Tüm Harcamalar">
          {bills.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Henüz harcama yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kim Ödedi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.tarih}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.market_adi}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.uploadedBy?.name || 'Bilinmiyor'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₺{bill.toplam_tutar.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Layout>
    </>
  );
};

export default ReportsPage;
