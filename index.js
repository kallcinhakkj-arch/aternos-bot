const http = require('http');
const mineflayer = require('mineflayer');

// ===== CONFIGURAÇÃO =====
const CONFIG = {
  host: process.env.HOST || "",
  port: process.env.PORT_SERVER || "",
  username: process.env.BOT_NAME || "Wanderer_83",
  logger: false,
  actionDelays: [2000, 4000, 7000, 11000],
  chatMessages: [
    "alguem ai?",
    "boa noite galera", 
    "esse server ta legal",
    "alguem pra jogar?",
    "to explorando",
    "opa",
    "hmm"
  ]
};

let connected = false;
let attempts = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getRandom = a => a[Math.floor(Math.random() * a.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Spoof de client brand (parece Minecraft original)
function spoofBrand(bot) {
  bot.once('login', () => {
    if (bot._client && bot._client.write) {
      try {
        bot._client.write('custom_payload', {
          channel: 'minecraft:brand',
          data: Buffer.from([7, ...Buffer.from('vanilla')])
        });
      } catch(e) {}
    }
  });
}

function createBot() {
  if (!CONFIG.host || !CONFIG.port) {
    console.error("[!] Configure as variáveis HOST e PORT_SERVER no Render!");
    return;
  }

  console.log(`\n[+] Conectando a ${CONFIG.host}:${CONFIG.port} como ${CONFIG.username}...`);

  const bot = mineflayer.createBot({
    host: CONFIG.host,
    port: parseInt(CONFIG.port),
    username: CONFIG.username,
    hideErrors: true,
    skipValidation: true,
    viewDistance: 'far'
  });

  spoofBrand(bot);

  bot.on('spawn', () => {
    connected = true;
    attempts = 0;
    console.log(`[+] ${CONFIG.username} entrou no servidor!`);

    const moveLoop = async () => {
      while (connected && bot && bot.entity) {
        try {
          const pos = bot.entity.position;
          const angle = Math.random() * Math.PI * 2;
          const radius = getRandomInt(8, 20);
          const tx = pos.x + Math.cos(angle) * radius;
          const tz = pos.z + Math.sin(angle) * radius;
          const dist = Math.sqrt((tx-pos.x)**2 + (tz-pos.z)**2);

          if (dist > 3) {
            bot.look(Math.atan2(tz-pos.z, tx-pos.x), 0, false);
            const steps = Math.min(Math.floor(dist / 1.5), 12);
            for (let i = 0; i < steps && connected && bot.entity; i++) {
              bot.setControlState('forward', true);
              if (Math.random() < 0.08) {
                bot.setControlState('jump', true);
                await sleep(150);
                bot.setControlState('jump', false);
              }
              if (Math.random() < 0.15 && bot.food > 6) {
                bot.setControlState('sprint', true);
                await sleep(getRandomInt(500, 1500));
                bot.setControlState('sprint', false);
              }
              await sleep(getRandomInt(300, 700));
            }
            bot.setControlState('forward', false);
          }

          if (bot.food && bot.food < 14) {
            const food = bot.inventory.items().find(
              i => ['cooked_beef','bread','apple','steak','cooked_porkchop'].includes(i.name)
            );
            if (food) {
              await bot.equip(food, 'hand');
              bot.activateItem(true);
              await sleep(getRandomInt(1500, 2500));
              bot.deactivateItem();
            }
          }

          await sleep(getRandomInt(CONFIG.actionDelays));
        } catch(err) {
          if (connected) await sleep(2000);
        }
      }
    };
    moveLoop();

    const lookLoop = async () => {
      while (connected && bot && bot.entity) {
        try {
          bot.look(Math.random() * Math.PI * 2, (Math.random() * Math.PI * 0.8) - (Math.PI * 0.4), false);
          await sleep(getRandomInt(5000, 15000));
        } catch(err) { await sleep(1000); }
      }
    };
    lookLoop();
  });

  bot.on('error', err => {
    console.error(`[!] Erro: ${err.message}`);
    connected = false;
    scheduleReconnect();
  });

  bot.on('kicked', reason => {
    try {
      const clean = reason.replace(/§[0-9a-fk-or]/g, '');
      console.error(`[!] Kickado: ${clean}`);
    } catch { console.error('[!] Kickado'); }
    connected = false;
    scheduleReconnect();
  });

  bot.on('end', () => {
    console.log('[!] Conexão encerrada');
    if (connected) { connected = false; scheduleReconnect(); }
  });

  bot.on('login', () => console.log(`[+] ${CONFIG.username} logado`));
  bot.on('death', () => {
    console.log('[!] Bot morreu, respawnando...');
    setTimeout(() => { try { bot.respawn(); } catch(e) {} }, 5000);
  });
}

function scheduleReconnect() {
  attempts++;
  const delay = Math.min(30000 * (1 + attempts * 0.3) + getRandomInt(-10000, 10000), 120000);
  console.log(`[+] Reconectando em ${Math.round(delay/1000)}s (tentativa ${attempts})`);
  setTimeout(createBot, Math.max(delay, 15000));
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: connected ? 'online' : 'offline',
    server: `${CONFIG.host}:${CONFIG.port}`,
    username: CONFIG.username
  }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[+] Servidor HTTP na porta ${PORT}`);
  setTimeout(createBot, 2000);
});
