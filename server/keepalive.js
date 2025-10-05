const express = require('express');
const http = require('http');
const app = express();
const port = process.env.PORT || 5000;

// Variables de monitoring
let startTime = Date.now();
let requestCount = 0;
let healthChecks = 0;
let lastHealthCheck = null;
let serverStatus = 'starting';
let lastError = null;
let errorCount = 0;
let qrCodeDataUrl = null;

// Fonction pour mettre à jour le QR code
function updateQrCode(dataUrl) {
    qrCodeDataUrl = dataUrl;
}

// Fonction de vérification de santé complète
function getHealthStatus() {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const memUsage = process.memoryUsage();

    return {
        status: serverStatus,
        service: 'Friction Ultimate Bot',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: uptime,
            human: formatUptime(uptime)
        },
        requests: {
            total: requestCount,
            healthChecks: healthChecks,
            lastHealthCheck: lastHealthCheck
        },
        memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024),
            total: Math.round(memUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        },
        process: {
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
            cpuUsage: process.cpuUsage()
        },
        errors: {
            count: errorCount,
            lastError: lastError
        },
        environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            replitDomain: process.env.REPLIT_DEV_DOMAIN || 'unknown'
        }
    };
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let result = '';
    if (days > 0) result += `${days}j `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;

    return result.trim();
}

// Middleware pour compter les requêtes et définir les headers
app.use((req, res, next) => {
    requestCount++;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent');
    res.setHeader('X-Powered-By', 'Friction-Ultimate-Bot');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Routes de monitoring
app.get('/health', (req, res) => {
    healthChecks++;
    lastHealthCheck = new Date().toISOString();
    const healthStatus = getHealthStatus();
    let statusCode = 200;
    if (serverStatus === 'error' || errorCount > 10) statusCode = 503;
    else if (serverStatus === 'warning') statusCode = 202;
    res.status(statusCode).json(healthStatus);
});

app.get('/status', (req, res) => {
    res.redirect('/health');
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/metrics', (req, res) => {
    const metrics = {
        requests_total: requestCount,
        health_checks_total: healthChecks,
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        error_count: errorCount,
        status: serverStatus
    };
    res.json(metrics);
});

app.get('/ready', (req, res) => {
    const isReady = serverStatus === 'running' && errorCount < 5;
    res.status(isReady ? 200 : 503).json({ ready: isReady, status: serverStatus });
});

// Route pour le QR Code
app.get('/qr', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Friction Ultimate Bot - QR Code</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="10">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { text-align: center; background: #16213e; padding: 40px; border-radius: 15px; box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
        h1 { color: #ffd700; margin-bottom: 20px; }
        #qr-container { margin-top: 20px; }
        #qr-code { border: 5px solid #ffd700; border-radius: 10px; }
        p { color: #ccc; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Scannez pour connecter WhatsApp</h1>
        <div id="qr-container">
            ${qrCodeDataUrl ? `<img id="qr-code" src="${qrCodeDataUrl}" alt="QR Code">` : '<p>En attente du QR code...</p>'}
        </div>
    </div>
</body>
</html>`;
    res.send(html);
});

// Page d'accueil (anciennement la seule page)
app.get('/', (req, res) => {
    const healthStatus = getHealthStatus();
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Friction Ultimate Bot - Monitoring Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffd700; min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 64px; margin: 20px 0; text-shadow: 0 0 20px #ffd700; }
        .title { font-size: 28px; margin-bottom: 10px; }
        .subtitle { color: #cccccc; font-size: 16px; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: rgba(22, 33, 62, 0.8); border-radius: 15px; padding: 20px; border: 1px solid #ffd700; }
        .card h3 { color: #ffd700; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .status-indicator { width: 12px; height: 12px; border-radius: 50%; }
        .status-running { background: #00ff00; box-shadow: 0 0 10px #00ff00; }
        .status-warning { background: #ffa500; box-shadow: 0 0 10px #ffa500; }
        .status-error { background: #ff0000; box-shadow: 0 0 10px #ff0000; }
        .metric { display: flex; justify-content: space-between; margin: 8px 0; }
        .metric-label { color: #cccccc; }
        .metric-value { color: #ffd700; font-weight: bold; }
        .endpoints { margin-top: 30px; text-align: center; }
        .endpoint { display: inline-block; margin: 5px; padding: 8px 16px; background: rgba(255, 215, 0, 0.1); border: 1px solid #ffd700; border-radius: 20px; text-decoration: none; color: #ffd700; font-family: monospace; transition: all 0.3s ease; }
        .endpoint:hover { background: rgba(255, 215, 0, 0.2); transform: translateY(-2px); }
        .footer { text-align: center; margin-top: 40px; color: #666; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .pulse { animation: pulse 2s infinite; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo pulse">⚔️</div>
            <h1 class="title">FRICTION ULTIMATE BOT</h1>
            <p class="subtitle">Système de Monitoring & Keep-Alive</p>
        </div>
        <div class="dashboard">
             <div class="card">
                <h3>
                    <span class="status-indicator ${healthStatus.status === 'running' ? 'status-running' : healthStatus.status === 'warning' ? 'status-warning' : 'status-error'}"></span>
                    État du Système
                </h3>
                <div class="metric"><span class="metric-label">Status:</span><span class="metric-value">${healthStatus.status.toUpperCase()}</span></div>
                <div class="metric"><span class="metric-label">Uptime:</span><span class="metric-value">${healthStatus.uptime.human}</span></div>
                <div class="metric"><span class="metric-label">Version:</span><span class="metric-value">${healthStatus.version}</span></div>
                <div class="metric"><span class="metric-label">PID:</span><span class="metric-value">${healthStatus.process.pid}</span></div>
            </div>
            <div class="card">
                <h3>📊 Métriques Requêtes</h3>
                <div class="metric"><span class="metric-label">Total Requêtes:</span><span class="metric-value">${healthStatus.requests.total}</span></div>
                <div class="metric"><span class="metric-label">Health Checks:</span><span class="metric-value">${healthStatus.requests.healthChecks}</span></div>
                <div class="metric"><span class="metric-label">Dernière Vérification:</span><span class="metric-value">${healthStatus.requests.lastHealthCheck || 'Jamais'}</span></div>
                <div class="metric"><span class="metric-label">Erreurs:</span><span class="metric-value">${healthStatus.errors.count}</span></div>
            </div>
            <div class="card">
                <h3>💾 Utilisation Mémoire</h3>
                <div class="metric"><span class="metric-label">Heap Utilisé:</span><span class="metric-value">${healthStatus.memory.used} MB</span></div>
                <div class="metric"><span class="metric-label">Heap Total:</span><span class="metric-value">${healthStatus.memory.total} MB</span></div>
                <div class="metric"><span class="metric-label">RSS:</span><span class="metric-value">${healthStatus.memory.rss} MB</span></div>
                <div class="metric"><span class="metric-label">External:</span><span class="metric-value">${healthStatus.memory.external} MB</span></div>
            </div>
            <div class="card">
                <h3>🔧 Environnement</h3>
                <div class="metric"><span class="metric-label">Node.js:</span><span class="metric-value">${healthStatus.process.nodeVersion}</span></div>
                <div class="metric"><span class="metric-label">Platform:</span><span class="metric-value">${healthStatus.process.platform}</span></div>
                <div class="metric"><span class="metric-label">Environment:</span><span class="metric-value">${healthStatus.environment.nodeEnv}</span></div>
                <div class="metric"><span class="metric-label">Domain:</span><span class="metric-value">${healthStatus.environment.replitDomain}</span></div>
            </div>
        </div>
        <div class="endpoints">
            <h3 style="color: #ffd700; margin-bottom: 15px;">🔗 Endpoints de Monitoring</h3>
            <a href="/qr" class="endpoint">/qr</a>
            <a href="/health" class="endpoint">/health</a>
            <a href="/ping" class="endpoint">/ping</a>
            <a href="/metrics" class="endpoint">/metrics</a>
            <a href="/ready" class="endpoint">/ready</a>
        </div>
        <div class="footer">
            <p>🤖 Friction Ultimate Bot - Keep-Alive Server</p>
            <p>Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}</p>
        </div>
    </div>
</body>
</html>`;
    res.send(html);
});

const server = http.createServer(app);

// Gestion des erreurs du serveur
server.on('error', (error) => {
    errorCount++;
    lastError = { message: error.message, timestamp: new Date().toISOString(), code: error.code };
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} déjà utilisé - Arrêt du serveur keep-alive`);
        serverStatus = 'port_conflict';
        return;
    }
    serverStatus = 'error';
    console.error('❌ Erreur serveur keep-alive:', error);
});

server.on('listening', () => {
    serverStatus = 'running';
    console.log(`🌐 Serveur keep-alive RENFORCÉ démarré sur le port ${port}`);
    const replitUrl = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DEPLOYMENT_DOMAIN || 'your-repl.replit.dev';
    console.log(`⚡ URL du QR Code: https://${replitUrl}/qr`);
    console.log(`📡 URLs pour SimpleUptime:`);
    console.log(`   • Health: https://${replitUrl}/health`);
});

// Auto-diagnostic périodique
setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapPercent > 90) {
        serverStatus = 'warning';
        console.warn(`⚠️ Utilisation mémoire élevée: ${heapPercent.toFixed(1)}%`);
    } else if (errorCount > 10) {
        serverStatus = 'warning';
        console.warn(`⚠️ Nombre d'erreurs élevé: ${errorCount}`);
    } else if (serverStatus !== 'error') {
        serverStatus = 'running';
    }
}, 30000);

// Démarrer le serveur
server.listen(port, '0.0.0.0');

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur keep-alive...');
    serverStatus = 'stopping';
    server.close(() => {
        console.log('✅ Serveur keep-alive fermé proprement');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Interruption du serveur keep-alive...');
    serverStatus = 'stopping';
    server.close(() => {
        console.log('✅ Serveur keep-alive fermé');
        process.exit(0);
    });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    errorCount++;
    lastError = { message: error.message, timestamp: new Date().toISOString(), stack: error.stack, type: 'uncaughtException' };
    serverStatus = 'error';
    console.error('❌ Exception non gérée dans keep-alive:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    errorCount++;
    lastError = { message: reason?.message || String(reason), timestamp: new Date().toISOString(), type: 'unhandledRejection' };
    serverStatus = 'warning';
    console.error('❌ Promesse rejetée non gérée:', reason);
});

module.exports = { server, updateQrCode };