import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Repeat, Play, RotateCcw, ChevronRight, Info } from 'lucide-react';
import { transformVector, computeEigen, cn } from '../lib/utils';
import { BlockMath, InlineMath } from 'react-katex';

interface IterationVisualizerProps {
    matrix: number[][];
}

export const IterationVisualizer: React.FC<IterationVisualizerProps> = ({ matrix }) => {
    const [initialVector, setInitialVector] = useState<[number, number]>([1, 0.2]);
    const [history, setHistory] = useState<[number, number][]>([]);
    const [animating, setAnimating] = useState(false);
    
    const eigen = useMemo(() => computeEigen(matrix), [matrix]);
    const principalVector = eigen.eigenvectors[0];
    const principalValue = eigen.eigenvalues[0];

    useEffect(() => {
        setHistory([initialVector]);
    }, [initialVector]);

    const step = () => {
        setHistory(prev => {
            const last = prev[prev.length - 1];
            const next = transformVector(matrix, [last[0], last[1], 0]);
            // Allow vectors to grow longer (up to 5.5 units) for better visibility
            const mag = Math.sqrt(next[0]**2 + next[1]**2);
            const scale = mag > 5.5 ? 5.5/mag : (mag < 0.4 && mag > 0 ? 0.4/mag : 1);
            return [...prev, [next[0] * scale, next[1] * scale] as [number, number]];
        });
    };

    const reset = () => {
        setHistory([initialVector]);
    };

    // SVG coordinate mapping
    const size = 600; // Increased stage size
    const padding = 50;
    const scale = (size - padding * 2) / 12; // Adjusted range for longer arrows
    const toSVG = (x: number, y: number) => ({
        x: size / 2 + x * scale,
        y: size / 2 - y * scale
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Visualizer Stage */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iterative Convergence</span>
                    <div className="flex gap-2">
                        <button onClick={reset} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-rose-500">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative bg-slate-50/30">
                    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-2xl">
                        {/* Grid */}
                        {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(i => (
                            <React.Fragment key={i}>
                                <line x1={toSVG(i, -6).x} y1={toSVG(i, -6).y} x2={toSVG(i, 6).x} y2={toSVG(i, 6).y} stroke="#e2e8f0" strokeWidth="0.5" />
                                <line x1={toSVG(-6, i).x} y1={toSVG(-6, i).y} x2={toSVG(6, i).x} y2={toSVG(6, i).y} stroke="#e2e8f0" strokeWidth="0.5" />
                            </React.Fragment>
                        ))}
                        
                        {/* Principal Axis (Eigenvector direction) */}
                        {principalVector && (
                            <line 
                                x1={toSVG(principalVector[0] * -12, principalVector[1] * -12).x}
                                y1={toSVG(principalVector[0] * -12, principalVector[1] * -12).y}
                                x2={toSVG(principalVector[0] * 12, principalVector[1] * 12).x}
                                y2={toSVG(principalVector[0] * 12, principalVector[1] * 12).y}
                                stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" opacity="0.2"
                            />
                        )}

                        {/* History Path */}
                        {history.length > 1 && (
                            <polyline 
                                fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"
                                points={history.map(p => {
                                    const s = toSVG(p[0], p[1]);
                                    return `${s.x},${s.y}`;
                                }).join(' ')}
                            />
                        )}

                        {/* Vectors */}
                        {history.map((p, i) => {
                            const start = toSVG(0, 0);
                            const end = toSVG(p[0], p[1]);
                            const isLast = i === history.length - 1;
                            const isFirst = i === 0;

                            return (
                                <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: isLast ? 1 : 0.3 }}>
                                    <line 
                                        x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                                        stroke={isLast ? "#4f46e5" : "#cbd5e1"} 
                                        strokeWidth={isLast ? 3 : 1}
                                        markerEnd={isLast ? "url(#arrowhead-active)" : "url(#arrowhead-ghost)"}
                                    />
                                    {isLast && (
                                        <circle cx={end.x} cy={end.y} r="4" fill="#4f46e5" />
                                    )}
                                </motion.g>
                            );
                        })}

                        <defs>
                            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                            </marker>
                            <marker id="arrowhead-ghost" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                            </marker>
                        </defs>
                    </svg>

                    {/* Indicator */}
                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-lg">
                        <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">迭代次数</div>
                        <div className="text-xl font-black text-slate-800 font-mono leading-none">{history.length - 1}</div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={step}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                    >
                        <Repeat className="w-4 h-4" />
                        应用变换矩阵 (A·v)
                    </button>
                </div>
            </div>

            {/* Explanation side */}
            <div className="space-y-6">
                <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl overflow-hidden relative">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Repeat className="w-5 h-5 text-indigo-400" />
                            幂迭代 (Power Iteration)
                        </h3>
                        <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                            这是计算主特征值最古老也最直观的算法。每次你点击“应用变换”，向量都在经历：
                        </p>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 font-mono mb-6">
                            <BlockMath math="v_{k+1} = A \cdot v_k" />
                        </div>
                        <p className="text-indigo-200 text-[11px] leading-relaxed italic">
                            观察左侧：随着迭代进行，向量会逐渐摆脱随机性，最终“驯服”在主特征向量（虚线方向）之上。
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">为什么会收敛？</span>
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs text-slate-600 leading-relaxed">
                            任何向量都可以表示为特征向量的线性组合。每次乘以矩阵 A，主特征值对应的分量增长最快，经过多次迭代，它将主导整个向量的方向。
                        </p>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="text-[9px] font-bold text-emerald-600 uppercase mb-2">主特征信息</div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] text-emerald-800 font-bold">特征值 λ₁</div>
                                    <div className="text-lg font-black text-emerald-900">{principalValue.toFixed(4)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-emerald-800 font-bold">特征向量 v₁</div>
                                    <div className="text-[11px] font-mono font-bold text-emerald-900">[{principalVector[0].toFixed(2)}, {principalVector[1].toFixed(2)}]</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
