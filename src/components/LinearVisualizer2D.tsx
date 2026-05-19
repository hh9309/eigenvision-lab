import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { EigenResult, transformVector, cn } from '../lib/utils';

interface LinearVisualizer2DProps {
  matrix: number[][];
  eigenData: EigenResult | null;
}

export const LinearVisualizer2D: React.FC<LinearVisualizer2DProps & { theme?: 'light' | 'dark' }> = ({ matrix, eigenData, theme = 'light' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const isDark = theme === 'dark';
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const size = Math.min(width, height) - 40;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Scale
    const range = 5;
    const xScale = d3.scaleLinear().domain([-range, range]).range([-size / 2, size / 2]);
    const yScale = d3.scaleLinear().domain([-range, range]).range([size / 2, -size / 2]);

    // Colors
    const gridColor = isDark ? '#30363d' : '#e2e8f0';
    const axisColor = isDark ? '#484f58' : '#94a3b8';
    const transformGridColor = isDark ? '#3b82f6' : '#6366f1';

    // Grid lines (Original)
    const gridLines = d3.range(-range, range + 1);
    
    // Original Grid
    g.selectAll('.grid-x')
      .data(gridLines)
      .enter().append('line')
      .attr('x1', d => xScale(d))
      .attr('y1', -size / 2)
      .attr('x2', d => xScale(d))
      .attr('y2', size / 2)
      .attr('stroke', gridColor)
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,2');

    g.selectAll('.grid-y')
      .data(gridLines)
      .enter().append('line')
      .attr('x1', -size / 2)
      .attr('y1', d => yScale(d))
      .attr('x2', size / 2)
      .attr('y2', d => yScale(d))
      .attr('stroke', gridColor)
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,2');

    // Axes
    g.append('line')
      .attr('x1', -size / 2).attr('y1', 0).attr('x2', size / 2).attr('y2', 0)
      .attr('stroke', axisColor).attr('stroke-width', 1);
    g.append('line')
      .attr('x1', 0).attr('y1', -size / 2).attr('x2', 0).attr('y2', size / 2)
      .attr('stroke', axisColor).attr('stroke-width', 1);

    // Transform Grid
    const transformedGridData = [];
    for (let i = -range; i <= range; i++) {
        // Vertical lines
        const p1 = transformVector(matrix, [i, -range, 0]);
        const p2 = transformVector(matrix, [i, range, 0]);
        transformedGridData.push({ x1: xScale(p1[0]), y1: yScale(p1[1]), x2: xScale(p2[0]), y2: yScale(p2[1]), color: transformGridColor, opacity: 0.2 });
        
        // Horizontal lines
        const q1 = transformVector(matrix, [-range, i, 0]);
        const q2 = transformVector(matrix, [range, i, 0]);
        transformedGridData.push({ x1: xScale(q1[0]), y1: yScale(q1[1]), x2: xScale(q2[0]), y2: yScale(q2[1]), color: transformGridColor, opacity: 0.2 });
    }

    g.selectAll('.transformed-grid')
        .data(transformedGridData)
        .enter().append('line')
        .attr('x1', d => d.x1)
        .attr('y1', d => d.y1)
        .attr('x2', d => d.x2)
        .attr('y2', d => d.y2)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 1)
        .attr('opacity', d => d.opacity);

    // --- NEW: Area Visualization ---
    // Reference Unit Square
    g.append('rect')
        .attr('x', xScale(0))
        .attr('y', yScale(1))
        .attr('width', xScale(1) - xScale(0))
        .attr('height', yScale(0) - yScale(1))
        .attr('fill', axisColor)
        .attr('opacity', 0.1)
        .attr('stroke', axisColor)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');
    
    g.append('text')
        .attr('x', xScale(0.5)).attr('y', yScale(0.5))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', axisColor).attr('font-size', '8px').attr('opacity', 0.6)
        .text('Area=1');

    // Transformed Area
    const i_hat_calc = transformVector(matrix, [1, 0, 0]);
    const j_hat_calc = transformVector(matrix, [0, 1, 0]);
    const origin = [0, 0];
    const sum_hat = [i_hat_calc[0] + j_hat_calc[0], i_hat_calc[1] + j_hat_calc[1]];

    const transformedAreaPath = `
        M ${xScale(0)} ${yScale(0)}
        L ${xScale(i_hat_calc[0])} ${yScale(i_hat_calc[1])}
        L ${xScale(sum_hat[0])} ${yScale(sum_hat[1])}
        L ${xScale(j_hat_calc[0])} ${yScale(j_hat_calc[1])}
        Z
    `;

    g.append('path')
        .attr('d', transformedAreaPath)
        .attr('fill', transformGridColor)
        .attr('opacity', 0.3)
        .attr('stroke', transformGridColor)
        .attr('stroke-width', 1);

    const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    const detAbs = Math.abs(det);

    const infoG = g.append('g').attr('transform', `translate(${size/2 - 70}, ${-size/2 + 20})`);
    
    infoG.append('rect')
        .attr('width', 80).attr('height', 45).attr('rx', 4)
        .attr('fill', isDark ? '#161b22' : '#f8fafc').attr('stroke', gridColor);

    infoG.append('text')
        .attr('x', 5).attr('y', 15)
        .attr('fill', isDark ? '#8b949e' : '#64748b').attr('font-size', '9px').attr('font-weight', 'bold')
        .text('Determinant');
    
    infoG.append('text')
        .attr('x', 5).attr('y', 30)
        .attr('fill', det === 0 ? '#ef4444' : (det < 0 ? '#f59e0b' : transformGridColor))
        .attr('font-size', '12px').attr('font-weight', 'black').attr('font-family', 'monospace')
        .text(det.toFixed(2));

    infoG.append('text')
        .attr('x', 5).attr('y', 40)
        .attr('fill', isDark ? '#484f58' : '#94a3b8').attr('font-size', '8px')
        .text(det === 0 ? 'Dimension Collapse' : (det < 0 ? 'Orientation Inverted' : `Area Scale: ${detAbs.toFixed(2)}x`));

    // --- END NEW ---

    // Basis Vectors
    const i_hat = transformVector(matrix, [1, 0, 0]);
    const j_hat = transformVector(matrix, [0, 1, 0]);

    const drawVector = (vec: number[], color: string, label: string, width = 2, dashed = false) => {
        const x = xScale(vec[0]);
        const y = yScale(vec[1]);
        
        g.append('line')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', x).attr('y2', y)
            .attr('stroke', color).attr('stroke-width', width)
            .attr('stroke-dasharray', dashed ? '4,2' : 'none')
            .attr('marker-end', `url(#arrow-${color.replace('#','')})`);

        g.append('text')
            .attr('x', x + 5).attr('y', y - 5)
            .attr('fill', color).text(label)
            .attr('font-size', '10px').attr('font-weight', 'bold').attr('font-family', 'monospace');
            
        // Arrow head definition
        svg.append('defs').append('marker')
            .attr('id', `arrow-${color.replace('#','')}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8).attr('refY', 0)
            .attr('markerWidth', 4).attr('markerHeight', 4)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
    };

    drawVector(i_hat, '#3b82f6', 'i\'');
    drawVector(j_hat, '#10b981', 'j\'');

    // Eigenvectors
    if (eigenData) {
        eigenData.eigenvectors.forEach((vec, idx) => {
            const val = eigenData.eigenvalues[idx];
            const mag = Math.sqrt(vec[0]**2 + vec[1]**2 + (vec[2]||0)**2);
            if (mag > 0.001) {
                const displayVec = [vec[0] / mag * 2, vec[1] / mag * 2, (vec[2]||0) / mag * 2];
                const transformedDisplay = transformVector(matrix, displayVec);
                
                const spanLineLen = range * 1.5;
                const colors = ['#f43f5e', '#10b981'];
                const color = colors[idx % 2];

                g.append('line')
                    .attr('x1', xScale(-vec[0] * spanLineLen)).attr('y1', yScale(-vec[1] * spanLineLen))
                    .attr('x2', xScale(vec[0] * spanLineLen)).attr('y2', yScale(vec[1] * spanLineLen))
                    .attr('stroke', color).attr('stroke-width', 0.5)
                    .attr('stroke-dasharray', '5,5').attr('opacity', 0.3);

                drawVector(transformedDisplay, color, `v${idx+1} (λ=${val.toFixed(2)})`, 3, true);
            }
        });
    }

  }, [matrix, eigenData, theme]);

  return (
    <div ref={containerRef} id="visualizer-2d" className={cn(
        "w-full h-full min-h-[400px] relative overflow-hidden transition-colors",
        theme === 'dark' ? "bg-[#010409]" : "bg-white border border-slate-200 rounded-xl"
    )}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
