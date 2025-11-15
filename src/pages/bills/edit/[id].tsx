import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface BillItem {
  urun_adi: string;
  fiyat: number;
  isPersonal?: boolean;
}

interface User {
  _id: string;
  name: string;
  username: string;
}

const BillEditPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bill, setBill] = useState<any>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (id && user) {
      fetchBill();
      fetchUsers();
    }
  }, [user, authLoading, id, router]);

  const fetchBill = async () => {
    try {
      const response = await fetch(`/api/bills/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBill(data.bill);
        setItems(data.bill.urunler || []);
        const existingParticipants = data.bill.participants?.map((p: any) => p._id) || [];
        // Fatura sahibi her zaman participant'larda olmalı
        const finalParticipants = existingParticipants.includes(user?.userId) 
          ? existingParticipants 
          : [...existingParticipants, user?.userId];
        setSelectedUsers(finalParticipants);
      }
    } catch (error) {
      toast.error('Fatura alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.filter((u: any) => u.role === 'user'));
      }
    } catch (error) {
      console.error('Kullanıcılar alınamadı');
    }
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const toggleUser = (userId: string) => {
    // Fatura sahibi hiçbir zaman çıkarılamaz
    if (userId === user?.userId) {
      toast.error('Fatura sahibi her zaman dahil olmalıdır');
      return;
    }
    
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSave = async () => {
    if (selectedUsers.length === 0) {
      toast.error('En az bir kişi seçmelisiniz');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/bills/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: id,
          urunler: items,
          participants: selectedUsers,
        }),
      });

      if (response.ok) {
        toast.success('Fatura kaydedildi!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        const data = await response.json();
        toast.error(data.message || 'Fatura kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  const sharedTotal = items
    .filter(item => !item.isPersonal)
    .reduce((sum, item) => sum + item.fiyat, 0);

  const perPersonAmount = selectedUsers.length > 0 ? sharedTotal / selectedUsers.length : 0;

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Head>
        <title>Fatura Düzenle - Bill Split</title>
      </Head>

      <Layout title="Fatura Düzenle">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title={`${bill?.market_adi || 'Fatura'} - ${bill?.tarih}`}>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Input
                      value={item.urun_adi}
                      onChange={(e) => handleItemChange(index, 'urun_adi', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.fiyat}
                      onChange={(e) => handleItemChange(index, 'fiyat', parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={item.isPersonal || false}
                        onChange={(e) => handleItemChange(index, 'isPersonal', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Kişisel</span>
                    </label>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Katılımcılar">
              <div className="space-y-2">
                {users.map((u) => (
                  <label key={u._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u._id)}
                      onChange={() => toggleUser(u._id)}
                      className="rounded"
                    />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-sm text-gray-600">(@{u.username})</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Özet">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam Tutar:</span>
                  <span className="font-semibold">₺{items.reduce((sum, item) => sum + item.fiyat, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paylaşılan Tutar:</span>
                  <span className="font-semibold">₺{sharedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Katılımcı Sayısı:</span>
                  <span className="font-semibold">{selectedUsers.length}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg">
                  <span className="text-gray-800 font-semibold">Kişi Başı:</span>
                  <span className="text-blue-600 font-bold">₺{perPersonAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  fullWidth
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default BillEditPage;
