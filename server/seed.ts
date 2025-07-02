import { db } from './db';
import { drugs } from '@shared/schema';
import { eq } from 'drizzle-orm';

const drugData = [
  // 麻醉诱导药物
  { name: '丙泊酚', aliases: ['异丙酚', 'Propofol'], category: '静脉麻醉药', stopGuideline: '术前无需停药' },
  { name: '依托咪酯', aliases: ['Etomidate'], category: '静脉麻醉药', stopGuideline: '术前无需停药' },
  { name: '咪达唑仑', aliases: ['安定', 'Midazolam'], category: '镇静药', stopGuideline: '术前无需停药' },
  { name: '右美托咪定', aliases: ['Dexmedetomidine'], category: '镇静药', stopGuideline: '术前无需停药' },
  
  // 阿片类镇痛药
  { name: '芬太尼', aliases: ['Fentanyl'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
  { name: '瑞芬太尼', aliases: ['Remifentanil'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
  { name: '舒芬太尼', aliases: ['Sufentanil'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
  { name: '地佐辛', aliases: ['Dezocine'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
  { name: '氯吗啡酮', aliases: ['Nalbuphine'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
  { name: '吗啡', aliases: ['Morphine'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
  
  // 肌肉松弛药
  { name: '琥珀酰胆碱', aliases: ['司可林', 'Succinylcholine'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
  { name: '阿曲库铵', aliases: ['Atracurium'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
  { name: '维库溴铵', aliases: ['Vecuronium'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
  { name: '罗库溴铵', aliases: ['Rocuronium'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
  
  // 拮抗药物
  { name: '新斯的明', aliases: ['Neostigmine'], category: '胆碱酯酶抑制剂', stopGuideline: '术前无需停药' },
  { name: '阿托品', aliases: ['Atropine'], category: '抗胆碱药', stopGuideline: '术前无需停药' },
  { name: '纳洛酮', aliases: ['Naloxone'], category: '阿片拮抗剂', stopGuideline: '术前无需停药' },
  
  // 血管活性药物
  { name: '麻黄碱', aliases: ['Ephedrine'], category: '血管活性药', stopGuideline: '术前无需停药' },
  { name: '去甲肾上腺素', aliases: ['Norepinephrine'], category: '血管活性药', stopGuideline: '术前无需停药' },
  { name: '去氧肾上腺素', aliases: ['Phenylephrine'], category: '血管活性药', stopGuideline: '术前无需停药' },
  { name: '肾上腺素', aliases: ['Epinephrine'], category: '血管活性药', stopGuideline: '术前无需停药' },
  { name: '多巴胺', aliases: ['Dopamine'], category: '血管活性药', stopGuideline: '术前无需停药' },
  
  // 抗凝抗血小板药物
  { name: '阿司匹林', aliases: ['Aspirin'], category: '抗血小板药', stopGuideline: '择期手术前7-10天停药' },
  { name: '氯吡格雷', aliases: ['Clopidogrel'], category: '抗血小板药', stopGuideline: '择期手术前5-7天停药' },
  { name: '华法林', aliases: ['Warfarin'], category: '抗凝药', stopGuideline: '术前5天停药，INR<1.5' },
  { name: '利伐沙班', aliases: ['Rivaroxaban'], category: '抗凝药', stopGuideline: '术前24-48小时停药' },
  { name: '达比加群', aliases: ['Dabigatran'], category: '抗凝药', stopGuideline: '术前1-2天停药' },
  { name: '阿哌沙班', aliases: ['Apixaban'], category: '抗凝药', stopGuideline: '术前24-48小时停药' },
  
  // 心血管药物
  { name: '美托洛尔', aliases: ['Metoprolol'], category: 'β受体阻滞剂', stopGuideline: '术前可继续使用' },
  { name: '阿托伐他汀', aliases: ['Atorvastatin'], category: '他汀类', stopGuideline: '术前可继续使用' },
  { name: '氨氯地平', aliases: ['Amlodipine'], category: '钙离子拮抗剂', stopGuideline: '术前可继续使用' },
  { name: '硝苯地平', aliases: ['Nifedipine'], category: '钙离子拮抗剂', stopGuideline: '术前可继续使用' },
  { name: '厄贝沙坦', aliases: ['Irbesartan'], category: 'ARB', stopGuideline: '术前可继续使用' },
  { name: '卡托普利', aliases: ['Captopril'], category: 'ACEI', stopGuideline: '术前可继续使用' },
  
  // 消化系统药物
  { name: '奥美拉唑', aliases: ['Omeprazole'], category: '质子泵抑制剂', stopGuideline: '术前可继续使用' },
  { name: '兰索拉唑', aliases: ['Lansoprazole'], category: '质子泵抑制剂', stopGuideline: '术前可继续使用' },
  { name: '二甲双胍', aliases: ['Metformin'], category: '降糖药', stopGuideline: '术前24-48小时停药' },
  { name: '格列齐特', aliases: ['Gliclazide'], category: '磺脲类降糖药', stopGuideline: '术前24小时停药' },
  { name: '胰岛素', aliases: ['Insulin'], category: '降糖药', stopGuideline: '术前调整剂量，勿停药' },
  
  // 激素类药物
  { name: '地塞米松', aliases: ['Dexamethasone'], category: '糖皮质激素', stopGuideline: '术前无需停药' },
  { name: '甲强龙', aliases: ['Methylprednisolone'], category: '糖皮质激素', stopGuideline: '术前无需停药' },
  { name: '泼尼松', aliases: ['Prednisone'], category: '糖皮质激素', stopGuideline: '术前无需停药' },
  
  // 利尿剂
  { name: '呋塞米', aliases: ['Furosemide'], category: '利尿剂', stopGuideline: '术前可继续使用' },
  { name: '氢氯噻嗪', aliases: ['Hydrochlorothiazide'], category: '利尿剂', stopGuideline: '术前可继续使用' },
  
  // 电解质药物
  { name: '硫酸镁', aliases: ['Magnesium Sulfate'], category: '电解质', stopGuideline: '术前无需停药' },
  { name: '氯化钾', aliases: ['Potassium Chloride'], category: '电解质', stopGuideline: '术前无需停药' },
  { name: '碳酸氢钠', aliases: ['Sodium Bicarbonate'], category: '电解质', stopGuideline: '术前无需停药' },
  { name: '氯化钙', aliases: ['Calcium Chloride'], category: '电解质', stopGuideline: '术前无需停药' },
  
  // 抗心律失常药物
  { name: '胺碘酮', aliases: ['Amiodarone'], category: '抗心律失常药', stopGuideline: '术前可继续使用' },
  { name: '利多卡因', aliases: ['Lidocaine'], category: '抗心律失常药', stopGuideline: '术前无需停药' },
  
  // 抗生素
  { name: '头孢曲松', aliases: ['Ceftriaxone'], category: '抗生素', stopGuideline: '术前无需停药' },
  { name: '青霉素', aliases: ['Penicillin'], category: '抗生素', stopGuideline: '术前无需停药' },
  { name: '万古霉素', aliases: ['Vancomycin'], category: '抗生素', stopGuideline: '术前无需停药' },
];

export async function seedDrugs() {
  try {
    console.log('🌱 开始检查药物数据库...');
    
    // 检查数据库是否已有数据
    const existingDrugs = await db.select().from(drugs).limit(1);
    
    if (existingDrugs.length > 0) {
      console.log('📋 数据库已包含药物数据，跳过种子填充');
      return;
    }
    
    console.log('📋 数据库为空，开始填充药物数据...');
    
    // 批量插入药物数据
    const insertedDrugs = await db.insert(drugs).values(drugData).returning();
    
    console.log(`✅ 成功插入 ${insertedDrugs.length} 条药物数据`);
    console.log('🎯 药物数据库初始化完成');
    
    // 打印前几条插入的数据用于验证
    console.log('📊 插入的药物样本:');
    insertedDrugs.slice(0, 5).forEach(drug => {
      console.log(`   - ${drug.name} (${drug.category}): ${drug.stopGuideline}`);
    });
    
  } catch (error) {
    console.error('❌ 药物数据库种子填充失败:', error);
    throw error;
  }
}