import { db } from '../server/db';
import { drugs } from '../shared/schema';
import { coredrugs } from './drug-data';

async function importDrugs() {
  console.log('🚀 开始导入核心药物数据...');
  console.log(`📊 准备导入 ${coredrugs.length} 条药物记录`);

  try {
    // 先清空现有数据（可选）
    console.log('🧹 清空现有药物数据...');
    await db.delete(drugs);

    // 批量插入新数据
    console.log('📥 开始批量插入药物数据...');
    
    const insertedDrugs = await db
      .insert(drugs)
      .values(
        coredrugs.map((drug) => ({
          name: drug.name,
          aliases: drug.aliases,
          category: drug.category,
          stopGuideline: drug.stop_guideline,
          contraindications: [],
          sideEffects: [],
        }))
      )
      .returning();

    console.log(`✅ 成功导入 ${insertedDrugs.length} 条药物记录`);
    
    // 按分类统计
    const categories = coredrugs.reduce((acc: Record<string, number>, drug) => {
      acc[drug.category] = (acc[drug.category] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 按分类统计:');
    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} 种药物`);
      });

    console.log('\n🎉 药物数据导入完成！');
    
  } catch (error) {
    console.error('❌ 药物数据导入失败:', error);
    throw error;
  }
}

// 直接运行导入
importDrugs()
  .then(() => {
    console.log('导入完成，程序退出');
    process.exit(0);
  })
  .catch((error) => {
    console.error('导入失败:', error);
    process.exit(1);
  });

export { importDrugs };