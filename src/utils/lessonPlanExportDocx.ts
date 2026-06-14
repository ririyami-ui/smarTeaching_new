import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    ImageRun,
    BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * High-Fidelity RPP (Lesson Plan) DOCX Generator
 * Uses 'docx' library for native Word document structure.
 */
export const exportLessonPlanToDocx = async (
    title: string,
    content: string,
    profile: any,
    location: string,
    visualImages: string[] = []
) => {
    const allChildren: any[] = [];

    // --- Header / Title ---
    allChildren.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            border: {
                bottom: { color: "000000", space: 1, value: BorderStyle.DOUBLE, size: 24 },
            },
            children: [
                new TextRun({
                    text: "RENCANA PELAKSANAAN PEMBELAJARAN (RPP)",
                    bold: true,
                    size: 28, // 14pt
                    font: "Times New Roman",
                }),
                new TextRun({
                    text: `\n${title.toUpperCase()}`,
                    bold: true,
                    size: 24, // 12pt
                    font: "Times New Roman",
                }),
            ],
        })
    );

    // --- Content Processing ---
    // Handle Markdown content with simple parser
    const paragraphs = content.split(/\n\s*\n/);
    let visualIdx = 0;

    for (let pText of paragraphs) {
        const trimmed = pText.trim();
        if (!trimmed) continue;

        // Detect Visualizations (represented as JSON or specific blocks in RPP)
        if (trimmed.includes('{"type":') || trimmed.includes('```mermaid') || trimmed.includes('```chart')) {
            if (visualImages[visualIdx]) {
                try {
                    const base64Data = visualImages[visualIdx].split(',')[1];
                    allChildren.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200, after: 200 },
                            children: [
                                new ImageRun({
                                    data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
                                    transformation: {
                                        width: 480,
                                        height: 280,
                                    },
                                }),
                            ],
                        })
                    );
                    visualIdx++;
                } catch (e) {
                    console.error("Image processing error", e);
                }
            }
            continue;
        }

        // Handle MD Headings
        if (trimmed.startsWith('#')) {
            const level = (trimmed.match(/^#+/) || [''])[0].length;
            const text = trimmed.replace(/^#+\s+/, '');
            allChildren.push(
                new Paragraph({
                    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                    children: [new TextRun({ text, bold: true, font: "Times New Roman", size: 24 })],
                })
            );
            continue;
        }

        // Handle Tables
        if (trimmed.startsWith('|')) {
            const lines = trimmed.split('\n');
            const tableRows: any[] = [];
            for (const line of lines) {
                const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
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
                    children: [new TextRun({ text: lTrim.replace(/^[-*]\s+|\d+\.\s+/, ''), font: "Times New Roman", size: 22 })],
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

    // --- Signature Section ---
    allChildren.push(
        new Paragraph({ spacing: { before: 600 } }),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Mengetahui,")] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Kepala Sekolah", bold: true })] }),
                                new Paragraph({ spacing: { before: 1200 } }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.principalName || '.....................................', bold: true, underline: {} })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`NIP. ${profile.principalNip || '...................'}`)] }),
                            ],
                        }),
                        new TableCell({
                            children: [
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`${location}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`)] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Guru Mata Pelajaran", bold: true })] }),
                                new Paragraph({ spacing: { before: 1200 } }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.name || '.....................................', bold: true, underline: {} })] }),
                                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`NIP. ${profile.nip || '...................'}`)] }),
                            ],
                        }),
                    ],
                }),
            ],
        })
    );

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { size: 22, font: "Times New Roman", color: "000000" },
                    paragraph: { spacing: { line: 360, after: 120 } },
                },
            },
        },
        sections: [{
            properties: {
                page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
            },
            children: allChildren,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `RPP_${title.replace(/\s+/g, '_')}.docx`);
};

// Simple bold/italic parser
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
