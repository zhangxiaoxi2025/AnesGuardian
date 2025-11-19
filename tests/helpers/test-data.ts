/**
 * 测试数据生成器
 */
import type { User, Patient } from '../../server/types';

/**
 * 测试用户数据
 */
export const testUsers = {
  admin: {
    id: 'uuid-admin-123',
    email: 'admin@test.com',
    role: 'admin' as const,
    organizationId: null,
    displayName: 'Admin User',
  },
  doctor1: {
    id: 'uuid-doctor1-123',
    email: 'doctor1@test.com',
    role: 'doctor' as const,
    organizationId: 1,
    displayName: 'Dr. Zhang',
  },
  doctor2: {
    id: 'uuid-doctor2-123',
    email: 'doctor2@test.com',
    role: 'doctor' as const,
    organizationId: 2,
    displayName: 'Dr. Wang',
  },
  nurse1: {
    id: 'uuid-nurse1-123',
    email: 'nurse1@test.com',
    role: 'nurse' as const,
    organizationId: 1,
    displayName: 'Nurse Li',
  },
  nurse2: {
    id: 'uuid-nurse2-123',
    email: 'nurse2@test.com',
    role: 'nurse' as const,
    organizationId: 2,
    displayName: 'Nurse Chen',
  },
  user1: {
    id: 'uuid-user1-123',
    email: 'user1@test.com',
    role: 'user' as const,
    organizationId: null,
    displayName: 'Regular User',
  },
  guest: {
    id: 'uuid-guest-123',
    email: 'guest@test.com',
    role: 'guest' as const,
    organizationId: null,
    displayName: 'Guest User',
  },
};

/**
 * 测试患者数据
 */
export const testPatients = {
  // doctor1在组织1创建的患者
  patient1: {
    id: 1,
    name: '张三',
    age: 45,
    gender: 'male',
    surgeryType: '阑尾切除术',
    asaClass: 'II',
    createdBy: testUsers.doctor1.id,
    organizationId: 1,
    sharedWith: [],
    medicalHistory: ['高血压'],
    medications: ['降压药'],
    allergies: [],
    vitalSigns: { bp: '140/90', hr: 80 },
    labResults: {},
    createdAt: new Date('2024-01-01'),
  },
  // doctor2在组织2创建的患者
  patient2: {
    id: 2,
    name: '李四',
    age: 60,
    gender: 'female',
    surgeryType: '胆囊切除术',
    asaClass: 'III',
    createdBy: testUsers.doctor2.id,
    organizationId: 2,
    sharedWith: [],
    medicalHistory: ['糖尿病', '冠心病'],
    medications: ['胰岛素', '阿司匹林'],
    allergies: ['青霉素'],
    vitalSigns: { bp: '150/95', hr: 85 },
    labResults: {},
    createdAt: new Date('2024-01-02'),
  },
  // doctor1创建并共享给user1的患者
  patient3: {
    id: 3,
    name: '王五',
    age: 35,
    gender: 'male',
    surgeryType: '疝气修补术',
    asaClass: 'I',
    createdBy: testUsers.doctor1.id,
    organizationId: 1,
    sharedWith: [testUsers.user1.id],
    medicalHistory: [],
    medications: [],
    allergies: [],
    vitalSigns: { bp: '120/80', hr: 72 },
    labResults: {},
    createdAt: new Date('2024-01-03'),
  },
  // doctor1创建的个人患者(无组织)
  patient4: {
    id: 4,
    name: '赵六',
    age: 28,
    gender: 'female',
    surgeryType: '剖腹产',
    asaClass: 'I',
    createdBy: testUsers.doctor1.id,
    organizationId: null,
    sharedWith: [],
    medicalHistory: [],
    medications: [],
    allergies: [],
    vitalSigns: { bp: '110/70', hr: 68 },
    labResults: {},
    createdAt: new Date('2024-01-04'),
  },
};

/**
 * 生成测试JWT Token
 */
export function generateTestToken(userId: string): string {
  return `test-token-${userId}`;
}

/**
 * 生成恶意Payload
 */
export const maliciousPayloads = {
  sqlInjection: "'; DROP TABLE patients; --",
  xss: "<script>alert('XSS')</script>",
  xssImg: "<img src=x onerror=alert('XSS')>",
  cmdInjection: "; rm -rf /",
  pathTraversal: "../../etc/passwd",
  noSqlInjection: { $ne: null },
  jsonInjection: '{"__proto__": {"isAdmin": true}}',
};
