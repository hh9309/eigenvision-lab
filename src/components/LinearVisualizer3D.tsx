import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Grid as GridIcon, Box, Maximize } from 'lucide-react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface LinearVisualizer3DProps {
  matrix: number[][];
  eigenData?: { eigenvalues: number[]; eigenvectors: number[][] } | null;
  title?: string;
}

// Helper to create a crisp text texture for labels
const createLabelTexture = (text: string, color: string) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const fontSize = 64;
  context.font = `Bold ${fontSize}px "Inter", system-ui, sans-serif`;
  
  const metrics = context.measureText(text);
  canvas.width = metrics.width + 80;
  canvas.height = fontSize + 80;
  
  context.font = `Bold ${fontSize}px "Inter", system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Shadow for readability
  context.shadowColor = 'rgba(0,0,0,0.3)';
  context.shadowBlur = 8;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  
  // White stroke for contrast
  context.lineWidth = 6;
  context.strokeStyle = '#ffffff';
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  
  // Main text
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

export const LinearVisualizer3D: React.FC<LinearVisualizer3DProps> = ({ matrix, eigenData, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ original: THREE.Vector3; transformed: THREE.Vector3; x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [cubeOpacity, setCubeOpacity] = useState(0.3);
  const [gridOpacity, setGridOpacity] = useState(0.3);
  const [zoom, setZoom] = useState(10);
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null);
  
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    cube: THREE.Mesh;
    sphere: THREE.Mesh;
    grid: THREE.LineSegments;
    interactivePoints: THREE.Points;
    arrows: THREE.Group;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    selectedHighlight: THREE.Mesh;
    selectedLinesOrig: THREE.LineSegments;
    selectedLinesTrans: THREE.LineSegments;
    gs: number;
    highlight: THREE.Mesh;
  } | null>(null);

  // Initialize Scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Use ResizeObserver for initial and subsequent sizing
    let width = containerRef.current.clientWidth || 800;
    let height = containerRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    // Position camera so it looks at the origin from an angle
    camera.position.set(zoom, zoom, zoom);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 100;
    
    // Set target to shift visual center
    controls.target.set(0, -1, 0); // Slightly more centered
    controls.update();

    // Helpers
    const refGrid = new THREE.GridHelper(10, 12, 0x94a3b8, 0xe2e8f0);
    refGrid.position.y = -1.2; // Move grid lower so it doesn't intersect with vectors near origin
    scene.add(refGrid);
    
    // Subtle axes
    const axes = new THREE.AxesHelper(3.5);
    (axes.material as THREE.Material).transparent = true;
    (axes.material as THREE.Material).opacity = 0.3;
    scene.add(axes);

    // Axis Labels
    const axisLabels = [
      { text: 'X', pos: new THREE.Vector3(3.8, 0, 0), color: '#ef4444' },
      { text: 'Y', pos: new THREE.Vector3(0, 3.8, 0), color: '#10b981' },
      { text: 'Z', pos: new THREE.Vector3(0, 0, 3.8), color: '#3b82f6' }
    ];

    axisLabels.forEach(l => {
      const tex = createLabelTexture(l.text, l.color);
      const spriteMat = new THREE.SpriteMaterial({ 
        map: tex, 
        transparent: true, 
        depthTest: false,
        sizeAttenuation: true 
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(l.pos);
      sprite.scale.set(0.6, 0.6, 1);
      scene.add(sprite);
    });

    // Transformed Objects
    const cubeGeom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const cubeMat = new THREE.MeshPhongMaterial({ color: 0x6366f1, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const cube = new THREE.Mesh(cubeGeom, cubeMat);
    cube.matrixAutoUpdate = false;
    scene.add(cube);

    const refCubeMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true, transparent: true, opacity: 0.2 });
    const refCube = new THREE.Mesh(cubeGeom, refCubeMat);
    scene.add(refCube);

    const sphereGeom = new THREE.SphereGeometry(0.4, 16, 16);
    const sphereMat = new THREE.MeshPhongMaterial({ color: 0x4f46e5, wireframe: true, transparent: true, opacity: 0.8 });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.matrixAutoUpdate = false;
    scene.add(sphere);

    // Grid and Points
    const gridPoints: THREE.Vector3[] = [];
    const intersectionPoints: THREE.Vector3[] = [];
    const gs = 3.2; 
    const step = 0.8; 
    for (let i = -gs; i <= gs; i += step) {
      for (let j = -gs; j <= gs; j += step) {
        gridPoints.push(new THREE.Vector3(i, j, -gs), new THREE.Vector3(i, j, gs));
        gridPoints.push(new THREE.Vector3(i, -gs, j), new THREE.Vector3(i, gs, j));
        gridPoints.push(new THREE.Vector3(-gs, i, j), new THREE.Vector3(gs, i, j));
        
        for (let k = -gs; k <= gs; k += step) {
          intersectionPoints.push(new THREE.Vector3(i, j, k));
        }
      }
    }
    
    const gridGeom = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x6366f1, opacity: 0.4, transparent: true });
    const grid = new THREE.LineSegments(gridGeom, gridMat);
    grid.matrixAutoUpdate = false;
    scene.add(grid);

    const pointGeom = new THREE.BufferGeometry().setFromPoints(intersectionPoints);
    const pointMat = new THREE.PointsMaterial({ color: 0x4f46e5, size: 0.1, transparent: true, opacity: 0 }); // Hidden but raycastable
    const interactivePoints = new THREE.Points(pointGeom, pointMat);
    interactivePoints.matrixAutoUpdate = false;
    scene.add(interactivePoints);

    const refGridLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, opacity: 0.1, transparent: true });
    const refGridLines = new THREE.LineSegments(gridGeom, refGridLineMat);
    scene.add(refGridLines);

    // Eigenvectors group
    const arrows = new THREE.Group();
    scene.add(arrows);

    // Selection Highlight (On Hover)
    const highlightGeom = new THREE.SphereGeometry(0.18, 24, 24); // Larger
    const highlightMat = new THREE.MeshPhongMaterial({ 
      color: 0xf43f5e, // Rose-500
      emissive: 0xf43f5e,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });
    const highlight = new THREE.Mesh(highlightGeom, highlightMat);
    highlight.visible = false;
    scene.add(highlight);

    // Glow Effect for Hover (Outer sphere)
    const glowGeom = new THREE.SphereGeometry(0.25, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0xf43f5e, 
      transparent: true, 
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    highlight.add(glow); // Add glow to the main highlight mesh

    // Grid Line Highlights
    const selLineMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2, transparent: true, opacity: 0.8 });
    const selOrigLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 1, transparent: true, opacity: 0.5 });
    
    const selTransformedLines = new THREE.LineSegments(new THREE.BufferGeometry(), selLineMat);
    const selOriginalLines = new THREE.LineSegments(new THREE.BufferGeometry(), selOrigLineMat);
    selTransformedLines.matrixAutoUpdate = false;
    selOriginalLines.matrixAutoUpdate = false;
    scene.add(selTransformedLines);
    scene.add(selOriginalLines);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pl = new THREE.PointLight(0xffffff, 0.8);
    pl.position.set(5, 5, 5);
    scene.add(pl);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.2 }; // Slightly larger threshold
    const mouse = new THREE.Vector2();

    // Selection Highlighting (Persistent)
    const selHighlightGeom = new THREE.SphereGeometry(0.10, 16, 16);
    const selHighlightMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Gold/Yellow
    const selectedHighlight = new THREE.Mesh(selHighlightGeom, selHighlightMat);
    selectedHighlight.visible = false;
    scene.add(selectedHighlight);

    const selHighlightLinesOrigMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2, transparent: true, opacity: 0.6 });
    const selHighlightLinesTransMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3, transparent: true, opacity: 0.9 });
    
    const selectedLinesOrig = new THREE.LineSegments(new THREE.BufferGeometry(), selHighlightLinesOrigMat);
    const selectedLinesTrans = new THREE.LineSegments(new THREE.BufferGeometry(), selHighlightLinesTransMat);
    selectedLinesOrig.matrixAutoUpdate = false;
    selectedLinesTrans.matrixAutoUpdate = false;
    selectedLinesOrig.visible = false;
    selectedLinesTrans.visible = false;
    scene.add(selectedLinesOrig);
    scene.add(selectedLinesTrans);

    // Initial Scene State
    sceneRef.current = { 
      scene, camera, renderer, controls, cube, sphere, grid, interactivePoints, arrows, raycaster, mouse,
      selectedHighlight, selectedLinesOrig, selectedLinesTrans, gs, highlight
    };

    const handleMouseClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(interactivePoints);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const index = intersection.index;
        if (typeof index === 'number') {
          // Get original point from the point cloud's geometry
          const positions = interactivePoints.geometry.attributes.position.array;
          const original = new THREE.Vector3(
            positions[index * 3],
            positions[index * 3 + 1],
            positions[index * 3 + 2]
          );
          setSelectedPoint(original);
        }
      } else {
        setSelectedPoint(null);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(interactivePoints);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const index = intersection.index;
        if (typeof index === 'number') {
          const original = intersectionPoints[index];
          const transformed = intersection.point;
          
          highlight.position.copy(transformed);
          highlight.visible = true;
          
          // Add a subtle scale animation or variation could go here if we had an update loop
          // But for now, just making it bigger and brighter is a good start.
          
          // Pulse logic could be added in the animate loop if we wanted more flair

          // Update highlighted grid lines
          const selPoints = [
            new THREE.Vector3(-gs, original.y, original.z), new THREE.Vector3(gs, original.y, original.z),
            new THREE.Vector3(original.x, -gs, original.z), new THREE.Vector3(original.x, gs, original.z),
            new THREE.Vector3(original.x, original.y, -gs), new THREE.Vector3(original.x, original.y, gs),
          ];
          
          selOriginalLines.geometry.setFromPoints(selPoints);
          selOriginalLines.visible = true;
          
          selTransformedLines.geometry.setFromPoints(selPoints);
          selTransformedLines.matrix.copy(interactivePoints.matrix);
          selTransformedLines.updateMatrixWorld(true);
          selTransformedLines.visible = true;

          setHoverInfo({ 
            original, 
            transformed, 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
          });
        }
      } else {
        highlight.visible = false;
        selOriginalLines.visible = false;
        selTransformedLines.visible = false;
        setHoverInfo(null);
      }
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('click', handleMouseClick);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Pulse and Color animation for hover highlight
      if (highlight.visible) {
        const time = Date.now() * 0.005;
        const scale = 1 + Math.sin(time) * 0.2;
        highlight.scale.set(scale, scale, scale);
        
        // Color cycling
        const hue = (Date.now() * 0.1) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 60%)`);
        (highlight.material as THREE.MeshPhongMaterial).color.copy(color);
        (highlight.material as THREE.MeshPhongMaterial).emissive.copy(color);
        
        // Update glow color
        if (highlight.children[0]) {
          const glow = highlight.children[0] as THREE.Mesh;
          (glow.material as THREE.MeshBasicMaterial).color.copy(color);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(entries => {
      if (!entries[0]) return;
      window.requestAnimationFrame(() => {
        const { width: w, height: h } = entries[0].contentRect;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
    });
    ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('click', handleMouseClick);
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Matrix, Eigenvalues and Opacity/Visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    const { 
      cube, sphere, grid, interactivePoints, arrows, controls, camera,
      selectedHighlight, selectedLinesOrig, selectedLinesTrans, gs
    } = sceneRef.current;

    // Apply Opacity/Visibility from state
    (cube.material as THREE.MeshPhongMaterial).opacity = cubeOpacity;
    (grid.material as THREE.LineBasicMaterial).opacity = gridOpacity;
    grid.visible = showGrid;
    interactivePoints.visible = showGrid;

    // Calculate transformation matrix once
    const n11 = matrix[0][0];
    const n12 = matrix[0][1];
    const n13 = matrix[0][2] ?? 0;
    const n21 = matrix[1][0];
    const n22 = matrix[1][1];
    const n23 = matrix[1][2] ?? 0;
    const n31 = matrix[2]?.[0] ?? 0;
    const n32 = matrix[2]?.[1] ?? 0;
    const n33 = matrix[2]?.[2] ?? 1;

    const matrix4 = new THREE.Matrix4().set(
      n11, n12, n13, 0,
      n21, n22, n23, 0,
      n31, n32, n33, 0,
      0, 0, 0, 1
    );

    // Selection Highlight Update
    if (selectedPoint) {
      const transformed = selectedPoint.clone().applyMatrix4(matrix4);
      selectedHighlight.position.copy(transformed);
      selectedHighlight.visible = true;

      const selPoints = [
        new THREE.Vector3(-gs, selectedPoint.y, selectedPoint.z), new THREE.Vector3(gs, selectedPoint.y, selectedPoint.z),
        new THREE.Vector3(selectedPoint.x, -gs, selectedPoint.z), new THREE.Vector3(selectedPoint.x, gs, selectedPoint.z),
        new THREE.Vector3(selectedPoint.x, selectedPoint.y, -gs), new THREE.Vector3(selectedPoint.x, selectedPoint.y, gs),
      ];

      selectedLinesOrig.geometry.setFromPoints(selPoints);
      selectedLinesOrig.visible = true;

      selectedLinesTrans.geometry.setFromPoints(selPoints);
      selectedLinesTrans.matrix.copy(matrix4);
      selectedLinesTrans.updateMatrixWorld(true);
      selectedLinesTrans.visible = true;
    } else {
      selectedHighlight.visible = false;
      selectedLinesOrig.visible = false;
      selectedLinesTrans.visible = false;
    }

    // Directly update camera position based on zoom if needed
    if (controls) {
      const targetDist = zoom;
      const currentPos = camera.position.clone();
      const direction = currentPos.clone().normalize();
      camera.position.copy(direction.multiplyScalar(targetDist));
      controls.update();
    }

    cube.matrix.copy(matrix4);
    sphere.matrix.copy(matrix4);
    grid.matrix.copy(matrix4);
    interactivePoints.matrix.copy(matrix4);

    cube.updateMatrixWorld(true);
    sphere.updateMatrixWorld(true);
    grid.updateMatrixWorld(true);
    interactivePoints.updateMatrixWorld(true);
    
    while(arrows.children.length > 0) {
      const child = arrows.children[0];
      arrows.remove(child);
      // Recursively dispose geometries and materials
      child.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach(m => m.dispose());
          } else {
            node.material.dispose();
          }
        } else if (node instanceof THREE.Sprite) {
          node.material.map?.dispose();
          node.material.dispose();
        }
      });
    }
    
    if (eigenData && eigenData.eigenvectors) {
      eigenData.eigenvectors.forEach((vec, i) => {
        const v = new THREE.Vector3(vec[0], vec[1], vec[2] || 0);
        if (v.length() > 0.001) {
          const eigenvalue = eigenData.eigenvalues[i];
          // Match App list colors: λ1: Rose, λ2: Emerald, λ3: Indigo
          const colors = [0xf43f5e, 0x10b981, 0x6366f1];
          const colorHexs = ['#f43f5e', '#10b981', '#6366f1'];
          const color = colors[i % 3];
          const colorHex = colorHexs[i % 3];
          
          const absVal = Math.abs(eigenvalue);
          const sign = Math.sign(eigenvalue) || 1;
          const dir = v.clone().normalize().multiplyScalar(sign);
          
          // Create a custom "Bold" arrow using a Cylinder and a Cone
          const arrowGroup = new THREE.Group();
          
          // Scale arrow height based on eigenvalue magnitude
          const stemRadius = 0.15;
          const stemHeight = Math.max(1.5, Math.min(absVal * 3, 12));
          const headRadius = 0.38;
          const headHeight = 0.9;
          
          const stemGeom = new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 16);
          const stemMat = new THREE.MeshPhongMaterial({ 
            color, 
            emissive: color, 
            emissiveIntensity: 0.7, // More luminous
            transparent: false,
            opacity: 1.0,
            shininess: 100
          });
          const stem = new THREE.Mesh(stemGeom, stemMat);
          stem.position.y = stemHeight / 2;
          
          const headGeom = new THREE.ConeGeometry(headRadius, headHeight, 24);
          const headMat = new THREE.MeshPhongMaterial({ 
            color, 
            emissive: color, 
            emissiveIntensity: 0.9,
            transparent: false,
            opacity: 1.0,
            shininess: 120
          });
          const head = new THREE.Mesh(headGeom, headMat);
          head.position.y = stemHeight + headHeight / 2;
          
          arrowGroup.add(stem);
          arrowGroup.add(head);
          
          // Add a "Shadow" or "Reference" line to show the span/span direction
          const spanGeom = new THREE.CylinderGeometry(0.04, 0.04, 30, 8); // Longer span
          const spanMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 });
          const span = new THREE.Mesh(spanGeom, spanMat);
          arrowGroup.add(span);

          // Add Label Sprite
          const labelText = `λ${i + 1} = ${eigenvalue.toFixed(2)}`;
          const labelTexture = createLabelTexture(labelText, colorHex);
          const spriteMat = new THREE.SpriteMaterial({ 
            map: labelTexture, 
            transparent: true, 
            depthTest: false,
            sizeAttenuation: true 
          });
          const labelSprite = new THREE.Sprite(spriteMat);
          
          // Scale sprite based on text width
          const textAspect = labelTexture.image.width / labelTexture.image.height;
          labelSprite.scale.set(0.8 * textAspect, 0.8, 1);
          labelSprite.position.y = stemHeight + headHeight + 1.2;
          arrowGroup.add(labelSprite);

          // Align group with the vector direction
          const defaultUp = new THREE.Vector3(0, 1, 0);
          if (dir.dot(defaultUp) < -0.9999) {
            // Special case for vector pointing straight down
            arrowGroup.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
          } else {
            arrowGroup.quaternion.setFromUnitVectors(defaultUp, dir);
          }
          
          arrows.add(arrowGroup);
        }
      });
    }
  }, [matrix, eigenData, showGrid, cubeOpacity, gridOpacity, selectedPoint, zoom]);

  const handleResetCamera = () => {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;
    camera.position.set(zoom, zoom, zoom);
    controls.target.set(0, -1, 0); // Corrected to match init
    controls.update();
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-[200px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-white relative group">
      {/* 3D Controls Overlay - Moved to bottom-right to avoid obstruction */}
      <div className="absolute right-6 bottom-6 z-30 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
        <div className="flex items-center gap-2 px-1">
          <button 
            onClick={handleResetCamera}
            className="flex-1 p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center justify-center gap-2 border border-transparent active:border-slate-200"
            title="重置视角"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`flex-1 p-2 rounded-xl transition-colors flex items-center justify-center gap-2 ${showGrid ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}
            title="显示/隐藏网格"
          >
            <GridIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-slate-100 mx-1" />

        <div className="px-3 py-2 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">实体透明度</span>
              <span className="text-[9px] font-mono text-slate-400">{Math.round(cubeOpacity * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={cubeOpacity} 
              onChange={(e) => setCubeOpacity(parseFloat(e.target.value))}
              className="w-40 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">网格透明度</span>
              <span className="text-[9px] font-mono text-slate-400">{Math.round(gridOpacity * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={gridOpacity} 
              onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
              className="w-40 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600"
            />
          </div>

          <div className="space-y-2">
             <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">相机视距</span>
              <span className="text-[9px] font-mono text-slate-400">{zoom.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="2" max="50" step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-40 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600"
            />
          </div>
        </div>
      </div>

      {hoverInfo && (
        <div 
          className="absolute z-50 pointer-events-none bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-lg shadow-xl border border-slate-700/50 text-[10px] space-y-1.5 transition-all"
          style={{ 
            left: hoverInfo.x > (containerRef.current?.clientWidth || 0) - 150 ? hoverInfo.x - 160 : hoverInfo.x + 15, 
            top: hoverInfo.y > (containerRef.current?.clientHeight || 0) - 80 ? hoverInfo.y - 90 : hoverInfo.y + 15 
          }}
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
            <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">原始坐标 (v)</span>
            <span className="font-mono text-indigo-300">({hoverInfo.original.x.toFixed(2)}, {hoverInfo.original.y.toFixed(2)}, {hoverInfo.original.z.toFixed(2)})</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">映射坐标 (Av)</span>
            <span className="font-mono text-emerald-300">({hoverInfo.transformed.x.toFixed(2)}, {hoverInfo.transformed.y.toFixed(2)}, {hoverInfo.transformed.z.toFixed(2)})</span>
          </div>
        </div>
      )}
    </div>
  );
};

