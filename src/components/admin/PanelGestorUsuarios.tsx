/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  FileSliders,
  Search,
  ShieldX,
  UserCheck,
  RefreshCw,
  Key,
  LogOut,
  CheckCircle,
  Trash2,
  ShieldCheck,
  HeartPulse,
  Clock,
  Globe,
  UserPlus,
  PlusCircle,
  Shield,
  Award,
  Edit,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  Monitor,
  ShieldEllipsis,
  Chrome,
  X,
  Eraser,
} from "lucide-react";
import { User, AuditLog, UserRole, CustomRole } from "../../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useToast } from "../../context/ToastContext";

interface AdminPanelProps {
  currentUser: Omit<User, "passwordHash" | "recoveryToken">;
  auditLogs: AuditLog[];
  onRefreshAudit: () => void;
  onRefreshUsers: () => void;
  users: Omit<User, "passwordHash" | "recoveryToken">[];
  notifications: any[];
  onClearNotifications: () => void;
}

const LockCountdown = ({ lockedUntil }: { lockedUntil: string }) => {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = new Date(lockedUntil).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft("Expirado");
        return;
      }
      const h = Math.floor(remainingMs / 3600000);
      const m = Math.floor((remainingMs % 3600000) / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      let timeStr = "";
      if (h > 0) timeStr += `${h}h `;
      if (m > 0 || h > 0) timeStr += `${m}m `;
      timeStr += `${s}s`;
      setTimeLeft(timeStr);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  return (
    <span className="block text-[9px] text-pink-400 font-mono leading-tight mt-1 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded w-fit">
      Vence:{" "}
      {new Date(lockedUntil).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}{" "}
      <br />⏳ Faltan: {timeLeft}
    </span>
  );
};

const parseUserAgent = (ua: string | undefined | null) => {
  if (!ua) return "Desconocido";
  let browser = "Desconocido";
  if (ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome")) browser = "Google Chrome";
  else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari")) browser = "Apple Safari";

  let os = "OS Desconocido";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} en ${os}`;
};

export default function PanelGestorUsuarios({
  currentUser,
  users,
  onRefreshUsers,
  onRefreshAudit,
}: AdminPanelProps) {
  // --- STATES FOR USERS ---
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [activeLockSelectUserId, setActiveLockSelectUserId] = useState<
    string | null
  >(null);
  const [lockConfigValue, setLockConfigValue] = useState<number>(1);
  const [lockConfigUnit, setLockConfigUnit] = useState<string>("minutes");

  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    fullName: "",
    password: "",
    role: "user" as UserRole,
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(
    null,
  );
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  const isAuditorOnly = currentUser.level === 2;
  const isSupportOnly = currentUser.level === 99;
  const canManageAccess = currentUser.level >= 3;

  const getHeaders = () => {
    return {
      Authorization: `Bearer ${localStorage.getItem("secure_auth_token") || ""}`,
      "x-session-id": localStorage.getItem("secure_auth_session_id") || "",
    };
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch("/api/admin/active-sessions", {
        headers: getHeaders(),
      });
      if (response.ok) setActiveSessions(await response.json());
    } catch (e) {
      console.error(e);
    }
  };

  const [rolesList, setRolesList] = useState<CustomRole[]>([]);

  // 1. Efecto para Roles y Data Base de Gestión
  useEffect(() => {
    if (!canManageAccess) {
      setIsLoadingTable(false);
      return;
    }
    
    let isMounted = true;
    setIsLoadingTable(true);
    
    // Llamada para traer la data de roles y refrescar usuarios de BD
    fetch("/api/admin/roles", { headers: getHeaders() })
      .then((res) => res.json())
      .then((rolesData) => {
        if (!isMounted) return;
        if (Array.isArray(rolesData)) setRolesList(rolesData);
        // Traer usuarios llamando al Refresh del padre
        onRefreshUsers();
        setTimeout(() => {
          if (isMounted) setIsLoadingTable(false);
        }, 800);
      })
      .catch((e) => {
        console.error(e);
        if (isMounted) setIsLoadingTable(false);
      });

    return () => { isMounted = false; };
  }, [canManageAccess]); // Dependencia vacía simulada para el componente (solo carga al inicio o al cambiar permisos)

  // 2. Efecto exclusivo de Tiempo Real (Polling) para la Tarjeta de Trazabilidad
  useEffect(() => {
    if (!canManageAccess) {
      setIsLoadingProfiles(false);
      return;
    }
    
    setIsLoadingProfiles(true);

    const loadSessions = async () => {
      try {
        const response = await fetch("/api/admin/active-sessions", {
          headers: getHeaders(),
        });
        if (response.ok) setActiveSessions(await response.json());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    
    // Carga inicial rápida e independiente
    loadSessions();

    // Polling súper rápido cada 3s
    const interval = setInterval(() => {
      loadSessions();
    }, 3000);
    
    // Cleanup de memory leak
    return () => clearInterval(interval);
  }, [canManageAccess]);

  const handleTimeLock = async (
    userId: string,
    durationMinutes: number | null,
  ) => {
    if (!canManageAccess) return;
    setLoadingUserId(userId);
    let lockedUntil: string | null = null;
    if (durationMinutes !== null) {
      lockedUntil = new Date(
        Date.now() + durationMinutes * 60 * 1000,
      ).toISOString();
    }
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          isLocked: true,
          lockedUntil: lockedUntil,
        }),
      });
      if (response.ok) {
        onRefreshUsers();
        onRefreshAudit();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUserId(null);
      setActiveLockSelectUserId(null);
    }
  };

  const handleAmnesty = async (userId: string) => {
    if (!canManageAccess) return;
    setLoadingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-fails`, {
        method: "PUT",
        headers: getHeaders(),
      });
      if (response.ok) {
        onRefreshUsers();
        onRefreshAudit();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUserId(null);
      setActiveLockSelectUserId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    if (!canManageAccess) return;
    setLoadingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        onRefreshUsers();
        onRefreshAudit();
        showToast("Rol actualizado con éxito", "success");
      } else {
        const errorData = await response.json();
        showToast(
          errorData.message ||
            "Error al actualizar el rol o privilegio insuficiente",
          "error",
        );
        onRefreshUsers(); // Revierte el valor
      }
    } catch (e) {
      console.error(e);
      showToast("Error de red al actualizar el rol", "error");
      onRefreshUsers(); // Revierte el valor
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (
      !newUserForm.username ||
      !newUserForm.email ||
      !newUserForm.fullName ||
      !newUserForm.password
    ) {
      setCreateUserError("Por favor completa todos los campos obligatorios.");
      return;
    }

    try {
      const payload = {
        ...newUserForm,
      };
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        setCreateUserSuccess(
          data.message || "Usuario dado de alta exitosamente.",
        );
        onRefreshUsers();
        onRefreshAudit();
        setNewUserForm({
          username: "",
          email: "",
          fullName: "",
          password: "",
          role: "user" as UserRole,
        });
        setTimeout(() => {
          setShowCreateUser(false);
          setCreateUserSuccess(null);
        }, 1500);
      } else {
        setCreateUserError(data.message || "No se pudo crear el usuario.");
      }
    } catch (err) {
      setCreateUserError("Error de comunicación de red.");
    }
  };

  const handleRevokeSession = async (targetUserId: string) => {
    if (
      !window.confirm(
        "¿Seguro que desea revocar esta sesión en tiempo real? El usuario será desconectado inmediatamente.",
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/admin/revoke-session/${targetUserId}`,
        {
          method: "POST",
          headers: getHeaders(),
        },
      );
      if (response.ok) {
        fetchActiveSessions();
        onRefreshAudit();
      }
    } catch (err) {
      console.error("Error al revocar sesión", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const currentRole = users.find((u) => u.id === userId)?.role || "";
    if (currentRole === "admin") {
      alert(
        "No se puede eliminar un perfil SuperAdmin (Nivel 4) desde la interfaz.",
      );
      return;
    }
    const targetPrivilege =
      rolesList.find((r) => r.key === currentRole)?.privilegeLevel || 1;
    if (targetPrivilege >= currentUser.level) {
      alert("Los moderadores solo pueden eliminar usuarios de lectura básica.");
      return;
    }
    if (
      !window.confirm(
        "CRÍTICO: ¿Estás seguro de eliminar PERMANENTEMENTE a este usuario?",
      )
    )
      return;

    setLoadingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (response.ok) {
        onRefreshUsers();
        onRefreshAudit();
      } else {
        alert("Fallo al eliminar.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleToggleLock = async (
    userId: string,
    currentLockState: boolean,
    hours: number = 0,
  ) => {
    if (!currentLockState && hours === 0) return;

    setLoadingUserId(userId);
    setActiveLockSelectUserId(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/lock`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !currentLockState, hours }),
      });
      if (response.ok) {
        onRefreshUsers();
        onRefreshAudit();
        if (!currentLockState) fetchActiveSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      {isLoadingTable ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-pulse">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#141414] rounded-full"></div>
            <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            <Shield className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-emerald-500 font-black tracking-[0.2em] uppercase text-sm animate-pulse">
              Sincronizando Módulos de Seguridad
            </p>
            <p className="text-slate-500 font-mono text-[10px]">
              VERIFICANDO TRAZABILIDAD Y ACCESOS RBAC...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in" id="users-parent-view">
          {/* PANEL DE TRAZABILIDAD - PERFILES ACTIVOS */}
          <div className="mb-8 relative" id="security-dashboard-metrics">
            {isLoadingProfiles && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0c1611]/80 backdrop-blur-sm animate-pulse rounded-2xl">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] text-emerald-400 font-mono tracking-widest font-bold">MONITOREO EN CURSO...</p>
              </div>
            )}
            <div className="bg-gradient-to-br from-[#0c1611] to-[#141414] rounded-2xl border border-emerald-500/20 p-6 shadow-[0_0_20px_rgba(16,185,129,0.05)] overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-6 border-b border-emerald-500/10 pb-4 relative z-10">
                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-5 h-5 animate-pulse" />
                  Tarjeta de Trazabilidad - Perfiles Activos
                </h4>
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-mono text-slate-300">
                    Monitoreo en Tiempo Real
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar max-h-[220px] relative z-10">
                {activeSessions.filter((s) => s.userId !== currentUser.id)
                  .length > 0 ? (
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-500 uppercase font-bold border-b border-white/5">
                        <th className="pb-2 font-mono tracking-widest">
                          Identidad
                        </th>
                        <th className="pb-2 font-mono tracking-widest">
                          Origen (Dispositivo / IP)
                        </th>
                        <th className="pb-2 text-right font-mono tracking-widest">
                          Control
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeSessions
                        .filter((s) => s.userId !== currentUser.id)
                        .map((session) => (
                          <tr
                            key={session.userId}
                            className="group hover:bg-emerald-500/5 transition-colors"
                          >
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <img
                                    src={session.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${session.username}&backgroundColor=065f46,0f766e&textColor=ffffff`}
                                    className="w-7 h-7 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] object-cover"
                                    alt="Avatar"
                                  />
                                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-black animate-pulse"></div>
                                </div>
                                <div className="leading-tight">
                                  <p className="font-bold text-slate-200">
                                    @{session.username}
                                  </p>
                                  <p className="text-[9px] text-emerald-400 font-mono tracking-wider mt-0.5">
                                    INICIO:{" "}
                                    {new Date(
                                      session.startedAt,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    })}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-slate-400">
                              <div className="bg-black/30 border border-white/5 rounded-md p-1.5 inline-block min-w-[150px]">
                                <p
                                  className="truncate max-w-[180px] flex items-center gap-1.5"
                                  title={session.browser}
                                >
                                  <Monitor className="w-3 h-3 text-slate-500" />{" "}
                                  {parseUserAgent(session.browser)}
                                </p>
                                <p className="text-[10px] font-mono text-emerald-200/70 mt-1 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full"></span>{" "}
                                  {session.ipAddress}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              {canManageAccess &&
                                (currentUser.level > session.level ||
                                  currentUser.level >= 4) && (
                                  <button
                                    onClick={() =>
                                      handleRevokeSession(session.userId)
                                    }
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded border border-red-500/20 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1 ml-auto"
                                    title="Finalizar sesión remotamente"
                                  >
                                    <ShieldX className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                      Revocar
                                    </span>
                                  </button>
                                )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-black/20 rounded-xl border border-dashed border-white/10">
                    <div className="relative mb-3">
                      <Monitor className="w-10 h-10 text-slate-600 opacity-50" />
                      <Search className="w-5 h-5 text-emerald-500 absolute -bottom-1 -right-1 opacity-70 animate-bounce" />
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      No se detectan otros perfiles activos en la red.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8" id="users-parent-grid">
            {!isAuditorOnly && (
              <div
                className="col-span-1 bg-[#141414] rounded-2xl border border-white/5 shadow-2xl space-y-6 p-6 md:p-8"
                id="col-crud-users"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/5 gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" /> Gestión de
                      Usuarios y Accesos
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Control exhaustivo de perfiles, permisos y restricciones
                      de seguridad.
                    </p>
                  </div>

                  {/* Action buttons + search */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {canManageAccess && (
                      <button
                        onClick={() => setShowCreateUser(!showCreateUser)}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        id="btn-admin-open-create-user"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Crear Usuario
                      </button>
                    )}

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs bg-[#0A0A0A] border border-white/5 rounded-lg text-slate-200 focus:outline-hidden focus:border-blue-500 w-[120px] md:w-[150px]"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="py-1.5 px-2 bg-[#0A0A0A] border border-white/5 rounded-lg text-xs font-medium text-slate-300 focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="all">Filtro: Todos</option>
                      <option value="admin">Administrador</option>
                      <option value="moderator">Moderador</option>
                      <option value="auditor">Auditor SIEM</option>
                      <option value="user">Usuario Final</option>
                    </select>
                  </div>
                </div>

                {/* EXPANDABLE NEW USER FORM */}
                {showCreateUser && (
                  <form
                    onSubmit={handleCreateUser}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4 animate-fade-in"
                    id="admin-create-user-form"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-blue-400" /> Alta de
                        Nuevo Usuario
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Privilegios Administrativos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Juan Pérez"
                          required
                          value={newUserForm.fullName}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              fullName: e.target.value,
                            })
                          }
                          className="w-full p-2 text-xs rounded-xl border border-white/10 bg-[#141414] text-slate-200 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Nombre de Usuario (@username)
                        </label>
                        <input
                          type="text"
                          placeholder="ej. juan_perez"
                          required
                          value={newUserForm.username}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              username: e.target.value.toLowerCase().trim(),
                            })
                          }
                          className="w-full p-2 text-xs rounded-xl border border-white/10 bg-[#141414] text-slate-200 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Correo Electrónico
                        </label>
                        <div className="flex bg-[#141414] border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                          <input
                            type="email"
                            placeholder="ej. juan.perez@gmail.com"
                            required
                            value={newUserForm.email}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                email: e.target.value.toLowerCase().trim(),
                              })
                            }
                            className="w-full p-2 text-xs bg-transparent text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          Contraseña Inicial Segura
                        </label>
                        <div className="relative">
                          <input
                            type={showNewUserPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            required
                            value={newUserForm.password}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                password: e.target.value,
                              })
                            }
                            className="w-full pl-2 pr-10 py-2 text-xs rounded-xl border border-white/10 bg-[#141414] text-slate-200 focus:outline-hidden focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowNewUserPassword(!showNewUserPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showNewUserPassword ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Rol y Atributo RBAC
                      </label>
                      {currentUser.level === 3 ? (
                        <div className="w-full p-2 text-xs rounded-xl border border-white/10 bg-[#141414] text-slate-400 font-mono flex items-center justify-between cursor-not-allowed opacity-80">
                          <span>Usuario Final</span>
                          <Shield className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      ) : (
                        <select
                          value={newUserForm.role}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              role: e.target.value as UserRole,
                            })
                          }
                          className="w-full p-2 text-xs rounded-xl border border-white/10 bg-[#141414] text-slate-200 focus:outline-hidden focus:border-blue-500"
                        >
                          {rolesList
                            .filter((r) => r.privilegeLevel < currentUser.level)
                            .map((r) => (
                              <option key={r.id} value={r.key}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>

                    {createUserError && (
                      <p className="text-xs text-red-400 font-bold">
                        ⚠️ Error: {createUserError}
                      </p>
                    )}
                    {createUserSuccess && (
                      <p className="text-xs text-emerald-400 font-bold">
                        ✨ ¡Éxito! {createUserSuccess}
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateUser(false)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-lg transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-97 cursor-pointer"
                      >
                        Registrar Perfil Seguro
                      </button>
                    </div>
                  </form>
                )}

                <div className="w-full overflow-visible">
                  <table className="hidden sm:table w-full text-left text-xs text-slate-400 border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-[#0F0F0F]">
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Rol Asignado</th>
                        <th className="py-3 px-4">Estado Seguridad</th>
                        <th className="py-3 px-4">Sesión Navegador</th>
                        <th className="py-3 px-4 text-right">
                          Acciones Administrativas
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className="divide-y divide-white/5"
                      id="users-table-body"
                    >
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-slate-400"
                          >
                            No se encontraron usuarios con los criterios
                            seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-white/5 transition-all text-slate-300"
                          >
                            <td className="py-4 px-4 flex items-center gap-3">
                              <img
                                src={
                                  user.avatarUrl ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}&backgroundColor=141414,1f2937&textColor=ffffff`
                                }
                                alt="Avatar"
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-white">
                                    {user.fullName}
                                  </p>
                                  {(user as any).authType === "google" && (
                                    <span
                                      className="p-0.5 bg-white/10 rounded-full text-blue-400"
                                      title="Cuenta Vinculada con Google Identity Platform"
                                    >
                                      <Chrome className="w-3 h-3" />
                                    </span>
                                  )}
                                  {(user as any).authType === "local" && (
                                    <span
                                      className="p-0.5 bg-white/10 rounded-full text-slate-400"
                                      title="Cuenta de Seguridad Local"
                                    >
                                      <Key className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  @{user.username} | {user.email}
                                </p>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {(() => {
                                const userPrivilege =
                                  rolesList.find((r) => r.key === user.role)
                                    ?.privilegeLevel || 1;
                                const shouldDisable =
                                  loadingUserId === user.id ||
                                  userPrivilege >= currentUser.level;

                                const canShowSelect =
                                  currentUser.level >= 3 && !shouldDisable;

                                if (canShowSelect) {
                                  const optionsToRender = rolesList.filter(
                                    (r) => r.privilegeLevel < currentUser.level,
                                  );

                                  return (
                                    <select
                                      value={user.role}
                                      onChange={(e) =>
                                        handleChangeRole(
                                          user.id,
                                          e.target.value as UserRole,
                                        )
                                      }
                                      disabled={shouldDisable}
                                      className={`bg-[#0A0A0A] border border-white/5 rounded-md p-1 font-medium text-xs text-slate-300 focus:outline-hidden ${shouldDisable ? "opacity-50 cursor-not-allowed" : ""}`}
                                      id={`select-role-${user.id}`}
                                    >
                                      {shouldDisable &&
                                      !optionsToRender.find(
                                        (r) => r.key === user.role,
                                      ) ? (
                                        <option value={user.role}>
                                          {rolesList.find(
                                            (r) => r.key === user.role,
                                          )?.name || user.role}
                                        </option>
                                      ) : null}
                                      {optionsToRender.map((r) => (
                                        <option key={r.id} value={r.key}>
                                          {r.name}
                                        </option>
                                      ))}
                                    </select>
                                  );
                                }

                                return (
                                  <span className="font-semibold text-slate-400 capitalize font-mono text-[11px]">
                                    {rolesList.find((r) => r.key === user.role)
                                      ?.name || user.role}
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                {user.isLocked ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-500/20 px-2 py-0.5 rounded-full w-fit">
                                      <ShieldX className="w-3 h-3" /> Bloqueado
                                    </span>
                                    {user.lockedUntil && (
                                      <LockCountdown
                                        lockedUntil={user.lockedUntil}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                                    <ShieldCheck className="w-3 h-3" />{" "}
                                    Verificado
                                  </span>
                                )}
                                {user.failedAttempts > 0 && !user.isLocked && (
                                  <span
                                    className="text-[10px] text-amber-400 font-mono flex items-center gap-1 font-bold mt-1"
                                    title="Atención: Se aproxima a un bloqueo temporal"
                                  >
                                    ⚠️ {user.failedAttempts}/3 Fallos
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4 font-mono text-[10px]">
                              {user.activeSessionId ? (
                                <div className="text-slate-300 space-y-0.5 bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10 w-fit">
                                  <p className="flex items-center gap-1 font-semibold text-emerald-400">
                                    <Globe className="w-3 h-3 text-emerald-400" />{" "}
                                    ACTIVO
                                  </p>
                                  <p
                                    className="text-[9px] text-slate-400"
                                    title={user.activeSessionBrowser}
                                  >
                                    {parseUserAgent(user.activeSessionBrowser)}
                                  </p>
                                  <p className="text-[9px] text-slate-500">
                                    IP: {user.activeSessionIp}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">
                                  Desconectado
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Revoke active session */}
                                {user.activeSessionId &&
                                  canManageAccess &&
                                  (rolesList.find((r) => r.key === user.role)
                                    ?.privilegeLevel || 1) <
                                    currentUser.level &&
                                  user.id !== currentUser.id && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRevokeSession(user.id)
                                      }
                                      disabled={loadingUserId === user.id}
                                      title="Cerrar sesión remotamente por seguridad"
                                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all font-semibold font-mono text-[10px] flex items-center gap-0.5 hover:shadow-xs active:scale-97 border border-amber-500/20 cursor-pointer"
                                      id={`btn-revoke-session-${user.id}`}
                                    >
                                      <LogOut className="w-3 h-3" /> Revocar
                                    </button>
                                  )}

                                {/* Toggle locking */}
                                {canManageAccess &&
                                  (rolesList.find((r) => r.key === user.role)
                                    ?.privilegeLevel || 1) <
                                    currentUser.level &&
                                  user.id !== currentUser.id && (
                                    <div
                                      className="relative inline-block text-left"
                                      id={`lock-selector-container-${user.id}`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (user.isLocked) {
                                            handleToggleLock(user.id, true);
                                          } else {
                                            setActiveLockSelectUserId(
                                              activeLockSelectUserId === user.id
                                                ? null
                                                : user.id,
                                            );
                                          }
                                        }}
                                        disabled={
                                          loadingUserId === user.id ||
                                          user.role === "admin"
                                        }
                                        className={`p-1.5 rounded-lg border transition-all ${
                                          user.isLocked
                                            ? "bg-rose-500/10 text-rose-450 border-rose-500/25 hover:bg-rose-550/25 shadow-xs"
                                            : "bg-[#0A0A0A] text-slate-404 hover:text-white border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                        } cursor-pointer`}
                                        id={`btn-lock-toggle-${user.id}`}
                                        title={
                                          user.role === "admin"
                                            ? "Los administradores tienen inmunidad contra bloqueos"
                                            : user.isLocked
                                              ? "Desbloquear usuario inmediatamente"
                                              : "Establecer bloqueo por tiempo"
                                        }
                                      >
                                        <ShieldX className="w-3.5 h-3.5" />
                                      </button>

                                      {activeLockSelectUserId === user.id && (
                                        <div
                                          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveLockSelectUserId(null);
                                          }}
                                        >
                                          <div
                                            className="bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <h3 className="text-sm font-bold text-white mb-4">
                                              Configurar Bloqueo de Seguridad
                                            </h3>
                                            <div className="space-y-4">
                                              <div>
                                                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                                  Duración
                                                </label>
                                                <div className="flex gap-2">
                                                  <input
                                                    type="number"
                                                    value={lockConfigValue}
                                                    onChange={(e) =>
                                                      setLockConfigValue(
                                                        Number(e.target.value),
                                                      )
                                                    }
                                                    disabled={
                                                      lockConfigUnit ===
                                                      "permanent"
                                                    }
                                                    min="1"
                                                    className="w-full p-2 text-xs rounded-xl border border-white/10 bg-[#0A0A0A] text-slate-200 focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
                                                  />
                                                  <select
                                                    value={lockConfigUnit}
                                                    onChange={(e) =>
                                                      setLockConfigUnit(
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="w-full p-2 text-xs rounded-xl border border-white/10 bg-[#0A0A0A] text-slate-200 focus:outline-hidden focus:border-blue-500"
                                                  >
                                                    <option value="minutes">
                                                      Minutos
                                                    </option>
                                                    <option value="hours">
                                                      Horas
                                                    </option>
                                                    <option value="days">
                                                      Días
                                                    </option>
                                                    <option value="permanent">
                                                      Permanente
                                                    </option>
                                                  </select>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-6">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveLockSelectUserId(
                                                    null,
                                                  )
                                                }
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-lg transition-all cursor-pointer"
                                              >
                                                Cancelar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  let minutes = lockConfigValue;
                                                  if (
                                                    lockConfigUnit === "hours"
                                                  )
                                                    minutes =
                                                      lockConfigValue * 60;
                                                  if (lockConfigUnit === "days")
                                                    minutes =
                                                      lockConfigValue * 1440;
                                                  handleTimeLock(
                                                    user.id,
                                                    lockConfigUnit ===
                                                      "permanent"
                                                      ? null
                                                      : minutes,
                                                  );
                                                }}
                                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-97 cursor-pointer"
                                              >
                                                Aplicar Bloqueo
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                {/* Clean fails */}
                                {(user.failedAttempts > 0 || user.isLocked) &&
                                  canManageAccess &&
                                  (rolesList.find((r) => r.key === user.role)
                                    ?.privilegeLevel || 1) <
                                    currentUser.level &&
                                  user.id !== currentUser.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleAmnesty(user.id)}
                                      disabled={loadingUserId === user.id}
                                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all font-semibold font-mono text-[10px] flex items-center gap-0.5 border border-emerald-500/20 cursor-pointer"
                                      title="Limpiar Fallos"
                                    >
                                      <Eraser className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                {/* Delete account */}
                                {canManageAccess &&
                                  (rolesList.find((r) => r.key === user.role)
                                    ?.privilegeLevel || 1) <
                                    currentUser.level && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(user.id)}
                                      disabled={
                                        loadingUserId === user.id ||
                                        user.id === currentUser.id
                                      }
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20 cursor-pointer disabled:opacity-50"
                                      id={`btn-delete-${user.id}`}
                                      title="Dar de baja definitiva de la base de datos"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* MOBILE ONLY USER CARDS */}
                  <div className="sm:hidden space-y-4" id="users-cards-mobile">
                    {filteredUsers.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No se encontraron usuarios con los criterios
                        seleccionados.
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="bg-[#0A0A0A]/80 border border-white/5 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                user.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}&backgroundColor=141414,1f2937&textColor=ffffff`
                              }
                              alt="Avatar"
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full border border-white/10 shrink-0 object-cover"
                            />
                            <div className="grow min-w-0">
                              <p className="font-bold text-white text-xs truncate">
                                {user.fullName}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                @{user.username} | {user.email}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {user.isLocked ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                    <ShieldX className="w-2.5 h-2.5" />{" "}
                                    Bloqueado
                                  </span>
                                  {user.lockedUntil && (
                                    <LockCountdown
                                      lockedUntil={user.lockedUntil}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Activo
                                </span>
                              )}
                              {user.failedAttempts > 0 && !user.isLocked && (
                                <span
                                  className="text-[9px] text-amber-400 font-mono flex items-center justify-end gap-0.5 font-bold mt-1.5"
                                  title="Atención: Se aproxima a un bloqueo temporal"
                                >
                                  ⚠️ {user.failedAttempts}/3 Fallos
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#141414] p-2.5 rounded-lg border border-white/5 font-mono">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase">
                                Rol asignado:
                              </span>
                              {canManageAccess &&
                              (rolesList.find((r) => r.key === user.role)
                                ?.privilegeLevel || 1) < currentUser.level &&
                              user.id !== currentUser.id ? (
                                <select
                                  value={user.role}
                                  onChange={(e) =>
                                    handleChangeRole(
                                      user.id,
                                      e.target.value as UserRole,
                                    )
                                  }
                                  disabled={loadingUserId === user.id}
                                  className="bg-[#0A0A0A] border border-white/5 rounded-md p-0.5 font-medium text-[10px] text-slate-300 focus:outline-hidden mt-0.5 w-full"
                                >
                                  {rolesList
                                    .filter(
                                      (r) =>
                                        r.privilegeLevel < currentUser.level,
                                    )
                                    .map((r) => (
                                      <option key={r.id} value={r.key}>
                                        {r.name}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <span className="font-bold text-slate-300 text-[10px] uppercase mt-0.5 block">
                                  {rolesList.find((r) => r.key === user.role)
                                    ?.name || user.role}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase">
                                Sesión:
                              </span>
                              {user.activeSessionId ? (
                                <div className="mt-0.5">
                                  <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-0.5">
                                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />{" "}
                                    ACTIVO
                                  </span>
                                  <span
                                    className="text-[8px] text-slate-500 block truncate leading-tight mt-0.5"
                                    title={user.activeSessionBrowser}
                                  >
                                    {parseUserAgent(user.activeSessionBrowser)}
                                    <br />
                                    IP: {user.activeSessionIp}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[10px] mt-0.5 block">
                                  Desconectado
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/5">
                            {user.activeSessionId &&
                              canManageAccess &&
                              (rolesList.find((r) => r.key === user.role)
                                ?.privilegeLevel || 1) < currentUser.level &&
                              user.id !== currentUser.id && (
                                <button
                                  onClick={() => handleRevokeSession(user.id)}
                                  disabled={loadingUserId === user.id}
                                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold font-mono border border-amber-500/20 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <LogOut className="w-3 h-3" /> Revocar
                                </button>
                              )}

                            {user.isLocked &&
                              canManageAccess &&
                              (rolesList.find((r) => r.key === user.role)
                                ?.privilegeLevel || 1) < currentUser.level &&
                              user.id !== currentUser.id && (
                                <button
                                  onClick={() => handleAmnesty(user.id)}
                                  disabled={loadingUserId === user.id}
                                  className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-bold font-mono border border-blue-500/20 flex items-center gap-0.5 cursor-pointer"
                                >
                                  Liberar
                                </button>
                              )}

                            {canManageAccess &&
                              (rolesList.find((r) => r.key === user.role)
                                ?.privilegeLevel || 1) < currentUser.level &&
                              user.id !== currentUser.id && (
                                <div
                                  className="relative inline-block text-left"
                                  id={`lock-selector-mobile-container-${user.id}`}
                                >
                                  <button
                                    onClick={() => {
                                      if (user.isLocked) {
                                        handleToggleLock(user.id, true);
                                      } else {
                                        setActiveLockSelectUserId(
                                          activeLockSelectUserId === user.id
                                            ? null
                                            : user.id,
                                        );
                                      }
                                    }}
                                    disabled={
                                      loadingUserId === user.id ||
                                      user.role === "admin"
                                    }
                                    className={`p-1.5 rounded-lg border text-[10px] ${
                                      user.isLocked
                                        ? "bg-rose-500/10 text-rose-450 border border-rose-500/25"
                                        : "bg-[#0A0A0A] text-slate-400 border border-white/5"
                                    } cursor-pointer`}
                                    title="Modificar bloqueo"
                                  >
                                    <ShieldX className="w-3.5 h-3.5" />
                                  </button>

                                  {activeLockSelectUserId === user.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-[40]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveLockSelectUserId(null);
                                        }}
                                      />
                                      <div
                                        className="absolute right-0 bottom-full mb-1.5 w-40 rounded-xl shadow-2xl bg-[#141414] border border-white/10 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
                                        id="lock-time-dropdown-mobile"
                                      >
                                        <div className="py-1 text-left">
                                          <div className="px-3 py-1 font-extrabold text-[8px] text-slate-500 uppercase tracking-widest border-b border-white/5">
                                            Bloqueo Temporal
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, null)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-white/5 font-semibold cursor-pointer"
                                          >
                                            Permanente
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, 1)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 font-semibold cursor-pointer"
                                          >
                                            1 Min (Test)
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, 5)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                                          >
                                            5 Minutos
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, 30)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                                          >
                                            30 Minutos
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, 1440)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                                          >
                                            24 Horas
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, 10080)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                                          >
                                            7 Días
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleTimeLock(user.id, 43200)
                                            }
                                            className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                                          >
                                            30 Días
                                          </button>
                                          <div className="border-t border-white/5 my-1" />
                                          {user.failedAttempts > 0 && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleAmnesty(user.id)
                                                }
                                                className="block w-full text-left px-3 py-1.5 text-xs text-blue-400 hover:bg-white/5 font-semibold cursor-pointer"
                                                title="Poner a 0 el historial de fallos de contraseña"
                                              >
                                                Limpiar Fallos
                                              </button>
                                              <div className="border-t border-white/5 my-1" />
                                            </>
                                          )}
                                          <button
                                            onClick={() =>
                                              setActiveLockSelectUserId(null)
                                            }
                                            className="block w-full text-center py-1 text-[9px] text-slate-500 hover:text-slate-300 font-bold cursor-pointer"
                                          >
                                            Cerrar menú
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                            {canManageAccess &&
                              (rolesList.find((r) => r.key === user.role)
                                ?.privilegeLevel || 1) < currentUser.level && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={
                                    loadingUserId === user.id ||
                                    user.id === currentUser.id
                                  }
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 cursor-pointer"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
