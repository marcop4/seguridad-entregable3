import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Mail, Phone, MapPin, Award } from 'lucide-react';

interface Customer {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  points: number | null;
}

export default function PanelClientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/jane/customers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}` }
      });
      if (response.ok) {
        setCustomers(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.full_name && c.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Historial de Clientes
          </h2>
          <p className="text-slate-400 text-sm mt-1">Directorio de clientes para consulta de despachos y fidelización.</p>
        </div>
      </div>

      <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg">
        {/* BÚSQUEDA */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button 
            onClick={fetchCustomers} 
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0A0A0A]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-black/50 border-b border-white/5 text-xs uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Dirección de Despacho</th>
                <th className="px-4 py-3 text-right">Fidelización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-xs">Cargando directorio de clientes...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-xs">No se encontraron clientes registrados.</td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold uppercase shrink-0 border border-indigo-500/30">
                          {c.username.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-semibold text-sm">{c.full_name || c.username}</span>
                          <span className="text-slate-500 text-xs">@{c.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-300 flex items-center gap-1.5 text-xs">
                          <Mail className="w-3 h-3 text-slate-500" /> {c.email}
                        </span>
                        {c.phone && (
                          <span className="text-slate-300 flex items-center gap-1.5 text-xs">
                            <Phone className="w-3 h-3 text-slate-500" /> {c.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.address ? (
                        <span className="text-slate-300 flex items-center gap-1.5 text-xs whitespace-normal max-w-xs">
                          <MapPin className="w-3 h-3 text-indigo-400 shrink-0" /> 
                          {c.address}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">No registrada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                        <Award className="w-3.5 h-3.5" />
                        {c.points || 0} pts
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
