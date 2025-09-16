
const http = require('http');
const port = process.env.PORT || 5000;

// Serveur keep-alive simple pour UptimeRobot
const server = http.createServer((req, res) => {
    // Headers CORS pour éviter les problèmes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/health' || req.url === '/' || req.url === '/status') {
        // Status de santé pour UptimeRobot
        const status = {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: 'Friction Ultimate Bot',
            version: '1.0.0',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    } else {
        // Page d'accueil simple
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Friction Ultimate Bot - Status</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: #ffd700; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { background: #16213e; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .alive { color: #00ff00; font-size: 24px; font-weight: bold; }
        .info { color: #cccccc; margin: 10px 0; }
        .logo { font-size: 48px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">⚔️</div>
        <h1>FRICTION ULTIMATE BOT</h1>
        <div class="status">
            <div class="alive">🟢 SYSTÈME ACTIF</div>
            <div class="info">Bot WhatsApp RPG en fonctionnement</div>
            <div class="info">Uptime: ${Math.floor(process.uptime())} secondes</div>
            <div class="info">Mémoire: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB</div>
        </div>
        <div style="margin-top: 30px; color: #666;">
            <p>🔗 Endpoints de monitoring:</p>
            <p><code>/health</code> - Status JSON</p>
            <p><code>/status</code> - Status JSON</p>
        </div>
    </div>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(html);
    }
});

// Démarrer le serveur keep-alive
server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Serveur keep-alive démarré sur le port ${port}`);
    const replitUrl = process.env.REPLIT_DEPLOYMENT_DOMAIN || process.env.REPLIT_DEV_DOMAIN || 'your-repl.replit.dev';
    console.log(`📡 URL pour UptimeRobot: https://${replitUrl}/health`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur keep-alive...');
    server.close(() => {
        console.log('✅ Serveur keep-alive fermé');
    });
});

module.exports = server;
