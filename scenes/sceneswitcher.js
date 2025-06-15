class SceneSwitcher extends Phaser.Scene {
    constructor() {
        super({ key: "SceneSwitcher" });
        this.sceneTransitioning = false;
    }

    create() {
        // Reset transition flag when entering scene switcher
        this.sceneTransitioning = false;
        
        // Ensure all DOM elements are hidden when entering scene switcher
        this.hideAllUI();
        
        // Clear any existing display objects to prevent overlap issues
        this.children.removeAll();
        
        // Set a consistent background color to ensure proper rendering
        this.cameras.main.setBackgroundColor('#000000');
        
        // Center the text on screen
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Add title
        this.add.text(centerX, centerY - 100, "STAGE SELECTOR", {
            font: "48px Arial",
            fill: "#fff",
            align: 'center'        
        }).setOrigin(0.5);
        
        // Add instructions
        this.add.text(centerX, centerY, "Press 1 for Stage 1 (Street Runner)\nPress 2 for Tower 1 (Platform Jumper)\nPress 3 for Stage 2 (Rooftop Jump)", {
            font: "24px Arial",
            fill: "#fff",
            align: 'center',
            lineSpacing: 10        
        }).setOrigin(0.5);
        
        // Add additional help text
        this.add.text(centerX, centerY + 100, "Press ESC from any stage to return here", {
            font: "18px Arial",
            fill: "#aaa",
            align: 'center'
        }).setOrigin(0.5);

        // Create keyboard object for more reliable input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Add number keys
        this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

        this.keyNumpad1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE);
        this.keyNumpad2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO);
        this.keyNumpad3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE);        
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Mobile friendly buttons
        const buttonConfig = {
            font: "24px Arial",
            fill: "#222",
            backgroundColor: "#ffffff",
            padding: { x: 15, y: 8 },
            stroke: "#000000",
            strokeThickness: 2
        };
        
        // Position buttons further down to avoid overlap with instructions
        const buttonStartY = centerY + 180;
        const buttonSpacing = 60;
        
        // Stage 1 Button
        const stage1Button = this.add.text(centerX, buttonStartY, "Stage 1", buttonConfig)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.startScene("Stage1");
            });
            
        // Tower 1 Button  
        const tower1Button = this.add.text(centerX, buttonStartY + buttonSpacing, "Tower 1", buttonConfig)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.startScene("tower1");
            });

        // Stage 2 Button
        const stage2Button = this.add.text(centerX, buttonStartY + (buttonSpacing * 2), "Stage 2", buttonConfig)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.startScene("Stage2");
            });        // Add hover effects for better interaction feedback
        [stage1Button, tower1Button, stage2Button].forEach(button => {
            button.on('pointerover', () => {
                button.setStyle({ backgroundColor: "#cccccc" });
            });
            button.on('pointerout', () => {
                button.setStyle({ backgroundColor: "#ffffff" });
            });
        });
    }    update() {
        // Check for key presses in update loop for more reliable detection
        if (Phaser.Input.Keyboard.JustDown(this.key1) || Phaser.Input.Keyboard.JustDown(this.keyNumpad1)) {
            console.log("Starting Stage 1...");
            this.startScene("Stage1");
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.key2) || Phaser.Input.Keyboard.JustDown(this.keyNumpad2)) {
            console.log("Starting tower1...");
            this.startScene("tower1");
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.key3) || Phaser.Input.Keyboard.JustDown(this.keyNumpad3)) {
            console.log("Starting Stage 2...");
            this.startScene("Stage2");
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            console.log("Returning to Scene Switcher...");
            // If already in scene switcher, just reset
            this.sceneTransitioning = false;
            this.hideAllUI();
        }
    }

    // Centralized scene starting method to prevent multiple simultaneous starts
    startScene(sceneKey) {
        if (this.sceneTransitioning) {
            console.log(`Scene transition already in progress, ignoring request for ${sceneKey}`);
            return;
        }
        
        this.sceneTransitioning = true;
        console.log(`Starting scene: ${sceneKey}`);
        
        // Ensure UI is clean before transitioning
        this.hideAllUI();
        
        // Start the requested scene
        this.scene.start(sceneKey);
    }

    // Method to hide all UI elements
    hideAllUI() {
        const gameOverScreen = document.getElementById('gameOverScreen');
        const instructions = document.getElementById('instructionsDisplay');
        
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        if (instructions) instructions.style.display = 'none';
    }
}

window.SceneSwitcher = SceneSwitcher;