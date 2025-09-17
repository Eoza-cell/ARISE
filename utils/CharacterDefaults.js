/**
 * Utility pour gérer les valeurs par défaut des personnages
 * Prévient l'apparition de "undefined" dans les prompts et descriptions
 */

class CharacterDefaults {
    static getDefaultCharacter() {
        return {
            id: 'unknown',
            name: 'Héros Sans Nom',
            gender: 'male',
            kingdom: 'AEGYRIA',
            level: 1,
            powerLevel: 100,
            face: 'oval',
            skinTone: 'fair',
            hairStyle: 'medium_straight',
            hairColor: 'brown',
            eyeColor: 'brown',
            bodyType: 'athletic',
            height: 'average',
            clothing: 'peasant',
            race: 'human',
            class: 'warrior',
            health: 100,
            maxHealth: 100,
            energy: 100,
            maxEnergy: 100,
            experience: 0,
            gold: 100,
            reputation: 0,
            combatStats: {
                strength: 10,
                defense: 10,
                agility: 10,
                magic: 10,
                luck: 10
            }
        };
    }

    static getDefaultKingdom() {
        return {
            id: 'AEGYRIA',
            name: 'Aegyria',
            description: 'Royaume doré de l\'honneur et de la chevalerie',
            geography: 'golden plains with honor and chivalry, knights with blessed armor',
            colors: { primary: '#FFD700', secondary: '#DAA520' }
        };
    }

    static sanitizeCharacter(character) {
        if (!character || typeof character !== 'object') {
            console.warn('⚠️ Character invalide, utilisation des valeurs par défaut');
            return this.getDefaultCharacter();
        }

        const defaults = this.getDefaultCharacter();
        const sanitized = { ...defaults };

        // Copier les propriétés valides du personnage fourni
        Object.keys(character).forEach(key => {
            if (character[key] !== undefined && character[key] !== null && character[key] !== '') {
                sanitized[key] = character[key];
            }
        });

        // Vérifications spéciales pour les propriétés critiques
        sanitized.name = this.sanitizeString(sanitized.name, 'Héros Sans Nom');
        sanitized.gender = this.sanitizeEnum(sanitized.gender, ['male', 'female'], 'male');
        sanitized.kingdom = this.sanitizeString(sanitized.kingdom, 'AEGYRIA');
        sanitized.level = this.sanitizeNumber(sanitized.level, 1, 1, 100);
        sanitized.powerLevel = this.sanitizeNumber(sanitized.powerLevel, 100, 1, 10000);

        return sanitized;
    }

    static sanitizeString(value, fallback = 'Inconnu') {
        if (!value || typeof value !== 'string' || value.trim() === '' || value === 'undefined') {
            return fallback;
        }
        return value.trim();
    }

    static sanitizeNumber(value, fallback = 0, min = null, max = null) {
        const num = parseInt(value);
        if (isNaN(num) || value === undefined || value === null) {
            return fallback;
        }
        if (min !== null && num < min) return min;
        if (max !== null && num > max) return max;
        return num;
    }

    static sanitizeEnum(value, validValues, fallback) {
        if (!validValues.includes(value)) {
            return fallback;
        }
        return value;
    }

    static generateImagePrompt(character, action = '', context = '') {
        const sanitized = this.sanitizeCharacter(character);
        
        const genderDesc = sanitized.gender === 'female' ? 'beautiful woman' : 'handsome man';
        const kingdomDesc = this.getKingdomDescription(sanitized.kingdom);
        
        let prompt = `${genderDesc} character named ${sanitized.name} from ${sanitized.kingdom} kingdom`;
        
        if (action) {
            prompt += `, ${action}`;
        }
        
        if (context) {
            prompt += `, ${context}`;
        }
        
        prompt += `, ${kingdomDesc}, RPG character, fantasy medieval setting`;
        
        return prompt;
    }

    static getKingdomDescription(kingdom) {
        const descriptions = {
            'AEGYRIA': 'golden plains with honor and chivalry, knights with blessed armor',
            'SOMBRENUIT': 'dark mysterious forests with moon magic and shadow spirits',
            'KHELOS': 'burning desert with ancient ruins and nomadic warriors',
            'ABRANTIS': 'coastal fortified cities with naval armor and sea weapons',
            'VARHA': 'snowy mountains with fur armor and beast hunting weapons',
            'SYLVARIA': 'magical bright forests with nature magic and elven design',
            'ECLYPSIA': 'dark lands under eclipse with shadow magic and dark robes',
            'TERRE_DESOLE': 'post-apocalyptic wasteland with scavenged armor and improvised weapons',
            'DRAK_TARR': 'volcanic peaks with dragon-scale armor and fire-forged weapons',
            'URVALA': 'misty swamps with alchemical gear and necromantic accessories',
            'OMBREFIEL': 'gray plains with mercenary armor and practical weapons',
            'KHALDAR': 'tropical jungles with light armor and poison weapons'
        };

        return descriptions[kingdom] || 'mysterious fantasy lands with unknown customs';
    }

    static getKingdomColors(kingdom) {
        const colors = {
            'AEGYRIA': { primary: '#FFD700', secondary: '#DAA520' },
            'SOMBRENUIT': { primary: '#2F2F2F', secondary: '#1C1C1C' },
            'KHELOS': { primary: '#CD853F', secondary: '#A0522D' },
            'ABRANTIS': { primary: '#4682B4', secondary: '#2F4F4F' },
            'VARHA': { primary: '#708090', secondary: '#2F4F4F' },
            'SYLVARIA': { primary: '#228B22', secondary: '#006400' },
            'ECLYPSIA': { primary: '#4B0082', secondary: '#2E0854' },
            'TERRE_DESOLE': { primary: '#A0522D', secondary: '#8B4513' },
            'DRAK_TARR': { primary: '#DC143C', secondary: '#8B0000' },
            'URVALA': { primary: '#800080', secondary: '#4B0082' },
            'OMBREFIEL': { primary: '#696969', secondary: '#2F2F2F' },
            'KHALDAR': { primary: '#32CD32', secondary: '#228B22' }
        };

        return colors[kingdom] || { primary: '#666666', secondary: '#333333' };
    }
}

module.exports = CharacterDefaults;