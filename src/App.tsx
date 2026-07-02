/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Key, Mail, LogIn, UserPlus, LogOut, ShieldCheck,
  HelpCircle, Terminal, User as UserIcon, Globe, Info,
  Settings, Sparkles, ToggleLeft, Activity, BellRing, CheckCircle,
  Eye, EyeOff
} from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StoreLayout from './components/layouts/StoreLayout';
import ERPLayout from './components/layouts/ERPLayout';
import HomePage from './components/jane/HomePage';
import UnifiedLogin from './components/auth/UnifiedLogin';
import PanelCatalogoTienda from './components/jane/PanelCatalogoTienda';
import PanelMiCuenta from './components/jane/PanelMiCuenta';
import PanelPuntoVentaPOS from './components/jane/PanelPuntoVentaPOS';
import { useGoogleLogin } from '@react-oauth/google';
import { User, AuditLog, UserRole } from './types';
import { CartProvider } from './context/CartContext';
import SecureReceiptViewer from './components/jane/SecureReceiptViewer';
import ManualTabs from './components/ManualTabs';
import TestAutomation from './components/TestAutomation';
import SentinelLogo from './components/SentinelLogo';
import PanelGestorUsuarios from './components/admin/PanelGestorUsuarios';
import PanelRolesJerarquia from './components/admin/PanelRolesJerarquia';
import PanelAuditoriaCifrado from './components/admin/PanelAuditoriaCifrado';
import PanelConfiguracion from './components/admin/PanelConfiguracion';
import PanelBoveda from './components/admin/PanelBoveda';
import PanelInventario from './components/jane/PanelInventario';
import PanelGestorOrdenes from './components/jane/PanelGestorOrdenes';
import PanelGestorBoletas from './components/jane/PanelGestorBoletas';
import PanelClientes from './components/jane/PanelClientes';
import PanelDashboard from './components/jane/PanelDashboard';

import { useToast } from './context/ToastContext';

export default function App() {
  const { showToast } = useToast();
  // Session persistence (Synchronous load to prevent React Router redirect bugs on reload)
  const [currentUser, setCurrentUser] = useState<Omit<User, 'passwordHash' | 'recoveryToken'> | null>(() => {
    const cachedUser = localStorage.getItem('secure_auth_user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem('secure_auth_token') || null;
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('secure_auth_session_id') || null;
  });

  // View engine
  const [view, setView] = useState<'auth' | 'app'>(() => {
    return localStorage.getItem('secure_auth_user') ? 'app' : 'auth';
  });
  const [subView, setSubView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [lockedUntilApp, setLockedUntilApp] = useState<string | null>(null);
  const [appTab, setAppTab] = useState<'dashboard' | 'admin' | 'manual' | 'testing'>(() => {
    return (localStorage.getItem('sentinel_app_tab') as any) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('sentinel_app_tab', appTab);
  }, [appTab]);

  // Registration & login fields state
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password reset fields state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Form interactive feedback states
  const [shakeForm, setShakeForm] = useState(false);
  const [hasLoginInputError, setHasLoginInputError] = useState(false);

  // Diagnostics & Logs
  const [usersList, setUsersList] = useState<Omit<User, 'passwordHash' | 'recoveryToken'>[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [myActivity, setMyActivity] = useState<any[] | null>(null);

  // Errors / Overlays
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [systemAlertOverlay, setSystemAlertOverlay] = useState<string | null>(null);
  const [overrideUserRef, setOverrideUserRef] = useState<string | null>(null);

  // Audio simulation toggler
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Google Simulator state
  const [googleSimulatorOpen, setGoogleSimulatorOpen] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  // Audio trigger
  const playPing = (type: 'success' | 'alert' | 'pop') => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      }
    } catch (e) { }
  };

  // No need for async session restore on mount since we initialized synchronously above

  // Interceptor global para forzar cierre de sesión en todas las llamadas API si se revoca la sesión
  useEffect(() => {
    const handleRevoked = (e: any) => {
      playPing('alert');
      localStorage.clear();
      setCurrentUser(null);
      setSessionToken(null);
      setCurrentSessionId(null);
      setView('auth');
      setSubView('login');
      setSystemAlertOverlay(`Acceso denegado: ${e.detail || 'Tu sesión ha sido revocada remotamente.'}`);
    };
    window.addEventListener('session_revoked_event', handleRevoked);

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data.code === 'SESSION_REVOKED') {
            window.dispatchEvent(new CustomEvent('session_revoked_event', { detail: data.message }));
          }
        } catch(e) {}
      }
      return response;
    };

    return () => { 
      window.removeEventListener('session_revoked_event', handleRevoked);
      window.fetch = originalFetch; 
    };
  }, []);

  // Detect Password Reset token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const isResetPath = window.location.pathname.includes('reset-password');

    if (tokenFromUrl || isResetPath) {
      if (tokenFromUrl) setResetToken(tokenFromUrl);
      setSubView('reset');
      setView('auth');
      
      // Clean up the URL to prevent token leakage in history
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // Cross-tab split-brain synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'secure_auth_session_id' && e.newValue !== currentSessionId) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentSessionId]);

  const syncAdminData = async () => {
    if (!currentUser || currentUser.level < 2) return;

    // Fallback protection just in case
    if (localStorage.getItem('secure_auth_session_id') !== currentSessionId) {
      window.location.reload();
      return;
    }

    try {
      let uRes, logRes, notifRes;

      const headers = {
        'Authorization': `Bearer ${sessionToken}`,
        'x-session-id': currentSessionId || ''
      };

      if (currentUser.level >= 3) {
        uRes = await fetch('/api/admin/users', { headers });
      }
      if (currentUser.level >= 2) {
        logRes = await fetch('/api/admin/audit-logs', { headers });
        notifRes = await fetch('/api/admin/notifications', { headers });
      }

      if (uRes?.ok) {
        const data = await uRes.json();
        setUsersList(data);
        const me = data.find((u: any) => u.id === currentUser.id);
        if (me && (me.level !== currentUser.level || me.role !== currentUser.role)) {
          setCurrentUser(me);
          localStorage.setItem('secure_auth_user', JSON.stringify(me));
        }
      }
      if (logRes?.ok) setAuditLogs(await logRes.json());
      if (notifRes?.ok) setNotifications(await notifRes.json());
    } catch (e) {
      console.error('Error syncing admin data', e);
    }
  };

  useEffect(() => {
    if (view === 'app' && currentUser && currentUser.level >= 2) {
      syncAdminData();
      const interval = setInterval(syncAdminData, 6000);
      return () => clearInterval(interval);
    }
  }, [view, currentUser, refreshSeed]);

  useEffect(() => {
    if (appTab === 'dashboard' && currentUser && currentUser.level <= 2) {
      setMyActivity(null);
      fetch('/api/users/my-activity', {
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'x-session-id': currentSessionId || '' 
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMyActivity(data);
          else setMyActivity([]);
        })
        .catch(() => setMyActivity([]));
    }
  }, [appTab, currentUser, currentSessionId, refreshSeed]);

  // Real-time Push (SSE) Client Handler
  useEffect(() => {
    if (!currentUser || !currentSessionId) return;

    // Connect to Server-Sent Events notifications
    const sse = new EventSource(`/api/auth/sse?token=${sessionToken}`);

    sse.onerror = () => {
      console.error("[SSE] Error de conexión detectado. Cerrando EventSource para evitar DDoS loop...");
      sse.close();
      // Wait 10 seconds before attempting to reconnect via state trigger
      setTimeout(() => {
        setRefreshSeed(s => s + 1);
      }, 10000);
    };

    sse.addEventListener('session_revoked', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.sessionId === currentSessionId || data.sessionId === "all") {
        // Enforce browser kick
        playPing('alert');
        localStorage.clear();
        setCurrentUser(null);
        setSessionToken(null);
        setCurrentSessionId(null);
        setView('auth');
        setSubView('login');
        setSystemAlertOverlay(`Sesión revocada remotamente: ${data.reason}`);
      }
    });

    sse.addEventListener('notification', (e: MessageEvent) => {
      const notif = JSON.parse(e.data);
      playPing('pop');
      setNotifications(prev => [notif, ...prev]);
    });

    sse.addEventListener('audit_update', (e: MessageEvent) => {
      const log = JSON.parse(e.data);
      setAuditLogs(prev => [log, ...prev]);
    });

    return () => {
      sse.close();
    };
  }, [currentUser, currentSessionId, refreshSeed]);

  // Auto-dismiss feedback messages
  useEffect(() => {
    if (apiError || apiSuccess || systemAlertOverlay) {
      const timer = setTimeout(() => {
        setApiError(null);
        setApiSuccess(null);
        setSystemAlertOverlay(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [apiError, apiSuccess, systemAlertOverlay]);

  // General login trigger
  const handleLogin = async (e: React.FormEvent, forceOverride = false, inputUser?: string, inputPass?: string) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);
    setHasLoginInputError(false);

    const userToUse = inputUser || loginInput;
    const passToUse = inputPass || loginPassword;

    // Basic fields validation
    if (!userToUse || !passToUse) {
      setApiError("Por favor ingrese todos los campos requeridos.");
      setHasLoginInputError(true);
      return false;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: userToUse,
          password: passToUse,
          overrideSession: forceOverride
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.message || "Fallo de ingreso.");
        setHasLoginInputError(true);
        setShakeForm(true);
        playPing('alert');
        setTimeout(() => {
          setShakeForm(false);
        }, 500);
        
        if (response.status === 429) {
          setLockedUntilApp(data.lockedUntil);
          if (data.message && data.message.includes("Demasiadas peticiones a la API")) {
            showToast('Bloqueo temporal por exceso de peticiones.', 'warning');
          } else {
            showToast('Contraseña incorrecta. Cuenta suspendida temporalmente por seguridad.', 'warning');
          }
        }
        
        return false;
      }

      if (data.requiresSessionOverrideConfirm) {
        // Collisions flow! Prompt warning
        setOverrideUserRef(userToUse);
        playPing('alert');
        return false;
      }

      if (data.success && data.user) {
        localStorage.removeItem('secure_auth_user');
        localStorage.removeItem('secure_auth_token');
        localStorage.removeItem('secure_auth_session_id');

        localStorage.setItem('secure_auth_user', JSON.stringify(data.user));
        localStorage.setItem('secure_auth_token', data.token || '');
        localStorage.setItem('secure_auth_session_id', data.sessionId || '');

        setCurrentUser(data.user);
        setSessionToken(data.token || null);
        setCurrentSessionId(data.sessionId || null);
        setHasLoginInputError(false);

        // Reset states
        setLockedUntilApp(null);
        setLoginPassword('');
        setOverrideUserRef(null);
        if (data.user) {
          setAppTab('dashboard');
        }
        setView('app');
        setApiSuccess("Conectado exitosamente.");
        playPing('success');
        return true;
      }
      return false;
    } catch (err) {
      setApiError("Error de comunicación de red con el servidor.");
      setHasLoginInputError(true);
      setShakeForm(true);
      playPing('alert');
      setTimeout(() => {
        setShakeForm(false);
      }, 500);
      return false;
    }
  };

  // Google Actual OAuth Integration
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setApiError(null);
      setApiSuccess(null);

      try {
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: tokenResponse.access_token
          })
        });

        const data = await response.json();
        if (!response.ok) {
          setApiError(data.message);
          playPing('alert');
          return;
        }

        if (data.success && data.user) {
          localStorage.removeItem('secure_auth_user');
          localStorage.removeItem('secure_auth_token');
          localStorage.removeItem('secure_auth_session_id');

          localStorage.setItem('secure_auth_user', JSON.stringify(data.user));
          localStorage.setItem('secure_auth_token', data.token || '');
          localStorage.setItem('secure_auth_session_id', data.sessionId || '');

          setCurrentUser(data.user);
          setSessionToken(data.token || null);
          setCurrentSessionId(data.sessionId || null);

          setView('app');
          setAppTab('dashboard');
          playPing('success');
        }
      } catch (err) {
        setApiError("Error contactando al servidor para verificar Google.");
      }
    },
    onError: () => {
      setApiError("Inicio de sesión de Google cancelado o fallido.");
      playPing('alert');
    }
  });

  // Google OAuth for Account Linking
  const linkWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setApiError(null);
      setApiSuccess(null);

      try {
        const response = await fetch('/api/users/link-google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': currentSessionId || ''
          },
          body: JSON.stringify({ credential: tokenResponse.access_token })
        });
        const data = await response.json();

        if (!response.ok) {
          setApiError(data.message);
          playPing('alert');
          return;
        }

        if (data.success && data.user) {
          localStorage.setItem('secure_auth_user', JSON.stringify(data.user));
          setCurrentUser(data.user);
          setApiSuccess(data.message);
          playPing('success');
        }
      } catch (err) {
        setApiError("Error contactando al servidor para vincular cuenta Google.");
      }
    },
    onError: () => {
      setApiError("Vinculación con Google cancelada o fallida.");
      playPing('alert');
    }
  });

  const handleUnlinkGoogle = async () => {
    setApiError(null);
    setApiSuccess(null);
    try {
      const response = await fetch('/api/users/unlink-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': currentSessionId || ''
        }
      });
      const data = await response.json();
      if (!response.ok) {
        setApiError(data.message);
        playPing('alert');
        return;
      }
      if (data.success && data.user) {
        localStorage.setItem('secure_auth_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setApiSuccess(data.message);
        playPing('success');
      }
    } catch (err) {
      setApiError("Error contactando al servidor para desvincular cuenta Google.");
    }
  };

  // Registration callback
  const handleRegister = async (e: React.FormEvent, rUser?: string, rEmail?: string, rName?: string, rPass?: string) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    const u = rUser || regUsername;
    const em = rEmail || regEmail;
    const n = rName || regFullName;
    const p = rPass || regPassword;

    if (!u || !em || !n || !p) {
      setApiError("Se requieren todos los campos para el alta.");
      return false;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          email: em,
          fullName: n,
          password: p
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setApiError(data.message);
        playPing('alert');
        return false;
      }

      setApiSuccess("¡Registro exitoso! Ya puede iniciar sesión abajo.");
      setSubView('login');
      setLoginInput(u);
      setRegPassword('');
      setRegConfirmPassword('');
      playPing('success');
      return true;
    } catch (err) {
      setApiError("Error de conexión al dar de alta al usuario.");
      return false;
    }
  };

  // Logout callback
  const handleLogout = async () => {
    if (!currentUser) return;
    try {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-session-id': currentSessionId || ''
        },
        body: JSON.stringify({
          userId: currentUser.id,
          sessionId: currentSessionId
        })
      }).catch(() => { }); // Fire and forget
    } catch (e) { }

    localStorage.removeItem('secure_auth_user');
    localStorage.removeItem('secure_auth_token');
    localStorage.removeItem('secure_auth_session_id');
    setCurrentUser(null);
    setSessionToken(null);
    setCurrentSessionId(null);
    setView('auth');
    setSubView('login');
    setApiSuccess("Sesión cerrada correctamente.");
    playPing('pop');
  };

  // Forgot Password callback
  const handleForgotPassword = async (e: React.FormEvent, fEmail?: string) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    const emailToUse = fEmail || forgotEmail;

    if (!emailToUse) {
      setApiError("Ingrese su dirección de correo por favor.");
      return false;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `${emailToUse}@jane.art` })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setApiError(data.message || "Fallo del servidor de correo.");
        playPing('alert');
        return false;
      } else {
        setApiSuccess("Si el correo ingresado coincide con una cuenta activa en nuestro sistema, en breve recibirás las instrucciones para restablecer tu contraseña. Si no lo recibes en unos minutos, verifica que hayas escrito bien tu correo o revisa tu carpeta de Spam.");
        setRefreshSeed(prev => prev + 1);
        playPing('success');
        return true;
      }
    } catch (err) {
      setApiError("Fallo de red en recuperación.");
      return false;
    }
  };

  // Password Reset with Token callback
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    if (!resetToken || !resetPassword) {
      setApiError("El token y la nueva contraseña son obligatorios.");
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword: resetPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setApiError(data.message);
        playPing('alert');
        return;
      }

      setApiSuccess(data.message);
      setSubView('login');
      setResetPassword('');
      setResetToken('');
      setRefreshSeed(prev => prev + 1);
      playPing('success');
    } catch (e) {
      setApiError("Error al procesar el cambio definitivo de contraseña.");
    }
  };

  const handleClearNotifications = async () => {
    try {
      await fetch('/api/admin/notifications/read', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'x-session-id': currentSessionId || ''
        }
      });
      syncAdminData();
    } catch (e) { }
  };

  return (
      <Router>
        <Routes>
          {/* ==================================================== */}
          {/* RUTA DE DOCUMENTOS SEGUROS */}
          {/* ==================================================== */}
          <Route path="/secure-view" element={<SecureReceiptViewer />} />

          {/* ==================================================== */}
          {/* JANE FRONTEND (Público) */}
          {/* ==================================================== */}
          <Route path="/" element={
            <CartProvider>
              <StoreLayout currentUser={currentUser} onLogout={handleLogout} />
            </CartProvider>
          }>
            <Route path="/login" element={
              currentUser ? (
                <Navigate to={currentUser.level >= 2 ? "/erp/dashboard" : "/catalogo"} replace />
              ) : (
                <UnifiedLogin 
                  onLogin={async (user, pass, force) => {
                    const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                    return await handleLogin(dummyEvent, force, user, pass);
                  }}
                  onRegister={async (user, email, name, pass) => {
                    const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                    return await handleRegister(dummyEvent, user, email, name, pass);
                  }}
                  onForgot={async (email) => {
                    const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                    return await handleForgotPassword(dummyEvent, email);
                  }}
                  apiError={apiError}
                  apiSuccess={apiSuccess}
                  setApiError={setApiError}
                  setApiSuccess={setApiSuccess}
                  systemAlertOverlay={systemAlertOverlay}
                  setSystemAlertOverlay={setSystemAlertOverlay}
                  overrideUserRef={overrideUserRef}
                  playPing={playPing}
                  onGoogleLogin={() => loginWithGoogle()}
                  lockedUntilApp={lockedUntilApp}
                />
              )
            } />
            
            {/* ==================================================== */}
            {/* TIENDA PUBLICA (Nivel 1 o invitados) */}
            {/* ==================================================== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={
              <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                <PanelCatalogoTienda />
              </div>
            } />
            <Route path="/mi-cuenta" element={
              currentUser ? <PanelMiCuenta currentUser={currentUser} /> : <Navigate to="/login" replace />
            } />
          </Route>

          {/* ==================================================== */}
          {/* JANE ERP - MODULO SENTINEL (Nivel >= 3) */}
          {/* ==================================================== */}
          <Route path="/erp" element={
            currentUser && currentUser.level >= 2 ? (
              <ERPLayout 
                currentUser={currentUser} 
                onLogout={handleLogout} 
                audioEnabled={audioEnabled} 
                setAudioEnabled={setAudioEnabled} 
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }>
            <Route path="dashboard" element={
              currentUser && currentUser.level >= 2 ? <PanelDashboard currentUser={currentUser} /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="configuracion" element={
              currentUser && currentUser.level >= 4 ? <PanelConfiguracion currentUser={currentUser} /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="boletas" element={
              currentUser && currentUser.level >= 2 ? <PanelGestorBoletas currentUser={currentUser} /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="clientes" element={
              currentUser && currentUser.level >= 2 ? <PanelClientes /> : <Navigate to="/erp/dashboard" replace />
            } />
            
            
            {/* Direct Admin & JANE routes */}
            <Route path="usuarios" element={
              currentUser && currentUser.level >= 3 ? 
              <PanelGestorUsuarios 
                currentUser={currentUser} 
                users={usersList} 
                onRefreshUsers={syncAdminData}
                auditLogs={auditLogs}
                onRefreshAudit={syncAdminData}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
              /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="roles" element={
              currentUser && currentUser.level === 4 ? 
              <PanelRolesJerarquia 
                currentUser={currentUser} 
                users={usersList} 
                onRefreshUsers={syncAdminData}
                auditLogs={auditLogs}
                onRefreshAudit={syncAdminData}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
              /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="auditoria" element={
              currentUser && currentUser.level === 4 ? 
              <PanelAuditoriaCifrado 
                currentUser={currentUser} 
                users={usersList} 
                onRefreshUsers={syncAdminData}
                auditLogs={auditLogs}
                onRefreshAudit={syncAdminData}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
              /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="inventario" element={
              currentUser && currentUser.level >= 2 ? <PanelInventario currentUser={currentUser} /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="ordenes" element={
              currentUser && currentUser.level >= 2 ? <PanelGestorOrdenes /> : <Navigate to="/erp/dashboard" replace />
            } />


            {currentUser && currentUser.level >= 2 && (
               <Route path="pos" element={<PanelPuntoVentaPOS />} />
            )}

            <Route path="manual" element={
               currentUser ? <ManualTabs currentUser={currentUser} /> : null
            } />

            <Route path="testing" element={
               currentUser && currentUser.level >= 4 ? <TestAutomation /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="boveda" element={
               currentUser && currentUser.level === 4 ? <PanelBoveda /> : <Navigate to="/erp/dashboard" replace />
            } />
          </Route>

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }
  