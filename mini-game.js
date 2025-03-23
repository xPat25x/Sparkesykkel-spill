// Mini-spillversjon for å løse problemer med hovedspillet
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Hent canvas og knapper
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const scoreDisplay = document.getElementById('score');
    
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
    
    // Vanskelighetsgrader parametere
    const difficultySettings = {
      easy: {
        obstacleSpeed: 3,
        obstacleFrequency: 0.01,
        collectibleFrequency: 0.005,
        playerSpeed: 12,
        maxObstacles: 5,
        scoreMultiplier: 1
      },
      medium: {
        obstacleSpeed: 5,
        obstacleFrequency: 0.02,
        collectibleFrequency: 0.008,
        playerSpeed: 15,
        maxObstacles: 10,
        scoreMultiplier: 2
      },
      hard: {
        obstacleSpeed: 7,
        obstacleFrequency: 0.04,
        collectibleFrequency: 0.01,
        playerSpeed: 18,
        maxObstacles: 15,
        scoreMultiplier: 3
      }
    };
    
    // Hent aktive innstillinger basert på vanskelighetsgrad
    function getSettings() {
      return difficultySettings[difficulty];
    }
    
    // Spiller-objekt
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 100,
      width: 50,
      height: 70,
      speed: 10,
      draw() {
        // Endre farge hvis uovervinnelig
        if (invincible) {
          ctx.fillStyle = '#4CAF50'; // Grønn farge når uovervinnelig
          
          // Tegn en glødende effekt rundt spilleren
          const glowRadius = 10;
          ctx.shadowColor = '#4CAF50';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        } else {
          ctx.fillStyle = '#000000';
          ctx.shadowBlur = 0;
        }
        
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Reset shadow
        ctx.shadowBlur = 0;
      },
      update(keys) {
        // Oppdater hastighet basert på vanskelighetsgrad
        this.speed = getSettings().playerSpeed;
        
        // Beveg spilleren basert på tastatur - alltid full kontroll
        if (keys.ArrowLeft || keys.a) this.x -= this.speed;
        if (keys.ArrowRight || keys.d) this.x += this.speed;
        if (keys.ArrowUp || keys.w) this.y -= this.speed;
        if (keys.ArrowDown || keys.s) this.y += this.speed;
        
        // Hold spilleren innenfor canvas
        this.x = Math.max(this.width/2, Math.min(this.x, canvas.width - this.width/2));
        this.y = Math.max(this.height/2, Math.min(this.y, canvas.height - this.height/2));
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
      
      const obstacle = {
        x: leftEdge + Math.random() * roadWidth,
        y: -size,
        width: size,
        height: size,
        color: '#E53935',
        speed: settings.obstacleSpeed + Math.random() * 2,
        draw() {
          ctx.fillStyle = this.color;
          ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        },
        update() {
          this.y += this.speed;
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
      
      // Tøm canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Tegn bakgrunn og vei
      ctx.fillStyle = '#388E3C'; // Grønn bakgrunn
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      
      // Tegn vei
      ctx.fillStyle = '#424242'; // Grå vei
      ctx.fillRect(leftEdge, 0, roadWidth, canvas.height);
      
      // Tegn midtlinje
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(canvas.width / 2 - 5, 0, 10, canvas.height);
      
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
        } else {
          obstacle.draw();
          
          // Sjekk for kollisjoner kun om ikke uovervinnelig
          if (!invincible) {
            // Enkel kollisjonsdetektor (AABB)
            const playerBox = {
              x1: player.x - player.width/2,
              y1: player.y - player.height/2,
              x2: player.x + player.width/2,
              y2: player.y + player.height/2
            };
            
            const obstacleBox = {
              x1: obstacle.x - obstacle.width/2,
              y1: obstacle.y - obstacle.height/2,
              x2: obstacle.x + obstacle.width/2,
              y2: obstacle.y + obstacle.height/2
            };
            
            if (playerBox.x1 < obstacleBox.x2 && 
                playerBox.x2 > obstacleBox.x1 && 
                playerBox.y1 < obstacleBox.y2 && 
                playerBox.y2 > obstacleBox.y1) {
              // Kollisjon!
              endGame();
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
      
      // Fortsett spillsløyfe
      animationId = requestAnimationFrame(gameLoop);
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
      obstacles = [];
      collectibles = [];
      drinkCount = 0;
      drinkBarFull = false;
      invincible = false;
      
      // Reset difficultySettings fra eventuelle endringer
      difficultySettings.easy.obstacleFrequency = 0.01;
      difficultySettings.medium.obstacleFrequency = 0.02;
      difficultySettings.hard.obstacleFrequency = 0.04;
      
      // Skjul startknapp
      startBtn.style.display = 'none';
      restartBtn.style.display = 'none';
      
      // Fjern gamle meldinger
      const messages = document.querySelectorAll('.game-message, .temp-message');
      messages.forEach(msg => msg.remove());
      
      // Start spillsløyfe
      animationId = requestAnimationFrame(gameLoop);
    }
    
    // Avslutt spillet
    function endGame() {
      gameRunning = false;
      
      // Velg tilfeldig kommentar
      const randomComment = getRandomItem(gameOverComments);
      
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
    
  } catch (error) {
    console.error('Feil ved initialisering:', error);
    alert('En feil oppstod under lasting av spillet. Prøv å laste siden på nytt.');
  }
}); 