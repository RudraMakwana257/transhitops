import os
import re

schema_dir = "app/schemas"
for filename in os.listdir(schema_dir):
    if not filename.endswith(".py"): continue
    path = os.path.join(schema_dir, filename)
    with open(path, "r") as f:
        content = f.read()
    
    # regex to find: def func(self, value): and change to def func(self, value, **kwargs):
    # only for functions under @validates
    
    # simple replace
    content = re.sub(r'def normalise_email\(self, value\):', r'def normalise_email(self, value, **kwargs):', content)
    content = re.sub(r'def normalise_slug\(self, value\):', r'def normalise_slug(self, value, **kwargs):', content)
    content = re.sub(r'def normalise_name\(self, value\):', r'def normalise_name(self, value, **kwargs):', content)
    content = re.sub(r'def normalise\(self, value\):', r'def normalise(self, value, **kwargs):', content)
    content = re.sub(r'def normalise_source\(self, value\):', r'def normalise_source(self, value, **kwargs):', content)
    content = re.sub(r'def normalise_destination\(self, value\):', r'def normalise_destination(self, value, **kwargs):', content)
    content = re.sub(r'def check_password_complexity\(self, value\):', r'def check_password_complexity(self, value, **kwargs):', content)
    
    # Catch any other @validates methods
    content = re.sub(r'def ([a-zA-Z0-9_]+)\(self, value\):', r'def \1(self, value, **kwargs):', content)
    
    with open(path, "w") as f:
        f.write(content)

print("Fixed schemas")
