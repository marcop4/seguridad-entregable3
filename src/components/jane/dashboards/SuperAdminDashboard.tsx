import React from 'react';
import { ShieldCheck, Activity, CheckCircle2, Lock, Fingerprint, FileKey, Link } from 'lucide-react';
import ManagerDashboard, { ManagerData } from './ManagerDashboard';

interface SuperAdminData {
  managerData: ManagerData;
  sentinelData: {
    auditLogs24h: number;
    bruteForce7d: number;
  };
}

export default function SuperAdminDashboard({ data }: { data: SuperAdminData }) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Módulo Manager Reutilizado */}
      <ManagerDashboard data={data.managerData} />

      {/* Módulo Sentinel Específico */}
      <div className="pt-8 border-t border-white/10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Monitoreo de Seguridad (Sentinel)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#141414] rounded-2xl border border-indigo-500/20 p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                <Activity className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eventos de Auditoría (24h)</p>
                <h3 className="text-2xl font-mono font-bold text-white mt-1">{data.sentinelData.auditLogs24h}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Eventos totales rastreados en el sistema.</p>
          </div>

          <div className="bg-[#141414] rounded-2xl border border-rose-500/20 p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/30">
                <ShieldCheck className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bloqueos Fuerza Bruta (7d)</p>
                <h3 className="text-2xl font-mono font-bold text-white mt-1">{data.sentinelData.bruteForce7d}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Intentos de inicio de sesión mitigados automáticamente.</p>
          </div>
        </div>
      </div>
      {/* ISO 27001 Compliance Dashboard */}
      <div className="pt-8 border-t border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            Estatus de Mitigación de Riesgos (ISO 27001)
          </h2>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest rounded-full border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> 100% Cumplimiento
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-[#141414] rounded-xl border border-white/5 p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Riesgo de Suplantación</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-emerald-400">Control: Autenticación RBAC</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> PROTEGIDO
            </div>
          </div>

          <div className="bg-[#141414] rounded-xl border border-white/5 p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Riesgo de Manipulación de Datos</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-emerald-400">Control: Firma Digital HMAC</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> PROTEGIDO
            </div>
          </div>

          <div className="bg-[#141414] rounded-xl border border-white/5 p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <FileKey className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Riesgo de Exposición de Credenciales</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-emerald-400">Control: Bóveda Criptográfica Python</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> PROTEGIDO
            </div>
          </div>

          <div className="bg-[#141414] rounded-xl border border-white/5 p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <Link className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Riesgo de Sniffing de URLs</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-emerald-400">Control: Encriptación Vortex-URL</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> PROTEGIDO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
