import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface Bill {
  _id: string;
  market_adi: string;
  tarih: string;
  urunler: Array<{
    urun_adi: string;
    fiyat: number;
    isPersonal?: boolean;
  }>;
  toplam_tutar: number;
  participants: Array<{
    _id: string;
    name: string;
    username: string;
  }>;
  uploadedBy: {
    _id: string;
    name: string;
    username: string;
  };
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const BillDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    market_adi: '',
    tarih: '',
    toplam_tutar: 0,
    urunler: [] as Array<{
      urun_adi: string;
      fiyat: number;
      isPersonal?: boolean;
    }>,
    participants: [] as string[]
  });
  const [allUsers, setAllUsers] = useState<Array<{_id: string; name: string; username: string}>>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (id) {
      fetchBill();
      fetchUsers();
    }
  }, [user, authLoading, id]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  };

  const fetchBill = async () => {
    try {
      const response = await fetch(`/api/bills/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBill(data.bill);
        setEditForm({
          market_adi: data.bill.market_adi,
          tarih: data.bill.tarih,
          toplam_tutar: data.bill.toplam_tutar,
          urunler: data.bill.urunler,
          participants: data.bill.participants.map((p: any) => p._id)
        });
      } else {
        toast.error('Fatura bulunamadı');
        router.push('/bills/list');
      }
    } catch (error) {
      toast.error('Fatura yüklenirken hata oluştu');
      router.push('/bills/list');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!bill) return;

    try {
      // Calculate new total based on products
      const newTotal = editForm.urunler.reduce((sum, item) => sum + item.fiyat, 0);
      
      const response = await fetch(`/api/bills/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          toplam_tutar: newTotal
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBill(data.bill);
        setIsEditing(false);
        toast.success('Fatura başarıyla güncellendi');
      } else {
        toast.error('Fatura güncellenirken hata oluştu');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const addProduct = () => {
    setEditForm({
      ...editForm,
      urunler: [...editForm.urunler, { urun_adi: '', fiyat: 0, isPersonal: false }]
    });
  };

  const removeProduct = (index: number) => {
    const newProducts = editForm.urunler.filter((_, i) => i !== index);
    setEditForm({
      ...editForm,
      urunler: newProducts
    });
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const newProducts = [...editForm.urunler];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setEditForm({
      ...editForm,
      urunler: newProducts
    });
  };

  const toggleParticipant = (userId: string) => {
    const isSelected = editForm.participants.includes(userId);
    const newParticipants = isSelected 
      ? editForm.participants.filter(id => id !== userId)
      : [...editForm.participants, userId];
    
    setEditForm({
      ...editForm,
      participants: newParticipants
    });
  };

  const handleDelete = async () => {
    if (!bill) return;

    const confirm = window.confirm('Bu faturayı silmek istediğinizden emin misiniz?');
    if (!confirm) return;

    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Fatura başarıyla silindi');
        router.push('/bills/list');
      } else {
        toast.error('Fatura silinirken hata oluştu');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const canEditOrDelete = Boolean(
    user &&
    bill &&
    bill.uploadedBy &&
    (user.userId === bill.uploadedBy._id?.toString() || user.role === 'admin')
  );

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  if (!bill) {
    return null;
  }

  const uploaderName = bill.uploadedBy?.name || 'Bilinmeyen Kullanıcı';
  const uploaderUsername = bill.uploadedBy?.username ? `@${bill.uploadedBy.username}` : 'Kimlik bulunamadı';
  const uploaderInitial = uploaderName.charAt(0).toUpperCase();

  return (
    <>
      <Head>
        <title>{bill.market_adi} - Fatura Detay</title>
      </Head>

      <Layout>
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => router.push('/bills/list')}
                    className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 hover:bg-white/30 transition-all duration-300 hover:scale-110"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
                    {isEditing ? 'Faturayı Düzenle' : bill.market_adi}
                  </h1>
                </div>
                <p className="text-blue-100 text-base sm:text-lg font-medium">
                  {bill.tarih} tarihli fatura
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-4 py-3 text-center">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Toplam</p>
                  <p className="text-2xl font-black">₺{bill.toplam_tutar.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canEditOrDelete && (
          <div className="flex flex-wrap gap-4 mb-8">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Düzenle
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Sil
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleEdit}
                  className="bg-linear-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kaydet
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      market_adi: bill.market_adi,
                      tarih: bill.tarih,
                      toplam_tutar: bill.toplam_tutar,
                      urunler: bill.urunler,
                      participants: bill.participants.map((p: any) => p._id)
                    });
                  }}
                  className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  İptal
                </Button>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fatura Bilgileri */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Fatura Bilgileri</h3>
                <p className="text-sm font-semibold text-gray-600">Detaylı bilgiler</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Market Adı */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Market Adı</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.market_adi}
                    onChange={(e) => setEditForm({ ...editForm, market_adi: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors bg-white shadow-sm"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <p className="text-lg font-bold text-gray-900">{bill.market_adi || 'Belirtilmemiş'}</p>
                  </div>
                )}
              </div>

              {/* Tarih */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Fatura Tarihi</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.tarih}
                    onChange={(e) => setEditForm({ ...editForm, tarih: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors bg-white shadow-sm"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <p className="text-gray-900">{bill.tarih}</p>
                  </div>
                )}
              </div>

              {/* Toplam Tutar */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Toplam Tutar</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.toplam_tutar}
                    onChange={(e) => setEditForm({ ...editForm, toplam_tutar: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors bg-white shadow-sm"
                  />
                ) : (
                  <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
                    <p className="text-2xl font-black text-green-700">₺{bill.toplam_tutar.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Faturayı Yükleyen */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Faturayı Yükleyen</label>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                      {uploaderInitial}
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">{uploaderName}</p>
                      <p className="text-sm text-blue-600">{uploaderUsername}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Katılımcılar */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Katılımcılar</h3>
                <p className="text-sm font-semibold text-gray-600">
                  {isEditing 
                    ? `${editForm.participants.length} kişi seçildi` 
                    : `${bill.participants.length} kişi`
                  }
                </p>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-bold text-blue-800 mb-3">Katılımcı Seç:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allUsers.map((user) => (
                      <label
                        key={user._id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                          editForm.participants.includes(user._id)
                            ? 'bg-blue-100 border-blue-300 shadow-md'
                            : 'bg-white border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={editForm.participants.includes(user._id)}
                          onChange={() => toggleParticipant(user._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bill.participants.map((participant, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 bg-linear-to-br from-blue-500 to-purple-600">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-lg mb-1">{participant.name}</p>
                          <p className="text-sm text-gray-500 font-medium">@{participant.username}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ürünler Listesi */}
        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-linear-to-br from-orange-500 to-red-600 rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v1m3 0h6m3 0v11a2 2 0 01-2 2H8a2 2 0 01-2-2V8m3 0V7a2 2 0 012-2h3a2 2 0 012 2v1M12 10v4m-2-2h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Ürünler</h3>
                <p className="text-sm font-semibold text-gray-600">
                  {isEditing ? editForm.urunler.length : bill.urunler.length} ürün
                </p>
              </div>
            </div>
            {isEditing && (
              <Button
                onClick={addProduct}
                className="bg-linear-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ürün Ekle
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isEditing ? editForm.urunler : bill.urunler).map((urun, index) => (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-2xl border-2 p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
                  urun.isPersonal
                    ? 'bg-linear-to-br from-purple-50 via-pink-50 to-purple-50 border-purple-200 hover:border-purple-300'
                    : 'bg-linear-to-br from-gray-50 via-slate-50 to-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={urun.urun_adi}
                        onChange={(e) => updateProduct(index, 'urun_adi', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm font-bold"
                        placeholder="Ürün adı"
                      />
                      <button
                        onClick={() => removeProduct(index)}
                        className="ml-2 bg-red-100 text-red-600 hover:bg-red-200 p-2 rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={urun.fiyat}
                        onChange={(e) => updateProduct(index, 'fiyat', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm font-bold"
                        placeholder="Fiyat"
                      />
                      <span className="text-gray-500 font-bold">₺</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={urun.isPersonal || false}
                        onChange={(e) => updateProduct(index, 'isPersonal', e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label className="text-xs font-bold text-gray-700">Kişiye Özel</label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-sm">{urun.urun_adi}</h4>
                      {urun.isPersonal && (
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                          Kişiye Özel
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-black text-gray-700">₺{urun.fiyat.toFixed(2)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fatura Resmi */}
        {bill.imageUrl && (
          <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-linear-to-br from-purple-500 to-pink-600 rounded-2xl p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1">Fatura Resmi</h3>
                <p className="text-sm font-semibold text-gray-600">Yüklenen görsel</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <img
                src={bill.imageUrl}
                alt="Fatura"
                className="w-full max-w-md mx-auto rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </div>
          </div>
        )}
      </Layout>
    </>
  );
};

export default BillDetailPage;