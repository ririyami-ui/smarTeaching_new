import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StyledInput from './StyledInput';
import StyledButton from './StyledButton';

export default function ProfileEditor() {
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setName(profileData.name || '');
            setNip(profileData.nip || '');
            setSchool(profileData.school || '');
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

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        name,
        nip,
        school,
      });
      setSuccess('Profil berhasil diperbarui!');
    } catch (err) {
      setError('Gagal memperbarui profil. Silakan coba lagi.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Memuat profil...</p>;
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Perbarui Profil Anda</h3>
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <StyledInput
          type="text"
          placeholder="Nama Lengkap"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <StyledInput
          type="text"
          placeholder="NIP (Nomor Induk Pegawai)"
          value={nip}
          onChange={(e) => setNip(e.target.value)}
          required
        />
        <StyledInput
          type="text"
          placeholder="Nama Sekolah"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <div className="flex justify-end">
          <StyledButton type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </StyledButton>
        </div>
      </form>
    </div>
  );
}
