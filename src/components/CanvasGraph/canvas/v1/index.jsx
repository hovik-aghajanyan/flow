import React, { useRef, useEffect, useState } from "react";
import styles from "./index.module.css";

const MAIN_RADIUS = 50;
const CHILD_RADIUS = 25;
const GRANDCHILD_RADIUS = 15;

const mainNode = { x: 400, y: 150, label: "frontend" };

const childNodesBasePos = [
    { id: "html", x: 360, y: 280, label: "html" },
    { id: "css", x: 400, y: 280, label: "css" },
    { id: "js", x: 440, y: 280, label: "js" },
];

// Grandchildren keyed by child id
const grandchildrenMap = {
    css: [
        { id: "pure-css", label: "pure css" },
        { id: "css-in-js", label: "css in js" },
    ],
};

export default function CanvasGraph() {
    const canvasRef = useRef(null);
    const [selectedChild, setSelectedChild] = useState(null);
    const [animationProgress, setAnimationProgress] = useState(0); // 0 to 1 for grandchildren animation

    // Animate grandchildren appearance
    useEffect(() => {
        let animFrame;
        let start;

        if (selectedChild && grandchildrenMap[selectedChild]) {
            start = null;

            function animate(timestamp) {
                if (!start) start = timestamp;
                const progress = Math.min((timestamp - start) / 500, 1); // 0.5s animation
                setAnimationProgress(progress);
                if (progress < 1) {
                    animFrame = requestAnimationFrame(animate);
                }
            }
            animFrame = requestAnimationFrame(animate);
        } else {
            setAnimationProgress(0);
        }

        return () => cancelAnimationFrame(animFrame);
    }, [selectedChild]);

    // Calculate children positions depending on selection:
    // if none selected, children cluster closer to parent node
    // if selected, children spread horizontally more
    const getChildPositions = () => {
        if (selectedChild === null) {
            // cluster closer
            return childNodesBasePos.map((child) => ({
                ...child,
                x: mainNode.x + (child.x - mainNode.x) * 0.3,
                y: mainNode.y + (child.y - mainNode.y) * 0.3,
            }));
        } else {
            // spread out full positions
            return childNodesBasePos;
        }
    };

    // Grandchildren target positions (spread horizontally below parent child)
    // We'll animate from parent's position to these positions
    const getGrandchildPositions = (childPos) => {
        const grandchildren = grandchildrenMap[selectedChild];
        if (!grandchildren) return [];

        // spread grandchildren horizontally with 80px step below childPos.y + 130
        const startX = childPos.x - ((grandchildren.length - 1) * 80) / 2;
        return grandchildren.map((gc, i) => ({
            ...gc,
            x: startX + i * 80,
            y: childPos.y + 130,
        }));
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const children = getChildPositions();

        // Draw lines: main -> children
        children.forEach((child) => {
            const isSelected = selectedChild === child.id;
            drawLine(ctx, mainNode, child, isSelected);
        });

        // Draw main node
        const mainIsSelected = selectedChild !== null;
        drawNode(ctx, mainNode, MAIN_RADIUS, mainIsSelected);

        // Draw children nodes
        children.forEach((child) => {
            const isSelected = selectedChild === child.id;
            drawNode(ctx, child, CHILD_RADIUS, isSelected);
        });

        // Draw grandchildren if selected
        if (selectedChild && grandchildrenMap[selectedChild]) {
            const selectedChildPos = children.find((c) => c.id === selectedChild);
            const grandchildPositions = getGrandchildPositions(selectedChildPos);

            grandchildPositions.forEach((gcPos, i) => {
                // Animate position from parent child to grandchildPos
                const animatedX =
                    selectedChildPos.x +
                    (gcPos.x - selectedChildPos.x) * animationProgress;
                const animatedY =
                    selectedChildPos.y +
                    (gcPos.y - selectedChildPos.y) * animationProgress;

                // Draw line from child to grandchild with same animation progress on opacity
                drawLine(ctx, selectedChildPos, { x: animatedX, y: animatedY }, false, animationProgress);

                // Draw grandchild node with scale & fade animation
                drawNode(
                    ctx,
                    { x: animatedX, y: animatedY, label: gcPos.label },
                    GRANDCHILD_RADIUS * animationProgress,
                    false,
                    animationProgress
                );
            });
        }
    }, [selectedChild, animationProgress]);

    // Draw node helper: added stroke text for readability
    function drawNode(ctx, node, radius, highlighted, opacity = 1) {
        if (radius < 0.5) return; // skip too small to draw

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

        if (highlighted) {
            ctx.fillStyle = "#e67e22"; // orange highlight
            ctx.shadowColor = "#e67e22";
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#d35400";
        } else {
            ctx.fillStyle = "#3498db";
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#2980b9";
        }

        ctx.fill();
        ctx.stroke();

        // Text with white fill + black stroke for readability
        ctx.font = `bold ${radius / 1.5 + 10}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.strokeText(node.label, node.x, node.y);

        ctx.fillStyle = "white";
        ctx.fillText(node.label, node.x, node.y);

        ctx.restore();
    }

    // Draw line helper with optional arrow and animation progress for opacity
    function drawLine(ctx, fromNode, toNode, highlighted, opacity = 1) {
        ctx.save();
        ctx.globalAlpha = opacity;

        // Calculate edge-to-edge line points
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const fromRadius = fromNode.id === undefined ? MAIN_RADIUS : CHILD_RADIUS;
        // Use GRANDCHILD_RADIUS for grandchildren, or CHILD_RADIUS
        const toRadius =
            toNode.id === undefined
                ? MAIN_RADIUS
                : toNode.id.startsWith("pure") || toNode.id.startsWith("css-in")
                    ? GRANDCHILD_RADIUS * opacity
                    : CHILD_RADIUS;

        const startX = fromNode.x + fromRadius * Math.cos(angle);
        const startY = fromNode.y + fromRadius * Math.sin(angle);
        const endX = toNode.x - toRadius * Math.cos(angle);
        const endY = toNode.y - toRadius * Math.sin(angle);

        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = highlighted ? "#e67e22" : "#555";
        ctx.lineWidth = highlighted ? 4 : 2;
        ctx.shadowColor = highlighted ? "#e67e22" : "transparent";
        ctx.shadowBlur = highlighted ? 10 : 0;
        ctx.stroke();

        // Draw arrowhead
        drawArrowhead(ctx, endX, endY, angle, highlighted);

        ctx.restore();
    }

    function drawArrowhead(ctx, x, y, angle, highlighted) {
        const size = highlighted ? 12 : 8;
        ctx.beginPath();
        ctx.fillStyle = highlighted ? "#e67e22" : "#555";

        ctx.moveTo(x, y);
        ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    function handleClick(event) {
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const children = getChildPositions();

        // Check children nodes
        for (const child of children) {
            if (isPointInCircle(clickX, clickY, child.x, child.y, CHILD_RADIUS)) {
                if (selectedChild === child.id) {
                    setSelectedChild(null);
                } else {
                    setSelectedChild(child.id);
                }
                return;
            }
        }

        setSelectedChild(null);
    }

    function isPointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= radius * radius;
    }

    return (
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onClick={handleClick}
                style={{ cursor: "pointer" }}
            />
        </div>
    );
}
