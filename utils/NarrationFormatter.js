
class NarrationFormatter {
    constructor() {
        this.borders = {
            simple: {
                top: '┌─────────────────────────────────┐',
                middle: '│',
                bottom: '└─────────────────────────────────┘'
            },
            double: {
                top: '╔═════════════════════════════════╗',
                middle: '║',
                bottom: '╚═════════════════════════════════╝'
            },
            rounded: {
                top: '╭─────────────────────────────────╮',
                middle: '│',
                bottom: '╰─────────────────────────────────╯'
            },
            thick: {
                top: '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓',
                middle: '┃',
                bottom: '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛'
            }
        };
    }

    formatNarration(text, style = 'simple') {
        const border = this.borders[style] || this.borders.simple;
        const maxWidth = 50; // Largeur augmentée pour plus de texte
        
        // Diviser le texte en lignes
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            if ((currentLine + word).length <= maxWidth - 2) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        
        // Construire le texte formaté
        let formatted = border.top + '\n';
        
        for (const line of lines) {
            const padding = ' '.repeat(Math.max(0, maxWidth - 2 - line.length));
            formatted += border.middle + ' ' + line + padding + border.middle + '\n';
        }
        
        formatted += border.bottom;
        
        return formatted;
    }

    formatCharacterStats(character) {
        const statsText = `🏰 ${character.kingdom} | 🎯 ${character.name}
⚡ Niv.${character.level} • Grade ${character.powerLevel}
❤️ ${character.currentLife}/${character.maxLife} PV
💰 ${character.coins} pièces d'or`;

        return this.formatNarration(statsText, 'double');
    }

    formatActionResult(actionAnalysis) {
        const resultText = `🎯 ${actionAnalysis.actionType}
🎲 Précision: ${actionAnalysis.precision}
⚠️ Risque: ${actionAnalysis.riskLevel}
⚔️ Combat: ${actionAnalysis.combatAdvantage || 'N/A'}`;

        return this.formatNarration(resultText, 'rounded');
    }

    addEmojiBorder(text, emoji = '⭐') {
        const lines = text.split('\n');
        const maxLength = Math.max(...lines.map(line => line.length));
        
        const border = emoji.repeat(maxLength + 4);
        let result = border + '\n';
        
        for (const line of lines) {
            const padding = ' '.repeat(maxLength - line.length);
            result += emoji + ' ' + line + padding + ' ' + emoji + '\n';
        }
        
        result += border;
        return result;
    }
}

module.exports = NarrationFormatter;
