import { useSandpack } from '@codesandbox/sandpack-react'
import React, { useEffect } from 'react'

const SandpackErrorMonitor = ({onErrorChange}) => {
    const { sandpack } = useSandpack()
    const {error} = sandpack;

    useEffect(()=>{
        if(error){
            const msg = error.message || "";
            const isNetworkError = 
            msg.includes("Failed to fetch") || 
            msg.includes("col.csbops.io") || 
            msg.includes("ERR_CONNECTION_TIMED_OUT") ||
            msg.includes("net::ERR");

            if(isNetworkError){
               onErrorChange(false);
               return 
            }
        }
        onErrorChange(true)
    },[error, onErrorChange])
  return null
}

export default SandpackErrorMonitor