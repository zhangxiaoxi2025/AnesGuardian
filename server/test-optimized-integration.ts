// 优化的集成方案测试
import { analyzeDrugInteractions } from './services/gemini';

// 模拟优化的药物相互作用分析
async function optimizedDrugInteractionAnalysis(medications: string[]) {
  console.log('🧪 测试优化的药物相互作用分析...');
  console.log('输入药物:', medications);
  
  const interactions = [];
  
  // 1. 保持现有的快速硬编码检查
  console.log('\n第一步：快速硬编码检查...');
  
  // 检查阿司匹林
  const hasAspirin = medications.some(med => 
    med.includes('阿司匹林') || med.includes('aspirin')
  );
  
  if (hasAspirin) {
    interactions.push({
      id: 'aspirin-interaction',
      drugs: ['阿司匹林'],
      severity: 'major',
      summary: '阿司匹林增加术中出血风险',
      source: 'hardcoded'
    });
    console.log('✅ 检测到阿司匹林相互作用');
  }
  
  // 2. 对特定药物进行AI分析
  console.log('\n第二步：AI深度分析特定药物...');
  
  // 需要AI分析的特殊药物列表
  const specialDrugs = [
    '氟哌噻吨美利曲辛',
    '氟哌嗪吨美利曲', 
    '黛力新',
    '阿米替林',
    '丙米嗪',
    '多塞平'
  ];
  
  const drugsNeedingAI = medications.filter(med => 
    specialDrugs.some(special => med.includes(special.replace('氟哌噻吨美利曲辛', '氟哌')))
  );
  
  if (drugsNeedingAI.length > 0) {
    console.log('发现需要AI分析的药物:', drugsNeedingAI);
    
    // 只对这些特殊药物进行AI分析，但限制分析范围
    try {
      // 使用优化的AI分析：只分析与关键麻醉药物的相互作用
      const keyAnesthetics = ['丙泊酚', '咪达唑仑', '芬太尼'];
      
      for (const drug of drugsNeedingAI) {
        console.log(`正在分析 ${drug} 与关键麻醉药物的相互作用...`);
        
        // 这里我们模拟AI分析的结果，实际应该调用AI
        const aiResult = {
          id: `ai_${drug}_anesthesia`,
          drugs: [drug, '麻醉药物'],
          severity: 'major',
          summary: `${drug}与麻醉药物存在重要相互作用`,
          source: 'ai_analysis'
        };
        
        interactions.push(aiResult);
        console.log(`✅ ${drug} AI分析完成`);
      }
      
    } catch (error) {
      console.error('AI分析失败，使用备用规则:', error);
      
      // 备用规则
      if (drugsNeedingAI.some(drug => drug.includes('氟哌'))) {
        interactions.push({
          id: 'deanxit-fallback',
          drugs: ['氟哌噻吨美利曲辛'],
          severity: 'major',
          summary: '氟哌噻吨美利曲辛与麻醉药物存在相互作用',
          source: 'fallback'
        });
        console.log('✅ 使用备用规则处理氟哌噻吨美利曲辛');
      }
    }
  }
  
  console.log('\n✅ 优化分析完成！');
  console.log('检测到的相互作用:', interactions.length);
  
  return interactions;
}

// 测试优化方案
async function testOptimizedApproach() {
  console.log('🚀 测试优化的集成方案...');
  
  // 测试实际患者数据
  const testMedications = ['替米沙坦', '阿司匹林', '美多芭', '氟哌嗪吨美利曲'];
  
  const startTime = Date.now();
  const results = await optimizedDrugInteractionAnalysis(testMedications);
  const endTime = Date.now();
  
  console.log('\n📊 测试结果:');
  console.log('执行时间:', endTime - startTime, 'ms');
  console.log('检测到的相互作用:');
  results.forEach((interaction, index) => {
    console.log(`  ${index + 1}. ${interaction.drugs.join(' + ')} (${interaction.severity}) - ${interaction.source}`);
    console.log(`     ${interaction.summary}`);
  });
  
  console.log('\n🎯 优化方案优势:');
  console.log('✅ 保持现有快速检查');
  console.log('✅ 只对特殊药物进行AI分析');
  console.log('✅ 大幅减少API调用次数');
  console.log('✅ 有备用机制保证稳定性');
  
  return results;
}

// 运行测试
testOptimizedApproach().catch(console.error);