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
        this.hideOnScreenButtonsHandler = null; // For managing the global keydown listener
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
            momentum: 0, // Player momentum percentage (affects speed) - User's original value
            gameOver: false,
            distanceTraveled: 0,
            collisionCooldown: 0,
            lastScoreSegment: 0 // Track last score segment for distance scoring
        };

        // Initialize DOM UI
        this.initializeUI(); // Call this first to get domElements
        
        // Make on-screen buttons visible at scene start/restart
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'block';
        if (this.domElements.dashButton) this.domElements.dashButton.style.display = 'block';

        // Platform setup (continuous street)
        this.initializePlatforms();
        
        // Player setup
        this.setupPlayer();
        
        // Pedestrian setup
        this.setupPedestrians();
        
        // Input setup
        this.setupInput(); // Original input setup
        
        // Physics collisions
        this.setupPhysics();
        
        // Game timer
        this.setupGameTimer();
        
        // Show instructions and hide after 5 seconds
        const instructions = this.domElements.instructions; // Use stored reference
        if (instructions) {
            instructions.style.display = 'block';
            this.time.delayedCall(5000, () => {
                if (instructions) instructions.style.display = 'none';
            });
        }        
        this.isDiving = false;
        this.isJumping = false;      // Track if jump is in progress
        this.jumpHoldTime = 0;       // How long jump key is held
        // this.maxJumpHold = 1000; // This is in gameOptions now as maxJumpHold

        // Dash state initialization
        this.dashReady = true;
        this.dashCooldown = 1000; // ms cooldown between dashes
        this.lastDashTime = 0;
        this.isDashing = false; 
        this.dashDuration = 200; 
        this.dashJumpWindow = 100; 

        // DashJump properties
        this.dashJumpForce = 600; 
        this.dashJumpHorizontalBoost = 300; 
        this.dashJumpMaxHeight = 450; 
        this.lastCanDashJump = false; 

        const scene = this; // Capture the Phaser scene context

        // --- JUMP BUTTON SETUP (NEW) ---
        if (this.domElements.jumpButton) {
            this.domElements.jumpButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver) return;
                scene.pointerIsDown = true;
                scene.pointerJustDown = true;
            });
            this.domElements.jumpButton.addEventListener('mousedown', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver) return;
                scene.pointerIsDown = true;
                scene.pointerJustDown = true;
            });
            this.domElements.jumpButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver) return;
                scene.pointerIsDown = false;
            });
            this.domElements.jumpButton.addEventListener('mouseup', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver) return;
                scene.pointerIsDown = false;
            });
        }

        // --- DASH BUTTON SETUP (Original, ensure it uses domElements and checks gameOver) ---
        if (this.domElements.dashButton) {
            this.domElements.dashButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                // console.log("DASH BUTTON TOUCH"); // Original console log
                if (scene.gameState.gameOver) return; // Added game over check
                if (scene.dashReady && scene.isPlayerGrounded()) {
                    scene.doDash();
                    scene.dashReady = false;
                    scene.lastDashTime = scene.time.now;
                }
            });

            this.domElements.dashButton.addEventListener('mousedown', function(e) {
                e.preventDefault();
                // console.log("DASH BUTTON CLICKED"); // Original console log
                if (scene.gameState.gameOver) return; // Added game over check
                if (scene.dashReady && scene.isPlayerGrounded()) {
                    scene.doDash();
                    scene.dashReady = false;
                    scene.lastDashTime = scene.time.now;
                }
            });
        }
        
        // MODIFIED global keydown listener to be scene-managed for hiding on-screen buttons
        if (this.hideOnScreenButtonsHandler) { // Remove previous if scene restarts
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
        }
        this.hideOnScreenButtonsHandler = () => {
            if (scene.domElements.dashButton) scene.domElements.dashButton.style.display = 'none';
            if (scene.domElements.jumpButton) scene.domElements.jumpButton.style.display = 'none';
        };
        window.addEventListener('keydown', this.hideOnScreenButtonsHandler);


        // --- GAME OVER SCREEN MOBILE BUTTONS (NEW) ---
        if (this.domElements.gameOverRestartButtonMobile) {
            this.domElements.gameOverRestartButtonMobile.addEventListener('click', () => {
                if (scene.gameState.gameOver) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    scene.scene.restart();
                }
            });
             this.domElements.gameOverRestartButtonMobile.addEventListener('touchstart', (e) => { // Also listen for touchstart
                e.preventDefault();
                if (scene.gameState.gameOver) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    scene.scene.restart();
                }
            });
        }
        if (this.domElements.gameOverMenuButtonMobile) {
            this.domElements.gameOverMenuButtonMobile.addEventListener('click', () => {
                if (scene.gameState.gameOver) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    if (scene.domElements.instructions) scene.domElements.instructions.style.display = 'none';
                    scene.scene.start("SceneSwitcher");
                }
            });
            this.domElements.gameOverMenuButtonMobile.addEventListener('touchstart', (e) => { // Also listen for touchstart
                e.preventDefault();
                if (scene.gameState.gameOver) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    if (scene.domElements.instructions) scene.domElements.instructions.style.display = 'none';
                    scene.scene.start("SceneSwitcher");
                }
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
            instructions: document.getElementById('instructionsDisplay'),
            jumpButton: document.getElementById('jumpButton'), // New
            dashButton: document.getElementById('dashButton'), // Referenced here
            gameOverRestartButtonMobile: document.getElementById('gameOverRestartButtonMobile'), // New
            gameOverMenuButtonMobile: document.getElementById('gameOverMenuButtonMobile'), // New
            // gameOverKeyboardInstructions: document.getElementById('gameOverKeyboardInstructions') // Already in HTML, not directly manipulated in JS by original code
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

    initializePlatforms() { // User's original logic
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
        this.originY = platformY - 50; // User's original calculation
    }

    createContinuousStreet() { // User's original logic
        const platformWidth = this.sys.game.config.width; // User's original
        const numPlatforms = 5; 
        
        for (let i = 0; i < numPlatforms; i++) {
            this.addStreetSegment(i * (platformWidth * 0.7)); 
        }
    }

    addStreetSegment(xPosition) { // User's original logic
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

    setupPlayer() { // User's original logic
        this.player = this.physics.add.sprite(
            window.gameOptions.playerStartPosition,
            this.originY,
            "player"
        );
        this.player.setGravityY(window.gameOptions.playerGravity);
        this.player.setCollideWorldBounds(true, false, false, false, true); // User's original
        this.playerJumps = 0;
        this.jumpTimer = 0;  
        this.jumpBufferDuration = 150; 
        
        this.player.setTint(0x0088ff); 
    }

    setupPedestrians() { // User's original logic
        this.pedestrian1 = this.physics.add.sprite(
            this.sys.game.config.width + 100,
            this.originY,
            "pedestrian"
        );
        this.pedestrian1.setImmovable(true);
        this.pedestrian1.setTint(0xff6600); 

        this.pedestrian2 = this.physics.add.sprite(
            this.sys.game.config.width + 300,
            this.originY,
            "pedestrian"
        );
        this.pedestrian2.setImmovable(true);
        this.pedestrian2.setTint(0xff0066); 

        this.pedestrian3 = this.physics.add.sprite(
            this.sys.game.config.width + 500,
            this.originY,
            "pedestrian"
        );
        this.pedestrian3.setImmovable(true);
        this.pedestrian3.setTint(0x6600ff); 
        this.pedestrian3.setScale(1.3); 

        this.pedestrians = [this.pedestrian1, this.pedestrian2, this.pedestrian3];
        this.updatePedestrianSpeeds();
    }

    updatePedestrianSpeeds() { // User's original logic
        const baseSpeed = this.getAdjustedSpeed();
        const speedMultipliers = [1.2, 0.9, 0.7]; 
        
        this.pedestrians.forEach((pedestrian, index) => {
            pedestrian.setVelocityX(baseSpeed * speedMultipliers[index] * -1);
        });
    }

    getAdjustedSpeed() { // User's original logic
        return this.gameState.currentSpeed * (this.gameState.momentum / 100);
    }

    setupInput() {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.pointerIsDown = false;
        this.pointerJustDown = false;

        // These listeners handle general canvas clicks/taps for jumping
        this.input.on('pointerdown', (pointer) => {
            // This condition is crucial:
            // It ensures that if the click/tap was on an HTML button (like your JUMP or DASH button),
            // this general canvas listener doesn't also fire.
            // If the click/tap was on the canvas itself (not an HTML button), then it proceeds.
            if (pointer.target !== this.sys.game.canvas) {
                return;
            }
            this.pointerIsDown = true;
            this.pointerJustDown = true;
        });

        this.input.on('pointerup', (pointer) => {
            // Similar check for pointerup
            if (pointer.target !== this.sys.game.canvas) {
                return;
            }
            this.pointerIsDown = false;
        });
    }

    // handlePointerDown and handlePointerUp are part of original logic, triggered by canvas pointer events
    // The new Jump button will set the same flags (pointerIsDown, pointerJustDown)
    // so the existing logic in update() that uses these flags will work.

    handleJumpOrDive() { // User's original logic
        if (this.gameState.gameOver) return;
        
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
            
            this.player.setTint(0x00ff00);
        } else if (!this.isDiving && !this.isPlayerGrounded()) {
            console.log("✅ Triggering DIVE");
            this.isDiving = true;
            this.player.setVelocityY(900);
            this.player.setTint(0xffff00);
        }
    }

    endJumpHold() { // User's original logic
        this.isJumping = false;
        // this.jumpQueued = false; // User had this commented out
    }

    isPlayerGrounded() { // User's original logic
        return this.player.body.touching.down || this.player.body.blocked.down;
    }

    setupPhysics() { // User's original logic
        this.physics.add.collider(this.player, this.platformGroup);
        
        this.pedestrians.forEach(pedestrian => {
            this.physics.add.overlap(this.player, pedestrian, this.hitPedestrian, null, this);
        });
    }

    setupGameTimer() { // User's original logic
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    hitPedestrian(player, pedestrian) { // User's original logic
        if (this.gameState.collisionCooldown <= 0) {
            this.gameState.momentum = Math.max(10, 
                this.gameState.momentum - window.gameOptions.momentumLossPerCollision);
            
            this.gameState.collisionCooldown = 45; 
            
            this.cameras.main.shake(100, 0.01);
            this.player.setTint(0xff4444);
            
            this.time.delayedCall(200, () => {
                this.player.setTint(0x0088ff);
            });
            
            this.updateAllSpeeds();
        }
    }

    updateAllSpeeds() { // User's original logic
        const adjustedSpeed = this.getAdjustedSpeed();
        
        this.platformGroup.getChildren().forEach(platform => {
            platform.setVelocityX(adjustedSpeed * -1);
        });
        
        this.updatePedestrianSpeeds();
    }

    updateTimer() { // User's original logic
        if (this.gameState.gameOver) return;
        
        this.gameState.timeRemaining--;
        
        if (this.gameState.timeRemaining <= 0) {
            this.triggerGameOver("Time's up!");
        }
        // this.updateUI(); // updateUI is called in the main update loop
    }

    updateScore(points = 10) { // User's original logic
        this.gameState.score += points;
        this.gameState.timeRemaining += window.gameOptions.timeBonusPerScore;
        
        if (this.gameState.score > 0 && 
            this.gameState.score % window.gameOptions.difficultyIncreaseInterval === 0) {
            this.increaseDifficulty();
        }
        // this.updateUI(); // updateUI is called in the main update loop
    }

    updateScoring(delta) { // User's original logic
        const pixelsPerSecond = this.getAdjustedSpeed();
        const distanceThisFrame = (pixelsPerSecond * delta) / 1000;
        this.gameState.distanceTraveled += distanceThisFrame;

        const scoreThreshold = 500;
        const currentScoreSegment = Math.floor(this.gameState.distanceTraveled / scoreThreshold);
        
        if (currentScoreSegment > this.gameState.lastScoreSegment) {
            const pointsToAdd = currentScoreSegment - (this.gameState.lastScoreSegment || 0);
            this.updateScore(pointsToAdd);
            this.gameState.lastScoreSegment = currentScoreSegment;
        }
    }

    increaseDifficulty() { // User's original logic
        this.gameState.level++;
        this.gameState.currentSpeed = Math.min(
            this.gameState.currentSpeed + window.gameOptions.platformSpeedIncrease,
            window.gameOptions.maxPlatformSpeed
        );
        
        this.updateAllSpeeds();
        // this.updateUI(); // updateUI is called in the main update loop
        
        this.cameras.main.flash(200, 0, 255, 0);
    }

    triggerGameOver(reason) { // User's original logic
        this.gameState.gameOver = true;
        this.physics.pause();
        
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
    }    
    
    update(time, delta) { // User's original logic
        if (this.gameState.gameOver) {
            // Keyboard game over controls remain
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
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
        
        this.updateScoring(delta); // User's original call

        // Unified input for jump (keyboard, canvas pointer, OR new jump button)
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.pointerJustDown;
        const jumpHeld = this.spaceKey.isDown || this.pointerIsDown;

        if (jumpPressed) {
            this.handleJumpOrDive();
        }

        // Variable jump height logic (User's original)
        if (jumpHeld && this.isJumping && this.time.now - this.jumpStartTime < window.gameOptions.maxJumpHold) {
            this.player.setVelocityY(window.gameOptions.jumpForce * -1); // Original logic for hold
        }

        if (!jumpHeld && this.isJumping && !this.isPlayerGrounded()) { // Original logic for release
            this.isJumping = false;
            if (this.player.body.velocity.y < 0) {
                this.player.setVelocityY(this.player.body.velocity.y * 0.3);
            }
        }

        if (this.player.y > this.sys.game.config.height) { // User's original
            this.triggerGameOver("You Fell UNDER the street! HOW?!?!?!");
            return;
        }

        this.player.x = window.gameOptions.playerStartPosition;
        if (this.gameState.collisionCooldown > 0) {
            this.gameState.collisionCooldown--; // User's original
        }

        if (this.gameState.momentum < 100) {
            this.gameState.momentum = Math.min(100, 
                this.gameState.momentum + window.gameOptions.momentumRecoveryRate); // User's original
            this.updateAllSpeeds();
        }

        // User's original distance scoring
        this.gameState.distanceTraveled += this.getAdjustedSpeed() * (1/60); 
        if (Math.floor(this.gameState.distanceTraveled) % 100 === 0 && 
            Math.floor(this.gameState.distanceTraveled) > 0) {
            this.updateScore(1);
        }

        // Manage pedestrians (User's original)
        this.pedestrians.forEach((pedestrian, index) => {
            if (pedestrian.x < -pedestrian.displayWidth / 2) {
                const basePositions = [100, 300, 500];
                const randomOffset = Phaser.Math.Between(-50, 200);
                pedestrian.x = this.sys.game.config.width + basePositions[index] + randomOffset;
                pedestrian.y = this.originY;
            }
        });

        // Manage continuous street platforms with improved logic (User's original)
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
        }

        // Handle jump buffer timing (User's original)
        if (this.jumpTimer > 0) {
            if (time - this.jumpTimer > this.jumpBufferDuration) {
                this.jumpTimer = 0;
                this.isJumping = false; 
            }
        }

        // Variable jump height logic (User's original, slightly different from earlier one)
        if (this.isJumping && !this.isPlayerGrounded()) {
            const holdDuration = this.time.now - this.jumpStartTime;
            if ((this.spaceKey.isDown || this.pointerIsDown) &&
                holdDuration < window.gameOptions.maxJumpHold) {
                // This is the stronger hold force application from original code
                this.player.setVelocityY(this.player.body.velocity.y - window.gameOptions.jumpHoldForce * (delta / 16.67));
            } else {
                this.isJumping = false;
                if (this.player.body.velocity.y < 0) {
                    this.player.setVelocityY(this.player.body.velocity.y * 0.3);
                }
            }
        }

        // Only reset jump state when landing (User's original)
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

        this.wasGrounded = this.isPlayerGrounded();
        this.updateUI();
        this.pointerJustDown = false; // Reset at end of update

        // DASH LOGIC (User's original)
        const dashPressed = this.shiftKey.isDown && this.isPlayerGrounded() && !this.isJumping; // Keyboard dash

        // console.log("dashPressed:", dashPressed, "dashReady:", this.dashReady, "grounded:", this.isPlayerGrounded(), "jumping:", this.isJumping); // User's original log

        // Keyboard dash handling
        if (dashPressed && this.dashReady) {
            this.doDash();
            this.dashReady = false;
            this.lastDashTime = this.time.now;
        }

        // Reset dash after cooldown (User's original)
        // Note: The original code had `!dashPressed` here. If a dash button is held, this might cause issues.
        // For minimal change, I'll keep it as is, but the button dash is handled by its own event.
        if (!this.shiftKey.isDown && (this.time.now - this.lastDashTime > this.dashCooldown)) {
            this.dashReady = true;
        }

        // Visual feedback for dashJump window (User's original)
        if (this.canDashJump()) {
            this.player.setTint(0xffaa00); 
            console.log("DASH JUMP WINDOW ACTIVE!"); 
        } else if (this.isDashing) {
            this.player.setTint(0x00ffff); 
        } else if (this.isPlayerGrounded() && !this.isJumping && !this.isDiving) {
            this.player.setTint(0x0088ff); 
        }
    }

    
doDash() { // User's original logic
    console.log("=== DASH STARTED ===");
    console.log("Time:", this.time.now);
    console.log("Player position:", this.player.x, this.player.y);
    
    this.isDashing = true;
    console.log("isDashing set to:", this.isDashing);
    
    this.player.setVelocityX(600);
    this.player.setTint(0x00ffff);
    
    this.time.delayedCall(this.dashDuration, () => {
        console.log("=== DASH ENDING ===");
        console.log("Time:", this.time.now);
        
        if (this.isPlayerGrounded()) {
            this.player.setVelocityX(0);
        }
        
        this.time.delayedCall(this.dashJumpWindow, () => {
            console.log("=== DASH JUMP WINDOW CLOSED ===");
            console.log("Time:", this.time.now);
            this.isDashing = false;
        });
    });
}
dashJump() { // User's original logic
    console.log("🚀 === DASH JUMP ACTIVATED! ===");
    console.log("Jump force:", this.dashJumpForce);
    console.log("Horizontal boost:", this.dashJumpHorizontalBoost);
    console.log("Player velocity before:", this.player.body.velocity.x, this.player.body.velocity.y);
    
    this.player.setVelocityY(this.dashJumpForce * -1);
    this.player.setVelocityX(this.dashJumpHorizontalBoost);
    
    console.log("Player velocity after:", this.player.body.velocity.x, this.player.body.velocity.y);
    
    this.isDiving = false;
    this.isJumping = true;
    this.jumpHoldTime = 0;
    this.jumpStartTime = this.time.now;
    
    this.player.setTint(0xffff00); 
    this.cameras.main.shake(100, 0.005);
    
    this.isDashing = false;
    console.log("Dash state reset, isDashing:", this.isDashing);
}

canDashJump() { // User's original logic
    const timeSinceDashStart = this.time.now - this.lastDashTime;
    const dashEndTime = this.dashDuration;
    const dashJumpWindowEnd = this.dashDuration + this.dashJumpWindow;
    
    const canDash = this.isDashing && 
           timeSinceDashStart >= dashEndTime && 
           timeSinceDashStart <= dashJumpWindowEnd &&
           this.isPlayerGrounded();
    
    if (canDash && !this.lastCanDashJump) {
        console.log("🟡 DASH JUMP WINDOW OPENED!");
        console.log("Time since dash start:", timeSinceDashStart);
        console.log("Dash end time:", dashEndTime);
        console.log("Window end time:", dashJumpWindowEnd);
    }
    
    this.lastCanDashJump = canDash; 
    return canDash;
}

    // NEW: shutdown method to clean up global listener
    shutdown() {
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
            this.hideOnScreenButtonsHandler = null;
        }
        // Reset pointer flags in case scene is exited while a button is held
        this.pointerIsDown = false;
        this.pointerJustDown = false;
    }
}

window.Stage1 = Stage1;