import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { User } from '../../types';

interface CartSidebarProps {
  currentUser: User | null;
}

export default function CartSidebar({ currentUser }: CartSidebarProps) {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const items = cart.map(item => ({
        id: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      }));

      const res = await fetch('/api/jane/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          total: cartTotal,
          cliente_id: currentUser?.id || null, // Guest checkout support
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        clearCart();
        setTimeout(() => setIsCartOpen(false), 3000);
      } else {
        setError(data.error || 'Error al procesar el pago');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-bold text-slate-900">Tu Carrito</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
              {cart.length}
            </span>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¡Pedido Confirmado!</h3>
              <p className="text-slate-500">
                Tu orden ha sido procesada con éxito.
                {currentUser ? ' Puedes ver el estado en Mis Pedidos.' : ' Gracias por tu compra.'}
              </p>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Tu carrito está vacío</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="mt-6 text-amber-600 font-bold hover:text-amber-700 underline"
              >
                Volver al catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-20 h-20 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-900 line-clamp-2 text-sm">{item.product.name}</h4>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        S/ {(parseFloat(item.product.price as unknown as string) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!success && cart.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="font-bold font-mono text-slate-900">S/ {(cartTotal / 1.18).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 font-medium">IGV (18%)</span>
              <span className="font-bold font-mono text-slate-900">S/ {(cartTotal - (cartTotal / 1.18)).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-6 pt-4 border-t border-slate-200">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-2xl font-black text-slate-900 font-mono">S/ {cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-xl shadow-amber-900/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Proceder al Pago
                </>
              )}
            </button>
            {!currentUser && (
              <p className="text-center text-xs text-slate-500 mt-4">
                Comprando como Invitado. Inicia sesión para un mejor seguimiento.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
