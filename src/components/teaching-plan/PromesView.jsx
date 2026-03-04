import React, { useState, useEffect, useMemo } from 'react';
import {
    Save, FileSpreadsheet, FileText, Printer, Zap, Calendar, RefreshCw
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/id';
import { db, auth } from '../../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MONTH_MAP, exportToDocx } from '../../utils/teachingPlanUtils';
import SignatureSection from './SignatureSection';

const PromesView = ({ grade, subject, semester, year, schedules, activeTab, userProfile, signingLocation, sharedEfektifData, subjects, schoolDays = 6 }) => {
    const [protaSource, setProtaSource] = useState([]);

    const getInitialTemplate = () => {
        const semesterMonths = semester === 'Ganjil'
            ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
            : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        return semesterMonths.map(m => ({ name: m, totalWeeks: 4, nonEffectiveWeeks: 0, keterangan: '' }));
    };

    const [pekanEfektifSource, setPekanEfektifSource] = useState(getInitialTemplate());
    const [promesData, setPromesData] = useState({});
    const [userHolidays, setUserHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [programId, setProgramId] = useState(null);

    useEffect(() => {
        if (sharedEfektifData?.pekanEfektif?.length > 0) {
            setPekanEfektifSource(sharedEfektifData.pekanEfektif);
        }
    }, [sharedEfektifData]);

    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            if (!auth.currentUser) return;
            setLoading(true);
            setProtaSource([]);
            setPekanEfektifSource(getInitialTemplate());
            setPromesData({});
            try {
                const cId = `calendar_${auth.currentUser.uid}_${grade}_${year.replace('/', '-')}_${semester}`;
                const cIdOld = `calendar_${auth.currentUser.uid}_${year.replace('/', '-')}_${semester}`;
                const pId = `${auth.currentUser.uid}_${subject}_${grade}_${year.replace('/', '-')}_${semester}`;
                setProgramId(pId);

                const hQuery = query(collection(db, 'holidays'), where('userId', '==', auth.currentUser.uid));
                const [calSnap, calSnapOld, progSnap, hSnapshot] = await Promise.all([
                    getDoc(doc(db, 'teachingPrograms', cId)),
                    getDoc(doc(db, 'teachingPrograms', cIdOld)),
                    getDoc(doc(db, 'teachingPrograms', pId)),
                    getDocs(hQuery)
                ]);
                if (ignore) return;

                if (calSnap.exists() && calSnap.data().pekanEfektif) setPekanEfektifSource(calSnap.data().pekanEfektif);
                else if (calSnapOld.exists() && calSnapOld.data().pekanEfektif) setPekanEfektifSource(calSnapOld.data().pekanEfektif);
                else if (progSnap.exists() && progSnap.data().pekanEfektif) setPekanEfektifSource(progSnap.data().pekanEfektif);

                if (progSnap.exists()) {
                    const data = progSnap.data();
                    if (data.prota) setProtaSource(data.prota);
                    if (data.promes) setPromesData(data.promes);
                }
                setUserHolidays(hSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching Promes data:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        fetchData();
        return () => { ignore = true; };
    }, [grade, subject, semester, year, activeTab]);

    const getHolidayForWeek = (monthName, wIndex) => {
        const monthNum = MONTH_MAP[monthName];
        if (!monthNum) return null;
        const years = year.split('/');
        const actualYear = monthNum >= 7 ? years[0] : years[1];
        const weekStart = moment(`${actualYear}-${monthNum}-${(wIndex * 7) + 1}`, 'YYYY-MM-D').startOf('day');
        const weekEnd = weekStart.clone().add(6, 'days').endOf('day');
        const overlapThreshold = Math.floor(schoolDays / 2) + 1;
        const holidayDateList = (userHolidays || []).filter(h => {
            const hStart = moment(h.startDate || h.date).startOf('day');
            const hEnd = moment(h.endDate || h.date).endOf('day');
            return hStart.isSameOrBefore(weekEnd) && hEnd.isSameOrAfter(weekStart);
        });
        if (holidayDateList.length === 0) return null;
        let schoolDayOverlap = 0;
        const cursor = weekStart.clone();
        while (cursor.isSameOrBefore(weekEnd)) {
            const dow = cursor.day();
            if (dow >= 1 && dow <= (schoolDays === 5 ? 5 : 6)) {
                const match = holidayDateList.some(h => {
                    const hStart = moment(h.startDate || h.date).startOf('day');
                    const hEnd = moment(h.endDate || h.date).endOf('day');
                    return cursor.isBetween(hStart, hEnd, 'day', '[]');
                });
                if (match) schoolDayOverlap++;
            }
            cursor.add(1, 'day');
        }
        return {
            name: holidayDateList.map(h => h.name).join(', '),
            category: holidayDateList[0]?.category || '',
            isBlocking: schoolDayOverlap >= overlapThreshold
        };
    };

    const formatHolidayRange = (h) => {
        const start = moment(h.startDate || h.date);
        const end = moment(h.endDate || h.date);
        const name = h.name || 'Agenda Sekolah';
        if (start.isSame(end, 'day')) return `${start.format('D MMMM YYYY')}: ${name}`;
        if (start.isSame(end, 'month')) return `${start.format('D')}-${end.format('D MMMM YYYY')}: ${name}`;
        return `${start.format('D MMMM')} - ${end.format('D MMMM YYYY')}: ${name}`;
    };

    const semesterHolidays = useMemo(() => {
        if (!userHolidays?.length) return [];
        const years = year.split('/');
        const startMonth = semester === 'Ganjil' ? 7 : 1;
        const endMonth = semester === 'Ganjil' ? 12 : 6;
        const startYear = semester === 'Ganjil' ? years[0] : years[1];
        const endYear = semester === 'Ganjil' ? years[0] : years[1];
        const semStart = moment(`${startYear}-${startMonth}-01`, 'YYYY-M-D').startOf('month');
        const semEnd = moment(`${endYear}-${endMonth}-01`, 'YYYY-M-D').endOf('month');
        return userHolidays
            .filter(h => {
                const hStart = moment(h.startDate || h.date);
                const hEnd = moment(h.endDate || h.date);
                return hStart.isSameOrBefore(semEnd) && hEnd.isSameOrAfter(semStart);
            })
            .sort((a, b) => moment(a.startDate || a.date).diff(moment(b.startDate || b.date)));
    }, [userHolidays, semester, year]);

    const handleSave = async () => {
        if (!auth.currentUser || !programId) return;
        const errors = [];
        protaSource.forEach(row => {
            let distributed = 0;
            pekanEfektifSource.forEach((month, mIndex) => {
                for (let w = 0; w < parseInt(month.totalWeeks || 4); w++) distributed += parseInt(promesData[`${row.id}_${mIndex}_${w}`] || 0);
            });
            if (distributed !== parseInt(row.jp)) errors.push(`KD ${(row.kd || '').substring(0, 20)}... (Target: ${row.jp}, Isi: ${distributed})`);
        });
        if (errors.length > 0) {
            toast.error("Validasi Gagal: Total JP harus sama dengan Prota.");
            errors.slice(0, 3).forEach(e => toast.error(e));
            if (errors.length > 3) toast.error(`...dan ${errors.length - 3} lainnya.`);
            return;
        }
        setLoading(true);
        try {
            const cleanedData = { ...promesData };
            protaSource.forEach(row => {
                pekanEfektifSource.forEach((month, mIndex) => {
                    for (let w = 0; w < parseInt(month.totalWeeks || 4); w++) {
                        const key = `${row.id}_${mIndex}_${w}`;
                        if (getHolidayForWeek(month.name, w)?.isBlocking && cleanedData[key]) delete cleanedData[key];
                    }
                });
            });
            await updateDoc(doc(db, 'teachingPrograms', programId), { promes: cleanedData, updatedAt: new Date().toISOString() });
            setPromesData(cleanedData);
            toast.success("Program Semester berhasil disimpan!");
        } catch (error) {
            if (error.code === 'not-found' || error.message?.includes('No document to update')) {
                try {
                    await setDoc(doc(db, 'teachingPrograms', programId), {
                        userId: auth.currentUser.uid, subject, gradeLevel: grade, academicYear: year, semester,
                        promes: promesData, updatedAt: new Date().toISOString()
                    }, { merge: true });
                    toast.success("Program Semester dibuat.");
                } catch (e) { toast.error("Gagal menyimpan."); }
            } else { toast.error("Gagal menyimpan data."); }
        } finally { setLoading(false); }
    };

    const handleExportWord = async () => {
        const S = {
            border: 'border: 1px solid black;', cell: 'border: 1px solid black; padding: 4px;',
            header: 'text-align: center; border: 1px solid black; background-color: #f2f2f2;',
            center: 'text-align: center;', bold: 'font-weight: bold;', none: 'border: none;',
            full: 'width: 100%; border-collapse: collapse;',
            bgGreen: 'background-color: #e8f5e9;', bgRed: 'background-color: #ffebee; color: #c62828;'
        };
        let monthHeader = '', weekHeader = '';
        pekanEfektifSource.forEach(m => {
            monthHeader += `<th colspan="${m.totalWeeks || 4}" style="${S.header}">${m.name}</th>`;
            for (let w = 1; w <= (m.totalWeeks || 4); w++) weekHeader += `<th style="${S.header} width: 25px;">${w}</th>`;
        });
        const rows = protaSource.map((row, i) => {
            let cells = '';
            pekanEfektifSource.forEach((m, mIndex) => {
                for (let w = 0; w < (m.totalWeeks || 4); w++) {
                    const key = `${row.id}_${mIndex}_${w}`;
                    const holiday = getHolidayForWeek(m.name, w);
                    const val = promesData[key];
                    let bg = '', content = '';
                    if (holiday?.isBlocking) { bg = S.bgRed; content = 'L'; }
                    else if (val && val !== '0') { bg = S.bgGreen; content = `<strong>${val}</strong>`; }
                    cells += `<td style="${S.border} ${S.center} ${bg}">${content}</td>`;
                }
            });
            return `<tr>
                <td style="${S.cell} ${S.center}">${i + 1}</td>
                <td style="${S.cell}"><div style="font-size:7pt;color:#555;">[${row.elemen || '-'}]</div><div style="${S.bold}">${row.kd || ''}</div></td>
                <td style="${S.cell}">${row.materi || ''}</td>
                <td style="${S.cell} ${S.center}">${row.jp}</td>
                ${cells}
            </tr>`;
        }).join('');

        let holidayHtml = '';
        if (semesterHolidays.length > 0) {
            const mid = Math.ceil(semesterHolidays.length / 2);
            holidayHtml = `<div style="margin-top:15px;font-size:9pt;"><strong>AGENDA & LIBUR:</strong><br>
                <table border="0" style="${S.full} ${S.none}"><tr>
                    <td style="${S.none} width:50%; vertical-align:top; padding:0;"><ul style="margin:0;padding-left:20px;">${semesterHolidays.slice(0, mid).map(h => `<li>${formatHolidayRange(h)}</li>`).join('')}</ul></td>
                    <td style="${S.none} width:50%; vertical-align:top; padding:0;"><ul style="margin:0;padding-left:20px;">${semesterHolidays.slice(mid).map(h => `<li>${formatHolidayRange(h)}</li>`).join('')}</ul></td>
                </tr></table></div>`;
        }

        const html = `
            <h1 style="text-align:center;">PROGRAM SEMESTER (PROMES)</h1>
            <p>Satuan Pendidikan: ${userProfile?.school || '-'}<br/>Mata Pelajaran: ${subject}<br/>Kelas/Semester: ${grade}/${semester}<br/>Tahun Ajaran: ${year}</p>
            <table border="1" cellspacing="0" cellpadding="4" style="${S.full}">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th rowspan="2" style="${S.border} width:40px;">No</th>
                        <th rowspan="2" style="${S.border}">Tujuan Pembelajaran</th>
                        <th rowspan="2" style="${S.border}">Lingkup Materi</th>
                        <th rowspan="2" style="${S.border} width:40px;">JP</th>
                        ${monthHeader}
                    </tr>
                    <tr style="background:#f2f2f2;">${weekHeader}</tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${holidayHtml}
            <table border="0" style="${S.full} margin-top:40px; ${S.none}">
                <tr>
                    <td align="center" style="${S.none} width:50%;">Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/><br/><strong><u>${userProfile?.principalName || '...'}</u></strong><br/>NIP. ${userProfile?.principalNip || '...'}</td>
                    <td align="center" style="${S.none} width:50%;">${signingLocation || '-'}, ${moment().format('DD MMMM YYYY')}<br/>Guru Mata Pelajaran<br/><br/><br/><br/><br/><strong><u>${userProfile?.name || '...'}</u></strong><br/>NIP. ${userProfile?.nip || '...'}</td>
                </tr>
            </table>`;
        exportToDocx(html, `Promes-${subject}-${grade}.docx`, { orientation: 'landscape' });
    };

    const handleExportExcel = async () => {
        try {
            const header1 = ['', '', ''];
            const header2 = ['No', 'Tujuan Pembelajaran / Lingkup Materi', 'Alokasi (JP)'];
            pekanEfektifSource.forEach(month => {
                const wc = parseInt(month.totalWeeks || 4);
                header1.push(month.name);
                for (let i = 1; i < wc; i++) header1.push('');
                for (let i = 1; i <= wc; i++) header2.push(`P${i}`);
            });
            const rows = protaSource.map((row, i) => {
                const r = [i + 1, `${row.kd}\n${row.materi}`, parseInt(row.jp || 0)];
                pekanEfektifSource.forEach((month, mIndex) => {
                    for (let w = 0; w < parseInt(month.totalWeeks || 4); w++) {
                        const val = promesData[`${row.id}_${mIndex}_${w}`] || '';
                        r.push(getHolidayForWeek(month.name, w)?.isBlocking ? 'OFF' : val);
                    }
                });
                return r;
            });
            const XLSX = await import('xlsx');
            const { saveAs } = await import('file-saver');
            const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...rows]);
            const merges = [];
            let col = 3;
            pekanEfektifSource.forEach(m => {
                const wc = parseInt(m.totalWeeks || 4);
                if (wc > 1) merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + wc - 1 } });
                col += wc;
            });
            ws['!merges'] = merges;
            ws['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 12 }, ...Array(40).fill({ wch: 5 })];

            // Append signature rows
            const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const sigRows = [
                [],
                ['Mengetahui,', '', `${signingLocation || '-'}, ${dateStr}`],
                ['Kepala Sekolah', '', 'Guru Mata Pelajaran'],
                [], [], [],
                [userProfile?.principalName || '.....................', '', userProfile?.name || '.....................'],
                [`NIP. ${userProfile?.principalNip || '-'}`, '', `NIP. ${userProfile?.nip || '-'}`]
            ];
            const currentRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            const startRow = currentRange.e.r + 1;
            sigRows.forEach((row, i) => {
                row.forEach((cell, j) => {
                    const cellRef = XLSX.utils.encode_cell({ r: startRow + i, c: j });
                    ws[cellRef] = { v: cell, t: 's' };
                });
            });
            ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: startRow + sigRows.length - 1, c: currentRange.e.c } });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Program Semester");
            saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `Promes-${subject}-${grade}.xlsx`);
            toast.success("Excel Promes berhasil diunduh!");
        } catch (e) { console.error(e); toast.error("Gagal ekspor Excel."); }
    };

    const handleExportPDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF('l', 'mm', 'a4');
            const W = doc.internal.pageSize.getWidth();
            const H = doc.internal.pageSize.getHeight();
            const M = { top: 15, right: 15, bottom: 20, left: 15 };

            doc.setFontSize(14).setFont('helvetica', 'bold');
            doc.text('PROGRAM SEMESTER (PROMES)', W / 2, M.top, { align: 'center' });
            doc.setFontSize(10).setFont('helvetica', 'normal');
            let y = M.top + 10;
            doc.text(`Satuan Pendidikan: ${userProfile?.school || '-'}`, M.left, y);
            doc.text(`Mata Pelajaran: ${subject}`, M.left, y + 5);
            doc.text(`Kelas / Semester: ${grade} / ${semester}`, W / 2, y);
            doc.text(`Tahun Ajaran: ${year}`, W / 2, y + 5);
            y += 15;

            const baseHeader = [
                { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'Tujuan Pembelajaran', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
                { content: 'Lingkup Materi', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
                { content: 'JP', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
            ];
            const monthHeaders = [], weekHeaders = [];
            pekanEfektifSource.forEach(m => {
                monthHeaders.push({ content: m.name, colSpan: m.totalWeeks || 4, styles: { halign: 'center' } });
                for (let w = 1; w <= (m.totalWeeks || 4); w++) weekHeaders.push({ content: w.toString(), styles: { halign: 'center' } });
            });

            const body = protaSource.map((row, i) => {
                const r = [i + 1, { content: `${row.elemen ? `[${row.elemen}]\n` : ''}${row.kd}`, styles: { halign: 'left', fontSize: 6.5 } }, row.materi, row.jp];
                pekanEfektifSource.forEach((m, mIndex) => {
                    for (let w = 0; w < (m.totalWeeks || 4); w++) {
                        const cellKey = `${row.id}_${mIndex}_${w}`;
                        const holiday = getHolidayForWeek(m.name, w);
                        const val = promesData[cellKey];
                        if (holiday?.isBlocking) r.push({ content: 'L', styles: { fillColor: [255, 235, 238], textColor: [198, 40, 40], halign: 'center' } });
                        else if (val && val !== '0') r.push({ content: val.toString(), styles: { fillColor: [232, 245, 233], fontStyle: 'bold', halign: 'center' } });
                        else r.push({ content: '', styles: { halign: 'center' } });
                    }
                });
                return r;
            });

            autoTable(doc, {
                startY: y, head: [[...baseHeader, ...monthHeaders], weekHeaders], body,
                theme: 'grid', headStyles: { fillColor: [37, 99, 235], halign: 'center', lineWidth: 0.1 },
                styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1 }, margin: M,
                tableWidth: W - M.left - M.right,
                columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 45 }, 2: { cellWidth: 35 }, 3: { cellWidth: 8 } }
            });

            let curY = doc.lastAutoTable.finalY + 10;
            if (semesterHolidays.length > 0) {
                if (curY > H - 40) { doc.addPage(); curY = M.top + 5; }
                doc.setFont('helvetica', 'bold').setFontSize(9).text('AGENDA & LIBUR SEKOLAH:', M.left, curY);
                doc.setFont('helvetica', 'normal').setFontSize(8);
                curY += 5;
                const colW = (W - M.left - M.right) / 2;
                const mid = Math.ceil(semesterHolidays.length / 2);
                let bottomY = curY;
                semesterHolidays.forEach((h, idx) => {
                    const col = idx < mid ? 0 : 1;
                    const row = idx < mid ? idx : idx - mid;
                    const x = M.left + col * colW;
                    const yy = curY + row * 4;
                    doc.text(`• ${formatHolidayRange(h)}`, x + 2, yy);
                    if (yy + 4 > bottomY) bottomY = yy + 4;
                });
                curY = bottomY + 15;
            }

            if (curY > H - 50) { doc.addPage(); curY = M.top + 15; }
            const cX = M.left + 50, rX = W - M.right - 50;
            doc.setFontSize(10);
            doc.text('Mengetahui,', cX, curY, { align: 'center' });
            doc.text('Kepala Sekolah', cX, curY + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold').text(userProfile?.principalName || '...', cX, curY + 30, { align: 'center' });
            doc.setFont('helvetica', 'normal').text(`NIP. ${userProfile?.principalNip || '...'}`, cX, curY + 35, { align: 'center' });
            doc.text(`${signingLocation || '-'}, ${moment().format('DD MMMM YYYY')}`, rX, curY, { align: 'center' });
            doc.text('Guru Mata Pelajaran', rX, curY + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold').text(userProfile?.name || '...', rX, curY + 30, { align: 'center' });
            doc.setFont('helvetica', 'normal').text(`NIP. ${userProfile?.nip || '...'}`, rX, curY + 35, { align: 'center' });
            doc.save(`Promes-${subject}-${grade}.pdf`);
            toast.success("PDF Promes berhasil diunduh!");
        } catch (e) { console.error(e); toast.error("Gagal membuat PDF."); }
    };

    const updateCell = (protaId, monthIndex, weekIndex, value) => {
        const key = `${protaId}_${monthIndex}_${weekIndex}`;
        setPromesData(prev => ({ ...prev, [key]: value }));
    };

    const handleAutoDistribute = () => {
        if (!protaSource.length || !pekanEfektifSource.length) {
            toast.error("Lengkapi data Prota dan Pekan Efektif terlebih dahulu.");
            return;
        }
        let weeklyJP = 0;
        if (sharedEfektifData?.jpPerWeek > 0) {
            weeklyJP = sharedEfektifData.jpPerWeek;
        } else {
            const targetSubjectObj = subjects?.find(s => s.name === subject);
            const getAltGrade = (g) => {
                const map = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X', '11': 'XI', '12': 'XII' };
                const rev = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
                return map[g] || rev[g] || g;
            };
            const altGrade = getAltGrade(grade);
            const matchingSchedules = (schedules || []).filter(s => {
                const className = typeof s.class === 'string' ? s.class : s.class?.rombel;
                const gradePattern = new RegExp(`^(?:KELAS\\s+)?(?:${grade}${altGrade ? '|' + altGrade : ''})(?![0-9])`, 'i');
                const isGradeMatch = className && gradePattern.test(className.trim());
                if (targetSubjectObj?.id && s.subjectId) return s.subjectId === targetSubjectObj.id && isGradeMatch;
                return (s.subject || '').trim().toLowerCase() === (subject || '').trim().toLowerCase() && isGradeMatch;
            });
            if (matchingSchedules.length > 0) {
                const firstClass = typeof matchingSchedules[0].class === 'string' ? matchingSchedules[0].class : matchingSchedules[0].class.rombel;
                weeklyJP = matchingSchedules.filter(s => (typeof s.class === 'string' ? s.class : s.class.rombel) === firstClass)
                    .reduce((acc, s) => acc + (parseInt(s.endPeriod) - parseInt(s.startPeriod) + 1), 0);
            }
        }
        if (weeklyJP === 0) { toast.error("Gagal mendeteksi JP per minggu. Pastikan jadwal sudah diisi."); return; }

        const newData = {};
        let currM = 0, currW = 0;
        protaSource.forEach(row => {
            let remaining = parseInt(row.jp);
            while (remaining > 0) {
                while (currM < pekanEfektifSource.length) {
                    const month = pekanEfektifSource[currM];
                    const totalW = parseInt(month.totalWeeks || 4);
                    const nonEff = parseInt(month.nonEffectiveWeeks || 0);
                    const holiday = getHolidayForWeek(month.name, currW);
                    const isHolidayW = holiday?.isBlocking;
                    let specificHolidays = 0;
                    for (let w = 0; w < totalW; w++) { if (getHolidayForWeek(month.name, w)?.isBlocking) specificHolidays++; }
                    const extra = Math.max(0, nonEff - specificHolidays);
                    const shouldSkip = isHolidayW || currW >= (totalW - extra);
                    if (!shouldSkip) break;
                    currW++;
                    if (currW >= totalW) { currW = 0; currM++; if (currM >= pekanEfektifSource.length) break; }
                }
                if (currM >= pekanEfektifSource.length) break;
                newData[`${row.id}_${currM}_${currW}`] = Math.min(remaining, weeklyJP).toString();
                remaining -= Math.min(remaining, weeklyJP);
                currW++;
                if (currW >= parseInt(pekanEfektifSource[currM].totalWeeks || 4)) { currW = 0; currM++; }
            }
        });
        setPromesData(newData);
        toast.success(`JP berhasil didistribusikan (${weeklyJP} JP/minggu).`);
    };

    const handleKeyDown = (e, rIndex, mIndex, wIndex) => {
        const rowCount = protaSource.length;
        let nR = rIndex, nM = mIndex, nW = wIndex;
        if (e.key === 'ArrowUp') { e.preventDefault(); nR = Math.max(0, rIndex - 1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); nR = Math.min(rowCount - 1, rIndex + 1); }
        else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (wIndex > 0) nW = wIndex - 1;
            else if (mIndex > 0) { nM = mIndex - 1; nW = parseInt(pekanEfektifSource[nM].totalWeeks || 4) - 1; }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const wc = parseInt(pekanEfektifSource[mIndex].totalWeeks || 4);
            if (wIndex < wc - 1) nW = wIndex + 1;
            else if (mIndex < pekanEfektifSource.length - 1) { nM = mIndex + 1; nW = 0; }
        } else return;
        document.getElementById(`promes-input-${nR}-${nM}-${nW}`)?.focus();
    };

    if (protaSource.length === 0 || pekanEfektifSource.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Data Belum Lengkap</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                    Lengkapi data <b>Pekan Efektif</b> dan <b>Program Tahunan (Prota)</b> terlebih dahulu.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 text-center md:text-left">
                    <Calendar className="text-blue-600 shrink-0" size={24} />
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Susun Program Semester</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Distribusikan alokasi waktu tahunan ke dalam pekan efektif</p>
                    </div>
                </div>
                <button onClick={handleAutoDistribute} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm font-bold transition-all shadow-sm">
                    <Zap size={16} />Auto-Distribusi
                </button>
            </div>

            <div className="relative overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                            <span className="text-sm font-bold text-blue-900 dark:text-blue-100">Memuat Data...</span>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto max-h-[70vh]">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-blue-600 text-white uppercase font-bold sticky top-0 z-30">
                            <tr>
                                <th rowSpan="2" className="px-2 py-3 border border-blue-500 w-10 sticky left-0 z-40 bg-blue-600">No</th>
                                <th rowSpan="2" className="px-4 py-3 border border-blue-500 min-w-[350px] text-left md:sticky md:left-12 z-40 bg-blue-600 md:shadow-md">Tujuan Pembelajaran / Lingkup Materi</th>
                                <th rowSpan="2" className="px-2 py-3 border border-blue-500 w-24 md:sticky md:left-[398px] z-40 bg-blue-600 md:shadow-md">Alokasi<br />(Target / Isi)</th>
                                {pekanEfektifSource.map((month) => (
                                    <th key={month.name} colSpan={month.totalWeeks || 4} className="px-2 py-2 border border-blue-500 min-w-[120px]">{month.name}</th>
                                ))}
                            </tr>
                            <tr>
                                {pekanEfektifSource.map((month, mIndex) => {
                                    return Array.from({ length: parseInt(month.totalWeeks || 4) }).map((_, wIndex) => (
                                        <th key={`${mIndex}-${wIndex}`} className="px-1 py-1 border border-blue-500 w-8 bg-blue-700 min-w-[30px]">{wIndex + 1}</th>
                                    ));
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                            {!loading && protaSource.map((row, index) => {
                                let currentSum = 0;
                                pekanEfektifSource.forEach((month, mIndex) => {
                                    for (let w = 0; w < parseInt(month.totalWeeks || 4); w++) currentSum += parseInt(promesData[`${row.id}_${mIndex}_${w}`] || 0);
                                });
                                const isMatch = currentSum === parseInt(row.jp);
                                const isOver = currentSum > parseInt(row.jp);
                                return (
                                    <tr key={row.id}>
                                        <td className="border border-gray-200 dark:border-gray-700 p-2 sticky left-0 bg-white dark:bg-gray-800 z-20">{index + 1}</td>
                                        <td className="border border-gray-200 dark:border-gray-700 p-2 text-left md:sticky md:left-12 bg-white dark:bg-gray-800 z-20 md:shadow-md min-w-[350px]">
                                            <div className="font-semibold text-sm">{row.kd}</div>
                                            <div className="text-gray-500 text-xs mt-1">{row.materi}</div>
                                        </td>
                                        <td className={`border border-gray-200 dark:border-gray-700 p-2 font-bold md:sticky md:left-[398px] z-20 md:shadow-md ${isMatch ? 'bg-green-100 text-green-700' : isOver ? 'bg-red-100 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                            {row.jp} / {currentSum}
                                        </td>
                                        {pekanEfektifSource.map((month, mIndex) => {
                                            return Array.from({ length: parseInt(month.totalWeeks || 4) }).map((_, wIndex) => {
                                                const cellKey = `${row.id}_${mIndex}_${wIndex}`;
                                                const val = promesData[cellKey] || '';
                                                const hasValue = val !== '' && val !== '0';
                                                const monthData = pekanEfektifSource[mIndex];
                                                const totalWeeks = parseInt(monthData.totalWeeks || 4);
                                                const nonEffectiveWeeks = parseInt(monthData.nonEffectiveWeeks || 0);
                                                const holiday = getHolidayForWeek(month.name, wIndex);
                                                const isHoliday = !!holiday;
                                                const isBlockingHoliday = isHoliday && holiday.isBlocking;
                                                const isManualNonEffective = !isHoliday && wIndex >= (totalWeeks - nonEffectiveWeeks);
                                                let cellBg = '';
                                                if (hasValue) cellBg = 'bg-green-50 dark:bg-green-900/30';
                                                else if (isHoliday) {
                                                    const cat = (holiday.category || '').toLowerCase();
                                                    const name = (holiday.name || '').toLowerCase();
                                                    if (cat.includes('semester') || name.includes('semester')) cellBg = 'bg-red-50 dark:bg-red-900/40 opacity-80';
                                                    else if (cat.includes('ujian') || name.includes('ujian')) cellBg = 'bg-orange-100 dark:bg-orange-900/40 opacity-80';
                                                    else if (cat === 'tengah_semester' || name.includes('tengah semester')) cellBg = 'bg-purple-50 dark:bg-purple-900/40 opacity-80';
                                                    else cellBg = 'bg-blue-50 dark:bg-blue-900/30 opacity-80';
                                                }
                                                return (
                                                    <td key={cellKey} title={holiday ? holiday.name : isManualNonEffective ? 'Pekan Tidak Efektif' : ''} className={`border border-gray-200 dark:border-gray-700 p-0 hover:bg-gray-50 ${cellBg}`}>
                                                        {(!isBlockingHoliday && !isManualNonEffective) ? (
                                                            <input id={`promes-input-${index}-${mIndex}-${wIndex}`} type="text" value={val} onChange={(e) => updateCell(row.id, mIndex, wIndex, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, mIndex, wIndex)} className="w-full h-8 text-center bg-transparent focus:ring-1 focus:ring-blue-500 outline-none font-medium text-[11px]" />
                                                        ) : (
                                                            <div className="w-full h-8 flex items-center justify-center font-bold text-[10px] text-gray-400">OFF</div>
                                                        )}
                                                    </td>
                                                );
                                            });
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {semesterHolidays.length > 0 && (
                <div className="mt-6 mb-8 p-5 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-100 dark:border-blue-900/50 shadow-sm">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600" />
                        Agenda & Libur Sekolah Semester {semester} TA {year}
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {semesterHolidays.map((h, i) => (
                            <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 border-b border-gray-50 pb-1">
                                <span className="font-bold whitespace-nowrap text-blue-700 dark:text-blue-400">
                                    {moment(h.startDate || h.date).isSame(moment(h.endDate || h.date), 'day')
                                        ? moment(h.startDate || h.date).format('D MMMM YYYY')
                                        : `${moment(h.startDate || h.date).format('D')}-${moment(h.endDate || h.date).format('D MMMM YYYY')}`}:
                                </span>
                                <span>{h.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <SignatureSection userProfile={userProfile} signingLocation={signingLocation} />

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center no-print pt-4 border-t dark:border-gray-700 gap-4">
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"><FileText size={16} />PDF</button>
                    <button onClick={handleExportWord} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"><FileText size={16} />Word</button>
                    <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"><FileSpreadsheet size={16} />Excel</button>
                    <button onClick={() => window.print()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"><Printer size={16} />Cetak</button>
                </div>
                <button onClick={handleSave} disabled={loading} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 shadow-lg font-bold">
                    <Save size={18} />{loading ? 'Menyimpan...' : 'Simpan Promes'}
                </button>
            </div>
        </div>
    );
};

export default PromesView;
