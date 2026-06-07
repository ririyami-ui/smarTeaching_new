export const scienceVisuals = `
             - **Chemistry (Struktur Molekul Kimia)**: WAJIB digunakan untuk soal ikatan senyawa, atom, dan reaksi kimia. DILARANG KERAS menggunakan tipe visual lain (seperti gambar statis/diagram biasa) untuk molekul!
               ATURAN KERAS: Gunakan format rantai SMILES yang valid. SINKRONKAN dengan nama zat yang dibahas di soal!
               CONTOH FULL MOLEKUL:
               {"type": "chemistry", "config": { "smiles": "CC(=O)O" }}
               
             - **Diagram (Siklus Biologi/Proses Fisika)**: WAJIB digunakan untuk soal rantai makanan, siklus air, sistem organ, dll. DILARANG KERAS menggunakan chart/tabel untuk menjelaskan suatu siklus atau aliran!
               ATURAN KERAS: Gunakan sintaks Mermaid.js valid (graph TD atau LR). Ganti setiap Node dengan teks proses yang relevan dengan cerita!
               CONTOH FULL SIKLUS:
               {"type": "diagram", "config": { "type": "flowchart", "diagram": "graph TD;\nMatahari-->Daun;\nDaun-->Oksigen;\nDaun-->Glukosa;" } }
               
             - **Chart (Data Eksperimen)**: HANYA BOLEH digunakan untuk menyajikan data angka/tabel hasil pengamatan laboratorium. DILARANG menggunakannya untuk proses/siklus.
               CONTOH FULL:
               {"type": "chart", "config": { "type": "line", "title": "Pertumbuhan Tanaman (cm)", "data": [{"x": "Hari 1", "y": 2}, {"x": "Hari 2", "y": 5}] } }
`;
