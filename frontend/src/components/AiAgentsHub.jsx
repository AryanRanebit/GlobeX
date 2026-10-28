import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  TrendingUp, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Terminal, 
  Play, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Globe, 
  ArrowLeft,
  Calendar,
  Building,
  User,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function AiAgentsHub({ onBackToLanding }) {
  const [activeAgent, setActiveAgent] = useState('discovery');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState([]);
  const [simulationStep, setSimulationStep] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const terminalEndRef = useRef(null);
  const intervalRef = useRef(null);

  // Reset simulator when changing agent
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSimulating(false);
    setSimulatedLogs([]);
    setSimulationStep(0);
    setShowOutcome(false);
  }, [activeAgent]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulatedLogs]);

  const agents = {
    discovery: {
      id: 'discovery',
      name: 'Buyer Discovery Agent',
      icon: Search,
      role: 'Global Trade Importer Finder',
      description: 'Searches the live web with Google Search grounding to find real companies that import or distribute your product. Every result carries its source link; anything without a citation is dropped.',
      capabilities: [
        'Grounded live web search for real importers and distributors by product and country.',
        'Source link attached to every company; uncited suggestions are discarded.',
        'Honest limits: customs volumes, purchase history and contacts are NOT verified.'
      ],
      simulationLogs: [
        '🚀 Initializing Buyer Discovery Agent...',
        '🔍 Running grounded Google Search: importers of HS 6204.62 (women\'s cotton trousers) in the US and Germany...',
        '📄 Reading search results: company websites, trade directories, public filings...',
        '💡 Match: "Gap Inc." (United States) - apparel importer/retailer, source cited.',
        '💡 Match: "H&M Group" (Sweden) - apparel importer/retailer, source cited.',
        '💡 Match: "C&A" (Germany) - apparel importer/retailer, source cited.',
        '🔗 Attaching source links. Dropping any suggestion without a citation...',
        '✅ 3 source-backed prospects saved. Import volumes and contacts are NOT verified.'
      ],
      outcome: {
        title: 'Discovered Prospects (HS 6204.62) - sources attached',
        type: 'table',
        data: [
          { company: 'Gap Inc.', country: 'United States', volume: 'Not verified', reliability: 'Web evidence', contact: 'gapinc.com' },
          { company: 'H&M Group', country: 'Sweden', volume: 'Not verified', reliability: 'Web evidence', contact: 'hmgroup.com' },
          { company: 'C&A', country: 'Germany', volume: 'Not verified', reliability: 'Web evidence', contact: 'c-and-a.com' }
        ]
      }
    },
    intelligence: {
      id: 'intelligence',
      name: 'Market Intelligence Agent',
      icon: TrendingUp,
      role: 'Global Market Opportunity Evaluator',
      description: 'Ranks destination countries for your exports from official UN Comtrade India export data (calendar year 2025). Shows trade values and shares only; tariffs, growth and competition are not computed.',
      capabilities: [
        'Ranks destinations by India-reported export value (FOB), UN Comtrade 2025.',
        'Shows each destination\'s share of India\'s exports for the selected HS code.',
        'Marks growth, competition and destination market size as unavailable when the data is not seeded.'
      ],
      simulationLogs: [
        '🚀 Initializing Market Intelligence Agent...',
        '📊 Querying UN Comtrade 2025: India exports, HS 62 (apparel, not knitted)...',
        '🔍 Ranking destinations by India-reported export value (FOB)...',
        '📈 United States: $2.67B, 31.83% of India HS 62 exports',
        '📈 United Kingdom: $793.51M, 9.46%',
        '📈 United Arab Emirates: $628.61M, 7.49%',
        'ℹ️ Growth, tariffs and competition: not available from the seeded data.',
        '✅ Ranking complete. Figures are 2025 UN Comtrade values.'
      ],
      outcome: {
        title: 'Top Destinations (UN Comtrade 2025, HS 62)',
        type: 'list',
        data: [
          { country: 'United States', tariff: 'Not available', growth: 'Not available', score: '100 (relative export value)', status: '$2.67B · 31.83% of exports' },
          { country: 'United Kingdom', tariff: 'Not available', growth: 'Not available', score: '30 (relative export value)', status: '$793.51M · 9.46% of exports' },
          { country: 'United Arab Emirates', tariff: 'Not available', growth: 'Not available', score: '24 (relative export value)', status: '$628.61M · 7.49% of exports' }
        ]
      }
    },
    outreach: {
      id: 'outreach',
      name: 'Outreach & RFP Agent',
      icon: Mail,
      role: 'Multilingual Pitch Generator & Negotiator',
      description: 'Automatically drafts personalized B2B outreach proposals, product catalogs, and replies to RFPs tailored to local market cultures and languages.',
      capabilities: [
        'Generates hyper-personalized outreach based on buyer transaction histories.',
        'Supports native localization for European, Middle Eastern, and Asian markets.',
        'Follows professional email compliance standards (CAN-SPAM/GDPR).'
      ],
      simulationLogs: [
        '🚀 Initializing Outreach & RFP Agent...',
        '📧 Fetching buyer profile: "C&A" (Germany) - a prospect saved by Buyer Discovery...',
        '✍️ Using public web sources about the prospect to tailor the pitch (no purchase history is claimed)...',
        '🌐 Selecting draft language: German (Deutsch) for high response rate...',
        '📝 Generating personalized value proposition based on organic certifications...',
        '⚙️ Applying tone setting: Formal corporate partner...',
        '📧 Subject line optimized: Partnerschaftsanfrage: Bio-Baumwolltextilien direkt vom Hersteller',
        '✨ Body draft created. Checking compliance with European GDPR laws...',
        '✅ Outreach draft ready for approval.'
      ],
      outcome: {
        title: 'Generated Outreach (Deutsch)',
        type: 'email',
        subject: 'Partnerschaftsanfrage: Bio-Baumwolltextilien direkt vom Hersteller',
        body: `Sehr geehrte Damen und Herren,

wir schreiben Ihnen, weil Ihr Unternehmen C&A als Importeur und Händler von Textilien in Deutschland öffentlich bekannt ist.

Als zertifizierter Hersteller in Indien bieten wir hochwertige Bio-Baumwolltextilien an, die den globalen GOTS-Standards entsprechen. Durch unsere vertikal integrierte Produktion können wir Ihre Lieferkettenstabilität sichern und attraktive Einkaufskonditionen bei 0% Zoll (unter dem aktuellen Handelsabkommen) garantieren.

Gerne senden wir Ihnen unseren neuesten Produktkatalog und einige Muster zu.

Mit freundlichen Grüßen,
Sourcing-Team`
      }
    },
    compliance: {
      id: 'compliance',
      name: 'Compliance & Customs Agent',
      icon: FileText,
      role: 'Trade Barriers & Regulations Advisor',
      description: 'Verifies customs requirements, necessary certifications, product labeling mandates, and mandatory testing protocols required for seamless entry into target countries.',
      capabilities: [
        'Cross-references target country customs protocols with your HS code.',
        'Highlights mandatory safety, agricultural, or environmental certifications.',
        'Tracks average port clearance days and regulatory risk indicators.'
      ],
      simulationLogs: [
        '🚀 Initializing Compliance & Customs Agent...',
        '📦 Target product: Spices & Condiments. Target country: Germany (EU)...',
        '🔍 Accessing European Food Safety Authority (EFSA) regulatory database...',
        '⚠️ Alert: Requires Phytosanitary Certificate issued by Indian authorities.',
        '⚠️ Alert: Maximum residue limits (MRLs) for pesticides must conform to EU Regulation (EC) 396/2005.',
        '📝 Checking labeling requirements: Must include botanical name, batch ID, and net weight in German.',
        '⚖️ Port customs procedure: Standard customs entry with document clearance. Average delay: 2 days.',
        '✅ Compliance check complete. 3 certificates required.'
      ],
      outcome: {
        title: 'EU Compliance Checklist',
        type: 'checklist',
        data: [
          { check: 'Phytosanitary Certificate', authority: 'Ministry of Agriculture, India', status: 'Required', action: 'Must apply 7 days before shipping' },
          { check: 'Pesticide MRL Test Report', authority: 'NABL Accredited Laboratory', status: 'Required', action: 'Batch sample testing mandatory' },
          { check: 'EU-Standard Bilingual Labeling', authority: 'Self-Declaration', status: 'Required', action: 'Incorporate German labels on packaging' }
        ]
      }
    },
    scoring: {
      id: 'scoring',
      name: 'Lead Scoring Agent',
      icon: CheckCircle2,
      role: 'Buyer Evidence Scorer',
      description: 'Scores a saved buyer prospect strictly from the evidence on its record - identity, web domain, contact details, product fit. It does not check credit registries, shipment histories, or supplier retention.',
      capabilities: [
        'Transparent score breakdown: every point traces to a named evidence factor.',
        'Missing evidence scores zero, never negative - and is shown as missing.',
        'Not a credit rating: no financial or customs data is connected.'
      ],
      simulationLogs: [
        '🚀 Initializing Lead Scoring Agent...',
        '📊 Scoring prospect: "C&A" (Germany) - saved from grounded search...',
        '🔎 Evidence found: company identity, website domain, product/industry fit...',
        '⚠️ Evidence missing: shipment volumes, credit history, supplier retention (no customs or registry data connected)...',
        '🎛️ Missing signals score zero, not negative, and are listed in the breakdown...',
        '✅ Score computed from available evidence only. This is not a credit rating.'
      ],
      outcome: {
        title: 'Evidence Score: C&A (Germany)',
        type: 'scoring',
        score: 45,
        metrics: [
          { name: 'Company Identity', rating: 'Present (web source cited)', score: 20 },
          { name: 'Website Domain', rating: 'Present', score: 10 },
          { name: 'Contact Details', rating: 'Partial', score: 15 },
          { name: 'Customs / Credit Evidence', rating: 'Not available', score: 0 }
        ]
      }
    }
  };

  const handleStartSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsSimulating(true);
    setSimulatedLogs([]);
    setSimulationStep(0);
    setShowOutcome(false);

    const logList = agents[activeAgent].simulationLogs;
    let step = 0;

    intervalRef.current = setInterval(() => {
      if (step < logList.length) {
        setSimulatedLogs(prev => [...prev, logList[step]]);
        step++;
        setSimulationStep(step);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsSimulating(false);
        setShowOutcome(true);
      }
    }, 850);
  };

  const SelectedIcon = agents[activeAgent].icon;

  return (
    <div className="min-h-screen bg-page">
      {/* Premium Header utilizing reference port image professionally */}
      <div className="relative bg-navy py-16 text-white overflow-hidden border-b border-navy-light">
        <div className="absolute inset-0 z-0 opacity-15">
          <img 
            src="/port.jpg" 
            alt="Global Container Port" 
            className="w-full h-full object-cover object-center scale-105 filter blur-xs"
          />
        </div>
        
        {/* Subtle linear overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/95 z-10" />

        <div className="relative z-20 section-container">
          <button 
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-sm text-line-dark hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
            Back to Platform Home
          </button>
          
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-accent/20 text-orange border border-accent/40 mb-4 uppercase tracking-wider">
              Autonomous Operations Command
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4 font-heading">
              AI Trade Agents Hub
            </h1>
            <p className="text-base text-faint leading-relaxed">
              Power your international export pipeline with 5 specialized, autonomous AI agents. Run interactive demos below to see how each agent processes global shipping databases, compliance laws, and email copy templates in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Section */}
      <div className="section-container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Agent Selection Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="bg-white rounded-lg border border-line p-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-3 pl-2">
                Available Agents
              </span>
              
              <div className="flex flex-col gap-2">
                {Object.values(agents).map((agent) => {
                  const Icon = agent.icon;
                  const isActive = activeAgent === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setActiveAgent(agent.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-md text-left transition-all duration-150 group ${
                        isActive 
                          ? 'bg-blue-pale text-blue border-l-4 border-blue shadow-xs' 
                          : 'bg-transparent text-soft hover:bg-surface hover:text-navy'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md mt-0.5 ${
                        isActive ? 'bg-blue/10 text-blue' : 'bg-surface text-muted group-hover:bg-white'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className={`text-[14px] font-semibold ${isActive ? 'text-navy' : 'text-ink'}`}>
                          {agent.name}
                        </h3>
                        <p className="text-[12px] text-muted line-clamp-1 mt-0.5 font-normal">
                          {agent.role}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trust and status card */}
            <div className="bg-white rounded-lg border border-line p-5">
              <h4 className="text-[13px] font-bold text-navy mb-3 flex items-center gap-2">
                <Globe size={15} className="text-blue" />
                System Integration Status
              </h4>
              <div className="flex items-center justify-between py-1.5 border-b border-surface text-xs">
                <span className="text-muted">Custom Manifests</span>
                <span className="font-semibold text-emerald flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span> Operational
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface text-xs">
                <span className="text-muted">Tariff Databases</span>
                <span className="font-semibold text-emerald flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span> Online
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-muted">Language Translators</span>
                <span className="font-semibold text-emerald flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span> 12 Native APIs
                </span>
              </div>
            </div>
          </div>

          {/* Right: Active Agent Workspace */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Overview Card */}
            <div className="bg-white rounded-lg border border-line p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface pb-5 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-pale text-blue rounded-lg">
                    <SelectedIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-navy">{agents[activeAgent].name}</h2>
                    <span className="text-xs font-semibold text-emerald bg-emerald-pale px-2.5 py-0.5 rounded-full border border-emerald-border inline-block mt-1">
                      Active AI Role: {agents[activeAgent].role}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleStartSimulation}
                  disabled={isSimulating}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed h-10 shrink-0 self-start md:self-center"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Running Demo...
                    </>
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" />
                      Run Demo
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[13px] font-bold text-navy uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-soft leading-relaxed">
                    {agents[activeAgent].description}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-[13px] font-bold text-navy uppercase tracking-wider mb-2">
                    Key Agent Capabilities
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {agents[activeAgent].capabilities.map((cap, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-soft">
                        <Check size={16} className="text-emerald mt-0.5 shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Interactive Terminal Console */}
            <div className="bg-navy rounded-lg border border-navy-light overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center justify-between bg-navy-light px-4 py-2.5 border-b border-navy">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-line-dark" />
                  <span className="text-xs font-mono font-semibold text-line-dark">agent_simulation_terminal.log</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red" />
                  <div className="w-2.5 h-2.5 rounded-full bg-orange" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-light" />
                </div>
              </div>

              <div className="p-5 font-mono text-[13px] min-h-[180px] max-h-[260px] overflow-y-auto flex flex-col gap-1.5 bg-navy text-slate-300">
                {simulatedLogs.length === 0 ? (
                  <div className="text-slate-500 italic flex items-center justify-center h-[140px]">
                    Click "Run Demo" above to watch the agent think and perform operations.
                  </div>
                ) : (
                  simulatedLogs.map((log, index) => (
                    <div 
                      key={index}
                      className={`leading-relaxed border-l-2 pl-3 py-0.5 ${
                        log && log.startsWith('🚀') ? 'text-blue-light border-blue-light' :
                        log && log.startsWith('✅') ? 'text-emerald-light border-emerald-light' :
                        log && log.startsWith('⚠️') ? 'text-orange border-orange' :
                        'text-slate-300 border-slate-700'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
                {isSimulating && (
                  <div className="flex items-center gap-2 text-slate-400 pl-3.5 mt-1 border-l-2 border-slate-800">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Executing pipeline segment...</span>
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* Outcome Display (Triggered after simulation finishes) */}
            {showOutcome && (
              <div className="bg-white rounded-lg border border-line p-6 shadow-xs animate-fade-in">
                <h3 className="text-base font-bold text-navy border-b border-surface pb-3 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald" />
                  Simulation Result: {agents[activeAgent].outcome.title}
                </h3>

                {/* Outcome rendering depends on activeAgent outcome type */}
                
                {/* 1. TABLE Outcome */}
                {agents[activeAgent].outcome.type === 'table' && (
                  <div className="overflow-x-auto rounded-md border border-line">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Importer Company</th>
                          <th>Country</th>
                          <th>Import Volume</th>
                          <th>Evidence</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents[activeAgent].outcome.data.map((row, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-navy">{row.company}</td>
                            <td>{row.country}</td>
                            <td>{row.volume}</td>
                            <td>
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-pale text-emerald-dark border border-emerald-border">
                                {row.reliability}
                              </span>
                            </td>
                            <td className="text-slate-500 font-mono text-[11px]">{row.contact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. LIST Outcome */}
                {agents[activeAgent].outcome.type === 'list' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {agents[activeAgent].outcome.data.map((row, idx) => (
                      <div key={idx} className="border border-line rounded-md p-4 bg-page">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-navy">{row.country}</span>
                          <span className="text-xs font-bold text-blue bg-blue-pale px-2 py-0.5 rounded">
                            Relative size: {row.score}
                          </span>
                        </div>
                        <div className="text-xs text-muted flex flex-col gap-1 mt-3">
                          <div className="flex justify-between">
                            <span>Import Tariff:</span>
                            <span className="font-medium text-ink">{row.tariff}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Growth:</span>
                            <span className="font-medium text-ink">{row.growth}</span>
                          </div>
                          <div className="mt-2 text-center text-[10px] font-bold text-emerald-dark bg-emerald-pale py-1 rounded border border-emerald-border">
                            {row.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. EMAIL Outcome */}
                {agents[activeAgent].outcome.type === 'email' && (
                  <div className="border border-line rounded-md overflow-hidden bg-page">
                    <div className="bg-line/40 px-4 py-2.5 border-b border-line text-xs font-mono">
                      <div className="mb-1 text-slate-500">
                        <span className="font-bold text-slate-700">Subject: </span>
                        {agents[activeAgent].outcome.subject}
                      </div>
                    </div>
                    <div className="p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink bg-white max-h-[220px] overflow-y-auto">
                      {agents[activeAgent].outcome.body}
                    </div>
                  </div>
                )}

                {/* 4. CHECKLIST Outcome */}
                {agents[activeAgent].outcome.type === 'checklist' && (
                  <div className="flex flex-col gap-3">
                    {agents[activeAgent].outcome.data.map((row, idx) => (
                      <div key={idx} className="flex items-start gap-3 border border-line rounded-md p-3.5 bg-white">
                        <div className="p-1 rounded-full bg-emerald-pale text-emerald mt-0.5">
                          <Check size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-[13px] font-bold text-navy">{row.check}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              {row.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">Authority: {row.authority}</p>
                          <div className="mt-2 text-xs font-medium text-blue bg-blue-pale px-2 py-1 rounded inline-block">
                            Required Action: {row.action}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. SCORING Outcome */}
                {agents[activeAgent].outcome.type === 'scoring' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 flex flex-col items-center justify-center border border-line rounded-md p-5 bg-page text-center">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Overall Fit Score</span>
                      <div className="text-5xl font-black text-blue my-2">{agents[activeAgent].outcome.score}</div>
                      <span className="text-xs font-bold text-emerald bg-emerald-pale px-3 py-1 rounded-full border border-emerald-border">
                        Tier-1 Match
                      </span>
                    </div>

                    <div className="md:col-span-8 flex flex-col gap-3">
                      <h4 className="text-[12px] font-bold text-navy uppercase tracking-wider pl-1">Capability Breakdown</h4>
                      <div className="flex flex-col gap-2">
                        {agents[activeAgent].outcome.metrics.map((row, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs text-ink mb-1">
                              <span className="font-semibold">{row.name}</span>
                              <span className="font-medium text-slate-500">{row.rating} ({row.score}/100)</span>
                            </div>
                            <div className="w-full bg-line h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-blue h-full rounded-full transition-all duration-500" 
                                style={{ width: `${row.score}%` }} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
