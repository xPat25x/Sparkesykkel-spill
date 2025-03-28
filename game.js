/**
 * SPARKESYKKEL-SPILL
 * 
 * Dette er hovedfilen for sparkesykkelspillet. Den inneholder all spillogikk, grafikk og kontroll.
 * 
 * Hovedkomponenter:
 * - Spilløkken: Sykkel, hindringer, kollisjonsdetektering
 * - Tegnerutiner: Vei, kjøretøy, effekter
 * - Beruselseseffekter: Glitch, kamerasjaking, veiforvrengning
 * - Lydeffekter
 * - Poeng og power-ups
 */

document.addEventListener('DOMContentLoaded', () => {
  try {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const soundToggle = document.getElementById('soundToggle');

    // Sett lerretstørrelse basert på elementets offset
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // *** SPILLVARIABLER ***
    let gameRunning = false;
    let gameOver = false;
    let score = 0;
    let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;
    let animationId;
    let obstacleSpeed = 7; // Økt fra 5 til 7
    let obstacleFrequency = 80; // Redusert fra 100 til 80
    let frameCount = 0;
    let debugMode = false; // Sett til true for å se kollisjonsområder
    
    // *** BERUSELSES-VARIABLER ***
    let isDrunk = true; // Hold true for å aktivere systemet
    let drunkLevel = 0; // Start helt edru (0)
    let swayAngle = 0;
    let visionBlur = 0;
    let lastRandomDirection = 0;
    let randomDirectionTimer = 0;
    let lastScoreThreshold = 0; // Spor når beruselsesnivået skal økes

    // *** TILLEGGSINNSTILLINGER ***
    let timeOfDay = 25; 
    let dayNightCycle = false;
    let weather = 'clear'; 
    let motionBlurEnabled = false;
    let cameraShakeEnabled = true;
    let dynamicCameraEnabled = false;
    let usePlayerImage = true;
    
    // *** ARRAY-INITIALISERINGER ***
    let obstacles = [];         // Hindringer (biler, fotgjengere)
    let collectibles = [];      // Gjenstander som kan samles
    let activePowerUps = [];    // Aktive power-ups
    let powerUpEffects = [];    // Array for å lagre aktive power-up effekter
    let wheelTracks = [];       // Hjulspor

    // Road-linjer for bakgrunnen
    const roadLines = [];
    const roadLineWidth = 10;
    const roadLineHeight = 40;
    const roadLineGap = 30;

    // Initialiser road-linjer
    function initRoadLines() {
      // Use full canvas height
      const horizonY = 0; // Top of canvas
      const numLines = 45;
      const spacing = canvas.height / numLines;
      roadLines.length = 0;
      for (let i = 0; i < numLines; i++) {
        roadLines.push({
          x: canvas.width / 2 - roadLineWidth / 2,
          y: horizonY + i * spacing
        });
      }
    }

    // Tegn veien med fortau (sidewalks)
    function drawRoad2D() {
      // Fjernet himmel, bruker full høyde for veien
      const horizon = 0; // Satt horisont til 0 (toppen av canvas)
      
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      const sidewalkWidth = Math.min(40, leftEdge * 0.8);

      // Tegn bakkeområde (gress) - forenklet
      ctx.fillStyle = '#4CAF50'; // Lysere grønn bakgrunn (var #388E3C)
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply drunk road distortion
      if (isDrunk && drunkLevel > 0.2) {
        // Draw distorted road - wavy effect based on drunk level
        const distortionFrequency = 0.02;
        const distortionAmplitude = roadDistortion;
        const laneWidth = roadWidth / 3;
        
        // Adjust drawing
        ctx.save();
        
        // Draw distorted road surface - lysere vei når beruset
        ctx.fillStyle = '#9E9E9E'; // Enda lysere grå (var #757575)
        ctx.beginPath();
        
        // Left edge with distortion
        ctx.moveTo(leftEdge, 0);
        for (let y = 0; y < canvas.height; y += 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05) * distortionAmplitude;
          ctx.lineTo(leftEdge + distortion, y);
        }
        
        // Right edge with distortion, offset phase for more realistic wave
        ctx.lineTo(leftEdge + roadWidth + Math.sin(canvas.height * distortionFrequency + frameCount * 0.05 + 0.5) * distortionAmplitude, canvas.height);
        for (let y = canvas.height; y > 0; y -= 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05 + 1) * distortionAmplitude;
          ctx.lineTo(leftEdge + roadWidth + distortion, y);
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Draw distorted sidewalks
        ctx.fillStyle = '#BDBDBD';
        
        // Left sidewalk
        ctx.beginPath();
        ctx.moveTo(leftEdge - sidewalkWidth, 0);
        for (let y = 0; y < canvas.height; y += 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05) * distortionAmplitude;
          ctx.lineTo(leftEdge + distortion, y);
        }
        for (let y = canvas.height; y > 0; y -= 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05) * distortionAmplitude * 0.7;
          ctx.lineTo(leftEdge - sidewalkWidth + distortion, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Right sidewalk
        ctx.beginPath();
        ctx.moveTo(leftEdge + roadWidth + Math.sin(0 * distortionFrequency + frameCount * 0.05 + 1) * distortionAmplitude, 0);
        for (let y = 0; y < canvas.height; y += 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05 + 1) * distortionAmplitude;
          ctx.lineTo(leftEdge + roadWidth + distortion, y);
        }
        for (let y = canvas.height; y > 0; y -= 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05 + 1.2) * distortionAmplitude;
          ctx.lineTo(leftEdge + roadWidth + sidewalkWidth + distortion, y);
        }
        ctx.lineTo(leftEdge + roadWidth + sidewalkWidth + Math.sin(0 * distortionFrequency + frameCount * 0.05 + 1.2) * distortionAmplitude, 0);
        ctx.closePath();
        ctx.fill();
        
        // Draw wavy road dividing lines
        ctx.fillStyle = '#FFFFFF';
        const lineSpacing = 80;
        const lineWidth = 10;
        const lineHeight = 40;
        
        for (let y = frameCount % lineSpacing; y < canvas.height; y += lineSpacing) {
          ctx.beginPath();
          const xCenter = canvas.width / 2;
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05 + 0.5) * distortionAmplitude * 0.7;
          ctx.fillRect(xCenter - lineWidth / 2 + distortion, y, lineWidth, lineHeight);
        }
        
        // Draw distorted road boundaries
        ctx.strokeStyle = '#FFC107'; // Mer synlig gul
        ctx.lineWidth = 4; // Tykkere linjer
        
        // Left boundary
        ctx.beginPath();
        for (let y = 0; y < canvas.height; y += 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05) * distortionAmplitude;
          if (y === 0) {
            ctx.moveTo(leftEdge + distortion, y);
          } else {
            ctx.lineTo(leftEdge + distortion, y);
          }
        }
        ctx.stroke();
        
        // Right boundary
        ctx.beginPath();
        for (let y = 0; y < canvas.height; y += 15) {
          const distortion = Math.sin(y * distortionFrequency + frameCount * 0.05 + 1) * distortionAmplitude;
          if (y === 0) {
            ctx.moveTo(leftEdge + roadWidth + distortion, y);
          } else {
            ctx.lineTo(leftEdge + roadWidth + distortion, y);
          }
        }
        ctx.stroke();
        
        ctx.restore();
      } else {
        // Normal road rendering (no distortion)
        // Tegn vei - nå fra topp til bunn
        ctx.fillStyle = '#9E9E9E'; // Enda lysere grå (var #757575)
        ctx.fillRect(leftEdge, 0, roadWidth, canvas.height);

        // Tegn fortau - nå fra topp til bunn
        ctx.fillStyle = '#E0E0E0'; // Lysere fortau (var #BDBDBD)
        ctx.fillRect(leftEdge - sidewalkWidth, 0, sidewalkWidth, canvas.height);
        ctx.fillRect(leftEdge + roadWidth, 0, sidewalkWidth, canvas.height);

        // Tegn veilinjer
        ctx.fillStyle = '#FFFFFF';
        const lineSpacing = 80;
        const lineWidth = 10;
        const lineHeight = 40;
        
        // Tegn linjer fra topp til bunn
        for (let y = frameCount % lineSpacing; y < canvas.height; y += lineSpacing) {
          ctx.fillRect(canvas.width / 2 - lineWidth / 2, y, lineWidth, lineHeight);
        }

        // Tegn veigrensene med gule linjer - mer synlige
        ctx.strokeStyle = '#FFC107'; // Mer synlig gul (var #FFEB3B)
        ctx.lineWidth = 4; // Tykkere linjer (var 3)
        
        ctx.beginPath();
        ctx.moveTo(leftEdge, 0);
        ctx.lineTo(leftEdge, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(leftEdge + roadWidth, 0);
        ctx.lineTo(leftEdge + roadWidth, canvas.height);
        ctx.stroke();
      }
    }

    // Tegn veien
    function drawRoad() {
        drawRoad2D();
    }

    // Last spillerbilde (scooter) med fallback
    const playerImage = new Image();
    playerImage.src = 'scooter.png';
    usePlayerImage = false; // Changed from 'let usePlayerImage = false' to avoid redeclaration
    playerImage.onload = () => {
      usePlayerImage = true;
      console.log('Spillerbilde lastet.');
    };
    playerImage.onerror = () => {
      usePlayerImage = false;
      console.warn('Kunne ikke laste spillerbilde – bruker fallback-tegning.');
    };

    // Tegn scooter ved opprinnelig posisjon (fallback)
    function drawScooterAtOrigin(width, height) {
      const scaleX = width / 40;
      const scaleY = height / 60;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.scale(scaleX, scaleY);
      ctx.translate(-20, -30);

      const personColor = '#1E88E5';
      const scooterColor = '#212121';
      const wheelColor = '#424242';
      const headColor = '#FFC107';
      const helmetColor = '#E53935';

      // Første hjul
      ctx.fillStyle = wheelColor;
      ctx.beginPath();
      ctx.arc(15, 50, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(15, 45);
      ctx.lineTo(15, 55);
      ctx.moveTo(10, 50);
      ctx.lineTo(20, 50);
      ctx.stroke();

      // Andre hjul
      ctx.fillStyle = wheelColor;
      ctx.beginPath();
      ctx.arc(30, 50, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(30, 45);
      ctx.lineTo(30, 55);
      ctx.moveTo(25, 50);
      ctx.lineTo(35, 50);
      ctx.stroke();

      // Scooter-base og håndtak
      ctx.fillStyle = '#111';
      ctx.fillRect(10, 46, 25, 3);
      ctx.fillStyle = scooterColor;
      ctx.fillRect(10, 45, 25, 3);
      ctx.fillStyle = '#111';
      ctx.fillRect(10, 30, 2, 15);
      ctx.fillStyle = scooterColor;
      ctx.fillRect(10, 30, 2, 15);
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(8, 28, 6, 2);

      // Personen
      ctx.fillStyle = '#0D47A1';
      ctx.fillRect(20, 21, 5, 25);
      ctx.fillStyle = personColor;
      ctx.fillRect(20, 20, 5, 25);
      ctx.fillStyle = helmetColor;
      ctx.beginPath();
      ctx.arc(22, 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(22, 15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = personColor;
      ctx.fillRect(15, 25, 15, 3);
      ctx.fillStyle = '#0D47A1';
      ctx.fillRect(17, 40, 3, 10);
      ctx.fillStyle = personColor;
      ctx.fillRect(17, 40, 3, 9);
      ctx.fillStyle = '#0D47A1';
      ctx.fillRect(25, 40, 3, 10);
      ctx.fillStyle = personColor;
      ctx.fillRect(25, 40, 3, 9);
      ctx.restore();
    }

    // Tegn scooter (brukes for spilleren)
    function drawScooter(x, y, width, height, tiltAngle = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tiltAngle);
      drawScooterAtOrigin(width, height);
      ctx.restore();
    }

    // Partikeleffekt ved kollisjon
    function createParticleEffect(x, y, color = '#FF5722', count = 30) {
      const particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          radius: Math.random() * 4 + 1,
          color: color,
          alpha: 1,
          life: Math.random() * 30 + 30
        });
      }
      function drawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.life--;
          p.alpha = p.life / 60;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          if (p.life <= 0) {
            particles.splice(i, 1);
          }
        }
        ctx.globalAlpha = 1;
        return particles.length > 0;
      }
      return drawParticles;
    }

    // Spillerobjektet
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 100,
      width: 50,
      height: 75,
      speed: 11, // Increased from 9 to 11 for faster response
      tilt: 0,
      targetTilt: 0,
      speedX: 0,
      speedY: 0,
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Apply drunk effect to drawing
        if (isDrunk) {
          const swayAmount = Math.sin(swayAngle) * (drunkLevel * 0.15);
          ctx.rotate(this.tilt + swayAmount);
        } else {
          ctx.rotate(this.tilt);
        }
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        if (usePlayerImage && playerImage.complete) {
          ctx.drawImage(playerImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
          drawScooterAtOrigin(this.width, this.height);
        }
        ctx.restore();
      },
      update(keys, speedFactor) {
        // Oppdater berulelsesrelaterte verdier
        if (isDrunk && drunkLevel > 0) {
          // Hyppigere oppdateringer for svingevinkel for å forbedre responsivitet
          swayAngle += 0.08 * speedFactor; // Økt fra 0.05 for skarpere bevegelse
          
          // Beregn kun synsforstyrrelser med jevne mellomrom
          if (frameCount % 5 === 0) {
            visionBlur = 3 + Math.sin(Math.floor(frameCount * 0.03)) * 2 * drunkLevel;
          }
          
          // Endrer tilfeldig retning når beruset, med høyere intensitet
          randomDirectionTimer--;
          if (randomDirectionTimer <= 0) {
            // Sterkere tilfeldige retningsendringer
            lastRandomDirection = (Math.random() - 0.5) * drunkLevel * 3; // Økt fra 2 til 3
            // Kortere tid mellom tilfeldige retningsendringer for mer uforutsigbar bevegelse
            randomDirectionTimer = Math.floor(Math.random() * 40) + 20; // Redusert fra 80+50 til 40+20
          }
        }
          
        // Raskere nedbremsing for mer responsiv kontroll
        this.speedX *= 0.85;
        this.speedY *= 0.85;
        
        // Normale kontroller, men påvirket av beruselsesnivå
        if ((keys.ArrowLeft || keys.a) && this.x > this.width / 2) {
          this.speedX -= 0.8 * speedFactor; // Økt fra 0.5 for raskere respons
          this.targetTilt = -0.2;
          
          // Beruselseseffekter gjør kontrollene mer uforutsigbare og responsive
          if (isDrunk && drunkLevel > 0) {
            // Mer responsive tilfeldige beregninger
            this.speedX += (Math.random() - 0.7) * drunkLevel * 1.5; // Økt fra 1.0 til 1.5
            this.targetTilt = -0.2 - Math.random() * drunkLevel * 0.3; // Økt fra 0.2 til 0.3
          }
        }
        if ((keys.ArrowRight || keys.d) && this.x < canvas.width - this.width / 2) {
          this.speedX += 0.8 * speedFactor; // Økt fra 0.5 for raskere respons
          this.targetTilt = 0.2;
          
          // Beruselseseffekter for høyrebevegelse
          if (isDrunk && drunkLevel > 0) {
            this.speedX += (Math.random() - 0.3) * drunkLevel * 1.5; // Økt fra 1.0 til 1.5
            this.targetTilt = 0.2 + Math.random() * drunkLevel * 0.3; // Økt fra 0.2 til 0.3
          }
        }
        if (!(keys.ArrowLeft || keys.a || keys.ArrowRight || keys.d)) {
          this.targetTilt = 0;
        }
        if ((keys.ArrowUp || keys.w) && this.y > this.height / 2) {
          this.speedY -= 0.8 * speedFactor; // Økt fra 0.5 for raskere respons
          
          // Beruselseseffekter for oppover-bevegelse
          if (isDrunk && drunkLevel > 0) {
            this.speedY += (Math.random() - 0.7) * drunkLevel * 1.3; // Økt fra 1.0 til 1.3
            this.speedX += (Math.random() - 0.5) * drunkLevel * 0.8; // Økt fra 0.5 til 0.8
          }
        }
        if ((keys.ArrowDown || keys.s) && this.y < canvas.height - this.height / 2) {
          this.speedY += 0.8 * speedFactor; // Økt fra 0.5 for raskere respons
          
          // Beruselseseffekter for nedover-bevegelse
          if (isDrunk && drunkLevel > 0) {
            this.speedY += (Math.random() - 0.3) * drunkLevel * 1.3; // Økt fra 1.0 til 1.3
            this.speedX += (Math.random() - 0.5) * drunkLevel * 0.8; // Økt fra 0.5 til 0.8
          }
        }
        
        // Bruk tilfeldig styring når beruset, selv uten input
        if (isDrunk && drunkLevel > 0) {
          // Bruk skarpere tilfeldig styring
          this.speedX += lastRandomDirection * 0.3 * drunkLevel; // Økt fra 0.2 til 0.3
          this.speedY += (Math.random() - 0.5) * drunkLevel * 0.5; // Økt fra 0.3 til 0.5
        }
        
        // Faster tilt response even when drunk
        this.tilt += (this.targetTilt - this.tilt) * (isDrunk && drunkLevel > 0.3 ? 0.1 : 0.15); // Increased from 0.05 to 0.1 when drunk
        this.speedX = Math.max(-this.speed, Math.min(this.speedX, this.speed));
        this.speedY = Math.max(-this.speed, Math.min(this.speedY, this.speed));
        this.x += this.speedX;
        this.y += this.speedY;
        this.x = Math.max(this.width / 2, Math.min(this.x, canvas.width - this.width / 2));
        this.y = Math.max(this.height / 2, Math.min(this.y, canvas.height - this.height / 2));
      }
    };

    // Hindringer og hindringstyper
    const obstacleTypes = [
      { name: 'car1', color: '#E53935', isCar: true },
      { name: 'car2', color: '#4CAF50', isCar: true },
      { name: 'car3', color: '#3F51B5', isCar: true },
      { name: 'cyclist', color: '#00BCD4', isCar: false },
      { name: 'pedestrian', color: '#FFC107', isCar: false }
    ];

    // Funksjon for å velge hindringstype basert på poeng
    function getObstacleType() {
      // Øk sannsynligheten for biler basert på poeng
      const carProbability = Math.min(0.8, 0.4 + (score / 50) * 0.4); // Starter på 40%, øker opp til 80%
      
      if (Math.random() < carProbability) {
        // Velg en tilfeldig bil
        const carTypes = obstacleTypes.filter(type => type.isCar);
        return carTypes[Math.floor(Math.random() * carTypes.length)];
      } else {
        // Velg en tilfeldig ikke-bil hindring
        const nonCarTypes = obstacleTypes.filter(type => !type.isCar);
        return nonCarTypes[Math.floor(Math.random() * nonCarTypes.length)];
      }
    }

    function createObstacle() {
      const minSize = 25;
      const maxSize = 70;
      const type = getObstacleType();
      // Use fixed size for cars, random size for other obstacles
      const size = type.isCar ? 60 : (Math.random() * (maxSize - minSize) + minSize);
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      const wobbleAmount = (type.name === 'cyclist' || type.name === 'pedestrian') ? 0.05 : 0;
      const bobAmount = (type.name === 'cyclist' || type.name === 'pedestrian') ? 0.5 : 0;
      let xPos, obstacleWidth, obstacleHeight, yPos;
      
      if (type.name === 'pedestrian') {
        const margin = 10;
        const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
        if (spawnSide === 'left') {
          xPos = Math.random() * (leftEdge - margin) + margin;
        } else {
          xPos = Math.random() * (canvas.width - (leftEdge + roadWidth) - margin) + (leftEdge + roadWidth + margin);
        }
        obstacleWidth = size * 0.5;
        obstacleHeight = size;
        yPos = -obstacleHeight;
      } else if (type.isCar) {
        const numLanes = 3;
        const laneWidth = roadWidth / numLanes;
        let chosenLane;
        let attempts = 0;
        const maxAttempts = 5;
        do {
          chosenLane = Math.floor(Math.random() * numLanes);
          attempts++;
        } while (isLaneOccupied(chosenLane, 0) && attempts < maxAttempts);
        xPos = leftEdge + (chosenLane * laneWidth) + (laneWidth / 2);
        if (xPos < leftEdge + 5) xPos = leftEdge + laneWidth / 2;
        if (xPos > leftEdge + roadWidth - 5) xPos = leftEdge + roadWidth - laneWidth / 2;
        obstacleWidth = size * 0.8;
        obstacleHeight = size * 2;
        yPos = -obstacleHeight;
        xPos += (Math.random() * 10 - 5);
      } else if (type.name === 'cyclist') {
        // For cyclists, determine a starting lane but aim toward player
        const numLanes = 3;
        const laneWidth = roadWidth / numLanes;
        let chosenLane;
        let attempts = 0;
        const maxAttempts = 5;
        do {
          chosenLane = Math.floor(Math.random() * numLanes);
          attempts++;
        } while (isLaneOccupied(chosenLane, 0) && attempts < maxAttempts);
        xPos = leftEdge + (chosenLane * laneWidth) + (laneWidth / 2);
        obstacleWidth = size * 0.8;
        obstacleHeight = size * 1.2;
        yPos = -obstacleHeight;
      } else {
        xPos = Math.random() * (roadWidth - size) + leftEdge + size / 2;
        if (xPos < leftEdge + 10) xPos = leftEdge + size / 2;
        if (xPos > leftEdge + roadWidth - 10) xPos = leftEdge + roadWidth - size / 2;
        obstacleWidth = size;
        obstacleHeight = size;
        yPos = -obstacleHeight;
      }
      const snowFactor = weather === 'snow' ? 0.6 : 1.0;
      const speedFactor = type.name === 'pedestrian'
        ? (Math.random() * 0.2 + 0.3)
        : (type.isCar ? (Math.random() * 0.4 + 0.7) : (Math.random() * 0.5 + 0.75));
      
      // Økende hastighet basert på poeng, opptil 50% raskere ved høy poengsum
      const scoreSpeedBonus = Math.min(0.5, score * 0.01); 
      const finalSpeed = obstacleSpeed * speedFactor * snowFactor * (1 + scoreSpeedBonus);

      return {
        x: xPos,
        y: yPos,
        width: obstacleWidth,
        height: obstacleHeight,
        color: type.color,
        type: type.name,
        isCar: type.isCar,
        speed: finalSpeed,
        animationPhase: Math.random() * Math.PI * 2,
        wobbleAmount: wobbleAmount,
        bobAmount: bobAmount,
        lane: (type.isCar || type.name === 'cyclist') ? Math.floor((xPos - leftEdge) / (roadWidth / 3)) : -1,
        steeringDirection: 0,
        steeringCooldown: 0,
        moveTowardPlayer: type.name === 'cyclist',
        inCollision: false,
        update(speedFactor = 1) {
          if (this.inCollision && this.type === 'pedestrian') return;

          this.y += this.speed * speedFactor;
          
          if (this.bobAmount > 0) {
            this.y += Math.sin(this.animationPhase) * this.bobAmount * speedFactor;
          }
          
          if (this.isCar || this.type === 'cyclist') {
            const roadWidth = canvas.width * 0.85;
            const leftEdge = (canvas.width - roadWidth) / 2;
            const rightEdge = leftEdge + roadWidth;
            const laneWidth = roadWidth / 3;
            
            if (this.type === 'cyclist' && this.moveTowardPlayer) {
              if (frameCount % 10 === 0 && !this.inCollision) {
                const playerX = player.x;
                const diffX = playerX - this.x;
                
                this.x += diffX * 0.03 * speedFactor;
                
                this.steeringDirection = diffX > 0 ? 0.5 : -0.5;
                
                const halfWidth = this.width / 2;
                const minX = leftEdge + halfWidth;
                const maxX = rightEdge - halfWidth;
                this.x = Math.max(minX, Math.min(this.x, maxX));
                
                this.lane = Math.floor((this.x - leftEdge) / laneWidth);
              }
            } else {
              if (this.steeringCooldown > 0) this.steeringCooldown -= speedFactor;
              if (this.steeringCooldown <= 0 && Math.random() < 0.01 * speedFactor) {
                const possibleDirections = [];
                if (this.lane > 0) possibleDirections.push(-1);
                if (this.lane < 2) possibleDirections.push(1);
                for (let i = 0; i < 3; i++) possibleDirections.push(0);
                if (possibleDirections.length > 0) {
                  this.steeringDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                  if (this.steeringDirection !== 0) this.steeringCooldown = 60;
                }
              }
              
              if (this.steeringDirection !== 0) {
                const targetLane = this.lane + this.steeringDirection;
                if (targetLane >= 0 && targetLane <= 2) {
                  const targetX = leftEdge + (targetLane * laneWidth) + (laneWidth / 2);
                  const steeringSpeed = this.type === 'cyclist' ? 0.03 : 0.05;
                  this.x += (targetX - this.x) * steeringSpeed * speedFactor;
                  if (Math.abs(this.x - targetX) < 5) {
                    this.lane = targetLane;
                    this.steeringDirection = 0;
                  }
                }
              }
              
              const halfWidth = this.width / 2;
              const minX = leftEdge + halfWidth;
              const maxX = rightEdge - halfWidth;
              this.x = Math.max(minX, Math.min(this.x, maxX));
            }
          }
          
          // Sjekk om bilen passerer nær spilleren og spill en lyd
          if (!this.hasPlayedPassingSound && this.isCar && 
              this.y > canvas.height * 0.3 && this.y < canvas.height * 0.7 && 
              gameRunning) {
            playSoundEffect('carPassing');
            this.hasPlayedPassingSound = true;
          }
          
          return this.y > canvas.height + this.height;
        },
        draw() {
          if (this.inCollision && this.type === 'pedestrian') return;
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.shadowBlur = 4;
          
          const wobble = Math.sin(this.animationPhase) * this.wobbleAmount;
          const bob = Math.sin(this.animationPhase * 2) * this.bobAmount;
          const progress = Math.min(1, Math.max(0, this.y / canvas.height));
          const scaleFactor = 0.5 + progress * 0.5;
          
          ctx.translate(this.x + wobble * 10, this.y + bob);

          // Draw the obstacle
          if (this.type === 'pedestrian') {
            const headRadius = this.width * 0.4;
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width * 0.15, -this.height * 0.3, this.width * 0.3, this.height * 0.5);
            ctx.fillStyle = '#FFCC80';
            ctx.beginPath();
            ctx.arc(0, -this.height * 0.4, headRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            const legOffset = Math.sin(this.animationPhase) * 3;
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.1, this.height * 0.2);
            ctx.lineTo(-this.width * 0.2, this.height * 0.4 + legOffset);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width * 0.1, this.height * 0.2);
            ctx.lineTo(this.width * 0.2, this.height * 0.4 - legOffset);
            ctx.stroke();
          } else if (this.isCar) {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.fillStyle = '#333';
            ctx.fillRect(-this.width * 0.4, -this.height * 0.4, this.width * 0.8, this.height * 0.3);
            ctx.fillStyle = '#FFEB3B';
            ctx.fillRect(-this.width * 0.4, -this.height * 0.45, this.width * 0.1, this.height * 0.05);
            ctx.fillRect(this.width * 0.3, -this.height * 0.45, this.width * 0.1, this.height * 0.05);
            ctx.fillStyle = '#F44336';
            ctx.fillRect(-this.width * 0.4, this.height * 0.4, this.width * 0.1, this.height * 0.05);
            ctx.fillRect(this.width * 0.3, this.height * 0.4, this.width * 0.1, this.height * 0.05);
          } else if (this.type === 'cyclist') {
            // Calculate lean based on steering or wobble
            const leanAngle = (this.steeringDirection * 0.1) + (Math.sin(this.animationPhase) * this.wobbleAmount * 0.5);
            
            ctx.save();
            ctx.rotate(leanAngle); // Apply lean effect
            
            // Draw the bicycle
            ctx.fillStyle = '#111';
            // Rear wheel
            ctx.beginPath();
            ctx.arc(-this.width * 0.3, this.height * 0.2, this.width * 0.15, 0, Math.PI * 2);
            ctx.fill();
            // Front wheel
            ctx.beginPath();
            ctx.arc(this.width * 0.3, this.height * 0.2, this.width * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
            // Bicycle frame
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.3, this.height * 0.2); // Rear wheel center
            ctx.lineTo(0, -this.height * 0.1); // Middle frame joint
            ctx.lineTo(this.width * 0.3, this.height * 0.2); // Front wheel center
            ctx.stroke();
            
            // Seat post and handlebar
            ctx.beginPath();
            ctx.moveTo(0, -this.height * 0.1); // Middle frame joint
            ctx.lineTo(0, -this.height * 0.25); // Seat position
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width * 0.15, -this.height * 0.05); // Handlebar bottom
            ctx.lineTo(this.width * 0.15, -this.height * 0.25); // Handlebar top
            ctx.stroke();
            
            // Cyclist body
            // Head
            ctx.fillStyle = '#FFCC80'; // Skin tone
            ctx.beginPath();
            ctx.arc(0, -this.height * 0.35, this.width * 0.12, 0, Math.PI * 2);
            ctx.fill();
            
            // Helmet
            ctx.fillStyle = '#E53935'; // Red helmet
            ctx.beginPath();
            ctx.arc(0, -this.height * 0.35, this.width * 0.14, Math.PI, 0);
            ctx.fill();
            
            // Torso
            ctx.fillStyle = '#2196F3'; // Blue jersey
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.1, -this.height * 0.25); // Left shoulder
            ctx.lineTo(this.width * 0.15, -this.height * 0.25); // Right shoulder
            ctx.lineTo(this.width * 0.15, -this.height * 0.05); // Right hip
            ctx.lineTo(0, -this.height * 0.1); // Bottom of torso
            ctx.lineTo(-this.width * 0.1, -this.height * 0.25); // Back to left shoulder
            ctx.fill();
            
            // Arms
            ctx.strokeStyle = '#1976D2'; // Darker blue for arms
            ctx.lineWidth = 4;
            // Left arm to handlebar
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.05, -this.height * 0.25); // Left shoulder
            ctx.lineTo(this.width * 0.15, -this.height * 0.2); // Hand on handlebar
            ctx.stroke();
            
            // Legs - animated with pedaling motion
            ctx.strokeStyle = '#424242'; // Dark gray for legs
            ctx.lineWidth = 4;
            const pedalAngle = this.animationPhase * 2;
            // First leg
            ctx.beginPath();
            ctx.moveTo(0, -this.height * 0.15); // Hip joint
            ctx.lineTo(Math.cos(pedalAngle) * this.width * 0.15, 
                      this.height * 0.1 + Math.sin(pedalAngle) * this.width * 0.1); // Pedal position
            ctx.stroke();
            
            // Second leg, opposite phase
            ctx.beginPath();
            ctx.moveTo(0, -this.height * 0.15); // Hip joint
            ctx.lineTo(Math.cos(pedalAngle + Math.PI) * this.width * 0.15, 
                      this.height * 0.1 + Math.sin(pedalAngle + Math.PI) * this.width * 0.1); // Opposite pedal
            ctx.stroke();
            
            ctx.restore(); // Restore after applying lean
          } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
          }
          
          ctx.restore();
          this.animationPhase += 0.05;
        },
        draw2D() {
          if (this.type === 'pedestrian') {
            const headRadius = this.width * 0.4;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width * 0.15, this.y - this.height * 0.3, this.width * 0.3, this.height * 0.5);
            ctx.fillStyle = '#FFCC80';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height * 0.4, headRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            const legOffset = Math.sin(this.animationPhase) * 3;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width * 0.1, this.y + this.height * 0.2);
            ctx.lineTo(this.x - this.width * 0.2, this.y + this.height * 0.4 + legOffset);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x + this.width * 0.1, this.y + this.height * 0.2);
            ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.4 - legOffset);
            ctx.stroke();
          } else if (this.isCar) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - this.width * 0.4, this.y - this.height * 0.4, this.width * 0.8, this.height * 0.3);
            ctx.fillStyle = '#FFEB3B';
            ctx.fillRect(this.x - this.width * 0.4, this.y - this.height * 0.45, this.width * 0.1, this.height * 0.05);
            ctx.fillRect(this.x + this.width * 0.3, this.y - this.height * 0.45, this.width * 0.1, this.height * 0.05);
            ctx.fillStyle = '#F44336';
            ctx.fillRect(this.x - this.width * 0.4, this.y + this.height * 0.4, this.width * 0.1, this.height * 0.05);
            ctx.fillRect(this.x + this.width * 0.3, this.y + this.height * 0.4, this.width * 0.1, this.height * 0.05);
          } else if (this.type === 'cyclist') {
            // Calculate lean based on steering or wobble
            const leanAngle = (this.steeringDirection * 0.1) + (Math.sin(this.animationPhase) * this.wobbleAmount * 0.5);
            
            ctx.save();
            ctx.rotate(leanAngle); // Apply lean effect
            
            // Draw the bicycle
            ctx.fillStyle = '#111';
            // Rear wheel
            ctx.beginPath();
            ctx.arc(-this.width * 0.3, this.height * 0.2, this.width * 0.15, 0, Math.PI * 2);
            ctx.fill();
            // Front wheel
            ctx.beginPath();
            ctx.arc(this.width * 0.3, this.height * 0.2, this.width * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
            // Bicycle frame
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.3, this.height * 0.2); // Rear wheel center
            ctx.lineTo(0, -this.height * 0.1); // Middle frame joint
            ctx.lineTo(this.width * 0.3, this.height * 0.2); // Front wheel center
            ctx.stroke();
            
            // Seat post and handlebar
            ctx.beginPath();
            ctx.moveTo(0, -this.height * 0.1); // Middle frame joint
            ctx.lineTo(0, -this.height * 0.25); // Seat position
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width * 0.15, -this.height * 0.05); // Handlebar bottom
            ctx.lineTo(this.width * 0.15, -this.height * 0.25); // Handlebar top
            ctx.stroke();
            
            // Cyclist body
            // Head
            ctx.fillStyle = '#FFCC80'; // Skin tone
            ctx.beginPath();
            ctx.arc(0, -this.height * 0.35, this.width * 0.12, 0, Math.PI * 2);
            ctx.fill();
            
            // Helmet
            ctx.fillStyle = '#E53935'; // Red helmet
            ctx.beginPath();
            ctx.arc(0, -this.height * 0.35, this.width * 0.14, Math.PI, 0);
            ctx.fill();
            
            // Torso
            ctx.fillStyle = '#2196F3'; // Blue jersey
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.1, -this.height * 0.25); // Left shoulder
            ctx.lineTo(this.width * 0.15, -this.height * 0.25); // Right shoulder
            ctx.lineTo(this.width * 0.15, -this.height * 0.05); // Right hip
            ctx.lineTo(0, -this.height * 0.1); // Bottom of torso
            ctx.lineTo(-this.width * 0.1, -this.height * 0.25); // Back to left shoulder
            ctx.fill();
            
            // Arms
            ctx.strokeStyle = '#1976D2'; // Darker blue for arms
            ctx.lineWidth = 4;
            // Left arm to handlebar
            ctx.beginPath();
            ctx.moveTo(-this.width * 0.05, -this.height * 0.25); // Left shoulder
            ctx.lineTo(this.width * 0.15, -this.height * 0.2); // Hand on handlebar
            ctx.stroke();
            
            // Legs - animated with pedaling motion
            ctx.strokeStyle = '#424242'; // Dark gray for legs
            ctx.lineWidth = 4;
            const pedalAngle = this.animationPhase * 2;
            // First leg
            ctx.beginPath();
            ctx.moveTo(0, -this.height * 0.15); // Hip joint
            ctx.lineTo(Math.cos(pedalAngle) * this.width * 0.15, 
                      this.height * 0.1 + Math.sin(pedalAngle) * this.width * 0.1); // Pedal position
            ctx.stroke();
            
            // Second leg, opposite phase
            ctx.beginPath();
            ctx.moveTo(0, -this.height * 0.15); // Hip joint
            ctx.lineTo(Math.cos(pedalAngle + Math.PI) * this.width * 0.15, 
                      this.height * 0.1 + Math.sin(pedalAngle + Math.PI) * this.width * 0.1); // Opposite pedal
            ctx.stroke();
            
            ctx.restore(); // Restore after applying lean
          } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
          }
          
          ctx.restore();
          this.animationPhase += 0.05;
        }
      };
    }

    function isLaneOccupied(lane, yPosition) {
      const numLanes = 3;
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      const laneWidth = roadWidth / numLanes;
      const laneLeftEdge = leftEdge + (lane * laneWidth);
      const laneRightEdge = laneLeftEdge + laneWidth;
      const yBuffer = 100;
      return obstacles.some(obs => {
        // Check for both cars and cyclists
        if (!obs.isCar && obs.type !== 'cyclist') return false;
        const obsLeftEdge = obs.x - obs.width / 2;
        const obsRightEdge = obs.x + obs.width / 2;
        const horizontalOverlap = (obsLeftEdge < laneRightEdge && obsRightEdge > laneLeftEdge);
        const verticalProximity = (obs.y > yPosition - yBuffer && obs.y < yPosition + yBuffer);
        return horizontalOverlap && verticalProximity;
      });
    }

    function shadeColor(color, percent) {
      if (typeof color !== 'string' || !color.startsWith('#') || color.length !== 7) {
        console.warn('Invalid color format in shadeColor:', color);
        return percent < 0 ? '#000000' : '#FFFFFF';
      }
      try {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);
        if (isNaN(R) || isNaN(G) || isNaN(B)) {
          console.warn('Invalid color components in shadeColor:', color);
          return percent < 0 ? '#000000' : '#FFFFFF';
        }
        R = Math.max(0, Math.min(255, R + percent));
        G = Math.max(0, Math.min(255, G + percent));
        B = Math.max(0, Math.min(255, B + percent));
        const RR = Math.floor(R).toString(16).padStart(2, '0');
        const GG = Math.floor(G).toString(16).padStart(2, '0');
        const BB = Math.floor(B).toString(16).padStart(2, '0');
        return `#${RR}${GG}${BB}`;
      } catch (e) {
        console.error('Error in shadeColor:', e);
        return percent < 0 ? '#000000' : '#FFFFFF';
      }
    }

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
      ctx.fill();
    }

    const safetyTips = [
      "Husk å bruke hjelm når du kjører sparkesykkel!",
      "Aldri kjør sparkesykkel med hodetelefoner på!",
      "Hold alltid god avstand til trafikken!",
      "Følg alltid trafikkreglene når du kjører!",
      "Sjekk bremser og hjul før du starter turen!",
      "Ikke kjør sparkesykkel i beruset tilstand!",
      "Hold alltid begge hender på styret!",
      "Kjør bare i dagslys og god sikt!",
      "Unngå å kjøre sparkesykkel når det er vått veigrep!",
      "En sparkesykkel er for én person - ikke gi skyss!"
    ];

    function checkCollision(player, obstacle) {
      // Skip collision check if player has shield
      if (activePowerUps.some(p => p.type === 'shield')) {
        return false;
      }
      
      // Calculate player hitbox (slightly smaller than visual size)
      const playerHitbox = {
        x: player.x - player.width * 0.3,
        y: player.y - player.height * 0.4,
        width: player.width * 0.6,
        height: player.height * 0.8
      };
      
      // Calculate obstacle hitbox (varies by type)
      let obstacleHitbox;
      
      if (obstacle.type === 'pedestrian') {
        obstacleHitbox = {
          x: obstacle.x - obstacle.width * 0.2,
          y: obstacle.y - obstacle.height * 0.4,
          width: obstacle.width * 0.4,
          height: obstacle.height * 0.9
        };
      } else if (obstacle.isCar) {
        obstacleHitbox = {
          x: obstacle.x - obstacle.width * 0.4,
          y: obstacle.y - obstacle.height * 0.45,
          width: obstacle.width * 0.8,
          height: obstacle.height * 0.9
        };
      } else if (obstacle.type === 'cyclist') {
        obstacleHitbox = {
          x: obstacle.x - obstacle.width * 0.35,
          y: obstacle.y - obstacle.height * 0.45,
          width: obstacle.width * 0.7,
          height: obstacle.height * 0.9
        };
      } else {
        obstacleHitbox = {
          x: obstacle.x - obstacle.width * 0.4,
          y: obstacle.y - obstacle.height * 0.4,
          width: obstacle.width * 0.8,
          height: obstacle.height * 0.8
        };
      }

      // Check if rectangles overlap (AABB collision)
      const collision = playerHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
             playerHitbox.x + playerHitbox.width > obstacleHitbox.x &&
             playerHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
             playerHitbox.y + playerHitbox.height > obstacleHitbox.y;
      
      if (collision) {
        // Play appropriate crash sound
        playSoundEffect('collision');
        
        // Play specific crash sound based on obstacle type
        if (obstacle.isCar) {
          playSoundEffect('carCrash');
        } else if (obstacle.type === 'cyclist') {
          playSoundEffect('cyclistCrash');
        } else if (obstacle.type === 'pedestrian') {
          playSoundEffect('pedestrianCrash');
        }
      }
      
      return collision;
    }

    function clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

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
      // Ikke fang tastetrykk hvis et input-felt har fokus
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return; // La nettleseren håndtere tastetrykket
      }
      
      // Sjekk også for tekstområder som ikke er playerName
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA' && 
          document.activeElement.id !== 'playerName') {
        return; // La nettleseren håndtere tastetrykket
      }
      
      // Spesialtilfelle: Hvis vi er i playerName tekstfelt, tillat WASD for spilling
      // men tillat fortsatt skriving av bokstavene w, a, s, d
      if (document.activeElement && document.activeElement.id === 'playerName') {
        // La nettleseren fortsette å håndtere inputen for tekstfeltet
        return;
      }
      
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (keys.hasOwnProperty(key)) {
        keys[key] = true;
        e.preventDefault();
      }
      
      // Toggle debug mode with 'D' key
      if (key === 'd' && e.ctrlKey) {
        debugMode = !debugMode;
        console.log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      // Ikke fang tastetrykk hvis et input-felt har fokus
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return; // La nettleseren håndtere tastetrykket
      }
      
      // Sjekk også for tekstområder som ikke er playerName
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA' && 
          document.activeElement.id !== 'playerName') {
        return; // La nettleseren håndtere tastetrykket
      }
      
      // Spesialtilfelle: Hvis vi er i playerName tekstfelt, tillat WASD for spilling
      // men tillat fortsatt skriving av bokstavene w, a, s, d
      if (document.activeElement && document.activeElement.id === 'playerName') {
        // La nettleseren fortsette å håndtere inputen for tekstfeltet
        return;
      }
      
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (keys.hasOwnProperty(key)) {
        keys[key] = false;
        e.preventDefault();
      }
    });

    // Utility function to draw hitboxes for debugging
    function drawHitbox(hitbox, color = 'rgba(255, 0, 0, 0.5)') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      ctx.restore();
    }

    // Function to display temporary messages (moved outside gameLoop)
    function showMessage(text, duration) {
      const messageElem = document.createElement('div');
      messageElem.classList.add('game-message');
      messageElem.textContent = text;
      messageElem.style.position = 'absolute';
      messageElem.style.top = '20%';
      messageElem.style.left = '50%';
      messageElem.style.transform = 'translate(-50%, -50%)';
      messageElem.style.color = '#ff5722';
      messageElem.style.fontWeight = 'bold';
      messageElem.style.fontSize = '20px';
      messageElem.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
      messageElem.style.zIndex = '100';
      
      document.body.appendChild(messageElem);
      
      // Fade out and remove
      setTimeout(() => {
        messageElem.style.transition = 'opacity 0.5s';
        messageElem.style.opacity = '0';
        setTimeout(() => messageElem.remove(), 500);
      }, duration * 16); // Convert frames to milliseconds (approx)
    }
    
    // Definere variabler for kamera og distortion-effekter
    let cameraShake = 0;
    let roadDistortion = 0;
    let glitchIntensity = 0;
    let lastGlitchTime = 0;
    let isGlitching = false;
    let glitchOffsetX = 0;
    let glitchOffsetY = 0;
    let lastGreenFlashTime = 0; // For å spore når siste grønne flash begynte
    let isGreenFlashing = false; // For å indikere om grønn flash er aktiv

    // Add screen "tug" and zoom effect that gets stronger with drunk level
    function applyDrunkScreenEffects() {
      // Don't apply effects if game is not running, player is not drunk, or drunk level is too low
      if (!gameRunning || !isDrunk || drunkLevel <= 0.1) {
        // Make sure we clean up any existing effects
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        return false;
      }
      
      // Calculate zoom effect based on drunk level
      const zoomFactor = 1 + (Math.sin(frameCount * 0.02) * 0.05 * drunkLevel);
      const zoomOffsetX = (canvas.width / 2) * (1 - zoomFactor);
      const zoomOffsetY = (canvas.height / 2) * (1 - zoomFactor);
      
      // Increase zoom effect periodically for a "pulse" effect
      if (drunkLevel > 0.3 && Math.random() < 0.01 * drunkLevel) {
        // Apply stronger zoom effect
        ctx.save();
        const pulseZoom = 1 + (0.1 * drunkLevel);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(pulseZoom, pulseZoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        
        // Draw the road and objects
        drawRoad();
        
        // Semi-transparent overlay - fjernet
        // ctx.fillStyle = `rgba(255, 150, 50, ${0.1 * drunkLevel})`;
        // ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.restore();
        return true; // Skip normal rendering
      }
      
      // Apply zoom and translation for drunk effect
      if (drunkLevel > 0.2) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(-canvas.width / 2 + Math.sin(frameCount * 0.01) * 5 * drunkLevel, 
                      -canvas.height / 2 + Math.sin(frameCount * 0.02) * 3 * drunkLevel);
        
        // Apply more intense effects at higher drunk levels
        if (drunkLevel > 0.6 && frameCount % 90 < 2) {
          // Strong pulsing glitch effect
          ctx.scale(1 + Math.random() * 0.1, 1 + Math.random() * 0.05);
          
          // RGB shift effect
          if (frameCount % 90 === 0) {
            ctx.drawImage(canvas, Math.random() * 5 * drunkLevel, 0);
            ctx.globalCompositeOperation = 'lighten';
            ctx.drawImage(canvas, -Math.random() * 8 * drunkLevel, 0);
          }
        }
        
        return false; // Continue with normal rendering, just keep the context transformation
      }
      
      return false;
    }

    // *** HOVED-SPILLØKKE ***
    // Hovedfunksjonen som kjører spillet, oppdaterer alle objekter,
    // tegner alle elementer og håndterer kollisjoner
    let lastTimestamp = 0;
    const targetFPS = 60;
    const timeStep = 1000 / targetFPS;

    function gameLoop(timestamp) {
      if (!gameRunning) return;
      
      // Beregn tidsdifferanse for jevn bevegelse uavhengig av skjerm
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Juster bevegelseshastighet basert på faktisk oppdateringsrate
      const speedFactor = Math.min(deltaTime / timeStep, 2.0);
      
      // Make sure we always start with a clean state
      if (frameCount === 0) {
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // Reset transforms at the beginning of each frame
      ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
      clearCanvas();
      
      if (motionBlurEnabled && (Math.abs(player.speedX) > 3 || Math.abs(player.speedY) > 3)) {
        applyMotionBlur();
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // Gradually increase drunk level based on score milestones
      if (isDrunk && drunkLevel < 0.8) {
        // Check if we've passed a new score milestone (every 5 points)
        const currentScoreThreshold = Math.floor(score / 5) * 5;
        
        // If we've reached a new score threshold (5, 10, 15, etc.)
        if (currentScoreThreshold > lastScoreThreshold && score >= 5) {
          // Update the last threshold we passed
          lastScoreThreshold = currentScoreThreshold;
          
          // Increase drunk level
          const increment = 0.1;
          const oldLevel = drunkLevel;
          drunkLevel += increment;
          
          // Cap at maximum drunk level
          drunkLevel = Math.min(0.8, drunkLevel);
          
          // Play drunk level up sound
          playSoundEffect('drunkLevel');
          
          // Show message about increasing drunkenness
          if (drunkLevel > 0.1) {
            showMessage("Beruselsen øker! 🍺", 60);
            
            // Add dramatic effect when drunk level increases
            // Flash effect
            const flashOverlay = document.createElement('div');
            flashOverlay.style.position = 'absolute';
            flashOverlay.style.top = '0';
            flashOverlay.style.left = '0';
            flashOverlay.style.width = '100%';
            flashOverlay.style.height = '100%';
            flashOverlay.style.backgroundColor = 'rgba(255, 200, 100, 0.3)';
            flashOverlay.style.pointerEvents = 'none';
            flashOverlay.style.zIndex = '1000';
            flashOverlay.style.transition = 'opacity 0.5s';
            
            document.body.appendChild(flashOverlay);
            
            setTimeout(() => {
              flashOverlay.style.opacity = '0';
              setTimeout(() => flashOverlay.remove(), 500);
            }, 300);
            
            // Add a camera shake effect
            cameraShake = 5 * drunkLevel;
          }
          
          console.log(`Drunk level increased to ${drunkLevel.toFixed(2)} at score ${score}`);
        }
      }
      
      // Apply drunk vision effects - simplified for better performance
      if (isDrunk && drunkLevel > 0.1) {
        // Apply screen zoom and distortion effects
        const skipNormalRendering = applyDrunkScreenEffects();
        if (skipNormalRendering) {
          // If we already rendered, just apply the rest of the game logic
          // but skip re-rendering the background
          player.update(keys, speedFactor);
          player.draw();
          
          // Make sure we restore the canvas state before continuing
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';
          ctx.filter = 'none';
          ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
          
          // Update score
          animationId = requestAnimationFrame(gameLoop);
          return;
        }
        
        // Grønn flash-effekt hver 7 sekunder (420 frames ved 60 fps)
        // Flash varer i 2 sekunder (120 frames)
        const flashDuration = 120; // 2 sekunder ved 60 fps
        const flashInterval = 420; // 7 sekunder totalt (2 sek flash + 5 sek pause)
        
        if (!isGreenFlashing && frameCount - lastGreenFlashTime > flashInterval) {
          // Start en ny flash
          isGreenFlashing = true;
          lastGreenFlashTime = frameCount;
        } else if (isGreenFlashing && frameCount - lastGreenFlashTime > flashDuration) {
          // Avslutt flash etter 2 sekunder
          isGreenFlashing = false;
        }
        
        // Hvis flash er aktiv, tegn en lysere grønn overlay med høyere synlighet
        if (isGreenFlashing && drunkLevel > 0.3) {
          ctx.save();
          // Lysere grønn farge men mer gjennomsiktig for bedre spillkontroll
          ctx.fillStyle = 'rgba(180, 255, 180, 0.18)'; // Lysere grønn med balansert opacity
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        
        // Only apply visual effects when drunk level is significant
        // No blur filter - it's too performance intensive
        // ctx.filter = `blur(${Math.min(2, visionBlur * drunkLevel)}px)`;
        
        // Fjernet overlayet helt
        // ctx.fillStyle = `rgba(255, 230, 150, ${drunkLevel * 0.01})`;
        // ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Erstatt med mer synlige men kortvarige glitch/flash effekter
        if (Math.random() < drunkLevel * 0.15) {
          ctx.save();
          // Tilfeldig fargevalg for glitch med høyere synlighet men mer gjennomsiktig
          const colors = ['rgba(255, 130, 130, 0.18)', 'rgba(130, 130, 255, 0.18)']; // Lysere men mer gjennomsiktig
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          
          // Tegn bare en del av skjermen for å ikke blokkere hele visningen
          const glitchHeight = canvas.height * 0.2;
          const glitchY = Math.random() * (canvas.height - glitchHeight);
          ctx.fillRect(0, glitchY, canvas.width, glitchHeight);
          ctx.restore();
        }
        
        // Double vision with improved visibility - only for higher drunk levels
        if (drunkLevel > 0.4) {
          const doubleVisionOffset = Math.sin(Math.floor(frameCount * 0.02)) * drunkLevel * 1.5;
          ctx.save();
          // Balansert alpha for dobbeltvisjon - synlig men ikke for forstyrrende
          ctx.globalAlpha = 0.12 * drunkLevel; // Justert til en mer balansert verdi
          ctx.translate(doubleVisionOffset, 0);
        }
        
        // Apply camera shake effect based on drunk level
        if (cameraShakeEnabled && drunkLevel > 0.2) {
          // Calculate shake intensity based on drunk level
          const baseShakeIntensity = drunkLevel * 2.5;
          
          // Add random shake offset
          const shakeX = (Math.random() - 0.5) * baseShakeIntensity;
          const shakeY = (Math.random() - 0.5) * baseShakeIntensity;
          
          // Apply the shake to the canvas
          ctx.translate(shakeX, shakeY);
          
          // Gradually reduce camera shake intensity
          cameraShake *= 0.95;
        }
        
        // Random glitch effects at higher drunk levels
        if (drunkLevel > 0.5 && Math.random() < drunkLevel * 0.03) {
          isGlitching = true;
          lastGlitchTime = frameCount;
          glitchIntensity = Math.random() * drunkLevel * 2;
          glitchOffsetX = (Math.random() - 0.5) * glitchIntensity * 20;
          glitchOffsetY = (Math.random() - 0.5) * glitchIntensity * 10;
        }
        
        // Apply active glitch effect with improved visibility
        if (isGlitching && frameCount - lastGlitchTime < 5) {
          ctx.save();
          ctx.globalCompositeOperation = 'difference';
          ctx.drawImage(canvas, glitchOffsetX, glitchOffsetY);
          ctx.restore();
          
          // Øk hyppigheten og synligheten av fargekanal-forskyvning
          if (Math.random() < 0.7) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255, 80, 80, 0.15)'; // Lysere rødfarge men mer gjennomsiktig
            ctx.fillRect(glitchOffsetX, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        } else {
          isGlitching = false;
        }
        
        // Øk hyppigheten av glitch-effekter
        if (drunkLevel > 0.3 && Math.random() < drunkLevel * 0.1) {
          isGlitching = true;
          lastGlitchTime = frameCount;
          glitchIntensity = Math.random() * drunkLevel * 3;
          glitchOffsetX = (Math.random() - 0.5) * glitchIntensity * 30;
          glitchOffsetY = (Math.random() - 0.5) * glitchIntensity * 15;
        }
      }
      
      // Apply road distortion based on drunk level
      roadDistortion = drunkLevel * 40;
      
      drawRoad();
      
      // Make the screen edges wavy when drunk - intensity based on drunk level
      // Only for higher drunk levels and reduced complexity
      if (false) { // Deaktiverer bølgende linjer som kan blokkere sikten
        ctx.save();
        ctx.strokeStyle = `rgba(255, 220, 150, ${drunkLevel * 0.15})`;
        ctx.lineWidth = 10 * drunkLevel;
        ctx.beginPath();
        // Reduced number of points for the wave
        for (let i = 0; i < canvas.width; i += 40) { // Increased step size from 40 to 60
          const waveHeight = Math.sin(i * 0.05 + Math.floor(frameCount * 0.03)) * 8 * drunkLevel;
          if (i === 0) {
            ctx.moveTo(i, waveHeight);
          } else {
            ctx.lineTo(i, waveHeight);
          }
        }
        ctx.stroke();
        ctx.restore();
      }
      
      // Draw wheel tracks (before the player) - limited for performance
      if (frameCount % 4 === 0 && Math.abs(player.speedX) > 4) { // Only draw every 4th frame when moving fast
        drawWheelTracks();
      }
      
      frameCount++;
      if (frameCount % obstacleFrequency === 0) {
        obstacles.push(createObstacle());
        if (frameCount % 500 === 0) {
          obstacleSpeed += 0.5; // Increased speed increment
          if (obstacleFrequency > 30) obstacleFrequency -= 5; // Spawn obstacles faster
        }
      }
      
      // Legg til ekstra hindringer basert på poeng
      const extraObstacleChance = Math.min(0.05, score * 0.0005); // Økende sannsynlighet med poeng
      if (Math.random() < extraObstacleChance) {
        // Legg til en ekstra bil hvis det er få hindringer på skjermen
        if (obstacles.length < 10 + Math.floor(score/20)) {
          const extraObstacle = createObstacle();
          // Sørg for at ekstra hindringer er litt mer spredt på veien
          extraObstacle.y = -extraObstacle.height - Math.random() * 100;
          obstacles.push(extraObstacle);
        }
      }
      
      // Reduser hindringfrekvensen (spawn raskere) basert på poeng
      const newFrequency = Math.max(30, 100 - Math.floor(score/5) * 2);
      if (obstacleFrequency > newFrequency) {
        obstacleFrequency = newFrequency;
      }
      
      if (frameCount % 200 === 0 && obstacles.length < 8) {
        obstacles.push(createObstacle());
      }
      if (frameCount % 200 === 0) {
        collectibles.push(createCollectible());
      }
      player.update(keys, speedFactor);
      player.draw();
      
      // Draw player hitbox in debug mode
      if (debugMode) {
        const playerHitbox = {
          x: player.x - player.width * 0.3,
          y: player.y - player.height * 0.4,
          width: player.width * 0.6,
          height: player.height * 0.8
        };
        drawHitbox(playerHitbox, 'rgba(0, 255, 0, 0.5)');
      }
      
      if (Math.abs(player.speedX) > 2 || Math.abs(player.speedY) > 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        const speedFactor = Math.max(Math.abs(player.speedX), Math.abs(player.speedY));
        const lineCount = Math.floor(speedFactor * 2);
        for (let i = 0; i < lineCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const length = 10 + speedFactor * 3;
          const startX = player.x + Math.cos(angle) * 20;
          const startY = player.y + Math.sin(angle) * 20;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(
            startX - player.speedX * 3 * Math.random(),
            startY - player.speedY * 3 * Math.random()
          );
          ctx.stroke();
        }
      }
      
      // Process obstacles with optimized collision detection
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const isOffScreen = obstacle.update(speedFactor);
        if (isOffScreen) {
          obstacles.splice(i, 1);
          
          // Add to score when obstacle is successfully avoided
          if (!obstacle.crashed) {
            score += 1;
          scoreDisplay.textContent = score;
          
          // Vis melding ved poengmilepæler
          if (score % 20 === 0) {
            showMessage(`Vanskelighetsgrad øker! ${score} poeng`, 90);
            // Kort kameraskjelv som indikerer økt vanskelighetsgrad
            if (cameraShakeEnabled) {
              cameraShake = 3;
              }
            }
          }
        } else {
          obstacle.draw();
          
          // Draw obstacle hitbox in debug mode
          if (debugMode) {
            let obstacleHitbox;
            if (obstacle.type === 'pedestrian') {
              obstacleHitbox = {
                x: obstacle.x - obstacle.width * 0.2,
                y: obstacle.y - obstacle.height * 0.4,
                width: obstacle.width * 0.4,
                height: obstacle.height * 0.9
              };
            } else if (obstacle.isCar) {
              obstacleHitbox = {
                x: obstacle.x - obstacle.width * 0.4,
                y: obstacle.y - obstacle.height * 0.45,
                width: obstacle.width * 0.8,
                height: obstacle.height * 0.9
              };
            } else if (obstacle.type === 'cyclist') {
              obstacleHitbox = {
                x: obstacle.x - obstacle.width * 0.35,
                y: obstacle.y - obstacle.height * 0.45,
                width: obstacle.width * 0.7,
                height: obstacle.height * 0.9
              };
            } else {
              obstacleHitbox = {
                x: obstacle.x - obstacle.width * 0.4,
                y: obstacle.y - obstacle.height * 0.4,
                width: obstacle.width * 0.8,
                height: obstacle.height * 0.8
              };
            }
            drawHitbox(obstacleHitbox, 'rgba(255, 0, 0, 0.5)');
          }
          
          if (checkCollision(player, obstacle)) {
            const collisionEffect = createParticleEffect(player.x, player.y);
            runCollisionAnimation(collisionEffect, obstacle);
            return;
          }
        }
      }
      
      // Process collectibles
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const collectible = collectibles[i];
        const isOffScreen = collectible.update(speedFactor);
        if (isOffScreen) {
          collectibles.splice(i, 1);
        } else {
          collectible.draw();
          
          // Draw collectible hitbox in debug mode
          if (debugMode) {
            const collectibleHitbox = {
              x: collectible.x - collectible.width * 0.6,
              y: collectible.y - collectible.width * 0.6,
              width: collectible.width * 1.2,
              height: collectible.width * 1.2
            };
            drawHitbox(collectibleHitbox, 'rgba(0, 255, 255, 0.5)');
          }
          
          if (checkCollectibleCollision(player, collectible)) {
            collectPowerUp(collectible);
            collectibles.splice(i, 1);
          }
        }
      }
      
      applyPowerUps();
      
      // Process and draw power-up effects
      for (let i = powerUpEffects.length - 1; i >= 0; i--) {
        const effect = powerUpEffects[i];
        const active = effect.update(speedFactor);
        if (active) {
          effect.draw();
        } else {
          powerUpEffects.splice(i, 1);
        }
      }
      
      // Create continuous effects for active power-ups (at a lower frequency)
      if (frameCount % 30 === 0) { // Every half second
        for (const powerUp of activePowerUps) {
          // Don't create too many effects
          if (powerUpEffects.length < 10) {
            // Create a smaller continuous effect
            const continuousEffect = createPowerUpEffect(powerUp.type, powerUp.color, true);
            powerUpEffects.push(continuousEffect);
          }
        }
      }
      
      // Reset drunk vision effects
      if (isDrunk && drunkLevel > 0.1) {
        ctx.restore();
        ctx.filter = 'none';
      
        // Draw drunk indicator with different messages based on level
        ctx.save();
        ctx.fillStyle = 'rgba(255, 100, 50, 0.7)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        
        // Different messages based on drunk level
        let drunkMessage = '';
        if (drunkLevel >= 1.0) {
          drunkMessage = '🍺🍺🍺 DRITINGS!';
        } else if (drunkLevel >= 0.5) {
          drunkMessage = '🍺🍺 PÅ EN SNURR!';
        } else if (drunkLevel >= 0.3) {
          drunkMessage = '🍺🍺 BRISEN!';
        } else if (drunkLevel >= 0.1) {
          drunkMessage = '🍺 LETTERE PÅVIRKET';
        }
        
        // Only show message if there is one
        if (drunkMessage) {
          ctx.fillText(drunkMessage, 10, canvas.height - 20);
          
          // Draw drunk meter
          const meterWidth = 100;
          const meterHeight = 10;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(150, canvas.height - 25, meterWidth, meterHeight);
          
          // Meter color varies with drunk level
          let meterColor;
          if (drunkLevel >= 0.7) {
            meterColor = 'rgba(255, 0, 0, 0.8)'; // Red for very drunk
          } else if (drunkLevel >= 0.4) {
            meterColor = 'rgba(255, 100, 0, 0.8)'; // Orange for moderately drunk
          } else {
            meterColor = 'rgba(255, 200, 0, 0.8)'; // Yellow for lightly drunk
          }
          
          ctx.fillStyle = meterColor;
          ctx.fillRect(150, canvas.height - 25, meterWidth * drunkLevel, meterHeight);
        }
        
        ctx.restore();
      }
      
      animationId = requestAnimationFrame(gameLoop);
    }

    function runCollisionAnimation(effectFunction, collidedObstacle) {
      gameRunning = false;
      gameOver = true;
      cancelAnimationFrame(animationId);
      let crashProgress = 0;
      collidedObstacle.inCollision = true;
      const flashIntensity = 0.9;
      let flashOpacity = flashIntensity;
      let shakeIntensity = 10;
      let shakeDecay = 0.9;
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      
      // Variables for dramatic zoom effect - now for all obstacle types
      const shouldZoom = true; // Apply zoom for all obstacle types
      let zoomFactor = 1;
      let maxZoom = 1.4; // Same zoom level for all crashes
      let zoomStep = 0.03; // Slightly faster zoom
      let slowMotionFrames = collidedObstacle.isCar || collidedObstacle.type === 'cyclist' ? 20 : 10; // Reduced from 40/20 to 20/10
      
      // New: Create explosion particles for car and cyclist collisions
      const particles = [];
      if (collidedObstacle.isCar || collidedObstacle.type === 'cyclist') {
        // Generate explosion particles
        for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 5;
          const size = 2 + Math.random() * 8;
          const life = 30 + Math.random() * 60;
          const color = collidedObstacle.isCar ? 
                        ['#ff0000', '#ff5500', '#ffaa00'][Math.floor(Math.random() * 3)] : 
                        ['#00ccff', '#0066ff', '#ffffff'][Math.floor(Math.random() * 3)];
          
          particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            life: life,
            maxLife: life,
            color: color
          });
        }

        // Add broken parts specific to the obstacle type
        if (collidedObstacle.isCar) {
          // Car parts: Tires, glass, metal
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particles.push({
              x: collidedObstacle.x,
              y: collidedObstacle.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 5 + Math.random() * 10,
              life: 60 + Math.random() * 60,
              maxLife: 60 + Math.random() * 60,
              color: ['#333333', '#555555', '#999999'][Math.floor(Math.random() * 3)],
              isCarPart: true,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.2
            });
          }
        } else if (collidedObstacle.type === 'cyclist') {
          // Bicycle parts: Wheels, frame
          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particles.push({
              x: collidedObstacle.x,
              y: collidedObstacle.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 5 + Math.random() * 8,
              life: 60 + Math.random() * 60,
              maxLife: 60 + Math.random() * 60,
              color: i < 4 ? collidedObstacle.color : '#111',
              isBikePart: true,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.3
            });
          }
        }
      }
      
      // Create crash text animation
      let textOpacity = 0;
      let textScale = 0.5;
      
      function animateCollision() {
        // Clear canvas AND reset transforms at the start of each frame
        ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply zoom effect for cars and cyclists
        if (shouldZoom) {
          if (zoomFactor < maxZoom && crashProgress < 30) {
            zoomFactor += zoomStep;
          } else if (crashProgress > 50) {
            zoomFactor = Math.max(1, zoomFactor - zoomStep);
          }
          
          // Calculate collision center point
          const centerX = (player.x + collidedObstacle.x) / 2;
          const centerY = (player.y + collidedObstacle.y) / 2;
          
          ctx.save();
          // Apply zoom centered on collision point
          ctx.translate(centerX, centerY);
          ctx.scale(zoomFactor, zoomFactor);
          ctx.translate(-centerX, -centerY);
        }
        
        if (cameraShakeEnabled && shakeIntensity > 0.5) {
          shakeOffsetX = (Math.random() - 0.5) * shakeIntensity;
          shakeOffsetY = (Math.random() - 0.5) * shakeIntensity;
          ctx.save();
          ctx.translate(shakeOffsetX, shakeOffsetY);
          shakeIntensity *= shakeDecay;
        }
        
        drawRoad();
        drawWeatherEffects();
        
        // New: Draw explosion particles
        let hasActiveParticles = particles.length > 0;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          // Apply slow motion to particles
          const speedFactor = slowMotionFrames > 0 ? 0.3 : 1;
          p.x += p.vx * speedFactor;
          p.y += p.vy * speedFactor;
          p.vy += 0.1 * speedFactor; // Gravity
          p.life -= speedFactor;
          
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          
          const opacity = p.life / p.maxLife;
          
          if (p.isCarPart) {
            // Draw car parts
            p.rotation += p.rotationSpeed * speedFactor;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = opacity;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
          } else if (p.isBikePart) {
            // Draw bike parts
            p.rotation += p.rotationSpeed * speedFactor;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = opacity;
            if (Math.random() < 0.5) {
              // Wheel
              ctx.beginPath();
              ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              // Frame piece
              ctx.fillRect(-p.size/2, -p.size/8, p.size, p.size/4);
            }
            ctx.restore();
          } else {
            // Regular explosion particles
            ctx.globalAlpha = opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * opacity, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        
        if (flashOpacity > 0) {
          ctx.fillStyle = `rgba(255, 100, 100, ${flashOpacity})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          flashOpacity -= 0.02;
        }
        
        // Slow motion effect
        const progressStep = slowMotionFrames > 0 ? 0.5 : 1.0; // Increased from 0.2/0.5 to 0.5/1.0
        if (slowMotionFrames > 0) {
          slowMotionFrames--;
        }
        
        crashProgress += progressStep;
        ctx.save();
        ctx.translate(player.x, player.y + crashProgress);
        ctx.rotate(player.tilt + crashProgress * 0.1);
        if (usePlayerImage && playerImage.complete) {
          ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
        } else {
          drawScooterAtOrigin(player.width, player.height);
        }
        ctx.restore();
        
        for (const obstacle of obstacles) {
          if (obstacle !== collidedObstacle) {
            obstacle.draw();
          }
        }
        
        if (collidedObstacle.type === 'pedestrian') {
          // Existing pedestrian animation
          ctx.save();
          ctx.translate(collidedObstacle.x, collidedObstacle.y + crashProgress * 1.5);
          ctx.rotate(crashProgress * 0.15);
          const width = collidedObstacle.width;
          const height = collidedObstacle.height;
          ctx.fillStyle = '#FFCC80';
          ctx.beginPath();
          ctx.arc(0, -height * 0.3, width * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = collidedObstacle.color;
          ctx.fillRect(-width * 0.25, -height * 0.3 + width * 0.4, width * 0.5, height * 0.4);
          const legOffset = Math.sin(crashProgress * 0.5) * 8;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-width * 0.1, height * 0.1);
          ctx.lineTo(-width * 0.3, height * 0.3 + legOffset);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(width * 0.1, height * 0.1);
          ctx.lineTo(width * 0.3, height * 0.3 - legOffset);
          ctx.stroke();
          ctx.restore();
        } else if (collidedObstacle.isCar && crashProgress < 20) {
          // New: Car crash animation - flipping car with exploding parts
          ctx.save();
          ctx.translate(collidedObstacle.x, collidedObstacle.y);
          
          const width = collidedObstacle.width;
          const height = collidedObstacle.height;
          
          // Car rotation based on crash progress
          const rotationAngle = crashProgress * 0.2;
          ctx.rotate(rotationAngle);
          
          // Scale the car to simulate compression on impact
          const scaleX = 1 - Math.min(0.3, crashProgress * 0.02);
          const scaleY = 1 - Math.min(0.5, crashProgress * 0.03);
          ctx.scale(scaleX, scaleY);
          
          // Car body
          ctx.fillStyle = collidedObstacle.color;
          ctx.fillRect(-width / 2, -height / 2, width, height);
          
          // Windows
          ctx.fillStyle = '#333';
          ctx.fillRect(-width * 0.4, -height * 0.4, width * 0.8, height * 0.3);
          
          // Headlights and taillights
          ctx.fillStyle = '#FFEB3B'; // Headlights
          ctx.fillRect(-width * 0.4, -height * 0.45, width * 0.1, height * 0.05);
          ctx.fillRect(width * 0.3, -height * 0.45, width * 0.1, height * 0.05);
          
          ctx.fillStyle = '#F44336'; // Taillights
          ctx.fillRect(-width * 0.4, height * 0.4, width * 0.1, height * 0.05);
          ctx.fillRect(width * 0.3, height * 0.4, width * 0.1, height * 0.05);
          
          ctx.restore();
          
          // Draw explosion effects
          ctx.save();
          ctx.translate(collidedObstacle.x, collidedObstacle.y);
          
          // Fire/explosion
          const fireColors = ['#FF5722', '#FF9800', '#FFEB3B'];
          for (let i = 0; i < 5; i++) {
            const size = 10 + Math.random() * 15 - crashProgress * 0.3;
            if (size <= 0) continue;
            
            const angle = Math.random() * Math.PI * 2;
            const distance = (10 + crashProgress * 2) * Math.random();
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.fillStyle = fireColors[Math.floor(Math.random() * fireColors.length)];
            ctx.globalAlpha = Math.max(0, 1 - crashProgress * 0.05);
            
            // Random flame shape
            const flameHeight = size * (1.5 + Math.random() * 0.5);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + size/2, y - flameHeight/2, x, y - flameHeight);
            ctx.quadraticCurveTo(x - size/2, y - flameHeight/2, x, y);
            ctx.fill();
          }
          
          // Smoke
          for (let i = 0; i < 8; i++) {
            const smokeSize = 8 + Math.random() * 20 + crashProgress * 0.8;
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + crashProgress * 1.5 * Math.random();
            const smokeX = Math.cos(angle) * distance;
            const smokeY = Math.sin(angle) * distance - crashProgress * 0.5; // Rising effect
            
            const opacity = Math.max(0, 0.7 - crashProgress * 0.03);
            ctx.fillStyle = `rgba(100, 100, 100, ${opacity})`;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Draw detached car parts
          if (crashProgress > 5) {
            // Flying door
            const doorAngle = crashProgress * 0.3;
            const doorDistance = crashProgress * 2;
            ctx.save();
            ctx.translate(Math.cos(1.2) * doorDistance, Math.sin(1.2) * doorDistance);
            ctx.rotate(doorAngle);
            ctx.fillStyle = collidedObstacle.color;
            ctx.fillRect(0, 0, width * 0.4, height * 0.4);
            ctx.restore();
            
            // Flying wheel
            const wheelAngle = crashProgress * 0.5;
            const wheelDistance = crashProgress * 1.5;
            ctx.save();
            ctx.translate(Math.cos(2.5) * wheelDistance, Math.sin(2.5) * wheelDistance);
            ctx.rotate(wheelAngle);
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(0, 0, width * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
            // Wheel details
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              const angle = i * Math.PI / 2;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(angle) * width * 0.12, Math.sin(angle) * width * 0.12);
              ctx.stroke();
            }
            ctx.restore();
            
            // Flying glass shards
            ctx.fillStyle = '#88CCFF';
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              const glassDistance = 5 + crashProgress * 1.8 * Math.random();
              const glassX = Math.cos(angle) * glassDistance;
              const glassY = Math.sin(angle) * glassDistance;
              
              ctx.save();
              ctx.translate(glassX, glassY);
              ctx.rotate(angle);
              ctx.globalAlpha = Math.max(0, 0.8 - crashProgress * 0.04);
              ctx.fillRect(0, 0, 3 + Math.random() * 5, 2 + Math.random() * 3);
              ctx.restore();
            }
          }
          
          ctx.restore();
        } else if (collidedObstacle.type === 'cyclist' && crashProgress < 20) {
          // New: Cyclist crash animation
          ctx.save();
          ctx.translate(collidedObstacle.x, collidedObstacle.y);
          ctx.rotate(crashProgress * 0.2);
          
          const width = collidedObstacle.width;
          const height = collidedObstacle.height;
          
          // Distorted bike frame
          ctx.strokeStyle = collidedObstacle.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          const distortFactor = Math.min(1, crashProgress / 8);
          
          // Bent frame
          ctx.moveTo(-width * 0.3, height * 0.2);
          ctx.lineTo(0, -height * 0.1 + crashProgress * distortFactor * 0.3);
          ctx.lineTo(width * 0.3, height * 0.2 + crashProgress * distortFactor * 0.2);
          ctx.stroke();
          
          // Bent wheel
          ctx.beginPath();
          ctx.save();
          ctx.translate(-width * 0.3, height * 0.2);
          ctx.scale(1, 1 - distortFactor * 0.3);
          ctx.arc(0, 0, width * 0.15, 0, Math.PI * 2);
          ctx.restore();
          ctx.stroke();
          
          // Spinning wheel parts (detached)
          ctx.save();
          ctx.translate(width * 0.1, -height * 0.2);
          ctx.rotate(crashProgress * 0.4);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * width * 0.15, Math.sin(angle) * width * 0.15);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(0, 0, width * 0.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          
          // Fallen cyclist
          ctx.fillStyle = '#FFCC80'; // Head
          ctx.beginPath();
          ctx.arc(width * 0.2, height * 0.1, width * 0.12, 0, Math.PI * 2);
          ctx.fill();
          
          // Torso
          ctx.fillStyle = '#2196F3';
          ctx.save();
          ctx.translate(width * 0.1, height * 0.25);
          ctx.rotate(crashProgress * 0.08);
          ctx.fillRect(-width * 0.15, -height * 0.15, width * 0.3, height * 0.3);
          ctx.restore();
          
          // Limbs
          ctx.strokeStyle = '#424242';
          ctx.lineWidth = 4;
          
          // Legs
          const legOffset = Math.sin(crashProgress * 0.5) * 5;
          ctx.beginPath();
          ctx.moveTo(width * 0.1, height * 0.25);
          ctx.lineTo(width * 0.2 + legOffset, height * 0.4);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(width * 0.1, height * 0.25);
          ctx.lineTo(-width * 0.1 - legOffset, height * 0.35);
          ctx.stroke();
          
          ctx.restore();
        }
        
        // Draw crash text for car and cyclist crashes
        if (collidedObstacle.isCar || collidedObstacle.type === 'cyclist') {
          if (crashProgress < 30) {
            textOpacity = Math.min(1, textOpacity + 0.05);
            textScale = Math.min(2, textScale + 0.05);
          } else if (crashProgress > 40) {
            textOpacity = Math.max(0, textOpacity - 0.05);
          }
          
          if (textOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = textOpacity;
            ctx.translate(canvas.width / 2, canvas.height / 2 - 50);
            ctx.scale(textScale, textScale);
            
            // Draw text shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER!', 3, 3);
            
            // Draw red text with glow
            ctx.fillStyle = '#FF0000';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
            ctx.fillText('GAME OVER!', 0, 0);
            
            // Add some smaller text - different messages based on if player is drunk
            ctx.font = 'bold 15px Arial';
            ctx.shadowBlur = 5;
            
            let crashMessage = '';
            if (isDrunk && drunkLevel > 0.1) {
              // Different messages based on drunk level and obstacle type
              if (collidedObstacle.isCar) {
                if (drunkLevel >= 0.6) {
                  crashMessage = 'KATASTROFAL BILKRÆSJ! FOR BERUSET TIL Å KJØRE!';
                } else if (drunkLevel >= 0.3) {
                  crashMessage = 'ALKOHOL + BIL = KATASTROFE!';
                } else {
                  crashMessage = 'SELV MED LITT ALKOHOL ER FAREN STOR!';
                }
              } else if (collidedObstacle.type === 'cyclist') {
                if (drunkLevel >= 0.6) {
                  crashMessage = 'KNUSTE SYKKELEN I FYLLA!';
                } else if (drunkLevel >= 0.3) {
                  crashMessage = 'ALKOHOL ØDELA BALANSEN DIN!';
                } else {
                  crashMessage = 'PÅVIRKET KJØRING ER ALDRI TRYGT!';
                }
              } else if (collidedObstacle.type === 'pedestrian') {
                if (drunkLevel >= 0.6) {
                  crashMessage = 'PÅKJØRTE FOTGJENGER I FYLLA!';
                } else if (drunkLevel >= 0.3) {
                  crashMessage = 'BERUSET KJØRING SKADET FOTGJENGER!';
                } else {
                  crashMessage = 'SELV LITT ALKOHOL PÅVIRKER REAKSJONSTIDEN!';
                }
              }
            } else {
              // Original messages for sober crashes
              crashMessage = collidedObstacle.isCar ? 'BIL KRÆSJ!' : 'SYKKEL KRÆSJ!';
            }
            
            ctx.fillText(crashMessage, 0, 25);
            
            ctx.restore();
          }
        }
        
        // Always restore contexts in reverse order of saving
        if (cameraShakeEnabled && shakeIntensity > 0.5) {
          ctx.restore();
        }
        
        // Restore zoom transformation
        if (shouldZoom) {
          ctx.restore();
        }
        
        const particlesActive = effectFunction() || hasActiveParticles;
        
        if (particlesActive || crashProgress < 25) {
          animationId = requestAnimationFrame(animateCollision);
        } else {
          // Ensure all transforms are reset before ending the game
          ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
          endGame();
        }
      }
      
      animationId = requestAnimationFrame(animateCollision);
    }

    function cleanupGameEffects() {
      // Cancel any animations
      cancelAnimationFrame(animationId);
      
      // Remove all overlay elements
      const overlays = document.querySelectorAll('div[style*="backgroundColor"], .game-message, .game-over');
      overlays.forEach(overlay => overlay.remove());
      
      // Reset all drunk-related variables
      isDrunk = true; // Keep this true to enable the gradual system
      drunkLevel = 0;
      swayAngle = 0;
      isGlitching = false;
      glitchIntensity = 0;
      glitchOffsetX = 0;
      glitchOffsetY = 0;
      cameraShake = 0;
      roadDistortion = 0;
      visionBlur = 0;
      lastRandomDirection = 0;
      randomDirectionTimer = 0;
      lastScoreThreshold = 0;
      
      // Reset canvas state completely
      if (ctx) {
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function startGame() {
      if (gameRunning) return;
      
      // Cancel any ongoing animations
      cancelAnimationFrame(animationId);
      
      // Remove game over screen if it exists
      const gameOverScreen = document.querySelector('.game-over');
      if (gameOverScreen) {
        gameOverScreen.remove();
      }
      
      // Remove ANY overlay elements and messages
      document.querySelectorAll('.game-message, div[style*="backgroundColor"]').forEach(el => {
        el.remove();
      });
      
      // Completely reset drunk effect variables
      isGlitching = false;
      glitchIntensity = 0;
      glitchOffsetX = 0;
      glitchOffsetY = 0;
      cameraShake = 0;
      roadDistortion = 0;
      visionBlur = 0;
      
      // Full reset of the canvas context
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Play game start sound
      playSoundEffect('gameStart');
      
      // Start the scooter engine sound
      playSoundEffect('scooterEngine');
      
      gameRunning = true;
      gameOver = false;
      score = 0;
      obstacles = [];
      collectibles = [];
      activePowerUps = [];
      powerUpEffects = []; // Reset power-up effects array
      frameCount = 0;
      obstacleSpeed = 7; // Increased from 5 to 7
      obstacleFrequency = 80; // Reduced from 100 to 80
      player.x = canvas.width / 2;
      player.y = canvas.height - 100;
      player.tilt = 0;
      player.speedX = 0;
      player.speedY = 0;
      
      // Reset drunk driving variables - start completely sober
      isDrunk = true; // Keep this true to enable the gradual system
      drunkLevel = 0; // Start at 0 (completely sober)
      swayAngle = 0;
      lastRandomDirection = 0;
      randomDirectionTimer = 0;
      lastScoreThreshold = 0; // Reset score threshold tracker
      
      // Empty wheel tracks array for performance
      wheelTracks = [];
      
      activePowerUps.push({
        type: 'shield',
        timeLeft: 180,
        duration: 180,
        color: '#64B5F6',
        icon: '🛡️'
      });
      scoreDisplay.textContent = '0';
      startBtn.style.display = 'none';
      restartBtn.style.display = 'none';
      initRoadLines();
      initEnvironment();
      gameLoop();
    }
    
    // Drunk wheel tracks
    // wheelTracks array already declared earlier
    
    function addWheelTrack(x, y) {
      wheelTracks.push({
        x: x,
        y: y,
        alpha: 0.5,
        width: 3
      });
      
      // Limit the number of tracks
      if (wheelTracks.length > 20) {
        wheelTracks.shift();
      }
    }
    
    function drawWheelTracks() {
      // Only draw tracks if player is moving fast enough
      if (Math.abs(player.speedX) > 3 || Math.abs(player.speedY) > 3) {
        // Add new track at current position (less frequently)
        if (frameCount % 8 === 0) {
          const offsetX = player.width * 0.2;
          
          // Left wheel track
          addWheelTrack(
            player.x - offsetX + (isDrunk && drunkLevel > 0.3 ? (Math.random() - 0.5) * drunkLevel * 8 : 0),
            player.y + player.height * 0.3
          );
          
          // Right wheel track
          addWheelTrack(
            player.x + offsetX + (isDrunk && drunkLevel > 0.3 ? (Math.random() - 0.5) * drunkLevel * 8 : 0),
            player.y + player.height * 0.3
          );
        }
      }
      
      // Optimize - limit how many tracks we process at once
      const maxTracksToProcess = Math.min(10, wheelTracks.length);
      
      // Draw tracks more efficiently
      ctx.save();
      ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      
      for (let i = wheelTracks.length - 1; i >= Math.max(0, wheelTracks.length - maxTracksToProcess); i--) {
        const track = wheelTracks[i];
        track.alpha -= 0.03; // Fade out faster
        
        if (track.alpha <= 0) {
          wheelTracks.splice(i, 1);
        } else {
          // Batch similar tracks together
          ctx.beginPath();
          ctx.arc(track.x, track.y, track.width, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      
      // Limit total tracks more aggressively
      if (wheelTracks.length > 15) {
        wheelTracks = wheelTracks.slice(-15);
      }
    }

    function endGame() {
      gameRunning = false;
      gameOver = true;
      
      // Stop engine sound
      playSoundEffect('stopEngine');
      
      // Play game over sound
      playSoundEffect('gameOver');
      
      // Sjekk highscore
      const isNewHighScore = score > highScore;
      const isNewTopTen = isTopTen(score);
      
      // Oppdater high score uansett
      if (isNewHighScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = highScore;
      }
      
      const gameOverDiv = document.createElement('div');
      gameOverDiv.className = 'game-over';
      
      // Legg til lukke-knapp
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-gameover-btn';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => {
        gameOverDiv.remove();
      });
      
      const heading = document.createElement('h2');
      heading.textContent = 'GAME OVER!';
      
      const scoreInfo = document.createElement('p');
      scoreInfo.textContent = `Poengsum: ${score}`;
      
      // Add high score information
      const highScoreInfo = document.createElement('p');
      highScoreInfo.textContent = `High Score: ${highScore}`;
      
      gameOverDiv.appendChild(closeBtn);
      gameOverDiv.appendChild(heading);
      gameOverDiv.appendChild(scoreInfo);
      gameOverDiv.appendChild(highScoreInfo);
      
      // Legg til navneinput hvis ny topp 10-score
      if (isNewTopTen) {
        const nameForm = document.createElement('div');
        nameForm.className = 'name-input-container';
        
        const nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'playerName');
        nameLabel.textContent = 'Skriv inn navnet ditt:';
        
        const nameInput = document.createElement('textarea');
        nameInput.setAttribute('id', 'playerName');
        nameInput.setAttribute('placeholder', 'Ditt navn');
        nameInput.setAttribute('rows', '3');
        nameInput.setAttribute('maxlength', '100'); // Setter høy maksgrense
        nameInput.setAttribute('data-lpignore', 'true'); // Ignorerer LastPass autofyll
        nameInput.style.resize = 'vertical';
        nameInput.style.maxHeight = '150px';
        nameInput.style.minHeight = '60px';
        
        // Auto-resize funksjon for tekstfeltet
        nameInput.addEventListener('input', function() {
          this.style.height = 'auto';
          this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Legg til støtte for Enter-tasten
        nameInput.addEventListener('keypress', (event) => {
          if (event.key === 'Enter' && event.shiftKey === false) {
            event.preventDefault();
            // Bruk nameInput.value direkte uten trim
            const playerName = nameInput.value || 'Anonym';
            submitBtn.click();
          }
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'submit-name-btn';
        submitBtn.textContent = 'Lagre Score';
        
        nameForm.appendChild(nameLabel);
        nameForm.appendChild(nameInput);
        nameForm.appendChild(submitBtn);
        
        gameOverDiv.appendChild(nameForm);
        
        // Sett fokus på input-feltet med en liten forsinkelse for å sikre at DOM-en er oppdatert
        setTimeout(() => {
          const inputField = document.getElementById('playerName');
          if (inputField) {
            inputField.focus();
          }
        }, 100);
        
        // Lagre highscore når brukeren sender inn
        submitBtn.addEventListener('click', () => {
          // Bruk const playerName = nameInput.value.trim() || 'Anonym'; 
          // i stedet for å fjerne eventuell validering som filtrerer tegn
          const playerName = nameInput.value || 'Anonym';
          const savedHighscores = saveHighscore(playerName, score);
          
          // Sjekk om spilleren fikk en topplassering (topp 3)
          const playerRank = savedHighscores.findIndex(entry => entry.name === playerName && entry.score === score) + 1;
          
          // Fjern inputfeltet
          nameForm.remove();
          
          // Vis bekreftelsesmelding med animasjon
          const confirmationMsg = document.createElement('div');
          confirmationMsg.className = 'score-confirmation';
          
          let rankMessage = `Din score er lagret: ${score} poeng`;
          
          // Spesiell melding for topplasseringer
          if (playerRank === 1) {
            rankMessage = `🥇 FØRSTEPLASS! ${score} poeng`;
            confirmationMsg.classList.add('gold-rank');
          } else if (playerRank === 2) {
            rankMessage = `🥈 ANDREPLASS! ${score} poeng`;
            confirmationMsg.classList.add('silver-rank');
          } else if (playerRank === 3) {
            rankMessage = `🥉 TREDJEPLASS! ${score} poeng`;
            confirmationMsg.classList.add('bronze-rank');
          } else if (playerRank <= 10) {
            rankMessage = `${playerRank}. PLASS! ${score} poeng`;
          }
          
          confirmationMsg.textContent = rankMessage;
          gameOverDiv.appendChild(confirmationMsg);
          
          // Vis highscores etter kort forsinkelse
          setTimeout(() => {
            // Lag en wrapper for highscore uten lukkeknapp
            const highscoreWrapper = document.createElement('div');
            highscoreWrapper.className = 'highscore-wrapper';
            
            // Vis highscores i wrapperen direkte uten lukkeknapp
            showHighscores(highscoreWrapper);
            
            // Legg til wrapperen i game-over-vinduet
            gameOverDiv.appendChild(highscoreWrapper);
          }, 1500);
        });
      } else {
        // Add safety tip
      const safetyTip = document.createElement('p');
      safetyTip.className = 'safety-tip';
      safetyTip.textContent = getRandomSafetyTip();
      gameOverDiv.appendChild(safetyTip);
        
        // Lag en wrapper for highscore uten lukkeknapp
        const highscoreWrapper = document.createElement('div');
        highscoreWrapper.className = 'highscore-wrapper';
        
        // Vis highscores i wrapperen direkte uten lukkeknapp
        showHighscores(highscoreWrapper);
        
        // Legg til wrapperen i game-over-vinduet
        gameOverDiv.appendChild(highscoreWrapper);
      }
      
      const container = document.querySelector('.game-container');
      container.appendChild(gameOverDiv);
      
      restartBtn.style.display = 'block';
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    
    // Highscore-knapp funksjonalitet
    const highscoreBtn = document.getElementById('highscoreBtn');
    highscoreBtn.addEventListener('click', () => {
      // Hvis det finnes en eksisterende highscore-visning, fjern den først
      const existingHighscoreList = document.querySelector('.highscore-modal');
      if (existingHighscoreList) {
        existingHighscoreList.remove();
        return;
      }
      
      // Lag en modal for highscore-listen
      const modal = document.createElement('div');
      modal.className = 'highscore-modal';
      
      // Lag en lukke-knapp
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-highscore-btn';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => modal.remove());
      
      modal.appendChild(closeBtn);
      
      // Vis highscores i modalen
      showHighscores(modal);
      
      // Legg til modalen i DOM
      const container = document.querySelector('.game-container');
      container.appendChild(modal);
    });

    window.addEventListener('resize', () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initRoadLines();
      if (gameOver) {
        clearCanvas();
        drawRoad();
      }
    });

    initRoadLines();
    clearCanvas();
    drawRoad();
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Trykk på "Start Spill" for å begynne', canvas.width / 2, canvas.height / 2);

    const camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      easeAmount: 0.1
    };

    let clouds = [];
    let birds = [];
    let trafficLights = [];
    let intersectionPositions = [0.3, 0.6, 0.9];
    let currentLightState = 'green';
    let lightChangeFrameCount = 0;

    function initEmptyEnvironment() {
      clouds = [];
      birds = [];
      trafficLights = [];
    }
    initEmptyEnvironment();

    collectibles = [];
    let powerUpTypes = [
      { name: 'shield', color: '#64B5F6', duration: 350, icon: '🛡️' },
      { name: 'speed', color: '#FFD54F', duration: 250, icon: '⚡' },
      { name: 'slowTime', color: '#9C27B0', duration: 180, icon: '⏱️' },
      { name: 'points', color: '#E91E63', duration: 1, icon: '💯' }
    ];
    activePowerUps = [];

    function initEnvironment() {
      clouds = [];
      birds = [];
      trafficLights = [];
    }
    initEnvironment();

    function applyMotionBlur() {
      if (!motionBlurEnabled) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function updateCamera() {
      if (!dynamicCameraEnabled) return;
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      const maxCameraOffset = roadWidth / 2.5;
      const horizonY = canvas.height * 0.18;
      camera.targetX = player.x + player.speedX * 15;
      camera.targetY = player.y + player.speedY * 6 - 100;
      camera.targetX = Math.max(leftEdge + maxCameraOffset, Math.min(camera.targetX, leftEdge + roadWidth - maxCameraOffset));
      camera.targetY = Math.max(horizonY + 80, Math.min(camera.targetY, canvas.height - 150));
      camera.x += (camera.targetX - camera.x) * camera.easeAmount;
      camera.y += (camera.targetY - camera.y) * camera.easeAmount;
    }

    function updatePowerUpDisplay() {
      const powerupContainer = document.getElementById('powerupContainer');
      powerupContainer.innerHTML = '';
      if (activePowerUps.length === 0) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'powerup-item';
        emptyElement.innerHTML = '<span class="powerup-empty">Ingen aktive power-ups</span>';
        powerupContainer.appendChild(emptyElement);
        return;
      }
      for (const powerUp of activePowerUps) {
        const powerupElement = document.createElement('div');
        powerupElement.className = 'powerup-item';
        const percentage = Math.floor((powerUp.timeLeft / powerUp.duration) * 100);
        const timeLeft = Math.floor(powerUp.timeLeft / 60 * 100) / 100;
        powerupElement.innerHTML = `
          <span class="powerup-icon" style="background-color:${powerUp.color}30;">${powerUp.icon}</span>
          <div class="powerup-info">
            <span>${getPowerUpName(powerUp.type)}</span>
            <div class="powerup-bar">
              <div class="powerup-progress" style="width:${percentage}%; background-color:${powerUp.color};"></div>
            </div>
            <span class="powerup-time">${timeLeft.toFixed(1)}s</span>
          </div>
        `;
        powerupContainer.appendChild(powerupElement);
      }
    }

    function collectPowerUp(collectible) {
      const powerUp = {
        type: collectible.type,
        timeLeft: collectible.duration,
        duration: collectible.duration,
        color: collectible.color,
        icon: collectible.icon
      };
      
      // Play sound effect
      playSoundEffect('powerup');
      
      // Also play a specific sound for the power-up type
      if (sounds[collectible.type]) {
        playSoundEffect(collectible.type);
      }
      
      // Apply power up effects
      if (collectible.type === 'shield') {
        // Shield is already applied by presence in activePowerUps
      } else if (collectible.type === 'speed') {
        player.speed *= 1.8;
      } else if (collectible.type === 'slowTime') {
        for (const obstacle of obstacles) {
          obstacle.speed /= 2.5;
        }
      } else if (collectible.type === 'points') {
        score += 10;
        scoreDisplay.textContent = score;
        // Create an effect even for points
        powerUpEffects.push(createPowerUpEffect(collectible.type, collectible.color));
        return; // Don't add to active power-ups since it's instant
      }
      
      // Add to active power-ups (except for instant ones like points)
      if (collectible.type !== 'points') {
        // Check if we already have this type of power-up active
        const existingIndex = activePowerUps.findIndex(p => p.type === collectible.type);
        if (existingIndex >= 0) {
          // Just reset the timer
          activePowerUps[existingIndex].timeLeft = collectible.duration;
        } else {
          // Add new power-up
          activePowerUps.push(powerUp);
        }
        
        // Create the particle effect for the collected power-up
        powerUpEffects.push(createPowerUpEffect(collectible.type, collectible.color));
      }
      
      // Forbedret visuell feedback
      // Flash-effekt på hele skjermen
      const flash = document.createElement('div');
      flash.className = 'powerup-collected';
      flash.style.backgroundColor = collectible.color + '50';
      document.querySelector('.game-container').appendChild(flash);
      setTimeout(() => flash.remove(), 500);
      
      // Legg til sjokkbølge-effekt på spillerenå
      const shockwaveRadius = 40; // Reduced from 50
      const shockwaveParticles = 8; // Reduced from 15
      
      // Create a single shockwave instead of multiple ones
      const shockwaveEffect = {
        x: collectible.x,
        y: collectible.y,
        radius: 5,
        maxRadius: shockwaveRadius,
        speed: 2.5,
        alpha: 0.7,
        color: collectible.color
      };
      
      // Legg til animasjon for sjokkbølgen
      const animateShockwave = () => {
        if (shockwaveEffect.radius >= shockwaveEffect.maxRadius || !gameRunning) {
          return;
        }
        
        ctx.save();
        ctx.globalAlpha = shockwaveEffect.alpha;
        ctx.strokeStyle = shockwaveEffect.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(shockwaveEffect.x, shockwaveEffect.y, shockwaveEffect.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        shockwaveEffect.radius += shockwaveEffect.speed;
        shockwaveEffect.alpha -= 0.035; // Faster fade out
        
        if (shockwaveEffect.alpha > 0) {
          setTimeout(() => requestAnimationFrame(animateShockwave), 16); // Limit to ~60fps
        }
      };
      
      // Start with a slight delay to improve performance
      setTimeout(() => animateShockwave(), 0);
      
      // Legg til en futuristisk/glass-effekt i stedet for bobleeffekt
      // Lag en serie av polygoner som danner en krystalleffekt
      const crystalEffect = () => {
        const fragments = [];
        const fragmentCount = 6; // Reduced from 8
        
        // Opprett krystallfragmenter
        for (let i = 0; i < fragmentCount; i++) {
          const angle = (i / fragmentCount) * Math.PI * 2;
          const distance = 20 + Math.random() * 30;
          
          // Simplified points creation - pre-calculate points instead of dynamically
          const pointCount = 5;
          const points = [];
          for (let j = 0; j < pointCount; j++) {
            const pointAngle = (j / pointCount) * Math.PI * 2;
            const pointDistance = (0.7 + Math.random() * 0.3); // Reduced randomness
            points.push({
              x: Math.cos(pointAngle) * pointDistance,
              y: Math.sin(pointAngle) * pointDistance
            });
          }
          
          fragments.push({
            x: collectible.x,
            y: collectible.y,
            targetX: collectible.x + Math.cos(angle) * distance,
            targetY: collectible.y + Math.sin(angle) * distance,
            size: 10 + Math.random() * 10, // Reduced size variation
            alpha: 0.9,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1, // Reduced rotation speed
            color: collectible.color,
            points: points
          });
        }
        
        let frameCount = 0;
        const maxFrames = 30; // Reduced animation frames
        
        const animateCrystals = () => {
          if (frameCount >= maxFrames || !gameRunning) {
            return;
          }
          
          const progress = frameCount / maxFrames;
          
          ctx.save();
          
          // Tegn hvert krystallfragment
          for (const fragment of fragments) {
            const x = fragment.x + (fragment.targetX - fragment.x) * progress;
            const y = fragment.y + (fragment.targetY - fragment.y) * progress;
            
            fragment.alpha = 0.9 * (1 - progress);
            const currentSize = fragment.size * (1 - progress * 0.5);
            
            fragment.rotation += fragment.rotationSpeed;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(fragment.rotation);
            ctx.scale(currentSize / 10, currentSize / 10);
            
            ctx.globalAlpha = fragment.alpha;
            
            // Simplified gradient with fewer color stops
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
            gradient.addColorStop(0, fragment.color);
            gradient.addColorStop(1, fragment.color + '00'); // Fully transparent
            
            ctx.beginPath();
            for (let i = 0; i < fragment.points.length; i++) {
              const point = fragment.points[i];
              if (i === 0) {
                ctx.moveTo(point.x * 10, point.y * 10);
              } else {
                ctx.lineTo(point.x * 10, point.y * 10);
              }
            }
            ctx.closePath();
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Simplified highlight effect - just one highlight per fragment
            ctx.globalAlpha = fragment.alpha * 0.5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(-2, -2, 3, 2, Math.PI/4, 0, Math.PI * 2);
            ctx.fill();
            
            // Thinner border for better performance
            ctx.globalAlpha = fragment.alpha;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 0.3;
            ctx.stroke();
            
            ctx.restore();
          }
          
          ctx.restore();
          
          frameCount++;
          
          // Use timeout instead of requestAnimationFrame for better control
          if (frameCount < maxFrames) {
            setTimeout(() => requestAnimationFrame(animateCrystals), 16); // ~60fps
          }
        };
        
        // Start animation with slight delay to prevent stuttering
        setTimeout(() => animateCrystals(), 0);
      };
      
      crystalEffect();
      
      // Remove temporal slow-motion effect
      
      updatePowerUpDisplay();
    }

    function getPowerUpName(type) {
      switch (type) {
        case 'shield': return 'Skjold';
        case 'speed': return 'Fart';
        case 'slowTime': return 'Slow Motion';
        case 'points': return 'Bonus Poeng';
        default: return type;
      }
    }

    function applyPowerUps() {
      for (let i = activePowerUps.length - 1; i >= 0; i--) {
        activePowerUps[i].timeLeft--;
        if (activePowerUps[i].timeLeft <= 0) {
          if (activePowerUps[i].type === 'speed') {
            player.speed /= 1.8;
          } else if (activePowerUps[i].type === 'slowTime') {
            for (const obstacle of obstacles) {
              obstacle.speed *= 2.5;
            }
          }
          activePowerUps.splice(i, 1);
        }
      }
      updatePowerUpDisplay();
      if (activePowerUps.length > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(10, 10, 150, 30);
        let xOffset = 20;
        for (const powerUp of activePowerUps) {
          ctx.fillStyle = powerUp.color;
          ctx.fillText(powerUp.icon, xOffset, 30);
          const barWidth = 30;
          const remainingWidth = (powerUp.timeLeft / powerUp.duration) * barWidth;
          ctx.fillStyle = '#FFF';
          ctx.fillRect(xOffset, 35, barWidth, 3);
          ctx.fillStyle = powerUp.color;
          ctx.fillRect(xOffset, 35, remainingWidth, 3);
          xOffset += 50;
        }
        ctx.restore();
      }
    }

    function checkCollectibleCollision(player, collectible) {
      // Use same hitbox approach as obstacle collision
      const playerHitbox = {
        x: player.x - player.width * 0.3,
        y: player.y - player.height * 0.4,
        width: player.width * 0.6,
        height: player.height * 0.8
      };
      
      // Power-ups have a slightly larger hitbox to make them easier to collect
      const collectibleHitbox = {
        x: collectible.x - collectible.width * 0.6,
        y: collectible.y - collectible.width * 0.6,
        width: collectible.width * 1.2,
        height: collectible.width * 1.2
      };
      
      // Check if rectangles overlap (AABB collision)
      return playerHitbox.x < collectibleHitbox.x + collectibleHitbox.width &&
             playerHitbox.x + playerHitbox.width > collectibleHitbox.x &&
             playerHitbox.y < collectibleHitbox.y + collectibleHitbox.height &&
             playerHitbox.y + playerHitbox.height > collectibleHitbox.y;
    }

    function createCollectible() {
      const size = 30;
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      const x = Math.random() * (roadWidth - 50) + leftEdge + 25;
      const snowFactor = weather === 'snow' ? 0.6 : 1.0;
      return {
        x: x,
        y: -40,
        width: size,
        height: size,
        type: type.name,
        color: type.color,
        icon: type.icon,
        duration: type.duration,
        speed: obstacleSpeed * 0.7 * snowFactor,
        animationPhase: 0,
        draw() {
          ctx.save();
          const floatOffset = Math.sin(this.animationPhase) * 3;
          ctx.translate(this.x, this.y + floatOffset);
          ctx.shadowColor = this.color;
          ctx.shadowBlur = 15;
          ctx.fillStyle = this.color;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#FFF';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.icon, 0, 0);
          ctx.restore();
          this.animationPhase += 0.1;
        },
        update(speedFactor = 1) {
          if (this.collected) return;
          
          this.rotation += 0.02 * speedFactor;
          this.y += this.speed * speedFactor;
          
          // Gjør collectibles litt mer dynamiske ved å svinge sidelengs
          if (this.swingFrequency > 0) {
            this.x = this.initialX + Math.sin(this.y * this.swingFrequency) * this.swingAmplitude;
          }
          
          // Hopp-effekt
          if (this.bounceFrequency > 0) {
            this.bounceOffset = Math.sin(this.y * this.bounceFrequency) * this.bounceAmplitude;
          }
          
          // Animasjon av glød
          this.glowSize = this.baseGlowSize + Math.sin(frameCount * 0.1 * speedFactor) * 2;
          
          return this.y > canvas.height + this.width;  // Returnerer true når objektet er utenfor skjermen
        }
      };
    }

    // Draw weather effects based on current weather setting
    function drawWeatherEffects() {
      switch(weather) {
        case 'rain':
          drawRain(0);
          break;
        case 'fog':
          drawFog(0);
          break;
        case 'snow':
          drawSnow(0);
          break;
        default:
          // No effects for clear weather
          break;
      }
    }
    
    // Draw rain effect
    function drawRain(horizonY) {
      ctx.save();
      const raindrops = 200;
      const rainColor = timeOfDay >= 75 || timeOfDay < 25 ? 'rgba(160, 190, 255, 0.7)' : 'rgba(100, 130, 220, 0.7)';
      ctx.strokeStyle = rainColor;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < raindrops; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        const length = 10 + Math.random() * 15;
        const angle = Math.PI / 8; // Slight angle for rain
        
      ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }
      
      // Add light reflection on road
      ctx.fillStyle = 'rgba(190, 210, 255, 0.05)';
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      ctx.fillRect(leftEdge, 0, roadWidth, canvas.height);
      
      ctx.restore();
    }
    
    // Draw fog effect
    function drawFog(horizonY) {
      ctx.save();
      
      // Create gradient fog
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(200, 200, 220, 0.7)');
      gradient.addColorStop(0.5, 'rgba(200, 200, 220, 0.4)');
      gradient.addColorStop(1, 'rgba(200, 200, 220, 0.1)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add fog particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < 60; i++) {
        const size = 20 + Math.random() * 80;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Draw snow effect
    function drawSnow(horizonY) {
      ctx.save();
      const snowflakes = 150;
      
      for (let i = 0; i < snowflakes; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        const size = 1 + Math.random() * 3;
        const opacity = 0.5 + Math.random() * 0.5;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some snowflakes with crystal structure
        if (size > 2.5) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          const armLength = size * 2;
          
          for (let j = 0; j < 3; j++) {
            const angle = (j / 3) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(angle) * armLength, y - Math.sin(angle) * armLength);
            ctx.lineTo(x + Math.cos(angle) * armLength, y + Math.sin(angle) * armLength);
            ctx.stroke();
          }
        }
      }
      
      // Add slight white overlay to simulate snow accumulation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.restore();
    }

    // Create power-up animation particles around the player
    function createPowerUpEffect(type, color, isSmall = false) {
      const particles = [];
      const particleCount = isSmall ? 15 : 30; // Flere partikler for bedre visuell effekt
      
      // Definer egenskaper basert på power-up type
      let particleProperties = {
        size: isSmall ? (3 + Math.random() * 3) : (5 + Math.random() * 5),
        distance: isSmall ? (20 + Math.random() * 5) : (40 + Math.random() * 10),
        speed: isSmall ? (0.3 + Math.random() * 0.5) : (0.7 + Math.random() * 1.2),
        life: isSmall ? (20 + Math.random() * 20) : (40 + Math.random() * 40)
      };
      
      // Spesielle egenskaper for hver power-up type
      switch (type) {
        case 'shield':
          particleProperties.shape = 'circle';
          particleProperties.glowIntensity = 8;
          particleProperties.orbitSpeed = 0.03;
          break;
        case 'speed':
          particleProperties.shape = 'lightning';
          particleProperties.glowIntensity = 10;
          particleProperties.trailLength = 3;
          break;
        case 'slowTime':
          particleProperties.shape = 'hourglass';
          particleProperties.glowIntensity = 6;
          particleProperties.pulseSpeed = 0.08;
          break;
        case 'points':
          particleProperties.shape = 'star';
          particleProperties.glowIntensity = 12;
          particleProperties.sparkleRate = 0.15;
          break;
        default:
          particleProperties.shape = 'circle';
          particleProperties.glowIntensity = 5;
      }
      
      // Generate particles in a circular or spiral pattern
      for (let i = 0; i < particleCount; i++) {
        // Base angle for circular distribution
        const baseAngle = (i / particleCount) * Math.PI * 2;
        // Add some randomness to the angle for a more natural look
        const angle = baseAngle + (Math.random() - 0.5) * 0.4;
        
        // Create spiraling out effect
        const spiralFactor = Math.min(1, i / (particleCount * 0.7));
        const distance = particleProperties.distance * spiralFactor;
        
        const particle = {
          x: player.x + Math.cos(angle) * distance,
          y: player.y + Math.sin(angle) * distance,
          size: particleProperties.size * (0.7 + Math.random() * 0.6), // Varierende størrelse
          alpha: 1,
          speed: particleProperties.speed * (0.8 + Math.random() * 0.4), // Varierende hastighet
          angle: angle,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          color: color,
          type: type,
          shape: particleProperties.shape,
          glowIntensity: particleProperties.glowIntensity,
          life: particleProperties.life * (0.8 + Math.random() * 0.4),
          maxLife: particleProperties.life * (0.8 + Math.random() * 0.4),
          pulsePhase: Math.random() * Math.PI * 2,
          // Special properties for each type
          ...(type === 'shield' && { orbitSpeed: particleProperties.orbitSpeed }),
          ...(type === 'speed' && { trailLength: particleProperties.trailLength }),
          ...(type === 'slowTime' && { pulseSpeed: particleProperties.pulseSpeed }),
          ...(type === 'points' && { sparkleRate: particleProperties.sparkleRate })
        };
        particles.push(particle);
      }
      
      return {
        x: player.x,
        y: player.y,
        particles,
        active: true,
        update(speedFactor = 1) {
          let stillActive = false;
          
          for (const p of this.particles) {
            // Bruk speedFactor for å sikre jevn animasjon uavhengig av skjerm
            p.life -= 0.7 * speedFactor; // Litt saktere nedtelling for lengre effekt
            p.alpha = p.life / p.maxLife; // Smoother fade out
            
            // Ulike bevegelsesmønstre for ulike power-up typer
            if (p.type === 'shield') {
              // Shield particles orbit around player
              p.angle += p.orbitSpeed * speedFactor;
              const orbitDistance = 30 + Math.sin(frameCount * 0.05) * 8;
              p.x = player.x + Math.cos(p.angle) * orbitDistance;
              p.y = player.y + Math.sin(p.angle) * orbitDistance;
              
              // Pulserende størrelseseffekt
              p.size = (4 + Math.sin(frameCount * 0.1) * 2) * (p.life / p.maxLife);
              
            } else if (p.type === 'speed') {
              // Speed particles zoom upward with trailing effect
              p.y -= p.speed * 1.5 * speedFactor;
              p.x += Math.cos(p.angle) * p.speed * 0.8 * speedFactor;
              
              // Roterer hurtigere
              p.rotation += p.rotationSpeed * 2 * speedFactor;
              
            } else if (p.type === 'slowTime') {
              // Slow time particles move in a wave pattern
              p.y -= p.speed * 0.8 * speedFactor;
              p.x += Math.sin(p.y * 0.05) * 1.5 * speedFactor;
              
              // Pulserende effekt
              p.pulsePhase += p.pulseSpeed * speedFactor;
              p.size = p.size * 0.99 + Math.sin(p.pulsePhase) * 1.5;
              
            } else if (p.type === 'points') {
              // Points particles shoot outward in all directions
              const movementSpeed = p.speed * (1 + (1 - p.life/p.maxLife) * 0.5);
              p.x += Math.cos(p.angle) * movementSpeed * speedFactor;
              p.y += Math.sin(p.angle) * movementSpeed * speedFactor;
              
              // Twinkle effect
              p.alpha = p.alpha * 0.95 + Math.random() * 0.2;
              
              } else {
              // Default particle movement for other types
              p.y -= p.speed * speedFactor;
              p.x += (Math.random() - 0.5) * 0.8 * speedFactor;
              p.rotation += p.rotationSpeed * speedFactor;
              }
            
            if (p.life > 0 && p.size > 0) {
              stillActive = true;
            }
          }
          
          this.active = stillActive;
          return stillActive;
        },
        draw() {
          for (const p of this.particles) {
            if (p.life <= 0 || p.size <= 0) continue;
            
          ctx.save();
            ctx.globalAlpha = p.alpha;
            
            // Add glow effect based on particle type
            ctx.shadowBlur = p.glowIntensity * (p.life / p.maxLife);
            ctx.shadowColor = p.color;
            
            // Translate to particle position
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            // Draw different shapes based on power-up type
            if (p.shape === 'circle' || p.type === 'shield') {
              // Shield particles are glowing circles
              ctx.fillStyle = p.color;
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 1 * (p.life / p.maxLife);
              
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              
              // Add inner glow
              ctx.globalAlpha = p.alpha * 0.7;
              ctx.beginPath();
              ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.fill();
              
            } else if (p.shape === 'lightning' || p.type === 'speed') {
              // Speed particles are lightning bolts
              ctx.fillStyle = p.color;
              
              // Draw lightning bolt shape
              ctx.beginPath();
              ctx.moveTo(0, -p.size);
              ctx.lineTo(p.size / 2, -p.size / 3);
              ctx.lineTo(0, p.size / 3);
              ctx.lineTo(-p.size / 2, p.size);
              ctx.closePath();
              ctx.fill();
              
              // Add streak effect
              ctx.globalAlpha = p.alpha * 0.5;
              ctx.strokeStyle = 'white';
              ctx.beginPath();
              ctx.moveTo(0, -p.size);
              ctx.lineTo(0, p.size);
              ctx.stroke();
              
            } else if (p.shape === 'hourglass' || p.type === 'slowTime') {
              // Slow time particles are hourglasses or clocks
              ctx.fillStyle = p.color;
              
              // Draw hourglass shape
              ctx.beginPath();
              ctx.moveTo(-p.size / 2, -p.size / 2);
              ctx.lineTo(p.size / 2, -p.size / 2);
              ctx.lineTo(-p.size / 2, p.size / 2);
              ctx.lineTo(p.size / 2, p.size / 2);
              ctx.closePath();
              ctx.fill();
              
              // Add clock hand effect
              ctx.globalAlpha = p.alpha * 0.8;
              ctx.strokeStyle = 'white';
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(0, -p.size * 0.7);
              ctx.stroke();
              
            } else if (p.shape === 'star' || p.type === 'points') {
              // Points particles are stars
              ctx.fillStyle = p.color;
              
              // Draw star shape
              const spikes = 5;
              const outerRadius = p.size;
              const innerRadius = p.size * 0.4;
              
              ctx.beginPath();
              for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const starAngle = (Math.PI / spikes) * i;
                ctx.lineTo(
                  Math.cos(starAngle) * radius,
                  Math.sin(starAngle) * radius
                );
              }
              ctx.closePath();
              ctx.fill();
              
              // Add sparkle effect
              if (Math.random() < 0.3) {
                ctx.globalAlpha = p.alpha * Math.random();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-p.size, 0);
                ctx.lineTo(p.size, 0);
                ctx.moveTo(0, -p.size);
                ctx.lineTo(0, p.size);
                ctx.stroke();
              }
              
            } else {
              // Default circular particle for other types
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.fill();
          }
          
          ctx.restore();
          }
        }
      };
    }
    
    // Array to store active power-up effects
    powerUpEffects = [];

    // Initialize sound effects
    let soundEnabled = true;
    const sounds = {
      carCrash: new Audio('sounds/car_crash.mp3'),
      cyclistCrash: new Audio('sounds/cyclist_crash.mp3'),
      pedestrianCrash: new Audio('sounds/pedestrian_crash.mp3'),
      powerup: new Audio('sounds/powerup.mp3'),
      shield: new Audio('sounds/shield.mp3'),
      speed: new Audio('sounds/speed.mp3'),
      slowTime: new Audio('sounds/slow_time.mp3'),
      points: new Audio('sounds/points.mp3'),
      gameStart: new Audio('sounds/game_start.mp3'),
      gameOver: new Audio('sounds/game_over.mp3'),
      scooterEngine: new Audio('sounds/scooter_engine.mp3'),
      drunkLevel: new Audio('sounds/drunk_level_up.mp3')
    };

    // For sounds that might overlap, we need to handle them specially
    let engineSound = null;
    let engineSoundPlaying = false;

    // Function to play sound effects
    function playSoundEffect(soundName) {
      if (!soundEnabled) return;
      
      // Handle looping engine sound differently
      if (soundName === 'scooterEngine') {
        if (!engineSoundPlaying) {
          engineSound = sounds.scooterEngine.cloneNode();
          engineSound.loop = true;
          engineSound.volume = 0.4;
          engineSound.play().catch(e => console.warn('Could not play engine sound:', e));
          engineSoundPlaying = true;
        }
        return;
      }
      
      // Stop engine sound if requested
      if (soundName === 'stopEngine' && engineSoundPlaying) {
        if (engineSound) {
          engineSound.pause();
          engineSound = null;
        }
        engineSoundPlaying = false;
        return;
      }
      
      // For other sounds, clone the audio element to allow overlapping sounds
      if (sounds[soundName]) {
        const sound = sounds[soundName].cloneNode();
        
        // Set appropriate volume based on sound type
        if (soundName.includes('Crash') || soundName === 'collision') {
          sound.volume = 0.8;
        } else if (soundName === 'gameOver') {
          sound.volume = 0.9;
        } else {
          sound.volume = 0.6;
        }
        
        sound.play().catch(e => console.warn(`Could not play ${soundName} sound:`, e));
      }
    }

    // Toggle sound function
    function toggleSound() {
      soundEnabled = !soundEnabled;
      
      if (!soundEnabled && engineSoundPlaying) {
        playSoundEffect('stopEngine');
      } else if (soundEnabled && gameRunning) {
        playSoundEffect('scooterEngine');
      }
      
      // Update UI indicator if it exists
      const soundToggle = document.getElementById('soundToggle');
      if (soundToggle) {
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
      }
    }

    function getRandomSafetyTip() {
      const safetyTips = [
        "Husk hjelm når du kjører sparkesykkel!",
        "Ikke kjør sparkesykkel i påvirket tilstand.",
        "Følg trafikkreglene og vis hensyn til andre.",
        "Hold lav fart på fortau og i gågater.",
        "Bruk refleks og lys i mørket!",
        "Vær ekstra forsiktig i regn og på vått underlag.",
        "Sjekk bremsene før du starter turen.",
        "Ikke kjør med flere på sparkesykkelen.",
        "Se opp for fotgjengere - de har førsterett på fortauet!",
        "Parker sparkesykkelen ansvarlig så den ikke er i veien."
      ];

      // If drunk, customize message based on drunk level
      if (isDrunk && drunkLevel > 0.1) {
        if (drunkLevel >= 0.6) {
          return "Å kjøre i beruset tilstand er farlig og ulovlig. I virkeligheten kan dette føre til alvorlige konsekvenser både for deg og andre.";
        } else if (drunkLevel >= 0.3) {
          return "Å kjøre sparkesykkel i beruset tilstand gir høy ulykkesrisiko og er ulovlig med straff på linje med promillekjøring!";
        } else {
          return "Selv med litt alkohol i blodet er det farlig og ulovlig å kjøre sparkesykkel!";
        }
      } else {
        return safetyTips[Math.floor(Math.random() * safetyTips.length)];
      }
    }

    // Initialize sound toggle button
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        toggleSound();
      });
    }
    
    // Initialize clear data button
    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        // Vis bekreftelsesdialog
        const confirmClear = confirm('Er du sikker på at du vil slette alle highscores og innstillinger? Dette kan ikke angres!');
        
        if (confirmClear) {
          // Slett all data fra localStorage
          localStorage.removeItem('highscores');
          localStorage.removeItem('highScore');
          localStorage.removeItem('darkMode');
          
          // Nullstill highscore variabelen og visningen
          highScore = 0;
          highScoreDisplay.textContent = '0';
          
          // Gjenopprett tom highscore-liste
          localStorage.setItem('highscores', JSON.stringify([]));
          
          // Vis bekreftelsesmelding
          showMessage('Alle lagrede data er slettet!', 3000);
        }
      });
    }

    // Initialiser high score
    highScoreDisplay.textContent = highScore;

    // Initialiser highscores i localStorage hvis det ikke finnes
    if (!localStorage.getItem('highscores')) {
      localStorage.setItem('highscores', JSON.stringify([]));
    }
    
    // Funksjon for å hente highscores
    function getHighscores() {
      return JSON.parse(localStorage.getItem('highscores') || '[]');
    }
    
    // Funksjon for å lagre highscores
    function saveHighscore(name, score) {
      const highscores = getHighscores();
      highscores.push({ name, score });
      
      // Sorter etter poeng (høyest først)
      highscores.sort((a, b) => b.score - a.score);
      
      // Behold kun de 10 beste
      const top10 = highscores.slice(0, 10);
      
      localStorage.setItem('highscores', JSON.stringify(top10));
      return top10;
    }
    
    // Sjekk om poengsum kvalifiserer for top 10
    function isTopTen(score) {
      const highscores = getHighscores();
      if (highscores.length < 10) return true;
      return score > highscores[highscores.length - 1].score;
    }

    // Funksjon for å vise top 10-liste
    function showHighscores(container) {
      const highscores = getHighscores();
      
      const highscoreList = document.createElement('div');
      highscoreList.className = 'highscore-list';
      
      const heading = document.createElement('h3');
      heading.textContent = 'Top 10 Poengsummer';
      highscoreList.appendChild(heading);
      
      // Legg til en tabell-header med kolonner
      const tableHeader = document.createElement('div');
      tableHeader.className = 'highscore-header';
      tableHeader.innerHTML = '<span class="rank-header">Rank</span><span class="name-header">Navn</span><span class="score-header">Poeng</span>';
      highscoreList.appendChild(tableHeader);
      
      // Lag en tabellaktig visning i stedet for en liste
      const table = document.createElement('div');
      table.className = 'highscore-table';
      
      if (highscores.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'no-scores';
        emptyMessage.textContent = 'Ingen highscores ennå!';
        table.appendChild(emptyMessage);
      } else {
        // Legg til en funksjon for å lukke alle aktive navnepopups
        function closeAllNamePopups() {
          document.querySelectorAll('.name-popup').forEach(popup => popup.remove());
        }
        
        // Legg til click event listener på dokumentet for å lukke popups
        document.addEventListener('click', function(e) {
          if (!e.target.closest('.name-cell')) {
            closeAllNamePopups();
          }
        });
        
        highscores.forEach((entry, index) => {
          const row = document.createElement('div');
          row.className = 'highscore-row';
          if (index < 3) row.classList.add(`rank-${index+1}`);
          
          const rankCell = document.createElement('span');
          rankCell.className = 'rank-cell';
          rankCell.textContent = `${index + 1}.`;
          
          const nameCell = document.createElement('span');
          nameCell.className = 'name-cell';
          nameCell.textContent = entry.name;
          
          // For lange navn, legg til klikk-funksjonalitet
          if (entry.name.length > 15) {
            nameCell.classList.add('clickable-name');
            nameCell.setAttribute('data-fullname', entry.name);
            
            // Legg til click handler
            nameCell.addEventListener('click', function(e) {
              e.stopPropagation();
              
              // Hvis det allerede finnes en popup, fjern den
              closeAllNamePopups();
              
              // Opprett popup
              const popup = document.createElement('div');
              popup.className = 'name-popup';
              
              // Legg til X-lukkeknapp
              const closeButton = document.createElement('button');
              closeButton.className = 'popup-close-btn';
              closeButton.innerHTML = '&times;';
              closeButton.addEventListener('click', function(e) {
                e.stopPropagation();
                popup.remove();
              });
              
              // Legg til innholdet (navnet)
              const nameContent = document.createElement('div');
              nameContent.className = 'popup-content';
              nameContent.textContent = this.getAttribute('data-fullname');
              
              // Sett sammen popup
              popup.appendChild(closeButton);
              popup.appendChild(nameContent);
              
              // Posisjoner popup under navnet
              const rect = this.getBoundingClientRect();
              popup.style.top = `${rect.bottom + window.scrollY}px`;
              popup.style.left = `${rect.left + window.scrollX}px`;
              
              document.body.appendChild(popup);
            });
          }
          
          const scoreCell = document.createElement('span');
          scoreCell.className = 'score-cell';
          scoreCell.textContent = entry.score;
          
          row.appendChild(rankCell);
          row.appendChild(nameCell);
          row.appendChild(scoreCell);
          
          table.appendChild(row);
        });
      }
      
      highscoreList.appendChild(table);
      container.appendChild(highscoreList);
    }
  } catch (error) {
    console.error('Game initialization error:', error);
    alert('Error starting game: ' + error.message);
  }
  
  // Initialize game
  updatePowerUpDisplay();
  initRoadLines();
});
