import React from 'react';
import { Coffee, FileText, Smile, Book, Sparkles, Zap, Gift, Moon, Sun, Heart } from 'lucide-react';

/**
 * Mendapatkan ucapan dan ikon berdasarkan kategori atau nama agenda libur.
 * @param {Object} h - Objek holiday/agenda
 * @returns {Object} { message, icon, sub, gradient }
 */
export const getHolidayGreeting = (h) => {
    const cat = (h.category || '').toLowerCase();
    const name = (h.name || '').toLowerCase();

    // Mapping kategori ke desain kartu
    if (cat === 'semester_ganjil' || cat === 'semester_genap') {
        return {
            message: "Selamat berlibur dan selamat beristirahat dari rutinitas mengajar!",
            icon: <Coffee size={48} className="text-white/90" />,
            sub: "Waktunya merefresh semangat!",
            gradient: "from-blue-600 via-indigo-600 to-purple-600"
        };
    }

    if (name.includes('idul fitri') || name.includes('lebaran')) {
        return {
            message: "Selamat Hari Raya Idul Fitri. Mohon Maaf Lahir dan Batin.",
            icon: <Moon size={48} className="text-white/90" />,
            sub: "Kemenangan dalam Kebersamaan",
            gradient: "from-emerald-600 via-teal-600 to-cyan-600"
        };
    }

    if (name.includes('ramadhan') || name.includes('puasa')) {
        return {
            message: "Selamat menjalankan ibadah di bulan suci Ramadhan yang penuh berkah.",
            icon: <Moon size={48} className="text-white/90" />,
            sub: "Bulan Penuh Ampunan",
            gradient: "from-indigo-700 via-purple-700 to-pink-700"
        };
    }

    if (name.includes('natal') || cat === 'natal') {
        return {
            message: "Selamat Hari Natal. Semoga kedamaian dan kebahagiaan menyertai kita semua.",
            icon: <Heart size={48} className="text-white/90" />,
            sub: "Kedamaian di Bumi",
            gradient: "from-red-600 via-rose-600 to-orange-600"
        };
    }

    if (name.includes('nyepi') || name.includes('waisak')) {
        return {
            message: "Selamat merayakan hari besar keagamaan dalam keheningan dan kedamaian.",
            icon: <Zap size={48} className="text-white/90" />,
            sub: "Refleksi & Ketenangan",
            gradient: "from-amber-600 via-orange-600 to-yellow-600"
        };
    }

    if (name.includes('maulid') || name.includes('nabawi')) {
        return {
            message: "Selamat memperingati Maulid Nabi Muhammad SAW. Semoga teladan beliau membimbing kita.",
            icon: <Moon size={48} className="text-white/90" />,
            sub: "Meneladani Akhlak Mulia",
            gradient: "from-emerald-700 via-green-700 to-teal-800"
        };
    }

    if (name.includes('isra') || name.includes('miraj')) {
        return {
            message: "Selamat memperingati Isra Mi'raj Nabi Muhammad SAW.",
            icon: <Moon size={48} className="text-white/90" />,
            sub: "Perjalanan Ruhani yang Agung",
            gradient: "from-indigo-800 via-blue-800 to-slate-900"
        };
    }

    if (name.includes('tahun baru') || name.includes('1 januari')) {
        return {
            message: "Selamat Tahun Baru! Semoga tahun ini membawa kesuksesan dan berkah bagi kita semua.",
            icon: <Sparkles size={48} className="text-white/90" />,
            sub: "Semangat Baru, Harapan Baru",
            gradient: "from-blue-600 via-purple-600 to-pink-600"
        };
    }

    if (name.includes('kemerdekaan') || name.includes('17 agustus') || name.includes('proklamasi')) {
        return {
            message: "Selamat Hari Kemerdekaan Republik Indonesia. Dirgahayu Negeri Kita!",
            icon: <Sun size={48} className="text-white/90" />,
            sub: "Indonesia Tangguh, Indonesia Tumbuh",
            gradient: "from-red-600 via-red-700 to-white/10"
        };
    }

    if (cat === 'ujian' || cat === 'ujian_semester' || name.includes('ujian') || name.includes('asasesmen')) {
        return {
            message: "Semangat mendampingi siswa di masa ujian. Semoga lancar dan berkah!",
            icon: <FileText size={48} className="text-white/90" />,
            sub: "Integritas & Kesabaran Guru",
            gradient: "from-blue-700 via-blue-800 to-indigo-900"
        };
    }

    if (cat === 'tengah_semester' || name.includes('kts')) {
        return {
            message: "Selamat mengikuti kegiatan tengah semester bersama para siswa!",
            icon: <Smile size={48} className="text-white/90" />,
            sub: "Kreativitas Tanpa Batas",
            gradient: "from-purple-500 via-pink-500 to-rose-500"
        };
    }

    if (cat === 'studi_tiru' || name.includes('studi tiru') || name.includes('outbound')) {
        return {
            message: "Selamat belajar dari pengalaman baru di luar sekolah!",
            icon: <Sparkles size={48} className="text-white/90" />,
            sub: "Eksplorasi & Inspirasi",
            gradient: "from-cyan-500 via-blue-500 to-indigo-600"
        };
    }

    if (name.includes('upacara') || name.includes('senam')) {
        return {
            message: "Awali pagi dengan semangat kebersamaan dan kesehatan!",
            icon: <Sun size={48} className="text-white/90" />,
            sub: "Jiwa Sehat, Pikiran Cerdas",
            gradient: "from-orange-500 via-amber-500 to-yellow-500"
        };
    }

    // Default / National Holiday
    return {
        message: "Selamat menikmati waktu luang Anda. Selamat beristirahat!",
        icon: <Gift size={48} className="text-white/90" />,
        sub: "Hari ini adalah hari istimewa!",
        gradient: "from-indigo-600 via-purple-600 to-pink-600"
    };
};
