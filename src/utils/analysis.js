import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import BSKAP_DATA from './bskap_2025_intel.json';

// --- Analysis Configuration (Sourced from BSKAP_DATA) ---
const { low_grade_threshold: LOW_GRADE_THRESHOLD, high_absence_threshold: HIGH_ABSENCE_THRESHOLD, infraction_score_threshold: INFRACTION_SCORE_THRESHOLD } = BSKAP_DATA.standards.early_warning_standards;

/**
 * Fetches all students for a given user.
 * @param {string} userId - The UID of the authenticated user.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of student objects.
 */
export const getAllStudents = async (userId, rombel = null) => {
  if (!userId) return [];
  let studentsQuery = query(collection(db, 'students'), where('userId', '==', userId));
  if (rombel) {
    studentsQuery = query(studentsQuery, where('rombel', '==', rombel));
  }
  const snapshot = await getDocs(studentsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches all grades for a given user, optionally filtered by student.
 * @param {string} userId - The UID of the authenticated user.
 * @param {string|null} studentId - Optional. The ID of the student to filter by.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of grade objects.
 */
export const getAllGrades = async (userId, studentId = null, semester, academicYear) => {
  if (!userId) return [];
  let gradesQuery = query(
    collection(db, 'grades'),
    where('userId', '==', userId),
    where('semester', '==', semester),
    where('academicYear', '==', academicYear)
  );
  if (studentId) {
    gradesQuery = query(gradesQuery, where('studentId', '==', studentId));
  }
  const snapshot = await getDocs(gradesQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches all attendance records for a given user, optionally filtered by student.
 * @param {string} userId - The UID of the authenticated user.
 * @param {string|null} studentId - Optional. The ID of the student to filter by.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of attendance objects.
 */
export const getAllAttendance = async (userId, studentId = null, semester, academicYear) => {
  if (!userId) return [];
  let attendanceQuery = query(
    collection(db, 'attendance'),
    where('userId', '==', userId),
    where('semester', '==', semester),
    where('academicYear', '==', academicYear)
  );
  if (studentId) {
    attendanceQuery = query(attendanceQuery, where('studentId', '==', studentId));
  }
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches all teaching journals for a given user.
 * @param {string} userId - The UID of the authenticated user.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of journal objects.
 */
export const getAllJournals = async (userId, semester, academicYear) => {
  if (!userId) return [];
  const journalsQuery = query(
    collection(db, 'teachingJournals'),
    where('userId', '==', userId),
    where('semester', '==', semester),
    where('academicYear', '==', academicYear)
  );
  const snapshot = await getDocs(journalsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches all infraction records for a given user, optionally filtered by student.
 * @param {string} userId - The UID of the authenticated user.
 * @param {string|null} studentId - Optional. The ID of the student to filter by.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of infraction objects.
 */
export const getAllInfractions = async (userId, studentId = null, semester, academicYear) => {
  if (!userId) return [];
  let infractionsQuery = query(
    collection(db, 'infractions'),
    where('userId', '==', userId),
    where('semester', '==', semester),
    where('academicYear', '==', academicYear)
  );
  if (studentId) {
    infractionsQuery = query(infractionsQuery, where('studentId', '==', studentId));
  }
  const snapshot = await getDocs(infractionsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};


/**
 * Runs the early warning system analysis.
 * This is the main function that will orchestrate the data fetching and analysis.
 */
export const runEarlyWarningAnalysis = async (userId, activeSemester, academicYear, modelName) => {
  if (!userId) {
    console.error("User ID is required for analysis.");
    return [];
  }

  try {
    // 1. Fetch all necessary data in parallel
    const [students, grades, attendance, journals, infractions] = await Promise.all([
      getAllStudents(userId),
      getAllGrades(userId, null, activeSemester, academicYear),
      getAllAttendance(userId, null, activeSemester, academicYear),
      getAllJournals(userId, activeSemester, academicYear),
      getAllInfractions(userId, null, activeSemester, academicYear),
    ]);

    const flaggedStudents = {};

    // Map infractions to students early for easy access
    const studentInfractions = {};
    infractions.forEach(infraction => {
      if (!studentInfractions[infraction.studentId]) {
        studentInfractions[infraction.studentId] = {
          totalPointsDeducted: 0,
          records: []
        };
      }
      studentInfractions[infraction.studentId].totalPointsDeducted += (infraction.points || 0);
      studentInfractions[infraction.studentId].records.push(infraction);
    });

    // Helper to add a warning and associate data with a student
    const addWarning = (studentId, reason, subject = null) => {
      if (!flaggedStudents[studentId]) {
        const studentInfo = students.find(s => s.id === studentId);
        if (studentInfo) {
          flaggedStudents[studentId] = {
            ...studentInfo,
            warnings: [],
            subjectsWithWarnings: [],
            infractions: studentInfractions[studentId]?.records || [], // Always attach infractions if they exist
            totalPointsDeducted: studentInfractions[studentId]?.totalPointsDeducted || 0,
          };
        }
      }
      if (flaggedStudents[studentId]) {
        if (!flaggedStudents[studentId].warnings.includes(reason)) {
          flaggedStudents[studentId].warnings.push(reason);
        }
        if (subject && !flaggedStudents[studentId].subjectsWithWarnings.some(s => s.id === subject.id || s.name === subject.name)) {
          // Store both id and name for better filtering
          flaggedStudents[studentId].subjectsWithWarnings.push(subject);
        }
      }
    };

    // 2. Analyze Grades (Per Subject)
    const studentSubjectGrades = {};
    grades.forEach(grade => {
      const key = `${grade.studentId}-${grade.subjectName}`;
      if (!studentSubjectGrades[key]) {
        studentSubjectGrades[key] = {
          studentId: grade.studentId,
          subjectName: grade.subjectName,
          scores: []
        };
      }
      studentSubjectGrades[key].scores.push(parseFloat(grade.score) || 0);
    });

    for (const key in studentSubjectGrades) {
      const item = studentSubjectGrades[key];
      const studentId = item.studentId;
      const subjectName = item.subjectName;

      // Separate knowledge and practice scores for this subject
      const subjectGrades = grades.filter(g => g.studentId === studentId && g.subjectName === subjectName);
      const knowledgeTypes = ['Harian', 'Formatif', 'Sumatif', 'Ulangan', 'Tengah Semester', 'PTS', 'Akhir Semester', 'PAS'];

      const knowledgeScores = subjectGrades.filter(g => knowledgeTypes.includes(g.assessmentType)).map(g => parseFloat(g.score) || 0);
      const practiceScores = subjectGrades.filter(g => g.assessmentType === 'Praktik').map(g => parseFloat(g.score) || 0);

      const knowledgeAvg = knowledgeScores.length > 0 ? knowledgeScores.reduce((a, b) => a + b, 0) / knowledgeScores.length : 0;
      const practiceAvg = practiceScores.length > 0 ? practiceScores.reduce((a, b) => a + b, 0) / practiceScores.length : 0;

      let average = 0;
      if (knowledgeAvg > 0 && practiceAvg > 0) {
        average = (knowledgeAvg * 0.4) + (practiceAvg * 0.6);
      } else if (knowledgeAvg > 0) {
        average = knowledgeAvg;
      } else if (practiceAvg > 0) {
        average = practiceAvg;
      }

      if (average < LOW_GRADE_THRESHOLD && average > 0) {
        const gradeSample = subjectGrades[0];
        addWarning(studentId, `Rata-rata nilai rendah di mapel ${subjectName} (${average.toFixed(1)})`, { id: gradeSample?.subjectId || '', name: subjectName });
      }
    }

    // 3. Analyze Attendance
    const studentAbsences = {};
    attendance.forEach(att => {
      if (att.status === 'Alpha') {
        if (!studentAbsences[att.studentId]) {
          studentAbsences[att.studentId] = 0;
        }
        studentAbsences[att.studentId]++;
      }
    });

    for (const studentId in studentAbsences) {
      const alphaCount = studentAbsences[studentId];
      if (alphaCount >= HIGH_ABSENCE_THRESHOLD) {
        addWarning(studentId, `${alphaCount} kali absen tanpa keterangan (Alpha)`);
      }
    }

    // 4. Analyze Infractions
    for (const studentId in studentInfractions) {
      const infractionData = studentInfractions[studentId];
      const currentScore = 100 - infractionData.totalPointsDeducted;
      if (currentScore < INFRACTION_SCORE_THRESHOLD) {
        addWarning(
          studentId,
          `Skor sikap di bawah standar (${currentScore})`
        );
      }
    }


    // 5. Analyze Journals with AI - DISABLED to save quota
    // if (journals.length > 0 && students.length > 0) {
    //   ...
    // }

    return Object.values(flaggedStudents);

  } catch (error) {
    console.error("Error during early warning analysis:", error);
    return [];
  }
};
