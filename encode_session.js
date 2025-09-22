
/**
 * Script pour encoder votre session WhatsApp existante
 * Utilisez ce script une seule fois après avoir connecté votre bot
 * 
 * Usage: node encode_session.js
 */

const SessionManager = require('./whatsapp/SessionManager');

async function encodeExistingSession() {
    console.log('🔐 Encodage de votre session WhatsApp existante...');
    console.log('⚠️  Assurez-vous d\'avoir déjà connecté votre bot une fois avant d\'utiliser ce script');
    
    const sessionManager = new SessionManager();
    
    // Encoder la session depuis le dossier auth_info
    const encoded = sessionManager.encodeYourSession('auth_info');
    
    if (encoded) {
        console.log('\n✅ Session encodée avec succès!');
        console.log('\n📋 INSTRUCTIONS:');
        console.log('1. Copiez la session encodée ci-dessus');
        console.log('2. Ajoutez-la dans vos secrets Replit comme WHATSAPP_SESSION');
        console.log('3. Ou ajoutez cette ligne dans votre .env:');
        console.log(`   WHATSAPP_SESSION="${encoded}"`);
        console.log('\n🚀 Votre bot pourra maintenant se connecter automatiquement sur n\'importe quelle plateforme!');
    } else {
        console.log('\n❌ Échec de l\'encodage');
        console.log('💡 Connectez d\'abord votre bot pour générer les fichiers de session');
    }
}

// Exécuter le script
encodeExistingSession().catch(console.error);
