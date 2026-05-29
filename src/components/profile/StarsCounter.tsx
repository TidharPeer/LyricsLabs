import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'

interface Props {
  earned: number
  onDone?: () => void
}

const floatUp = keyframes`
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  60%  { opacity: 1; transform: translateY(-40px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-70px) scale(0.9); }
`

const Bubble = styled.div`
  position: fixed;
  bottom: 80px;
  right: 24px;
  z-index: 999;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f59e0b;
  text-shadow: 0 1px 4px rgba(0,0,0,0.2);
  animation: ${floatUp} 1.6s ease-out forwards;
  pointer-events: none;
  user-select: none;
`

export function StarsCounter({ earned, onDone }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 1700)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible || earned <= 0) return null
  return <Bubble>+{earned} ★</Bubble>
}
