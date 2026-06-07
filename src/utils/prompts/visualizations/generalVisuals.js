export const generalVisuals = `
             - **Diagram (Flowchart/Timeline Sejarah)**: "visualization": { "type": "diagram", "config": { "type": "flowchart", "diagram": "graph TD;\\nA[Teks]-->B[Teks];" } }
               *(REL: Gunakan sintaks Mermaid.js valid. WAJIB ganti A dan B dengan peristiwa sejarah atau langkah proses yang relevan dengan cerita soal!)*
             - **Chart (Data Statistik)**: "visualization": { "type": "chart", "config": { "type": "bar", "title": "Data", "data": [{"x": "Tahun A", "y": 20}, {"x": "Tahun B", "y": 40}] } }
               *(REL: Sesuaikan nilai array 'data' dengan angka/tahun pada teks soal!)*
             - **Image (Peta/Ilustrasi Umum)**: "visualization": { "type": "image", "config": { "description": "[Tempatkan Peta/Gambar di sini]", "position": "center" } }
`;
