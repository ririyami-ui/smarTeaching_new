export interface Student {
  id: string;
  name: string;
  absen?: string | number;
  nisn?: string;
  classId?: string;
  userId?: string;
}

export interface Grade {
  id?: string;
  date: string;
  material: string;
  subjectName: string;
  subjectId?: string;
  assessmentType: string;
  score: string | number;
  semester: string;
  academicYear: string;
}

export interface AttendanceRecord {
  date: string;
  status: 'Hadir' | 'Sakit' | 'Ijin' | 'Alpha';
  semester: string;
  academicYear: string;
  subjectId?: string;
  subjectName?: string;
}

export interface Infraction {
  date: string;
  type: string;
  infractionType?: string; // Menyimpan nama jenis pelanggaran dari database Firestore
  points: number;
  note?: string;
  semester: string;
  academicYear: string;
}

export interface Appreciation {
  date: string;
  type: string;
  points: number;
  note?: string;
  semester: string;
  academicYear: string;
}

export interface StudentStats {
  academicAvg: string;
  attitudeScore: number;
  attitudePredicate: string;
  totalInfractionPoints: number;
  totalStars: number;
  attendance: {
    Hadir: number;
    Sakit: number;
    Ijin: number;
    Alpha: number;
    schoolDays: number;
    studentCount: number;
  };
  finalScore: string;
  academicWeight: number;
  attitudeWeight: number;
  knowledgeWeight: string;
  practiceWeight: string;
  studentName: string;
  subjectFilter: string;
  warnings: string[];
  numDays: number;
  radarData: Record<string, number>;
}

export interface ClassAgreement {
  agreements: string;
  academicWeight?: number;
  attitudeWeight?: number;
  knowledgeWeight?: number;
  practiceWeight?: number;
  rombel?: string;
}
