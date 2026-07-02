import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, LogIn, LogOut, Menu, X } from 'lucide-react';
import { User } from '../../types';
import { useCart } from '../../context/CartContext';
import CartSidebar from '../jane/CartSidebar';

interface StoreLayoutProps {
  currentUser: User | null;
  onLogout: () => void;
}

export default function StoreLayout({ currentUser, onLogout }: StoreLayoutProps) {
  const { cart, setIsCartOpen } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <CartSidebar currentUser={currentUser} />
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 -ml-2 text-slate-500 hover:text-black transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/assets/logos/logo-light.png" alt="JANE Artisans" className="h-8 w-auto object-contain" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <Link 
              to="/" 
              onClick={(e) => {
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
            >
              Inicio
            </Link>
            <a 
              href="/#historia" 
              onClick={(e) => {
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  document.getElementById('historia')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
            >
              Nuestra Historia
            </a>
            <Link to="/catalogo" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-black transition-colors">Catálogo</Link>
            {currentUser && currentUser.level === 1 && (
              <Link to="/mi-cuenta" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-black transition-colors">Mis Pedidos</Link>
            )}
          </nav>

          <div className="flex items-center gap-5">
            {currentUser && currentUser.level >= 2 && (
              <Link to="/erp/dashboard" className="hidden sm:block text-[10px] font-bold uppercase tracking-widest bg-black text-white px-3 py-1.5 hover:bg-slate-800 transition-colors">
                Volver al ERP
              </Link>
            )}
            
            <button 
              className="text-black hover:text-slate-500 transition-colors relative" 
              title="Mi Carrito"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-black text-white text-[8px] font-bold">
                {cart.length}
              </span>
            </button>
            
            {currentUser ? (
              <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
                <Link to={currentUser.level >= 2 ? "/erp/dashboard" : "/mi-cuenta"} className="text-xs font-bold uppercase tracking-widest text-black hidden sm:block hover:text-amber-600 transition-colors">
                  {currentUser.username}
                </Link>
                <button onClick={onLogout} className="text-black hover:text-red-600 transition-colors" title="Cerrar sesión">
                  <LogOut className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-black hover:text-slate-500 transition-colors">
                <LogIn className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 flex flex-col gap-4 absolute w-full shadow-xl">
            <Link 
              to="/" 
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="text-sm font-bold uppercase tracking-widest text-slate-800 hover:text-amber-600 transition-colors"
            >
              Inicio
            </Link>
            <a 
              href="/#historia" 
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  document.getElementById('historia')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-sm font-bold uppercase tracking-widest text-slate-800 hover:text-amber-600 transition-colors"
            >
              Nuestra Historia
            </a>
            <Link to="/catalogo" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest text-slate-800 hover:text-amber-600 transition-colors">
              Catálogo
            </Link>
            {currentUser && currentUser.level === 1 && (
              <Link to="/mi-cuenta" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest text-slate-800 hover:text-amber-600 transition-colors">
                Mis Pedidos
              </Link>
            )}
            {currentUser && currentUser.level >= 2 && (
              <Link to="/erp/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest text-amber-600 border border-amber-600 px-4 py-2 text-center rounded-lg hover:bg-amber-50 mt-2 transition-colors">
                Volver al ERP
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 w-full outline-none">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-slate-200 text-slate-400 py-12 text-center text-[10px] uppercase tracking-widest mt-auto">
        <p>&copy; 2026 JANE. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
