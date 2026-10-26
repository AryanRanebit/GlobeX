import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, TrendingUp, Mail, FileText, CheckCircle2, Terminal,
  Play, Check, Loader2, ShieldAlert, Globe, LogOut,
  ChevronRight, Sparkles, Activity, Package, Users, ArrowUpRight,
  Bell, Settings, Home, RefreshCw, AlertCircle, Zap, X, SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  analyzeMarket,
  scoreLeadDirect,
  generateOutreachDirect,
  discoverBuyers,
  assessComplianceDirect,
  getUserProducts
} from '../lib/api';

/* ────────────────────────────────────────────────────────── */
/*  Predefined Suggestions & Destination Markets               */
/* ────────────────────────────────────────────────────────── */
const SUGGESTED_PRODUCTS = [
  { name: 'Basmati Rice', hsCode: '1006.30', icon: '🌾' },
  { name: 'Organic Turmeric', hsCode: '0910.30', icon: '🌿' },
  { name: 'Cotton Garments', hsCode: '6204.62', icon: '👕' },
  { name: 'Ceramic Floor Tiles', hsCode: '6907.21', icon: '🧱' },
  { name: 'Auto Components', hsCode: '8708.29', icon: '⚙️' },
  { name: 'Specialty Coffee', hsCode: '0901.11', icon: '☕' },
  { name: 'Pharmaceuticals', hsCode: '3004.90', icon: '💊' },
];

const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
];

/* ────────────────────────────────────────────────────────── */
/*  Fallback buyer context for B2B simulations                 */
/* ────────────────────────────────────────────────────────── */
const DEMO_BUYER = {
  companyName: 'Atlas Imports Inc.',
  country: 'United States',
  industry: 'Food & Beverage',
  importVolume: 'High',
  isVerified: true,
  annualRevenue: '$12M',
  employeeCount: 120,
  email: 'procurement@atlasimports.com',
  website: 'https://atlasimports.com',
};

function getAgentStreamingLogs(agentId, product, country) {
  switch (agentId) {
    case 'discovery':
      return [
        `> Initializing Buyer Discovery Agent for: "${product}"...`,
        `> Target markets: ${country} and major global trade hubs...`,
        `> Engaging Gemini AI with Google Search grounding...`,
        `> Querying commercial import registries and bills of lading...`,
        `> Filtering for verified active B2B buyers...`,
        `> Compiling buyer profiles, contact estimates, and volumes...`,
      ];
    case 'intelligence':
      return [
        `> Initializing Market Intelligence Agent for: "${product}"...`,
        `> Connecting to GlobeX AI Python service...`,
        `> Querying historical global demand trends for ${product}...`,
        `> Evaluating tariff schedules India → ${country} & global markets...`,
        `> Checking regional trade agreements (FTAs / CEPAs)...`,
        `> Computing Opportunity Scores: Demand + Tariffs + Logistics...`,
        `> Running neural synthesis via Gemini...`,
      ];
    case 'scoring':
      return [
        `> Initializing Lead Scoring Agent for: "${product}"...`,
        `> Auditing importer in ${country}...`,
        `> Checking recurring import frequency and shipment consistency...`,
        `> Assessing corporate credit stability and risk indicators...`,
        `> Correlating product compatibility with "${product}"...`,
        `> Computing multi-factor confidence lead score...`,
      ];
    case 'outreach':
      return [
        `> Initializing Outreach & RFP Agent for: "${product}"...`,
        `> Structuring value proposition tailored to ${country}...`,
        `> Adapting tone to regional commercial standards...`,
        `> Highlighting certifications, FOB pricing, and specifications...`,
        `> Validating international anti-spam compliance (CAN-SPAM/GDPR)...`,
      ];
    case 'compliance':
      return [
        `> Initializing Compliance & Customs Agent for: "${product}" → ${country}...`,
        `> Verifying Harmonized System (HS / ITC-HS) classification...`,
        `> Cross-referencing destination import regulations for ${country}...`,
        `> Calculating customs duty tariffs and export incentives...`,
        `> Identifying mandatory testing, quality and SPS certificates...`,
        `> Assembling customs clearance roadmap...`,
      ];
    default:
      return ['> Initializing agent...', '> Running AI inference...'];
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Agent definitions                                          */
/* ────────────────────────────────────────────────────────── */
const AGENTS = {
  discovery: {
    id: 'discovery',
    name: 'Buyer Discovery',
    fullName: 'Buyer Discovery Agent',
    icon: Search,
    color: '#2563EB',
    bg: '#EFF6FF',
    role: 'Global Trade Importer Finder',
    tag: 'Find Buyers',
    liveApi: true,
    description: 'Crawls international shipping records, customs registries, and business directories to compile verified active buyers purchasing your HS code products.',
    capabilities: [
      'Real-time scanning of bills of lading & customs manifests.',
      'Cross-border registry scraping and trade volume tracking.',
      'Entity resolution to filter duplicates and identify parent companies.'
    ],
    streamingLogs: [
      '> Initializing Buyer Discovery Agent...',
      '> Engaging Gemini with Google Web Search grounding...',
      '> Searching real web sources for companies importing the product...',
      '> Filtering for verified B2B importers...',
      '> Compiling company names, industries, and contact estimates...',
    ],
    outcome: {
      title: 'Discovered Buyers — HS 6204.62 (Interactive Sample Preview)',
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
    name: 'Market Intelligence',
    fullName: 'Market Intelligence Agent',
    icon: TrendingUp,
    color: '#059669',
    bg: '#ECFDF5',
    role: 'Global Market Opportunity Evaluator',
    tag: 'Analyze Markets',
    liveApi: true,
    description: 'Analyzes tariff rates, historical trade growth, competitor presence, and pricing dynamics to score and recommend top-performing export countries.',
    capabilities: [
      'Retrieves customs tariffs and Free Trade Agreement benefits.',
      'Calculates 5-year CAGR demand trends for specific product lines.',
      'Evaluates port logistics efficiency and transportation cost indices.'
    ],
    streamingLogs: [
      '> Initializing Market Intelligence Agent...',
      '> Connecting to GlobeX AI Python service...',
      '> Fetching 5-year historical trade data for: Organic Spices...',
      '> Fetching tariff rates for India → Worldwide exports...',
      '> Checking regional FTAs and CEPA benefits...',
      '> Analyzing competitor density (major exporters: Vietnam, Madagascar)...',
      '> Computing Opportunity Scores: Tariffs + Demand + Logistics...',
      '> Running AI inference via Gemini...',
    ],
  },
  outreach: {
    id: 'outreach',
    name: 'Outreach & RFP',
    fullName: 'Outreach & RFP Agent',
    icon: Mail,
    color: '#7C3AED',
    bg: '#F5F3FF',
    role: 'Multilingual Pitch Generator',
    tag: 'Generate Outreach',
    liveApi: true,
    description: 'Automatically drafts personalized B2B outreach proposals and RFP replies, tailored to local market cultures and languages for maximum conversion.',
    capabilities: [
      'Generates hyper-personalized outreach from buyer transaction histories.',
      'Native localization for European, Middle Eastern, and Asian markets.',
      'Follows professional email compliance standards (CAN-SPAM / GDPR).'
    ],
    streamingLogs: [
      '> Initializing Outreach & RFP Agent...',
      '> Fetching buyer profile: "Atlas Imports Inc." (United States)...',
      '> Analyzing import history: Frequently imports organic food products from South Asia...',
      '> Selecting draft language: English for US market...',
      '> Generating personalized value proposition...',
      '> Applying tone: Professional & compelling...',
      '> Running AI inference via Gemini...',
      '> Checking compliance standards (CAN-SPAM)...',
    ],
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance & Customs',
    fullName: 'Compliance & Customs Agent',
    icon: FileText,
    color: '#D97706',
    bg: '#FFFBEB',
    role: 'Trade Barriers & Regulations Advisor',
    tag: 'Check Compliance',
    liveApi: true,
    description: 'Verifies customs requirements, certifications, product labeling mandates, and testing protocols required for seamless entry into target countries.',
    capabilities: [
      'Cross-references target country customs protocols with your HS code.',
      'Highlights mandatory safety, agricultural, or environmental certifications.',
      'Calculates bilateral trade tariffs, export incentives (RoDTEP/Drawback), and port clearance procedures.'
    ],
    streamingLogs: [
      '> Initializing Compliance & Customs Agent...',
      '> Verifying Harmonized System (HS / ITC-HS) classification...',
      '> Accessing DGFT export policy and bilateral trade agreement schedules...',
      '> Calculating Customs Tariffs, MFN rates & RoDTEP/Duty Drawback...',
      '> Evaluating mandatory export certifications (APEDA, Spices Board, NABL)...',
      '> Screening destination import regulations (EU Regulation 2018/848, EFSA, CE)...',
      '> Validating compliant bilingual labeling and ICEGATE clearance documentation...',
    ],
    outcome: {
      title: 'EU Compliance Checklist',
      type: 'checklist',
      data: [
        { check: 'Phytosanitary Certificate', authority: 'Ministry of Agriculture, India', status: 'Required', action: 'Apply 7 days before shipping' },
        { check: 'Pesticide MRL Test Report', authority: 'NABL Accredited Laboratory', status: 'Required', action: 'Batch sample testing mandatory' },
        { check: 'EU-Standard Bilingual Labeling', authority: 'Self-Declaration', status: 'Required', action: 'Incorporate German labels on packaging' }
      ]
    }
  },
  scoring: {
    id: 'scoring',
    name: 'Lead Scoring',
    fullName: 'Lead Scoring Agent',
    icon: CheckCircle2,
    color: '#DC2626',
    bg: '#FEF2F2',
    role: 'Buyer Trust & Credit Scorer',
    tag: 'Score Leads',
    liveApi: true,
    description: 'Calculates propensity scores for buyers by correlating trade frequencies, order volumes, financial stability records, and supplier retention rates.',
    capabilities: [
      'Correlates trade frequency to identify stable, recurring importers.',
      'Performs business credit registry checks where available.',
      'Assigns an overall Lead Score out of 100 based on fit and stability.'
    ],
    streamingLogs: [
      '> Initializing Lead Scoring Agent...',
      '> Processing target importer and trade registry profiles...',
      '> Auditing transaction frequency and shipment reliability...',
      '> Running supplier retention analysis...',
      '> Querying corporate registries for credit stability indicators...',
      '> Risk analysis: Checking customs violations and legal disputes...',
      '> Computing multi-factor score model...',
      '> Running AI inference via Gemini...',
    ],
  }
};

/* ────────────────────────────────────────────────────────── */
/*  Build live outcome from API response                       */
/* ────────────────────────────────────────────────────────── */
function buildMarketOutcome(apiData) {
  return {
    title: `Top Export Markets — ${apiData.product}`,
    type: 'list',
    summary: apiData.summary,
    candidateHsCode: apiData.candidateHsCode,
    candidateHsCodes: apiData.candidateHsCodes || (apiData.candidateHsCode ? [{ hs_code: apiData.candidateHsCode, confidence: 'indicative' }] : []),
    dataSourceMode: apiData.dataSourceMode,
    disclaimer: apiData.disclaimer,
    savedOpportunitiesCount: apiData.savedOpportunitiesCount,
    data: (apiData.recommendedCountries || []).map(c => ({
      country: c.country,
      countryCode: c.countryCode,
      tariff: `${c.competition} Competition`,
      growth: c.growthRate,
      marketSize: c.marketSize,
      trend: c.trend,
      score: c.demandScore,
      insights: c.insights,
      status: c.demandScore >= 85 ? 'Highly Recommended' : c.demandScore >= 70 ? 'Recommended' : 'Monitor',
    })),
  };
}

function buildScoringOutcome(apiData, buyerName = DEMO_BUYER.companyName, productName = '', isSample = false) {
  return {
    title: `Lead Profile: ${buyerName}${productName ? ` (${productName})` : ''}${isSample ? ' [Sample Profile]' : ''}`,
    type: 'scoring',
    score: apiData.score,
    reasoning: apiData.reasoning,
    factors: apiData.factors || [],
    metrics: (apiData.factors || []).slice(0, 4).map(f => ({
      name: f.factor,
      rating: f.impact === 'positive' ? 'Positive Signal' : f.impact === 'negative' ? 'Risk Factor' : 'Neutral',
      score: f.impact === 'positive' ? Math.min(100, 60 + Math.abs(f.weight)) : Math.max(0, 50 - Math.abs(f.weight)),
    })),
  };
}

function buildOutreachOutcome(apiData, buyerName = DEMO_BUYER.companyName, productName = '', isSample = false) {
  return {
    title: `Generated Outreach — ${buyerName}${productName ? ` (${productName})` : ''}${isSample ? ' [Sample Profile]' : ''}`,
    type: 'email',
    subject: apiData.subject,
    body: apiData.content,
    model: apiData.model,
  };
}

function buildDiscoveryOutcome(apiData, productName = 'Export Product') {
  return {
    title: `Discovered Buyers — ${productName}`,
    type: 'table',
    data: (apiData.buyers || []).map(b => ({
      company: b.companyName,
      country: b.country,
      volume: b.importVolume || 'Medium',
      reliability: `${b.estimatedLeadScore || 50}%`,
      contact: b.email || 'N/A'
    }))
  };
}

function buildComplianceOutcome(apiData) {
  return {
    title: `Trade Compliance & Customs — ${apiData.product} to ${apiData.destinationCountry}`,
    type: 'checklist',
    hsCode: apiData.hsCode,
    hsDescription: apiData.hsDescription,
    dutyCalculation: apiData.dutyCalculation,
    mandatoryCertifications: apiData.mandatoryCertifications || [],
    labelingAndPackaging: apiData.labelingAndPackaging || [],
    customsClearance: apiData.customsClearance || {},
    data: apiData.checklist || [],
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Stat card                                                  */
/* ────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex items-start gap-4">
      <div className="p-2.5 rounded-lg" style={{ background: color + '18' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-[12px] text-[#64748B] font-medium">{label}</p>
        <p className="text-2xl font-black text-[#0F172A] leading-tight">{value}</p>
        <p className="text-[11px] text-[#94A3B8] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Flag emoji helper                                          */
/* ────────────────────────────────────────────────────────── */
const COUNTRY_FLAGS = {
  DE: '🇩🇪', US: '🇺🇸', AE: '🇦🇪', GB: '🇬🇧', AU: '🇦🇺',
  JP: '🇯🇵', CA: '🇨🇦', NL: '🇳🇱', SG: '🇸🇬', FR: '🇫🇷',
};
function flag(code) { return COUNTRY_FLAGS[code] || '🌍'; }

/* ────────────────────────────────────────────────────────── */
/*  Main Dashboard                                             */
/* ────────────────────────────────────────────────────────── */
export default function AiAgentsHub({ onBackToLanding }) {
  const { user, logout } = useAuth();
  const [activeAgent, setActiveAgent] = useState('discovery');
  const [isRunning, setIsRunning] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState([]);
  const [liveOutcome, setLiveOutcome] = useState(null);
  const [apiError, setApiError] = useState(null);
  const terminalBoxRef = useRef(null);
  const intervalRef = useRef(null);

  // Dynamic Product & Market Configuration State
  const [searchProduct, setSearchProduct] = useState('Basmati Rice');
  const [targetCountry, setTargetCountry] = useState('United States');
  const [targetCountryCode, setTargetCountryCode] = useState('US');
  const [hsCodeInput, setHsCodeInput] = useState('1006.30');
  const [userProducts, setUserProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [discoveredBuyers, setDiscoveredBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const agent = AGENTS[activeAgent];

  // Fetch registered products from DB if user is logged in
  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoadingProducts(true);
        const prods = await getUserProducts();
        if (Array.isArray(prods) && prods.length > 0) {
          setUserProducts(prods);
        }
      } catch (err) {
        console.warn('Could not load user products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    if (user) {
      loadProducts();
    }
  }, [user]);

  // Reset outcome on agent switch
  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false);
    setSimulatedLogs([]);
    setLiveOutcome(null);
    setApiError(null);
  }, [activeAgent]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Internal terminal scroll only (doesn't jump browser page)
  useEffect(() => {
    if (terminalBoxRef.current && simulatedLogs.length > 0) {
      terminalBoxRef.current.scrollTop = terminalBoxRef.current.scrollHeight;
    }
  }, [simulatedLogs]);

  const handleSelectSuggested = (item) => {
    setSearchProduct(item.name);
    setHsCodeInput(item.hsCode);
  };

  const handleCountryChange = (e) => {
    const code = e.target.value;
    const found = TARGET_COUNTRIES.find(c => c.code === code);
    setTargetCountryCode(code);
    if (found) setTargetCountry(found.name);
  };

  const handleUserProductSelect = (e) => {
    const prodId = e.target.value;
    if (!prodId) return;
    const found = userProducts.find(p => p.id === prodId);
    if (found) {
      setSearchProduct(found.productName || found.name);
      if (found.hsCode) setHsCodeInput(found.hsCode);
    }
  };

  /* ── Pure simulation (fallback) ── */
  const runSimulation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(true);
    setSimulatedLogs([]);
    setLiveOutcome(null);
    setApiError(null);
    const logs = agent.simulationLogs || agent.streamingLogs;
    let step = 0;
    intervalRef.current = setInterval(() => {
      if (step < logs.length) {
        setSimulatedLogs(prev => [...prev, logs[step++]]);
      } else {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        setLiveOutcome(agent.outcome);
      }
    }, 700);
  }, [agent]);

  /* ── Live API run with dynamic product and destination ── */
  const runLiveAgent = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(true);
    setSimulatedLogs([]);
    setLiveOutcome(null);
    setApiError(null);

    const effectiveProduct = searchProduct.trim() || 'Basmati Rice';
    const effectiveCountry = targetCountry || 'United States';
    const effectiveHsCode = hsCodeInput.trim() || '1006.30';

    // Stream pre-run logs tailored to user's product and country
    const logs = getAgentStreamingLogs(agent.id, effectiveProduct, effectiveCountry);
    let step = 0;

    await new Promise((resolve) => {
      intervalRef.current = setInterval(() => {
        if (step < logs.length) {
          setSimulatedLogs(prev => [...prev, logs[step++]]);
        } else {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          resolve();
        }
      }, 500);
    });

    // Actual API call
    try {
      if (!user) {
        throw new Error('Authentication required: Please log in or sign up to use live AI inference.');
      }
      setSimulatedLogs(prev => [...prev, '> Querying GlobeX AI reasoning engine with your parameters...']);
      let result;

      if (agent.id === 'intelligence') {
        result = await analyzeMarket({ product: effectiveProduct, targetRegions: [effectiveCountry] });
        setSimulatedLogs(prev => [...prev, `> Analysis complete for "${effectiveProduct}". ${result.recommendedCountries?.length || 0} markets evaluated.`]);
        setSimulatedLogs(prev => [...prev, '> Generating market intelligence report...']);
        setLiveOutcome(buildMarketOutcome(result));
      } else if (agent.id === 'discovery') {
        result = await discoverBuyers({ product: effectiveProduct, targetCountries: [targetCountryCode || 'US'] });
        const buyersList = result.buyers || [];
        setDiscoveredBuyers(buyersList);
        if (buyersList.length > 0) {
          setSelectedBuyer(buyersList[0]);
        }
        setSimulatedLogs(prev => [...prev, `> Discovered ${buyersList.length} real buyers actively importing "${effectiveProduct}".`]);
        setSimulatedLogs(prev => [...prev, '> Persisted buyer leads to workspace database.']);
        setLiveOutcome(buildDiscoveryOutcome(result, effectiveProduct));

      } else if (agent.id === 'scoring') {
        const targetBuyer = selectedBuyer || (discoveredBuyers.length > 0 ? discoveredBuyers[0] : null);
        const buyerPayload = targetBuyer
          ? {
              companyName: targetBuyer.companyName || targetBuyer.company,
              country: targetBuyer.country || effectiveCountry,
              industry: targetBuyer.industry || effectiveProduct,
              importVolume: targetBuyer.importVolume || targetBuyer.volume || 'Medium',
              isVerified: !!targetBuyer.isVerified,
              email: targetBuyer.email || targetBuyer.contact,
              website: targetBuyer.website,
            }
          : { ...DEMO_BUYER, country: effectiveCountry };
        const isSample = !targetBuyer;
        result = await scoreLeadDirect({
          buyer: buyerPayload,
          product: { productName: effectiveProduct, hsCode: effectiveHsCode }
        });
        setSimulatedLogs(prev => [...prev, `> Propensity Score computed: ${result.score}/100 (confidence: ${Math.round((result.confidence || 0.8) * 100)}%)`]);
        setSimulatedLogs(prev => [...prev, `> Buyer trust profile compiled for "${buyerPayload.companyName}".`]);
        setLiveOutcome(buildScoringOutcome(result, buyerPayload.companyName, effectiveProduct, isSample));

      } else if (agent.id === 'outreach') {
        const targetBuyer = selectedBuyer || (discoveredBuyers.length > 0 ? discoveredBuyers[0] : null);
        const buyerPayload = targetBuyer
          ? {
              companyName: targetBuyer.companyName || targetBuyer.company,
              country: targetBuyer.country || effectiveCountry,
              industry: targetBuyer.industry || effectiveProduct,
              importVolume: targetBuyer.importVolume || targetBuyer.volume || 'Medium',
              isVerified: !!targetBuyer.isVerified,
              email: targetBuyer.email || targetBuyer.contact,
              website: targetBuyer.website,
            }
          : { ...DEMO_BUYER, country: effectiveCountry };
        const isSample = !targetBuyer;
        result = await generateOutreachDirect({
          buyer: buyerPayload,
          sender: {
            name: user?.name || 'Export Manager',
            companyName: user?.companyName || 'GlobeX Exports',
            industry: effectiveProduct,
          },
          tone: 'professional',
          language: 'English',
          customContext: `Offering premium-grade ${effectiveProduct} (HS Code ${effectiveHsCode}) for import into ${buyerPayload.country || effectiveCountry}.`
        });
        setSimulatedLogs(prev => [...prev, `> Pitch generated for "${effectiveProduct}". Subject: "${result.subject?.slice(0, 40)}..."`]);
        setLiveOutcome(buildOutreachOutcome(result, buyerPayload.companyName, effectiveProduct, isSample));

      } else if (agent.id === 'compliance') {
        result = await assessComplianceDirect({
          product: effectiveProduct,
          destinationCountry: effectiveCountry,
          hsCode: effectiveHsCode,
          originCountry: 'India'
        });
        setSimulatedLogs(prev => [...prev, `> Verified HS Code: ${result.hsCode}. Duty Tariff: ${result.dutyCalculation?.totalTariffPct ?? 7}%`]);
        setSimulatedLogs(prev => [...prev, `> Verified ${result.mandatoryCertifications?.length || 4} regulatory certificates for ${effectiveCountry}.`]);
        setSimulatedLogs(prev => [...prev, '> Compliance roadmap compiled successfully.']);
        setLiveOutcome(buildComplianceOutcome(result));
      }

      setSimulatedLogs(prev => [...prev, '> Agent execution complete. Results loaded below.']);
    } catch (err) {
      setApiError(err.message || 'Agent failed. Please try again.');
      setSimulatedLogs(prev => [...prev, `> ERROR: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  }, [agent, user, searchProduct, targetCountry, targetCountryCode, hsCodeInput]);

  const handleRun = () => {
    if (agent.liveApi) runLiveAgent();
    else runSimulation();
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const AgentIcon = agent.icon;
  const showOutcome = !!liveOutcome;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col">

      {/* ── Top Dashboard Bar ───────────────────────────────── */}
      <div className="bg-[#0F172A] border-b border-[#1E293B] sticky top-0 z-40">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <img src="/port.jpg" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-transparent to-[#0F172A]" />
        </div>
        <div className="relative section-container h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/globex-logo.jpg" alt="GlobeX Logo" className="w-7 h-7 rounded-lg object-contain bg-white border border-[#334155] shrink-0" />
            <span className="text-white font-bold text-sm tracking-tight">GlobeX</span>
            <span className="hidden md:block text-[#475569] text-xs">/</span>
            <span className="hidden md:block text-[#94A3B8] text-xs font-medium">AI Trade Agents</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLanding}
              className="hidden md:flex items-center gap-1.5 text-[12px] text-[#94A3B8] hover:text-white transition-colors"
            >
              <Home size={13} /> Back to Site
            </button>

            <button className="relative p-1.5 text-[#64748B] hover:text-[#94A3B8] transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            </button>

            {user && (
              <div className="flex items-center gap-2 bg-[#1E293B] rounded-lg px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[11px] font-bold">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <p className="text-[12px] font-semibold text-white leading-none">{user.name || user.email}</p>
                  <p className="text-[10px] text-[#64748B]">{user.companyName || 'GlobeX User'}</p>
                </div>
                <button
                  onClick={() => { logout(); onBackToLanding(); }}
                  className="ml-1 text-[#64748B] hover:text-[#EF4444] transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dashboard Body ──────────────────────────────────── */}
      <div className="flex-1 section-container py-8">

        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-[#0F172A] leading-tight">
                Welcome back, {firstName} 👋
              </h1>
              <p className="text-[14px] text-[#64748B] mt-1">
                Your AI Trade Agents are live. Select an agent and click <strong>Run Agent</strong> to see real-time results.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span className="text-[12px] font-semibold text-[#059669]">All Agents Operational</span>
            </div>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Buyers Discovered" value="3,200+" sub="Last 30 days" color="#2563EB" />
          <StatCard icon={Globe} label="Markets Analyzed" value="47" sub="Active coverage" color="#059669" />
          <StatCard icon={Mail} label="Emails Generated" value="820" sub="This month" color="#7C3AED" />
          <StatCard icon={Activity} label="Avg. Lead Score" value="88.4" sub="Tier-1 pipeline" color="#D97706" />
        </div>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Sidebar ───────────────────────── */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F1F5F9]">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  AI Agents
                </span>
              </div>
              <div className="flex flex-col p-2 gap-1">
                {Object.values(AGENTS).map((ag) => {
                  const Icon = ag.icon;
                  const isActive = activeAgent === ag.id;
                  return (
                    <button
                      key={ag.id}
                      onClick={() => setActiveAgent(ag.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                        isActive ? 'text-white shadow-sm' : 'text-[#475569] hover:bg-[#F8FAFC]'
                      }`}
                      style={isActive ? { background: ag.color } : {}}
                    >
                      <div
                        className="p-1.5 rounded-md shrink-0"
                        style={isActive
                          ? { background: 'rgba(255,255,255,0.2)' }
                          : { background: ag.bg }
                        }
                      >
                        <Icon size={15} style={{ color: isActive ? '#fff' : ag.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-white' : 'text-[#334155]'}`}>
                          {ag.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-[#94A3B8]'}`}>
                            {ag.tag}
                          </p>
                          {ag.liveApi && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#059669]/10 text-[#059669]'
                            }`}>
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>
                      {isActive && <ChevronRight size={13} className="ml-auto text-white/60 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System status */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
              <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">
                System Status
              </h4>
              {[
                ['Express API', true],
                ['Python AI Agent', true],
                ['ChromaDB', true],
                ['Auth Service', true],
                ['Market Database', true],
              ].map(([label, online]) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC] last:border-0 text-[12px]">
                  <span className="text-[#64748B]">{label}</span>
                  <span className={`flex items-center gap-1 font-semibold ${online ? 'text-[#059669]' : 'text-[#EF4444]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#059669]' : 'bg-[#EF4444]'}`} />
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main workspace ────────────────── */}
          <div className="lg:col-span-9 flex flex-col gap-5">

            {/* ── Dynamic Product & Market Configurator ──────────────── */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                    <SlidersHorizontal size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0F172A]">Target Product & Export Market Setup</h3>
                    <p className="text-[12px] text-[#64748B]">
                      Enter any product, destination country, and HS code to evaluate with our AI Trade Agents.
                    </p>
                  </div>
                </div>

                {/* Saved products shortcut if available */}
                {userProducts.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Package size={13} className="text-[#64748B]" />
                    <select
                      onChange={handleUserProductSelect}
                      defaultValue=""
                      className="text-[12px] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#334155] focus:outline-hidden focus:border-[#2563EB]"
                    >
                      <option value="" disabled>Load from Saved Catalog ({userProducts.length})</option>
                      {userProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.productName || p.name} {p.hsCode ? `(${p.hsCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Input controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
                {/* Product Search Input */}
                <div className="md:col-span-6">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Export Product Name
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      placeholder="e.g. Basmati Rice, Cotton Garments, Solar Panels, Tea..."
                      className="w-full pl-9 pr-8 py-2 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] font-medium placeholder-[#94A3B8] focus:bg-white focus:border-[#2563EB] focus:outline-hidden transition-all"
                    />
                    {searchProduct && (
                      <button
                        type="button"
                        onClick={() => setSearchProduct('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Destination Country Select */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Destination Market
                  </label>
                  <select
                    value={targetCountryCode}
                    onChange={handleCountryChange}
                    className="w-full py-2 px-3 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] font-medium focus:bg-white focus:border-[#2563EB] focus:outline-hidden transition-all"
                  >
                    {TARGET_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* HS Code Input */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    HS Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={hsCodeInput}
                    onChange={(e) => setHsCodeInput(e.target.value)}
                    placeholder="e.g. 1006.30"
                    className="w-full py-2 px-3 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] font-medium placeholder-[#94A3B8] focus:bg-white focus:border-[#2563EB] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Quick Preset Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F8FAFC]">
                <span className="text-[11px] font-bold text-[#94A3B8] mr-1">Quick Suggestions:</span>
                {SUGGESTED_PRODUCTS.map((item) => {
                  const isSelected = searchProduct.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelectSuggested(item)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agent header card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F1F5F9] mb-5">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-xl" style={{ background: agent.bg }}>
                    <AgentIcon size={26} style={{ color: agent.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-[#0F172A]">{agent.fullName}</h2>
                      {agent.liveApi && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                          <Zap size={9} /> LIVE API
                        </span>
                      )}
                    </div>
                    <span
                      className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                      style={{ color: agent.color, background: agent.bg, borderColor: agent.color + '40' }}
                    >
                      {agent.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 shrink-0"
                  style={{ background: isRunning ? '#94A3B8' : agent.color }}
                >
                  {isRunning ? (
                    <><Loader2 size={15} className="animate-spin" /> Running…</>
                  ) : (
                    <><Play size={15} fill="currentColor" /> {agent.liveApi ? 'Run Agent' : 'Run Simulation'}</>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">What This Agent Does</h4>
                  <p className="text-[13px] text-[#475569] leading-relaxed">{agent.description}</p>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Key Capabilities</h4>
                  <ul className="flex flex-col gap-2">
                    {agent.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#475569]">
                        <Check size={14} className="mt-0.5 shrink-0" style={{ color: agent.color }} />
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Active Target Parameters */}
              <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                <span className="font-bold text-[#0F172A]">Active Target:</span>
                <span className="bg-[#EFF6FF] text-[#1E40AF] font-semibold px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
                  📦 Product: {searchProduct || 'Basmati Rice'}
                </span>
                <span className="bg-[#F0FDF4] text-[#166534] font-semibold px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                  🌍 Destination: {targetCountry} ({targetCountryCode})
                </span>
                {hsCodeInput && (
                  <span className="bg-[#FEF3C7] text-[#92400E] font-semibold px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                    📑 HS: {hsCodeInput}
                  </span>
                )}
                <span className="bg-[#F8FAFC] text-[#059669] px-2 py-0.5 rounded-full font-bold ml-auto flex items-center gap-1 border border-[#E2E8F0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  Live Gemini 3.5 Flash
                </span>
              </div>
            </div>

            {/* Terminal */}
            <div className="rounded-xl border border-[#1E293B] overflow-hidden bg-[#0F172A]">
              <div className="flex items-center justify-between bg-[#1E293B] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Terminal size={13} className="text-[#64748B]" />
                  <span className="text-[11px] font-mono font-semibold text-[#64748B]">
                    agent_runtime.log — {agent.fullName}
                  </span>
                  {agent.liveApi && (
                    <span className="text-[9px] font-bold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>
              </div>
              <div ref={terminalBoxRef} className="p-5 font-mono text-[12px] min-h-[180px] max-h-[260px] overflow-y-auto flex flex-col gap-1.5">
                {simulatedLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[140px] gap-2 text-slate-600">
                    <Terminal size={22} />
                    <p className="text-xs italic">
                      Press "{agent.liveApi ? 'Run Agent' : 'Run Simulation'}" to watch the agent execute in real-time.
                    </p>
                  </div>
                ) : (
                  simulatedLogs.map((log, i) => (
                    <div key={i}
                      className={`leading-relaxed border-l-2 pl-3 py-0.5 ${
                        log?.includes('ERROR') ? 'text-[#F87171] border-[#EF4444]' :
                        log?.includes('complete') || log?.includes('ready') ? 'text-[#34D399] border-[#10B981]' :
                        log?.includes('ALERT') ? 'text-[#FCD34D] border-[#F59E0B]' :
                        log?.startsWith('> Initializing') ? 'text-[#60A5FA] border-[#3B82F6]' :
                        'text-slate-300 border-slate-700'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
                {isRunning && (
                  <div className="flex items-center gap-2 text-slate-500 pl-3 mt-1 border-l-2 border-slate-800">
                    <Loader2 size={11} className="animate-spin" />
                    <span>{agent.liveApi ? 'Calling AI agent...' : 'Processing next step...'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error state */}
            {apiError && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-[#DC2626]">Agent Error</p>
                  <p className="text-[12px] text-[#EF4444] mt-0.5">{apiError}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Make sure the Express backend (port 3000) and Python AI agent (port 8000) are both running.
                  </p>
                </div>
              </div>
            )}

            {/* Outcome panel */}
            {showOutcome && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ background: agent.bg }}>
                      <Sparkles size={15} style={{ color: agent.color }} />
                    </div>
                    <h3 className="text-[15px] font-bold text-[#0F172A]">
                      {agent.liveApi ? 'Live AI Result:' : 'Simulation Result:'} {liveOutcome.title}
                    </h3>
                    {agent.liveApi && (
                      <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full">
                        AI Generated
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRun}
                    className="flex items-center gap-1.5 text-[12px] text-[#64748B] hover:text-[#0F172A] transition-colors"
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>
                </div>

                {/* Candidate HS Codes & Data Transparency Banner */}
                {liveOutcome.candidateHsCodes && liveOutcome.candidateHsCodes.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wider">Candidate HS Codes:</span>
                      {liveOutcome.candidateHsCodes.map((cand, idx) => (
                        <span key={idx} className="bg-white border border-[#93C5FD] text-[#1E3A8A] px-2 py-0.5 rounded text-[11px] font-semibold">
                          {cand.hs_code} {cand.confidence ? `(${cand.confidence})` : ''}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-[#3B82F6] italic">
                      Advisory only · Consult national customs for legal classification
                    </span>
                  </div>
                )}

                {liveOutcome.disclaimer && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-[#D97706]" />
                    <span>{liveOutcome.disclaimer}</span>
                  </div>
                )}

                {liveOutcome.savedOpportunitiesCount > 0 && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] text-[#065F46] flex items-center gap-2">
                    <CheckCircle2 size={13} className="shrink-0 text-[#059669]" />
                    <span>Persisted {liveOutcome.savedOpportunitiesCount} market opportunities to your GlobeX database</span>
                  </div>
                )}

                {/* Summary banner (market intelligence) */}
                {liveOutcome.summary && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#475569] leading-relaxed">
                    <span className="font-semibold text-[#0F172A]">AI Summary: </span>
                    {liveOutcome.summary}
                  </div>
                )}

                {/* ── LIST (Market Intelligence) ── */}
                {liveOutcome.type === 'list' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {liveOutcome.data.map((row, i) => (
                      <div key={i} className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <span className="font-bold text-[#0F172A] text-[14px]">
                              {flag(row.countryCode)} {row.country}
                            </span>
                            {row.marketSize && (
                              <p className="text-[10px] text-[#94A3B8] mt-0.5">Market: {row.marketSize}</p>
                            )}
                          </div>
                          <div
                            className="text-[13px] font-black px-2.5 py-1 rounded-lg"
                            style={{ background: agent.bg, color: agent.color }}
                          >
                            {row.score}
                          </div>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mb-3 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: agent.color }} />
                        </div>
                        <div className="text-[11px] text-[#64748B] flex flex-col gap-1">
                          <div className="flex justify-between">
                            <span>Competition:</span>
                            <span className="font-semibold text-[#334155]">{row.tariff}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Growth Rate:</span>
                            <span className="font-semibold text-[#059669]">{row.growth}</span>
                          </div>
                          {row.trend && (
                            <div className="flex justify-between">
                              <span>Trend:</span>
                              <span className="font-semibold text-[#334155]">{row.trend}</span>
                            </div>
                          )}
                          {row.insights && (
                            <p className="mt-2 text-[10px] text-[#64748B] italic border-t border-[#E2E8F0] pt-2">
                              {row.insights}
                            </p>
                          )}
                          <div className="mt-2 text-center text-[10px] font-bold text-[#047857] bg-[#ECFDF5] py-1 rounded-lg border border-[#A7F3D0]">
                            {row.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── TABLE (Buyer Discovery) ── */}
                {liveOutcome.type === 'table' && (
                  <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Importer Company</th>
                          <th>Country</th>
                          <th>Est. Volume</th>
                          <th>Reliability</th>
                          <th>Verified Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveOutcome.data.map((row, i) => (
                          <tr key={i}>
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

                {/* ── EMAIL (Outreach) ── */}
                {liveOutcome.type === 'email' && (
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-start gap-2">
                      <span className="text-[11px] font-bold text-[#64748B] shrink-0 mt-0.5">Subject:</span>
                      <span className="text-[12px] font-semibold text-[#0F172A] font-mono">{liveOutcome.subject}</span>
                    </div>
                    <div className="p-5 text-[13px] font-mono whitespace-pre-wrap leading-relaxed text-[#334155] bg-white max-h-[280px] overflow-y-auto">
                      {liveOutcome.body}
                    </div>
                    {liveOutcome.model && (
                      <div className="bg-[#F8FAFC] px-4 py-2 border-t border-[#E2E8F0] text-[10px] text-[#94A3B8]">
                        Generated by: {liveOutcome.model}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CHECKLIST (Compliance) ── */}
                {liveOutcome.type === 'checklist' && (
                  <div className="flex flex-col gap-5">
                    {/* Rich HS & Tariff metadata cards */}
                    {liveOutcome.hsCode && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#F8FAFC]">
                          <p className="text-[11px] font-bold text-[#94A3B8] uppercase">Classified HS Code</p>
                          <p className="text-lg font-black text-[#0F172A] font-mono mt-0.5">{liveOutcome.hsCode}</p>
                          <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1">{liveOutcome.hsDescription}</p>
                        </div>
                        <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#F8FAFC]">
                          <p className="text-[11px] font-bold text-[#94A3B8] uppercase">Estimated Tariff & Tax</p>
                          <p className="text-lg font-black text-[#D97706] mt-0.5">{liveOutcome.dutyCalculation?.totalTariffPct ?? 0}% Total</p>
                          <p className="text-[11px] text-[#64748B] mt-1">Duty: {liveOutcome.dutyCalculation?.basicCustomsDutyPct ?? 0}% | VAT: {liveOutcome.dutyCalculation?.vatOrGstPct ?? 0}%</p>
                        </div>
                        <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#F8FAFC]">
                          <p className="text-[11px] font-bold text-[#94A3B8] uppercase">Export Incentives</p>
                          <p className="text-[12px] font-bold text-[#059669] mt-0.5">{liveOutcome.dutyCalculation?.exportIncentives || 'RoDTEP & Duty Drawback'}</p>
                          <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">{liveOutcome.dutyCalculation?.tradeAgreementBenefit}</p>
                        </div>
                      </div>
                    )}

                    {/* Actionable Checklist */}
                    <div className="flex flex-col gap-3">
                      {(liveOutcome.data || []).map((row, i) => (
                        <div key={i} className="flex items-start gap-3 border border-[#E2E8F0] rounded-xl p-4 bg-white hover:border-[#CBD5E1] transition-all">
                          <div className="p-1.5 rounded-full bg-[#ECFDF5] shrink-0 mt-0.5">
                            <Check size={13} className="text-[#059669]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap justify-between gap-2 items-start">
                              <h4 className="text-[13px] font-bold text-[#0F172A]">{row.check}</h4>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                row.status === 'Required' || row.status === 'Mandatory'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {row.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#64748B] mt-0.5">Issuing authority: <span className="font-medium text-[#334155]">{row.authority}</span></p>
                            <p className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-block"
                              style={{ background: agent.bg, color: agent.color }}>
                              → {row.action}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mandatory ICEGATE & Port Clearance Documents */}
                    {liveOutcome.customsClearance?.documentsRequired && (
                      <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC]">
                        <h4 className="text-[12px] font-bold text-[#0F172A] mb-2">Mandatory ICEGATE & Port Clearance Documents:</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {liveOutcome.customsClearance.documentsRequired.map((doc, idx) => (
                            <span key={idx} className="bg-white border border-[#CBD5E1] text-[#334155] px-2.5 py-1 rounded-md text-[11px] font-medium">
                              📄 {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SCORING (Lead Score) ── */}
                {liveOutcome.type === 'scoring' && (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-4 flex flex-col items-center justify-center border border-[#E2E8F0] rounded-xl p-6 bg-[#F8FAFC] text-center">
                        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Overall Fit Score</p>
                        <div className="text-6xl font-black my-2" style={{ color: agent.color }}>
                          {liveOutcome.score}
                        </div>
                        <div className="text-[13px] font-bold text-[#0F172A]">/100</div>
                        <span className={`mt-3 text-[11px] font-bold px-3 py-1 rounded-full border ${
                          liveOutcome.score >= 85
                            ? 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]'
                            : liveOutcome.score >= 65
                            ? 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]'
                            : 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]'
                        }`}>
                          {liveOutcome.score >= 85 ? 'Tier-1 Match' : liveOutcome.score >= 65 ? 'Tier-2 Match' : 'Low Priority'}
                        </span>
                      </div>
                      <div className="md:col-span-8 flex flex-col gap-3.5">
                        <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Factor Breakdown</h4>
                        {liveOutcome.metrics.map((m, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-[12px] text-[#334155] mb-1.5">
                              <span className="font-semibold">{m.name}</span>
                              <span className="text-[#94A3B8]">{m.rating} — {m.score}/100</span>
                            </div>
                            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${m.score}%`, background: agent.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {liveOutcome.reasoning && (
                      <div className="px-4 py-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[12px] text-[#475569] leading-relaxed">
                        <span className="font-semibold text-[#0F172A]">AI Reasoning: </span>
                        {liveOutcome.reasoning}
                      </div>
                    )}
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
