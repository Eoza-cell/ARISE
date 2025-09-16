
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class RunwareClient {
    constructor() {
        this.apiKey = process.env.RUNWARE_API_KEY || 'ju33zckXLix4hrn9sLopAexhz2x923wq';
        this.baseURL = 'https://api.runware.ai/v1';
        this.isAvailable = false;
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ RUNWARE_API_KEY non trouvée - génération d\'images Runware désactivée');
                return;
            }

            // Marquer comme disponible avec la clé API
            this.isAvailable = true;
            console.log('✅ Client Runware initialisé avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client Runware:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey;
    }

    async generateImage(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Runware non disponible - vérifiez RUNWARE_API_KEY');
            }

            console.log(`🎨 Génération image Runware avec prompt: "${prompt.substring(0, 100)}..."`);

            const requestData = {
                taskType: 'imageInference',
                taskUUID: `friction_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                positivePrompt: this.optimizePromptForRunware(prompt, options),
                model: options.model || 'runware:100@1',
                steps: options.steps || 20,
                width: options.width || 1024,
                height: options.height || 1024,
                CFGScale: options.cfgScale || 7,
                seed: options.seed || Math.floor(Math.random() * 1000000),
                scheduler: options.scheduler || 'DPM2MKarras',
                outputFormat: 'PNG',
                outputType: 'base64'
            };

            console.log('📤 Envoi requête Runware...');

            const response = await axios.post(`${this.baseURL}/image/inference`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            console.log('📥 Réponse Runware reçue');

            if (response.data && response.data.data && response.data.data.length > 0) {
                const imageData = response.data.data[0];
                
                if (imageData.imageBase64) {
                    // Décoder et sauvegarder l'image
                    const imageBuffer = Buffer.from(imageData.imageBase64, 'base64');
                    await fs.writeFile(outputPath, imageBuffer);
                    
                    console.log(`✅ Image Runware générée: ${outputPath}`);
                    return outputPath;
                } else {
                    throw new Error('Image base64 non trouvée dans la réponse');
                }
            } else {
                throw new Error('Réponse Runware invalide');
            }

        } catch (error) {
            console.error('❌ Erreur génération image Runware:', error.message);
            if (error.response) {
                console.error('❌ Détails erreur API:', error.response.data);
            }
            throw error;
        }
    }

    optimizePromptForRunware(prompt, options = {}) {
        const style = options.style || '3d';
        const perspective = options.perspective || 'first_person';
        
        let optimizedPrompt = prompt;
        
        // Ajouter des mots-clés de qualité
        const qualityKeywords = "high quality, detailed, professional, masterpiece";
        
        // Ajouter des mots-clés de style
        if (style === '3d') {
            optimizedPrompt += ", 3D rendered, realistic textures, volumetric lighting";
        } else {
            optimizedPrompt += ", 2D illustration, digital art";
        }
        
        // Ajouter des mots-clés de perspective
        if (perspective === 'first_person') {
            optimizedPrompt += ", first person view, POV perspective";
        } else if (perspective === 'third_person') {
            optimizedPrompt += ", third person view, full scene";
        }
        
        return `${optimizedPrompt}, ${qualityKeywords}`;
    }

    // Méthodes spécialisées pour le jeu RPG
    async generateCharacterPortrait(character, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
        const kingdomDesc = this.getKingdomDescription(character.kingdom);
        
        const prompt = `Portrait of ${character.name}, detailed ${genderDesc} from ${character.kingdom} kingdom, level ${character.level}, ${kingdomDesc}, fantasy RPG character, epic armor and weapons`;
        
        return await this.generateImage(prompt, outputPath, {
            ...options,
            width: 768,
            height: 1024,
            steps: 25
        });
    }

    async generateActionImage(character, action, narration, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
        const kingdomDesc = this.getKingdomDescription(character.kingdom);
        
        const prompt = `${genderDesc} ${character.name} from ${character.kingdom} kingdom, ${action}, ${narration}, ${kingdomDesc}, dynamic action scene, epic fantasy combat`;
        
        return await this.generateImage(prompt, outputPath, {
            ...options,
            width: 1024,
            height: 768,
            steps: 30
        });
    }

    async generateMenuImage(outputPath) {
        const prompt = "Epic fantasy RPG main menu background, medieval castle, magical atmosphere, cinematic lighting, game interface, fantasy landscape";
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            width: 1024,
            height: 768,
            steps: 25
        });
    }

    async generateKingdomImage(kingdomId, kingdomData, outputPath, options = {}) {
        const kingdomDesc = this.getKingdomDescription(kingdomId);
        const prompt = `Fantasy kingdom of ${kingdomId}, ${kingdomDesc}, epic landscape, medieval architecture, atmospheric lighting, detailed environment`;
        
        return await this.generateImage(prompt, outputPath, {
            ...options,
            width: 1024,
            height: 768,
            steps: 25
        });
    }

    getKingdomDescription(kingdom) {
        const descriptions = {
            'AEGYRIA': 'golden plains with honor and chivalry, knights with blessed armor, holy temples',
            'SOMBRENUIT': 'dark mysterious forests with moon magic and shadow spirits, gothic architecture',
            'KHELOS': 'burning desert with ancient ruins and nomadic warriors, sand dunes',
            'ABRANTIS': 'coastal fortified cities with naval armor and sea weapons, port towns',
            'VARHA': 'snowy mountains with fur armor and beast hunting weapons, ice caverns',
            'SYLVARIA': 'magical bright forests with nature magic and elven design, tree cities',
            'ECLYPSIA': 'dark lands under eclipse with shadow magic and dark robes, cursed lands',
            'TERRE_DESOLE': 'post-apocalyptic wasteland with scavenged armor and improvised weapons',
            'DRAK_TARR': 'volcanic peaks with dragon-scale armor and fire-forged weapons, lava flows',
            'URVALA': 'misty swamps with alchemical gear and necromantic accessories, poison pools',
            'OMBREFIEL': 'gray plains with mercenary armor and practical weapons, neutral lands',
            'KHALDAR': 'tropical jungles with light armor and poison weapons, dense vegetation'
        };

        return descriptions[kingdom] || 'mysterious fantasy lands with ancient magic';
    }
}

module.exports = RunwareClient;
