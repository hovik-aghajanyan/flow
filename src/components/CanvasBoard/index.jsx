import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './index.module.css';

const PORT_RADIUS = 6;
const CONNECTION_HIT_RADIUS = 6;

const getPorts = (rect) => ([
    { rectId: rect.id, side: 'top', offsetX: rect.w / 2, offsetY: 0 },
    { rectId: rect.id, side: 'right', offsetX: rect.w, offsetY: rect.h / 2 },
    { rectId: rect.id, side: 'bottom', offsetX: rect.w / 2, offsetY: rect.h },
    { rectId: rect.id, side: 'left', offsetX: 0, offsetY: rect.h / 2 },
]);

const CanvasBoard = () => {
    const canvasRef = useRef(null);
    const [rectangles, setRectangles] = useState([]);
    const [connections, setConnections] = useState([]);
    const [scale, setScale] = useState(1);
    const [dragging, setDragging] = useState(null);
    const [hoveredRectId, setHoveredRectId] = useState(null);
    const [drawingLine, setDrawingLine] = useState(null);
    const [hoveredConnectionIndex, setHoveredConnectionIndex] = useState(null);

    const draw = useCallback((ctx) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.scale(scale, scale);

        // Draw connections
        connections.forEach(({ from, to }, index) => {
            const startRect = rectangles.find(r => r.id === from.rectId);
            const endRect = rectangles.find(r => r.id === to.rectId);
            if (startRect && endRect) {
                const startX = startRect.x + from.offsetX;
                const startY = startRect.y + from.offsetY;
                const endX = endRect.x + to.offsetX;
                const endY = endRect.y + to.offsetY;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.bezierCurveTo(startX + 50, startY, endX - 50, endY, endX, endY);
                ctx.strokeStyle = hoveredConnectionIndex === index ? 'red' : '#000';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Optional: draw a delete handle (small circle at midpoint)
                const mx = (startX + endX) / 2;
                const my = (startY + endY) / 2;
                if (hoveredConnectionIndex === index) {
                    ctx.beginPath();
                    ctx.arc(mx, my, PORT_RADIUS, 0, Math.PI * 2);
                    ctx.fillStyle = 'red';
                    ctx.fill();
                }
            }
        });

        if (drawingLine) {
            const { from, to } = drawingLine;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.bezierCurveTo(from.x + 50, from.y, to.x - 50, to.y, to.x, to.y);
            ctx.strokeStyle = 'gray';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        rectangles.forEach(rect => {
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

            if (hoveredRectId === rect.id || drawingLine) {
                getPorts(rect).forEach(port => {
                    const cx = rect.x + port.offsetX;
                    const cy = rect.y + port.offsetY;
                    ctx.beginPath();
                    ctx.arc(cx, cy, PORT_RADIUS, 0, Math.PI * 2);
                    ctx.fillStyle = 'blue';
                    ctx.fill();
                });
            }
        });

        ctx.restore();
    }, [rectangles, connections, scale, drawingLine, hoveredRectId, hoveredConnectionIndex]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const render = () => {
            draw(ctx);
            requestAnimationFrame(render);
        };
        render();
    }, [draw]);

    const getPortAt = (x, y) => {
        for (const rect of rectangles) {
            for (const port of getPorts(rect)) {
                const cx = rect.x + port.offsetX;
                const cy = rect.y + port.offsetY;
                const dx = x - cx;
                const dy = y - cy;
                if (Math.sqrt(dx * dx + dy * dy) < PORT_RADIUS * 2) {
                    return port;
                }
            }
        }
        return null;
    };

    const getConnectionIndexAt = (x, y) => {
        for (let i = 0; i < connections.length; i++) {
            const { from, to } = connections[i];
            const startRect = rectangles.find(r => r.id === from.rectId);
            const endRect = rectangles.find(r => r.id === to.rectId);
            if (!startRect || !endRect) continue;

            const mx = (startRect.x + from.offsetX + endRect.x + to.offsetX) / 2;
            const my = (startRect.y + from.offsetY + endRect.y + to.offsetY) / 2;

            const dx = x - mx;
            const dy = y - my;
            if (Math.sqrt(dx * dx + dy * dy) < CONNECTION_HIT_RADIUS * 2) {
                return i;
            }
        }
        return null;
    };

    const handleMouseDown = (e) => {
        const x = e.nativeEvent.offsetX / scale;
        const y = e.nativeEvent.offsetY / scale;
        const port = getPortAt(x, y);

        if (port) {
            const rect = rectangles.find(r => r.id === port.rectId);
            setDrawingLine({
                from: {
                    ...port,
                    x: rect.x + port.offsetX,
                    y: rect.y + port.offsetY,
                },
                to: { x, y },
            });
            return;
        }

        const idx = getConnectionIndexAt(x, y);
        if (idx !== null) {
            setConnections(prev => prev.filter((_, i) => i !== idx));
            return;
        }

        const clicked = rectangles.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
        if (clicked) {
            setDragging({ id: clicked.id, offsetX: x - clicked.x, offsetY: y - clicked.y });
        }
    };

    const handleMouseMove = (e) => {
        const x = e.nativeEvent.offsetX / scale;
        const y = e.nativeEvent.offsetY / scale;

        if (drawingLine) {
            setDrawingLine(prev => ({ ...prev, to: { x, y } }));
        } else if (dragging) {
            const xPos = x - dragging.offsetX;
            const yPos = y - dragging.offsetY;
            setRectangles(prev => prev.map(r => r.id === dragging.id ? { ...r, x: xPos, y: yPos } : r));
        } else {
            const port = getPortAt(x, y);
            canvasRef.current.style.cursor = port ? 'crosshair' : 'default';
            const hovered = rectangles.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
            setHoveredRectId(hovered?.id || null);
            setHoveredConnectionIndex(getConnectionIndexAt(x, y));
        }
    };

    const handleMouseUp = (e) => {
        const x = e.nativeEvent.offsetX / scale;
        const y = e.nativeEvent.offsetY / scale;
        const toPort = getPortAt(x, y);

        if (drawingLine && toPort) {
            setConnections(prev => [...prev, {
                from: drawingLine.from,
                to: toPort,
            }]);
        }

        setDrawingLine(null);
        setDragging(null);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(Math.max(prev + delta, 0.5), 2));
    };

    const addRectangle = () => {
        const id = Date.now().toString();
        setRectangles([...rectangles, { id, x: 100, y: 100, w: 120, h: 60 }]);
    };

    return (
        <div className={styles.wrapper}>
            <button className={styles.addBtn} onClick={addRectangle}>Add Rectangle</button>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            />
        </div>
    );
};

export default CanvasBoard;
