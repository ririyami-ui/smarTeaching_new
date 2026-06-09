export const techVisuals = `
             - **Security (Diagram Keamanan & Jaringan)**: WAJIB digunakan untuk soal Dampak Sosial Informatika (Privasi, Cyberbullying, Keamanan Akun).
               ATURAN KERAS: Ganti label node agar sesuai nama tokoh di soal!
               CONTOH: {"type": "mermaid", "config": { "code": "graph TD\\n  Siska[Akun Siska] -- Pass Lemah --> Risiko[Risiko Peretasan]\\n  Siska -- Over-Sharing --> Jejak[Jejak Digital Negatif]" } }

             - **Logic (Rangkaian Gerbang)**: WAJIB gunakan tipe "logic" untuk menampilkan simbol gerbang standar (AND, OR, NOT).
               CONTOH: {"type": "logic", "config": { "code": "A AND B -> NOT -> Y" } }
               
             - **Scratch (Visual Blok)**: Hanya untuk soal algoritma. WAJIB ganti teks blok agar sesuai konteks!
               CONTOH: {"type": "scratch", "config": { "code": "when [Login] clicked\\nif <(Siska_password) = [rahasia]> then" } }

             - **Spreadsheet (Tabel Data)**: WAJIB gunakan ini untuk materi Excel/Lembar Kerja/Analisis Data.
               CONTOH: {"type": "spreadsheet", "config": { "headers": ["A", "B", "C"], "rows": [ {"id": 1, "data": ["Nama", "Skor", "Status"]}, {"id": 2, "data": ["Siska", "90", "Lulus"]} ] } }

             **ATURAN SINKRONISASI NARASI (WAJIB)**:
             1. **Haram** menyalin template mentah. Ganti 'InputA', 'Score', atau 'User' dengan nama tokoh di soal (misal: 'Siska', 'Budi').
             2. Visualisasi harus menjadi **Stimulus** yang mendukung cerita soal. Jika soal cerita tentang privasi Siska, visual juga harus tentang privasi Siska.
`;
