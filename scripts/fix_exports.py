import re
import os

file_path = r"f:\app-firebase\Smart Teaching\smart-teaching-manager\src\pages\ProgramMengajarPage.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ProtaView fixes
# handleExportExcel is already async (from previous semi-successful edit), but missing imports
if 'const handleExportExcel = async () => {' in content:
    content = re.sub(
        r'(const finalData = \[\.\.\.header, \.\.\.tableData, summaryRow\];)\s+(const ws = XLSX\.utils\.aoa_to_sheet\(finalData\);)',
        r'\1\n            const XLSX = await import("xlsx");\n            const { saveAs } = await import("file-saver");\n            \2',
        content
    )

# handleExportPDF in ProtaView
content = re.sub(
    r'const handleExportPDF = \(\) => \{\s+try \{',
    r'const handleExportPDF = async () => {\n        try {\n            const { default: jsPDF } = await import("jspdf");\n            const { default: autoTable } = await import("jspdf-autotable");',
    content
)

# 2. PromesView fixes
# handleExportWord
content = re.sub(
    r'const handleExportWord = \(\) => \{',
    r'const handleExportWord = async () => {',
    content
)

# handleExportExcel (PromesView)
# Note: There are two handleExportExcel in the file (ProtaView and PromesView)
# ProtaView one is already async. Let's find the sync one.
content = re.sub(
    r'(?<!async )const handleExportExcel = \(\) => \{',
    r'const handleExportExcel = async () => {',
    content
)

# handleExportPDF in PromesView is ALREADY async but checking just in case
if 'const handleExportPDF = async () => {' not in content:
     content = re.sub(
        r'const handleExportPDF = \(\) => \{\s+try \{',
        r'const handleExportPDF = async () => {\n        try {\n            const { default: jsPDF } = await import("jspdf");\n            const { default: autoTable } = await import("jspdf-autotable");',
        content
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ProgramMengajarPage.jsx updated successfully!")
