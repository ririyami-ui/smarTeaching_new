import re
import os

file_path = r"f:\app-firebase\Smart Teaching\smart-teaching-manager\src\pages\QuizGeneratorPage.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove top-level imports
imports_to_remove = [
    r"import \{ asBlob \} from 'html-docx-js-typescript';",
    r"import \{ saveAs \} from 'file-saver';",
    r"import \* as XLSX from 'xlsx';",
    r"import \{ jsPDF \} from 'jspdf';",
    r"import autoTable from 'jspdf-autotable';",
    r"import html2canvas from 'html2canvas';"
]

for imp in imports_to_remove:
    content = re.sub(imp, "", content)

# 2. Fix exportWord
content = re.sub(
    r'const exportWord = async \(\) => \{',
    r'const exportWord = async () => {\n        const { asBlob } = await import("html-docx-js-typescript");\n        const { saveAs } = await import("file-saver");',
    content
)

# 3. Fix exportPDF (need to make it async if it's not and add html2canvas/jsPDF)
content = re.sub(
    r'const exportPDF = async \(\) => \{',
    r'const exportPDF = async () => {\n        const { jsPDF } = await import("jspdf");\n        const { default: html2canvas } = await import("html2canvas");',
    content
)

# 4. Fix exportKartuSoalPDF
content = re.sub(
    r'const exportKartuSoalPDF = \(\) => \{',
    r'const exportKartuSoalPDF = async () => {\n        const { jsPDF } = await import("jspdf");\n        const { default: autoTable } = await import("jspdf-autotable");',
    content
)

# 5. Fix exportKartuSoalWord
content = re.sub(
    r'const exportKartuSoalWord = async \(\) => \{',
    r'const exportKartuSoalWord = async () => {\n        const { asBlob } = await import("html-docx-js-typescript");\n        const { saveAs } = await import("file-saver");',
    content
)

# 6. Fix exportKisiKisiPDF
content = re.sub(
    r'const exportKisiKisiPDF = \(\) => \{',
    r'const exportKisiKisiPDF = async () => {\n        const { jsPDF } = await import("jspdf");\n        const { default: autoTable } = await import("jspdf-autotable");',
    content
)

# 7. Fix exportKisiKisiWord
content = re.sub(
    r'const exportKisiKisiWord = async \(\) => \{',
    r'const exportKisiKisiWord = async () => {\n        const { asBlob } = await import("html-docx-js-typescript");\n        const { saveAs } = await import("file-saver");',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("QuizGeneratorPage.jsx updated successfully!")
