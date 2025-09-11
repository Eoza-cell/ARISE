const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, and } = require('drizzle-orm');
const ws = require('ws');

// Import du schéma
const schema = require('../shared/schema.js');

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.db = null;
    }

    async initialize() {
        try {
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is required');
            }

            // Configuration Neon
            const { neonConfig } = require('@neondatabase/serverless');
            neonConfig.webSocketConstructor = ws;

            this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
            this.db = drizzle(this.pool, { schema });

            console.log('✅ Connexion à la base de données établie');
            
            // Push du schéma vers la base de données
            await this.pushSchema();
            
        } catch (error) {
            console.error('❌ Erreur de connexion à la base de données:', error);
            throw error;
        }
    }

    async pushSchema() {
        try {
            console.log('📊 Initialisation du schéma de base de données...');
            
            // Vérifier si les tables existent déjà
            const tableCheckQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('players', 'characters', 'kingdoms', 'orders', 'techniques', 'equipment', 'game_sessions')
            `;
            
            const existingTables = await this.pool.query(tableCheckQuery);
            
            if (existingTables.rows.length === 0) {
                console.log('📊 Création des tables de base de données...');
                
                // Créer les tables dans l'ordre correct (dépendances)
                await this.createTables();
                
                console.log('✅ Tables créées avec succès');
            } else {
                console.log('✅ Tables de base de données déjà existantes');
            }
            
            console.log('✅ Schéma de base de données initialisé');
        } catch (error) {
            console.error('❌ Erreur lors de la création du schéma:', error);
            throw error;
        }
    }

    async createTables() {
        // Créer les tables en SQL direct (pour bootstrap initial)
        const createTablesSQL = `
            -- Table des joueurs
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                whatsapp_number TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                last_active TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table des royaumes
            CREATE TABLE IF NOT EXISTS kingdoms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                geography TEXT NOT NULL,
                culture TEXT NOT NULL,
                specialties JSON NOT NULL,
                particularities TEXT NOT NULL
            );

            -- Table des ordres
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                hierarchy JSON NOT NULL,
                specialties JSON NOT NULL,
                location TEXT NOT NULL,
                kingdom TEXT
            );

            -- Table des techniques
            CREATE TABLE IF NOT EXISTS techniques (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                required_level INTEGER NOT NULL,
                required_order TEXT,
                energy_cost INTEGER NOT NULL,
                damage INTEGER NOT NULL,
                type TEXT NOT NULL
            );

            -- Table des équipements
            CREATE TABLE IF NOT EXISTS equipment (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,
                rarity TEXT NOT NULL,
                stats JSON NOT NULL,
                requirements JSON NOT NULL,
                image_url TEXT
            );

            -- Table des personnages
            CREATE TABLE IF NOT EXISTS characters (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL REFERENCES players(id),
                name TEXT NOT NULL,
                gender TEXT NOT NULL,
                kingdom TEXT NOT NULL,
                "order" TEXT,
                level INTEGER DEFAULT 1 NOT NULL,
                experience INTEGER DEFAULT 0 NOT NULL,
                current_life INTEGER DEFAULT 100 NOT NULL,
                max_life INTEGER DEFAULT 100 NOT NULL,
                current_energy INTEGER DEFAULT 100 NOT NULL,
                max_energy INTEGER DEFAULT 100 NOT NULL,
                power_level TEXT DEFAULT 'G' NOT NULL,
                friction_level TEXT DEFAULT 'G' NOT NULL,
                current_location TEXT NOT NULL,
                position JSON NOT NULL,
                equipment JSON NOT NULL,
                learned_techniques JSON NOT NULL,
                coins INTEGER DEFAULT 0 NOT NULL,
                inventory JSON NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table des sessions de jeu
            CREATE TABLE IF NOT EXISTS game_sessions (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL REFERENCES players(id),
                character_id INTEGER NOT NULL REFERENCES characters(id),
                chat_id TEXT NOT NULL,
                game_state JSON NOT NULL,
                last_action TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Index pour améliorer les performances
            CREATE INDEX IF NOT EXISTS idx_players_whatsapp ON players(whatsapp_number);
            CREATE INDEX IF NOT EXISTS idx_characters_player ON characters(player_id);
            CREATE INDEX IF NOT EXISTS idx_game_sessions_player_chat ON game_sessions(player_id, chat_id);
        `;

        await this.pool.query(createTablesSQL);
    }

    // Gestion des joueurs
    async getPlayerByWhatsApp(whatsappNumber) {
        try {
            const [player] = await this.db
                .select()
                .from(schema.players)
                .where(eq(schema.players.whatsappNumber, whatsappNumber))
                .limit(1);
            return player || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du joueur:', error);
            throw error;
        }
    }

    async createPlayer(whatsappNumber, username) {
        try {
            const [player] = await this.db
                .insert(schema.players)
                .values({
                    whatsappNumber,
                    username,
                    createdAt: new Date(),
                    lastActive: new Date()
                })
                .returning();
            return player;
        } catch (error) {
            console.error('❌ Erreur lors de la création du joueur:', error);
            throw error;
        }
    }

    async updatePlayerActivity(playerId) {
        try {
            await this.db
                .update(schema.players)
                .set({ lastActive: new Date() })
                .where(eq(schema.players.id, playerId));
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de l\'activité:', error);
        }
    }

    // Gestion des personnages
    async getCharacterByPlayer(playerId) {
        try {
            const [character] = await this.db
                .select()
                .from(schema.characters)
                .where(eq(schema.characters.playerId, playerId))
                .limit(1);
            return character || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du personnage:', error);
            throw error;
        }
    }

    async createCharacter(characterData) {
        try {
            const [character] = await this.db
                .insert(schema.characters)
                .values({
                    ...characterData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
                .returning();
            return character;
        } catch (error) {
            console.error('❌ Erreur lors de la création du personnage:', error);
            throw error;
        }
    }

    async updateCharacter(characterId, updates) {
        try {
            const [character] = await this.db
                .update(schema.characters)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(schema.characters.id, characterId))
                .returning();
            return character;
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour du personnage:', error);
            throw error;
        }
    }

    // Gestion des sessions de jeu
    async getGameSession(playerId, chatId) {
        try {
            const [session] = await this.db
                .select()
                .from(schema.gameSessions)
                .where(
                    and(
                        eq(schema.gameSessions.playerId, playerId),
                        eq(schema.gameSessions.chatId, chatId)
                    )
                )
                .limit(1);
            return session || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la session:', error);
            throw error;
        }
    }

    async createGameSession(sessionData) {
        try {
            const [session] = await this.db
                .insert(schema.gameSessions)
                .values({
                    ...sessionData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
                .returning();
            return session;
        } catch (error) {
            console.error('❌ Erreur lors de la création de la session:', error);
            throw error;
        }
    }

    async updateGameSession(sessionId, updates) {
        try {
            const [session] = await this.db
                .update(schema.gameSessions)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(schema.gameSessions.id, sessionId))
                .returning();
            return session;
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de la session:', error);
            throw error;
        }
    }

    // Gestion des royaumes et ordres
    async getAllKingdoms() {
        try {
            return await this.db.select().from(schema.kingdoms);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des royaumes:', error);
            throw error;
        }
    }

    async getAllOrders() {
        try {
            return await this.db.select().from(schema.orders);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des ordres:', error);
            throw error;
        }
    }

    async getKingdomById(kingdomId) {
        try {
            const [kingdom] = await this.db
                .select()
                .from(schema.kingdoms)
                .where(eq(schema.kingdoms.id, kingdomId))
                .limit(1);
            return kingdom || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du royaume:', error);
            throw error;
        }
    }

    async getOrderById(orderId) {
        try {
            const [order] = await this.db
                .select()
                .from(schema.orders)
                .where(eq(schema.orders.id, orderId))
                .limit(1);
            return order || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de l\'ordre:', error);
            throw error;
        }
    }

    // Méthodes utilitaires
    async insertKingdom(kingdomData) {
        try {
            await this.db.insert(schema.kingdoms).values(kingdomData);
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion du royaume:', error);
            throw error;
        }
    }

    async insertOrder(orderData) {
        try {
            await this.db.insert(schema.orders).values(orderData);
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion de l\'ordre:', error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }

    // Méthodes pour les données temporaires (création de personnage)
    async setTemporaryData(playerId, key, value) {
        try {
            if (!this.tempData) {
                this.tempData = new Map();
            }
            
            const playerKey = `${playerId}_${key}`;
            this.tempData.set(playerKey, value);
            
            // Auto-nettoyage après 10 minutes
            setTimeout(() => {
                this.tempData.delete(playerKey);
            }, 10 * 60 * 1000);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde temporaire:', error);
        }
    }

    async getTemporaryData(playerId, key) {
        try {
            if (!this.tempData) {
                return null;
            }
            
            const playerKey = `${playerId}_${key}`;
            return this.tempData.get(playerKey) || null;
            
        } catch (error) {
            console.error('❌ Erreur lors de la récupération temporaire:', error);
            return null;
        }
    }

    async clearTemporaryData(playerId, key) {
        try {
            if (!this.tempData) {
                return;
            }
            
            const playerKey = `${playerId}_${key}`;
            this.tempData.delete(playerKey);
            
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage temporaire:', error);
        }
    }

    async getCharacterByName(name) {
        try {
            const [character] = await this.db
                .select()
                .from(schema.characters)
                .where(eq(schema.characters.name, name))
                .limit(1);
            
            return character || null;
        } catch (error) {
            console.error('❌ Erreur lors de la recherche par nom:', error);
            return null;
        }
    }
}

module.exports = DatabaseManager;