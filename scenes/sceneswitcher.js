class SceneSwitcher extends Phaser.Scene {
    constructor() {
        super({ key: "SceneSwitcher" });
    }

    create() {
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
        this.add.text(centerX, centerY, "Press 1 for Stage 1 (Street Runner)\nPress 2 for Dungeon 1 (Platform Jumper)\nPress 3 for Stage 2 (Rooftop Jump)", {
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
        this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE); // <-- ADD THIS

        this.keyNumpad1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE);
        this.keyNumpad2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO);
        this.keyNumpad3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE); // <-- ADD THIS

        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }
    
    update() {
        // Check for key presses in update loop for more reliable detection
        if (Phaser.Input.Keyboard.JustDown(this.key1) || Phaser.Input.Keyboard.JustDown(this.keyNumpad1)) {
            console.log("Starting Stage 1...");
            this.scene.start("Stage1");
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.key2) || Phaser.Input.Keyboard.JustDown(this.keyNumpad2)) {
            console.log("Starting Dungeon 1...");
            this.scene.start("Dungeon1");
        }
        if (Phaser.Input.Keyboard.JustDown(this.key3) || Phaser.Input.Keyboard.JustDown(this.keyNumpad3)) {
            console.log("Starting Stage 2...");
            this.scene.start("Stage2");
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            console.log("Returning to Scene Switcher...");
            this.scene.start("SceneSwitcher");
        }
    }
}

window.SceneSwitcher = SceneSwitcher;