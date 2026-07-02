import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function SecureReceiptViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const url = `/api/admin/secure-link/download?token=${encodeURIComponent(token)}`;
    
    // Usamos GET para descargar el documento a la memoria del navegador
    // y luego mostrarlo en el iframe. Esto evita problemas de compatibilidad
    // con peticiones HEAD en algunos servidores.
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setStatus('success');
      })
      .catch((error) => {
        console.error('Error fetching secure PDF:', error);
        setStatus('error');
      });

    return () => {
      // Limpiar la memoria si el componente se desmonta
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-[#141414] border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Background visual effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        
        {status === 'loading' && (
          <div className="animate-fade-in my-10">
            <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Desencriptando Documento...</h2>
            <p className="text-slate-400 font-mono text-sm">
              Validando token con motor Vortex-SPN
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in my-10">
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
            <p className="text-slate-400 mb-6">El token de seguridad es inválido, ha caducado o está corrupto.</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-bold"
            >
              Volver al Inicio
            </button>
          </div>
        )}

        {status === 'success' && pdfUrl && (
          <div className="animate-fade-in w-full h-[80vh] flex flex-col">
            <div className="flex items-center justify-center gap-3 mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <h2 className="text-2xl font-bold text-white">Documento Seguro Verificado</h2>
            </div>
            <iframe 
              src={pdfUrl} 
              className="w-full h-full rounded-lg border border-white/10 bg-white"
              title="Visor de Boleta Segura"
            />
          </div>
        )}
      </div>
    </div>
  );
}
