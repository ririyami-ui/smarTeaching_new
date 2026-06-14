import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    AlignmentType,
    WidthType,
    ImageRun,
    PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Advanced DOCX Generator for Portfolio
 * Provides true Word-native formatting, consistent fonts, and robust layout control.
 */
export const exportPortfolioToDocx = async (title: string, subtitle: string, subject: string, chapters: any[], chartImages: Record<number, string>) => {
    const allChildren: any[] = [];

    // --- Cover Page ---
    allChildren.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2400 },
            children: [
                new TextRun({
                    text: title,
                    bold: true,
                    size: 48,
                    font: "Times New Roman",
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
                new TextRun({
                    text: subtitle,
                    size: 28,
                    font: "Times New Roman",
                    color: "444444",
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
                new TextRun({
                    text: `Mata Pelajaran: ${subject}`,
                    bold: true,
                    size: 24,
                    font: "Times New Roman",
                    color: "000000",
                }),
            ],
        }),
        new Paragraph({ children: [new PageBreak()] })
    );

    // --- Chapters ---
    for (let i = 0; i < chapters.length; i++) {
        const chap = chapters[i];
        const content = chap.content;
        const chapterId = chap.id;

        // Chapter Title
        allChildren.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: i === 0 ? 0 : 400, after: 300 },
                children: [
                    new TextRun({
                        text: chap.title,
                        bold: true,
                        size: 32,
                        font: "Times New Roman",
                    }),
                ],
            })
        );

        // Process Content - Grouping by double newlines for proper paragraphs
        const paragraphs = content.split(/\n\s*\n/);
        
        for (let pText of paragraphs) {
            const trimmed = pText.trim();
            if (!trimmed) continue;

            // Handle [VISUAL_CHART]
            if (/\[VISUAL_CHART(?::\s*[^\]]+)?\]/.test(trimmed)) {
                if (chartImages[chapterId]) {
                    try {
                        const base64Data = chartImages[chapterId].split(',')[1];
                        allChildren.push(
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 200 },
                                children: [
                                    new ImageRun({
                                        data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
                                        transformation: {
                                            width: 580,
                                            height: 320,
                                        },
                                    }),
                                ],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 200 },
                                children: [
                                    new TextRun({
                                        text: `Gambar ${chapterId}.1: Analisis Visual Data Semester Ini`,
                                        italics: true,
                                        size: 18,
                                        font: "Times New Roman",
                                        color: "666666",
                                    }),
                                ],
                            })
                        );
                    } catch (e) {
                        console.error("Image processing error", e);
                    }
                }
                continue;
            }

            // Handle Tables
            if (trimmed.startsWith('|')) {
                const lines = trimmed.split('\n');
                const tableRows: any[] = [];
                for (const line of lines) {
                    const cells = line.split('|').map((c: string) => c.trim()).filter((_: string, idx: number, arr: string[]) => idx > 0 && idx < arr.length - 1);
                    if (cells.length > 0) {
                        if (line.includes('---')) continue;
                        tableRows.push(new TableRow({
                            children: cells.map((cell: string) => new TableCell({
                                children: [new Paragraph({ 
                                    children: [new TextRun({ text: cell, font: "Times New Roman", size: 20 })] 
                                })],
                                shading: tableRows.length === 0 ? { fill: "EEEEEE" } : undefined,
                            })),
                        }));
                    }
                }
                if (tableRows.length > 0) {
                    allChildren.push(new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows,
                    }));
                    allChildren.push(new Paragraph({ spacing: { after: 200 } }));
                }
                continue;
            }

            // Handle Lists
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
                const listLines = trimmed.split('\n');
                for (const lLine of listLines) {
                    const lTrim = lLine.trim();
                    if (!lTrim) continue;
                    allChildren.push(new Paragraph({
                        children: [new TextRun({ text: lTrim.replace(/^[-*]\s+|\d+\.\s+/, ''), font: "Times New Roman", size: 24 })],
                        bullet: lTrim.startsWith('-') || lTrim.startsWith('*') ? { level: 0 } : undefined,
                        numbering: /^\d+\./.test(lTrim) ? { reference: "numbered-list", level: 0 } : undefined,
                        spacing: { after: 100 },
                    }));
                }
                continue;
            }

            // Regular Paragraph
            allChildren.push(new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 200 },
                children: parseFormatting(trimmed.replace(/\n/g, ' ')),
            }));
        }

        // Add page break for next chapter except last one
        if (i < chapters.length - 1) {
            allChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        size: 24,
                        font: "Times New Roman",
                    },
                    paragraph: {
                        spacing: { line: 360, after: 200 }, // 1.5 line spacing (240 is single, 360 is 1.5)
                    },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
            },
            children: allChildren,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Laporan_Portofolio_${subject}_${title.replace(/\s+/g, '_')}.docx`);
};

// Helper to parse bold/italic in string
function parseFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    const regex = /(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)/g;
    const parts = text.split(regex);

    for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('***') && part.endsWith('***')) {
            runs.push(new TextRun({ text: part.slice(3, -3), bold: true, italics: true }));
        } else if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
        } else {
            runs.push(new TextRun({ text: part }));
        }
    }

    return runs;
}
