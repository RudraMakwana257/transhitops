import os
import re
from glob import glob

MAPPINGS = {
    r'bg-\[var\(--bg-page\)\]': 'bg-background',
    r'bg-\[var\(--bg-card\)\]': 'bg-card',
    r'bg-\[var\(--bg-sidebar\)\]': 'bg-muted/50',
    r'bg-\[var\(--bg-input\)\]': 'bg-background',
    r'bg-\[var\(--bg-hover\)\]': 'hover:bg-accent hover:text-accent-foreground',
    r'border-\[var\(--border-default\)\]': 'border-border',
    r'border-\[var\(--border-strong\)\]': 'border-border',
    r'border-\[var\(--border-color\)\]': 'border-border',
    r'text-\[var\(--text-primary\)\]': 'text-foreground',
    r'text-\[var\(--text-secondary\)\]': 'text-muted-foreground',
    r'text-\[var\(--text-muted\)\]': 'text-muted-foreground',
    r'text-\[var\(--text-inverse\)\]': 'text-primary-foreground',
    r'text-\[var\(--brand-primary\)\]': 'text-primary',
    r'bg-\[var\(--brand-primary\)\]': 'bg-primary',
    r'bg-\[var\(--brand-primary-hover\)\]': 'bg-primary/90',
    r'bg-\[var\(--brand-primary-light\)\]': 'bg-primary/10',
    r'var\(--brand-primary\)': 'hsl(var(--primary))',
    r'rounded-md': 'rounded-xl',
    r'rounded-lg': 'rounded-xl',
}

def migrate_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    for pattern, replacement in MAPPINGS.items():
        new_content = re.sub(pattern, replacement, new_content)

    # Some manual touchups for common form inputs that are hardcoded instead of using InputWrapper
    new_content = re.sub(r'className="flex h-10 w-full rounded-md border border-input.*?"', 'className="form-input"', new_content)

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Migrated {filepath}")

def main():
    base_dir = '/home/zayron/Main/Hackathon/transitops/client/src'
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                migrate_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
