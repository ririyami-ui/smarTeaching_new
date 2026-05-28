import { getModel, handleGeminiError, retryWithBackoff } from './base';
import { BSKAP_DATA } from '../bskapData';
import { STRICT_DOCUMENT_BRAIN } from '../prompts/smarttyPrompts';

/**
 * Generates a specific chapter for the Semester Portfolio.
 */
interface PortfolioContextData {
  jenjangSekolah?: string;
  visiContext?: { topics?: string[] };
  daftarKelas?: Array<Record<string, unknown>>;
  totalSiswa?: number;
}

export const generatePortfolioChapter = async (
  chapterId: number, 
  contextData: PortfolioContextData & Record<string, unknown>, 
  teacherProfile: Record<string, unknown>, 
  selectedSubject: string, 
  previousChapters: Record<number, { content: string }> = {}
): Promise<string> => {
    try {
        const model = await getModel(null, false, STRICT_DOCUMENT_BRAIN);

        const mapelHeader = selectedSubject ? `\nFOKUS MATA PELAJARAN: ${selectedSubject}\n` : '';

        const syncContext = Object.entries(previousChapters)
            .filter(([id]) => Number(id) !== chapterId) // Don't include self
            .map(([id, data]) => `BAB ${id}: ${data.content.substring(0, 500)}...`)
            .join('\n\n');

        const STRICT_DATA_RULES = `
            ATURAN KETAT DATA-DRIVEN:
            1. DILARANG KERAS mengarang data yang tidak ada dalam 'contextData'.
            2. Jika data kosong, gunakan kalimat profesional seperti "Data dalam tahap sinkronisasi" atau "Belum tersedia catatan khusus". JANGAN gunakan kata "Kosong" atau "null".
            3. PENYEBUTAN DIRI: Gunakan istilah "Penulis" untuk merujuk pada guru.
            4. VISUALISASI DATA: Gunakan Tabel Markdown untuk data statistik.
            5. INTEGRASI GRAFIK: KHUSUS untuk BAB 2, 3, 4, 5, dan 6, Anda WAJIB menyertakan placeholder [VISUAL_CHART] di posisi yang paling strategis sebagai dasar analisis atau pendukung narasi Anda. AI akan merender grafik aktual di posisi tersebut.
            6. TONE: Senior Professional Educator (Formal, Objektif, Visioner).
            7. SINKRONISASI ANTAR BAB: Pastikan narasi Bab ${chapterId} ini selaras dengan bab-bab sebelumnya yang sudah ditulis (jika ada). Jangan ada kontradiksi dalam penggunaan istilah atau angka.
        `;

        const PREVIOUS_CHAPTERS_PROMPT = syncContext ? `\nKONTEKS BAB SEBELUMNYA (UNTUK SINKRONISASI):\n${syncContext}\n` : '';

        const prompts: Record<number, string> = {
            1: `
                BAB I: PENDAHULUAN
                Tugas: Tulis narasi pembuka portofolio semester yang elegan dan profesional.
                
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}

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
            // ... (rest of the prompts truncated for brevity in codeContent but included in final write)
        };
        
        // Map other prompts from 2 to 7
        prompts[2] = `
                BAB II: PEMETAAN KURIKULUM & TARGET PENCAPAIAN
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}
                Tugas: Tulis narasi profesional untuk Bab II berdasarkan data kurikulum aktual dari sistem.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                2.1. Analisis Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP).
                2.2. Target Ketuntasan Minimal/Kriteria Ketercapaian Tujuan Pembelajaran (KKTP).
                2.3. Relevansi Materi dengan Kebutuhan Siswa Abad 21 (4C) dan Profil Lulusan / Karakter.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB II: PEMETAAN KURIKULUM & TARGET PENCAPAIAN.
                - Sertakan placeholder [VISUAL_CHART] untuk menampilkan visualisasi distribusi materi/kurikulum.
                - Narasikan bagaimana target materi semester ini disusun untuk memastikan kedalaman pemahaman siswa.
                - Interpretasikan data kurikulum secara profesional.
                
                Data: ${JSON.stringify(contextData)}
                Profil Guru: ${JSON.stringify(teacherProfile)}
            `;
        prompts[3] = `
                BAB III: STRATEGI PEMBELAJARAN (PEDAGOGI)
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}
                Tugas: Tulis narasi profesional untuk Bab III berdasarkan log jurnal mengajar.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                3.1. Inovasi Metode Mengajar (Project Based Learning, Discovery, dll).
                3.2. Integrasi Teknologi dan Media Pembelajaran Digital.
                3.3. Efektivitas Modul Ajar dan Bahan Ajar yang Digunakan.
                3.4. Adaptasi Pembelajaran untuk Berbagai Tingkat Kemampuan (Diferensiasi).
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB III: STRATEGI PEMBELAJARAN (PEDAGOGI).
                - Sertakan placeholder [VISUAL_CHART] untuk menampilkan grafik frekuensi pelaksanaan pembelajaran.
                - ANALISIS REFLEKSI: Perhatikan bagian 'reflection' dan 'followUp' dalam data jurnal untuk menggambarkan bagaimana Penulis mengevaluasi dan memperbaiki kualitas pengajaran secara berkelanjutan.
                - Tekankan pada efektivitas metode yang digunakan (misal: diskusi, praktik, atau metode lainnya).
                
                Data Jurnal: ${JSON.stringify(contextData)}
            `;
        prompts[4] = `
                BAB IV: ANALISIS HASIL BELAJAR & PENILAIAN MATA PELAJARAN
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}
                Tugas: Tulis narasi profesional untuk Bab IV berdasarkan statistik nilai absolut dari sistem.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                4.1. Statistik Nilai Kolektif Gabungan: Sajikan dalam TABEL MARKDOWN (Jenis Asesmen vs Rata-rata Nilai).
                4.2. Perbandingan Pencapaian Antar Asesmen: Identifikasi tren menggunakan bullets.
                4.3. Analisis Komparatif Antar Kelas: Gunakan data 'komparasiAntarKelas' untuk membuat TABEL MARKDOWN perbandingan.
                4.4. Identifikasi dan Interpretasi Gap Pencapaian di Antara Rombel.
                4.5. Rekomendasi Strategis dan Keberhasilan Program Remedial/Pengayaan.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB IV: ANALISIS HASIL BELAJAR & PENILAIAN MATA PELAJARAN.
                - Sertakan placeholder [VISUAL_CHART] untuk menampilkan grafik capaian nilai.
                - Fokus pada keberhasilan ketuntasan dan area remedi yang diperlukan.
                - Interpretasikan data tabel secara naratif, jangan hanya menyajikan angka.
                
                Data Nilai: ${JSON.stringify(contextData)}
            `;
        prompts[5] = `
                BAB V: DISIPLIN AKADEMIK & ETIKA BELAJAR SISWA
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}
                Tugas: Tulis narasi profesional untuk Bab V berdasarkan log perilaku dan kedisiplinan.
                
                ${mapelHeader}
                STRUKTUR WAJIB (HARUS ADA):
                5.1. Tinjauan Umum Kedisiplinan & Etika Karakter Kelas.
                5.2. Kedisiplinan Pengumpulan Tugas: Sajikan ringkasan data 'analisisKedisiplinanTugas' dalam TABEL MARKDOWN.
                5.3. Partisipasi dan Keaktifan Siswa: Sajikan data 'partisipasiSiswa' dalam TABEL MARKDOWN.
                5.4. Identifikasi Area Perbaikan Karakter Siswa.
                
                INSTRUKSI KHUSUS:
                - Output HARUS diawali dengan judul: BAB V: DISIPLIN AKADEMIK & ETIKA BELAJAR SISWA.
                - Sertakan placeholder [VISUAL_CHART] untuk menampilkan grafik tren kedisiplinan/pelanggaran.
                - Hubungkan data pelanggaran dengan iklim belajar di kelas.
                - Jika data 'infractions' kosong, narasikan sebagai hal positif (kelas tertib).
                
                Data: ${JSON.stringify(contextData)}
            `;
        prompts[6] = `
                BAB VI: EVALUASI PERIODE & ANALISIS SWOT
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}
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
            `;
        prompts[7] = `
                BAB VII: PENUTUP & REKOMENDASI KEBIJAKAN MAPEL
                ${STRICT_DATA_RULES}
                ${PREVIOUS_CHAPTERS_PROMPT}
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
            `;

        const result = await retryWithBackoff(async () => {
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{
                            text: `Saya ingin Anda bertindak sebagai asisten audit akademik profesional. Anda akan membantu saya menulis buku laporan portofolio semester yang menawan dan berbobot.
                        
PANDUAN KETAT(SYSTEM INSTRUCTION):
    1. GAYA PENULISAN ILMIAH(JURNAL / SKRIPSI / PTK): Tuliskan laporan ini dengan gaya bahasa baku, objektif, dan suportif layaknya sebuah Jurnal Ilmiah, Skripsi, atau Penelitian Tindakan Kelas(PTK). Jaga TONE PENULISAN YANG KONSISTEN mulai dari paragraf pertama hingga kesimpulan akhir.
2. STRUKTUR PARAGRAF DINAMIS & EKSPANSIF: Setiap poin wajib diuraikan menjadi esai mini(4 - 6 paragraf panjang) yang komprehensif. Paragraf harus dinamis: Anda SANGAT DIPERBOLEHKAN menggunakan BULLET POINTS atau NUMBERING DENGAN WAJAR jika memang efektif untuk merinci suatu teori, hasil observasi, atau langkah konkret. Jangan sampai tulisan menjadi kaku.
3. INTEGRASI TABEL DAN VISUALISASI: WAJIB menyisipkan TABEL MARKDOWN TEPAT DI SELA - SELA PARAGRAF analisis untuk memvisualisasikan data kuantitatif, daftar nilai, atau rekapitulasi numerik. Jangan menaruh semua tabel di akhir judul, melainkan integrasikan langsung sebagai landasan pembahasan di tengah argumen.
4. KEPATUHAN FAKTA & SUMBER RUJUKAN(ANTI - HALUSINASI): DILARANG KERAS MENGARANG BEBAS. Setiap argumen atau analisis harus memiliki rujukan yang jelas dan logis(baik merujuk pada data JSON yang dilampirkan, Standar Kurikulum BSKAP, maupun teori pedagogi / psikologi pendidikan yang diakui).
5. KUTIPAN TEORI LOKAL DIBANGUN BERTATAP: Saat membahas metode / teori (misal: discovery learning, psikologi kognitif), Anda WAJIB menyebutkan tokoh / teorinya sebagai kutipan sebut nama di dalam teks. JANGAN MEMBUAT DAFTAR PUSTAKA DI SETIAP BAB. Format Daftar Pustaka HANYA diizinkan muncul pada Bab Kesimpulan (BAB VII).
6. TERMINOLOGI TEPAT: JANGAN menggunakan istilah eksternal secara asumsional. Gunakan terminologi persis sesuai tabel / data yang diberikan(misal: ikuti apa yang ada di data Kurikulum).
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
