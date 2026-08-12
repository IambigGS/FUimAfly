import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Target, Music, Monitor, Code, Beaker, Image as ImageIcon, Volume2 } from 'lucide-react';

interface TeamHubProps {
  onClose: () => void;
}

type AgentName = 'luna' | 'echo' | 'atlas' | 'doc' | 'scott';

const agents: { id: AgentName; name: string; role: string; icon: React.ReactNode; color: string }[] = [
  { id: 'luna', name: 'Luna', role: 'Lead Art & UI (Visuals)', icon: <Target className="w-5 h-5" />, color: 'text-pink-500 border-pink-500' },
  { id: 'echo', name: 'Echo', role: 'Audio Engineer (Sounds)', icon: <Music className="w-5 h-5" />, color: 'text-purple-500 border-purple-500' },
  { id: 'atlas', name: 'Atlas', role: 'Performance Master', icon: <Monitor className="w-5 h-5" />, color: 'text-blue-500 border-blue-500' },
  { id: 'doc', name: 'Doc', role: 'Lore & Copywriter', icon: <Code className="w-5 h-5" />, color: 'text-green-500 border-green-500' },
  { id: 'scott', name: 'Scott', role: 'Lead QA Tester', icon: <Beaker className="w-5 h-5" />, color: 'text-amber-500 border-amber-500' },
];

export const TeamHub: React.FC<TeamHubProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<AgentName>('luna');

  // Load all markdown files dynamically as raw strings
  const mdFiles = useMemo(() => {
    const modules = import.meta.glob('../team_hub/**/*.md', { query: '?raw', eager: true });
    const files: Record<string, string> = {};
    for (const path in modules) {
      files[path] = (modules[path] as any).default as string;
    }
    return files;
  }, []);

  // Load image assets dynamically
  const imageFiles = useMemo(() => {
    const modules = import.meta.glob('../team_hub/**/*.{png,jpg,jpeg,webp,svg,gif}', { eager: true, import: 'default' });
    const files: Record<string, string> = {};
    for (const path in modules) {
      files[path] = modules[path] as string;
    }
    return files;
  }, []);

  // Load audio assets dynamically
  const audioFiles = useMemo(() => {
    const modules = import.meta.glob('../team_hub/**/*.{mp3,wav,ogg,m4a}', { eager: true, import: 'default' });
    const files: Record<string, string> = {};
    for (const path in modules) {
      files[path] = modules[path] as string;
    }
    return files;
  }, []);

  // Filter markdown files by active agent tab and sort descending
  const agentMdFiles = useMemo(() => {
    const files = Object.keys(mdFiles).filter(path => path.toLowerCase().includes(`/${activeTab}/`));
    files.sort((a, b) => b.localeCompare(a));
    return files;
  }, [mdFiles, activeTab]);

  // Filter image files by active agent tab and sort descending
  const agentImages = useMemo(() => {
    const files = Object.keys(imageFiles).filter(path => path.toLowerCase().includes(`/${activeTab}/`));
    files.sort((a, b) => b.localeCompare(a));
    return files;
  }, [imageFiles, activeTab]);

  // Filter audio files by active agent tab and sort descending
  const agentAudio = useMemo(() => {
    const files = Object.keys(audioFiles).filter(path => path.toLowerCase().includes(`/${activeTab}/`));
    files.sort((a, b) => b.localeCompare(a));
    return files;
  }, [audioFiles, activeTab]);

  return (
    <div className="absolute inset-0 w-full h-full bg-brand-linen flex flex-col z-50 overflow-hidden text-brand-charcoal">
      {/* Header */}
      <div className="bg-brand-charcoal text-brand-ivory p-4 md:p-5 border-b-4 border-brand-red flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-serif uppercase tracking-wider flex items-center gap-3">
            <span>🧑‍💻</span> Team Presentation Hub
          </h1>
          <p className="text-xs font-mono opacity-80 mt-0.5">Interactive Visual & Audio Showcase for Luna & Echo</p>
        </div>
        <button
          onClick={onClose}
          className="bg-brand-red text-white px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-brand-red transition-colors border-2 border-transparent hover:border-brand-red cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A]"
        >
          Return to Game
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-brand-ivory border-r-2 border-brand-charcoal/20 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0">
          {agents.map((agent) => {
            const isActive = activeTab === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setActiveTab(agent.id)}
                className={`flex items-center gap-3 p-4 font-bold transition-all border-b-2 md:border-b-0 md:border-l-4 whitespace-nowrap cursor-pointer
                  ${isActive ? `bg-white ${agent.color} shadow-sm` : 'text-brand-charcoal/70 border-transparent hover:bg-brand-charcoal/5'}
                `}
              >
                {agent.icon}
                <div className="text-left">
                  <div className="uppercase tracking-widest text-xs font-black">{agent.name}</div>
                  <div className="text-[10px] opacity-75 font-mono">{agent.role}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Showcase Panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Visual Assets Showcase (Luna Focus) */}
            {agentImages.length > 0 && (
              <div className="border-3 border-brand-charcoal bg-pink-50/50 p-4 md:p-6 shadow-[4px_4px_0px_0px_#1A1A1A]">
                <h2 className="text-lg font-serif font-black uppercase text-pink-700 flex items-center gap-2 mb-4 border-b-2 border-pink-200 pb-2">
                  <ImageIcon className="w-5 h-5" /> Visual Graphics Gallery ({agentImages.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {agentImages.map((path) => {
                    const filename = path.split('/').pop();
                    const url = imageFiles[path];
                    return (
                      <div key={path} className="border-2 border-brand-charcoal bg-white p-2 flex flex-col items-center gap-2 shadow-xs group">
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                          <img src={url} alt={filename} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                        </div>
                        <span className="text-xs font-mono font-bold text-brand-charcoal truncate w-full text-center" title={filename}>
                          {filename}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audio Clips Showcase (Echo Focus) */}
            {agentAudio.length > 0 && (
              <div className="border-3 border-brand-charcoal bg-purple-50/50 p-4 md:p-6 shadow-[4px_4px_0px_0px_#1A1A1A]">
                <h2 className="text-lg font-serif font-black uppercase text-purple-700 flex items-center gap-2 mb-4 border-b-2 border-purple-200 pb-2">
                  <Volume2 className="w-5 h-5" /> Audio Clips & Sound FX Player ({agentAudio.length})
                </h2>
                <div className="space-y-3">
                  {agentAudio.map((path) => {
                    const filename = path.split('/').pop();
                    const url = audioFiles[path];
                    return (
                      <div key={path} className="border-2 border-brand-charcoal bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <span className="text-xs font-mono font-bold text-purple-950 flex items-center gap-2">
                          🎵 {filename}
                        </span>
                        <audio controls src={url} className="w-full sm:w-64 h-8" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Markdown PRDs & Text Proposals */}
            {agentMdFiles.length > 0 ? (
              agentMdFiles.map((path) => {
                const filename = path.split('/').pop();
                const content = mdFiles[path];
                return (
                  <div key={path} className="border-3 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] bg-brand-ivory overflow-hidden">
                    <div className="bg-brand-charcoal text-white p-3 font-mono text-xs md:text-sm border-b-3 border-brand-charcoal flex justify-between items-center">
                      <span className="font-bold">📄 {filename}</span>
                      <span className="opacity-50 text-[10px] truncate max-w-[200px]" title={path}>{path}</span>
                    </div>
                    <div className="p-6 md:p-8 prose prose-brand max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                  </div>
                );
              })
            ) : (
              agentImages.length === 0 && agentAudio.length === 0 && (
                <div className="text-center py-16 opacity-60 font-mono">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-sm font-bold">No active PRDs or media files found for {activeTab.toUpperCase()}</p>
                  <p className="text-xs opacity-75 mt-1">Place `.md`, `.png`, or `.mp3` files in `src/team_hub/{activeTab}/`</p>
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamHub;
