const http = require('http');
const port = process.env.PORT || 5000;

// Variables de monitoring
let startTime = Date.now();
let requestCount = 0;
let healthChecks = 0;
let lastHealthCheck = null;
let serverStatus = 'starting';
let lastError = null;
let errorCount = 0;

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

// Serveur keep-alive renforcé
const server = http.createServer((req, res) => {
    requestCount++;

    // Headers CORS et sécurité renforcés
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent');
    res.setHeader('X-Powered-By', 'Friction-Ultimate-Bot');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Gestion des méthodes
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'HEAD') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-Service-Status': serverStatus,
            'X-Uptime': Math.floor((Date.now() - startTime) / 1000)
        });
        res.end();
        return;
    }

    // Routes de monitoring
    if (req.url === '/health' || req.url === '/status') {
        healthChecks++;
        lastHealthCheck = new Date().toISOString();

        const healthStatus = getHealthStatus();

        // Déterminer le code de statut basé sur la santé
        let statusCode = 200;
        if (serverStatus === 'error' || errorCount > 10) {
            statusCode = 503; // Service Unavailable
        } else if (serverStatus === 'warning') {
            statusCode = 202; // Accepted (avec avertissement)
        }

        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'X-Health-Check-Count': healthChecks.toString(),
            'X-Request-Count': requestCount.toString()
        });
        res.end(JSON.stringify(healthStatus, null, 2));

    } else if (req.url === '/ping') {
        // Endpoint ultra-simple pour ping rapide
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('pong');

    } else if (req.url === '/metrics') {
        // Métriques pour monitoring avancé
        const metrics = {
            requests_total: requestCount,
            health_checks_total: healthChecks,
            uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
            memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            error_count: errorCount,
            status: serverStatus
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));

    } else if (req.url === '/ready') {
        // Endpoint de readiness pour Kubernetes-style checks
        const isReady = serverStatus === 'running' && errorCount < 5;
        res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready: isReady, status: serverStatus }));

    } else {
        // Page d'accueil renforcée
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
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #ffd700;
            min-height: 100vh;
            padding: 20px;
        }
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
        .endpoint {
            display: inline-block;
            margin: 5px;
            padding: 8px 16px;
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid #ffd700;
            border-radius: 20px;
            text-decoration: none;
            color: #ffd700;
            font-family: monospace;
            transition: all 0.3s ease;
        }
        .endpoint:hover {
            background: rgba(255, 215, 0, 0.2);
            transform: translateY(-2px);
        }

        .footer { text-align: center; margin-top: 40px; color: #666; }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
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
                <div class="metric">
                    <span class="metric-label">Status:</span>
                    <span class="metric-value">${healthStatus.status.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime:</span>
                    <span class="metric-value">${healthStatus.uptime.human}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Version:</span>
                    <span class="metric-value">${healthStatus.version}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">PID:</span>
                    <span class="metric-value">${healthStatus.process.pid}</span>
                </div>
            </div>

            <div class="card">
                <h3>📊 Métriques Requêtes</h3>
                <div class="metric">
                    <span class="metric-label">Total Requêtes:</span>
                    <span class="metric-value">${healthStatus.requests.total}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Health Checks:</span>
                    <span class="metric-value">${healthStatus.requests.healthChecks}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Dernière Vérification:</span>
                    <span class="metric-value">${healthStatus.requests.lastHealthCheck || 'Jamais'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Erreurs:</span>
                    <span class="metric-value">${healthStatus.errors.count}</span>
                </div>
            </div>

            <div class="card">
                <h3>💾 Utilisation Mémoire</h3>
                <div class="metric">
                    <span class="metric-label">Heap Utilisé:</span>
                    <span class="metric-value">${healthStatus.memory.used} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Heap Total:</span>
                    <span class="metric-value">${healthStatus.memory.total} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">RSS:</span>
                    <span class="metric-value">${healthStatus.memory.rss} MB</span>
                </div>
                <div class="metric">
                    <span class="metric-label">External:</span>
                    <span class="metric-value">${healthStatus.memory.external} MB</span>
                </div>
            </div>

            <div class="card">
                <h3>🔧 Environnement</h3>
                <div class="metric">
                    <span class="metric-label">Node.js:</span>
                    <span class="metric-value">${healthStatus.process.nodeVersion}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Platform:</span>
                    <span class="metric-value">${healthStatus.process.platform}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Environment:</span>
                    <span class="metric-value">${healthStatus.environment.nodeEnv}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Domain:</span>
                    <span class="metric-value">${healthStatus.environment.replitDomain}</span>
                </div>
            </div>
        </div>

        <div class="endpoints">
            <h3 style="color: #ffd700; margin-bottom: 15px;">🔗 Endpoints de Monitoring</h3>
            <a href="/health" class="endpoint">/health</a>
            <a href="/status" class="endpoint">/status</a>
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

        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(html);
    }
});

// Gestion des erreurs du serveur
server.on('error', (error) => {
    errorCount++;
    lastError = {
        message: error.message,
        timestamp: new Date().toISOString(),
        code: error.code
    };

    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} déjà utilisé - Arrêt du serveur keep-alive`);
        console.log('💡 Le bot WhatsApp peut continuer sans serveur web');
        serverStatus = 'port_conflict';
        return; // Ne pas essayer de redémarrer
    }

    serverStatus = 'error';
    console.error('❌ Erreur serveur keep-alive:', error);
});

server.on('listening', () => {
    serverStatus = 'running';
    console.log(`🌐 Serveur keep-alive RENFORCÉ démarré sur le port ${port}`);
    const replitUrl = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DEPLOYMENT_DOMAIN || 'your-repl.replit.dev';
    console.log(`📡 URLs pour SimpleUptime:`);
    console.log(`   • Health: https://${replitUrl}/health`);
    console.log(`   • Status: https://${replitUrl}/status`);
    console.log(`   • Ping: https://${replitUrl}/ping`);
    console.log(`   • Metrics: https://${replitUrl}/metrics`);
    console.log(`   • Ready: https://${replitUrl}/ready`);
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

    // Log de santé toutes les 10 minutes
    if (Date.now() % 600000 < 30000) {
        console.log(`💚 Keep-alive: ${formatUptime(Math.floor((Date.now() - startTime) / 1000))} | Requests: ${requestCount} | Health: ${healthChecks}`);
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
    lastError = {
        message: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack,
        type: 'uncaughtException'
    };
    serverStatus = 'error';
    console.error('❌ Exception non gérée dans keep-alive:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    errorCount++;
    lastError = {
        message: reason?.message || String(reason),
        timestamp: new Date().toISOString(),
        type: 'unhandledRejection'
    };
    serverStatus = 'warning';
    console.error('❌ Promesse rejetée non gérée:', reason);
});

module.exports = server;