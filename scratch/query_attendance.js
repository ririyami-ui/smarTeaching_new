// query_attendance.js
// Node script to fetch attendance records for subject "Informatika"
// between 2026-01-06 and 2026-05-19.

import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const processEnv = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        processEnv[match[1].trim()] = match[2].trim();
    }
});
process.env = { ...process.env, ...processEnv };

// Build firebaseConfig from process.env (same keys as Vite env)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};


// No need for additional existence check – if the file is missing, the import will throw.


// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const startDate = "2026-01-06";
const endDate = "2026-05-19";
const targetSubject = "Informatika";

const normalize = s => (s ? s.trim().toLowerCase() : "");

const attendanceRef = collection(db, "attendance");
const q = query(
  attendanceRef,
  where("date", ">=", startDate),
  where("date", "<=", endDate)
);

console.log("Fetching attendance records…");
try {
  const snap = await getDocs(q);
  const raw = snap.docs.map(d => d.data());
  const filtered = raw.filter(rec => {
    const nameMatch = normalize(rec.subjectName) === normalize(targetSubject);
    const idMatch = normalize(rec.subjectId) === normalize(targetSubject);
    return nameMatch || idMatch;
  });

  if (filtered.length === 0) {
    console.log("No attendance records found for the given criteria.");
  } else {
    console.log(`Found ${filtered.length} records:`);
    console.table(
      filtered.map(r => ({
        date: r.date,
        studentId: r.studentId,
        classId: r.classId,
        status: r.status,
        subjectId: r.subjectId || "-",
        subjectName: r.subjectName || "-",
        semester: r.semester,
        academicYear: r.academicYear
      }))
    );
  }
} catch (e) {
  console.error("Error fetching data:", e);
  process.exit(1);
}
