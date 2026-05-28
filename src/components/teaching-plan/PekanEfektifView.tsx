import React, { useState, useEffect, useRef } from 'react';
import {
    Calendar, Save, RefreshCw, Copy, FileSpreadsheet, FileText, Printer, LayoutTemplate
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import moment from 'moment';
import 'moment/locale/id';
import { db } from '../../firebase';
import {
    collection, doc, getDoc, setDoc, query, where, getDocs, deleteField
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MONTH_MAP, exportToDocx } from '../../utils/teachingPlanUtils';
import SignatureSection from './SignatureSection';
import Modal from '../Modal';
import { formatDate } from '../../utils/dateUtils';
import { CLASS_TEMPLATES, calculateTotalEffectiveWeeks } from '../../utils/classTemplates';

interface PekanEfektifItem {
  name: string;
  totalWeeks: number | string;
  nonEffectiveWeeks: number | string;
  keterangan: string;
  isAuto?: boolean;
}

interface ScheduleInfo {
  class: string | { rombel: string };
  subjectId?: string;
  subject?: string;
  startPeriod: string;
  endPeriod: string;
  [key: string]: unknown;
}

interface SubjectInfo {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface UserProfileInfo {
  school?: string;
  principalName?: string;
  principalNip?: string;
  name?: string;
  nip?: string;
  [key: string]: unknown;
}

interface PekanEfektifViewProps {
  grade: string;
  subject: string;
  semester: string;
  year: string;
  schedules: ScheduleInfo[];
  activeTab: string;
  userProfile: UserProfileInfo;
  signingLocation?: string;
  onUpdateData?: (data: {
    jpPerWeek: number;
    totalEffectiveWeeks: number;
    totalEffectiveHours: number;
    pekanEfektif: PekanEfektifItem[];
  }) => void;
  sharedEfektifData?: {
    pekanEfektif?: PekanEfektifItem[];
    jpPerWeek?: number;
    totalEffectiveHours?: number;
    totalEffectiveWeeks?: number;
  } | null;
  subjects: SubjectInfo[];
  levels?: string[];
  schoolDays?: number;
}

const PekanEfektifView: React.FC<PekanEfektifViewProps> = ({
    grade, subject, semester, year, schedules,
    activeTab, userProfile, signingLocation,
    onUpdateData, sharedEfektifData, subjects,
    levels, schoolDays = 6
}) => {
    const { user } = useAuth();
    // Point 4: Initialize with template to avoid "kosong" UI flash
    const getInitialTemplate = (): PekanEfektifItem[] => {
        const semesterMonths = semester === 'Ganjil'
            ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
            : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

        const years = year.split('/');

        return semesterMonths.map(m => {
            const mNum = MONTH_MAP[m as keyof typeof MONTH_MAP];
            const actualYear = mNum >= 7 ? years[0] : years[1];
            const daysInMonth = moment(`${actualYear}-${mNum}`, 'YYYY-M').daysInMonth();
            const totalWeeks = daysInMonth > 28 ? 5 : 4;

            return { name: m, totalWeeks: totalWeeks, nonEffectiveWeeks: 0, keterangan: '' };
        });
    };

    const [months, setMonths] = useState<PekanEfektifItem[]>(getInitialTemplate());
    const [jpPerWeek, setJpPerWeek] = useState<number | string>(0);
    const isInternalChange = useRef(false);

    // Live Sync to Parent
    useEffect(() => {
        if (onUpdateData && isInternalChange.current) {
            const totalEffectiveWeeks = months.reduce((acc, curr) => acc + (parseInt(String(curr.totalWeeks || 0)) - parseInt(String(curr.nonEffectiveWeeks || 0))), 0);
            const totalEffectiveHours = totalEffectiveWeeks * parseInt(String(jpPerWeek || 0));

            onUpdateData({
                jpPerWeek: parseInt(String(jpPerWeek || 0)),
                totalEffectiveWeeks,
                totalEffectiveHours,
                pekanEfektif: months
            });
            isInternalChange.current = false;
        }
    }, [months, jpPerWeek, onUpdateData]);

    // INITIAL SYNC FROM GLOBAL (Parent)
    useEffect(() => {
        if (sharedEfektifData && sharedEfektifData.pekanEfektif && sharedEfektifData.pekanEfektif.length > 0) {
            setMonths(sharedEfektifData.pekanEfektif);
            setJpPerWeek(sharedEfektifData.jpPerWeek || 0);
        }
    }, [sharedEfektifData]);

    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: (() => void) | null;
    }>({ isOpen: false, title: '', message: '', onConfirm: null });

    const totalEffectiveWeeks = months.reduce((acc, m) => acc + (parseInt(String(m.totalWeeks || 0)) - parseInt(String(m.nonEffectiveWeeks || 0))), 0);
    const [programId, setProgramId] = useState<string | null>(null);
    const [calendarId, setCalendarId] = useState<string | null>(null);
    const [templateModal, setTemplateModal] = useState(false);

    useEffect(() => {
        if (!user) return;
        const cId = `calendar_${user.uid}_${grade}_${year.replace('/', '-')}_${semester}`;
        const pId = `${user.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}`;
        setCalendarId(cId);
        setProgramId(pId);
    }, [grade, year, semester, subject, user]);

    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            if (!user) return;
            if (sharedEfektifData && sharedEfektifData.pekanEfektif && sharedEfektifData.pekanEfektif.length > 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const cId = `calendar_${user.uid}_${grade}_${year.replace('/', '-')}_${semester}`;
                const cIdOld = `calendar_${user.uid}_${year.replace('/', '-')}_${semester}`;
                const pId = `${user.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}`;

                const calRef = doc(db, 'teachingPrograms', cId);
                const calRefOld = doc(db, 'teachingPrograms', cIdOld);
                const progRef = doc(db, 'teachingPrograms', pId);

                const [calSnap, calSnapOld, progSnap] = await Promise.all([
                    getDoc(calRef),
                    getDoc(calRefOld),
                    getDoc(progRef)
                ]);

                if (ignore) return;

                if (calSnap.exists() && calSnap.data().pekanEfektif) {
                    setMonths(calSnap.data().pekanEfektif);
                } else if (calSnapOld.exists() && calSnapOld.data().pekanEfektif) {
                    setMonths(calSnapOld.data().pekanEfektif);
                } else if (progSnap.exists() && progSnap.data().pekanEfektif) {
                    setMonths(progSnap.data().pekanEfektif);
                }

                if (progSnap.exists() && progSnap.data().jpPerWeek) {
                    setJpPerWeek(progSnap.data().jpPerWeek);
                } else {
                    setJpPerWeek(0);
                }

                const hQuery = query(collection(db, 'holidays'), where('userId', '==', user.uid));
                const hSnapshot = await getDocs(hQuery);
                const allHolidays = hSnapshot.docs.map(doc => doc.data());

                setMonths(prevMonths => {
                    return prevMonths.map(m => {
                        const mNum = MONTH_MAP[m.name as keyof typeof MONTH_MAP];
                        const years = year.split('/');
                        const actualYear = mNum >= 7 ? years[0] : years[1];
                        const daysInMonth = moment(`${actualYear}-${mNum}`, 'YYYY-M').daysInMonth();

                        let calculatedNonEffective = 0;
                        let holidaynotes: string[] = [];

                        const totalWeeksCount = daysInMonth > 28 ? 5 : 4;
                        const overlapThreshold = Math.floor(schoolDays / 2) + 1;
                        for (let w = 0; w < totalWeeksCount; w++) {
                            const weekStart = moment(`${actualYear}-${mNum}-${(w * 7) + 1}`, 'YYYY-MM-D').startOf('day');
                            const weekEnd = weekStart.clone().add(6, 'days').endOf('day');

                            const holidayDateList = allHolidays.filter(h => {
                                const hStart = moment(h.startDate || h.date).startOf('day');
                                const hEnd = moment(h.endDate || h.date).endOf('day');
                                return hStart.isSameOrBefore(weekEnd) && hEnd.isSameOrAfter(weekStart);
                            });

                            let schoolDayOverlap = 0;
                            const holidayNotesInWeek: string[] = [];

                            const cursor = weekStart.clone();
                            while (cursor.isSameOrBefore(weekEnd)) {
                                const dow = cursor.day();
                                const isSchoolDay = dow >= 1 && dow <= (schoolDays === 5 ? 5 : 6);
                                if (isSchoolDay) {
                                    const match = holidayDateList.find(h => {
                                        const hStart = moment(h.startDate || h.date).startOf('day');
                                        const hEnd = moment(h.endDate || h.date).endOf('day');
                                        return cursor.isBetween(hStart, hEnd, 'day', '[]');
                                    });
                                    if (match) {
                                        schoolDayOverlap++;
                                        if (!holidayNotesInWeek.includes(match.name)) holidayNotesInWeek.push(match.name);
                                    }
                                }
                                cursor.add(1, 'day');
                            }

                            if (schoolDayOverlap >= overlapThreshold) {
                                calculatedNonEffective++;
                                holidayNotesInWeek.forEach(note => {
                                    if (!holidaynotes.includes(note)) holidaynotes.push(note);
                                });
                            }
                        }

                        if (calculatedNonEffective > 0) {
                            return {
                                ...m,
                                nonEffectiveWeeks: calculatedNonEffective,
                                keterangan: m.keterangan ? m.keterangan : holidaynotes.join(', '),
                                isAuto: true
                            };
                        }
                        return m;
                    });
                });

            } catch (error) {
                console.error("Error fetching Pekan Efektif:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchData();
        return () => { ignore = true; };
    }, [grade, subject, semester, year, activeTab, schoolDays, sharedEfektifData, user]);

    const handleSyncJP = () => {
        const targetSubjectObj = subjects.find(s => s.name === subject);
        const getAltGrade = (g: string) => {
            const map: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X', '11': 'XI', '12': 'XII' };
            const rev = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
            return map[g] || rev[g] || g;
        };
        const altGrade = getAltGrade(grade);

        const matchingSchedules = (schedules || []).filter(s => {
            const className = typeof s.class === 'string' ? s.class : s.class?.rombel;
            const gradePattern = new RegExp(`^(?:KELAS\\s+)?(?:${grade}${altGrade ? '|' + altGrade : ''})(?![0-9])`, 'i');
            const isGradeMatch = className && gradePattern.test(className.trim());

            if (targetSubjectObj?.id && s.subjectId) {
                return s.subjectId === targetSubjectObj.id && isGradeMatch;
            }
            const sSubject = (s.subject || '').trim().toLowerCase();
            const targetSubject = (subject || '').trim().toLowerCase();
            return sSubject === targetSubject && isGradeMatch;
        });

        if (matchingSchedules.length > 0) {
            const firstClassName = typeof matchingSchedules[0].class === 'string' ? matchingSchedules[0].class : matchingSchedules[0].class.rombel;
            const totalJP = matchingSchedules
                .filter(s => (typeof s.class === 'string' ? s.class : s.class.rombel) === firstClassName)
                .reduce((acc, s) => acc + (parseInt(s.endPeriod) - parseInt(s.startPeriod) + 1), 0);
            setJpPerWeek(totalJP);
            toast.success(`Berhasil sinkronisasi: ${totalJP} JP / Minggu (Diterapkan untuk seluruh Jenjang Kelas ${grade})`);
        } else {
            toast.error("Jadwal mengajar tidak ditemukan untuk kelas/mapel ini.");
        }
    };

    const handleSave = async () => {
        if (!user) {
            toast.error("Sesi habis. Silakan login kembali.");
            return;
        }

        if (!programId || !calendarId) {
            toast.error("Identitas program belum terinisialisasi.");
            return;
        }

        setLoading(true);
        try {
            await setDoc(doc(db, 'teachingPrograms', calendarId), {
                userId: user.uid,
                academicYear: year,
                semester: semester,
                gradeLevel: grade,
                pekanEfektif: months,
                updatedAt: new Date().toISOString(),
                type: 'calendar_structure'
            }, { merge: true });

            const totalHours = totalEffectiveWeeks * parseInt(String(jpPerWeek || 0));

            await setDoc(doc(db, 'teachingPrograms', programId), {
                userId: user.uid,
                subject,
                gradeLevel: grade,
                academicYear: year,
                semester,
                jpPerWeek: parseInt(String(jpPerWeek || 0)),
                totalEffectiveWeeks,
                totalEffectiveHours: totalHours,
                updatedAt: new Date().toISOString(),
                pekanEfektif: deleteField(),
            }, { merge: true });

            toast.success(`Data Pekan Efektif disimpan untuk Kelas ${grade}.`);
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncWithCalendar = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const hQuery = query(collection(db, 'holidays'), where('userId', '==', user.uid));
            const hSnapshot = await getDocs(hQuery);
            const allHolidays = hSnapshot.docs.map(doc => doc.data());

            setMonths(prevMonths => {
                return prevMonths.map(m => {
                    const mNum = MONTH_MAP[m.name as keyof typeof MONTH_MAP];
                    const years = year.split('/');
                    const actualYear = mNum >= 7 ? years[0] : years[1];
                    const daysInMonth = moment(`${actualYear}-${mNum}`, 'YYYY-M').daysInMonth();

                    let calculatedNonEffective = 0;
                    let holidaynotes: string[] = [];
                    const totalWeeks = daysInMonth > 28 ? 5 : 4;
                    const overlapThreshold = Math.floor(schoolDays / 2) + 1;

                    for (let w = 0; w < totalWeeks; w++) {
                        const weekStart = moment(`${actualYear}-${mNum}-${(w * 7) + 1}`, 'YYYY-MM-D').startOf('day');
                        const weekEnd = weekStart.clone().add(6, 'days').endOf('day');

                        const holidayDateList = allHolidays.filter(h => {
                            const hStart = moment(h.startDate || h.date).startOf('day');
                            const hEnd = moment(h.endDate || h.date).endOf('day');
                            return hStart.isSameOrBefore(weekEnd) && hEnd.isSameOrAfter(weekStart);
                        });

                        let schoolDayOverlap = 0;
                        const holidayNotesInWeek: string[] = [];
                        const cursor = weekStart.clone();
                        while (cursor.isSameOrBefore(weekEnd)) {
                            const dow = cursor.day();
                            const isSchoolDay = dow >= 1 && dow <= (schoolDays === 5 ? 5 : 6);
                            if (isSchoolDay) {
                                const match = holidayDateList.find(h => {
                                    const hStart = moment(h.startDate || h.date).startOf('day');
                                    const hEnd = moment(h.endDate || h.date).endOf('day');
                                    return cursor.isBetween(hStart, hEnd, 'day', '[]');
                                });
                                if (match) {
                                    schoolDayOverlap++;
                                    if (!holidayNotesInWeek.includes(match.name)) holidayNotesInWeek.push(match.name);
                                }
                            }
                            cursor.add(1, 'day');
                        }

                        if (schoolDayOverlap >= overlapThreshold) {
                            calculatedNonEffective++;
                            holidayNotesInWeek.forEach(note => {
                                if (!holidaynotes.includes(note)) holidaynotes.push(note);
                            });
                        }
                    }

                    if (calculatedNonEffective > 0) {
                        return { ...m, nonEffectiveWeeks: calculatedNonEffective, keterangan: holidaynotes.join(', '), isAuto: true };
                    }
                    return { ...m, nonEffectiveWeeks: 0, keterangan: '' };
                });
            });
            isInternalChange.current = true;
            toast.success("Berhasil sinkronisasi dengan Agenda Sekolah!");
        } catch (error) {
            console.error("Sync error:", error);
            toast.error("Gagal sinkronisasi.");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyToAllGrades = async () => {
        if (!levels || levels.length <= 1) return toast.error("Tidak ada kelas lain.");
        if (!user) return;
        setConfirmModal({
            isOpen: true,
            title: 'Salin ke Semua Kelas',
            message: `Menyalin ke SEMUA KELAS LAIN (${levels.filter(l => l !== grade).join(', ')})? Data akan ditimpa.`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setLoading(true);
                try {
                    await Promise.all(levels.map(lvl => {
                        if (lvl === grade) return Promise.resolve();
                        const targetCId = `calendar_${user.uid}_${lvl}_${year.replace('/', '-')}_${semester}`;
                        return setDoc(doc(db, 'teachingPrograms', targetCId), {
                            userId: user.uid,
                            academicYear: year,
                            semester,
                            gradeLevel: lvl,
                            pekanEfektif: months,
                            updatedAt: new Date().toISOString(),
                            type: 'calendar_structure'
                        }, { merge: true });
                    }));
                    toast.success("Berhasil menyalin data.");
                } catch {
                    toast.error("Gagal menyalin.");
                } finally { setLoading(false); }
            }
        });
    };

    const handleExportExcel = async () => {
        try {
            const header = [
                ['DISTRIBUSI ALOKASI WAKTU (PEKAN EFEKTIF)'],
                [`Satuan Pendidikan: ${userProfile?.school || userProfile?.schoolName || '-'}`],
                [`Mata Pelajaran: ${subject}`], [`Kelas: ${grade}`],
                [`Tahun Ajaran: ${year}`], [`Semester: ${semester}`],
                [], ['Bulan', 'Jumlah Pekan', 'Pekan Tidak Efektif', 'Pekan Efektif', 'Keterangan']
            ];
            const tableData = months.map(m => [
                m.name, parseInt(String(m.totalWeeks || 0)), parseInt(String(m.nonEffectiveWeeks || 0)),
                (parseInt(String(m.totalWeeks || 0)) - parseInt(String(m.nonEffectiveWeeks || 0))),
                m.keterangan
            ]);
            const summaryRow = ['TOTAL', months.reduce((a, b) => a + parseInt(String(b.totalWeeks || 0)), 0), months.reduce((a, b) => a + parseInt(String(b.nonEffectiveWeeks || 0)), 0), totalEffectiveWeeks, `Total: ${totalEffectiveWeeks * parseInt(String(jpPerWeek || 0))} JP`];

            const today = formatDate(new Date());
            const signatureRows = [
                [], [],
                ['Mengetahui,', '', '', '', `${signingLocation || '...........'}, ${today}`],
                ['Kepala Sekolah', '', '', '', 'Guru Mata Pelajaran'],
                [], [], [],
                [userProfile?.principalName?.toUpperCase() || '....................', '', '', '', userProfile?.name?.toUpperCase() || '....................'],
                [`NIP. ${userProfile?.principalNip || '....................'}`, '', '', '', `NIP. ${userProfile?.nip || '....................'}`]
            ];

            const XLSX = await import("xlsx");
            const { saveAs } = await import("file-saver");
            const ws = XLSX.utils.aoa_to_sheet([...header, ...tableData, summaryRow, ...signatureRows]);
            ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 40 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pekan Efektif");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            saveAs(new Blob([excelBuffer]), `Pekan-Efektif-${subject}-${grade}-${year.replace('/', '-')}.xlsx`);
            toast.success("Excel berhasil diunduh!");
        } catch { toast.error("Gagal ekspor Excel."); }
    };

    const handleExportPDF = async () => {
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margins = { top: 20, right: 20, bottom: 20, left: 25 };

            doc.setFontSize(14).setFont('helvetica', 'bold');
            doc.text('DISTRIBUSI ALOKASI WAKTU (PEKAN EFEKTIF)', pageWidth / 2, margins.top, { align: 'center' });

            doc.setFontSize(10).setFont('helvetica', 'normal');
            let y = margins.top + 10;
            doc.text(`Satuan Pendidikan: ${userProfile?.school || '-'}`, margins.left, y); y += 5;
            doc.text(`Mata Pelajaran: ${subject}`, margins.left, y); y += 5;
            doc.text(`Kelas / Semester: ${grade} / ${semester}`, margins.left, y); y += 5;
            doc.text(`Tahun Ajaran: ${year}`, margins.left, y); y += 10;

            doc.setFillColor(240, 246, 255).rect(margins.left, y, pageWidth - 45, 15, 'F');
            doc.setFont('helvetica', 'bold').text(`KALKULASI JAM EFEKTIF:`, margins.left + 5, y + 6);
            doc.setFont('helvetica', 'normal').text(`${jpPerWeek} JP/Minggu × ${totalEffectiveWeeks} Pekan = ${totalEffectiveWeeks * parseInt(String(jpPerWeek || 0))} JP`, margins.left + 5, y + 11);
            y += 20;

            autoTable(doc, {
                startY: y,
                head: [['Bulan', 'Jml Pekan', 'Tdk Efektif', 'Efektif', 'Keterangan']],
                body: [...months.map(m => [m.name, m.totalWeeks, m.nonEffectiveWeeks, (parseInt(String(m.totalWeeks || 0)) - parseInt(String(m.nonEffectiveWeeks || 0))), m.keterangan || '']), ['TOTAL', months.reduce((a, b) => a + parseInt(String(b.totalWeeks || 0)), 0), months.reduce((a, b) => a + parseInt(String(b.nonEffectiveWeeks || 0)), 0), totalEffectiveWeeks, `${totalEffectiveWeeks * parseInt(String(jpPerWeek || 0))} JP`]],
                theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, margin: margins
            });

            const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
            const leftCol = margins.left;
            const rightCol = pageWidth / 2 + 10;
            const today = formatDate(new Date());

            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text('Mengetahui,', leftCol, finalY);
            doc.text('Kepala Sekolah', leftCol, finalY + 5);

            doc.text(`${signingLocation || '...................'}, ${today}`, rightCol, finalY);
            doc.text('Guru Mata Pelajaran', rightCol, finalY + 5);

            const signatureSpace = 25;
            const nameY = finalY + 5 + signatureSpace;

            doc.setFont('helvetica', 'bold');
            doc.text(userProfile?.principalName?.toUpperCase() || '................................', leftCol, nameY);
            doc.text(userProfile?.name?.toUpperCase() || '................................', rightCol, nameY);

            doc.setFont('helvetica', 'normal');
            doc.text(`NIP. ${userProfile?.principalNip || '................................'}`, leftCol, nameY + 5);
            doc.text(`NIP. ${userProfile?.nip || '................................'}`, rightCol, nameY + 5);

            doc.save(`Pekan-Efektif-${subject}-${grade}-${year.replace('/', '-')}.pdf`);
            toast.success("PDF berhasil diunduh!");
        } catch { toast.error("Gagal ekspor PDF."); }
    };

    const handleExportWord = async () => {
        const rows = months.map(m => `
            <tr>
                <td>${m.name}</td>
                <td class="text-center">${m.totalWeeks}</td>
                <td class="text-center">${m.nonEffectiveWeeks}</td>
                <td class="text-center">${parseInt(String(m.totalWeeks || 0)) - parseInt(String(m.nonEffectiveWeeks || 0))}</td>
                <td>${m.keterangan || ''}</td>
            </tr>
        `).join('');

        const totalHours = totalEffectiveWeeks * parseInt(String(jpPerWeek || 0));
        const today = formatDate(new Date());
        const signatureHtml = `
            <table style="width: 100%; border: none; margin-top: 50px;">
                <tr>
                    <td style="width: 50%; text-align: center; border: none;">
                        Mengetahui,<br>Kepala Sekolah<br><br><br><br><br>
                        <strong><u>${userProfile?.principalName?.toUpperCase() || '................................'}</u></strong><br>
                        NIP. ${userProfile?.principalNip || '................................'}
                    </td>
                    <td style="width: 50%; text-align: center; border: none;">
                        ${signingLocation || '...................'}, ${today}<br>
                        Guru Mata Pelajaran<br><br><br><br><br>
                        <strong><u>${userProfile?.name?.toUpperCase() || '................................'}</u></strong><br>
                        NIP. ${userProfile?.nip || '................................'}
                    </td>
                </tr>
            </table>
        `;

        const html = `
            <h1>DISTRIBUSI ALOKASI WAKTU (PEKAN EFEKTIF)</h1>
            <p>Satuan Pendidikan: ${userProfile?.school || '-'}<br/>
            Mata Pelajaran: ${subject}<br/>
            Kelas / Semester: ${grade} / ${semester}<br/>
            Tahun Ajaran: ${year}</p>
            <div style="background-color: #e6f3ff; padding: 10px; border: 1px solid #b3d7ff; margin-bottom: 20px;">
                <strong>KALKULASI JAM EFEKTIF:</strong><br>
                ${jpPerWeek} JP/Minggu × ${totalEffectiveWeeks} Pekan = ${totalHours} JP
            </div>
            <table>
                <thead><tr><th>Bulan</th><th>Jml Pekan</th><th>Tdk Efektif</th><th>Efektif</th><th>Keterangan</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${signatureHtml}
        `;
        exportToDocx(html, `Pekan-Efektif-${subject}-${grade}.docx`);
    };

    const updateMonth = (index: number, field: keyof PekanEfektifItem, value: string | number | boolean) => {
        isInternalChange.current = true;
        const newMonths = [...months];
        newMonths[index] = { ...newMonths[index], [field]: value };
        setMonths(newMonths);
    };

    const totalEffectiveHours = totalEffectiveWeeks * parseInt(String(jpPerWeek || 0));

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="text-center md:text-left">
                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-100">Kalkulasi Jam Efektif</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Pekan Efektif x JP per Minggu</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex flex-col items-center">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">JP / Minggu</label>
                        <div className="flex items-center gap-1">
                            <input type="number" min="0" value={jpPerWeek} onChange={(e) => { isInternalChange.current = true; setJpPerWeek(e.target.value); }} className="w-16 md:w-20 p-2 text-center text-lg font-bold text-blue-700 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                            <button onClick={handleSyncJP} title="Sync JP" className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border bg-white shadow-sm"><RefreshCw size={16} /></button>
                            <button onClick={() => setTemplateModal(true)} className="flex items-center gap-2 px-3 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"><LayoutTemplate size={16} /><span className="hidden sm:inline">Template</span></button>
                            <button onClick={handleSyncWithCalendar} title="Sync Kalender" className="flex items-center gap-2 px-3 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm ml-2"><Calendar size={16} /><span className="hidden sm:inline">Sync Kalender</span></button>
                            <button onClick={handleApplyToAllGrades} className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition" title="Salin ke Semua Kelas"><Copy size={16} /><span className="hidden sm:inline font-semibold">Salin</span></button>
                        </div>
                    </div>
                    <div className="text-xl font-bold text-gray-400">×</div>
                    <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Pekan Efektif</div>
                        <div className="text-2xl font-bold text-blue-700">{totalEffectiveWeeks}</div>
                    </div>
                    <div className="text-xl font-bold text-gray-400">=</div>
                    <div className="text-center bg-white dark:bg-gray-700 px-4 py-1 rounded border border-blue-200 shadow-sm">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Total Jam Efektif</div>
                        <div className="text-2xl font-bold text-green-600">{totalEffectiveHours} JP</div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 border dark:border-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 border-r">Bulan</th>
                            <th className="px-6 py-3 border-r text-center">Jml Pekan</th>
                            <th className="px-6 py-3 border-r text-center">Pekan Tidak Efektif</th>
                            <th className="px-6 py-3 border-r text-center">Pekan Efektif</th>
                            <th className="px-6 py-3">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {months.map((month, index) => (
                            <tr key={month.name} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'} border-b dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors`}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white border-r">{month.name}</td>
                                <td className="px-4 py-2 border-r text-center">
                                    <input type="number" min="0" value={month.totalWeeks} onChange={(e) => updateMonth(index, 'totalWeeks', e.target.value)} className="w-16 p-1 text-center border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </td>
                                <td className="px-4 py-2 border-r text-center">
                                    <input type="number" min="0" value={month.nonEffectiveWeeks} onChange={(e) => updateMonth(index, 'nonEffectiveWeeks', e.target.value)} className={`w-16 p-1 text-center border rounded dark:bg-gray-700 ${month.isAuto ? 'border-green-400 bg-green-50' : ''}`} />
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-blue-600 border-r">{(parseInt(String(month.totalWeeks || 0)) - parseInt(String(month.nonEffectiveWeeks || 0)))}</td>
                                <td className="px-4 py-2">
                                    <input type="text" placeholder="Keterangan" value={month.keterangan} onChange={(e) => updateMonth(index, 'keterangan', e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
                        <tr>
                            <td className="px-6 py-4 border-r">TOTAL</td>
                            <td className="px-4 py-4 border-r text-center">
                                {months.reduce((acc, m) => acc + parseInt(String(m.totalWeeks || 0)), 0)}
                            </td>
                            <td className="px-4 py-4 border-r text-center">
                                {months.reduce((acc, m) => acc + parseInt(String(m.nonEffectiveWeeks || 0)), 0)}
                            </td>
                            <td className="px-6 py-4 border-r text-center text-blue-700 dark:text-blue-400">
                                {totalEffectiveWeeks}
                            </td>
                            <td className="px-6 py-4 text-green-700 dark:text-green-400">
                                Total Jam Efektif: {totalEffectiveWeeks * parseInt(String(jpPerWeek || 0))} JP
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <SignatureSection userProfile={userProfile} signingLocation={signingLocation} />

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center no-print pt-4 border-t dark:border-gray-700 gap-4">
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExportPDF} className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex items-center justify-center gap-2"><FileSpreadsheet size={16} />PDF</button>
                    <button onClick={handleExportWord} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center justify-center gap-2"><FileText size={16} />Word</button>
                    <button onClick={handleExportExcel} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center gap-2"><FileSpreadsheet size={16} />Excel</button>
                    <button onClick={() => window.print()} className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm flex items-center justify-center gap-2"><Printer size={16} />Cetak</button>
                </div>
                <button onClick={handleSave} disabled={loading} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md font-bold">
                    <Save size={18} />{loading ? 'Menyimpan...' : 'Simpan Data'}
                </button>
            </div>

            {confirmModal.isOpen && (
                <Modal onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4"><Copy className="h-8 w-8 text-blue-600" /></div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl">Batal</button>
                            <button onClick={confirmModal.onConfirm || undefined} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg">Ya, Salin Sekarang</button>
                        </div>
                    </div>
                </Modal>
            )}

            {templateModal && (
                <Modal onClose={() => setTemplateModal(false)}>
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-4"><LayoutTemplate className="h-8 w-8 text-purple-600" /></div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Pilih Template Pekan Efektif</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Kelas {grade} - Semester {semester}</p>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {Object.entries(CLASS_TEMPLATES).filter(([key]) => key === grade || key === (parseInt(grade) || grade).toString()).map(([key, template]) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: `Terapkan Template Kelas ${key}?`,
                                            message: `Total Pekan Efektif: ${calculateTotalEffectiveWeeks(template)} minggu. Data saat ini akan diganti.`,
                                            onConfirm: () => {
                                                isInternalChange.current = true;
                                                setMonths(template);
                                                setTemplateModal(false);
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                toast.success(`Template Kelas ${key} diterapkan!`);
                                            }
                                        });
                                    }}
                                    className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
                                >
                                    <p className="font-bold text-purple-700 dark:text-purple-300">Kelas {key}</p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">{calculateTotalEffectiveWeeks(template)} minggu efektif</p>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setTemplateModal(false)} className="w-full px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl">Tutup</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PekanEfektifView;
