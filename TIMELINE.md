# Project Timeline & Changelog

## [2026-02-01] - Smartty AI & BSKAP 2025 Integration

### 🤖 Smartty AI Persona
- **Knowledge Base (`SMARTTY_BRAIN`)**: Integrated deep knowledge of app features, Early Warning Systems, and BSKAP 2025 standards into `gemini.js`.
- **Voice Activation**: Enabled `autoSpeak` by default in `AsistenGuruPage.jsx` for interactive audio responses.
- **Context Awareness**: AI now understands "Kesepakatan Kelas" and "Radar Chart" context for better advice.

### 🌟 New Features
- **Kesepakatan Kelas (Class Agreements)**: 
  - Dynamic grading weights (Knowledge vs Practice).
  - PDF Export with signature columns.
  - Integration with `RekapitulasiPage` for final grade calculation.
- **Radar Chart (BSKAP 2025)**: 
  - Visualized 8 Dimensions of Profil Lulusan.
  - Data mapped from Knowledge, Practice, Attitude, and Attendance.
  - Available on `RekapIndividuPage` and `AnalisisKelasPage`.

### 🛠️ Improvements & Fixes
- **Navigation**: Added Back buttons to `RekapIndividuPage` and `AnalisisKelasPage`.
- **Bug Fixes**: 
  - Resolved 500 Internal Server Error in `RekapIndividuPage`.
  - Fixed syntax error in `gemini.js` (removed incompatible `with` import).
  - Fixed layout overflow in Pie Charts.

---

## [Previously] - Exam & CBT Architecture
- Implemented CBT Laravel Architecture.
- Exam Creation & Question Management (MCQ, Essay, etc.).
- Student Exam Interface with Timer.
