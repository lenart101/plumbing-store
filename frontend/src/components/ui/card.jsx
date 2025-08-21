
import React from 'react'
export function Card({ className='', children }) {
  return <div className={'card ' + className}>{children}</div>
}
export function CardContent({ className='', children }) {
  return <div className={className} style={{padding:'1rem'}}>{children}</div>
}
