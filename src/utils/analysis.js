import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { analyzeJournalsForStudentWarnings } from './gemini';

// --- Analysis Configuration ---
const LOW_GRADE_THRESHOLD = 65; // Average grade below this is a warning
const HIGH_ABSENCE_THRESHOLD = 3; // This many 'Alpha' statuses is a warning
const INFRACTION_SCORE_THRESHOLD = 75; // Attitude score below this is a warning

/**
 * Fetches all students for a given user.
 * @param {string} userId - The UID of the authenticated user.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of student objects.
 */
export const getAllStudents = async (userId) => {
  if (!userId) return [];
  const studentsQuery = query(collection(db, 'students'), where('userId', '==', userId));
  const snapshot = await getDocs(studentsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches all grades for a given user, optionally filtered by student.
 * @param {string} userId - The UID of the authenticated user.
 * @param {string|null} studentId - Optional. The ID of the student to filter by.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of grade objects.
 */
export const getAllGrades = async (userId, studentId = null) => {
  if (!userId) return [];
  let gradesQuery = query(collection(db, 'grades'), where('userId', '==', userId));
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
export const getAllAttendance = async (userId, studentId = null) => {
  if (!userId) return [];
  let attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', userId));
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
export const getAllJournals = async (userId) => {
  if (!userId) return [];
  const journalsQuery = query(collection(db, 'teachingJournals'), where('userId', '==', userId));
  const snapshot = await getDocs(journalsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches all infraction records for a given user, optionally filtered by student.
 * @param {string} userId - The UID of the authenticated user.
 * @param {string|null} studentId - Optional. The ID of the student to filter by.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of infraction objects.
 */
export const getAllInfractions = async (userId, studentId = null) => {
  if (!userId) return [];
  let infractionsQuery = query(collection(db, 'infractions'), where('userId', '==', userId));
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
export const runEarlyWarningAnalysis = async (userId) => {
  if (!userId) {
    console.error("User ID is required for analysis.");
    return [];
  }

  try {
    // 1. Fetch all necessary data in parallel
    const [students, grades, attendance, journals, infractions] = await Promise.all([
      getAllStudents(userId),
      getAllGrades(userId),
      getAllAttendance(userId),
      getAllJournals(userId),
      getAllInfractions(userId),
    ]);

    const flaggedStudents = {};

    // Helper to add a warning and associate data with a student
    const addWarning = (studentId, reason, data = {}) => {
        if (!flaggedStudents[studentId]) {
            const studentInfo = students.find(s => s.id === studentId);
            if (studentInfo) {
                flaggedStudents[studentId] = {
                    ...studentInfo,
                    warnings: [],
                    infractions: [], // Initialize infractions array
                };
            }
        }
        if (flaggedStudents[studentId]) {
            flaggedStudents[studentId].warnings.push(reason);
            // Merge data, especially for infractions
            if (data.infractions) {
                flaggedStudents[studentId].infractions.push(...data.infractions);
            }
        }
    };

    // 2. Analyze Grades
    const studentGrades = {};
    grades.forEach(grade => {
      if (!studentGrades[grade.studentId]) {
        studentGrades[grade.studentId] = [];
      }
      studentGrades[grade.studentId].push(parseFloat(grade.score) || 0);
    });

    for (const studentId in studentGrades) {
      const scores = studentGrades[studentId];
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (average < LOW_GRADE_THRESHOLD) {
        addWarning(studentId, `Rata-rata nilai rendah (${average.toFixed(1)})`);
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
    const studentInfractions = {};
    infractions.forEach(infraction => {
        if (!studentInfractions[infraction.studentId]) {
            studentInfractions[infraction.studentId] = {
                totalPointsDeducted: 0,
                records: []
            };
        }
        studentInfractions[infraction.studentId].totalPointsDeducted += infraction.points;
        studentInfractions[infraction.studentId].records.push(infraction);
    });

    for (const studentId in studentInfractions) {
        const infractionData = studentInfractions[studentId];
        const currentScore = 100 - infractionData.totalPointsDeducted;
        if (currentScore < INFRACTION_SCORE_THRESHOLD) {
            addWarning(
                studentId,
                `Skor sikap di bawah standar (${currentScore})`,
                { infractions: infractionData.records } // Pass records to be stored
            );
        }
    }


    // 5. Analyze Journals with AI
    if (journals.length > 0 && students.length > 0) {
      try {
        const journalWarnings = await analyzeJournalsForStudentWarnings(journals, students);
        for (const studentId in journalWarnings) {
          const warnings = journalWarnings[studentId];
          warnings.forEach(warning => {
            addWarning(studentId, `Catatan Jurnal: ${warning}`);
          });
        }
      } catch (aiError) {
        console.error("AI analysis failed:", aiError);
        // Optionally add a generic warning that AI analysis could not be completed
      }
    }

    return Object.values(flaggedStudents);

  } catch (error) {
    console.error("Error during early warning analysis:", error);
    return [];
  }
};
