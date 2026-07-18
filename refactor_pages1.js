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

// 1. STORES: vehicleStore, driverStore, tripStore (Add Toasts)
const storeFiles = [
  'client/src/stores/vehicleStore.ts',
  'client/src/stores/driverStore.ts',
  'client/src/stores/tripStore.ts'
];
for (const store of storeFiles) {
  replaceContent(store, [
    // Imports
    [/(import { create } from 'zustand')/, "$1\nimport { toast } from '../store/toastStore'"],
    // Create
    [/set\({ loading: false }\)\s+return (res|data)\.data/g, "set({ loading: false })\n      toast(data ? (data as any).message || 'Created successfully' : 'Created successfully', 'success')\n      return $1.data"],
    // Update
    [/await get\(\)\.(fetch[^)]+)\(\)/g, (match) => `${match}\n      toast('Updated successfully', 'success')`],
    // Delete
    [/await get\(\)\.(fetch[^)]+)\(\)(?![\s\S]*?toast\()/g, (match) => `${match}\n      toast('Deleted successfully', 'success')`],
    // Fix error toasts
    [/set\({ error: \([^)]+\)\.message, loading: false }\)/g, (match) => `${match}\n      toast((error as any).response?.data?.message || 'Operation failed', 'error')`]
  ]);
}

// 2. PAGES with inline Axios
// Fuel.tsx
replaceContent('client/src/pages/Fuel.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  // Fetch
  [/const res = await api\.get\(\`\/fuel\?\$\{params\}\`\)\s+if \(res\.data\.success\) {\s+setLogs\(res\.data\.data\.items\)\s+setPagination\([^)]+\)\s+}/, `const data = await api.fuel.list(Object.fromEntries(params))\n      if (data.success) {\n        setLogs(data.data.items)\n        setPagination({ page: data.data.page, pageSize: data.data.page_size, total: data.data.total, totalPages: data.data.total_pages })\n      }`],
  // Create
  [/const res = await api\.post\('\/fuel', payload\)\s+if \(res\.data\.success\)/, `const data = await api.fuel.create(payload)\n      if (data.success)`],
  // DataTable render wrapper
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={7} />
      ) : logs.length === 0 ? (
        <EmptyState 
          title="No fuel logs yet." 
          description="Record your first fuel consumption."
          action={<Button onClick={() => setShowCreate(true)}>Add Fuel Log</Button>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

// Expenses.tsx
replaceContent('client/src/pages/Expenses.tsx', [
  [/import { api } from '\.\.\/api\/client'/, "import { api } from '../api/client'\nimport { ErrorState } from '../components/ui/ErrorState'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'"],
  [/const res = await api\.get\(\`\/expenses\?\$\{params\}\`\)\s+if \(res\.data\.success\) {\s+setExpenses\(res\.data\.data\.items\)\s+setPagination\([^)]+\)\s+}/, `const data = await api.expenses.list(Object.fromEntries(params))\n      if (data.success) {\n        setExpenses(data.data.items)\n        setPagination({ page: data.data.page, pageSize: data.data.page_size, total: data.data.total, totalPages: data.data.total_pages })\n      }`],
  [/const res = await api\.post\('\/expenses', payload\)\s+if \(res\.data\.success\)/, `const data = await api.expenses.create(payload)\n      if (data.success)`],
  [/<DataTable[\s\S]+?emptyMessage="[^"]+"[\s\S]+?\/>/, (match) => `
      {loading ? (
        <TableSkeleton columns={6} />
      ) : expenses.length === 0 ? (
        <EmptyState 
          title="No expenses yet." 
          action={<Button onClick={() => setShowCreate(true)}>Add Expense</Button>} 
        />
      ) : (
        ${match}
      )}
  `]
]);

console.log('Done refactoring first batch');
