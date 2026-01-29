
file_path = r"c:\Users\Lakshmi Naga Teja\Downloads\HOSPITALITY\src\pages\HospitalDashboard.jsx"
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if 'Hospital Dashboard' in line:
                print(f"Line {i+1}: {ascii(line)}")
            if 'Save' in line and ('btn' in line or 'save' in line.lower()):
                 print(f"Line {i+1}: {ascii(line)}")
            if 'Temporarily' in line:
                 print(f"Line {i+1}: {ascii(line)}")
except Exception as e:
    print(e)
