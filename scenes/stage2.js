// Stage 2: Rooftop Runner - Inspired by Canabalt
// Jayceon emerges from a window and runs across building rooftops to catch the missile

// Stage 2 specific game options (don't overwrite global gameOptions)
window.stage2Options = {
    platformStartSpeed: 350,                   // Slightly faster base speed for rooftops
    platformSpeedIncrease: 20,                 // Faster acceleration on rooftops
    maxPlatformSpeed: 900,                     // Higher max speed for dramatic effect
    playerGravity: 1400,                       // Slightly higher gravity for building jumps
    jumpForce: 450,                            // Higher jump force for building gaps
    maxJumpHold: 350,                          // Longer jump hold for gap clearing
    jumpHoldForce: 18,                         // More jump control
    playerStartPosition: 200,                  // Player's default X position
    jumps: 1,                                  // Single jump mechanic like Canabalt
    difficultyIncreaseInterval: 8,             // Faster difficulty increase
    obstacleSpawnChance: 0.3,                  // Base probability of spawning obstacles
    midGameSpawnIncrease: 0.2,                 // Spawn increase at 50% progress
    finalSprintSpawnRate: 0.7,                 // High spawn rate during final sprint
    finalSprintThreshold: 75,                  // Final sprint starts at 75% progress
    stageDuration: 60,                         // 60 second time limit
    stageTargetDistance: 18000,                // Slightly longer distance for rooftops
    missileSpeed: 1.65,                        // Missile speed (completes in ~60 seconds)
    momentumLossPerCollision: 20,              // Higher penalty for hitting obstacles
    momentumRecoveryRate: 0.15,                // Faster recovery on rooftops
    // Rooftop-specific settings
    minBuildingGap: 80,                        // Minimum gap between buildings
    maxBuildingGap: 200,                       // Maximum gap between buildings
    buildingHeightVariation: 100,              // Height difference between buildings
    obstacleVariety: 4                         // Different types of obstacles
};

class Stage2 extends Phaser.Scene {
    constructor() {
        super("Stage2");
        this.hideOnScreenButtonsHandler = null;
    }

    preload() {
        this.load.image("building", "./assets/sprites/platformb.png");
        this.load.image("player", "./assets/sprites/player.png");
        this.load.image("obstacle", "./assets/sprites/player.png");
        this.load.image("missile", "./assets/sprites/player.png");
    }    create() {
        // Initialize game state for rooftop running
        this.gameState = {
            score: 0,
            level: 1,
            currentSpeed: window.stage2Options.platformStartSpeed,
            stageDistance: 0,
            stageProgress: 0,
            missilePosition: 0,
            momentum: 100,
            gameOver: false,
            gameComplete: false,
            distanceTraveled: 0,
            collisionCooldown: 0,
            lastScoreSegment: 0,
            obstaclesAvoided: 0,
            collisions: 0,
            completionReason: "",
            lastBuildingHeight: this.sys.game.config.height * 0.8 // Track building heights
        };

        // Initialize arrays for obstacles and buildings
        this.obstacles = [];
        this.buildings = [];
        this.pitfalls = [];

        // Initialize DOM UI
        this.initializeUI();
        
        // Make on-screen buttons visible
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'block';
        if (this.domElements.dashButton) this.domElements.dashButton.style.display = 'block';

        // Setup game elements
        this.initializeBuildings();
        this.setupPlayer();
        this.setupMissile();
        this.setupObstacles();
        this.setupInput();
        this.setupPhysics();
        
        // Show rooftop instructions
        this.showRooftopInstructions();

        // Initialize movement state
        this.isDiving = false;
        this.isJumping = false;
        this.jumpHoldTime = 0;
        this.playerOnBuilding = true; // Track if player is on a building vs falling

        // Dash state initialization (same as Stage 1)
        this.dashReady = true;
        this.dashCooldown = 1000;
        this.lastDashTime = 0;
        this.isDashing = false;
        this.dashDuration = 200;
        this.dashJumpWindow = 100;
        this.dashInvulnerable = false;

        // DashJump properties
        this.dashJumpForce = 450;
        this.dashJumpHorizontalBoost = 1400; // Even more powerful for building gaps
        this.dashJumpMaxHeight = 500;
        this.lastCanDashJump = false;
        this.isDashJumping = false;
        this.dashJumpStartTime = 0;
        this.dashJumpDuration = 900; // Longer duration for building crossings

        this.setupMobileControls();
    }

    showRooftopInstructions() {
        const instructions = this.domElements.instructions;
        if (instructions) {
            instructions.innerHTML = `
                <strong>Rooftop Runner</strong><br>
                Smash through the window and catch the missile!<br>
                <br>
                <strong>Controls:</strong><br>
                🎮 <strong>Jump:</strong> Tap screen, SPACE key, or JUMP button<br>
                ⚡ <strong>Dash:</strong> SHIFT key, double-tap, or DASH button<br>
                🚀 <strong>Dash Jump:</strong> Jump right after dashing for mega jump!<br>
                🔙 <strong>Menu:</strong> ESC key<br>
                <br>
                <em>💡 Avoid rooftop obstacles and DON'T FALL!</em><br>
                <em>🏢 Jump between buildings to catch the missile!</em><br>
                <em>🔥 The missile is getting away - GO FAST!</em>
            `;
            instructions.style.display = 'block';
            this.time.delayedCall(6000, () => {
                if (instructions) instructions.style.display = 'none';
            });
        }
    }

    setupMissile() {
        this.missile = this.add.sprite(0, this.sys.game.config.height * 0.1, "missile");
        this.missile.setScale(0.6);
        this.missile.setTint(0xff2222); // Bright red missile
        this.missile.setDepth(10);
    }

    initializeUI() {
        this.domElements = {
            scoreDisplay: document.getElementById('scoreDisplay'),
            levelDisplay: document.getElementById('levelDisplay'),
            speedDisplay: document.getElementById('speedDisplay'),
            timeDisplay: document.getElementById('timeDisplay'),
            momentumDisplay: document.getElementById('momentumDisplay'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            gameOverReason: document.getElementById('gameOverReason'),
            gameOverScore: document.getElementById('gameOverScore'),
            instructions: document.getElementById('instructionsDisplay'),
            jumpButton: document.getElementById('jumpButton'),
            dashButton: document.getElementById('dashButton'),
            gameOverRestartButtonMobile: document.getElementById('gameOverRestartButtonMobile'),
            gameOverMenuButtonMobile: document.getElementById('gameOverMenuButtonMobile'),
        };

        this.updateUI();
    }

    updateUI() {
        if (!this.domElements.scoreDisplay) return;

        this.domElements.scoreDisplay.textContent = `Score: ${this.gameState.score}`;
        this.domElements.levelDisplay.textContent = `Progress: ${Math.round(this.gameState.stageProgress)}%`;
        this.domElements.speedDisplay.textContent = `Speed: ${Math.round(this.getAdjustedSpeed())}`;
        this.domElements.timeDisplay.textContent = `Missile: ${Math.round(this.gameState.missilePosition)}%`;
        
        const momentum = Math.round(this.gameState.momentum);
        this.domElements.momentumDisplay.textContent = `Momentum: ${momentum}%`;
        
        // Color coding for momentum
        if (momentum >= 80) {
            this.domElements.momentumDisplay.style.color = '#00ff00';
        } else if (momentum >= 60) {
            this.domElements.momentumDisplay.style.color = '#ffff00';
        } else if (momentum >= 40) {
            this.domElements.momentumDisplay.style.color = '#ff6600';
        } else {
            this.domElements.momentumDisplay.style.color = '#ff0000';
        }
    }

    getAdjustedSpeed() {
        return this.gameState.currentSpeed * (this.gameState.momentum / 100);
    }

    // Building system - creates rooftops with gaps and varying heights
    initializeBuildings() {
        this.buildingGroup = this.add.group({
            removeCallback: function(building) {
                building.scene.buildingPool.add(building);
            }
        });

        this.buildingPool = this.add.group({
            removeCallback: function(building) {
                building.scene.buildingGroup.add(building);
            }
        });

        // Create initial buildings
        this.createInitialRooftops();
        this.originY = this.gameState.lastBuildingHeight - 50;
    }

    createInitialRooftops() {
        const screenWidth = this.sys.game.config.width;
        let currentX = 0;
        
        // Create 5 initial buildings with gaps
        for (let i = 0; i < 5; i++) {
            const buildingWidth = Phaser.Math.Between(200, 400);
            const buildingHeight = this.calculateNextBuildingHeight(i === 0);
            
            this.addBuilding(currentX, buildingHeight, buildingWidth);
            currentX += buildingWidth;
              // Add gap between buildings (except for the last one)
            if (i < 4) {
                const gapSize = Phaser.Math.Between(
                    window.stage2Options.minBuildingGap, 
                    window.stage2Options.maxBuildingGap
                );
                currentX += gapSize;
            }
        }
    }

    calculateNextBuildingHeight(isFirst = false) {
        if (isFirst) {
            return this.sys.game.config.height * 0.8;
        }
          // Create height variation for interesting jumps
        const baseHeight = this.sys.game.config.height * 0.8;
        const variation = window.stage2Options.buildingHeightVariation;
        const heightChange = Phaser.Math.Between(-variation, variation);
        
        const newHeight = this.gameState.lastBuildingHeight + heightChange;
        
        // Keep buildings within reasonable bounds
        const minHeight = this.sys.game.config.height * 0.6;
        const maxHeight = this.sys.game.config.height * 0.9;
        
        this.gameState.lastBuildingHeight = Phaser.Math.Clamp(newHeight, minHeight, maxHeight);
        return this.gameState.lastBuildingHeight;
    }

    addBuilding(xPosition, yPosition, width) {
        let building;
        if (this.buildingPool.getLength()) {
            building = this.buildingPool.getFirst();
            building.x = xPosition + width/2;
            building.y = yPosition;
            building.active = true;
            building.visible = true;
            this.buildingPool.remove(building);
        } else {
            building = this.physics.add.sprite(xPosition + width/2, yPosition, "building");
            building.setImmovable(true);
            this.buildingGroup.add(building);
        }
        
        building.displayWidth = width;
        building.setVelocityX(this.getAdjustedSpeed() * -1);
        building.setTint(0x666666); // Gray buildings for urban feel
        
        return building;
    }    // Setup player for rooftop running
    setupPlayer() {
        this.player = this.physics.add.sprite(
            window.stage2Options.playerStartPosition,
            this.originY,
            "player"
        );
        this.player.setGravityY(window.stage2Options.playerGravity);
        this.player.setCollideWorldBounds(true, false, false, false, true);
        this.playerJumps = 0;
        this.jumpTimer = 0;
        this.jumpBufferDuration = 150;
        
        this.player.setTint(0x0088ff); // Jayceon's blue color
    }

    // Setup rooftop obstacles (air conditioners, satellite dishes, etc.)
    setupObstacles() {
        // Create different types of obstacles
        this.obstacleTypes = [
            { tint: 0xcccccc, scale: 0.8, name: "AC Unit" },      // Gray AC unit
            { tint: 0x888888, scale: 1.2, name: "Satellite" },   // Dark satellite dish
            { tint: 0xaa6644, scale: 0.6, name: "Furniture" },   // Brown patio furniture
            { tint: 0x444444, scale: 1.0, name: "Vent" }         // Dark vent
        ];

        // Initialize obstacle sprites
        for (let i = 0; i < 6; i++) {
            const obstacleType = this.obstacleTypes[i % this.obstacleTypes.length];
            const obstacle = this.physics.add.sprite(
                this.sys.game.config.width + 200 + (i * 300),
                this.originY,
                "obstacle"
            );
            obstacle.setImmovable(true);
            obstacle.setTint(obstacleType.tint);
            obstacle.setScale(obstacleType.scale);
            obstacle.obstacleType = obstacleType.name;
            obstacle.isHit = false;
            
            this.obstacles.push(obstacle);
        }

        this.updateObstacleSpeeds();
    }

    updateObstacleSpeeds() {
        const baseSpeed = this.getAdjustedSpeed();
        
        this.obstacles.forEach((obstacle, index) => {
            // Slight speed variation for obstacles
            const speedVariation = 0.95 + (Math.random() * 0.1);
            obstacle.setVelocityX(baseSpeed * speedVariation * -1);
        });
    }

    setupInput() {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        this.pointerIsDown = false;
        this.pointerJustDown = false;

        this.input.on('pointerdown', (pointer) => {
            this.pointerIsDown = true;
            this.pointerJustDown = true;
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.target !== this.sys.game.canvas) {
                return;
            }
            this.pointerIsDown = false;
        });
    }

    setupMobileControls() {
        const scene = this;

        // Jump button controls
        if (this.domElements.jumpButton) {
            this.domElements.jumpButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = true;
                scene.pointerJustDown = true;
                scene.jumpStartTime = scene.time.now;
            });
            
            this.domElements.jumpButton.addEventListener('mousedown', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = true;
                scene.pointerJustDown = true;
                scene.jumpStartTime = scene.time.now;
            });
            
            this.domElements.jumpButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                scene.pointerIsDown = false;
                scene.jumpHoldTime = 0;
            });
            
            this.domElements.jumpButton.addEventListener('mouseup', function(e) {
                e.preventDefault();
                scene.pointerIsDown = false;
                scene.jumpHoldTime = 0;
            });
        }

        // Dash button controls
        if (this.domElements.dashButton) {
            this.domElements.dashButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                if (scene.dashReady && scene.isPlayerGrounded()) {
                    scene.doDash();
                    scene.dashReady = false;
                    scene.lastDashTime = scene.time.now;
                }
            });

            this.domElements.dashButton.addEventListener('mousedown', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                if (scene.dashReady && scene.isPlayerGrounded()) {
                    scene.doDash();
                    scene.dashReady = false;
                    scene.lastDashTime = scene.time.now;
                }
            });
        }

        // Game over button controls
        if (this.domElements.gameOverRestartButtonMobile) {
            this.domElements.gameOverRestartButtonMobile.addEventListener('click', () => {
                if (scene.gameState.gameOver || scene.gameState.gameComplete) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    scene.scene.restart();
                }
            });
        }

        if (this.domElements.gameOverMenuButtonMobile) {
            this.domElements.gameOverMenuButtonMobile.addEventListener('click', () => {
                if (scene.gameState.gameOver || scene.gameState.gameComplete) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    if (scene.domElements.instructions) scene.domElements.instructions.style.display = 'none';
                    scene.scene.start("SceneSwitcher");
                }
            });
        }

        // Hide mobile buttons when keyboard is used
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
        }
        this.hideOnScreenButtonsHandler = () => {
            if (scene.domElements.dashButton) scene.domElements.dashButton.style.display = 'none';
            if (scene.domElements.jumpButton) scene.domElements.jumpButton.style.display = 'none';
        };
        window.addEventListener('keydown', this.hideOnScreenButtonsHandler);
    }

    setupPhysics() {
        // Player collision with buildings
        this.physics.add.collider(this.player, this.buildingGroup, (player, building) => {
            this.playerOnBuilding = true;
        });
        
        // Player collision with obstacles
        this.obstacles.forEach(obstacle => {
            this.physics.add.overlap(this.player, obstacle, this.hitObstacle, null, this);
        });
    }

    // Collision with rooftop obstacles
    hitObstacle(player, obstacle) {
        // Skip collision if player is dashing or dash jumping
        if (this.isDashing || this.dashInvulnerable) {
            console.log("🛡️ Obstacle avoided - player is dashing!");
            this.cameras.main.flash(50, 0, 255, 0, false);
            this.gameState.score += 10;
            this.gameState.obstaclesAvoided++;
            return;
        }        if (!obstacle.isHit && this.gameState.collisionCooldown <= 0) {
            this.gameState.momentum = Math.max(10, 
                this.gameState.momentum - window.stage2Options.momentumLossPerCollision);
            this.gameState.collisions++;
            
            this.gameState.collisionCooldown = 45;
            
            this.cameras.main.shake(150, 0.015);
            this.player.setTint(0xff4444);
            
            this.time.delayedCall(300, () => {
                if (!this.isDashing && !this.dashInvulnerable && !this.isDashJumping) {
                    this.player.setTint(0x0088ff);
                }
            });

            this.updateAllSpeeds();
            
            obstacle.isHit = true;
            this.time.delayedCall(500, () => {
                obstacle.isHit = false;
            });
        }
    }

    // Check if player has fallen into a pit
    checkPitfall() {
        // If player falls below the lowest possible building level, they've fallen into a pit
        const pitfallThreshold = this.sys.game.config.height * 0.95;
        
        if (this.player.y > pitfallThreshold) {
            this.triggerGameOver("You fell between the buildings!");
            return true;
        }
        return false;
    }    // Missile chase mechanics (same as Stage 1)
    updateMissileChase(delta) {
        this.gameState.missilePosition += (window.stage2Options.missileSpeed * delta) / 1000;
        this.gameState.missilePosition = Math.min(100, this.gameState.missilePosition);

        this.missile.x = (this.gameState.missilePosition / 100) * this.sys.game.config.width;

        const deltaSeconds = delta / 1000;
        this.gameState.stageDistance += this.getAdjustedSpeed() * deltaSeconds;
        this.gameState.stageProgress = Math.min(
            100,
            (this.gameState.stageDistance / window.stage2Options.stageTargetDistance) * 100
        );

        this.checkStageCompletion();
    }

    checkStageCompletion() {
        if (this.gameState.stageProgress >= 100 && !this.gameState.gameComplete && !this.gameState.gameOver) {
            this.completeStage("You caught the missile on the rooftops!");
        }
        else if (this.gameState.missilePosition >= 100 && !this.gameState.gameComplete && !this.gameState.gameOver) {
            this.triggerGameOver("The missile escaped into the sky!");
        }
    }

    completeStage(reason) {
        this.gameState.gameComplete = true;
        this.gameState.completionReason = reason;
        
        const timeBonus = Math.round((100 - this.gameState.missilePosition) * 15);
        const momentumBonus = Math.round(this.gameState.momentum * 8);
        const avoidanceBonus = this.gameState.obstaclesAvoided * 15;
        
        this.gameState.score += timeBonus + momentumBonus + avoidanceBonus;
        
        this.physics.pause();
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = `${reason} Mission Complete!`;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.flash(500, 0, 255, 0);
        this.player.setTint(0x00ff00);
    }

    updateScore(points = 15) {
        this.gameState.score += points;
        this.gameState.obstaclesAvoided++;
    }

    triggerGameOver(reason) {
        this.gameState.gameOver = true;
        this.physics.pause();
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = reason;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.shake(500, 0.025);
        this.player.setTint(0xff0000);
    }

    // Jump and movement mechanics
    handleJumpOrDive() {
        if (this.gameState.gameOver || this.gameState.gameComplete) return;
        
        console.log("=== ROOFTOP JUMP INPUT ===");
        console.log("Player grounded:", this.isPlayerGrounded());
        console.log("Can dash jump:", this.canDashJump());
        
        if (this.isPlayerGrounded()) {
            if (this.canDashJump()) {
                console.log("✅ ROOFTOP DASH JUMP!");
                this.dashJump();
                return;
            }
              console.log("✅ ROOFTOP JUMP");
            this.player.setVelocityY(window.stage2Options.jumpForce * -1);
            this.isDiving = false;
            this.isJumping = true;
            this.jumpHoldTime = 0;
            this.jumpStartTime = this.time.now;
            this.playerOnBuilding = false;
            
            this.player.setTint(0x00ff00);
        } else if (!this.isDiving && !this.isPlayerGrounded()) {
            console.log("✅ FAST DESCENT");
            this.isDiving = true;
            this.player.setVelocityY(1100); // Faster descent on rooftops
            this.player.setTint(0xffff00);
        }
    }

    isPlayerGrounded() {
        return this.player.body.touching.down || this.player.body.blocked.down;
    }

    // Dash mechanics (adapted from Stage 1)
    doDash() {
        console.log("=== ROOFTOP DASH ===");
        
        this.isDashing = true;
        this.isDashTweening = true;
        this.dashInvulnerable = true;
        
        this.tweens.killTweensOf(this.player);
        
        if (this.isDashJumpReturning || this.isReturningFromDashJump) {
            this.isDashJumpReturning = false;
            this.isReturningFromDashJump = false;
        }
          const dashDistance = Phaser.Math.Between(30, 90); // Slightly longer dashes on rooftops
        const targetX = Math.max(
            window.stage2Options.playerStartPosition,
            Math.min(
                this.player.x + dashDistance,
                window.stage2Options.playerStartPosition + 120
            )
        );
        
        this.player.setVelocityX(700); // Faster dash on rooftops
        this.player.setTint(0x00ffff);
        
        this.tweens.add({
            targets: this.player,
            x: targetX,
            duration: this.dashDuration,
            ease: 'Power2.easeOut',
            onComplete: () => {
                console.log("🏃 Rooftop dash complete");
            }
        });
        
        this.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            
            if (this.isPlayerGrounded()) {
                this.player.setVelocityX(0);
            }
            
            this.time.delayedCall(this.dashJumpWindow, () => {                if (!this.isDashJumping && !this.isReturningFromDashJump) {
                    this.tweens.add({
                        targets: this.player,
                        x: window.stage2Options.playerStartPosition,
                        duration: 600,
                        ease: 'Power2.easeInOut',
                        onComplete: () => {
                            this.isDashTweening = false;
                            this.dashInvulnerable = false;
                            
                            if (this.isPlayerGrounded() && !this.isDashing && !this.isDashJumping) {
                                this.player.setTint(0x0088ff);
                            }
                        }
                    });
                } else {
                    this.isDashTweening = false;
                }
            });
        });
    }

    dashJump() {
        console.log("🚀 === ROOFTOP DASH JUMP! ===");
        
        this.tweens.killTweensOf(this.player);
        this.isDashTweening = false;
          this.player.setVelocityY(window.stage2Options.jumpForce * -1);
        this.player.setVelocityX(this.dashJumpHorizontalBoost);
        
        this.isDashJumping = true;
        this.dashJumpStartTime = this.time.now;
        this.dashJumpDuration = 900; // Longer for building gaps
        
        this.dashInvulnerable = true;
        this.playerOnBuilding = false;
        
        this.isDiving = false;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        this.jumpStartTime = this.time.now;
        
        this.player.setTint(0xffff00);
        this.cameras.main.shake(250, 0.012);
        
        this.isDashing = false;
    }

    canDashJump() {
        const timeSinceDash = this.time.now - this.lastDashTime;
        const withinWindow = timeSinceDash <= (this.dashDuration + this.dashJumpWindow);
        const canJump = withinWindow && !this.isDashJumping;
        
        return canJump;
    }

    updateAllSpeeds() {
        const adjustedSpeed = this.getAdjustedSpeed();
        
        // Update building speeds
        this.buildingGroup.getChildren().forEach(building => {
            building.setVelocityX(adjustedSpeed * -1);
        });
        
        // Update obstacle speeds
        this.updateObstacleSpeeds();
    }

    // Obstacle management with rooftop-specific spawn logic
    manageObstacles() {
        this.obstacles.forEach((obstacle, index) => {
            if (obstacle.x < -obstacle.displayWidth / 2) {
                const spawnChance = this.getDynamicObstacleSpawnChance();
                
                if (Math.random() < spawnChance) {
                    // Spawn obstacle on a building (not in gaps)
                    const validBuildings = this.buildingGroup.getChildren().filter(building => 
                        building.x > this.sys.game.config.width * 0.8
                    );
                    
                    if (validBuildings.length > 0) {
                        const randomBuilding = Phaser.Utils.Array.GetRandom(validBuildings);
                        obstacle.x = randomBuilding.x + Phaser.Math.Between(-50, 50);
                        obstacle.y = randomBuilding.y - 50; // Place on top of building
                        
                        // Randomize obstacle type
                        const obstacleType = Phaser.Utils.Array.GetRandom(this.obstacleTypes);
                        obstacle.setTint(obstacleType.tint);
                        obstacle.setScale(obstacleType.scale);
                        obstacle.obstacleType = obstacleType.name;
                    } else {
                        // No valid buildings, spawn far away
                        obstacle.x = this.sys.game.config.width + 2000;
                    }
                } else {
                    obstacle.x = this.sys.game.config.width + 1000 + (index * 300);
                    obstacle.y = this.originY; // Default position
                }
            }
        });
    }    getDynamicObstacleSpawnChance() {
        const progress = this.gameState.stageProgress;
        const baseChance = window.stage2Options.obstacleSpawnChance;
        
        if (progress >= window.stage2Options.finalSprintThreshold) {
            return 0.8; // High obstacle density in final sprint
        } else if (progress >= 50) {
            return 0.5; // Medium density mid-game
        } else {
            return baseChance; // Base density early game
        }
    }

    // Building management - create new buildings as old ones scroll off
    manageBuildings() {
        let rightmostX = -Infinity;
        
        // Clean up buildings that have scrolled off screen
        this.buildingGroup.getChildren().forEach(building => {
            rightmostX = Math.max(rightmostX, building.x + building.displayWidth / 2);
            
            if (building.x + building.displayWidth / 2 < -200) {
                this.buildingGroup.killAndHide(building);
                this.buildingGroup.remove(building);
            }
        });

        // Add new buildings if needed
        if (rightmostX < this.sys.game.config.width * 1.5) {
            this.addNewBuildingCluster(rightmostX);
        }
    }

    addNewBuildingCluster(startX) {
        let currentX = startX + 50;
        
        // Add 2-3 new buildings with gaps
        const numBuildings = Phaser.Math.Between(2, 3);
        
        for (let i = 0; i < numBuildings; i++) {
            const buildingWidth = Phaser.Math.Between(180, 350);
            const buildingHeight = this.calculateNextBuildingHeight();
            
            this.addBuilding(currentX, buildingHeight, buildingWidth);
            currentX += buildingWidth;
              // Add gap between buildings
            if (i < numBuildings - 1) {
                const gapSize = Phaser.Math.Between(
                    window.stage2Options.minBuildingGap,
                    window.stage2Options.maxBuildingGap
                );
                currentX += gapSize;
            }
        }
    }

    startDashJumpReturn() {
        this.player.setVelocityX(0);
        this.isDashJumpReturning = true;
        
        this.tweens.killTweensOf(this.player);
        
        this.dashInvulnerable = true;
          this.tweens.add({
            targets: this.player,
            x: window.stage2Options.playerStartPosition,
            duration: 1000,
            ease: 'Power3.easeOut',
            onComplete: () => {
                this.isReturningFromDashJump = false;
                this.isDashJumpReturning = false;
                this.dashInvulnerable = false;
                
                if (this.isPlayerGrounded() && !this.isDashing && !this.isDashJumping && !this.isDiving) {
                    this.player.setTint(0x0088ff);
                }
            }
        });
    }

    update(time, delta) {
        if (this.gameState.gameOver || this.gameState.gameComplete) {
            // Game over controls
            if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                this.scene.restart();
            }
            if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                this.scene.start("SceneSwitcher");
            }
            return;
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
            if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
            this.scene.start("SceneSwitcher");
            return;
        }

        // Check for pitfall (falling between buildings)
        if (this.checkPitfall()) {
            return;
        }        // Position management (same logic as Stage 1)
        if (!this.isDashJumping && 
            !this.isReturningFromDashJump && 
            !this.isDashing && 
            !this.isDashTweening &&
            !this.isDashJumpReturning) {
            this.player.x = window.stage2Options.playerStartPosition;
        } else if (this.isDashJumping) {
            const startPos = window.stage2Options.playerStartPosition;
            const minX = startPos - 120;
            const maxX = startPos + 450; // Even more range for building gaps
            this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
            
            if (this.player.x < startPos - 60) {
                this.player.setVelocityX(Math.max(this.player.body.velocity.x, 60));
            }
        }

        // Dash jump sustained movement
        if (this.isDashJumping) {
            const timeSinceDashJump = this.time.now - this.dashJumpStartTime;
            if (timeSinceDashJump < this.dashJumpDuration) {
                const progress = timeSinceDashJump / this.dashJumpDuration;
                
                let forwardSpeed;
                if (progress < 0.3) {
                    forwardSpeed = 700; // Strong initial boost
                } else if (progress < 0.6) {
                    forwardSpeed = 350;
                } else if (progress < 0.9) {
                    forwardSpeed = 350 - ((progress - 0.6) / 0.3) * 350;
                } else {
                    forwardSpeed = 0;
                }
                
                this.player.setVelocityX(forwardSpeed);
            } else {
                this.isDashJumping = false;
                this.isReturningFromDashJump = true;
                this.startDashJumpReturn();
            }
        }

        if (this.returnWaitingForLanding && this.isPlayerGrounded()) {
            this.returnWaitingForLanding = false;
            this.startDashJumpReturn();
        }

        // Update missile chase
        this.updateMissileChase(delta);

        // Handle jump input
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown) {
            this.handleJumpOrDive();
        }        // Variable jump height
        if (this.isJumping && (this.spaceKey.isDown || this.pointerIsDown)) {
            this.jumpHoldTime += delta;
            if (this.jumpHoldTime < window.stage2Options.maxJumpHold) {
                const scaledJumpForce = window.stage2Options.jumpHoldForce * (delta / 16.67);
                this.player.setVelocityY(this.player.body.velocity.y - scaledJumpForce);
            }
        }

        // Check if player fell off the bottom of the screen
        if (this.player.y > this.sys.game.config.height + 100) {
            this.triggerGameOver("You fell into the abyss between buildings!");
            return;
        }

        // Collision cooldown
        this.gameState.collisionCooldown--;
        if (this.gameState.collisionCooldown < 0) {
            this.gameState.collisionCooldown = 0;
        }

        // Momentum recovery
        if (this.gameState.momentum < 100) {
            this.gameState.momentum = Math.min(100, 
                this.gameState.momentum + window.gameOptions.momentumRecoveryRate);
            this.updateAllSpeeds();
        }

        // Manage obstacles and buildings
        this.manageObstacles();
        this.manageBuildings();

        // Jump state management
        if (this.jumpTimer > 0) {
            if (time - this.jumpTimer > this.jumpBufferDuration) {
                this.jumpTimer = 0;
                this.isJumping = false;
            }
        }

        // Ground state changes
        if (this.isPlayerGrounded() && !this.wasGrounded) {
            if (this.isDiving) {
                this.isDiving = false;
                this.player.setTint(0x0088ff);
            }
            this.isJumping = false;
            this.jumpTimer = 0;
            this.jumpHoldTime = 0;
            this.playerJumps = 0;
            this.playerOnBuilding = true;
        }

        this.wasGrounded = this.isPlayerGrounded();

        // Dash input handling
        const dashPressed = this.shiftKey.isDown && this.isPlayerGrounded() && !this.isJumping;

        if (dashPressed && this.dashReady) {
            this.doDash();
            this.dashReady = false;
            this.lastDashTime = this.time.now;
        }

        if (!this.shiftKey.isDown && (this.time.now - this.lastDashTime > this.dashCooldown)) {
            this.dashReady = true;
        }

        // Visual feedback for different states
        if (this.canDashJump()) {
            this.player.setTint(0xffaa00); // Orange for dash jump window
        } else if (this.isDashJumping) {
            this.player.setTint(0xffff00); // Yellow during dash jump
        } else if (this.isReturningFromDashJump) {
            this.player.setTint(0xaaffaa); // Light green during return
        } else if (this.isDashing) {
            this.player.setTint(0x00ffff); // Cyan during dash
        } else if (this.dashInvulnerable) {
            this.player.setTint(0x88ffff); // Light cyan during invulnerable
        } else if (this.isDiving) {
            this.player.setTint(0xffff00); // Yellow during dive
        } else if (this.isPlayerGrounded()) {
            this.player.setTint(0x0088ff); // Normal blue when grounded
        } else {
            this.player.setTint(0x00ff00); // Green when jumping
        }

        this.updateUI();
        this.pointerJustDown = false;
    }

    shutdown() {
        // Clean up obstacles
        if (this.obstacles) {
            this.obstacles.forEach(obstacle => {
                if (obstacle && obstacle.active) {
                    obstacle.destroy();
                }
            });
            this.obstacles = [];
        }
        
        // Clean up event handlers
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
            this.hideOnScreenButtonsHandler = null;
        }
        
        this.pointerIsDown = false;
        this.pointerJustDown = false;
    }
}

window.Stage2 = Stage2;