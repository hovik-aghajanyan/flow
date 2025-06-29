import React, { useRef, useState, useEffect } from "react";
import graphData from "./data";
import styles from "./index.module.css";
import useStaticCallback from "../../../../hooks/useStaticCallback";
import { findNodeAndPath } from "../../../../helpers";

const INITIAL_WIDTH = 800;
const INITIAL_HEIGHT = 600;
const BIG_RADIUS = 30;
const SMALL_RADIUS = 25;
const ANIMATION_STEP = 0.05;
// menu options constant
const MENU_OPTIONS = [
    "zero knowledge",
    "beginner",
    "intermediate",
    "expert",
    "not interested"
];

export default function CanvasGraph() {
    const canvasRef = useRef(null);
    const [positions, setPositions] = useState({});
    const [selectedPath, setSelectedPath] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState([]);
    const [animatingNodes, setAnimatingNodes] = useState([]);
    const [animationProgress, setAnimationProgress] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null });

    // Touch pinch refs
    const pinchDistRef = useRef(null);
    const pinchZoomRef = useRef(zoom);
    const pinchCenterRef = useRef({ x: 0, y: 0 });

    const layoutNodes = useStaticCallback((progress = 1) => {
        const layout = {};
        const topSpacing = 100;
        const childSpacing = 85;
        const verticalSpacing = 125;

        function layoutChildren(node, x, y) {
            const children = node.children || [];
            const count = children.length;
            children.forEach((child, i) => {
                const cx = x - ((count - 1) * childSpacing) / 2 + i * childSpacing;
                const cy = y + verticalSpacing;
                const parentPos = layout[node.id];
                const animating = animatingNodes.includes(child.id) && Boolean(parentPos);
                const fx = animating ? parentPos.x + (cx - parentPos.x) * progress : cx;
                const fy = animating ? parentPos.y + (cy - parentPos.y) * progress : cy;
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
    });

    useEffect(() => {
        setSelectedPath([]);
        setExpandedNodes([]);
        setPositions(layoutNodes(1));
    }, [layoutNodes]);

    useEffect(() => {
        if (animationProgress < 1) {
            const frame = requestAnimationFrame(() => {
                const next = Math.min(animationProgress + ANIMATION_STEP, 1);
                setAnimationProgress(next);
                setPositions(layoutNodes(next));
                if (next === 1) setAnimatingNodes([]);
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [animationProgress, animatingNodes, layoutNodes]);

    useEffect(() => setPositions(layoutNodes(1)), [expandedNodes, layoutNodes]);

    useEffect(() => {
        function handleClickOutside() {
            if (contextMenu.visible) setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
        }
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [contextMenu.visible]);

    function handleMouseDown(e) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        e.target.style.cursor = "grabbing";
    }
    function handleMouseMove(e) {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
    function handleMouseUp() { isDraggingRef.current = false; }

    function handleContextMenu(e) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left - offset.x) / zoom;
        const cy = (e.clientY - rect.top - offset.y) / zoom;
        let foundId = null;
        Object.entries(positions).forEach(([id, { x, y }]) => {
            const r = selectedPath.includes(id) ? BIG_RADIUS : SMALL_RADIUS;
            if (!foundId && (cx - x) ** 2 + (cy - y) ** 2 <= r * r) foundId = id;
        });
        setContextMenu(foundId ? { visible: true, x: e.clientX, y: e.clientY, nodeId: foundId } : { visible: false, x: 0, y: 0, nodeId: null });
    }
    function handleMenuClick(opt) { console.log("Node", contextMenu.nodeId, "skill:", opt); setContextMenu({ visible: false, x: 0, y: 0, nodeId: null }); }

    // Touch pinch zoom
    function handleTouchStart(e) {
        if (e.touches.length === 2) {
            const t1 = e.touches[0], t2 = e.touches[1];
            pinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            pinchZoomRef.current = zoom;
            pinchCenterRef.current = { x: (t1.clientX + t2.clientX)/2, y: (t1.clientY + t2.clientY)/2 };
        }
    }
    function handleTouchMove(e) {
        if (e.touches.length === 2 && pinchDistRef.current) {
            const t1 = e.touches[0], t2 = e.touches[1];
            const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const scale = newDist / pinchDistRef.current;
            const newZoom = Math.min(Math.max(pinchZoomRef.current * scale, 0.2), 5);
            const rect = canvasRef.current.getBoundingClientRect();
            const cx = (pinchCenterRef.current.x - rect.left - offset.x) / zoom;
            const cy = (pinchCenterRef.current.y - rect.top - offset.y) / zoom;
            setOffset(o => ({ x: o.x - (newZoom-zoom)*cx, y: o.y - (newZoom-zoom)*cy }));
            setZoom(newZoom);
        }
        e.preventDefault();
    }
    function handleTouchEnd(e) { if (e.touches.length < 2) pinchDistRef.current = null; }

    function handleClick(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = (e.clientX - rect.left - offset.x) / zoom;
        const cy = (e.clientY - rect.top - offset.y) / zoom;
        Object.entries(positions).forEach(([id,{ x,y }]) => {
            const r = selectedPath.includes(id)?BIG_RADIUS:SMALL_RADIUS;
            if ((cx-x)**2+(cy-y)**2<=r*r) {
                if (expandedNodes.includes(id)) return;
                const res = findNodeAndPath({ id, nodes: graphData });
                if (!res) return;
                setSelectedPath(res.path);
                setExpandedNodes(res.path);
                setAnimatingNodes(res.node.children?.map(c=>c.id)||[]);
                setAnimationProgress(0);
            }
        });
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(zoom, zoom);
        Object.values(positions).forEach(({ node, x, y }) => {
            node.children?.forEach(child => {
                const tgt = positions[child.id];
                if (tgt) drawLine(ctx, { x,y }, tgt, selectedPath.includes(node.id)&&selectedPath.includes(child.id));
            });
        });
        Object.entries(positions)
            .sort(([a],[b])=>selectedPath.includes(a)-selectedPath.includes(b))
            .forEach(([id,{ node,x,y }])=> drawNode(ctx,{x,y,label:node.label,isSelected:selectedPath.includes(id)}, selectedPath.includes(id)?BIG_RADIUS:SMALL_RADIUS));
        ctx.restore();
    },[positions,selectedPath,zoom,offset]);

    function drawNode(ctx,{ x,y,label,isSelected },radius) {
        const fontSize=12;
        const words=label.split(" ");
        const lines=[];
        let line=words[0]||"";
        for(let i=1;i<words.length;i++){ const test=`${line} ${words[i]}`; if(ctx.measureText(test).width>radius*1.8){ lines.push(line); line=words[i]; }else line=test; }
        lines.push(line);
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,radius,0,2*Math.PI);
        ctx.fillStyle=isSelected?"#e67e22":"#3498db"; ctx.strokeStyle=isSelected?"#d35400":"#2980b9"; ctx.lineWidth=2; ctx.fill(); ctx.stroke();
        ctx.font=`bold ${fontSize}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=4;
        ctx.strokeStyle="black"; ctx.lineWidth=3;
        lines.forEach((ln,i)=>{ const ty=y-((lines.length-1)*fontSize)/2+i*fontSize; ctx.strokeText(ln,x,ty); ctx.fillStyle="white"; ctx.fillText(ln,x,ty); });
        ctx.restore();
    }
    function drawLine(ctx,from,to,highlight=false){
        const angle=Math.atan2(to.y-from.y,to.x-from.x);
        const startX=from.x+SMALL_RADIUS*Math.cos(angle);
        const startY=from.y+SMALL_RADIUS*Math.sin(angle);
        const endX=to.x-SMALL_RADIUS*Math.cos(angle);
        const endY=to.y-SMALL_RADIUS*Math.sin(angle);
        ctx.beginPath(); ctx.moveTo(startX,startY); ctx.lineTo(endX,endY);
        ctx.strokeStyle=highlight?"#e67e22":"#555"; ctx.lineWidth=highlight?3:2; ctx.stroke();
        const size=8; ctx.beginPath(); ctx.fillStyle=highlight?"#e67e22":"#555";
        ctx.moveTo(endX,endY); ctx.lineTo(endX-size*Math.cos(angle-Math.PI/6),endY-size*Math.sin(angle-Math.PI/6)); ctx.lineTo(endX-size*Math.cos(angle+Math.PI/6),endY-size*Math.sin(angle+Math.PI/6)); ctx.closePath(); ctx.fill();
    }

    return (
        <div
            className={styles.container}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={handleContextMenu}
        >
            <div className={styles.controls}>
                <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))}>Zoom In</button>
                <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))}>Zoom Out</button>
            </div>
            <canvas ref={canvasRef} width={INITIAL_WIDTH} height={INITIAL_HEIGHT} onClick={handleClick} style={{ background: "#fff" }} />
            {contextMenu.visible && (
                <ul className={styles.contextMenu} style={{ position: "absolute", top: contextMenu.y, left: contextMenu.x }}>
                    {MENU_OPTIONS.map(opt => (
                        <li key={opt} onClick={() => handleMenuClick(opt)}>{opt}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
