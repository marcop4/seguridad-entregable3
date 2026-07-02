import React, { useState, useEffect } from 'react';
import SellerDashboard from './dashboards/SellerDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';

export default function PanelDashboard({ currentUser }: { currentUser: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      
      let endpoint = '';
      if (currentUser.level === 2) endpoint = '/api/dashboard/seller';
      else if (currentUser.level === 3) endpoint = '/api/dashboard/manager';
      else if (currentUser.level >= 4) endpoint = '/api/dashboard/admin';
      else {
        setError("Nivel de privilegio insuficiente para el dashboard.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          setData(await response.json());
        } else {
          setError("No se pudo cargar el dashboard.");
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError("Error de red conectando con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [currentUser]);

  if (loading) {
    return <div className="text-slate-500 animate-pulse text-sm">Cargando métricas de dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  if (!data) return <div className="text-red-400">Error: datos vacíos.</div>;

  // Render orchestrator based on privilege level
  if (currentUser.level === 2) {
    return <SellerDashboard data={data} />;
  }
  
  if (currentUser.level === 3) {
    return <ManagerDashboard data={data} />;
  }

  if (currentUser.level >= 4) {
    return <SuperAdminDashboard data={data} />;
  }

  return null;
}
