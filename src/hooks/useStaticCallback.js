import {useCallback, useRef} from "react";

export default function useStaticCallback(cb) {
    const cbRef = useRef(cb);
    cbRef.current = cb;
    return  useCallback((...args)=>{
        return cbRef.current(...args);
    }, []);
}