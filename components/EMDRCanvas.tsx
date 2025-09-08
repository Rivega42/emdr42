'use client'

import { useEffect, useRef } from 'react'

interface EMDRCanvasProps {
  pattern: string
  speed: number
}

export default function EMDRCanvas({ pattern, speed }: EMDRCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = 400

    let time = 0

    const animate = () => {
      time += 0.016 * speed // 60fps
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      let x = 0, y = 0
      
      switch(pattern) {
        case 'horizontal':
          x = (Math.sin(time) + 1) * 0.5 * canvas.width
          y = canvas.height / 2
          break
        case 'infinity':
          x = canvas.width/2 + Math.sin(time) * 150
          y = canvas.height/2 + Math.sin(time * 2) * 75
          break
        case 'butterfly':
          const scale = 100
          x = canvas.width/2 + Math.sin(time) * scale * Math.cos(time)
          y = canvas.height/2 + Math.sin(time) * scale * Math.sin(time)
          break
        case 'spiral':
          const radius = (Math.sin(time/3) + 1) * 100
          x = canvas.width/2 + Math.cos(time * 3) * radius
          y = canvas.height/2 + Math.sin(time * 3) * radius
          break
        default:
          x = canvas.width/2
          y = canvas.height/2
      }
      
      // Draw main circle
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.fillStyle = '#4CAF50'
      ctx.fill()
      
      // Glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40)
      gradient.addColorStop(0, 'rgba(76, 175, 80, 0.5)')
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, 40, 0, Math.PI * 2)
      ctx.fill()
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [pattern, speed])

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ maxHeight: '400px' }}
    />
  )
}