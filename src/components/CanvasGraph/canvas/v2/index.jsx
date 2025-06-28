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
    const [expandedNodes, setExpandedNodes] = useState([]);
    const [positions, setPositions] = useState({});
    const [animationProgress, setAnimationProgress] = useState(1);
    const [animatedFromNodeId, setAnimatedFromNodeId] = useState(null);
    const [selectedPath, setSelectedPath] = useState([]);
    const [zoom, setZoom] = useState(1);

    function findInSubtree(node, id, path = []) {
        if (node.id === id) return { node, path: [...path, node.id] };
        for (const child of node.children || []) {
            const result = findInSubtree(child, id, [...path, node.id]);
            if (result) return result;
        }
        return null;
    }

    useEffect(() => {
        const layout = {};
        const topLevelSpacing = 400;
        const childSpacing = 120;
        const verticalSpacing = 150;

        function layoutChildren(nodeId, x, y) {
            const node = findInSubtree({ id: "root", children: graphData }, nodeId)?.node;
            if (!node || !node.children?.length) return;

            const childCount = node.children.length;
            node.children.forEach((child, j) => {
                const finalX = x - ((childCount - 1) * childSpacing) / 2 + j * childSpacing;
                const finalY = y + verticalSpacing;
                const shouldAnimate = animatedFromNodeId === nodeId;
                layout[child.id] = {
                    x: shouldAnimate ? positions[nodeId]?.x + (finalX - positions[nodeId].x) * animationProgress : finalX,
                    y: shouldAnimate ? positions[nodeId]?.y + (finalY - positions[nodeId].y) * animationProgress : finalY,
                    node: child,
                };
                if (expandedNodes.includes(child.id)) {
                    layoutChildren(child.id, finalX, finalY);
                }
            });
        }

        graphData.forEach((root, i) => {
            const rootX = INITIAL_WIDTH / 2 - ((graphData.length - 1) * topLevelSpacing) / 2 + i * topLevelSpacing;
            const rootY = 100;
            layout[root.id] = { x: rootX, y: rootY, node: root };
            if (expandedNodes.includes(root.id)) {
                layoutChildren(root.id, rootX, rootY);
            }
        });

        setPositions(layout);
    }, [expandedNodes, animationProgress, animatedFromNodeId]);

    useEffect(() => {
        let frameId;
        let start;
        if (animatedFromNodeId) {
            start = null;
            function animate(ts) {
                if (!start) start = ts;
                const progress = Math.min((ts - start) / 500, 1);
                setAnimationProgress(progress);
                if (progress < 1) frameId = requestAnimationFrame(animate);
            }
            frameId = requestAnimationFrame(animate);
        } else {
            setAnimationProgress(1);
        }
        return () => cancelAnimationFrame(frameId);
    }, [animatedFromNodeId]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);
        ctx.save();
        ctx.scale(zoom, zoom);

        Object.values(positions).forEach(({ node, x, y }) => {
            (node.children || []).forEach((child) => {
                if (positions[child.id]) {
                    const highlight = selectedPath.includes(node.id) && selectedPath.includes(child.id);
                    drawLine(ctx, { x, y }, positions[child.id], highlight);
                }
            });
        });

        Object.values(positions).forEach(({ node, x, y }) => {
            const radius = selectedPath.includes(node.id) ? BIG_RADIUS : SMALL_RADIUS;
            const isSelected = selectedPath.includes(node.id);
            drawNode(ctx, { x, y, label: node.label, isSelected }, radius);
        });

        ctx.restore();
    }, [positions, animationProgress, selectedPath, zoom]);

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
        drawArrowhead(ctx, endX, endY, angle, highlight);
    }

    function drawArrowhead(ctx, x, y, angle, highlight) {
        const size = 8;
        ctx.beginPath();
        ctx.fillStyle = highlight ? "#e67e22" : "#555";
        ctx.moveTo(x, y);
        ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    function handleClick(event) {
        if (!positions) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = (event.clientX - rect.left) / zoom;
        const clickY = (event.clientY - rect.top) / zoom;

        for (const pos of Object.values(positions)) {
            const radius = selectedPath.includes(pos.node.id) ? BIG_RADIUS : SMALL_RADIUS;
            if (isPointInCircle(clickX, clickY, pos.x, pos.y, radius)) {
                const result = findInSubtree({ id: "root", children: graphData }, pos.node.id);
                if (result) {
                    setSelectedPath(result.path);
                    setAnimatedFromNodeId(pos.node.id);
                    if (result.node.children.length > 0 && !expandedNodes.includes(pos.node.id)) {
                        setExpandedNodes([...expandedNodes, pos.node.id]);
                    }
                }
                return;
            }
        }
    }

    function isPointInCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= r * r;
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
