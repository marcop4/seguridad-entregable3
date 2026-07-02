import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';

export interface ManagerData {
  kpis: {
    revenue: number;
    pendingCount: number;
    lowStockCount: number;
  };
  chartData: {
    date: string;
    sales: number;
  }[];
}

export default function ManagerDashboard({ data }: { data: ManagerData }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Dashboard Financiero (Gerencia)
        </h2>
        <p className="text-slate-400 text-sm mt-1">Métricas clave y rendimiento de ventas globales de la tienda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">S/ {data.kpis.revenue.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
              <ShoppingCart className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Órdenes Pendientes</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{data.kpis.pendingCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-red-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/30">
              <Package className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Crítico</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{data.kpis.lowStockCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 shadow-lg">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">Ingresos Últimos 7 Días</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                fontSize={12} 
                tickMargin={10} 
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}/${d.getMonth()+1}`;
                }} 
              />
              <YAxis stroke="#666" fontSize={12} tickFormatter={(val) => `S/ ${val}`} />
              <Tooltip 
                cursor={{ fill: '#ffffff05' }}
                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Ventas']}
                labelStyle={{ color: '#888', marginBottom: '4px' }}
              />
              <Bar dataKey="sales" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
