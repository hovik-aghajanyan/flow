// import CanvasBoard from './components/CanvasBoard';
// import ReactFlowBoard from "./components/ReactFlowBoard";
import CanvasGraph from "./components/CanvasGraph/canvas/v7";
// import CanvasGraph from "./components/CanvasGraph/force-graph-2D";

const App = () => {

    return (
        <div className="w-screen h-screen bg-gray-900 text-white">
            <CanvasGraph />
            {/*<CanvasBoard />*/}
            {/*<ReactFlowBoard />*/}
        </div>
    );
};

export default App;
