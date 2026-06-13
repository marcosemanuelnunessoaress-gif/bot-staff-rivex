/**
 * Configurações do Perfil do Bot
 * Edite este arquivo para personalizar o perfil do seu bot
 */

export const BOT_PROFILE_CONFIG = {
  // ===== STATUS =====
  status: {
    enabled: true,
    
    // Tipo: PLAYING, STREAMING, LISTENING, WATCHING
    type: 'STREAMING',
    
    // Texto do status
    text: '🩸╺╸rx!help para ajuda',
    
    // URL (obrigatório para STREAMING)
    // Pode ser URL do Twitch, YouTube, etc
    url: 'https://www.twitch.tv/discord'
  },

  // ===== STATUS ROTATIVO (opcional) =====
  // Se habilitado, o bot vai rotacionar entre estes status
  rotatingStatus: {
    enabled: true,
    interval: 120000, // em milissegundos (10 segundos)
    statuses: [
      { type: 'STREAMING', text: '🚀╺╸Rivex Nº1', url: 'https://www.twitch.tv/discord' },
      { type: 'STREAMING', text: '🩸╺╸rx!help para ajuda', url: 'https://www.twitch.tv/discord'  },
      { type: 'STREAMING', text: '🤖╺╸Bot de Staff', url: 'https://www.twitch.tv/discord' },
      { type: 'STREAMING', text: '🎁╺╸Sorteios toda semana! ', url: 'https://www.twitch.tv/discord' }
    ]
  },

  // ===== BIOGRAFIA =====
  // NOTA: Requer permissões de API REST, pode ter limitações
  bio: {
    enabled: false,
    text: '🤖 Bot de Staff | Gerenciamento do servidor Rivex'
  },

  // ===== AVATAR =====
  // URL da imagem para avatar (deixe vazio para manter atual)
  avatar: {
    enabled: false,
    url: ''
  },

  // ===== NOME DO BOT =====
  // Deixe vazio para manter o nome atual
  username: {
    enabled: false,
    name: ''
  }
};

export default BOT_PROFILE_CONFIG;
