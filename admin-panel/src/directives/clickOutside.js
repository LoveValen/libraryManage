/**
 * 点击外部区域指令
 * 用于检测点击是否发生在元素外部
 */
export const clickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      // 检查点击是否发生在元素外部
      if (!(el === event.target || el.contains(event.target))) {
        // 调用绑定的函数
        binding.value && binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

export default clickOutside