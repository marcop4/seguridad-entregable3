const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Añadir importaciones
const importToAdd = `import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StoreLayout from './components/layouts/StoreLayout';
import ERPLayout from './components/layouts/ERPLayout';
import HomePage from './components/jane/HomePage';
import UnifiedLogin from './components/auth/UnifiedLogin';
`;

if (!content.includes('react-router-dom')) {
  content = content.replace(
    "import { useGoogleLogin } from '@react-oauth/google';",
    importToAdd + "import { useGoogleLogin } from '@react-oauth/google';"
  );
}

// 2. Reemplazar todo el bloque return
const lines = content.split('\n');
const returnIndex = lines.findIndex(line => line.trim() === 'return (');

if (returnIndex !== -1) {
  // Wait, there might be multiple 'return (' in the file. We need the LAST one which is the main component return, or we can check the line number (630)
  // Let's just find the last index of 'return ('
  let lastReturnIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === 'return (') {
      lastReturnIndex = i;
      break;
    }
  }
  
  if (lastReturnIndex !== -1) {
    const topContent = lines.slice(0, lastReturnIndex).join('\n');

    const newReturnBlock = `  return (
      <Router>
        <Routes>
          {/* ==================================================== */}
          {/* RUTA DE AUTENTICACIÓN (LOGIN UNIFICADO) */}
          {/* ==================================================== */}
          <Route element={<StoreLayout currentUser={currentUser} onLogout={handleLogout} />}>
            <Route path="/login" element={
              currentUser ? (
                <Navigate to={currentUser.level >= 3 ? "/erp/dashboard" : "/"} replace />
              ) : (
                <UnifiedLogin 
                  onLogin={async (user, pass, force) => {
                    return new Promise(resolve => {
                      setLoginInput(user);
                      setLoginPassword(pass);
                      setTimeout(async () => {
                        const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                        await handleLogin(dummyEvent, force);
                        resolve(true);
                      }, 50);
                    });
                  }}
                  onRegister={async (user, email, name, pass) => {
                    return new Promise(resolve => {
                      setRegUsername(user);
                      setRegEmail(email.split('@')[0]);
                      setRegFullName(name);
                      setRegPassword(pass);
                      setRegConfirmPassword(pass);
                      setTimeout(async () => {
                        const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                        await handleRegister(dummyEvent);
                        resolve(true);
                      }, 50);
                    });
                  }}
                  onForgot={async (email) => {
                    return new Promise(resolve => {
                      setForgotEmail(email.split('@')[0]);
                      setTimeout(async () => {
                        const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                        await handleForgotPassword(dummyEvent);
                        resolve(true);
                      }, 50);
                    });
                  }}
                  apiError={apiError}
                  apiSuccess={apiSuccess}
                  setApiError={setApiError}
                  setApiSuccess={setApiSuccess}
                  systemAlertOverlay={systemAlertOverlay}
                  setSystemAlertOverlay={setSystemAlertOverlay}
                  overrideUserRef={overrideUserRef}
                  playPing={playPing}
                />
              )
            } />
            
            {/* ==================================================== */}
            {/* TIENDA PUBLICA (Nivel 1 o invitados) */}
            {/* ==================================================== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={
              <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                <PanelCatalogoTienda />
                {currentUser && currentUser.level === 1 && <PanelMisPedidos />}
              </div>
            } />
          </Route>

          {/* ==================================================== */}
          {/* JANE ERP - MODULO SENTINEL (Nivel >= 3) */}
          {/* ==================================================== */}
          <Route path="/erp" element={
            currentUser && currentUser.level >= 3 ? (
              <ERPLayout 
                currentUser={currentUser} 
                onLogout={handleLogout} 
                audioEnabled={audioEnabled} 
                setAudioEnabled={setAudioEnabled} 
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }>
            <Route path="dashboard" element={
              <div className="bg-[#141414] rounded-2xl border border-white/5 p-6 md:p-8 shadow-lg space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Bienvenido al Dashboard ERP (Sentinel)
                </h3>
                <p className="text-sm text-slate-400">
                  Seleccione un panel de control desde el menú lateral. Su rol es: {currentUser?.role}.
                </p>
                
                <div className="bg-[#0A0A0A] rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-slate-500 font-mono">ID Sesión: {currentSessionId}</p>
                </div>
              </div>
            } />
            
            {currentUser && currentUser.level >= 4 && (
               <Route path="admin" element={
                 <AdminPanel
                    currentUser={currentUser}
                    auditLogs={auditLogs}
                    onRefreshAudit={syncAdminData}
                    onRefreshUsers={syncAdminData}
                    users={usersList}
                    notifications={notifications}
                    onClearNotifications={handleClearNotifications}
                  />
               } />
            )}

            {currentUser && currentUser.level === 3 && (
               <Route path="pos" element={<PanelPuntoVentaPOS />} />
            )}

            <Route path="manual" element={
               currentUser ? <ManualTabs currentUser={currentUser} /> : null
            } />

            <Route path="testing" element={
               currentUser && currentUser.level >= 5 ? <TestAutomation /> : <Navigate to="/erp/dashboard" replace />
            } />
          </Route>

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }
  `;

    content = topContent + '\n' + newReturnBlock;
    fs.writeFileSync('src/App.tsx', content);
    console.log('App.tsx refactored securely by lines.');
  } else {
    console.log('Could not find last return block line in App.tsx');
  }
} else {
  console.log('Could not find ANY return block line in App.tsx');
}
