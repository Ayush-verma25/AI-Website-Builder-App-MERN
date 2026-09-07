import { Loader2Icon } from 'lucide-react'

const Loading = () => {
  return (
    
        <div role="status" aria-label="Loading" className='h-screen flex items-center justify-center bg-white'>
            <Loader2Icon size={26} className="animate-spin text-zinc-950"/>
        </div>
  )
}

export default Loading