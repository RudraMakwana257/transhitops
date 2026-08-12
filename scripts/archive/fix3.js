const fs = require('fs');

function replaceFile(path, replacers) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  for (let r of replacers) {
    content = content.replace(r[0], r[1]);
  }
  fs.writeFileSync(path, content);
}

// 1. Fix unused imports in Stores (Toasts)
const stores = ['client/src/stores/vehicleStore.ts', 'client/src/stores/driverStore.ts', 'client/src/stores/tripStore.ts'];
for (const s of stores) {
  let type = s.includes('vehicle') ? 'vehicle' : s.includes('driver') ? 'driver' : 'trip';
  let Cap = type.charAt(0).toUpperCase() + type.slice(1);
  replaceFile(s, [
    // Create
    [new RegExp(`get\\(\\)\\.fetch${Cap}s\\(\\{ page: 1 \\}\\)`), `get().fetch${Cap}s({ page: 1 })\n      toast('${Cap} created successfully', 'success')`],
    // Update
    [new RegExp(`if \\(res\\.data\\.success\\) \\{\\s+set\\(\\{ selected${Cap}: res\\.data\\.data, loading: false \\}\\)`), `if (res.data.success) {\n        set({ selected${Cap}: res.data.data, loading: false })\n        toast('${Cap} updated successfully', 'success')`],
    // Delete
    [new RegExp(`get\\(\\)\\.fetch${Cap}s\\(\\{ page: get\\(\\)\\.pagination\\.page \\}\\)`), `get().fetch${Cap}s({ page: get().pagination.page })\n      toast('${Cap} deleted', 'success')`],
    // Remove unused import if toast is still unused?
    // Let's just remove the import if I can't inject.
    // I'll actually just try replacing. If it fails to match, I remove the import.
  ]);
  
  // Just in case, if toast is not used in the file, remove the import
  let newContent = fs.readFileSync(s, 'utf8');
  if (newContent.split('toast(').length <= 1) {
    newContent = newContent.replace("import { toast } from '../store/toastStore'\n", "");
    fs.writeFileSync(s, newContent);
  }
}

// 2. Fix Vehicles, Drivers, Trips missing imports
['client/src/pages/Vehicles.tsx', 'client/src/pages/Drivers.tsx', 'client/src/pages/Trips.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('TableSkeleton')) {
    c = c.replace(/import \{ DataTable \} from '\.\.\/components\/ui\/DataTable'/, "import { DataTable } from '../components/ui/DataTable'\nimport { TableSkeleton } from '../components/ui/TableSkeleton'\nimport { EmptyState } from '../components/ui/EmptyState'\nimport { ErrorState } from '../components/ui/ErrorState'");
    fs.writeFileSync(f, c);
  }
});

// 3. Fix unused imports in pages
const unusedMap = {
  'client/src/pages/Analytics.tsx': [/import \{ ErrorState \} from '\.\.\/components\/ui\/ErrorState'\n/, /import \{ CardSkeleton \} from '\.\.\/components\/ui\/CardSkeleton'\n/],
  'client/src/pages/Dashboard.tsx': [/import \{ ErrorState \} from '\.\.\/components\/ui\/ErrorState'\n/, /import \{ CardSkeleton \} from '\.\.\/components\/ui\/CardSkeleton'\n/],
  'client/src/pages/Fuel.tsx': [/import \{ ErrorState \} from '\.\.\/components\/ui\/ErrorState'\n/],
  'client/src/pages/Expenses.tsx': [/import \{ ErrorState \} from '\.\.\/components\/ui\/ErrorState'\n/],
  'client/src/pages/Maintenance.tsx': [/import \{ ErrorState \} from '\.\.\/components\/ui\/ErrorState'\n/, /import \{ TableSkeleton \} from '\.\.\/components\/ui\/TableSkeleton'\n/, /import \{ EmptyState \} from '\.\.\/components\/ui\/EmptyState'\n/],
  'client/src/pages/Settings.tsx': [/import \{ ErrorState \} from '\.\.\/components\/ui\/ErrorState'\n/, /import \{ TableSkeleton \} from '\.\.\/components\/ui\/TableSkeleton'\n/, /import \{ EmptyState \} from '\.\.\/components\/ui\/EmptyState'\n/],
};

for (const [f, regexes] of Object.entries(unusedMap)) {
  let c = fs.readFileSync(f, 'utf8');
  for (const rx of regexes) {
    c = c.replace(rx, '');
  }
  fs.writeFileSync(f, c);
}

console.log('Fixed again');
