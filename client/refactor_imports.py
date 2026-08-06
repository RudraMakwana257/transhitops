import os
import re
import sys

mapping = {
    'Button': 'ButtonWrapper',
    'Card': 'CardWrapper',
    'Input': 'InputWrapper',
    'Badge': 'BadgeWrapper',
    'Select': 'SelectWrapper',
    'Modal': 'ModalWrapper',
    'DataTable': 'DataTableWrapper'
}

def process_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    new_content = content
    for old, new in mapping.items():
        # Match import paths like '../components/ui/Button' or './Button'
        pattern1 = r'([\'"])((?:\.\.?/)+components/ui/)' + old + r'([\'"])'
        new_content = re.sub(pattern1, r'\1\2' + new + r'\3', new_content)
        
        pattern2 = r'([\'"])((?:\.\.?/)+ui/)' + old + r'([\'"])'
        new_content = re.sub(pattern2, r'\1\2' + new + r'\3', new_content)
        
        # Match sibling imports like './Input' or '../Input'
        pattern3 = r'([\'"])(\.\.?/)' + old + r'([\'"])'
        new_content = re.sub(pattern3, r'\1\2' + new + r'\3', new_content)

    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Updated {path}")

def main():
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))
                
    # Also rename the files themselves
    for old, new in mapping.items():
        old_path = os.path.join('src', 'components', 'ui', f'{old}.tsx')
        new_path = os.path.join('src', 'components', 'ui', f'{new}.tsx')
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            print(f"Renamed {old_path} to {new_path}")

if __name__ == '__main__':
    main()
