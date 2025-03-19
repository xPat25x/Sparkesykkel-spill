document.addEventListener('DOMContentLoaded', () => {
  try {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const scoreDisplay = document.getElementById('score');

    // Sett lerretstørrelse basert på elementets offset
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Spillvariabler
    let gameRunning = false;
    let gameOver = false;
    let score = 0;
    let animationId;
    let obstacleSpeed = 5;
    let obstacleFrequency = 100; // Lavere tall = hyppigere hindringer
    let frameCount = 0;
    let debugMode = false; // Set to true to see hitboxes

    // Ytterligere innstillinger
    let timeOfDay = 25; 
    let dayNightCycle = false;
    let weather = 'clear'; 
    let motionBlurEnabled = false;
    let cameraShakeEnabled = true;
    let dynamicCameraEnabled = false;
    // Fjernet 2D/3D valg-logikk

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
      ctx.fillStyle = '#388E3C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tegn vei - nå fra topp til bunn
      ctx.fillStyle = '#424242';
      ctx.fillRect(leftEdge, 0, roadWidth, canvas.height);

      // Tegn fortau - nå fra topp til bunn
      ctx.fillStyle = '#BDBDBD';
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

      // Tegn veigrensene med gule linjer
      ctx.strokeStyle = '#FFEB3B';
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.moveTo(leftEdge, 0);
      ctx.lineTo(leftEdge, canvas.height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(leftEdge + roadWidth, 0);
      ctx.lineTo(leftEdge + roadWidth, canvas.height);
      ctx.stroke();
    }

    // Tegn veien
    function drawRoad() {
        drawRoad2D();
    }

    // Last spillerbilde (scooter) med fallback
    const playerImage = new Image();
    playerImage.src = 'scooter.png';
    let usePlayerImage = false;
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
      speed: 7,
      tilt: 0,
      targetTilt: 0,
      speedX: 0,
      speedY: 0,
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.tilt);
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
      update(keys) {
        this.speedX *= 0.9;
        this.speedY *= 0.9;
        if ((keys.ArrowLeft || keys.a) && this.x > this.width / 2) {
          this.speedX -= 0.5;
          this.targetTilt = -0.2;
        }
        if ((keys.ArrowRight || keys.d) && this.x < canvas.width - this.width / 2) {
          this.speedX += 0.5;
          this.targetTilt = 0.2;
        }
        if (!(keys.ArrowLeft || keys.a || keys.ArrowRight || keys.d)) {
          this.targetTilt = 0;
        }
        if ((keys.ArrowUp || keys.w) && this.y > this.height / 2) {
          this.speedY -= 0.5;
        }
        if ((keys.ArrowDown || keys.s) && this.y < canvas.height - this.height / 2) {
          this.speedY += 0.5;
        }
        this.tilt += (this.targetTilt - this.tilt) * 0.1;
        this.speedX = Math.max(-this.speed, Math.min(this.speedX, this.speed));
        this.speedY = Math.max(-this.speed, Math.min(this.speedY, this.speed));
        this.x += this.speedX;
        this.y += this.speedY;
        this.x = Math.max(this.width / 2, Math.min(this.x, canvas.width - this.width / 2));
        this.y = Math.max(this.height / 2, Math.min(this.y, canvas.height - this.height / 2));
      }
    };

    // Hindringer og hindringstyper
    let obstacles = [];
    const obstacleTypes = [
      { name: 'car1', color: '#E53935', isCar: true },
      { name: 'car2', color: '#4CAF50', isCar: true },
      { name: 'car3', color: '#3F51B5', isCar: true },
      { name: 'cyclist', color: '#00BCD4', isCar: false },
      { name: 'pedestrian', color: '#FFC107', isCar: false }
    ];

    function createObstacle() {
      const minSize = 25;
      const maxSize = 70;
      const size = Math.random() * (maxSize - minSize) + minSize;
      const roadWidth = canvas.width * 0.85;
      const leftEdge = (canvas.width - roadWidth) / 2;
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
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
      const finalSpeed = obstacleSpeed * speedFactor * snowFactor;

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
        update() {
          if (this.inCollision && this.type === 'pedestrian') return;

          this.y += this.speed;
          
          if (this.bobAmount > 0) {
            this.y += Math.sin(this.animationPhase) * this.bobAmount;
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
                
                this.x += diffX * 0.03;
                
                this.steeringDirection = diffX > 0 ? 0.5 : -0.5;
                
                const halfWidth = this.width / 2;
                const minX = leftEdge + halfWidth;
                const maxX = rightEdge - halfWidth;
                this.x = Math.max(minX, Math.min(this.x, maxX));
                
                this.lane = Math.floor((this.x - leftEdge) / laneWidth);
              }
            } else {
              if (this.steeringCooldown > 0) this.steeringCooldown--;
              if (this.steeringCooldown <= 0 && Math.random() < 0.01) {
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
                  this.x += (targetX - this.x) * steeringSpeed;
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
          } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
          }
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
      if (activePowerUps.some(p => p.type === 'shield')) return false;
      
      // More precise collision using rectangles instead of circles
      // Calculate player hitbox (slightly smaller than visual size)
      const playerHitbox = {
        x: player.x - player.width * 0.3,
        y: player.y - player.height * 0.4,
        width: player.width * 0.6,
        height: player.height * 0.8
      };
      
      // Calculate obstacle hitbox based on its type
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
      return playerHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
             playerHitbox.x + playerHitbox.width > obstacleHitbox.x &&
             playerHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
             playerHitbox.y + playerHitbox.height > obstacleHitbox.y;
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

    function gameLoop() {
      if (!gameRunning) return;
      
      // Reset transforms at the beginning of each frame
      ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
      clearCanvas();
      
      if (motionBlurEnabled && (Math.abs(player.speedX) > 3 || Math.abs(player.speedY) > 3)) {
        applyMotionBlur();
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      drawRoad();
      drawWeatherEffects();
      frameCount++;
      if (frameCount % obstacleFrequency === 0) {
        obstacles.push(createObstacle());
        if (frameCount % 500 === 0) {
          obstacleSpeed += 0.3;
          if (obstacleFrequency > 40) obstacleFrequency -= 3;
        }
      }
      if (frameCount % 200 === 0 && obstacles.length < 8) {
        obstacles.push(createObstacle());
      }
      if (frameCount % 200 === 0) {
        collectibles.push(createCollectible());
      }
      player.update(keys);
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
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const isOffScreen = obstacle.update();
        if (isOffScreen) {
          obstacles.splice(i, 1);
          score++;
          scoreDisplay.textContent = score;
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
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const collectible = collectibles[i];
        const isOffScreen = collectible.update();
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
      let zoomStep = 0.02;
      let slowMotionFrames = collidedObstacle.isCar || collidedObstacle.type === 'cyclist' ? 40 : 20; // Add some slow motion for pedestrians too
      
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
        const progressStep = slowMotionFrames > 0 ? 0.2 : 0.5;
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
            
            // Add some smaller text
            ctx.font = 'bold 15px Arial';
            ctx.shadowBlur = 5;
            ctx.fillText(collidedObstacle.isCar ? 'BIL KRÆSJ!' : 'SYKKEL KRÆSJ!', 0, 25);
            
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

    function startGame() {
      if (gameRunning) return;
      
      // Cancel any ongoing animations
      cancelAnimationFrame(animationId);
      
      // Reset canvas completely to fix zoom issues
      ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      gameRunning = true;
      gameOver = false;
      score = 0;
      obstacles = [];
      collectibles = [];
      activePowerUps = [];
      frameCount = 0;
      obstacleSpeed = 5;
      obstacleFrequency = 100;
      player.x = canvas.width / 2;
      player.y = canvas.height - 100;
      player.tilt = 0;
      player.speedX = 0;
      player.speedY = 0;
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
      const gameOverElem = document.querySelector('.game-over');
      if (gameOverElem) {
        gameOverElem.remove();
      }
      animationId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
      gameRunning = false;
      gameOver = true;
      cancelAnimationFrame(animationId);
      
      // Reset transform to prevent zoom issues
      ctx.resetTransform ? ctx.resetTransform() : ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      restartBtn.style.display = 'block';
      const randomTip = safetyTips[Math.floor(Math.random() * safetyTips.length)];
      const gameOverElem = document.createElement('div');
      gameOverElem.classList.add('game-over');
      gameOverElem.innerHTML = `
        <h2>GAME OVER!</h2>
        <p>Din poengsum: ${score}</p>
        <p class="safety-tip">${randomTip}</p>
      `;
      canvas.parentNode.appendChild(gameOverElem);
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

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

    let collectibles = [];
    let powerUpTypes = [
      { name: 'shield', color: '#64B5F6', duration: 350, icon: '🛡️' },
      { name: 'speed', color: '#FFD54F', duration: 250, icon: '⚡' },
      { name: 'slowTime', color: '#81C784', duration: 300, icon: '⏱️' },
      { name: 'points', color: '#E91E63', duration: 1, icon: '💯' }
    ];
    let activePowerUps = [];

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
      }
      
      // Visual feedback
      const flash = document.createElement('div');
      flash.className = 'powerup-collected';
      flash.style.backgroundColor = collectible.color + '50';
      document.querySelector('.game-container').appendChild(flash);
      setTimeout(() => flash.remove(), 500);
      
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
        update() {
          this.y += this.speed;
          return this.y > canvas.height + this.height;
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
  } catch (error) {
    console.error('Game initialization error:', error);
    alert('Error starting game: ' + error.message);
  }
  
  // Initialize game
  updatePowerUpDisplay();
  initRoadLines();
});
