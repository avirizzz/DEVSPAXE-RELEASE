import os
import re

directories = [
    'client/src/pages',
    'client/src/components',
    'client/src'
]

replacements = [
    (r'\bbg-black\b(?!/)', 'bg-app-bg'),
    (r'bg-\[\#000000\]', 'bg-app-bg'),
    (r'bg-\[\#0a0a0a\]', 'bg-sidebar-bg'),
    (r'bg-\[\#111\]', 'bg-surface-bg'),
    (r'bg-\[\#1a1a1a\]', 'bg-surface-hover'),
    (r'text-\[\#E1E0CC\]', 'text-primary-text'),
    (r'border-white/5', 'border-app-border'),
    (r'border-white/10', 'border-app-border-strong'),
    (r'hover:bg-white/5', 'hover:bg-surface-hover'),
    (r'hover:bg-white/\[0\.03\]', 'hover:bg-surface-hover'),
]

for directory in directories:
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith('.jsx'):
                continue
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            original_content = content
            for pattern, replacement in replacements:
                content = re.sub(pattern, replacement, content)
                
            if content != original_content:
                with open(path, 'w') as f:
                    f.write(content)
                print(f"Updated {path}")
