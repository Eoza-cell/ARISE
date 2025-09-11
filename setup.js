#!/usr/bin/env node

/**
 * Script d'installation automatique des dépendances
 * Exécute automatiquement `npm install` dans n'importe quel environnement
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Installation automatique des dépendances...');

try {
    // Vérifier si package.json existe
    if (!fs.existsSync('package.json')) {
        console.error('❌ Fichier package.json non trouvé!');
        process.exit(1);
    }

    // Installer les dépendances
    console.log('📦 Installation des dépendances npm...');
    execSync('npm install', { stdio: 'inherit' });

    // Vérifier si node_modules existe après installation
    if (fs.existsSync('node_modules')) {
        console.log('✅ Dépendances installées avec succès!');
        
        // Pousser le schéma de la base de données si Drizzle est disponible
        if (fs.existsSync('drizzle.config.ts')) {
            console.log('📊 Configuration du schéma de base de données...');
            try {
                execSync('npm run db:push', { stdio: 'inherit' });
                console.log('✅ Schéma de base de données configuré!');
            } catch (error) {
                console.log('⚠️  Attention: Configuration du schéma ignorée (nécessite DATABASE_URL)');
            }
        }
        
        console.log('🎮 Prêt à lancer le bot Friction Ultimate!');
        console.log('💡 Utilisez: node index.js ou npm start');
        
    } else {
        console.error('❌ Erreur lors de l\'installation des dépendances');
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Erreur durant l\'installation:', error.message);
    process.exit(1);
}