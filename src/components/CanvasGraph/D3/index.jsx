import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import styles from "./index.module.css";

const graphData = {
    React: {
        id: "React",
        children: ["Hooks", "Components"]
    },
    Hooks: {
        id: "Hooks",
        parent: "React",
        children: ["useEffect", "useLayoutEffect"]
    },
    Components: {
        id: "Components",
        parent: "React",
        children: ["Class", "Functional"]
    },
    useEffect: {
        id: "useEffect",
        parent: "Hooks",
        children: ["dependency Array", "callback", "cleanup function"]
    },
    useLayoutEffect: {
        id: "useLayoutEffect",
        parent: "Hooks",
        children: []
    },
    "dependency Array": {
        id: "dependency Array",
        parent: "useEffect",
        children: []
    },
    callback: {
        id: "callback",
        parent: "useEffect",
        children: []
    },
    "cleanup function": {
        id: "cleanup function",
        parent: "useEffect",
        children: []
    },
    Class: {
        id: "Class",
        parent: "Components",
        children: []
    },
    Functional: {
        id: "Functional",
        parent: "Components",
        children: ["f1", "f2", "f3", "f4"]
    },
    f1: {
        id: "f1",
        parent: "Functional",
        children: ["f1-1", "f1-2", "f1-3"]
    },
    f2: {
        id: "f2",
        parent: "Functional",
        children: []
    },
    f3: {
        id: "f3",
        parent: "Functional",
        children: []
    },
    f4: {
        id: "f4",
        parent: "Functional",
        children: []
    },
    "f1-1": {
        id: "f1-1",
        parent: "f1",
        children: ["f1-1-1", "f1-1-2"]
    },
    "f1-2": {
        id: "f1-2",
        parent: "f1",
        children: []
    },
    "f1-3": {
        id: "f1-3",
        parent: "f1",
        children: []
    },
    "f1-1-1": {
        id: "f1-1-1",
        parent: "f1-1",
        children: []
    },
    "f1-1-2": {
        id: "f1-1-2",
        parent: "f1-1",
        children: []
    }
};

function getPathToRoot(nodeId) {
    const path = new Set();
    let current = nodeId;
    while (current) {
        path.add(current);
        current = graphData[current]?.parent;
    }
    path.add("React");
    return path;
}

function getVisibleNodesFromPath(path) {
    const visible = new Set();

    path.forEach((nodeId) => {
        visible.add(nodeId);
        const children = graphData[nodeId]?.children || [];
        children.forEach((childId) => visible.add(childId));
    });

    visible.forEach((id) => {
        const node = graphData[id];
        if (node?.parent) visible.add(node.parent);
    });

    return visible;
}

export default function CanvasGraph({ selectedNode, setSelectedNode }) {
    const ref = useRef(null);
    const simulationRef = useRef(null);
    const animationRef = useRef(null);
    const prevPositionsRef = useRef(new Map());
    const [shouldAnimate, setShouldAnimate] = useState(true);

    useEffect(() => {
        const canvas = d3.select(ref.current);
        const context = canvas.node().getContext("2d");
        const width = canvas.node().width;
        const height = canvas.node().height;

        const highlightedPath = getPathToRoot(selectedNode);
        const visibleNodes = getVisibleNodesFromPath(highlightedPath);

        const nodes = [];
        const nodeMap = new Map();
        visibleNodes.forEach((id) => {
            const node = { id };
            nodes.push(node);
            nodeMap.set(id, node);
        });

        nodes.forEach((node) => {
            const prev = prevPositionsRef.current.get(node.id);
            if (prev) {
                node.x = prev.x;
                node.y = prev.y;
            } else {
                const parentId = graphData[node.id]?.parent;
                if (parentId && nodeMap.has(parentId)) {
                    const parentNode = nodeMap.get(parentId);
                    node.x = parentNode.x ?? width / 2;
                    node.y = parentNode.y ?? height / 2;
                } else {
                    node.x = width / 2;
                    node.y = height / 2;
                }
            }
        });

        const links = [];
        visibleNodes.forEach((id) => {
            const node = graphData[id];
            if (!node) return;
            (node.children || []).forEach((childId) => {
                if (visibleNodes.has(childId)) {
                    links.push({ source: nodeMap.get(id), target: nodeMap.get(childId) });
                }
            });
        });

        if (simulationRef.current) simulationRef.current.stop();

        const linkDistanceFn = (link) => {
            if (link.source.id === "React") return 80;
            return 120;
        };

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(linkDistanceFn).strength(1))
            .force("charge", d3.forceManyBody().strength(-600))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => (highlightedPath.has(d.id) ? 30 : 20)));

        const reactNode = nodeMap.get("React");
        if (reactNode) {
            reactNode.fx = width / 2;
            reactNode.fy = 80;
        }

        simulationRef.current = simulation;

        const positionsChanged = () => {
            for (const node of nodes) {
                const prev = prevPositionsRef.current.get(node.id);
                if (!prev) return true;
                const dx = Math.abs(prev.x - node.x);
                const dy = Math.abs(prev.y - node.y);
                if (dx > 0.5 || dy > 0.5) return true;
            }
            return false;
        };

        simulation.tick();
        setShouldAnimate(positionsChanged());

        function drawArrowhead(x1, y1, x2, y2, color) {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const size = 8;
            const angle1 = angle - Math.PI / 6;
            const angle2 = angle + Math.PI / 6;

            context.beginPath();
            context.moveTo(x2, y2);
            context.lineTo(x2 - size * Math.cos(angle1), y2 - size * Math.sin(angle1));
            context.lineTo(x2 - size * Math.cos(angle2), y2 - size * Math.sin(angle2));
            context.closePath();
            context.fillStyle = color;
            context.fill();
        }

        function animate() {
            context.clearRect(0, 0, width, height);

            if (shouldAnimate) simulation.tick();

            links.forEach(link => {
                context.beginPath();
                context.moveTo(link.source.x, link.source.y);
                context.lineTo(link.target.x, link.target.y);
                context.strokeStyle = "#000";
                context.lineWidth = 1;
                context.stroke();
                drawArrowhead(link.source.x, link.source.y, link.target.x, link.target.y, "#000");
            });

            links.forEach(link => {
                const isHighlighted = highlightedPath.has(link.source.id) && highlightedPath.has(link.target.id);
                if (!isHighlighted) return;
                context.beginPath();
                context.moveTo(link.source.x, link.source.y);
                context.lineTo(link.target.x, link.target.y);
                context.strokeStyle = "#e63946";
                context.lineWidth = 2.5;
                context.stroke();
                drawArrowhead(link.source.x, link.source.y, link.target.x, link.target.y, "#e63946");
            });

            nodes.forEach(node => {
                const isHighlighted = highlightedPath.has(node.id);
                const radius = isHighlighted ? 20 : 12;
                context.beginPath();
                context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                context.fillStyle = isHighlighted ? "#e63946" : "rgba(200,200,200,0.5)";
                context.fill();
                context.fillStyle = "#000";
                context.font = "12px sans-serif";
                context.fillText(node.id, node.x + radius + 5, node.y + 4);
            });

            nodes.forEach((node) => {
                prevPositionsRef.current.set(node.id, { x: node.x, y: node.y });
            });

            animationRef.current = requestAnimationFrame(animate);
        }

        animate();

        canvas.on("click", (event) => {
            const [x, y] = d3.pointer(event);
            const clicked = nodes.find(d => {
                const radius = highlightedPath.has(d.id) ? 20 : 12;
                return Math.hypot(d.x - x, d.y - y) < radius;
            });
            if (clicked) setSelectedNode(clicked.id);
        });

        return () => {
            simulation.stop();
            cancelAnimationFrame(animationRef.current);
        };
    }, [selectedNode, setSelectedNode, shouldAnimate]);

    return (
        <div className={styles.canvasWrapper}>
            <canvas ref={ref} width={800} height={600} />
        </div>
    );
}


