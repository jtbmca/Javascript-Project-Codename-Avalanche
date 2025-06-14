// Enhance3d game options for street-level endless runner
window.gameOptions = window.gameOptions || {
    platformStartSpeed: 300,                   // Initial speed of moving platforms (pixels/second)
    platformSpeedIncrease: 15,                 // Speed increase per level/interval (pixels/second)
    maxPlatformSpeed: 800,                     // Maximum platform speed cap (pixels/second)
    playerGravity: 1200,                       // Downward gravity force applied to player
    jumpForce: 400,                            // Initial upward velocity when jumping (reduced from 600 to 400 for proper tap jump)
    maxJumpHold: 300,                          // Maximum time player can hold jump for variable height (milliseconds)
    jumpHoldForce: 15,                         // Additional upward force applied per frame while holding jump (reduced from 60 to 15 for proper scaling)
    playerStartPosition: 200,                  // Player's default X position on screen (pixels from left)
    playerStartY: null,                        // Player's default Y position (null = auto, or set a value)
    jumps: 1,                                  // Maximum number of jumps allowed (multi-jump capability)
    difficultyIncreaseInterval: 10,            // Interval for increasing game difficulty (units/time)
    pedestrianSpawnChance: 0.4,                // Base probability of spawning pedestrians (0-1, where 1 = 100%)
    midGameSpawnIncrease: 0.2,                 // Additional spawn rate at 50% stage progress (+0.2 at 50% progress)
    finalSprintSpawnRate: 0.8,                 // Spawn rate during final sprint phase (3x spawn rate: 0.3 * 3 = 0.9)
    finalSprintThreshold: 80,                  // Stage progress percentage when final sprint begins (80% = intense spawn phase)
    stageDuration: 60,                         // Total time to complete the stage (60 seconds)
    stageTargetDistance: 17000,                // Distance player must travel to complete stage (pixels, increased from 15000)
    missileSpeed: 1.70,                        // Missile progression rate as percentage per second (1.70% per second = 102% in 60s)
    momentumLossPerCollision: 15,              // Momentum percentage lost when hitting pedestrians (affects speed)
    momentumRecoveryRate: 0.1                  // Rate at which momentum naturally recovers per frame (percentage points)
};

class Stage1 extends Phaser.Scene {
    constructor() {
        super("Stage1");
        this.hideOnScreenButtonsHandler = null;
        this.sceneTransitioning = false; // Prevent multiple scene starts
    }    preload() {
        this.load.image("platform", "./assets/sprites/platformb.png");
        this.load.image("missile", "./assets/sprites/player.png");
        this.load.image("sky", "./assets/sprites/sky.png");
          // Load pedestrian sprites
        this.load.image("pedestrian_jaycean", "./assets/sprites/Jaycean.png");
        this.load.image("pedestrian_mandy", "./assets/sprites/Mandy.png");
        this.load.image("pedestrian_ricky", "./assets/sprites/Ricky.png");
        this.load.image("pedestrian_delouise", "./assets/sprites/delouise.png");
        this.load.image("pedestrian_slob", "./assets/sprites/Slob.png");
        
        // Load player run spritesheets
        this.load.spritesheet('player_run1', './assets/sprites/player_run_sheet1.png', {
            frameWidth: 192,
            frameHeight: 108
        });
        this.load.spritesheet('player_run2', './assets/sprites/player_run_sheet2.png', {
            frameWidth: 192,
            frameHeight: 108
        });
        this.load.spritesheet('player_run3', './assets/sprites/player_run_sheet3.png', {
            frameWidth: 192,
            frameHeight: 108
        });
        this.load.spritesheet('player_run4', './assets/sprites/player_run_sheet4.png', {
            frameWidth: 192,
            frameHeight: 108
        });
    }

    create() {
        // Reset scene transitioning flag
        this.sceneTransitioning = false;
        // --- PLAYER ANIMATIONS SETUP ---
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
        // --- END PLAYER ANIMATIONS SETUP ---

        // Add sky background
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(-100);
        this.sky.displayWidth = this.sys.game.config.width;
        this.sky.displayHeight = this.sys.game.config.height;

        // Initialize game state
        this.gameState = {
            score: 0,
            level: 1,
            currentSpeed: window.gameOptions.platformStartSpeed,
            // Missile chase specific state
            stageDistance: 0,
            stageProgress: 0,           // Percentage (0-100) of stage completed
            missilePosition: 0,         // Missile position across screen (0-100%)
            momentum: 100,              
            gameOver: false,
            gameComplete: false,
            distanceTraveled: 0,
            collisionCooldown: 0,
            lastScoreSegment: 0,
            pedestriansAvoided: 0,
            collisions: 0,
            completionReason: ""
        };

        // Initialize this line after other initializations (to save yourself a headache)
        this.extraPedestrians = [];
        this.barrageActivated = false;
        this.barrageStartTime = 0;

        // Initialize DOM UI
        this.initializeUI();
        
        // Make on-screen buttons visible at scene start/restart
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'block';
        if (this.domElements.dashButton) this.domElements.dashButton.style.display = 'block';

        // Setup game elements
        this.initializePlatforms();
        this.setupPlayer();
        this.setupMissile(); 
        this.setupPedestrians();
        this.setupInput();
        this.setupPhysics();
        
        // Show instructions and hide after 5 seconds
        const instructions = this.domElements.instructions;
        if (instructions) {
            instructions.style.display = 'block';
            this.time.delayedCall(5000, () => {
                if (instructions) instructions.style.display = 'none';
            });
        }        // Initialize movement state        this.isDiving = false;
        this.isJumping = false;
        this.jumpHoldTime = 0;
        this.showingCollisionTint = false; // Flag to prevent tint interference
        this.currentTintState = 'none'; // Track current tint state

        // Dash state initialization
        this.dashReady = true;
        this.dashCooldown = 1000;
        this.lastDashTime = 0;
        this.isDashing = false; 
        this.dashDuration = 200; 
        this.dashJumpWindow = 100; 
        this.dashInvulnerable = false; 

        // DashJump properties
        this.dashJumpForce = 400; // Normal jump height
        this.dashJumpHorizontalBoost = 1200; // INCREASED from 800 to 1200
        this.dashJumpMaxHeight = 450; 
        this.lastCanDashJump = false;
        this.isDashJumping = false;
        this.dashJumpStartTime = 0;
        this.dashJumpDuration = 800; // INCREASED from 600 to 800

        const scene = this;

        // Button setup code
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
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = false;
                scene.jumpHoldTime = 0; // Reset jump hold time (important for mobile)
            });
            
            this.domElements.jumpButton.addEventListener('mouseup', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = false;
                scene.jumpHoldTime = 0; // Reset jump hold time (important for mobile)
            });
        }

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
        
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
        }
        this.hideOnScreenButtonsHandler = () => {
            if (scene.domElements.dashButton) scene.domElements.dashButton.style.display = 'none';
            if (scene.domElements.jumpButton) scene.domElements.jumpButton.style.display = 'none';
        };        window.addEventListener('keydown', this.hideOnScreenButtonsHandler);
        
        // Fix mouse button event handlers with proper context
        if (this.domElements.gameOverRestartButtonMobile) {
            this.domElements.gameOverRestartButtonMobile.addEventListener('click', (e) => {
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    if (this.sceneTransitioning) return; // Prevent multiple transitions
                    this.sceneTransitioning = true;
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.restart();
                }
            });
            
            this.domElements.gameOverRestartButtonMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    if (this.sceneTransitioning) return; // Prevent multiple transitions
                    this.sceneTransitioning = true;
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.restart();
                }
            });
        }
        
        if (this.domElements.gameOverMenuButtonMobile) {
            this.domElements.gameOverMenuButtonMobile.addEventListener('click', (e) => {
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    if (this.sceneTransitioning) return; // Prevent multiple transitions
                    this.sceneTransitioning = true;
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.start("SceneSwitcher");
                }
            });
            
            this.domElements.gameOverMenuButtonMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    if (this.sceneTransitioning) return; // Prevent multiple transitions
                    this.sceneTransitioning = true;
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.start("SceneSwitcher");
                }
            });
        }    }

    // New missile setup
    setupMissile() {
        this.missile = this.add.sprite(0, this.sys.game.config.height * 0.15, "missile");
        this.missile.setScale(0.3);
        this.missile.setDepth(10); // Ensure it's visible above background
    }

    // Updated UI to show missile chase progress
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

    // Updated to use momentum-based speed calculation
    getAdjustedSpeed() {
        return this.gameState.currentSpeed * (this.gameState.momentum / 100);
    }    // Updated collision handling with dash invulnerability
    hitPedestrian(player, pedestrian) {
        // Skip collision if player is actively dashing OR during kite window (including dash jump)
        if (this.isDashing || this.dashInvulnerable) {
            console.log("🛡️ Collision avoided - player is dashing!");
            // Optional: Add visual feedback for avoided collision
            this.cameras.main.flash(50, 0, 255, 0, false); // Brief green flash
            
            // Optional: Award points for skilled dash avoidance
            this.gameState.score += 5;
            this.gameState.pedestriansAvoided++;
              return; // Exit early, no collision damage
        }

        // Add a collision flag to each pedestrian to prevent multiple hits
        if (!pedestrian.isHit && this.gameState.collisionCooldown <= 0) {
            console.log("🔴 COLLISION DETECTED! Applying red tint...");
            
            this.gameState.momentum = Math.max(10, 
                this.gameState.momentum - window.gameOptions.momentumLossPerCollision);
            this.gameState.collisions++;
            
            this.gameState.collisionCooldown = 45; 
            
            // Add a flag to prevent tint interference during collision feedback
            this.showingCollisionTint = true;
            this.currentTintState = 'collision';
            
            // Visual feedback for collision - red flash and screen shake
            this.cameras.main.flash(50, 255, 0, 0, false); // Brief red flash
            this.cameras.main.shake(100, 0.01);
            this.player.setTint(0xff4444);
            console.log("Red tint applied!");
            
            this.time.delayedCall(200, () => {
                console.log("🔴 Collision tint timeout - resetting tint");
                this.showingCollisionTint = false;
                
                // Reset to appropriate tint state
                if (this.isDashing || this.dashInvulnerable || this.isDashJumping || this.isReturningFromDashJump) {
                    this.player.setTint(0x4444ff); // Blue tint for invulnerability
                    this.currentTintState = 'invulnerable';
                    console.log("Applied blue invulnerability tint");
                } else {
                    this.player.clearTint();
                    this.currentTintState = 'none';
                    console.log("Cleared tint back to normal");
                }
            });
            
            this.updateAllSpeeds();
            
            // Mark this pedestrian as hit temporarily
            pedestrian.isHit = true;
            this.time.delayedCall(500, () => {
                pedestrian.isHit = false;
            });
        }
    }

    // New missile chase update logic
    updateMissileChase(delta) {
        // Update missile position (moves at constant rate)
        this.gameState.missilePosition += (window.gameOptions.missileSpeed * delta) / 1000;
        this.gameState.missilePosition = Math.min(100, this.gameState.missilePosition);

        // Update missile sprite position
        this.missile.x = (this.gameState.missilePosition / 100) * this.sys.game.config.width;        // Convert delta from ms to seconds
        const deltaSeconds = delta / 1000;
        // Add distance traveled this frame
        this.gameState.stageDistance += this.getAdjustedSpeed() * deltaSeconds;
        // Calculate progress as a percentage of target distance
        this.gameState.stageProgress = Math.min(
            100,
            (this.gameState.stageDistance / window.gameOptions.stageTargetDistance) * 100
        );// Check win/lose conditions
        this.checkStageCompletion();
    }

    // New stage completion check
    checkStageCompletion() {
        // Player wins if they reach 100% progress before missile reaches 100%
        if (this.gameState.stageProgress >= 100 && !this.gameState.gameComplete && !this.gameState.gameOver) {
            this.completeStage("You caught the missile!");
        }
        // Player loses if missile reaches 100% before they complete stage
        else if (this.gameState.missilePosition >= 100 && !this.gameState.gameComplete && !this.gameState.gameOver) {
            this.triggerGameOver("The missile got away!");
        }
    }

    // New stage completion handler
    completeStage(reason) {
        this.gameState.gameComplete = true;
        this.gameState.completionReason = reason;
        
        // CRITICAL: Immediately cut off all player input to prevent interference
        this.pointerJustDown = false;
        this.pointerIsDown = false;
        
        // Calculate completion bonus
        const timeBonus = Math.round((100 - this.gameState.missilePosition) * 10);
        const momentumBonus = Math.round(this.gameState.momentum * 5);
        const avoidanceBonus = this.gameState.pedestriansAvoided * 10;
        
        this.gameState.score += timeBonus + momentumBonus + avoidanceBonus;
        
        this.physics.pause();
          if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = `${reason} Stage Complete! Moving to Tower...`;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }        this.cameras.main.flash(500, 0, 255, 0);
        
        console.log("🎉 Stage 1 completed! Moving to tower1...");

        // Transition to tower1 after a delay
        this.time.delayedCall(3000, () => {
            if (this.sceneTransitioning) return; // Prevent multiple transitions
            this.sceneTransitioning = true;
            // Hide the completion screen before transitioning
            if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
            if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
            this.scene.start("tower1");
        });
    }    // Updated scoring for pedestrian avoidance
    updateScore(points = 10) {
        this.gameState.score += points;
        this.gameState.pedestriansAvoided++;
    }

    // Existing movement, input, platform, pedestrian logic
    initializePlatforms() {
        this.platformGroup = this.add.group({
            removeCallback: function(platform) {
                platform.scene.platformPool.add(platform);
            }
        });

        this.platformPool = this.add.group({
            removeCallback: function(platform) {
                platform.scene.platformGroup.add(platform);
            }
        });

        this.createContinuousStreet();
        
        let platformY = this.sys.game.config.height * 0.8;
        this.originY = platformY - 50;
    }

    createContinuousStreet() {
        const platformWidth = this.sys.game.config.width;
        const numPlatforms = 5; 
        
        for (let i = 0; i < numPlatforms; i++) {
            this.addStreetSegment(i * (platformWidth * 0.7)); 
        }
    }

    addStreetSegment(xPosition) {
        let platform;
        if (this.platformPool.getLength()) {
            platform = this.platformPool.getFirst();
            platform.x = xPosition;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        } else {
            platform = this.physics.add.sprite(xPosition, this.sys.game.config.height * 0.8, "platform");
            platform.setImmovable(true);
            this.platformGroup.add(platform);
        }
        platform.displayWidth = this.sys.game.config.width * 1.4; 
        platform.setVelocityX(this.getAdjustedSpeed() * -1);
    }

    setupPlayer() {
        this.player = this.physics.add.sprite(
            window.gameOptions.playerStartPosition,
            window.gameOptions.playerStartY !== null ? window.gameOptions.playerStartY : this.originY,
            "player_run1"
        );
        this.player.setGravityY(window.gameOptions.playerGravity);
        this.player.setCollideWorldBounds(true, false, false, false, true);        this.playerJumps = 0;
        this.jumpTimer = 0;  
        this.jumpBufferDuration = 150;// Wait for texture to load, then align feet to platform
        this.player.on('texturecomplete', () => {
            this.player.y = this.originY - (this.player.displayHeight / 2) + 4;
            this.player.body.setSize(60, 90);
            this.player.body.setOffset(66, 0);
        });
        // If already loaded, set immediately
        if (this.player.texture.key) {
            this.player.y = this.originY - (this.player.displayHeight / 2) + 4;
            this.player.body.setSize(60, 90);
            this.player.body.setOffset(66, 0);
        }
        this.player.anims.play('run');
    }

    setupPedestrians() {        this.pedestrian1 = this.physics.add.sprite(
            this.sys.game.config.width + 100,
            this.originY,
            "pedestrian_ricky"
        );
        this.pedestrian1.setImmovable(true);this.pedestrian2 = this.physics.add.sprite(
            this.sys.game.config.width + 300,
            this.originY,
            "pedestrian_mandy"
        );
        this.pedestrian2.setImmovable(true);        this.pedestrian3 = this.physics.add.sprite(
            this.sys.game.config.width + 500,
            this.originY,
            "pedestrian_slob"
        );
        this.pedestrian3.setImmovable(true);
        this.pedestrian3.setScale(1.3);        this.pedestrian4 = this.physics.add.sprite(
            this.sys.game.config.width + 700,
            this.originY+20,
            "pedestrian_delouise"
        );
        this.pedestrian4.setImmovable(true);
        this.pedestrian4.setScale(0.5);

        this.pedestrians = [this.pedestrian1, this.pedestrian2, this.pedestrian3, this.pedestrian4];
        this.updatePedestrianSpeeds();
    }

    updatePedestrianSpeeds() {
        const baseSpeed = this.getAdjustedSpeed();
        const speedMultipliers = [1.2, 0.9, 0.7, 1.6];
        
        this.pedestrians.forEach((pedestrian, index) => {
            pedestrian.setVelocityX(baseSpeed * speedMultipliers[index] * -1);
        });
    }

    updateAllSpeeds() {
        const adjustedSpeed = this.getAdjustedSpeed();
        
        this.platformGroup.getChildren().forEach(platform => {
            platform.setVelocityX(adjustedSpeed * -1);
        });
        
        this.updatePedestrianSpeeds();
        
        // Update barrage pedestrians separately if they exist
        if (this.extraPedestrians && this.extraPedestrians.length > 0) {
            this.extraPedestrians.forEach(pedestrian => {
                const speedVariation = 0.9 + (Math.random() * 0.4);
                pedestrian.setVelocityX(-adjustedSpeed * speedVariation);
            });
        }
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

    handleJumpOrDive() {
        if (this.gameState.gameOver || this.gameState.gameComplete) return;
        
        console.log("=== JUMP INPUT DETECTED ===");
        console.log("Player grounded:", this.isPlayerGrounded());
        console.log("Can dash jump:", this.canDashJump());
        console.log("isDashing:", this.isDashing);
        
        if (this.isPlayerGrounded()) {
            if (this.canDashJump()) {
                console.log("✅ Triggering DASH JUMP!");
                this.dashJump();
                return;
            }
              console.log("✅ Triggering REGULAR JUMP");
            this.player.setVelocityY(window.gameOptions.jumpForce * -1);
            this.isDiving = false;
            this.isJumping = true;
            this.jumpHoldTime = 0;
            this.jumpStartTime = this.time.now;
        } else if (!this.isDiving && !this.isPlayerGrounded()) {
            console.log("✅ Triggering DIVE");
            this.isDiving = true;
            this.player.setVelocityY(900);
        }
    }

    endJumpHold() {
        this.isJumping = false;
    }

    isPlayerGrounded() {
        return this.player.body.touching.down || this.player.body.blocked.down;
    }

    setupPhysics() {
        this.physics.add.collider(this.player, this.platformGroup);
        
        this.pedestrians.forEach(pedestrian => {
            this.physics.add.overlap(this.player, pedestrian, this.hitPedestrian, null, this);        });
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
            this.domElements.gameOverScreen.style.display = 'block';        }
        
        this.cameras.main.shake(500, 0.02);
    }

    update(time, delta) {
        if (this.gameState.gameOver || this.gameState.gameComplete) {
            // CRITICAL: Reset all input flags immediately during game over to prevent auto-restart
            this.pointerJustDown = false;
            this.pointerIsDown = false;
            
            // Keyboard game over controls 
            if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
                if (this.sceneTransitioning) return; // Prevent multiple transitions
                this.sceneTransitioning = true;
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                this.scene.restart();
            }
            
            if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
                if (this.sceneTransitioning) return; // Prevent multiple transitions
                this.sceneTransitioning = true;
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                this.scene.start("SceneSwitcher");
            }
            return;
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            if (this.sceneTransitioning) return; // Prevent multiple transitions
            this.sceneTransitioning = true;
            if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
            if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
            this.scene.start("SceneSwitcher");
            return;
        }
        
        // More comprehensive position management that respects ALL tween states
        if (!this.isDashJumping && 
            !this.isReturningFromDashJump && 
            !this.isDashing && 
            !this.isDashTweening &&
            !this.isDashJumpReturning) {
            this.player.x = window.gameOptions.playerStartPosition; // Normal position (200)
        } else            if (this.isDashJumping) {
                // During dash jump, allow movement but with tighter bounds
                const startPos = window.gameOptions.playerStartPosition;
                const minX = startPos - 100;
                const maxX = startPos + 400;
                this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
                
                // If player goes too far left, gently pull back
                if (this.player.x < startPos - 50) {
                    this.player.setVelocityX(Math.max(this.player.body.velocity.x, 50));
                }
            }        // IMPORTANT: During ANY tween state (isDashTweening OR isDashJumpReturning), 
        // don't touch player.x at all - let the tweens handle it completely

        // Handle dash jump sustained movement first
        if (this.isDashJumping) {
            const timeSinceDashJump = this.time.now - this.dashJumpStartTime;
            if (timeSinceDashJump < this.dashJumpDuration) {
                const progress = timeSinceDashJump / this.dashJumpDuration;
                  let forwardSpeed;
                if (progress < 0.3) {
                    forwardSpeed = 600;
                } else if (progress < 0.6) {
                    forwardSpeed = 300;
                } else if (progress < 0.9) {
                    forwardSpeed = 300 - ((progress - 0.6) / 0.3) * 300;
                } else {
                    // Gentle return instead of negative velocity
                    forwardSpeed = 0;
                }
                
                this.player.setVelocityX(forwardSpeed);            } else {
                this.isDashJumping = false;
                this.isReturningFromDashJump = true;
                this.startDashJumpReturn();
            }
        }

        // Check if we're waiting to start the return and player just landed
        if (this.returnWaitingForLanding && this.isPlayerGrounded()) {
            this.returnWaitingForLanding = false;
            this.startDashJumpReturn();
        }

        // Update missile chase mechanics
        this.updateMissileChase(delta);
          // Handle jump input 
        if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown) && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.handleJumpOrDive();
        }

        // Proper variable jump height with scaling
        if (this.isJumping && (this.spaceKey.isDown || this.pointerIsDown) && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.jumpHoldTime += delta;
            if (this.jumpHoldTime < window.gameOptions.maxJumpHold) {
                // Scale the jump force properly for frame rate independence
                const scaledJumpForce = window.gameOptions.jumpHoldForce * (delta / 16.67);
                this.player.setVelocityY(this.player.body.velocity.y - scaledJumpForce);
            }
        }

        if (this.player.y > this.sys.game.config.height) {
            this.triggerGameOver("You Fell UNDER the street! HOW?!?!?!");
            return;
        }

        this.gameState.collisionCooldown--;
        if (this.gameState.collisionCooldown < 0) {
            this.gameState.collisionCooldown = 0;
        }

        if (this.gameState.momentum < 100) {
            this.gameState.momentum = Math.min(100, 
                this.gameState.momentum + window.gameOptions.momentumRecoveryRate);
            this.updateAllSpeeds();
        }

        // Manage pedestrians with dynamic spawn rates
        this.pedestrians.forEach((pedestrian, index) => {
            if (pedestrian.x < -pedestrian.displayWidth / 2) {
                const spawnChance = this.getDynamicSpawnChance();
                  // Add this debug log to see the actual values
                if (index === 0) {
                    console.log(`Progress: ${this.gameState.stageProgress.toFixed(1)}%, Spawn chance: ${spawnChance.toFixed(2)}`);
                }
                
                // Scaling for more noticeable effect
                const adjustedChance = spawnChance * 0.95;
                
                if (Math.random() < adjustedChance) {
                    const basePositions = [100, 300, 500, 700];
                      // For final sprint, spawn them much closer together
                    let randomOffset;
                    if (this.gameState.stageProgress >= window.gameOptions.finalSprintThreshold) {
                        randomOffset = Phaser.Math.Between(-20, 50);
                    } else {
                        randomOffset = Phaser.Math.Between(-50, 200);
                    }
                    
                    pedestrian.x = this.sys.game.config.width + basePositions[index] + randomOffset;
                } else {
                    pedestrian.x = this.sys.game.config.width + 1500 + (index * 200);
                }
            }
        });        // Manage continuous street platforms
        let minDistance = this.sys.game.config.width * 2; 
        let rightmostX = -Infinity;
        
        this.platformGroup.getChildren().forEach(function(platform) {
            rightmostX = Math.max(rightmostX, platform.x + platform.displayWidth / 2);
            let platformDistance = this.sys.game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);
            
            if (platform.x + platform.displayWidth / 2 < -100) { 
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        if (minDistance > this.sys.game.config.width * 0.2 || 
            rightmostX < this.sys.game.config.width * 1.5) {  
            this.addStreetSegment(this.sys.game.config.width + 200);
        }        // Handle jump buffer timing
        if (this.jumpTimer > 0) {
            if (time - this.jumpTimer > this.jumpBufferDuration) {
                this.jumpTimer = 0;
                this.isJumping = false; 
            }
        }        // Only reset jump state when landing
        if (this.isPlayerGrounded() && !this.wasGrounded) {
            if (this.isDiving) {
                this.isDiving = false;
            }
            this.isJumping = false;
            this.jumpTimer = 0;
            this.jumpHoldTime = 0;
            this.playerJumps = 0;
        }

        this.wasGrounded = this.isPlayerGrounded();        // DASH LOGIC 
        const dashPressed = this.shiftKey.isDown && this.isPlayerGrounded() && !this.isJumping && 
                           !this.gameState.gameOver && !this.gameState.gameComplete;        if (dashPressed && this.dashReady) {
            this.doDash();
            this.dashReady = false;
            this.lastDashTime = this.time.now;
        }        if (!this.shiftKey.isDown && (this.time.now - this.lastDashTime > this.dashCooldown)) {
            this.dashReady = true;
        }        // State-based tint management - only change when state changes (not every frame)
        // BUT don't interfere if we're showing collision tint
        if (!this.showingCollisionTint) {
            let targetTintState;
            
            if (this.isDiving) {
                targetTintState = 'diving';
            } else if (this.isDashing || this.dashInvulnerable || this.isDashJumping || this.isReturningFromDashJump) {
                targetTintState = 'invulnerable';
            } else {
                targetTintState = 'none';
            }
            
            // Only change tint if state has changed
            if (this.currentTintState !== targetTintState) {
                if (targetTintState === 'diving') {
                    this.player.setTint(0xffff00); // Yellow for diving
                    console.log("🟡 Applied diving tint");
                } else if (targetTintState === 'invulnerable') {
                    this.player.setTint(0x4444ff); // Blue tint for invulnerability
                    console.log("🔵 Applied invulnerability tint");
                } else {
                    this.player.clearTint();
                    console.log("⚪ Cleared tint to normal");
                }
                this.currentTintState = targetTintState;
            }
        }

        // Check for barrage mode activation
        if (this.gameState.stageProgress >= window.gameOptions.finalSprintThreshold && 
            !this.barrageActivated) {
            this.activateBarrageMode();
            this.barrageActivated = true;
        }
        
        // Manage barrage pedestrians if active
        if (this.barrageActivated) {
            this.manageBarragePedestrians();
        }

        this.updateUI();
        this.pointerJustDown = false;
    }    // Updated dash method - prevent going behind startPosition but allow dashing
    doDash() {
        console.log("=== DASH STARTED ===");
        console.log("Time:", this.time.now);
        console.log("Player position:", this.player.x, this.player.y);        this.isDashing = true;
        this.isDashTweening = true;
        this.dashInvulnerable = true;
        this.player.setTint(0x4444ff); // Blue tint for invulnerability
        console.log("isDashing set to:", this.isDashing);
        console.log("🛡️ Dash invulnerability activated!");
        
        // Stop any existing tweens on the player to prevent conflicts
        this.tweens.killTweensOf(this.player);
        
        // If returning from dash jump, clear those flags since we're starting a new dash
        if (this.isDashJumpReturning || this.isReturningFromDashJump) {
            this.isDashJumpReturning = false;
            this.isReturningFromDashJump = false;
            console.log("🔄 Interrupting dash jump return with new dash");
        }
        
        // Calculate forward movement distance (25-75 pixels)
        const dashDistance = Phaser.Math.Between(25, 75);
        // Ensure we don't go behind startPosition
        const targetX = Math.max(
            window.gameOptions.playerStartPosition,
            Math.min(
                this.player.x + dashDistance, 
                window.gameOptions.playerStartPosition + 100
            )
        );
          // Initial velocity burst
        this.player.setVelocityX(600);
        
        // Single smooth forward movement tween
        this.tweens.add({
            targets: this.player,
            x: targetX,
            duration: this.dashDuration,
            ease: 'Power2.easeOut',
            onComplete: () => {
                console.log("🏃 Dash forward movement complete");
            }
        });
        
        this.time.delayedCall(this.dashDuration, () => {
            console.log("=== DASH ENDED ===");
            this.isDashing = false;
            
            if (this.isPlayerGrounded()) {
                this.player.setVelocityX(0);
            }
            
            // Start smooth return tween - but ONLY IF NO DASH JUMP IS COMING
            this.time.delayedCall(this.dashJumpWindow, () => {
                if (!this.isDashJumping && !this.isReturningFromDashJump) {
                    // Start return tween
                    this.tweens.add({
                        targets: this.player,
                        x: window.gameOptions.playerStartPosition,
                        duration: 600,
                        ease: 'Power2.easeInOut',                        onComplete: () => {
                            this.isDashTweening = false;
                            this.dashInvulnerable = false;
                            console.log("🏃 Dash return complete - back to normal");
                        }
                    });
                } else {
                    // Dash jump is happening, so just clean up dash state
                    this.isDashTweening = false;
                    console.log("🚀 Dash transitioning to dash jump - no return needed");
                }
            });
        });
    }

    dashJump() {
        console.log("🚀 === DASH JUMP ACTIVATED! ===");
        
        // Stop any ongoing dash tweens to prevent conflicts
        this.tweens.killTweensOf(this.player);
        this.isDashTweening = false; // Dash tween control is now transferred to dash jump
          // Enhanced: More dramatic horizontal movement
        this.player.setVelocityY(window.gameOptions.jumpForce * -1);
        this.player.setVelocityX(this.dashJumpHorizontalBoost);
        
        // Add sustained forward movement during the dash jump
        this.isDashJumping = true;
        this.dashJumpStartTime = this.time.now;        this.dashJumpDuration = 800;
        
        // Ensure invulnerability continues through the entire sequence
        this.dashInvulnerable = true;
        this.player.setTint(0x4444ff); // Blue tint for invulnerability
        console.log("🛡️ Dash jump invulnerability extended!");
        
        this.isDiving = false;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        this.jumpStartTime = this.time.now;
        
        this.cameras.main.shake(200, 0.01);
        
        this.isDashing = false;
        console.log("Dash state reset, isDashing:", this.isDashing);
    }

    // canDashJump - allow dash jump while grounded OR airborne during window
    canDashJump() {
        const timeSinceDash = this.time.now - this.lastDashTime;
        const withinWindow = timeSinceDash <= (this.dashDuration + this.dashJumpWindow);
        // Remove the grounded check - allow dash jump regardless of ground state during window
        const canJump = withinWindow && !this.isDashJumping;
        
        console.log("=== DASH JUMP CHECK ===");
        console.log("Time since dash:", timeSinceDash);
        console.log("Within window:", withinWindow);
        console.log("Is grounded:", this.isPlayerGrounded());
        console.log("Not already dash jumping:", !this.isDashJumping);
        console.log("Can dash jump:", canJump);
        
        return canJump;
    }

    // Enhanced manageBarragePedestrians with increasing difficulty
    manageBarragePedestrians() {
        if (this.extraPedestrians.length === 0) return;
        
        // Increase spawn rate over time in barrage mode
        const timeInBarrage = this.time.now - this.barrageStartTime || 0;
        const baseSpawnChance = Math.min(0.98, 0.85 + (timeInBarrage / 10000)); // Increases to 98%
        
        this.extraPedestrians.forEach((pedestrian, index) => {
            if (pedestrian.x < -pedestrian.displayWidth / 2) {
                if (Math.random() < baseSpawnChance) {
                    // Spawn in tighter formations as time progresses
                    const formationTightness = Math.min(60, 120 - (timeInBarrage / 100));
                    const baseX = this.sys.game.config.width + 100;
                    const clusterOffset = Math.floor(index / 3) * 250;
                    const withinClusterOffset = (index % 3) * formationTightness;
                    
                    pedestrian.x = baseX + clusterOffset + withinClusterOffset;
                    
                    // Gradually increase speed in barrage mode
                    const speedBoost = 1.0 + (timeInBarrage / 20000); // Up to 1.5x speed
                    const speedVariation = 0.9 + (Math.random() * 0.3);
                    pedestrian.setVelocityX(-this.getAdjustedSpeed() * speedVariation * speedBoost);
                } else {
                    pedestrian.x = this.sys.game.config.width + 2000;
                }
            }
        });
    }

    // Enhanced activateBarrageMode 
    activateBarrageMode() {
        if (this.extraPedestrians.length === 0) {
            console.log("🚨 ACTIVATING BARRAGE MODE! 🚨");
            this.barrageStartTime = this.time.now;
            
            this.spawnBarragePedestrians();
        }
    }    spawnBarragePedestrians() {
        const numWaves = 3;
        const pedestriansPerWave = 3;
        const pedestrianSprites = ["pedestrian_mandy", "pedestrian_ricky", "pedestrian_delouise", "pedestrian_slob"];
        
        for (let wave = 0; wave < numWaves; wave++) {
            for (let i = 0; i < pedestriansPerWave; i++) {
                // Randomly select a pedestrian sprite
                const randomSprite = pedestrianSprites[Math.floor(Math.random() * pedestrianSprites.length)];
                
                const extraPed = this.physics.add.sprite(
                    this.sys.game.config.width + 200 + (wave * 350) + (i * 100),
                    this.originY,
                    randomSprite
                );
                
                extraPed.setImmovable(true);
                extraPed.isHit = false;
                extraPed.setScale(1.1);
                
                const speedVariation = 0.9 + (Math.random() * 0.4);
                extraPed.setVelocityX(-this.getAdjustedSpeed() * speedVariation);
                
                this.physics.add.overlap(this.player, extraPed, this.hitPedestrian, null, this);
                this.extraPedestrians.push(extraPed);
            }
        }
    }// Better cleanup
    shutdown() {
        // Clean up barrage pedestrians
        if (this.extraPedestrians) {
            this.extraPedestrians.forEach(ped => {
                if (ped && ped.active) {
                    ped.destroy();
                }
            });
            this.extraPedestrians = [];
        }
        
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
            this.scene.scene.time.removeAllEvents();
        }
    }

    getDynamicSpawnChance() {
        const progress = this.gameState.stageProgress;
        const baseChance = window.gameOptions.pedestrianSpawnChance;
        
        let spawnChance;
        if (progress >= window.gameOptions.finalSprintThreshold) {
            // 80%+ progress: EXTREME spawn rate (almost 100%)
            spawnChance = 1.0; // 100% spawn rate - EVERY pedestrian spawns
            console.log(`🔥 FINAL SPRINT! Progress: ${progress}%, Spawn rate: ${spawnChance}`);
        } else if (progress >= 50) {
            // 50-80%: Noticeable increase
            spawnChance = 0.65; // More than double base rate
            console.log(`⚡ Mid-game mode. Progress: ${progress}%, Spawn rate: ${spawnChance}`);
        } else {
            // 0-50%: Base difficulty
            spawnChance = baseChance; // 0.3
            console.log(`🟢 Early game mode. Progress: ${progress}%, Spawn rate: ${spawnChance}`);
        }
        
        return spawnChance;
    }    // Start the smooth return to start position with extended invulnerability
    startDashJumpReturn() {
        this.player.setVelocityX(0); // Stop any movement
        this.isDashJumpReturning = true; // NEW: Specific flag for dash jump return
        
        // Stop any conflicting tweens
        this.tweens.killTweensOf(this.player);
        
        // Maintain invulnerability during return
        this.dashInvulnerable = true;
        console.log("🛡️ Starting dash jump return - flags set to prevent interference");
        console.log("isDashJumpReturning:", this.isDashJumpReturning);
        console.log("isReturningFromDashJump:", this.isReturningFromDashJump);
        
        // Use a single, smooth tween to return to normal position
        this.tweens.add({
            targets: this.player,
            x: window.gameOptions.playerStartPosition, // Return to 200
            duration: 1000, // Even longer for ultra-smooth return
            ease: 'Power3.easeOut', // Smoother easing curve
            onUpdate: () => {
                // Debug: Log the tween progress
                console.log("Tween updating player position to:", this.player.x);
            },
            onComplete: () => {
                console.log("🚀 Dash jump return tween COMPLETED at position:", this.player.x);
                
                // Clear ALL return flags
                this.isReturningFromDashJump = false;
                this.isDashJumpReturning = false;
                  // ONLY NOW turn off invulnerability
                this.dashInvulnerable = false;
                console.log("🛡️ All flags cleared - returning to normal state");
            }
        });
    }
}

window.Stage1 = Stage1;