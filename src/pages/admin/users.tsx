import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Modal from '@/components/ui/modal';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

const AdminUsersPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '' });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      } else {
        fetchUsers();
      }
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      toast.error('Kullanıcılar alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast.success('Kullanıcı oluşturuldu');
        setShowAddModal(false);
        setNewUser({ name: '', username: '', password: '' });
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Kullanıcı oluşturulamadı');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success('Kullanıcı silindi');
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Kullanıcı silinemedi');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      const response = await fetch('/api/users/update-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, newPassword }),
      });

      if (response.ok) {
        toast.success('Şifre güncellendi');
        setShowPasswordModal(false);
        setNewPassword('');
        setSelectedUserId('');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Şifre güncellenemedi');
      }
    } catch (error) {
      toast.error('Bağlantı hatası');
    }
  };

  if (authLoading || loading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Head>
        <title>Kullanıcı Yönetimi - Bill Split</title>
      </Head>

      <Layout title="Kullanıcı Yönetimi">
        <div className="mb-6">
          <Button onClick={() => setShowAddModal(true)}>
            + Yeni Kullanıcı Ekle
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İsim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {u.role !== 'admin' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setShowPasswordModal(true);
                            }}
                          >
                            Şifre Değiştir
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            Sil
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Yeni Kullanıcı Ekle">
          <div className="space-y-4">
            <Input
              label="İsim"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              fullWidth
            />
            <Input
              label="Kullanıcı Adı"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              fullWidth
            />
            <Input
              label="Şifre"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              fullWidth
            />
            <Button onClick={handleAddUser} fullWidth>
              Kullanıcı Oluştur
            </Button>
          </div>
        </Modal>

        <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Şifre Güncelle">
          <div className="space-y-4">
            <Input
              label="Yeni Şifre"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            <Button onClick={handleUpdatePassword} fullWidth>
              Şifreyi Güncelle
            </Button>
          </div>
        </Modal>
      </Layout>
    </>
  );
};

export default AdminUsersPage;
