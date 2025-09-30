require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const textos = require('./utilidades/textos.js');
const { log } = require('./utilidades/colores.js');
const { mostrarSpinner } = require('./utilidades/spinner.js');
const { enviarPresentacion, inicializar: inicializarPresentacion } = require('./sistema/presentacion.js');
const { enviarLogServidor, inicializar: inicializarServidorLog } = require('./sistema/servidor_log.js');
const { resumenFunciones } = require('./sistema/logs.js');
const { resumenModulos } = require('./sistema/logs_modulos.js');

// Crear cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Inicializar colecciones
client.commands = new Collection();
client.modulos = new Collection();

// Cargar funciones del sistema
const cargarSistema = async () => {
    // Mostrar spinner por 1.5 segundos
    await mostrarSpinner(textos.INICIANDO_FUNCIONES, 1500);
    
    // Inicializar función de presentación
    inicializarPresentacion();
    
    // Inicializar función de log de servidores
    inicializarServidorLog();
    
    // Mostrar resumen de funciones cargadas
    resumenFunciones();
};

// Cargar módulos
const cargarModulos = async () => {
    // Mostrar spinner mientras cargan los módulos
    await mostrarSpinner(textos.INICIANDO_MODULOS, 1500);
    
    const modulosPath = path.join(__dirname, 'modulos');
    
    if (!fs.existsSync(modulosPath)) {
        fs.mkdirSync(modulosPath, { recursive: true });
        resumenModulos();
        return;
    }
    
    const carpetasModulos = fs.readdirSync(modulosPath).filter(item => {
        return fs.statSync(path.join(modulosPath, item)).isDirectory();
    });
    
    for (const carpeta of carpetasModulos) {
        const moduloPath = path.join(modulosPath, carpeta, 'index.js');
        
        if (fs.existsSync(moduloPath)) {
            try {
                const modulo = require(moduloPath);
                if (modulo.cargar) {
                    modulo.cargar(client);
                    client.modulos.set(carpeta, modulo);
                }
            } catch (error) {
                const { moduloFallo } = require('./sistema/logs_modulos.js');
                moduloFallo(carpeta, error);
            }
        }
    }
    
    // Mostrar resumen de módulos cargados
    resumenModulos();
};

// Evento cuando el bot se une a un servidor
client.on('guildCreate', async (guild) => {
    // Enviar presentación al owner
    await enviarPresentacion(guild);
    
    // Enviar log al canal específico
    await enviarLogServidor(guild);
});

// Evento ready
client.once('clientReady', async () => {
    await cargarSistema();
    await cargarModulos();
    log(textos.BOT_CONECTADO);
});

// Login del bot
client.login(process.env.DISCORD_TOKEN);