import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  RefreshCw,
  BrainCircuit,
  LineChart as LineChartIcon,
  Globe,
  Zap,
  Target
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Markdown from 'react-markdown';
import { analyzeStock, getMarketOverview, StockAnalysis, Timeframe, StockDataPoint, getChartData, compareStocks, StockComparison } from './services/geminiService';
import { cn } from './lib/utils';

type AppMode = 'ANALYSIS' | 'COMPARE';

export default function App() {
  const [mode, setMode] = useState<AppMode>('ANALYSIS');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareQueryA, setCompareQueryA] = useState('');
  const [compareQueryB, setCompareQueryB] = useState('');
  const [userNeeds, setUserNeeds] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [comparison, setComparison] = useState<StockComparison | null>(null);
  const [currentChartData, setCurrentChartData] = useState<StockDataPoint[]>([]);
  const [marketOverview, setMarketOverview] = useState<string>('');
  const [marketLoading, setMarketLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const chartCache = useRef<Record<string, Partial<Record<Timeframe, StockDataPoint[]>>>>({});

  useEffect(() => {
    fetchMarketOverview();
  }, []);

  const fetchMarketOverview = async () => {
    setMarketLoading(true);
    try {
      const overview = await getMarketOverview();
      setMarketOverview(overview);
    } catch (err) {
      console.error(err);
    } finally {
      setMarketLoading(false);
    }
  };

  const performAnalysis = useCallback(async (symbol: string, tf: Timeframe) => {
    setLoading(true);
    setError(null);
    setComparison(null);
    // Clear cache for new symbol
    chartCache.current = {};
    
    try {
      const result = await analyzeStock(symbol, tf);
      setAnalysis(result);
      setCurrentChartData(result.chartData);
      
      // Store in cache
      chartCache.current[symbol.toUpperCase()] = {
        [tf]: result.chartData
      };
    } catch (err) {
      console.error(err);
      setError('Failed to analyze stock. Please try again with a valid symbol.');
    } finally {
      setLoading(false);
    }
  }, []);

  const performComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compareQueryA.trim() || !compareQueryB.trim()) return;
    
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await compareStocks(compareQueryA, compareQueryB, userNeeds);
      setComparison(result);
    } catch (err) {
      console.error(err);
      setError('Failed to compare stocks. Please check the symbols.');
    } finally {
      setLoading(false);
    }
  };

  const updateChartOnly = useCallback(async (symbol: string, tf: Timeframe) => {
    const upperSymbol = symbol.toUpperCase();
    
    // Check cache first
    if (chartCache.current[upperSymbol]?.[tf]) {
      setCurrentChartData(chartCache.current[upperSymbol]![tf]!);
      return;
    }

    setChartLoading(true);
    try {
      const chartData = await getChartData(symbol, tf);
      setCurrentChartData(chartData);
      
      // Update cache
      if (!chartCache.current[upperSymbol]) {
        chartCache.current[upperSymbol] = {};
      }
      chartCache.current[upperSymbol]![tf] = chartData;
    } catch (err) {
      console.error(err);
      setError('Failed to update chart data.');
    } finally {
      setChartLoading(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    performAnalysis(searchQuery, timeframe);
  };

  const handleTimeframeChange = (newTf: Timeframe) => {
    setTimeframe(newTf);
    if (analysis) {
      updateChartOnly(analysis.symbol, newTf);
    }
  };

  const getRecommendationColor = (rec: string) => {
    const r = rec.toUpperCase();
    if (r.includes('BUY')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (r.includes('SELL')) return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  };

  const getPredictionColor = (pred: string) => {
    switch (pred) {
      case 'BULLISH': return 'text-emerald-400';
      case 'BEARISH': return 'text-rose-400';
      default: return 'text-amber-400';
    }
  };

  const getPriceLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-emerald-400';
      case 'HIGH': return 'text-rose-400';
      default: return 'text-amber-400';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="text-zinc-950 w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Investor <span className="text-emerald-400 italic">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-4 flex-1 max-w-2xl mx-8">
            <div className="flex bg-zinc-800 rounded-full p-1">
              <button 
                onClick={() => setMode('ANALYSIS')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                  mode === 'ANALYSIS' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Analyze
              </button>
              <button 
                onClick={() => setMode('COMPARE')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                  mode === 'COMPARE' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Compare
              </button>
            </div>

            {mode === 'ANALYSIS' ? (
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search symbol (e.g. AAPL, TSLA, BTC)..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1 flex-1">
                  <input
                    type="text"
                    placeholder="Stock A"
                    className="bg-transparent focus:outline-none text-sm w-20"
                    value={compareQueryA}
                    onChange={(e) => setCompareQueryA(e.target.value)}
                  />
                  <span className="text-zinc-600 font-bold text-xs">VS</span>
                  <input
                    type="text"
                    placeholder="Stock B"
                    className="bg-transparent focus:outline-none text-sm w-20"
                    value={compareQueryB}
                    onChange={(e) => setCompareQueryB(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Market Live
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {mode === 'COMPARE' && !comparison && !loading && (
          <div className="max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-top-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Zap className="text-emerald-400 w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Smart Comparison</h2>
                  <p className="text-sm text-zinc-500">Tell us your needs for a personalized recommendation</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase">First Stock</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AAPL"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={compareQueryA}
                      onChange={(e) => setCompareQueryA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Second Stock</label>
                    <input 
                      type="text" 
                      placeholder="e.g. MSFT"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={compareQueryB}
                      onChange={(e) => setCompareQueryB(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Your Needs & Context</label>
                  <textarea 
                    placeholder="e.g. I have $5000 to invest for 5 years, I prefer low risk and dividends..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 h-32 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    value={userNeeds}
                    onChange={(e) => setUserNeeds(e.target.value)}
                  />
                </div>

                <button 
                  onClick={performComparison}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <BrainCircuit className="w-5 h-5" />
                  Compare with AI
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Analysis & Charts */}
          <div className="lg:col-span-8 space-y-8">
            {loading ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <div className="text-center">
                  <p className="font-medium">
                    {mode === 'ANALYSIS' ? `Analyzing ${searchQuery.toUpperCase()}...` : `Comparing ${compareQueryA.toUpperCase()} and ${compareQueryB.toUpperCase()}...`}
                  </p>
                  <p className="text-sm text-zinc-500">Consulting market data and AI models</p>
                </div>
              </div>
            ) : comparison ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Comparison Winner Card */}
                <div className="bg-gradient-to-br from-emerald-500/20 to-zinc-900 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-32 h-32 text-emerald-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-6 h-6 text-emerald-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">AI Recommendation</h3>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex-1">
                        <h2 className="text-4xl font-black mb-2">
                          The winner is <span className="text-emerald-400">{comparison.winner}</span>
                        </h2>
                        <p className="text-lg text-zinc-300 font-medium leading-relaxed">
                          {comparison.userSpecificAdvice}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="bg-zinc-900/80 backdrop-blur p-4 rounded-xl border border-zinc-800">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{comparison.stockA.symbol}</p>
                          <p className="text-xl font-bold">${comparison.stockA.price}</p>
                        </div>
                        <div className="bg-zinc-900/80 backdrop-blur p-4 rounded-xl border border-zinc-800">
                          <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{comparison.stockB.symbol}</p>
                          <p className="text-xl font-bold">${comparison.stockB.price}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-800/30">
                    <h3 className="font-bold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-400" />
                      Side-by-Side Comparison
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
                          <th className="p-4 text-xs font-bold text-zinc-500 uppercase">Metric</th>
                          <th className={cn("p-4 text-sm font-bold", comparison.winner === comparison.stockA.symbol && "text-emerald-400")}>
                            {comparison.stockA.symbol}
                          </th>
                          <th className={cn("p-4 text-sm font-bold", comparison.winner === comparison.stockB.symbol && "text-emerald-400")}>
                            {comparison.stockB.symbol}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.metrics.map((m, i) => (
                          <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                            <td className="p-4 text-sm text-zinc-400 font-medium">{m.label}</td>
                            <td className="p-4 text-sm font-mono">{m.valueA}</td>
                            <td className="p-4 text-sm font-mono">{m.valueB}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comparison Summary */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <BrainCircuit className="w-5 h-5" />
                    <h3 className="font-bold">AI Comparison Summary</h3>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {comparison.comparisonSummary}
                  </p>
                </div>

                <button 
                  onClick={() => setComparison(null)}
                  className="w-full py-3 border border-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all text-sm font-bold"
                >
                  Start New Comparison
                </button>
              </div>
            ) : analysis ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Top Summary Section (AI Verdict) */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <BrainCircuit className="w-32 h-32 text-emerald-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">AI Verdict</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Recommendation</p>
                        <div className={cn(
                          "text-2xl font-black px-4 py-1 rounded-lg inline-block border",
                          getRecommendationColor(analysis.recommendation)
                        )}>
                          {analysis.recommendation}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Price Level</p>
                        <div className={cn("text-2xl font-black", getPriceLevelColor(analysis.priceLevel))}>
                          {analysis.priceLevel}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Prediction</p>
                        <div className={cn("text-2xl font-black flex items-center gap-2", getPredictionColor(analysis.prediction))}>
                          {analysis.prediction === 'BULLISH' ? <TrendingUp className="w-6 h-6" /> : analysis.prediction === 'BEARISH' ? <TrendingDown className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                          {analysis.prediction}
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Outlook</p>
                        <p className="text-sm font-medium text-zinc-300 italic">
                          "{analysis.predictionSummary}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Header Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-bold">{analysis.symbol}</h2>
                      </div>
                      <p className="text-zinc-400 font-medium">{analysis.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">${analysis.currentPrice.toLocaleString()}</div>
                      <div className={cn(
                        "flex items-center justify-end gap-1 font-medium",
                        analysis.change >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {analysis.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(analysis.change).toFixed(2)} ({analysis.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Timeframe Selector */}
                  <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg w-fit mb-6">
                    {(['1D', '1M', '1Y'] as Timeframe[]).map((tf) => (
                      <button
                        key={tf}
                        disabled={chartLoading}
                        onClick={() => handleTimeframeChange(tf)}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                          timeframe === tf 
                            ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20" 
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700",
                          chartLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {tf === '1D' ? 'Days' : tf === '1M' ? 'Months' : 'Years'}
                      </button>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="h-[350px] w-full relative">
                    {chartLoading && (
                      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={currentChartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#71717a" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => {
                            if (timeframe === '1D') return val;
                            return val.split('-').slice(1).join('/');
                          }}
                        />
                        <YAxis 
                          stroke="#71717a" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                          animationDuration={1000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                      <BrainCircuit className="w-5 h-5" />
                      <h3 className="font-bold">Detailed Analysis</h3>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                      <BarChart3 className="w-5 h-5" />
                      <h3 className="font-bold">Key Metrics</h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.keyMetrics?.map((metric, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                          <span className="text-zinc-500 text-sm">{metric.label}</span>
                          <span className="font-mono text-sm">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                  <LineChartIcon className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Start your analysis</h3>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    {mode === 'ANALYSIS' 
                      ? "Enter a stock ticker or company name above to get real-time AI insights, charts, and investment recommendations."
                      : "Enter two stock symbols and your investment needs to get a personalized AI comparison."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Market Overview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
                  <Globe className="w-4 h-4" />
                  Market Pulse
                </div>
                <button 
                  onClick={fetchMarketOverview}
                  className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                  disabled={marketLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 text-zinc-500", marketLoading && "animate-spin")} />
                </button>
              </div>
              <div className="p-6">
                {marketLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
                  </div>
                ) : (
                  <div className="markdown-body text-sm">
                    <Markdown>{marketOverview}</Markdown>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3 text-emerald-400">
                <Info className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider">AI Disclaimer</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Investor AI provides analysis based on current market data and AI models. This is not financial advice. Always perform your own due diligence before investing.
              </p>
            </div>
          </div>

        </div>
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Info className="w-5 h-5" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:opacity-70">✕</button>
        </div>
      )}
    </div>
  );
}
