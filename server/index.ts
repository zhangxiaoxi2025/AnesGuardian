import 'dotenv/config';
import express from 'express';
import { registerRoutes } from './routes';
import { seedDrugs } from './seed';
import { setupVite, serveStatic } from './vite';

// Environment validation function
function validateEnvironmentVariables() {
  const requiredVars = {
    'GEMINI_API_KEY': 'Google Gemini AI API key is required for medical analysis',
    'DATABASE_URL': 'PostgreSQL database connection string is required'
  };

  const optionalVars = {
    'NODE_ENV': 'development',
    'PORT': '5000',
    'SESSION_SECRET': 'A strong session secret is recommended for production',
    'LOG_LEVEL': 'info'
  };

  console.log('🔐 开始验证环境变量配置...');

  // Check required variables
  const missingRequired = [];
  for (const [varName, description] of Object.entries(requiredVars)) {
    if (!process.env[varName]) {
      missingRequired.push(`${varName}: ${description}`);
    }
  }

  if (missingRequired.length > 0) {
    console.error('❌ 缺少必需的环境变量:');
    missingRequired.forEach(missing => console.error(`   - ${missing}`));
    console.error('\n💡 请确保您的 .env 文件包含所有必需的配置。');
    console.error('   参考 .env.example 文件了解完整的配置选项。');
    process.exit(1);
  }

  // Check and warn about missing optional variables
  const missingOptional = [];
  for (const [varName, defaultValue] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      missingOptional.push(`${varName} (默认: ${defaultValue})`);
    }
  }

  if (missingOptional.length > 0) {
    console.warn('⚠️  使用默认值的可选环境变量:');
    missingOptional.forEach(missing => console.warn(`   - ${missing}`));
  }

  // Production environment specific checks
  if (process.env.NODE_ENV === 'production') {
    const productionRequired = ['SESSION_SECRET'];
    const missingProduction = productionRequired.filter(varName => !process.env[varName]);
    
    if (missingProduction.length > 0) {
      console.error('❌ 生产环境缺少必需的环境变量:');
      missingProduction.forEach(missing => console.error(`   - ${missing}`));
      console.error('\n💡 生产环境必须设置会话密钥以确保安全性。');
      process.exit(1);
    }
  }

  console.log('✅ 环境变量验证通过');
  
  // Log configuration summary (without exposing secrets)
  console.log('📋 应用配置:');
  console.log(`   - 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - 端口: ${process.env.PORT || '5000'}`);
  console.log(`   - 日志级别: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`   - Gemini API: ${process.env.GEMINI_API_KEY ? '已配置' : '未配置'}`);
  console.log(`   - 数据库: ${process.env.DATABASE_URL ? '已配置' : '未配置'}`);
  console.log(`   - 会话密钥: ${process.env.SESSION_SECRET ? '已配置' : '未配置'}`);
}

// Validate environment variables before starting the application
validateEnvironmentVariables();

const app = express();

// Middleware
app.use(express.json());

// Database seeding
console.log("🌱 开始检查药物数据库...");
seedDrugs().then(() => {
    console.log("📋 数据库已包含药物数据，跳过种子填充");
}).catch(error => {
    console.error("❌ 数据库初始化失败:", error);
});

// Server startup
const PORT = parseInt(process.env.PORT || '5000', 10);
registerRoutes(app).then(async server => {
    // Setup Vite in development
    if (process.env.NODE_ENV !== 'production') {
        await setupVite(app, server);
    } else {
        serveStatic(app);
    }
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${PORT}`);
    });
}).catch(error => {
    console.error("❌ 服务器启动失败:", error);
});