import React, { useEffect, useState } from 'react'
import { data, useParams } from 'react-router-dom'
import api from '../api/api'
import Loading from '../components/Loading'
import { AlertCircleIcon } from 'lucide-react'
import FullPagePreview from '../components/FullPagePreview'
import { useAppContext } from '../context/AppContext'

const PreviewPage = () => {
  const { id } = useParams()
  const {activeProject: project, loadingActiveProject: loading, loadProject} = useAppContext()

  useEffect(()=>{
    if(id){
      loadProject(id)
    }
    
  },[id])

  if(loading || !project) {
    return <Loading />
  }


  return (
    <FullPagePreview files={project.files}/>
  )
}

export default PreviewPage