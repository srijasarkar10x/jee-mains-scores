import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { PiGithubLogoLight } from "react-icons/pi";
import pkg from '../package.json';

const repoUrl = pkg.repository.url.replace('.git', '').replace('git+', '');

const resolveUrl = (url: string | undefined) => {
  if (!url) return '';
  if (url.startsWith('/')) {
    return `${import.meta.env.BASE_URL}${url.slice(1)}`;
  }
  return url;
};

const maskPrivacy = (str: string, isName = false) => {
  if (!str) return str;
  if (isName) {
    return str.split(' ').map(word => {
      if (word.length <= 2) return word;
      return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    }).join(' ');
  }
  if (str.length <= 4) return str;
  return str.substring(0, 2) + '×'.repeat(str.length - 4) + str.substring(str.length - 2);
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type EvaluateResult = 'correct' | 'wrong' | 'unattempted';

interface OptionData {
  id: string;
  imageUrl?: string;
}

interface ResponseData {
  section: string;
  sub: string;
  qno: number;
  qid: string;
  type: string;
  imageUrl?: string;
  options?: Record<string, OptionData> | OptionData[];
  chosen?: number | string | null;
  given?: string | null;
  result?: EvaluateResult;
  points?: number;
}

interface ScoreData {
  metadata: Record<string, string>;
  keyMap: Record<string, string>;
  responses: ResponseData[];
}

export default function Scorecard({ jsonPath }: { jsonPath: string }) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [filter, setFilter] = useState<'all' | 'maths' | 'physics' | 'chemistry'>('all');
  const [viewingQuestion, setViewingQuestion] = useState<ResponseData | null>(null);

  useEffect(() => {
    fetch(jsonPath)
      .then((res) => res.json())
      .then((json: ScoreData) => {
        // Calculate the results directly in case pre-calc isn't perfect
        const evaluatedResponses = json.responses.map((r) => {
          const correct = json.keyMap[r.qid];
          let res: EvaluateResult = 'unattempted';
          if (r.type === 'SA') {
            if (r.given === null || r.given === undefined) res = 'unattempted';
            else if (String(r.given).trim() === String(correct).trim()) res = 'correct';
            else res = 'wrong';
          } else {
            if (r.chosen === null || r.chosen === undefined) res = 'unattempted';
            else {
              let optVal = '';
              if (Array.isArray(r.options)) {
                optVal = r.options[Number(r.chosen) - 1]?.id || '';
              } else if (r.options) {
                optVal = (r.options as Record<string, OptionData>)[String(r.chosen)]?.id || '';
              }
              if (optVal === correct) res = 'correct';
              else res = 'wrong';
            }
          }
          const points = res === 'correct' ? 4 : res === 'wrong' ? -1 : 0;
          return { ...r, result: res, points };
        });
        setData({ ...json, responses: evaluatedResponses });
      });
  }, [jsonPath]);

  if (!data) return <div className="p-10 text-center font-mono">Loading data...</div>;

  const { metadata, responses } = data;

  const subjectStats = (secKey: string) => {
    const sub = responses.filter((r) => r.section === secKey);
    const correct = sub.filter((r) => r.result === 'correct').length;
    const wrong = sub.filter((r) => r.result === 'wrong').length;
    const unattempted = sub.filter((r) => r.result === 'unattempted').length;
    const pts = sub.reduce((a, r) => a + (r.points || 0), 0);
    return { correct, wrong, unattempted, pts, total: sub.length };
  };

  const mathS = subjectStats('maths');
  const physS = subjectStats('physics');
  const chemS = subjectStats('chemistry');
  
  const totalPts = mathS.pts + physS.pts + chemS.pts;
  const totalCorrect = mathS.correct + physS.correct + chemS.correct;
  const totalWrong = mathS.wrong + physS.wrong + chemS.wrong;
  const totalUnattempted = mathS.unattempted + physS.unattempted + chemS.unattempted;
  const totalAttempted = totalCorrect + totalWrong;
  const accuracy = totalAttempted > 0 ? ((totalCorrect / totalAttempted) * 100).toFixed(1) + '%' : '—';

  const chartData = {
    labels: ['Mathematics', 'Physics', 'Chemistry'],
    datasets: [
      {
        label: 'Correct (×4)',
        data: [mathS.correct * 4, physS.correct * 4, chemS.correct * 4],
        backgroundColor: '#68b984',
        borderRadius: 6,
      },
      {
        label: 'Wrong (×−1)',
        data: [mathS.wrong, physS.wrong, chemS.wrong],
        backgroundColor: '#e07070',
        borderRadius: 6,
      },
      {
        label: 'Net score',
        data: [mathS.pts, physS.pts, chemS.pts],
        backgroundColor: '#5ba4cf',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 12, family: "'Outfit', sans-serif" } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "'Outfit', sans-serif", size: 13 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(26,22,18,0.06)' }, ticks: { font: { family: "'DM Mono', monospace", size: 11 } } },
    },
  };

  // Group sections
  const subSections: Record<string, { key: string; qs: ResponseData[] }> = {};
  responses.forEach((r) => {
    if (!subSections[r.sub]) subSections[r.sub] = { key: r.section, qs: [] };
    subSections[r.sub].qs.push(r);
  });

  return (
    <>
      <div className="bg-app-ink text-white pt-12 px-8 pb-10 relative overflow-hidden">
        {/* Header Decors */}
        <div className="absolute -top-15 -right-15 w-80 h-80 rounded-full bg-[rgba(200,90,30,0.15)] pointer-events-none" />
        <div className="absolute -bottom-20 left-[30%] w-50 h-50 rounded-full bg-[rgba(200,90,30,0.08)] pointer-events-none" />

        <div className="max-w-[900px] mx-auto relative z-10">
          <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-app-accent2 mb-2">
                {metadata.examLabel}
              </div>
              <h1 className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-[1.1] font-normal mb-1">
                {maskPrivacy(metadata.name, true)}
              </h1>
            </div>
            
            <div className="flex gap-3 items-center">
               <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors" title="View Source">
                 <PiGithubLogoLight className="w-6 h-6" />
               </a>
               <Link to="/" className="text-xs font-medium bg-[var(--color-app-surface2)] text-black px-3 py-1.5 rounded hover:bg-white transition-colors">← All Results</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-white/10">
             {Object.entries(metadata).map(([k, v]) => {
                if (['name', 'exam', 'examLabel'].includes(k)) return null; 
                // formatted key
                const fk = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                
                let displayValue = v as string;
                if (k === 'testDate' && typeof v === 'number') {
                  const d = new Date(v * 1000);
                  displayValue = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                } else if (k === 'testTime' && Array.isArray(v)) {
                  const formatTime = (ts: number) => {
                    const d = new Date(ts * 1000);
                    let h = d.getHours();
                    const m = String(d.getMinutes()).padStart(2, '0');
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;
                    return `${h}:${m} ${ampm}`;
                  };
                  displayValue = `${formatTime(v[0])} - ${formatTime(v[1])}`;
                } else if (['applicationNo', 'rollNo', 'candidateName'].includes(k)) {
                  displayValue = maskPrivacy(displayValue, k === 'candidateName');
                }

                return (
                  <div key={k} className="text-[13px] text-white/60">
                    {fk} <span className="text-white/90 font-medium block text-[14px] mt-[1px]">{displayValue}</span>
                  </div>
                );
             })}
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8 pb-16">
        {/* SCORE HERO */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1px_1fr] gap-8 items-center bg-app-surface rounded-[12px] p-8 mb-6 shadow-app border border-app-border2 animate-[fadeUp_0.4s_ease_both]">
          <div className="text-center">
            <div className="font-serif text-[5rem] leading-none text-app-accent">{totalPts}</div>
            <div className="font-mono text-[13px] text-app-ink3 mt-1 tracking-[0.05em]">out of 300</div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-app-ink3 mt-1.5">Total Score</div>
          </div>
          <div className="hidden md:block w-[1px] bg-app-border self-stretch min-h-[80px]"></div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-4">
            <div className="text-center p-3 bg-app-surface2 rounded-[8px]">
              <div className="font-serif text-[1.8rem] leading-none text-app-green">{totalCorrect}</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-app-ink3 mt-1">Correct</div>
            </div>
            <div className="text-center p-3 bg-app-surface2 rounded-[8px]">
              <div className="font-serif text-[1.8rem] leading-none text-app-red">{totalWrong}</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-app-ink3 mt-1">Wrong</div>
            </div>
            <div className="text-center p-3 bg-app-surface2 rounded-[8px]">
              <div className="font-serif text-[1.8rem] leading-none text-app-ink">{totalUnattempted}</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-app-ink3 mt-1">Skipped</div>
            </div>
            <div className="text-center p-3 bg-app-surface2 rounded-[8px]">
              <div className="font-serif text-[1.8rem] leading-none text-app-ink">{accuracy}</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-app-ink3 mt-1">Accuracy</div>
            </div>
            <div className="text-center p-3 bg-app-surface2 rounded-[8px]">
              <div className="font-serif text-[1.8rem] leading-none text-app-ink">{totalAttempted}/75</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-app-ink3 mt-1">Attempted</div>
            </div>
          </div>
        </div>

        {/* SECTION TITLE */}
        <div className="font-serif text-[1.4rem] font-normal text-app-ink my-8 mb-4 flex items-center gap-3 after:content-[''] after:flex-1 after:h-[1px] after:bg-app-border">
          Subject breakdown
        </div>

        {/* SUBJECT CARDS */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 mb-6">
          {[
            { key: 'maths', label: 'Mathematics', stats: mathS, gradient: 'linear-gradient(90deg, #c85a1e, #e8a87c)' },
            { key: 'physics', label: 'Physics', stats: physS, gradient: 'linear-gradient(90deg, #1a5276, #5ba4cf)' },
            { key: 'chemistry', label: 'Chemistry', stats: chemS, gradient: 'linear-gradient(90deg, #3a7d44, #68b984)' }
          ].map((s, i) => (
            <div key={s.key} className={clsx(
              "bg-app-surface rounded-[12px] p-6 shadow-app border border-app-border2 relative overflow-hidden animate-[fadeUp_0.4s_ease_both]"
            )} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.gradient }}></div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-ink3 mb-2">{s.label}</div>
              <div className="font-serif text-[3rem] leading-none text-app-ink">{s.stats.pts}</div>
              <div className="font-mono text-[12px] text-app-ink3 mb-4">out of 100</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-app-green-bg text-app-green">✓ {s.stats.correct} correct</span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-app-red-bg text-app-red">✗ {s.stats.wrong} wrong</span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-app-surface2 text-app-ink3">— {s.stats.unattempted} skipped</span>
              </div>
            </div>
          ))}
        </div>

        {/* CHART */}
        <div className="bg-app-surface rounded-[12px] p-7 shadow-app border border-app-border2 mb-6 animate-[fadeUp_0.4s_ease_both]">
          <div className="font-serif text-[1.1rem] text-app-ink mb-5">Score composition by subject</div>
          <div className="h-[260px] relative">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Q DETAIL */}
        <div className="font-serif text-[1.4rem] font-normal text-app-ink my-8 mb-4 flex items-center gap-3 after:content-[''] after:flex-1 after:h-[1px] after:bg-app-border">
          Question-by-question detail
        </div>
        
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'maths', 'physics', 'chemistry'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={clsx(
                "font-outfit text-[13px] font-medium px-4 py-1.5 rounded-full border transition-all duration-150 capitalize",
                filter === f ? "bg-app-ink text-white border-app-ink" : "bg-app-surface text-app-ink2 border-app-border hover:bg-app-surface2"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div>
          {Object.entries(subSections).map(([sub, { key, qs }]) => {
            if (filter !== 'all' && key !== filter) return null;
            const correct = qs.filter((q) => q.result === 'correct').length;
            const wrong = qs.filter((q) => q.result === 'wrong').length;
            const unatt = qs.filter((q) => q.result === 'unattempted').length;
            const pts = qs.reduce((a, q) => a + (q.points || 0), 0);
            
            return (
              <div key={sub} className="bg-app-surface rounded-[12px] border border-app-border2 shadow-app mb-4 overflow-hidden animate-[fadeUp_0.4s_ease_both]">
                <div className="p-4 px-6 bg-app-surface2 border-b border-app-border2 flex justify-between items-center flex-wrap gap-2">
                  <div className="font-semibold text-[14px] text-app-ink">{sub}</div>
                  <div className="flex gap-3 text-[12px] text-app-ink3">
                    <span>Score: <span className="font-semibold text-app-blue">{pts}</span></span>
                    <span>Correct: <span className="font-semibold text-app-green">{correct}</span></span>
                    <span>Wrong: <span className="font-semibold text-app-red">{wrong}</span></span>
                    <span>Skipped: <span className="font-semibold text-app-ink">{unatt}</span></span>
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2 p-5 px-6">
                  {qs.map((q) => (
                    <div 
                      key={q.qid} 
                      onClick={() => setViewingQuestion(q)}
                      className={clsx(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[12px] border transition-transform duration-100 hover:-translate-y-[1px] cursor-pointer hover:shadow-sm",
                      q.result === 'correct' ? "bg-app-green-bg border-[#b8dfbe] text-app-green" :
                      q.result === 'wrong' ? "bg-app-red-bg border-[#f5c6c2] text-app-red" :
                      "bg-app-surface2 border-app-border2 text-app-ink3"
                    )}>
                      <span>
                        <span className="font-semibold">Q{q.qno}</span>
                        <span className="text-[10px] opacity-70"> · {q.type}</span>
                      </span>
                      <span className="font-mono text-[11px] font-medium">
                        {q.result === 'correct' ? '+4' : q.result === 'wrong' ? '−1' : '0'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <div className="text-center p-8 text-[12px] text-app-ink3 font-mono tracking-[0.05em]">
        Generated · React Dashboard · {metadata.examLabel || metadata.exam}
      </div>

      {viewingQuestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm transition-all" onClick={() => setViewingQuestion(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-full overflow-auto text-app-ink relative animate-[fadeUp_0.2s_ease_out]" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setViewingQuestion(null)}
              className="absolute top-4 right-4 bg-app-surface border border-app-border2 hover:bg-app-surface2 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-app-ink3 hover:text-app-ink z-10"
            >
              ✕
            </button>
            <div className="p-6 border-b border-app-border2">
              <h2 className="font-serif text-[1.8rem]">Question {viewingQuestion.qno}</h2>
              <div className="text-[13px] text-app-ink3 mt-1.5 flex gap-2 font-mono">
                <span className="uppercase tracking-widest">{viewingQuestion.sub}</span> <span className="opacity-40">|</span> 
                <span>{viewingQuestion.type}</span> <span className="opacity-40">|</span> 
                <span className={clsx(
                  "font-bold",
                  viewingQuestion.result === 'correct' ? 'text-app-green' : 
                  viewingQuestion.result === 'wrong' ? 'text-app-red' : ''
                )}>
                  {viewingQuestion.result?.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="p-6 px-4 md:px-8 bg-[#fdfdfd]">
              {viewingQuestion.imageUrl ? (
                <div className="mb-6 bg-white p-3 rounded-lg border border-app-border2 shadow-sm inline-block max-w-full">
                  <img src={resolveUrl(viewingQuestion.imageUrl)} alt={`Question ${viewingQuestion.qno}`} className="max-w-full h-auto" />
                </div>
              ) : (
                <div className="text-app-ink3 italic mb-6 text-sm">No image available for this question.</div>
              )}
              
              {viewingQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-app-border2">
                  <h3 className="col-span-full font-serif text-[1.4rem] mb-2 text-app-ink">Options</h3>
                  {Array.isArray(viewingQuestion.options) 
                    ? viewingQuestion.options.map((opt, i) => (
                        <div key={opt.id} className={clsx(
                          "bg-white p-4 rounded-lg border shadow-sm transition-all relative overflow-hidden",
                          viewingQuestion.chosen === i + 1 ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-border2 opacity-80'
                        )}>
                          <div className="text-[11px] font-bold uppercase tracking-widest text-app-ink3 mb-3 flex justify-between relative z-10">
                            <span>Option {i + 1}</span>
                            {viewingQuestion.chosen === i + 1 && <span className="text-app-accent">Chosen</span>}
                          </div>
                          {viewingQuestion.chosen === i + 1 && <div className="absolute top-0 right-0 w-24 h-24 bg-app-accent opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />}
                          {opt.imageUrl ? <img src={resolveUrl(opt.imageUrl)} alt={`Option ${i+1}`} className="max-w-full relative z-10" /> : <div className="text-xs break-all relative z-10 font-mono">{opt.id}</div>}
                        </div>
                      ))
                    : Object.entries(viewingQuestion.options).map(([k, opt]) => (
                        <div key={opt.id} className={clsx(
                          "bg-white p-4 rounded-lg border shadow-sm transition-all relative overflow-hidden",
                          String(viewingQuestion.chosen) === k ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-border2 opacity-80'
                        )}>
                          <div className="text-[11px] font-bold uppercase tracking-widest text-app-ink3 mb-3 flex justify-between relative z-10">
                            <span>Option {k}</span>
                            {String(viewingQuestion.chosen) === k && <span className="text-app-accent">Chosen</span>}
                          </div>
                          {String(viewingQuestion.chosen) === k && <div className="absolute top-0 right-0 w-24 h-24 bg-app-accent opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />}
                          {opt.imageUrl ? <img src={resolveUrl(opt.imageUrl)} alt={`Option ${k}`} className="max-w-full relative z-10" /> : <div className="text-xs break-all relative z-10 font-mono">{opt.id}</div>}
                        </div>
                      ))
                  }
                </div>
              )}
              
              {viewingQuestion.type === 'SA' && (
                <div className="mt-8 pt-8 border-t border-app-border2">
                  <h3 className="font-serif text-[1.4rem] mb-4 text-app-ink">Given Answer</h3>
                  <div className="text-2xl font-mono font-medium text-app-ink bg-white inline-block px-5 py-3 rounded-lg border border-app-border2 shadow-sm">
                    {viewingQuestion.given || <span className="opacity-30 italic text-lg">Not answered</span>}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </>
  );
}
