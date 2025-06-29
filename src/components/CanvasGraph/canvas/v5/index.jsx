import React, { useRef, useState, useEffect } from "react";
import { graphData } from "./data.js";
import styles from "./index.module.css";

const INITIAL_WIDTH = 800;
const INITIAL_HEIGHT = 600;
const BIG_RADIUS = 40;
const SMALL_RADIUS = 25;

export default function CanvasGraph() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [positions, setPositions] = useState({});
    const [selectedPath, setSelectedPath] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState([]);
    const [animatingNodes, setAnimatingNodes] = useState([]);
    const [animationProgress, setAnimationProgress] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    function findNodeAndPath(id, nodes = graphData, path = []) {
        for (const node of nodes) {
            if (node.id === id) return { node, path: [...path, node.id] };
            if (node.children) {
                const res = findNodeAndPath(id, node.children, [...path, node.id]);
                if (res) return res;
            }
        }
        return null;
    }

    function layoutNodes(progress = 1) {
        const layout = {};
        const topSpacing = 200;
        const childSpacing = 120;
        const verticalSpacing = 150;

        function layoutChildren(node, x, y) {
            const children = node.children || [];
            const count = children.length;
            children.forEach((child, i) => {
                const cx = x - ((count - 1) * childSpacing) / 2 + i * childSpacing;
                const cy = y + verticalSpacing;
                let fx = cx;
                let fy = cy;
                if (animatingNodes.includes(child.id) && positions[node.id]) {
                    const p = positions[node.id];
                    fx = p.x + (cx - p.x) * progress;
                    fy = p.y + (cy - p.y) * progress;
                }
                layout[child.id] = { x: fx, y: fy, node: child };
                if (expandedNodes.includes(child.id)) layoutChildren(child, cx, cy);
            });
        }

        graphData.forEach((node, i) => {
            const x = INITIAL_WIDTH / 2 - ((graphData.length - 1) * topSpacing) / 2 + i * topSpacing;
            const y = 100;
            layout[node.id] = { x, y, node };
            if (expandedNodes.includes(node.id)) layoutChildren(node, x, y);
        });

        return layout;
    }

    useEffect(() => {
        setSelectedPath([graphData[0].id]);
        setExpandedNodes([graphData[0].id]);
    }, []);

    useEffect(() => {
        let frame;
        if (animationProgress < 1) {
            frame = requestAnimationFrame(() => {
                const np = Math.min(animationProgress + 0.05, 1);
                setAnimationProgress(np);
                setPositions(layoutNodes(np));
            });
        }
        return () => cancelAnimationFrame(frame);
    }, [animationProgress]);

    useEffect(() => setPositions(layoutNodes(animationProgress)), [expandedNodes, animatingNodes]);

    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(zoom, zoom);

        Object.values(positions).forEach(({ node, x, y }) => {
            (node.children || []).forEach(child => {
                const pos = positions[child.id];
                if (pos) drawLine(ctx, { x, y }, pos, selectedPath.includes(node.id) && selectedPath.includes(child.id));
            });
        });

        Object.entries(positions).forEach(([id, { node, x, y }]) => {
            const sel = selectedPath.includes(node.id);
            drawNode(ctx, { x, y, label: node.label, isSelected: sel }, sel ? BIG_RADIUS : SMALL_RADIUS);
        });

        ctx.restore();
    }, [positions, selectedPath, zoom, offset]);

    function drawNode(ctx, { x, y, label, isSelected }, r) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2*Math.PI);
        ctx.fillStyle = isSelected ? "#e67e22" : "#3498db";
        ctx.strokeStyle = isSelected ? "#d35400" : "#2980b9";
        ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        ctx.font = `bold ${r/1.5+8}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.strokeStyle="black"; ctx.lineWidth=3; ctx.strokeText(label,x,y);
        ctx.fillStyle="white"; ctx.fillText(label,x,y); ctx.restore();
    }

    function drawLine(ctx, from, to, hl=false) {
        const ang = Math.atan2(to.y-from.y, to.x-from.x);
        const sx = from.x+SMALL_RADIUS*Math.cos(ang);
        const sy = from.y+SMALL_RADIUS*Math.sin(ang);
        const ex = to.x-SMALL_RADIUS*Math.cos(ang);
        const ey = to.y-SMALL_RADIUS*Math.sin(ang);
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
        ctx.strokeStyle=hl?"#e67e22":"#555"; ctx.lineWidth=hl?3:2; ctx.stroke();
        const sz=8; ctx.beginPath(); ctx.fillStyle=hl?"#e67e22":"#555";
        ctx.moveTo(ex,ey);
        ctx.lineTo(ex-sz*Math.cos(ang-Math.PI/6),ey-sz*Math.sin(ang-Math.PI/6));
        ctx.lineTo(ex-sz*Math.cos(ang+Math.PI/6),ey-sz*Math.sin(ang+Math.PI/6)); ctx.closePath(); ctx.fill();
    }

    function handleClick(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = (e.clientX - rect.left - offset.x) / zoom;
        const cy = (e.clientY - rect.top - offset.y) / zoom;
        for (const [id, {x, y, node}] of Object.entries(positions)) {
            const r = selectedPath.includes(id) ? BIG_RADIUS : SMALL_RADIUS;
            if ((cx - x)**2 + (cy - y)**2 <= r*r) {
                const res = findNodeAndPath(id);
                if (!res) return;
                setSelectedPath(res.path);
                setExpandedNodes(prev => prev.filter(n => res.path.includes(n)));
                if (res.node.children.length && !expandedNodes.includes(id)) {
                    setAnimatingNodes(res.node.children.map(c => c.id));
                    setAnimationProgress(0);
                    setExpandedNodes(prev => [...prev, id]);
                }
                return;
            }
        }
    }

    function handleMouseDown(e) {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }
    function handleMouseMove(e) {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }
    function handleMouseUp() { isDragging.current = false; }

    return (
        <div
            ref={containerRef}
            className={styles.container}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className={styles.controls}>
                <button onClick={() => setZoom(z => Math.min(z*1.2,5))}>Zoom In</button>
                <button onClick={() => setZoom(z => Math.max(z/1.2,0.2))}>Zoom Out</button>
            </div>
            <canvas
                ref={canvasRef}
                width={INITIAL_WIDTH}
                height={INITIAL_HEIGHT}
                onClick={handleClick}
                style={{ cursor: isDragging.current ? "grabbing" : "grab", background: "#fff" }}
            />
        </div>
    );
}
