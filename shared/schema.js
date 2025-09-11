const { pgTable, serial, text, integer, timestamp, boolean, json } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

// Table des joueurs
const players = pgTable('players', {
  id: serial('id').primaryKey(),
  whatsappNumber: text('whatsapp_number').notNull().unique(),
  username: text('username').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActive: timestamp('last_active').defaultNow().notNull(),
});

// Table des personnages
const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  name: text('name').notNull(),
  gender: text('gender').notNull(), // 'male' ou 'female'
  kingdom: text('kingdom').notNull(),
  order: text('order'),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  
  // Barres de vie et d'énergie
  currentLife: integer('current_life').default(100).notNull(),
  maxLife: integer('max_life').default(100).notNull(),
  currentEnergy: integer('current_energy').default(100).notNull(),
  maxEnergy: integer('max_energy').default(100).notNull(),
  
  // Niveau de friction et puissance
  powerLevel: text('power_level').default('G').notNull(), // G, F, E, D, C, B, A
  frictionLevel: text('friction_level').default('G').notNull(),
  
  // Position dans le monde
  currentLocation: text('current_location').notNull(),
  position: json('position').notNull(), // {x: number, y: number, z?: number}
  
  // Équipement actuel
  equipment: json('equipment').notNull(), // {weapon?: string, armor?: string, accessories?: string[]}
  
  // Techniques apprises
  learnedTechniques: json('learned_techniques').notNull(), // string[]
  
  // Statistiques
  coins: integer('coins').default(0).notNull(),
  inventory: json('inventory').notNull(), // {itemId: string, quantity: number}[]
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Table des royaumes
const kingdoms = pgTable('kingdoms', {
  id: text('id').primaryKey(), // AEGYRIA, SOMBRENUIT, etc.
  name: text('name').notNull(),
  description: text('description').notNull(),
  geography: text('geography').notNull(),
  culture: text('culture').notNull(),
  specialties: json('specialties').notNull(), // string[]
  particularities: text('particularities').notNull(),
});

// Table des ordres
const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  hierarchy: json('hierarchy').notNull(), // {rank: string, title: string}[]
  specialties: json('specialties').notNull(), // string[]
  location: text('location').notNull(),
  kingdom: text('kingdom'), // Peut être null pour les ordres neutres
});

// Table des techniques
const techniques = pgTable('techniques', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  requiredLevel: integer('required_level').notNull(),
  requiredOrder: text('required_order'), // Peut être null
  energyCost: integer('energy_cost').notNull(),
  damage: integer('damage').notNull(),
  type: text('type').notNull(), // 'attack', 'defense', 'magic', 'special'
});

// Table des équipements
const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'weapon', 'armor', 'accessory'
  rarity: text('rarity').notNull(), // 'common', 'rare', 'epic', 'legendary'
  stats: json('stats').notNull(), // {attack?: number, defense?: number, energy?: number}
  requirements: json('requirements').notNull(), // {level?: number, order?: string, kingdom?: string}
  imageUrl: text('image_url'),
});

// Table des sessions de jeu
const gameSessions = pgTable('game_sessions', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  characterId: integer('character_id').notNull().references(() => characters.id),
  chatId: text('chat_id').notNull(), // ID du chat WhatsApp (groupe ou privé)
  gameState: json('game_state').notNull(), // État actuel du jeu
  lastAction: text('last_action'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Table pour la mémoire contextuelle de l'IA
const conversationMemory = pgTable('conversation_memory', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(), // player_X ou global
  playerId: integer('player_id').references(() => players.id),
  characterId: integer('character_id').references(() => characters.id),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  location: text('location'),
  action: text('action'),
  contextData: json('context_data'), // Données contextuelles supplémentaires
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  importance: integer('importance').default(5).notNull(), // 1-10 pour prioriser les souvenirs
  memoryType: text('memory_type').default('conversation').notNull(), // 'conversation', 'location', 'event', 'character'
});

// Table pour les événements marquants du personnage (mémoire longue terme)
const characterMemories = pgTable('character_memories', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characters.id),
  memoryTitle: text('memory_title').notNull(),
  memoryContent: text('memory_content').notNull(),
  location: text('location'),
  participants: json('participants'), // Autres personnages impliqués
  memoryType: text('memory_type').notNull(), // 'achievement', 'trauma', 'discovery', 'relationship'
  importance: integer('importance').default(5).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
const playersRelations = relations(players, ({ many }) => ({
  characters: many(characters),
  gameSessions: many(gameSessions),
}));

const charactersRelations = relations(characters, ({ one, many }) => ({
  player: one(players, {
    fields: [characters.playerId],
    references: [players.id],
  }),
  gameSessions: many(gameSessions),
}));

const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  player: one(players, {
    fields: [gameSessions.playerId],
    references: [players.id],
  }),
  character: one(characters, {
    fields: [gameSessions.characterId],
    references: [characters.id],
  }),
}));

// Relations pour la mémoire
const conversationMemoryRelations = relations(conversationMemory, ({ one }) => ({
  player: one(players, {
    fields: [conversationMemory.playerId],
    references: [players.id],
  }),
  character: one(characters, {
    fields: [conversationMemory.characterId],
    references: [characters.id],
  }),
}));

const characterMemoriesRelations = relations(characterMemories, ({ one }) => ({
  character: one(characters, {
    fields: [characterMemories.characterId],
    references: [characters.id],
  }),
}));

// Exports
module.exports = {
  players,
  characters,
  kingdoms,
  orders,
  techniques,
  equipment,
  gameSessions,
  conversationMemory,
  characterMemories,
  playersRelations,
  charactersRelations,
  gameSessionsRelations,
  conversationMemoryRelations,
  characterMemoriesRelations
};