import express from 'express';
import { registerRoutes } from './routes';
import { seedDrugs } from './seed';
import { setupVite, serveStatic } from './vite';

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
const PORT = process.env.PORT || 5000;
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