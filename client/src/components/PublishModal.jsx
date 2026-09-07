import { XIcon } from 'lucide-react';
import React from 'react'
import toast from 'react-hot-toast';

const PublishModal = ({ publishUrl, onClose }) => {
    const handleCopyLink = () =>{
        if(!publishUrl) return;
        navigator.clipboard.writeText(publishUrl);
        toast.success("Public link copied to clipboard!")
    }
  return (
    <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center z-50">
        <div className="bg-white border border-zinc-200 shadow-lg rounded-xl max-w-md w-full p-6 mx-4 relative">
            <button onClick={onClose} className='absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 cursor-pointer'>
                <XIcon size={16}/>
            </button>

             <div className="mb-6">
                <h3 className="text-lg font-medium text-zinc-900 mb-1">Your website is live!</h3>
                <p className="text-sm text-zinc-500">Anyone with the link below can view your published site.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
                         Published Link
                    </label>
                    <input type="text" readOnly value={publishUrl} className="w-full px-0 py-2 border-b border-zinc-200 text-sm text-zinc-900 bg-transparent outline-none"/>
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={handleCopyLink} className='flex-1 py-2 bg-zinc-950 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer rounded-lg text-center'>
                        Copy Link
                    </button>
                    <button 
                    onClick={()=> window.open(publishUrl, '_blank')}
                    className='flex-1 py-2 border border-zinc-200 text-zinc-700 text-xs font-medium hover:bg-zinc-50 cursor-pointer rounded-lg text-center'>
                        Open Site
                    </button>
                </div>
            </div>
        </div>
    </div>
  )
}

export default PublishModal