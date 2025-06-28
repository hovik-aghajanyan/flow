// Final fixed version with smart animation trigger and working animation

import React, { useRef, useEffect, useState } from "react";
import styles from "./index.module.css";

const INITIAL_WIDTH = 1000;
const INITIAL_HEIGHT = 700;
const BIG_RADIUS = 40;
const SMALL_RADIUS = 25;

const graphData = [
    {
        id: "frontend",
        label: "frontend",
        children: [
            { id: "html", label: "html", children: [] },
            {
                id: "css",
                label: "css",
                children: [
                    { id: "pure-css", label: "pure css", children: [] },
                    { id: "css-in-js", label: "css in js", children: [] },
                ],
            },
            { id: "js", label: "js", children: [] },
        ],
    },
    {
        id: "backend",
        label: "backend",
        children: [
            {
                id: "csharp",
                label: "c#",
                children: [
                    { id: "dotnet8", label: ".NET 8", children: [] },
                    { id: "dotnet9", label: ".NET 9", children: [] },
                    { id: "dotnet10", label: ".NET 10", children: [] },
                ],
            },
            { id: "java", label: "java", children: [] },
            { id: "go", label: "go", children: [] },
            { id: "python", label: "python", children: [] },
        ],
    },
];

export default function CanvasGraph() {
    const canvasRef = useRef(null);
    const [positions, setPositions] = useState({});
    const [selectedPath, setSelectedPath] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState([]);
    const [animatingNodes, setAnimatingNodes] = useState([]);
    const [animationProgress, setAnimationProgress] = useState(1);
    const [zoom, setZoom] = useState(1);

    const duration = 500;

    function findNodeAndPath(id, nodes = graphData, path = []) {
        for (let node of nodes) {
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
        const topSpacing = 400;
        const childSpacing = 120;
        const verticalSpacing = 150;

        function layoutChildren(node, x, y) {
            const children = node.children || [];
            const count = children.length;
            children.forEach((child, i) => {
                const cx = x - ((count - 1) * childSpacing) / 2 + i * childSpacing;
                const cy = y + verticalSpacing;
                let finalX = cx;
                let finalY = cy;

                if (animatingNodes.includes(child.id) && positions[node.id]) {
                    const parentPos = positions[node.id];
                    finalX = parentPos.x + (cx - parentPos.x) * progress;
                    finalY = parentPos.y + (cy - parentPos.y) * progress;
                }

                layout[child.id] = { x: finalX, y: finalY, node: child };

                if (expandedNodes.includes(child.id)) {
                    layoutChildren(child, cx, cy);
                }
            });
        }

        graphData.forEach((node, i) => {
            const x = INITIAL_WIDTH / 2 - ((graphData.length - 1) * topSpacing) / 2 + i * topSpacing;
            const y = 100;
            layout[node.id] = { x, y, node };
            if (expandedNodes.includes(node.id)) {
                layoutChildren(node, x, y);
            }
        });

        return layout;
    }

    useEffect(() => {
        let frameId;
        if (animationProgress < 1) {
            frameId = requestAnimationFrame((ts) => {
                const newProgress = Math.min(animationProgress + 0.05, 1);
                setAnimationProgress(newProgress);
                setPositions(layoutNodes(newProgress));
            });
        }
        return () => cancelAnimationFrame(frameId);
    }, [animationProgress]);

    useEffect(() => {
        setPositions(layoutNodes(animationProgress));
    }, [expandedNodes, animatingNodes]);

    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);
        ctx.save();
        ctx.scale(zoom, zoom);

        Object.values(positions).forEach(({ node, x, y }) => {
            (node.children || []).forEach((child) => {
                if (!positions[child.id]) return;
                const { x: cx, y: cy } = positions[child.id];
                drawLine(ctx, { x, y }, { x: cx, y: cy }, selectedPath.includes(node.id) && selectedPath.includes(child.id));
            });
        });

        Object.entries(positions).forEach(([id, { node, x, y }]) => {
            const selected = selectedPath.includes(node.id);
            const radius = selected ? BIG_RADIUS : SMALL_RADIUS;
            drawNode(ctx, { x, y, label: node.label, isSelected: selected }, radius);
        });

        ctx.restore();
    }, [positions, selectedPath, zoom]);

    function drawNode(ctx, { x, y, label, isSelected }, radius) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? "#e67e22" : "#3498db";
        ctx.strokeStyle = isSelected ? "#d35400" : "#2980b9";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.font = `bold ${radius / 1.5 + 8}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.strokeText(label, x, y);
        ctx.fillStyle = "white";
        ctx.fillText(label, x, y);
        ctx.restore();
    }

    function drawLine(ctx, from, to, highlight = false) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const startX = from.x + SMALL_RADIUS * Math.cos(angle);
        const startY = from.y + SMALL_RADIUS * Math.sin(angle);
        const endX = to.x - SMALL_RADIUS * Math.cos(angle);
        const endY = to.y - SMALL_RADIUS * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = highlight ? "#e67e22" : "#555";
        ctx.lineWidth = highlight ? 3 : 2;
        ctx.stroke();

        const size = 8;
        ctx.beginPath();
        ctx.fillStyle = highlight ? "#e67e22" : "#555";
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - size * Math.cos(angle - Math.PI / 6), endY - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - size * Math.cos(angle + Math.PI / 6), endY - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    function isPointInCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= r * r;
    }

    function handleClick(event) {
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = (event.clientX - rect.left) / zoom;
        const clickY = (event.clientY - rect.top) / zoom;

        for (const [id, { x, y, node }] of Object.entries(positions)) {
            const radius = selectedPath.includes(id) ? BIG_RADIUS : SMALL_RADIUS;
            if (isPointInCircle(clickX, clickY, x, y, radius)) {
                const result = findNodeAndPath(id);
                if (result) {
                    setSelectedPath(result.path);
                    if (!expandedNodes.includes(id) && result.node.children.length > 0) {
                        setAnimatingNodes(result.node.children.map((c) => c.id));
                        setAnimationProgress(0);
                        setExpandedNodes([...expandedNodes, id]);
                    }
                }
                return;
            }
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <button onClick={() => setZoom((z) => Math.min(z * 1.2, 5))}>Zoom In</button>
                <button onClick={() => setZoom((z) => Math.max(z / 1.2, 0.2))}>Zoom Out</button>
            </div>
            <canvas
                ref={canvasRef}
                width={INITIAL_WIDTH}
                height={INITIAL_HEIGHT}
                onClick={handleClick}
                style={{ cursor: "pointer", border: "1px solid #ccc" }}
            />
        </div>
    );
}
