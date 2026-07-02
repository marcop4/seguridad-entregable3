import React, { useState, useEffect } from 'react';
import { User as UserIcon, Package, MapPin, Star, Award, Save, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { User } from '../../types';

interface OrderItem {
  id: string;
  producto_name: string;
  quantity: number;
  unit_price: string;
}

interface Order {
  id: string;
  created_at: string;
  total: string;
  status: string;
  firma_digital?: string;
  items: OrderItem[];
}

interface Profile {
  phone: string;
  address: string;
  points: number;
}

interface PanelMiCuentaProps {
  currentUser: User;
}

export default function PanelMiCuenta({ currentUser }: PanelMiCuentaProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile>({ phone: '', address: '', points: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, profileRes] = await Promise.all([
        fetch('/api/jane/orders/my-orders', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}` }
        }),
        fetch('/api/users/me/profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}` }
        })
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile({
          phone: data.phone || '',
          address: data.address || '',
          points: data.points || 0
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}`
        },
        body: JSON.stringify({ phone: profile.phone, address: profile.address })
      });
      if (res.ok) {
        setSaveMessage('Perfil actualizado correctamente.');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err) {
      setSaveMessage('Error al guardar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
      return;
    }
    setSavingPassword(true);
    setPasswordMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}`
        },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ text: 'Contraseña actualizada.', type: 'success' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ text: data.error || 'Error al cambiar contraseña.', type: 'error' });
      }
    } catch (err) {
      setPasswordMessage({ text: 'Error de red.', type: 'error' });
    } finally {
      setSavingPassword(false);
      setTimeout(() => setPasswordMessage({ text: '', type: '' }), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"><CheckCircle className="w-3 h-3" /> Completada</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200"><XCircle className="w-3 h-3" /> Cancelada</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200"><Clock className="w-3 h-3" /> Pendiente</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-3xl font-bold text-slate-900">Hola, {currentUser.fullName || currentUser.username}</h2>
        <p className="text-slate-500 mt-2">Bienvenido a tu panel de cliente en JANE Artisans.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-black'}`}
          >
            <Star className="w-5 h-5" /> Resumen
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'orders' ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-black'}`}
          >
            <Package className="w-5 h-5" /> Mis Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'profile' ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-black'}`}
          >
            <UserIcon className="w-5 h-5" /> Mi Perfil
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Resumen de Cuenta</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest font-bold mb-1">Puntos JANE</p>
                    <p className="text-4xl font-extrabold text-amber-700 font-mono">{profile.points}</p>
                  </div>
                  <Award className="w-12 h-12 text-amber-300 opacity-50" />
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Ingresar Código de Descuento</h4>
                  <div className="flex gap-2">
                    <input type="text" placeholder="EJ: JANE2026" className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                    <button className="px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-colors">
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Historial de Pedidos</h3>
              
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aún no has realizado ninguna compra.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400 font-mono">Orden #{order.id.split('-')[0].toUpperCase()}</p>
                          <p className="text-sm font-bold text-slate-900">
                            {new Date(order.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-slate-900 font-mono">S/ {Number(order.total).toFixed(2)}</span>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {order.items.map(item => (
                          <li key={item.id} className="flex justify-between items-center text-sm text-slate-600">
                            <span>{item.quantity}x {item.producto_name}</span>
                            <span className="font-mono text-slate-400">S/ {Number(item.unit_price).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in max-w-lg">
              <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Dirección y Contacto</h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono Móvil</label>
                  <input 
                    type="text" 
                    value={profile.phone}
                    onChange={e => setProfile({...profile, phone: e.target.value})}
                    placeholder="Ej. +51 999 888 777"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Dirección de Envío Principal</label>
                  <textarea 
                    rows={3}
                    value={profile.address}
                    onChange={e => setProfile({...profile, address: e.target.value})}
                    placeholder="Ej. Av. Larco 123, Miraflores, Lima"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors shadow-md disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Cambios
                  </button>
                  {saveMessage && <span className="text-emerald-600 text-sm font-medium animate-fade-in">{saveMessage}</span>}
                </div>
              </div>

              {/* CHANGE PASSWORD */}
              <div className="mt-12 space-y-4 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 pb-2">Seguridad de la Cuenta</h3>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña Actual</label>
                    <input 
                      type="password" 
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nueva Contraseña</label>
                    <input 
                      type="password" 
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password" 
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                  
                  <div className="pt-4 flex items-center gap-4">
                    <button 
                      onClick={handleSavePassword}
                      disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                      className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors shadow-md disabled:opacity-50"
                    >
                      {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Actualizar Contraseña
                    </button>
                    {passwordMessage.text && (
                      <span className={`text-sm font-medium animate-fade-in ${passwordMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {passwordMessage.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
