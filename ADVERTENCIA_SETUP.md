# 📋 CONFIGURAÇÃO DO SISTEMA DE ADVERTÊNCIAS COM CARGOS

## ✅ O que foi implementado:

1. **Sistema de Cargos Progressivos**: 
   - 1ª advertência → Cargo "advertencia 1"
   - 2ª advertência → Remove "advertencia 1" + Adiciona "advertencia 2"
   - 3ª advertência → Remove "advertencia 2" + Adiciona "advertencia 3"

2. **Remoção Automática após 7 dias**:
   - O bot remove automaticamente o cargo após 7 dias
   - Se o bot reiniciar, os timers são restaurados automaticamente

3. **Persistência de Dados**:
   - Os timers são salvos em `data/timers_advertencias.json`
   - Mesmo que o bot reinicie, os cargos serão removidos no tempo certo

## 🔧 INSTRUÇÕES DE CONFIGURAÇÃO:

### Passo 1: Adicionar IDs dos Cargos no `.env`

Você precisa adicionar 3 linhas ao seu arquivo `.env`:

```
# IDs dos Cargos de Advertência
ROLE_ADV1=SEU_ID_AQUI_1
ROLE_ADV2=SEU_ID_AQUI_2
ROLE_ADV3=SEU_ID_AQUI_3
```

### Passo 2: Obter os IDs dos Cargos

No Discord, ative o Modo de Desenvolvedor (Configurações → Avançado → Modo de Desenvolvedor)

Depois, clique com botão direito nos cargos e selecione "Copiar ID do Cargo"

### Passo 3: Exemplo de Configuração Completa

Seu `.env` ficará assim:

```
# Token do Bot Discord
DISCORD_TOKEN=SEU_TOKEN_AQUI

# ID do Servidor (Guild ID)
GUILD_ID=1472732440891232258

# IDs dos Cargos de Staff
ROLE_DOMINACOES=1483911483955089599
ROLE_TRONOS=1483911481283055768
ROLE_QUERUBIM=1483911479102144566
ROLE_ARCANJO=1483911478410088471
ROLE_SERAFIM=1483911477512638588
ROLE_STAFF=1465132683968516239

# IDs dos Cargos de Advertência (NOVOS!)
ROLE_ADV1=SEU_ID_ADVERTENCIA_1
ROLE_ADV2=SEU_ID_ADVERTENCIA_2
ROLE_ADV3=SEU_ID_ADVERTENCIA_3

# Cargo Padrão para ADDCARGO
ROLE_PADRAO=1483911491731329116
```

## 🚀 COMO USAR:

Use o comando normalmente:
```
rx!adv <ID_DO_USUARIO> <MOTIVO>
```

**Exemplo:**
```
rx!adv 1403768152411607111 Spam no chat
```

### O que acontece:

✅ Primeira advertência:
- Adiciona o cargo "advertencia 1"
- Agenda remoção após 7 dias

✅ Segunda advertência:
- Remove "advertencia 1"
- Adiciona "advertencia 2"
- Agenda remoção após 7 dias

✅ Terceira advertência:
- Remove "advertencia 2"
- Adiciona "advertencia 3"
- Agenda remoção após 7 dias

✅ Após 7 dias:
- Remove o cargo automaticamente
- Envia log no canal de logs

## 📝 NOTAS IMPORTANTES:

- Os cargos de advertência devem ser criados ANTES de usar o comando
- Certifique-se de que o bot tem permissão para gerenciar cargos
- Os cargos devem estar ABAIXO do cargo do bot na hierarquia
- Se o bot reiniciar, todos os timers pendentes serão recriados automaticamente

## 🛠️ TROUBLESHOOTING:

**Problema**: "Cargo ROLE_ADV1 não configurado no .env"
- **Solução**: Adicione os IDs dos cargos ao arquivo `.env` conforme indicado acima

**Problema**: Bot não consegue adicionar o cargo
- **Solução**: Verifique se:
  1. O cargo foi criado no servidor
  2. O bot tem permissão "Gerenciar cargos"
  3. O cargo do bot está ACIMA do cargo de advertência na hierarquia

**Problema**: Cargo não foi removido após 7 dias
- **Solução**: Verifique se o bot estava online quando o tempo expirou

---

Após configurar os IDs dos cargos no `.env`, reinicie o bot e tudo estará funcionando! 🎉
