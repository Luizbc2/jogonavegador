/* Minerador Arqueológico - Jogo Browser Canvas
 * Objetivo: cavar para baixo, coletar minérios e encontrar baús de arqueologia.
 * Linguagem: JavaScript puro + Canvas 2D.
 */

(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE_SIZE = 32; // 20 x 18 tiles (640 x 576)
  const VIEW_W = canvas.width / TILE_SIZE; // 20
  const VIEW_H = canvas.height / TILE_SIZE; // 18
  const WORLD_WIDTH = 32; // em tiles
  const WORLD_HEIGHT = 500; // profundidade gerada

  // HUD elements
  const depthEl = document.getElementById('depth');
  const energyEl = document.getElementById('energy');
  const invEls = {
    carvao: document.getElementById('inv-carvao'),
    ferro: document.getElementById('inv-ferro'),
    ouro: document.getElementById('inv-ouro'),
    diamante: document.getElementById('inv-diamante'),
    bau: document.getElementById('inv-bau')
  };
  const pickaxeLevelEl = document.getElementById('pickaxe-level');
  const energyFillEl = document.getElementById('energy-fill');
  const cardsCountEl = document.getElementById('cards-count');
  const upgOverlay = document.getElementById('upgrade');
  const upgCurrent = document.getElementById('upg-current');
  const upgCostBox = document.getElementById('upg-cost');
  const upgBtn = document.getElementById('btn-upgrade');
  const upgClose = document.getElementById('btn-upgrade-close');
  const upgOpenBtn = document.getElementById('btn-upgrade-open');
  const surfaceBtn = document.getElementById('btn-surface');

  const startPanel = document.getElementById('instructions');
  const startBtn = document.getElementById('btn-start');
  const archCardOverlay = document.getElementById('arch-card');
  const archText = document.getElementById('arch-text');
  const archClose = archCardOverlay.querySelector('.close');
  const pauseOverlay = document.getElementById('pause');

  const STATE = { running:false, paused:false, showCard:false };

  const RNG = mulberry32(Date.now() % 0xffffffff);

  // ===== Estilo visual fofo (palette + caches) =====
  const TILE_SPRITES = {}; // cache de canvas para cada tipo de tile
  const Palette = {
    dirtBase:'#7b5a3b', dirtLight:'#9d7a56', dirtDark:'#5a3d25',
    stoneBase:'#65707e', stoneLight:'#8994a3', stoneDark:'#4a535d',
    coalDark:'#1b1f23', coalLight:'#2d343b',
    ironBase:'#b0875f', ironLight:'#d3a679', ironDark:'#7a593d',
    goldBase:'#e0b84a', goldLight:'#ffe28a', goldDark:'#9d7d29',
    diamondBase:'#5ce0e8', diamondLight:'#b8f7fa', diamondDark:'#2d98a0',
    bedrockBase:'#2a2d32', bedrockLight:'#40454d', bedrockDark:'#17191c'
  };

  const TileType = {
    EMPTY: 0,
    DIRT: 1,
    STONE: 2,
    CARVAO: 3,
    FERRO: 4,
    OURO: 5,
    DIAMANTE: 6,
    BAU: 7,
    BEDROCK: 8
  };

  const TileDefs = {
    [TileType.EMPTY]: { breakable:false, color:'#000000', name:'Vazio' },
    [TileType.DIRT]: { breakable:true, color:'#4d3a24', name:'Terra', hardness:1 },
    [TileType.STONE]: { breakable:true, color:'#555c69', name:'Rocha', hardness:2 },
    [TileType.CARVAO]: { breakable:true, color:'#1f2327', name:'Carvão', hardness:1, drop:'carvao' },
    [TileType.FERRO]: { breakable:true, color:'#6f5d48', name:'Ferro', hardness:2, drop:'ferro' },
    [TileType.OURO]: { breakable:true, color:'#c7a642', name:'Ouro', hardness:3, drop:'ouro' },
    [TileType.DIAMANTE]: { breakable:true, color:'#35cfd6', name:'Diamante', hardness:4, drop:'diamante' },
    [TileType.BAU]: { breakable:false, color:'#b07a2a', name:'Baú', interactive:true },
    [TileType.BEDROCK]: { breakable:false, color:'#1a1d22', name:'Base' }
  };

  const archaeologyFactsMaster = [
    'As Pinturas Rupestres de Arapoti: Marcas em pedra com figuras humanas, animais e símbolos geométricos. Serviam como registros cerimoniais e narrativas visuais de comunidades indígenas antigas.',
    'As Pinturas de Jaguariaíva II: Painéis sobrepostos mostram que diferentes gerações ocuparam o mesmo espaço. Registram rituais, caça e a memória coletiva da comunidade.',
    'As Gravuras Rupestres de Tibagi II: Cenas do cotidiano e da natureza representadas artisticamente. Revelam conhecimento detalhado sobre fauna, flora e práticas culturais.',
    'A Cerâmica Decorada de Ortigueira II: Fragmentos com desenhos geométricos e pigmentos naturais. Mostram habilidade técnica e significado simbólico nas atividades diárias e rituais.',
    'A Cerâmica de Guarapuava II: Utensílios de uso doméstico e agrícola, associados a aldeias antigas. Indicativos de um modo de vida organizado e adaptado ao planalto paranaense.',
    'A Cerâmica de Ponta Grossa: Fragmentos que evidenciam trocas culturais entre diferentes grupos indígenas, mostrando a complexidade social do Paraná pré-colonial.',
    'A Cerâmica Itararé-Taquara: Produção simples, mas funcional, utilizada em casas subterrâneas e na vida cotidiana. Reflete técnicas adaptadas ao clima e à geografia do planalto.',
    'O Sambaqui Rio Itiberê: Estrutura de conchas e ossos humanos que revela contato cultural entre diferentes povos indígenas da região costeira.',
    'As Casas Subterrâneas de Irati: Estruturas circulares e subterrâneas usadas por povos Itararé-Taquara. Adaptadas ao clima frio, demonstram engenhosidade arquitetônica.',
    'A Aldeia de União da Vitória: Vestígios de habitações, cerâmica e ferramentas de pedra que indicam ocupação contínua de povos indígenas por milênios.',
    'Os Sambaquis de Morretes: Estruturas com restos de conchas, ossos e artefatos, mostrando como a comunidade utilizava os recursos naturais do litoral de forma sustentável.',
    'As Cerâmicas do Alto Iguaçu: Fragmentos agrícolas e domésticos de mais de 2.000 anos. Demonstram técnicas avançadas de produção e conservação de alimentos.',
    'O Sambaqui de Matinhos II: Montes de conchas organizados em camadas que indicam rituais, sepultamentos e ocupação prolongada de grupos pesqueiros.',
    'Os Sambaquis da Ilha do Mel II: Ossos humanos e artefatos encontrados juntos revelam a importância do espaço para cerimônias e rituais religiosos.',
    'A Aldeia de Cianorte: Fossas e depósitos de alimentos e sementes que indicam planejamento agrícola e gestão comunitária de recursos.',
    'A Aldeia de Bituruna II: Indícios de interação cultural entre Guarani e Kaingang. Ferramentas, cerâmica e restos de alimentos revelam trocas econômicas e sociais.',
    'As Rotas Indígenas do Planalto: Caminhos usados para deslocamento, comércio e contato cultural entre grupos do litoral e do interior do Paraná.',
    'Os Sambaquis de Guaraqueçaba II: Estruturas de conchas e ossos mostrando ocupações sucessivas ao longo de séculos, com registro de rituais e práticas alimentares.',
    'A Cerâmica Pintada de Telêmaco Borba: Fragmentos decorados com pigmentos minerais e padrões geométricos, usados em rituais e atividades diárias.',
    'Os Sambaquis de Paranaguá II: Monumentos construídos para moradia, enterramento e cerimônias, mostrando a complexidade social das comunidades litorâneas.',
    'As Pinturas Rupestres do Canyon Guartelá II: Painéis relacionados a mitos de fertilidade e caça, preservando o conhecimento ancestral indígena.',
    'O Sambaqui de Pontal do Paraná II: Localização estratégica próxima a manguezais, usado para coleta de mariscos e pesca, refletindo adaptação ao ecossistema costeiro.',
    'As Cerâmicas Guarani do Litoral II: Utensílios domésticos e religiosos, revelando aspectos da vida cotidiana, rituais e simbolismo cultural.',
    'O Sambaqui do Morro do Ouro II: Ossadas e cerâmica que evidenciam práticas funerárias complexas e organização comunitária em Antonina.',
    'As Pinturas de Ortigueira II: Representações de caça, vida cotidiana e rituais, registrando memórias coletivas e práticas sociais dos povos indígenas.'
  ];
  let archaeologyFactsPool = shuffleArray(archaeologyFactsMaster.slice());
  const archaeologyTotal = archaeologyFactsPool.length;

  function shuffleArray(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(RNG()* (i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Mundo: matriz linear
  const world = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);

  function idx(x,y){ return y * WORLD_WIDTH + x; }

  function generateWorld(){
    // Controle por linha para não saturar uma única profundidade
    const rowChestCount = new Array(WORLD_HEIGHT).fill(0);
    for(let y=0; y<WORLD_HEIGHT; y++){
      for(let x=0; x<WORLD_WIDTH; x++){
        let t = TileType.DIRT;
        if(y>8) t = TileType.STONE; // após camada superficial
        const depthFactor = y / WORLD_HEIGHT;
        if(t === TileType.STONE){
          const r = RNG();
          if(r < 0.002 + depthFactor*0.01) t = TileType.DIAMANTE; // ordem decrescente raridade
          else if(r < 0.006 + depthFactor*0.025) t = TileType.OURO;
          else if(r < 0.015 + depthFactor*0.04) t = TileType.FERRO;
            else if(r < 0.02 + depthFactor*0.05) t = TileType.CARVAO; // comum
        }
        // Nova lógica de baús: distribuídos probabilisticamente em toda a profundidade
        // Objetivo: mais fácil achar, sem agrupar tudo numa camada fixa.
        if(y>10 && y < WORLD_HEIGHT-5 && t !== TileType.BEDROCK){
          // Probabilidade base cresce levemente com a profundidade
          const baseChestP = 0.012 + depthFactor * 0.04; // ~1.2% no topo subterrâneo até ~5.2% profundo
          // Limite de baús por linha para espalhar verticalmente
          const maxPerRow = 2 + (depthFactor>0.6?1:0); // profundidade grande permite +1
          if(rowChestCount[y] < maxPerRow && RNG() < baseChestP){
            // Evita colar baús (distância mínima de 2 tiles de outro baú)
            let nearChest = false;
            for(let dy=-1; dy<=1 && !nearChest; dy++){
              for(let dx=-2; dx<=2; dx++){
                const nx = x+dx, ny = y+dy;
                if(nx>=0 && nx<WORLD_WIDTH && ny>=0 && ny<WORLD_HEIGHT){
                  if(world[idx(nx,ny)] === TileType.BAU){ nearChest = true; break; }
                }
              }
            }
            if(!nearChest){
              t = TileType.BAU;
              rowChestCount[y]++;
            }
          }
        }
        if(y === WORLD_HEIGHT-1) t = TileType.BEDROCK;
        world[idx(x,y)] = t;
      }
    }
    // Ajuste adicional: se houver poucas ocorrências totais de baús, injeta alguns extras rasos
    const totalChests = world.reduce((acc,v)=> acc + (v===TileType.BAU?1:0), 0);
    const targetMin = 18; // garantir mínimo para a exploração
    if(totalChests < targetMin){
      let needed = targetMin - totalChests;
      for(let attempt=0; attempt<500 && needed>0; attempt++){
        const ry = 12 + Math.floor(RNG()*Math.min(120, WORLD_HEIGHT-20)); // espalha primeiros 120 de profundidade
        const rx = 4 + Math.floor(RNG()*(WORLD_WIDTH-8));
        if(world[idx(rx,ry)] !== TileType.BAU && world[idx(rx,ry)] !== TileType.BEDROCK){
          // não sobrescreve diamante se possível
          if(world[idx(rx,ry)] === TileType.DIAMANTE && RNG() < 0.6) continue;
          world[idx(rx,ry)] = TileType.BAU;
          needed--;
        }
      }
    }
    // cavidade inicial (spawn)
    for(let y=0; y<6; y++){
      for(let x=13; x<19; x++) world[idx(x,y)] = TileType.EMPTY;
    }
  }

  function buildTileSprites(){
    const types = Object.keys(TileDefs).map(n=>Number(n));

    function roundedBase(cctx, color){
      // Fundo com cantos "arredondados" pixelados
      cctx.fillStyle = color;
      cctx.fillRect(1,1,TILE_SIZE-2,TILE_SIZE-2);
      // Escurece bordas externas para dar volume
      cctx.fillStyle = 'rgba(0,0,0,0.25)';
      cctx.fillRect(0,0,TILE_SIZE,1);
      cctx.fillRect(0,TILE_SIZE-1,TILE_SIZE,1);
      cctx.fillRect(0,0,1,TILE_SIZE);
      cctx.fillRect(TILE_SIZE-1,0,1,TILE_SIZE);
      // Luz no topo interno
      cctx.fillStyle = 'rgba(255,255,255,0.20)';
      cctx.fillRect(1,1,TILE_SIZE-2,2);
    }

    function softNoise(cctx, seedColorA, seedColorB, density=22){
      for(let i=0;i<density;i++){
        const dx = (i*7 + 13) % (TILE_SIZE-4) + 2;
        const dy = (i*11 + 29) % (TILE_SIZE-4) + 2;
        cctx.fillStyle = i%2? seedColorA : seedColorB;
        cctx.globalAlpha = 0.18 + (i%3)*0.06;
        cctx.fillRect(dx,dy,1,1);
      }
      cctx.globalAlpha = 1;
    }

    function oreClusters(cctx, specs){
      specs.forEach(sp=>{
        for(let i=0;i<sp.count;i++){
          const rx = (sp.seedX + i*3 + sp.off*17) % (TILE_SIZE-6) + 3;
          const ry = (sp.seedY + i*5 + sp.off*23) % (TILE_SIZE-8) + 3;
          // base blob
          cctx.fillStyle = sp.base;
          cctx.fillRect(rx, ry, 3,2);
          // highlight
          cctx.fillStyle = sp.hl;
          cctx.fillRect(rx+1, ry, 1,1);
          // sombra
          cctx.fillStyle = sp.shadow;
          cctx.fillRect(rx, ry+1, 1,1);
        }
      });
    }

    function tinyCracks(cctx){
      cctx.fillStyle = 'rgba(0,0,0,0.30)';
      for(let i=0;i<4;i++){
        const x = 3 + i*6;
        const y = 4 + (i*7)%18;
        cctx.fillRect(x,y,2,1);
        cctx.fillRect(x+1,y+1,1,1);
      }
    }

    types.forEach(t=>{
      if(t === TileType.EMPTY) return;
      const cnv = document.createElement('canvas');
      cnv.width = TILE_SIZE; cnv.height = TILE_SIZE;
      const cctx = cnv.getContext('2d');
      cctx.imageSmoothingEnabled = false;

      // Escolher paletas específicas mais "fofas"
      let base;
      switch(t){
        case TileType.DIRT: base = '#8b623d'; break;
        case TileType.STONE: base = '#6d7585'; break;
        case TileType.CARVAO: base = '#252a30'; break;
        case TileType.FERRO: base = '#b8865d'; break;
        case TileType.OURO: base = '#d4a63c'; break;
        case TileType.DIAMANTE: base = '#55d3dc'; break;
        case TileType.BEDROCK: base = '#2d3035'; break;
        case TileType.BAU: base = '#b4782b'; break;
        default: base = TileDefs[t].color;
      }
      roundedBase(cctx, base);

      // Layer de profundidade radial leve
      const rad = cctx.createRadialGradient(TILE_SIZE/2, TILE_SIZE/2, 4, TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2);
      rad.addColorStop(0,'rgba(255,255,255,0.10)');
      rad.addColorStop(1,'rgba(0,0,0,0.35)');
      cctx.fillStyle = rad;
      cctx.fillRect(1,1,TILE_SIZE-2,TILE_SIZE-2);

      if(t === TileType.DIRT){
        softNoise(cctx,'#3e2d1d','#c19966',18);
        tinyCracks(cctx);
      } else if(t === TileType.STONE){
        softNoise(cctx,'#ffffff','rgba(0,0,0,0.5)',26);
        tinyCracks(cctx);
      } else if(t === TileType.CARVAO){
        oreClusters(cctx,[{count:5, base:'#1c1f23', hl:'#3a434c', shadow:'#0d0f11', seedX:2, seedY:3, off: t}]);
      } else if(t === TileType.FERRO){
        oreClusters(cctx,[{count:5, base:'#c6976a', hl:'#e4ba8d', shadow:'#7a5434', seedX:1, seedY:4, off:t}]);
      } else if(t === TileType.OURO){
        oreClusters(cctx,[{count:5, base:'#f1cb55', hl:'#ffe89b', shadow:'#9d7a26', seedX:3, seedY:2, off:t}]);
      } else if(t === TileType.DIAMANTE){
        oreClusters(cctx,[{count:5, base:'#76eff6', hl:'#d6fbff', shadow:'#2c9ca4', seedX:2, seedY:5, off:t}]);
      } else if(t === TileType.BEDROCK){
        softNoise(cctx,'#ffffff','#000000',34);
      } else if(t === TileType.BAU){
        // Mantém base simples (baú desenhado em drawChest)
      }

      // Borda interna clarinha para "fofura"
      cctx.fillStyle = 'rgba(255,255,255,0.10)';
      cctx.fillRect(2,2,TILE_SIZE-4,1);
      cctx.fillRect(2,2,1,TILE_SIZE-4);

      TILE_SPRITES[t] = cnv;
    });
  }

  // Sprites auxiliares: rachaduras e aura de minério
  const CRACK_SPRITE = (()=>{ const c=document.createElement('canvas'); c.width=TILE_SIZE; c.height=TILE_SIZE; const g=c.getContext('2d'); g.strokeStyle='rgba(0,0,0,0.55)'; g.lineWidth=1; g.beginPath(); g.moveTo(5,6); g.lineTo(11,11); g.lineTo(7,15); g.lineTo(13,19); g.stroke(); g.beginPath(); g.moveTo(14,5); g.lineTo(18,11); g.lineTo(15,16); g.stroke(); return c; })();
  const ORE_AURA = (()=>{ const c=document.createElement('canvas'); c.width=TILE_SIZE; c.height=TILE_SIZE; const g=c.getContext('2d'); const r=g.createRadialGradient(TILE_SIZE/2,TILE_SIZE/2,1,TILE_SIZE/2,TILE_SIZE/2,TILE_SIZE/2); r.addColorStop(0,'rgba(255,255,220,0.9)'); r.addColorStop(0.6,'rgba(255,255,200,0.25)'); r.addColorStop(1,'rgba(255,255,200,0)'); g.fillStyle=r; g.fillRect(0,0,TILE_SIZE,TILE_SIZE); return c; })();
  const EFFECTS = { shakeBase:4, shakeDecay:1.9, breathingAmp:2.2, crackMaxAlpha:1, oreAuraMin:0.35, oreAuraMax:0.85, rareSparkChance:0.35, lingeringDust:true, parallax:true, debug:false };
  let cameraShakeTime = 0; function addCameraShake(intensity=1){ cameraShakeTime = 0.22 * intensity; }

  const player = {
    x: 16,
    y: 3,
    vx: 0,
    vy: 0,
    w: 1,
    h: 1,
    energy: 100,
    inventory:{ carvao:0, ferro:0, ouro:0, diamante:0, bau:0 },
    facing: 1,
    breaking:null, // {x,y, progress, need}
    pickaxeLevel:1,
  miningSpeedBase:0.4, // mais rápido base
  energyCostPerDrop:0.35, // menor custo base
    moveCooldown:0,
    miningDir:null, // 'down' | 'left' | 'right'
    miningAnimTime:0,
  };
  // Efeito visual quando retorna à superfície
  let surfaceFlashTime = 0; // segundos restantes do flash
  // Parallax background layers
  const parallaxLayers = [];
  function initParallax(){
    if(!EFFECTS.parallax) return;
    const colors = ['#0e1420','#141d2c','#1c2738'];
    for(let i=0;i<3;i++){
      const dots=[]; const count = 40 + i*25;
      for(let k=0;k<count;k++) dots.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:1+i*0.4,a:0.15+Math.random()*0.25});
      parallaxLayers.push({depth:0.1 + i*0.12, dots});
    }
  }
  initParallax();

  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const keys = {};
  window.addEventListener('keydown', e=>{
    keys[e.key.toLowerCase()] = true;
    if(e.key === 'Escape'){
      if(STATE.showCard){ hideCard(); return; }
      STATE.paused = !STATE.paused;
      pauseOverlay.classList.toggle('hidden', !STATE.paused);
    }
    if(e.key.toLowerCase()==='u'){
      toggleUpgrade();
    }
    if(e.key.toLowerCase()==='r'){
      returnToSurface();
    }
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });

  startBtn.addEventListener('click', ()=>{
    startPanel.classList.add('hidden');
    STATE.running = true;
  });
  archClose.addEventListener('click', hideCard);
  archCardOverlay.addEventListener('click', (e)=>{ if(e.target===archCardOverlay) hideCard(); });

  function hideCard(){
    archCardOverlay.classList.add('hidden');
    STATE.showCard = false;
  }

  function openRandomCard(){
    if(archaeologyFactsPool.length === 0){
      archText.textContent = 'Você já coletou todos os cards desta sessão!';
    } else {
      const fact = archaeologyFactsPool.pop();
      archText.textContent = fact;
    }
    archCardOverlay.classList.remove('hidden');
    STATE.showCard = true;
    // Efeito de partículas + confete global na tela
    spawnChestCelebration();
    spawnCardConfetti();
    updateCardsCounter();
  }

  function getTile(x,y){
    if(x<0||x>=WORLD_WIDTH||y<0||y>=WORLD_HEIGHT) return TileType.BEDROCK;
    return world[idx(x,y)];
  }

  function setTile(x,y,v){
    if(x<0||x>=WORLD_WIDTH||y<0||y>=WORLD_HEIGHT) return;
    world[idx(x,y)] = v;
  }

  function canMove(x,y){
    const t = getTile(x,y);
    return t === TileType.EMPTY; // baú bloqueia para precisar interagir
  }

  function tryInteract(){
    const candidates = [
      {x:player.x, y:player.y+1},
      {x:player.x+player.facing, y:player.y},
      {x:player.x, y:player.y},
      {x:player.x-1, y:player.y},
      {x:player.x+1, y:player.y}
    ];
    for(const c of candidates){
      if(getTile(c.x,c.y) === TileType.BAU){
        startChestOpen(c.x,c.y);
        setTile(c.x,c.y, TileType.EMPTY);
        player.inventory.bau++;
        updateHUD();
        setTimeout(()=>{ openRandomCard(); }, 450);
        return true;
      }
    }
    return false;
  }

  function updateHUD(){
    depthEl.textContent = player.y;
    energyEl.textContent = Math.floor(player.energy);
    invEls.carvao.textContent = player.inventory.carvao;
    invEls.ferro.textContent = player.inventory.ferro;
    invEls.ouro.textContent = player.inventory.ouro;
    invEls.diamante.textContent = player.inventory.diamante;
    invEls.bau.textContent = player.inventory.bau;
    pickaxeLevelEl.textContent = 'Lv ' + player.pickaxeLevel;
    if(energyFillEl){
      energyFillEl.style.width = (player.energy) + '%';
    }
  }

  function updateCardsCounter(){
    if(cardsCountEl){
      const collected = archaeologyTotal - archaeologyFactsPool.length;
      cardsCountEl.textContent = collected + '/' + archaeologyTotal;
    }
  }

  function toggleUpgrade(){
    if(STATE.showCard) return;
    if(player.y > 5){ return; } // só na superfície
    const visible = upgOverlay.classList.contains('hidden');
    if(!visible){
      upgOverlay.classList.add('hidden');
      STATE.paused = false;
      return;
    }
    refreshUpgradePanel();
    upgOverlay.classList.remove('hidden');
    STATE.paused = true;
  }

  function refreshUpgradePanel(){
    upgCurrent.textContent = player.pickaxeLevel;
    const cost = upgradeCost(player.pickaxeLevel+1);
    upgCostBox.innerHTML = `Custo próximo nível:<br>Ferro: ${cost.ferro} | Ouro: ${cost.ouro} | Diamante: ${cost.diamante}`;
    upgBtn.disabled = !canAfford(cost);
  }

  function upgradeCost(level){
    // Tornar upgrades bem mais fáceis
    return {
      ferro: Math.max(0, Math.ceil(1 * level * 0.9)),
      ouro: Math.max(0, Math.ceil(1 * (level>=2? (level-1)*0.8:0 ))),
      diamante: (level>=4? 1:0)
    };
  }

  function canAfford(cost){
    return player.inventory.ferro >= cost.ferro && player.inventory.ouro >= cost.ouro && player.inventory.diamante >= cost.diamante;
  }

  upgBtn?.addEventListener('click', ()=>{
    const next = player.pickaxeLevel+1;
    const cost = upgradeCost(next);
    if(!canAfford(cost)) return;
    player.inventory.ferro -= cost.ferro;
    player.inventory.ouro -= cost.ouro;
    player.inventory.diamante -= cost.diamante;
    player.pickaxeLevel = next;
    // Escalonar stats
    player.miningSpeedBase *= 0.75; // reduz tempo base
    player.energyCostPerDrop *= 0.8; // menor custo energia
    updateHUD();
    refreshUpgradePanel();
  });

  upgClose?.addEventListener('click', ()=>{ toggleUpgrade(); });
  upgOpenBtn?.addEventListener('click', ()=>{ toggleUpgrade(); });
  surfaceBtn?.addEventListener('click', ()=>{ returnToSurface(); });

  function returnToSurface(){
    // Cria uma área segura maior e um piso para evitar queda imediata
    for(let y=0; y<8; y++){
      for(let x=10; x<22; x++){
        if(y<6) setTile(x,y, TileType.EMPTY); else if(y===6) setTile(x,y, TileType.DIRT);
      }
    }
    player.x = 16;
    player.y = 2; // mais alto para o jogador aparecer centralizado
    player.breaking = null;
    player.miningDir = null;
    player.miningAnimTime = 0;
    player.energy = Math.min(100, player.energy + 50);
    STATE.paused = false;
    pauseOverlay.classList.add('hidden');
    surfaceFlashTime = 1.2; // duração do flash
    spawnTeleportEffect();
    updateHUD();
    updateCardsCounter();
  }

  function spawnTeleportEffect(){
    const baseX = player.x * TILE_SIZE;
    const baseY = player.y * TILE_SIZE;
    for(let i=0;i<26;i++){
      particles.push({
        x: baseX + TILE_SIZE/2 + (Math.random()*40-20),
        y: baseY + TILE_SIZE/2 + (Math.random()*34-17),
        vx:(Math.random()*80-40),
        vy:(Math.random()*-120-20),
        life:0.8 + Math.random()*0.5,
        age:0,
        col: (i%3===0? '#35cfd6':'#ffe28a')
      });
    }
  }

  function logic(dt){
    if(!STATE.running || STATE.paused || STATE.showCard) return;
    // cooldown para andar apenas 1 bloco por tecla pressionada
    player.moveCooldown -= dt;
    if(player.moveCooldown < 0) player.moveCooldown = 0;
    let horizontalIntent = 0;
    if(keys['a'] || keys['arrowleft']) horizontalIntent = -1;
    if(keys['d'] || keys['arrowright']) horizontalIntent = 1;
    if(horizontalIntent !== 0 && player.moveCooldown===0 && !player.breaking){
      const nx = player.x + horizontalIntent;
      if(canMove(nx, player.y)){
        player.x = nx;
        player.facing = horizontalIntent;
      }
      player.moveCooldown = 0.12; // controla "muitos blocos" -> só 1 por intervalo
    }

    if(keys['e']){
      if(tryInteract()) keys['e'] = false;
    }

    miningSystem(dt);

    // (removido movimento horizontal contínuo)

    // gravidade simples
    const below = getTile(player.x, player.y+1);
    if(below === TileType.EMPTY || below === TileType.BAU){
      player.y += 1;
    }

    updateHUD();
    updateChestAnimations(dt);
  }

  // ===== Partículas fofas de mineração =====
  const particles = [];
  const chestAnimations = []; // animações de abertura de baú
  // Confete agora é DOM dentro do card, não mais no canvas do jogo
  function startChestOpen(x,y){
    chestAnimations.push({x,y,time:0,duration:0.85,burst:false,preShake:true});
  }
  function spawnParticles(kind, worldPxX, worldPxY){
    const count = 10;
    for(let i=0;i<count;i++){
      particles.push({
        x: worldPxX + TILE_SIZE/2 + (Math.random()*10-5),
        y: worldPxY + TILE_SIZE/2 + (Math.random()*6-3),
        vx:(Math.random()*60-30),
        vy:(Math.random()*-80 - 20),
        life:0.7 + Math.random()*0.35,
        age:0,
        col: kind==='rare'? '#ffe28a' : '#cfd9e2'
      });
    }
    if(EFFECTS.lingeringDust){
      for(let d=0; d<6; d++){
        particles.push({
          x: worldPxX + TILE_SIZE/2 + (Math.random()*18-9),
          y: worldPxY + TILE_SIZE/2 + (Math.random()*8-4),
          vx:(Math.random()*30-15),
          vy:(Math.random()*-20),
          life:1.2 + Math.random()*0.8,
          age:0,
          col:'#2a3036'
        });
      }
    }
  }

  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.age += dt;
      if(p.age >= p.life){ particles.splice(i,1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120*dt; // gravidade
    }
  }

  function updateChestAnimations(dt){
    for(let i=chestAnimations.length-1;i>=0;i--){
      const a = chestAnimations[i];
      a.time += dt;
      if(a.preShake && a.time < 0.28){ if(Math.random()<0.5) addCameraShake(0.15); } else if(a.preShake){ a.preShake=false; }
      if(!a.burst && a.time > 0.35){
        a.burst = true;
        const baseX = a.x * TILE_SIZE;
        const baseY = a.y * TILE_SIZE;
        for(let k=0;k<22;k++){
          particles.push({
            x: baseX + TILE_SIZE/2,
            y: baseY + TILE_SIZE/2,
            vx: (Math.random()*180-90),
            vy: (Math.random()*-160 - 10),
            life:0.6+Math.random()*0.5,
            age:0,
            col: (k%3===0? '#ffe28a':'#fff4d0')
          });
        }
      }
      if(a.time >= a.duration){ chestAnimations.splice(i,1); }
    }
  }

  function drawChestAnimations(camY){
    chestAnimations.forEach(a=>{
      const progress = Math.min(1, a.time / a.duration);
      const screenX = (a.x - (Math.floor(WORLD_WIDTH/2 - VIEW_W/2))) * TILE_SIZE;
      const screenY = (a.y - camY) * TILE_SIZE;
      const rayAlpha = (progress<0.4? progress/0.4 : 1 - (progress-0.4)/0.6);
      const rays = 8;
      ctx.save();
      ctx.translate(screenX + TILE_SIZE/2, screenY + TILE_SIZE/2);
      ctx.globalAlpha = Math.max(0, rayAlpha)*0.55;
      for(let r=0;r<rays;r++){
        ctx.rotate(Math.PI*2/rays);
        const grd = ctx.createLinearGradient(0,0,0,-28);
        grd.addColorStop(0,'rgba(255,240,180,0.9)');
        grd.addColorStop(1,'rgba(255,240,180,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(-3,0);
        ctx.lineTo(3,0);
        ctx.lineTo(1,-28);
        ctx.lineTo(-1,-28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      drawOpeningChest(screenX, screenY, progress);
    });
  }

  function drawOpeningChest(x,y,progress){
    ctx.save();
    const tPulse = (Math.sin(performance.now()/250)+1)/2;
    for(let i=0;i<4;i++){
      const plankX = x+5 + i*5;
      ctx.fillStyle = ['#8e571a','#9b611f','#854b14','#a46824'][i%4];
      ctx.fillRect(plankX, y+11, 5, TILE_SIZE-19);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(plankX, y+11, 1, TILE_SIZE-19);
    }
    ctx.fillStyle = '#3a2a12';
    ctx.fillRect(x+4, y+14, TILE_SIZE-8, 2);
    ctx.fillRect(x+4, y+21, TILE_SIZE-8, 2);
    ctx.fillStyle = '#c9b061';
    ctx.fillRect(x+10, y+11, 2, TILE_SIZE-18);
    ctx.fillRect(x+TILE_SIZE-12, y+11, 2, TILE_SIZE-18);
    const lidLift = Math.sin(progress*Math.PI/2)*10;
    const lidRot = progress * 0.6;
    ctx.translate(x+TILE_SIZE/2, y+9);
    ctx.rotate(-lidRot);
    ctx.translate(-TILE_SIZE/2, -9);
    ctx.fillStyle = '#b87724';
    ctx.fillRect(x+4, y+6 - lidLift, TILE_SIZE-8, 7);
    ctx.fillStyle = '#d89834';
    ctx.fillRect(x+5, y+7 - lidLift, TILE_SIZE-10, 3);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + tPulse*0.15})`;
    ctx.fillRect(x+5, y+6 - lidLift, TILE_SIZE-10, 1);
    ctx.restore();
    ctx.fillStyle = '#e5c874';
    ctx.fillRect(x+TILE_SIZE/2-2, y+17, 4, 5);
    ctx.fillStyle = `rgba(255,255,200,${0.4 + tPulse*0.4})`;
    ctx.fillRect(x+TILE_SIZE/2-2, y+17, 4, 2);
    if(progress>0.15){
      const p = (progress-0.15)/0.85;
      ctx.save();
      ctx.globalAlpha = 0.65 * (p<0.5? p*2 : 1 - (p-0.5)*2);
      const radial = ctx.createRadialGradient(x+TILE_SIZE/2, y+20, 4, x+TILE_SIZE/2, y+20, 24);
      radial.addColorStop(0,'rgba(255,255,210,1)');
      radial.addColorStop(1,'rgba(255,220,120,0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(x+TILE_SIZE/2, y+20, 24, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(camY){
    const camYpx = camY * TILE_SIZE;
    const xOffset = Math.floor(WORLD_WIDTH/2 - VIEW_W/2) * TILE_SIZE; // deslocamento horizontal fixo
    particles.forEach(p=>{
      const alpha = 1 - (p.age/p.life);
      ctx.fillStyle = p.col + Math.floor(alpha*255).toString(16).padStart(2,'0');
      ctx.fillRect(Math.round(p.x - xOffset), Math.round(p.y - camYpx), 3,3);
    });
  }

  function spawnChestCelebration(){
    const baseX = player.x * TILE_SIZE;
    const baseY = player.y * TILE_SIZE;
    // anel de partículas ascendentes coloridas
    for(let i=0;i<40;i++){
      const ang = Math.random()*Math.PI*2;
      const spd = 50 + Math.random()*140;
      particles.push({
        x: baseX + TILE_SIZE/2 + Math.cos(ang)*4,
        y: baseY + TILE_SIZE/2 + Math.sin(ang)*4,
        vx: Math.cos(ang)*spd*0.6,
        vy: Math.sin(ang)*spd*0.6 - 40,
        life:0.8+Math.random()*0.6,
        age:0,
        col: (i%4===0? '#ffe28a' : (i%4===1? '#35cfd6' : (i%4===2? '#ff7b5b':'#ffd84d')))
      });
    }
    // faíscas raras verticais
    for(let k=0;k<18;k++){
      particles.push({
        x: baseX + TILE_SIZE/2 + (Math.random()*20-10),
        y: baseY + TILE_SIZE/2 + (Math.random()*10-5),
        vx:(Math.random()*60-30),
        vy:(Math.random()*-180 - 40),
        life:0.9+Math.random()*0.5,
        age:0,
        col: (k%2===0? '#fff4d0':'#ffe28a')
      });
    }
    // pulso de luz (reusa surfaceFlashTime para não criar outra var)
    surfaceFlashTime = Math.max(surfaceFlashTime, 0.6);
  }

  // === Confete DOM global acima de tudo ===
  function spawnCardConfetti(){
    const layer = document.getElementById('confetti-global');
    const card = document.querySelector('#arch-card .card');
    if(!layer || !card) return;
    layer.innerHTML='';
    // centro do card relativo ao layer
    const layerRect = layer.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const cx = cardRect.left + cardRect.width/2 - layerRect.left;
    const cy = cardRect.top + cardRect.height/2 - layerRect.top;
    const colors = ['#ff7b5b','#ffd84d','#7bffb8','#55d3dc','#ff9de6','#fff6c9','#ffe28a'];
    const total = 120;
    for(let i=0;i<total;i++){
      const el = document.createElement('div');
      let cls = 'confetti-piece';
      const r = Math.random();
      if(r<0.3) cls+=' round'; else if(r<0.55) cls+=' bar';
      el.className = cls;
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      const angle = Math.random()*Math.PI*2;
      const dist = 40 + Math.random()*150;
      const dx = Math.cos(angle)*dist;
      const dy = Math.sin(angle)*dist;
      el.style.left = cx+'px';
      el.style.top = cy+'px';
      el.style.setProperty('--dx', dx.toFixed(2)+'px');
      el.style.setProperty('--dy', dy.toFixed(2)+'px');
      el.style.setProperty('--rot', (Math.random()*720 - 360).toFixed(1)+'deg');
      const dur = (0.85 + Math.random()*0.5).toFixed(2)+'s';
      el.style.animation = `confettiBurst ${dur} cubic-bezier(.25,.6,.35,1) forwards`;
      el.style.animationDelay = (Math.random()*0.06).toFixed(2)+'s';
      layer.appendChild(el);
    }
    setTimeout(()=>{ layer.innerHTML=''; }, 1400);
  }

  function miningSystem(dt){
    // Lógica de mineração vertical ou lateral
    if(!(keys['s'] || keys['arrowdown'] || keys[' '] || (keys[' '] && (keys['a']||keys['arrowleft']||keys['d']||keys['arrowright'])))){
      player.breaking = null; player.miningDir = null; return;
    }

    let targetX = player.x;
    let targetY = player.y + 1; // padrão: cavar embaixo
    // Lateral se espaço + direção
    const lateral = (keys[' '] && (keys['a']||keys['arrowleft']||keys['d']||keys['arrowright']));
    if(lateral){
      if(keys['a']||keys['arrowleft']) targetX = player.x -1;
      else if(keys['d']||keys['arrowright']) targetX = player.x +1;
      targetY = player.y; // cavar ao lado
    }

    const tile = getTile(targetX, targetY);
    const def = TileDefs[tile];
    if(tile === TileType.BAU){ // não quebrável, exige tecla de interação
      player.breaking = null;
      return;
    }
    if(!def.breakable){ player.breaking = null; return; }

  const speedMultiplier = 1 + (player.pickaxeLevel-1)*0.35; // +35% por nível agora
  const needBase = (def.hardness||1) * player.miningSpeedBase / speedMultiplier * 0.75; // adicionalmente mais rápido
    if(!player.breaking || player.breaking.x!==targetX || player.breaking.y!==targetY){
      player.breaking = { x:targetX, y:targetY, progress:0, need:needBase };
      if(lateral){
        player.miningDir = (targetX < player.x)? 'left':'right';
      } else {
        player.miningDir = 'down';
      }
    } else {
      player.breaking.progress += dt;
      player.miningAnimTime += dt;
      if(player.breaking.progress >= player.breaking.need){
        const absX = player.breaking.x * TILE_SIZE;
        const absY = player.breaking.y * TILE_SIZE;
        const rare = (def.drop === 'ouro' || def.drop === 'diamante') ? 'rare':'normal';
        spawnParticles(rare, absX, absY);
        if(def.drop === 'diamante' && Math.random()<EFFECTS.rareSparkChance){
          for(let s=0;s<16;s++){
            const ang = Math.random()*Math.PI*2; const sp=40+Math.random()*120;
            particles.push({x:absX+TILE_SIZE/2,y:absY+TILE_SIZE/2,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:0.4+Math.random()*0.4,age:0,col:'#b3f6ff'});
          }
          addCameraShake(1.3);
        } else { addCameraShake(0.8); }
        setTile(targetX, targetY, TileType.EMPTY);
        if(def.drop){
          player.inventory[def.drop]++;
          const eff = Math.pow(0.8, player.pickaxeLevel-1); // 20% menos por nível
          player.energy = Math.max(0, player.energy - player.energyCostPerDrop * eff);
        }
        if(!lateral && targetY > player.y) player.y += 1; // só descer se era embaixo
        player.breaking = null;
        player.miningDir = null;
        updateHUD();
      }
    }
  }

  function draw(){
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    if(EFFECTS.parallax){
      parallaxLayers.forEach(l=>{
        const offsetY = (player.y*TILE_SIZE)*l.depth*0.08;
        ctx.globalAlpha = 0.6;
        l.dots.forEach(d=>{ let yy=(d.y+offsetY)%canvas.height; if(yy<0) yy+=canvas.height; ctx.fillStyle=`rgba(255,255,255,${d.a})`; ctx.fillRect(d.x, yy, d.r, d.r); });
        ctx.globalAlpha = 1;
      });
    }
    if(cameraShakeTime>0){
      const m=cameraShakeTime*EFFECTS.shakeBase;
      ctx.save();
      ctx.translate((Math.random()*2-1)*m,(Math.random()*2-1)*m);
      cameraShakeTime = Math.max(0, cameraShakeTime - 0.016*EFFECTS.shakeDecay);
    } else { ctx.save(); }

    // Centro da view seguindo jogador verticalmente
  let camY = player.y - Math.floor(VIEW_H/2);
  camY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_H, camY));
  currentCamY = camY;

    for(let vy=0; vy<VIEW_H; vy++){
      for(let vx=0; vx<VIEW_W; vx++){
        const wx = vx + Math.floor(WORLD_WIDTH/2 - VIEW_W/2); // centralizar horizontal
        const wy = vy + camY;
        const tile = getTile(wx, wy);
        if(tile !== TileType.EMPTY){
          drawTile(vx, vy, tile);
          // Sparkle animado leve para ouro e diamante
          if(tile === TileType.OURO || tile === TileType.DIAMANTE){
            const tNow = performance.now();
            const phase = (tNow/600 + (vx+vy)) % 1;
            if(phase < 0.25){
              const sx = vx*TILE_SIZE + 6 + ((vx+vy*3)%6);
              const sy = vy*TILE_SIZE + 5 + ((vx*2+vy)%8);
              ctx.fillStyle = tile===TileType.OURO? '#fff6c2':'#e9ffff';
              ctx.fillRect(sx, sy, 2,2);
              ctx.fillRect(sx-1, sy+1, 4,1);
              ctx.fillRect(sx+1, sy-1, 1,4);
            }
          }
        } else {
          const darkness = Math.min(0.85, wy / WORLD_HEIGHT * 0.9);
          const top = 25 - Math.floor(darkness*12);
          const bot = 12 - Math.floor(darkness*8);
          const gradBg = ctx.createLinearGradient(0, vy*TILE_SIZE, 0, vy*TILE_SIZE+TILE_SIZE);
          gradBg.addColorStop(0,`rgb(${top},${top+8},${top+14})`);
          gradBg.addColorStop(1,`rgb(${bot},${bot+4},${bot+9})`);
          ctx.fillStyle = gradBg;
          ctx.fillRect(vx*TILE_SIZE, vy*TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        if(tile === TileType.BAU){
          drawChest(vx, vy);
        }
      }
    }

    // Player
    const pScreenX = (player.x - (Math.floor(WORLD_WIDTH/2 - VIEW_W/2))) * TILE_SIZE;
    const pScreenY = (player.y - camY) * TILE_SIZE;
    drawPlayer(pScreenX, pScreenY);

  // Destaque / label de baú quando próximo
  highlightNearbyChests(camY);

    // Quebra progress bar
    if(player.breaking){
      drawMiningBar(player.breaking, camY);
    }

  drawParticles(camY);
  drawChestAnimations(camY);

  applyLighting(pScreenX, pScreenY);
  ctx.restore();
    // Overlay de flash ao retornar
    if(surfaceFlashTime>0){
      const alpha = Math.min(1, surfaceFlashTime/1.2);
      ctx.fillStyle = `rgba(255,255,255,${0.35*alpha})`;
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.font = '14px "Press Start 2P"';
      ctx.fillStyle = '#ffe28a';
      ctx.textAlign='center';
      ctx.fillText('SUPERFÍCIE', canvas.width/2, 46);
    }
    if(EFFECTS.debug){
      ctx.fillStyle='rgba(0,0,0,0.5)';
      ctx.fillRect(4,canvas.height-54,170,50);
      ctx.fillStyle='#fff'; ctx.font='10px monospace'; ctx.textAlign='left';
      ctx.fillText(`Shake:${cameraShakeTime.toFixed(2)}`,8,canvas.height-42);
      ctx.fillText(`Particulas:${particles.length}`,8,canvas.height-30);
      ctx.fillText(`Player:${player.x},${player.y}`,8,canvas.height-18);
    }
  }

  function drawPlayer(x,y){
    // Personagem estilo chibi fofo (cabeça grande, bochechas, animação sutil)
    const t = performance.now();
  const bob = Math.sin(t/480)*EFFECTS.breathingAmp;
    const blink = (t % 4200) < 120; // piscar
    const px = x; const py = y + bob;
    // Sombra elíptica
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(px+TILE_SIZE/2, py+TILE_SIZE-2, 10,3,0,0,Math.PI*2); ctx.fill();
    // Cabeça
    ctx.fillStyle = '#f9d9bc';
    ctx.fillRect(px+9, py+4, 14, 12);
    // Capacete / chapéu
    ctx.fillStyle = '#c7923d';
    ctx.fillRect(px+8, py+2, 16,5);
    ctx.fillStyle = '#e0b66a';
    ctx.fillRect(px+9, py+3, 14,2);
    // Olhos
    if(blink){
      ctx.fillStyle = '#3b2d29';
      ctx.fillRect(px+13, py+9, 4,1);
      ctx.fillRect(px+18, py+9, 4,1);
    } else {
      ctx.fillStyle = '#232';
      if(player.facing===1){
        ctx.fillRect(px+18, py+8, 3,3);
        ctx.fillRect(px+13, py+8, 2,3);
      } else {
        ctx.fillRect(px+13, py+8, 3,3);
        ctx.fillRect(px+18, py+8, 2,3);
      }
      ctx.fillStyle = '#fff';
      if(player.facing===1) ctx.fillRect(px+18, py+8, 1,1); else ctx.fillRect(px+13, py+8, 1,1);
    }
    // Bochechas
    ctx.fillStyle = '#f3a7a7';
    ctx.fillRect(px+11, py+11, 3,2);
    ctx.fillRect(px+18, py+11, 3,2);
    // Corpo
    ctx.fillStyle = '#5f94e9';
    ctx.fillRect(px+10, py+16, 12, 9);
    ctx.fillStyle = '#86b7fa';
    ctx.fillRect(px+11, py+17, 10,7);
    // Cinto
    ctx.fillStyle = '#3d2a16'; ctx.fillRect(px+10, py+24, 12,2);
    ctx.fillStyle = '#d6b14f'; ctx.fillRect(px+15, py+24, 2,2);
    // Pernas
    ctx.fillStyle = '#2f405a';
    ctx.fillRect(px+11, py+26, 4,7);
    ctx.fillRect(px+17, py+26, 4,7);
    // Botas
    ctx.fillStyle = '#5c452a';
    ctx.fillRect(px+11, py+33, 4,3);
    ctx.fillRect(px+17, py+33, 4,3);
    // Braço + pá animada
    const swing = player.breaking ? Math.sin(player.miningAnimTime * 18) : 0; // velocidade da animação
    const armXBase = player.facing===1 ? px+20 : px+8;
    const armYBase = py+18;
    // Braço fixo
    ctx.fillStyle = '#f9d9bc';
    ctx.fillRect(armXBase, armYBase, 3,5);
    // Pá girando
    const pivotX = armXBase + (player.facing===1?2:1);
    const pivotY = armYBase - 2;
    ctx.save();
    ctx.translate(pivotX, pivotY);
    let angle = 0;
    if(player.breaking){
      if(player.miningDir === 'down') angle = swing * 0.5 + (player.facing===1? 0.9 : -0.9);
      if(player.miningDir === 'left') angle = -0.8 + swing*0.4;
      if(player.miningDir === 'right') angle = 0.8 - swing*0.4;
    } else {
      angle = (player.facing===1? 0.6 : -0.6);
    }
    ctx.rotate(angle);
    // Cabo
    ctx.fillStyle = '#c7923d';
    ctx.fillRect(-1,0,3,10);
    // Lâmina
    ctx.fillStyle = '#d1dfe4';
    ctx.beginPath();
    ctx.moveTo(-4,2);
    ctx.lineTo(4,2);
    ctx.lineTo(5,6);
    ctx.lineTo(-5,6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Outline simples
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px+9, py+4, 14,1);
    ctx.fillRect(px+9, py+4, 1,12);
    ctx.fillRect(px+22, py+4, 1,12);
  }

  function drawMiningBar(breaking, camY){
    const by = (breaking.y - camY) * TILE_SIZE;
    const bx = (breaking.x - (Math.floor(WORLD_WIDTH/2 - VIEW_W/2))) * TILE_SIZE;
    const ratio = Math.min(1, breaking.progress / breaking.need);
    const barW = TILE_SIZE - 8;
    const barH = 10;
    const x = bx + 4;
    const y = by + TILE_SIZE/2 - barH/2;
    // Fundo com moldura "pixel"
    ctx.fillStyle = '#0a0f14';
    ctx.fillRect(x-2, y-2, barW+4, barH+4);
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(x-1, y-1, barW+2, barH+2);
    // Slot interno
    ctx.fillStyle = '#0e1822';
    ctx.fillRect(x, y, barW, barH);
    // Segmentos (marcadores)
    ctx.fillStyle = '#152434';
    const segments = 6;
    for(let i=1;i<segments;i++){
      const sx = x + (barW/segments)*i;
      ctx.fillRect(Math.round(sx)-1, y+1, 2, barH-2);
    }
    // Barra de progresso com gradiente
    const g = ctx.createLinearGradient(x,y,x+barW,y);
    g.addColorStop(0,'#ff4d4d');
    g.addColorStop(0.35,'#ffc24d');
    g.addColorStop(0.7,'#4dffc2');
    g.addColorStop(1,'#35cfd6');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, Math.round(barW * ratio), barH);
    // Overlay brilho
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, Math.round(barW * ratio), 3);
    // Borda externa clara
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x-2, y-2, barW+4, barH+4);
  }

  let currentCamY = 0; // usado para overlay de rachadura
  function drawTile(vx, vy, tileId){
    const img = TILE_SPRITES[tileId];
    if(img) ctx.drawImage(img, vx*TILE_SIZE, vy*TILE_SIZE);
    // Aura para minérios
    if(tileId === TileType.OURO || tileId === TileType.DIAMANTE){ const pulse=(Math.sin(performance.now()/600)+1)/2; ctx.globalAlpha=EFFECTS.oreAuraMin + pulse*(EFFECTS.oreAuraMax-EFFECTS.oreAuraMin); ctx.drawImage(ORE_AURA, vx*TILE_SIZE, vy*TILE_SIZE); ctx.globalAlpha=1; }
    // Rachadura se bloco está sendo quebrado
    if(player.breaking){
      const worldX = vx + Math.floor(WORLD_WIDTH/2 - VIEW_W/2);
      const worldY = vy + currentCamY;
      if(player.breaking.x===worldX && player.breaking.y===worldY){
        const ratio = Math.min(1, player.breaking.progress / player.breaking.need);
  ctx.globalAlpha = ratio*EFFECTS.crackMaxAlpha;
        ctx.drawImage(CRACK_SPRITE, vx*TILE_SIZE, vy*TILE_SIZE);
        ctx.globalAlpha = 1;
      }
    }
    // Highlight de proximidade para minérios raros
    if(tileId === TileType.OURO || tileId === TileType.DIAMANTE){
      const worldX = vx + Math.floor(WORLD_WIDTH/2 - VIEW_W/2);
      const worldY = vy + currentCamY;
      const dist = Math.abs(worldX - player.x) + Math.abs(worldY - player.y);
      if(dist <= 2){
        const pulse2 = (Math.sin(performance.now()/300)+1)/2;
        ctx.strokeStyle = `rgba(255,255,180,${0.15 + pulse2*0.25})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(vx*TILE_SIZE+2, vy*TILE_SIZE+2, TILE_SIZE-4, TILE_SIZE-4);
      }
    }
  }

  // (funções de textura antigas removidas – substituídas por sprites)

  function drawChest(vx,vy){
    const x = vx*TILE_SIZE; const y = vy*TILE_SIZE;
    const t = performance.now();
    const pulse = (Math.sin(t/380)+1)/2; // 0..1
    const glowCol = 180 + Math.floor(pulse*60);
    // Brilho retangular pulsante (sem círculo)
    const glowAlpha = 0.18 + pulse*0.25;
    ctx.strokeStyle = `rgba(255,227,140,${glowAlpha})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x+3.5, y+5.5, TILE_SIZE-7, TILE_SIZE-11);
    // Base (caixa)
    // Madeira com "tábuas" verticais
    for(let i=0;i<4;i++){
      const plankX = x+5 + i*5;
      ctx.fillStyle = ['#844f16','#8e571a','#7a4612','#925c1f'][i%4];
      ctx.fillRect(plankX, y+11, 5, TILE_SIZE-19);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(plankX, y+11, 1, TILE_SIZE-19);
    }
    // Laterais internas sombreadas
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x+5, y+11, TILE_SIZE-10, 2);
    // Tampa (separada)
    ctx.fillStyle = '#b87724';
    ctx.fillRect(x+4, y+6, TILE_SIZE-8, 7);
    ctx.fillStyle = '#d89834';
    ctx.fillRect(x+5, y+7, TILE_SIZE-10, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x+5, y+6, TILE_SIZE-10, 1);
    // Hastes metálicas horizontais
    ctx.fillStyle = '#3a2a12';
    ctx.fillRect(x+4, y+14, TILE_SIZE-8, 2);
    ctx.fillRect(x+4, y+21, TILE_SIZE-8, 2);
    // Fitas metálicas verticais
    ctx.fillStyle = '#c9b061';
    ctx.fillRect(x+10, y+11, 2, TILE_SIZE-18);
    ctx.fillRect(x+TILE_SIZE-12, y+11, 2, TILE_SIZE-18);
    // Fecho central
    ctx.fillStyle = '#2d1b07';
    ctx.fillRect(x+TILE_SIZE/2-4, y+15, 8, 9);
    ctx.fillStyle = '#e5c874';
    ctx.fillRect(x+TILE_SIZE/2-2, y+17, 4, 5);
    // Brilho animado no fecho + efeito de reflexo diagonal
    ctx.fillStyle = `rgba(255,255,200,${0.35 + pulse*0.45})`;
    ctx.fillRect(x+TILE_SIZE/2-2, y+17, 4, 2);
    // Reflexo diagonal (shimmer)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x+4, y+6, TILE_SIZE-8, TILE_SIZE-13);
    ctx.clip();
    const shX = (t/6) % (TILE_SIZE*2);
    const grad = ctx.createLinearGradient(x+shX-40, y, x+shX, y+TILE_SIZE);
    grad.addColorStop(0,'rgba(255,255,255,0)');
    grad.addColorStop(0.5,'rgba(255,255,255,0.35)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x+4, y+6, TILE_SIZE-8, TILE_SIZE-13);
    ctx.restore();
    // Sparkle estrela simples (duas)
    const seed = (vx*53 + vy*97) & 0xff;
    const sparkleOn = ((Math.sin(t/200 + seed) + 1)/2) > 0.6;
    if(sparkleOn){
      const sx = x + 8 + (seed % 12);
      const sy = y + 8 + (seed % 6);
      ctx.fillStyle = '#fff8d2';
      ctx.fillRect(sx, sy, 2,2);
      ctx.fillRect(sx-1, sy+1, 4,1);
      ctx.fillRect(sx+1, sy-1, 1,4);
    }
    // Contorno geral mais brilhante
    ctx.strokeStyle = `rgba(${glowCol},${Math.floor(glowCol*0.85)},80,0.95)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x+4.5, y+6.5, TILE_SIZE-9, TILE_SIZE-13);
  }

  function highlightNearbyChests(camY){
    for(let dy=-1; dy<=1; dy++){
      for(let dx=-1; dx<=1; dx++){
        const tx = player.x + dx;
        const ty = player.y + dy;
        if(getTile(tx,ty) === TileType.BAU){
          const centerX = (tx - (Math.floor(WORLD_WIDTH/2 - VIEW_W/2))) * TILE_SIZE + TILE_SIZE/2;
          const tileTop = (ty - camY) * TILE_SIZE;
          const labelHeight = 14;
          const labelWidth = 70;
          const labelY = tileTop - (labelHeight + 4); // 4px acima do topo
          ctx.fillStyle = 'rgba(10,10,16,0.75)';
          ctx.fillRect(centerX - labelWidth/2, labelY, labelWidth, labelHeight);
          ctx.strokeStyle = '#ffd76a';
          ctx.strokeRect(centerX - labelWidth/2, labelY, labelWidth, labelHeight);
          // Texto brilhante apenas 'BAÚ'
          const tt = performance.now();
          const pulse = (Math.sin(tt/350)+1)/2; // 0..1
          ctx.font = '9px "Press Start 2P"';
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          const grad = ctx.createLinearGradient(centerX-30, 0, centerX+30, 0);
          grad.addColorStop(0, '#ffdf8d');
          grad.addColorStop(0.5, `rgba(255,255,255,${0.45 + pulse*0.5})`);
          grad.addColorStop(1, '#ffc84d');
          ctx.fillStyle = grad;
          // Glow leve atrás
          ctx.fillStyle = `rgba(255,215,120,${0.35 + pulse*0.25})`;
          ctx.fillText('BAÚ', centerX, labelY + labelHeight/2 + 0.5 + 1);
          ctx.fillStyle = grad;
          ctx.fillText('BAÚ', centerX, labelY + labelHeight/2 + 0.5);
          ctx.strokeStyle = `rgba(255,230,150,${0.4 + pulse*0.4})`;
          ctx.lineWidth = 1;
          ctx.strokeText('BAÚ', centerX, labelY + labelHeight/2 + 0.5);
        }
      }
    }
  }

  function applyLighting(pScreenX, pScreenY){
    // Luz circular simples ao redor do jogador, escurece bordas
    const gradient = ctx.createRadialGradient(pScreenX+TILE_SIZE/2, pScreenY+TILE_SIZE/2, 40, pScreenX+TILE_SIZE/2, pScreenY+TILE_SIZE/2, 260);
    gradient.addColorStop(0,'rgba(0,0,0,0)');
    gradient.addColorStop(0.5,'rgba(0,0,0,0.20)');
    gradient.addColorStop(1,'rgba(0,0,0,0.72)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width, canvas.height);
  }

  function shade(hex, amt){
    const c = parseInt(hex.slice(1),16);
    let r = (c>>16)+amt; let g = (c>>8 & 0xff)+amt; let b = (c & 0xff)+amt;
    r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
    return '#' + (r.toString(16).padStart(2,'0')) + (g.toString(16).padStart(2,'0')) + (b.toString(16).padStart(2,'0'));
  }

  let last = performance.now();
  function frame(now){
    const dt = (now - last)/1000;
    last = now;
    logic(dt);
  updateParticles(dt);
    draw();
    if(surfaceFlashTime>0){
      surfaceFlashTime -= dt;
      if(surfaceFlashTime < 0) surfaceFlashTime = 0;
    }
    requestAnimationFrame(frame);
  }

  generateWorld();
  buildTileSprites();
  updateHUD();
  requestAnimationFrame(frame);
})();
