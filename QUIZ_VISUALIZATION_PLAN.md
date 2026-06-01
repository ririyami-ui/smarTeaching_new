# QUIZ GENERATOR VISUALIZATION PLAN

## Overview
Add visualization support to Quiz Generator (5% of questions).

## Phase 1: Foundation
- Update data model
- Install libraries
- Create visualization component

## Phase 2: Core Features
- Chart.js integration
- Mermaid integration
- Image support

## Phase 3: Export
- Export to Word/PDF
- Layout preservation

## Phase 4: Polish
- Testing
- Optimization
- Documentation

## Timeline: 4 weeks
Week 1: Foundation
Week 2: Core Features
Week 3: Export
Week 4: Polish

## Success Criteria
- 5% questions have visualization
- All visualizations render correctly
- Export works properly
- Performance acceptable

---

## DETAILED IMPLEMENTATION PLAN

### 1. SCOPE
- **Total Questions:** 100%
- **With Visualization:** 5% (optional, only when needed)
- **Without Visualization:** 95% (text-only, unchanged)

### 2. VISUALIZATION TYPES

#### 2.1 Chart (Chart.js)
- Line chart: Matematika, IPA, Ekonomi
- Bar chart: Geografi, Statistik
- Scatter plot: IPA, Data analysis

#### 2.2 Diagram (Mermaid)
- Flowchart: Informatika, Algoritma
- Timeline: Sejarah, Events
- Graph: Bahasa, Relationships

#### 2.3 Images (HTML)
- Side-by-side layout: Infografis, Comparison
- Responsive: Mobile-friendly

### 3. DATA MODEL

```typescript
interface QuizQuestion {
  type: string;
  question: string;
  stimulus?: string;
  
  // Visualization (optional, ~5%)
  visualization?: {
    type: 'chart' | 'diagram' | 'image';
    config: ChartConfig | MermaidConfig | ImageConfig;
  };
  
  options?: string[];
  answer?: string;
}
```

### 4. IMPLEMENTATION PHASES

#### Phase 1: Foundation (Week 1)
- [ ] Update QuizQuestionType interface
- [ ] Install Chart.js, Mermaid
- [ ] Create VisualizationRenderer component
- [ ] Update AI prompt

#### Phase 2: Core Features (Week 2)
- [ ] Chart.js integration
- [ ] Mermaid integration
- [ ] Image rendering
- [ ] Responsive design

#### Phase 3: Export (Week 3)
- [ ] Chart to image (html2canvas)
- [ ] Diagram to image
- [ ] Word export
- [ ] PDF export

#### Phase 4: Polish (Week 4)
- [ ] Testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Release

### 5. AI PROMPT INSTRUCTION

```
INSTRUKSI VISUALISASI (OPTIONAL):
- Hanya 5% dari total soal yang PERLU visualisasi
- Jika soal membutuhkan grafik/diagram/infografis, 
  tambahkan field 'visualization' dengan config
- Jika soal tidak butuh visualisasi, kosongkan field ini

TIPE VISUALISASI:
1. Chart (grafik data): gunakan chart_config
2. Diagram (flowchart, timeline): gunakan mermaid_config
3. Infografis (gambar): gunakan image_config
```

### 6. TESTING CHECKLIST

- [ ] Chart rendering works
- [ ] Mermaid rendering works
- [ ] Image rendering works
- [ ] Export to Word works
- [ ] Export to PDF works
- [ ] Mobile responsive
- [ ] Performance acceptable

### 7. SUCCESS METRICS

- Render time: <2s
- Export time: <5s
- File size: <5MB
- Test coverage: >80%