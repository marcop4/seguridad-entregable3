import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, ShieldCheck, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface Product {
  id: string;
  name: string;
  description: string;
  categoria_name: string;
  price: number;
  stock: number;
  image_url: string;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/jane/products');
        if (res.ok) {
          const data = await res.json();
          // Solo mostrar los primeros 6 productos publicados
          setProducts(data.filter((p: any) => p.is_published).slice(0, 6));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#historia') {
      setTimeout(() => {
        document.getElementById('historia')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[600px] w-full flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=2070&auto=format&fit=crop" 
            alt="Cerámica JANE Artisans" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center text-white px-4 animate-slide-up max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 text-sm font-bold uppercase tracking-widest shadow-xl">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Artesanía de Lujo</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-lg leading-tight">
            El Arte en tus <span className="text-amber-500">Manos</span>
          </h1>
          <p className="text-lg md:text-2xl font-light mb-10 max-w-3xl mx-auto drop-shadow-md text-slate-200">
            Cerámica, textilería y joyería exclusiva. Piezas únicas creadas con técnicas milenarias para embellecer tu entorno.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/catalogo" className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-full shadow-xl shadow-amber-900/30 transition-all text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> Explorar Catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* Quiénes Somos Section */}
      <section id="historia" className="bg-[#0A0A0A] py-20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Nuestra Historia</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Rescatando el legado de los Andes para el mundo moderno.
              </h3>
              <p className="text-slate-400 text-lg leading-relaxed">
                JANE Artisans nació con una misión clara: preservar las técnicas milenarias de la sierra y la costa, empoderando a comunidades de artesanos a través del comercio justo.
              </p>
              <p className="text-slate-400 text-lg leading-relaxed">
                Cada vasija, cada manto y cada joya de plata cuenta una historia de generaciones. Nuestro equipo selecciona personalmente las piezas más extraordinarias, garantizando que el arte ancestral sobreviva al paso del tiempo.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold">Comercio Justo y Certificado</h4>
                  <p className="text-slate-500 text-sm">Apoyamos el desarrollo sostenible.</p>
                </div>
              </div>
            </div>
            <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
              <img 
                src="https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=2070&auto=format&fit=crop" 
                alt="Tejedora Andina" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                <p className="text-white font-bold text-lg">Maestros Artesanos en Acción</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Catalog Section */}
      <section className="bg-[#141414] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-2">Catálogo</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-white">Últimas Colecciones</h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-[#0A0A0A] rounded-2xl h-80 border border-white/5"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-slate-500 py-12">No hay productos disponibles por el momento.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {products.map(p => (
                <div key={p.id} className="group rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/5 hover:border-amber-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/20">
                  <div className="h-64 overflow-hidden relative bg-black">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-slate-700" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                        {p.categoria_name || 'Exclusivo'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 relative">
                    <h4 className="text-lg font-bold text-white mb-2 line-clamp-1">{p.name}</h4>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-4 h-8">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-emerald-400 font-mono">S/ {Number(p.price).toFixed(2)}</span>
                      {p.stock <= 0 ? (
                        <span className="text-xs text-red-400 font-bold uppercase tracking-widest">Agotado</span>
                      ) : (
                        <button 
                          onClick={() => addToCart(p)}
                          className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Comprar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link to="/catalogo" className="inline-flex items-center gap-2 px-8 py-3 bg-transparent border border-amber-600 hover:bg-amber-600/10 text-amber-500 font-bold rounded-full transition-colors uppercase tracking-widest text-sm">
              Ver Todo el Catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
