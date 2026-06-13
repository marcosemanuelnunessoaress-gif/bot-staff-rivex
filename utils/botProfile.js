/**
 * Script para gerenciar perfil do bot
 * Permite alterar status, biografia e outros dados do bot
 */

import { ActivityType } from 'discord.js';
import BOT_PROFILE_CONFIG from '../config/botProfileConfig.js';

/**
 * Atualiza o status do bot
 * tipo: PLAYING, STREAMING, LISTENING, WATCHING
 * url: (opcional) URL para status STREAMING
 */
async function atualizarStatus(client, texto, tipo = 'PLAYING', url = null) {
  try {
    const opcoes = {
      PLAYING: ActivityType.Playing,
      STREAMING: ActivityType.Streaming,
      LISTENING: ActivityType.Listening,
      WATCHING: ActivityType.Watching
    };

    const tipoStatus = opcoes[tipo.toUpperCase()] ?? ActivityType.Playing;
    const options = {
      type: tipoStatus
    };

    // Se for STREAMING, adiciona URL
    if (tipoStatus === ActivityType.Streaming && url) {
      options.url = url;
    }

    await client.user.setActivity(texto, options);
    console.log(`✅ Status atualizado: ${tipo.toUpperCase()} "${texto}"`);
  } catch (erro) {
    console.error('❌ Erro ao atualizar status:', erro);
  }
}

/**
 * Atualiza a biografia (descrição) do bot
 * NOTA: Discord.js não possui API nativa para isso
 * Esta é uma documentação de como seria feito via API REST
 */
async function atualizarBiografia(client, biografia) {
  try {
    // Discord.js não expõe a API para alterar "About me" diretamente
    // Mas podemos fazer via API REST se tiver um token válido
    
    // Para user bots / bot accounts, use:
    // await client.user.setStatus('online', biografia);
    
    // Para alterar a biografia via API REST:
    const axios = await import('axios');
    
    const response = await axios.default.patch(
      'https://discord.com/api/v10/users/@me',
      { bio: biografia },
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Biografia atualizada: "${biografia}"`);
    return response.data;
  } catch (erro) {
    console.error('❌ Erro ao atualizar biografia:', erro.message);
    console.warn('💡 Dica: Se o erro for 401, verifique se o token está correto');
  }
}

/**
 * Atualiza avatar do bot (via URL)
 */
async function atualizarAvatar(client, urlImagem) {
  try {
    await client.user.setAvatar(urlImagem);
    console.log(`✅ Avatar atualizado com sucesso`);
  } catch (erro) {
    console.error('❌ Erro ao atualizar avatar:', erro);
  }
}

/**
 * Atualiza o nome do bot
 */
async function atualizarNome(client, novoNome) {
  try {
    await client.user.setUsername(novoNome);
    console.log(`✅ Nome atualizado para: ${novoNome}`);
  } catch (erro) {
    console.error('❌ Erro ao atualizar nome:', erro);
  }
}

/**
 * Inicia o sistema de status rotativo
 */
function iniciarStatusRotativo(client) {
  const config = BOT_PROFILE_CONFIG.rotatingStatus;
  
  if (!config.enabled || config.statuses.length === 0) {
    return;
  }

  let index = 0;

  setInterval(async () => {
    const statusAtual = config.statuses[index];
    await atualizarStatus(client, statusAtual.text, statusAtual.type, statusAtual.url);
    index = (index + 1) % config.statuses.length;
  }, config.interval);

  console.log(`🔄 Sistema de status rotativo iniciado (${config.statuses.length} status)`);
}

/**
 * Função completa para configurar perfil do bot baseado em config
 */
async function configurarPerfilBot(client) {
  try {
    console.log('\n🤖 === CONFIGURANDO PERFIL DO BOT ===\n');

    const config = BOT_PROFILE_CONFIG;

    // Atualizar Status
    if (config.status.enabled) {
      await atualizarStatus(
        client,
        config.status.text,
        config.status.type,
        config.status.url
      );
    }

    // Iniciar status rotativo
    if (config.rotatingStatus.enabled) {
      iniciarStatusRotativo(client);
    }

    // Atualizar Biografia
    if (config.bio.enabled && config.bio.text) {
      await atualizarBiografia(client, config.bio.text);
    }

    // Atualizar Avatar
    if (config.avatar.enabled && config.avatar.url) {
      await atualizarAvatar(client, config.avatar.url);
    }

    // Atualizar Nome
    if (config.username.enabled && config.username.name) {
      await atualizarNome(client, config.username.name);
    }

    console.log('✅ Perfil do bot configurado com sucesso!\n');
  } catch (erro) {
    console.error('❌ Erro ao configurar perfil:', erro);
  }
}

export { 
  atualizarStatus, 
  atualizarBiografia, 
  atualizarAvatar, 
  atualizarNome,
  iniciarStatusRotativo, 
  configurarPerfilBot 
};
