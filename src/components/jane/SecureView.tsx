import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function SecureView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [realUrl, setRealUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const decryptRoute = async () => {
      try {
        const response = await fetch('/api/admin/secure-link/decrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (response.ok && data.route) {
          setRealUrl(data.route);
          setStatus('success');
          
          // Wait 3 seconds and download or redirect
          setTimeout(() => {
            window.location.href = data.route;
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    decryptRoute();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#141414] border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Background visual effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        
        {status === 'loading' && (
          <div className="animate-fade-in">
            <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Desencriptando URL...</h2>
            <p className="text-slate-400 font-mono text-sm">
              Conectando con motor Vortex-SPN (Cifrado3.py)
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in">
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

        {status === 'success' && (
          <div className="animate-fade-in">
            <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Ruta Verificada</h2>
            <p className="text-slate-400 mb-4">El enlace ha sido desencriptado exitosamente.</p>
            <div className="bg-black border border-emerald-500/30 p-3 rounded-lg mb-6 font-mono text-xs text-emerald-400 break-all">
              {realUrl}
            </div>
            <p className="text-slate-500 text-sm animate-pulse">Redirigiendo al documento seguro...</p>
          </div>
        )}
      </div>
    </div>
  );
}
