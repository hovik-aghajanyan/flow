import React, {useState} from 'react';
import CanvasBoard from './components/CanvasBoard/index.jsx';
import ReactFlowBoard from "./components/ReactFlowBoard";
import CanvasGraph from "./components/CanvasGraph/canvas/v7";

const App = () => {
    const [selectedNode, setSelectedNode] = useState(null);

    return (
        <div className="w-screen h-screen bg-gray-900 text-white">
            <CanvasGraph selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
            {/*<CanvasBoard />*/}
            {/*<ReactFlowBoard />*/}
        </div>
    );
};

export default App;
