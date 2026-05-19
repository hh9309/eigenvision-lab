import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Square, 
  Box, 
  Library, 
  BrainCircuit, 
  Layers, 
  ChevronRight,
  Github,
  Maximize2,
  Sparkles
} from 'lucide-react';
import * as math from 'mathjs';
import { computeEigen } from './lib/utils';
import { LinearVisualizer2D } from './components/LinearVisualizer2D';
import { MatrixInput } from './components/MatrixInput';
import { AITutor } from './components/AITutor';
import { LinearVisualizer3D } from './components/LinearVisualizer3D';
import { ExperimentPCA } from './components/ExperimentPCA';
import { IterationVisualizer } from './components/IterationVisualizer';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { cn } from './lib/utils';

type Tab = '2d' | 'apps' | 'apps2' | 'theory' | 'guide' | 'iteration';
type Dim = '2d' | '3d';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('2d');
  const [activeDim, setActiveDim] = useState<Dim>('2d');
  const [matrix, setMatrix] = useState([[1, 0], [0, 1]]);
  
  const handleDimChange = (dim: Dim) => {
    setActiveDim(dim);
    if (dim === '2d') {
      setMatrix([[1, 0], [0, 1]]);
    } else {
      setMatrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    }
  };

  const eigen = useMemo(() => computeEigen(matrix), [matrix]);
  const det = useMemo(() => {
    try {
        return math.det(matrix);
    } catch {
        return 0;
    }
  }, [matrix]);
  const tr = useMemo(() => {
    try {
        return math.trace(matrix);
    } catch {
        return 0;
    }
  }, [matrix]);

  const c1 = useMemo(() => {
    if (matrix.length !== 3) return 0;
    const [[a11, a12, a13], [a21, a22, a23], [a31, a32, a33]] = matrix;
    return (a11 * a22 - a12 * a21) + (a11 * a33 - a13 * a31) + (a22 * a33 - a23 * a32);
  }, [matrix]);

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-hidden">
      {/* Header Navigation */}
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-sm">Σ</div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Eigen<span className="text-indigo-600">Vision</span></h1>
          <span className="hidden sm:inline-block ml-4 px-2 py-0.5 border border-slate-200 rounded text-[10px] text-slate-400 font-mono">v.2.4.0-BETA</span>
        </div>
        <div className="flex gap-6 text-xs font-semibold tracking-wide text-slate-500">
          <button onClick={() => setActiveTab('2d')} className={cn("transition-all pb-4 mt-4 border-b-2", activeTab === '2d' ? "text-indigo-600 border-indigo-600" : "border-transparent hover:text-slate-800")}>可视化演示</button>
          <button onClick={() => setActiveTab('theory')} className={cn("transition-all pb-4 mt-4 border-b-2", activeTab === 'theory' ? "text-indigo-600 border-indigo-600" : "border-transparent hover:text-slate-800")}>理论解析</button>
          <button onClick={() => setActiveTab('iteration')} className={cn("transition-all pb-4 mt-4 border-b-2", activeTab === 'iteration' ? "text-indigo-600 border-indigo-600" : "border-transparent hover:text-slate-800")}>矩阵迭代</button>
          <button onClick={() => setActiveTab('guide')} className={cn("transition-all pb-4 mt-4 border-b-2", activeTab === 'guide' ? "text-indigo-600 border-indigo-600" : "border-transparent hover:text-slate-800")}>实验指导</button>
          <button onClick={() => setActiveTab('apps')} className={cn("transition-all pb-4 mt-4 border-b-2", activeTab === 'apps' ? "text-indigo-600 border-indigo-600" : "border-transparent hover:text-slate-800")}>实践案例1</button>
          <button onClick={() => setActiveTab('apps2')} className={cn("transition-all pb-4 mt-4 border-b-2", activeTab === 'apps2' ? "text-indigo-600 border-indigo-600" : "border-transparent hover:text-slate-800")}>实践案例2</button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden xs:block">
            <div className="text-[10px] text-slate-400 font-bold">引擎状态</div>
            <div className="text-[10px] text-emerald-500 font-bold">运行稳定 (120FPS)</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
             <Github className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {activeTab === '2d' && (
          <>
            {/* Left Panel: Input & Controls */}
            <aside className="w-72 border-r border-slate-200 p-6 bg-white flex flex-col gap-8 overflow-y-auto shrink-0 hidden lg:flex">
              <section>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">线性变换矩阵 A</label>
                <MatrixInput matrix={matrix} onChange={setMatrix} theme="light" />
                <div className="mt-4 flex justify-between px-1">
                   <span className="text-xs text-slate-500 font-mono font-medium">det(A) = {det.toFixed(2)}</span>
                   <span className="text-xs text-slate-500 font-mono font-medium">tr(A) = {tr.toFixed(2)}</span>
                </div>
              </section>

              <section>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">矩阵维度与视角</label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => handleDimChange('2d')}
                        className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", activeDim === '2d' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >2阶 (2D Grid)</button>
                    <button 
                        onClick={() => handleDimChange('3d')}
                        className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", activeDim === '3d' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >3阶 (3D Space)</button>
                </div>
              </section>

              <section className="mt-auto">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                   <div className="text-[11px] text-indigo-600 mb-2 uppercase tracking-wider font-bold">特征值</div>
                   <div className="text-xs text-slate-600 leading-relaxed">
                     特征值不仅是矩阵变换中保持方向不变的缩放因子，更是理解空间变换本质的钥匙。它揭示了系统演化的稳定状态，在数据降维（如PCA）中起到了提取核心特征的作用，是线性代数中最具应用价值的概念之一。
                   </div>
                </div>
              </section>
            </aside>

            {/* Central Panel: Main Visualization */}
            <section className="flex-1 relative bg-white flex flex-col overflow-hidden">
                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
                
                <div className={cn("flex-1 relative", activeDim === '2d' ? "overflow-y-auto" : "overflow-y-auto")}>
                    {activeDim === '2d' ? (
                        <div className="p-6 h-full min-h-[500px]">
                            <LinearVisualizer2D matrix={matrix} eigenData={eigen} theme="light" />
                        </div>
                    ) : (
                        <div className="w-full min-h-full bg-slate-50 flex flex-col">
                            {/* Main Split Layout for 3D */}
                            <div className="h-[700px] relative bg-white border-b border-slate-200 grid grid-cols-1 lg:grid-cols-4 shrink-0">
                                {/* Left Side: 3D Visualization */}
                                <div className="lg:col-span-3 relative flex flex-col border-r border-slate-100">
                                    {/* Header / Controls in canvas */}
                                    <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
                                        <div className="w-1/4 hidden md:block"></div>
                                        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-slate-700/50 pointer-events-auto">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">变换空间: 矩阵 A</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-xl pointer-events-auto shrink-0">
                                            <div className="px-4 py-2 border-r border-slate-100">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5 leading-none">行列式值</span>
                                                <span className="text-sm font-mono font-black text-indigo-600">det(A) = {det.toFixed(2)}</span>
                                            </div>
                                            <div className="px-4 py-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5 leading-none">空间缩放</span>
                                                <span className={cn("text-xs font-bold", det === 0 ? "text-rose-500" : "text-emerald-500")}>
                                                    {det === 0 ? "维度湮灭" : `${Math.abs(det).toFixed(2)}x`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 relative">
                                        <LinearVisualizer3D matrix={matrix} eigenData={eigen} />
                                    </div>
                                </div>

                                {/* Right Side: Visual Improvements Panel */}
                                <div className="hidden lg:flex flex-col bg-slate-50/30 p-8 overflow-y-auto border-l border-slate-100">
                                    <div className="flex items-center gap-2 mb-8">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">3D 交互功能说明</h3>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                                    <Maximize2 className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700 uppercase">高亮优化效果</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed pl-11">
                                                增强高亮效果：当鼠标悬停在空间中的任意点时，该点会变为一个显眼的大球体（半径从 0.06 增大到 0.18），并增加了一个外层发光圈 (Glow Effect)。
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                                    <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700 uppercase">动态彩色显示</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed pl-11">
                                                实时色彩循环：高亮球体会实时进行颜色循环切换 (Hue Cycling)，呈现出绚丽多变的效果。
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                                    <div className="w-3 h-3 rounded-full border-2 border-indigo-500 animate-ping" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700 uppercase">脉动缩放动画</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed pl-11">
                                                呼吸脉动效果：为高亮球体添加了 Pulse Animation，通过持续的缩放变化让选中的点更加生动醒目。
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                                    <BrainCircuit className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-700 uppercase">发光能量材质</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed pl-11">
                                                自发光 (Emissive) 材质：赋予 3D 点位科技感，使其在空间渲染中具有极高的识别度。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-8 border-t border-slate-200/60">
                                        <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">交互提示</div>
                                            <p className="text-[10px] font-medium leading-relaxed">
                                                使用鼠标悬停在网格交点上，即可体验上述实时视觉反馈效果。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Overlay Labels */}
                    <div className="absolute top-6 left-6 p-4 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm pointer-events-none">
                        <div className="text-[10px] text-slate-400 mb-1 tracking-widest uppercase font-bold">当前线性变换</div>
                        <div className="text-2xl font-light font-mono text-slate-800">A · x = b</div>
                    </div>
                </div>
                
                {/* Bottom Calculation Bar */}
                <div className="mt-auto h-48 border-t border-slate-200 bg-white/80 backdrop-blur-md flex shrink-0 overflow-x-auto z-10 relative">
                    <div className="min-w-[240px] w-1/3 p-5 border-r border-slate-200">
                        <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">特征值 (Eigenvalues)</div>
                        <div className="grid grid-cols-1 gap-2">
                            {eigen?.eigenvalues.map((val, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", [ "bg-rose-500", "bg-emerald-500", "bg-indigo-500" ][i % 3])} />
                                        <span className="text-xs font-bold text-slate-500">λ{i+1}</span>
                                    </div>
                                    <div className="font-mono text-xs font-bold text-indigo-600">{val.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="min-w-[240px] w-1/3 p-5 border-r border-slate-200">
                        <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">特征方程 (Characteristic Eq)</div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                            <div className="font-serif text-sm text-slate-800 text-center flex items-center justify-center min-h-[40px]">
                                {matrix.length === 2 ? (
                                    <BlockMath math={`\\lambda^2 - ${tr.toFixed(2)}\\lambda + ${det.toFixed(2)} = 0`} />
                                ) : (
                                    <BlockMath math={`\\lambda^3 - ${tr.toFixed(2)}\\lambda^2 + ${c1.toFixed(2)}\\lambda - ${det.toFixed(2)} = 0`} />
                                )}
                            </div>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-2 text-center leading-tight">
                            tr(A) = {tr.toFixed(2)}, det(A) = {det.toFixed(2)}
                            {matrix.length === 3 && <><br />c_1 = {c1.toFixed(2)}</>}
                        </div>
                    </div>
                    <div className="min-w-[240px] w-1/3 p-5">
                        <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">特征向量矩阵 S</div>
                        <div className="bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                             <div className="text-[10px] font-mono text-slate-600 space-y-1">
                               {eigen?.eigenvectors.map((vec, i) => (
                                   <div key={i} className="flex items-center gap-2">
                                       <div className={cn("w-2 h-2 rounded-full", ["bg-rose-500", "bg-emerald-500", "bg-indigo-500"][i % 3])} />
                                       <span className="text-slate-400">v{i+1}:</span>
                                       <span className="text-indigo-600 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                         [{vec.map(v => v.toFixed(2)).join(', ')}]
                                       </span>
                                   </div>
                               ))}
                             </div>
                        </div>
                        <div className="mt-2 text-[9px] text-slate-400 italic leading-tight">
                            空间主轴方向
                        </div>
                    </div>
                </div>
            </section>

            {/* Right Panel: AI Tutor Sidebar */}
            <aside className="w-80 border-l border-slate-200 flex flex-col bg-slate-50 shrink-0 hidden xl:flex">
                <AITutor currentContext={{ matrix, eigen }} layout="sidebar" />
            </aside>
          </>
        )}

        {activeTab === 'iteration' && (
           <div className="flex-1 p-10 overflow-y-auto bg-slate-50">
             <div className="max-w-5xl mx-auto space-y-10 pb-24">
                <header className="space-y-2">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">矩阵迭代：寻找“不动”的方向</h2>
                    <p className="text-slate-500 max-w-2xl text-sm">通过重复应用矩阵变换，观察随机向量如何逐步收敛到特征空间的主轴。</p>
                </header>

                <div className="h-[750px]">
                    <IterationVisualizer matrix={matrix} />
                </div>
             </div>
           </div>
        )}

        {activeTab === 'guide' && (
           <div className="flex-1 p-10 overflow-y-auto bg-slate-50">
             <div className="max-w-5xl mx-auto space-y-10 pb-24">
                <header className="space-y-2">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">实验指导：特征空间探索</h2>
                    <p className="text-slate-500 max-w-2xl text-sm">通过这三个精心设计的实验，你将亲手触碰线性变换中那些“不变”的灵魂。</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Experiment 1 */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs mb-4">01</div>
                        <h3 className="font-bold text-slate-800 mb-2">实验 1：剪切变换与特征灵敏度</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed flex-1 mb-4">
                            观察矩阵 <InlineMath math="[[1, 1], [0, 1]]" />。这是一个水平剪切。你会发现无论怎么增加剪切力，都只存在一个特征向量方向。
                        </p>
                        <button 
                          onClick={() => { setMatrix([[1, 1], [0, 1]]); setActiveTab('2d'); }}
                          className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
                        >
                            执行实验
                        </button>
                    </div>

                    {/* Experiment 2 */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold text-xs mb-4">02</div>
                        <h3 className="font-bold text-slate-800 mb-2">实验 2：旋转、镜像与维度的消失</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed flex-1 mb-4">
                            尝试矩阵 <InlineMath math="[[0, -1], [1, 0]]" />。特征值会变成复数。在可视化中，你会发现没有任何一个非零向量在变换后保持方向不变。
                        </p>
                        <button 
                          onClick={() => { setMatrix([[0, -1], [1, 0]]); setActiveTab('2d'); }}
                          className="w-full py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all border border-rose-100"
                        >
                            执行实验
                        </button>
                    </div>

                    {/* Experiment 3 */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xs mb-4">03</div>
                        <h3 className="font-bold text-slate-800 mb-2">实验 3：数据冗余与降维初探</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed flex-1 mb-4">
                            输入矩阵 <InlineMath math="[[0.5, 0.5], [0.5, 0.5]]" />。det(A)=0，平面坍缩成一条线。这对应了 PCA 中方差极小维度的被舍弃过程。
                        </p>
                        <button 
                          onClick={() => { setMatrix([[0.5, 0.5], [0.5, 0.5]]); setActiveTab('2d'); }}
                          className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
                        >
                            执行实验
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        实验心得提示
                    </h4>
                    <ul className="space-y-4 text-xs text-slate-300 leading-relaxed">
                        <li className="flex gap-3">
                            <span className="text-indigo-400 font-bold">1.</span>
                            一个变换如果不改变某些方向，那些方向就是这个变换的“自然语言”——特征向量。
                        </li>
                        <li className="flex gap-3">
                            <span className="text-indigo-400 font-bold">2.</span>
                            特征值绝对值小于 1 会使空间收缩，大于 1 会使空间膨胀，等于 0 则会发生降维。
                        </li>
                        <li className="flex gap-3">
                            <span className="text-indigo-400 font-bold">3.</span>
                            对称矩阵始终有实数特征值，且特征向量正交，这正是工程应用中最完美的数学结构。
                        </li>
                    </ul>
                </div>
             </div>
           </div>
        )}

        {activeTab === 'apps' && (
           <div className="flex-1 p-10 overflow-y-auto bg-slate-50">
             <div className="max-w-5xl mx-auto space-y-12 pb-24">
                {/* Main Case Header */}
                <div className="space-y-4">
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">实践案例1：PageRank 算法分析与数值模拟</h2>
                    </div>
                    <p className="text-slate-500 max-w-3xl leading-relaxed">
                        PageRank 算法通过迭代计算状态转移矩阵的稳态分布。以下展示一个具有 3 个网页节点的简化系统的完整分析过程。
                    </p>
                </div>

                {/* Numerical Simulation Section */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">数值计算全过程</h3>
                            <p className="text-xs text-slate-500 mt-1">模拟一个 3 节点（A, B, C）互联网络的收敛走向</p>
                        </div>
                        <div className="flex gap-2">
                             <div className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">1 阶特征向量</div>
                             <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">幂迭代法</div>
                        </div>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-12">
                        {/* Matrix Representation */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">1. 状态转移矩阵 (Stochastic Matrix)</h4>
                                <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <div className="font-serif text-2xl text-slate-400">[</div>
                                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 font-mono text-sm text-slate-800">
                                        <div className="text-center">0.00</div> <div className="text-center">0.50</div> <div className="text-center">1.00</div>
                                        <div className="text-center">0.50</div> <div className="text-center">0.00</div> <div className="text-center">0.00</div>
                                        <div className="text-center">0.50</div> <div className="text-center">0.50</div> <div className="text-center">0.00</div>
                                    </div>
                                    <div className="font-serif text-2xl text-slate-400">]</div>
                                    <div className="text-[10px] text-slate-400 leading-tight">
                                        节点 A 接收来自 B(50%) 和 C(100%) 的流量<br />
                                        节点 B 接收来自 A(50%) 的流量<br />
                                        节点 C 接收 A(50%) 和 B(50%) 的流量
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">2. 初始重要性权重 (Initial Rank)</h4>
                                <div className="flex gap-4">
                                    {['A', 'B', 'C'].map(node => (
                                        <div key={node} className="flex-1 p-4 bg-white border border-slate-200 rounded-xl text-center">
                                            <div className="text-[10px] text-slate-400 font-bold mb-1">网页 {node}</div>
                                            <div className="font-mono text-indigo-600 font-bold text-lg">0.33</div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 italic">假设初始状态下，所有网页的点击概率均等分布。</p>
                            </div>
                        </div>

                        {/* Iteration Process */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">3. 幂迭代收敛记录 (Iteration Steps)</h4>
                            <div className="space-y-2">
                                <div className="grid grid-cols-5 text-[10px] font-bold text-slate-400 uppercase pb-2 px-2 border-b border-slate-100">
                                    <span>步骤</span> <span>网页 A</span> <span>网页 B</span> <span>网页 C</span> <span>残差 Δ</span>
                                </div>
                                {[
                                    { k: 0, r: [0.33, 0.33, 0.33], error: '-' },
                                    { k: 1, r: [0.50, 0.17, 0.33], error: '0.17' },
                                    { k: 2, r: [0.42, 0.25, 0.33], error: '0.08' },
                                    { k: 3, r: [0.46, 0.21, 0.33], error: '0.04' },
                                    { k: 4, r: [0.44, 0.23, 0.33], error: '0.02' },
                                    { k: '∞', r: [0.44, 0.22, 0.33], error: '0.00' }
                                ].map((step, idx) => (
                                    <div key={idx} className={cn("grid grid-cols-5 text-xs font-mono py-2 px-2 rounded-lg", step.k === '∞' ? "bg-indigo-600 text-white" : "bg-white border border-slate-50")}>
                                        <span className={cn(step.k !== '∞' ? "text-slate-400" : "")}>{step.k === '∞' ? "收敛" : `Step ${step.k}`}</span>
                                        <span>{step.r[0].toFixed(2)}</span>
                                        <span>{step.r[1].toFixed(2)}</span>
                                        <span>{step.r[2].toFixed(2)}</span>
                                        <span className={cn(step.k !== '∞' ? "text-emerald-500" : "text-indigo-200")}>{step.error}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <p className="text-xs text-indigo-700 leading-relaxed">
                                    <strong>特征分析：</strong> 结果显示网页 A 具有最高权重 (44.44%)。这是因为网站 C 和 B 都将大量流量引向 A，形成了结构性的权威聚集。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Case Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Stage 1: Matrix Formulation */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">A</div>
                        <h3 className="text-lg font-bold text-slate-800">模型构建：转移矩阵</h3>
                        <div className="text-sm text-slate-500 leading-relaxed space-y-4">
                            <p>将互联网视为有向图，构建概率转移矩阵 <InlineMath math="M" />。其中 <InlineMath math="M_{ij}" /> 表示从网页 <InlineMath math="j" /> 跳转到 <InlineMath math="i" /> 的概率。</p>
                            <div className="p-4 bg-slate-50 rounded-xl font-mono text-[11px] text-blue-600 border border-blue-50">
                                M = (1-d)G + d(1/n)J
                            </div>
                        </div>
                    </div>

                    {/* Stage 2: Eigenvalue Role */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">B</div>
                        <h3 className="text-lg font-bold text-slate-800">特征值的主导地位</h3>
                        <div className="text-sm text-slate-500 leading-relaxed space-y-4">
                            <p>根据 **Perron-Frobenius 定理**，随机矩阵的最大特征值必然为 <InlineMath math="\lambda = 1" />。</p>
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                                <BlockMath math="M\mathbf{r} = 1\cdot\mathbf{r}" />
                            </div>
                        </div>
                    </div>

                    {/* Stage 3: Power Iteration */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">C</div>
                        <h3 className="text-lg font-bold text-slate-800">迭代收敛性</h3>
                        <div className="text-sm text-slate-500 leading-relaxed space-y-4">
                            <p>PageRank 之所以高效，是因为其主要的特征向量具有良好的收敛性。通过简单的矩阵乘法即可逼近真实分布。</p>
                            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/30 font-mono text-[11px]">
                                \lim_{"{k\to\infty}"} M^k r_0 = r_{"{\infty}"}
                            </div>
                        </div>
                </div>
             </div>
           </div>
        )}

        {activeTab === 'apps2' && (
           <div className="flex-1 p-10 overflow-y-auto bg-slate-50">
             <div className="max-w-5xl mx-auto space-y-12 pb-24">
                {/* Main Case Header */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">实践案例2：PCA 主成分分析的数学本质</h2>
                    </div>
                    <p className="text-slate-500 max-w-3xl leading-relaxed">
                        主成分分析 (Principal Component Analysis) 是一种降维技术，其核心是寻找数据协方差矩阵的特征向量。这些向量定义了数据分布中信息量（方差）最大的方向。
                    </p>
                </div>

                {/* PCA Numerical Simulation */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">PCA 数值模拟：降维全过程</h3>
                            <p className="text-xs text-slate-500 mt-1">从原始观测点到主成分轴的转换分析</p>
                        </div>
                        <div className="flex gap-2">
                             <div className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md">协方差矩阵</div>
                             <div className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">正交投影</div>
                        </div>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-12">
                        {/* Covariance Matrix Computation */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">1. 协方差矩阵 (Covariance Matrix Σ)</h4>
                                <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <div className="font-serif text-2xl text-slate-400">[</div>
                                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 font-mono text-[11px] text-slate-800">
                                        <div className="text-center font-bold">4.20</div> <div className="text-center text-slate-400">1.80</div> <div className="text-center text-slate-400">0.50</div>
                                        <div className="text-center text-slate-400">1.80</div> <div className="text-center font-bold">2.40</div> <div className="text-center text-slate-400">1.20</div>
                                        <div className="text-center text-slate-400">0.50</div> <div className="text-center text-slate-400">1.20</div> <div className="text-center font-bold">1.00</div>
                                    </div>
                                    <div className="font-serif text-2xl text-slate-400">]</div>
                                    <div className="text-[10px] text-slate-400 leading-tight">
                                        多维特征空间的方差-协方差结构<br />
                                        对角线展示单维度离散程度<br />
                                        非对角线展示维度间的耦合度
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">2. 特征分解结果 (Eigen-decomposition)</h4>
                                <div className="space-y-2">
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-[10px]">PC1</div>
                                            <div className="text-[10px] font-bold text-slate-700">主轴 1 (信息量最大)</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[11px] font-mono font-bold text-rose-600">λ₁ = 5.82</div>
                                            <div className="text-[8px] text-slate-400 font-mono">v₁ = [0.72, 0.61, 0.33]</div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between opacity-80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-[10px]">PC2</div>
                                            <div className="text-[10px] font-bold text-slate-700">主轴 2</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[11px] font-mono font-bold text-emerald-600">λ₂ = 1.14</div>
                                            <div className="text-[8px] text-slate-400 font-mono">v₂ = [-0.48, 0.79, -0.38]</div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between opacity-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">PC3</div>
                                            <div className="text-[10px] font-bold text-slate-700">主轴 3 (噪声)</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[11px] font-mono font-bold text-indigo-600">λ₃ = 0.64</div>
                                            <div className="text-[8px] text-slate-400 font-mono">v₃ = [-0.15, 0.22, 0.96]</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Projection Result */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">3. 维度压缩与信息保留 (Information Summary)</h4>
                            <div className="p-6 bg-slate-900 rounded-2xl text-white space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-rose-400">PC1 (主要拓扑结构)</span>
                                        <span>76.50%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: '76.5%' }} className="h-full bg-rose-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-emerald-400">PC2 (细节信息)</span>
                                        <span>15.10%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: '15.1%' }} className="h-full bg-emerald-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-indigo-400">PC3 (可忽略噪声)</span>
                                        <span>8.40%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: '8.4%' }} className="h-full bg-indigo-500" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                        决策参考：保留前两个主成分 (PC1+PC2) 即可获得 91.60% 的方差解释率，成功将 3 维高冗余数据压缩为 2 维平面，且几乎不损失关键特征。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PCA 3D Interactive Lab */}
                <div className="h-[600px]">
                    <ExperimentPCA />
                </div>

                {/* Conceptual Cards for PCA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold text-xs">A</div>
                        <h4 className="font-bold text-slate-800">基底变换</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            PCA 的本质是将原来的坐标轴旋转，对齐到数据方差最大的方向。这个“旋转矩阵”正是由特征向量构成的。
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">B</div>
                        <h4 className="font-bold text-slate-800">特征值 = 能量</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            每一个特征值的大小直接对应了在该特征向量方向上保留的“数据能量”。我们通常只选择前几个最大的特征值。
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xs">C</div>
                        <h4 className="font-bold text-slate-800">白化与去相关</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            变换后的主成分之间是完全正交（无关）的。这在机器学习预处理中能极大消除特征冗余。
                        </p>
                    </div>
                </div>
             </div>
           </div>
        )}

        {activeTab === 'theory' && (
             <div className="flex-1 p-16 overflow-y-auto bg-white">
                <div className="max-w-4xl mx-auto space-y-16 pb-32">
                    {/* Header Section */}
                    <header className="border-b border-slate-100 pb-10">
                        <div className="text-indigo-600 font-mono text-[11px] uppercase tracking-[0.3em] mb-4 font-bold">Linear Algebra Deep Dive</div>
                        <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6">线性变换与特征系统</h2>
                        <p className="text-xl text-slate-500 font-light max-w-2xl leading-relaxed">
                            理解矩阵不仅仅是处理数字表格，而是理解空间的扭曲、拉伸与旋转。特征向量是这些变换中保持方向不变的“不变量”。
                        </p>
                    </header>

                    {/* Section 1: The Core Identity */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm">01</span>
                                谱定理与特征方程
                            </h3>
                            <div className="text-slate-600 leading-relaxed space-y-4">
                                <p>线性代数的核心在于寻找空间的“主轴”。特征方程定义了在变换 <InlineMath math="A" /> 下，哪些向量 <InlineMath math="\mathbf{v}" /> 仅发生尺度缩放：</p>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 font-serif my-4">
                                    <BlockMath math="A\mathbf{v} = \lambda\mathbf{v} \implies (A - \lambda I)\mathbf{v} = \mathbf{0}" />
                                </div>
                                <p>为了使非零解存在，算子 <InlineMath math="(A - \lambda I)" /> 必须是奇异的，即它将空间的至少一个维度压缩为零。这导出了特征多项式：</p>
                                <BlockMath math="P(\lambda) = \det(A - \lambda I) = 0" />
                            </div>
                        </div>
                        <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100">
                            <h4 className="font-bold text-indigo-100 uppercase text-[10px] tracking-widest mb-4">特征分解的应用</h4>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 bg-indigo-500 rounded flex items-center justify-center shrink-0">✓</div>
                                    <div className="text-sm"><strong>数据降维 (PCA):</strong> 通过特征值识别数据方差最大的主成分方向。</div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 bg-indigo-500 rounded flex items-center justify-center shrink-0">✓</div>
                                    <div className="text-sm"><strong>振动分析:</strong> 机械系统中特征频率决定了结构的稳定性与共振。</div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 bg-indigo-500 rounded flex items-center justify-center shrink-0">✓</div>
                                    <div className="text-sm"><strong>图像压缩:</strong> 奇异值分解 (SVD) 提取图像中最关键的视觉拓扑结构。</div>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 2: Determinants & Orientation */}
                    <section className="space-y-8">
                        <div className="flex items-center gap-4 border-l-4 border-indigo-600 pl-6">
                            <h3 className="text-2xl font-bold text-slate-800">行列式的几何直觉</h3>
                        </div>
                        <p className="text-lg text-slate-600">行列式 <InlineMath math="\det(A)" /> 并非一个枯燥的数值，它是 **空间张量**：它描述了单位体积在变换后的缩放倍率。</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-indigo-600 font-bold mb-2">det(A) &gt; 1</div>
                                <div className="text-sm text-slate-500">空间膨胀。变换后的体积比原始体积大。</div>
                            </div>
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-rose-600 font-bold mb-2">det(A) &lt; 0</div>
                                <div className="text-sm text-slate-500">空间翻转。变换导致了手性的改变（如镜像）。</div>
                            </div>
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="text-amber-600 font-bold mb-2">det(A) = 0</div>
                                <div className="text-sm text-slate-500">降维坍缩。空间被压缩成了一条线或一个点，变得不可逆。</div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Diagonalization */}
                    <section className="bg-slate-900 rounded-3xl p-12 text-slate-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
                        <h3 className="text-2xl font-bold text-white mb-8">对角化：更换观察基准</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <p className="leading-relaxed">如果我们可以找到一组由特征向量构成的基底，那么在该基底下，变换将变得极其简单——仅仅是各轴向的独立缩放：</p>
                                <div className="bg-white/5 p-6 rounded-xl border border-white/10 font-mono text-indigo-400">
                                    A = PDP^{"{-1}"}
                                </div>
                                <p className="text-sm text-slate-400">
                                    这里 <InlineMath math="P" /> 的列是特征向量，而 <InlineMath math="D" /> 是以特征值为对角元素的矩阵。这个分解告诉我们：任何复杂的变换本质上都是某种坐标系下的简单伸缩。
                                </p>
                            </div>
                            <div className="flex items-center justify-center">
                                <div className="grid grid-cols-3 gap-1">
                                    {[1,0,0,0,1,0,0,0,1].map((v, i) => (
                                        <div key={i} className={cn("w-12 h-12 flex items-center justify-center border", i % 4 === 0 ? "border-indigo-500 text-indigo-400 bg-indigo-500/5 font-bold" : "border-white/5 text-white/20")}>
                                            {i % 4 === 0 ? (i/4+1) : "0"}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="h-6 border-t border-slate-200 bg-white flex items-center px-6 justify-between shrink-0">
        <div className="flex gap-6">
          <div className="text-[9px] text-slate-400 uppercase font-medium">坐标系统: 笛卡尔 2D</div>
          <div className="text-[9px] text-slate-400 uppercase font-medium">行列式 S: {det.toFixed(2)}</div>
        </div>
        <div className="flex gap-6">
           <div className="text-[9px] text-indigo-500 uppercase font-bold tracking-tighter">就绪：光谱分析模式</div>
           <div className="text-[9px] text-slate-400 font-medium">会话时长: 00:04:12</div>
        </div>
      </footer>
    </div>
  );
}

function AppCard({ title, description, color }: { title: string, description: string, color: 'blue' | 'purple' }) {
    const colorClasses = color === 'blue' ? "from-blue-50 border-blue-100" : "from-purple-50 border-purple-100";
    return (
        <div className={cn("flex items-center gap-6 p-6 bg-gradient-to-br to-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow", colorClasses)}>
           <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm", color === 'blue' ? "bg-white text-blue-500" : "bg-white text-purple-500")}>
             <Layers className="w-7 h-7" />
           </div>
           <div>
             <div className="text-base font-bold text-slate-900 mb-1">{title}</div>
             <div className="text-xs text-slate-500 leading-relaxed">{description}</div>
           </div>
        </div>
    )
}
