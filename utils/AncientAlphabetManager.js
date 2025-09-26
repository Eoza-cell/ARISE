/**
 * AncientAlphabetManager - Système d'alphabet ancien pour les sorts
 * Gère la traduction et l'affichage des sorts en alphabet mystique
 */

class AncientAlphabetManager {
    constructor() {
        // Correspondance alphabet ancien
        this.ancientAlphabet = {
            'A': '⩔', 'N': '⨀',
            'B': '⧉', 'O': '⧗',
            'C': '⩗', 'P': '✪',
            'D': '⟁', 'Q': '⧂',
            'E': '✦', 'R': '⩚',
            'F': '⫷', 'S': '⧃',
            'G': '⪨', 'T': '⧄',
            'H': '⩘', 'U': '⪦',
            'I': '⫸', 'V': '⩓',
            'J': '∿', 'W': '⪧',
            'K': '⪩', 'X': '✧',
            'L': '⫻', 'Y': '⩛',
            'M': '⧖', 'Z': '⧅'
        };
        
        // Alphabet inverse pour la traduction
        this.modernAlphabet = {};
        for (const [modern, ancient] of Object.entries(this.ancientAlphabet)) {
            this.modernAlphabet[ancient] = modern;
        }
        
        // Types de sorts avec leurs préfixes mystiques
        this.spellTypes = {
            fire: { prefix: '🔥', color: 'rouge', element: 'feu' },
            water: { prefix: '🌊', color: 'bleu', element: 'eau' },
            earth: { prefix: '🌍', color: 'vert', element: 'terre' },
            air: { prefix: '💨', color: 'blanc', element: 'air' },
            light: { prefix: '✨', color: 'doré', element: 'lumière' },
            dark: { prefix: '🌑', color: 'noir', element: 'ombre' },
            lightning: { prefix: '⚡', color: 'violet', element: 'foudre' },
            ice: { prefix: '❄️', color: 'cyan', element: 'glace' },
            poison: { prefix: '☠️', color: 'vert-poison', element: 'poison' },
            healing: { prefix: '💚', color: 'vert-clair', element: 'guérison' }
        };
        
        // Niveaux de puissance des sorts
        this.powerLevels = {
            1: { name: 'Mineur', symbols: '•', multiplier: 1 },
            2: { name: 'Modéré', symbols: '••', multiplier: 1.5 },
            3: { name: 'Majeur', symbols: '•••', multiplier: 2 },
            4: { name: 'Supérieur', symbols: '••••', multiplier: 3 },
            5: { name: 'Maître', symbols: '•••••', multiplier: 4 },
            6: { name: 'Légendaire', symbols: '••••••', multiplier: 6 },
            7: { name: 'Mythique', symbols: '•••••••', multiplier: 8 },
            8: { name: 'Divin', symbols: '••••••••', multiplier: 10 }
        };
    }

    /**
     * Convertit un texte en alphabet ancien
     * @param {string} text - Texte à convertir
     * @param {boolean} preserveSpaces - Conserver les espaces
     * @returns {string}
     */
    toAncientText(text, preserveSpaces = true) {
        let result = '';
        
        for (const char of text.toUpperCase()) {
            if (char === ' ' && preserveSpaces) {
                result += ' ';
            } else if (this.ancientAlphabet[char]) {
                result += this.ancientAlphabet[char];
            } else {
                result += char; // Garde les caractères non alphabétiques
            }
        }
        
        return result;
    }

    /**
     * Convertit un texte ancien en texte moderne
     * @param {string} ancientText - Texte en alphabet ancien
     * @returns {string}
     */
    toModernText(ancientText) {
        let result = '';
        
        for (const char of ancientText) {
            if (char === ' ') {
                result += ' ';
            } else if (this.modernAlphabet[char]) {
                result += this.modernAlphabet[char];
            } else {
                result += char;
            }
        }
        
        return result;
    }

    /**
     * Crée l'affichage d'un sort avec alphabet ancien
     * @param {Object} spell - Informations du sort
     * @returns {string}
     */
    createSpellDisplay(spell) {
        const { name, type, level, description, manaCost, damage, effect } = spell;
        
        const ancientName = this.toAncientText(name);
        const spellInfo = this.spellTypes[type] || this.spellTypes.fire;
        const powerInfo = this.powerLevels[level] || this.powerLevels[1];
        
        return `✨ **INVOCATION MYSTIQUE** ✨

╭─────────────────────────────╮
│ ${spellInfo.prefix} **${name.toUpperCase()}** ${spellInfo.prefix}
│ ${ancientName}
│ 
│ 📊 **Niveau:** ${powerInfo.name} ${powerInfo.symbols}
│ 🎯 **Élément:** ${spellInfo.element}
│ 💫 **Coût mana:** ${manaCost}
│ ${damage ? `⚡ **Dégâts:** ${damage}` : ''}
│ ${effect ? `🔮 **Effet:** ${effect}` : ''}
╰─────────────────────────────╯

📜 *${description}*

**Incantation:**
${this.createIncantation(name, type, level)}`;
    }

    /**
     * Crée une incantation mystique pour un sort
     * @param {string} spellName - Nom du sort
     * @param {string} type - Type du sort
     * @param {number} level - Niveau du sort
     * @returns {string}
     */
    createIncantation(spellName, type, level) {
        const ancientName = this.toAncientText(spellName);
        const spellInfo = this.spellTypes[type] || this.spellTypes.fire;
        const powerInfo = this.powerLevels[level] || this.powerLevels[1];
        
        const incantationParts = [
            `🌟 "⩔⧃⧄⩚⪦⧖ ${ancientName}"`,
            `${spellInfo.prefix} "Par les forces ${spellInfo.element}..."`,
            `✨ "Que la puissance ${powerInfo.name} se manifeste!"`,
            `🔮 "${ancientName} ⧃⪦⩚⪦⧉⫸⧄!"`
        ];
        
        return incantationParts.join('\n');
    }

    /**
     * Affiche le grimoire d'un joueur avec ses sorts
     * @param {Object[]} learnedSpells - Sorts appris
     * @param {string} playerName - Nom du joueur
     * @returns {string}
     */
    createSpellbook(learnedSpells, playerName) {
        let spellbook = `📚 **GRIMOIRE DE ${playerName.toUpperCase()}** 📚

${this.toAncientText(`GRIMOIRE DE ${playerName}`)}

╭─────────────────────────────╮
│ 🔮 **SORTS MAÎTRISÉS** 🔮
╰─────────────────────────────╯

`;

        if (learnedSpells.length === 0) {
            spellbook += `📜 *Aucun sort appris*
🎓 Visitez un maître de magie pour apprendre vos premiers sorts !`;
            return spellbook;
        }

        learnedSpells.forEach((spell, index) => {
            const ancientName = this.toAncientText(spell.name);
            const spellInfo = this.spellTypes[spell.type] || this.spellTypes.fire;
            const powerInfo = this.powerLevels[spell.level] || this.powerLevels[1];
            
            spellbook += `${index + 1}. ${spellInfo.prefix} **${spell.name}**
   ${ancientName}
   ${powerInfo.symbols} Niveau ${powerInfo.name}
   💫 Mana: ${spell.manaCost}

`;
        });

        spellbook += `
🔍 *Tapez "/sort [nom]" pour voir les détails*
✨ *Tapez "/lancer [nom]" pour utiliser un sort*`;

        return spellbook;
    }

    /**
     * Crée l'animation de lancement de sort
     * @param {Object} spell - Sort lancé
     * @param {string} casterName - Nom du lanceur
     * @param {string} targetName - Nom de la cible (optionnel)
     * @returns {string[]}
     */
    createSpellCastingAnimation(spell, casterName, targetName = null) {
        const ancientName = this.toAncientText(spell.name);
        const spellInfo = this.spellTypes[spell.type] || this.spellTypes.fire;
        const target = targetName ? ` sur **${targetName}**` : '';
        
        const frames = [
            `✨ **${casterName}** commence à incanter...
🔮 "${ancientName}"`,
            
            `${spellInfo.prefix} **INCANTATION EN COURS** ${spellInfo.prefix}
🌟 Les énergies ${spellInfo.element} se rassemblent...
✨ ⩔⧃⧄⩚⪦⧖ ${ancientName} ⧃⪦⩚⪦⧉⫸⧄!`,
            
            `💫 **SORT ACTIVÉ !** 💫
${spellInfo.prefix} **${spell.name}** ${spellInfo.prefix}
🎯 Lancé par **${casterName}**${target}
⚡ Puissance: ${spell.damage || spell.effect}`,
            
            `✅ **SORT RÉUSSI !**
${this.generateSpellEffectText(spell, casterName, targetName)}`
        ];
        
        return frames;
    }

    /**
     * Génère le texte d'effet d'un sort
     * @param {Object} spell - Sort utilisé
     * @param {string} casterName - Nom du lanceur
     * @param {string} targetName - Nom de la cible
     * @returns {string}
     */
    generateSpellEffectText(spell, casterName, targetName) {
        const spellInfo = this.spellTypes[spell.type] || this.spellTypes.fire;
        const target = targetName || 'la zone';
        
        const effects = {
            fire: `🔥 Des flammes ${spellInfo.color}s enveloppent ${target} !`,
            water: `🌊 Une vague d'eau pure submerge ${target} !`,
            earth: `🌍 La terre tremble et des rochers frappent ${target} !`,
            air: `💨 Un tourbillon de vent violent frappe ${target} !`,
            light: `✨ Une lumière dorée aveuglante illumine ${target} !`,
            dark: `🌑 Des ombres ténébreuses enveloppent ${target} !`,
            lightning: `⚡ La foudre violette frappe ${target} !`,
            ice: `❄️ Des cristaux de glace percent ${target} !`,
            poison: `☠️ Un poison mortel infecte ${target} !`,
            healing: `💚 Une énergie curative restaure ${target} !`
        };
        
        return effects[spell.type] || `✨ L'énergie mystique affecte ${target} !`;
    }

    /**
     * Crée un sort personnalisé avec nom en alphabet ancien
     * @param {string} name - Nom du sort
     * @param {string} type - Type du sort
     * @param {number} level - Niveau du sort
     * @param {string} description - Description du sort
     * @param {number} manaCost - Coût en mana
     * @param {number} damage - Dégâts (optionnel)
     * @param {string} effect - Effet spécial (optionnel)
     * @returns {Object}
     */
    createCustomSpell(name, type, level, description, manaCost, damage = null, effect = null) {
        return {
            id: this.toAncientText(name.replace(/\s+/g, '')),
            name: name,
            ancientName: this.toAncientText(name),
            type: type,
            level: level,
            description: description,
            manaCost: manaCost,
            damage: damage,
            effect: effect,
            incantation: this.createIncantation(name, type, level)
        };
    }

    /**
     * Vérifie si un texte contient de l'alphabet ancien
     * @param {string} text - Texte à vérifier
     * @returns {boolean}
     */
    containsAncientText(text) {
        for (const char of text) {
            if (Object.values(this.ancientAlphabet).includes(char)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Traduit automatiquement un sort si nécessaire
     * @param {string} spellInput - Entrée utilisateur
     * @returns {Object}
     */
    parseSpellInput(spellInput) {
        const isAncient = this.containsAncientText(spellInput);
        
        return {
            original: spellInput,
            modern: isAncient ? this.toModernText(spellInput) : spellInput,
            ancient: isAncient ? spellInput : this.toAncientText(spellInput),
            isAncientInput: isAncient
        };
    }
}

module.exports = AncientAlphabetManager;