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
      description: 'Crawls international shipping records, customs registries, and business directories to compile a list of active buyers purchasing your specific HS code products.',
      capabilities: [
        'Real-time scanning of bills of lading and customs manifests.',
        'Cross-border registry scraping and trade volume tracking.',
        'Entity resolution to filter duplicate buyers and identify parent companies.'
      ],
      simulationLogs: [
        '🚀 Initializing Buyer Discovery Agent...',
        '🔍 Scanning customs registries for HS Code: 6204.62 (Women\'s Cotton Trousers)...',
        '📊 Parsing latest bills of lading for the last 6 months...',
        '🔄 Filtered 12,480 shipments. Isolating active importers in Europe and North America...',
        '💡 Match found: "Textil GmbH" (Hamburg, Germany) - 18 shipments, total 45 tons.',
        '💡 Match found: "Nordic Retailers" (Oslo, Norway) - 9 shipments, total 22 tons.',
        '💡 Match found: "Atlas Imports Inc." (New York, USA) - 34 shipments, total 88 tons.',
        '✨ Resolving corporate structures and public contact details...',
        '✅ Agent run complete. 3 high-volume buyers verified and saved to pipeline.'
      ],
      outcome: {
        title: 'Discovered Buyers (HS 6204.62)',
        type: 'table',
        data: [
          { company: 'Atlas Imports Inc.', country: 'United States', volume: '88 Tons', reliability: '94%', contact: 'procurement@atlasimports.com' },
          { company: 'Textil GmbH', country: 'Germany', volume: '45 Tons', reliability: '89%', contact: 'buying@textilgmbh.de' },
          { company: 'Nordic Retailers', country: 'Norway', volume: '22 Tons', reliability: '87%', contact: 'sourcing@nordicretailers.no' }
        ]
      }
    },
    intelligence: {
      id: 'intelligence',
      name: 'Market Intelligence Agent',
      icon: TrendingUp,
      role: 'Global Market Opportunity Evaluator',
      description: 'Analyzes tariff rates, historical trade growth, competitor presence, and pricing dynamics to score and recommend top-performing countries for your exports.',
      capabilities: [
        'Retrieves international customs tariffs and trade agreement benefits.',
        'Calculates 5-year CAGR demand trends for specific product lines.',
        'Evaluates port logistics efficiency indices and transportation costs.'
      ],
      simulationLogs: [
        '🚀 Initializing Market Intelligence Agent...',
        '📈 Fetching 5-year historical trade data for category: Agro-products (Spices)...',
        '📊 Fetching tariff rates for India → Worldwide exports...',
        '🔍 Checking regional Free Trade Agreements (FTAs) and CEPA benefits...',
        '⚡ Analyzing competitor density (major exporters: Vietnam, Madagascar)...',
        '💡 Computing Opportunity Scores based on Tariffs, Demand, and Logistics...',
        '📈 Germany: Tariff 0% (under FTA), 5-yr CAGR +6.8%, Opportunity Score: 91/100',
        '📈 UAE: Tariff 0% (CEPA), 5-yr CAGR +8.2%, Opportunity Score: 89/100',
        '📈 Japan: Tariff 4.5%, 5-yr CAGR +2.1%, Opportunity Score: 72/100',
        '✅ Market analysis complete. Germany and UAE flagged as high-potential targets.'
      ],
      outcome: {
        title: 'Top Target Export Markets',
        type: 'list',
        data: [
          { country: 'Germany', tariff: '0.0% (FTA)', growth: '+6.8% CAGR', score: 91, status: 'Highly Recommended' },
          { country: 'United Arab Emirates', tariff: '0.0% (CEPA)', growth: '+8.2% CAGR', score: 89, status: 'Highly Recommended' },
          { country: 'Japan', tariff: '4.5%', growth: '+2.1% CAGR', score: 72, status: 'Moderate Growth' }
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
        '📧 Fetching buyer profile: "Textil GmbH" (Hamburg, Germany)...',
        '✍️ Analyzing history: Frequently imports organic cotton textiles from South Asia...',
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

wir haben festgestellt, dass Ihr Unternehmen Textil GmbH ein führender Importeur von ökologischen Textilien in Deutschland ist. 

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
      role: 'Buyer Trust & Credit Scorer',
      description: 'Calculates propensity scores for buyers by correlating trade frequencies, order volumes, financial stability records, and historical supplier retention rates.',
      capabilities: [
        'Correlates trade frequency to identify stable, recurring importers.',
        'Performs basic business credit registry checks where available.',
        'Assigns an overall Lead Score out of 100 based on fit.'
      ],
      simulationLogs: [
        '🚀 Initializing Lead Scoring Agent...',
        '📊 Processing importer data for: "Atlas Imports Inc."...',
        '📈 Transaction history audit: 34 shipments over 12 months (Stable demand).',
        '🔄 Supplier retention analysis: Supplier longevity averages 3.2 years.',
        '💳 Querying corporate registries for credit stability indicators...',
        '⚖️ Risk analysis: No legal disputes or customs violations found.',
        '🎛️ Fitting parameters: Volume Match (10/10), Stability (9/10), Growth (8/10).',
        '💡 Final score computed: 94/100.',
        '✅ Scoring complete. Lead flagged as tier-1 priority target.'
      ],
      outcome: {
        title: 'Lead Profile: Atlas Imports Inc.',
        type: 'scoring',
        score: 94,
        metrics: [
          { name: 'Import Frequency', rating: 'High (Monthly)', score: 95 },
          { name: 'Shipment Volume Fit', rating: 'Optimal Match', score: 92 },
          { name: 'Financial Reliability', rating: 'Strong Credit', score: 94 },
          { name: 'Supplier Loyalty', rating: 'High Retention', score: 90 }
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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Header utilizing reference port image professionally */}
      <div className="relative bg-[#0F172A] py-16 text-white overflow-hidden border-b border-[#1E293B]">
        <div className="absolute inset-0 z-0 opacity-15">
          <img 
            src="/port.jpg" 
            alt="Global Container Port" 
            className="w-full h-full object-cover object-center scale-105 filter blur-xs"
          />
        </div>
        
        {/* Subtle linear overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/80 to-[#0F172A]/95 z-10" />

        <div className="relative z-20 section-container">
          <button 
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-sm text-[#CBD5E1] hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
            Back to Platform Home
          </button>
          
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/40 mb-4 uppercase tracking-wider">
              Autonomous Operations Command
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4 font-heading">
              AI Trade Agents Hub
            </h1>
            <p className="text-base text-[#94A3B8] leading-relaxed">
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
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-3 pl-2">
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
                          ? 'bg-[#EFF6FF] text-[#2563EB] border-l-4 border-[#2563EB] shadow-xs' 
                          : 'bg-transparent text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md mt-0.5 ${
                        isActive ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#F1F5F9] text-[#64748B] group-hover:bg-white'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className={`text-[14px] font-semibold ${isActive ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                          {agent.name}
                        </h3>
                        <p className="text-[12px] text-[#64748B] line-clamp-1 mt-0.5 font-normal">
                          {agent.role}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trust and status card */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-5">
              <h4 className="text-[13px] font-bold text-[#0F172A] mb-3 flex items-center gap-2">
                <Globe size={15} className="text-[#2563EB]" />
                System Integration Status
              </h4>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] text-xs">
                <span className="text-[#64748B]">Custom Manifests</span>
                <span className="font-semibold text-[#059669] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Operational
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] text-xs">
                <span className="text-[#64748B]">Tariff Databases</span>
                <span className="font-semibold text-[#059669] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Online
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-[#64748B]">Language Translators</span>
                <span className="font-semibold text-[#059669] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> 12 Native APIs
                </span>
              </div>
            </div>
          </div>

          {/* Right: Active Agent Workspace */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Overview Card */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-5 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#EFF6FF] text-[#2563EB] rounded-lg">
                    <SelectedIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">{agents[activeAgent].name}</h2>
                    <span className="text-xs font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] inline-block mt-1">
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
                  <h4 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    {agents[activeAgent].description}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                    Key Agent Capabilities
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {agents[activeAgent].capabilities.map((cap, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[#475569]">
                        <Check size={16} className="text-[#059669] mt-0.5 shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Interactive Terminal Console */}
            <div className="bg-[#0F172A] rounded-lg border border-[#1E293B] overflow-hidden flex flex-col shadow-xs">
              <div className="flex items-center justify-between bg-[#1E293B] px-4 py-2.5 border-b border-[#0F172A]">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#CBD5E1]" />
                  <span className="text-xs font-mono font-semibold text-[#CBD5E1]">agent_simulation_terminal.log</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>
              </div>

              <div className="p-5 font-mono text-[13px] min-h-[180px] max-h-[260px] overflow-y-auto flex flex-col gap-1.5 bg-[#0F172A] text-slate-300">
                {simulatedLogs.length === 0 ? (
                  <div className="text-slate-500 italic flex items-center justify-center h-[140px]">
                    Click "Run Demo" above to watch the agent think and perform operations.
                  </div>
                ) : (
                  simulatedLogs.map((log, index) => (
                    <div 
                      key={index}
                      className={`leading-relaxed border-l-2 pl-3 py-0.5 ${
                        log && log.startsWith('🚀') ? 'text-[#3B82F6] border-[#3B82F6]' :
                        log && log.startsWith('✅') ? 'text-[#10B981] border-[#10B981]' :
                        log && log.startsWith('⚠️') ? 'text-[#F59E0B] border-[#F59E0B]' :
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
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-xs animate-fade-in">
                <h3 className="text-base font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-3 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#059669]" />
                  Simulation Result: {agents[activeAgent].outcome.title}
                </h3>

                {/* Outcome rendering depends on activeAgent outcome type */}
                
                {/* 1. TABLE Outcome */}
                {agents[activeAgent].outcome.type === 'table' && (
                  <div className="overflow-x-auto rounded-md border border-[#E2E8F0]">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Importer Company</th>
                          <th>Country</th>
                          <th>Est. Import Volume</th>
                          <th>Reliability Score</th>
                          <th>Verified Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents[activeAgent].outcome.data.map((row, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-[#0F172A]">{row.company}</td>
                            <td>{row.country}</td>
                            <td>{row.volume}</td>
                            <td>
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
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
                      <div key={idx} className="border border-[#E2E8F0] rounded-md p-4 bg-[#F8FAFC]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-[#0F172A]">{row.country}</span>
                          <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                            Score: {row.score}
                          </span>
                        </div>
                        <div className="text-xs text-[#64748B] flex flex-col gap-1 mt-3">
                          <div className="flex justify-between">
                            <span>Import Tariff:</span>
                            <span className="font-medium text-[#334155]">{row.tariff}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>5-Yr CAGR:</span>
                            <span className="font-medium text-[#334155]">{row.growth}</span>
                          </div>
                          <div className="mt-2 text-center text-[10px] font-bold text-[#047857] bg-[#ECFDF5] py-1 rounded border border-[#A7F3D0]">
                            {row.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. EMAIL Outcome */}
                {agents[activeAgent].outcome.type === 'email' && (
                  <div className="border border-[#E2E8F0] rounded-md overflow-hidden bg-[#F8FAFC]">
                    <div className="bg-[#E2E8F0]/40 px-4 py-2.5 border-b border-[#E2E8F0] text-xs font-mono">
                      <div className="mb-1 text-slate-500">
                        <span className="font-bold text-slate-700">Subject: </span>
                        {agents[activeAgent].outcome.subject}
                      </div>
                    </div>
                    <div className="p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed text-[#334155] bg-white max-h-[220px] overflow-y-auto">
                      {agents[activeAgent].outcome.body}
                    </div>
                  </div>
                )}

                {/* 4. CHECKLIST Outcome */}
                {agents[activeAgent].outcome.type === 'checklist' && (
                  <div className="flex flex-col gap-3">
                    {agents[activeAgent].outcome.data.map((row, idx) => (
                      <div key={idx} className="flex items-start gap-3 border border-[#E2E8F0] rounded-md p-3.5 bg-white">
                        <div className="p-1 rounded-full bg-[#ECFDF5] text-[#059669] mt-0.5">
                          <Check size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-[13px] font-bold text-[#0F172A]">{row.check}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              {row.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5">Authority: {row.authority}</p>
                          <div className="mt-2 text-xs font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-1 rounded inline-block">
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
                    <div className="md:col-span-4 flex flex-col items-center justify-center border border-[#E2E8F0] rounded-md p-5 bg-[#F8FAFC] text-center">
                      <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-1">Overall Fit Score</span>
                      <div className="text-5xl font-black text-[#2563EB] my-2">{agents[activeAgent].outcome.score}</div>
                      <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                        Tier-1 Match
                      </span>
                    </div>

                    <div className="md:col-span-8 flex flex-col gap-3">
                      <h4 className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wider pl-1">Capability Breakdown</h4>
                      <div className="flex flex-col gap-2">
                        {agents[activeAgent].outcome.metrics.map((row, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs text-[#334155] mb-1">
                              <span className="font-semibold">{row.name}</span>
                              <span className="font-medium text-slate-500">{row.rating} ({row.score}/100)</span>
                            </div>
                            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#2563EB] h-full rounded-full transition-all duration-500" 
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
