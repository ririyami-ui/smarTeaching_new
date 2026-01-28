import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import StyledSelect from './StyledSelect';

export default function ProfileEditor() {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Bapak/Ibu'); // New State: Sapaan
  const [nip, setNip] = useState('');
  const [school, setSchool] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalNip, setPrincipalNip] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [activeSemester, setActiveSemester] = useState('Ganjil');
  const [testingKey, setTestingKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-3-flash-preview');
  const [academicWeight, setAcademicWeight] = useState(50);
  const [attitudeWeight, setAttitudeWeight] = useState(50);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        // Load API Key from localStorage
        const cachedKey = localStorage.getItem('GEMINI_API_KEY');
        if (cachedKey) setGeminiApiKey(cachedKey);

        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setName(profileData.name || '');
            setTitle(profileData.title || 'Bapak/Ibu');
            setNip(profileData.nip || '');
            setSchool(profileData.school || '');
            setPrincipalName(profileData.principalName || '');
            setPrincipalNip(profileData.principalNip || '');
            setAcademicYear(profileData.academicYear || '');
            setActiveSemester(profileData.activeSemester || 'Ganjil');
            setGeminiModel(profileData.geminiModel || 'gemini-3-flash-preview');
            setAcademicWeight(profileData.academicWeight !== undefined ? profileData.academicWeight : 50);
            setAttitudeWeight(profileData.attitudeWeight !== undefined ? profileData.attitudeWeight : 50);
          } else {
            setError('Profil tidak ditemukan.');
          }
        } catch (err) {
          setError('Gagal memuat profil.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError('Anda harus login untuk memperbarui profil.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update Firestore profile
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name,
        title,
        nip,
        school,
        principalName,
        principalNip,
        academicYear,
        activeSemester,
        geminiModel,
        academicWeight,
        attitudeWeight,
      });

      // Update Gemini API Key in localStorage
      if (geminiApiKey.trim()) {
        localStorage.setItem('GEMINI_API_KEY', geminiApiKey.trim());
      } else {
        localStorage.removeItem('GEMINI_API_KEY');
      }

      setSuccess('Profil dan API Key berhasil diperbarui!');
      // Force a reload of the model preference in localStorage for the gemini utility
      localStorage.setItem('GEMINI_MODEL', geminiModel);
    } catch (err) {
      setError('Gagal memperbarui profil. Silakan coba lagi.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!geminiApiKey.trim()) {
      setError('Masukkan API Key terlebih dahulu.');
      return;
    }

    setTestingKey(true);
    setError('');
    setSuccess('');

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.trim());
      const model = genAI.getGenerativeModel({ model: geminiModel });
      const result = await model.generateContent("test");
      await result.response;
      setSuccess('Koneksi berhasil! API Key Anda valid.');
    } catch (err) {
      console.error("Test connection failed:", err);
      if (err.message.includes("429") || err.message.toLowerCase().includes("quota")) {
        setError("API Key valid, namun kuota Anda saat ini sedang habis.");
      } else if (err.message.includes("API_KEY_INVALID") || err.message.toLowerCase().includes("invalid")) {
        setError("API Key tidak valid. Silakan periksa kembali.");
      } else {
        setError("Gagal tes koneksi: " + err.message);
      }
    } finally {
      setTestingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-6 text-purple-800 dark:text-purple-300">Pengaturan Profil & AI</h3>
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Informasi Pribadi</h4>
          <StyledInput
            type="text"
            placeholder="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <StyledSelect
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              >
                <option value="Bapak">Bapak</option>
                <option value="Ibu">Ibu</option>
                <option value="Bapak/Ibu">Netral</option>
              </StyledSelect>
            </div>
            <div className="md:col-span-3">
              <StyledInput
                type="text"
                placeholder="NIP (Nomor Induk Pegawai)"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
              />
            </div>
          </div>
          <StyledInput
            type="text"
            placeholder="Nama Sekolah"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StyledInput
              type="text"
              placeholder="Nama Kepala Sekolah"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              required
            />
            <StyledInput
              type="text"
              placeholder="NIP Kepala Sekolah"
              value={principalNip}
              onChange={(e) => setPrincipalNip(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 ml-1">Tahun Pelajaran</label>
              <StyledInput
                type="text"
                placeholder="Misal: 2025/2026"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 ml-1">Semester Aktif</label>
              <StyledSelect
                value={activeSemester}
                onChange={(e) => setActiveSemester(e.target.value)}
                required
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </StyledSelect>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2">
            Integrasi Google Gemini
            <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Manual Key</span>
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>. API Key ini akan tersimpan hanya di browser Anda.
          </p>
          <div className="flex gap-2 relative">
            <div className="flex-1">
              <StyledInput
                type={showApiKey ? "text" : "password"}
                placeholder="Masukkan Gemini API Key Anda"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-36 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showApiKey ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88L3 3" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /><path d="M14.2 14.2a3 3 0 1 1-4.4-4.4" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={testConnection}
              disabled={testingKey || !geminiApiKey}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 min-w-[120px] shadow-sm active:scale-95"
            >
              {testingKey ? 'Mencoba...' : 'Tes Koneksi'}
            </button>
          </div>
          <div className="space-y-1 mt-4">
            <label className="text-xs font-semibold text-gray-500 ml-1">Model AI (Flash)</label>
            <StyledSelect
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
            >
              <option value="gemini-3-flash-preview">Gemini 3.0 Flash (Terbaru & Tercanggih) - REKOMENDASI</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Seimbang)</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Stabil)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Sangat Stabil)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
            </StyledSelect>
            <p className="text-[10px] text-gray-400 mt-1 italic">
              *Jika model terbaru sedang sibuk, sistem akan otomatis menggunakan model stabil sebagai cadangan.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t dark:border-gray-700">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 flex items-center gap-2">
            Bobot Penilaian Akhir (Rekap Individu)
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tentukan persentase bobot antara nilai Akademik dan nilai Sikap (Pelanggaran). Total harus 100%.
          </p>
          <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Akademik: {academicWeight}%</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Sikap: {attitudeWeight}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={academicWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setAcademicWeight(val);
                  setAttitudeWeight(100 - val);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:bg-gray-700"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Bobot Akademik (%)</label>
                  <StyledInput
                    type="number"
                    value={academicWeight}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val > 100) val = 100;
                      if (val < 0) val = 0;
                      setAcademicWeight(val);
                      setAttitudeWeight(100 - val);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Bobot Sikap (%)</label>
                  <StyledInput
                    type="number"
                    value={attitudeWeight}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val > 100) val = 100;
                      if (val < 0) val = 0;
                      setAttitudeWeight(val);
                      setAcademicWeight(100 - val);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-500 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">{success}</p>}

        <div className="flex justify-end pt-4 border-t dark:border-gray-700">
          <StyledButton type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </StyledButton>
        </div>
      </form >
    </div >
  );
}
