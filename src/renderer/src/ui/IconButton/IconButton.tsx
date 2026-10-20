import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type IconButtonTone = 'default' | 'danger'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string
  tone?: IconButtonTone
  children: ReactNode
}

const TONE_CLASSES: Record<IconButtonTone, string> = {
  default: 'text-base-content/60 hover:bg-neutral/50 hover:text-base-content',
  danger: 'text-error hover:bg-error/10 hover:text-error focus-visible:bg-error/10'
}

export function IconButton({
  label,
  tone = 'default',
  children,
  className,
  type = 'button',
  ...props
}: IconButtonProps): JSX.Element {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded p-1 transition disabled:pointer-events-none disabled:opacity-40',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
