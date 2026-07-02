import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

interface SellerData {
  kpis: {
    totalSales: number;
    totalOrders: number;
  };
}

export default function SellerDashboard({ data }: { data: SellerData }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          Dashboard de Ventas (Personal)
        </h2>
        <p className="text-slate-400 text-sm mt-1">Tu rendimiento de ventas de hoy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tus Ventas (Hoy)</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">S/ {data.kpis.totalSales.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <ShoppingCart className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Órdenes Procesadas</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{data.kpis.totalOrders}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
