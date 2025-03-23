// Mini-spillversjon for å løse problemer med hovedspillet
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Hent canvas og knapper
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const scoreDisplay = document.getElementById('score');
    
    // Opprett high score display element
    const highScoreDisplay = document.createElement('p');
    highScoreDisplay.className = 'score-display';
    highScoreDisplay.innerHTML = 'Rekord: <span id="highScore">0</span>';
    highScoreDisplay.style.marginLeft = '20px';
    
    // Legg til high score ved siden av poengsum
    const scoreContainer = scoreDisplay.parentElement;
    scoreContainer.style.display = 'flex';
    scoreContainer.style.justifyContent = 'center';
    scoreContainer.appendChild(highScoreDisplay);
    
    // Hent high score fra localStorage eller sett til 0
    let highScore = parseInt(localStorage.getItem('sparkesykkelHighScore') || '0');
    document.getElementById('highScore').textContent = highScore;
    
    // Sett canvas størrelse
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Grunnleggende spillvariabler
    let gameRunning = false;
    let score = 0;
    let animationId;
    let obstacles = [];
    let collectibles = []; // Array for drikke-collectibles
    let difficulty = 'medium'; // Default vanskelighetsgrad
    let drinkCount = 0; // Antall drikker samlet
    let drinkBarFull = false; // Om drikkebaren er full
    let drinkBarTimer = 0; // Timer for drikkebar-effekt
    let invincible = false; // Uovervinnelig når drikkebaren er full
    let screenWobble = 0; // For sjanglende effekt
    let controlReduction = 1; // Faktor for redusert kontroll
    let newHighScore = false; // Om det er oppnådd ny rekord
    let highScoreAnimationTimer = 0; // Timer for high score-animasjon
    let glitchIntensity = 0; // Intensitet på glitcheffekter basert på score
    let frameCount = 0; // For timing-baserte effekter
    
    // Kommentarer ved omstart av spillet
    const restartComments = [
      "Husk: Aldri kjør sparkesykkel i fylla!",
      "Det er smart å kjøre edru!",
      "Kjører du påvirket risikerer du bot og førerkort!",
      "Trafikken krever all din oppmerksomhet!",
      "Hold deg unna rus når du skal kjøre!",
      "Sparkesykler og alkohol er en farlig kombinasjon!",
      "Godt valg å ikke kjøre påvirket!",
      "Sikker ferdsel = edru kjøring",
      "Mange ulykker skjer med rusa sjåfører",
      "Tenk på din egen og andres sikkerhet!"
    ];
    
    // Kommentarer når spilleren er utenfor veien
    const roadComments = [
      "Hold deg på veien!",
      "Du kan ikke kjøre på fortauet!",
      "I veien er du til fare for andre!",
      "Sparkesykler skal holde seg i kjørebanen!",
      "Ikke blokkér veien for fotgjengere!",
      "Trafikkreglene gjelder også for sparkesykler!",
      "Kjør der du skal - på veien!",
      "Utenfor veien = farlig for alle!",
      "Du risikerer bot når du kjører utenfor veien!",
      "Vis hensyn til andre trafikanter!"
    ];
    
    // Kommentarer når spilleren krasjer med mennesker
    const humanCrashComments = [
      "Du traff en fotgjenger!",
      "Pass på hvor du kjører!",
      "Vis hensyn til fotgjengere!",
      "Sparkesykkelulykker med fotgjengere er alvorlig!",
      "Mange fotgjengere skades av sparkesykler!",
      "Reduser farten når det er mennesker i nærheten!",
      "Du kan bli erstatningspliktig!",
      "Å skade en fotgjenger kan være straffbart!",
      "Ikke kjør på mennesker!",
      "Fotgjengere har førsterett!"
    ];
    
    // Kommentarer når spilleren blir "full"
    const drunkComments = [
      "Det er ikke lov å kjøre rusa!",
      "Sparkesykkel og alkohol hører ikke sammen!",
      "Nå er du en trafikkfare!",
      "Promillekjøring er livsfarlig!",
      "Aldri kjør påvirket!",
      "Hold hodet klart i trafikken!",
      "Beruselse hører ikke hjemme på veien!",
      "Tenk på sikkerheten din!",
      "Rus + kjøring = dårlig kombinasjon",
      "Du risikerer både bot og førerkort!",
      "Alkohol svekker balansen din!",
      "Påvirket kjøring øker risikoen med 40x!",
      "Å kjøre rusa kan gi opptil 10.000 kr i bot!",
      "Du utsetter både deg selv og andre for fare!",
      "Reaksjonsevnen din blir kraftig redusert!",
      "Flere dør i trafikken pga. rus!",
      "Kjør edru, kom trygt hjem!"
    ];
    
    // Kommentarer ved spillslutt
    const gameOverComments = [
      "Det er ikke lov å kjøre rusa - nå ser du hvorfor!",
      "Alkohol reduserer reaksjonsevnen din!",
      "Promillekjøring tar liv!",
      "Rus i trafikken er livsfarlig!",
      "Sparkesykkel i fylla er ikke lurt!",
      "Kjør smartere, kjør edru!",
      "Vent til du er edru før du kjører!",
      "Krasj er bare én av konsekvensene av ruskjøring",
      "Tenk på andre i trafikken - ikke kjør påvirket!",
      "Politiet slår hardt ned på ruskjøring med sparkesykkel!",
      "Over 40% av dødsulykker involverer rus!",
      "Selv små mengder alkohol påvirker balansen!",
      "Man kan miste førerkortet ved å kjøre sparkesykkel rusa!",
      "Vennene dine vil heller at du kommer trygt hjem!",
      "En taxi er alltid billigere enn bot og sykehusregning!",
      "Rus + trafikk = økt risiko for alvorlige skader!",
      "Over 1,000 skades årlig i sparkesykkelulykker i Norge!"
    ];
    
    // Hjelpefunksjon for å velge tilfeldig element fra en array
    function getRandomItem(array) {
      return array[Math.floor(Math.random() * array.length)];
    }
    
    // Vanskelighetsgrader parametere - øker frekvensen av hindringer
    const difficultySettings = {
      easy: {
        obstacleSpeed: 3,
        obstacleFrequency: 0.02,  // Doblet fra 0.01
        collectibleFrequency: 0.005,
        playerSpeed: 12,
        maxObstacles: 8,  // Økt fra 5
        scoreMultiplier: 1
      },
      medium: {
        obstacleSpeed: 5,
        obstacleFrequency: 0.035,  // Nesten doblet fra 0.02
        collectibleFrequency: 0.008,
        playerSpeed: 15,
        maxObstacles: 15,  // Økt fra 10
        scoreMultiplier: 2
      },
      hard: {
        obstacleSpeed: 7,
        obstacleFrequency: 0.06,  // Økt fra 0.04
        collectibleFrequency: 0.01,
        playerSpeed: 18,
        maxObstacles: 20,  // Økt fra 15
        scoreMultiplier: 3
      }
    };
    
    // Hent aktive innstillinger basert på vanskelighetsgrad
    function getSettings() {
      return difficultySettings[difficulty];
    }
    
    // Beregn intensitet av visuelle effekter basert på score
    function calculateEffectIntensity() {
      // Base glitcheffekter på score - Gjør dem mer aggressive
      if (score < 30) {
        glitchIntensity = 0; // Ingen effekt ved lav score
      } else if (score < 70) {
        glitchIntensity = 2; // Sterkere mild effekt
      } else if (score < 150) {
        glitchIntensity = 3; // Sterkere moderat effekt
      } else if (score < 250) {
        glitchIntensity = 4; // Sterk effekt tidligere
      } else {
        glitchIntensity = 5; // Enda mer ekstrem effekt
      }
      
      // Hvis spiller er full (har drukket), øk effekten ytterligere
      if (drinkBarFull) {
        glitchIntensity += 3; // Øker fra 2 til 3
      }
      
      return glitchIntensity;
    }
    
    // Funksjon for å lage glitcheffekter
    function applyGlitchEffects() {
      const intensity = calculateEffectIntensity();
      
      if (intensity === 0) return; // Ingen effekt ved lav score
      
      // Glitch-effekt 1: Fargeforskyvning - mer aggressiv
      if (intensity >= 1 && Math.random() < 0.08 * intensity) { // Økt sannsynlighet
        ctx.save();
        // Lag flere lag med farger
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(canvas, 
          Math.random() * intensity * 8 - intensity * 4, // Økt forskyvning
          Math.random() * intensity * 8 - intensity * 4, 
          canvas.width, canvas.height);
        ctx.restore();
      }
      
      // Glitch-effekt 2: Linjeforskyvning - mer aggressiv
      if (intensity >= 2 && Math.random() < 0.05 * intensity) { // Økt sannsynlighet
        const numGlitches = Math.floor(Math.random() * intensity * 3) + 2; // Flere glitcher
        
        for (let i = 0; i < numGlitches; i++) {
          const y = Math.floor(Math.random() * canvas.height);
          const height = Math.floor(Math.random() * (15 * intensity)) + 5; // Tykkere linjer
          const offsetX = (Math.random() * intensity * 15) - (intensity * 7.5); // Større offset
          
          // Lagre delen av canvas vi skal flytte
          const imageData = ctx.getImageData(0, y, canvas.width, height);
          // Fjern den originale linjen
          ctx.clearRect(0, y, canvas.width, height);
          // Tegn linjen på ny posisjon
          ctx.putImageData(imageData, offsetX, y);
        }
      }
      
      // Glitch-effekt 3: Dobbeltsyn - mer aggressiv
      if (intensity >= 2 && Math.random() < 0.15) { // Begynner tidligere og mer sannsynlig
        ctx.save();
        ctx.globalAlpha = 0.4; // Mer synlig
        ctx.drawImage(canvas, intensity * 7, 0, canvas.width, canvas.height); // Større offset
        ctx.drawImage(canvas, -intensity * 7, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      
      // Ny Glitch-effekt 4: Farge-inversjon
      if (intensity >= 3 && Math.random() < 0.03 * intensity) {
        ctx.save();
        ctx.globalCompositeOperation = 'exclusion';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    
    // Spiller-objekt
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 100,
      width: 50,
      height: 70,
      speed: 10,
      tilt: 0, // Tilføyd for å lage "lene-effekt" ved kjøring
      trail: [], // Tilføyd for visuell trail-effekt
      draw() {
        // Endre farge basert på tilstand
        if (invincible) {
          // Uovervinnelig
          ctx.fillStyle = '#4CAF50'; // Grønn farge
          
          // Glødende effekt rundt spilleren
          ctx.shadowColor = '#4CAF50';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        } else if (score > 150) {
          // Høy score, legg til visuelle effekter
          const pulseAmount = Math.sin(Date.now() / 300) * 0.5 + 0.5;
          const redIntensity = Math.min(255, 150 + score / 5);
          const greenIntensity = Math.max(0, 150 - score / 10);
          
          ctx.fillStyle = `rgb(${redIntensity}, ${greenIntensity}, 0)`;
          
          // Legg til pulsering ved høy score
          const pulseScale = 1 + pulseAmount * 0.1;
          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.scale(pulseScale, pulseScale);
          ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
          ctx.restore();
          
          // Ikke tegn dobbelt
          return;
        } else {
          ctx.fillStyle = '#000000';
          ctx.shadowBlur = 0;
        }
        
        // Tegn trail-effekt (etterslep) når spilleren beveger seg
        if (this.trail.length > 0) {
          for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const alpha = 0.3 * ((this.trail.length - i) / this.trail.length);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(point.x - this.width/2, point.y - this.height/2, this.width, this.height);
          }
        }
        
        // Tegn sparkesykkel med tilt-effekt
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.tilt); // Roter basert på bevegelse
        
        // Tegn kropp
        ctx.fillStyle = invincible ? '#4CAF50' : '#000000';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Tegn frontstyrestang
        ctx.fillStyle = '#555555';
        ctx.fillRect(-this.width/4, -this.height/2, this.width/8, -this.height/3);
        
        // Tegn hjul
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(-this.width/4, this.height/2, this.width/6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.width/4, this.height/2, this.width/6, 0, Math.PI * 2);
        ctx.fill();
        
        // Tegn styrestyrestang
        ctx.fillStyle = '#555555';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height/10);
        
        ctx.restore();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      },
      update(keys) {
        // Lagre forrige posisjon
        const prevX = this.x;
        const prevY = this.y;
        
        // Oppdater hastighet basert på vanskelighetsgrad
        this.speed = getSettings().playerSpeed;
        
        // Beveg spilleren basert på tastatur
        if (keys.ArrowLeft || keys.a) this.x -= this.speed;
        if (keys.ArrowRight || keys.d) this.x += this.speed;
        if (keys.ArrowUp || keys.w) this.y -= this.speed;
        if (keys.ArrowDown || keys.s) this.y += this.speed;
        
        // Hold spilleren innenfor canvas
        this.x = Math.max(this.width/2, Math.min(this.x, canvas.width - this.width/2));
        this.y = Math.max(this.height/2, Math.min(this.y, canvas.height - this.height/2));
        
        // Beregn tilt basert på horisontal bevegelse
        if (keys.ArrowLeft || keys.a) {
          this.tilt = Math.max(-0.2, this.tilt - 0.05);
        } else if (keys.ArrowRight || keys.d) {
          this.tilt = Math.min(0.2, this.tilt + 0.05);
        } else {
          // Returner til normal posisjon
          this.tilt *= 0.8;
        }
        
        // Legg til trail-effekt hvis spilleren beveger seg raskt nok
        const movement = Math.sqrt(Math.pow(this.x - prevX, 2) + Math.pow(this.y - prevY, 2));
        if (movement > 3) {
          this.trail.push({x: prevX, y: prevY});
          // Behold bare de siste 5 posisjonene
          if (this.trail.length > 5) {
            this.trail.shift();
          }
        } else if (this.trail.length > 0 && frameCount % 3 === 0) {
          // Reduser trail gradvis når spilleren står stille
          this.trail.shift();
        }
      }
    };
    
    // Tastatur-input
    const keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      a: false,
      d: false,
      w: false,
      s: false
    };
    
    window.addEventListener('keydown', (e) => {
      if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        e.preventDefault();
      }
      
      // Pause med Escape
      if (e.key === 'Escape' && gameRunning) {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        showMessage('Spill pauset - Trykk Start for å fortsette');
        startBtn.style.display = 'inline-block';
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        e.preventDefault();
      }
    });
    
    // Opprett hindring
    function createObstacle() {
      const settings = getSettings();
      const minSize = 20;
      const maxSize = 60;
      const size = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
      
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      
      // Velg tilfeldig type hindring
      const obstacleType = Math.random();
      const isHuman = obstacleType < 0.3; // 30% sjanse for menneske
      const isCar = obstacleType >= 0.3 && obstacleType < 0.8; // 50% sjanse for bil
      const isStaticObstacle = obstacleType >= 0.8; // 20% sjanse for statisk hindring
      
      // Velg tilfeldig biltype hvis bil
      const carType = Math.floor(Math.random() * 3); // 0, 1 eller 2
      
      // Velg bevegelsesmønster (for biler og mennesker)
      const movementPattern = Math.floor(Math.random() * 5); // 0-4 forskjellige mønstre
      
      const obstacle = {
        x: leftEdge + Math.random() * roadWidth,
        y: -size,
        width: isCar ? size * 1.5 : size, // Biler er bredere
        height: isCar ? size * 1.2 : size, // Biler er litt lengre
        color: isHuman ? '#FF9800' : (isCar ? ['#FF4081', '#3F51B5', '#607D8B'][carType] : '#E53935'),
        speed: settings.obstacleSpeed + Math.random() * 2,
        isHuman: isHuman,
        isCar: isCar,
        carType: carType,
        isStatic: isStaticObstacle,
        angle: isCar ? (Math.random() * 0.1 - 0.05) : 0, // Litt rotasjon for biler
        movementPattern: movementPattern, // Bevegelsesmønster
        movementOffset: 0, // For å tracke bevegelsen
        draw() {
          if (this.isHuman) {
            // Tegn person
            ctx.fillStyle = '#FF9800'; // Kropp
            
            // Kropp
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.width/2.5, this.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Hode
            ctx.fillStyle = '#FFD54F';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height/2, this.width/4, 0, Math.PI * 2);
            ctx.fill();
            
            // Bein
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(this.x - this.width/5, this.y, this.width/10, this.height/2);
            ctx.fillRect(this.x + this.width/10, this.y, this.width/10, this.height/2);
          } else if (this.isCar) {
            // Tegn bil
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            // Bilens karosseri
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            // Bilens tak
            ctx.fillStyle = '#333333';
            const roofWidth = this.width * 0.7;
            const roofHeight = this.height * 0.5;
            ctx.fillRect(-roofWidth/2, -this.height/2 + this.height*0.15, roofWidth, roofHeight);
            
            // Bilens vinduer
            ctx.fillStyle = '#87CEFA';
            const windowWidth = roofWidth * 0.8;
            const windowHeight = roofHeight * 0.7;
            ctx.fillRect(-windowWidth/2, -this.height/2 + this.height*0.2, windowWidth, windowHeight);
            
            // Bilens hjul
            ctx.fillStyle = '#333333';
            const wheelSize = this.width * 0.2;
            ctx.beginPath();
            ctx.arc(-this.width/2 + wheelSize, -this.height/2 + this.height*0.85, wheelSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.width/2 - wheelSize, -this.height/2 + this.height*0.85, wheelSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Bilens lys
            ctx.fillStyle = '#FFEB3B';
            const lightSize = this.width * 0.1;
            ctx.beginPath();
            ctx.arc(-this.width/2 + lightSize, -this.height/2 + this.height*0.25, lightSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.width/2 - lightSize, -this.height/2 + this.height*0.25, lightSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
          } else {
            // Tegn statisk hindring (kjegle/bom)
            if (this.isStatic) {
              // Tegn trafikkkjegle
              ctx.fillStyle = '#FF5722'; // Orange base
              ctx.beginPath();
              ctx.moveTo(this.x, this.y - this.height/2);
              ctx.lineTo(this.x - this.width/2, this.y + this.height/2);
              ctx.lineTo(this.x + this.width/2, this.y + this.height/2);
              ctx.closePath();
              ctx.fill();
              
              // Hvite refleksstriper
              ctx.fillStyle = '#FFFFFF';
              const stripesHeight = this.height * 0.6;
              const stripesY = this.y - this.height/2 + this.height * 0.2;
              const stripesWidth = this.width * 0.7;
              
              ctx.beginPath();
              ctx.moveTo(this.x, stripesY);
              ctx.lineTo(this.x - stripesWidth/2, stripesY + stripesHeight);
              ctx.lineTo(this.x + stripesWidth/2, stripesY + stripesHeight);
              ctx.closePath();
              ctx.fill();
            } else {
              // Vanlig hindring
              ctx.fillStyle = this.color;
              ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            }
          }
        },
        update() {
          this.y += this.speed;
          
          // Implementer forskjellige bevegelsesmønstre basert på type
          if (this.isHuman) {
            // Mennesker beveger seg mer tilfeldig
            switch(this.movementPattern) {
              case 0: // Sidelengs bevegelse
                this.x += Math.sin(Date.now() / 500 + this.y / 50) * 1.5;
                break;
              case 1: // Zigzag
                this.x += (Math.sin(this.y / 30) > 0 ? 1 : -1) * 1.2;
                break;
              case 2: // Litt beruset gange
                this.x += Math.sin(Date.now() / 300) * 2;
                break;
              default: // Standard sidelengs bevegelse
                this.x += Math.sin(Date.now() / 1000 + this.y / 100) * 0.8;
            }
          } else if (this.isCar) {
            // Biler har mer forutsigbare men forskjellige bevegelser
            switch(this.movementPattern) {
              case 0: // Rett fram
                // Ingen sidelengs bevegelse
                break;
              case 1: // Slakkere sving
                this.x += Math.sin(Date.now() / 1500 + this.y / 150) * 1.2;
                this.angle = Math.sin(Date.now() / 1500 + this.y / 150) * 0.1;
                break;
              case 2: // Skiftende fil
                this.movementOffset += 0.02;
                if (this.movementOffset > 6.28) this.movementOffset = 0;
                const targetX = Math.sin(this.movementOffset) * 50;
                this.x += (targetX - this.x) * 0.02;
                this.angle = (targetX - this.x) * 0.002;
                break;
              case 3: // Fyllekjøring
                this.x += Math.sin(Date.now() / 800 + this.y / 80) * 2.5;
                this.angle = Math.sin(Date.now() / 800 + this.y / 80) * 0.15;
                break;
              default: // Standard bevegelse
                this.x += Math.sin(Date.now() / 1000 + this.y / 100) * 0.5;
                this.angle = Math.sin(Date.now() / 1000 + this.y / 100) * 0.05;
            }
          }
          
          // Hold hindringen på veien
          const roadWidth = canvas.width * 0.85;
          const leftEdge = (canvas.width - roadWidth) / 2;
          const margin = this.width / 2;
          this.x = Math.max(leftEdge + margin, Math.min(this.x, leftEdge + roadWidth - margin));
          
          return this.y > canvas.height + this.height;
        }
      };
      
      obstacles.push(obstacle);
    }
    
    // Opprett drikke-collectible
    function createCollectible() {
      const settings = getSettings();
      const size = 30; // Fast størrelse for drikker
      
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      
      const collectible = {
        x: leftEdge + Math.random() * roadWidth,
        y: -size,
        width: size,
        height: size,
        color: '#2196F3', // Blå farge for drikker
        speed: settings.obstacleSpeed + Math.random() * 1,
        draw() {
          // Tegn flaske/boks
          ctx.fillStyle = this.color;
          ctx.fillRect(this.x - this.width/3, this.y - this.height/2, this.width/1.5, this.height);
          
          // Tegn flaskehals/åpning
          ctx.fillStyle = '#BBDEFB'; // Lysere blå
          ctx.fillRect(this.x - this.width/4, this.y - this.height/2 - 5, this.width/2, 5);
          
          // Tegn etikett
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(this.x - this.width/4, this.y - this.height/4, this.width/2, this.height/2);
        },
        update() {
          this.y += this.speed;
          return this.y > canvas.height + this.height;
        }
      };
      
      collectibles.push(collectible);
    }
    
    // Tegn drikkebar
    function drawDrinkBar() {
      const barWidth = 150;
      const barHeight = 20;
      const barX = canvas.width - barWidth - 10;
      const barY = 10;
      
      // Tegn bakgrunn
      ctx.fillStyle = '#555555';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Beregn fyllingsnivå
      let fillWidth = (drinkCount / 3) * barWidth;
      
      // Tegn fylling
      ctx.fillStyle = drinkBarFull ? '#FFEB3B' : '#2196F3';
      ctx.fillRect(barX, barY, fillWidth, barHeight);
      
      // Tegn ramme
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      // Tegn tekst
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Drikkebar: ' + drinkCount + '/3', barX + barWidth/2, barY + barHeight/2 + 5);
    }
    
    // Håndter oppsamling av drikker
    function collectDrink() {
      drinkCount++;
      
      // Sjekk om vi har nådd 3 drikker
      if (drinkCount >= 3) {
        drinkBarFull = true;
        invincible = true;
        drinkBarTimer = 300; // 5 sekunder med 60 FPS
        
        // Velg en tilfeldig kommentar om rusede kjørere
        const randomComment = getRandomItem(drunkComments);
        
        // Vis beskjed til spilleren
        const fullBarMsg = document.createElement('div');
        fullBarMsg.textContent = 'UOVERVINNELIG! ' + randomComment;
        fullBarMsg.style.position = 'absolute';
        fullBarMsg.style.top = '80px';
        fullBarMsg.style.left = '50%';
        fullBarMsg.style.transform = 'translateX(-50%)';
        fullBarMsg.style.color = '#FFEB3B';
        fullBarMsg.style.fontWeight = 'bold';
        fullBarMsg.style.fontSize = '18px';
        fullBarMsg.style.textAlign = 'center';
        fullBarMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        fullBarMsg.style.padding = '10px';
        fullBarMsg.style.borderRadius = '5px';
        fullBarMsg.style.zIndex = '100';
        fullBarMsg.style.width = '80%';
        fullBarMsg.style.maxWidth = '600px';
        fullBarMsg.className = 'temp-message';
        document.querySelector('.game-container').appendChild(fullBarMsg);
        
        // Fjern beskjeden etter 3 sekunder
        setTimeout(() => {
          fullBarMsg.remove();
        }, 3000);
      }
    }
    
    // Håndter drikkebar-tilstand
    function updateDrinkBarStatus() {
      if (drinkBarFull) {
        drinkBarTimer--;
        
        if (drinkBarTimer <= 0) {
          drinkBarFull = false;
          invincible = false;
          drinkCount = 0;
        }
      }
    }
    
    // Spillsløyfe
    function gameLoop() {
      if (!gameRunning) return;
      
      // Øk frame counter for timing-baserte effekter
      frameCount++;
      
      // Tøm canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Beregn wobble-intensitet basert på score og drikkestatus - mer aggressiv
      const baseWobble = Math.min(15, score / 40); // Øker raskere og til høyere maksverdi
      const drunkMultiplier = drinkBarFull ? 4 : 1; // Økt multiplier
      screenWobble = baseWobble * drunkMultiplier;
      
      // Wobble screen basert på score og drikkestatus - mer aggressiv
      if (screenWobble > 0) {
        ctx.save();
        const wobbleX = Math.sin(Date.now() / 150) * screenWobble; // Raskere wobbling
        const wobbleY = Math.sin(Date.now() / 130) * screenWobble;
        ctx.translate(wobbleX, wobbleY);
        
        // Legg til rotasjon ved høyere score - mer aggressiv
        if (score > 100) { // Begynner tidligere
          const rotationAmount = Math.sin(Date.now() / 800) * (Math.min(8, score / 150)) * 0.015 * drunkMultiplier; // Økt rotasjon
          ctx.rotate(rotationAmount);
        }
      }
      
      // Tegn bakgrunn og vei
      ctx.fillStyle = '#388E3C'; // Grønn bakgrunn
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      
      // Tegn vei med forstyrrelser ved høyere score
      ctx.fillStyle = '#424242'; // Grå vei
      if (score > 300) {
        // Bølgende vei ved høy score
        const waveFreq = Date.now() / 1000;
        const waveHeight = Math.min(20, score / 50);
        
        ctx.beginPath();
        ctx.moveTo(leftEdge, 0);
        
        for (let y = 0; y < canvas.height; y += 10) {
          const waveX = Math.sin(waveFreq + y / 50) * waveHeight;
          ctx.lineTo(leftEdge + waveX, y);
        }
        
        ctx.lineTo(leftEdge + roadWidth + Math.sin(waveFreq + canvas.height / 50) * waveHeight, canvas.height);
        
        for (let y = canvas.height; y > 0; y -= 10) {
          const waveX = Math.sin(waveFreq + y / 50) * waveHeight;
          ctx.lineTo(leftEdge + roadWidth + waveX, y);
        }
        
        ctx.closePath();
        ctx.fill();
      } else {
        // Normal vei ved lav score
        ctx.fillRect(leftEdge, 0, roadWidth, canvas.height);
      }
      
      // Tegn midtlinje
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(canvas.width / 2 - 5, 0, 10, canvas.height);
      
      // Tegn "dobbeltsyn" midtlinjer basert på score
      if (score > 100) {
        const ghostOffset = Math.min(30, score / 20);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(canvas.width / 2 - 5 - ghostOffset, 0, 10, canvas.height);
        ctx.fillRect(canvas.width / 2 - 5 + ghostOffset, 0, 10, canvas.height);
        ctx.globalAlpha = 1.0;
      }
      
      // Oppdater drikkebar-status
      updateDrinkBarStatus();
      
      // Tegn drikkebar
      drawDrinkBar();
      
      // Oppdater og tegn hindringer
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const isOffScreen = obstacle.update();
        
        if (isOffScreen) {
          obstacles.splice(i, 1);
          score += getSettings().scoreMultiplier;
          scoreDisplay.textContent = score;
          
          // Sjekk om vi har slått high score
          checkHighScore();
        } else {
          obstacle.draw();
          
          // Sjekk for kollisjoner kun om ikke uovervinnelig
          if (!invincible) {
            // Forbedret kollisjonsdetektor - mer presis
            const playerBox = {
              x1: player.x - player.width/2 * 0.8, // Litt mindre kollisjonsbox for mer presisjon
              y1: player.y - player.height/2 * 0.8,
              x2: player.x + player.width/2 * 0.8,
              y2: player.y + player.height/2 * 0.8
            };
            
            const obstacleBox = {
              x1: obstacle.x - obstacle.width/2 * 0.9,
              y1: obstacle.y - obstacle.height/2 * 0.9,
              x2: obstacle.x + obstacle.width/2 * 0.9,
              y2: obstacle.y + obstacle.height/2 * 0.9
            };
            
            if (playerBox.x1 < obstacleBox.x2 && 
                playerBox.x2 > obstacleBox.x1 && 
                playerBox.y1 < obstacleBox.y2 && 
                playerBox.y2 > obstacleBox.y1) {
              // Kollisjon! Sjekk om det var med en person
              endGame(obstacle.isHuman ? 'human' : 'obstacle');
              return;
            }
          }
        }
      }
      
      // Oppdater og tegn collectibles
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const collectible = collectibles[i];
        const isOffScreen = collectible.update();
        
        if (isOffScreen) {
          collectibles.splice(i, 1);
        } else {
          collectible.draw();
          
          // Kollisjonsjekk med spiller
          const playerBox = {
            x1: player.x - player.width/2,
            y1: player.y - player.height/2,
            x2: player.x + player.width/2,
            y2: player.y + player.height/2
          };
          
          const collectibleBox = {
            x1: collectible.x - collectible.width/2,
            y1: collectible.y - collectible.height/2,
            x2: collectible.x + collectible.width/2,
            y2: collectible.y + collectible.height/2
          };
          
          if (playerBox.x1 < collectibleBox.x2 && 
              playerBox.x2 > collectibleBox.x1 && 
              playerBox.y1 < collectibleBox.y2 && 
              playerBox.y2 > collectibleBox.y1) {
            // Samlet en drikk!
            collectDrink();
            collectibles.splice(i, 1);
            
            // Legg til poeng
            score += 5;
            scoreDisplay.textContent = score;
            
            // Sjekk om vi har slått high score
            checkHighScore();
          }
        }
      }
      
      // Opprett nye hindringer basert på vanskelighetsgrad
      const settings = getSettings();
      if (Math.random() < settings.obstacleFrequency && obstacles.length < settings.maxObstacles) {
        createObstacle();
      }
      
      // Opprett nye drikker
      if (Math.random() < settings.collectibleFrequency && collectibles.length < 3 && !drinkBarFull) {
        createCollectible();
      }
      
      // Oppdater spiller
      player.update(keys);
      player.draw();
      
      // Vis valgt vanskelighetsgrad på skjermen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Vanskelighetsgrad: ' + capitalizeFirstLetter(difficulty), 10, 25);
      
      // Vis om spilleren er uovervinnelig
      if (invincible) {
        ctx.fillStyle = '#FFEB3B';
        ctx.fillText('Uovervinnelig: ' + Math.ceil(drinkBarTimer / 60) + 's', 10, 45);
      }
      
      // Sjekk om spilleren er utenfor veien
      const playerOffRoad = (player.x - player.width/2 < leftEdge || 
                            player.x + player.width/2 > leftEdge + roadWidth);
      
      if (playerOffRoad && !invincible && Math.random() < 0.01) {
        // 1% sjanse per frame for å vise melding når utenfor veien
        const randomRoadComment = getRandomItem(roadComments);
        showTemporaryMessage(randomRoadComment, 2000);
      }
      
      // Fortsett spillsløyfe
      animationId = requestAnimationFrame(gameLoop);
      
      // Legg til glitcheffekter basert på score
      applyGlitchEffects();
      
      // Reset canvas transform hvis wobble er aktivert
      if (screenWobble > 0) {
        ctx.restore();
      }
    }
    
    // Hjelpefunksjon for formatering av tekst
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Start spillet
    function startGame() {
      // Reset spill-tilstand
      gameRunning = true;
      score = 0;
      scoreDisplay.textContent = score;
      document.getElementById('highScore').textContent = highScore; // Oppdater high score display
      obstacles = [];
      collectibles = [];
      drinkCount = 0;
      drinkBarFull = false;
      invincible = false;
      newHighScore = false;
      
      // Reset difficultySettings fra eventuelle endringer
      difficultySettings.easy.obstacleFrequency = 0.02;
      difficultySettings.medium.obstacleFrequency = 0.035;
      difficultySettings.hard.obstacleFrequency = 0.06;
      
      // Skjul startknapp
      startBtn.style.display = 'none';
      restartBtn.style.display = 'none';
      
      // Fjern gamle meldinger
      const messages = document.querySelectorAll('.game-message, .temp-message');
      messages.forEach(msg => msg.remove());
      
      // Vis en tilfeldig kommentar ved omstart
      const randomRestartComment = getRandomItem(restartComments);
      const restartMsg = document.createElement('div');
      restartMsg.textContent = randomRestartComment;
      restartMsg.style.position = 'absolute';
      restartMsg.style.top = '25%';
      restartMsg.style.left = '50%';
      restartMsg.style.transform = 'translateX(-50%)';
      restartMsg.style.color = '#FFFFFF';
      restartMsg.style.fontWeight = 'bold';
      restartMsg.style.fontSize = '20px';
      restartMsg.style.textAlign = 'center';
      restartMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      restartMsg.style.padding = '10px';
      restartMsg.style.borderRadius = '5px';
      restartMsg.style.zIndex = '100';
      restartMsg.style.width = '80%';
      restartMsg.style.maxWidth = '600px';
      restartMsg.className = 'temp-message';
      document.querySelector('.game-container').appendChild(restartMsg);
      
      // Fjern kommentaren etter 3 sekunder
      setTimeout(() => {
        restartMsg.remove();
      }, 3000);
      
      // Start spillsløyfe
      animationId = requestAnimationFrame(gameLoop);
    }
    
    // Avslutt spillet
    function endGame(crashType = 'obstacle') {
      gameRunning = false;
      
      // Velg tilfeldig kommentar basert på type krasj
      let randomComment;
      
      if (crashType === 'human') {
        randomComment = getRandomItem(humanCrashComments);
      } else {
        randomComment = getRandomItem(gameOverComments);
      }
      
      // Vis melding og restart-knapp
      showMessage('Spill over! Din poengsum: ' + score + '\n\n' + randomComment);
      restartBtn.style.display = 'inline-block';
    }
    
    // Vis melding på skjermen
    function showMessage(text) {
      const messageElem = document.createElement('div');
      messageElem.classList.add('game-message');
      
      // Støtte for linjeskift i meldinger
      const textParts = text.split('\n');
      textParts.forEach((part, index) => {
        if (index > 0) {
          messageElem.appendChild(document.createElement('br'));
          messageElem.appendChild(document.createElement('br'));
        }
        messageElem.appendChild(document.createTextNode(part));
      });
      
      messageElem.style.position = 'absolute';
      messageElem.style.top = '40%';
      messageElem.style.left = '50%';
      messageElem.style.transform = 'translate(-50%, -50%)';
      messageElem.style.color = '#ffffff';
      messageElem.style.fontWeight = 'bold';
      messageElem.style.fontSize = '24px';
      messageElem.style.textAlign = 'center';
      messageElem.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      messageElem.style.padding = '20px';
      messageElem.style.borderRadius = '10px';
      messageElem.style.zIndex = '100';
      messageElem.style.width = '80%';
      messageElem.style.maxWidth = '600px';
      
      document.querySelector('.game-container').appendChild(messageElem);
    }
    
    // Vis midlertidig melding på skjermen
    function showTemporaryMessage(text, duration = 2000) {
      const tempMsg = document.createElement('div');
      tempMsg.textContent = text;
      tempMsg.style.position = 'absolute';
      tempMsg.style.top = '160px';
      tempMsg.style.left = '50%';
      tempMsg.style.transform = 'translateX(-50%)';
      tempMsg.style.color = '#FF5722';
      tempMsg.style.fontWeight = 'bold';
      tempMsg.style.fontSize = '18px';
      tempMsg.style.textAlign = 'center';
      tempMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      tempMsg.style.padding = '10px';
      tempMsg.style.borderRadius = '5px';
      tempMsg.style.zIndex = '100';
      tempMsg.style.width = '80%';
      tempMsg.style.maxWidth = '600px';
      tempMsg.className = 'temp-message';
      document.querySelector('.game-container').appendChild(tempMsg);
      
      // Fjern meldingen etter angitt tid
      setTimeout(() => {
        tempMsg.remove();
      }, duration);
    }
    
    // Opprett vanskelighetsgrad-valgknapper
    function createDifficultyButtons() {
      // Fjern eksisterende knapper hvis de finnes
      const existingButtons = document.querySelectorAll('.difficulty-btn');
      existingButtons.forEach(btn => btn.remove());
      
      // Opprett container for knapper
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'difficulty-buttons';
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'center';
      buttonContainer.style.gap = '10px';
      buttonContainer.style.marginTop = '10px';
      
      // Opprett knapper for hver vanskelighetsgrad
      const difficulties = ['easy', 'medium', 'hard'];
      const difficultyLabels = {
        'easy': 'Lett',
        'medium': 'Middels',
        'hard': 'Vanskelig'
      };
      
      difficulties.forEach(diff => {
        const button = document.createElement('button');
        button.className = 'difficulty-btn';
        button.textContent = difficultyLabels[diff];
        button.style.padding = '8px 15px';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = diff === difficulty ? '#4CAF50' : '#ddd';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.fontWeight = diff === difficulty ? 'bold' : 'normal';
        
        // Legg til klikk-hendelse
        button.addEventListener('click', () => {
          difficulty = diff;
          // Oppdater knappenes utseende
          document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.style.backgroundColor = btn.textContent === difficultyLabels[diff] ? '#4CAF50' : '#ddd';
            btn.style.fontWeight = btn.textContent === difficultyLabels[diff] ? 'bold' : 'normal';
          });
        });
        
        buttonContainer.appendChild(button);
      });
      
      // Sett inn knappene etter kontroller-hjelp-seksjonen
      const controlsHelp = document.querySelector('.controls-help');
      if (controlsHelp) {
        controlsHelp.parentNode.insertBefore(buttonContainer, controlsHelp.nextSibling);
      } else {
        // Alternativt, legg til etter start-knappen
        startBtn.parentNode.appendChild(buttonContainer);
      }
    }
    
    // Knapp-hendelser
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    
    // Opprett vanskelighetsknappene
    createDifficultyButtons();
    
    // Tegn startbilde
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const roadWidth = canvas.width * 0.85;
    const leftEdge = (canvas.width - roadWidth) / 2;
    
    ctx.fillStyle = '#424242';
    ctx.fillRect(leftEdge, 0, roadWidth, canvas.height);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Velg vanskelighetsgrad og trykk på Start Spill', canvas.width / 2, canvas.height / 2);
    
    // Vis nåværende high score
    ctx.fillStyle = '#FFD700';
    ctx.font = '18px Arial';
    ctx.fillText('Nåværende rekord: ' + highScore, canvas.width / 2, canvas.height / 2 + 40);
    
    // High score animasjon
    function createHighScoreAnimation() {
      const highScoreAnim = document.createElement('div');
      highScoreAnim.className = 'high-score-animation';
      highScoreAnim.textContent = 'NY REKORD!';
      highScoreAnim.style.position = 'absolute';
      highScoreAnim.style.top = '120px';
      highScoreAnim.style.left = '50%';
      highScoreAnim.style.transform = 'translateX(-50%) scale(1)';
      highScoreAnim.style.color = '#FFD700'; // Gull farge
      highScoreAnim.style.fontWeight = 'bold';
      highScoreAnim.style.fontSize = '32px';
      highScoreAnim.style.textAlign = 'center';
      highScoreAnim.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
      highScoreAnim.style.zIndex = '100';
      highScoreAnim.style.transition = 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out';
      
      document.querySelector('.game-container').appendChild(highScoreAnim);
      
      // Forbedret pulserende animasjon
      let pulseCount = 0;
      const maxPulses = 3;
      const pulseAnimation = setInterval(() => {
        if (pulseCount >= maxPulses) {
          clearInterval(pulseAnimation);
          return;
        }
        
        // Vokse
        highScoreAnim.style.transform = 'translateX(-50%) scale(1.5)';
        highScoreAnim.style.opacity = '1';
        
        setTimeout(() => {
          // Krympe
          highScoreAnim.style.transform = 'translateX(-50%) scale(1)';
          highScoreAnim.style.opacity = '0.8';
        }, 300);
        
        pulseCount++;
      }, 600);
      
      // Fjern animasjon etter 3 sekunder
      setTimeout(() => {
        highScoreAnim.remove();
      }, 3000);
    }
    
    // Funksjon for å sjekke og oppdatere high score
    function checkHighScore() {
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('sparkesykkelHighScore', highScore.toString());
        document.getElementById('highScore').textContent = highScore;
        
        if (!newHighScore) {
          newHighScore = true;
          createHighScoreAnimation();
        }
      }
    }
    
  } catch (error) {
    console.error('Feil ved initialisering:', error);
    alert('En feil oppstod under lasting av spillet. Prøv å laste siden på nytt.');
  }
}); 