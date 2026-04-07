import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { parseExcelFile } from '../utils/analysis';
import { Meeting } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: Meeting[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const data = await parseExcelFile(file);
      onDataLoaded(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={clsx(
          "border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-gray-400",
          loading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onInputChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-full">
            <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {loading ? '处理中...' : '上传会议数据'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              拖放 Excel 文件到此处，或点击浏览
            </p>
          </div>
          <div className="text-xs text-gray-400 mt-4 bg-gray-50 p-3 rounded-lg text-left w-full max-w-xs">
            <p className="font-semibold mb-1">预期列（自动检测）：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>用户 ID / 创建者</li>
              <li>开始时间</li>
              <li>结束时间</li>
              <li>参会人数 / 数量</li>
            </ul>
          </div>
        </label>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={(e) => {
            e.preventDefault();
            const sampleData: Meeting[] = Array.from({ length: 50 }, (_, i) => {
              const start = new Date();
              start.setHours(9 + Math.floor(Math.random() * 8));
              const duration = 10 + Math.floor(Math.random() * 120);
              const end = new Date(start.getTime() + duration * 60000);
              return {
                userId: `User_${Math.floor(Math.random() * 15) + 1}`,
                startTime: start,
                endTime: end,
                durationMinutes: duration,
                participantCount: 5 + Math.floor(Math.random() * 150),
                meetingId: `MTG_${1000 + i}`,
                subject: `会议主题 ${i + 1}`
              };
            });
            onDataLoaded(sampleData);
          }}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline decoration-dashed underline-offset-4"
        >
          没有文件？加载示例数据测试
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
