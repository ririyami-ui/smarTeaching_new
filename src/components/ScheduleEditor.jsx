import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import toast from 'react-hot-toast';

export default function ScheduleEditor({ scheduleData, onSave, onClose, subjects, classes }) {
  const [day, setDay] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [saving, setSaving] = useState(false);

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  useEffect(() => {
    if (scheduleData) {
      setDay(scheduleData.day || '');
      setSelectedClass(scheduleData.class || '');
      setStartPeriod(scheduleData.startPeriod || '');
      setEndPeriod(scheduleData.endPeriod || '');
      setStartTime(scheduleData.startTime || '');
      setEndTime(scheduleData.endTime || '');
      setSelectedSubject(scheduleData.subject || '');
    }
  }, [scheduleData]);

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!day || !selectedClass || !startPeriod || !endPeriod || !startTime || !endTime || !selectedSubject) {
      toast.error('Lengkapi semua detail jadwal.');
      setSaving(false);
      return;
    }

    const scheduleDocRef = doc(db, 'teachingSchedules', scheduleData.id);
    try {
      await updateDoc(scheduleDocRef, {
        day,
        class: selectedClass,
        startPeriod: parseInt(startPeriod),
        endPeriod: parseInt(endPeriod),
        startTime,
        endTime,
        subject: selectedSubject,
      });
      toast.success('Jadwal berhasil diperbarui!');
      onSave(); // Call onSave to refresh the list in parent component
    } catch (error) {
      console.error("Error updating schedule: ", error);
      toast.error('Gagal memperbarui jadwal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleUpdateSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="mb-4">
        <label htmlFor="day" className="block text-gray-700 text-sm font-bold mb-2">Hari:</label>
        <StyledSelect
          id="day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          required
        >
          <option value="">Pilih Hari</option>
          {daysOfWeek.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </StyledSelect>
      </div>

      <div className="mb-4">
        <label htmlFor="class" className="block text-gray-700 text-sm font-bold mb-2">Kelas:</label>
        <StyledSelect
          id="class"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          required
        >
          <option value="">Pilih Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.rombel}>{c.rombel}</option>
          ))}
        </StyledSelect>
      </div>

      <div className="mb-4">
        <label htmlFor="startPeriod" className="block text-gray-700 text-sm font-bold mb-2">Jam ke:</label>
        <StyledInput
          type="number"
          id="startPeriod"
          value={startPeriod}
          onChange={(e) => setStartPeriod(e.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="endPeriod" className="block text-gray-700 text-sm font-bold mb-2">Sampai jam ke:</label>
        <StyledInput
          type="number"
          id="endPeriod"
          value={endPeriod}
          onChange={(e) => setEndPeriod(e.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="startTime" className="block text-gray-700 text-sm font-bold mb-2">Waktu Mulai:</label>
        <StyledInput
          type="time"
          id="startTime"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="endTime" className="block text-gray-700 text-sm font-bold mb-2">Waktu Selesai:</label>
        <StyledInput
          type="time"
          id="endTime"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />
      </div>

      <div className="mb-4 md:col-span-2">
        <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2">Mata Pelajaran:</label>
        <StyledSelect
          id="subject"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          required
        >
          <option value="">Pilih Mata Pelajaran</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </StyledSelect>
      </div>

      <div className="md:col-span-2 flex justify-end space-x-2">
        <StyledButton type="button" variant="outline" onClick={onClose}>Batal</StyledButton>
        <StyledButton type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </StyledButton>
      </div>
    </form>
  );
}
