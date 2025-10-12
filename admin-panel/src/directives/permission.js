import { useAuthStore } from '@/stores/auth'

export default {
  mounted(el, binding) {
    const { value: required } = binding
    if (!required) return
    const auth = useAuthStore()
    const allowed = auth.permissions.includes('*') || auth.permissions.includes(required)
    if (!allowed) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
}


