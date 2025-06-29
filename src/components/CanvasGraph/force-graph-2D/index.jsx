import React, { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// Sample graph data
const sampleData = {
    nodes: [
        { id: 'frontend' },
        { id: 'html' },
        { id: 'css' },
        { id: 'js' },
        { id: 'react' },
        { id: 'angular' },
        { id: 'backend' },
        { id: 'c#' },
        { id: 'java' }
    ],
    links: [
        { source: 'frontend', target: 'html' },
        { source: 'frontend', target: 'css' },
        { source: 'frontend', target: 'js' },
        { source: 'js', target: 'react' },
        { source: 'js', target: 'angular' },
        { source: 'backend', target: 'c#' },
        { source: 'backend', target: 'java' },
    ]
};

export default function BasicForceGraph() {
    const fgRef = useRef();

    useEffect(() => {
        // Access graph methods via fgRef.current if needed
        if (fgRef.current) {
            // e.g., fgRef.current.d3Force('charge').strength(-200);
        }
    }, []);

    return (
        <div style={{ width: '800px', height: '600px' }}>
            <ForceGraph2D
                ref={fgRef}
                graphData={sampleData}
                nodeAutoColorBy="id"
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                nodeLabel="id"
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.color;
                    ctx.fillText(label, node.x, node.y);

                    node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
                }}
            />
        </div>
    );
}
