import { analyzeDrugInteractions } from './services/gemini';

// 测试氟哌噻吨美利曲辛与麻醉药物的相互作用分析
async function testDrugInteractionAnalysis() {
  console.log('🧪 开始测试围术期药物相互作用分析...');
  
  // 测试案例1：氟哌噻吨美利曲辛与常用麻醉药物
  console.log('\n=== 测试案例1：氟哌噻吨美利曲辛与麻醉药物 ===');
  const testMedications1 = ['氟哌噻吨美利曲辛', '替米沙坦', '美多芭'];
  
  try {
    const interactions1 = await analyzeDrugInteractions(testMedications1, []);
    console.log('✅ 测试案例1 - 检测到的相互作用数量:', interactions1.length);
    console.log('📋 详细结果:');
    interactions1.forEach((interaction, index) => {
      console.log(`  ${index + 1}. ${interaction.drugs.join(' + ')} - ${interaction.severity} - ${interaction.summary}`);
    });
  } catch (error) {
    console.error('❌ 测试案例1失败:', error);
  }
  
  // 测试案例2：阿米替林与丙泊酚
  console.log('\n=== 测试案例2：阿米替林与丙泊酚 ===');
  const testMedications2 = ['阿米替林', '丙泊酚'];
  
  try {
    const interactions2 = await analyzeDrugInteractions(testMedications2, []);
    console.log('✅ 测试案例2 - 检测到的相互作用数量:', interactions2.length);
    console.log('📋 详细结果:');
    interactions2.forEach((interaction, index) => {
      console.log(`  ${index + 1}. ${interaction.drugs.join(' + ')} - ${interaction.severity} - ${interaction.summary}`);
    });
  } catch (error) {
    console.error('❌ 测试案例2失败:', error);
  }
  
  // 测试案例3：实际患者用药组合
  console.log('\n=== 测试案例3：实际患者用药（包含氟哌噻吨美利曲辛）===');
  const testMedications3 = ['替米沙坦', '阿司匹林', '美多芭', '氟哌嗪吨美利曲'];
  
  try {
    const interactions3 = await analyzeDrugInteractions(testMedications3, []);
    console.log('✅ 测试案例3 - 检测到的相互作用数量:', interactions3.length);
    console.log('📋 详细结果:');
    interactions3.forEach((interaction, index) => {
      console.log(`  ${index + 1}. ${interaction.drugs.join(' + ')} - ${interaction.severity} - ${interaction.summary}`);
    });
  } catch (error) {
    console.error('❌ 测试案例3失败:', error);
  }
  
  console.log('\n🎯 测试完成！');
}

// 测试简单的药物相互作用分析（当前使用的方法）
function testSimpleDrugInteractions() {
  console.log('\n🔍 测试当前的简单药物相互作用分析...');
  
  // 模拟 simple-agents.ts 中的逻辑
  const medications = ['替米沙坦', '阿司匹林', '美多芭', '氟哌嗪吨美利曲'];
  const interactions = [];
  
  // 检查阿司匹林
  const hasAspirin = medications.some(med => 
    med.includes('阿司匹林') || med.includes('aspirin')
  );
  
  if (hasAspirin) {
    interactions.push({
      id: 'aspirin-interaction',
      drugs: medications.filter(med => 
        med.includes('阿司匹林') || med.includes('aspirin')
      ),
      severity: 'major',
      summary: '阿司匹林增加术中出血风险，与麻醉药物存在相互作用',
    });
  }
  
  // 检查氟哌噻吨美利曲辛
  const hasDeanxit = medications.some(med => 
    med.includes('氟哌') || med.includes('美利曲')
  );
  
  console.log('当前系统检测结果:');
  console.log('- 阿司匹林:', hasAspirin ? '✅ 检测到' : '❌ 未检测到');
  console.log('- 氟哌噻吨美利曲辛:', hasDeanxit ? '✅ 检测到' : '❌ 未检测到');
  console.log('- 检测到的相互作用数量:', interactions.length);
  
  return { hasAspirin, hasDeanxit, interactions };
}

// 运行测试
async function runTests() {
  console.log('🚀 开始药物相互作用分析测试...');
  
  // 测试当前系统
  const simpleResults = testSimpleDrugInteractions();
  
  // 测试AI增强分析
  await testDrugInteractionAnalysis();
  
  // 总结测试结果
  console.log('\n📊 测试总结:');
  console.log('当前系统（simple-agents.ts）:');
  console.log('- 只能检测硬编码的药物（阿司匹林等）');
  console.log('- 氟哌噻吨美利曲辛:', simpleResults.hasDeanxit ? '能检测到' : '无法检测');
  console.log('- 不进行AI分析，无法识别与麻醉药物的相互作用');
  console.log('\nAI增强系统（gemini.ts）:');
  console.log('- 能够进行智能分析');
  console.log('- 支持患者用药与麻醉药物的相互作用分析');
  console.log('- 可识别氟哌噻吨美利曲辛等复杂药物');
}

// 执行测试
runTests().catch(console.error);