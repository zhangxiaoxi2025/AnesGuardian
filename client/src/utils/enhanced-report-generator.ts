import type { Patient, Assessment } from '@shared/schema';

// Risk calculation utilities - same as in component
const calculateGoldmanScore = (patient: Patient, riskFactors: any[]) => {
  let score = 0;
  
  if (patient.age >= 70) score += 5;
  else if (patient.age >= 60) score += 2;
  
  const history = patient.medicalHistory?.join(' ').toLowerCase() || '';
  if (history.includes('心') || history.includes('冠心病') || history.includes('心梗')) score += 10;
  if (history.includes('高血压')) score += 5;
  if (history.includes('糖尿病')) score += 5;
  if (history.includes('脑梗') || history.includes('脑血管')) score += 5;
  
  return Math.min(score, 25);
};

const calculateCapriniScore = (patient: Patient) => {
  let score = 0;
  
  if (patient.age >= 75) score += 4;
  else if (patient.age >= 60) score += 2;
  else if (patient.age >= 40) score += 1;
  
  if (patient.gender === 'female') score += 1;
  if (patient.surgeryType?.includes('腹腔镜')) score += 2;
  if (patient.surgeryType?.includes('妇科')) score += 1;
  
  const history = patient.medicalHistory?.join(' ').toLowerCase() || '';
  if (history.includes('血栓')) score += 3;
  if (history.includes('心') || history.includes('心血管')) score += 1;
  
  const medications = patient.medications?.join(' ').toLowerCase() || '';
  if (medications.includes('阿司匹林') || medications.includes('华法林')) score += 1;
  
  return score;
};

const calculateApfelScore = (patient: Patient) => {
  let score = 0;
  
  if (patient.gender === 'female') score += 1;
  if (patient.age < 50) score += 1;
  if (patient.surgeryType?.includes('腹腔镜') || patient.surgeryType?.includes('妇科')) score += 1;
  score += 1; // Assume baseline risk
  
  return score;
};

const getRiskLevel = (score: number, thresholds: number[]) => {
  if (score >= thresholds[1]) return 'high';
  if (score >= thresholds[0]) return 'medium';
  return 'low';
};

export const generateEnhancedReportHTML = (patient: Patient, assessment: Assessment): string => {
  const goldmanScore = calculateGoldmanScore(patient, assessment.riskFactors || []);
  const capriniScore = calculateCapriniScore(patient);
  const apfelScore = calculateApfelScore(patient);
  
  const cardiovascularRisk = getRiskLevel(goldmanScore, [10, 20]);
  const thrombosisRisk = getRiskLevel(capriniScore, [3, 6]);
  const ponvRisk = getRiskLevel(apfelScore, [2, 3]);

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'high': return '高风险';
      case 'medium': return '中等风险';
      case 'low': return '低风险';
      default: return '未知风险';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'major': return '严重';
      case 'moderate': return '中等';
      case 'minor': return '轻微';
      default: return '未知';
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>围术期风险评估报告 - ${patient.name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 25px;
          margin-bottom: 30px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          padding: 25px;
          border-radius: 12px;
        }
        
        .header h1 {
          font-size: 28px;
          color: #1e40af;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .header .subtitle {
          color: #3730a3;
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .header .timestamp {
          color: #6b7280;
          font-size: 12px;
        }
        
        .section {
          margin-bottom: 25px;
          break-inside: avoid;
        }
        
        .section-header {
          background: #f8fafc;
          border-left: 4px solid #3b82f6;
          padding: 12px 15px;
          margin-bottom: 15px;
          border-radius: 6px;
        }
        
        .section-title {
          color: #1f2937;
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        
        .patient-info {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .info-label {
          color: #6b7280;
          font-weight: 500;
        }
        
        .info-value {
          font-weight: 600;
          color: #111827;
        }
        
        .risk-scores {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .risk-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          background: white;
        }
        
        .risk-card.high {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        
        .risk-card.medium {
          background: #fffbeb;
          border-color: #fcd34d;
        }
        
        .risk-card.low {
          background: #f0fdf4;
          border-color: #86efac;
        }
        
        .risk-score {
          font-size: 24px;
          font-weight: bold;
          margin: 8px 0;
        }
        
        .risk-card.high .risk-score {
          color: #dc2626;
        }
        
        .risk-card.medium .risk-score {
          color: #d97706;
        }
        
        .risk-card.low .risk-score {
          color: #059669;
        }
        
        .risk-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        
        .risk-type {
          font-size: 12px;
          color: #6b7280;
        }
        
        .overall-risk {
          background: linear-gradient(135deg, #f3e8ff 0%, #e879f9 100%);
          border: 1px solid #d8b4fe;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin-bottom: 25px;
        }
        
        .overall-risk h3 {
          font-size: 22px;
          color: #7c3aed;
          margin-bottom: 8px;
        }
        
        .overall-risk .risk-level {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .overall-risk .risk-level.high {
          color: #dc2626;
        }
        
        .overall-risk .risk-level.medium {
          color: #d97706;
        }
        
        .overall-risk .risk-level.low {
          color: #059669;
        }
        
        .risk-factors {
          margin-bottom: 25px;
        }
        
        .risk-factor {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 12px;
          border-left: 4px solid #3b82f6;
        }
        
        .risk-factor.high {
          border-left-color: #dc2626;
          background: #fef2f2;
        }
        
        .risk-factor.medium {
          border-left-color: #d97706;
          background: #fffbeb;
        }
        
        .risk-factor.low {
          border-left-color: #059669;
          background: #f0fdf4;
        }
        
        .risk-factor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .risk-badge {
          background: #3b82f6;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .risk-badge.high {
          background: #dc2626;
        }
        
        .risk-badge.medium {
          background: #d97706;
        }
        
        .risk-badge.low {
          background: #059669;
        }
        
        .drug-interactions {
          margin-bottom: 25px;
        }
        
        .drug-interaction {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 12px;
          border-left: 4px solid #f59e0b;
        }
        
        .drug-interaction.major {
          border-left-color: #dc2626;
          background: #fef2f2;
        }
        
        .drug-interaction.moderate {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }
        
        .drug-interaction.minor {
          border-left-color: #3b82f6;
          background: #eff6ff;
        }
        
        .drug-names {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .drug-description {
          color: #4b5563;
          margin-bottom: 10px;
          line-height: 1.5;
        }
        
        .recommendations {
          margin-top: 10px;
        }
        
        .recommendations-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .recommendation-list {
          list-style: none;
          padding: 0;
        }
        
        .recommendation-list li {
          padding: 3px 0;
          padding-left: 15px;
          position: relative;
          font-size: 14px;
          color: #4b5563;
        }
        
        .recommendation-list li:before {
          content: "★";
          color: #f59e0b;
          position: absolute;
          left: 0;
        }
        
        .clinical-guidelines {
          margin-bottom: 25px;
        }
        
        .guideline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }
        
        .guideline {
          background: white;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          padding: 15px;
        }
        
        .guideline-title {
          color: #1e40af;
          font-weight: 600;
          margin-bottom: 5px;
          font-size: 16px;
        }
        
        .guideline-meta {
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 8px;
        }
        
        .guideline-summary {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .management-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .management-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
        }
        
        .management-section h4 {
          color: #1f2937;
          margin-bottom: 10px;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .management-section.preop h4 {
          color: #059669;
        }
        
        .management-section.intraop h4 {
          color: #3b82f6;
        }
        
        .management-section.postop h4 {
          color: #7c3aed;
        }
        
        .management-section .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .management-section.preop .dot {
          background: #059669;
        }
        
        .management-section.intraop .dot {
          background: #3b82f6;
        }
        
        .management-section.postop .dot {
          background: #7c3aed;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
          color: #6b7280;
          font-size: 12px;
          border: 1px solid #e5e7eb;
        }
        
        .badge-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }
        
        .badge {
          background: #f3f4f6;
          color: #374151;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          border: 1px solid #d1d5db;
        }
        
        @media print {
          body {
            padding: 0;
            font-size: 12px;
          }
          
          .section {
            page-break-inside: avoid;
          }
          
          .header {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>围术期风险评估报告</h1>
        <div class="subtitle">基于多智能体AI协作分析生成</div>
        <div class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
      </div>

      <!-- Patient Information -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">患者基本信息</h2>
        </div>
        <div class="patient-info">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">姓名:</span>
              <span class="info-value">${patient.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">年龄:</span>
              <span class="info-value">${patient.age}岁</span>
            </div>
            <div class="info-item">
              <span class="info-label">性别:</span>
              <span class="info-value">${patient.gender === 'female' ? '女性' : '男性'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">手术类型:</span>
              <span class="info-value">${patient.surgeryType}</span>
            </div>
            <div class="info-item">
              <span class="info-label">ASA分级:</span>
              <span class="info-value">${patient.asaClass}</span>
            </div>
            ${patient.vitalSigns?.bmi ? `
            <div class="info-item">
              <span class="info-label">BMI:</span>
              <span class="info-value">${patient.vitalSigns.bmi}</span>
            </div>
            ` : ''}
          </div>
          ${patient.medicalHistory && patient.medicalHistory.length > 0 ? `
          <div style="margin-top: 15px;">
            <div class="info-label">既往病史:</div>
            <div class="badge-list">
              ${patient.medicalHistory.map(history => `<span class="badge">${history}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          ${patient.medications && patient.medications.length > 0 ? `
          <div style="margin-top: 15px;">
            <div class="info-label">当前用药:</div>
            <div class="badge-list">
              ${patient.medications.map(med => `<span class="badge">${med}</span>`).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Risk Assessment Scores -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">详细风险评估</h2>
        </div>
        <div class="risk-scores">
          <div class="risk-card ${cardiovascularRisk}">
            <div class="risk-label">心血管风险</div>
            <div class="risk-score">${goldmanScore}/25</div>
            <div class="risk-type">Goldman评分</div>
            <div style="margin-top: 8px; font-weight: 600;">${getRiskLevelText(cardiovascularRisk)}</div>
          </div>
          <div class="risk-card ${thrombosisRisk}">
            <div class="risk-label">血栓风险</div>
            <div class="risk-score">${capriniScore}</div>
            <div class="risk-type">Caprini评分</div>
            <div style="margin-top: 8px; font-weight: 600;">${getRiskLevelText(thrombosisRisk)}</div>
          </div>
          <div class="risk-card ${ponvRisk}">
            <div class="risk-label">PONV风险</div>
            <div class="risk-score">${apfelScore}/4</div>
            <div class="risk-type">Apfel评分</div>
            <div style="margin-top: 8px; font-weight: 600;">${getRiskLevelText(ponvRisk)}</div>
          </div>
        </div>
      </div>

      <!-- Overall Risk Assessment -->
      <div class="section">
        <div class="overall-risk">
          <h3>综合风险评估结果</h3>
          <div class="risk-level ${assessment.overallRisk}">
            ${getRiskLevelText(assessment.overallRisk)}
          </div>
          <div style="color: #6b7280; font-size: 14px;">
            基于多维度评估的综合结果 • 风险因素: ${assessment.riskFactors?.length || 0}项
          </div>
        </div>
      </div>

      <!-- Risk Factors Detail -->
      ${assessment.riskFactors && assessment.riskFactors.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">风险因素详情</h2>
        </div>
        <div class="risk-factors">
          ${assessment.riskFactors.map(factor => `
          <div class="risk-factor ${factor.level}">
            <div class="risk-factor-header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="risk-badge ${factor.level}">
                  ${factor.type} - ${getRiskLevelText(factor.level)}
                </span>
                <span style="font-size: 14px; color: #6b7280;">评分: ${factor.score}</span>
              </div>
            </div>
            <div style="color: #4b5563; margin-bottom: 10px;">${factor.description}</div>
            ${factor.recommendations && factor.recommendations.length > 0 ? `
            <div class="recommendations">
              <div class="recommendations-title">管理建议:</div>
              <ul class="recommendation-list">
                ${factor.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Drug Interactions -->
      ${assessment.drugInteractions && assessment.drugInteractions.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">药物相互作用警示</h2>
        </div>
        <div class="drug-interactions">
          ${assessment.drugInteractions.map(interaction => `
          <div class="drug-interaction ${interaction.severity}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div class="drug-names">${interaction.drugs?.join(' + ')}</div>
              <span class="risk-badge ${interaction.severity}">
                ${getSeverityText(interaction.severity)}警示
              </span>
            </div>
            <div class="drug-description">${interaction.description}</div>
            ${interaction.recommendations && interaction.recommendations.length > 0 ? `
            <div class="recommendations">
              <div class="recommendations-title">处理建议:</div>
              <ul class="recommendation-list">
                ${interaction.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Clinical Guidelines -->
      ${assessment.clinicalGuidelines && assessment.clinicalGuidelines.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">匹配的临床指南</h2>
        </div>
        <div class="clinical-guidelines">
          <div class="guideline-grid">
            ${assessment.clinicalGuidelines.map(guideline => `
            <div class="guideline">
              <div class="guideline-title">${guideline.title}</div>
              <div class="guideline-meta">${guideline.organization} • ${guideline.year}年 • ${guideline.relevance === 'high' ? '高相关' : guideline.relevance === 'medium' ? '中相关' : '低相关'}</div>
              <div class="guideline-summary">${guideline.summary}</div>
            </div>
            `).join('')}
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Clinical Management Recommendations -->
      ${assessment.recommendations && assessment.recommendations.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">临床管理建议</h2>
        </div>
        <div class="management-sections">
          <div class="management-section preop">
            <h4><span class="dot"></span>术前准备</h4>
            <ul class="recommendation-list">
              ${assessment.recommendations.filter(rec => 
                rec.includes('术前') || rec.includes('停药') || rec.includes('评估')
              ).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          <div class="management-section intraop">
            <h4><span class="dot"></span>术中监护</h4>
            <ul class="recommendation-list">
              ${assessment.recommendations.filter(rec => 
                rec.includes('术中') || rec.includes('监测') || rec.includes('监护')
              ).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          <div class="management-section postop">
            <h4><span class="dot"></span>术后管理</h4>
            <ul class="recommendation-list">
              ${assessment.recommendations.filter(rec => 
                rec.includes('术后') || rec.includes('准备') || rec.includes('止血')
              ).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Footer -->
      <div class="footer">
        <div>本报告由麻醉守护神AI系统生成，仅供临床参考</div>
        <div>最终决策应结合临床医生专业判断 • 报告生成时间: ${new Date().toLocaleString('zh-CN')}</div>
      </div>
    </body>
    </html>
  `;
};