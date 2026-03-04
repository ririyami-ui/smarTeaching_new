import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const pdfPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/Lampiran keputusan/Kepka_BSKAP_No_01k17e8396ajn15j3hcw0k773b.pdf';
const intelJsonPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/src/utils/bskap_2025_intel.json';
const verbatimJsonPath = 'f:/app-firebase/Smart Teaching/smart-teaching-manager/src/utils/bskap_2025_verbatim.json';

async function extractPdfToInfo() {
    try {
        console.log('Loading PDF...');
        const dataBuffer = fs.readFileSync(pdfPath);
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const text = textResult.text;

        console.log('PDF text extracted. Volume:', text.length);

        const intelData = JSON.parse(fs.readFileSync(intelJsonPath, 'utf8'));
        let verbatimData = { version: "2025.Verbatim", subjects: {} };
        if (fs.existsSync(verbatimJsonPath)) {
            verbatimData = JSON.parse(fs.readFileSync(verbatimJsonPath, 'utf8'));
        }

        // --- ROBUST CLEANING ---
        let cleanText = text.replace(/-- \d+ [oO][fF] \d+ --/g, ' ');
        cleanText = cleanText.replace(/SALINAN/g, ' ');
        cleanText = cleanText.replace(/KEPUTUSAN KEPALA BADAN STANDAR, KURIKULUM, DAN ASESMEN PENDIDIKAN/gi, ' ');
        cleanText = cleanText.replace(/NOMOR \d+\/H\/KR\/\d+/gi, ' ');
        // Fix encoding artifacts
        cleanText = cleanText.replace(/Â±/g, '±');
        cleanText = cleanText.replace(/â€™/g, "'");
        cleanText = cleanText.replace(/\n\s+\n/g, '\n');

        const lines = cleanText.split('\n');

        const subjectsCP = {};
        let state = 'SEARCH';
        let currentSubject = '';
        let currentFase = '';
        let currentVariant = 'REGULAR'; // Default to REGULAR
        let subjectBuffer = [];
        let cpBuffer = [];

        function generateSnippet(fullText) {
            if (!fullText) return "";

            // 1. Remove introductory boilerplate
            let clean = fullText.replace(/^Pada akhir [fF]ase [A-F],? (?:murid|peserta didik|anak) memiliki kemampuan sebagai berikut[:\.]?\s*/i, '').trim();

            // 2. STRIP ALL SECTION HEADERS GLOABALLY (e.g. 6.1. Bilangan)
            // Handle cases with lowercase words like "dan", "atau", "tentang", etc. in headers
            clean = clean.replace(/\b\d+(\.\d+)+\.?\s+([A-Z][a-zA-Z]*(?:\s+(?:dan|atau|terhadap|dengan|tentang|unsur-unsur)\s+)?(?:[A-Z][a-zA-Z]*)*)\b/g, ' ');
            clean = clean.replace(/\b\d+(\.\d+)+\.?\s*/g, ' ');

            // 3. Remove leading/trailing cleanup (including leading dashes or symbols)
            clean = clean.replace(/^[\W\s]+/, '').trim(); // More aggressive start-of-string non-word removal
            clean = clean.replace(/\s+-\s*/g, ' ').trim(); // Remove internal floating dashes

            // 4. Smart Sentence Splitting
            const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 10);

            // 5. Adaptive Trimming
            let snippet = sentences.slice(0, 2).join(' ');
            if (snippet.length < 150 && sentences.length > 2) {
                snippet = sentences.slice(0, 3).join(' ');
            }
            if (snippet.length < 250 && sentences.length > 3) {
                snippet = sentences.slice(0, 4).join(' ');
            }
            if (snippet.length < 350 && sentences.length > 4) {
                snippet = sentences.slice(0, 5).join(' ');
            }

            // 6. Final cleanup
            snippet = snippet.replace(/\s+\d+\.?\s*$/, '').trim();

            if (snippet.length > 500) {
                return snippet.substring(0, 497) + "...";
            }
            return snippet;
        }

        function saveCurrent() {
            if (currentSubject && currentFase && cpBuffer.length > 0) {
                if (!subjectsCP[currentSubject]) subjectsCP[currentSubject] = {};

                const fullText = cpBuffer.join(' ').replace(/\s+/g, ' ').trim();
                const splitIdx = fullText.search(/Pada akhir [fF]ase [A-F]/i);
                let header = '';
                let content = fullText;
                if (splitIdx !== -1) {
                    header = fullText.substring(0, splitIdx).trim();
                    content = fullText.substring(splitIdx).trim();
                }

                // If header contains "Usia Mental" or "LB", it's likely a disabilitas variant
                let variant = currentVariant;
                if (header.match(/Usia Mental|LB\)|Kekhususan/i)) {
                    variant = 'LB';
                }

                // Use a key that combines Fase and Variant to avoid overwriting
                const key = `${currentFase}_${variant}`;

                // Store but only if it's the first one of this variant OR if it's longer (sometimes headers split)
                if (!subjectsCP[currentSubject][key] || content.length > subjectsCP[currentSubject][key].full.length) {
                    subjectsCP[currentSubject][key] = {
                        header,
                        full: content,
                        snippet: generateSnippet(content),
                        variant: variant
                    };
                }
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const subjectMatch = line.match(/^([IVXLC\d\.]+)\s+CAPAIAN PEMBELAJARAN\s*(.*)$/i);

            if (subjectMatch) {
                saveCurrent();
                state = 'SUBJECT_HEADER';
                subjectBuffer = [subjectMatch[2].trim()];
                currentSubject = '';
                currentFase = '';
                currentVariant = 'REGULAR';
                cpBuffer = [];
                continue;
            }

            if (state === 'SUBJECT_HEADER') {
                if (line.match(/^[A-Z]\.\s+Rasional/i)) {
                    let rawName = subjectBuffer.join(' ').replace(/\s+/g, ' ').trim();
                    rawName = rawName.replace(/CAPAIAN PEMBELAJARAN/gi, '').replace(/\s+/g, ' ').trim();
                    const mid = Math.floor(rawName.length / 2);
                    if (rawName.substring(0, mid).trim() === rawName.substring(mid).trim()) {
                        rawName = rawName.substring(0, mid).trim();
                    }
                    rawName = rawName.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
                    currentSubject = rawName.toUpperCase();
                    state = 'SUBJECT_BODY';
                } else {
                    subjectBuffer.push(line);
                }
                continue;
            }

            if (state === 'SUBJECT_BODY' || state === 'FASE_BODY' || state === 'FASE_HEADER') {
                const faseMatch = line.match(/^(?:(\d+)\.\s+)?Fase\s+([A-F])/i);
                if (faseMatch) {
                    saveCurrent();
                    currentFase = faseMatch[2].toUpperCase();
                    state = 'FASE_HEADER';
                    cpBuffer = [line];
                    // Reset variant to regular, saveCurrent will detect if it's LB from the header
                    currentVariant = 'REGULAR';
                    continue;
                }
                if (state === 'FASE_HEADER') {
                    cpBuffer.push(line);
                    if (line.includes(')')) state = 'FASE_BODY';
                    continue;
                }
                if (state === 'FASE_BODY') {
                    if (line.match(/^[A-Z]\.\s+(Tujuan|Karakteristik|Capaian Pembelajaran)/)) {
                        saveCurrent();
                        state = 'SUBJECT_BODY';
                        currentFase = '';
                        cpBuffer = [];
                        continue;
                    }
                    cpBuffer.push(line);
                }
            }
        }
        saveCurrent();
        console.log('Extracted Subjects Counts:', Object.keys(subjectsCP).length);
        if (subjectsCP['PENDIDIKAN PANCASILA']) {
            console.log('Variants for PANCASILA:', Object.keys(subjectsCP['PENDIDIKAN PANCASILA']));
        }

        // Advanced Subject Normalization
        const normalize = (name) => {
            if (!name) return "";
            return name.toUpperCase()
                .replace(/DAN BUDI PEKERTI/g, '')
                .replace(/TINGKAT LANJUT/g, '')
                .replace(/\(IPA\)/g, '')
                .replace(/\(IPS\)/g, '')
                .replace(/\(IPAS\)/g, '')
                .replace(/ILMU PENGETAHUAN ALAM DAN SOSIAL/g, 'IPAS')
                .replace(/ILMU PENGETAHUAN ALAM/g, 'IPA')
                .replace(/ILMU PENGETAHUAN SOSIAL/g, 'IPS')
                .replace(/JASMANI, OLAHRAGA, DAN KESEHATAN/g, 'PJOK')
                .replace(/PRAKARYA DAN KEWIRAUSAHAAN/g, 'PKWU')
                .replace(/PENDIDIKAN AGAMA/g, 'AGAMA')
                .replace(/[\s,]+/g, '')
                .trim();
        };

        const faseToGrades = {
            'A': ['1', '2'], 'B': ['3', '4'], 'C': ['5', '6'],
            'D': ['7', '8', '9'], 'E': ['10'], 'F': ['11', '12']
        };

        let updateCount = 0;
        let mapped = new Set();
        let pdfSubjects = Object.keys(subjectsCP);

        for (const level of ['SD', 'SMP', 'SMA', 'SMK']) {
            const gradesData = intelData.subjects[level];
            if (!gradesData) continue;
            if (!verbatimData.subjects[level]) verbatimData.subjects[level] = {};

            for (const grade in gradesData) {
                if (!verbatimData.subjects[level][grade]) verbatimData.subjects[level][grade] = {};
                for (const subjectKey in gradesData[grade]) {
                    const normTarget = normalize(subjectKey);
                    let match = null;

                    // Fallback for Grade 10 Kimia/Fisika/Biologi which are often under "IPA" or "IPAS"
                    const searchTargets = [normTarget];
                    if (grade === '10' && ['KIMIA', 'FISIKA', 'BIOLOGI'].includes(normTarget)) {
                        searchTargets.push('IPA', 'IPAS', 'ILMUPENGETAHUANALAM');
                    }

                    for (const target of searchTargets) {
                        // 1. TRY EXACT MATCH FIRST (most important to avoid LB overlap)
                        for (const rawName of pdfSubjects) {
                            const normRaw = normalize(rawName);
                            if (normRaw === target) {
                                for (const [fase, grades] of Object.entries(faseToGrades)) {
                                    if (grades.includes(grade)) {
                                        match = subjectsCP[rawName][`${fase}_REGULAR`] ||
                                            subjectsCP[rawName][`${fase}_LB`] ||
                                            subjectsCP[rawName][fase];
                                        if (match) break;
                                    }
                                }
                            }
                            if (match) break;
                        }
                        if (match) break;

                        // 2. TRY INCLUDES MATCH (only if exact failed)
                        for (const rawName of pdfSubjects) {
                            const normRaw = normalize(rawName);
                            if (normRaw.includes(target) || target.includes(normRaw)) {
                                // Skip if it's clearly a "KHUSUS" subject being matched to a regular target
                                if (normRaw.includes('LB') && !target.includes('LB')) continue;

                                for (const [fase, grades] of Object.entries(faseToGrades)) {
                                    if (grades.includes(grade)) {
                                        match = subjectsCP[rawName][`${fase}_REGULAR`] ||
                                            subjectsCP[rawName][`${fase}_LB`] ||
                                            subjectsCP[rawName][fase];
                                        if (match) break;
                                    }
                                }
                            }
                            if (match) break;
                        }
                        if (match) break;
                    }

                    if (match) {
                        const entry = gradesData[grade][subjectKey];
                        if (entry.ganjil) entry.ganjil.cp_snippet = match.snippet;
                        if (entry.genap) entry.genap.cp_snippet = match.snippet;

                        const header = match.header ? `${match.header} ` : "";
                        verbatimData.subjects[level][grade][subjectKey] = {
                            cp_full: `${header}${match.full}`
                        };
                        updateCount++;
                        mapped.add(subjectKey);
                    }
                }
            }
        }

        fs.writeFileSync(intelJsonPath, JSON.stringify(intelData, null, 4));
        fs.writeFileSync(verbatimJsonPath, JSON.stringify(verbatimData, null, 4));

        console.log(`Summary: Updated ${updateCount} grade-subject entries (${mapped.size} unique subjects).`);

        const allSubjects = new Set();
        for (const level in intelData.subjects) {
            for (const grade in intelData.subjects[level]) {
                for (const subj in intelData.subjects[level][grade]) {
                    allSubjects.add(subj);
                }
            }
        }
        const unmapped = Array.from(allSubjects).filter(s => !mapped.has(s));
        console.log(`Unmapped Subjects in JSON (${unmapped.length}):`, unmapped.slice(0, 10));

    } catch (err) {
        console.error('Error:', err);
    }
}

extractPdfToInfo();
