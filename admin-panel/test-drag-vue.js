// Test script to verify drag functionality in Vue app
// Run this in the browser console at http://localhost:8081/examples/virtual-table

function testVirtualTableDrag() {
  console.log('🔍 开始测试虚拟表格拖拽功能...');
  
  // 1. 检查页面是否已加载
  const app = document.querySelector('#app');
  if (!app) {
    console.error('❌ Vue 应用未找到');
    return;
  }
  
  // 2. 检查虚拟表格是否存在
  const virtualTableDemo = document.querySelector('.virtual-table-demo');
  if (!virtualTableDemo) {
    console.error('❌ 虚拟表格演示页面未找到');
    return;
  }
  
  // 3. 检查 ProTable 组件
  const proTable = document.querySelector('.pro-table');
  if (!proTable) {
    console.error('❌ ProTable 组件未找到');
    return;
  }
  
  // 4. 检查拖拽线
  const dragLines = document.querySelectorAll('.drag-line');
  console.log(`✅ 找到 ${dragLines.length} 个拖拽线`);
  
  if (dragLines.length === 0) {
    console.error('❌ 未找到拖拽线元素');
    return;
  }
  
  // 5. 检查每个拖拽线的状态
  dragLines.forEach((line, index) => {
    const rect = line.getBoundingClientRect();
    const columnKey = line.dataset.columnKey;
    console.log(`拖拽线 ${index + 1}: 列=${columnKey}, 可见=${rect.width > 0 && rect.height > 0}, 尺寸=${Math.round(rect.width)}x${Math.round(rect.height)}, 位置=(${Math.round(rect.left)}, ${Math.round(rect.top)})`);
    
    // 视觉高亮 2 秒
    const originalBg = line.style.backgroundColor;
    line.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
    line.style.border = '2px solid green';
    setTimeout(() => {
      line.style.backgroundColor = originalBg;
      line.style.border = '';
    }, 2000);
  });
  
  // 6. 测试第一个拖拽线的事件
  if (dragLines.length > 0) {
    const firstLine = dragLines[0];
    const rect = firstLine.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    console.log(`🧪 测试第一个拖拽线的鼠标事件 (${firstLine.dataset.columnKey})`);
    
    // 模拟鼠标按下
    const mouseDown = new MouseEvent('mousedown', {
      clientX: centerX,
      clientY: centerY,
      bubbles: true,
      cancelable: true
    });
    
    firstLine.dispatchEvent(mouseDown);
    
    // 模拟鼠标移动 (50px 右移)
    setTimeout(() => {
      const mouseMove = new MouseEvent('mousemove', {
        clientX: centerX + 50,
        clientY: centerY,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(mouseMove);
      
      // 模拟鼠标释放
      setTimeout(() => {
        const mouseUp = new MouseEvent('mouseup', {
          clientX: centerX + 50,
          clientY: centerY,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(mouseUp);
        
        console.log('✅ 拖拽测试序列完成');
      }, 100);
    }, 50);
  }
  
  // 7. 检查调试模式
  const debugButton = document.querySelector('input[type="checkbox"]'); // 查找调试模式复选框
  if (debugButton && !debugButton.checked) {
    console.log('💡 建议开启调试模式以查看详细日志');
  }
  
  return {
    hasApp: !!app,
    hasVirtualTable: !!virtualTableDemo,
    hasProTable: !!proTable,
    dragLineCount: dragLines.length,
    firstDragLine: dragLines[0] ? {
      columnKey: dragLines[0].dataset.columnKey,
      rect: dragLines[0].getBoundingClientRect()
    } : null
  };
}

// 自动运行测试
testVirtualTableDrag();