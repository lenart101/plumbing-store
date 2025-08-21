
import React from 'react'
export function Button({ children, className = '', variant='default', size, ...props }) {
  const base = 'btn ' + (variant==='outline' ? '' : (variant==='ghost' ? 'ghost' : 'primary'))
  return <button className={base + (className?(' '+className):'')} {...props}>{children}</button>
}
