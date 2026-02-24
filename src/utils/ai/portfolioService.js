import { getModel, handleGeminiError, retryWithBackoff } from './base';
import { BSKAP_DATA } from '../bskapData';
/**
 * Generates a specific chapter for the Semester Portfolio.
 * 
 * @param {number} chapterId - The ID of the chapter (1-6).
 * @param {Object} contextData - The gathered data for this chapter.
 * @param {Object} teacherProfile - Profile info (name, school, etc.).
 * @returns {Promise<string>} The generated chapter content in Markdown.
 */
export const generatePortfolioChapter = async (chapterId, contextData, teacherProfile, selectedSubject) => {
    try {
        const model = getModel();

        const mapelHeader = selectedSubject ? `\nFOKUS MATA PELAJARAN: ${selectedSubject}\n` : '';

        const STRICT_DATA_RULES = `
            ATURAN KETAT DATA-DRIVEN (ANTI-HALLUCINATION):
            1. DILARANG KERAS mengarang data, nilai, atau aktivitas yang tidak ada dalam 'contextData'.
            2. Jika data kosong, narasikan secara positif tentang potensi perbaikan, JANGAN mengarang kejadian.
            3. Fokus pada ANALISIS DATA AKTUAL, bukan sekadar basa-basi administratif.
            4. TONE NARASI: Gunakan gaya bahasa akademik yang objektif dan berwibawa.
            5. PENYEBUTAN DIRI: Selalu gunakan istilah "Penulis" untuk merujuk pada diri guru dalam narasi laporan. JANGAN menyebutkan nama guru di dalam kalimat naratif agar kesan laporan lebih mendalam dan formal.
            6. VISUALISASI TEKSTUAL: Gunakan TABEL MARKDOWN untuk menyajikan data statistik (nilai, daftar kelas, jumlah siswa, pelanggaran). Gunakan BULLET POINTS untuk daftar sistematis atau poin-poin kesimpulan.
            7. PENYAJIAN DATA: Setiap poin penjelasan penting HARUS dipertegas dengan penyajian data dalam bentuk tabel di tengah-tengah penjelasan jika relevan.
            8. ETIKA DATA KOSONG: DILARANG KERAS menggunakan istilah "Data Kosong", "null", atau "undefined" jika suatu nilai tidak ditemukan. Gunakan kalimat profesional seperti: "Informasi sedang diperbarui", "Data dalam tahap sinkronisasi", atau "Belum tersedia catatan khusus untuk periode ini".
        `;

        const prompts = {
            1: `
                BAB I: PENDAHULUAN
                Tugas: Tulis narasi pembuka portofolio semester yang elegan dan profesional.
                
                ${STRICT_DATA_RULES}

                STRUKTUR WAJIB (HARUS ADA):
                1.1. Latar Belakang
                Pendidikan adalah proses dinamis yang menuntut evaluasi berkelanjutan. Laporan ini disusun sebagai bentuk akuntabilitas profesional guru mata pelajaran ${selectedSubject} selama satu semester berjalan. Fokus utama laporan ini bukan sekadar angka atau nilai administratif, melainkan rekam jejak efektivitas pedagogis, penyerapan materi oleh siswa, serta dinamika instruksional yang terjadi di dalam kelas.

                1.2. Landasan Filosofis Pengajaran
                Bagian ini harus memaparkan visi dan prinsip pedagogis Penulis yang disesuaikan dengan konteks mata pelajaran ${selectedSubject} dan jenjang ${contextData.jenjangSekolah || 'Sekolah'}. 
                INSTRUKSI KHUSUS: 
                - SINTESISKAN sebuah prinsip pengajaran yang relevan (misal: Student-Centered, Inkuiri, Kontekstual, atau Berbasis Karakter) yang mencerminkan pendekatan pengajaran semester ini.
                - Hubungkan filosofi tersebut dengan relevansi materi yang diajarkan, khususnya terkait: ${(contextData.visiContext?.topics || []).join(', ')}.
                - DILARANG terpaku pada satu kutipan statis; narasikan secara mengalir dan visioner.

                1.3. Tujuan Laporan
                Tujuan utama penyusunan laporan ini adalah untuk evaluasi kinerja, pemetaan potensi siswa, refleksi profesional guru, dan sebagai dasar perencanaan semester depan.

                1.4. Ruang Lingkup Laporan
                Laporan ini mencakup aktivitas pengajaran pada seluruh kelas yang diampu. 
                Sajikan data ruang lingkup dalam TABEL MARKDOWN dengan kolom: No, Nama Kelas, dan Jumlah Siswa.
                Data Kelas: ${JSON.stringify(contextData.daftarKelas)}
                Total Siswa: ${contextData.totalSiswa || 0} orang.

                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB I: PENDAHULUAN.
                - DILARANG melakukan analisis mendalam tentang kurikulum/ATP di bab ini (itu bagian Bab II).
                - Fokus pada narasi pengantar dan ruang lingkup siswa.
                - Gunakan data dari contextData untuk mengisi bagian yang relevan.
            `,
            2: `
                BAB II: PEMETAAN KURIKULUM & TARGET PEMBELAJARAN
                ${STRICT_DATA_RULES}
                ${mapelHeader}
                Tugas: Tulis narasi profesional untuk Bab II berdasarkan data kurikulum aktual dari sistem.
                
                STRUKTUR WAJIB (HARUS ADA):
                2.1. Analisis Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP).
                2.2. Target Ketuntasan Minimal/Kriteria Ketercapaian Tujuan Pembelajaran (KKTP).
                2.3. Relevansi Materi dengan Kebutuhan Siswa Abad 21 (4C) dan Profil Lulusan / Karakter.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB II: PEMETAAN KURIKULUM & TARGET PEMBELAJARAN.
                - Fokus pada bagaimana kurikulum diturunkan menjadi tujuan pembelajaran yang konkret.
                
                Data: ${JSON.stringify(contextData)}
                Profil Guru: ${JSON.stringify(teacherProfile)}
            `,
            3: `
                BAB III: STRATEGI PEMBELAJARAN & IMPLEMENTASI (THE PEDAGOGY)
                ${STRICT_DATA_RULES}
                Tugas: Tulis narasi profesional untuk Bab III berdasarkan log jurnal mengajar.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                3.1. Inovasi Metode Mengajar (Project Based Learning, Discovery, dll).
                3.2. Integrasi Teknologi dan Media Pembelajaran Digital.
                3.3. Efektivitas Modul Ajar dan Bahan Ajar yang Digunakan.
                3.4. Adaptasi Pembelajaran untuk Berbagai Tingkat Kemampuan (Diferensiasi).
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB III: STRATEGI PEMBELAJARAN & IMPLEMENTASI (THE PEDAGOGY).
                - Gunakan data jurnal untuk membuktikan penerapan metode tersebut.
                - ANALISIS REFLEKSI: Perhatikan bagian 'reflection' dan 'followUp' dalam data jurnal untuk menggambarkan bagaimana Penulis mengevaluasi dan memperbaiki kualitas pengajaran secara berkelanjutan.
                
                Data Jurnal: ${JSON.stringify(contextData)}
            `,
            4: `
                BAB IV: ANALISIS KOMPREHENSIF HASIL BELAJAR (MAPEL)
                ${STRICT_DATA_RULES}
                Tugas: Tulis narasi profesional untuk Bab IV berdasarkan statistik nilai absolut dari sistem.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                4.1. Statistik Nilai Kolektif Gabungan: Sajikan dalam TABEL MARKDOWN (Jenis Asesmen vs Rata-rata Nilai).
                4.2. Perbandingan Pencapaian Antar Asesmen: Identifikasi tren menggunakan bullets.
                4.3. Analisis Komparatif Antar Kelas: Gunakan data 'komparasiAntarKelas' untuk membuat TABEL MARKDOWN perbandingan.
                4.4. Identifikasi dan Interpretasi Gap Pencapaian di Antara Rombel.
                4.5. Rekomendasi Strategis dan Keberhasilan Program Remedial/Pengayaan.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB IV: ANALISIS KOMPREHENSIF HASIL BELAJAR (MAPEL).
                - Interpretasikan data tabel secara naratif, jangan hanya menyajikan angka.
                
                Data Nilai: ${JSON.stringify(contextData)}
            `,
            5: `
                BAB V: DISIPLIN AKADEMIK & ETIKA BELAJAR
                ${STRICT_DATA_RULES}
                Tugas: Tulis narasi profesional untuk Bab V berdasarkan log perilaku dan kedisiplinan.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                5.1. Tinjauan Umum Kedisiplinan & Etika Karakter Kelas.
                5.2. Kedisiplinan Pengumpulan Tugas: Sajikan ringkasan data 'analisisKedisiplinanTugas' dalam TABEL MARKDOWN.
                5.3. Partisipasi dan Keaktifan Siswa: Sajikan data 'partisipasiSiswa' dalam TABEL MARKDOWN.
                5.4. Identifikasi Area Perbaikan Karakter Siswa.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB V: DISIPLIN AKADEMIK & ETIKA BELAJAR.
                - Jika data 'infractions' kosong, narasikan sebagai hal positif (kelas tertib).
                
                Data: ${JSON.stringify(contextData)}
            `,
            6: `
                BAB VI: EVALUASI PERIODE & ANALISIS SWOT
                ${STRICT_DATA_RULES}
                Tugas: Lakukan analisis SWOT mendalam tentang kinerja pengajaran semester ini.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                6.1. Kekuatan (Strengths): Keberhasilan dalam menyampaikan materi sulit.
                6.2. Kelemahan (Weaknesses): Kendala teknis atau manajemen waktu.
                6.3. Peluang (Opportunities): Ide pengembangan materi untuk semester depan berdasarkan 'followUp' atau refleksi keberhasilan.
                6.4. Tantangan (Threats): Faktor eksternal atau hambatan teknis yang tercatat dalam data 'challenges'.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB VI: EVALUASI PERIODE & ANALISIS SWOT.
                
                Data Aktivitas: ${JSON.stringify(contextData)}
            `,
            7: `
                BAB VII: PENUTUP & REKOMENDASI KEBIJAKAN MAPEL
                ${STRICT_DATA_RULES}
                Tugas: Tulis kesimpulan dan rekomendasi untuk sekolah berdasarkan keseluruhan data.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                7.1. Kesimpulan Efektivitas Pengajaran Semester Ini.
                7.2. Rekomendasi Sarana Prasarana Laboratorium/Perpustakaan.
                7.3. Rencana Pengembangan Keprofesian Berkelanjutan (PKB) Guru.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB VII: PENUTUP & REKOMENDASI KEBIJAKAN MAPEL.
                - Sertakan bagian "DAFTAR PUSTAKA" di paling akhir menggunakan format APA Style.
                
                Data Rangkuman: ${JSON.stringify(contextData)}
            `
        };

        const result = await retryWithBackoff(async () => {
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{
                            text: `Saya ingin Anda bertindak sebagai asisten audit akademik profesional.Anda akan membantu saya menulis buku laporan portofolio semester yang menawan dan berbobot.
                        
PANDUAN KETAT(SYSTEM INSTRUCTION):
    1. GAYA PENULISAN ILMIAH(JURNAL / SKRIPSI / PTK): Tuliskan laporan ini dengan gaya bahasa baku, objektif, dan suportif layaknya sebuah Jurnal Ilmiah, Skripsi, atau Penelitian Tindakan Kelas(PTK).Jaga TONE PENULISAN YANG KONSISTEN mulai dari paragraf pertama hingga kesimpulan akhir.
2. STRUKTUR PARAGRAF DINAMIS & EKSPANSIF: Setiap poin wajib diuraikan menjadi esai mini(4 - 6 paragraf panjang) yang komprehensif.Paragraf harus dinamis: Anda SANGAT DIPERBOLEHKAN menggunakan BULLET POINTS atau NUMBERING DENGAN WAJAR jika memang efektif untuk merinci suatu teori, hasil observasi, atau langkah konkret.Jangan sampai tulisan menjadi kaku.
3. INTEGRASI TABEL DAN VISUALISASI: WAJIB menyisipkan TABEL MARKDOWN TEPAT DI SELA - SELA PARAGRAF analisis untuk memvisualisasikan data kuantitatif, daftar nilai, atau rekapitulasi numerik.Jangan menaruh semua tabel di akhir judul, melainkan integrasikan langsung sebagai landasan pembahasan di tengah argumen.
4. KEPATUHAN FAKTA & SUMBER RUJUKAN(ANTI - HALUSINASI): DILARANG KERAS MENGARANG BEBAS.Setiap argumen atau analisis harus memiliki rujukan yang jelas dan logis(baik merujuk pada data JSON yang dilampirkan, Standar Kurikulum BSKAP, maupun teori pedagogi / psikologi pendidikan yang diakui).
5. KUTIPAN TEORI LOKAL DIBANGUN BERTATAP: Saat membahas metode / teori(misal: discovery learning, psikologi kognitif), Anda WAJIB menyebutkan tokoh / teorinya sebagai kutipan sebut nama di dalam teks.JANGAN MEMBUAT DAFTAR PUSTAKA DI SETIAP BAB.Format Daftar Pustaka HANYA diizinkan muncul pada Bab Kesimpulan(BAB VI).
6. TERMINOLOGI TEPAT: JANGAN menggunakan istilah eksternal secara asumsional.Gunakan terminologi persis sesuai tabel / data yang diberikan(misal: ikuti apa yang ada di data Kurikulum).
7. PENANGANAN DATA KOSONG: Jika data kosong, secara eksplisit nyatakan bahwa "Berdasarkan penarikan data sistem..." dengan kalimat akademik profesional, JANGAN MENGARANG ISI BARU.

STANDAR KURIKULUM APLIKASI(WAJIB DIPATUHI JIKA RELEVAN):
${JSON.stringify(BSKAP_DATA.standards, null, 2)} `
                        }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Siap, Pak/Ibu Guru. Saya mengerti instruksi ketat ini. Saya HANYA akan menggunakan data JSON yang diberikan dan standar kurikulum aplikasi (seperti Profil Lulusan 2025 BSKAP). Saya TIDAK AKAN mengarang bebas, berhalusinasi, atau menambahkan istilah eksternal di luar data tersebut. Saya akan mematuhi secara absolut untuk menjaga akurasi dan kejujuran laporan akademik. Silakan kirimkan datanya." }],
                    },
                ],
            });

            const response = await chat.sendMessage(prompts[chapterId]);
            return response.response.text();
        });

        return result;
    } catch (error) {
        throw new Error(handleGeminiError(error, `Chapter ${chapterId} Generation`));
    }
};
