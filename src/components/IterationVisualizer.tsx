import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Repeat, Play, Pause, RotateCcw, Info, Settings, Compass } from 'lucide-react';
import { transformVector, computeEigen, cn } from '../lib/utils';
import { BlockMath, InlineMath } from 'react-katex';

interface IterationVisualizerProps {
    matrix: number[][];
}

export const IterationVisualizer: React.FC<IterationVisualizerProps> = ({ matrix }) => {
    const [initialVector, setInitialVector] = useState<[number, number]>([1, 0.2]);
    const [history, setHistory] = useState<[number, number][]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(300); // ms per step
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    
    const eigen = useMemo(() => computeEigen(matrix), [matrix]);
    const principalVector = eigen.eigenvectors[0];
    const principalValue = eigen.eigenvalues[0];

    useEffect(() => {
        setHistory([initialVector]);
    }, [initialVector]);

    const step = () => {
        if (history.length >= 201) {
            setIsPlaying(false);
            return;
        }
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
        setIsPlaying(false);
        setHistory([initialVector]);
    };

    // Auto iteration logic
    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                step();
            }, playSpeed);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying, playSpeed, history]);

    // SVG coordinate mapping
    const size = 600; // Increased stage size
    const padding = 50;
    const scale = (size - padding * 2) / 12; // Adjusted range for longer arrows
    const toSVG = (x: number, y: number) => ({
        x: size / 2 + x * scale,
        y: size / 2 - y * scale
    });

    // Inverse coordinates for grid click
    const fromSVG = (clientX: number, clientY: number, rect: DOMRect) => {
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        // Map back from size/2, scale
        const mathX = (x - size / 2) / scale;
        const mathY = -(y - size / 2) / scale;
        return [parseFloat(mathX.toFixed(2)), parseFloat(mathY.toFixed(2))] as [number, number];
    };

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const coords = fromSVG(e.clientX, e.clientY, rect);
        // Only set if inside reasonable grid bounds
        if (Math.abs(coords[0]) <= 6 && Math.abs(coords[1]) <= 6) {
            setInitialVector(coords);
            reset();
        }
    };

    const lastVector = history[history.length - 1] || initialVector;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Visualizer Stage */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 continental-style u-case tracking-widest">特征向量迭代收敛</span>
                        {history.length >= 201 && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-amber-100 text-amber-800 rounded font-bold">已达最大次数 200</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-medium">点击网格任意位置重置初始向量</span>
                        <button onClick={reset} className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-rose-500 border border-transparent hover:border-slate-100">
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative bg-slate-50/10 cursor-crosshair">
                    <svg 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${size} ${size}`} 
                        className="overflow-visible drop-shadow-2xl"
                        onClick={handleSvgClick}
                    >
                        {/* Grid */}
                        {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(i => (
                            <React.Fragment key={i}>
                                <line x1={toSVG(i, -6).x} y1={toSVG(i, -6).y} x2={toSVG(i, 6).x} y2={toSVG(i, 6).y} stroke="#e2e8f0" strokeWidth="0.5" />
                                <line x1={toSVG(-6, i).x} y1={toSVG(-6, i).y} x2={toSVG(6, i).x} y2={toSVG(6, i).y} stroke="#e2e8f0" strokeWidth="0.5" />
                            </React.Fragment>
                        ))}
                        
                        {/* Principal Axis (Eigenvector direction) */}
                        {principalVector && (
                            <g>
                                <line 
                                    x1={toSVG(principalVector[0] * -12, principalVector[1] * -12).x}
                                    y1={toSVG(principalVector[0] * -12, principalVector[1] * -12).y}
                                    x2={toSVG(principalVector[0] * 12, principalVector[1] * 12).x}
                                    y2={toSVG(principalVector[0] * 12, principalVector[1] * 12).y}
                                    stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3,6" opacity="0.4"
                                />
                                <text 
                                    x={toSVG(principalVector[0] * 5.2, principalVector[1] * 5.2).x + 8}
                                    y={toSVG(principalVector[0] * 5.2, principalVector[1] * 5.2).y - 8}
                                    fill="#ec4899"
                                    className="text-[9px] font-bold font-mono opacity-80"
                                >
                                    主特征轴 v₁
                                </text>
                            </g>
                        )}

                        {/* History Path */}
                        {history.length > 1 && (
                            <polyline 
                                fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="2,3" opacity="0.3"
                                points={history.map(p => {
                                    const s = toSVG(p[0], p[1]);
                                    return `${s.x},${s.y}`;
                                }).join(' ')}
                            />
                        )}

                        {/* Vectors */}
                        {history.slice(-30).map((p, indexOriginal) => {
                            // Slice to avoid rendering too many arrows when steps reach 200, which kills SVG performance
                            const actualIndex = history.length <= 30 ? indexOriginal : history.length - 30 + indexOriginal;
                            const start = toSVG(0, 0);
                            const end = toSVG(p[0], p[1]);
                            const isLast = actualIndex === history.length - 1;
                            const isFirst = actualIndex === 0;

                            return (
                                <g key={actualIndex}>
                                    <line 
                                        x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                                        stroke={isLast ? "#4f46e5" : "#cbd5e1"} 
                                        strokeWidth={isLast ? 3 : 1}
                                        markerEnd={isLast ? "url(#arrowhead-active)" : "url(#arrowhead-ghost)"}
                                    />
                                    {isLast && (
                                        <g>
                                            <circle cx={end.x} cy={end.y} r="5" fill="#4f46e5" className="animate-ping opacity-75" />
                                            <circle cx={end.x} cy={end.y} r="4" fill="#4f46e5" />
                                        </g>
                                    )}
                                </g>
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

                    {/* Live vector formulas overlay */}
                    <div className="absolute top-4 left-4 bg-slate-900/90 text-white backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/50 shadow-xl max-w-[240px]">
                        <div className="text-[9px] font-bold text-indigo-400 uppercase mb-1 tracking-wider">实时向量状态</div>
                        <div className="space-y-1 font-mono text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">初始 v₀:</span>
                                <span className="font-bold text-emerald-400">[{initialVector[0].toFixed(2)}, {initialVector[1].toFixed(2)}]</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">当前 vₖ:</span>
                                <span className="font-bold text-indigo-300">[{lastVector[0].toFixed(2)}, {lastVector[1].toFixed(2)}]</span>
                            </div>
                        </div>
                    </div>

                    {/* Indicator */}
                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-lg">
                        <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">迭代次数 (Max 200)</div>
                        <div className="text-xl font-black text-slate-800 font-mono leading-none">{history.length - 1}</div>
                    </div>
                </div>

                {/* Rich iteration state controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-500">播放速度:</span>
                            <select 
                                value={playSpeed} 
                                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                                className="font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
                            >
                                <option value={600}>慢速 (600ms)</option>
                                <option value={300}>标准 (300ms)</option>
                                <option value={100}>快速 (100ms)</option>
                            </select>
                        </div>

                        <div className="flex-1 flex gap-2">
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                disabled={history.length >= 201}
                                className={cn(
                                    "flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm",
                                    isPlaying 
                                        ? "bg-amber-500 hover:bg-amber-600 text-white" 
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                )}
                            >
                                {isPlaying ? (
                                    <>
                                        <Pause className="w-3.5 h-3.5 fill-current" />
                                        暂停自动迭代
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        启用自动迭代
                                    </>
                                )}
                            </button>

                            <button 
                                onClick={step}
                                disabled={isPlaying || history.length >= 201}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Repeat className="w-3.5 h-3.5" />
                                单步应用 (A·v)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Explanation side */}
            <div className="space-y-6 flex flex-col justify-between">
                {/* Visualizer matrix representation */}
                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">当前应用矩阵 A</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">Matrix Properties</span>
                    </div>

                    <div className="flex items-center justify-around py-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                        {/* Matrix Grid */}
                        <div className="flex items-center gap-3">
                            <div className="text-2xl font-light text-slate-500">[</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-center text-lg font-mono font-bold text-indigo-300">
                                <span>{matrix[0][0].toFixed(2)}</span>
                                <span>{matrix[0][1].toFixed(2)}</span>
                                <span>{matrix[1][0].toFixed(2)}</span>
                                <span>{matrix[1][1].toFixed(2)}</span>
                            </div>
                            <div className="text-2xl font-light text-slate-500">]</div>
                        </div>

                        <div className="text-indigo-600 font-bold text-xl">×</div>

                        {/* Vector representation */}
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-light text-slate-500">[</div>
                            <div className="flex flex-col text-center font-mono text-sm font-bold text-emerald-400">
                                <span>{lastVector[0].toFixed(2)}</span>
                                <span>{lastVector[1].toFixed(2)}</span>
                            </div>
                            <div className="text-2xl font-light text-slate-500">]</div>
                        </div>

                        <div className="text-slate-500 font-bold text-sm">≈</div>

                        {/* Resulting direction */}
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-light text-slate-500">[</div>
                            <div className="flex flex-col text-center font-mono text-xs text-indigo-100 opacity-90">
                                <span>{(matrix[0][0]*lastVector[0] + matrix[0][1]*lastVector[1]).toFixed(2)}</span>
                                <span>{(matrix[1][0]*lastVector[0] + matrix[1][1]*lastVector[1]).toFixed(2)}</span>
                            </div>
                            <div className="text-2xl font-light text-slate-500">]</div>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-950 text-white p-6 rounded-3xl shadow-xl overflow-hidden relative flex-1 flex flex-col justify-center">
                    <div className="relative z-10 space-y-3">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Compass className="w-5 h-5 text-indigo-400" />
                            不动方向与幂迭代 (Power Iteration)
                        </h3>
                        <p className="text-indigo-200 text-xs leading-relaxed">
                            这是最具数学直观性的主特征向量求解器。对初始特征方向毫无概念时，我们应用如下迭代公式：
                        </p>
                        <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 font-mono">
                            <BlockMath math="v_{k+1} = \frac{A \cdot v_k}{\|A \cdot v_k\|}" />
                        </div>
                        <p className="text-indigo-200/90 text-[11px] leading-relaxed italic">
                            观察上面的收敛过程：不论初始向量处于何种随机角度，乘以矩阵 A 都会为主分量赋予最强权重。随着迭代不断趋近于 200，它精确锁定了<b>主特征轴（虚线方向）</b>。
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">信息收敛指标</span>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="text-[9px] font-bold text-emerald-600 uppercase mb-2">主特征信息</div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] text-emerald-800 font-bold">特征值 λ₁</div>
                                    <div className="text-lg font-black text-emerald-950">{principalValue.toFixed(4)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-emerald-800 font-bold">特征向量 v₁</div>
                                    <div className="text-[11px] font-mono font-bold text-emerald-950">[{principalVector[0].toFixed(2)}, {principalVector[1].toFixed(2)}]</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
