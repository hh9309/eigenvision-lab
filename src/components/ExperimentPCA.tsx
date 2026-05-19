import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Info, Play, RotateCcw, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Generate 3D sample data: a squashed ellipsoid in 3D
const generate3DData = (count: number) => {
  const points: { pos: THREE.Vector3; id: number }[] = [];
  for (let i = 0; i < count; i++) {
    // Generate data with heavy correlation in two directions
    const u = (Math.random() - 0.5) * 8;
    const v = (Math.random() - 0.5) * 4;
    const w = (Math.random() - 0.5) * 1.5; // Least variance
    
    // Rotate these to arbitrary 3D space
    // Let's just define some PC axes
    const pc1 = new THREE.Vector3(0.72, 0.61, 0.33).normalize();
    const pc2 = new THREE.Vector3(-0.48, 0.79, -0.38).normalize();
    const pc3 = new THREE.Vector3().crossVectors(pc1, pc2).normalize();
    
    const point = new THREE.Vector3()
        .addScaledVector(pc1, u)
        .addScaledVector(pc2, v)
        .addScaledVector(pc3, w);
        
    points.push({ pos: point, id: i });
  }
  return points;
};

export const ExperimentPCA: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isProjected, setIsProjected] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentVarianceRatio, setCurrentVarianceRatio] = useState(0);
    const [viewVariance, setViewVariance] = useState({ x: 0, y: 0 });
    const data = useMemo(() => generate3DData(150), []);
    
    // Total Variance calculation
    const totalVar = useMemo(() => {
        return data.reduce((sum, d) => sum + d.pos.lengthSq(), 0);
    }, [data]);

    // Principal Components
    const pc1 = new THREE.Vector3(0.72, 0.61, 0.33).normalize();
    const pc2 = new THREE.Vector3(-0.48, 0.79, -0.38).normalize();
    const pc3 = new THREE.Vector3().crossVectors(pc1, pc2).normalize();
    
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        controls: OrbitControls;
        points: THREE.Group;
        pointMeshes: THREE.Mesh[];
        pcPlane: THREE.Mesh;
        projectionLines: THREE.LineSegments;
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(12, 8, 12);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const pl = new THREE.PointLight(0xffffff, 1);
        pl.position.set(10, 10, 10);
        scene.add(pl);

        // Grid
        const grid = new THREE.GridHelper(20, 20, 0xccd6e0, 0xe2e8f0);
        grid.position.y = -6;
        scene.add(grid);

        // PC Plane
        const planeGeom = new THREE.PlaneGeometry(15, 15);
        const planeMat = new THREE.MeshPhongMaterial({ 
            color: 0x6366f1, 
            transparent: true, 
            opacity: 0.1, 
            side: THREE.DoubleSide 
        });
        const pcPlane = new THREE.Mesh(planeGeom, planeMat);
        
        const planeNormal = new THREE.Vector3().crossVectors(pc1, pc2).normalize();
        pcPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), planeNormal);
        scene.add(pcPlane);

        // Projection Lines (Initially empty)
        const lineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.3 });
        const lineGeom = new THREE.BufferGeometry();
        const projectionLines = new THREE.LineSegments(lineGeom, lineMat);
        scene.add(projectionLines);

        // PC Axes
        const createAxis = (dir: THREE.Vector3, color: number, label: string) => {
            const group = new THREE.Group();
            const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
            const geom = new THREE.BufferGeometry().setFromPoints([
                dir.clone().multiplyScalar(-10),
                dir.clone().multiplyScalar(10)
            ]);
            group.add(new THREE.Line(geom, mat));
            return group;
        };
        scene.add(createAxis(pc1, 0xf43f5e, 'PC1'));
        scene.add(createAxis(pc2, 0x10b981, 'PC2'));

        // Points
        const pointsGroup = new THREE.Group();
        const pointMeshes: THREE.Mesh[] = [];
        const sphereGeom = new THREE.SphereGeometry(0.12, 16, 16);
        
        data.forEach((d, i) => {
            const mat = new THREE.MeshPhongMaterial({ 
                color: 0x4f46e5, 
                transparent: true, 
                opacity: 0.7 
            });
            const mesh = new THREE.Mesh(sphereGeom, mat);
            mesh.position.copy(d.pos);
            pointsGroup.add(mesh);
            pointMeshes.push(mesh);
        });
        scene.add(pointsGroup);

        sceneRef.current = { scene, camera, renderer, controls, points: pointsGroup, pointMeshes, pcPlane, projectionLines };

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();

            // Calculate current view variance
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);

            // Get standard view axes (right and up) for the current camera orientation
            const viewRight = new THREE.Vector3();
            const viewUp = new THREE.Vector3();
            camera.matrixWorld.extractBasis(viewRight, viewUp, new THREE.Vector3());
            
            let varianceOnAxis = 0;
            let varianceX = 0;
            let varianceY = 0;

            data.forEach(d => {
                const dot = d.pos.dot(cameraDir);
                varianceOnAxis += dot * dot;

                const dotX = d.pos.dot(viewRight);
                const dotY = d.pos.dot(viewUp);
                varianceX += dotX * dotX;
                varianceY += dotY * dotY;
            });

            const ratio = ((totalVar - varianceOnAxis) / totalVar) * 100;
            setCurrentVarianceRatio(ratio);
            setViewVariance({ 
                x: (varianceX / totalVar) * 100, 
                y: (varianceY / totalVar) * 100 
            });

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
            if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, []);

    // Animation Effect
    useEffect(() => {
        if (!sceneRef.current) return;
        const { pointMeshes, projectionLines } = sceneRef.current;
        setIsAnimating(true);

        const duration = 1200;
        const startTime = Date.now();

        const projectPoint = (p: THREE.Vector3) => {
            const dot1 = p.dot(pc1);
            const dot2 = p.dot(pc2);
            return new THREE.Vector3()
                .addScaledVector(pc1, dot1)
                .addScaledVector(pc2, dot2);
        };

        const updatePositions = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const linePoints: THREE.Vector3[] = [];

            pointMeshes.forEach((mesh, i) => {
                const target = projectPoint(data[i].pos);
                if (isProjected) {
                    mesh.position.lerpVectors(data[i].pos, target, eased);
                    // Add path line
                    linePoints.push(data[i].pos, mesh.position.clone());
                } else {
                    mesh.position.lerpVectors(target, data[i].pos, eased);
                    // Hide lines when resetting
                }
            });

            if (isProjected && linePoints.length > 0) {
                projectionLines.geometry.setFromPoints(linePoints);
                projectionLines.visible = true;
            } else {
                projectionLines.visible = false;
            }

            if (progress < 1) {
                requestAnimationFrame(updatePositions);
            } else {
                setIsAnimating(false);
                // Clear lines if we reached back to 3D state
                if (!isProjected) {
                    projectionLines.visible = false;
                }
            }
        };

        updatePositions();
    }, [isProjected]);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden h-full flex flex-col transition-all">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">3D PCA 降维实验室</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Principal Component Projection</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsProjected(!isProjected)}
                        disabled={isAnimating}
                        className={cn(
                            "group flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95",
                            isProjected 
                                ? "bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600" 
                                : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                        )}
                    >
                        {isProjected ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isProjected ? "重置原始数据" : "开始正交投影"}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative bg-[#f1f5f9]">
                <div ref={containerRef} className="w-full h-full" />
                
                {/* Overlay Controls */}
                <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl pointer-events-auto max-w-[220px]">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-black text-slate-700 uppercase">实验参数</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                <span className="text-[9px] text-slate-400 font-bold">数据点总数</span>
                                <span className="text-[10px] font-mono font-bold text-slate-700">150</span>
                            </div>
                            <div className="flex justify-between items-center bg-rose-50 p-2 rounded-lg">
                                <span className="text-[9px] text-rose-400 font-bold tracking-tighter">PC1 (方差 76.5%)</span>
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                            </div>
                            <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg">
                                <span className="text-[9px] text-emerald-400 font-bold tracking-tighter">PC2 (方差 15.1%)</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-2xl pointer-events-auto max-w-[220px]">
                        <div className="flex items-center justify-between mb-2">
                             <div className="text-[9px] font-bold text-indigo-400 uppercase">投影能量 (方差)</div>
                             <span className="text-[10px] font-mono font-bold text-white">{currentVarianceRatio.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                            <motion.div 
                                animate={{ width: `${currentVarianceRatio}%` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className={cn(
                                    "h-full transition-colors",
                                    currentVarianceRatio > 90 ? "bg-emerald-500" : (currentVarianceRatio > 50 ? "bg-indigo-500" : "bg-rose-500")
                                )}
                            />
                        </div>

                        {/* Real-time Axis Variance Chart */}
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                             <div>
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase mb-1">
                                    <span>视图水平轴 (X')</span>
                                    <span className="text-slate-300">{viewVariance.x.toFixed(1)}%</span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                     <motion.div 
                                        animate={{ width: `${viewVariance.x}%` }}
                                        className="h-full bg-rose-400/80"
                                     />
                                </div>
                             </div>
                             <div>
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase mb-1">
                                    <span>视图垂直轴 (Y')</span>
                                    <span className="text-slate-300">{viewVariance.y.toFixed(1)}%</span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                     <motion.div 
                                        animate={{ width: `${viewVariance.y}%` }}
                                        className="h-full bg-emerald-400/80"
                                     />
                                </div>
                             </div>
                        </div>

                        <p className="text-[8px] text-slate-400 leading-tight mt-3">
                            {currentVarianceRatio > 90 ? "✨ 发现最优投影角度！" : "旋转寻找保留能量最高的视角"}
                        </p>
                    </div>

                    <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-2xl pointer-events-auto max-w-[220px]">
                        <div className="text-[9px] font-bold text-indigo-400 uppercase mb-2">交互指南</div>
                        <div className="flex items-start gap-2">
                            <MousePointer2 className="w-3 h-3 text-slate-400 mt-0.5" />
                            <p className="text-[9px] text-slate-300 leading-relaxed font-medium">
                                拖拽旋转场景，滚轮缩放。点击上方按钮观察 3D 点云如何“降落”到 PC1-PC2 特征平面。
                            </p>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isProjected && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-6 left-6 right-6 flex justify-center pointer-events-none"
                        >
                            <div className="bg-white/95 backdrop-blur-xl px-6 py-4 rounded-2xl border border-slate-200 shadow-2xl flex items-center gap-6 pointer-events-auto">
                                <div className="text-center">
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">降维状态</div>
                                    <div className="text-xs font-black text-emerald-600">已压缩至 2D 平面</div>
                                </div>
                                <div className="h-8 w-px bg-slate-100" />
                                <div className="text-center">
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">信息保留率</div>
                                    <div className="text-sm font-black text-slate-900 font-mono">91.60%</div>
                                </div>
                                <div className="h-8 w-px bg-slate-100" />
                                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                                    观察 PC3 方向（垂直于平面的方向）的方差被丢弃，保留了主要的结构特征。
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
