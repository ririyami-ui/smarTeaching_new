import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import StyledInput from './StyledInput';
import StyledSelect from './StyledSelect';
import StyledButton from './StyledButton';
import toast from 'react-hot-toast';

export default function ScheduleEditor({ scheduleData, onSave, onClose, subjects, classes }) {
  const [day, setDay] = useState('');
  const [scheduleType, setScheduleType] = useState('teaching');
  const [selectedClass, setSelectedClass] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [activityName, setActivityName] = useState('');
  const [saving, setSaving] = useState(false);

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  useEffect(() => {
    if (scheduleData) {
      setDay(scheduleData.day || '');
      setScheduleType(scheduleData.type || 'teaching');

      // Handle legacy class data structure (string vs object)
      const classId = typeof scheduleData.class === 'object' ? scheduleData.classId : scheduleData.classId || scheduleData.class;
      setSelectedClass(classId || '');

      setStartPeriod(scheduleData.startPeriod || '');
      setEndPeriod(scheduleData.endPeriod || '');
      setStartTime(scheduleData.startTime || '');
      setEndTime(scheduleData.endTime || '');
      setSelectedSubject(scheduleData.subjectId || '');
      setActivityName(scheduleData.activityName || '');

      // Legacy fallback: if type is missing but subject looks like activity (and no ID), infer non-teaching?
      // Better to trust passed data. If type is missing, we defaulting to teaching (which might look weird if subject matches activity).
      // But we will stick to explicit type.
    }
  }, [scheduleData]);

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!day || !startTime || !endTime) {
      toast.error('Lengkapi hari dan waktu.');
      setSaving(false);
      return;
    }

    if (scheduleType === 'teaching' && (!selectedSubject || !selectedClass || !startPeriod || !endPeriod)) {
      toast.error('Lengkapi semua detail jadwal mengajar (Mapel, Kelas, Jam Ke).');
      setSaving(false);
      return;
    }

    if (scheduleType === 'non-teaching' && !activityName) {
      toast.error('Lengkapi nama kegiatan.');
      setSaving(false);
      return;
    }

    const scheduleDocRef = doc(db, 'teachingSchedules', scheduleData.id);

    const updatedData = {
      day,
      startTime,
      endTime,
      type: scheduleType,
      startPeriod: scheduleType === 'teaching' ? parseInt(startPeriod) : 0,
      endPeriod: scheduleType === 'teaching' ? parseInt(endPeriod) : 0,
    };

    if (scheduleType === 'teaching') {
      const subject = subjects.find(s => s.id === selectedSubject);
      const rombel = classes.find(c => c.id === selectedClass);

      updatedData.subjectId = selectedSubject;
      updatedData.subjectName = subject?.name || '';
      updatedData.subject = subject?.name || ''; // Legacy

      updatedData.classId = selectedClass;
      updatedData.className = rombel?.rombel || '';
      updatedData.class = rombel?.rombel || ''; // Legacy

      updatedData.activityName = '';
    } else {
      updatedData.activityName = activityName;
      updatedData.subject = activityName; // Legacy view
      updatedData.subjectId = null;
      updatedData.subjectName = '';

      // Optional class for non-teaching
      if (selectedClass) {
        const rombel = classes.find(c => c.id === selectedClass);
        updatedData.classId = selectedClass;
        updatedData.className = rombel?.rombel || 'Umum';
        updatedData.class = rombel?.rombel || 'Umum';
      } else {
        updatedData.classId = null;
        updatedData.className = 'Umum';
        updatedData.class = 'Umum';
      }
    }

    try {
      await updateDoc(scheduleDocRef, updatedData);
      toast.success('Jadwal berhasil diperbarui!');
      onSave();
    } catch (error) {
      console.error("Error updating schedule: ", error);
      toast.error('Gagal memperbarui jadwal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleUpdateSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Type Toggle - Maybe read-only for edit? Or allow changing? Allowing change is fine but resets fields */}
      <div className="md:col-span-2 mb-2 p-1 bg-gray-100 rounded-lg flex">
        <button
          type="button"
          onClick={() => setScheduleType('teaching')}
          className={`flex-1 py-1 px-3 rounded text-sm font-medium transition ${scheduleType === 'teaching' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}
        >
          Mengajar
        </button>
        <button
          type="button"
          onClick={() => setScheduleType('non-teaching')}
          className={`flex-1 py-1 px-3 rounded text-sm font-medium transition ${scheduleType === 'non-teaching' ? 'bg-pink-500 text-white shadow' : 'text-gray-600'}`}
        >
          Non-KBM
        </button>
      </div>

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

      {scheduleType === 'teaching' ? (
        <>
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
                <option key={c.id} value={c.id}>{c.rombel}</option>
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
        </>
      ) : (
        <div className="mb-4 md:col-span-2">
          <label htmlFor="activityName" className="block text-gray-700 text-sm font-bold mb-2">Nama Kegiatan:</label>
          <StyledInput
            type="text"
            id="activityName"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="Contoh: Istirahat, Upacara"
            required
          />
        </div>
      )}

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

      {scheduleType === 'non-teaching' && (
        <div className="mb-4 md:col-span-2">
          <label htmlFor="classOptional" className="block text-gray-700 text-sm font-bold mb-2">Kelas (Opsional):</label>
          <StyledSelect
            id="classOptional"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Semua Kelas / Umum</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.rombel}</option>
            ))}
          </StyledSelect>
        </div>
      )}

      {scheduleType === 'teaching' && (
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
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </StyledSelect>
        </div>
      )}

      <div className="md:col-span-2 flex justify-end space-x-2">
        <StyledButton type="button" variant="outline" onClick={onClose}>Batal</StyledButton>
        <StyledButton type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </StyledButton>
      </div>
    </form>
  );
}
