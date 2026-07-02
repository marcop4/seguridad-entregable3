const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove AdminPanel import
content = content.replace(/import AdminPanel from '.\/components\/AdminPanel';\n/, '');

// 2. Add imports for the individual panels
const newImports = `
import PanelGestorUsuarios from './components/admin/PanelGestorUsuarios';
import PanelRolesJerarquia from './components/admin/PanelRolesJerarquia';
import PanelAuditoriaCifrado from './components/admin/PanelAuditoriaCifrado';
import PanelInventario from './components/jane/PanelInventario';
import PanelGestorOrdenes from './components/jane/PanelGestorOrdenes';
`;
content = content.replace(/import SentinelLogo from '.\/components\/SentinelLogo';/, "import SentinelLogo from './components/SentinelLogo';" + newImports);

// 3. Find the <Route path="admin" element={ ... } /> block and replace it
const adminRouteRegex = /\{currentUser && currentUser\.level >= 4 && \([\s\S]*?<Route path="admin" element=\{[\s\S]*?<AdminPanel[\s\S]*?\/>\s*\}\s*\/>\s*\)\}/;

const directRoutes = `
            {/* Direct Admin & JANE routes */}
            <Route path="usuarios" element={
              currentUser && currentUser.level >= 4 ? 
              <PanelGestorUsuarios 
                currentUser={currentUser} 
                users={usersList} 
                onRefreshUsers={syncAdminData}
                auditLogs={auditLogs}
                onRefreshAudit={syncAdminData}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
              /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="roles" element={
              currentUser && currentUser.level === 5 ? 
              <PanelRolesJerarquia 
                currentUser={currentUser} 
                users={usersList} 
                onRefreshUsers={syncAdminData}
                auditLogs={auditLogs}
                onRefreshAudit={syncAdminData}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
              /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="auditoria" element={
              currentUser && currentUser.level === 5 ? 
              <PanelAuditoriaCifrado 
                currentUser={currentUser} 
                users={usersList} 
                onRefreshUsers={syncAdminData}
                auditLogs={auditLogs}
                onRefreshAudit={syncAdminData}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
              /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="inventario" element={
              currentUser && currentUser.level >= 4 ? <PanelInventario /> : <Navigate to="/erp/dashboard" replace />
            } />
            <Route path="ordenes" element={
              currentUser && currentUser.level >= 4 ? <PanelGestorOrdenes /> : <Navigate to="/erp/dashboard" replace />
            } />
`;

content = content.replace(adminRouteRegex, directRoutes);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx refactored successfully.');
