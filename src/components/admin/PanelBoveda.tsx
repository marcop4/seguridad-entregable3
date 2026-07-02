import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Eye, Key, Lock, Copy, CheckCircle2, X, Terminal, ArrowRightLeft } from 'lucide-react';

interface Secret {
  id: string;
  categoria: string;
  nombre_clave: string;
  valor_cifrado: string;
  created_at: string;
}

export default function PanelBoveda() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [decryptedId, setDecryptedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [labInput, setLabInput] = useState('');
  const [labOutput, setLabOutput] = useState('');
  const [isLabLoading, setIsLabLoading] = useState(false);
  const [labMode, setLabMode] = useState<'encrypt'|'decrypt'>('encrypt');

  // Authorization for decrypt
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [targetSecretId, setTargetSecretId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  // Form state
  const [categoria, setCategoria] = useState('');
  const [nombreClave, setNombreClave] = useState('');
  const [plaintext, setPlaintext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/vault');
      if (res.ok) {
        setSecrets(await res.json());
      } else {
        setError('Error al cargar la bóveda');
      }
    } catch (e) {
      setError('Fallo de red al conectar con la bóveda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSecretId || !adminPassword) return;

    try {
      const res = await fetch('/api/admin/vault/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetSecretId, password: adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success !== false && !data.error) {
        setDecryptedValue(data.plaintext || data.result || (data.success ? data.plaintext : null));
        if (data.plaintext) {
          setDecryptedValue(data.plaintext);
        }
        setDecryptedId(targetSecretId);
        setCopied(false);
        setShowPasswordPrompt(false);
        setAdminPassword('');
      } else {
        alert(data.error || 'Contraseña incorrecta o error al desencriptar');
      }
    } catch (e) {
      alert('Fallo de red al desencriptar');
    }
  };

  const handleRevealClick = (id: string) => {
    setTargetSecretId(id);
    setAdminPassword('');
    setShowPasswordPrompt(true);
  };

  const handleCopy = () => {
    if (decryptedValue) {
      navigator.clipboard.writeText(decryptedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/vault/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, nombre_clave: nombreClave, plaintext })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setCategoria('');
        setNombreClave('');
        setPlaintext('');
        fetchSecrets();
      } else {
        alert(data.error || 'Error al guardar el secreto');
      }
    } catch (e) {
      alert('Fallo de red al encriptar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLabExecute = async () => {
    if(!labInput) return;
    setIsLabLoading(true);
    setLabOutput('');
    try {
      const endpoint = labMode === 'encrypt' ? '/api/admin/vault/lab/encrypt' : '/api/admin/vault/lab/decrypt';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: labInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLabOutput(data.result);
      } else {
        setLabOutput(`Error: ${data.error}`);
      }
    } catch (e) {
      setLabOutput('Fallo de red al conectar con el motor criptográfico.');
    } finally {
      setIsLabLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-red-500">
            <ShieldAlert className="w-8 h-8" />
            BÓVEDA CRIPTOGRÁFICA
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Módulo de inyección y auditoría de secretos [Nivel 4].
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowLabModal(true)}
            className="bg-[#141414] border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-900/20 text-emerald-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
          >
            <Terminal className="w-5 h-5" />
            <span className="hidden sm:inline">Laboratorio en Vivo</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Añadir Secreto</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-[#141414] border border-red-500/20 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-slate-500">
                  <th className="pb-4 font-bold">Categoría</th>
                  <th className="pb-4 font-bold">Nombre Clave</th>
                  <th className="pb-4 font-bold">Valor Cifrado (Vortex-SPN)</th>
                  <th className="pb-4 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Cargando bóveda...
                    </td>
                  </tr>
                ) : secrets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      La bóveda está vacía.
                    </td>
                  </tr>
                ) : (
                  secrets.map((secret) => (
                    <tr key={secret.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 pr-4">
                        <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-white/10">
                          {secret.categoria}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-medium text-slate-200">
                        {secret.nombre_clave}
                      </td>
                      <td className="py-4 pr-4 font-mono text-xs text-red-400/80 break-all">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">{secret.valor_cifrado}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleRevealClick(secret.id)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors inline-flex items-center gap-2 text-xs font-bold uppercase"
                          title="Desencriptar y Ver"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Revelar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Desencriptado */}
      {decryptedValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-red-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => { setDecryptedValue(null); setDecryptedId(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-6 text-red-500">
              <Key className="w-8 h-8" />
              <h3 className="text-xl font-bold">Credencial Revelada</h3>
            </div>
            
            <div className="bg-[#0A0A0A] p-4 rounded-xl border border-white/10 mb-6">
              <p className="font-mono text-emerald-400 break-all text-sm">{decryptedValue}</p>
            </div>
            
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
            >
              {copied ? (
                <><CheckCircle2 className="w-5 h-5" /> Copiado</>
              ) : (
                <><Copy className="w-5 h-5" /> Copiar al Portapapeles</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal Prompt de Contraseña */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => { setShowPasswordPrompt(false); setAdminPassword(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-6 text-red-500">
              <Lock className="w-8 h-8" />
              <h3 className="text-xl font-bold">Autorización Requerida</h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">Por seguridad, ingresa tu contraseña de administrador para desencriptar este valor.</p>
            
            <form onSubmit={handleDecrypt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Tu Contraseña</label>
                <input
                  type="password"
                  required
                  autoFocus
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!adminPassword}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-900/20"
              >
                Verificar y Revelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Secreto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95">
             <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Añadir Nuevo Secreto</h3>
            
            <form onSubmit={handleAddSecret} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría (Ej: AWS_INFRA)</label>
                <input
                  required
                  type="text"
                  value={categoria}
                  onChange={e => setCategoria(e.target.value.toUpperCase())}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Clave</label>
                <input
                  required
                  type="text"
                  value={nombreClave}
                  onChange={e => setNombreClave(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Valor (Plaintext)</label>
                <input
                  required
                  type="password"
                  value={plaintext}
                  onChange={e => setPlaintext(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-2">
                  El valor será encriptado utilizando el motor Cifrado3.py antes de ser almacenado.
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  Encriptar y Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Laboratorio Criptográfico */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-emerald-500/30 rounded-2xl p-6 max-w-3xl w-full shadow-2xl relative animate-in zoom-in-95">
             <button 
              onClick={() => { setShowLabModal(false); setLabInput(''); setLabOutput(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-2 text-emerald-400">
              <Terminal className="w-7 h-7" />
              <h3 className="text-xl font-bold">Laboratorio Vórtice-SPN</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">Demostración en vivo del motor criptográfico (Cifrado3.py). Los datos aquí procesados no se guardan en la base de datos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start relative">
               {/* Input Panel */}
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrada (Input)</label>
                   <button 
                     onClick={() => {
                        setLabMode(labMode === 'encrypt' ? 'decrypt' : 'encrypt');
                        setLabInput(labOutput);
                        setLabOutput('');
                     }}
                     className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1 transition-colors"
                   >
                     <ArrowRightLeft className="w-3 h-3" />
                     {labMode === 'encrypt' ? 'Cambiar a Descifrar' : 'Cambiar a Cifrar'}
                   </button>
                 </div>
                 <textarea
                   value={labInput}
                   onChange={e => setLabInput(e.target.value)}
                   placeholder={labMode === 'encrypt' ? 'Texto claro a cifrar...' : 'Texto cifrado a revelar...'}
                   className="w-full h-40 bg-[#141414] border border-white/10 rounded-xl p-4 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 resize-none transition-colors text-sm"
                 />
                 <button
                    onClick={handleLabExecute}
                    disabled={!labInput || isLabLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                 >
                   {isLabLoading ? (
                     <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     labMode === 'encrypt' ? <Lock className="w-5 h-5" /> : <Eye className="w-5 h-5" />
                   )}
                   {labMode === 'encrypt' ? 'EJECUTAR CIFRADO' : 'EJECUTAR DESCIFRADO'}
                 </button>
               </div>
               
               {/* Arrow connector for desktop */}
               <div className="hidden md:flex absolute left-1/2 top-24 -translate-x-1/2 -translate-y-1/2 bg-[#0A0A0A] p-2 rounded-full border border-white/10 z-10">
                 <ArrowRightLeft className={`w-6 h-6 text-slate-500 ${isLabLoading ? 'animate-pulse text-emerald-500' : ''}`} />
               </div>

               {/* Output Panel */}
               <div className="space-y-3">
                 <div className="flex justify-between items-center h-[26px]">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salida (Output)</label>
                   {labOutput && (
                     <button onClick={() => { navigator.clipboard.writeText(labOutput); alert('Copiado'); }} className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                       <Copy className="w-3 h-3" /> Copiar
                     </button>
                   )}
                 </div>
                 <div className="w-full h-40 bg-[#141414] border border-emerald-500/20 rounded-xl p-4 text-emerald-400 font-mono overflow-y-auto relative text-sm break-all shadow-inner">
                   {isLabLoading ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500/50">
                       <Terminal className="w-8 h-8 animate-pulse mb-2" />
                       <span className="text-xs uppercase tracking-widest animate-pulse">Procesando Vórtice...</span>
                     </div>
                   ) : labOutput ? (
                     labOutput
                   ) : (
                     <span className="text-slate-600 select-none">Esperando ejecución...</span>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
