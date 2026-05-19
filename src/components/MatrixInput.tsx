import React from 'react';
import { Settings2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatrixInputProps {
  matrix: number[][];
  onChange: (newMatrix: number[][]) => void;
}

export const MatrixInput: React.FC<MatrixInputProps & { theme?: 'light' | 'dark' }> = ({ matrix, onChange, theme = 'light' }) => {
  const handleChange = (row: number, col: number, value: string) => {
    const num = parseFloat(value) || 0;
    const newMatrix = matrix.map((r, i) => 
      r.map((c, j) => (i === row && j === col ? num : c))
    );
    onChange(newMatrix);
  };

  const setPreset = (preset: number[][]) => {
    onChange(preset);
  };

  const isDark = theme === 'dark';
  const is3D = matrix.length === 3;

  return (
    <div className={cn(
        "p-6 rounded-2xl border transition-all duration-300",
        isDark ? "bg-[#1c2128] border-slate-700" : "bg-white border-slate-200 shadow-sm"
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className={cn("w-5 h-5", isDark ? "text-blue-400" : "text-indigo-600")} />
          <h3 className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-900")}>
            {is3D ? "3阶矩阵变换" : "2阶矩阵变换"}
          </h3>
        </div>
        <button 
          onClick={() => setPreset(is3D ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : [[1, 0], [0, 1]])}
          className={cn(
            "p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter",
            isDark ? "text-slate-500 hover:bg-slate-800 hover:text-blue-400" : "text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
          )}
          title="重置为单位矩阵"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>重置</span>
        </button>
      </div>

      <div className="flex justify-center items-center gap-4 mb-8">
        <span className="text-4xl font-light text-slate-300">[</span>
        <div className={cn("grid gap-4", is3D ? "grid-cols-3" : "grid-cols-2")}>
          {matrix.map((row, i) => (
            <React.Fragment key={i}>
              {row.map((val, j) => (
                <input
                  key={`${i}-${j}`}
                  type="number"
                  step="0.1"
                  value={val}
                  onChange={(e) => handleChange(i, j, e.target.value)}
                  className={cn(
                      "px-2 py-2 text-center bg-transparent border-b-2 text-lg font-mono focus:outline-none transition-all",
                      is3D ? "w-14 text-base" : "w-20 text-xl",
                      isDark ? "border-slate-600 text-white focus:border-blue-500" : "border-slate-200 text-slate-800 focus:border-indigo-600 focus:bg-slate-50 rounded-t-lg"
                  )}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
        <span className="text-4xl font-light text-slate-300">]</span>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">快速预设</p>
        <div className="grid grid-cols-2 gap-2">
          {is3D ? (
            <>
              <button onClick={() => setPreset([[1, 0, 0], [0, 1, 0], [0, 0, 0]])} className="preset-btn">平面投影 (Z=0)</button>
              <button onClick={() => setPreset([[2.2, 0, 0], [0, 0.4, 0], [0, 0, 1.8]])} className="preset-btn">非对称伸缩</button>
              <button onClick={() => setPreset([[1, 1, 0.5], [0, 1, 1], [0.5, 0, 1]])} className="preset-btn">空间剪切 (Shear)</button>
              <button onClick={() => setPreset([[0.5, -0.8, 0.3], [0.7, 0.6, 0.4], [-0.5, 0.1, 0.8]])} className="preset-btn">复合旋转变换</button>
            </>
          ) : (
            <>
              <button onClick={() => setPreset([[1, 0], [0, 1]])} className="preset-btn">单位矩阵</button>
              <button onClick={() => setPreset([[2, 0], [0, 1]])} className="preset-btn">X轴拉伸</button>
              <button onClick={() => setPreset([[1, 0.5], [0, 1]])} className="preset-btn">水平剪切</button>
              <button onClick={() => setPreset([[0, -1], [1, 0]])} className="preset-btn">旋转 90°</button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .preset-btn {
            @apply px-3 py-2 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-all text-center whitespace-nowrap shadow-sm hover:shadow-indigo-200;
        }
      `}</style>
    </div>
  );
};
