import fs from 'fs';
import path from 'path';

const bskapTxtPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/bskap_extracted.txt';
const bskapJsonPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/src/utils/bskap_2025_intel.json';

function parseBskap() {
    try {
        console.log('Reading text file...');
        const content = fs.readFileSync(bskapTxtPath, 'utf8');
        const lines = content.split(/\r?\n/);
        console.log(`Read ${lines.length} lines.`);

        const bskapData = JSON.parse(fs.readFileSync(bskapJsonPath, 'utf8'));

        const subjectsCP = {}; // { SUBJECT_NAME: { FASE: TEXT } }

        // Use a state machine approach
        let state = 'SEARCH'; // SEARCH, SUBJECT_HEADER, SUBJECT_BODY, FASE_BODY
        let currentSubject = '';
        let currentFase = '';
        let subjectBuffer = [];
        let cpBuffer = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^=== HALAMAN \d+ ===$/)) continue;

            // Check for Subject Start
            const subjectMatch = line.match(/^([IVXLC]+\.\d*(\.\d*)?)\s+CAPAIAN PEMBELAJARAN(.*)$/i) ||
                line.match(/^([IVXLC]+\.)\s+CAPAIAN PEMBELAJARAN(.*)$/i);

            if (subjectMatch) {
                console.log(`[Line ${i + 1}] Potential Subject: ${line}`);
                saveCurrent(subjectsCP, currentSubject, currentFase, cpBuffer);
                state = 'SUBJECT_HEADER';
                // Capture everything after "CAPAIAN PEMBELAJARAN"
                subjectBuffer = [subjectMatch[3].trim()];
                currentSubject = '';
                currentFase = '';
                cpBuffer = [];
                continue;
            }

            if (state === 'SUBJECT_HEADER') {
                if (line.match(/^[A-Z]\.\s+Rasional/i)) {
                    // Extract full subject name and clean it
                    let rawName = subjectBuffer.join(' ').replace(/\s+/g, ' ').trim();
                    // Remove redundant text
                    rawName = rawName.replace(/CAPAIAN PEMBELAJARAN/gi, '').replace(/\s+/g, ' ').trim();

                    // Specific fix for repeating titles (e.g., "PJOK PJOK" or "PJOK, PJOK")
                    const mid = Math.floor(rawName.length / 2);
                    const firstHalf = rawName.substring(0, mid).trim();
                    const secondHalf = rawName.substring(mid).trim();
                    if (firstHalf === secondHalf) {
                        rawName = firstHalf;
                    }
                    if (rawName.includes(',')) {
                        const parts = rawName.split(',').map(p => p.trim());
                        if (parts.length > 1 && parts[0] === parts[1]) {
                            rawName = parts[0];
                        }
                    }

                    // Remove leading/trailing punctuation
                    rawName = rawName.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

                    currentSubject = rawName.toUpperCase();
                    console.log(`[Line ${i + 1}] Finalized Subject: ${currentSubject}`);
                    state = 'SUBJECT_BODY';
                } else {
                    subjectBuffer.push(line);
                }
                continue;
            }

            if (state === 'SUBJECT_BODY' || state === 'FASE_BODY') {
                // Check for Fase Start - matches "1. Fase A" or "(Umumnya untuk ...)" if it flows
                const faseMatch = line.match(/^(?:(\d+)\.\s+)?Fase\s+([A-F])/i);
                if (faseMatch) {
                    console.log(`[Line ${i + 1}] Found Fase ${faseMatch[2]} for ${currentSubject}`);
                    saveCurrent(subjectsCP, currentSubject, currentFase, cpBuffer);
                    currentFase = faseMatch[2].toUpperCase();
                    state = 'FASE_HEADER'; // New state to capture multi-line header
                    cpBuffer = [];
                    // Start capture with the full line including jenjang info
                    cpBuffer.push(line);
                    continue;
                }

                if (state === 'FASE_HEADER') {
                    // Check if we are still in the header (usually ends with a closing parenthesis)
                    cpBuffer.push(line);
                    if (line.includes(')')) {
                        state = 'FASE_BODY';
                    }
                    continue;
                }

                if (state === 'FASE_BODY') {
                    // Check for end of subject markers
                    if (line.match(/^[A-Z]\.\s+(Rasional|Tujuan|Karakteristik)/i)) {
                        saveCurrent(subjectsCP, currentSubject, currentFase, cpBuffer);
                        state = 'SUBJECT_BODY';
                        currentFase = '';
                        cpBuffer = [];
                        continue;
                    }

                    if (line.match(/^KEPALA BADAN$|^TTD\.$|^TONI TOHARUDIN/i)) {
                        saveCurrent(subjectsCP, currentSubject, currentFase, cpBuffer);
                        state = 'SEARCH';
                        currentSubject = '';
                        currentFase = '';
                        cpBuffer = [];
                        continue;
                    }

                    if (line) {
                        cpBuffer.push(line);
                    }
                }
            }
        }

        // Final save
        saveCurrent(subjectsCP, currentSubject, currentFase, cpBuffer);

        function saveCurrent(store, subj, fase, buffer) {
            if (subj && fase && buffer.length > 0) {
                if (!store[subj]) store[subj] = {};

                const fullText = buffer.join(' ').replace(/\s+/g, ' ').trim();

                // Narrative ALWAYS starts with "Pada akhir fase [A-F]"
                const splitIdx = fullText.search(/Pada akhir [fF]ase [A-F]/i);

                let header = '';
                let content = fullText;

                if (splitIdx !== -1) {
                    header = fullText.substring(0, splitIdx).trim();
                    content = fullText.substring(splitIdx).trim();
                } else {
                    // Fallback to parenthesis split
                    const headerEndIdx = fullText.indexOf(')');
                    if (headerEndIdx !== -1) {
                        header = fullText.substring(0, headerEndIdx + 1).trim();
                        content = fullText.substring(headerEndIdx + 1).trim();
                    }
                }

                // Clean up content for snippet
                // Remove the "Pada akhir Fase X..." introductory sentence
                let cleanContent = content.replace(/^Pada akhir [fF]ase [A-F], (murid|peserta didik) memiliki kemampuan sebagai berikut[:\.]?\s*/i, '').trim();

                // Also remove leading bullet points like "1.1. Pemahaman Fisika" or "Pemahaman Fisika"
                cleanContent = cleanContent.replace(/^(\d+\.\d+\.\s+)?(Pemahaman\s+|Keterampilan\s+Proses\s+)[A-Za-z\s]+\.?\s*/i, '').trim();

                // Remove leading numbers like "1. "
                cleanContent = cleanContent.replace(/^\d+\.\s+/g, '').trim();

                store[subj][fase] = {
                    header: header,
                    full: content,
                    snippet: generateSnippet(cleanContent || content)
                };
            }
        }

        function generateSnippet(text) {
            if (!text) return "";
            // Remove leading bullet points like "1.1. Bilangan"
            let clean = text.replace(/^\d+\.\d+\.\s+[A-Za-z\s]+\n?/i, '').trim();
            // Take first 2 sentences
            const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z])/);
            let snippet = sentences.slice(0, 2).join(' ');
            if (snippet.length < 60 && sentences.length > 2) {
                snippet = sentences.slice(0, 3).join(' ');
            }
            if (snippet.length > 400) {
                return snippet.substring(0, 397) + "...";
            }
            return snippet;
        }

        console.log('--- SUBJECT EXTRACTION ---');
        console.log('Extracted Subjects from Text:', Object.keys(subjectsCP).length);
        console.log('All Subjects:', Object.keys(subjectsCP));
        // --- Mapping Logic ---
        const levels = ['SD', 'SMP', 'SMA'];
        const faseToGrades = {
            'A': ['1', '2'],
            'B': ['3', '4'],
            'C': ['5', '6'],
            'D': ['7', '8', '9'],
            'E': ['10'],
            'F': ['11', '12']
        };

        const nameMap = {
            'PENDIDIKAN AGAMA ISLAM DAN BUDI PEKERTI': 'Pendidikan Agama Islam',
            'PENDIDIKAN AGAMA KRISTEN DAN BUDI PEKERTI': 'Pendidikan Agama Kristen',
            'PENDIDIKAN AGAMA KATOLIK DAN BUDI PEKERTI': 'Pendidikan Agama Katolik',
            'PENDIDIKAN AGAMA HINDU DAN BUDI PEKERTI': 'Pendidikan Agama Hindu',
            'PENDIDIKAN AGAMA BUDDHA DAN BUDI PEKERTI': 'Pendidikan Agama Buddha',
            'PENDIDIKAN AGAMA KHONGHUCU DAN BUDI PEKERTI': 'Pendidikan Agama Khonghucu',
            'PENDIDIKAN KEPERCAYAAN TERHADAP TUHAN YANG MAHA ESA DAN BUDI PEKERTI': 'Pendidikan Kepercayaan',
            'MATEMATIKA': 'Matematika',
            'BAHASA INDONESIA': 'Bahasa Indonesia',
            'ILMU PENGETAHUAN ALAM (IPA)': 'IPA',
            'ILMU PENGETAHUAN SOSIAL (IPS)': 'IPS',
            'BAHASA INGGRIS': 'Bahasa Inggris',
            'PENDIDIKAN PANCASILA': 'Pendidikan Pancasila',
            'PENDIDIKAN JASMANI, OLAHRAGA, DAN KESEHATAN': 'PJOK',
            'INFORMATIKA': 'Informatika',
            'SENI RUPA': 'Seni Rupa',
            'SENI MUSIK': 'Seni Musik',
            'SENI TARI': 'Seni Tari',
            'SENI TEATER': 'Seni Teater',
            'PRAKARYA': 'Prakarya',
            'FISIKA': 'Fisika',
            'KIMIA': 'Kimia',
            'BIOLOGI': 'Biologi',
            'SEJARAH': 'Sejarah',
            'GEOGRAFI': 'Geografi',
            'EKONOMI': 'Ekonomi',
            'SOSIOLOGI': 'Sosiologi',
            'ANTROPOLOGI': 'Antropologi',
            'ILMU PENGETAHUAN ALAM DAN SOSIAL (IPAS)': 'IPAS',
            'BAHASA DAERAH': 'Bahasa Daerah'
        };

        const verbatimPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/src/utils/bskap_2025_verbatim.json';
        const verbatimData = {
            version: "2025.Verbatim",
            subjects: {}
        };

        let updateCount = 0;
        let skippedList = [];

        for (const level of levels) {
            const gradesData = bskapData.subjects[level];
            if (!gradesData) continue;

            if (!verbatimData.subjects[level]) verbatimData.subjects[level] = {};

            for (const grade in gradesData) {
                if (!verbatimData.subjects[level][grade]) verbatimData.subjects[level][grade] = {};

                for (const subjectKey in gradesData[grade]) {
                    let bestMatchData = null;

                    // Fuzzy matching
                    for (const [rawName, fases] of Object.entries(subjectsCP)) {
                        const cleanRaw = rawName.replace(/DAN BUDI PEKERTI/i, '').trim();
                        const cleanSubj = subjectKey.toUpperCase().replace(/DAN BUDI PEKERTI/i, '').trim();

                        if (nameMap[rawName] === subjectKey || cleanRaw === cleanSubj || rawName.includes(cleanSubj) || cleanSubj.includes(cleanRaw)) {
                            for (const [fase, faseGrades] of Object.entries(faseToGrades)) {
                                if (faseGrades.includes(grade)) {
                                    if (fases[fase]) {
                                        bestMatchData = fases[fase];
                                        break;
                                    }
                                }
                            }
                        }
                        if (bestMatchData) break;
                    }

                    if (bestMatchData) {
                        const label = bestMatchData.header ? `${bestMatchData.header} ` : "";
                        verbatimData.subjects[level][grade][subjectKey] = {
                            cp_full: `${label}${bestMatchData.full}`
                        };

                        const entry = gradesData[grade][subjectKey];
                        if (entry.ganjil) entry.ganjil.cp_snippet = bestMatchData.snippet;
                        if (entry.genap) entry.genap.cp_snippet = bestMatchData.snippet;
                        updateCount++;
                    } else {
                        skippedList.push(`${level} G-${grade} ${subjectKey}`);
                    }
                }
            }
        }

        console.log(`--- MAPPING SUMMARY ---`);
        console.log(`Mapped ${updateCount} entries.`);
        console.log(`Skipped ${skippedList.length} entries.`);
        if (skippedList.length > 0) {
            console.log('Sample Skipped:', skippedList.slice(0, 10));
        }

        fs.writeFileSync(verbatimPath, JSON.stringify(verbatimData, null, 4), 'utf8');
        fs.writeFileSync(bskapJsonPath, JSON.stringify(bskapData, null, 4), 'utf8');
        console.log('Update complete. Files saved.');

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

parseBskap();
