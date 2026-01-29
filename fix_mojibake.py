import os

file_path = r"c:\Users\Lakshmi Naga Teja\Downloads\HOSPITALITY\src\pages\HospitalDashboard.jsx"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    
    # Replacements
    # We use explicit strings. Python 3 source is UTF-8 by default.
    replacements = [
        ("ðŸ ¥", "🏥"),
        ("âœ ï¸", "✏️"),
        ("â ¸", "⏳"),
        ("ðŸ’¾", "💾"),
        ("📋¢", "📢"),
        ("📋¤", "📤"),
        ("📋‚", "📂"),
        ("📋  Location", "📍 Location"), # Check spaces
        ("📋 Location", "📍 Location")
    ]
    
    for bad, good in replacements:
        content = content.replace(bad, good)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Success. Processed {original_len} chars -> {len(content)} chars.")
    
except Exception as e:
    print(f"Error: {e}")
