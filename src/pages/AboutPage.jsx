import { Download, CheckCircle, Smartphone, Target, Rocket, Award, Info, Heart, Coffee, User, Mail, School, Sparkles, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import logoMGMP from '../assets/lOGO mgmp informatika NEW.png';

// Glass Icon Wrapper Component (consistent with App style)
const GlassIcon = ({ icon: Icon, colorClass = "glass-glow-blue", size = 20 }) => (
  <div className={`glass-icon-container ${colorClass} w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all duration-500`}>
    <Icon size={size} className="text-gray-800 dark:text-white opacity-80" />
    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
  </div>
);

export default function AboutPage({ installPrompt, onInstall, isPwaInstalled }) {
  const handleManualInstall = () => {
    if (isPwaInstalled) {
      toast.success('Aplikasi sudah terinstall sebagai PWA!');
      return;
    }

    if (!installPrompt) {
      toast.error('Install prompt tidak tersedia. Pastikan aplikasi belum terinstall.');
      return;
    }

    onInstall();
    toast.success('Memulai proses instalasi...');
  };

  const missionItems = [
    {
      title: "Pemberdayaan Guru",
      desc: "Mengurangi beban administrasi melalui otomatisasi agar guru fokus pada pengembangan karakter siswa.",
      icon: Rocket,
      color: "glass-glow-blue"
    },
    {
      title: "Inovasi AI",
      desc: "Menyediakan analisis data performansi siswa dan rekomendasi pedagogik yang akurat.",
      icon: Sparkles,
      color: "glass-glow-purple"
    },
    {
      title: "Efisiensi Terpadu",
      desc: "Ekosistem satu pintu untuk jadwal, jurnal, dan portofolio akademik dalam satu genggaman.",
      icon: Target,
      color: "glass-glow-green"
    },
    {
      title: "Peningkatan Kualitas",
      desc: "Mendorong standar pendidikan tinggi melalui alat monitoring berbasis bukti (evidence-based teaching).",
      icon: Award,
      color: "glass-glow-yellow"
    }
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8 pb-10">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/90 to-indigo-700/90 dark:from-blue-950/80 dark:to-indigo-950/80 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl border border-white/20 text-center sm:text-left">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none hidden sm:block">
          <Info size={200} />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="glass-icon-container glass-glow-blue !rounded-[2rem] p-6 sm:p-8 bg-white/10 backdrop-blur-3xl shadow-2xl animate-welcome-float border border-white/30">
            <img
              src="/Logo Smart Teaching 3D.png"
              alt="Logo"
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-2xl"
            />
          </div>
          <div className="flex-1 space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
              Smart Teaching <span className="opacity-60 font-light">Manager</span>
            </h1>
            <p className="text-blue-100 text-lg sm:text-xl font-medium max-w-2xl opacity-90 italic">
              "Masa depan pengajaran dimulai di sini, di mana teknologi bertemu dengan dedikasi hati seorang guru."
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/20">Version 2.0.3</span>
              <span className="px-4 py-1.5 bg-indigo-500/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-400/30">Release Stable</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vision & Mission (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Vision Card */}
          <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150" />

            <div className="flex items-center gap-4 mb-6">
              <GlassIcon icon={Target} colorClass="glass-glow-blue" size={24} />
              <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Visi Layanan</h2>
            </div>

            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 leading-relaxed italic">
              "Menjadi platform asisten digital berbasis AI terdepan yang merevolusi ekosistem pendidikan melalui manajemen pengajaran yang cerdas, efisien, dan profesional."
            </p>
          </div>

          {/* Mission Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {missionItems.map((item, idx) => (
              <div key={idx} className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/5 p-6 rounded-[2rem] shadow-lg transition-all duration-300 hover:scale-[1.03] group">
                <div className="flex items-start gap-4">
                  <GlassIcon icon={item.icon} colorClass={item.color} size={20} />
                  <div>
                    <h3 className="font-black text-gray-800 dark:text-white uppercase tracking-tight text-sm mb-2">{item.title}</h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed opacity-80">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Partnership Section */}
          <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 dark:from-blue-400/5 dark:to-purple-400/5 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-blue-100 dark:border-blue-900/30">
                <img
                  src={logoMGMP}
                  alt="Logo MGMP"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <Building2 size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Official Partnership</span>
                </div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-3">MGMP Informatika Kabupaten Bondowoso</h2>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                  Aplikasi ini secara resmi bersinergi dengan Musyawarah Guru Mata Pelajaran (MGMP) Informatika Kabupaten Bondowoso untuk mendorong transformasi digital di lingkungan pendidikan.
                </p>
              </div>
            </div>
          </div>

          {/* App Description */}
          <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 p-8 rounded-[2rem] shadow-sm">
            <h3 className="text-lg font-black text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Heart size={20} className="text-red-500" />
              <span>Didedikasikan Untuk Guru</span>
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
              Aplikasi Smart Teaching Manager didedikasikan untuk guru hebat di seluruh penjuru negeri, khususnya para pendidik di Kabupaten Bondowoso. Kami berterima kasih kepada semua pihak yang telah memberikan masukan, tenaga, dan pikiran untuk terus menyempurnakan asisten digital ini demi kemajuan dunia pendidikan Indonesia.
            </p>
          </div>
        </div>

        {/* Sidebar Info (1/3 width) */}
        <div className="space-y-6">
          {/* Developer Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-white/50 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-1 mb-4 shadow-xl">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                  <User size={48} className="text-blue-500" />
                </div>
              </div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Ririyami, S.Kom</h2>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-6">Innovative Educator & Developer</p>

              <div className="w-full space-y-4 text-left">
                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-2xl">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600">
                    <School size={16} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">SMP Negeri 7 Bondowoso</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-2xl">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600">
                    <Mail size={16} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">ri2ami77@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support & Donation */}
          <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 p-8 rounded-[2.5rem] shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600">
                <Coffee size={28} />
              </div>
            </div>
            <h3 className="font-black text-gray-800 dark:text-white mb-2 uppercase tracking-tight">Dukung Server Kami</h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-6 px-2">Kontribusi Anda membantu kami menjaga server tetap aktif untuk melayani ribuan guru.</p>

            <div className="bg-white/50 dark:bg-black/30 p-4 rounded-3xl border border-white dark:border-white/5 flex flex-col items-center">
              <img src="/Logo OVO Trans.png" alt="OVO" className="h-10 w-auto mb-2 opacity-80" />
              <p className="text-lg font-black text-gray-800 dark:text-white tracking-widest">082330108384</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">OVO / DANA Account</p>
            </div>
          </div>

          {/* PWA Section */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden">
            <div className="absolute -top-5 -right-5 w-24 h-24 bg-white/20 rounded-full blur-2xl" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-[1.5rem] mb-4">
                <Smartphone size={32} />
              </div>
              <h3 className="text-xl font-black mb-1">Aplikasi Portabel</h3>
              <p className="text-xs text-blue-100 mb-6 opacity-80">Install di perangkat Anda untuk pengalaman yang lebih cepat dan lancar.</p>

              {isPwaInstalled ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/30 backdrop-blur-md rounded-2xl border border-green-300/30 w-full justify-center">
                  <CheckCircle size={18} className="text-green-300" />
                  <span className="text-xs font-bold uppercase tracking-widest text-green-100">Sudah Terinstal</span>
                </div>
              ) : (
                <button
                  onClick={handleManualInstall}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white text-blue-600 font-black rounded-2xl shadow-xl hover:bg-blue-50 transition-all active:scale-95 text-sm uppercase tracking-widest"
                  disabled={!installPrompt}
                >
                  <Download size={20} />
                  {installPrompt ? 'Install Sekarang' : 'Tidak Mendukung PWA'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}