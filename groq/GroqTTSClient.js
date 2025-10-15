const fs = require('fs').promises;
const path = require('path');
const Groq = require('groq-sdk');

class GroqTTSClient {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.isAvailable = false;
        this.isInitialized = false;
        
        if (!this.apiKey) {
            console.log('⚠️ GROQ_API_KEY non configurée - Groq TTS désactivé');
            return;
        }
        
        this.groq = new Groq({ apiKey: this.apiKey });
        this.isAvailable = true;
        this.isInitialized = true;
        
        console.log('✅ GroqTTSClient initialisé avec succès - Synthèse vocale Groq activée');
        console.log('🎙️ Modèle PlayAI-TTS disponible avec voix Aaliyah-PlayAI');
    }

    hasValidClient() {
        return this.isInitialized && this.isAvailable;
    }

    async generateVoice(text, outputPath, options = {}) {
        if (!this.hasValidClient()) {
            console.log('⚠️ Groq TTS non disponible - génération vocale ignorée');
            return null;
        }

        try {
            console.log(`🎙️ Génération vocale Groq TTS: "${text.substring(0, 50)}..."`);

            const voice = options.voice || 'Aaliyah-PlayAI';
            const responseFormat = options.responseFormat || 'wav';

            const wav = await this.groq.audio.speech.create({
                model: "playai-tts",
                voice: voice,
                response_format: responseFormat,
                input: text
            });

            const buffer = Buffer.from(await wav.arrayBuffer());
            
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            await fs.writeFile(outputPath, buffer);

            console.log(`✅ Audio Groq TTS généré: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vocale Groq TTS:', error.message);
            return null;
        }
    }

    async generateDialogueVoice(npcName, dialogue, outputPath, characterType = 'neutral', gender = 'female') {
        const voiceMap = {
            female: {
                warrior: 'Aaliyah-PlayAI',
                merchant: 'Aaliyah-PlayAI',
                noble: 'Aaliyah-PlayAI',
                guard: 'Aaliyah-PlayAI',
                peasant: 'Aaliyah-PlayAI',
                neutral: 'Aaliyah-PlayAI'
            },
            male: {
                warrior: 'Aaliyah-PlayAI',
                merchant: 'Aaliyah-PlayAI',
                noble: 'Aaliyah-PlayAI',
                guard: 'Aaliyah-PlayAI',
                peasant: 'Aaliyah-PlayAI',
                neutral: 'Aaliyah-PlayAI'
            }
        };

        const voice = voiceMap[gender]?.[characterType] || 'Aaliyah-PlayAI';
        
        const cleanDialogue = dialogue.replace(/[""]/g, '"').replace(/'/g, "'").trim();
        
        if (cleanDialogue.length > 500) {
            const truncated = cleanDialogue.substring(0, 500);
            return await this.generateVoice(truncated, outputPath, { voice });
        }
        
        return await this.generateVoice(cleanDialogue, outputPath, { voice });
    }

    async generateNarrationVoice(narration, outputPath) {
        const cleanNarration = narration.replace(/[""]/g, '"').replace(/'/g, "'").trim();
        
        if (cleanNarration.length > 700) {
            const truncated = cleanNarration.substring(0, 700);
            return await this.generateVoice(truncated, outputPath, { voice: 'Aaliyah-PlayAI' });
        }
        
        return await this.generateVoice(cleanNarration, outputPath, { voice: 'Aaliyah-PlayAI' });
    }

    getAvailableVoices() {
        return [
            { id: 'Aaliyah-PlayAI', name: 'Aaliyah', gender: 'female', type: 'conversational' }
        ];
    }
}

module.exports = GroqTTSClient;
