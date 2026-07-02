import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, RefreshCw } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  categoria_name: string;
  price: number;
  stock: number;
  image_url: string;
  is_published: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

export default function PanelPuntoVentaPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New Customer Modal States
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ username: '', full_name: '', email: '', phone: '' });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [amountTendered, setAmountTendered] = useState<number | ''>('');

  const fetchProductsAndCustomers = async () => {
    setLoading(true);
    try {
      const [resProd, resCust] = await Promise.all([
        fetch('/api/jane/products'),
        fetch('/api/jane/customers', { headers: { 'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}` } })
      ]);
      if (resProd.ok) {
        const data = await resProd.json();
        setProducts(data.filter((p: Product) => p.is_published));
      }
      if (resCust.ok) {
        setCustomers(await resCust.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCustomers();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // No exceder stock
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (newQ > 0 && newQ <= item.stock) {
          return { ...item, quantity: newQ };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  }, [cart]);

  const subtotal = cartTotal / 1.18;
  const igv = cartTotal - subtotal;
  const vuelto = (paymentMethod === 'Efectivo' && amountTendered !== '') ? Number(amountTendered) - cartTotal : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Efectivo' && (amountTendered === '' || Number(amountTendered) < cartTotal)) {
      alert('El efectivo recibido es menor al total.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const orderData = {
        total: cartTotal,
        cliente_id: selectedCustomerId || null,
        metodo_pago: paymentMethod,
        monto_recibido: paymentMethod === 'Efectivo' ? Number(amountTendered) : cartTotal,
        vuelto: paymentMethod === 'Efectivo' ? vuelto : 0,
        items: cart.map(item => ({
          producto_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        }))
      };

      const response = await fetch('/api/jane/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        alert('¡Orden generada y cobrada con éxito!');
        setCart([]);
        setSelectedCustomerId('');
        setShowPaymentModal(false);
        setAmountTendered('');
        fetchProductsAndCustomers(); // Refrescar stock y clientes
      } else {
        alert('Error al generar la orden.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red.');
    } finally {
      setIsProcessing(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.categoria_name || 'General'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.categoria_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || (p.categoria_name || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateCustomer = async () => {
    if(!newCustomerForm.full_name || !newCustomerForm.email || !newCustomerForm.username) return;
    setIsCreatingCustomer(true);
    try {
      const response = await fetch('/api/jane/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('secure_auth_token')}`
        },
        body: JSON.stringify(newCustomerForm)
      });
      if(response.ok) {
        const newCustomer = await response.json();
        setCustomers([newCustomer, ...customers]);
        setSelectedCustomerId(newCustomer.id);
        setShowNewCustomerModal(false);
        setNewCustomerForm({ username: '', full_name: '', email: '', phone: '' });
      } else {
        const err = await response.json();
        alert(err.error || 'Error creando cliente');
      }
    } catch(e) {
      alert('Error de red');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in relative">
      
      {/* PANEL IZQUIERDO: CATÁLOGO */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        <div className="bg-[#141414] rounded-2xl border border-white/5 p-4 shadow-lg shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              Catálogo POS
            </h3>
            <button 
              onClick={fetchProductsAndCustomers} 
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Actualizar Catálogo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors min-w-[140px] cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pr-2 pb-4">
          {loading ? (
            <div className="text-center text-slate-500 py-10 text-xs">Cargando productos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-xs">No hay productos disponibles.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map(p => {
              const inCart = cart.find(c => c.id === p.id)?.quantity || 0;
              const disabled = inCart >= p.stock;
              return (
                <div 
                  key={p.id} 
                  onClick={() => !disabled && addToCart(p)}
                  className={`bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-sm group transition-all select-none relative h-48 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500/50 cursor-pointer hover:shadow-lg hover:shadow-blue-900/20 active:scale-95'}`}
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-[#050505] flex items-center justify-center">
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).onerror = null;
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>';
                          (e.target as HTMLImageElement).className = 'w-10 h-10 object-contain opacity-50';
                        }}
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-slate-600" />
                    )}
                    {p.stock <= 0 && (
                      <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-600/90 text-white px-4 py-1.5 rounded-lg font-bold tracking-widest uppercase border border-red-400/50 transform -rotate-12 shadow-xl">Agotado</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Price Tag */}
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-white border border-white/10 shadow-lg">
                    S/ {Number(p.price).toFixed(2)}
                  </div>

                  {/* Glassmorphism Bottom Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8">
                    <p className="text-[10px] text-blue-400 font-mono uppercase mb-0.5 truncate tracking-wider">{p.categoria_name || 'Catálogo'}</p>
                    <h4 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-1">{p.name}</h4>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 font-mono">Stock: {p.stock - inCart}</span>
                      {inCart > 0 && (
                        <span className="bg-emerald-600/90 backdrop-blur text-white px-2 py-0.5 rounded-full font-bold">En caja: {inCart}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: TICKET / CARRITO */}
      <div className="bg-[#141414] rounded-2xl border border-white/5 flex flex-col h-[calc(100vh-8rem)] sticky top-0 shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-[#0F0F0F]">
          <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center justify-center gap-2">
            Ticket de Venta
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <ShoppingBag className="w-12 h-12 opacity-20" />
              <p className="text-xs">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex flex-col gap-2 p-3 bg-[#0A0A0A] rounded-xl border border-white/5">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">{item.name}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2 bg-[#141414] rounded-lg border border-white/5 p-1">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center text-slate-200">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      disabled={item.quantity >= item.stock}
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-mono font-bold text-emerald-400">
                    S/ {(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* SELECCIÓN DE CLIENTE */}
        <div className="p-4 border-t border-white/5 bg-[#0A0A0A] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente Asociado</label>
            <button 
              onClick={() => setShowNewCustomerModal(true)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Nuevo
            </button>
          </div>
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-2 bg-[#141414] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Cliente Anónimo (Venta General)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
            ))}
          </select>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#0F0F0F] space-y-3">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Subtotal</span>
            <span className="font-mono">S/ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-xs pb-3 border-b border-white/5">
            <span>IGV (18%)</span>
            <span className="font-mono">S/ {igv.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-300 text-sm uppercase font-bold tracking-wider">Total</span>
            <span className="text-2xl font-mono font-bold text-white">
              S/ {cartTotal.toFixed(2)}
            </span>
          </div>
          
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-sm flex justify-center items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/20 disabled:shadow-none disabled:text-slate-500"
          >
            <CreditCard className="w-5 h-5" />
            Procesar Pago
          </button>
        </div>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setShowNewCustomerModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
            >
              <Minus className="w-5 h-5 rotate-45" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Nuevo Cliente</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                <input type="text" value={newCustomerForm.full_name} onChange={e => setNewCustomerForm({...newCustomerForm, full_name: e.target.value})} className="w-full mt-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Username (DNI/ID)</label>
                <input type="text" value={newCustomerForm.username} onChange={e => setNewCustomerForm({...newCustomerForm, username: e.target.value})} className="w-full mt-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" placeholder="Documento o Apodo" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                <input type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm({...newCustomerForm, email: e.target.value})} className="w-full mt-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" placeholder="juan@ejemplo.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Teléfono (Opcional)</label>
                <input type="text" value={newCustomerForm.phone} onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} className="w-full mt-1 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500" placeholder="+51..." />
              </div>
              <button 
                onClick={handleCreateCustomer}
                disabled={isCreatingCustomer || !newCustomerForm.full_name || !newCustomerForm.email || !newCustomerForm.username}
                className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-sm transition-colors cursor-pointer"
              >
                {isCreatingCustomer ? 'Guardando...' : 'Crear y Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PAGO */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
            >
              <Minus className="w-5 h-5 rotate-45" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Completar Pago</h3>
            <p className="text-sm text-slate-400 mb-6">Total a cobrar: <span className="font-mono text-emerald-400 font-bold text-lg">S/ {cartTotal.toFixed(2)}</span></p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(method => (
                    <button
                      key={method}
                      onClick={() => { setPaymentMethod(method); setAmountTendered(''); }}
                      className={`py-3 rounded-xl font-bold text-sm border transition-colors ${paymentMethod === method ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#0A0A0A] border-white/10 text-slate-400 hover:border-white/30'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Efectivo' && (
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-white/5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Efectivo Recibido (S/)</label>
                    <input 
                      type="number" 
                      value={amountTendered} 
                      onChange={e => setAmountTendered(e.target.value ? Number(e.target.value) : '')} 
                      className="w-full mt-2 px-4 py-3 bg-[#141414] border border-white/10 rounded-xl text-2xl font-mono text-white focus:outline-none focus:border-blue-500" 
                      placeholder="0.00" 
                    />
                  </div>
                  {amountTendered !== '' && (
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Vuelto</span>
                      <span className={`text-2xl font-mono font-bold ${vuelto >= 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        S/ {vuelto >= 0 ? vuelto.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleCheckout}
                disabled={isProcessing || (paymentMethod === 'Efectivo' && (amountTendered === '' || Number(amountTendered) < cartTotal))}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-sm flex justify-center items-center gap-2 transition-all cursor-pointer shadow-lg disabled:shadow-none"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
                {isProcessing ? 'Procesando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
