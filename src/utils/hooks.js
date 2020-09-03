import { useEffect } from 'react'
import useMedia from 'use-media'

export const useEffectOnce = fn => useEffect(fn, [])

export const useMobileOnly = () => useMedia({ maxWidth: '767px' })

export const useDesktopOnly = () => useMedia({ minWidth: '768px' })

export const useKeyboardUser = () => {
  const handleFirstTab = e => {
    // tab key
    if (e.keyCode === 9) {
      document.body.classList.add('keyboardUser')
      window.removeEventListener('keydown', handleFirstTab)
      window.addEventListener('mousedown', handleFirstMouseDown)
    }
  }

  const handleFirstMouseDown = () => {
    document.body.classList.remove('keyboardUser')
    window.removeEventListener('mousedown', handleFirstMouseDown)
    window.addEventListener('keydown', handleFirstTab)
  }

  useEffectOnce(() => {
    window.addEventListener('keydown', handleFirstTab)

    return () => {
      window.removeEventListener('keydown', handleFirstTab)
      window.removeEventListener('mousedown', handleFirstMouseDown)
    }
  })
}