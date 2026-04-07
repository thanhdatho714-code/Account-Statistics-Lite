import React, { useRef, useState } from 'react';
import { AnalysisResult } from '../types';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { Download, Users, Calendar, Share2, TrendingUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

interface DashboardProps {
  analysis: AnalysisResult;
  onReset: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC<DashboardProps> = ({ analysis, onReset }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [timeGrain, setTimeGrain] = useState<'week' | 'month' | 'quarter'>('month');
  const [companyName, setCompanyName] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minCount, setMinCount] = useState<string>('');
  const [maxCount, setMaxCount] = useState<string>('');

  const filteredList = analysis.advancedCreatorsList.filter(creator => {
    const lastMeetingTime = new Date(creator.lastMeetingTime);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (end) end.setHours(23, 59, 59, 999);

    const dateMatch = (!start || lastMeetingTime >= start) &&
                      (!end || lastMeetingTime <= end);
    const countMatch = (!minCount || creator.count >= parseInt(minCount)) &&
                       (!maxCount || creator.count <= parseInt(maxCount));
    return dateMatch && countMatch;
  });

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!dashboardRef.current) return;
    
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: '#f9fafb',
        onclone: (clonedDoc) => {
          const inputs = clonedDoc.querySelectorAll('input');
          inputs.forEach((input) => {
            const div = clonedDoc.createElement('div');
            const computedStyle = window.getComputedStyle(input);
            
            div.className = input.className;
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.backgroundColor = computedStyle.backgroundColor;
            div.style.border = computedStyle.border;
            div.style.borderTop = computedStyle.borderTop;
            div.style.borderRight = computedStyle.borderRight;
            div.style.borderBottom = computedStyle.borderBottom;
            div.style.borderLeft = computedStyle.borderLeft;
            div.style.borderRadius = computedStyle.borderRadius;
            div.style.padding = computedStyle.padding;
            div.style.fontSize = computedStyle.fontSize;
            div.style.fontWeight = computedStyle.fontWeight;
            div.style.color = computedStyle.color;
            div.style.height = input.offsetHeight + 'px';
            div.style.width = input.offsetWidth + 'px';
            
            div.textContent = input.value;
            
            if (input.parentNode) {
              input.parentNode.replaceChild(div, input);
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const fileName = companyName ? `${companyName}-report` : 'enterprise-2.0-report';
      
      if (type === 'pdf') {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
      } else {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${fileName}.png`;
        link.click();
      }
    } catch (err) {
      console.error('Export failed', err);
      alert('导出报告失败，请重试。');
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['排名', '用户 ID', '最后发起会议时间', '高级会议场次'],
        ...filteredList.map((c, i) => [i + 1, c.name, c.lastMeetingTime.toLocaleString(), c.count])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      const wscols = [
        { wch: 10 },
        { wch: 30 },
        { wch: 25 },
        { wch: 15 },
      ];
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, "高级账号名单");
      XLSX.writeFile(wb, "advanced_creators_list.xlsx");
    } catch (err) {
      console.error('Excel export failed', err);
      alert('导出 Excel 失败，请重试。');
    }
  };

  const trendData = analysis.trends[timeGrain === 'week' ? 'weekly' : timeGrain === 'quarter' ? 'quarterly' : 'monthly'];

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <button 
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ← 上传新文件
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('png')}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出图片
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出 PDF
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div ref={dashboardRef} className="bg-gray-50 p-8 min-h-screen space-y-8">
        <div className="mb-8">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="点击输入企业名称"
            className="block w-full text-3xl font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-0 px-0 py-2 placeholder-gray-300 transition-colors"
          />
          <h1 className="text-xl font-medium text-gray-600 mt-2">企业版 2.0 高级账号分析报告</h1>
          <p className="text-sm text-gray-400 mt-2">生成日期：{new Date().toLocaleDateString()}</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">会议创建人数</p>
                <h3 className="text-2xl font-bold text-gray-900">{analysis.totalUniqueCreators}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">发起会议的不同用户数量（去重）</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Share2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">高影响力主持人</p>
                <h3 className="text-2xl font-bold text-gray-900">{analysis.highImpactCreators}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">会议时长 &gt;40分钟 或 参会人数 &gt;100人</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">会议总数</p>
                <h3 className="text-2xl font-bold text-gray-900">{analysis.totalMeetings}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">分析的会议总场次</p>
          </div>
        </div>

        {/* Trend Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">会议创建趋势</h3>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setTimeGrain('week')}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  timeGrain === 'week' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                按周
              </button>
              <button
                onClick={() => setTimeGrain('month')}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  timeGrain === 'month' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                按月
              </button>
              <button
                onClick={() => setTimeGrain('quarter')}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  timeGrain === 'quarter' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                按季度
              </button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{stroke: '#E5E7EB', strokeWidth: 2}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line 
                  type="monotone" 
                  dataKey="totalCreators" 
                  name="会议创建人数" 
                  stroke="#6366F1" 
                  strokeWidth={3}
                  dot={{r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff'}}
                  activeDot={{r: 6}}
                >
                  <LabelList dataKey="totalCreators" position="top" offset={10} fontSize={12} fill="#6366F1" />
                </Line>
                <Line 
                  type="monotone" 
                  dataKey="advancedCreators" 
                  name="高级能力使用人数 (>40分 或 >100人)" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{r: 4, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff'}}
                  activeDot={{r: 6}}
                >
                  <LabelList dataKey="advancedCreators" position="top" offset={10} fontSize={12} fill="#F59E0B" />
                </Line>
                <Line 
                  type="monotone" 
                  dataKey="newAdvancedCreators" 
                  name="新增高级能力使用人数" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff'}}
                  activeDot={{r: 6}}
                >
                  <LabelList dataKey="newAdvancedCreators" position="top" offset={10} fontSize={12} fill="#EF4444" />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Duration Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">会议时长分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.meetingsByDuration}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#F3F4F6'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  />
                  <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} name="会议数量" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Participant Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">参会人数分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis.meetingsByParticipants}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analysis.meetingsByParticipants.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overlapping Meetings Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">同一时间发起多场会议人员</p>
                <h3 className="text-2xl font-bold text-gray-900">{analysis.overlappingMeetingsCount}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">同一天内会议时间有交叉重叠的用户数</p>
          </div>
        </div>

        {/* Advanced Creators List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">高级账号能力名单</h3>
              <span className="text-sm text-gray-500">共 {filteredList.length} 人</span>
            </div>
            <button
              onClick={handleExportExcel}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 Excel
            </button>
          </div>
          <div className="p-6 border-b border-gray-100 bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">开始日期</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">结束日期</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">最少场次</label>
              <input type="number" value={minCount} onChange={e => setMinCount(e.target.value)} className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">最多场次</label>
              <input type="number" value={maxCount} onChange={e => setMaxCount(e.target.value)} className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-medium">排名</th>
                  <th className="px-6 py-3 font-medium">用户 ID</th>
                  <th className="px-6 py-3 font-medium">最后发起会议时间</th>
                  <th className="px-6 py-3 font-medium text-right">高级会议场次</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((creator, index) => (
                  <tr key={creator.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">#{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900">{creator.name}</td>
                    <td className="px-6 py-4 text-gray-500">{creator.lastMeetingTime.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono">{creator.count}</td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      暂无符合条件的用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overlapping Meetings List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">同一时间发起多场会议人员名单</h3>
              <span className="text-sm text-gray-500">共 {analysis.overlappingMeetingsList.length} 人</span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-medium">排名</th>
                  <th className="px-6 py-3 font-medium">用户 ID</th>
                  <th className="px-6 py-3 font-medium text-right">重叠会议次数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analysis.overlappingMeetingsList.map((creator, index) => (
                  <tr key={creator.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">#{index + 1}</td>
                    <td className="px-6 py-4 text-gray-900">{creator.name}</td>
                    <td className="px-6 py-4 text-right font-mono">{creator.count}</td>
                  </tr>
                ))}
                {analysis.overlappingMeetingsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                      暂无符合条件的用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
