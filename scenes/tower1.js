// Tower1: Interior Wall-Jumping Tower Climb - Inspired by Kid Icarus
// Jayceon smashes through a window and must wall-jump up a tall building interior to escape

// Tower1 specific game options
window.tower1Options = {
    playerGravity: 1000,                       // Gravity for wall jumping
    jumpForce: 420,                            // Base jump force
    wallJumpForce: 450,                        // Wall jump force (slightly higher)
    wallJumpHorizontal: 300,                   // Horizontal velocity from wall jump
    maxJumpHold: 200,                          // Shorter jump hold for precise movemzent
    jumpHoldForce: 6000,                         // Jump hold force
    playerStartPosition: 100,                  // Start near left side
    bounceVelocity: 250,                       // Velocity when bouncing off walls
    wallSlideMaxSpeed: 200,                    // Maximum speed when sliding down walls
    wallSlideSpeed: 150,                       // Wall slide speed (used in update method)
    wallSlideResistance: 0.9,                  // Wall slide friction
    stageDuration: 60,                         // 60 second time limit - THE MISSILE IS APPROACHING
    stageTargetHeight: 1200,                   // Target height to reach (pixels up from start)
    momentumLossPerCollision: 0,               // No momentum loss - no pedestrians here
    
    // Wall jumping timing
    wallJumpWindow: 300,                       // Time window to perform wall jump (ms)
    wallCoyoteTime: 150,                       // Time after leaving wall to still wall jump
    
    // Visual settings
    towerWidth: 600,                           // Width of the tower interior
    platformCount: 8,                          // Number of platforms to climb
    platformSpacing: 150,                      // Vertical spacing between platforms
};

class tower1 extends Phaser.Scene {
    constructor() {
        super("tower1");
        this.hideOnScreenButtonsHandler = null;
    }

    preload() {
        this.load.image("platform", "./assets/sprites/platformb.png");
        this.load.image("player", "./assets/sprites/player.png");
        this.load.image("wall", "./assets/sprites/platformb.png");
    }

    create() {        console.log("🏗️ Tower1 scene starting...");
        
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

        console.log("🎮 Game state initialized");

        // Initialize DOM UI
        this.initializeUI();
        
        // Make on-screen buttons visible
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'block';

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
        this.wallSide = null; // 'left' or 'right'
        this.lastWallContact = 0;
        this.canWallJump = false;
        this.isWallSliding = false;
        this.lastGroundHeight = this.sys.game.config.height - 50; // Track highest ground reached
        
        // Auto-running state - Jayceon never stops running!
        this.runDirection = 1; // 1 for right, -1 for left
        this.runSpeed = 200; // Constant running speed        // Camera setup for vertical movement
        this.cameras.main.setBounds(0, -window.tower1Options.stageTargetHeight, 
            this.sys.game.config.width, this.sys.game.config.height + window.tower1Options.stageTargetHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.3);
        
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
    }

    showTowerInstructions() {
        const instructions = this.domElements.instructions;
        if (instructions) {
            instructions.innerHTML = `
                <h3 style="color: #ff6600; margin: 0 0 10px 0;">TOWER ESCAPE!</h3>
                <p style="margin: 5px 0;">• Jayceon crashed through the window!</p>
                <p style="margin: 5px 0;">• He automatically runs and bounces off walls</p>
                <p style="margin: 5px 0;">• JUMP to wall-jump off walls</p>
                <p style="margin: 5px 0;">• Time your jumps to climb higher</p>
                <p style="margin: 5px 0;">• Reach the top before time runs out!</p>
                <p style="margin: 5px 0; color: #ff4444;">• 60 seconds until the missile hits!</p>
            `;
            instructions.style.display = 'block';
            
            // Hide instructions after 6 seconds
            this.time.delayedCall(6000, () => {
                if (instructions) instructions.style.display = 'none';
            });
        }
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
            gameOverRestartButtonMobile: document.getElementById('gameOverRestartButtonMobile'),
            gameOverMenuButtonMobile: document.getElementById('gameOverMenuButtonMobile'),
        };

        this.updateUI();
    }

    updateUI() {
        if (!this.domElements.scoreDisplay) return;

        this.domElements.scoreDisplay.textContent = `Score: ${this.gameState.score}`;
        this.domElements.levelDisplay.textContent = `Height: ${Math.round(this.gameState.stageProgress)}%`;
        this.domElements.speedDisplay.textContent = `Wall Jumps: ${this.gameState.wallJumpsPerformed}`;
        this.domElements.timeDisplay.textContent = `Time: ${this.gameState.timeRemaining}s`;
        this.domElements.momentumDisplay.textContent = `Climb Speed: ${this.isWallSliding ? 'SLIDING' : (this.canWallJump ? 'READY' : 'JUMPING')}`;
        
        // Color coding for status
        if (this.canWallJump) {
            this.domElements.momentumDisplay.style.color = '#00ff00'; 
        } else if (this.isWallSliding) {
            this.domElements.momentumDisplay.style.color = '#ffff00'; 
        } else {
            this.domElements.momentumDisplay.style.color = '#0088ff'; 
        }
    }

    updateTimer() {
        if (this.gameState.gameOver || this.gameState.gameComplete) return;
        
        this.gameState.timeRemaining--;
        
        if (this.gameState.timeRemaining <= 0) {
            this.triggerGameOver("Time's up! The missile hit the city!");
        }
    }

    initializeTower() {
        console.log("🏗️ Creating tower structure...");
        
        // Create walls on left and right sides
        this.leftWall = this.physics.add.staticGroup();
        this.rightWall = this.physics.add.staticGroup();
        this.platforms = this.physics.add.staticGroup();
          const towerHeight = window.tower1Options.stageTargetHeight + this.sys.game.config.height;
        const wallThickness = 50;
        
        console.log("Building walls with height:", towerHeight, "thickness:", wallThickness);
        
        // Create left wall segments
        for (let y = this.sys.game.config.height; y >= -window.tower1Options.stageTargetHeight; y -= 100) {
            let leftWallPiece = this.add.rectangle(wallThickness / 2, y, wallThickness, 100, 0x404040);
            this.physics.add.existing(leftWallPiece, true);
            this.leftWall.add(leftWallPiece);
        }
          // Create right wall segments
        for (let y = this.sys.game.config.height; y >= -window.tower1Options.stageTargetHeight; y -= 100) {
            let rightWallPiece = this.add.rectangle(this.sys.game.config.width - wallThickness / 2, y, wallThickness, 100, 0x404040);
            this.physics.add.existing(rightWallPiece, true);
            this.rightWall.add(rightWallPiece);
        }
        
        // Create floor
        let floor = this.add.rectangle(this.sys.game.config.width / 2, this.sys.game.config.height - 25, this.sys.game.config.width, 50, 0x606060);
        this.physics.add.existing(floor, true);
        this.platforms.add(floor);
        
        // Create ceiling (goal)
        let ceiling = this.add.rectangle(this.sys.game.config.width / 2, -window.tower1Options.stageTargetHeight + 25, this.sys.game.config.width - 100, 50, 0x00ff00);
        this.physics.add.existing(ceiling, true);
        this.platforms.add(ceiling);
        ceiling.isGoal = true;
          // Create some platforms to aid climbing
        const numPlatforms = window.tower1Options.platformCount;
        const spacing = window.tower1Options.platformSpacing;
        
        for (let i = 1; i < numPlatforms; i++) {
            const y = this.sys.game.config.height - (i * spacing);
            const platformWidth = 200;
            const isLeftSide = (i % 2 === 1);
            const x = isLeftSide ? 
                (wallThickness + platformWidth / 2 + 20) : 
                (this.sys.game.config.width - wallThickness - platformWidth / 2 - 20);
            
            let platform = this.add.rectangle(x, y, platformWidth, 20, 0x808080);
            this.physics.add.existing(platform, true);
            this.platforms.add(platform);
        }
        
        console.log("🏗️ Tower created with", this.platforms.children.entries.length, "platforms");
        console.log("🧱 Left wall pieces:", this.leftWall.children.entries.length);
        console.log("🧱 Right wall pieces:", this.rightWall.children.entries.length);
    }    setupPlayer() {
        // Create player sprite - animations will be handled differently
        this.player = this.physics.add.sprite(
            window.tower1Options.playerStartPosition,
            this.sys.game.config.height - 100,
            "player"
        );
        this.player.setGravityY(window.tower1Options.playerGravity);
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.1);
        this.player.setTint(0x0088ff);
        
        // Set player bounds to prevent going outside tower walls
        this.player.body.setMaxVelocity(400, 600);
        
        console.log("👤 Player created at:", this.player.x, this.player.y);
    }

    setupInput() {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
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

        // Touch button setup
        const scene = this;
        if (this.domElements.jumpButton) {
            this.domElements.jumpButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = true;
                scene.pointerJustDown = true;
            });
            
            this.domElements.jumpButton.addEventListener('mousedown', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = true;
                scene.pointerJustDown = true;
            });
            
            this.domElements.jumpButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                scene.pointerIsDown = false;
            });
            
            this.domElements.jumpButton.addEventListener('mouseup', function(e) {
                e.preventDefault();
                scene.pointerIsDown = false;
            });
        }

        // Restart/menu buttons
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
                    scene.scene.start("SceneSwitcher");
                }
            });
        }
    }

    setupPhysics() {
        // Player collides with platforms
        this.physics.add.collider(this.player, this.platforms, (player, platform) => {
            if (platform.isGoal && !this.gameState.gameComplete) {
                this.completeStage("You escaped the tower!");
                return;
            }
            this.isOnGround = true;
            this.isOnWall = false;
            this.wallSide = null;
            this.isWallSliding = false;
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
        }

        // Bounce off wall and reverse running direction
        if (side === 'left') {
            this.runDirection = 1; // Now run right
            this.player.setVelocityX(window.tower1Options.bounceVelocity);
        } else if (side === 'right') {
            this.runDirection = -1; // Now run left
            this.player.setVelocityX(-window.tower1Options.bounceVelocity);
        }
        
        console.log(`🏃 Bounced off ${side} wall, now running ${this.runDirection === 1 ? 'right' : 'left'}`);
    }

    handleJump() {
        if (this.gameState.gameOver || this.gameState.gameComplete) return;
          // Wall jump has priority
        if (this.canWallJump && (this.isOnWall || (this.time.now - this.lastWallContact < window.tower1Options.wallCoyoteTime))) {
            this.performWallJump();
        }
        // Regular jump from ground
        else if (this.isOnGround) {
            this.performRegularJump();
        }
    }

    performWallJump() {
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
        
        // Reset wall states
        this.isOnWall = false;
        this.canWallJump = false;
        this.isWallSliding = false;
        this.wallSide = null;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        
        // Visual feedback
        this.player.setTint(0x00ff00);
        this.cameras.main.flash(100, 0, 255, 0, false);
    }    performRegularJump() {
        console.log("🦘 Regular jump from ground!");
        
        this.player.setVelocityY(-window.tower1Options.jumpForce);
        this.isOnGround = false;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        
        this.player.setTint(0x00ffff);
    }

    updateHeightProgress() {        // Calculate how high the player has climbed
        const startHeight = this.sys.game.config.height - 100;
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
    }

    triggerGameOver(reason) {
        this.gameState.gameOver = true;
        this.physics.pause();
        
        if (this.timeTimer) {
            this.timeTimer.remove();
        }
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = reason;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.shake(500, 0.02);
        this.player.setTint(0xff0000);
    }

    completeStage(reason) {
        this.gameState.gameComplete = true;
        this.gameState.completionReason = reason;
        
        if (this.timeTimer) {
            this.timeTimer.remove();
        }
        
        // Calculate completion bonuses
        this.gameState.timeBonus = this.gameState.timeRemaining * 10;
        const wallJumpBonus = this.gameState.wallJumpsPerformed * 5;
        const heightBonus = Math.round(this.gameState.stageProgress * 2);
        
        this.gameState.score += this.gameState.timeBonus + wallJumpBonus + heightBonus;
        
        this.physics.pause();
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = `${reason} Stage Complete!`;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.flash(500, 0, 255, 0);
        this.player.setTint(0x00ff00);
        
        console.log("🎉 Tower completed! Moving to next stage...");
        
        // Transition to Stage2 after a delay
        this.time.delayedCall(3000, () => {
            this.scene.start("Stage2");
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
                this.scene.start("SceneSwitcher");
            }
            return;
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            this.scene.start("SceneSwitcher");
            return;
        }
        
        // Handle jump input
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown) {
            this.handleJump();
        }        // Variable jump height when holding jump
        if (this.isJumping && (this.spaceKey.isDown || this.pointerIsDown)) {
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

        // Auto-running mechanics - Jayceon never stops running!
        if (!this.isOnWall && !this.isWallSliding) {
            // Apply constant horizontal velocity in the current run direction
            this.player.setVelocityX(this.runDirection * this.runSpeed);
        }

        // Check if player fell too far down
        if (this.player.y > this.sys.game.config.height + 100) {
            this.triggerGameOver("You fell out of the tower!");
            return;
        }

        // Update height progress
        this.updateHeightProgress();        // Visual feedback based on state (colors only, no animations)
        if (this.canWallJump && this.isWallSliding) {
            this.player.setTint(0xffaa00); // Orange when can wall jump
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
    }

    shutdown() {
        if (this.timeTimer) {
            this.timeTimer.remove();
        }
        
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
            this.hideOnScreenButtonsHandler = null;
        }
        
        this.pointerIsDown = false;
        this.pointerJustDown = false;
    }
}

window.tower1 = tower1;
