import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { User } from '../../types';

interface ConfigItem {
  key: string;
  value: string;
  description: string;
}

export default function PanelConfiguracion({ currentUser }: { currentUser: User }) {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/config', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (key: string, newValue: string) => {
    setConfig(config.map(item => item.key === key ? { ...item, value: newValue } : item));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}`
        },
        body: JSON.stringify({ config })
      });
      
      if (response.ok) {
        setMessage({ text: 'Configuración guardada exitosamente. Las reglas de negocio han sido actualizadas.', type: 'success' });
      } else {
        setMessage({ text: 'Error al guardar la configuración.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de conexión.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    }
  };

  if (currentUser.level < 4) {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Privilegios insuficientes.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            Configuración Global (Reglas de Negocio)
          </h2>
          <p className="text-slate-400 text-sm mt-1">Modifica las variables operativas que afectan a todo el sistema.</p>
        </div>
      </div>

      <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg">
        {loading ? (
          <div className="flex justify-center p-12">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {config.map((item) => (
              <div key={item.key} className="bg-black/30 p-4 rounded-xl border border-white/10">
                <label className="block text-sm font-bold text-slate-300 mb-1 capitalize">
                  {item.key.replace(/_/g, ' ')}
                </label>
                <p className="text-xs text-slate-500 mb-3">{item.description}</p>
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ))}

            {message.text && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Configuración
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
