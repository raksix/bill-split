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
        <Card>
          {bills.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Henüz fatura yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yükleyen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Katılımcılar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.market_adi}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.tarih}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₺{bill.toplam_tutar.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.uploadedBy?.name || 'Bilinmiyor'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {bill.participants?.map((p: any) => p.name).join(', ') || '-'}
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

export default BillListPage;
