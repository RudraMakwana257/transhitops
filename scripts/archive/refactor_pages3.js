const fs = require('fs');
const path = require('path');

function replaceContent(filePath, replacers) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const replacer of replacers) {
    if (typeof replacer === 'function') {
      content = replacer(content);
    } else {
      content = content.replace(replacer[0], replacer[1]);
    }
  }
  fs.writeFileSync(fullPath, content);
  console.log(`Updated ${filePath}`);
}

// Vehicles.tsx
replaceContent('client/src/pages/Vehicles.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  // DataTable render wrapper
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={7} />
      ) : vehicles.length === 0 ? (
        <EmptyState 
          title="No vehicles yet." 
          description="Add your first vehicle."
          action={<Link to="/vehicles/new" className="inline-flex items-center justify-center px-4 py-2 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary-hover)]">Add Vehicle</Link>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

// Drivers.tsx
replaceContent('client/src/pages/Drivers.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={6} />
      ) : drivers.length === 0 ? (
        <EmptyState 
          title="No drivers yet." 
          description="Add your first driver."
          action={<Link to="/drivers/new" className="inline-flex items-center justify-center px-4 py-2 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary-hover)]">Add Driver</Link>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

// Trips.tsx
replaceContent('client/src/pages/Trips.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={8} />
      ) : trips.length === 0 ? (
        <EmptyState 
          title="No trips yet." 
          description="Create your first trip."
          action={<Link to="/trips/new" className="inline-flex items-center justify-center px-4 py-2 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary-hover)]">Create Trip</Link>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

// AdminCompanies.tsx
replaceContent('client/src/pages/admin/AdminCompanies.tsx', [
  [/import { api } from '\.\.\/\.\.\/api\/client'/, "import { api } from '../../api/client'\nimport { ErrorState } from '../../components/ui/ErrorState'\nimport { TableSkeleton } from '../../components/ui/TableSkeleton'\nimport { EmptyState } from '../../components/ui/EmptyState'"],
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={6} />
      ) : companies?.items?.length === 0 ? (
        <EmptyState 
          title="No companies yet." 
          action={<Button onClick={() => setShowCreate(true)}>Add Company</Button>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

// NotificationPanel & AppLayout
replaceContent('client/src/components/layout/AppLayout.tsx', [
  [/const \[showNotifications, setShowNotifications\] = useState\(false\)/, "const [showNotifications, setShowNotifications] = useState(false)\n  const [unreadCount, setUnreadCount] = useState(0)"],
  [/<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" \/>/, `{unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[var(--bg-card)]">{unreadCount > 99 ? '99+' : unreadCount}</span>}`],
  [/<NotificationPanel open=\{showNotifications\} onClose=\{\(\) => setShowNotifications\(false\)\} \/>/, `<NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} unreadCount={unreadCount} setUnreadCount={setUnreadCount} />`]
]);

console.log('Done refactoring batch 3');
