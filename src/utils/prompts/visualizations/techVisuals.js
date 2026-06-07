export const techVisuals = `
             - **Logic (Rangkaian Gerbang Logika)**: WAJIB digunakan untuk soal Aljabar Boolean, Gerbang Dasar (AND, OR, NOT), dan Sistem Komputer.
               ATURAN KERAS: Gunakan format JSON netlist yang valid (simbol & untuk AND, | untuk OR, ~ untuk NOT). Susun hierarki gerbang logika secara benar sesuai studi kasus soal!
               CONTOH FULL RANGKAIAN LOGIKA:
               {"type": "logic", "config": { "code": "{ \\"assign\\": [ [\\"OutputY\\", [\\"|\\", [\\"&\\", \\"InputA\\", \\"InputB\\"], [\\"~\\", \\"InputC\\"]]] ] }" } }
               
             - **Scratch (Algoritma Visual Blok)**: WAJIB digunakan untuk soal tentang Sprite, logika pemrograman dasar, dan blok kode. DILARANG menggunakan tipe lain (seperti spreadsheet) untuk soal algoritma!
               ATURAN KERAS: Tulis teks blok dengan format yang menyerupai sintaks Scratch sesungguhnya (Gunakan indentasi).
               CONTOH FULL SCRATCH:
               {"type": "scratch", "config": { "code": "when flag clicked\\nset [Score v] to (0)\\nrepeat (10)\\n if <touching [apple v]?> then\\n  change [Score v] by (1)\\n end\\nend" } }
               
             - **Spreadsheet (Tabel TIK/Excel)**: HANYA BOLEH digunakan jika soal secara eksplisit membahas tentang Microsoft Excel, sel, atau rumus tabel (SUM, AVERAGE, dll). DILARANG menggunakan ini untuk soal pemrograman!
               ATURAN KERAS: Tulis data baris dan kolom persis seperti tampilan Excel. Pastikan sel yang difokuskan (selectedCell) sesuai dengan rumus (formulaBar) yang ditanyakan di soal!
               CONTOH FULL SPREADSHEET:
               {"type": "spreadsheet", "config": { "title": "DaftarNilai.xlsx", "selectedCell": "C4", "formulaBar": "=AVERAGE(B2:B3)", "data": [{"row": ["No", "Nama", "Nilai"]}, {"row": ["1", "Budi", "85"]}, {"row": ["2", "Ani", "90"]}] } }
               
             - **Code (Pemrograman)**: Untuk menyajikan sintaks kode murni (Python, C++, HTML).
               CONTOH FULL CODE:
               {"type": "code", "config": { "language": "python", "code": "def hitung_luas(p, l):\\n    return p * l\\nprint(hitung_luas(5, 4))" } }
`;
