import moment from 'moment';
import 'moment/locale/id';

/**
 * Consistent Indonesian date formatting
 * @param {Date|string} date 
 * @returns {string} e.g. "03 Maret 2026"
 */
export const fmtDate = (date) => {
    if (!date) return '-';
    // Ensure locale is set to Indonesian and use explicit formatting
    return moment(date, ['YYYY-MM-DD', 'D MMMM YYYY', 'D MMM YYYY'], true).locale('id').format('DD MMMM YYYY');
};

/**
 * Heuristic to detect signature city/location
 * Tries localStorage first, then school name, then fallback to Jakarta
 * @param {Object} userProfile 
 * @returns {string}
 */
export const getSignatureCity = (userProfile) => {
    // 1. Try localStorage (shared key across application)
    const saved = localStorage.getItem('SIGNING_LOCATION');
    if (saved && saved.trim() !== '' && saved !== 'Jakarta') {
        return saved;
    }

    // 2. Heuristic from school name (e.g. "SMPN 1 Jakarta" -> "Jakarta")
    if (userProfile?.school) {
        const parts = userProfile.school.trim().split(' ');
        if (parts.length > 0) {
            const last = parts[parts.length - 1];
            // Basic check: not a number and longer than 2 chars (avoids "1", "2", "3")
            if (isNaN(last) && last.length > 2) {
                return last;
            }
        }
    }

    // 3. Fallback
    return saved || 'Jakarta';
};

/**
 * Calculate attitude predicate based on score
 * @param {number} currentScore 
 * @returns {string} e.g. "Sangat Baik", "Baik", etc.
 */
export const calculateNilaiSikap = (currentScore) => {
    if (currentScore > 90) return 'Sangat Baik';
    else if (currentScore >= 75) return 'Baik';
    else if (currentScore >= 60) return 'Cukup';
    else return 'Kurang';
};

/**
 * Generate a descriptive text for student violations
 * @param {string} studentName 
 * @param {Array} studentViolations 
 * @param {number} currentScore 
 * @param {string} nilaiSikap 
 * @returns {string}
 */
export const generateDeskripsi = (studentName, studentViolations, currentScore, nilaiSikap) => {
    if (studentViolations.length === 0) {
        return `Tidak ada catatan pelanggaran. Nilai Sikap: ${nilaiSikap} (Skor: ${currentScore})`;
    }

    const groupedViolations = studentViolations.reduce((acc, v) => {
        if (!acc[v.infractionType]) {
            acc[v.infractionType] = { count: 0, totalPoints: 0 };
        }
        acc[v.infractionType].count++;
        acc[v.infractionType].totalPoints += v.points;
        return acc;
    }, {});

    const violationDetails = Object.entries(groupedViolations).map(([type, data]) => {
        return `- ${type} (${data.count} kali, ${data.totalPoints} poin)`;
    }).join('\n');

    return `Memiliki catatan pelanggaran:\n${violationDetails}\nNilai Sikap: ${nilaiSikap} (Skor: ${currentScore})`;
};
