
const { randomUUID } = require('crypto');

class ShopManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        
        // Catalogue de boutique
        this.shopItems = {
            weapons: [
                { id: 'sword_basic', name: 'Épée Basique', price: 50, power: 5, level: 1 },
                { id: 'sword_iron', name: 'Épée en Fer', price: 150, power: 12, level: 3 },
                { id: 'sword_steel', name: 'Épée en Acier', price: 300, power: 20, level: 5 },
                { id: 'sword_legendary', name: 'Épée Légendaire', price: 1000, power: 50, level: 10 }
            ],
            armor: [
                { id: 'armor_leather', name: 'Armure de Cuir', price: 100, defense: 5, level: 1 },
                { id: 'armor_chain', name: 'Armure de Mailles', price: 250, defense: 15, level: 3 },
                { id: 'armor_plate', name: 'Armure de Plaques', price: 500, defense: 30, level: 5 }
            ],
            potions: [
                { id: 'potion_health_small', name: 'Petite Potion de Vie', price: 20, heal: 30 },
                { id: 'potion_health_medium', name: 'Potion de Vie Moyenne', price: 50, heal: 75 },
                { id: 'potion_health_large', name: 'Grande Potion de Vie', price: 100, heal: 150 },
                { id: 'potion_energy', name: 'Potion d\'Énergie', price: 40, energy: 50 }
            ],
            clothing: [
                { id: 'cape_basic', name: 'Cape Simple', price: 30, style: 'casual' },
                { id: 'cape_noble', name: 'Cape Noble', price: 150, style: 'noble' },
                { id: 'robe_mage', name: 'Robe de Mage', price: 200, magic: 10 }
            ]
        };
    }

    async buyItem(playerId, itemId) {
        const character = await this.dbManager.getCharacterByPlayer(playerId);
        if (!character) {
            return { success: false, message: '❌ Personnage introuvable' };
        }

        // Trouver l'item
        let item = null;
        let category = null;
        for (const [cat, items] of Object.entries(this.shopItems)) {
            const found = items.find(i => i.id === itemId);
            if (found) {
                item = found;
                category = cat;
                break;
            }
        }

        if (!item) {
            return { success: false, message: '❌ Item introuvable' };
        }

        // Vérifier le niveau
        if (item.level && character.level < item.level) {
            return { success: false, message: `❌ Niveau ${item.level} requis (vous: ${character.level})` };
        }

        // Vérifier l'argent
        if (character.coins < item.price) {
            return { success: false, message: `❌ Pas assez de pièces (besoin: ${item.price}, vous avez: ${character.coins})` };
        }

        // Acheter l'item
        const newCoins = character.coins - item.price;
        const inventory = character.inventory || [];
        inventory.push({
            id: randomUUID(),
            itemId: item.id,
            name: item.name,
            category,
            ...item
        });

        await this.dbManager.updateCharacter(character.id, {
            coins: newCoins,
            inventory
        });

        return {
            success: true,
            message: `✅ **${item.name}** acheté pour ${item.price} pièces !`,
            item,
            remainingCoins: newCoins
        };
    }

    getShopDisplay(category = 'all') {
        let display = '🏪 **BOUTIQUE** 🏪\n\n';

        const categories = category === 'all' ? Object.keys(this.shopItems) : [category];

        for (const cat of categories) {
            const items = this.shopItems[cat];
            if (!items) continue;

            display += `\n**${cat.toUpperCase()}:**\n`;
            items.forEach((item, index) => {
                display += `${index + 1}. **${item.name}**\n`;
                display += `   💰 Prix: ${item.price} pièces\n`;
                if (item.power) display += `   ⚔️ Puissance: +${item.power}\n`;
                if (item.defense) display += `   🛡️ Défense: +${item.defense}\n`;
                if (item.heal) display += `   ❤️ Soin: ${item.heal} PV\n`;
                if (item.level) display += `   📊 Niveau requis: ${item.level}\n`;
                display += `   🆔 ID: \`${item.id}\`\n\n`;
            });
        }

        display += '\n💡 **Utilisation:** `/acheter <id_item>`';
        return display;
    }
}

module.exports = ShopManager;
