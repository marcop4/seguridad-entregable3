import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Eye, EyeOff, RefreshCw, Filter, Download, X, Save, Image as ImageIcon } from 'lucide-react';

interface Categoria {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  categoria_id?: string;
  categoria_name: string;
  price: number;
  stock: number;
  image_url: string;
  is_published: boolean;
}

import { User } from '../../types';

export default function PanelInventario({ currentUser }: { currentUser: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    categoria_id: '',
    price: 0,
    stock: 0,
    image_url: '',
    is_published: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/jane/products'),
        fetch('/api/jane/categorias')
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategorias(await catRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto de forma permanente?')) return;
    try {
      const res = await fetch(`/api/jane/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        alert('Error al eliminar producto. Asegúrese de que no tenga órdenes asociadas.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openNewModal = () => {
    setFormData({
      name: '',
      description: '',
      categoria_id: categorias.length > 0 ? categorias[0].id : '',
      price: 0,
      stock: 0,
      image_url: '',
      is_published: true
    });
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setFormData({
      id: p.id,
      name: p.name,
      description: p.description || '',
      categoria_id: p.categoria_id || categorias.find(c => c.name === p.categoria_name)?.id || '',
      price: p.price,
      stock: p.stock,
      image_url: p.image_url || '',
      is_published: p.is_published
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const isEdit = !!formData.id;
      let url = isEdit ? `/api/jane/products/${formData.id}` : '/api/jane/products';
      let method = isEdit ? 'PUT' : 'POST';
      let bodyData: any = formData;

      // Restricción para Level 2 (Seller)
      if (currentUser.level === 2) {
        if (!isEdit) throw new Error("No tienes permisos para crear.");
        url = `/api/jane/products/${formData.id}/stock`;
        method = 'PATCH';
        bodyData = { stock: formData.stock };
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (response.ok) {
        await fetchData(); // Recargar datos para traer los JOINs de categoría
        setShowModal(false);
      } else {
        const err = await response.json();
        alert(`Error al guardar: ${err.error || 'Verifique los datos'}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error de red al intentar guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) return;
    const headers = ['ID', 'Nombre', 'Categoria', 'Precio', 'Stock', 'Publicado'];
    const rows = products.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.categoria_name || '').replace(/"/g, '""')}"`,
      p.price,
      p.stock,
      p.is_published ? 'SI' : 'NO'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventario_JANE_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.categoria_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg relative overflow-hidden">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Gestor de Inventario
            </h3>
            <p className="text-slate-400 text-xs mt-1">Control maestro de catálogo, stocks y precios del ERP.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 transition-colors cursor-pointer"
              title="Exportar a CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={fetchData} 
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-colors cursor-pointer"
              title="Refrescar Inventario"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {currentUser.level >= 3 && (
              <button 
                onClick={openNewModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-lg shadow-blue-900/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nuevo Producto
              </button>
            )}
          </div>
        </div>

        {/* BÚSQUEDA */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* TABLA DATAGRID */}
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0A0A0A]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#0A0A0A] border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio Base</th>
                <th className="px-4 py-3">Stock Real</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs">Cargando inventario ERP...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-xs">No se encontraron registros.</td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#141414] border border-white/10 overflow-hidden shrink-0 shadow-sm relative group">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-600 m-auto mt-2.5" />
                        )}
                      </div>
                      <div className="flex flex-col max-w-[200px] overflow-hidden">
                        <span className="text-slate-200 font-semibold text-sm truncate" title={p.name}>{p.name}</span>
                        <span className="text-slate-500 text-[10px] font-mono">SKU: {p.id.split('-')[0].toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-md bg-white/5 text-slate-400 text-xs border border-white/5">
                        {p.categoria_name || 'Sin Categoría'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-mono font-bold">
                      S/ {Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.stock > 10 ? 'bg-emerald-500 animate-pulse' : p.stock > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className={`font-mono font-bold ${p.stock === 0 ? 'text-red-400' : 'text-slate-300'}`}>
                          {p.stock} unds.
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_published ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                          <Eye className="w-3 h-3" /> Público
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                          <EyeOff className="w-3 h-3" /> Oculto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(p)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors cursor-pointer" title={currentUser.level === 2 ? "Actualizar Stock" : "Editar Ficha"}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentUser.level >= 3 && (
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer" title="Dar de Baja">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORMULARIO CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10 bg-[#0A0A0A]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {formData.id ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-emerald-500" />}
                {formData.id ? 'Editar Ficha de Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <form id="productForm" onSubmit={handleSave} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Nombre del Producto</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                      placeholder="Ej. Maceta de Arcilla..."
                      disabled={currentUser.level === 2}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Categoría ERP</label>
                    <select 
                      required
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                      disabled={currentUser.level === 2}
                    >
                      <option value="" disabled>Seleccione familia...</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Descripción Breve</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none h-20 custom-scrollbar disabled:opacity-50"
                    placeholder="Descripción técnica o publicitaria..."
                    disabled={currentUser.level === 2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      Precio Venta <span className="text-[10px] text-slate-500 font-mono">(PEN)</span>
                    </label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                      disabled={currentUser.level === 2}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Stock Físico</label>
                    <input 
                      required
                      type="number" 
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    URL de la Imagen <ImageIcon className="w-3 h-3 text-slate-400" />
                  </label>
                  <div className="flex gap-3">
                    <input 
                      type="url" 
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                      placeholder="https://images.unsplash.com/photo-..."
                      disabled={currentUser.level === 2}
                    />
                    {formData.image_url && (
                      <div className="w-10 h-10 rounded bg-[#0A0A0A] border border-white/10 shrink-0 overflow-hidden">
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors w-fit">
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.is_published ? 'bg-blue-600' : 'bg-slate-600'}`}>
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.is_published ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={formData.is_published}
                      onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                      disabled={currentUser.level === 2}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white leading-none">Publicado en Tienda Web</span>
                      <span className="text-[10px] text-slate-400">Si está inactivo, solo se verá en el panel interno.</span>
                    </div>
                  </label>
                </div>

              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/10 bg-[#0A0A0A] flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer border border-transparent hover:border-white/10"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="productForm"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:shadow-none cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {formData.id ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
