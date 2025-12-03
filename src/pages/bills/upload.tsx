import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface ManualBillData {
  title: string;
  date: string;
  total: number;
  description: string;
  products: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

type UploadTaskStatus = 'hazırlanıyor' | 'yükleniyor' | 'işleniyor' | 'tamamlandı' | 'hata';

interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadTaskStatus;
  message: string;
  billId?: string;
  imageUrl?: string;
  error?: string;
  billData?: {
    market_adi: string;
    tarih: string;
    urunler: Array<{
      ad: string;
      fiyat: number;
      isPersonal?: boolean;
    }>;
    toplam_tutar: number;
  };
}

const BillUploadPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{_id: string; name: string; username: string}>>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [manualBillData, setManualBillData] = useState<ManualBillData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    total: 0,
    description: '',
    products: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasActiveUploads = uploadTasks.some(task => 
    task.status === 'hazırlanıyor' || task.status === 'yükleniyor' || task.status === 'işleniyor'
  );

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (telefon fotoğrafları için artırıldı)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchUsers();
      setSelectedParticipants([user.userId]);
    }
  }, [user, authLoading, router]);

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

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, index);
    return `${size.toFixed(size > 10 ? 0 : 1)} ${units[index]}`;
  };

  const statusLabels: Record<UploadTaskStatus, string> = {
    'hazırlanıyor': 'Hazırlanıyor',
    'yükleniyor': 'Sunucuya gönderiliyor',
    'işleniyor': 'AI analiz ediyor',
    'tamamlandı': 'Tamamlandı',
    'hata': 'Hata'
  };

  const updateTask = (taskId: string, patch: Partial<UploadTask>) => {
    setUploadTasks(prev => prev.map(task => (
      task.id === taskId ? { ...task, ...patch } : task
    )));
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string' && result.length > 0) {
          resolve(result);
        } else {
          reject(new Error('Dosya içeriği okunamadı'));
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        reject(new Error('Dosya okuma hatası: ' + (reader.error?.message || 'Bilinmeyen hata')));
      };
      
      reader.onabort = () => {
        reject(new Error('Dosya okuma iptal edildi'));
      };

      try {
        reader.readAsDataURL(file);
      } catch (err: any) {
        reject(new Error('Dosya okunamadı: ' + (err?.message || 'Bilinmeyen hata')));
      }
    });
  };

  const startUploadTask = async (file: File) => {
    const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setUploadTasks(prev => ([
      {
        id: taskId,
        name: file.name,
        size: file.size,
        progress: 5,
        status: 'hazırlanıyor',
        message: 'Dosya hazırlanıyor...'
      },
      ...prev,
    ]));

    try {
      // Base64'e çevir
      let base64: string;
      try {
        base64 = await readFileAsBase64(file);
      } catch (readError: any) {
        throw new Error('Dosya okunamadı: ' + (readError?.message || 'Bilinmeyen hata'));
      }

      // Base64 kontrolü
      if (!base64 || !base64.startsWith('data:')) {
        throw new Error('Dosya formatı geçersiz');
      }

      updateTask(taskId, { progress: 25, message: 'Dosya kodlandı, gönderiliyor...' });
      updateTask(taskId, { progress: 40, status: 'yükleniyor', message: 'Sunucuya gönderiliyor...' });

      const response = await fetch('/api/bills/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: base64 })
      });

      let result: any = null;
      try {
        const text = await response.text();
        if (text) {
          result = JSON.parse(text);
        }
      } catch (parseError) {
        console.error('Upload response parse error', parseError);
      }

      if (!response.ok) {
        const message = result?.message || result?.error || `Sunucu hatası: ${response.status}`;
        throw new Error(message);
      }

      if (!result || !result.bill) {
        throw new Error('Sunucu geçersiz yanıt döndürdü');
      }

      updateTask(taskId, { progress: 75, status: 'işleniyor', message: 'Yapay zeka faturayı analiz ediyor...' });

      updateTask(taskId, {
        progress: 100,
        status: 'tamamlandı',
        message: 'Fatura başarıyla işlendi',
        billId: result.bill.id || result.bill._id,
        imageUrl: result.bill.imageUrl,
        billData: {
          market_adi: result.bill.market_adi || '',
          tarih: result.bill.tarih || '',
          urunler: result.bill.urunler || [],
          toplam_tutar: result.bill.toplam_tutar || 0
        }
      });

      toast.success(`${file.name} faturası başarıyla işlendi`);
    } catch (err: any) {
      const message = err?.message || 'Yükleme başarısız oldu';
      console.error('Upload error:', err);
      updateTask(taskId, {
        progress: 100,
        status: 'hata',
        message,
        error: message
      });
      toast.error(`${file.name}: ${message}`);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Dosya adından uzantıyı al
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      // file.type boş olabilir (özellikle telefonlarda), o yüzden uzantıya da bak
      const isImage = file.type.startsWith('image/') || hasValidExtension;
      
      if (!isImage) {
        toast.error(`${file.name} desteklenmeyen bir format`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dosyası 10MB sınırını aşıyor`);
        return;
      }

      startUploadTask(file);
    });
    event.target.value = '';
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const addProduct = () => {
    setManualBillData(prev => ({
      ...prev,
      products: [...prev.products, { name: '', price: 0, quantity: 1 }]
    }));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    setManualBillData(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const removeProduct = (index: number) => {
    setManualBillData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return manualBillData.products.reduce((sum, product) => 
      sum + (product.price * product.quantity), 0
    );
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}.${month}.${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const updateTaskProduct = (taskId: string, productIndex: number, field: string, value: any) => {
    setUploadTasks(prev => prev.map(task => {
      if (task.id === taskId && task.billData) {
        const updatedProducts = [...task.billData.urunler];
        updatedProducts[productIndex] = { ...updatedProducts[productIndex], [field]: value };
        const newTotal = updatedProducts.reduce((sum, p) => sum + p.fiyat, 0);
        return {
          ...task,
          billData: {
            ...task.billData,
            urunler: updatedProducts,
            toplam_tutar: newTotal
          }
        };
      }
      return task;
    }));
  };

  const removeTaskProduct = (taskId: string, productIndex: number) => {
    setUploadTasks(prev => prev.map(task => {
      if (task.id === taskId && task.billData) {
        const updatedProducts = task.billData.urunler.filter((_, i) => i !== productIndex);
        const newTotal = updatedProducts.reduce((sum, p) => sum + p.fiyat, 0);
        return {
          ...task,
          billData: {
            ...task.billData,
            urunler: updatedProducts,
            toplam_tutar: newTotal
          }
        };
      }
      return task;
    }));
  };

  const addTaskProduct = (taskId: string) => {
    setUploadTasks(prev => prev.map(task => {
      if (task.id === taskId && task.billData) {
        const newProduct = { ad: 'Yeni Ürün', fiyat: 0, isPersonal: false };
        return {
          ...task,
          billData: {
            ...task.billData,
            urunler: [...task.billData.urunler, newProduct]
          }
        };
      }
      return task;
    }));
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const saveBillChanges = async (taskId: string) => {
    const task = uploadTasks.find(t => t.id === taskId);
    if (!task?.billData || !task.billId) return;

    try {
      const response = await fetch('/api/bills/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: task.billId,
          urunler: task.billData.urunler,
          participants: selectedParticipants
        })
      });

      if (response.ok) {
        toast.success('Fatura başarıyla kaydedildi!');
        setEditingTaskId(null);
      } else {
        toast.error('Kaydetme hatası');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
     setSuccess(null);

    try {
      const total = calculateTotal();
      const finalTotal = total > 0 ? total : manualBillData.total;

      const requestData = {
        market_adi: manualBillData.title,
        tarih: manualBillData.date,
        toplam_tutar: finalTotal,
        description: manualBillData.description,
        urunler: manualBillData.products.map(product => ({
          ad: product.name,
          fiyat: product.price,
          miktar: product.quantity,
          birim: 'adet'
        }))
      };
      
      const response = await fetch('/api/bills/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Fatura oluşturulamadı');
      }

      setSuccess('Manuel fatura başarıyla oluşturuldu!');
      toast.success('Manuel fatura başarıyla oluşturuldu!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      toast.error(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Head>
        <title>Fatura Ekle - Bill Split</title>
      </Head>

      <Layout title="Fatura Ekle">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-blue-900">Akıllı Fatura Yükleme</h2>
            <p className="text-sm text-blue-700 mt-1">
              Birden fazla fatura seçebilir, her yüklemenin ilerlemesini yüzde olarak takip edebilirsin. İşlemler doğrudan bu cihazda sıraya alınır.
            </p>
            {hasActiveUploads && (
              <p className="text-xs text-blue-600 mt-2">
                Aktif yükleme sayısı: {uploadTasks.filter(task => task.status !== 'tamamlandı' && task.status !== 'hata').length}
              </p>
            )}
          </div>

          <Card>
            <div className="p-6">
              {/* Toggle Buttons */}
              <div className="flex space-x-4 mb-6 border-b pb-4">
                <button
                  type="button"
                  onClick={() => setIsManualEntry(false)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    !isManualEntry
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl">📸</span>
                    <span>Resim Yükle</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">
                    AI ile otomatik analiz
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsManualEntry(true)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isManualEntry
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl">✏️</span>
                    <span>Manuel Giriş</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">
                    Elle fatura oluştur
                  </p>
                </button>
              </div>

              {/* Image Upload Section */}
              {!isManualEntry && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Fatura Resmi Yükle
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Fatura veya fiş görselini yükleyin, yapay zeka otomatik olarak ürünleri ve fiyatları tanıyacak
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:border-gray-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.heic,.heif"
                      multiple
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                      Dosya Seç
                    </button>
                    <p className="mt-3 text-xs text-gray-500">
                      PNG, JPG, JPEG, HEIC, WebP | Maksimum 10MB | Çoklu seçim desteklenir
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Yükleme sırasında bu pencere açık kalmalı.
                    </p>
                  </div>

                  {uploadTasks.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {uploadTasks.map(task => {
                        const progressColor = task.status === 'hata'
                          ? 'bg-red-500'
                          : task.status === 'tamamlandı'
                            ? 'bg-green-500'
                            : 'bg-blue-600';

                        return (
                          <div key={task.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{task.name}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(task.size)} • {task.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">{statusLabels[task.status]}</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {Math.min(100, Math.max(0, Math.round(task.progress)))}%
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 w-full bg-gray-200/80 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${progressColor} h-2 rounded-full transition-all duration-300 ease-out`}
                                style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                              />
                            </div>

                            {task.status === 'tamamlandı' && task.billData && (
                              <div className="mt-4 border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-bold text-gray-900">📋 Fatura Detayları</h4>
                                  <div className="flex gap-2">
                                    {editingTaskId === task.id ? (
                                      <>
                                        <button
                                          onClick={() => saveBillChanges(task.id)}
                                          className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold py-1 px-3 rounded-lg"
                                        >
                                          💾 Kaydet
                                        </button>
                                        <button
                                          onClick={() => setEditingTaskId(null)}
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1 px-3 rounded-lg"
                                        >
                                          ❌ İptal
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => setEditingTaskId(task.id)}
                                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold py-1 px-3 rounded-lg"
                                      >
                                        ✏️ Düzenle
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><strong>Market:</strong> {task.billData.market_adi}</div>
                                    <div><strong>Tarih:</strong> {formatDate(task.billData.tarih)}</div>
                                    <div className="col-span-2"><strong>Toplam:</strong> ₺{task.billData.toplam_tutar.toFixed(2)}</div>
                                  </div>
                                </div>

                                {editingTaskId === task.id && (
                                  <div className="mb-4 bg-blue-50 rounded-lg p-3">
                                    <h5 className="text-xs font-bold text-blue-800 mb-2">👥 Katılımcıları Seç:</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                      {allUsers.map((u) => (
                                        <label key={u._id} className="flex items-center gap-2 text-xs">
                                          <input
                                            type="checkbox"
                                            checked={selectedParticipants.includes(u._id)}
                                            onChange={() => toggleParticipant(u._id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <span>{u.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold text-gray-700">🛒 Ürünler ({task.billData.urunler.length})</h5>
                                    {editingTaskId === task.id && (
                                      <button
                                        onClick={() => addTaskProduct(task.id)}
                                        className="bg-green-100 hover:bg-green-200 text-green-700 text-xs py-1 px-2 rounded"
                                      >
                                        + Ekle
                                      </button>
                                    )}
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-2">
                                    {task.billData.urunler.map((urun, idx) => (
                                      <div key={idx} className={`p-2 rounded border ${urun.isPersonal ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                                        {editingTaskId === task.id ? (
                                          <div className="space-y-2">
                                            <div className="flex gap-2">
                                              <input
                                                type="text"
                                                value={urun.ad}
                                                onChange={(e) => updateTaskProduct(task.id, idx, 'ad', e.target.value)}
                                                className="flex-1 text-xs px-2 py-1 border rounded"
                                              />
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={urun.fiyat}
                                                onChange={(e) => updateTaskProduct(task.id, idx, 'fiyat', parseFloat(e.target.value) || 0)}
                                                className="w-16 text-xs px-2 py-1 border rounded"
                                              />
                                              <button
                                                onClick={() => removeTaskProduct(task.id, idx)}
                                                className="text-red-600 hover:bg-red-100 px-2 py-1 rounded"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => updateTaskProduct(task.id, idx, 'fiyat', Math.max(0, urun.fiyat + 0.5))}
                                                className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                                              >
                                                +0.5₺
                                              </button>
                                              <button
                                                onClick={() => updateTaskProduct(task.id, idx, 'fiyat', Math.max(0, urun.fiyat - 0.5))}
                                                className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded"
                                              >
                                                -0.5₺
                                              </button>
                                              <button
                                                onClick={() => updateTaskProduct(task.id, idx, 'isPersonal', !urun.isPersonal)}
                                                className={`text-xs px-2 py-1 rounded ${urun.isPersonal ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}
                                              >
                                                {urun.isPersonal ? '👤 Kişisel' : '👥 Ortak'}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex justify-between items-center">
                                            <div>
                                              <span className="text-xs font-medium">{urun.ad}</span>
                                              {urun.isPersonal && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1 rounded">👤</span>}
                                            </div>
                                            <span className="text-xs font-bold">₺{urun.fiyat.toFixed(2)}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              {task.billId && (
                                <Button
                                  type="button"
                                  onClick={() => router.push(`/bills/${task.billId}`)}
                                  variant="primary"
                                  className="text-xs"
                                >
                                  Detay Sayfası
                                </Button>
                              )}

                              {task.status === 'hata' && (
                                <span className="text-xs text-red-600 font-medium">
                                  {task.error}
                                </span>
                              )}

                              {task.imageUrl && (
                                <a
                                  href={task.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Orijinal Resim
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Entry Section */}
              {isManualEntry && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Manuel Fatura Girişi
                  </h2>
                  
                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Market Adı / Başlık *
                        </label>
                        <input
                          type="text"
                          required
                          value={manualBillData.title}
                          onChange={(e) => setManualBillData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Örn: Migros, BIM, A101"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fatura Tarihi *
                        </label>
                        <input
                          type="date"
                          required
                          value={manualBillData.date}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setManualBillData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Toplam Tutar (₺) {manualBillData.products.length > 0 ? '(Otomatik)' : '*'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required={manualBillData.products.length === 0}
                          value={manualBillData.products.length > 0 ? calculateTotal().toFixed(2) : manualBillData.total}
                          onChange={(e) => setManualBillData(prev => ({ ...prev, total: parseFloat(e.target.value) || 0 }))}
                          disabled={manualBillData.products.length > 0}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama (Opsiyonel)
                      </label>
                      <textarea
                        value={manualBillData.description}
                        onChange={(e) => setManualBillData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Fatura hakkında not..."
                      />
                    </div>

                    {/* Products Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-md font-medium text-gray-900">Ürünler</h3>
                          <p className="text-xs text-gray-500 mt-1">İsteğe bağlı - Detaylı kayıt için ekleyin</p>
                        </div>
                        <Button
                          type="button"
                          onClick={addProduct}
                          variant="secondary"
                          className="text-sm"
                        >
                          + Ürün Ekle
                        </Button>
                      </div>

                      {manualBillData.products.length > 0 && (
                        <div className="space-y-3">
                          {manualBillData.products.map((product, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Ürün Adı
                                  </label>
                                  <input
                                    type="text"
                                    value={product.name}
                                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Ürün adı"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Fiyat (₺)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={product.price}
                                    onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Adet
                                  </label>
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="number"
                                      min="1"
                                      value={product.quantity}
                                      onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeProduct(index)}
                                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                      title="Ürünü sil"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-right">
                                <span className="text-sm text-gray-600">
                                  Ara Toplam: <strong className="text-blue-600">{(product.price * product.quantity).toFixed(2)} ₺</strong>
                                </span>
                              </div>
                            </div>
                          ))}

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-right">
                              <span className="text-lg font-bold text-blue-900">
                                Genel Toplam: {calculateTotal().toFixed(2)} ₺
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <Button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        variant="secondary"
                      >
                        İptal
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={loading}
                        variant="success"
                      >
                        {loading ? 'Oluşturuluyor...' : '✓ Fatura Oluştur'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-red-900">{error}</span>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-900">{success}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Layout>
    </>
  );
};

export default BillUploadPage;
