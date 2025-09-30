const textos = require('../../utilidades/textos.js');
const ytdl = require('ytdl-core');

let lavalinkManager = null;

// Registrar comandos de música
function registrar(client, musicManager) {
    lavalinkManager = musicManager;

    // Escuchar mensajes para comandos con prefix
    client.on('messageCreate', async (message) => {
        // Ignorar bots y mensajes sin el prefix
        if (message.author.bot || !message.content.startsWith('f!')) return;

        const args = message.content.slice(2).trim().split(/ +/);
        const comando = args.shift().toLowerCase();

        // Comando f!play
        if (comando === 'play') {
            await comandoPlay(message, args);
        }
    });
}

// Comando: f!play [búsqueda o URL]
async function comandoPlay(message, args) {
    try {
        // Verificar que LavalinkManager exista
        if (!lavalinkManager) {
            return message.reply(textos.MUSICA_ERROR_LAVALINK);
        }

        // Verificar que el usuario esté en un canal de voz
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply(textos.MUSICA_ERROR_NO_VOZ);
        }

        // Verificar que se proporcionó una búsqueda
        if (!args.length) {
            return message.reply('Debes proporcionar una canción para buscar');
        }

        const search = args.join(' ');
        let searchQuery = search;

        // Detectar si es un link de YouTube
        if (ytdl.validateURL(search)) {
            const statusMessage = await message.reply(textos.MUSICA_DETECTANDO_YOUTUBE);
            
            try {
                // Extraer información del video de YouTube
                const info = await ytdl.getBasicInfo(search);
                const videoDetails = info.videoDetails;
                
                // Crear query de búsqueda con título y autor
                searchQuery = `${videoDetails.author.name} ${videoDetails.title}`;
                
                await statusMessage.edit(`${textos.MUSICA_ENCONTRADA_SOUNDCLOUD}: **${videoDetails.title}**`);
            } catch (error) {
                await statusMessage.edit(textos.MUSICA_LINK_INVALIDO);
                return;
            }
        }

        // Crear o obtener el player
        let player = lavalinkManager.getPlayer(message.guild.id);

        if (!player) {
            player = lavalinkManager.createPlayer({
                guildId: message.guild.id,
                voiceChannelId: voiceChannel.id,
                textChannelId: message.channel.id,
                selfDeaf: true,
                selfMute: false,
                volume: 100
            });

            // Conectar al canal de voz
            await player.connect();
        }

        // Buscar la canción en SoundCloud
        const result = await player.search({ query: searchQuery }, message.author);

        console.log('DEBUG Deezer - Query:', searchQuery);
        console.log('DEBUG Deezer - LoadType:', result.loadType);
        console.log('DEBUG Deezer - Tracks found:', result.tracks?.length || 0);

        if (!result || !result.tracks || result.tracks.length === 0) {
            return message.reply(textos.MUSICA_NO_ENCONTRADA_SOUNDCLOUD);
        }

        if (result.loadType === 'playlist') {
            // Si es una playlist
            for (const track of result.tracks) {
                player.queue.add(track);
            }
            message.reply(`Playlist añadida: **${result.playlistInfo.name}** (${result.tracks.length} canciones)`);
        } else {
            // Añadir una sola canción
            const track = result.tracks[0];
            player.queue.add(track);
            
            if (player.playing) {
                message.reply(`${textos.MUSICA_CANCION_AGREGADA}: **${track.info.title}**`);
            } else {
                message.reply(`${textos.MUSICA_REPRODUCIENDO}: **${track.info.title}**`);
            }
        }

        // Si no está reproduciendo, empezar
        if (!player.playing && !player.paused) {
            await player.play();
        }

    } catch (error) {
        console.error('Error en comando play:', error);
        message.reply(textos.MUSICA_ERROR_LAVALINK);
    }
}

module.exports = {
    registrar
};