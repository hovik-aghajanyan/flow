import React, { useRef, useState, useEffect } from "react";
import graphData from "./data";
import styles from "./index.module.css";
import useStaticCallback from "../../../../hooks/useStaticCallback.js";
import {findNodeAndPath} from "../../../../helpers/index.js";

const INITIAL_WIDTH = 800;
const INITIAL_HEIGHT = 600;
const BIG_RADIUS = 35;
const SMALL_RADIUS = 25;
const ANIMATION_STEP = 0.1;



// CanvasGraph renders an interactive tree graph on an HTML canvas
export default function CanvasGraph() {
    // Reference to the canvas DOM element
    const canvasRef = useRef(null);
    // positions: maps node IDs to their calculated x/y and node data
    const [positions, setPositions] = useState({});
    // selectedPath: array of node IDs from root to the clicked node
    const [selectedPath, setSelectedPath] = useState([]);
    // expandedNodes: IDs of nodes whose children are currently visible
    const [expandedNodes, setExpandedNodes] = useState([]);
    // animatingNodes: IDs of nodes whose children are in mid-animation
    const [animatingNodes, setAnimatingNodes] = useState([]);
    // animationProgress: from 0 (start) to 1 (finished)
    const [animationProgress, setAnimationProgress] = useState(1);
    // zoom level of the canvas content
    const [zoom, setZoom] = useState(1);
    // offset for panning (x and y translation)
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    // track drag state and last mouse coordinates
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });



    /**
     * Compute x/y layout for all nodes, applying animation interpolation
     * @param {number} progress - animation progress [0,1]
     * @returns {Object} layout mapping
     */
    const layoutNodes = useStaticCallback((progress = 1) => {
        const layout = {};
        const topSpacing = 100;        // horizontal space between top-level nodes
        const childSpacing = 85;      // horizontal space between siblings
        const verticalSpacing = 125;   // vertical space between levels

        // helper to layout children of a given node
        function layoutChildren(node, x, y) {
            const children = node.children || [];
            const count = children.length;
            children.forEach((child, i) => {
                // calculate target position for each child
                const cx = x - ((count - 1) * childSpacing) / 2 + i * childSpacing;
                const cy = y + verticalSpacing;
                let fx = cx;
                let fy = cy;
                // if child is animating, interpolate from parent position
                if (animatingNodes.includes(child.id) && layout[node.id]) {
                    const p = layout[node.id];
                    fx = p.x + (cx - p.x) * progress;
                    fy = p.y + (cy - p.y) * progress;
                }
                // store computed position
                layout[child.id] = { x: fx, y: fy, node: child };
                // if this child is expanded, recurse deeper
                if (expandedNodes.includes(child.id)) layoutChildren(child, cx, cy);
            });
        }

        // layout root-level nodes horizontally
        graphData.forEach((node, i) => {
            const x = INITIAL_WIDTH / 2 - ((graphData.length - 1) * topSpacing) / 2 + i * topSpacing;
            const y = 100; // fixed top margin
            layout[node.id] = { x, y, node };
            // if expanded, layout its children
            if (expandedNodes.includes(node.id)) layoutChildren(node, x, y);
        });

        return layout;
    });

    // initialize layout on mount
    // run once on mount
    useEffect(() => {
        setSelectedPath([]);
        setExpandedNodes([]);
        setPositions(layoutNodes(1));
    }, [layoutNodes]);

    // drive animation frames when animationProgress < 1
    useEffect(() => {
        if (animationProgress < 1) {
            const frame = requestAnimationFrame(() => {
                const next = Math.min(animationProgress + ANIMATION_STEP, 1);
                setAnimationProgress(next);
                setPositions(layoutNodes(next));
                // clear animatingNodes when done
                if (next === 1) setAnimatingNodes([]);
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [animationProgress, animatingNodes, layoutNodes]); // re-run when progress or animatingNodes changes

    // update layout immediately when expandedNodes changes
    useEffect(() => {
        setPositions(layoutNodes(1));
    }, [expandedNodes, layoutNodes]);

    // draw loop: runs when positions, selectedPath, zoom, or offset change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        // clear entire canvas
        ctx.clearRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);
        // apply pan/zoom transforms
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(zoom, zoom);

        // draw all edges first
        Object.values(positions).forEach(({ node, x, y }) => {
            (node.children || []).forEach(child => {
                const target = positions[child.id];
                if (target) {
                    // highlight edge if both nodes are in selectedPath
                    const highlight = selectedPath.includes(node.id) && selectedPath.includes(child.id);
                    drawLine(ctx, { x, y }, target, highlight);
                }
            });
        });

        // draw nodes on top of edges
        Object.entries(positions)
            .sort(([a], [b]) => selectedPath.includes(a) - selectedPath.includes(b)) // draw selected last
            .forEach(([id, { node, x, y }]) => {
                const isSelected = selectedPath.includes(id);
                drawNode(ctx, { x, y, label: node.label, isSelected }, isSelected ? BIG_RADIUS : SMALL_RADIUS);
            });

        ctx.restore();
    }, [positions, selectedPath, zoom, offset]);

    /**
     * Draw a node as a circle with text
     */
    function drawNode(ctx, { x, y, label, isSelected }, radius) {
        const fontSize = 12;
        // split label into lines to fit inside circle
        const words = label.split(" ");
        const lines = [];
        let line = words[0] || "";
        for (let i = 1; i < words.length; i++) {
            const test = line + " " + words[i];
            if (ctx.measureText(test).width > radius * 1.8) {
                lines.push(line);
                line = words[i];
            } else {
                line = test;
            }
        }
        lines.push(line);

        // draw circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? "#e67e22" : "#3498db";
        ctx.strokeStyle = isSelected ? "#d35400" : "#2980b9";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // draw text with shadow and stroke for readability
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        lines.forEach((ln, i) => {
            const ty = y - ((lines.length - 1) * fontSize) / 2 + i * fontSize;
            ctx.strokeText(ln, x, ty);
            ctx.fillStyle = "white";
            ctx.fillText(ln, x, ty);
        });
        ctx.restore();
    }

    /**
     * Draw a directional arrowed line between two points
     */
    function drawLine(ctx, from, to, highlight = false) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        // start/end points offset by node radius
        const startX = from.x + SMALL_RADIUS * Math.cos(angle);
        const startY = from.y + SMALL_RADIUS * Math.sin(angle);
        const endX = to.x - SMALL_RADIUS * Math.cos(angle);
        const endY = to.y - SMALL_RADIUS * Math.sin(angle);

        // main line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = highlight ? "#e67e22" : "#555";
        ctx.lineWidth = highlight ? 3 : 2;
        ctx.stroke();

        // draw arrowhead
        const size = 8;
        ctx.beginPath();
        ctx.fillStyle = highlight ? "#e67e22" : "#555";
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - size * Math.cos(angle - Math.PI / 6), endY - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - size * Math.cos(angle + Math.PI / 6), endY - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Handle node click: expand children if not already expanded
     */
    function handleClick(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = (e.clientX - rect.left - offset.x) / zoom;
        const cy = (e.clientY - rect.top - offset.y) / zoom;
        for (const [id, { x, y }] of Object.entries(positions)) {
            const r = selectedPath.includes(id) ? BIG_RADIUS : SMALL_RADIUS;
            if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) {
                // skip if already expanded
                if (expandedNodes.includes(id)) return;
                const res = findNodeAndPath({id, nodes: graphData});
                if (!res) return;
                setSelectedPath(res.path);
                setExpandedNodes(res.path);
                setAnimatingNodes(res.node.children.map(c => c.id));
                setAnimationProgress(0);
                return;
            }
        }
    }

    // Mouse event handlers for panning
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
    function handleMouseUp() {
        isDragging.current = false;
    }

    // render control buttons and canvas element
    return (
        <div
            className={styles.container}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className={styles.controls}>
                {/* zoom controls */}
                <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))}>Zoom In</button>
                <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))}>Zoom Out</button>
            </div>
            <canvas
                ref={canvasRef}
                width={INITIAL_WIDTH}
                height={INITIAL_HEIGHT}
                onClick={handleClick}
                style={{
                    cursor: isDragging.current ? "grabbing" : "grab",
                    background: "#fff",
                }}
            />
        </div>
    );
}

