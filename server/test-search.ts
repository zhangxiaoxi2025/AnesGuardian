import { DrugService } from './services/drug-service';

async function testDrugSearch() {
  console.log('开始测试药物搜索功能...');
  
  try {
    // 测试中文搜索
    console.log('\n测试1: 搜索"地佐辛"');
    const result1 = await DrugService.searchDrugs('地佐辛');
    console.log('结果:', result1);
    
    console.log('\n测试2: 搜索"丙泊酚"');
    const result2 = await DrugService.searchDrugs('丙泊酚');
    console.log('结果:', result2);
    
    console.log('\n测试3: 搜索"阿司匹林"');
    const result3 = await DrugService.searchDrugs('阿司匹林');
    console.log('结果:', result3);
    
    console.log('\n测试4: 搜索"prop"');
    const result4 = await DrugService.searchDrugs('prop');
    console.log('结果:', result4);
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testDrugSearch();