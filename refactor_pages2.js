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

// Maintenance.tsx
replaceContent('client/src/pages/Maintenance.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  // Fetch
  [/const res = await api\.get\(\`\/maintenance\?\$\{params\}\`\)\s+if \(res\.data\.success\) {\s+setLogs\(res\.data\.data\.items\)\s+setPagination\([^)]+\)\s+}/, `const data = await api.maintenance.list(Object.fromEntries(params))\n      if (data.success) {\n        setLogs(data.data.items)\n        setPagination({ page: data.data.page, pageSize: data.data.page_size, total: data.data.total, totalPages: data.data.total_pages })\n      }`],
  // Create
  [/const res = await api\.post\('\/maintenance', payload\)\s+if \(res\.data\.success\)/, `const data = await api.maintenance.create(payload)\n      if (data.success)`],
  // Loading & EmptyState wrapping
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={6} />
      ) : logs.length === 0 ? (
        <EmptyState 
          title="No maintenance logs yet." 
          action={<Button onClick={() => setShowCreate(true)}>Log Maintenance</Button>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

// Dashboard.tsx
replaceContent('client/src/pages/Dashboard.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { CardSkeleton } from '../components/ui/CardSkeleton'"],
  // Fetch
  [/const res = await api\.get\('\/dashboard\/stats'\)\s+if \(res\.data\.success\) {\s+setStats\(res\.data\.data\)\s+}/, `const data = await api.dashboard.getStats()\n      if (data.success) {\n        setStats(data.data)\n      }`]
]);

// Analytics.tsx
replaceContent('client/src/pages/Analytics.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { CardSkeleton } from '../components/ui/CardSkeleton'"],
  // Fetch
  [/const \[resOverview, resFleet, resFuel\] = await Promise\.all\(\[\s+api\.get\(\`\/analytics\/overview\?\$\{params\}\`\),\s+api\.get\(\`\/analytics\/fleet\?\$\{params\}\`\),\s+api\.get\(\`\/analytics\/fuel\?\$\{params\}\`\)\s+\]\)\s+if \(resOverview\.data\.success\) setOverview\(resOverview\.data\.data\)\s+if \(resFleet\.data\.success\) setFleetStats\(resFleet\.data\.data\)\s+if \(resFuel\.data\.success\) setFuelTrends\(resFuel\.data\.data\)/, 
   `const [dataOverview, dataFleet, dataFuel] = await Promise.all([\n        api.analytics.getOverview(Object.fromEntries(params)),\n        api.analytics.getFleetStats(Object.fromEntries(params)),\n        api.analytics.getFuelTrends(Object.fromEntries(params))\n      ])\n      if (dataOverview.success) setOverview(dataOverview.data)\n      if (dataFleet.success) setFleetStats(dataFleet.data)\n      if (dataFuel.success) setFuelTrends(dataFuel.data)`]
]);

// Settings.tsx
replaceContent('client/src/pages/Settings.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  // Fetch users
  [/const res = await api\.get\('\/users'\)\s+if \(res\.data\.success\) setUsers\(res\.data\.data\)/, `const data = await api.settings.getUsers()\n      if (data.success) setUsers(data.data)`],
  // Create user
  [/const res = await api\.post\('\/users', formData\)\s+if \(res\.data\.success\) {\s+setUsers\(\[\.\.\.users, res\.data\.data\]\)\s+setShowCreateUser\(false\)\s+}/, `const data = await api.settings.createUser(formData)\n      if (data.success) {\n        setUsers([...users, data.data])\n        setShowCreateUser(false)\n      }`],
  // Update user (if exists)
  [/const res = await api\.put\(\`\/users\/\$\{editingUser\.id\}\`, formData\)\s+if \(res\.data\.success\) {\s+setUsers\(users\.map\(u => u\.id === editingUser\.id \? res\.data\.data : u\)\)\s+setEditingUser\(null\)\s+}/, `const data = await api.settings.updateUser(editingUser.id, formData)\n      if (data.success) {\n        setUsers(users.map(u => u.id === editingUser.id ? data.data : u))\n        setEditingUser(null)\n      }`],
  // Delete user
  [/const res = await api\.delete\(\`\/users\/\$\{id\}\`\)\s+if \(res\.data\.success\) {\s+setUsers\(users\.filter\(u => u\.id !== id\)\)\s+}/, `const data = await api.settings.deleteUser(id)\n      if (data.success) {\n        setUsers(users.filter(u => u.id !== id))\n      }`]
]);

console.log('Done refactoring batch 2');
