const Bytez = require('bytez.js');
const fs = require('fs').promises;
const path = require('path');

class BytezClient {
    constructor() {
        this.apiKey = process.env.BYTEZ_API_KEY;
        this.sdk = null;
        this.isAvailable = false;
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ BYTEZ_API_KEY non trouvée - génération d\'images Bytez désactivée');
                return;
            }

            this.sdk = new Bytez(this.apiKey);
            this.isAvailable = true;
            console.log('✅ Client Bytez initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client Bytez:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.sdk && this.apiKey;
    }

    async generateImage(prompt, outputPath) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Bytez non disponible - vérifiez BYTEZ_API_KEY');
            }

            console.log(`🎨 Génération d'image Bytez avec prompt: "${prompt.substring(0, 100)}..."`);
            
            // Délai pour éviter les problèmes de concurrence
            await this.waitForSlot();
            
            // Utiliser le modèle Stable Diffusion XL
            const model = this.sdk.model("stabilityai/stable-diffusion-xl-base-1.0");
            
            // Optimiser le prompt pour Stable Diffusion
            const optimizedPrompt = this.optimizePromptForSD(prompt);
            
            // Générer l'image avec retry en cas d'erreur de concurrence
            let { error, output } = await model.run(optimizedPrompt);
            
            // Retry une fois en cas d'erreur de concurrence
            if (error && error.includes('concurrency')) {
                console.log('⏳ Erreur de concurrence Bytez, retry dans 3 secondes...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                ({ error, output } = await model.run(optimizedPrompt));
            }
            
            if (error) {
                throw new Error(`Erreur Bytez API: ${error}`);
            }

            if (!output || !output.length) {
                throw new Error('Aucune image générée par Bytez');
            }

            // L'output de Bytez contient les URLs des images générées
            const imageUrl = Array.isArray(output) ? output[0] : output;
            
            // Télécharger et sauvegarder l'image
            await this.downloadAndSaveImage(imageUrl, outputPath);
            
            console.log(`✅ Image Bytez générée et sauvegardée: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur lors de la génération d\'image Bytez:', error.message);
            throw error;
        }
    }

    async waitForSlot() {
        // Ajouter un petit délai pour éviter les conflits de concurrence
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    optimizePromptForSD(prompt) {
        // Optimiser le prompt pour Stable Diffusion XL
        // Ajouter des mots-clés de qualité et de style
        const qualityKeywords = "masterpiece, best quality, highly detailed, ultra sharp, professional";
        const styleKeywords = "digital art, concept art, illustration";
        
        // Nettoyer et optimiser le prompt
        let optimized = prompt
            .replace(/\n/g, ', ')
            .replace(/\s+/g, ' ')
            .trim();
            
        // Ajouter les mots-clés de qualité si pas déjà présents
        if (!optimized.toLowerCase().includes('masterpiece')) {
            optimized = `${qualityKeywords}, ${optimized}`;
        }
        
        if (!optimized.toLowerCase().includes('digital art')) {
            optimized = `${optimized}, ${styleKeywords}`;
        }
        
        // Limiter la longueur du prompt (Stable Diffusion fonctionne mieux avec des prompts concis)
        if (optimized.length > 500) {
            optimized = optimized.substring(0, 497) + '...';
        }
        
        console.log(`🔧 Prompt optimisé: "${optimized}"`);
        return optimized;
    }

    async downloadAndSaveImage(imageUrl, outputPath) {
        try {
            // Utiliser fetch pour télécharger l'image
            const response = await fetch(imageUrl);
            
            if (!response.ok) {
                throw new Error(`Erreur de téléchargement: ${response.statusText}`);
            }
            
            // Obtenir les données de l'image
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            
            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Sauvegarder l'image
            await fs.writeFile(outputPath, imageBuffer);
            
            console.log(`💾 Image téléchargée et sauvegardée: ${outputPath}`);
            
        } catch (error) {
            console.error('❌ Erreur lors du téléchargement de l\'image:', error.message);
            throw error;
        }
    }

    async generateMenuImage(outputPath) {
        const prompt = `Epic steampunk fantasy scene: young dark-haired man throwing powerful right hook punch into demon's face, maximum speed impact, steampunk medieval setting with brass gears and steam, dark atmospheric background with golden accents, motion blur effects, dramatic lighting, cinematic composition, space for "FRICTION ULTIMATE" title`;
        
        return await this.generateImage(prompt, outputPath);
    }

    async generateKingdomImage(kingdomName, kingdomData, outputPath) {
        const prompt = `Fantasy kingdom of ${kingdomName}: ${kingdomData.description}, ${kingdomData.environment}, medieval fantasy architecture, detailed landscape, atmospheric lighting, concept art style`;
        
        return await this.generateImage(prompt, outputPath);
    }

    async generateCharacterImage(character, outputPath) {
        const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
        const prompt = `Detailed fantasy ${genderDesc} from ${character.kingdom} kingdom, power level ${character.powerLevel}, full body standing pose, detailed armor and weapons, fantasy RPG character design, high quality rendering`;
        
        return await this.generateImage(prompt, outputPath);
    }

    async generateKingdomsOverview(outputPath) {
        const prompt = `Fantasy world map showing 12 kingdoms: golden plains, dark forests, burning desert, coastal cities, snowy mountains, magical forests, eclipse lands, wasteland, volcanic peaks, misty swamps, gray plains, tropical jungles, detailed cartography, ancient map style, vibrant colors`;
        
        return await this.generateImage(prompt, outputPath);
    }
}

module.exports = BytezClient;