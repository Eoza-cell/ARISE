const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const CharacterDefaults = require('../utils/CharacterDefaults');

class KieAiClient {
    constructor() {
        this.apiKey = process.env.KIE_AI_API_KEY;
        this.baseURL = 'https://api.kie.ai/api/v1'; // URL d'API Kie AI
        this.isAvailable = true;
        
        if (!this.apiKey) {
            console.log('⚠️ KIE_AI_API_KEY non configurée - KieAI désactivé');
            this.isAvailable = false;
        } else {
            console.log('✅ KieAiClient initialisé avec succès');
        }
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey;
    }

    async generateImage(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Kie AI non disponible - vérifiez KIE_AI_API_KEY');
            }

            console.log(`🎨 Génération d'image Kie AI avec prompt: "${prompt.substring(0, 50)}..."`);

            // Configuration par défaut
            const style = options.style || '3d';
            const perspective = options.perspective || 'first_person';
            
            // Optimiser le prompt selon les options
            const optimizedPrompt = this.optimizePrompt(prompt, style, perspective);
            
            console.log(`✨ Prompt optimisé Kie AI: "${optimizedPrompt.substring(0, 100)}..."`);

            const requestData = {
                prompt: optimizedPrompt,
                quality: 'high', // low, medium, high
                size: '1024x1024',
                style: style === '3d' ? 'vivid' : 'natural'
            };

            const response = await axios.post(`${this.baseURL}/gpt4o-image/generate`, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 60000
            });

            // GPT-4o format: direct image URL
            if (response.data && response.data.image_url) {
                // Télécharger depuis l'URL
                await this.downloadImage(response.data.image_url, outputPath);
                console.log(`✅ Image Kie AI générée: ${outputPath}`);
                return outputPath;
            } else if (response.data && response.data.url) {
                // Format alternatif avec 'url'
                await this.downloadImage(response.data.url, outputPath);
                console.log(`✅ Image Kie AI générée: ${outputPath}`);
                return outputPath;
            } else if (response.data && response.data.task_id) {
                // Format async avec task_id - attendre ou récupérer plus tard
                console.log(`🔄 Tâche Kie AI en cours: ${response.data.task_id}`);
                throw new Error('Traitement asynchrone non implémenté - utilisation du fallback');
            } else {
                throw new Error('Aucune image retournée par Kie AI - format de réponse inattendu');
            }

        } catch (error) {
            console.error('❌ Erreur génération image Kie AI:', error.message);
            if (error.response) {
                console.error('❌ Détails erreur API Kie AI:', error.response.data);
            }
            throw error;
        }
    }

    optimizePrompt(prompt, style, perspective) {
        let optimized = prompt;
        
        // Ajouter des termes de style
        if (style === '3d') {
            optimized = `3D rendered, high quality, detailed, photorealistic, ${optimized}`;
        } else {
            optimized = `2D art, illustration, digital art, ${optimized}`;
        }
        
        // Ajouter perspective
        if (perspective === 'first_person') {
            optimized = `first person view, POV, ${optimized}`;
        } else if (perspective === 'third_person') {
            optimized = `third person view, full body, ${optimized}`;
        }
        
        // Améliorer la qualité
        optimized += ', high resolution, masterpiece, best quality, ultra detailed';
        
        return optimized;
    }

    buildNegativePrompt(style) {
        let negative = 'blurry, low quality, distorted, deformed, bad anatomy, ugly, dark, black screen, monochrome, poorly lit';
        
        if (style === '3d') {
            negative += ', cartoon, anime, 2d, flat art, drawing, sketch';
        } else {
            negative += ', photorealistic, 3d render, CGI';
        }
        
        return negative;
    }

    async downloadImage(url, outputPath) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 30000
            });

            await fs.writeFile(outputPath, response.data);
            console.log(`📥 Image téléchargée: ${outputPath}`);
        } catch (error) {
            console.error('❌ Erreur téléchargement image Kie AI:', error.message);
            throw error;
        }
    }

    // Méthodes spécialisées pour le RPG
    async generateCharacterPortrait(character, outputPath, options = {}) {
        const sanitizedCharacter = CharacterDefaults.sanitizeCharacter(character);
        const gender = sanitizedCharacter.gender;
        const name = sanitizedCharacter.name;
        const kingdom = sanitizedCharacter.kingdom;
        
        const prompt = `portrait of ${gender} character named ${name} from ${kingdom} kingdom, 
                       RPG character, fantasy medieval setting, detailed face, ${gender === 'female' ? 'beautiful woman' : 'handsome man'}`;
        
        return this.generateImage(prompt, outputPath, { ...options, perspective: 'portrait' });
    }

    async generateKingdomLandscape(kingdom, outputPath, options = {}) {
        const name = kingdom?.name || kingdom || 'fantasy';
        const geography = kingdom?.geography || 'mystical lands';
        
        const prompt = `fantasy landscape of ${name} kingdom, ${geography}, 
                       medieval fantasy setting, epic landscape, cinematic view`;
        
        return this.generateImage(prompt, outputPath, { ...options, perspective: 'landscape' });
    }

    async generateCombatScene(description, outputPath, options = {}) {
        const prompt = `epic combat scene, ${description}, fantasy RPG battle, 
                       dynamic action, magical effects, medieval weapons`;
        
        return this.generateImage(prompt, outputPath, { ...options, style: '3d' });
    }
}

module.exports = KieAiClient;