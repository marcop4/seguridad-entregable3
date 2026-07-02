import React, { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, CheckCircle, XCircle, Clock, Eye, Download, ShieldCheck, ShieldAlert } from 'lucide-react';

interface OrderItem {
  id: string;
  producto_name: string;
  quantity: number;
  unit_price: string;
}

interface Order {
  id: string;
  created_by: string;
  total: string | number;
  status: string;
  created_at: string;
  firma_digital?: string;
  is_valid_signature?: boolean;
  items: OrderItem[];
}

export default function PanelGestorOrdenes() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/jane/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/jane/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      }
    } catch (e) {
      console.error(e);
      alert('Error al actualizar estado.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20"><CheckCircle className="w-3 h-3" /> Completada</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20"><XCircle className="w-3 h-3" /> Cancelada</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20"><Clock className="w-3 h-3" /> Pendiente</span>;
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) return;
    const headers = ['ID_Orden', 'Fecha', 'Vendedor', 'Total', 'Estado', 'Firma_Digital'];
    const rows = orders.map(o => [
      o.id,
      new Date(o.created_at).toISOString(),
      `"${o.created_by.replace(/"/g, '""')}"`,
      o.total,
      o.status,
      o.firma_digital || 'N/A'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ordenes_JANE_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Gestor de Órdenes
            </h3>
            <p className="text-slate-400 text-xs mt-1">Supervisión de ventas POS y despachos web.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold"
              title="Exportar a CSV"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button 
              onClick={fetchOrders} 
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-colors cursor-pointer"
              title="Refrescar Órdenes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#0A0A0A] border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-4 py-3">ID Orden</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Vendedor / Cajero</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs">Cargando órdenes...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs">No hay órdenes registradas.</td>
                </tr>
              ) : (
                orders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px] flex items-center gap-2">
                        #{order.id.split('-')[0].toUpperCase()}
                        {order.firma_digital ? (
                          order.is_valid_signature ? (
                            <div className="relative group/shield cursor-help">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/shield:block w-48 bg-[#0A0A0A] border border-emerald-500/30 rounded p-2 text-[9px] text-center shadow-xl shadow-black z-50">
                                <span className="text-emerald-400 font-bold block mb-1">Sello de Integridad Válido</span>
                                <span className="text-slate-400 font-mono break-all">{order.firma_digital.substring(0, 16)}...</span>
                                <span className="text-slate-500 block mt-1">Cifrado SHA-256</span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group/shield cursor-help">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/shield:block w-48 bg-[#0A0A0A] border border-red-500/50 rounded p-2 text-[9px] text-center shadow-xl shadow-black z-50">
                                <span className="text-red-500 font-bold block mb-1">ALERTA: Integridad Comprometida</span>
                                <span className="text-slate-400 block mt-1">Firma Inválida o Datos Alterados</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="relative group/shield cursor-help">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500/50" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/shield:block w-40 bg-[#0A0A0A] border border-amber-500/30 rounded p-2 text-[9px] text-center shadow-xl shadow-black z-50">
                              <span className="text-amber-400 font-bold block mb-1">Sin Firma Digital</span>
                              <span className="text-slate-400">Orden antigua o sin cifrado</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(order.created_at).toLocaleString('es-PE', { 
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-white/5 text-slate-300 rounded text-xs font-bold border border-white/5">
                          {order.created_by}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-bold">
                        S/ {Number(order.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer border border-transparent hover:border-white/10"
                          >
                            <Eye className="w-4 h-4" /> Ver Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Fila expandible con el detalle */}
                    {expandedOrder === order.id && (
                      <tr className="bg-[#0A0A0A] border-b border-white/5">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="bg-[#141414] rounded-lg border border-white/10 p-4 w-full max-w-2xl mx-auto shadow-inner">
                            <h4 className="text-white text-sm font-bold mb-3 uppercase tracking-widest border-b border-white/10 pb-2">Detalle del Ticket</h4>
                            <ul className="space-y-2 mb-4">
                              {order.items.map(item => (
                                <li key={item.id} className="flex justify-between items-center text-xs text-slate-300">
                                  <span>{item.quantity}x {item.producto_name}</span>
                                  <span className="font-mono text-slate-400">S/ {Number(item.unit_price).toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
                               <div className="flex gap-2">
                                  {order.status !== 'COMPLETED' && (
                                    <button 
                                      onClick={() => updateStatus(order.id, 'COMPLETED')}
                                      className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] uppercase font-bold rounded cursor-pointer transition-colors"
                                    >
                                      Marcar Completado
                                    </button>
                                  )}
                                  {order.status !== 'CANCELLED' && (
                                    <button 
                                      onClick={() => updateStatus(order.id, 'CANCELLED')}
                                      className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[10px] uppercase font-bold rounded cursor-pointer transition-colors"
                                    >
                                      Anular Orden
                                    </button>
                                  )}
                               </div>
                               <span className="text-white font-mono font-bold text-sm">
                                 Total: S/ {Number(order.total).toFixed(2)}
                               </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
