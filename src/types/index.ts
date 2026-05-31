import { Timestamp } from "firebase/firestore";

/**
 * Main application types mapping to Firestore collections
 * and core application state.
 */

// 1. User Profile
export interface UserProfile {
  name: string;
  nip: string;
  school: string;
  schoolLevel: 'SD' | 'SMP' | 'SMA' | 'SMK';
  email: string;
  title?: string;
  geminiModel?: string;
  activeSemester?: string;
  academicYear?: string;
  academicWeight?: number;
  attitudeWeight?: number;
  scheduleNotificationsEnabled?: boolean;
  schoolDays?: number;
  activeTemplateId?: string | null;
  activeTemplateName?: string;
}

// 2. Student Data
export interface Student {
  id: string; // Document ID
  userId: string; // Foreign key to User
  name: string;
  nisn?: string;
  gender?: 'L' | 'P';
  gradeLevel: string; // E.g., '10', '11', '12', 'X', 'XI'
  status?: string; // 'Aktif', 'Pindah', dll
  rombel?: string; // Rombongan belajar
  createdAt: Timestamp;
}

// 3. Attendance Record
export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';

export interface AttendanceRecord {
  id: string; // Document ID
  userId: string;
  studentId: string;
  studentName: string;
  date: string; // Format 'YYYY-MM-DD'
  status: AttendanceStatus;
  notes?: string;
  semester: string;
  academicYear: string;
  createdAt: Timestamp;
}

// 4. Grades
export interface GradeRecord {
  id: string;
  userId: string;
  studentId: string;
  studentName: string;
  assessmentType: 'Harian' | 'Tugas' | 'UTS' | 'UAS' | 'Praktik' | 'Proyek' | 'Sikap' | string;
  topic?: string;
  subject?: string;
  score: number;
  notes?: string;
  semester: string;
  academicYear: string;
  createdAt: Timestamp;
  timestamp?: Timestamp;
}

// 5. Teaching Journal (Jurnal Mengajar)
export interface TeachingJournal {
  id: string;
  userId: string;
  date: string;
  topic: string; // Materi
  subject: string; // Mata Pelajaran
  class: string;
  attendanceCount: number;
  sickCount: number;
  absentCount: number;
  excusedCount: number;
  reflection?: string;
  challenges?: string;
  solutions?: string;
  semester: string;
  academicYear: string;
  createdAt: Timestamp;
}

// 6. Infraction (Pelanggaran/Catatan Disiplin)
export interface Infraction {
  id: string;
  userId: string;
  studentId: string;
  studentName: string;
  date: string;
  type: string;
  description: string;
  points?: number;
  actionTaken?: string;
  semester: string;
  academicYear: string;
  createdAt: Timestamp;
}

// 8. Class (Rombel)
export interface ClassData {
  id: string;
  userId: string;
  code: string;
  level: string;
  rombel: string;
  description?: string;
  createdAt?: Timestamp;
}

// 7. Student Appreciation (Pemberian Bintang/Penghargaan)
export interface StudentAppreciation {
  id: string;
  userId: string;
  studentId: string;
  studentName: string;
  date: string;
  reason: string;
  stars: number;
  semester: string;
  academicYear: string;
  createdAt: Timestamp;
}
