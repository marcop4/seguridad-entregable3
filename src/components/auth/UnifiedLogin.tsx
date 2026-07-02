import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, HelpCircle, Activity, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UnifiedLoginProps {
  onLogin: (user: string, pass: string, force: boolean) => Promise<boolean>;
  onRegister: (username: string, email: string, fullName: string, pass: string) => Promise<boolean>;
  onForgot: (email: string) => Promise<boolean>;
  apiError: string | null;
  apiSuccess: string | null;
  setApiError: (val: string | null) => void;
  setApiSuccess: (val: string | null) => void;
  systemAlertOverlay: string | null;
  setSystemAlertOverlay: (val: string | null) => void;
  overrideUserRef: string | null;
  playPing: (type: 'success' | 'alert' | 'pop') => void;
  onGoogleLogin?: () => void;
  lockedUntilApp?: string | null;
}

export default function UnifiedLogin({
  onLogin, onRegister, onForgot,
  apiError, apiSuccess, setApiError, setApiSuccess,
  systemAlertOverlay, setSystemAlertOverlay,
  overrideUserRef, playPing, onGoogleLogin,
  lockedUntilApp
}: UnifiedLoginProps) {
  const [subView, setSubView] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login State
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [hasLoginInputError, setHasLoginInputError] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot State
  const [forgotEmail, setForgotEmail] = useState('');

  const navigate = useNavigate();

  // Countdown State
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!lockedUntilApp) {
      setCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(lockedUntilApp).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown(null);
        clearInterval(interval);
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntilApp]);

  const handleLoginSubmit = async (e: React.FormEvent, forceOverride = false) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);
    setHasLoginInputError(false);

    if (!loginInput || !loginPassword) {
      setApiError("Por favor ingrese todos los campos requeridos.");
      setHasLoginInputError(true);
      return;
    }

    const success = await onLogin(loginInput, loginPassword, forceOverride);
    if (!success) {
      setHasLoginInputError(true);
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    if (pass.length > 7) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[a-z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;
    
    if (score <= 40) return { score, label: 'DÉBIL', color: 'bg-red-500' };
    if (score <= 80) return { score, label: 'MEDIA', color: 'bg-amber-500' };
    return { score, label: 'FUERTE', color: 'bg-emerald-500' };
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setApiError("Las contraseñas no coinciden. Por favor verifique.");
      playPing('alert');
      return;
    }
    const success = await onRegister(regUsername, regEmail || "", regFullName, regPassword);
    if (success) {
      setSubView('login');
      setLoginInput(regUsername);
      setRegPassword('');
      setRegConfirmPassword('');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onForgot(forgotEmail);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-20 flex flex-col items-center justify-center font-sans">
      <div className={`w-full bg-white space-y-10 ${shakeForm ? 'animate-shake' : ''}`}>
        
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-black">Bienvenido/a</h1>
          <p className="text-sm text-slate-600">
            Inicia sesión con tu cuenta o regístrate para ser parte de JANE.
          </p>
        </div>

        <div className="flex justify-center gap-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => { setSubView('login'); setApiError(null); setApiSuccess(null); }}
            className={`text-xs font-bold tracking-widest uppercase pb-2 transition-all border-b-2 ${subView === 'login' ? 'border-black text-black' : 'border-transparent text-slate-400 hover:text-black'}`}
          >
            Inicia Sesión
          </button>
          <button
            onClick={() => { setSubView('register'); setApiError(null); setApiSuccess(null); }}
            className={`text-xs font-bold tracking-widest uppercase pb-2 transition-all border-b-2 ${subView === 'register' ? 'border-black text-black' : 'border-transparent text-slate-400 hover:text-black'}`}
          >
            Registro
          </button>
        </div>

        {/* API FEEDS FEEDBACK BAR */}
        {(apiError || apiSuccess || systemAlertOverlay) && (
          <div className="space-y-2 animate-fade-in">
            {apiSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>{apiSuccess}</span>
              </div>
            )}
            {apiError && (
              <div className="p-3 bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500" />
                <span>{apiError}</span>
              </div>
            )}
          </div>
        )}

        {/* COLLISION DETECTOR PROMPT */}
        {overrideUserRef && subView === 'login' && (
          <div className="p-4 bg-amber-50 space-y-3">
            <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
              Sesión activa previa detectada
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Ya existe una sesión abierta. Si continúas, esa sesión será <strong>cerrada automáticamente</strong>.
            </p>
            <button
              onClick={(e) => handleLoginSubmit(e, true)}
              className="w-full px-4 py-3 bg-black hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              Forzar y Entrar
            </button>
          </div>
        )}

        {subView === 'login' && !overrideUserRef && (
          <form onSubmit={(e) => handleLoginSubmit(e, false)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide">E-mail o Usuario</label>
              <input
                type="text"
                autoFocus
                className={`w-full px-0 py-3 bg-transparent border-b ${hasLoginInputError ? 'border-red-500' : 'border-slate-300'} text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none disabled:opacity-50`}
                value={loginInput}
                onChange={(e) => { setLoginInput(e.target.value); setHasLoginInputError(false); }}
                disabled={countdown !== null}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide flex justify-between">
                <span>Contraseña</span>
                <span className="text-[10px] text-slate-500 hover:text-black cursor-pointer lowercase tracking-normal" onClick={() => setSubView('forgot')}>
                  ¿olvidaste tu contraseña?
                </span>
              </label>
              <input
                type="password"
                className={`w-full px-0 py-3 bg-transparent border-b ${hasLoginInputError ? 'border-red-500' : 'border-slate-300'} text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none disabled:opacity-50`}
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setHasLoginInputError(false); }}
                disabled={countdown !== null}
              />
            </div>
            <div className="pt-4 space-y-4">
              {countdown !== null ? (
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-not-allowed">
                  <span>CUENTA BLOQUEADA ⏳ {countdown}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-black hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Entrar con E-mail y Contraseña
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setSubView('register')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-transparent border border-black hover:bg-slate-50 text-black text-xs font-bold uppercase tracking-widest transition-colors"
              >
                No tengo cuenta, Registrarme
              </button>

              {onGoogleLogin && (
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-black text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  Continuar con Google
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-8 uppercase tracking-widest">
              <LogIn className="w-3 h-3" />
              <span>Todos los datos se mantienen de forma segura</span>
            </div>
          </form>
        )}

        {subView === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide">Nombre Completo</label>
              <input type="text" className="w-full px-0 py-3 bg-transparent border-b border-slate-300 text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none" value={regFullName} onChange={e => setRegFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide">Usuario</label>
              <input type="text" className="w-full px-0 py-3 bg-transparent border-b border-slate-300 text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none" value={regUsername} onChange={e => setRegUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide">Correo Electrónico</label>
              <div className="flex border-b border-slate-300 focus-within:border-black transition-colors">
                <input type="email" className="w-full px-0 py-3 bg-transparent text-black text-sm focus:outline-none rounded-none" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide flex justify-between">
                <span>Contraseña</span>
                {regPassword && (
                   <span className={`text-[10px] font-bold ${getPasswordStrength(regPassword).color.replace('bg-', 'text-')}`}>
                     {getPasswordStrength(regPassword).label}
                   </span>
                )}
              </label>
              <input type="password" className="w-full px-0 py-3 bg-transparent border-b border-slate-300 text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
              
              {/* Barra de fortaleza */}
              <div className="h-1 w-full bg-slate-100 flex rounded overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getPasswordStrength(regPassword).color}`} 
                  style={{ width: `${getPasswordStrength(regPassword).score}%` }} 
                />
              </div>

              {/* Lista dinámica de requisitos */}
              <div className="pt-1">
                <ul className="text-[9px] text-slate-400 space-y-0.5">
                  <li className={`flex items-center gap-1 transition-colors ${regPassword.length > 7 ? 'text-emerald-500 font-bold' : ''}`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span> Al menos 8 caracteres
                  </li>
                  <li className={`flex items-center gap-1 transition-colors ${/[A-Z]/.test(regPassword) ? 'text-emerald-500 font-bold' : ''}`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span> 1 letra mayúscula
                  </li>
                  <li className={`flex items-center gap-1 transition-colors ${/[a-z]/.test(regPassword) ? 'text-emerald-500 font-bold' : ''}`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span> 1 letra minúscula
                  </li>
                  <li className={`flex items-center gap-1 transition-colors ${/[0-9]/.test(regPassword) ? 'text-emerald-500 font-bold' : ''}`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span> 1 número
                  </li>
                  <li className={`flex items-center gap-1 transition-colors ${/[@$!%*?&_#-]/.test(regPassword) ? 'text-emerald-500 font-bold' : ''}`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span> 1 símbolo especial (@$!%*?&_#-)
                  </li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide">Confirmar Contraseña</label>
              <input type="password" className="w-full px-0 py-3 bg-transparent border-b border-slate-300 text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} />
            </div>
            <div className="pt-4 space-y-4">
              <button type="submit" className="w-full flex items-center justify-center px-4 py-3.5 bg-black hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-widest transition-colors">
                Completar Registro
              </button>
              <button
                type="button"
                onClick={() => setSubView('login')}
                className="w-full flex items-center justify-center px-4 py-3.5 bg-transparent hover:bg-slate-50 text-black text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {subView === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-6">
             <div className="text-center space-y-2 pb-4">
                <HelpCircle className="w-8 h-8 text-black mx-auto mb-4" />
                <p className="text-sm text-slate-600">
                  Ingresa tu usuario o prefijo de correo para recibir las instrucciones de recuperación.
                </p>
             </div>
             <div className="space-y-2">
              <label className="text-xs font-semibold text-black uppercase tracking-wide">Usuario o Correo</label>
              <input type="text" className="w-full px-0 py-3 bg-transparent border-b border-slate-300 text-black text-sm focus:outline-none focus:border-black transition-colors rounded-none" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            </div>
            <div className="pt-4 space-y-4">
              <button type="submit" className="w-full flex items-center justify-center px-4 py-3.5 bg-black hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-widest transition-colors">
                Enviar Instrucciones
              </button>
              <button
                type="button"
                onClick={() => setSubView('login')}
                className="w-full flex items-center justify-center px-4 py-3.5 bg-transparent hover:bg-slate-50 text-black text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Volver
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
