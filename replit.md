# Overview

Friction Ultimate is a WhatsApp RPG bot built with Node.js that provides an immersive medieval-technological gaming experience. Players can create characters, explore kingdoms, engage in combat, and progress through a complex RPG system entirely through WhatsApp messages. The game features a steampunk-inspired world with multiple kingdoms, character progression, combat mechanics, and AI-powered narration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Runtime**: Node.js with CommonJS modules
- **WhatsApp Integration**: @whiskeysockets/baileys for WhatsApp Web API connection
- **Session Management**: Multi-file authentication state for persistent WhatsApp sessions

## Database Architecture
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL configured for Neon serverless
- **Schema Design**: 
  - Players table for user management (WhatsApp numbers, usernames, activity tracking)
  - Characters table for RPG data (stats, equipment, location, progression)
  - JSON fields for complex data structures (inventory, equipment, techniques)
- **Connection**: Pool-based connections with WebSocket support for serverless environments

## Game Engine
- **Command System**: Handler-based command processing for RPG actions
- **Character Management**: Creation, progression, and stat tracking
- **World System**: Kingdom-based geography with position tracking
- **Combat Engine**: Turn-based combat with friction/power level mechanics
- **Inventory System**: JSON-based item and equipment management

## API Configuration Management
- **Centralized Config**: `config/apiKeys.js` manages all API keys securely via environment variables
- **Service Priority**: Automatic fallback system with preferred service ordering
- **Status Monitoring**: Real-time availability checking for all external services
- **Security**: No hardcoded API keys, all secrets managed through environment variables

## AI Integration
- **Primary Provider**: Groq (ultra-fast LLaMA models for narration)
- **Secondary Providers**: Google Gemini, OpenAI GPT (configurable via API keys)
- **Fallback Strategy**: Graceful degradation when AI services are unavailable
- **Use Cases**: Dynamic narration generation, combat descriptions, character interactions

## Image Processing
- **Canvas Rendering**: node-canvas for programmatic image creation
- **Image Processing**: Sharp library for image manipulation and optimization
- **Caching Strategy**: In-memory cache for frequently used images
- **Asset Management**: Organized folder structure for game assets and temporary files

## Message Processing
- **Deduplication**: Set-based system to prevent duplicate message processing
- **Command Routing**: Pattern-based command dispatcher with handler methods
- **State Management**: Database-backed player and character state persistence
- **Response Generation**: Rich text formatting with optional image attachments

## Error Handling
- **Connection Resilience**: Automatic reconnection for WhatsApp Web sessions
- **Database Fallbacks**: Graceful error handling for database operations
- **Service Degradation**: Fallback responses when external services fail
- **Logging**: Comprehensive error logging with emoji-based status indicators

# Recent Changes

## Quest & Aura System Implementation (September 26, 2025)
- ✅ **Quest System:** 10,000 main quests + 20,000 side quests with comprehensive database schema
- ✅ **Quest Management:** Dynamic quest generation with level-based requirements and kingdom filtering
- ✅ **Quest Commands:** Complete command set for quest discovery, acceptance, and tracking
- ✅ **Aura Training System:** 10-day training cycles with real-time 30-second loading animations
- ✅ **Aura Techniques:** 7 aura types (fire, water, earth, wind, lightning, shadow, light) with mastery progression
- ✅ **Time & Weather System:** Dynamic game time progression with environmental effects
- ✅ **Weather Events:** Real-time weather simulation affecting gameplay mechanics
- ✅ **Database Schema:** Complete tables for quests, aura training, world events, and time tracking
- ✅ **Command Integration:** All new commands integrated into GameEngine with full error handling

## API Configuration System Added (September 25, 2025)
- ✅ Centralized API configuration in `config/apiKeys.js`
- ✅ Secure environment variable management with `config/env.example`
- ✅ Comprehensive API status monitoring and fallback system
- ✅ Priority-based service selection for optimal performance
- ✅ Real-time service availability checking
- ✅ Complete documentation for all supported API services

## Replit Environment Setup Completed (September 23, 2025)
- ✅ Fresh GitHub import successfully configured for Replit
- ✅ Dependencies installed successfully (npm install - all 245 packages)
- ✅ PostgreSQL database created and configured via Replit integration  
- ✅ Database schema pushed successfully (npm run db:push)
- ✅ TypeScript compilation issues resolved
- ✅ SessionManager compatibility issues fixed (added missing methods)
- ✅ WhatsApp bot startup working properly with QR code generation
- ✅ Keep-alive web server running on port 5000 (0.0.0.0 binding)
- ✅ Deployment configured for Replit VM environment (stateful connections)
- ✅ All game data (kingdoms, orders) initialized in database
- ✅ 3D Blender integration confirmed working
- ✅ Image generation services (Pollinations, Freepik) operational
- ✅ Project import fully completed and functional

## Current Service Status
- **Database**: ✅ Fully operational PostgreSQL
- **WhatsApp**: ✅ Connected and active (QR Code authentication)
- **AI Services**: ✅ Groq (ultra-fast), ⚠️ Gemini/OpenAI (require keys)
- **Image Generation**: ✅ Pollinations (free), ✅ Freepik (fallback)
- **Video Generation**: ✅ HuggingFace (free), ⚠️ Runway (premium)
- **Voice Synthesis**: ⚠️ PlayHT/CambAI (require API keys)
- **3D Assets**: ✅ Blender integration operational

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Connection Pool**: @neondatabase/serverless for efficient connection management

## WhatsApp Integration
- **Baileys Library**: Complete WhatsApp Web API implementation
- **QR Code Generation**: qrcode-terminal for initial authentication
- **WebSocket**: ws library for real-time communication

## AI Services
- **Google Gemini**: Generative AI for text and image content
- **API Integration**: @google/generative-ai client library
- **Image Generation**: Gemini 2.0-flash-experimental for visual content

## Image Processing
- **Sharp**: High-performance image processing library
- **Canvas**: HTML5 Canvas API implementation for Node.js
- **File System**: Native fs module with promises for asset management

## Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Environment Variables**: dotenv pattern for configuration management
- **Package Management**: npm with lockfile for dependency consistency