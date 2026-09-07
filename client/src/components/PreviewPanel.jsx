import React, { useEffect, useMemo, useRef, useState } from 'react'
import {SandpackCodeEditor, SandpackLayout, SandpackPreview, SandpackProvider, useSandpack} from '@codesandbox/sandpack-react'
import { detectDependencies } from '../utils/sandpackUtils';
import { useAppContext } from '../context/AppContext';
import SandpackErrorMonitor from './SandpackErrorMonitor';

// Watches for file edits inside Sandpack editor and saves changes to DB & live state
function SandpackFileWatcher({ onLiveFilesChange }){
    const { sandpack } = useSandpack();
    const { files } = sandpack;
    const { activeProject, updateProjectFiles } = useAppContext()

    const activeProjectRef = useRef(activeProject)

    useEffect(()=>{
        activeProjectRef.current = activeProject;
    },[activeProject])

    useEffect(()=>{
       const project =  activeProjectRef.current;
       if (!project) return;
        const updatedFiles = {};
        let hasChanges = false;

        for (const [path, fileObj] of Object.entries(files)) {
            const fileCode = fileObj.code;
            updatedFiles[path] = fileCode;
            const originalContent = typeof project.files[path] === "string" ? project.files[path] : project.files[path]?.content;
            if(originalContent !== undefined && originalContent !== fileCode){
                hasChanges = true;
            }
        }

        // Sync live files to parent
        onLiveFilesChange(updatedFiles)
        if(hasChanges){
            updateProjectFiles(updatedFiles)
        }

    },[files])
    return null;
}

const PreviewPanel = ({project, activeFile, showCode}) => {

    const [showErrorOverlay, setShowErrorOverlay] = useState(true)
   // Keep local state of files that updates as user types
   const [liveFiles, setLiveFiles] = useState(project.files);
   const [prevProjectKey, setPrevProjectKey] = useState(`${project._id}-${project.version}`)

   const currentKey = `${project._id}-${project.version}`;
   if(prevProjectKey !== currentKey){
    setPrevProjectKey(currentKey);
    setLiveFiles(project.files);
   }

   const handleLiveFilesChange = (newFiles)=>{
    setLiveFiles((prev)=>{
        let changed = false;
        for (const [p, code] of Object.entries(newFiles)) {
            if (prev[p] !== code){
                changed = true;
                break;
            }
        }
        return changed ? newFiles : prev;
    })
   }


    // Convert liveFiles to Sandpack format
   const sandpackFiles = useMemo(()=>{
    const spFiles = {};
    for (const [path, content] of Object.entries(liveFiles)) {
        const fileCode = typeof content === "string" ? content : content?.content || "";
        spFiles[path] = {
            code: fileCode,
            active: path === activeFile,
        }
    }
    return spFiles;
   },[liveFiles, activeFile])

// Detect dependencies from import statements using liveFiles
const dependencies = useMemo(()=>{
    return detectDependencies(liveFiles)
},[liveFiles])

  return (
    <div className="h-full w-full">
        <SandpackProvider key={project._id} template='react' 
        files={sandpackFiles} 
        customSetup={{dependencies}} 
        options={{
            externalResources: [
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
            ],
            classes: {
                "sp-wrapper": "sp-wrapper",
                "sp-layout": "sp-layout",
                "sp-preview": "sp-preview",
            },
            logLevel: 0,
        }} 
        theme={{
            colors: {
                surface1: "#ffffff",
                surface2: "#f4f4f5",
                surface3: "#e4e4e7",
                clickable: "#71717a",
                base: "#09090b",
                disabled: "#a1a1aa",
                hover: "#18181b",
                accent: "#18181b",
                error: "#ef4444",
                errorSurface: "#fef2f2",
            },
            font: {
                body: "'Urbanist', system-ui, -apple-system, sans-serif",
                mono: "'Geist Mono', ui-monospace, monospace",
                size: "13px",
                lineHeight: "1.6",
            }
        }}>

            <SandpackFileWatcher onLiveFilesChange={handleLiveFilesChange}/>
            <SandpackErrorMonitor onErrorChange={setShowErrorOverlay}/>
            <SandpackLayout
            style={{
                height: "100%",
                border: "none",
                borderRadius: 0,
                background: "transparent",
            }}>
                {showCode && (
                    <SandpackCodeEditor showTabs showLineNumbers showInlineErrors wrapContent style={{ height: "100%", flex: 1, minWidth: 0 }}/>
                )}

                <SandpackPreview showNavigator={false} showRefreshButton  showOpenInCodeSandbox={false} showSandpackErrorOverlay={showErrorOverlay} style={{ height: "100%", flex: showCode ? 1 : 2, minWidth: 0 }}/>
            </SandpackLayout>



        </SandpackProvider>

    </div>
  )
}

export default PreviewPanel