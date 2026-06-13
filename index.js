import { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { configurarPerfilBot, atualizarStatus } from './utils/botProfile.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIGURAÇÕES ====================
const PREFIX = 'rx!';
const ADVERTENCIAS_PATH = path.join(__dirname, 'data', 'advertencias.json');
const TIMERS_ADV_PATH = path.join(__dirname, 'data', 'timers_advertencias.json');

// Configuração de canais (substitua pelos IDs reais)
const config = {
  canalComandos: '1513323686579535932',

  logs: {
    adv: '1513334055209275412',
    ban: '1513334192581378218',
    unban: '1513334192581378218',
    mute: '1513334283928866917',
    mutecall: '1513334302794842172',
    cargoAdd: '1513334366590206042',
    cargoRemove: '1513334366590206042',
    cargoSet: '1513334366590206042'
  }
};

// IDs dos cargos de advertência - ADICIONAR NO .env: ROLE_ADV1, ROLE_ADV2, ROLE_ADV3
const CARGOS_ADVERTENCIA = {
  1: process.env.ROLE_ADV1,
  2: process.env.ROLE_ADV2,
  3: process.env.ROLE_ADV3
};

// Tempo em ms para remover cargo de advertência (7 dias)
const TEMPO_REMOVE_ADV = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Map para armazenar timers de remoção de cargos (key: `${guildId}-${userId}`)
const advTimers = new Map();

// Guard para evitar envios de log duplicados em curto espaço de tempo (memória local)
const recentLogs = new Map();

// Guard para evitar processar a mesma mensagem de comando múltiplas vezes
const processedMessages = new Map();

// Cores padrão para embeds
const CORES = {
  SUCESSO: '#2ecc71',
  ERRO: '#8B0000', // Vermelho escuro
  INFO: '#3498db',
  AVISO: '#e74c3c'
};

// Hierarquia de cargos (em ordem crescente de permissão)
const HIERARQUIA_CARGOS = {
  DOMINACOES: 1,
  TRONOS: 2,
  QUERUBIM: 3,
  ARCANJO: 4,
  SERAFIM: 5
};

// ==================== CLIENTE DISCORD ====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ==================== FUNÇÕES AUXILIARES ====================

const CORES_LOG = {
  BAN: '#700000',
  ADV: '#ff3838',
  MUTE: '#ff8800',
  UNMUTE: '#00c46a',
  CARGO: '#9b59b6',
  INFO: '#5865F2'
};

function criarEmbedLog({
  cor = CORES_LOG.INFO,
  titulo,
  staff,
  usuario,
  motivo = 'Não informado',
  extra = []
}) {
  return new EmbedBuilder()
    .setColor(cor)
    .setAuthor({
      name: 'Rivex Staff System',
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle(titulo)
    .setThumbnail(
      usuario?.displayAvatarURL
        ? usuario.displayAvatarURL({ dynamic: true })
        : null
    )
    .addFields(
      {
        name: '<:r_mod:1512971241802174545> Staff',
        value: `${staff.tag}\n\`${staff.id}\``,
        inline: true
      },
      {
        name: '👤 Usuário',
        value: `${usuario.tag}\n\`${usuario.id}\``,
        inline: true
      },
      {
        name: '📋 Motivo',
        value: motivo,
        inline: false
      },
      ...extra
    )
    .setFooter({
      text: 'Rivex • Sistema de Logs'
    })
    .setTimestamp();
}
/**
 * Carrega advertências do arquivo JSON
 */
function carregarAdvertencias() {
  try {
    if (fs.existsSync(ADVERTENCIAS_PATH)) {
      const data = fs.readFileSync(ADVERTENCIAS_PATH, 'utf-8');
      return JSON.parse(data || '{}');
    }
    return {};
  } catch (erro) {
    console.error('Erro ao carregar advertências:', erro);
    return {};
  }
}

/**
 * Salva advertências no arquivo JSON
 */
function salvarAdvertencias(dados) {
  try {
    fs.writeFileSync(ADVERTENCIAS_PATH, JSON.stringify(dados, null, 2));
  } catch (erro) {
    console.error('Erro ao salvar advertências:', erro);
  }
}

/**
 * Carrega timers de advertência do arquivo JSON
 */
function carregarTimersAdvertencia() {
  try {
    if (fs.existsSync(TIMERS_ADV_PATH)) {
      const data = fs.readFileSync(TIMERS_ADV_PATH, 'utf-8');
      return JSON.parse(data || '{}');
    }
    return {};
  } catch (erro) {
    console.error('Erro ao carregar timers de advertência:', erro);
    return {};
  }
}

/**
 * Salva timers de advertência no arquivo JSON
 */
function salvarTimersAdvertencia(dados) {
  try {
    fs.writeFileSync(TIMERS_ADV_PATH, JSON.stringify(dados, null, 2));
  } catch (erro) {
    console.error('Erro ao salvar timers de advertência:', erro);
  }
}

/**
 * Agenda a remoção de um cargo de advertência após 7 dias
 */
async function agendarRemocaoCargoAdvertencia(guild, userId, nivelAdvertencia) {
  const key = `${guild.id}-${userId}`;
  
  // Cancelar timer anterior se existir
  if (advTimers.has(key)) {
    clearTimeout(advTimers.get(key));
  }

  // Agendar nova remoção
  const timeoutId = setTimeout(async () => {
    try {
      const member = await buscarMembro(guild, userId).catch(() => null);
      if (!member) {
        console.warn(`[ADV] Membro ${userId} não encontrado para remover cargo`);
        advTimers.delete(key);
        return;
      }

      const cargoId = CARGOS_ADVERTENCIA[nivelAdvertencia];
      if (!cargoId) {
        console.warn(`[ADV] Cargo de advertência nível ${nivelAdvertencia} não configurado`);
        advTimers.delete(key);
        return;
      }

      await member.roles.remove(cargoId, 'Tempo de advertência expirado');

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('✅ Cargo de Advertência Removido')
        .addFields(
          { name: 'Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
          { name: 'Cargo Removido', value: `Advertência ${nivelAdvertencia}`, inline: true },
          { name: 'Motivo', value: 'Tempo de 7 dias expirado', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Staff Rivex' });

      await enviarLog('adv', embed);
      advTimers.delete(key);

      // Remover do arquivo de timers
      const timers = carregarTimersAdvertencia();
      delete timers[key];
      salvarTimersAdvertencia(timers);

      console.log(`[ADV] Cargo de advertência ${nivelAdvertencia} removido de ${userId} após 7 dias`);
    } catch (erro) {
      console.error(`[ADV] Erro ao remover cargo de advertência:`, erro);
      advTimers.delete(key);
    }
  }, TEMPO_REMOVE_ADV);

  advTimers.set(key, timeoutId);

  // Salvar no arquivo para persistência
  const timers = carregarTimersAdvertencia();
  timers[key] = {
    userId,
    guildId: guild.id,
    nivelAdvertencia,
    removerEm: Date.now() + TEMPO_REMOVE_ADV,
    criadoEm: new Date().toLocaleString('pt-BR')
  };
  salvarTimersAdvertencia(timers);
}

/**
 * Carrega timers agendados ao iniciar o bot
 */
function carregarTimersAgendados(guild) {
  const timers = carregarTimersAdvertencia();
  const agora = Date.now();

  Object.entries(timers).forEach(([key, info]) => {
    // Verificar se é do servidor correto
    if (info.guildId !== guild.id) return;

    const tempoRestante = info.removerEm - agora;

    if (tempoRestante <= 0) {
      // Tempo já expirou, remover cargo imediatamente
      buscarMembro(guild, info.userId)
        .then(async (member) => {
          const cargoId = CARGOS_ADVERTENCIA[info.nivelAdvertencia];
          if (cargoId) {
            await member.roles.remove(cargoId, 'Tempo de advertência expirou (ao iniciar)');
            console.log(`[ADV] Cargo removido imediatamente para ${info.userId}`);
          }
        })
        .catch(() => {});

      delete timers[key];
    } else {
      // Reagendar a remoção
      const timeoutId = setTimeout(() => {
        buscarMembro(guild, info.userId)
          .then(async (member) => {
            const cargoId = CARGOS_ADVERTENCIA[info.nivelAdvertencia];
            if (cargoId) {
              await member.roles.remove(cargoId, 'Tempo de advertência expirado');
            }
          })
          .catch(() => {});

        advTimers.delete(key);
      }, tempoRestante);

      advTimers.set(key, timeoutId);
      console.log(`[ADV] Timer reagendado para ${info.userId}. Tempo restante: ${Math.round(tempoRestante / 1000 / 60)} minutos`);
    }
  });

  salvarTimersAdvertencia(timers);
}

/**
 * Cria um embed de erro padrão
 */
function criarEmbedErro(titulo, descricao) {
  return new EmbedBuilder()
    .setColor(CORES.ERRO)
    .setTitle(titulo)
    .setDescription(descricao)
    .setTimestamp()
    .setFooter({ text: 'Staff Rivex' });
}

/**
 * Cria um embed de sucesso padrão
 */
function criarEmbedSucesso(titulo, descricao) {
  return new EmbedBuilder()
    .setColor(CORES.SUCESSO)
    .setTitle(titulo)
    .setDescription(descricao)
    .setTimestamp()
    .setFooter({ text: 'Staff Rivex' });
}

/**
 * Cria um embed de info padrão
 */
function criarEmbedInfo(titulo, descricao) {
  return new EmbedBuilder()
    .setColor(CORES.INFO)
    .setTitle(titulo)
    .setDescription(descricao)
    .setTimestamp()
    .setFooter({ text: 'Staff Rivex' });
}

/**
 * Envia um embed de log para o canal configurado
 * tipo: adv, ban, unban, mute, mutecall, cargoAdd, cargoRemove, cargoSet
 */
async function enviarLog(tipo, embed) {
  try {
    const canalId = config.logs[tipo];
    if (!canalId) {
      console.warn(`Canal de log para tipo "${tipo}" não configurado.`);
      return;
    }

    const canal = await client.channels.fetch(canalId).catch(() => null);
    if (!canal || typeof canal.send !== 'function') {
      console.warn(`Não foi possível encontrar/enviar para o canal de log: ${canalId}`);
      return;
    }

    // Deduplicação simples: gerar chave a partir do embed serializado
    let key;
    try {
      const json = embed.toJSON ? embed.toJSON() : embed;
      key = `${tipo}|${json.title || ''}|${json.description || ''}|${JSON.stringify(json.fields || [])}`;
    } catch (e) {
      key = `${tipo}|${Date.now()}`;
    }

    const now = Date.now();
    const last = recentLogs.get(key) || 0;
    if (now - last < 5000) {
      // Ignora log duplicado em 5s
      return;
    }
    recentLogs.set(key, now);
    // Limpeza futura da chave
    setTimeout(() => recentLogs.delete(key), 10000);

    await canal.send({ embeds: [embed] });
  } catch (erro) {
    console.error('Erro ao enviar log:', erro);
  }
}

/**
 * Envia confirmação ao usuário por DM; se falhar, envia temporariamente no canal e apaga.
 * payload pode ser string, EmbedBuilder ou array de embeds
 */
async function enviarConfirmacao(origMessage, usuario, payload, timeout = 8000) {
  const callStack = new Error().stack.split('\n')[2]?.trim() || 'desconhecido';
  console.log(`[CONFIRMAÇÃO] ⏱️ Iniciando (chamado de: ${callStack})`);
  
  // apagar a mensagem original (comando)
  try { 
    const deleted = await origMessage.delete();
    console.log(`[CONFIRMAÇÃO] ✅ Mensagem original deletada`);
  } catch (err) {
    console.warn(`[CONFIRMAÇÃO] ⚠️ Erro ao deletar original:`, err.message);
  }

  // Enviar mensagem temporária no canal (ephemeral-like). Não enviar via DM.
  try {
    let sent;
    let payloadDesc = 'desconhecido';
    
    if (payload instanceof EmbedBuilder) {
      payloadDesc = `Embed: ${payload.data.title}`;
      sent = await origMessage.channel.send({ content: `<@${usuario.id}>`, embeds: [payload] });
    } else if (typeof payload === 'string') {
      payloadDesc = `String: ${payload.substring(0, 50)}...`;
      sent = await origMessage.channel.send({ content: `<@${usuario.id}> ${payload}` });
    } else if (Array.isArray(payload)) {
      payloadDesc = `Array[${payload.length}]`;
      sent = await origMessage.channel.send({ content: `<@${usuario.id}>`, embeds: payload });
    } else {
      payloadDesc = 'vazio';
      sent = await origMessage.channel.send({ content: `<@${usuario.id}>` });
    }

    console.log(`[CONFIRMAÇÃO] 📤 Mensagem enviada (ID: ${sent.id}, Tipo: ${payloadDesc})`);
    setTimeout(() => {
      sent.delete().catch(() => {});
      console.log(`[CONFIRMAÇÃO] 🗑️ Mensagem deletada após timeout (${timeout}ms)`);
    }, timeout);
  } catch (err) {
    console.error('[CONFIRMAÇÃO] ❌ Erro ao enviar:', err.message);
  }
}

// Map para controlar timers de unmute em voice (key: `${guildId}-${userId}`)
const voiceMuteTimers = new Map();

/**
 * Busca um membro de forma robusta com validação
 */
async function buscarMembro(guild, userId) {
  try {
    if (!userId || isNaN(userId)) {
      throw new Error('ID inválido fornecido');
    }
    
    const member = await guild.members.fetch(userId).catch(err => {
      console.error(`[BUSCAR MEMBRO] Erro ao buscar ID ${userId}:`, err.message);
      return null;
    });
    
    if (!member) {
      throw new Error(`Membro com ID ${userId} não encontrado no servidor`);
    }
    
    return member;
  } catch (erro) {
    console.error(`[BUSCAR MEMBRO] Erro:`, erro.message);
    throw erro;
  }
}

/**
 * Obtém o nível de permissão do membro com base nos cargos
 */
function obterNivelPermissao(member) {
  const rolesEnv = {
    DOMINACOES: process.env.ROLE_DOMINACOES,
    TRONOS: process.env.ROLE_TRONOS,
    QUERUBIM: process.env.ROLE_QUERUBIM,
    ARCANJO: process.env.ROLE_ARCANJO,
    SERAFIM: process.env.ROLE_SERAFIM
  };

  if (!member || !member.roles) return 0;

  let nivelMaximo = 0;

  Object.entries(rolesEnv).forEach(([cargo, roleId]) => {
    if (roleId && member.roles.cache.has(roleId)) {
      const nivel = HIERARQUIA_CARGOS[cargo];
      if (nivel > nivelMaximo) {
        nivelMaximo = nivel;
      }
    }
  });

  return nivelMaximo;
}

/**
 * Obtém o nome do cargo pelo nível
 */
function obterNomeCargoPorNivel(nivel) {
  for (const [cargo, nivelCargo] of Object.entries(HIERARQUIA_CARGOS)) {
    if (nivelCargo === nivel) return cargo;
  }
  return 'DESCONHECIDO';
}

/**
 * Obtém o ID do cargo pelo nome
 */
function obterIdCargoPorNome(nomeCargo) {
  const rolesEnv = {
    DOMINACOES: process.env.ROLE_DOMINACOES,
    TRONOS: process.env.ROLE_TRONOS,
    QUERUBIM: process.env.ROLE_QUERUBIM,
    ARCANJO: process.env.ROLE_ARCANJO,
    SERAFIM: process.env.ROLE_SERAFIM
  };

  return rolesEnv[nomeCargo.toUpperCase()] || null;
}

/**
 * Valida se o membro pode usar um comando baseado no cargo necessário
 */
function podeUsar(member, nivelRequerido = 0) {
  // Admin do Discord sempre pode usar qualquer comando
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const nivelMembro = obterNivelPermissao(member);
  return nivelMembro >= nivelRequerido;
}

/**
 * Valida se o membro é Admin do Discord
 */
function ehAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

function ehStaff(member) {
  if (!member || !member.roles) return false;
  const roleId = process.env.ROLE_STAFF;
  return roleId ? member.roles.cache.has(roleId) : false;
}

function botTemPermissao(guild, permissao) {
  return guild.members.me?.permissions.has(permissao);
}

function botPodeGerenciarMembro(member) {
  return member?.manageable ?? false;
}

/**
 * Valida se o membro pode usar comando com requisito de hierarquia
 * Bloqueia ROLE_STAFF puro de comandos que requerem hierarquia
 */
function podeUsarComando(member, nivelRequerido = 0) {
  // Admin do Discord sempre pode usar qualquer comando
  if (ehAdmin(member)) {
    return true;
  }

  // Se é apenas ROLE_STAFF (sem hierarquia), não pode usar comandos que requerem hierarquia
  if (ehStaff(member) && obterNivelPermissao(member) === 0 && nivelRequerido > 0) {
    return false;
  }

  const nivelMembro = obterNivelPermissao(member);
  return nivelMembro >= nivelRequerido;
}

/**
 * Formata um texto para capitalização adequada
 */
function capitalizarPalavra(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ==================== COMANDOS ====================

const comandos = {
  /**
  * rx!ban ID MOTIVO - Bane um membro
   */
  async ban(message, args) {
    // Validação de permissões
    if (!podeUsarComando(message.member, HIERARQUIA_CARGOS.ARCANJO)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Você não tem permissão para usar este comando.'));
    }

    // Validação de argumentos
    if (args.length < 2) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}BAN <ID> <MOTIVO>\``));
    }

    const userId = args[0];
    const motivo = args.slice(1).join(' ');

    try {
      const guild = message.guild;
      await guild.bans.create(userId, { reason: motivo });

      // Log embed
      const logEmbed = criarEmbedLog({
  titulo: '🔨 Usuário Banido',
  cor: CORES_LOG.BAN,
  staff: message.author,
  usuario: {
    tag: userId,
    id: userId,
    displayAvatarURL: () => null
  },
  motivo
});

      await enviarLog('ban', logEmbed);
      await enviarConfirmacao(message, message.author, '<:kosame_outage:1495827005885906944> | Usuário banido!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!unban para remover o banimento!');
    } catch (erro) {
      console.error('Erro ao banir:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', 'Não foi possível banir este usuário. Verifique o ID.'));
    }
  },

  /**
  * rx!unban ID - Remove o banimento de um membro
   */
  async unban(message, args) {
    // Apenas Admin
    if (!ehAdmin(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores podem usar este comando.'));
    }

    if (args.length < 1) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}UNBAN <ID>\``));
    }

    const userId = args[0];

    try {
      const guild = message.guild;
      await guild.bans.remove(userId);
      const logEmbed = criarEmbedLog({
  titulo: '🔨 Usuário Desbanido',
  cor: CORES_LOG.BAN,
  staff: message.author,
  usuario: {
    tag: userId,
    id: userId,
    displayAvatarURL: () => null
  },
  motivo
});

      await enviarLog('unban', logEmbed);
      await enviarConfirmacao(message, message.author, '<:kosame_outage:1495827005885906944> | Usuário desbanido!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!ban para banir o usuário!');
    } catch (erro) {
      console.error('Erro ao desbanir:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', 'Não foi possível remover o banimento. Verifique o ID.'));
    }
  },

  /**
  * rx!mutecall ID - Muta membro em call
   */
  async mutecall(message, args) {
    // Apenas Admin ou Staff
    if (!ehAdmin(message.member) && !ehStaff(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores ou staff podem usar este comando.'));
    }

    if (args.length < 2) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}MUTECALL <ID> <MINUTES> <MOTIVO>\``));
    }

    const userId = args[0];
    const tempoMin = parseInt(args[1], 10);
    if (isNaN(tempoMin) || tempoMin <= 0) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Tempo inválido. Use minutos, ex: \`${PREFIX}MUTECALL <ID> <MINUTES> <MOTIVO>\``));
    }
    const motivo = args.slice(2).join(' ') || 'Não informado';

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);

      if (!member.voice.channel) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', 'O membro não está em um canal de voz.'));
      }

      if (!botTemPermissao(guild, PermissionFlagsBits.MuteMembers)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Eu preciso da permissão `Mute Members` para mutar em call.'));
      }

      if (!botPodeGerenciarMembro(member)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Não posso mutar esse membro porque meu cargo está abaixo ou igual ao dele.'));
      }

      await member.voice.setMute(true, motivo);

      const key = `${guild.id}-${userId}`;
      if (voiceMuteTimers.has(key)) {
        clearTimeout(voiceMuteTimers.get(key));
        voiceMuteTimers.delete(key);
      }
      const timeoutId = setTimeout(async () => {
        try {
          const m = await buscarMembro(guild, userId).catch(() => null);
          if (m && m.voice.channel) {
            await m.voice.setMute(false, 'Tempo expirado');
            const doneEmbed = new EmbedBuilder()
              .setColor(CORES.SUCESSO)
              .setTitle('Usuário Desmutado em Call!')
              .addFields(
                { name: 'Usuário', value: `${m.user.tag} (${m.user.id})`, inline: false },
                { name: 'Motivo', value: 'Tempo expirado', inline: false }
              )
              .setTimestamp()
              .setFooter({ text: 'Staff Rivex' });
            await enviarLog('mutecall', doneEmbed);
          }
        } catch (e) {
          console.error('Erro ao desmutar automaticamente:', e);
        } finally {
          voiceMuteTimers.delete(key);
        }
      }, tempoMin * 60000);
      voiceMuteTimers.set(key, timeoutId);

      const logEmbed = criarEmbedLog({
  titulo: '🔇 Usuário Mutado',
  cor: CORES_LOG.MUTE,
  staff: message.author,
  usuario: member.user,
  motivo,
  extra: [
    {
      name: '⏱️ Duração',
      value: `${tempoMin} minuto(s)`,
      inline: true
    }
  ]
});

      await enviarLog('mutecall', logEmbed);
      await enviarConfirmacao(message, message.author, `<:r_mod:1512971241802174545> | Usuário mutado por ${tempoMin} minuto(s).!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!unmutecall para remover o mute!`);
    } catch (erro) {
      console.error('Erro ao mutar em call:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível mutar o membro. Detalhes: ${erro.message}`));
    }
  },

  async unmutecall(message, args) {
    // Apenas Admin ou Staff
    if (!ehAdmin(message.member) && !ehStaff(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores ou staff podem usar este comando.'));
    }

    if (args.length < 1) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}UNMUTECALL <ID> <MOTIVO>?\``));
    }

    const userId = args[0];
    const motivo = args.slice(1).join(' ') || 'Removido manualmente';

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);
      if (!member.voice.channel) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', 'O membro não está em um canal de voz.'));
      }

      if (!botTemPermissao(guild, PermissionFlagsBits.MuteMembers)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Eu preciso da permissão `Mute Members` para desmutar em call.'));
      }

      if (!botPodeGerenciarMembro(member)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Não posso desmutar esse membro porque meu cargo está abaixo ou igual ao dele.'));
      }

      await member.voice.setMute(false, motivo);

      const key = `${guild.id}-${userId}`;
      if (voiceMuteTimers.has(key)) {
        clearTimeout(voiceMuteTimers.get(key));
        voiceMuteTimers.delete(key);
      }

      const logEmbed = criarEmbedLog({
  titulo: '🔊 Usuário Desmutado',
  cor: CORES_LOG.UNMUTE,
  staff: message.author,
  usuario: member.user,
  motivo
});

      await enviarLog('mutecall', logEmbed);
      await enviarConfirmacao(message, message.author, '<:r_mod:1512971241802174545> | Usuário desmutado em call!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!mutecall para adicionar o mute!');
    } catch (erro) {
      console.error('Erro ao desmutar em call:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível desmutar o membro. Detalhes: ${erro.message}`));
    }
  },

  /**
  * rx!mute ID - Aplica mute no chat usando timeout
   */
  async mute(message, args) {
    // Apenas Admin ou Staff
    if (!ehAdmin(message.member) && !ehStaff(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores ou staff podem usar este comando.'));
    }

    if (args.length < 2) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}MUTE <ID> <MINUTES> <MOTIVO>\``));
    }

    const userId = args[0];
    const tempoMin = parseInt(args[1], 10);
    if (isNaN(tempoMin) || tempoMin <= 0) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Tempo inválido. Use minutos, ex: \`${PREFIX}MUTE <ID> <MINUTES> <MOTIVO>\``));
    }
    const motivo = args.slice(2).join(' ') || 'Não informado';

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);

      if (!botTemPermissao(guild, PermissionFlagsBits.ModerateMembers)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Eu preciso da permissão `Moderate Members` para aplicar o mute no chat.'));
      }

      if (!botPodeGerenciarMembro(member)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Não posso mutar esse membro porque meu cargo está abaixo ou igual ao dele.'));
      }

      const tempoMute = tempoMin * 60000;
      await member.timeout(tempoMute, motivo);

      const logEmbed = criarEmbedLog({
  titulo: '🔇 Usuário Mutado',
  cor: CORES_LOG.MUTE,
  staff: message.author,
  usuario: member.user,
  motivo,
  extra: [
    {
      name: '⏱️ Duração',
      value: `${tempoMin} minuto(s)`,
      inline: true
    }
  ]
});

      await enviarLog('mute', logEmbed);
      await enviarConfirmacao(message, message.author, `<:r_mod:1512971241802174545> | Usuário mutado por ${tempoMin} minuto(s)!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!unmute para remover o mute!`);
    } catch (erro) {
      console.error('Erro ao mutar:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível mutar o membro. Detalhes: ${erro.message}`));
    }
  },

  async unmute(message, args) {
    // Apenas Admin ou Staff
    if (!ehAdmin(message.member) && !ehStaff(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores ou staff podem usar este comando.'));
    }

    if (args.length < 1) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}UNMUTE <ID> <MOTIVO>?\``));
    }

    const userId = args[0];
    const motivo = args.slice(1).join(' ') || 'Removido manualmente';

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);
      if (!botTemPermissao(guild, PermissionFlagsBits.ModerateMembers)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Eu preciso da permissão `Moderate Members` para remover o mute no chat.'));
      }

      if (!botPodeGerenciarMembro(member)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Não posso desmutar esse membro porque meu cargo está abaixo ou igual ao dele.'));
      }

      await member.timeout(null, motivo);

      const logEmbed = criarEmbedLog({
  titulo: '🔊 Usuário Desmutado',
  cor: CORES_LOG.UNMUTE,
  staff: message.author,
  usuario: member.user,
  motivo
});

      await enviarLog('mute', logEmbed);
      await enviarConfirmacao(message, message.author, '<:r_mod:1512971241802174545> | Usuário Desmutado!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!mute para adicionar o mute!');
    } catch (erro) {
      console.error('Erro ao desmutar:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível desmutar o membro. Detalhes: ${erro.message}`));
    }
  },

  /**
  * rx!clear QUANTIDADE - Apaga mensagens recentes do canal
   */
  async clear(message, args) {
    if (!ehAdmin(message.member) && !ehStaff(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores ou staff podem usar este comando.'));
    }

    if (args.length < 1) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}CLEAR <QUANTIDADE>\``));
    }

    const quantidade = parseInt(args[0], 10);
    if (isNaN(quantidade) || quantidade <= 0 || quantidade > 100) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', 'Informe uma quantidade válida entre 1 e 100.'));
    }

    try {
      if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Permissão do Bot', 'Eu preciso da permissão `Manage Messages` para apagar mensagens.'));
      }

      const messagesToDelete = await message.channel.messages.fetch({ limit: quantidade });
      const deleted = await message.channel.bulkDelete(messagesToDelete, true);

      if (!deleted || deleted.size === 0) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', 'Não foi possível apagar mensagens. Elas podem ser muito antigas ou já terem sido removidas.'));
      }

      const confirm = await message.channel.send(`🧹╺╸${deleted.size} mensagens apagadas por ${message.author}!`);
      setTimeout(() => confirm.delete().catch(() => {}), 6000);
    } catch (erro) {
      console.error('Erro ao apagar mensagens:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível apagar as mensagens. Detalhes: ${erro.message}`));
    }
  },

  /**
  * rx!adv ID MOTIVO - Adiciona advertência a um membro e atribui cargo
   */
  async adv(message, args) {
    // Validação de permissões - mínimo DOMINAÇÕES
    if (!podeUsarComando(message.member, HIERARQUIA_CARGOS.DOMINACOES)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Você não tem permissão para usar este comando.'));
    }

    if (args.length < 2) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}ADV <ID> <MOTIVO>\``));
    }

    const userId = args[0];
    const motivo = args.slice(1).join(' ');

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);

      // Carregar advertências
      const advertencias = carregarAdvertencias();

      if (!advertencias[userId]) {
        advertencias[userId] = [];
      }

      // Adicionar nova advertência
      advertencias[userId].push({
        motivo,
        staff: message.author.tag,
        data: new Date().toLocaleString('pt-BR')
      });

      const totalAdv = advertencias[userId].length;

      // Limitar a 3 advertências
      const nivelAdvertencia = Math.min(totalAdv, 3);

      // Remover cargo anterior se existir
      const nivelAnterior = Math.min(totalAdv - 1, 3);
      if (nivelAnterior > 0 && nivelAnterior < nivelAdvertencia) {
        const cargoAnteriorId = CARGOS_ADVERTENCIA[nivelAnterior];
        if (cargoAnteriorId) {
          try {
            await member.roles.remove(cargoAnteriorId, 'Advertência atualizada');
          } catch (e) {
            console.warn(`[ADV] Não foi possível remover cargo anterior: ${e.message}`);
          }
        }
      }

      // Adicionar novo cargo de advertência
      const cargoId = CARGOS_ADVERTENCIA[nivelAdvertencia];
      if (cargoId) {
        try {
          await member.roles.add(cargoId, `Advertência ${nivelAdvertencia}`);
          console.log(`[ADV] Cargo "Advertência ${nivelAdvertencia}" adicionado a ${userId}`);
          
          // Agendar remoção do cargo após 7 dias
          await agendarRemocaoCargoAdvertencia(guild, userId, nivelAdvertencia);
        } catch (e) {
          console.error(`[ADV] Erro ao adicionar cargo: ${e.message}`);
        }
      } else {
        console.warn(`[ADV] Cargo ROLE_ADV${nivelAdvertencia} não configurado no .env`);
      }

      // Salvar
      salvarAdvertencias(advertencias);

      // Criar embed de log
      const logEmbed = criarEmbedLog({
        titulo: '⚠️ Advertência Registrada',
        cor: CORES_LOG.ADV,
        staff: message.author,
        usuario: member.user,
        motivo,
        extra: [
          {
            name: '📊 Total de Advertências',
            value: `${totalAdv}`,
            inline: true
          },
          {
            name: '🎖️ Cargo Aplicado',
            value: `Advertência ${nivelAdvertencia}`,
            inline: true
          },
          {
            name: '⏰ Remover em',
            value: '7 dias',
            inline: true
          }
        ]
      });

      await enviarLog('adv', logEmbed);
      const confirmMsg = `<:1364975619720613959:1475886423918776481>  | Advertência registrada!\n**Advertências:** ${totalAdv} | **Cargo:** Advertência ${nivelAdvertencia}\n\n-# <:sinfo:1482885110813691926> System╺╸Cargo será removido em 7 dias!`;
      await enviarConfirmacao(message, message.author, confirmMsg);
    } catch (erro) {
      console.error('Erro ao adicionar advertência:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível adicionar advertência. Detalhes: ${erro.message}`));
    }
  },

  /**
  * rx!setcargo ID @CARGO - Define um cargo para um membro através de menção
   */
  async setcargo(message, args) {
    // Apenas Admin
    if (!ehAdmin(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores podem usar este comando.'));
    }

    if (args.length < 2) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}SETCARGO <ID> @CARGO\`\n\n**Exemplo:** \`rx!setcargo 123456789 @staff\``));
    }

    const userId = args[0];
    const rawRoleArg = args.slice(1).join(' ').trim();

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);

      let role = null;

      // Extrai o ID da menção (formato: <@&ROLE_ID>)
      const roleIdMatch = rawRoleArg.match(/<@&(\d+)>/);
      if (roleIdMatch && roleIdMatch[1]) {
        role = await guild.roles.fetch(roleIdMatch[1]).catch(() => null);
      }

      if (!role) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Cargo Inválido', `Cargo não encontrado. Use menção válida: \`@cargo\`\n\n**Exemplo:** \`rx!setcargo 123456789 @staff\``));
      }

      await member.roles.add(role.id);

      const logEmbed = criarEmbedLog({
        titulo: '🎖️ Cargo Adicionado',
        cor: CORES_LOG.CARGO,
        staff: message.author,
        usuario: member.user,
        motivo: `Cargo: ${role.name}`,
      });

      await enviarLog('cargoSet', logEmbed);
      await enviarConfirmacao(message, message.author, `<:7619planet:1495818283042210034> | Cargo **${role.name}** adicionado com sucesso!\n\n-# <:sinfo:1482885110813691926> System╺╸Use rx!removecargo para remover o cargo!`);
    } catch (erro) {
      console.error('Erro ao definir cargo:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível adicionar o cargo. Detalhes: ${erro.message}`));
    }
  },

  /**
   * rx!removecargo ID @CARGO - Remove um cargo de um membro através de menção
   */
  async removecargo(message, args) {
    // Apenas Admin
    if (!ehAdmin(message.member)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Apenas administradores podem usar este comando.'));
    }

    if (args.length < 2) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}REMOVECARGO <ID> @CARGO\`\n\n**Exemplo:** \`rx!removecargo 123456789 @staff\``));
    }

    const userId = args[0];
    const rawRoleArg = args.slice(1).join(' ').trim();

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);

      let role = null;

      // Extrai o ID da menção (formato: <@&ROLE_ID>)
      const roleIdMatch = rawRoleArg.match(/<@&(\d+)>/);
      if (roleIdMatch && roleIdMatch[1]) {
        role = await guild.roles.fetch(roleIdMatch[1]).catch(() => null);
      }

      if (!role) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Cargo Inválido', `Cargo não encontrado. Use menção válida: \`@cargo\`\n\n**Exemplo:** \`rx!removecargo 123456789 @staff\``));
      }

      await member.roles.remove(role.id);

      const logEmbed = criarEmbedLog({
        titulo: '❌ Cargo Removido',
        cor: CORES_LOG.CARGO,
        staff: message.author,
        usuario: member.user,
        motivo: `Cargo removido: ${role.name}`,
      });

      await enviarLog('cargoRemove', logEmbed);
      await enviarConfirmacao(message, message.author, `<:7619planet:1495818283042210034> | Cargo **${role.name}** removido com sucesso!`);
    } catch (erro) {
      console.error('Erro ao remover cargo:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível remover o cargo. Detalhes: ${erro.message}`));
    }
  },

  /**
  * rx!removadv ID - Remove a última advertência de um membro
   */
  async removadv(message, args) {
    // Validação de permissões - mínimo DOMINAÇÕES
    if (!podeUsarComando(message.member, HIERARQUIA_CARGOS.DOMINACOES)) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Permissão', 'Você não tem permissão para usar este comando.'));
    }

    if (args.length < 1) {
      return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Uso Incorreto', `Use: \`${PREFIX}REMOVADV <ID>\``));
    }

    const userId = args[0];

    try {
      const guild = message.guild;
      const member = await buscarMembro(guild, userId);

      // Carregar advertências
      const advertencias = carregarAdvertencias();

      if (!advertencias[userId] || advertencias[userId].length === 0) {
        return await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Sem Advertências', 'Este usuário não possui advertências registradas.'));
      }

      // Remover a última advertência
      const advRemovida = advertencias[userId].pop();
      const totalAdvAntes = advertencias[userId].length + 1;
      const totalAdvDepois = advertencias[userId].length;

      // Calcular nível anterior e novo
      const nivelAnterior = Math.min(totalAdvAntes, 3);
      const nivelNovo = Math.min(totalAdvDepois, 3);

      // Remover cargo anterior se necessário
      if (nivelAnterior > 0) {
        const cargoAnteriorId = CARGOS_ADVERTENCIA[nivelAnterior];
        if (cargoAnteriorId) {
          try {
            await member.roles.remove(cargoAnteriorId, 'Advertência removida');
          } catch (e) {
            console.warn(`[ADV] Não foi possível remover cargo anterior: ${e.message}`);
          }
        }
      }

      // Adicionar novo cargo se ainda houver advertências
      if (nivelNovo > 0) {
        const cargoNovoId = CARGOS_ADVERTENCIA[nivelNovo];
        if (cargoNovoId) {
          try {
            await member.roles.add(cargoNovoId, `Advertência ${nivelNovo}`);
            await agendarRemocaoCargoAdvertencia(guild, userId, nivelNovo);
          } catch (e) {
            console.error(`[ADV] Erro ao adicionar novo cargo: ${e.message}`);
          }
        }
      }

      // Salvar
      salvarAdvertencias(advertencias);

      // Criar embed de log
      const logEmbed = criarEmbedLog({
        titulo: '✅ Advertência Removida',
        cor: '#2ecc71',
        staff: message.author,
        usuario: member.user,
        motivo: advRemovida.motivo,
        extra: [
          {
            name: '👤 Staff Original',
            value: advRemovida.staff,
            inline: true
          },
          {
            name: '📅 Data da Advertência',
            value: advRemovida.data,
            inline: true
          },
          {
            name: '📊 Advertências Restantes',
            value: `${totalAdvDepois}`,
            inline: true
          },
          {
            name: '🎖️ Cargo Anterior',
            value: `Advertência ${nivelAnterior}`,
            inline: true
          },
          {
            name: '🎖️ Novo Cargo',
            value: nivelNovo > 0 ? `Advertência ${nivelNovo}` : 'Nenhum',
            inline: true
          }
        ]
      });

      await enviarLog('adv', logEmbed);
      const confirmMsg = `✅ | Advertência removida!\n**Advertências Restantes:** ${totalAdvDepois}\n\n-# <:sinfo:1482885110813691926> System╺╸Cargo atualizado para: ${nivelNovo > 0 ? `Advertência ${nivelNovo}` : 'Nenhum'}`;
      await enviarConfirmacao(message, message.author, confirmMsg);
    } catch (erro) {
      console.error('Erro ao remover advertência:', erro);
      await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', `Não foi possível remover advertência. Detalhes: ${erro.message}`));
    }
  },

  /**
  * rx!help - Mostra todos os comandos disponíveis
   */
  async help(message) {
  const nivelMembro = obterNivelPermissao(message.member);
  const ehAdministrador = ehAdmin(message.member);
  const ehStaffPuro = ehStaff(message.member) && nivelMembro === 0;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setAuthor({
      name: 'Rivex Staff System',
      iconURL: client.user.displayAvatarURL()
    })
    .setThumbnail(client.user.displayAvatarURL())
    .setTitle('📚 Painel de Ajuda')
    .setDescription(
      '> Sistema oficial de comandos da staff Rivex.\n' +
      `> Prefixo utilizado: \`${PREFIX}\``
    );

  // Públicos
  embed.addFields({
    name: '🌍 Comandos Públicos',
    value:
      '`rx!help`\n' +
      'Mostra todos os comandos disponíveis.',
    inline: false
  });

  // Staff normal - Apenas mostra para ROLE_STAFF puro
  if (ehStaffPuro) {
    embed.addFields({
      name: '🛡️ Comandos Staff',
      value:
        '`rx!mute <id> <tempo> <motivo>`\n' +
        '`rx!unmute <id>`\n' +
        '`rx!mutecall <id> <tempo> <motivo>`\n' +
        '`rx!unmutecall <id>`\n' +
        '`rx!clear <quantidade>`',
      inline: false
    });
  } else if (nivelMembro > 0 || ehAdministrador) {
    // Mostra comandos de staff para quem tem hierarquia (além dos seus próprios comandos)
    embed.addFields({
      name: '🛡️ Comandos Staff',
      value:
        '`rx!mute <id> <tempo> <motivo>`\n' +
        '`rx!unmute <id>`\n' +
        '`rx!mutecall <id> <tempo> <motivo>`\n' +
        '`rx!unmutecall <id>`\n' +
        '`rx!clear <quantidade>`',
      inline: false
    });
  }

  // Dominações+ - Apenas para quem tem hierarquia ou é admin
  if (nivelMembro >= HIERARQUIA_CARGOS.DOMINACOES || ehAdministrador) {
    embed.addFields({
      name: '⚠️ Advertências',
      value:
        '`rx!adv <id> <motivo>`\n' +
        'Registra advertência no usuário.\n\n' +
        '`rx!removadv <id>`\n' +
        'Remove a última advertência registrada.',
      inline: false
    });
  }

  // Admin
  if (ehAdministrador) {
    embed.addFields({
      name: '🔨 Administração',
      value:
        '`rx!ban <id> <motivo>`\n' +
        '`rx!unban <id>`\n' +
        '`rx!setcargo <id> <cargo>`\n' +
        '`rx!removecargo <id> <cargo>`',
      inline: false
    });
  }

  // Cargo atual
  const cargoText = ehStaffPuro
    ? '`Staff`'
    : nivelMembro > 0
      ? `\`${obterNomeCargoPorNivel(nivelMembro)}\``
      : '`Membro comum`';
  
  embed.addFields({
    name: '👤 Seu Cargo',
    value: cargoText,
    inline: true
  });

  // Admin badge
  if (ehAdministrador) {
    embed.addFields({
      name: '⭐ Administração',
      value: '`Possui cargo administrativo!`',
      inline: true
    });
  }

  embed
    .setImage('https://media.discordapp.net/attachments/1074971811328247818/1389334814926409728/standard.gif')
    .setFooter({
      text: 'Rivex • Sistema de Staff'
    })
    .setTimestamp();

  await enviarConfirmacao(message, message.author, embed, 60000);
}
};

// ==================== EVENTOS ====================

client.once('ready', async () => {
  console.log(`✅ Bot "${client.user.username}" conectado com sucesso!`);
  console.log(`📊 Total de servidores: ${client.guilds.cache.size}`);
  
  // Carregar timers de advertência para todos os servidores
  client.guilds.cache.forEach(guild => {
    console.log(`[ADV] Carregando timers agendados para o servidor: ${guild.name}`);
    carregarTimersAgendados(guild);
  });
  
  // Configurar perfil do bot (status, bio, etc)
  await configurarPerfilBot(client);
});

let processingMessage = false;

client.on('messageCreate', async (message) => {
  console.log(`[DEBUG] 📨 Evento messageCreate acionado: "${message.content}"`);
  
  // Ignorar mensagens de bots
  if (message.author.bot) {
    console.log(`[DEBUG] ❌ Ignorado: é mensagem de bot`);
    return;
  }

  // Apenas processa mensagens com prefix
  if (!message.content.startsWith(PREFIX)) {
    console.log(`[DEBUG] ❌ Ignorado: não tem prefix`);
    return;
  }

  console.log(`[DEBUG] ✅ Passou pelos filtros iniciais`);

  // Guard contra duplicação: ignora mensagens processadas nos últimos 500ms
  const now = Date.now();
  const lastProcessed = processedMessages.get(message.id) || 0;
  if (now - lastProcessed < 500) {
    console.log(`[MESSAGE] ⚠️ BLOQUEADA - Já processada há ${now - lastProcessed}ms: "${message.content}"`);
    return;
  }
  processedMessages.set(message.id, now);
  console.log(`[MESSAGE] ✅ Comando recebido: "${message.content}" de ${message.author.tag} (ID: ${message.id})`);

  // Não funciona em DMs
  if (!message.guild) {
    console.log(`[DEBUG] ❌ Ignorado: é DM`);
    return message.reply({ embeds: [criarEmbedErro('❌ Erro', 'Eu só funciono em servidores!')] });
  }

  // Extrair comando e argumentos antes de checar o canal
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const comando = args.shift().toLowerCase();

  // Forçar canal de comandos, exceto para clear
  if (message.channel.id !== config.canalComandos && comando !== 'clear') {
    console.log(`[DEBUG] ⚠️ Comando em canal errado: ${message.channel.id} (esperado: ${config.canalComandos})`);
    try { await message.delete().catch(() => {}); } catch (_) {}
    try {
      const aviso = await message.channel.send({ content: `<@${message.author.id}> Use meus comandos no chat correto!` });
      setTimeout(() => aviso.delete().catch(() => {}), 6000);
    } catch (_) {}
    return;
  }

  console.log(`[MESSAGE] 🚀 Executando comando: "${comando}"`);

  // Validar se o comando existe
  if (!comandos[comando]) {
    console.log(`[DEBUG] ❌ Comando não existe: ${comando}`);
    await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Comando Não Encontrado', `Use \`${PREFIX}HELP\` para ver os comandos disponíveis.`));
    return;
  }

  try {
    // Executar comando
    await comandos[comando](message, args);
    console.log(`[MESSAGE] ✅ Comando "${comando}" executado com sucesso`);
  } catch (erro) {
    console.error(`[MESSAGE] ❌ Erro ao executar comando ${comando}:`, erro);
    await enviarConfirmacao(message, message.author, criarEmbedErro('❌ Erro', 'Ocorreu um erro ao executar o comando. Tente novamente mais tarde.'));
  }

  // Limpeza periódica de IDs processados (após 2 segundos)
  setTimeout(() => {
    processedMessages.delete(message.id);
    console.log(`[MESSAGE] 🗑️ Limpeza: Removido ID ${message.id} do cache`);
  }, 2000);
});

// ==================== LOGIN ====================

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ ERRO: DISCORD_TOKEN não definido no arquivo .env');
  process.exit(1);
}

client.login(token).catch((erro) => {
  console.error('❌ Erro ao conectar ao Discord:', erro);
  process.exit(1);
});

// Tratamento de erro não capturado
process.on('unhandledRejection', (erro) => {
  console.error('❌ Promise rejeitada não tratada:', erro);
});
