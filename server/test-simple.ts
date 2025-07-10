// 快速测试：验证AI分析函数的可行性
import { analyzeDrugInteractions } from './services/gemini';

async function quickTest() {
  console.log('🧪 快速测试：验证AI分析函数...');
  
  try {
    // 测试单个药物相互作用（较快）
    const testMedications = ['氟哌噻吨美利曲辛'];
    const interactions = await analyzeDrugInteractions(testMedications, []);
    
    console.log('✅ AI分析函数可正常调用');
    console.log('📋 分析结果数量:', interactions.length);
    
    if (interactions.length > 0) {
      console.log('📋 示例结果:');
      interactions.slice(0, 2).forEach((interaction, index) => {
        console.log(`  ${index + 1}. ${interaction.drugs.join(' + ')}`);
        console.log(`     严重程度: ${interaction.severity}`);
        console.log(`     摘要: ${interaction.summary}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ AI分析函数测试失败:', error);
    return false;
  }
}

// 测试当前系统能否检测到氟哌噻吨美利曲辛
function testCurrentSystem() {
  console.log('\n🔍 测试当前系统检测能力...');
  
  const medications = ['替米沙坦', '阿司匹林', '美多芭', '氟哌嗪吨美利曲'];
  
  // 当前系统的检测逻辑
  const hasDeanxit = medications.some(med => 
    med.includes('氟哌') || med.includes('美利曲')
  );
  
  console.log('当前系统检测结果:');
  console.log('- 能检测到氟哌噻吨美利曲辛:', hasDeanxit ? '✅ 是' : '❌ 否');
  console.log('- 但不会进行AI分析');
  
  return hasDeanxit;
}

// 验证集成方案的可行性
async function testIntegrationFeasibility() {
  console.log('\n🎯 验证集成方案可行性...');
  
  // 1. 验证AI函数是否可用
  const aiWorking = await quickTest();
  
  // 2. 验证当前系统能否检测特定药物
  const canDetectDeanxit = testCurrentSystem();
  
  console.log('\n📊 可行性评估:');
  console.log('✅ AI分析函数正常工作:', aiWorking ? '是' : '否');
  console.log('✅ 当前系统能检测氟哌噻吨美利曲辛:', canDetectDeanxit ? '是' : '否');
  
  if (aiWorking && canDetectDeanxit) {
    console.log('\n🚀 集成方案可行！');
    console.log('建议实施步骤:');
    console.log('1. 在 simple-agents.ts 的 generateDrugInteractions 方法中');
    console.log('2. 添加对氟哌噻吨美利曲辛的检测');
    console.log('3. 当检测到时，调用 AI 分析函数');
    console.log('4. 将 AI 分析结果合并到现有的相互作用列表中');
  } else {
    console.log('\n⚠️ 集成方案存在问题，需要进一步调试');
  }
  
  return aiWorking && canDetectDeanxit;
}

// 运行测试
testIntegrationFeasibility().catch(console.error);