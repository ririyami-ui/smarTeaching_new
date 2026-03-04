import toast from 'react-hot-toast';

export const MONTH_MAP = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
};

export const exportToDocx = async (htmlContent, fileName, options = {}) => {
    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
                h1 { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20px; }
                .meta { margin-bottom: 15px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th, td { border: 1px solid black; padding: 4px 8px; font-size: 11pt; }
                th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                .text-center { text-align: center; }
                .text-bold { font-weight: bold; }
                .signature-table { border: none; margin-top: 40px; width: 100%; }
                .signature-table td { border: none; text-align: center; vertical-align: top; padding: 0; }
                .signature-name { font-weight: bold; text-decoration: underline; margin-top: 60px; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    try {
        const { asBlob } = await import('html-docx-js-typescript');
        const { saveAs } = await import('file-saver');
        const blob = await asBlob(fullHtml, {
            orientation: options.orientation || 'portrait',
            margins: { top: 720, right: 720, bottom: 720, left: 720 }
        });
        saveAs(blob, fileName);
        toast.success(`Word ${fileName} berhasil diunduh!`);
    } catch (error) {
        console.error("Docx export error:", error);
        toast.error("Gagal mengekspor ke Word.");
    }
};

/**
 * Common formatting for signatures in teaching plans
 */
export const getSignatureHtml = (userProfile, signingLocation) => {
    const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
        <table class="signature-table">
            <tr>
                <td width="50%">
                    Mengetahui,<br/>
                    Kepala Sekolah
                    <div class="signature-name">${userProfile?.principalName || '................................'}</div>
                    NIP. ${userProfile?.principalNip || '................................'}
                </td>
                <td width="50%">
                    ${signingLocation}, ${date}<br/>
                    Guru Mata Pelajaran
                    <div class="signature-name">${userProfile?.name || '................................'}</div>
                    NIP. ${userProfile?.nip || '................................'}
                </td>
            </tr>
        </table>
    `;
};
