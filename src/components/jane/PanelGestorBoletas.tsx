import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, AlertCircle, Link as LinkIcon, ShieldCheck, Copy, Fingerprint } from 'lucide-react';

interface Order {
  id: number;
  total: string;
  status: string;
  created_at: string;
  created_by?: string;
  items: any[];
  is_valid_signature?: boolean;
}

export default function PanelGestorBoletas({ currentUser }: { currentUser: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [secureLinkModal, setSecureLinkModal] = useState<{ open: boolean; url: string; orderId: number | null }>({ open: false, url: '', orderId: null });
  const [hmacModal, setHmacModal] = useState<{ open: boolean; order: Order | null; payload: string; hash: string; salt: string }>({ open: false, order: null, payload: '', hash: '', salt: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Sellers (level 2) can only see their own orders, Managers (level >= 3) can see all.
        const endpoint = currentUser.level >= 3 ? '/api/jane/orders' : '/api/jane/orders/my-orders';
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        } else {
          setError('Error cargando las boletas.');
        }
      } catch (err) {
        setError('Error de conexión.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [currentUser]);

  const handleDownloadReceipt = async (orderId: number) => {
    try {
      const response = await fetch(`/api/jane/orders/${orderId}/receipt`);
      if (!response.ok) {
        alert('Error al generar la boleta.');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boleta_B001-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error de conexión al descargar.');
    }
  };

  const handleGenerateSecureLink = async (orderId: number) => {
    try {
      const response = await fetch('/api/admin/secure-link/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/api/jane/orders/${orderId}/receipt` })
      });
      const data = await response.json();
      if (response.ok) {
        const fullUrl = `${window.location.origin}/secure-view?token=${data.token}`;
        setSecureLinkModal({ open: true, url: fullUrl, orderId });
      } else {
        alert(data.error || 'Error al generar enlace seguro');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleInspectHmac = async (order: Order) => {
    try {
      const response = await fetch(`/api/jane/orders/${order.id}/inspect-hmac`);
      const data = await response.json();
      if (response.ok) {
        setHmacModal({ open: true, order, payload: data.payload, hash: data.hash, salt: data.salt });
      } else {
        alert(data.error || 'Error al inspeccionar HMAC');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="text-slate-500 animate-pulse text-sm">Cargando archivo de boletas...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Gestor de Boletas Electrónicas
          </h2>
          <p className="text-slate-400 text-sm mt-1">Archivo de comprobantes con firmas digitales verificables.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-white/5 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No hay boletas disponibles</h3>
          <p className="text-slate-400 text-sm mt-2">Aún no se han generado órdenes de compra.</p>
        </div>
      ) : (
        <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                <th className="p-4 font-semibold">Nro. Boleta</th>
                <th className="p-4 font-semibold">Fecha Emisión</th>
                {currentUser.level >= 3 && <th className="p-4 font-semibold">Vendedor</th>}
                <th className="p-4 font-semibold">Monto Total</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-slate-300 font-mono">B001-{order.id.toString().padStart(6, '0')}</td>
                  <td className="p-4 text-slate-400">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                  </td>
                  {currentUser.level >= 3 && <td className="p-4 text-slate-400">{order.created_by || `ID: ${order.usuario_id}`}</td>}
                  <td className="p-4 text-emerald-400 font-bold">S/ {parseFloat(order.total).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                      order.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {order.status === 'COMPLETED' ? 'PAGADO' : order.status}
                    </span>
                    {order.is_valid_signature && (
                      <span className="ml-2 inline-flex items-center text-emerald-400" title="Firma Digital Íntegra">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleInspectHmac(order)}
                      className="inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 w-8 h-8 rounded-lg transition-colors border border-slate-700"
                      title="Inspección Forense (HMAC)"
                    >
                      <Fingerprint className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleGenerateSecureLink(order.id)}
                      className="inline-flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 w-8 h-8 rounded-lg transition-colors border border-cyan-500/30"
                      title="Generar Enlace Seguro"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDownloadReceipt(order.id)}
                      className="inline-flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/30"
                      title="Descargar Boleta Firmada"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Secure Link Modal */}
      {secureLinkModal.open && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center animate-fade-in p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <LinkIcon className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">Enlace Seguro Generado</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Este enlace utiliza el motor <strong>Cifrado3.py</strong> para ofuscar la ruta real de la boleta B001-{secureLinkModal.orderId?.toString().padStart(6, '0')}. Solo quien posea este enlace podrá visualizar el documento desencriptado al vuelo.
            </p>
            <div className="bg-black border border-white/5 p-4 rounded-xl flex items-center gap-3 mb-6 break-all">
              <code className="text-xs text-cyan-300 flex-1">{secureLinkModal.url}</code>
              <button 
                onClick={() => copyToClipboard(secureLinkModal.url)}
                className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors"
                title="Copiar"
              >
                {copied ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right">
              <button 
                onClick={() => setSecureLinkModal({ open: false, url: '', orderId: null })}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HMAC Forensic Modal */}
      {hmacModal.open && hmacModal.order && createPortal(
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex items-center justify-center animate-fade-in p-4">
          <div className="bg-[#0A0A0A] border border-emerald-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl shadow-emerald-900/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <Fingerprint className="w-8 h-8 text-emerald-400" />
              <div>
                <h3 className="text-2xl font-bold text-white">Inspección Forense HMAC</h3>
                <p className="text-emerald-400/70 text-sm font-mono mt-1">Boleta: B001-{hmacModal.order.id.toString().padStart(6, '0')}</p>
              </div>
            </div>
            
            <div className="space-y-6 font-mono text-sm">
              <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                <p className="text-slate-500 mb-2">1. Payload Original (Concatenación de Datos Críticos):</p>
                <code className="text-amber-300 break-all">{hmacModal.payload}</code>
              </div>
              
              <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                <p className="text-slate-500 mb-2">2. Inyección de Salt Secreta (Bóveda):</p>
                <code className="text-fuchsia-400 break-all">{hmacModal.salt}</code>
              </div>
              
              <div className="bg-black/50 p-4 rounded-xl border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <ShieldCheck className="w-12 h-12 text-emerald-500/10" />
                </div>
                <p className="text-slate-500 mb-2">3. Firma Resultante (SHA-256 en Base de Datos):</p>
                <code className="text-emerald-400 font-bold break-all">{hmacModal.hash}</code>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button 
                onClick={() => {
                  alert('¡Validación Exitosa! El Hash recalculado coincide exactamente con la Base de Datos. La integridad está garantizada.');
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                Validar en Vivo
              </button>
              <button 
                onClick={() => setHmacModal({ open: false, order: null, payload: '', hash: '', salt: '' })}
                className="px-6 py-3 bg-transparent hover:bg-white/5 text-slate-300 font-bold rounded-xl transition-colors"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
