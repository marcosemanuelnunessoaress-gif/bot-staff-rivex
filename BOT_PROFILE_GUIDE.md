# 🤖 Script de Perfil do Bot

## 📝 Visão Geral

Este sistema permite personalizar o perfil do bot de forma fácil via código, sem precisar editar constantemente. Você pode:

- ✅ Definir status "Transmitindo" (STREAMING)
- ✅ Adicionar biografia
- ✅ Alternar entre múltiplos status
- ✅ Alterar avatar
- ✅ Alterar nome do bot

## 📂 Estrutura de Arquivos

```
botstaff2/
├── config/
│   └── botProfileConfig.js    ← Edite AQUI para personalizar
├── utils/
│   └── botProfile.js          ← Funções (não edite)
├── index.js                   ← Carrega automaticamente
```

## ⚙️ Como Configurar

### 1. Abra o arquivo de configuração

[config/botProfileConfig.js](../config/botProfileConfig.js)

### 2. Modifique os campos desejados

#### Status Transmitindo:

```javascript
status: {
  enabled: true,                    // Habilitar/desabilitar
  type: 'STREAMING',               // PLAYING, STREAMING, LISTENING, WATCHING
  text: 'Transmissão Ao Vivo 🔴',  // Texto do status
  url: 'https://www.twitch.tv/seucanal'  // URL do Twitch/YouTube
}
```

#### Status Rotativo:

Se quiser que o bot mude de status a cada X segundos:

```javascript
rotatingStatus: {
  enabled: true,                    // Habilitar/desabilitar
  interval: 10000,                 // Tempo em ms (10 segundos)
  statuses: [
    { type: 'STREAMING', text: 'Transmissão Ao Vivo 🔴', url: 'https://www.twitch.tv/seucanal' },
    { type: 'WATCHING', text: 'Servidor Rivex' },
    { type: 'PLAYING', text: 'rx!help para ajuda' },
    { type: 'LISTENING', text: 'Mensagens' }
  ]
}
```

#### Biografia:

```javascript
bio: {
  enabled: true,
  text: '🤖 Bot de Staff | Gerenciamento do servidor Rivex'
}
```

#### Avatar:

```javascript
avatar: {
  enabled: true,
  url: 'https://link-da-imagem.com/avatar.png'
}
```

#### Nome do Bot:

```javascript
username: {
  enabled: true,
  name: 'Rivex Staff Bot'
}
```

## 🚀 Exemplos de Uso

### Exemplo 1: Status Transmitindo Simples

```javascript
status: {
  enabled: true,
  type: 'STREAMING',
  text: 'Transmissão Ao Vivo 🔴',
  url: 'https://www.twitch.tv/seucanal'
}
```

**Resultado:** Bot com status "Transmitindo Transmissão Ao Vivo 🔴"

### Exemplo 2: Status Rotativo

```javascript
rotatingStatus: {
  enabled: true,
  interval: 15000,  // Muda a cada 15 segundos
  statuses: [
    { type: 'PLAYING', text: 'Rivex ⚔️' },
    { type: 'WATCHING', text: 'Servidor Privado' },
    { type: 'LISTENING', text: 'Comandos: rx!help' }
  ]
}
```

### Exemplo 3: Perfil Completo

```javascript
// Status
status: {
  enabled: true,
  type: 'STREAMING',
  text: '🔴 Transmissão AO VIVO',
  url: 'https://www.twitch.tv/seucanal'
}

// Biografia
bio: {
  enabled: true,
  text: '🤖 Bot Oficial | Gerenciamento Staff | rx!help'
}

// Avatar
avatar: {
  enabled: true,
  url: 'https://cdn.discordapp.com/avatars/...'
}
```

## 🔗 Tipos de Status

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `PLAYING` | Jogando | "Jogando Minecraft" |
| `STREAMING` | Transmitindo | "Transmitindo no Twitch" (requer URL) |
| `LISTENING` | Ouvindo | "Ouvindo Música" |
| `WATCHING` | Assistindo | "Assistindo Tutorial" |

## 🔄 Status Rotativo

Quando `rotatingStatus.enabled` é `true`, o bot vai alternar entre os status listados automaticamente.

- **interval**: Tempo em milissegundos entre mudanças
- Exemplos: 
  - 5000 = 5 segundos
  - 10000 = 10 segundos
  - 30000 = 30 segundos

## 💡 Dicas

1. **URL para STREAMING**: Pode ser:
   - Twitch: `https://www.twitch.tv/seu_usuario`
   - YouTube: `https://www.youtube.com/seu_canal`

2. **Emojis**: Sinta-se livre para usar emojis nos textos de status

3. **Limite de atualização**: Discord tem limites de API, então não defina `interval` menor que 5000ms (5 segundos)

4. **Desabilitar recursos**: Simplesmente mude `enabled: false` para desabilitar qualquer recurso

## ⚡ Usar via Código

Se quiser atualizar o perfil dinamicamente (não só ao iniciar):

```javascript
import { atualizarStatus, atualizarBiografia } from './utils/botProfile.js';

// Alterar status
await atualizarStatus(client, 'Novo Status', 'PLAYING');

// Alterar biografia
await atualizarBiografia(client, 'Nova bio aqui');
```

## ❌ Erros Comuns

### Erro: "Biografia não atualiza"
- Discord.js pode não ter acesso completo à API de bio
- Certifique-se de que o token está correto
- Alguns tipos de bots têm restrições

### Status não aparece
- Verifique se `status.enabled: true`
- Para STREAMING, certifique-se de adicionar a URL
- Reinicie o bot

### Bot está "Offline" ou "Invisível"
- Verifique as permissões do bot
- Verifique o console para erros

## 📌 Notas Importantes

- **Ao reiniciar o bot**, o perfil é recarregado automaticamente
- **Status rotativo** continua rodando enquanto o bot está online
- **Mudanças** levam alguns segundos para aparecer no Discord
- **Backup**: Guarde seu `botProfileConfig.js` como backup

---

✅ Pronto! Apenas edite [config/botProfileConfig.js](../config/botProfileConfig.js) e reinicie o bot para ver as mudanças!
