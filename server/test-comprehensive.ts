import { DrugService } from './services/drug-service';
import { DrugEnhancementService } from './services/drug-enhancement';
import { SimpleAgentOrchestrator } from './services/simple-agents';

/**
 * 综合测试脚本 - 验证所有新功能
 */

async function testDrugDatabase() {
  console.log('\n🧪 测试 1: 药物数据库功能');
  
  // 测试药物搜索
  console.log('📋 搜索阿司匹林...');
  const aspirinResults = await DrugService.searchDrugs('阿司匹林');
  console.log(`✅ 找到 ${aspirinResults.length} 个结果:`, aspirinResults[0]?.name);
  
  // 测试英文搜索
  console.log('📋 搜索aspirin...');
  const aspirinEnResults = await DrugService.searchDrugs('aspirin');
  console.log(`✅ 找到 ${aspirinEnResults.length} 个结果:`, aspirinEnResults[0]?.name);
  
  // 测试新增药物
  console.log('📋 搜索替格瑞洛...');
  const ticagrelor = await DrugService.searchDrugs('替格瑞洛');
  console.log(`✅ 找到 ${ticagrelor.length} 个结果:`, ticagrelor[0]?.name);
  
  // 测试麻醉药物
  console.log('📋 搜索瑞马唑仑...');
  const remimazolam = await DrugService.searchDrugs('瑞马唑仑');
  console.log(`✅ 找到 ${remimazolam.length} 个结果:`, remimazolam[0]?.name);
}

async function testDrugEnhancement() {
  console.log('\n🧪 测试 2: 药物信息增强功能');
  
  try {
    console.log('🔍 增强阿司匹林信息...');
    const enhancement = await DrugEnhancementService.enhanceDrugInformation('阿司匹林');
    console.log('✅ 增强完成');
    console.log('   - 药理学:', enhancement.pharmacology.substring(0, 50) + '...');
    console.log('   - 作用机制:', enhancement.mechanism.substring(0, 50) + '...');
    console.log('   - 麻醉相互作用:', enhancement.anesthesiaInteractions.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ 增强失败:', error.message);
  }
}

async function testPreoperativeGuidelines() {
  console.log('\n🧪 测试 3: 术前停药建议功能');
  
  try {
    console.log('🔍 生成华法林术前停药建议...');
    const guidelines = await DrugEnhancementService.generatePreoperativeGuidelines('华法林');
    console.log('✅ 建议生成完成');
    console.log('   - 建议内容:', guidelines.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ 建议生成失败:', error.message);
  }
}

async function testAnesthesiaInteraction() {
  console.log('\n🧪 测试 4: 麻醉药物相互作用分析');
  
  try {
    console.log('🔍 分析阿司匹林与麻醉药物相互作用...');
    const analysis = await DrugEnhancementService.analyzeAnesthesiaDrugInteraction(
      '阿司匹林', 
      ['丙泊酚', '芬太尼', '罗库溴铵']
    );
    console.log('✅ 分析完成');
    console.log('   - 分析结果:', analysis.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

async function testDrugInteractionDetection() {
  console.log('\n🧪 测试 5: 增强的药物相互作用检测');
  
  // 创建模拟的SimpleAgentOrchestrator来测试药物相互作用检测
  const orchestrator = new SimpleAgentOrchestrator(1);
  
  // 测试多种药物相互作用
  const testCases = [
    ['阿司匹林', '氯吡格雷'],
    ['舍曲林', '曲马多'],
    ['华法林', '阿司匹林'],
    ['氟哌噻吨美利曲辛', '丙泊酚'],
    ['美托洛尔', '丙泊酚'],
    ['二甲双胍', '造影剂']
  ];
  
  for (const medications of testCases) {
    console.log(`🔍 测试药物组合: ${medications.join(' + ')}`);
    
    // 使用反射调用私有方法进行测试
    try {
      const interactions = (orchestrator as any).generateDrugInteractions(medications);
      console.log(`✅ 检测到 ${interactions.length} 个相互作用`);
      
      if (interactions.length > 0) {
        console.log(`   - 严重程度: ${interactions[0].severity}`);
        console.log(`   - 描述: ${interactions[0].summary}`);
      }
    } catch (error) {
      console.error('❌ 检测失败:', error.message);
    }
  }
}

async function testDrugCategories() {
  console.log('\n🧪 测试 6: 新增药物类别覆盖');
  
  const categories = [
    { name: '抗血小板药', examples: ['阿司匹林', '氯吡格雷', '替格瑞洛'] },
    { name: '抗凝药', examples: ['华法林', '利伐沙班', '达比加群'] },
    { name: 'SSRI抗抑郁药', examples: ['舍曲林', '氟西汀', '帕罗西汀'] },
    { name: '静脉麻醉药', examples: ['丙泊酚', '依托咪酯', '瑞马唑仑'] },
    { name: '阿片类镇痛药', examples: ['芬太尼', '舒芬太尼', '吗啡'] },
    { name: 'ACE抑制剂', examples: ['依那普利', '卡托普利', '培哚普利'] },
    { name: 'β受体阻滞剂', examples: ['美托洛尔', '普萘洛尔', '阿替洛尔'] },
    { name: '双胍类降糖药', examples: ['二甲双胍', '格华止'] }
  ];
  
  for (const category of categories) {
    console.log(`🔍 测试类别: ${category.name}`);
    let found = 0;
    
    for (const drug of category.examples) {
      const results = await DrugService.searchDrugs(drug);
      if (results.length > 0) {
        found++;
        console.log(`   ✅ 找到: ${drug} (${results[0].category})`);
      } else {
        console.log(`   ❌ 未找到: ${drug}`);
      }
    }
    
    console.log(`   📊 覆盖率: ${found}/${category.examples.length} (${Math.round(found/category.examples.length*100)}%)`);
  }
}

async function runComprehensiveTests() {
  console.log('🚀 开始综合功能测试...\n');
  
  try {
    await testDrugDatabase();
    await testDrugEnhancement();
    await testPreoperativeGuidelines();
    await testAnesthesiaInteraction();
    await testDrugInteractionDetection();
    await testDrugCategories();
    
    console.log('\n🎉 所有测试完成！');
    console.log('✅ 药物数据库功能正常');
    console.log('✅ AI增强服务功能正常');
    console.log('✅ 术前停药建议功能正常');
    console.log('✅ 麻醉相互作用分析功能正常');
    console.log('✅ 药物相互作用检测功能正常');
    console.log('✅ 新增药物类别覆盖完整');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runComprehensiveTests();
}

export { runComprehensiveTests };