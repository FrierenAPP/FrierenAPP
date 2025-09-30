const { LavalinkManager } = require('lavalink-client');
const textos = require('../../utilidades/textos.js');
const { moduloCargado, moduloFallo } = require('../../sistema/logs_modulos.js');

let lavalinkManager = null;

// Función para cargar el módulo
function cargar(client) {
    try {
        // Crear instancia de LavalinkManager
        lavalinkManager = new LavalinkManager({
            nodes: [
                {
                    authorization: 'mipasswordsegura',
                    host: 'localhost',
                    port: 2333,
                    id: 'Main',
                    secure: false
                }
            ],
            sendToShard: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            },
            client: {
                id: client.user?.id || 'unknown',
                username: client.user?.username || 'Bot'
            },
            playerOptions: {
                clientBasedPositionUpdateInterval: 150,
                defaultSearchPlatform: 'ytsearch', // YouTube search
                volumeDecrementer: 0.75,
                requesterTransformer: (requester) => requester
            },
            queueOptions: {
                maxPreviousTracks: 25
            }
        });

        // Eventos de Lavalink
        lavalinkManager.nodeManager.on('connect', (node) => {
            console.log(`Nodo Lavalink conectado: ${node.id}`);
        });

        lavalinkManager.nodeManager.on('disconnect', (node, reason) => {
            console.log(`Nodo Lavalink desconectado: ${node.id} - ${reason.reason}`);
        });

        lavalinkManager.nodeManager.on('error', (node, error) => {
            console.error(`Error en nodo Lavalink ${node.id}:`, error);
        });

        // Manejar actualizaciones de voz
        client.on('raw', (d) => {
            lavalinkManager.sendRawData(d);
        });

        // Verificar si el bot ya está listo
        if (client.isReady()) {
            // Si ya está listo, inicializar inmediatamente
            lavalinkManager.init({ 
                id: client.user.id,
                username: client.user.username 
            });
        } else {
            // Si no está listo, esperar al evento ready
            client.once('ready', () => {
                lavalinkManager.init({ 
                    id: client.user.id,
                    username: client.user.username 
                });
            });
        }

        // Cargar comandos
        const comandos = require('./comandos.js');
        comandos.registrar(client, lavalinkManager);

        // Reportar carga exitosa
        moduloCargado('musica');
        
    } catch (error) {
        // Reportar fallo en la carga
        moduloFallo('musica', error);
    }
}

module.exports = {
    cargar,
    getLavalinkManager: () => lavalinkManager
};