/**
 * 注入攻击防护测试
 * 测试SQL注入、XSS、命令注入等攻击防护
 */
import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../../../server/utils/sanitize';
import { maliciousPayloads } from '../../helpers/test-data';
import { insertPatientSchema } from '../../../shared/schema';

describe('注入攻击防护测试', () => {
  describe('SQL注入防护', () => {
    it('SQL注入payload被清理', () => {
      const maliciousData = {
        name: maliciousPayloads.sqlInjection,
        age: 45,
      };

      const sanitized = sanitizeInput(maliciousData);

      // 验证危险字符被清理或转义
      expect(sanitized.name).not.toContain("';");
      expect(sanitized.name).not.toContain('DROP');
      expect(sanitized.name).not.toContain('DELETE');
    });

    it('Zod验证拒绝恶意类型', () => {
      const maliciousData = {
        name: "Robert'); DROP TABLE patients; --",
        age: "45 OR 1=1", // age应该是number
        gender: 'male',
        surgeryType: '',
        asaClass: 'I',
        medicalHistory: [],
        medications: [],
        allergies: [],
        vitalSigns: {},
        labResults: {},
        createdBy: 'uuid-test',
      };

      const result = insertPatientSchema.safeParse(maliciousData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('age'))).toBe(true);
      }
    });
  });

  describe('XSS注入防护', () => {
    it('XSS script标签被清理', () => {
      const maliciousData = {
        name: maliciousPayloads.xss,
        displayName: '<script>alert("XSS")</script>',
        medicalHistory: [maliciousPayloads.xssImg],
      };

      const sanitized = sanitizeInput(maliciousData);

      // 验证HTML标签被移除
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.name).not.toContain('</script>');
      expect(sanitized.displayName).not.toContain('<script>');

      // 验证数组中的XSS也被清理
      expect(sanitized.medicalHistory[0]).not.toContain('<img');
      expect(sanitized.medicalHistory[0]).not.toContain('onerror');
    });
  });

  describe('复合攻击场景', () => {
    it('嵌套对象中的注入被清理', () => {
      const nestedMalicious = {
        patient: {
          name: maliciousPayloads.xss,
          history: {
            notes: maliciousPayloads.sqlInjection,
          },
        },
      };

      const sanitized = sanitizeInput(nestedMalicious);

      // 验证嵌套对象也被清理
      expect(sanitized.patient.name).not.toContain('<script>');
      expect(sanitized.patient.history.notes).not.toContain("DROP TABLE");
    });
  });
});
