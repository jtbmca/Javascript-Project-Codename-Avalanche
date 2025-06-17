// Stage 2: Rooftop Runner - Inspired by Canabalt
// Jayceon emerges from a window and runs across building rooftops to catch the missile

// --- STAGE 2 CONFIGURATION ---
// Stage 2 specific game options 
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
    minBuildingGap: 80,                        // Minimum gap between buildings
    maxBuildingGap: 200,                       // Maximum gap between buildings
    buildingHeightVariation: 100,              // Height difference between buildings    
    obstacleVariety: 4                         // Different types of obstacles
};

// --- STAGE 2 CLASS DEFINITION ---

class Stage2 extends Phaser.Scene {
    constructor() {
        super("Stage2");
        this.hideOnScreenButtonsHandler = null;
        this.sceneTransitioning = false;
    }    // --- ASSET LOADING ---

    preload() {        // Load building and sprites
        this.load.image("building", "./assets/sprites/platformb.png");
        this.load.image("missile", "./assets/sprites/missile.png");
        this.load.image("bg3", "./assets/sprites/bg3.jpg");
        
        // Load new obstacle sprites
        this.load.image("ac", "./assets/sprites/ac.png");
        this.load.image("chair", "./assets/sprites/chair.png");
        this.load.image("dish", "./assets/sprites/dish.png");
        this.load.image("vent", "./assets/sprites/vent.png");
        
        // Load player animation sprite sheets
        const sheetConfig = { frameWidth: 192, frameHeight: 108 };
        this.load.spritesheet('player_run1', './assets/sprites/player_run_sheet1.png', sheetConfig);
        this.load.spritesheet('player_run2', './assets/sprites/player_run_sheet2.png', sheetConfig);
        this.load.spritesheet('player_run3', './assets/sprites/player_run_sheet3.png', sheetConfig);        
        this.load.spritesheet('player_run4', './assets/sprites/player_run_sheet4.png', sheetConfig);
    }

    // --- SCENE INITIALIZATION ---

    create() {
        this.sceneTransitioning = false;
        
        this.createPlayerAnimations();
        this.initializeGameState();
        this.initializeUI();
        this.setupGameElements();
        this.showRooftopInstructions();
        this.initializePlayerStates();
        this.setupMobileControls();
    }

    // --- ANIMATION SETUP ---

    createPlayerAnimations() {
        const runFrames = [
            ...this.anims.generateFrameNumbers('player_run1', { start: 0, end: 25 }),
            ...this.anims.generateFrameNumbers('player_run2', { start: 0, end: 25 }),
            ...this.anims.generateFrameNumbers('player_run3', { start: 0, end: 25 }),
            ...this.anims.generateFrameNumbers('player_run4', { start: 0, end: 25 })
        ];
        
        this.anims.create({
            key: 'run',
            frames: runFrames,
            frameRate: 16,            
            repeat: -1
        });
    }

    // --- GAME STATE INITIALIZATION ---

    initializeGameState() {
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
            lastBuildingHeight: this.sys.game.config.height * 0.8
        };

        this.buildings = [];        
        this.pitfalls = [];
    }

    // --- GAME ELEMENTS SETUP ---

    setupGameElements() {
        // Make on-screen buttons visible
        this.setButtonsVisible(true);
        
        // Setup background first
        this.setupBackground();
        
        // Setup game elements in proper order
        this.setupObstacles();
        this.initializeBuildings();
        this.setupPlayer();
        this.setupMissile();
        this.setupInput();
        this.setupPhysics();
    }

    setupBackground() {
        // Add bg3 background
        this.background = this.add.image(0, 0, 'bg3').setOrigin(0, 0).setDepth(-100);
        this.background.displayWidth = this.sys.game.config.width;
        this.background.displayHeight = this.sys.game.config.height;
    }

    setButtonsVisible(visible) {
        const display = visible ? 'block' : 'none';
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = display;
        if (this.domElements.dashButton) this.domElements.dashButton.style.display = display;
    }

    initializePlayerStates() {
        // Movement state
        this.isDiving = false;
        this.isJumping = false;
        this.jumpHoldTime = 0;
        this.playerOnBuilding = true;
        this.wasGrounded = false;
        this.jumpTimer = 0;
        this.jumpBufferDuration = 150;
        this.playerJumps = 0;
        
        // Dash state
        this.dashReady = true;
        this.dashCooldown = 1000;
        this.lastDashTime = 0;
        this.isDashing = false;
        this.dashDuration = 200;
        this.dashJumpWindow = 100;
        this.dashInvulnerable = false;
        this.isDashTweening = false;

        // Dash jump state
        this.dashJumpForce = 450;
        this.dashJumpHorizontalBoost = 1400;
        this.dashJumpMaxHeight = 500;
        this.lastCanDashJump = false;
        this.isDashJumping = false;
        this.dashJumpStartTime = 0;
        this.dashJumpDuration = 900;
        this.isReturningFromDashJump = false;
        this.isDashJumpReturning = false;
        this.returnWaitingForLanding = false;
        
        // Visual state        
        this.showingCollisionTint = false;
        this.currentTintState = 'none';
    }    

    // --- INSTRUCTIONS AND UI SETUP ---
    showRooftopInstructions() {
        const instructions = this.domElements.instructions;
        if (!instructions) return;
        
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
        });    }
    
    // --- MISSILE SETUP ---
    
    setupMissile() {
        this.missile = this.add.sprite(0, this.sys.game.config.height * 0.1, "missile");
        this.missile.setScale(0.6);
        this.missile.setDepth(10);
        
        // Add small blinking red light on the missile
        this.missileLight = this.add.ellipse(0, 0, 8, 16, 0xff0000); // Larger ellipse for 0.6 scale missile (doubled from Stage 1)
        this.missileLight.setDepth(11); // Above the missile
        this.missileLight.setAlpha(0.8); // Set slight opacity (80% visible)
        
        // Position the light on the missile (adjust x,y offset as needed for your sprite)
        this.updateMissileLightPosition();
        
        // Add blinking animation to just the light
        this.tweens.add({
            targets: this.missileLight,
            alpha: 0.2, // Fade to very dim
            duration: 2000,  // Ominous slow blink
            yoyo: true,     // Go back to full brightness
            repeat: -1,     // Infinite loop
            ease: 'Sine.easeInOut'
        });
    }
    
    // Helper function to keep light positioned on missile
    updateMissileLightPosition() {
        if (this.missile && this.missileLight) {
            // Adjust these offsets based on where you want the light on your missile sprite
            // Positive x = right, negative x = left
            // Positive y = down, negative y = up
            // Scaled proportionally for 0.6 scale missile (vs 0.3 in Stage 1)
            const lightOffsetX = 55; // 50 pixels to the right (doubled from Stage 1's 25)
            const lightOffsetY = 0; // 10 pixels above missile center (doubled from Stage 1's -5)
            
            this.missileLight.x = this.missile.x + lightOffsetX;
            this.missileLight.y = this.missile.y + lightOffsetY;
        }
    }

    // --- UI INITIALIZATION ---

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

        // Update display elements
        this.domElements.scoreDisplay.textContent = `Score: ${this.gameState.score}`;
        this.domElements.levelDisplay.textContent = `Progress: ${Math.round(this.gameState.stageProgress)}%`;
        this.domElements.speedDisplay.textContent = `Speed: ${Math.round(this.getAdjustedSpeed())}`;
        this.domElements.timeDisplay.textContent = `Missile: ${Math.round(this.gameState.missilePosition)}%`;
        
        this.updateMomentumDisplay();
    }

    updateMomentumDisplay() {
        const momentum = Math.round(this.gameState.momentum);
        this.domElements.momentumDisplay.textContent = `Momentum: ${momentum}%`;
        
        // Apply color coding based on momentum level
        const colors = {
            high: '#00ff00',    // Green (80%+)
            medium: '#ffff00',  // Yellow (60-79%)
            low: '#ff6600',     // Orange (40-59%)
            critical: '#ff0000' // Red (<40%)
        };
        
        let color;
        if (momentum >= 80) color = colors.high;
        else if (momentum >= 60) color = colors.medium;
        else if (momentum >= 40) color = colors.low;
        else color = colors.critical;
        
        this.domElements.momentumDisplay.style.color = color;
    }    getAdjustedSpeed() {
        return this.gameState.currentSpeed * (this.gameState.momentum / 100);
    }

    // --- BUILDING SYSTEM ---
    // Creates rooftops with gaps and varying heights
    initializeBuildings() {
        this.buildingGroup = this.add.group({
            removeCallback: (building) => {
                building.scene.buildingPool.add(building);
            }
        });

        this.buildingPool = this.add.group({
            removeCallback: (building) => {
                building.scene.buildingGroup.add(building);
            }
        });

        this.createInitialRooftops();
        this.originY = this.landingPlatformY - 50;
    }

    createInitialRooftops() {
        const screenWidth = this.sys.game.config.width;
        let currentX = 0;
        
        // Create guaranteed landing platform first
        const landingPlatformWidth = 600;
        const landingPlatformHeight = this.calculateNextBuildingHeight(true);
        this.landingPlatformY = landingPlatformHeight;
        
        // Position landing platform to guarantee player catch
        const playerStartX = window.stage2Options.playerStartPosition;
        const landingStartX = Math.max(0, playerStartX - 200);
        const landingEndX = landingStartX + landingPlatformWidth;
        
        // Ensure platform extends past player start position
        if (landingEndX < playerStartX + 100) {
            const extendedWidth = landingPlatformWidth + 200;
            this.addBuilding(landingStartX, landingPlatformHeight, extendedWidth);
            currentX = landingStartX + extendedWidth;
        } else {
            this.addBuilding(landingStartX, landingPlatformHeight, landingPlatformWidth);
            currentX = landingEndX;
        }
        
        // Create 4 additional buildings with random gaps
        for (let i = 1; i < 5; i++) {
            const gapSize = Phaser.Math.Between(
                window.stage2Options.minBuildingGap, 
                window.stage2Options.maxBuildingGap
            );
            currentX += gapSize;
            
            const buildingWidth = Phaser.Math.Between(200, 400);
            const buildingHeight = this.calculateNextBuildingHeight(false);
            
            this.addBuilding(currentX, buildingHeight, buildingWidth);
            currentX += buildingWidth;
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
        
        // Reuse from pool or create new
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
        building.setTint(0x666666);
          // Initialize building's obstacle array
        if (!building.obstacles) {
            building.obstacles = [];
        }
        
        this.addObstaclesToBuilding(building);
        return building;
    }

    // --- PLAYER SETUP ---

    setupPlayer() {
        // Position player to land exactly on the landing platform
        // Use a slight offset above the platform to ensure clean landing
        const playerStartY = this.landingPlatformY - 60; // Start slightly above platform
        
        this.player = this.physics.add.sprite(
            window.stage2Options.playerStartPosition,
            playerStartY,
            "player_run1"
        );        this.player.setGravityY(window.stage2Options.playerGravity);
        // Disable world bounds so player can fall through bottom
        this.player.setCollideWorldBounds(false);
          // Wait for texture to load, then align feet to platform
        this.player.on('texturecomplete', () => {
            this.player.y = this.landingPlatformY - (this.player.displayHeight / 2) + 4; // +4 for fine-tuning
            // Tighter collision mask - reduced width and height for more precise collision detection
            this.player.body.setSize(45, 75);  // Reduced from 60x90 to 45x75 (25% width reduction, 17% height reduction)
            this.player.body.setOffset(73, 8); // Adjusted offset to center the smaller collision box on the character
        });
        // If already loaded, set immediately
        if (this.player.texture.key) {
            this.player.y = this.landingPlatformY - (this.player.displayHeight / 2) + 4;
            // Tighter collision mask - reduced width and height for more precise collision detection
            this.player.body.setSize(45, 75);  // Reduced from 60x90 to 45x75 (25% width reduction, 17% height reduction)
            this.player.body.setOffset(73, 8); // Adjusted offset to center the smaller collision box on the character
        }
        
        this.player.anims.play('run');    }

    // --- OBSTACLE SYSTEM ---
    // Setup rooftop obstacles (air conditioners, satellite dishes, etc.)
    setupObstacles() {
        // Create different types of obstacles with their corresponding sprites
        this.obstacleTypes = [
            { sprite: "ac", scale: 0.8, name: "AC Unit", yOffset: -40, collisionWidth: 45, collisionHeight: 35 },
            { sprite: "dish", scale: 1.2, name: "Satellite", yOffset: -50, collisionWidth: 50, collisionHeight: 40 },
            { sprite: "chair", scale: 0.6, name: "Furniture", yOffset: -35, collisionWidth: 25, collisionHeight: 30 },
            { sprite: "vent", scale: 1.0, name: "Vent", yOffset: -50, collisionWidth: 40, collisionHeight: 35 }
        ];

        // Create a pool of obstacle sprites for reuse
        this.obstaclePool = [];
        for (let i = 0; i < 12; i++) {
            const obstacle = this.physics.add.sprite(-1000, -1000, "ac"); // Default sprite, will be changed when used
            obstacle.setImmovable(true);
            obstacle.setVisible(false);
            obstacle.setActive(false);
            obstacle.isHit = false;
            obstacle.parentBuilding = null;
            this.obstaclePool.push(obstacle);
        }
    }

    // Add obstacles to a building, tied to its movement
    addObstaclesToBuilding(building) {
        const spawnChance = this.getDynamicObstacleSpawnChance();
        
        // Don't add obstacles to the landing platform (first building)
        if (building.x < this.sys.game.config.width * 0.3) {
            return;
        }
        
        if (Math.random() < spawnChance) {
            // Try to get an obstacle from the pool
            const availableObstacle = this.obstaclePool.find(obs => !obs.active);            if (availableObstacle) {
                // Set obstacle properties first to get the correct sprite
                const obstacleType = Phaser.Utils.Array.GetRandom(this.obstacleTypes);
                availableObstacle.setTexture(obstacleType.sprite); // Use the new sprite instead of tint
                availableObstacle.setScale(obstacleType.scale);
                availableObstacle.obstacleType = obstacleType.name;
                availableObstacle.isHit = false;
                
                // Set collision boundaries for better collision detection
                availableObstacle.body.setSize(obstacleType.collisionWidth, obstacleType.collisionHeight);
                
                // Position obstacle on top of building with individual Y offset
                const offsetX = Phaser.Math.Between(-building.displayWidth/3, building.displayWidth/3);
                availableObstacle.x = building.x + offsetX;
                availableObstacle.y = building.y + obstacleType.yOffset; // Use individual Y offset
                availableObstacle.setActive(true);
                availableObstacle.setVisible(true);
                
                // Tie obstacle to building movement
                availableObstacle.parentBuilding = building;
                availableObstacle.setVelocityX(building.body.velocity.x);
                
                // Store reference in building
                building.obstacles.push(availableObstacle);
            }
        }
    }

    // Update obstacle positions to stay with their parent buildings
    updateObstaclePositions() {
        this.obstaclePool.forEach(obstacle => {
            if (obstacle.active && obstacle.parentBuilding) {
                // Keep obstacle moving with its parent building
                obstacle.setVelocityX(obstacle.parentBuilding.body.velocity.x);
                
                // If parent building is destroyed or off-screen, clean up obstacle
                if (!obstacle.parentBuilding.active || obstacle.parentBuilding.x < -300) {
                    this.cleanupObstacle(obstacle);
                }
            }
        });
    }

    // Clean up obstacle and return it to pool
    cleanupObstacle(obstacle) {
        obstacle.setActive(false);
        obstacle.setVisible(false);
        obstacle.x = -1000;
        obstacle.y = -1000;
        obstacle.setVelocityX(0);
        obstacle.isHit = false;
        
        // Remove from parent building's obstacle array
        if (obstacle.parentBuilding && obstacle.parentBuilding.obstacles) {
            const index = obstacle.parentBuilding.obstacles.indexOf(obstacle);
            if (index > -1) {
                obstacle.parentBuilding.obstacles.splice(index, 1);
            }        }
        
        obstacle.parentBuilding = null;
    }

    // --- INPUT HANDLING ---

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
            }            this.pointerIsDown = false;
        });    }

    // --- MOBILE CONTROLS SETUP ---
    setupMobileControls() {
        this.setupJumpButtonControls();
        this.setupDashButtonControls();
        this.setupGameOverButtonControls();
        this.setupKeyboardHideHandler();
    }

    setupJumpButtonControls() {
        if (!this.domElements.jumpButton) return;

        const jumpEvents = ['touchstart', 'mousedown'];
        const releaseEvents = ['touchend', 'mouseup'];

        jumpEvents.forEach(event => {
            this.domElements.jumpButton.addEventListener(event, (e) => {
                e.preventDefault();
                if (this.gameState.gameOver || this.gameState.gameComplete) return;
                this.pointerIsDown = true;
                this.pointerJustDown = true;
                this.jumpStartTime = this.time.now;
            });
        });

        releaseEvents.forEach(event => {
            this.domElements.jumpButton.addEventListener(event, (e) => {
                e.preventDefault();
                this.pointerIsDown = false;
                this.jumpHoldTime = 0;
            });
        });
    }

    setupDashButtonControls() {
        if (!this.domElements.dashButton) return;

        const dashEvents = ['touchstart', 'mousedown'];

        dashEvents.forEach(event => {
            this.domElements.dashButton.addEventListener(event, (e) => {
                e.preventDefault();
                if (this.gameState.gameOver || this.gameState.gameComplete) return;
                if (this.dashReady && this.isPlayerGrounded()) {
                    this.doDash();
                    this.dashReady = false;
                    this.lastDashTime = this.time.now;
                }
            });
        });
    }

    setupGameOverButtonControls() {
        this.setupGameOverButton(this.domElements.gameOverRestartButtonMobile, () => {
            this.scene.restart();
        });

        this.setupGameOverButton(this.domElements.gameOverMenuButtonMobile, () => {
            this.scene.start("SceneSwitcher");
        });
    }

    setupGameOverButton(button, action) {
        if (!button) return;

        const events = ['click', 'touchstart'];

        events.forEach(event => {
            button.addEventListener(event, (e) => {
                if (event === 'touchstart') e.preventDefault();
                
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    if (this.sceneTransitioning) return;
                    
                    this.sceneTransitioning = true;
                    this.hideUIElements();
                    action();
                }
            });
        });
    }

    setupKeyboardHideHandler() {
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
        }
        
        this.hideOnScreenButtonsHandler = () => {
            this.setButtonsVisible(false);
        };
        
        window.addEventListener('keydown', this.hideOnScreenButtonsHandler);
    }

    hideUIElements() {
        if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';        
        if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
    }

    // --- PHYSICS SETUP ---
    setupPhysics() {
        // Player collision with buildings
        this.physics.add.collider(this.player, this.buildingGroup, (player, building) => {
            this.playerOnBuilding = true;
        });
        
        // Player collision with obstacles - check all obstacles in pool
        this.obstaclePool.forEach(obstacle => {
            this.physics.add.overlap(this.player, obstacle, this.hitObstacle, null, this);        });    
    }

    // --- COLLISION HANDLING ---
    // Collision with rooftop obstacles
    hitObstacle(player, obstacle) {
        // Skip collision if obstacle is not active
        if (!obstacle.active) return;
        
        // Skip collision if player is dashing or dash jumping
        if (this.isDashing || this.dashInvulnerable) {
            console.log("🛡️ Obstacle avoided - player is dashing!");
            this.cameras.main.flash(50, 0, 255, 0, false);
            this.gameState.score += 10;
            this.gameState.obstaclesAvoided++;
            return;
        }
          if (!obstacle.isHit && this.gameState.collisionCooldown <= 0) {
            this.gameState.momentum = Math.max(10, 
                this.gameState.momentum - window.stage2Options.momentumLossPerCollision);
            this.gameState.collisions++;
            
            this.gameState.collisionCooldown = 45;
            
            // Add Stage 1's sophisticated collision tinting system
            this.showingCollisionTint = true;
            this.currentTintState = 'collision';
            
            // Visual feedback for collision - red flash and screen shake
            this.cameras.main.flash(50, 255, 0, 0, false); // Brief red flash
            this.cameras.main.shake(150, 0.015);
            this.player.setTint(0xff4444); // Red collision tint
            
            this.time.delayedCall(200, () => {
                this.showingCollisionTint = false;
                
                // Reset to appropriate tint state based on current player state
                if (this.isDashing || this.dashInvulnerable || this.isDashJumping || this.isReturningFromDashJump) {
                    this.player.setTint(0x4444ff); // Blue tint for invulnerability (consistent with Stage 1)
                    this.currentTintState = 'invulnerable';
                } else if (this.isDiving) {
                    this.player.setTint(0xffff00); // Yellow for diving
                    this.currentTintState = 'diving';
                } else {
                    this.player.clearTint();
                    this.currentTintState = 'none';
                }
            });

            this.updateAllSpeeds();
            
            obstacle.isHit = true;
            this.time.delayedCall(500, () => {
                obstacle.isHit = false;            });
        }    }

    // Check if player has fallen into a pit
    checkPitfall() {
        // Let player fall to bottom of screen (or slightly below) to show falling between buildings
        const pitfallThreshold = this.sys.game.config.height + 50; // 50 pixels below screen bottom
        
        // Debug: Log player position when falling
        if (this.player.y > this.sys.game.config.height * 0.8) {
            console.log(`Player Y: ${this.player.y}, Screen Height: ${this.sys.game.config.height}, Threshold: ${pitfallThreshold}`);
        }
        
        if (this.player.y > pitfallThreshold) {
            this.triggerGameOver("You fell between the buildings!");
            return true;
        }
        return false;
    }

    // --- MISSILE CHASE MECHANICS ---
    updateMissileChase(delta) {
        this.gameState.missilePosition += (window.stage2Options.missileSpeed * delta) / 1000;
        this.gameState.missilePosition = Math.min(100, this.gameState.missilePosition);

        this.missile.x = (this.gameState.missilePosition / 100) * this.sys.game.config.width;
        
        // Update missile light position to follow the missile
        this.updateMissileLightPosition();

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
        }        else if (this.gameState.missilePosition >= 100 && !this.gameState.gameComplete && !this.gameState.gameOver) {
            this.triggerGameOver("The missile destroys the city!");
        }    }        // --- STAGE COMPLETION ---
    completeStage(reason) {
        this.gameState.gameComplete = true;
        this.gameState.completionReason = reason;
        
        // CRITICAL: Immediately cut off all player input to prevent interference
        this.pointerJustDown = false;
        this.pointerIsDown = false;
        
        // Don't block transitions immediately - let buttons work for scene switching
        
        const timeBonus = Math.round((100 - this.gameState.missilePosition) * 15);
        const momentumBonus = Math.round(this.gameState.momentum * 8);
        const avoidanceBonus = this.gameState.obstaclesAvoided * 15;
        
        this.gameState.score += timeBonus + momentumBonus + avoidanceBonus;
        
        this.physics.pause();
          if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = `${reason} Mission Complete! Returning to menu...`;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
          this.cameras.main.flash(500, 0, 255, 0);
        this.player.setTint(0x00ff00);
          console.log("🎉 Stage 2 completed! Mission Complete!");
        
        // Transition back to SceneSwitcher after a delay to match other stages
        this.time.delayedCall(3000, () => {
            console.log("⏰ 3 second delay complete - starting transition to SceneSwitcher");
            if (this.sceneTransitioning) {
                console.log("⚠️ Scene already transitioning, aborting");
                return;
            }
            this.sceneTransitioning = true;
            console.log("🔄 Starting scene transition to SceneSwitcher");
            
            // Hide the completion screen before transitioning
            if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
            if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
            
            console.log("🚀 Calling this.scene.start('SceneSwitcher')");
            this.scene.start("SceneSwitcher");
        });
    }

    updateScore(points = 15) {
        this.gameState.score += points;
        this.gameState.obstaclesAvoided++;
    }    

    triggerGameOver(reason) {
        this.gameState.gameOver = true;
        this.physics.pause();
        
        // CRITICAL: Immediately cut off all player input to prevent auto-restart
        this.pointerJustDown = false;
        this.pointerIsDown = false;
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = reason;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.shake(500, 0.025);        this.player.setTint(0xff0000);
    }

    // --- JUMP AND MOVEMENT MECHANICS ---
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
            }              console.log("✅ ROOFTOP JUMP");
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

    // --- DASH MECHANICS ---
    // Dash mechanics (adapted from Stage 1)
    doDash() {
        console.log("=== ROOFTOP DASH ===");
        
        this.isDashing = true;
        this.isDashTweening = true;
        this.dashInvulnerable = true;
        
        this.tweens.killTweensOf(this.player);
        
        if (this.isDashJumpReturning || this.isReturningFromDashJump) {
            this.isDashJumpReturning = false;            this.isReturningFromDashJump = false;
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
        this.player.setTint(0x4444ff); // Blue tint for invulnerability (consistent with Stage 1)
        
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
              this.time.delayedCall(this.dashJumpWindow, () => {
                if (!this.isDashJumping && !this.isReturningFromDashJump) {
                    this.tweens.add({
                        targets: this.player,
                        x: window.stage2Options.playerStartPosition,
                        duration: 600,
                        ease: 'Power2.easeInOut',
                        onComplete: () => {
                            this.isDashTweening = false;
                            this.dashInvulnerable = false;
                              if (this.isPlayerGrounded() && !this.isDashing && !this.isDashJumping) {
                                this.player.clearTint(); // Show natural sprite colors
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
        
        // Update building speeds and their obstacles
        this.buildingGroup.getChildren().forEach(building => {
            building.setVelocityX(adjustedSpeed * -1);
            
            // Update any obstacles on this building
            if (building.obstacles) {
                building.obstacles.forEach(obstacle => {
                    if (obstacle.active) {
                        obstacle.setVelocityX(adjustedSpeed * -1);
                    }
                });
            }        });
    }    

    getDynamicObstacleSpawnChance() {
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

    // --- BUILDING MANAGEMENT ---
    // Create new buildings as old ones scroll off
    manageBuildings() {
        let rightmostX = -Infinity;
        
        // Clean up buildings that have scrolled off screen
        this.buildingGroup.getChildren().forEach(building => {
            rightmostX = Math.max(rightmostX, building.x + building.displayWidth / 2);
            
            if (building.x + building.displayWidth / 2 < -200) {
                // Clean up any obstacles on this building before destroying it
                if (building.obstacles) {
                    building.obstacles.forEach(obstacle => {
                        this.cleanupObstacle(obstacle);
                    });
                    building.obstacles = [];
                }
                
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
            currentX += buildingWidth;              // Add gap between buildings
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
                    this.player.clearTint(); // Show natural sprite colors
                }}
        });    }    

    // --- MAIN UPDATE LOOP ---
    update(time, delta) {
        if (this.gameState.gameOver || this.gameState.gameComplete) {
            // CRITICAL: Reset all input flags immediately during game over to prevent auto-restart
            this.pointerJustDown = false;
            this.pointerIsDown = false;
            
            // Game over controls
            if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
                if (this.sceneTransitioning) return; // Prevent multiple transitions
                this.sceneTransitioning = true;
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';                
                this.scene.restart();
            }
            
            if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
                if (this.sceneTransitioning) return; // Prevent multiple transitions
                this.sceneTransitioning = true;
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                this.scene.start("SceneSwitcher");
            }            return;
        }
          
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            if (this.sceneTransitioning) return; // Prevent multiple transitions
            this.sceneTransitioning = true;
            if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
            if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
            this.scene.start("SceneSwitcher");
            return;
        }        // Check for pitfall (falling between buildings)
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
        }        // Update missile chase
        this.updateMissileChase(delta);
        
        // Handle jump input - CRITICAL: Block ALL input during game over/complete states
        if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown) && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.handleJumpOrDive();
        }

        // Variable jump height - CRITICAL: Block during game over states
        if (this.isJumping && (this.spaceKey.isDown || this.pointerIsDown) && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.jumpHoldTime += delta;
            if (this.jumpHoldTime < window.stage2Options.maxJumpHold) {
                const scaledJumpForce = window.stage2Options.jumpHoldForce * (delta / 16.67);
                this.player.setVelocityY(this.player.body.velocity.y - scaledJumpForce);
            }
        }

        // Check if player fell off the bottom of the screen
        if (this.player.y > this.sys.game.config.height + 100) {
            this.triggerGameOver("You fell between buildings!");
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
        this.updateObstaclePositions();
        this.manageBuildings();

        // Jump state management
        if (this.jumpTimer > 0) {
            if (time - this.jumpTimer > this.jumpBufferDuration) {
                this.jumpTimer = 0;
                this.isJumping = false;
            }
        }

        // Ground state changes
        if (this.isPlayerGrounded() && !this.wasGrounded) {            if (this.isDiving) {
                this.isDiving = false;
                this.player.clearTint(); // Show natural sprite colors
            }
            this.isJumping = false;
            this.jumpTimer = 0;
            this.jumpHoldTime = 0;
            this.playerJumps = 0;
            this.playerOnBuilding = true;
        }

        this.wasGrounded = this.isPlayerGrounded();        

        // Dash input handling - CRITICAL: Block during game over states
        const dashPressed = this.shiftKey.isDown && this.isPlayerGrounded() && !this.isJumping && 
                           !this.gameState.gameOver && !this.gameState.gameComplete;

        if (dashPressed && this.dashReady) {
            this.doDash();
            this.dashReady = false;
            this.lastDashTime = this.time.now;
        }

        if (!this.shiftKey.isDown && (this.time.now - this.lastDashTime > this.dashCooldown)) {
            this.dashReady = true;
        }        
        
        // Enhanced visual feedback for different states - using Stage 1's sophisticated tinting system
        if (!this.showingCollisionTint) {
            let targetTintState;
            
            if (this.isDiving) {
                targetTintState = 'diving';
            } else if (this.isDashing || this.dashInvulnerable || this.isDashJumping || this.isReturningFromDashJump) {
                targetTintState = 'invulnerable';
            } else if (this.canDashJump()) {
                targetTintState = 'dash_jump_ready';
            } else if (this.isPlayerGrounded()) {
                targetTintState = 'grounded';
            } else {
                targetTintState = 'jumping';
            }
            
            // Only change tint if state has changed
            if (this.currentTintState !== targetTintState) {
                if (targetTintState === 'diving') {
                    this.player.setTint(0xffff00); // Yellow for diving
                } else if (targetTintState === 'invulnerable') {
                    this.player.setTint(0x4444ff); // Blue tint for invulnerability (consistent with Stage 1)
                } else if (targetTintState === 'dash_jump_ready') {
                    this.player.setTint(0xffaa00); // Orange for dash jump window                } else if (targetTintState === 'grounded') {
                    this.player.clearTint(); // Show natural sprite colors when grounded
                } else if (targetTintState === 'jumping') {
                    this.player.setTint(0x00ff00); // Green when jumping
                } else {
                    this.player.clearTint(); // Default state - show natural sprite colors
                }
                this.currentTintState = targetTintState;
            }
        }

        this.updateUI();        
        this.pointerJustDown = false;    }    

    // --- CLEANUP ---
    shutdown() {
        // Clean up obstacle pool
        if (this.obstaclePool) {
            this.obstaclePool.forEach(obstacle => {
                if (obstacle && obstacle.active) {
                    obstacle.destroy();
                }
            });
            this.obstaclePool = [];
        }
        
        // Clean up building obstacles
        if (this.buildingGroup) {
            this.buildingGroup.getChildren().forEach(building => {
                if (building.obstacles) {
                    building.obstacles.forEach(obstacle => {
                        this.cleanupObstacle(obstacle);
                    });
                    building.obstacles = [];
                }
            });
        }
        
        // Clean up event handlers
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
            this.hideOnScreenButtonsHandler = null;
        }
        
        // Hide all DOM elements when shutting down
        if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
        if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
        
        this.pointerIsDown = false;
        this.pointerJustDown = false;
        
        // Cancel any pending scene transitions
        if (this.scene.scene.time) {
            this.scene.scene.time.removeAllEvents();        }
    }
}

// --- STAGE 2 EXPORT ---
window.Stage2 = Stage2;