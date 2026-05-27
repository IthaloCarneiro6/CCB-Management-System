import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  type: ToastType
  message: string
}

type ToastStore = {
  toasts: Toast[]
  push: (type: ToastType, message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push(type, message) {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
