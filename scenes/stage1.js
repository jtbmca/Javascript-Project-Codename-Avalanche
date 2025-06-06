// Enhanced game options for street-level endless runner
window.gameOptions = window.gameOptions || {
    platformStartSpeed: 350,
    platformSpeedIncrease: 15,
    maxPlatformSpeed: 800
    ,
    playerGravity: 1200,     // Higher gravity for snappier jumps
    jumpForce: 400,         // Lower initial jump for taps
    maxJumpHold: 300,       // Longer hold time allowed
    jumpHoldForce: 40,      // Much stronger hold force
    playerStartPosition: 200,
    jumps: 1,
    difficultyIncreaseInterval: 10,
    pedestrianSpawnChance: 0.4, // 40% chance to spawn pedestrian
    timeLimit: 60,
    timeBonusPerScore: 0.5,
    momentumLossPerCollision: 15, // 15% momentum loss per collision
    momentumRecoveryRate: 0.1 // 0.1% recovery per frame (1%ps)
};

class Stage1 extends Phaser.Scene {
    constructor() {
        super("Stage1");
    }

    preload() {
        this.load.image("platform", "./assets/sprites/platformb.png"); // placeholder Street platform sprite
        this.load.image("player", "./assets/sprites/player.png"); //placeholder for player sprite
        this.load.image("pedestrian", "./assets/sprites/player.png"); // Using player sprite as pedestrian placeholder
    }

    create() {
        // Initialize game state
        this.gameState = {
            score: 0,
            level: 1,
            currentSpeed: window.gameOptions.platformStartSpeed,
            timeRemaining: window.gameOptions.timeLimit,
            momentum: 0, // Player momentum percentage (affects speed)
            gameOver: false,
            distanceTraveled: 0,
            collisionCooldown: 0
        };

        // Initialize DOM UI
        this.initializeUI();
        
        // Platform setup (continuous street)
        this.initializePlatforms();
        
        // Player setup
        this.setupPlayer();
        
        // Pedestrian setup
        this.setupPedestrians();
        
        // Input setup
        this.setupInput();
        
        // Physics collisions
        this.setupPhysics();
        
        // Game timer
        this.setupGameTimer();
        
        // Show instructions and hide after 5 seconds
        const instructions = document.getElementById('instructionsDisplay');
        if (instructions) {
            instructions.style.display = 'block';
            this.time.delayedCall(5000, () => {
                instructions.style.display = 'none';
            });
        }        this.isDiving = false;
        this.isJumping = false;      // Track if jump is in progress
        this.jumpHoldTime = 0;       // How long jump key is held
        this.maxJumpHold = 1000;      // Max ms for extra loft

        // Dash state initialization
        this.dashReady = true;
        this.dashCooldown = 1000; // ms cooldown between dashes
        this.lastDashTime = 0;
        this.isDashing = false; // NEW: Track if currently dashing
        this.dashDuration = 200; // NEW: How long dash lasts
        this.dashJumpWindow = 100; // NEW: Window at end of dash for dashJump (ms)

        // DashJump properties (ADD THESE NEW LINES)
        this.dashJumpForce = 600; // Stronger jump force for dashJump
        this.dashJumpHorizontalBoost = 300; // Extra horizontal momentum
        this.dashJumpMaxHeight = 450; // Higher max jump for dashJump
        this.lastCanDashJump = false; // Track dashJump window state changes


        // --- DASH BUTTON SETUP (place at the very end of create) ---
        const dashBtn = document.getElementById('dashButton');
        const scene = this; // Capture the Phaser scene context

        if (dashBtn) {
            dashBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                console.log("DASH BUTTON TOUCH");
                if (scene.dashReady && scene.isPlayerGrounded()) {
                    scene.doDash();
                    scene.dashReady = false;
                    scene.lastDashTime = scene.time.now;
                }
            });

            dashBtn.addEventListener('mousedown', function(e) {
                e.preventDefault();
                console.log("DASH BUTTON CLICKED");
                if (scene.dashReady && scene.isPlayerGrounded()) {
                    scene.doDash();
                    scene.dashReady = false;
                    scene.lastDashTime = scene.time.now;
                }
            });

            window.addEventListener('keydown', function() {
                dashBtn.style.display = 'none';
            });
        }
    }

    initializeUI() {
        // Get DOM elements
        this.domElements = {
            scoreDisplay: document.getElementById('scoreDisplay'),
            levelDisplay: document.getElementById('levelDisplay'),
            speedDisplay: document.getElementById('speedDisplay'),
            timeDisplay: document.getElementById('timeDisplay'),
            momentumDisplay: document.getElementById('momentumDisplay'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            gameOverReason: document.getElementById('gameOverReason'),
            gameOverScore: document.getElementById('gameOverScore'),
            instructions: document.getElementById('instructionsDisplay')
        };

        // Update initial UI
        this.updateUI();
    }

    updateUI() {
        if (!this.domElements.scoreDisplay) return;

        this.domElements.scoreDisplay.textContent = `Score: ${this.gameState.score}`;
        this.domElements.levelDisplay.textContent = `Level: ${this.gameState.level}`;
        this.domElements.speedDisplay.textContent = `Speed: ${Math.round(this.gameState.currentSpeed)}`;
        this.domElements.timeDisplay.textContent = `Time: ${this.gameState.timeRemaining}s`;
        
        // Update momentum display with color coding
        const momentum = Math.round(this.gameState.momentum);
        this.domElements.momentumDisplay.textContent = `Momentum: ${momentum}%`;
        
        // Color code momentum
        if (momentum >= 80) {
            this.domElements.momentumDisplay.style.color = '#00ff00'; // Green
        } else if (momentum >= 60) {
            this.domElements.momentumDisplay.style.color = '#ffff00'; // Yellow
        } else if (momentum >= 40) {
            this.domElements.momentumDisplay.style.color = '#ff6600'; // Orange
        } else {
            this.domElements.momentumDisplay.style.color = '#ff0000'; // Red
        }
    }

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

        // Create continuous street platform (no gaps)
        this.createContinuousStreet();
        
        // Calculate origin Y position
        let platformY = this.sys.game.config.height * 0.8;
        this.originY = platformY - 50; // Fixed height above street
    }

    createContinuousStreet() {
        // Create overlapping platforms to ensure no gaps
        const platformWidth = this.sys.game.config.width;
        const numPlatforms = 5; // Increased for better coverage
        
        for (let i = 0; i < numPlatforms; i++) {
            this.addStreetSegment(i * (platformWidth * 0.7)); // Increased overlap (30%)
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
        platform.displayWidth = this.sys.game.config.width * 1.4; // Increased overlap
        platform.setVelocityX(this.getAdjustedSpeed() * -1);
    }

    setupPlayer() {
        this.player = this.physics.add.sprite(
            window.gameOptions.playerStartPosition,
            this.originY,
            "player"
        );
        this.player.setGravityY(window.gameOptions.playerGravity);
        this.player.setCollideWorldBounds(true, false, false, false, true);
        this.playerJumps = 0;
        this.jumpTimer = 0;  // Add timer for jump buffer
        this.jumpBufferDuration = 150; // 150ms buffer for more responsive jumps
        
        // Player visual feedback
        this.player.setTint(0x0088ff); // Blue tint for player
    }

    setupPedestrians() {
        // Pedestrian 1 - Fast walker
        this.pedestrian1 = this.physics.add.sprite(
            this.sys.game.config.width + 100,
            this.originY,
            "pedestrian"
        );
        this.pedestrian1.setImmovable(true);
        this.pedestrian1.setTint(0xff6600); // Orange tint

        // Pedestrian 2 - Medium speed
        this.pedestrian2 = this.physics.add.sprite(
            this.sys.game.config.width + 300,
            this.originY,
            "pedestrian"
        );
        this.pedestrian2.setImmovable(true);
        this.pedestrian2.setTint(0xff0066); // Pink tint

        // Pedestrian 3 - Slow but wide
        this.pedestrian3 = this.physics.add.sprite(
            this.sys.game.config.width + 500,
            this.originY,
            "pedestrian"
        );
        this.pedestrian3.setImmovable(true);
        this.pedestrian3.setTint(0x6600ff); // Purple tint
        this.pedestrian3.setScale(1.3); // Larger pedestrian

        this.pedestrians = [this.pedestrian1, this.pedestrian2, this.pedestrian3];
        this.updatePedestrianSpeeds();
    }

    updatePedestrianSpeeds() {
        const baseSpeed = this.getAdjustedSpeed();
        const speedMultipliers = [1.2, 0.9, 0.7]; // Different walking speeds
        
        this.pedestrians.forEach((pedestrian, index) => {
            pedestrian.setVelocityX(baseSpeed * speedMultipliers[index] * -1);
        });
    }

    getAdjustedSpeed() {
        // Apply momentum to current speed
        return this.gameState.currentSpeed * (this.gameState.momentum / 100);
    }

    setupInput() {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.pointerIsDown = false;
        this.pointerJustDown = false;

        this.input.on('pointerdown', () => {
            this.pointerIsDown = true;
            this.pointerJustDown = true;
        });
        this.input.on('pointerup', () => {
            this.pointerIsDown = false;
        });
    }

    handlePointerDown() {
        if (this.gameState.gameOver) return;
        
        if (this.isPlayerGrounded()) {
            this.handleJumpOrDive();
        } else if (!this.isDiving) {
            this.handleJumpOrDive();
        }
    }

    handlePointerUp() {
        if (this.gameState.gameOver) return;
        this.endJumpHold();
    }

handleJumpOrDive() {
    if (this.gameState.gameOver) return;
    
    console.log("=== JUMP INPUT DETECTED ===");
    console.log("Player grounded:", this.isPlayerGrounded());
    console.log("Can dash jump:", this.canDashJump());
    console.log("isDashing:", this.isDashing);
    
    if (this.isPlayerGrounded()) {
        // Check for dashJump first
        if (this.canDashJump()) {
            console.log("✅ Triggering DASH JUMP!");
            this.dashJump();
            return;
        }
        
        console.log("✅ Triggering REGULAR JUMP");
        // Regular jump logic
        this.player.setVelocityY(window.gameOptions.jumpForce * -1);
        this.isDiving = false;
        this.isJumping = true;
        this.jumpHoldTime = 0;
        this.jumpStartTime = this.time.now;
        
        // Visual feedback
        this.player.setTint(0x00ff00);
    } else if (!this.isDiving && !this.isPlayerGrounded()) {
        console.log("✅ Triggering DIVE");
        // Dive logic unchanged
        this.isDiving = true;
        this.player.setVelocityY(900);
        this.player.setTint(0xffff00);
    }
}

    endJumpHold() {
        this.isJumping = false;
        this.jumpQueued = false;
    }

    // Add this helper method
    isPlayerGrounded() {
        return this.player.body.touching.down || this.player.body.blocked.down;
    }

    setupPhysics() {
        this.physics.add.collider(this.player, this.platformGroup);
        
        // Collision with pedestrians (momentum loss, not game over)
        this.pedestrians.forEach(pedestrian => {
            this.physics.add.overlap(this.player, pedestrian, this.hitPedestrian, null, this);
        });
    }

    setupGameTimer() {
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    hitPedestrian(player, pedestrian) {
        // Only apply momentum loss if not in cooldown
        if (this.gameState.collisionCooldown <= 0) {
            this.gameState.momentum = Math.max(10, 
                this.gameState.momentum - window.gameOptions.momentumLossPerCollision);
            
            // Set collision cooldown to prevent multiple hits
            this.gameState.collisionCooldown = 45; // ~.75 second at 60fps
            
            // Visual feedback
            this.cameras.main.shake(100, 0.01);
            this.player.setTint(0xff4444);
            
            // Reset player tint after brief moment
            this.time.delayedCall(200, () => {
                this.player.setTint(0x0088ff);
            });
            
            // Update speeds based on new momentum
            this.updateAllSpeeds();
        }
    }

    updateAllSpeeds() {
        const adjustedSpeed = this.getAdjustedSpeed();
        
        // Update platform speeds
        this.platformGroup.getChildren().forEach(platform => {
            platform.setVelocityX(adjustedSpeed * -1);
        });
        
        // Update pedestrian speeds
        this.updatePedestrianSpeeds();
    }

    updateTimer() {
        if (this.gameState.gameOver) return;
        
        this.gameState.timeRemaining--;
        
        if (this.gameState.timeRemaining <= 0) {
            this.triggerGameOver("Time's up!");
        }
    }

    updateScore(points = 10) {
        this.gameState.score += points;
        this.gameState.timeRemaining += window.gameOptions.timeBonusPerScore;
        
        if (this.gameState.score > 0 && 
            this.gameState.score % window.gameOptions.difficultyIncreaseInterval === 0) {
            this.increaseDifficulty();
        }
    }

    increaseDifficulty() {
        this.gameState.level++;
        this.gameState.currentSpeed = Math.min(
            this.gameState.currentSpeed + window.gameOptions.platformSpeedIncrease,
            window.gameOptions.maxPlatformSpeed
        );
        
        this.updateAllSpeeds();
        
        // Visual feedback for level up
        this.cameras.main.flash(200, 0, 255, 0);
    }

    triggerGameOver(reason) {
        this.gameState.gameOver = true;
        this.physics.pause();
        
        // Show game over screen
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = reason;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        if (this.gameTimer) {
            this.gameTimer.remove();
        }
        
        this.cameras.main.shake(500, 0.02);
        this.player.setTint(0xff0000);
    }    update(time, delta) {
        if (this.gameState.gameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.domElements.gameOverScreen.style.display = 'none';
                this.scene.restart();
            }
            if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
                this.domElements.gameOverScreen.style.display = 'none';
                this.scene.start("SceneSwitcher");
            }
            return;
        }        // Handle ESC key
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            // Ensure UI elements are hidden when leaving the scene
            if (this.domElements.gameOverScreen) {
                this.domElements.gameOverScreen.style.display = 'none';
            }
            if (this.domElements.instructions) {
                this.domElements.instructions.style.display = 'none';
            }
            this.scene.start("SceneSwitcher");
            return;
        }

        // Unify input for jump
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown;
        const jumpHeld = this.spaceKey.isDown || this.pointerIsDown;

        if (jumpPressed) {
            this.handleJumpOrDive();
        }

        if (jumpHeld && this.isJumping && this.time.now - this.jumpStartTime < window.gameOptions.maxJumpHold) {
            this.player.setVelocityY(window.gameOptions.jumpForce * -1);
        }

        if (!jumpHeld && this.isJumping && !this.isPlayerGrounded()) {
            this.isJumping = false;
            if (this.player.body.velocity.y < 0) {
                this.player.setVelocityY(this.player.body.velocity.y * 0.3);
            }
        }

        if (this.player.y > this.sys.game.config.height) {
            this.triggerGameOver("You Fell UNDER the street! HOW?!?!?!");
            return;
        }

        // Keep player at fixed X position
        this.player.x = window.gameOptions.playerStartPosition;
        // Update collision cooldown
        if (this.gameState.collisionCooldown > 0) {
            this.gameState.collisionCooldown--;
        }

        // Gradually recover momentum
        if (this.gameState.momentum < 100) {
            this.gameState.momentum = Math.min(100, 
                this.gameState.momentum + window.gameOptions.momentumRecoveryRate);
            this.updateAllSpeeds();
        }

        // Update distance and score
        this.gameState.distanceTraveled += this.getAdjustedSpeed() * (1/60);
        if (Math.floor(this.gameState.distanceTraveled) % 100 === 0 && 
            Math.floor(this.gameState.distanceTraveled) > 0) {
            this.updateScore(1);
        }

        // Manage pedestrians
        this.pedestrians.forEach((pedestrian, index) => {
            if (pedestrian.x < -pedestrian.displayWidth / 2) {
                const basePositions = [100, 300, 500];
                const randomOffset = Phaser.Math.Between(-50, 200);
                pedestrian.x = this.sys.game.config.width + basePositions[index] + randomOffset;
                pedestrian.y = this.originY;
            }
        });

        // Manage continuous street platforms with improved logic
        let minDistance = this.sys.game.config.width * 2; // Increased tracking distance
        let rightmostX = -Infinity;
        
        this.platformGroup.getChildren().forEach(function(platform) {
            rightmostX = Math.max(rightmostX, platform.x + platform.displayWidth / 2);
            let platformDistance = this.sys.game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);
            
            // Remove platforms that are fully off screen to the left
            if (platform.x + platform.displayWidth / 2 < -100) { // Added buffer
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // Add new street segments as needed, further to the right
        if (minDistance > this.sys.game.config.width * 0.2 || // Trigger earlier
            rightmostX < this.sys.game.config.width * 1.5) {  // Ensure coverage
            // Spawn new platform off screen with extra buffer
            this.addStreetSegment(this.sys.game.config.width + 200);
        }

        // Handle jump buffer timing
        if (this.jumpTimer > 0) {
            if (time - this.jumpTimer > this.jumpBufferDuration) {
                this.jumpTimer = 0;
                this.isJumping = false; // Ensure jumping state is cleared if buffer expires
            }
        }

        // Variable jump height logic
        if (this.isJumping && !this.isPlayerGrounded()) {
            const holdDuration = this.time.now - this.jumpStartTime;
            if ((this.spaceKey.isDown || this.pointerIsDown) &&
                holdDuration < window.gameOptions.maxJumpHold) {
                this.player.setVelocityY(this.player.body.velocity.y - window.gameOptions.jumpHoldForce * (delta / 16.67));
            } else {
                this.isJumping = false;
                if (this.player.body.velocity.y < 0) {
                    this.player.setVelocityY(this.player.body.velocity.y * 0.3);
                }
            }
        }

        // Only reset jump state when landing (transition from air to ground)
        if (this.isPlayerGrounded() && !this.wasGrounded) {
            if (this.isDiving) {
                this.isDiving = false;
                this.player.setTint(0x0088ff);
            }
            this.isJumping = false;
            this.jumpTimer = 0;
            this.jumpHoldTime = 0;
            this.playerJumps = 0;
        }

        // Track grounded state for next frame
        this.wasGrounded = this.isPlayerGrounded();

        // Update DOM UI
        this.updateUI();

        // At the END of update, reset pointerJustDown
        this.pointerJustDown = false;

        // DASH LOGIC
           const dashPressed = this.shiftKey.isDown && this.isPlayerGrounded() && !this.isJumping;

    console.log("dashPressed:", dashPressed, "dashReady:", this.dashReady, "grounded:", this.isPlayerGrounded(), "jumping:", this.isJumping);

    // Only allow dash if ready and not already dashing
    if (dashPressed && this.dashReady) {
        this.doDash();
        this.dashReady = false;
        this.lastDashTime = this.time.now;
    }

    // Reset dash after cooldown and after releasing input
    if (!dashPressed && (this.time.now - this.lastDashTime > this.dashCooldown)) {
        this.dashReady = true;
    }

    // ADD THIS NEW SECTION HERE - Visual feedback for dashJump window
    if (this.canDashJump()) {
        this.player.setTint(0xffaa00); // Orange tint during dashJump window
        console.log("DASH JUMP WINDOW ACTIVE!"); // Visual indicator in console
    } else if (this.isDashing) {
        // Keep dash visual during dash
        this.player.setTint(0x00ffff); // Cyan during dash
    } else if (this.isPlayerGrounded() && !this.isJumping && !this.isDiving) {
        // Reset to normal color when grounded and not in special state
        this.player.setTint(0x0088ff); // Normal blue
    }
}

    
    // Enhanced Dash function
doDash() {
    console.log("=== DASH STARTED ===");
    console.log("Time:", this.time.now);
    console.log("Player position:", this.player.x, this.player.y);
    
    // Set dash state
    this.isDashing = true;
    console.log("isDashing set to:", this.isDashing);
    
    // Dash: burst of speed to the right
    this.player.setVelocityX(600);
    this.player.setTint(0x00ffff);
    
    // End dash after duration
    this.time.delayedCall(this.dashDuration, () => {
        console.log("=== DASH ENDING ===");
        console.log("Time:", this.time.now);
        
        if (this.isPlayerGrounded()) {
            this.player.setVelocityX(0);
        }
        
        // Keep dash state for dashJump window
        this.time.delayedCall(this.dashJumpWindow, () => {
            console.log("=== DASH JUMP WINDOW CLOSED ===");
            console.log("Time:", this.time.now);
            this.isDashing = false;
        });
    });
}
// NEW: DashJump function - call this instead of regular jump when conditions are met
dashJump() {
    console.log("🚀 === DASH JUMP ACTIVATED! ===");
    console.log("Jump force:", this.dashJumpForce);
    console.log("Horizontal boost:", this.dashJumpHorizontalBoost);
    console.log("Player velocity before:", this.player.body.velocity.x, this.player.body.velocity.y);
    
    // Powerful jump with extra height and forward momentum
    this.player.setVelocityY(this.dashJumpForce * -1);
    this.player.setVelocityX(this.dashJumpHorizontalBoost);
    
    console.log("Player velocity after:", this.player.body.velocity.x, this.player.body.velocity.y);
    
    this.isDiving = false;
    this.isJumping = true;
    this.jumpHoldTime = 0;
    this.jumpStartTime = this.time.now;
    
    // Special visual feedback for dashJump
    this.player.setTint(0xffff00); // Gold color for dashJump
    
    // Camera effect for dramatic feel
    this.cameras.main.shake(100, 0.005);
    
    // Reset dash state
    this.isDashing = false;
    console.log("Dash state reset, isDashing:", this.isDashing);
}

// NEW: Check if player can perform dashJump
canDashJump() {
    const timeSinceDashStart = this.time.now - this.lastDashTime;
    const dashEndTime = this.dashDuration;
    const dashJumpWindowEnd = this.dashDuration + this.dashJumpWindow;
    
    const canDash = this.isDashing && 
           timeSinceDashStart >= dashEndTime && 
           timeSinceDashStart <= dashJumpWindowEnd &&
           this.isPlayerGrounded();
    
    // Debug logging (only log when conditions change to avoid spam)
    if (canDash && !this.lastCanDashJump) {
        console.log("🟡 DASH JUMP WINDOW OPENED!");
        console.log("Time since dash start:", timeSinceDashStart);
        console.log("Dash end time:", dashEndTime);
        console.log("Window end time:", dashJumpWindowEnd);
    }
    
    this.lastCanDashJump = canDash; // Track state change
    return canDash;
}
}

window.Stage1 = Stage1;