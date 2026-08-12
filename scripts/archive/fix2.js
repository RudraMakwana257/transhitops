const fs = require('fs');

function replaceFile(path, replacers) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  for (let r of replacers) {
    content = content.replace(r[0], r[1]);
  }
  fs.writeFileSync(path, content);
}

// Fix unused imports in Stores (Toasts)
const stores = ['client/src/stores/vehicleStore.ts', 'client/src/stores/driverStore.ts', 'client/src/stores/tripStore.ts'];
for (const s of stores) {
  let type = s.includes('vehicle') ? 'vehicle' : s.includes('driver') ? 'driver' : 'trip';
  replaceFile(s, [
    // Create
    [`get().fetch${type.charAt(0).toUpperCase() + type.slice(1)}s({ page: 1 })`, `get().fetch${type.charAt(0).toUpperCase() + type.slice(1)}s({ page: 1 })\n      toast('${type.charAt(0).toUpperCase() + type.slice(1)} created successfully', 'success')`],
    // Update
    [`if (res.data.success) {\n        set({ selected${type.charAt(0).toUpperCase() + type.slice(1)}: res.data.data, loading: false })`, `if (res.data.success) {\n        set({ selected${type.charAt(0).toUpperCase() + type.slice(1)}: res.data.data, loading: false })\n        toast('${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully', 'success')`],
    // Delete
    [`get().fetch${type.charAt(0).toUpperCase() + type.slice(1)}s({ page: get().pagination.page })`, `get().fetch${type.charAt(0).toUpperCase() + type.slice(1)}s({ page: get().pagination.page })\n      toast('${type.charAt(0).toUpperCase() + type.slice(1)} deleted', 'success')`],
    // Error toasts inside catch blocks
    [/set\(\{ error: \(err as any\)\.response\?\.data\?\.message \|\| '([^']+)', loading: false \}\)/g, (match, msg) => `${match}\n      toast((err as any).response?.data?.message || '${msg}', 'error')`]
  ]);
}

// Fix unused EmptyState & TableSkeleton in Analytics, Dashboard, Fuel, Expenses, Maintenance, Settings
replaceFile('client/src/pages/Analytics.tsx', [
  ["import { ErrorState } from '../components/ui/ErrorState'\nimport { CardSkeleton } from '../components/ui/CardSkeleton'", ""] // Remove unused imports because Analytics is custom charts
]);

replaceFile('client/src/pages/Dashboard.tsx', [
  ["import { ErrorState } from '../components/ui/ErrorState'\nimport { CardSkeleton } from '../components/ui/CardSkeleton'", ""] // Same, widgets are separate
]);

replaceFile('client/src/pages/Fuel.tsx', [
  ["import { ErrorState } from '../components/ui/ErrorState'\n", ""] // Handled errors via toast
]);

replaceFile('client/src/pages/Expenses.tsx', [
  ["import { ErrorState } from '../components/ui/ErrorState'\n", ""]
]);

replaceFile('client/src/pages/Maintenance.tsx', [
  ["import { ErrorState } from '../components/ui/ErrorState'\n", ""],
  ["import { TableSkeleton } from '../components/ui/TableSkeleton'\n", ""],
  ["import { EmptyState } from '../components/ui/EmptyState'\n", ""]
]);

replaceFile('client/src/pages/Settings.tsx', [
  ["import { ErrorState } from '../components/ui/ErrorState'\n", ""],
  ["import { TableSkeleton } from '../components/ui/TableSkeleton'\n", ""],
  ["import { EmptyState } from '../components/ui/EmptyState'\n", ""]
]);

console.log('Fixed stuff');
