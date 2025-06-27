import React from 'react';
import CanvasBoard from './components/CanvasBoard/index.jsx';
import ReactFlowBoard from "./components/ReactFlowBoard";

const App = () => {
    return (
        <div className="w-screen h-screen bg-gray-900 text-white">
            <CanvasBoard />
            {/*<ReactFlowBoard />*/}
        </div>
    );
};

export default App;
