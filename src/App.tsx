import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { Meeting, AnalysisResult } from './types';
import { analyzeMeetings } from './utils/analysis';
import { BarChart3 } from 'lucide-react';

export default function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleDataLoaded = (data: Meeting[]) => {
    const result = analyzeMeetings(data);
    setAnalysis(result);
  };

  const handleReset = () => {
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {!analysis ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl shadow-lg mb-6">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">
              企业版 2.0 高级账号分析
            </h1>
            <p className="text-lg text-gray-500 max-w-md mx-auto">
              上传您的会议数据以可视化趋势，识别主要组织者，并追踪高影响力会议。
            </p>
          </div>
          
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
            <div className="p-8">
              <FileUpload onDataLoaded={handleDataLoaded} />
            </div>
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                支持格式：.xlsx, .xls, .csv · 数据仅在本地浏览器处理
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Dashboard analysis={analysis} onReset={handleReset} />
        </div>
      )}
    </div>
  );
}
