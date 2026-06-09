/**
 * DATA SOURCE BINDING - BSKAP 2025 & Official Books Integration
 * This file enforces strict content source compliance.
 * ALL quiz questions MUST originate ONLY from these official sources.
 */

export const dataSourceBinding = {
    official_sources: {
        bskap: {
            name: "BSKAP 2025 (Kepka 046/H/KR/2025)",
            foundation: "Permendikbudristek No. 13 Tahun 2025",
            regulation: "Keputusan Kepala BSKAP No. 046/H/KR/2025",
            path: "src/utils/bskap_2025_intel.json",
            description: "Kurikulum Merdeka - Official Indonesian Curriculum Framework"
        },
        books: {
            name: "Official Curriculum Aligned Books",
            levels: ["SD", "SMP", "SMA"],
            path: "src/utils/data/books",
            description: "Authorized textbooks aligned with BSKAP 2025"
        }
    },
    
    compliance_rules: {
        rule_1: "ONLY Permitted Sources",
        content: [
            "✓ BSKAP 2025 materi_inti (Core Materials)",
            "✓ BSKAP 2025 cp_snippet (Curriculum Profile)",
            "✓ Official textbook content from books/index.json references",
            "✗ External websites or unverified sources",
            "✗ Teacher-created content outside BSKAP scope",
            "✗ ChatGPT-generated examples not in BSKAP",
            "✗ Real-world data not referenced in official curriculum"
        ],
        
        rule_2: "Content Validation Checklist",
        validation: [
            "1. Is this topic in BSKAP materi_inti for this grade/subject? → YES ✓ / NO ✗",
            "2. Can I find this content in the referenced textbook? → YES ✓ / NO ✗",
            "3. Is this concept within the CP scope for this phase? → YES ✓ / NO ✗",
            "4. Am I adding external information not in sources? → YES ✗ / NO ✓"
        ],
        
        rule_3: "Terminology & Naming Convention",
        instruction: [
            "Use EXACT terminology from BSKAP (not simplified/modified versions)",
            "Use EXACT names for concepts, items, people mentioned in books",
            "If BSKAP calls it 'Perbandingan Senilai', NOT 'Direct Proportion'",
            "If book mentions 'Pak Somad', use exact same name",
            "Preserve numerals and values exactly as in source materials"
        ]
    },
    
    source_reference_format: {
        required_fields: [
            "source_type: 'BSKAP' or 'Textbook'",
            "grade_level: Number (1-12)",
            "subject: String (exact name from BSKAP)",
            "semester: 'ganjil' or 'genap'",
            "materi_reference: '[Specific topic from materi_inti]'",
            "page_or_line: 'Optional reference to textbook page'"
        ],
        
        example: {
            source_type: "BSKAP",
            grade_level: 5,
            subject: "Matematika",
            semester: "ganjil",
            materi_reference: "Perbandingan Senilai",
            cognitive_level: "L2 (MOTS)"
        }
    },
    
    prohibited_patterns: [
        "❌ Creating scenarios not mentioned in BSKAP",
        "❌ Using modern examples (like 'social media influencer') if not in curriculum",
        "❌ Introducing new terminology not in official sources",
        "❌ Extrapolating beyond the scope defined by CP snippets",
        "❌ Mixing content from different grade levels inappropriately",
        "❌ Adding 'fun facts' that aren't part of curriculum"
    ]
};

/**
 * ENFORCEMENT MECHANISM
 * Use this to validate quiz generation against official sources
 */
export function validateSourceCompliance(question, bskapData, bookData) {
    const issues = [];
    
    if (!question.source_reference) {
        issues.push("⚠️ Missing source_reference field");
    }
    
    if (question.source_reference?.source_type === "BSKAP") {
        const subject = question.source_reference.subject;
        const grade = question.source_reference.grade_level;
        const semester = question.source_reference.semester;
        const materiRef = question.source_reference.materi_reference;
        
        // Check if this material exists in BSKAP
        const bskapMateri = findMaterialInBSKAP(bskapData, subject, grade, semester, materiRef);
        if (!bskapMateri) {
            issues.push(`⚠️ "${materiRef}" not found in BSKAP for ${subject} Grade ${grade} ${semester}`);
        }
    }
    
    return {
        isCompliant: issues.length === 0,
        issues: issues
    };
}

function findMaterialInBSKAP(bskapData, subject, grade, semester, materiRef) {
    try {
        const jenjang = grade <= 6 ? "SD" : grade <= 9 ? "SMP" : "SMA";
        const subjectData = bskapData.subjects[jenjang][grade]?.[subject];
        const semesterData = subjectData?.[semester];
        
        if (!semesterData) return null;
        
        return semesterData.materi_inti?.some(m => 
            m.materi.toLowerCase().includes(materiRef.toLowerCase())
        );
    } catch (e) {
        return null;
    }
}
