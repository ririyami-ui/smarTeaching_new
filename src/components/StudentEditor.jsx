import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import StyledInput from './StyledInput';
import StyledButton from './StyledButton';
import StyledSelect from './StyledSelect';
import toast from 'react-hot-toast';

export default function StudentEditor({ studentData, onSave, onClose, rombels, classes }) {
  const [code, setCode] = useState('');
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [classId, setClassId] = useState('');
  const [absen, setAbsen] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (studentData) {
      setCode(studentData.code || '');
      setNis(studentData.nis || '');
      setNisn(studentData.nisn || '');
      setName(studentData.name || '');
      setGender(studentData.gender || '');
      setBirthPlace(studentData.birthPlace || '');

      // Convert date format to yyyy-MM-dd for input type="date"
      if (studentData.birthDate) {
        let date = new Date(studentData.birthDate);
        // Check if the date is valid. If not, try parsing the Indonesian format.
        if (isNaN(date.getTime())) {
          const parts = studentData.birthDate.split(' ');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const monthNames = {
              'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
              'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
            };
            const month = monthNames[parts[1]];
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
          }
        }

        if (!isNaN(date.getTime())) { // Check if the date is valid
          const formattedDate = date.toISOString().split('T')[0]; // yyyy-MM-dd
          setBirthDate(formattedDate);
        } else {
          console.error("Invalid birthDate format:", studentData.birthDate);
          setBirthDate(''); // Set to empty if invalid to prevent error
        }
      } else {
        setBirthDate('');
      }

      setClassId(studentData.classId || studentData.rombel || '');
      setAbsen(studentData.absen || '');
    }
  }, [studentData]);

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!code || !nis || !nisn || !name || !gender || !birthPlace || !birthDate || !classId || !absen) {
      toast.error('Lengkapi semua detail siswa.');
      setSaving(false);
      return;
    }

    const studentDocRef = doc(db, 'students', studentData.id);
    const selectedClassObj = classes.find(c => c.id === classId);

    try {
      await updateDoc(studentDocRef, {
        code,
        nis,
        nisn,
        name,
        gender,
        birthPlace,
        birthDate,
        classId,
        rombel: selectedClassObj?.rombel || classId, // Fallback if name not found
        absen,
      });
      toast.success('Siswa berhasil diperbarui!');
      onSave();
    } catch (error) {
      console.error("Error updating student: ", error);
      toast.error('Gagal memperbarui siswa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StyledInput
        type="text"
        placeholder="Kode Siswa"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      <StyledInput
        type="number"
        placeholder="No. Absen"
        value={absen}
        onChange={(e) => setAbsen(e.target.value)}
        required
      />
      <StyledInput
        type="text"
        placeholder="NIS"
        value={nis}
        onChange={(e) => setNis(e.target.value)}
        required
      />
      <StyledInput
        type="text"
        placeholder="NISN"
        value={nisn}
        onChange={(e) => setNisn(e.target.value)}
        required
      />
      <div className="md:col-span-2">
        <StyledInput
          type="text"
          placeholder="Nama Siswa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <StyledSelect value={gender} onChange={(e) => setGender(e.target.value)} required>
        <option value="">Pilih Jenis Kelamin</option>
        <option value="Laki-laki">Laki-laki</option>
        <option value="Perempuan">Perempuan</option>
      </StyledSelect>
      <StyledInput
        type="text"
        placeholder="Tempat Lahir"
        value={birthPlace}
        onChange={(e) => setBirthPlace(e.target.value)}
        required
      />
      <StyledInput
        type="date"
        placeholder="Tanggal Lahir"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        required
      />
      <StyledSelect value={classId} onChange={(e) => setClassId(e.target.value)} required>
        <option value="">Pilih Rombel (Kelas)</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.rombel}</option>
        ))}
      </StyledSelect>
      <div className="md:col-span-2 flex justify-end space-x-2">
        <StyledButton type="button" variant="outline" onClick={onClose}>Batal</StyledButton>
        <StyledButton type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </StyledButton>
      </div>
    </form>
  );
}
