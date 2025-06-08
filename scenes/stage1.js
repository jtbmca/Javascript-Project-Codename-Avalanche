// Enhanced game options for street-level endless runner
window.gameOptions = window.gameOptions || {
    platformStartSpeed: 350,
    platformSpeedIncrease: 15,
    maxPlatformSpeed: 800,
    playerGravity: 1200,
    jumpForce: 400,
    maxJumpHold: 300,
    jumpHoldForce: 40,
    playerStartPosition: 200,
    jumps: 1,
    difficultyIncreaseInterval: 10,
    pedestrianSpawnChance: 0.4,
    // Updated for missile chase mechanics
    stageDuration: 60,          // 60 seconds to complete stage
    stageTargetDistance: 15000, // Distance needed to win
    missileSpeed: 1.67,         // Missile moves 1.67% per second (100% in 60s)
    momentumLossPerCollision: 15,
    momentumRecoveryRate: 0.1
};

class Stage1 extends Phaser.Scene {
    constructor() {
        super("Stage1");
        this.hideOnScreenButtonsHandler = null;
    }

    preload() {
        this.load.image("platform", "./assets/sprites/platformb.png");
        this.load.image("player", "./assets/sprites/player.png");
        this.load.image("pedestrian", "./assets/sprites/player.png");
        this.load.image("missile", "./assets/sprites/player.png"); // Using player.png as missile placeholder
    }

    create() {
        // Initialize game state with missile chase mechanics
        this.gameState = {
            score: 0,
            level: 1,
            currentSpeed: window.gameOptions.platformStartSpeed,
            // Missile chase specific state
            stageDistance: 0,
            stageProgress: 0,           // Percentage (0-100) of stage completed
            missilePosition: 0,         // Missile position across screen (0-100%)
            momentum: 100,              // Start at full momentum
            gameOver: false,
            gameComplete: false,
            distanceTraveled: 0,
            collisionCooldown: 0,
            lastScoreSegment: 0,
            pedestriansAvoided: 0,
            collisions: 0,
            completionReason: ""
        };

        // Initialize DOM UI
        this.initializeUI();
        
        // Make on-screen buttons visible at scene start/restart
        if (this.domElements.jumpButton) this.domElements.jumpButton.style.display = 'block';
        if (this.domElements.dashButton) this.domElements.dashButton.style.display = 'block';

        // Setup game elements
        this.initializePlatforms();
        this.setupPlayer();
        this.setupMissile(); // New missile setup
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
        }

        // Initialize movement state
        this.isDiving = false;
        this.isJumping = false;
        this.jumpHoldTime = 0;

        // Dash state initialization
        this.dashReady = true;
        this.dashCooldown = 1000;
        this.lastDashTime = 0;
        this.isDashing = false; 
        this.dashDuration = 200; 
        this.dashJumpWindow = 100; 

        // DashJump properties
        this.dashJumpForce = 600; 
        this.dashJumpHorizontalBoost = 300; 
        this.dashJumpMaxHeight = 450; 
        this.lastCanDashJump = false; 

        const scene = this;

        // Existing button setup code (unchanged)
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
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = false;
            });
            this.domElements.jumpButton.addEventListener('mouseup', function(e) {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) return;
                scene.pointerIsDown = false;
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
        };
        window.addEventListener('keydown', this.hideOnScreenButtonsHandler);

        if (this.domElements.gameOverRestartButtonMobile) {
            this.domElements.gameOverRestartButtonMobile.addEventListener('click', () => {
                if (scene.gameState.gameOver || scene.gameState.gameComplete) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    scene.scene.restart();
                }
            });
             this.domElements.gameOverRestartButtonMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
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
            this.domElements.gameOverMenuButtonMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (scene.gameState.gameOver || scene.gameState.gameComplete) {
                    if(scene.domElements.gameOverScreen) scene.domElements.gameOverScreen.style.display = 'none';
                    if (scene.domElements.instructions) scene.domElements.instructions.style.display = 'none';
                    scene.scene.start("SceneSwitcher");
                }
            });
        }
    }

    // New missile setup
    setupMissile() {
        this.missile = this.add.sprite(0, this.sys.game.config.height * 0.15, "missile");
        this.missile.setScale(0.3);
        this.missile.setTint(0xff4444); // Red tint to distinguish from player
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
    }

    // Updated collision handling
    hitPedestrian(player, pedestrian) {
        if (this.gameState.collisionCooldown <= 0) {
            this.gameState.momentum = Math.max(10, 
                this.gameState.momentum - window.gameOptions.momentumLossPerCollision);
            this.gameState.collisions++;
            
            this.gameState.collisionCooldown = 45; 
            
            this.cameras.main.shake(100, 0.01);
            this.player.setTint(0xff4444);
            
            this.time.delayedCall(200, () => {
                this.player.setTint(0x0088ff);
            });
            
            this.updateAllSpeeds();
        }
    }

    // New missile chase update logic
    updateMissileChase(delta) {
        // Update missile position (moves at constant rate)
        this.gameState.missilePosition += (window.gameOptions.missileSpeed * delta) / 1000;
        this.gameState.missilePosition = Math.min(100, this.gameState.missilePosition);
        
        // Update missile sprite position
        this.missile.x = (this.gameState.missilePosition / 100) * this.sys.game.config.width;
        
        // Update player progress based on momentum-adjusted speed
        const speedRatio = this.getAdjustedSpeed() / window.gameOptions.platformStartSpeed;
        const baseProgressRate = window.gameOptions.missileSpeed; // Same base rate as missile
        const adjustedProgressRate = baseProgressRate * speedRatio;
        
        this.gameState.stageProgress += (adjustedProgressRate * delta) / 1000;
        this.gameState.stageProgress = Math.min(100, this.gameState.stageProgress);
        
        // Check win/lose conditions
        this.checkStageCompletion();
    }

    // New stage completion logic
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
        
        // Calculate completion bonus
        const timeBonus = Math.round((100 - this.gameState.missilePosition) * 10);
        const momentumBonus = Math.round(this.gameState.momentum * 5);
        const avoidanceBonus = this.gameState.pedestriansAvoided * 10;
        
        this.gameState.score += timeBonus + momentumBonus + avoidanceBonus;
        
        this.physics.pause();
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = `${reason} Stage Complete!`;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.flash(500, 0, 255, 0);
        this.player.setTint(0x00ff00);
    }

    // Updated scoring for pedestrian avoidance
    updateScore(points = 10) {
        this.gameState.score += points;
        this.gameState.pedestriansAvoided++;
    }

    // Existing methods remain unchanged (keeping all movement, input, platform, pedestrian logic)
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
            this.originY,
            "player"
        );
        this.player.setGravityY(window.gameOptions.playerGravity);
        this.player.setCollideWorldBounds(true, false, false, false, true);
        this.playerJumps = 0;
        this.jumpTimer = 0;  
        this.jumpBufferDuration = 150; 
        
        this.player.setTint(0x0088ff); 
    }

    setupPedestrians() {
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

        this.pedestrian4 = this.physics.add.sprite(
            this.sys.game.config.width + 700,
            this.originY+20,
            "pedestrian"
        );
        this.pedestrian4.setImmovable(true);
        this.pedestrian4.setTint(0xfcff33); 
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
    }

    setupInput() {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

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
            
            this.player.setTint(0x00ff00);
        } else if (!this.isDiving && !this.isPlayerGrounded()) {
            console.log("✅ Triggering DIVE");
            this.isDiving = true;
            this.player.setVelocityY(900);
            this.player.setTint(0xffff00);
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
            this.physics.add.overlap(this.player, pedestrian, this.hitPedestrian, null, this);
        });
    }

    triggerGameOver(reason) {
        this.gameState.gameOver = true;
        this.physics.pause();
        
        if (this.domElements.gameOverScreen) {
            this.domElements.gameOverReason.textContent = reason;
            this.domElements.gameOverScore.textContent = `Final Score: ${this.gameState.score}`;
            this.domElements.gameOverScreen.style.display = 'block';
        }
        
        this.cameras.main.shake(500, 0.02);
        this.player.setTint(0xff0000);
    }    
    
    update(time, delta) {
        if (this.gameState.gameOver || this.gameState.gameComplete) {
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
        
        // NEW: Update missile chase mechanics
        this.updateMissileChase(delta);

        // Existing movement logic (unchanged)
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

        this.player.x = window.gameOptions.playerStartPosition;
        if (this.gameState.collisionCooldown > 0) {
            this.gameState.collisionCooldown--;
        }

        if (this.gameState.momentum < 100) {
            this.gameState.momentum = Math.min(100, 
                this.gameState.momentum + window.gameOptions.momentumRecoveryRate);
            this.updateAllSpeeds();
        }

        // Manage pedestrians
        this.pedestrians.forEach((pedestrian, index) => {
            if (pedestrian.x < -pedestrian.displayWidth / 2) {
                const basePositions = [100, 300, 500, 700];
                const randomOffset = Phaser.Math.Between(-50, 200);
                pedestrian.x = this.sys.game.config.width + basePositions[index] + randomOffset;
            }
        });

        // Manage continuous street platforms
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

        // Handle jump buffer timing
        if (this.jumpTimer > 0) {
            if (time - this.jumpTimer > this.jumpBufferDuration) {
                this.jumpTimer = 0;
                this.isJumping = false; 
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

        // Only reset jump state when landing
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
        this.pointerJustDown = false;

        // DASH LOGIC (unchanged)
        const dashPressed = this.shiftKey.isDown && this.isPlayerGrounded() && !this.isJumping;

        if (dashPressed && this.dashReady) {
            this.doDash();
            this.dashReady = false;
            this.lastDashTime = this.time.now;
        }

        if (!this.shiftKey.isDown && (this.time.now - this.lastDashTime > this.dashCooldown)) {
            this.dashReady = true;
        }

        // Visual feedback for dashJump window
        if (this.canDashJump()) {
            this.player.setTint(0xffaa00); 
            console.log("DASH JUMP WINDOW ACTIVE!"); 
        } else if (this.isDashing) {
            this.player.setTint(0x00ffff); 
        } else if (this.isPlayerGrounded() && !this.isJumping && !this.isDiving) {
            this.player.setTint(0x0088ff); 
        }
    }

    // Existing dash methods (unchanged)
    doDash() {
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

    dashJump() {
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

    canDashJump() {
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

    shutdown() {
        if (this.hideOnScreenButtonsHandler) {
            window.removeEventListener('keydown', this.hideOnScreenButtonsHandler);
            this.hideOnScreenButtonsHandler = null;
        }
        this.pointerIsDown = false;
        this.pointerJustDown = false;
    }
}

window.Stage1 = Stage1;