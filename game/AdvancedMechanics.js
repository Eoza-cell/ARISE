
class AdvancedGameMechanics {
    constructor(dbManager, gameEngine) {
        this.dbManager = dbManager;
        this.gameEngine = gameEngine;
        this.reputationSystem = new Map();
        this.factionInfluence = new Map();
        this.dynamicPricing = new Map();
        
        // Initialiser les systèmes
        this.initWeatherSystem();
        this.initEconomySystem();
    }

    // 🌟 SYSTÈME DE RÉPUTATION DYNAMIQUE (comme GTA)
    async updateReputation(playerId, action, witnesses = 0) {
        const currentRep = this.reputationSystem.get(playerId) || {
            honor: 50,
            fear: 0,
            respect: 50,
            notoriety: 0,
            factionStanding: new Map()
        };

        if (action.includes('attaque') && witnesses > 0) {
            currentRep.fear += Math.min(witnesses * 2, 10);
            currentRep.honor -= 5;
            currentRep.notoriety += witnesses;
        }

        if (action.includes('aide') || action.includes('protège')) {
            currentRep.honor += 3;
            currentRep.respect += 2;
        }

        this.reputationSystem.set(playerId, currentRep);
        await this.dbManager.setTemporaryData(playerId, 'reputation', currentRep);

        return this.getReputationEffects(currentRep);
    }

    getReputationEffects(reputation) {
        const effects = [];
        
        if (reputation.fear > 75) {
            effects.push("😱 Les PNJ vous évitent par peur");
            effects.push("💰 Les marchands augmentent leurs prix");
            effects.push("🚨 Les gardes vous surveillent de près");
        }

        if (reputation.honor > 80) {
            effects.push("✨ Les nobles vous respectent");
            effects.push("🎁 Vous recevez des faveurs spéciales");
            effects.push("🏆 Accès à des quêtes exclusives");
        }

        return effects;
    }

    // 🎲 ÉVÉNEMENTS ALÉATOIRES DYNAMIQUES
    async triggerRandomEvent(character, location) {
        const events = [
            {
                type: 'encounter',
                description: '🤝 Rencontre avec un marchand mystérieux',
                choices: ['Négocier', 'Ignorer', 'Enquêter'],
                consequences: {
                    'Négocier': 'coins+50',
                    'Ignorer': 'nothing',
                    'Enquêter': 'info+secret'
                }
            },
            {
                type: 'challenge',
                description: '⚔️ Défi lancé par un guerrier local',
                choices: ['Accepter', 'Refuser', 'Négocier'],
                consequences: {
                    'Accepter': 'combat_hard',
                    'Refuser': 'reputation-5',
                    'Négocier': 'test_charisma'
                }
            },
            {
                type: 'opportunity',
                description: '💎 Découverte d\'un objet précieux abandonné',
                choices: ['Prendre', 'Signaler', 'Examiner'],
                consequences: {
                    'Prendre': 'item+rare',
                    'Signaler': 'honor+10',
                    'Examiner': 'knowledge+lore'
                }
            }
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        
        await this.dbManager.setTemporaryData(character.playerId, 'pending_event', randomEvent);
        
        return {
            description: randomEvent.description,
            choices: randomEvent.choices,
            eventId: Date.now()
        };
    }

    // 🌦️ SYSTÈME MÉTÉO DYNAMIQUE
    initWeatherSystem() {
        this.weatherSystem = {
            currentWeather: 'clear',
            weatherCycle: ['clear', 'cloudy', 'rain', 'storm', 'fog'],
            lastChange: Date.now(),
            
            updateWeather: function(location) {
                const now = Date.now();
                const timeSinceChange = now - this.lastChange;
                
                // Changement météo toutes les 30 minutes réelles
                if (timeSinceChange > 30 * 60 * 1000) {
                    const changeChance = Math.random();
                    if (changeChance > 0.7) {
                        const currentIndex = this.weatherCycle.indexOf(this.currentWeather);
                        const nextIndex = (currentIndex + 1) % this.weatherCycle.length;
                        this.currentWeather = this.weatherCycle[nextIndex];
                        this.lastChange = now;
                    }
                }

                return this.getWeatherEffects(this.currentWeather, location);
            },
            
            getWeatherEffects: function(weather, location) {
                const effects = {
                    clear: { visibility: 100, movement: 100, mood: 'positive' },
                    cloudy: { visibility: 90, movement: 100, mood: 'neutral' },
                    rain: { visibility: 70, movement: 80, mood: 'somber' },
                    storm: { visibility: 50, movement: 60, mood: 'dramatic' },
                    fog: { visibility: 30, movement: 90, mood: 'mysterious' }
                };

                return effects[weather];
            }
        };
    }

    // 💰 ÉCONOMIE DYNAMIQUE
    initEconomySystem() {
        this.economyEngine = {
            marketPrices: new Map(),
            supplyDemand: new Map(),
            marketEvents: [],
            
            updateMarketPrices: function(playerActions) {
                // Les actions des joueurs affectent l'économie
                playerActions.forEach(action => {
                    if (action.includes('vendre')) {
                        this.increaseSupply(action.item);
                    }
                    if (action.includes('acheter')) {
                        this.increaseDemand(action.item);
                    }
                });

                // Événements économiques aléatoires
                if (Math.random() > 0.95) {
                    this.triggerMarketEvent();
                }
            },
            
            triggerMarketEvent: function() {
                const events = [
                    '📈 Hausse des prix des métaux précieux (+20%)',
                    '📉 Surplus d\'armes sur le marché (-15%)',
                    '⚔️ Conflit régional - Hausse des prix militaires (+30%)',
                    '🌾 Bonne récolte - Baisse des prix alimentaires (-25%)'
                ];

                const event = events[Math.floor(Math.random() * events.length)];
                this.marketEvents.push({
                    event,
                    timestamp: Date.now(),
                    duration: 24 * 60 * 60 * 1000 // 24h
                });
            },
            
            increaseSupply: function(item) {
                // Logique d'augmentation de l'offre
            },
            
            increaseDemand: function(item) {
                // Logique d'augmentation de la demande
            }
        };
    }

    // 🎯 SYSTÈME DE FACTIONS INTELLIGENT
    async processFactionInteraction(playerId, action, targetFaction) {
        const factionStandings = await this.getFactionStandings(playerId);
        
        // Impact sur les relations
        if (action.includes('attaque') && targetFaction) {
            factionStandings[targetFaction] = Math.max(0, 
                (factionStandings[targetFaction] || 50) - 15);
            
            // Les factions alliées sont aussi affectées
            const allies = this.getFactionAllies(targetFaction);
            allies.forEach(ally => {
                factionStandings[ally] = Math.max(0,
                    (factionStandings[ally] || 50) - 5);
            });
        }

        if (action.includes('aide') && targetFaction) {
            factionStandings[targetFaction] = Math.min(100,
                (factionStandings[targetFaction] || 50) + 10);
        }

        await this.dbManager.setTemporaryData(playerId, 'faction_standings', factionStandings);
        
        return this.getFactionEffects(factionStandings);
    }

    // 🔄 ADAPTATION INTELLIGENTE DE DIFFICULTÉ
    async adaptDifficulty(playerId, recentPerformance) {
        const baseStats = await this.dbManager.getCharacterByPlayer(playerId);
        const adaptations = [];

        if (recentPerformance.victories > 5) {
            adaptations.push('Ennemis plus tactiques');
            adaptations.push('Événements plus complexes');
        }

        if (recentPerformance.defeats > 3) {
            adaptations.push('Alliés occasionnels');
            adaptations.push('Équipements trouvés plus fréquents');
        }

        return adaptations;
    }

    // 🎪 ÉVÉNEMENTS SOCIAUX COMPLEXES
    generateSocialEvent(character, location) {
        const socialEvents = [
            {
                type: 'festival',
                description: '🎊 Festival local en cours - Ambiance joyeuse',
                effects: ['prices_reduced', 'social_bonus', 'rare_items_available'],
                duration: '2 hours'
            },
            {
                type: 'political_tension',
                description: '⚖️ Tensions politiques palpables dans l\'air',
                effects: ['guards_suspicious', 'info_valuable', 'faction_recruits'],
                duration: '6 hours'
            },
            {
                type: 'market_day',
                description: '🏪 Grand jour de marché - Commerce intense',
                effects: ['more_traders', 'better_deals', 'pickpocket_risk'],
                duration: '4 hours'
            }
        ];

        return socialEvents[Math.floor(Math.random() * socialEvents.length)];
    }

    // 🏆 GÉNÉRATION DE DÉFIS QUOTIDIENS
    generateDailyChallenges(character) {
        const challenges = [
            {
                name: 'Explorateur Intrépide',
                description: 'Explorez 3 nouvelles zones aujourd\'hui',
                reward: '50 XP + Carte rare'
            },
            {
                name: 'Guerrier Valeureux',
                description: 'Remportez 5 combats consécutifs',
                reward: '75 XP + Équipement amélioré'
            },
            {
                name: 'Marchand Avisé',
                description: 'Effectuez 10 transactions commerciales',
                reward: '100 pièces d\'or + Bonus réputation'
            },
            {
                name: 'Diplomate Habile',
                description: 'Réussissez 3 négociations difficiles',
                reward: '60 XP + Accès faction exclusive'
            },
            {
                name: 'Survivaliste',
                description: 'Survivez une journée complète sans mourir',
                reward: '80 XP + Objet de survie rare'
            }
        ];

        // Sélectionner 3 défis aléatoires
        const selectedChallenges = [];
        const availableChallenges = [...challenges];
        
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * availableChallenges.length);
            selectedChallenges.push(availableChallenges.splice(randomIndex, 1)[0]);
        }

        return selectedChallenges;
    }

    // 🤝 OBTENIR LES ALLIÉS D'UNE FACTION
    getFactionAllies(faction) {
        const alliances = {
            'Garde Royale': ['Ordre des Paladins', 'Guilde des Marchands'],
            'Ordre des Paladins': ['Garde Royale', 'Temple de la Lumière'],
            'Assassins': ['Voleurs', 'Contrebandiers'],
            'Voleurs': ['Assassins', 'Marchands Noirs'],
            'Mages': ['Érudits', 'Alchimistes']
        };
        
        return alliances[faction] || [];
    }

    // 📊 OBTENIR LES EFFETS DES FACTIONS
    getFactionEffects(factionStandings) {
        const effects = [];
        
        Object.entries(factionStandings).forEach(([faction, standing]) => {
            if (standing > 80) {
                effects.push(`✨ ${faction}: Accès privilégié aux services`);
            } else if (standing < 20) {
                effects.push(`⚠️ ${faction}: Hostilité - Prix augmentés`);
            }
        });
        
        return effects;
    }
}

module.exports = AdvancedGameMechanics;
