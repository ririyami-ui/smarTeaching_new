/**
 * Professional Visualization Models for Smart Teaching
 * Based on PISA, TIMSS, and ANBK standards.
 */

export const professionalModels = {
    mathematics: {
        literacy_numeracy: {
            title: "Model Literasi Numerasi (PISA-Style)",
            description: "Menggunakan data nyata untuk pengambilan keputusan.",
            example_prompt: "Gunakan tipe 'chart' (bar/line). Sajikan dua data yang berkaitan (misal: suhu vs penjualan es krim). Mintalah siswa menganalisis korelasi, bukan sekadar membaca angka.",
            sync_rule: "Range visual harus mencakup area 'Critical Decision Point' (titik di mana tren berubah)."
        },
        modeling: {
            title: "Model Pemodelan Matematika",
            description: "Menerjemahkan situasi nyata ke grafik tanpa membocorkan rumus.",
            example_prompt: "Gunakan tipe 'function'. Tampilkan kurva tanpa persamaan di judul. Gunakan label sumbu yang spesifik (misal: 'Waktu (detik)' vs 'Ketinggian (meter)').",
            no_spoiler_rule: "Hanya gunakan label deskriptif, dilarang keras menuliskan konstanta atau variabel rumus pada visual."
        }
    },
    science: {
        experimental: {
            title: "Model Desain Eksperimen",
            description: "Visualisasi setup laboratorium atau hasil pengamatan.",
            example_prompt: "Gunakan tipe 'diagram' (flowchart) atau 'image'. Tunjukkan variabel bebas dan variabel terikat dalam visual.",
            logic_rule: "Visual harus menunjukkan 'kontradiksi' atau 'pola' yang harus diidentifikasi siswa."
        }
    },
    social_language: {
        infographic_analysis: {
            title: "Model Analisis Infografis (Literasi Membaca)",
            description: "Informasi visual yang padat untuk diinterpretasikan.",
            example_prompt: "Gunakan tipe 'handdrawn' (infografis). Sajikan timeline atau perbandingan data sosial.",
            pedagogical_rule: "Infografis harus berisi minimal 2-3 fakta yang saling berhubungan."
        }
    }
};
