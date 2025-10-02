/**
 * Configuration centralisée des clés API pour Friction Ultimate
 * Toutes les clés sont chargées depuis les variables d'environnement pour la sécurité
 */

const apiKeys = {
    // IA Générative - Clés intégrées directement pour déploiement
    openai: {
        apiKey: null, // Pas de clé OpenAI
        organization: null,
        enabled: false
    },

    gemini: {
        apiKey: null, // Pas de clé Gemini
        enabled: false
    },

    groq: {
        apiKey: process.env.GROQ_API_KEY || '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',
        enabled: !!(process.env.GROQ_API_KEY || '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')
    },

    // Génération d'images
    pollinations: {
        enabled: true, // Service gratuit, pas de clé requise
        baseUrl: 'https://image.pollinations.ai'
    },

    freepik: {
        enabled: true, // Service gratuit, pas de clé requise
        baseUrl: 'https://api.freepik.com'
    },

    runware: {
        apiKey: process.env.RUNWARE_API_KEY,
        enabled: !!process.env.RUNWARE_API_KEY
    },

    kieAi: {
        apiKey: process.env.KIE_AI_API_KEY,
        enabled: !!process.env.KIE_AI_API_KEY
    },

    // Génération vidéo
    runway: {
        apiKey: process.env.RUNWAY_API_KEY,
        enabled: !!process.env.RUNWAY_API_KEY
    },

    huggingFace: {
        token: process.env.HF_TOKEN || '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',
        enabled: !!(process.env.HF_TOKEN || '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')
    },

    // Synthèse vocale
    playHT: {
        apiKey: process.env.PLAYHT_API_KEY,
        userId: process.env.PLAYHT_USER_ID,
        enabled: !!(process.env.PLAYHT_API_KEY && process.env.PLAYHT_USER_ID)
    },

    cambAi: {
        apiKey: process.env.CAMB_AI_API_KEY,
        enabled: !!process.env.CAMB_AI_API_KEY
    },

    // WhatsApp
    whatsapp: {
        session: process.env.WHATSAPP_SESSION,
        sessionPath: 'auth_info_baileys'
    },

    // Base de données
    database: {
        url: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD
    }
};

/**
 * Vérifie quelles API sont disponibles
 * @returns {Object} État des services
 */
function getServicesStatus() {
    return {
        ai: {
            openai: apiKeys.openai.enabled,
            gemini: apiKeys.gemini.enabled,
            groq: apiKeys.groq.enabled
        },
        images: {
            pollinations: apiKeys.pollinations.enabled,
            freepik: apiKeys.freepik.enabled,
            runware: apiKeys.runware.enabled,
            kieAi: apiKeys.kieAi.enabled
        },
        video: {
            runway: apiKeys.runway.enabled,
            huggingFace: apiKeys.huggingFace.enabled
        },
        voice: {
            playHT: apiKeys.playHT.enabled,
            cambAi: apiKeys.cambAi.enabled
        },
        messaging: {
            whatsapp: true // Toujours disponible avec QR Code
        },
        database: {
            postgresql: !!apiKeys.database.url
        }
    };
}

/**
 * Affiche un rapport de statut des services
 */
function logServicesStatus() {
    const status = getServicesStatus();
    
    console.log('🔧 État des services API:');
    console.log('  IA:', status.ai.openai ? '✅ OpenAI' : '❌ OpenAI', 
                    status.ai.gemini ? '✅ Gemini' : '❌ Gemini',
                    status.ai.groq ? '✅ Groq' : '❌ Groq');
    console.log('  Images:', status.images.pollinations ? '✅ Pollinations' : '❌ Pollinations',
                         status.images.freepik ? '✅ Freepik' : '❌ Freepik',
                         status.images.runware ? '✅ Runware' : '❌ Runware');
    console.log('  Vidéo:', status.video.runway ? '✅ Runway' : '❌ Runway',
                        status.video.huggingFace ? '✅ HuggingFace' : '❌ HuggingFace');
    console.log('  Voix:', status.voice.playHT ? '✅ PlayHT' : '❌ PlayHT',
                       status.voice.cambAi ? '✅ CambAI' : '❌ CambAI');
    console.log('  Base de données:', status.database.postgresql ? '✅ PostgreSQL' : '❌ PostgreSQL');
}

/**
 * Configuration des fallbacks par priorité
 */
const servicePriority = {
    ai: ['groq', 'gemini', 'openai'], // Groq en premier (ultra-rapide)
    images: ['pollinations', 'freepik', 'runware', 'kieAi'], // Pollinations gratuit en premier
    video: ['huggingFace', 'runway'],
    voice: ['playHT', 'cambAi']
};

/**
 * Obtient le premier service disponible dans une catégorie
 * @param {string} category - Catégorie de service
 * @returns {string|null} Nom du service disponible
 */
function getAvailableService(category) {
    const services = servicePriority[category];
    if (!services) return null;

    for (const service of services) {
        if (category === 'ai' && apiKeys[service]?.enabled) return service;
        if (category === 'images' && apiKeys[service]?.enabled) return service;
        if (category === 'video' && (service === 'huggingFace' ? apiKeys.huggingFace.enabled : apiKeys[service]?.enabled)) return service;
        if (category === 'voice' && (service === 'playHT' ? apiKeys.playHT.enabled : apiKeys[service]?.enabled)) return service;
    }
    
    return null;
}

module.exports = {
    apiKeys,
    getServicesStatus,
    logServicesStatus,
    servicePriority,
    getAvailableService
};