import re

with open("src/components/StudentAcademicDetail.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

start = None
end = None
brace_depth = 0
found = False

for i, line in enumerate(lines):
    if "const handleSaveGrades = async" in line:
        start = i
        found = True
    if found:
        brace_depth += line.count("{") - line.count("}")
        if brace_depth == 0 and i > start:
            end = i
            break

print(f"Found function: lines {start} to {end}")

BT = chr(96)  # backtick

new_func_lines = [
    "    const handleSaveGrades = async () => {",
    "        if (!selectedStudentId || !selectedClass || !activeSemester || !academicYear || !userId) {",
    "            toast.error('Data tidak lengkap untuk menyimpan nilai');",
    "            return;",
    "        }",
    "",
    "        setIsSaving(true);",
    "        try {",
    "            // 1. Hapus duplikat yang ada di filteredGrades",
    "            const dupBatch = writeBatch(db);",
    "            const gradesByKey: Record<string, Grade[]> = {};",
    "            filteredGrades.forEach(g => {",
    f"                const key = {BT}${{g.subjectId || ''}}|${{(g.material || '').toLowerCase()}}|${{(g.assessmentType || '').toLowerCase()}}{BT};",
    "                if (!gradesByKey[key]) gradesByKey[key] = [];",
    "                gradesByKey[key].push(g);",
    "            });",
    "            let dupDeleted = 0;",
    "            Object.values(gradesByKey).forEach(arr => {",
    "                if (arr.length > 1) {",
    "                    arr.sort((a, b) => {",
    "                        const tA = (a as any).timestamp?.toMillis?.() || new Date(a.date).getTime();",
    "                        const tB = (b as any).timestamp?.toMillis?.() || new Date(b.date).getTime();",
    "                        return tB - tA;",
    "                    });",
    "                    arr.slice(1).forEach(g => {",
    "                        if (g.id) {",
    "                            dupBatch.delete(doc(db, 'grades', g.id));",
    "                            dupDeleted++;",
    "                        }",
    "                    });",
    "                }",
    "            });",
    "            if (dupDeleted > 0) {",
    "                await dupBatch.commit();",
    f"                toast.success({BT}${{dupDeleted}} duplikat dihapus{BT});",
    "                onGradesUpdated?.();",
    "                return; // reload data, user harus klik simpan lagi",
    "            }",
    "",
    "            // 2. Simpan perubahan nilai",
    "            const batch = writeBatch(db);",
    "            let hasChanges = false;",
    "            Object.entries(editedGrades).forEach(([idxStr, newScore]) => {",
    "                const index = parseInt(idxStr, 10);",
    "                const baseGrade = filteredGrades[index];",
    "                if (newScore !== undefined && newScore !== '' && baseGrade && Number(newScore) !== Number(baseGrade.score)) {",
    "                    hasChanges = true;",
    "                    const sanitizedMaterial = (baseGrade.material || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();",
    "                    const sanitizedAssessmentType = (baseGrade.assessmentType || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();",
    "                    const datePart = baseGrade.date ",
    "                        ? (baseGrade.date.includes('T') ? baseGrade.date.split('T')[0] : baseGrade.date) ",
    "                        : new Date().toISOString().split('T')[0];",
    f"                    const uniqueGradeId = {BT}${{selectedStudentId}}-${{selectedClass}}-${{baseGrade.subjectId || ''}}-${{datePart}}-${{sanitizedMaterial}}-${{sanitizedAssessmentType}}{BT};",
    "                    const gradeRef = baseGrade.id ",
    "                        ? doc(db, 'grades', baseGrade.id) ",
    "                        : doc(db, 'grades', uniqueGradeId);",
    "                    const newGrade = {",
    "                        ...baseGrade,",
    "                        score: parseFloat(String(newScore)),",
    "                        userId,",
    "                        semester: activeSemester,",
    "                        academicYear,",
    "                        timestamp: new Date(),",
    "                        date: baseGrade.date || new Date().toISOString(),",
    "                    };",
    "                    batch.set(gradeRef, newGrade, { merge: true });",
    "                }",
    "            });",
    "",
    "            if (!hasChanges) {",
    "                toast.success('Tidak ada perubahan nilai');",
    "                setIsEditMode(false);",
    "                return;",
    "            }",
    "",
    "            await batch.commit();",
    "            toast.success('Nilai berhasil diperbarui!');",
    "            setIsEditMode(false);",
    "            setEditedGrades({});",
    "            onGradesUpdated?.();",
    "        } catch (error) {",
    "            console.error('Error saving grades:', error);",
    "            toast.error('Gagal menyimpan nilai');",
    "        } finally {",
    "            setIsSaving(false);",
    "        }",
    "    };",
]

before = lines[:start]
after = lines[end+1:]
out_lines = before + [l + "\n" for l in new_func_lines] + after

with open("src/components/StudentAcademicDetail.tsx", "w", encoding="utf-8") as f:
    f.writelines(out_lines)

print(f"SUCCESS: Replaced lines {start}-{end} with {len(new_func_lines)} lines")