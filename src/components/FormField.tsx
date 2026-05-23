import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputClass =
  'w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#4a53ff] focus:outline-none';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[80px]`} {...props} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">{children}</label>;
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const variants = {
    primary: 'bg-[#4a53ff] text-white hover:bg-[#3d46e0]',
    ghost: 'border border-white/20 bg-transparent text-white hover:bg-white/5',
    danger: 'bg-red-600/80 text-white hover:bg-red-600',
  };
  return (
    <button
      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-40 ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}
