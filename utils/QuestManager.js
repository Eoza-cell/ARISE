const { randomUUID } = require('crypto');

/**
 * QuestManager - Gère 10,000 quêtes principales et 20,000 quêtes secondaires
 * Système complet de progression et de récompenses
 */
class QuestManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.questCache = new Map();
        this.mainQuests = new Map();
        this.sideQuests = new Map();
        this.generatedQuests = false;
        
        // Templates de quêtes pour générer du contenu dynamique
        this.questTemplates = {
            main: [
                {
                    type: 'kill',
                    title: 'Élimination {target}',
                    description: 'Éliminez {count} {target} dans {location}',
                    rewards: { xp: 250, gold: 100, items: ['potion_soin'] }
                },
                {
                    type: 'collect',
                    title: 'Collecte {item}',
                    description: 'Collectez {count} {item} pour {npc}',
                    rewards: { xp: 180, gold: 75, items: ['cristal_mana'] }
                },
                {
                    type: 'explore',
                    title: 'Exploration {location}',
                    description: 'Explorez entièrement {location} et découvrez ses secrets',
                    rewards: { xp: 300, gold: 150, items: ['carte_tresor'] }
                },
                {
                    type: 'story',
                    title: 'Chapitre {chapter}: {storyline}',
                    description: 'Progressez dans l\'histoire principale de {kingdom}',
                    rewards: { xp: 500, gold: 200, items: ['arme_legendaire'] }
                },
                {
                    type: 'boss',
                    title: 'Défi {boss}',
                    description: 'Affrontez et vainquez {boss}, le maître de {domain}',
                    rewards: { xp: 1000, gold: 500, items: ['rune_puissance'] }
                }
            ],
            side: [
                {
                    type: 'delivery',
                    title: 'Livraison express',
                    description: 'Livrez {item} de {from} à {to}',
                    rewards: { xp: 50, gold: 25 }
                },
                {
                    type: 'gathering',
                    title: 'Récolte {resource}',
                    description: 'Récoltez {count} {resource} dans {location}',
                    rewards: { xp: 40, gold: 20, items: ['sac_stockage'] }
                },
                {
                    type: 'craft',
                    title: 'Artisanat {item}',
                    description: 'Fabriquez {count} {item} pour {npc}',
                    rewards: { xp: 60, gold: 30, items: ['outils_craft'] }
                },
                {
                    type: 'escort',
                    title: 'Escorte {npc}',
                    description: 'Escortez {npc} en sécurité jusqu\'à {destination}',
                    rewards: { xp: 70, gold: 35 }
                },
                {
                    type: 'puzzle',
                    title: 'Énigme {name}',
                    description: 'Résolvez l\'énigme de {location} et obtenez le trésor',
                    rewards: { xp: 80, gold: 40, items: ['livre_sagesse'] }
                }
            ]
        };

        // Données pour générer du contenu varié
        this.questData = {
            targets: [
                'Gobelin Sauvage', 'Orc Guerrier', 'Squelette Maudit', 'Loup-Garou',
                'Dragon Mineur', 'Bandit Masqué', 'Sorcier Noir', 'Golem de Pierre',
                'Araignée Géante', 'Nécromancien', 'Démon Mineur', 'Elemental de Feu',
                'Troll des Cavernes', 'Spectre Vengeur', 'Minotaure Furieux', 'Hydre',
                'Vampire Ancien', 'Liche Corrompue', 'Basilic Venimeux', 'Phoenix Noir'
            ],
            items: [
                'Cristal d\'Énergie', 'Herbe Médicinale', 'Minerai de Fer', 'Perle Rare',
                'Essence Magique', 'Plume de Phoenix', 'Écaille de Dragon', 'Rune Antique',
                'Gemme de Pouvoir', 'Parchemin Mystique', 'Élixir Vital', 'Pierre de Lune',
                'Fleur de Cristal', 'Sang de Demon', 'Corne de Licorne', 'Poussière d\'Étoile',
                'Fragment d\'Âme', 'Eau Bénite', 'Métal Céleste', 'Larme de Sirène'
            ],
            locations: [
                'Forêt Sombre', 'Cavernes Profondes', 'Marais Maudit', 'Montagne Sacrée',
                'Désert Ardent', 'Toundra Glacée', 'Îles Flottantes', 'Abysses Marins',
                'Ruines Antiques', 'Cité Perdue', 'Laboratoire Abandonné', 'Temple Oublié',
                'Château Hanté', 'Mine Désaffectée', 'Jungle Mystique', 'Vallée Interdite',
                'Tour des Mages', 'Sanctuaire Élémentaire', 'Nécropole Maudite', 'Portail Dimensionnel'
            ],
            npcs: [
                'Maître Alchimiste Zéphyr', 'Marchande Lyra', 'Capitaine Marcus', 'Sage Eldara',
                'Forgeron Thorin', 'Prêtresse Ayla', 'Érudit Cassius', 'Ranger Kai',
                'Mage Luna', 'Guérisseur Finn', 'Noble Darius', 'Artisan Maya',
                'Garde Viktor', 'Oracle Sera', 'Chasseur Rex', 'Bibliothécaire Iris',
                'Mécanicien Gears', 'Diplomate Alexis', 'Espion Shadow', 'Commandant Steel'
            ],
            kingdoms: [
                'AEGYRIA', 'SOMBRENUIT', 'TERRAVERDE', 'CIELNUAGE', 'FLAMMEBOURG',
                'GELOPOLIS', 'VENTARIA', 'AURORALIS', 'OMBRETERRE', 'CRYSTALIS',
                'MAREVERDE', 'SOLARIA'
            ],
            storylines: [
                'La Prophétie Perdue', 'L\'Héritier du Trône', 'La Guerre des Éléments',
                'Le Réveil du Dragon', 'La Malédiction Ancienne', 'Les Sept Sceaux',
                'L\'Alliance Brisée', 'Le Cristal de Pouvoir', 'La Porte Interdite',
                'Le Gardien Éternel', 'La Rébellion des Ombres', 'L\'Artefact Légendaire'
            ]
        };
    }

    /**
     * Génère toutes les quêtes (10,000 principales + 20,000 secondaires)
     */
    async generateAllQuests() {
        if (this.generatedQuests) return;

        console.log('🎯 Génération de 30,000 quêtes...');
        
        // Générer 10,000 quêtes principales
        for (let i = 1; i <= 10000; i++) {
            const quest = this.generateMainQuest(i);
            this.mainQuests.set(quest.id, quest);
        }

        // Générer 20,000 quêtes secondaires
        for (let i = 1; i <= 20000; i++) {
            const quest = this.generateSideQuest(i);
            this.sideQuests.set(quest.id, quest);
        }

        this.generatedQuests = true;
        console.log('✅ 30,000 quêtes générées avec succès !');
    }

    /**
     * Génère une quête principale
     */
    generateMainQuest(questNumber) {
        const template = this.questTemplates.main[questNumber % this.questTemplates.main.length];
        const data = this.getRandomQuestData();
        
        const quest = {
            id: `main_${questNumber}`,
            type: 'main',
            level: Math.floor(questNumber / 100) + 1,
            chapter: Math.floor((questNumber - 1) / 100) + 1,
            title: this.fillTemplate(template.title, data),
            description: this.fillTemplate(template.description, data),
            requirements: {
                level: Math.max(1, Math.floor(questNumber / 150)),
                previousQuest: questNumber > 1 ? `main_${questNumber - 1}` : null,
                kingdom: data.kingdom
            },
            objectives: this.generateObjectives(template.type, data),
            rewards: this.scaleRewards(template.rewards, Math.floor(questNumber / 100) + 1),
            status: 'available',
            difficulty: this.calculateDifficulty(questNumber),
            estimatedTime: this.calculateEstimatedTime(template.type, questNumber),
            created: new Date().toISOString()
        };

        return quest;
    }

    /**
     * Génère une quête secondaire
     */
    generateSideQuest(questNumber) {
        const template = this.questTemplates.side[questNumber % this.questTemplates.side.length];
        const data = this.getRandomQuestData();
        
        const quest = {
            id: `side_${questNumber}`,
            type: 'side',
            level: Math.floor(questNumber / 400) + 1,
            title: this.fillTemplate(template.title, data),
            description: this.fillTemplate(template.description, data),
            requirements: {
                level: Math.max(1, Math.floor(questNumber / 500)),
                kingdom: data.kingdom
            },
            objectives: this.generateObjectives(template.type, data),
            rewards: this.scaleRewards(template.rewards, Math.floor(questNumber / 400) + 1),
            status: 'available',
            difficulty: this.calculateDifficulty(questNumber, 'side'),
            estimatedTime: this.calculateEstimatedTime(template.type, questNumber, 'side'),
            created: new Date().toISOString()
        };

        return quest;
    }

    /**
     * Remplit un template avec des données aléatoires
     */
    fillTemplate(template, data) {
        return template
            .replace('{target}', data.target)
            .replace('{item}', data.item)
            .replace('{location}', data.location)
            .replace('{npc}', data.npc)
            .replace('{kingdom}', data.kingdom)
            .replace('{count}', data.count)
            .replace('{chapter}', data.chapter)
            .replace('{storyline}', data.storyline)
            .replace('{boss}', data.boss)
            .replace('{domain}', data.domain)
            .replace('{from}', data.from)
            .replace('{to}', data.to)
            .replace('{resource}', data.resource)
            .replace('{destination}', data.destination)
            .replace('{name}', data.name);
    }

    /**
     * Obtient des données aléatoires pour générer une quête
     */
    getRandomQuestData() {
        return {
            target: this.getRandomElement(this.questData.targets),
            item: this.getRandomElement(this.questData.items),
            location: this.getRandomElement(this.questData.locations),
            npc: this.getRandomElement(this.questData.npcs),
            kingdom: this.getRandomElement(this.questData.kingdoms),
            storyline: this.getRandomElement(this.questData.storylines),
            count: Math.floor(Math.random() * 10) + 1,
            chapter: Math.floor(Math.random() * 50) + 1,
            boss: this.getRandomElement(this.questData.targets).replace('Mineur', 'Suprême'),
            domain: this.getRandomElement(this.questData.locations),
            from: this.getRandomElement(this.questData.npcs),
            to: this.getRandomElement(this.questData.npcs),
            resource: this.getRandomElement(this.questData.items),
            destination: this.getRandomElement(this.questData.locations),
            name: this.getRandomElement(['Ancienne', 'Mystérieuse', 'Sacrée', 'Maudite'])
        };
    }

    /**
     * Génère les objectifs d'une quête
     */
    generateObjectives(type, data) {
        const objectives = [];
        
        switch (type) {
            case 'kill':
                objectives.push({
                    id: randomUUID(),
                    type: 'eliminate',
                    target: data.target,
                    current: 0,
                    required: data.count,
                    location: data.location
                });
                break;
                
            case 'collect':
                objectives.push({
                    id: randomUUID(),
                    type: 'gather',
                    item: data.item,
                    current: 0,
                    required: data.count,
                    location: data.location
                });
                break;
                
            case 'explore':
                objectives.push({
                    id: randomUUID(),
                    type: 'discovery',
                    location: data.location,
                    progress: 0,
                    required: 100 // Pourcentage
                });
                break;
                
            case 'story':
                objectives.push({
                    id: randomUUID(),
                    type: 'progression',
                    story: data.storyline,
                    chapter: data.chapter,
                    completed: false
                });
                break;
                
            case 'boss':
                objectives.push({
                    id: randomUUID(),
                    type: 'boss_fight',
                    boss: data.boss,
                    location: data.domain,
                    defeated: false
                });
                break;
                
            default:
                objectives.push({
                    id: randomUUID(),
                    type: 'generic',
                    description: 'Compléter la tâche assignée',
                    completed: false
                });
        }
        
        return objectives;
    }

    /**
     * Met à l'échelle les récompenses selon le niveau
     */
    scaleRewards(baseRewards, level) {
        const multiplier = 1 + (level - 1) * 0.5;
        
        return {
            xp: Math.floor(baseRewards.xp * multiplier),
            gold: Math.floor(baseRewards.gold * multiplier),
            items: baseRewards.items || [],
            aura: Math.floor(Math.random() * 10) + 1 // Points d'aura
        };
    }

    /**
     * Calcule la difficulté d'une quête
     */
    calculateDifficulty(questNumber, type = 'main') {
        const base = type === 'main' ? 2 : 1;
        const level = Math.floor(questNumber / (type === 'main' ? 100 : 400)) + base;
        
        if (level <= 2) return 'Facile';
        if (level <= 5) return 'Normale';
        if (level <= 10) return 'Difficile';
        if (level <= 20) return 'Très Difficile';
        return 'Légendaire';
    }

    /**
     * Calcule le temps estimé pour compléter une quête
     */
    calculateEstimatedTime(type, questNumber, questType = 'main') {
        const baseTime = {
            kill: 15,
            collect: 10,
            explore: 25,
            story: 45,
            boss: 60,
            delivery: 5,
            gathering: 8,
            craft: 12,
            escort: 18,
            puzzle: 20
        };
        
        const multiplier = questType === 'main' ? 1.5 : 1;
        const levelBonus = Math.floor(questNumber / 100) * 5;
        
        return Math.floor((baseTime[type] || 15) * multiplier) + levelBonus;
    }

    /**
     * Obtient une quête par ID
     */
    getQuestById(questId) {
        if (!this.generatedQuests) {
            this.generateAllQuests();
        }
        
        return this.mainQuests.get(questId) || this.sideQuests.get(questId);
    }

    /**
     * Obtient des quêtes disponibles pour un joueur
     */
    getAvailableQuests(playerLevel, kingdom, limit = 10) {
        if (!this.generatedQuests) {
            this.generateAllQuests();
        }
        
        const availableQuests = [];
        
        // Quêtes principales
        for (const [id, quest] of this.mainQuests) {
            if (quest.requirements.level <= playerLevel && 
                quest.requirements.kingdom === kingdom &&
                quest.status === 'available') {
                availableQuests.push(quest);
            }
            if (availableQuests.length >= limit / 2) break;
        }
        
        // Quêtes secondaires
        for (const [id, quest] of this.sideQuests) {
            if (quest.requirements.level <= playerLevel && 
                quest.requirements.kingdom === kingdom &&
                quest.status === 'available') {
                availableQuests.push(quest);
            }
            if (availableQuests.length >= limit) break;
        }
        
        return availableQuests;
    }

    /**
     * Met à jour le progrès d'une quête
     */
    updateQuestProgress(questId, objectiveId, progress) {
        const quest = this.getQuestById(questId);
        if (!quest) return false;
        
        const objective = quest.objectives.find(obj => obj.id === objectiveId);
        if (!objective) return false;
        
        // Mettre à jour selon le type d'objectif
        switch (objective.type) {
            case 'eliminate':
                objective.current = Math.min(objective.current + progress, objective.required);
                break;
            case 'gather':
                objective.current = Math.min(objective.current + progress, objective.required);
                break;
            case 'discovery':
                objective.progress = Math.min(objective.progress + progress, objective.required);
                break;
            case 'progression':
            case 'boss_fight':
            case 'generic':
                objective.completed = true;
                break;
        }
        
        // Vérifier si la quête est complétée
        const allCompleted = quest.objectives.every(obj => {
            return obj.completed || 
                   obj.current >= obj.required || 
                   obj.progress >= obj.required;
        });
        
        if (allCompleted) {
            quest.status = 'completed';
            quest.completedAt = new Date().toISOString();
        }
        
        return true;
    }

    /**
     * Formate l'affichage d'une quête
     */
    formatQuestDisplay(quest) {
        const difficultyEmojis = {
            'Facile': '🟢',
            'Normale': '🟡',
            'Difficile': '🟠',
            'Très Difficile': '🔴',
            'Légendaire': '🟣'
        };
        
        const typeEmojis = {
            'main': '⭐',
            'side': '📋'
        };
        
        let display = `${typeEmojis[quest.type]} **${quest.title}**\n`;
        display += `${difficultyEmojis[quest.difficulty]} ${quest.difficulty} • Niveau ${quest.requirements.level}\n`;
        display += `📖 ${quest.description}\n\n`;
        
        display += `**Objectifs:**\n`;
        quest.objectives.forEach((obj, index) => {
            const progress = this.formatObjectiveProgress(obj);
            display += `${index + 1}. ${progress}\n`;
        });
        
        display += `\n**Récompenses:**\n`;
        display += `💫 ${quest.rewards.xp} XP\n`;
        display += `💰 ${quest.rewards.gold} Or\n`;
        if (quest.rewards.aura) {
            display += `✨ ${quest.rewards.aura} Aura\n`;
        }
        if (quest.rewards.items.length > 0) {
            display += `🎁 ${quest.rewards.items.join(', ')}\n`;
        }
        
        display += `\n⏱️ Temps estimé: ${quest.estimatedTime} minutes`;
        
        return display;
    }

    /**
     * Formate le progrès d'un objectif
     */
    formatObjectiveProgress(objective) {
        switch (objective.type) {
            case 'eliminate':
                return `Éliminer ${objective.target}: ${objective.current}/${objective.required}`;
            case 'gather':
                return `Collecter ${objective.item}: ${objective.current}/${objective.required}`;
            case 'discovery':
                return `Explorer ${objective.location}: ${objective.progress}/${objective.required}%`;
            case 'progression':
                return `Histoire "${objective.story}" - Chapitre ${objective.chapter}: ${objective.completed ? '✅' : '⏳'}`;
            case 'boss_fight':
                return `Vaincre ${objective.boss}: ${objective.defeated ? '✅' : '⏳'}`;
            default:
                return `${objective.description}: ${objective.completed ? '✅' : '⏳'}`;
        }
    }

    /**
     * Obtient un élément aléatoire d'un tableau
     */
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Recherche des quêtes par critères
     */
    searchQuests(criteria) {
        if (!this.generatedQuests) {
            this.generateAllQuests();
        }
        
        const results = [];
        const allQuests = [...this.mainQuests.values(), ...this.sideQuests.values()];
        
        for (const quest of allQuests) {
            let matches = true;
            
            if (criteria.type && quest.type !== criteria.type) matches = false;
            if (criteria.difficulty && quest.difficulty !== criteria.difficulty) matches = false;
            if (criteria.kingdom && quest.requirements.kingdom !== criteria.kingdom) matches = false;
            if (criteria.minLevel && quest.requirements.level < criteria.minLevel) matches = false;
            if (criteria.maxLevel && quest.requirements.level > criteria.maxLevel) matches = false;
            if (criteria.status && quest.status !== criteria.status) matches = false;
            if (criteria.search && !quest.title.toLowerCase().includes(criteria.search.toLowerCase())) matches = false;
            
            if (matches) {
                results.push(quest);
            }
            
            if (results.length >= (criteria.limit || 20)) break;
        }
        
        return results;
    }

    /**
     * Obtient les statistiques des quêtes
     */
    getQuestStats() {
        if (!this.generatedQuests) {
            this.generateAllQuests();
        }
        
        return {
            totalMainQuests: this.mainQuests.size,
            totalSideQuests: this.sideQuests.size,
            totalQuests: this.mainQuests.size + this.sideQuests.size,
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = QuestManager;