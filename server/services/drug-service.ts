import { db } from '../db';
import { drugs, type Drug } from '@shared/schema';
import { ilike } from 'drizzle-orm';

export class DrugService {
  // 搜索药物
  static async searchDrugs(query: string): Promise<Drug[]> {
    try {
      const searchTerm = `%${query}%`;
      
      return await db
        .select()
        .from(drugs)
        .where(ilike(drugs.name, searchTerm))
        .limit(20);
    } catch (error) {
      console.error('Error searching drugs:', error);
      return [];
    }
  }

  // 根据名称获取药物详情
  static async getDrugByName(name: string): Promise<Drug | null> {
    try {
      const results = await db
        .select()
        .from(drugs)
        .where(ilike(drugs.name, name))
        .limit(1);
      
      return results[0] || null;
    } catch (error) {
      console.error('Error getting drug by name:', error);
      return null;
    }
  }

  // 初始化药物数据库
  static async initializeDrugDatabase(): Promise<void> {
    try {
      // 简化版本的药物数据
      const basicDrugs = [
        { name: '丙泊酚', aliases: ['Propofol'], category: '麻醉诱导药物', stopGuideline: '术前无需停药' },
        { name: '依托咪酯', aliases: ['Etomidate'], category: '麻醉诱导药物', stopGuideline: '术前无需停药' },
        { name: '咪达唑仑', aliases: ['Midazolam'], category: '麻醉诱导药物', stopGuideline: '术前无需停药' },
        { name: '右美托咪定', aliases: ['Dexmedetomidine'], category: '麻醉辅助药物', stopGuideline: '术前24小时内可使用' },
        { name: '芬太尼', aliases: ['Fentanyl'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
        { name: '瑞芬太尼', aliases: ['Remifentanil'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
        { name: '舒芬太尼', aliases: ['Sufentanil'], category: '阿片类镇痛药', stopGuideline: '术前无需停药' },
        { name: '地佐辛', aliases: ['Dezocine'], category: '阿片类镇痛药', stopGuideline: '术前24小时停药' },
        { name: '氯吗啡酮', aliases: ['Chlormorphinone'], category: '阿片类镇痛药', stopGuideline: '术前48小时停药' },
        { name: '琥珀酰胆碱', aliases: ['Succinylcholine'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
        { name: '阿曲库铵', aliases: ['Atracurium'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
        { name: '维库溴铵', aliases: ['Vecuronium'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
        { name: '罗库溴铵', aliases: ['Rocuronium'], category: '肌肉松弛药', stopGuideline: '术前无需停药' },
        { name: '新斯的明', aliases: ['Neostigmine'], category: '拮抗药物', stopGuideline: '术前无需停药' },
        { name: '阿托品', aliases: ['Atropine'], category: '拮抗药物', stopGuideline: '术前无需停药' },
        { name: '麻黄碱', aliases: ['Ephedrine'], category: '血管活性药物', stopGuideline: '术前无需停药' },
        { name: '去甲肾上腺素', aliases: ['Norepinephrine'], category: '血管活性药物', stopGuideline: '术前无需停药' },
        { name: '去氧肾上腺素', aliases: ['Phenylephrine'], category: '血管活性药物', stopGuideline: '术前无需停药' },
        { name: '阿司匹林', aliases: ['Aspirin'], category: '抗凝抗血小板药物', stopGuideline: '择期手术前7-10天停药' },
        { name: '氯吡格雷', aliases: ['Clopidogrel'], category: '抗凝抗血小板药物', stopGuideline: '择期手术前5-7天停药' },
        { name: '华法林', aliases: ['Warfarin'], category: '抗凝抗血小板药物', stopGuideline: '术前3-5天停药，INR<1.5时可手术' },
        { name: '利伐沙班', aliases: ['Rivaroxaban'], category: '抗凝抗血小板药物', stopGuideline: '术前24-48小时停药' },
        { name: '美托洛尔', aliases: ['Metoprolol'], category: '心血管药物', stopGuideline: '术前不建议停药' },
        { name: '氨氯地平', aliases: ['Amlodipine'], category: '心血管药物', stopGuideline: '术前可继续使用' },
        { name: '地塞米松', aliases: ['Dexamethasone'], category: '激素类药物', stopGuideline: '术前无需停药' },
        { name: '胺碘酮', aliases: ['Amiodarone'], category: '抗心律失常药物', stopGuideline: '术前不建议停药' }
      ];

      // 逐个插入药物数据
      for (const drug of basicDrugs) {
        await db.insert(drugs).values({
          name: drug.name,
          aliases: drug.aliases,
          category: drug.category,
          stopGuideline: drug.stopGuideline
        }).onConflictDoNothing();
      }

      console.log('Drug database initialized successfully');
    } catch (error) {
      console.error('Error initializing drug database:', error);
    }
  }
}