import toast from 'react-hot-toast';

const withLightMode = async (fn) => {
    const root = window.document.documentElement;
    const hasDark = root.classList.contains('dark');
    if (hasDark) {
        root.classList.remove('dark');
        root.classList.add('light');
        // Force a small reflow to let style changes compute
        void root.offsetHeight;
    }
    try {
        return await fn();
    } finally {
        if (hasDark) {
            root.classList.remove('light');
            root.classList.add('dark');
        }
    }
};

/**
 * Formats a quiz answer based on question type.
 */
export const formatAnswer = (q) => {
    if (!q) return '-';

    switch (q.type) {
        case 'pg':
            return q.answer || '-';
        case 'pg_complex':
            return Array.isArray(q.answer) ? q.answer.join(', ') : (q.answer || '-');
        case 'matching':
            if (q.pairs && q.pairs.length > 0) {
                // Helper to clean labels for comparison (e.g. "1. Item" -> "item")
                const clean = (str) => str ? str.toString().replace(/^\d+[.\)]\s*/, '').replace(/^[A-Z][.\)]\s*/i, '').trim().toLowerCase() : '';
                
                const sortedPairs = [...q.pairs].sort((a, b) => {
                    const idxA = q.left_side ? q.left_side.findIndex(l => clean(l) === clean(a.left)) : 0;
                    const idxB = q.left_side ? q.left_side.findIndex(l => clean(l) === clean(b.left)) : 0;
                    return idxA - idxB;
                });

                return sortedPairs.map((p) => {
                    const lIdx = q.left_side ? q.left_side.findIndex(l => clean(l) === clean(p.left)) : -1;
                    const rIdx = q.right_side ? q.right_side.findIndex(r => clean(r) === clean(p.right)) : -1;
                    const numLabel = lIdx !== -1 ? (lIdx + 1) : '?';
                    const letterLabel = rIdx !== -1 ? String.fromCharCode(65 + rIdx) : '?';
                    return `${numLabel}-${letterLabel}`;
                }).join(', ');
            }
            return '-';
        case 'pg_matrix':
            if (Array.isArray(q.answer)) {
                return q.answer.map(ans => `${ans.row}: ${ans.column}`).join('; ');
            }
            return '-';
        case 'true_false':
            if (q.statements && q.statements.length > 0) {
                return q.statements.map((s, i) => `${i + 1}-${s.isCorrect ? 'B' : 'S'}`).join(', ');
            }
            return '-';
        case 'sequencing':
            if (q.correct_order && Array.isArray(q.correct_order)) {
                return q.correct_order.join(' → ');
            }
            return '-';
        case 'short_answer':
            return q.answer || '-';
        default:
            return q.answer || '-';
    }
};

/**
 * Exports quiz to Word document.
 */
export const exportWord = async ({ quizResult, subject, gradeLevel, topic, userProfile, signingLocation }) => {
    const { asBlob } = await import("html-docx-js-typescript");
    const { saveAs } = await import("file-saver");
    const { default: html2canvas } = await import("html2canvas");
    if (!quizResult) return;

    return withLightMode(async () => {
        // Pre-capture visualizations
        const visImages = {};
        for (let idx = 0; idx < quizResult.questions.length; idx++) {
            const visEl = document.getElementById(`quiz-visualization-${idx}`);
            if (visEl) {
                try {
                    const canvas = await html2canvas(visEl, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff'
                    });
                    visImages[idx] = canvas.toDataURL('image/png');
                } catch (e) {
                    console.error("Failed to render visualization for Word export", idx, e);
                }
            }
        }

        let html = `
            <h1>${quizResult.title || 'Soal Ujian'}</h1>
            <p><strong>Mapel:</strong> ${subject || '-'} | <strong>Kelas:</strong> ${gradeLevel || '-'}</p>
            <p><strong>Topik:</strong> ${topic || '-'}</p>
            <hr/>
        `;

        quizResult.questions.forEach((q, idx) => {
            html += `<div style="margin-bottom: 20px;">`;
            let combinedText = '';
            if (q.stimulus) {
                combinedText += `${q.stimulus.replace(/\n/g, '<br/>')}<br/><br/>`;
            }

            if (q.visualization && q.visualization.type === 'image') {
                const desc = q.visualization.config?.description || '';
                const cleanDesc = desc.replace(/^\[+/, '').replace(/\]+$/, '');
                combinedText += `
                    <div style="margin: 15px 0; border: 2px dashed #3B82F6; border-radius: 10px; background-color: #f8fafc; padding: 20px; text-align: center;">
                        <p style="margin: 0; color: #1d4ed8; font-weight: bold; font-size: 10pt;">[ TEMPAT GAMBAR ]</p>
                        <p style="margin: 5px 0 0 0; color: #475569; font-size: 9pt; font-style: italic;">Instruksi: ${cleanDesc}</p>
                    </div><br/>
                `;
            } else if (q.visualization && q.visualization.type === 'spreadsheet') {
                const config = q.visualization.config || {};
                const data = config.data || [];
                const colCount = data.length > 0 && data[0].row ? data[0].row.length : 0;
                
                let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 15px 0; font-family: monospace; font-size: 10pt;">';
                
                // Header (A, B, C...)
                tableHtml += '<tr style="background-color: #e5e7eb;"><td style="width:30px;"></td>';
                for(let c = 0; c < colCount; c++) {
                    const letter = String.fromCharCode((c % 26) + 65);
                    tableHtml += `<td style="text-align: center; font-weight: bold; padding: 2px;">${letter}</td>`;
                }
                tableHtml += '</tr>';

                // Data Rows
                data.forEach((rowObj, rIdx) => {
                    tableHtml += '<tr>';
                    tableHtml += `<td style="background-color: #f3f4f6; text-align: center; font-weight: bold; padding: 2px;">${rIdx + 1}</td>`;
                    const cells = rowObj.row || [];
                    for(let c = 0; c < colCount; c++) {
                        tableHtml += `<td style="padding: 4px;">${cells[c] || ''}</td>`;
                    }
                    tableHtml += '</tr>';
                });
                tableHtml += '</table><br/>';
                combinedText += tableHtml;
            } else if (visImages[idx]) {
                combinedText += `
                    <div style="margin: 15px 0; text-align: center;">
                        <img src="${visImages[idx]}" width="450" style="max-width: 100%; height: auto;" />
                    </div><br/>
                `;
            } else if (q.image_hint) {
                const cleanHint = q.image_hint.replace(/^\[+/, '').replace(/\]+$/, '');
                combinedText += `
                    <div style="margin: 15px 0; border: 2px dashed #3B82F6; border-radius: 10px; background-color: #f8fafc; padding: 20px; text-align: center;">
                        <p style="margin: 0; color: #1d4ed8; font-weight: bold; font-size: 10pt;">[ TEMPAT GAMBAR ]</p>
                        <p style="margin: 5px 0 0 0; color: #475569; font-size: 9pt; font-style: italic;">Instruksi: ${cleanHint}</p>
                    </div><br/>
                `;
            }

            combinedText += q.question;
            html += `<p><strong>${idx + 1}.</strong> ${combinedText}</p>`;

            if (q.type === 'pg' || q.type === 'pg_complex') {
                html += '<ul>';
                q.options.forEach((opt, oIdx) => {
                    html += `<li>${String.fromCharCode(65 + oIdx)}. ${opt}</li>`;
                });
                html += '</ul>';
            } else if (q.type === 'pg_matrix') {
                html += '<table border="1" style="border-collapse: collapse; width: 100%; margin-top: 10px;">';
                html += '<tr style="background-color: #f3f4f6;">';
                html += '<th style="border: 1px solid #000; padding: 5px;">Pernyataan</th>';
                q.columns.forEach(col => {
                    html += `<th style="border: 1px solid #000; padding: 5px; text-align: center;">${col}</th>`;
                });
                html += '</tr>';
                q.rows.forEach(row => {
                    html += '<tr>';
                    html += `<td style="border: 1px solid #000; padding: 5px;">${row}</td>`;
                    q.columns.forEach(() => {
                        html += '<td style="border: 1px solid #000; padding: 5px; text-align: center;">[ ]</td>';
                    });
                    html += '</tr>';
                });
                html += '</table>';
            } else if (q.type === 'matching') {
                html += `<table style="width:100%; border:none;"><tr>`;
                html += `<td style="vertical-align:top; width:45%;">`;
                q.left_side.forEach((l, i) => html += `<p>${i + 1}. ${l}</p>`);
                html += `</td><td style="width:10%;"></td><td style="vertical-align:top; width:45%;">`;
                q.right_side.forEach((r, i) => html += `<p>${String.fromCharCode(65 + i)}. ${r}</p>`);
                html += `</td></tr></table>`;
            } else if (q.type === 'true_false') {
                html += `<table border="1" style="border-collapse:collapse; width:100%;"><tr><th>Pernyataan</th><th>Benar</th><th>Salah</th></tr>`;
                q.statements.forEach(s => {
                    html += `<tr><td>${s.text}</td><td style="text-align:center;"></td><td style="text-align:center;"></td></tr>`;
                });
                html += `</table>`;
            } else if (q.type === 'short_answer') {
                html += `<p style="margin-left: 10px; border-bottom: 1px dotted #ccc; width: 300px; padding-bottom: 5px; color: #888;">Jawab: ............................................................</p>`;
            } else if (q.type === 'sequencing' && q.items) {
                html += `<ul style="list-style-type: decimal;">`;
                q.items.forEach(item => {
                    html += `<li style="margin-bottom: 5px;">${item}</li>`;
                });
                html += `</ul>`;
            }
            html += `</div>`;
        });

        html += `<br/><br/><hr/><h3>Kunci Jawaban</h3>`;
        quizResult.questions.forEach((q, idx) => {
            html += `<p><strong>${idx + 1}.</strong> ${formatAnswer(q)} (${q.type})</p>`;
        });

        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        if (userProfile) {
            html += `
                <br/><br/>
                <table style="width: 100%; border: none; margin-top: 30px;">
                    <tr>
                        <td align="center" style="border: none; width: 50%;">
                            Mengetahui,<br/>Kepala Sekolah
                            <br/><br/><br/><br/>
                            <strong>${userProfile.principalName || '.....................................'}</strong><br/>
                            NIP. ${userProfile.principalNip || '...................'}
                        </td>
                        <td align="center" style="border: none; width: 50%;">
                            ${signingLocation || 'Jakarta'}, ${dateStr}<br/>Guru Mata Pelajaran
                            <br/><br/><br/><br/>
                            <strong>${userProfile.name || '.....................................'}</strong><br/>
                            NIP. ${userProfile.nip || '...................'}
                        </td>
                    </tr>
                </table>
            `;
        }

        try {
            const blob = await asBlob(html);
            saveAs(blob, `Soal-${topic}-${gradeLevel}.docx`);
            toast.success("Download Word Berhasil");
        } catch (e) {
            console.error(e);
            toast.error("Gagal export Word");
        }
    });
};

/**
 * Exports quiz to PDF document.
 */
export const exportPDF = async ({ quizResult, subject, gradeLevel, topic, userProfile, signingLocation }) => {
    const { jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    if (!quizResult) return;

    return withLightMode(async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(quizResult.title || 'Soal Ujian', pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Mapel: ${subject || userProfile?.school || '-'} | Kelas: ${gradeLevel || '-'} | Topik: ${topic || '-'}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;

        for (let idx = 0; idx < quizResult.questions.length; idx++) {
            const el = document.getElementById(`quiz-question-${idx}`);
            if (el) {
                try {
                    const canvas = await html2canvas(el, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff'
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = pageWidth - 40;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    if (yPos + imgHeight > pageHeight - 20) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 10;
                } catch (e) {
                    console.error("Failed to capture question", idx, e);
                    doc.text(`${idx + 1}. [Gagal memuat visual soal]`, 20, yPos);
                    yPos += 10;
                }
            }
        }

        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Kunci Jawaban', 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        quizResult.questions.forEach((q, idx) => {
            if (yPos > 280) { doc.addPage(); yPos = 20; }
            doc.text(`${idx + 1}. ${formatAnswer(q)} (${q.type})`, 20, yPos);
            yPos += 6;
        });

        // Add signatures
        if (userProfile) {
            if (yPos > pageHeight - 50) { doc.addPage(); yPos = 20; }
            yPos += 15;
            const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const leftX = 40, rightX = pageWidth - 40;
            doc.text('Mengetahui,', leftX, yPos, { align: 'center' });
            doc.text('Kepala Sekolah', leftX, yPos + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold').text(userProfile.principalName || '.......................', leftX, yPos + 25, { align: 'center' });
            doc.setFont('helvetica', 'normal').text(`NIP. ${userProfile.principalNip || '-'}`, leftX, yPos + 30, { align: 'center' });
            doc.text(`${signingLocation || 'Jakarta'}, ${dateStr}`, rightX, yPos, { align: 'center' });
            doc.text('Guru Mata Pelajaran', rightX, yPos + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold').text(userProfile.name || '.......................', rightX, yPos + 25, { align: 'center' });
            doc.setFont('helvetica', 'normal').text(`NIP. ${userProfile.nip || '-'}`, rightX, yPos + 30, { align: 'center' });
        }

        doc.save(`Soal-${(topic || 'Kuis').replace(/\s+/g, '_')}-${gradeLevel || 'Global'}.pdf`);
        toast.success("Download PDF Berhasil");
    });
};

/**
 * Exports Kartu Soal to PDF.
 */
export const exportKartuSoalPDF = async ({ quizResult, topic, subject, gradeLevel, userProfile, signingLocation }) => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    if (!quizResult) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    quizResult.questions.forEach((q, idx) => {
        if (idx > 0) doc.addPage('a4', 'l');
        let currentY = 15;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("KARTU SOAL", pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const schLabel = userProfile.school.includes('SMA') ? 'SMA' : userProfile.school.includes('SMP') ? 'SMP' : 'SD';
        const metadata = [
            [`Jenis Sekolah : ${schLabel}`, `Kurikulum : Merdeka`, `Nama Penyusun : ${userProfile.name || '-'}`],
            [`Bahan Kelas : ${gradeLevel || '-'}`, `Mata Pelajaran : ${subject || '-'}`, `Unit Kerja : ${userProfile.school || '-'}`],
            [`Program Studi : -`, ``, ``]
        ];
        const colW = (pageWidth - 30) / 3;
        metadata.forEach((row, rIdx) => {
            doc.text(row[0], 15, currentY + (rIdx * 5));
            doc.text(row[1], 15 + colW, currentY + (rIdx * 5));
            doc.text(row[2], 15 + (colW * 2), currentY + (rIdx * 5));
        });
        currentY += 18;

        let questionContent = '';
        if (q.stimulus && q.stimulus.trim() !== '' && !q.stimulus.includes('Lihat stimulus')) {
            const cleanStimulus = q.stimulus.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            questionContent += `${cleanStimulus}\n\n`;
        }
        const cleanQuestion = q.question.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (q.image_hint) {
            questionContent += `\n\n--------------------------------------------------\n[ TEMPAT GAMBAR ]\nInstruksi: ${q.image_hint}\n--------------------------------------------------\n\n`;
        }
        questionContent += cleanQuestion;

        if ((q.type === 'pg' || q.type === 'pg_complex') && q.options && q.options.length > 0) {
            questionContent += '\n\nOPSI JAWABAN:\n';
            q.options.forEach((opt, oIdx) => {
                let cleanOpt = opt.replace(/<[^>]*>/g, ' ').trim();
                const labelRegex = new RegExp(`^${String.fromCharCode(65 + oIdx)}[.\\)]\\s*`, 'i');
                cleanOpt = cleanOpt.replace(labelRegex, '');
                questionContent += `${String.fromCharCode(65 + oIdx)}. ${cleanOpt}\n`;
            });
        }

        if (q.type === 'matching' && q.left_side && q.right_side) {
            questionContent += '\n\nKOLOM KIRI:\n';
            q.left_side.forEach((l, i) => questionContent += `${i + 1}. ${l}\n`);
            questionContent += '\nKOLOM KANAN:\n';
            q.right_side.forEach((r, i) => questionContent += `${String.fromCharCode(65 + i)}. ${r}\n`);
        }

        if (q.type === 'true_false' && q.statements && q.statements.length > 0) {
            questionContent += '\n\nPERNYATAAN:\n';
            q.statements.forEach((s, i) => questionContent += `${i + 1}. ${s.text}\n`);
        }

        if (q.type === 'pg_matrix' && q.rows && q.columns) {
            questionContent += '\n\nPERNYATAAN (TABEL):\n';
            q.rows.forEach((row, rIdx) => { questionContent += `${rIdx + 1}. ${row}\n`; });
            questionContent += '\nOPSI KATEGORI:\n';
            q.columns.forEach((col, cIdx) => { questionContent += `${String.fromCharCode(65 + cIdx)}. ${col}\n`; });
        }

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 }, 2: { cellWidth: 'auto' } },
            body: [
                [
                    { content: 'Kompetensi yang diuji', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                    { content: 'Buku Sumber :', styles: { fontStyle: 'bold' } },
                    { content: 'DETAIL SOAL', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }
                ],
                [
                    { content: q.competency || '-', rowSpan: 2 },
                    { content: 'No. Soal', styles: { fillColor: [240, 240, 240], halign: 'center', fontStyle: 'bold' } },
                    { content: questionContent, rowSpan: 5, styles: { valign: 'top', fontSize: 9 } }
                ],
                [{ content: String(idx + 1), styles: { halign: 'center', fontSize: 13, fontStyle: 'bold', minCellHeight: 15 } }],
                [
                    { content: 'Materi', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                    { content: 'Kunci Jawaban', styles: { fillColor: [240, 240, 240], halign: 'center', fontStyle: 'bold' } }
                ],
                [
                    { content: q.pedagogical_materi || topic || '-', minCellHeight: 10 },
                    { content: formatAnswer(q), styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } }
                ],
                [{ content: 'Indikator Soal', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }, colSpan: 2 }],
                [{ content: q.indicator || '-', colSpan: 2, styles: { minCellHeight: 25, verticalAlign: 'top' } }]
            ],
            margin: { left: 15, right: 15, bottom: 10 },
            pageBreak: 'avoid'
        });
    });

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 150;
    if (finalY > 150) doc.addPage();

    doc.setFontSize(10);
    const sigY = finalY > 150 ? 30 : finalY + 20;

    doc.text(`Mengetahui,`, 20, sigY);
    doc.text(`Kepala Sekolah`, 20, sigY + 5);
    doc.text(`( ${userProfile.principalName || '.......................'} )`, 20, sigY + 25);
    doc.text(`NIP. ${userProfile.principalNip || '-'}`, 20, sigY + 30);

    doc.text(`${signingLocation || 'Jakarta'}, ${dateStr}`, pageWidth - 60, sigY);
    doc.text('Guru Mata Pelajaran', pageWidth - 60, sigY + 5);
    doc.text(`( ${userProfile.name || '.......................'} )`, pageWidth - 60, sigY + 25);
    doc.text(`NIP. ${userProfile.nip || '-'}`, pageWidth - 60, sigY + 30);

    doc.save(`Kartu_Soal-${(topic || 'Kuis').replace(/\s+/g, '_')}.pdf`);
    toast.success("Kartu Soal PDF Berhasil");
};

/**
 * Exports Kartu Soal to Word.
 */
export const exportKartuSoalWord = async ({ quizResult, topic, subject, gradeLevel, userProfile, signingLocation }) => {
    const { asBlob } = await import("html-docx-js-typescript");
    const { saveAs } = await import("file-saver");
    const { default: html2canvas } = await import("html2canvas");
    if (!quizResult) return;

    return withLightMode(async () => {
        // Pre-capture visualizations
        const visImages = {};
        for (let idx = 0; idx < quizResult.questions.length; idx++) {
            const visEl = document.getElementById(`quiz-visualization-${idx}`);
            if (visEl) {
                try {
                    const canvas = await html2canvas(visEl, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff'
                    });
                    visImages[idx] = canvas.toDataURL('image/png');
                } catch (e) {
                    console.error("Failed to render visualization for Word export", idx, e);
                }
            }
        }

        let html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        @page {size: A4 landscape; margin: 1cm; mso-page-orientation: landscape;}
                        body {font-family: 'Times New Roman', serif; font-size: 11pt; }
                        table {width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
                        th, td {border: 1px solid black; padding: 10px; vertical-align: top; word-wrap: break-word; }
                        .no-border, .no-border td {border: none !important; }
                        .bg-gray {background-color: #f3f4f6; }
                    </style>
                </head>
                <body>
        `;

        quizResult.questions.forEach((q, idx) => {
            html += `
                <div style="page-break-after: always;">
                    <h3 style="text-align:center;">KARTU SOAL</h3>
                    <table class="no-border">
                        <tr><td>Jenis Sekolah: ${userProfile.school}</td><td>Kurikulum: Merdeka</td><td>Penyusun: ${userProfile.name}</td></tr>
                        <tr><td>Kelas: ${gradeLevel}</td><td>Mapel: ${subject}</td><td>Unit: ${userProfile.school}</td></tr>
                    </table>
                    <table>
                        <tr class="bg-gray">
                            <td width="25%"><strong>Deskripsi Pedagogis</strong></td>
                            <td width="20%"><strong>No. Soal & Kunci</strong></td>
                            <td><strong>Rumusan Butir Soal</strong></td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Kompetensi:</strong><br/>${q.competency || '-'}<br/><br/>
                                <strong>Materi:</strong><br/>${q.pedagogical_materi || topic || '-'}<br/><br/>
                                <strong>Indikator:</strong><br/>${q.indicator || '-'}<br/><br/>
                                <strong>Level:</strong> ${q.cognitive_level || '-'}
                            </td>
                            <td align="center" style="font-size:24pt;"><strong>${idx + 1}</strong></td>
                            <td>
                                ${(() => {
                                    let innerHtml = '';
                                    if (q.stimulus && q.stimulus.trim() !== '' && !q.stimulus.includes('Lihat stimulus')) {
                                        innerHtml += `<div style="margin-bottom:10px; font-style:italic;">${q.stimulus}</div>`;
                                    }

                                    if (q.visualization && q.visualization.type === 'image') {
                                        const desc = q.visualization.config?.description || '';
                                        const cleanDesc = desc.replace(/^\[+/, '').replace(/\]+$/, '');
                                        innerHtml += `
                                            <div style="margin: 10px 0; border: 2px dashed #2563eb; background: #f1f5f9; padding: 10px; text-align: center;">
                                                <strong style="color: #1d4ed8; font-size: 9pt;">[ TEMPAT GAMBAR ]</strong><br/>
                                                <span style="font-size: 8pt; color: #64748b; font-style: italic;">${cleanDesc}</span>
                                            </div>
                                        `;
                                    } else if (q.visualization && q.visualization.type === 'spreadsheet') {
                                        const config = q.visualization.config || {};
                                        const data = config.data || [];
                                        const colCount = data.length > 0 && data[0].row ? data[0].row.length : 0;
                                        
                                        innerHtml += '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0; font-family: monospace; font-size: 10pt;">';
                                        
                                        // Header
                                        innerHtml += '<tr style="background-color: #e5e7eb;"><td style="width:30px;"></td>';
                                        for(let c = 0; c < colCount; c++) {
                                            const letter = String.fromCharCode((c % 26) + 65);
                                            innerHtml += `<td style="text-align: center; font-weight: bold; padding: 2px;">${letter}</td>`;
                                        }
                                        innerHtml += '</tr>';

                                        // Data Rows
                                        data.forEach((rowObj, rIdx) => {
                                            innerHtml += '<tr>';
                                            innerHtml += `<td style="background-color: #f3f4f6; text-align: center; font-weight: bold; padding: 2px;">${rIdx + 1}</td>`;
                                            const cells = rowObj.row || [];
                                            for(let c = 0; c < colCount; c++) {
                                                innerHtml += `<td style="padding: 4px;">${cells[c] || ''}</td>`;
                                            }
                                            innerHtml += '</tr>';
                                        });
                                        innerHtml += '</table><br/>';
                                    } else if (visImages[idx]) {
                                        innerHtml += `
                                            <div style="margin: 10px 0; text-align: center;">
                                                <img src="${visImages[idx]}" width="350" style="max-width: 100%; height: auto;" />
                                            </div>
                                        `;
                                    } else if (q.image_hint) {
                                        const cleanHint = q.image_hint.replace(/^\[+/, '').replace(/\]+$/, '');
                                        innerHtml += `
                                            <div style="margin: 10px 0; border: 2px dashed #2563eb; background: #f1f5f9; padding: 10px; text-align: center;">
                                                <strong style="color: #1d4ed8; font-size: 9pt;">[ TEMPAT GAMBAR ]</strong><br/>
                                                <span style="font-size: 8pt; color: #64748b; font-style: italic;">${cleanHint}</span>
                                            </div>
                                        `;
                                    }

                                    innerHtml += `<div style="margin-bottom:10px;"><strong>${q.question}</strong></div>`;
                                    if ((q.type === 'pg' || q.type === 'pg_complex') && q.options && q.options.length > 0) {
                                        innerHtml += '<div><strong>OPSI JAWABAN:</strong><br/>';
                                        q.options.forEach((opt, oIdx) => { innerHtml += `${String.fromCharCode(65 + oIdx)}. ${opt}<br/>`; });
                                        innerHtml += '</div>';
                                    }
                                    if (q.type === 'matching' && q.left_side && q.right_side) {
                                        innerHtml += '<div style="margin-top:10px;"><strong>KOLOM KIRI:</strong><br/>';
                                        q.left_side.forEach((l, i) => innerHtml += `${i + 1}. ${l}<br/>`);
                                        innerHtml += '<br/><strong>KOLOM KANAN:</strong><br/>';
                                        q.right_side.forEach((r, i) => innerHtml += `${String.fromCharCode(65 + i)}. ${r}<br/>`);
                                        innerHtml += '</div>';
                                    }
                                    if (q.type === 'true_false' && q.statements && q.statements.length > 0) {
                                        innerHtml += '<div style="margin-top:10px;"><strong>PERNYATAAN:</strong><br/>';
                                        q.statements.forEach((s, i) => innerHtml += `${i + 1}. ${s.text}<br/>`);
                                        innerHtml += '</div>';
                                    }
                                    return innerHtml;
                                })()}
                            </td>
                        </tr>
                        <tr class="bg-gray"><td align="center"><strong>Kunci</strong></td></tr>
                        <tr><td align="center"><strong>${formatAnswer(q)}</strong></td></tr>
                    </table>
                </div>
            `;
        });

        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        html += `
            <br/><div style="page-break-inside: avoid; display: flex; justify-content: space-between; margin-top: 30px; font-family: 'Times New Roman', serif;">
                <div style="float: left; width: 40%; text-align: center;">
                    <p>Mengetahui,<br/>Kepala Sekolah</p><br/><br/><br/>
                    <p>( ${userProfile.principalName || '.......................'} )<br/>NIP. ${userProfile.principalNip || '-'}</p>
                </div>
                <div style="float: right; width: 40%; text-align: center;">
                    <p>${signingLocation || 'Jakarta'}, ${dateStr}<br/>Guru Mata Pelajaran</p><br/><br/><br/>
                    <p>( ${userProfile.name || '.......................'} )<br/>NIP. ${userProfile.nip || '-'}</p>
                </div>
                <div style="clear: both;"></div>
            </div>
        </body></html>`;

        try {
            const blob = await asBlob(html);
            saveAs(blob, `Kartu_Soal-${topic.replace(/\s+/g, '_')}.docx`);
            toast.success("Kartu Soal Word Berhasil");
        } catch (e) {
            console.error("Gagal export Word:", e);
            toast.error("Gagal export Kartu Soal");
        }
    });
};

/**
 * Exports Kisi-Kisi to PDF.
 */
export const exportKisiKisiPDF = async ({ quizResult, topic, subject, gradeLevel, userProfile, activeSemester, signingLocation }) => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    if (!quizResult) return;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('KISI-KISI PENULISAN SOAL', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    const startY = 25;
    doc.text(`Satuan Pendidikan : ${userProfile.school || '-'}`, 15, startY);
    doc.text(`Mata Pelajaran : ${subject || '-'}`, 15, startY + 5);
    doc.text(`Kurikulum : Merdeka`, 15, startY + 10);
    doc.text(`Kelas/Semester : ${gradeLevel || '-'}/${quizResult?.context_semester || activeSemester || '-'}`, pageWidth - 80, startY);
    doc.text(`Jumlah Soal : ${quizResult.questions.length}`, pageWidth - 80, startY + 5);
    doc.text(`Penyusun : ${userProfile.name || '-'}`, pageWidth - 80, startY + 10);

    const tableBody = quizResult.questions.map((q, idx) => [
        idx + 1,
        q.competency || '-',
        q.pedagogical_materi || topic || '-',
        `${gradeLevel || '-'}/${quizResult?.context_semester || activeSemester || '-'}`,
        q.indicator || '-',
        q.cognitive_level || 'L1/L2/L3',
        q.type.toUpperCase().replace('_', ' '),
        idx + 1
    ]);

    autoTable(doc, {
        startY: startY + 18,
        head: [['No', 'Kompetensi Dasar / CP', 'Materi', 'Kls/Sem', 'Indikator Soal', 'Lvl Kognitif', 'Bentuk Soal', 'No Soal']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 70 }, 2: { cellWidth: 55 }, 3: { cellWidth: 25, halign: 'center' }, 4: { cellWidth: 80 }, 5: { cellWidth: 20, halign: 'center' }, 6: { cellWidth: 20, halign: 'center' }, 7: { cellWidth: 12, halign: 'center' } },
        margin: { left: 15, right: 15 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 180) {
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`${signingLocation || 'Jakarta'}, ${dateStr}`, pageWidth - 50, finalY, { align: 'center' });
        doc.text('Guru Mata Pelajaran', pageWidth - 50, finalY + 5, { align: 'center' });
        doc.text(`( ${userProfile.name || '.......................'} )`, pageWidth - 50, finalY + 25, { align: 'center' });
        doc.text(`NIP. ${userProfile.nip || '-'}`, pageWidth - 50, finalY + 30, { align: 'center' });
    }

    doc.save(`Kisi-Kisi_${(topic || 'Kuis').replace(/\s+/g, '_')}.pdf`);
    toast.success("Kisi-kisi PDF berhasil didownload!");
};

/**
 * Exports Kisi-Kisi to Word.
 */
export const exportKisiKisiWord = async ({ quizResult, topic, subject, gradeLevel, userProfile, activeSemester, signingLocation }) => {
    const { asBlob } = await import("html-docx-js-typescript");
    const { saveAs } = await import("file-saver");
    if (!quizResult) return;
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {size: A4 landscape; margin: 1cm; mso-page-orientation: landscape;}
                    body {font-family: 'Times New Roman', serif; }
                    table {width: 100%; border-collapse: collapse; }
                    th, td {border: 1px solid black; padding: 5px; vertical-align: top; }
                    th {background-color: #f0f0f0; font-weight: bold; text-align: center; }
                </style>
            </head>
            <body>
                <h3 style="text-align:center;">KISI-KISI PENULISAN SOAL</h3>
                <div style="margin-bottom:20px;">
                    <table style="border:none;">
                        <tr style="border:none;"><td style="border:none;">Satuan Pendidikan: ${userProfile.school}</td><td style="border:none;">Kelas/Semester: ${gradeLevel}/${quizResult?.context_semester || activeSemester}</td></tr>
                        <tr style="border:none;"><td style="border:none;">Mata Pelajaran: ${subject}</td><td style="border:none;">Jumlah Soal: ${quizResult.questions.length}</td></tr>
                        <tr style="border:none;"><td style="border:none;">Kurikulum: Merdeka</td><td style="border:none;">Penyusun: ${userProfile.name}</td></tr>
                    </table>
                </div>
                <table>
                    <thead>
                        <tr><th width="5%">No</th><th width="20%">Kompetensi Dasar / CP</th><th width="15%">Materi</th><th width="10%">Kls/Sem</th><th width="25%">Indikator Soal</th><th width="10%">Level Kognitif</th><th width="10%">Bentuk Soal</th><th width="5%">No Soal</th></tr>
                    </thead>
                    <tbody>
                        ${quizResult.questions.map((q, idx) => `
                        <tr>
                            <td align="center">${idx + 1}</td>
                            <td>${q.competency || '-'}</td>
                            <td>${q.pedagogical_materi || topic || '-'}</td>
                            <td align="center">${gradeLevel || '-'}/${quizResult?.context_semester || activeSemester || '-'}</td>
                            <td>${q.indicator || '-'}</td>
                            <td align="center">${q.cognitive_level || 'L1/L2/L3'}</td>
                            <td align="center">${q.type.toUpperCase().replace('_', ' ')}</td>
                            <td align="center">${idx + 1}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                <div style="margin-top:20px; text-align:right;">
                    <p>${signingLocation || 'Jakarta'}, ${dateStr}</p><p>Guru Mata Pelajaran</p><br/><br/><br/>
                    <p>( ${userProfile.name || '.......................'} )</p><p>NIP. ${userProfile.nip || '-'}</p>
                </div>
            </body>
        </html>
    `;

    try {
        const blob = await asBlob(html);
        saveAs(blob, `Kisi-Kisi_${(topic || 'Kuis').replace(/\s+/g, '_')}.docx`);
        toast.success("Kisi-kisi Word berhasil didownload!");
    } catch (error) {
        console.error(error);
        toast.error("Gagal export Kisi-kisi Word");
    }
};
