import os

file_path = r"c:\Users\Lakshmi Naga Teja\Downloads\HOSPITALITY\src\pages\HospitalDashboard.jsx"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements using escape sequences for non-printable chars
    replacements = [
        ('\xf0\u0178\x8f\xa5', '🏥'), # Hospital
        ('\xe2\x8f\xb8', '⏳'),       # Timer
        ('\xe2\x9c\x8f', '✏️'),       # Edit (base)
        ('\xe2\x9c\x8f\xef\xb8\x8f', '✏️'), # Edit (with selector)
        ('📋¢', '📢'),                # Broadcast (if it exists)
        ('📋¤', '📤'),                # Upload (if it exists)
        ('📋‚', '📂'),                # Records (if it exists)
        ('📋 Location', '📍 Location') # Location
    ]

    for bad, good in replacements:
        content = content.replace(bad, good)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Fixed file.")

except Exception as e:
    print(e)
