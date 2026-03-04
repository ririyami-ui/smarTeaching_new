import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export default function VisualAnalytics({ chapterId, data }) {
    if (!data) return null;

    const renderRadar = (chartData) => (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} />
                    <Radar
                        name="Tren"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.6}
                    />
                    <Tooltip />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );

    const renderBar = (chartData, dataKey = 'score') => (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [value, 'Total']}
                        labelFormatter={(label, props) => props.length > 0 && props[0].payload.fullname ? props[0].payload.fullname : label}
                    />
                    <Bar dataKey={dataKey} fill="#6366f1" barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    const renderPie = (chartData) => (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );

    // Data Mapping Logic
    switch (chapterId) {
        case 1: { // Ruang Lingkup (Student Count per Class)
            const classData = data?.daftarKelas || [];
            if (!Array.isArray(classData) || classData.length === 0) return null;

            const barData = classData.map(c => ({
                name: c.name,
                jumlah: c.studentCount || 0
            }));

            return (
                <div className="w-full flex flex-col">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Komposisi Siswa per Rombel</p>
                    </div>
                    {renderBar(barData, 'jumlah')}
                </div>
            );
        }
        case 2: { // Kurikulum
            const lessonsData = data?.kurikulumContext?.lessons || data?.generatedLessons || [];
            if (!Array.isArray(lessonsData) || lessonsData.length === 0) return null;

            const counts = {};
            lessonsData.forEach(item => {
                const key = item.topic || item.kd || 'Lainnya';
                counts[key] = (counts[key] || 0) + 1;
            });

            const barData = Object.entries(counts).map(([name, count]) => ({
                name: name.substring(0, 15) + (name.length > 15 ? '...' : ''),
                fullname: name,
                jumlah: count
            }));

            return (
                <div className="w-full flex flex-col">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Distribusi Pemetaan Materi</p>
                    </div>
                    {renderBar(barData, 'jumlah')}
                </div>
            );
        }
        case 3: { // Jurnal
            const journalData = Array.isArray(data) ? data : [];
            if (journalData.length === 0) return null;

            const counts = {};
            journalData.forEach(item => {
                if (item.date) {
                    const month = new Date(item.date).toLocaleDateString('id-ID', { month: 'short' });
                    counts[month] = (counts[month] || 0) + 1;
                }
            });

            const barData = Object.entries(counts).map(([name, count]) => ({
                name,
                jumlah: count
            }));

            return (
                <div className="w-full flex flex-col">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Frekuensi Pelaksanaan Pembelajaran</p>
                    </div>
                    {renderBar(barData, 'jumlah')}
                </div>
            );
        }
        case 4: { // Nilai
            const gradeData = data?.rekapPerJenisNilai || (Array.isArray(data) ? data : []);
            if (gradeData.length === 0) return null;

            const barData = gradeData.map((d) => ({
                name: (d.subject || 'Nilai').substring(0, 15),
                score: Math.round(d.score) || 0
            }));

            return (
                <div className="w-full flex flex-col">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Rata-rata Nilai per Jenis Asesmen</p>
                    </div>
                    {renderBar(barData, 'score')}
                </div>
            );
        }
        case 5: { // Disiplin
            const infractions = data?.infractions || [];
            if (infractions.length === 0) return null;

            const counts = infractions.reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
            }, {});
            const pieData = Object.entries(counts).map(([name, value]) => ({ name: name.substring(0, 20), value }));

            return (
                <div className="w-full flex flex-col">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Tren Pelanggaran Siswa</p>
                    </div>
                    {renderPie(pieData)}
                </div>
            );
        }
        case 6: { // SWOT (Radar analysis of journal intensity)
            const swotData = Array.isArray(data) ? data : [];
            if (swotData.length === 0) return null;

            let strengths = 0;
            let weaknesses = 0;
            let opportunities = 0;
            let threats = 0;

            swotData.forEach(item => {
                if (item.reflection) strengths++;
                if (item.challenges) weaknesses++;
                if (item.followUp) opportunities++;
            });

            // "Threats" in pedagogy can be complex challenges
            threats = Math.round(weaknesses * 0.7);

            const radarData = [
                { subject: 'Strengths', value: strengths },
                { subject: 'Weaknesses', value: weaknesses },
                { subject: 'Opportunities', value: opportunities },
                { subject: 'Threats', value: threats },
            ];

            return (
                <div className="w-full flex flex-col">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Keseimbangan Indikator SWOT Pengajaran</p>
                    </div>
                    {renderRadar(radarData)}
                </div>
            );
        }
        default:
            return null;
    }
}
