import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface StockDataPoint {
  date: string;
  price: number;
}

export interface StockAnalysis {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  prediction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  predictionSummary: string;
  priceLevel: 'HIGH' | 'LOW' | 'FAIR';
  summary: string;
  chartData: StockDataPoint[];
  keyMetrics: {
    label: string;
    value: string;
  }[];
}

export type Timeframe = '1D' | '1M' | '1Y';

export async function getChartData(symbol: string, timeframe: Timeframe = '1M'): Promise<StockDataPoint[]> {
  const timeframeDesc = {
    '1D': 'the last 24 hours (hourly data)',
    '1M': 'the last 30 days (daily data)',
    '1Y': 'the last 12 months (monthly data)'
  }[timeframe];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide historical price data for ${symbol} for ${timeframeDesc} to plot a chart. Provide at least 15 data points. 
    Format the response as JSON.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Label for the X-axis (e.g., Time or Date)" },
                price: { type: Type.NUMBER }
              },
              required: ["date", "price"]
            }
          }
        },
        required: ["chartData"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.chartData;
}

export async function analyzeStock(symbol: string, timeframe: Timeframe = '1M'): Promise<StockAnalysis> {
  const timeframeDesc = {
    '1D': 'the last 24 hours (hourly data)',
    '1M': 'the last 30 days (daily data)',
    '1Y': 'the last 12 months (monthly data)'
  }[timeframe];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the stock ${symbol} for the ${timeframe} timeframe. 
    1. Provide current market data.
    2. Give a clear recommendation (BUY, SELL, or HOLD).
    3. State if the current price is relatively HIGH, LOW, or FAIR compared to its recent range.
    4. Provide a market prediction (BULLISH, BEARISH, or NEUTRAL) and a 1-sentence prediction summary (e.g., "Expected to rise due to strong earnings").
    5. Provide historical price data for ${timeframeDesc} to plot a chart (at least 10-15 data points).
    Format the response as JSON.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          name: { type: Type.STRING },
          currentPrice: { type: Type.NUMBER },
          change: { type: Type.NUMBER },
          changePercent: { type: Type.NUMBER },
          recommendation: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
          prediction: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
          predictionSummary: { type: Type.STRING },
          priceLevel: { type: Type.STRING, enum: ['HIGH', 'LOW', 'FAIR'] },
          summary: { type: Type.STRING },
          chartData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Label for the X-axis (e.g., Time or Date)" },
                price: { type: Type.NUMBER }
              },
              required: ["date", "price"]
            }
          },
          keyMetrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING }
              }
            }
          }
        },
        required: ["symbol", "name", "currentPrice", "recommendation", "prediction", "predictionSummary", "priceLevel", "summary", "chartData"]
      }
    }
  });

  return JSON.parse(response.text);
}

export interface StockComparison {
  stockA: {
    symbol: string;
    name: string;
    price: number;
    recommendation: string;
  };
  stockB: {
    symbol: string;
    name: string;
    price: number;
    recommendation: string;
  };
  winner: string; // The symbol of the recommended stock
  comparisonSummary: string;
  userSpecificAdvice: string;
  metrics: {
    label: string;
    valueA: string;
    valueB: string;
  }[];
}

export async function compareStocks(symbolA: string, symbolB: string, userNeeds: string): Promise<StockComparison> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Compare two stocks: ${symbolA} and ${symbolB}. 
    The user has the following needs/context: "${userNeeds}".
    
    1. Provide current data for both.
    2. Analyze which one is a better fit for the user's specific needs.
    3. Provide a detailed comparison summary and specific advice.
    4. Include a list of key metrics for side-by-side comparison.
    
    Format the response as JSON.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stockA: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              recommendation: { type: Type.STRING }
            }
          },
          stockB: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              recommendation: { type: Type.STRING }
            }
          },
          winner: { type: Type.STRING, description: "The symbol of the stock that best fits the user needs" },
          comparisonSummary: { type: Type.STRING },
          userSpecificAdvice: { type: Type.STRING },
          metrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                valueA: { type: Type.STRING },
                valueB: { type: Type.STRING }
              }
            }
          }
        },
        required: ["stockA", "stockB", "winner", "comparisonSummary", "userSpecificAdvice", "metrics"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getMarketOverview(): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Provide a brief overview of the current US stock market status, including top trending stocks and major index movements (S&P 500, Nasdaq, Dow Jones).",
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}
