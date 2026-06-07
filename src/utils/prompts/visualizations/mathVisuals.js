export const mathVisuals = `
             - **Geometry (WAJIB UNTUK GEOMETRI/BANGUN RUANG)**: DILARANG KERAS menggunakan tipe visual lain (seperti flowchart/diagram) untuk soal matematika bangun ruang (Balok/Kubus). Anda WAJIB menggunakan kerangka geometry! AI WAJIB mengirimkan 8 titik sudut (type:"point") dan 12 rusuk (type:"segment").
               ATURAN KERAS 1: Semua titik (A-H) WAJIB didefinisikan koordinatnya terlebih dahulu di array 'elements' sebelum membuat 'segment'.
               ATURAN KERAS 2: APAPUN PERTANYAANNYA (meskipun menanyakan 1 diagonal), Anda DILARANG KERAS hanya menggambar 1 garis! Anda WAJIB MENGGAMBAR KESELURUHAN 12 RUSUK agar kerangka bangun ruang terlihat utuh. JANGAN MALAS!
               CONTOH FULL RANGKA BALOK:
               {"type": "geometry", "config": { "board": { "boundingbox": [-2, 12, 12, -2] }, "elements": [
                 {"type":"point","parents":[0,0],"id":"A"}, {"type":"point","parents":[6,0],"id":"B"},
                 {"type":"point","parents":[8,2],"id":"C"}, {"type":"point","parents":[2,2],"id":"D"},
                 {"type":"point","parents":[0,6],"id":"E"}, {"type":"point","parents":[6,6],"id":"F"},
                 {"type":"point","parents":[8,8],"id":"G"}, {"type":"point","parents":[2,8],"id":"H"},
                 {"type":"segment","parents":["A","B"],"properties":{"strokeColor":"#FF5733"}},
                 {"type":"segment","parents":["B","C"],"properties":{"strokeColor":"#3498db"}},
                 {"type":"segment","parents":["C","D"]}, {"type":"segment","parents":["D","A"]},
                 {"type":"segment","parents":["E","F"]}, {"type":"segment","parents":["F","G"]},
                 {"type":"segment","parents":["G","H"]}, {"type":"segment","parents":["H","E"]},
                 {"type":"segment","parents":["A","E"]}, {"type":"segment","parents":["B","F"]},
                 {"type":"segment","parents":["C","G"]}, {"type":"segment","parents":["D","H"]}
               ]}}
             - **Function (Fungsi Matematis)**: WAJIB digunakan untuk soal persamaan, grafik, aljabar, dan fungsi. DILARANG menggunakan Chart Statistik untuk soal grafik aljabar!
               ATURAN KERAS: Pastikan 'expression' adalah rumus matematika javascript yang valid (gunakan * untuk kali, / untuk bagi). Atur xRange dan yRange agar titik potong terlihat!
               CONTOH FULL FUNGSI KUADRAT:
               {"type": "function", "config": { "expression": "x*x - 4*x + 3", "title": "Grafik f(x)", "xLabel": "Sumbu X", "yLabel": "Sumbu Y", "xRange": [-2, 6], "yRange": [-5, 10] } }
               
             - **Chart (Data Statistik)**: WAJIB digunakan untuk soal probabilitas, penyajian data, dan statistik. DILARANG menggunakan tipe Function untuk soal data statistik murni!
               ATURAN KERAS: Sesuaikan tipe chart (bar, line, scatter) dan pastikan array 'data' sama persis dengan angka di tabel soal!
               CONTOH FULL STATISTIK:
               {"type": "chart", "config": { "type": "bar", "title": "Hasil Panen (Ton)", "data": [{"x": "2020", "y": 50}, {"x": "2021", "y": 75}, {"x": "2022", "y": 60}] } }
`;
