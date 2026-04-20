import { Routes, Route, Link } from 'react-router-dom';
import Scorecard from './Scorecard';
import { PiGithubLogoLight } from "react-icons/pi";
import pkg from '../package.json';

const repoUrl = pkg.repository.url.replace('.git', '').replace('git+', '');

function Home() {
  return (
    <div className="min-h-screen bg-app-bg text-app-ink py-20 px-6 relative">
      <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="absolute top-6 right-6 text-app-ink3 hover:text-black transition-colors flex items-center gap-2 text-sm font-medium">
        <PiGithubLogoLight className="w-6 h-6" /> GitHub
      </a>
      <div className="max-w-xl mx-auto shadow-app bg-app-surface border border-app-border2 rounded-xl p-10 text-center animate-[fadeUp_0.4s_ease_both] mt-10">
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-app-accent2 mb-2">
          Candidate: S***A S****R
        </div>
        <h1 className="font-serif text-3xl mb-2 text-app-accent">JEE Mains Results Dashboard</h1>
        <p className="text-app-ink3 mb-8">Select a scorecard to view details.</p>
        
        <div className="flex flex-col gap-4">
          <Link to="/january" className="bg-app-surface2 hover:bg-[#e4ded0] transition-colors border border-app-border p-4 rounded-lg text-lg font-medium text-app-ink flex justify-between items-center group">
            <span>January 2026 Session</span>
            <span className="text-app-ink3 group-hover:text-app-ink transition-colors">→</span>
          </Link>
          <Link to="/april" className="bg-app-surface2 hover:bg-[#e4ded0] transition-colors border border-app-border p-4 rounded-lg text-lg font-medium text-app-ink flex justify-between items-center group">
            <span>April 2026 Session</span>
            <span className="text-app-ink3 group-hover:text-app-ink transition-colors">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/january" element={<Scorecard jsonPath={`${import.meta.env.BASE_URL}data/january_2025.json`} />} />
      <Route path="/april" element={<Scorecard jsonPath={`${import.meta.env.BASE_URL}data/april_2025.json`} />} />
    </Routes>
  );
}
