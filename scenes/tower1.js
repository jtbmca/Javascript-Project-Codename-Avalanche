// Tower1: Interior Wall-Jumping Tower Climb - Inspired by Kid Icarus
// Jayceon smashes through a window and must wall-jump up a tall building interior to escape

// Tower1 specific game options
window.tower1Options = {
    playerGravity: 1000,                       // Gravity for wall jumping
    jumpForce: 480,                            // Increased base jump force for better loft
    wallJumpForce: 520,                        // Increased wall jump force
    wallJumpHorizontal: 320,                   // Slightly more horizontal push from wall jump
    maxJumpHold: 250,                          // Longer jump hold for more control
    jumpHoldForce: 6000,                       // Jump hold force
    playerStartPosition: 100,                  // Start near left side
    playerStartHeight: 190,                    // How far from bottom to start (pixels) - HIGHER START
    bounceVelocity: 250,                       // Velocity when bouncing off walls
    wallSlideMaxSpeed: 200,                    // Maximum speed when sliding down walls
    wallSlideSpeed: 150,                       // Wall slide speed (used in update method)
    wallSlideResistance: 0.9,                  // Wall slide friction
    stageDuration: 120,                        // More time for forgiving climb (was 90)
    stageTargetHeight: 1200,                   // Target height to reach (pixels up from start)
    momentumLossPerCollision: 0,               // No momentum loss - no pedestrians here
    
    // Wall jumping timing
    wallJumpWindow: 300,                       // Time window to perform wall jump (ms)
    wallCoyoteTime: 150,                       // Time after leaving wall to still wall jump
    
    // Dash mechanics (from Stage1/2)
    dashDistance: 60,                          // Distance player moves during dash
    dashDuration: 200,                         // Duration of dash movement
    dashCooldown: 1000,                        // Cooldown between dashes
    dashJumpWindow: 150,                       // Time window after dash to perform dash jump
    dashJumpHorizontalBoost: 1200,             // MASSIVELY INCREASED for tower gap clearing (was 800)
    dashJumpDuration: 1500,                    // INCREASED duration for longer flight (was 1200)
    
    // Dive mechanics
    diveForce: 800,                            // Downward velocity when diving
    
    // Momentum boost mechanics
    momentumBoostDuration: 2000,               // How long momentum boost lasts (2 seconds)
    momentumBoostMultiplier: 1.5,              // Speed multiplier during boost
    
    // Visual settings
    towerWidth: 600,                           // Width of the tower interior
    
    // Platform layout is now static - no procedural generation variables needed
};

class tower1 extends Phaser.Scene {
        constructor() {
        super("tower1");
        this.hideOnScreenButtonsHandler = null;
        this.sceneTransitioning = false; // Prevent multiple scene starts
    }

    preload() {
        this.load.image("platform", "./assets/sprites/platformb.png");
        this.load.image("player", "./assets/sprites/player.png");
        this.load.image("wall", "./assets/sprites/platformb.png");
    }

    create() {        console.log("🏗️ Tower1 scene starting...");
        
        // Reset scene transitioning flag
        this.sceneTransitioning = false;
          // Initialize game state for tower climbing
        this.gameState = {
            score: 0,
            currentHeight: 0,                      // How high player has climbed
            stageProgress: 0,                      // Percentage of tower climbed (0-100)
            gameOver: false,
            gameComplete: false,
            timeRemaining: window.tower1Options.stageDuration,
            completionReason: "",
            wallJumpsPerformed: 0,
            timeBonus: 0
        };

        console.log("🎮 Game state initialized with timeRemaining:", this.gameState.timeRemaining);
        console.log("🎮 window.tower1Options.stageDuration:", window.tower1Options.stageDuration);

        // Initialize DOM UI
        this.initializeUI();
          // Make on-screen buttons visible
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'block';
        if (this.domElements.dashButton) this.domElements.dashButton.style.display = 'block';

        console.log("🏗️ Building tower...");
        // Setup game elements
        this.initializeTower();
        
        console.log("👤 Setting up player...");
        this.setupPlayer();
        
        console.log("⌨️ Setting up input...");
        this.setupInput();
        
        console.log("⚛️ Setting up physics...");
        this.setupPhysics();
        
        // Show tower climbing instructions
        this.showTowerInstructions();
          // Initialize movement state
        this.isJumping = false;
        this.jumpHoldTime = 0;
        this.isOnGround = false;
        this.isOnWall = false;
        this.wallSide = null; // 'left' or 'right'        this.lastWallContact = 0;
        this.canWallJump = false;
        this.isWallSliding = false;
        this.lastGroundHeight = 0; // Start at 0 height - will be updated properly by updateHeightProgress
        
        // Dash state initialization (from Stage1/2)
        this.isDashing = false;
        this.dashReady = true;
        this.lastDashTime = 0;
        this.isDashTweening = false;
        this.dashInvulnerable = false;
          // Dash jump state
        this.isDashJumping = false;
        this.dashJumpStartTime = 0;
          // Dive state
        this.isDiving = false;
        
        // Momentum boost state
        this.hasMomentumBoost = false;
        this.momentumBoostStartTime = 0;
        
        // Jump timing
        this.jumpStartTime = 0;
        this.wasGrounded = false;
        
        // Auto-running state - Jayceon never stops running!
        this.runDirection = 1; // 1 for right, -1 for left
        this.runSpeed = 200; // Constant running speed        // Camera setup for vertical movement
        this.cameras.main.setBounds(0, -window.tower1Options.stageTargetHeight, 
            this.sys.game.config.width, this.sys.game.config.height + window.tower1Options.stageTargetHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.3);
        
        // CRITICAL FIX: Set physics world bounds to match the tower height
        // Without this, player hits invisible ceiling due to default world bounds
        this.physics.world.setBounds(0, -window.tower1Options.stageTargetHeight, 
            this.sys.game.config.width, this.sys.game.config.height + window.tower1Options.stageTargetHeight);
        
        // Set up timer countdown
        this.timeTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        
        // Add dramatic entry effect
        this.time.delayedCall(100, () => {
            this.cameras.main.flash(200, 255, 255, 255);
            this.cameras.main.shake(300, 0.01);
        });
          console.log("✅ Tower1 scene fully loaded!");
    }    showTowerInstructions() {
        const instructions = this.domElements.instructions;
        if (instructions) {            instructions.innerHTML = `
                <h3 style="color: #ff6600; margin: 0 0 10px 0;">TOWER ESCAPE!</h3>
                <p style="margin: 5px 0;">• Jayceon crashed through the window!</p>
                <p style="margin: 5px 0;">• He automatically runs and bounces off walls</p>
                <p style="margin: 5px 0;">• JUMP to wall-jump off walls and climb higher</p>
                <p style="margin: 5px 0;">• DASH for horizontal movement burst</p>
                <p style="margin: 5px 0;">• DASH + JUMP for mega wall-jump!</p>
                <p style="margin: 5px 0;">• DIVE while airborne for fast descent</p>
                <p style="margin: 5px 0; color: #ffaa00;">• Wall-jump between side platforms to climb</p>
                <p style="margin: 5px 0; color: #00ff00;">• Center platforms provide rest stops</p>
                <p style="margin: 5px 0;">• Reach the green ceiling to escape!</p>
                <p style="margin: 5px 0; color: #ff4444;">• 120 seconds until the missile hits!</p>
            `;
            instructions.style.display = 'block';
            
            // Hide instructions after 6 seconds
            this.time.delayedCall(6000, () => {
                if (instructions) instructions.style.display = 'none';
            });
        }
    }    initializeUI() {        console.log("🖥️ === INITIALIZING TOWER UI ===");
        
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
            dashButton: document.getElementById('dashButton'), // Add dash button
            gameOverRestartButtonMobile: document.getElementById('gameOverRestartButtonMobile'),
            gameOverMenuButtonMobile: document.getElementById('gameOverMenuButtonMobile'),
        };
        
        console.log("🖥️ DOM Elements found:");
        console.log("  - scoreDisplay:", !!this.domElements.scoreDisplay);
        console.log("  - gameOverScreen:", !!this.domElements.gameOverScreen);
        console.log("  - gameOverReason:", !!this.domElements.gameOverReason);
        console.log("  - gameOverScore:", !!this.domElements.gameOverScore);
        console.log("  - jumpButton:", !!this.domElements.jumpButton);
        console.log("  - dashButton:", !!this.domElements.dashButton);
        console.log("  - gameOverRestartButtonMobile:", !!this.domElements.gameOverRestartButtonMobile);
        console.log("  - gameOverMenuButtonMobile:", !!this.domElements.gameOverMenuButtonMobile);

        this.updateUI();
    }updateUI() {
        if (!this.domElements.scoreDisplay) return;

        this.domElements.scoreDisplay.textContent = `Score: ${this.gameState.score}`;
        this.domElements.levelDisplay.textContent = `Height: ${Math.round(this.gameState.stageProgress)}%`;
        this.domElements.speedDisplay.textContent = `Wall Jumps: ${this.gameState.wallJumpsPerformed}`;
          // Debug timer display
        if (this.domElements.timeDisplay) {
            this.domElements.timeDisplay.textContent = `Time: ${this.gameState.timeRemaining}s`;
            console.log("🕒 UI Timer updated to:", this.gameState.timeRemaining, "Display text:", this.domElements.timeDisplay.textContent);
        } else {
            console.warn("⚠️ timeDisplay element not found!");
        }
        
        // Updated momentum display to show current state
        let stateText = 'RUNNING';
        let stateColor = '#0088ff';
        
        if (this.canDashJump()) {
            stateText = 'DASH JUMP!';
            stateColor = '#ffaa00';
        } else if (this.isDashJumping) {
            stateText = 'MEGA JUMP';
            stateColor = '#ffff00';
        } else if (this.isDashing) {
            stateText = 'DASHING';
            stateColor = '#00ffff';
        } else if (this.hasMomentumBoost) {
            stateText = 'BOOSTED';
            stateColor = '#ff8800';
        } else if (this.dashInvulnerable) {
            stateText = 'INVULNERABLE';
            stateColor = '#88ffff';
        } else if (this.isDiving) {
            stateText = 'DIVING';
            stateColor = '#ffff00';
        } else if (this.isWallSliding) {
            stateText = 'WALL SLIDE';
            stateColor = '#ffaa00';
        } else if (this.canWallJump) {
            stateText = 'WALL READY';
            stateColor = '#00ff00';
        } else if (this.isJumping) {
            stateText = 'JUMPING';
            stateColor = '#00ff00';
        }
        
        this.domElements.momentumDisplay.textContent = `State: ${stateText}`;
        this.domElements.momentumDisplay.style.color = stateColor;
    }    updateTimer() {
        if (this.gameState.gameOver || this.gameState.gameComplete) return;
        
        this.gameState.timeRemaining--;
        console.log("⏰ Timer updated - Time remaining:", this.gameState.timeRemaining);
        
        // Add additional debug for timer display
        if (this.domElements.timeDisplay) {
            console.log("⏰ Timer display element found, updating to:", this.gameState.timeRemaining + "s");
        } else {
            console.error("❌ Timer display element is NULL!");
        }
        
        if (this.gameState.timeRemaining <= 0) {
            this.triggerGameOver("Time's up! The missile hit the city!");
        }
    }    initializeTower() {
        console.log("🏗️ Creating tower structure...");
        
        // Create walls on left and right sides
        this.leftWall = this.physics.add.staticGroup();
        this.rightWall = this.physics.add.staticGroup();
        this.platforms = this.physics.add.staticGroup();
          const towerHeight = window.tower1Options.stageTargetHeight + this.sys.game.config.height;
        const wallThickness = 50;
        const towerWidth = window.tower1Options.towerWidth;
        const towerCenterX = this.sys.game.config.width / 2;
        const leftWallX = towerCenterX - (towerWidth / 2);
        const rightWallX = towerCenterX + (towerWidth / 2);
        
        console.log("Building walls with height:", towerHeight, "thickness:", wallThickness);
        console.log("Tower width:", towerWidth, "Center X:", towerCenterX);
        console.log("Left wall X:", leftWallX, "Right wall X:", rightWallX);
        
        // Create left wall segments
        for (let y = this.sys.game.config.height; y >= -window.tower1Options.stageTargetHeight; y -= 100) {
            let leftWallPiece = this.add.rectangle(leftWallX, y, wallThickness, 100, 0x404040);
            this.physics.add.existing(leftWallPiece, true);
            this.leftWall.add(leftWallPiece);
        }
          // Create right wall segments
        for (let y = this.sys.game.config.height; y >= -window.tower1Options.stageTargetHeight; y -= 100) {
            let rightWallPiece = this.add.rectangle(rightWallX, y, wallThickness, 100, 0x404040);
            this.physics.add.existing(rightWallPiece, true);
            this.rightWall.add(rightWallPiece);
        }
        
        // Create floor
        let floor = this.add.rectangle(towerCenterX, this.sys.game.config.height - 25, towerWidth, 50, 0x606060);
        this.physics.add.existing(floor, true);
        this.platforms.add(floor);
        
        // Create ceiling (goal)
        let ceiling = this.add.rectangle(towerCenterX, -window.tower1Options.stageTargetHeight + 25, towerWidth - 100, 50, 0x00ff00);        this.physics.add.existing(ceiling, true);
        this.platforms.add(ceiling);
        ceiling.isGoal = true;        
        
        // STATIC PLATFORM LAYOUT - Now responsive to towerWidth
        // All platforms positioned for optimal wall-jumping gameplay
        const gameHeight = this.sys.game.config.height;
        const leftPlatformX = towerCenterX - (towerWidth / 2) + 125; // Near left wall
        const rightPlatformX = towerCenterX + (towerWidth / 2) - 125; // Near right wall
        
        console.log("Platform positions - Left:", leftPlatformX, "Right:", rightPlatformX, "Center:", towerCenterX);
        
        const staticPlatforms = [
            // Starting area platforms
            { x: leftPlatformX, y: gameHeight - 150, width: 240, color: 0x808080, comment: "Left start platform" },
            
            // Main climbing route - alternating sides (CORE ROUTE ONLY)
            { x: rightPlatformX, y: gameHeight - 275, width: 240, color: 0x808080, comment: "Right platform 1" },
            { x: leftPlatformX, y: gameHeight - 450, width: 240, color: 0x808080, comment: "Left platform 1" },
            { x: rightPlatformX, y: gameHeight - 500, width: 216, color: 0x808080, comment: "Right platform 2" },
            { x: leftPlatformX, y: gameHeight - 750, width: 216, color: 0x808080, comment: "Left platform 2" },
            { x: rightPlatformX, y: gameHeight - 800, width: 192, color: 0x808080, comment: "Right platform 3" },
            { x: leftPlatformX, y: gameHeight - 1050, width: 192, color: 0x808080, comment: "Left platform 3" },
            { x: rightPlatformX, y: gameHeight - 1000, width: 168, color: 0x808080, comment: "Right platform 4" },
            
            // EXTENDED UPPER CLIMBING SECTION - Reaching 90% of tower height (~1080 pixels)
            { x: leftPlatformX, y: gameHeight - 1200, width: 180, color: 0x808080, comment: "Left platform 4" },
            { x: rightPlatformX, y: gameHeight - 1150, width: 150, color: 0x808080, comment: "Right platform 5" },
            { x: leftPlatformX, y: gameHeight - 1350, width: 160, color: 0x808080, comment: "Left platform 5" },
            { x: rightPlatformX, y: gameHeight - 1300, width: 140, color: 0x808080, comment: "Final right platform" },
            
            // Optional rest platform near the top for strategy
            // { x: towerCenterX, y: gameHeight - 1100, width: 150, color: 0x606060, comment: "Upper rest platform" },
            // { x: centerX + 80, y: gameHeight - 675, width: 100, color: 0x707070, comment: "Helper 2" },
            // { x: centerX - 60, y: gameHeight - 1025, width: 90, color: 0x707070, comment: "Helper 3" },
        ];
        
        // Create all static platforms
        staticPlatforms.forEach(platformData => {
            let platform = this.add.rectangle(platformData.x, platformData.y, platformData.width, 25, platformData.color);
            this.physics.add.existing(platform, true);
            this.platforms.add(platform);
            console.log(`🏗️ Created ${platformData.comment} at (${platformData.x}, ${platformData.y})`);
        });
        
        console.log("🏗️ Tower created with", this.platforms.children.entries.length, "platforms");
        console.log("🧱 Left wall pieces:", this.leftWall.children.entries.length);
        console.log("🧱 Right wall pieces:", this.rightWall.children.entries.length);    }    setupPlayer() {
        // Calculate position for first left platform
        const towerWidth = window.tower1Options.towerWidth;
        const towerCenterX = this.sys.game.config.width / 2;
        const leftPlatformX = towerCenterX - (towerWidth / 2) + 125; // Same as platform calculation
        const gameHeight = this.sys.game.config.height;
        const leftStartPlatformY = gameHeight - 150; // First left platform Y position
        
        // Create player sprite - positioned on top of first left platform
        this.player = this.physics.add.sprite(
            leftPlatformX,  // X: Center of first left platform
            leftStartPlatformY - 40,  // Y: Above the platform (platform top - player height)
            "player"
        );
        this.player.setGravityY(window.tower1Options.playerGravity);
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.1);
        this.player.setTint(0x0088ff);
          // Set player bounds to prevent going outside tower walls
        this.player.body.setMaxVelocity(400, 600);
        
        console.log("👤 Player created at:", this.player.x, this.player.y);
        console.log("👤 Positioned on first left platform at X:", leftPlatformX, "Y:", leftStartPlatformY - 40);
    }setupInput() {
        console.log("⌨️ === SETTING UP TOWER INPUT ===");
        
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT); // Add dash key
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        
        console.log("⌨️ Keyboard keys initialized:");
        console.log("  - Space key:", !!this.spaceKey);
        console.log("  - Shift key:", !!this.shiftKey);
        console.log("  - ESC key:", !!this.keyESC);
        console.log("  - R key:", !!this.keyR);

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

        // Touch button setup
        const scene = this;
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
            });
            
            this.domElements.jumpButton.addEventListener('mouseup', function(e) {
                e.preventDefault();
                scene.pointerIsDown = false;
            });
        }        // Dash button setup
        if (this.domElements.dashButton) {
            this.domElements.dashButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameState.gameOver || this.gameState.gameComplete) return;
                if (this.dashReady) {
                    this.doDash();
                    this.dashReady = false;
                    this.lastDashTime = this.time.now;
                }
            });

            this.domElements.dashButton.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (this.gameState.gameOver || this.gameState.gameComplete) return;
                if (this.dashReady) {
                    this.doDash();
                    this.dashReady = false;
                    this.lastDashTime = this.time.now;
                }
            });
        }        // Setup keyboard button hiding
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
        }
        this.hideOnScreenButtonsHandler = () => {
            if (this.domElements.dashButton) this.domElements.dashButton.style.display = 'none';
            if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'none';
        };
        window.addEventListener('keydown', this.hideOnScreenButtonsHandler);        // Restart/menu buttons - Fixed with proper context and touchstart events
        if (this.domElements.gameOverRestartButtonMobile) {
            this.domElements.gameOverRestartButtonMobile.addEventListener('click', () => {
                console.log("🔄 RESTART BUTTON CLICKED");
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    console.log("🔄 Game state allows restart - proceeding");
                    if (this.sceneTransitioning) {
                        console.log("⚠️ Already transitioning, ignoring restart button");
                        return;
                    }
                    this.sceneTransitioning = true;
                    console.log("🔄 Restarting scene via button");
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.restart();
                } else {
                    console.log("❌ Game state does not allow restart");
                }
            });
            
            this.domElements.gameOverRestartButtonMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log("🔄 RESTART BUTTON TOUCHED");
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    console.log("🔄 Game state allows restart - proceeding");
                    if (this.sceneTransitioning) {
                        console.log("⚠️ Already transitioning, ignoring restart touch");
                        return;
                    }
                    this.sceneTransitioning = true;
                    console.log("🔄 Restarting scene via touch");
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.restart();
                } else {
                    console.log("❌ Game state does not allow restart");
                }
            });
        } else {
            console.error("❌ gameOverRestartButtonMobile not found in DOM!");
        }

        if (this.domElements.gameOverMenuButtonMobile) {
            this.domElements.gameOverMenuButtonMobile.addEventListener('click', () => {
                console.log("🏠 MENU BUTTON CLICKED");
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    console.log("🏠 Game state allows menu - proceeding");
                    if (this.sceneTransitioning) {
                        console.log("⚠️ Already transitioning, ignoring menu button");
                        return;
                    }
                    this.sceneTransitioning = true;
                    console.log("🏠 Going to menu via button");
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.start("SceneSwitcher");
                } else {
                    console.log("❌ Game state does not allow menu");
                }
            });
            
            this.domElements.gameOverMenuButtonMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log("🏠 MENU BUTTON TOUCHED");
                if (this.gameState.gameOver || this.gameState.gameComplete) {
                    console.log("🏠 Game state allows menu - proceeding");
                    if (this.sceneTransitioning) {
                        console.log("⚠️ Already transitioning, ignoring menu touch");
                        return;
                    }
                    this.sceneTransitioning = true;
                    console.log("🏠 Going to menu via touch");
                    if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                    if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                    this.scene.start("SceneSwitcher");
                } else {
                    console.log("❌ Game state does not allow menu");
                }
            });
        } else {
            console.error("❌ gameOverMenuButtonMobile not found in DOM!");
        }
    }    setupPhysics() {
        // Player collides with platforms
        this.physics.add.collider(this.player, this.platforms, (player, platform) => {
            if (platform.isGoal && !this.gameState.gameComplete) {
                this.completeStage("You escaped the tower!");
                return;
            }
            
            // CRITICAL: Reset ALL states when landing to ensure player can always jump
            this.isOnGround = true;
            this.isOnWall = false;
            this.wallSide = null;
            this.isWallSliding = false;
            this.canWallJump = false; // Reset to prevent jump blocking
            this.isJumping = false;
            this.jumpHoldTime = 0;
            
            // ADDITIONAL FIX: Force reset any blocking states immediately on ground contact
            if (this.isDashing || this.isDashTweening || this.isDiving) {
                console.log("🔧 Platform landing - Force clearing ALL blocking states for reliable jumping");
                this.tweens.killTweensOf(this.player);
                this.isDashing = false;
                this.isDashTweening = false;
                this.isDiving = false;
            }
            
            console.log("🏃 Player landed - ALL jump-blocking states force-reset for 100% reliable ground jumping");
        });

        // Player touching walls - separate collision for wall mechanics
        this.physics.add.collider(this.player, this.leftWall, (player, wall) => {
            this.handleWallContact('left');
        });

        this.physics.add.collider(this.player, this.rightWall, (player, wall) => {
            this.handleWallContact('right');
        });
    }

    handleWallContact(side) {
        this.isOnWall = true;
        this.wallSide = side;
        this.lastWallContact = this.time.now;
        this.canWallJump = true;
          // Wall sliding mechanics
        if (!this.isOnGround && this.player.body.velocity.y > 0) {
            this.isWallSliding = true;
            // Reduce falling speed when sliding on wall
            if (this.player.body.velocity.y > window.tower1Options.wallSlideMaxSpeed) {
                this.player.body.velocity.y *= window.tower1Options.wallSlideResistance;
            }
        }        // Bounce off wall and reverse running direction
        if (side === 'left') {
            this.runDirection = 1; // Now run right
            this.player.setVelocityX(window.tower1Options.bounceVelocity);
        } else if (side === 'right') {
            this.runDirection = -1; // Now run left
            this.player.setVelocityX(-window.tower1Options.bounceVelocity);
        }
        
        // Reset diving state when hitting wall
        if (this.isDiving) {
            console.log("🛑 Hit wall while diving - stopping dive");
            this.isDiving = false;
        }
        
        console.log(`🏃 Bounced off ${side} wall, now running ${this.runDirection === 1 ? 'right' : 'left'}`);    }

    handleJump() {
        if (this.gameState.gameOver || this.gameState.gameComplete) return;
        
        console.log("=== TOWER JUMP INPUT ===");
        console.log("On ground:", this.isOnGround);
        console.log("On wall:", this.isOnWall);
        console.log("Can wall jump:", this.canWallJump);
        console.log("Can dash jump:", this.canDashJump());
        console.log("Is diving:", this.isDiving);
        console.log("Is dashing:", this.isDashing);
        console.log("Is dash jumping:", this.isDashJumping);
        console.log("Is dash tweening:", this.isDashTweening);
        console.log("Player velocity Y:", this.player.body.velocity.y);
        console.log("Time since wall contact:", this.time.now - this.lastWallContact);
          // FIXED: Dash jump gets HIGHEST PRIORITY to prevent regular jump override
        if (this.canDashJump()) {
            console.log("✅ TOWER DASH JUMP - HIGHEST PRIORITY!");
            this.performDashJump();
            return;
        }
        
        // Ground jump - second priority, but only if not in dash jump window
        if (this.isOnGround && !this.canDashJump()) {
            console.log("✅ GROUND JUMP - Force resetting any blocking states");
            
            // Force reset ANY state that might block jumping
            if (this.isDashing || this.isDashTweening || this.isDiving || this.isWallSliding || this.canWallJump) {
                console.log("🔄 Force clearing blocking states for ground jump");
                this.tweens.killTweensOf(this.player);
                this.isDashing = false;
                this.isDashTweening = false;
                this.isDiving = false;
                this.isWallSliding = false;
                this.canWallJump = false;
                this.wallSide = null;
            }
            
            this.performRegularJump();
            return;
        }
        
        // Wall jump - only when touching wall and not grounded
        if (this.canWallJump && this.isOnWall && !this.isOnGround) {
            console.log("✅ WALL JUMP");
            this.performWallJump();
            return;
        }
        
        // Wall jump with coyote time - when recently left wall
        if (this.canWallJump && !this.isOnWall && !this.isOnGround && 
            (this.time.now - this.lastWallContact < window.tower1Options.wallCoyoteTime)) {
            console.log("✅ COYOTE WALL JUMP");
            this.performWallJump();
            return;
        }

        // Dive when airborne - lowest priority but always available
        if (!this.isDiving && !this.isOnGround) {
            console.log("✅ TOWER DIVE - IMMEDIATE - velocity Y:", this.player.body.velocity.y);
            this.isDiving = true;
            // Force downward velocity for immediate response
            this.player.setVelocityY(window.tower1Options.diveForce);
            this.player.setTint(0xffff00); // Yellow during dive
            
            // Stop any conflicting jump hold
            this.isJumping = false;
            this.jumpHoldTime = 0;
            
            // If dash jumping, end it immediately for dive
            if (this.isDashJumping) {
                console.log("🔄 Ending dash jump for immediate dive");
                this.isDashJumping = false;
            }
            
            return;
        }

        console.log("❌ No valid jump action available - ALL conditions failed");
        console.log("  - Already diving:", this.isDiving);
        console.log("  - On ground:", this.isOnGround);
        console.log("  - On wall:", this.isOnWall);
        console.log("  - Is dashing:", this.isDashing);
        console.log("  - Is dash jumping:", this.isDashJumping);
        console.log("  - Is dash tweening:", this.isDashTweening);
        console.log("  - Velocity Y:", this.player.body.velocity.y);
    }performWallJump() {
        console.log(`🧱 Wall jump from ${this.wallSide} wall!`);
        
        // Jump up and away from wall
        this.player.setVelocityY(-window.tower1Options.wallJumpForce);
        
        if (this.wallSide === 'left') {
            this.player.setVelocityX(window.tower1Options.wallJumpHorizontal);
        } else if (this.wallSide === 'right') {
            this.player.setVelocityX(-window.tower1Options.wallJumpHorizontal);
        }
        
        this.gameState.wallJumpsPerformed++;
        this.gameState.score += 10;
        
        // Reset states for clean wall jump
        this.isOnWall = false;
        this.canWallJump = false;
        this.isWallSliding = false;
        this.wallSide = null;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        this.jumpStartTime = this.time.now;
        this.isDiving = false; // Stop any diving
        
        // Visual feedback
        this.player.setTint(0x00ff00);
        this.cameras.main.flash(100, 0, 255, 0, false);
    }performRegularJump() {
        console.log("🦘 Regular jump from ground!");
        
        this.player.setVelocityY(-window.tower1Options.jumpForce);
        this.isOnGround = false;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        this.jumpStartTime = this.time.now;
        this.isDiving = false; // Stop any diving
        
        this.player.setTint(0x00ffff);
    }// Dash mechanics (from Stage1/2)
    doDash() {
        if (!this.dashReady || this.gameState.gameOver || this.gameState.gameComplete) return;
        
        // Prevent dashing while airborne - must be grounded or touching wall
        if (!this.isOnGround && !this.isOnWall) {
            console.log("❌ Cannot dash while airborne");
            return;
        }
          console.log("=== TOWER DASH ===");
        this.isDashing = true;
        this.isDashTweening = true;
        this.dashInvulnerable = true;
        
        // CRITICAL FIX: Temporarily clear grounded state to allow dash jump
        this.isOnGround = false;
        
        // Stop any existing tweens
        this.tweens.killTweensOf(this.player);
          // Clear conflicting states
        if (this.isDashJumpReturning) {
            this.isDashJumpReturning = false;
        }
        
        // Determine dash direction based on current wall contact or run direction
        let dashDirection = this.runDirection;
        if (this.isOnWall) {
            // Dash away from wall
            dashDirection = this.wallSide === 'left' ? 1 : -1;
        }
        
        const dashDistance = window.tower1Options.dashDistance;
        const targetX = Phaser.Math.Clamp(
            this.player.x + (dashDistance * dashDirection),
            75, // Don't go into left wall
            this.sys.game.config.width - 75 // Don't go into right wall
        );
        
        // Visual feedback
        this.player.setTint(0x00ffff); // Cyan during dash
        this.cameras.main.flash(50, 0, 255, 255, false);
        
        // Perform dash movement
        this.tweens.add({
            targets: this.player,
            x: targetX,
            duration: window.tower1Options.dashDuration,
            ease: 'Power2.easeOut',            onComplete: () => {
                console.log("🏃 Tower dash complete");
                this.isDashing = false;
                
                // Activate momentum boost after dash
                this.activateMomentumBoost();
                
                // Start dash jump window timer
                this.time.delayedCall(window.tower1Options.dashJumpWindow, () => {
                    if (!this.isDashJumping) {
                        this.isDashTweening = false;
                        this.dashInvulnerable = false;
                        
                        if (!this.isDashing && !this.isDashJumping && !this.isDiving) {
                            this.player.setTint(0x0088ff);
                        }
                    }
                });
            }
        });
    }

    // Dash jump mechanics (from Stage1/2)
    performDashJump() {
        console.log("🚀 === TOWER DASH JUMP! ===");
        
        // Stop any ongoing tweens
        this.tweens.killTweensOf(this.player);
        this.isDashTweening = false;
        
        // Determine jump direction - prefer wall jump direction if on wall
        let jumpDirection = this.runDirection;
        let jumpForce = window.tower1Options.jumpForce;
        let horizontalBoost = window.tower1Options.dashJumpHorizontalBoost;        if (this.isOnWall || this.canWallJump) {
            // Enhanced wall dash jump for tower gap clearing
            jumpForce = window.tower1Options.wallJumpForce;
            horizontalBoost = window.tower1Options.dashJumpHorizontalBoost * 1.8; // MASSIVE 80% more power (was 1.5)
            
            if (this.wallSide === 'left') {
                jumpDirection = 1; // Jump right from left wall
            } else if (this.wallSide === 'right') {
                jumpDirection = -1; // Jump left from right wall
            }
            
            // Reset wall states
            this.isOnWall = false;
            this.canWallJump = false;
            this.isWallSliding = false;
            this.wallSide = null;
        }
          // Apply forces
        this.player.setVelocityY(-jumpForce);
        this.player.setVelocityX(horizontalBoost * jumpDirection);
        
        // DEBUG: Log the initial dash jump forces
        console.log("🚀 INITIAL DASH JUMP FORCES:");
        console.log("  - Jump Force (Y):", -jumpForce);
        console.log("  - Horizontal Boost:", horizontalBoost);
        console.log("  - Jump Direction:", jumpDirection);
        console.log("  - Final X Velocity:", horizontalBoost * jumpDirection);
        console.log("  - Wall Dash Jump:", this.isOnWall || this.canWallJump ? "YES (1.8x boost)" : "NO (normal)");
        
        // Set states
        this.isDashJumping = true;
        this.dashJumpStartTime = this.time.now;
        this.dashInvulnerable = true;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        this.jumpStartTime = this.time.now;
        this.isDiving = false;
        this.isDashing = false;
        
        // Count as wall jump for scoring
        this.gameState.wallJumpsPerformed++;
        this.gameState.score += 15; // Extra points for dash jump
        
        // Visual feedback
        this.player.setTint(0xffff00); // Yellow for dash jump
        this.cameras.main.shake(300, 0.015);
        this.cameras.main.flash(100, 255, 255, 0, false);
        
        console.log("🚀 Dash jump applied - direction:", jumpDirection);
    }    // Check if dash jump is available (from Stage1/2)
    canDashJump() {
        const timeSinceDash = this.time.now - this.lastDashTime;
        const withinWindow = timeSinceDash <= (window.tower1Options.dashDuration + window.tower1Options.dashJumpWindow);
        const canJump = withinWindow && !this.isDashJumping; // Remove dashReady requirement - allow dash jump during window
        
        console.log("=== DASH JUMP CHECK ===");
        console.log("Time since dash:", timeSinceDash);
        console.log("Dash duration + window:", window.tower1Options.dashDuration + window.tower1Options.dashJumpWindow);
        console.log("Within window:", withinWindow);
        console.log("Not dash jumping:", !this.isDashJumping);
        console.log("Can dash jump:", canJump);
        
        return canJump;
    }

    // Activate momentum boost after dash
    activateMomentumBoost() {
        console.log("⚡ Momentum boost activated!");
        this.hasMomentumBoost = true;
        this.momentumBoostStartTime = this.time.now;
        
        // Visual feedback
        this.cameras.main.flash(100, 255, 200, 0, false); // Golden flash
        
        // Auto-remove boost after duration
        this.time.delayedCall(window.tower1Options.momentumBoostDuration, () => {
            this.hasMomentumBoost = false;
            console.log("⚡ Momentum boost expired");
        });
    }    updateHeightProgress() {
        // Calculate how high the player has climbed
        const startHeight = this.sys.game.config.height - window.tower1Options.playerStartHeight;
        const currentHeight = startHeight - this.player.y;
        const targetHeight = window.tower1Options.stageTargetHeight;
        
        this.gameState.currentHeight = Math.max(0, currentHeight);
        this.gameState.stageProgress = Math.min(100, (this.gameState.currentHeight / targetHeight) * 100);
        
        // Award points for reaching new heights
        if (this.gameState.currentHeight > this.lastGroundHeight) {
            const heightGain = this.gameState.currentHeight - this.lastGroundHeight;
            this.gameState.score += Math.floor(heightGain / 10);
            this.lastGroundHeight = this.gameState.currentHeight;
        }
    }    triggerGameOver(reason) {
        console.log("💀 === TOWER GAME OVER ===");
        console.log("Reason:", reason);
        
        this.gameState.gameOver = true;
        this.physics.pause();
        
        // CRITICAL: Immediately cut off all player input to prevent auto-restart
        this.pointerJustDown = false;
        this.pointerIsDown = false;
        
        if (this.timeTimer) {
            this.timeTimer.remove();
            console.log("🕒 Timer stopped");
        }
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = reason;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
            console.log("📺 Game Over screen displayed");
            console.log("🎮 Final score:", this.gameState.score);
        } else {
            console.error("❌ gameOverScreen element not found!");
        }
        
        // Check if restart/menu buttons exist
        if (this.domElements.gameOverRestartButtonMobile) {
            console.log("✅ Restart button found");
        } else {
            console.error("❌ Restart button not found!");
        }
        
        if (this.domElements.gameOverMenuButtonMobile) {
            console.log("✅ Menu button found");
        } else {
            console.error("❌ Menu button not found!");
        }
        
        this.cameras.main.shake(500, 0.02);
        this.player.setTint(0xff0000);
        
        console.log("💀 Game over setup complete - R key and buttons should work");
    }completeStage(reason) {
        console.log("🎉 === TOWER STAGE COMPLETION ===");
        console.log("Reason:", reason);
        
        this.gameState.gameComplete = true;
        this.gameState.completionReason = reason;
        
        // CRITICAL: Immediately cut off all player input to prevent interference
        this.pointerJustDown = false;
        this.pointerIsDown = false;
        
        if (this.timeTimer) {
            this.timeTimer.remove();
            console.log("🕒 Timer stopped");
        }
        
        // Calculate completion bonuses
        this.gameState.timeBonus = this.gameState.timeRemaining * 10;
        const wallJumpBonus = this.gameState.wallJumpsPerformed * 5;
        const heightBonus = Math.round(this.gameState.stageProgress * 2);
        
        this.gameState.score += this.gameState.timeBonus + wallJumpBonus + heightBonus;
        
        this.physics.pause();
        console.log("🎮 Physics paused, score calculated:", this.gameState.score);
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = `${reason} Stage Complete!`;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
            console.log("📺 Completion screen displayed");
        } else {
            console.error("❌ gameOverScreen element not found!");
        }
          this.cameras.main.flash(500, 0, 255, 0);
        this.player.setTint(0x00ff00);
        
        console.log("🎉 Tower completed! Setting up transition to Stage2 in 3 seconds...");
          // Transition to Stage2 after a delay - FIXED: Don't set sceneTransitioning until we actually transition
        this.time.delayedCall(3000, () => {
            console.log("⏰ 3 second delay complete - starting transition to Stage2");
            if (this.sceneTransitioning) {
                console.log("⚠️ Scene already transitioning, aborting");
                return;
            }
            this.sceneTransitioning = true;
            console.log("🔄 Starting scene transition to Stage2");
            
            // Hide the completion screen before transitioning
            if (this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
            if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
            
            console.log("🚀 Calling this.scene.start('Stage2')");
            this.scene.start("Stage2");
        });
    }    update(time, delta) {        if (this.gameState.gameOver || this.gameState.gameComplete) {
            // CRITICAL: Reset all input flags immediately during game over to prevent auto-restart
            this.pointerJustDown = false;
            this.pointerIsDown = false;
            
            // Game over controls with debugging
            if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
                console.log("🔄 R key pressed - attempting restart");
                if (this.sceneTransitioning) {
                    console.log("⚠️ Already transitioning, ignoring R key");
                    return;
                }
                this.sceneTransitioning = true;
                console.log("🔄 Setting sceneTransitioning = true, restarting scene");
                if(this.domElements.gameOverScreen) this.domElements.gameOverScreen.style.display = 'none';
                if (this.domElements.instructions) this.domElements.instructions.style.display = 'none';
                this.scene.restart();
            }
            if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
                console.log("🏠 ESC key pressed - returning to menu");
                if (this.sceneTransitioning) {
                    console.log("⚠️ Already transitioning, ignoring ESC key");
                    return;
                }
                this.sceneTransitioning = true;
                console.log("🏠 Setting sceneTransitioning = true, going to SceneSwitcher");
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
        }        // Handle jump input - CRITICAL: Block ALL input during game over/complete states
        if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown) && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.handleJump();
        }

        // Handle dash input (from Stage1/2) - CRITICAL: Block during game over states
        if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.dashReady && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.doDash();
            this.dashReady = false;
            this.lastDashTime = this.time.now;
        }

        // Dash cooldown management
        if (!this.shiftKey.isDown && (this.time.now - this.lastDashTime > window.tower1Options.dashCooldown)) {
            this.dashReady = true;
        }
          // Variable jump height when holding jump (only if not diving) - CRITICAL: Block during game over
        if (this.isJumping && !this.isDiving && (this.spaceKey.isDown || this.pointerIsDown) && 
            !this.gameState.gameOver && !this.gameState.gameComplete) {
            this.jumpHoldTime += delta;
            if (this.jumpHoldTime < window.tower1Options.maxJumpHold) {
                const scaledJumpForce = window.tower1Options.jumpHoldForce * (delta / 16.67);
                this.player.setVelocityY(this.player.body.velocity.y - scaledJumpForce);
            }
        }

        // Reset ground state each frame (will be set to true by collision)
        this.isOnGround = false;
          // Reset wall state if not touching walls recently
        if (this.time.now - this.lastWallContact > 100) {
            this.isOnWall = false;
            this.isWallSliding = false;
            this.canWallJump = false;
            this.wallSide = null;
        }
        
        // Special case: if player is clearly falling and not near a wall, allow diving even if canWallJump is true
        if (this.canWallJump && this.player.body.velocity.y > 100 && 
            this.time.now - this.lastWallContact > 200) {
            console.log("🔄 Clearing wall jump state for diving - falling fast and away from wall");
            this.canWallJump = false;
        }        // Handle dash jump sustained movement with improved momentum curve
        if (this.isDashJumping) {
            const timeSinceDashJump = this.time.now - this.dashJumpStartTime;
            if (timeSinceDashJump < window.tower1Options.dashJumpDuration) {
                const progress = timeSinceDashJump / window.tower1Options.dashJumpDuration;
                
                // MASSIVE momentum curve for tower gap clearing
                let forwardSpeed;
                if (progress < 0.4) {
                    forwardSpeed = 1200; // MASSIVE strong initial (was 800)
                } else if (progress < 0.7) {
                    forwardSpeed = 1000; // MASSIVE strong sustained (was 600)
                } else if (progress < 0.9) {
                    forwardSpeed = 700; // MASSIVE medium sustained (was 400)
                } else {
                    forwardSpeed = 400; // MASSIVE gentle ending (was 200)
                }
                
                // Apply in current jump direction
                const jumpDirection = this.player.body.velocity.x > 0 ? 1 : -1;
                this.player.setVelocityX(forwardSpeed * jumpDirection);
                
                // DEBUG: Log the dash jump values
                console.log("🚀 DASH JUMP ACTIVE - Speed:", forwardSpeed, "Direction:", jumpDirection, "Final X Velocity:", forwardSpeed * jumpDirection);
            } else {
                // End the dash jump with some residual momentum
                this.isDashJumping = false;
                this.dashInvulnerable = false;
                console.log("🚀 Dash jump completed - maintaining some momentum");
                
                // Give some residual horizontal momentum
                const finalDirection = this.player.body.velocity.x > 0 ? 1 : -1;
                this.player.setVelocityX(finalDirection * 150);
            }
        }// Auto-running mechanics - only when not in special states (including diving)
        if (!this.isOnWall && !this.isWallSliding && !this.isDashing && !this.isDashJumping && !this.isDiving) {
            // Apply momentum boost if active
            let currentRunSpeed = this.runSpeed;
            if (this.hasMomentumBoost) {
                currentRunSpeed *= window.tower1Options.momentumBoostMultiplier;
                console.log("⚡ Applying momentum boost:", currentRunSpeed, "direction:", this.runDirection);
            }
            
            // Apply constant horizontal velocity in the current run direction
            const finalVelocityX = this.runDirection * currentRunSpeed;
            this.player.setVelocityX(finalVelocityX);
            
            // Debug: log if velocity seems wrong
            if (Math.abs(finalVelocityX) > 500) {
                console.log("⚠️ High velocity detected:", finalVelocityX, "runSpeed:", currentRunSpeed, "direction:", this.runDirection);
            }        }
        
        // Safety mechanism: Reset diving if stuck while on ground
        if (this.isDiving && this.isOnGround) {
            console.log("🔧 Safety reset: Player diving while on ground - resetting dive state");
            this.isDiving = false;
        }

        // Check if player fell too far down
        if (this.player.y > this.sys.game.config.height + 100) {
            this.triggerGameOver("You fell out of the tower!");
            return;
        }

        // Update height progress
        this.updateHeightProgress();        // Ground state changes - ensure player can always jump when landing
        if (this.isOnGround && !this.wasGrounded) {
            console.log("🛬 Just landed - resetting all jump-blocking states");
            
            // ADDITIONAL SAFETY: Force reset ALL blocking states when transitioning to ground
            if (this.isDiving || this.isDashing || this.isDashTweening || this.canWallJump || this.isWallSliding) {
                console.log("🔧 SAFETY: Force clearing ALL states that could block ground jumping");
                this.tweens.killTweensOf(this.player);
                this.isDiving = false;
                this.isDashing = false;
                this.isDashTweening = false;
                this.canWallJump = false;
                this.isWallSliding = false;
                this.wallSide = null;
            }
            
            // Reset jump states
            this.isJumping = false;
            this.jumpHoldTime = 0;
        }
        
        // Additional dive state safety check
        if (this.isDiving && this.isOnGround) {
            console.log("🔧 Safety check: diving while on ground - resetting dive state");
            this.isDiving = false;
        }

        this.wasGrounded = this.isOnGround;        // Enhanced visual feedback based on state (simplified for tower)
        if (this.canDashJump()) {
            this.player.setTint(0xffaa00); // Orange for dash jump window
        } else if (this.isDashJumping) {
            this.player.setTint(0xffff00); // Yellow during dash jump
        } else if (this.isDashing) {
            this.player.setTint(0x00ffff); // Cyan during dash
        } else if (this.hasMomentumBoost) {
            this.player.setTint(0xff8800); // Orange during momentum boost
        } else if (this.dashInvulnerable) {
            this.player.setTint(0x88ffff); // Light cyan when invulnerable
        } else if (this.isDiving) {
            this.player.setTint(0xffff00); // Yellow during dive
        } else if (this.canWallJump && this.isWallSliding) {
            this.player.setTint(0xffaa00); // Orange when can wall jump while sliding
        } else if (this.isWallSliding) {
            this.player.setTint(0xffff00); // Yellow when sliding
        } else if (this.isOnGround) {
            this.player.setTint(0x0088ff); // Blue when grounded
        } else if (this.isJumping) {
            this.player.setTint(0x00ff00); // Green when jumping
        } else {
            // Default blue tint when running
            this.player.setTint(0x0088ff);
        }
        
        // Flip player sprite based on run direction
        this.player.setFlipX(this.runDirection === -1);

        this.updateUI();
        this.pointerJustDown = false;
    }    shutdown() {
        if (this.timeTimer) {
            this.timeTimer.remove();
        }
          if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
            this.hideOnScreenButtonsHandler = null;
        }
        
        // Clean up any active tweens
        this.tweens.killTweensOf(this.player);
        
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
}

window.tower1 = tower1;
