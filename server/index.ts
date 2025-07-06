import express from 'express';
import http from 'http';
import { registerRoutes } from './routes';
//import { seedDatabase } from './db/seed';
import cors from 'cors';
import path from 'path';

const app = express();

// --- Middleware Setup ---
app.use(cors());
app.use(express.json());

// --- Register All Application Routes ---
registerRoutes(app);

// --- Serve Frontend Statically ---
// This ensures that your frontend and backend can run together
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// For any other request, serve the frontend's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- Database Seeding ---
console.log("🌱 开始检查药物数据库...");
seedDatabase().then(() => {
    console.log("✅ 数据库准备就绪");
}).catch(error => {
    console.error("❌ 数据库初始化失败:", error);
});

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Express server is live and serving on port ${PORT}`);
});

export default server;