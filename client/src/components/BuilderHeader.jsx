import { ArrowLeftIcon, Code2Icon, DownloadIcon, ExternalLinkIcon, EyeIcon, GlobeIcon, Loader2Icon } from 'lucide-react'
import React from 'react'

const BuilderHeader = ({
    projectName,
    version,
    showCode,
    publishing,
    onToggleShowCode,
    onOpenPreview,
    onPublish,
    onDownload,
    onBack,
    onLogout,
}) => {
  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className='p-1.5 rounded-md text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer'>
                <ArrowLeftIcon size={16} />
            </button>
            <img src="/logo.svg" alt="" className="invert size-5" />
            <span className="text-sm font-semibold truncate max-w-38 md:max-w-50">{projectName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">v{version}</span>
        </div>

        <div className="flex items-center gap-1.5">
            <button onClick={onToggleShowCode}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white ${showCode ? "bg-zinc-100 text-zinc-900" : ""}`}>
                {showCode ? (
                    <>
                    <EyeIcon size={13}/> Preview
                    </>
                ) : (
                    <>
                    <Code2Icon size={13}/> Code
                    </>
                )}
            </button>
            <button onClick={onOpenPreview}
            className='inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white'>
                <ExternalLinkIcon size={13} /> Open Preview
            </button>

            <button onClick={onPublish} disabled={publishing} 
            className='inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white'>
                {publishing ? <Loader2Icon size={13} className="animate-spin"/> : <GlobeIcon size={13}/>} Publish
            </button>

            <button onClick={onDownload}
            className='inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white'>
                <DownloadIcon size={13} /> Export
            </button>

            <button onClick={onLogout}
            className='inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium rounded-lg cursor-pointer bg-white'>
                Sign out
            </button>
        </div>
    </header>
  )
}

export default BuilderHeader