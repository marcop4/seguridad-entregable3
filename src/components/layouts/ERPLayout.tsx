import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import SentinelLogo from '../SentinelLogo';
import { User } from '../../types';
import { LogOut, BellRing, Users, ShieldAlert, FileSliders, Package, ShoppingCart, MonitorSmartphone, LayoutDashboard, FileText, Settings, Key, Menu, X } from 'lucide-react';

interface ERPLayoutProps {
  currentUser: User | null;
  onLogout: () => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
}

export default function ERPLayout({ currentUser, onLogout, audioEnabled, setAudioEnabled }: ERPLayoutProps) {
  const location = useLocation();
  const mainRef = React.useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  const SidebarLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname.includes(to);
    return (
      <Link
        to={to}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all border-l-2 ${
          isActive
            ? 'bg-blue-500/10 text-blue-400 border-blue-500'
            : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
        }`}
      >
        <Icon className="w-5 h-5" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-200 flex flex-col font-sans outline-none">
      <header className="bg-[#0F0F0F] border-b border-white/10 sticky top-0 z-50 transition-colors shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/erp/dashboard" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
              <div className="bg-white p-1 rounded-lg shadow-sm shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <img src="/assets/logos/logo-light.png" alt="JANE Isotipo" className="h-8 w-8 object-contain" />
            </div>
            <div className="flex flex-col justify-center translate-y-[1px]">
              <span className="text-white font-bold tracking-widest text-lg leading-none">JANE</span>
              <span className="hidden sm:block text-[10px] sm:text-[11px] text-slate-500 font-mono tracking-widest uppercase mt-1">
                Módulo de Seguridad y Operaciones
              </span>
            </div>
          </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
             <Link to="/" className="px-3 py-1.5 text-xs font-bold bg-slate-800 border border-white/10 text-white rounded-md hover:bg-slate-700 transition">
                Ver Tienda
              </Link>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${audioEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/5 text-slate-500 border-white/10'
                }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{audioEnabled ? 'Efectos Activos' : 'Silencio'}</span>
            </button>

            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
                    alt="Perfil"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-white/10"
                  />
                  <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-[#0A0A0A] animate-pulse" />
                </div>
                <div className="hidden md:block leading-none mr-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white">{currentUser.fullName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[9px] font-mono font-bold text-blue-400 uppercase">{currentUser.role}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-1 sm:px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`w-64 bg-[#0A0A0A] border-r border-white/10 flex-col py-6 overflow-y-auto shrink-0 transition-transform duration-300 md:translate-x-0 z-40 ${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 top-16 h-[calc(100vh-4rem)] flex translate-x-0' : 'hidden md:flex'
        }`}>
          <div className="space-y-6">
            
            <div className="space-y-1">
              <SidebarLink to="/erp/dashboard" icon={LayoutDashboard} label="Dashboard" />
            </div>

            {currentUser && currentUser.level >= 4 && (
              <div>
                <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Seguridad Sentinel</h3>
                <div className="space-y-1">
                  <SidebarLink to="/erp/roles" icon={FileSliders} label="Roles y Jerarquías" />
                  <SidebarLink to="/erp/auditoria" icon={ShieldAlert} label="Auditoría y Cifrado" />
                  <SidebarLink to="/erp/boveda" icon={Key} label="Bóveda Criptográfica" />
                  <SidebarLink to="/erp/configuracion" icon={Settings} label="Configuración Global" />
                </div>
              </div>
            )}

            {currentUser && currentUser.level >= 3 && (
              <div>
                <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Recursos Humanos</h3>
                <div className="space-y-1">
                  <SidebarLink to="/erp/usuarios" icon={Users} label="Gestor de Usuarios" />
                </div>
              </div>
            )}

            {currentUser && currentUser.level >= 3 && (
              <div>
                <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">JANE Admin</h3>
                <div className="space-y-1">
                  <SidebarLink to="/erp/inventario" icon={Package} label="Inventario" />
                </div>
              </div>
            )}

            {currentUser && currentUser.level >= 2 && (
              <div>
                <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Operativo</h3>
                <div className="space-y-1">
                  <SidebarLink to="/erp/pos" icon={MonitorSmartphone} label="Punto de Venta POS" />
                  <SidebarLink to="/erp/ordenes" icon={ShoppingCart} label="Gestor de Órdenes" />
                  <SidebarLink to="/erp/boletas" icon={FileText} label="Gestor de Boletas" />
                  <SidebarLink to="/erp/clientes" icon={Users} label="Historial de Clientes" />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 outline-none bg-[#0A0A0A]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
