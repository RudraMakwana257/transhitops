import os
import re

MAPPINGS = {
    # Broad replacements
    r'\[var\(--bg-page\)\]': 'background',
    r'\[var\(--bg-card\)\]': 'card',
    r'\[var\(--bg-sidebar\)\]': 'muted/50',
    r'\[var\(--bg-input\)\]': 'background',
    r'\[var\(--bg-hover\)\]': 'accent',
    r'\[var\(--border-default\)\]': 'border',
    r'\[var\(--border-strong\)\]': 'border',
    r'\[var\(--border-color\)\]': 'border',
    r'\[var\(--text-primary\)\]': 'foreground',
    r'\[var\(--text-secondary\)\]': 'muted-foreground',
    r'\[var\(--text-muted\)\]': 'muted-foreground',
    r'\[var\(--text-inverse\)\]': 'primary-foreground',
    r'\[var\(--brand-primary\)\]': 'primary',
    r'\[var\(--brand-primary-hover\)\]': 'primary/90',
    r'\[var\(--brand-primary-light\)\]': 'primary/10',
    
    # Specific edge cases where it was hardcoded like text-[var(--border-default)]
    r'text-\[hsl\(var\(--primary\)\)\]': 'text-primary',
    r'border-\[hsl\(var\(--primary\)\)\]': 'border-primary',
    r'bg-\[hsl\(var\(--primary\)\)\]': 'bg-primary',
    
    # Leftover inline styles
    r'var\(--text-muted\)': 'hsl(var(--muted-foreground))',
    r'var\(--bg-card\)': 'hsl(var(--card))',
    r'var\(--border-default\)': 'hsl(var(--border))',
    
    # Update rounded
    r'rounded-md': 'rounded-xl',
    r'rounded-lg': 'rounded-xl',
}

def migrate_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    for pattern, replacement in MAPPINGS.items():
        new_content = re.sub(pattern, replacement, new_content)

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
