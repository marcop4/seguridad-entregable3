import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface Product {
  id: string;
  name: string;
  description: string;
  categoria_name: string;
  price: number;
  stock: number;
  image_url: string;
  is_published: boolean;
}

export default function PanelCatalogoTienda() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/jane/products');
        if (res.ok) {
          const data = await res.json();
          // Solo los publicados
          setProducts(data.filter((p: Product) => p.is_published));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.categoria_name && p.categoria_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-amber-600" />
              Catálogo de JANE Artisans
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              Explora nuestros productos artesanales, piezas únicas con historia.
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar artesanías..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-80 border border-slate-200"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-slate-700">No se encontraron productos</h4>
            <p className="text-slate-500 text-sm mt-2">Intenta con otros términos de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(p => (
              <div key={p.id} className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-amber-500/50 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="h-56 relative overflow-hidden bg-slate-100">
                  {p.image_url ? (
                    <img 
                      src={p.image_url} 
                      alt={p.name} 
                      className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded border border-amber-200/50 shadow-sm">
                      {p.categoria_name || 'Exclusivo'}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <h4 className="text-base font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-amber-600 transition-colors">{p.name}</h4>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4 flex-1">{p.description}</p>
                  
                  <div className="flex items-end justify-between mt-auto">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Precio</p>
                      <p className="text-lg font-bold text-emerald-600 font-mono">S/ {Number(p.price).toFixed(2)}</p>
                    </div>
                    {p.stock > 0 ? (
                      <button 
                        onClick={() => addToCart(p)}
                        className="px-4 py-2 bg-slate-900 hover:bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" /> Comprar
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        Agotado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
