import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, LoaderCircle, RefreshCw } from 'lucide-react'
import { getAdmissionsProfilePhoto } from '../lib/admissionsApi'

export default function PrivateProfilePhoto({ documentId, userId, name, uploadTo = '/documents', uploadState }) {
  const [photo, setPhoto] = useState({ status: documentId ? 'loading' : 'empty', url: null })
  const [refresh, setRefresh] = useState(0)
  const initials = (name || 'Your profile').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  useEffect(() => {
    if (!documentId || !userId) return
    let active = true, timer
    async function loadPhoto() {
      try {
        const result = await getAdmissionsProfilePhoto(documentId, userId)
        if (!active) return
        if (!result) { setPhoto({ status: 'empty', url: null }); return }
        const expires = Date.parse(result.expires_at)
        if (result.document_id !== documentId || !Number.isFinite(expires) || expires <= Date.now()) throw new Error('Photo link could not be refreshed.')
        setPhoto({ status: 'ready', url: result.url, userId, documentId })
        timer = setTimeout(loadPhoto, Math.max(1000, expires - Date.now() - 30_000))
      } catch { if (active) setPhoto({ status: 'error', url: null }) }
    }
    loadPhoto()
    return () => { active = false; clearTimeout(timer) }
  }, [documentId, userId, refresh])
  const showPhoto = photo.status === 'ready' && photo.userId === userId && photo.documentId === documentId
  return <div className="flex items-center gap-4"><div className="relative shrink-0"><div className="grid h-[76px] w-[76px] overflow-hidden rounded-[24px] border-4 border-white bg-[#edf3ff] text-xl font-semibold text-[#225feb] shadow-sm sm:h-[88px] sm:w-[88px]">{showPhoto ? <img src={photo.url} alt="Your uploaded profile photo" referrerPolicy="no-referrer" onError={() => setPhoto({ status: 'error', url: null })} className="h-full w-full object-cover"/> : <span className="m-auto">{photo.status === 'loading' ? <LoaderCircle size={23} className="animate-spin"/> : initials}</span>}</div><Link to={uploadTo} state={uploadState} aria-label={showPhoto ? 'Change your uploaded profile photo' : 'Upload your profile photo'} className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#10264c] text-white shadow-sm transition hover:bg-[#225feb]"><Camera size={12}/></Link></div><div><p className="text-sm font-semibold text-[#10264c]">{name || 'Your profile'}</p><p className="mt-1.5 text-[10px] text-slate-400">{showPhoto ? 'Your uploaded photo · private' : photo.status === 'loading' ? 'Loading your private photo…' : 'Add a photo to make it yours'}</p>{photo.status === 'error' && <button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-[#225feb]"><RefreshCw size={10}/>Retry photo</button>}</div></div>
}
