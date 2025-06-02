// global game options (only define if not already defined)
window.gameOptions = window.gameOptions || {
    platformStartSpeed: 350,
    spawnRange: [100, 350],
    platformSizeRange: [50, 250],
    playerGravity: 900,
    jumpForce: 400,
    playerStartPosition: 200,
    jumps: 2
};

class Stage2 extends Phaser.Scene {
    constructor() {
        super("Stage2");
    }
    
    preload() {
        this.load.image("platform", "./assets/sprites/platformb.png");
        this.load.image("player", "./assets/sprites/player.png");
    }
    
    create() {
        this.platformGroup = this.add.group({
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        });

        this.platformPool = this.add.group({
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        });

        this.playerJumps = 0;
        
        let platformY = this.sys.game.config.height * 0.8;
        this.addPlatform(this.sys.game.config.width, this.sys.game.config.width / 2);

        let platformSprite = this.platformGroup.getFirst(true);
        let platformTop = platformY - (platformSprite.displayHeight / 2);
        this.originY = platformTop - (this.textures.get('player').getSourceImage().height / 2);

        this.player = this.physics.add.sprite(
            window.gameOptions.playerStartPosition,
            this.originY,
            "player"
        );
        this.player.setGravityY(window.gameOptions.playerGravity);

        this.physics.add.collider(this.player, this.platformGroup);

        this.input.on("pointerdown", this.jump, this);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        // Add spacebar key
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    addPlatform(platformWidth, posX) {
        let platform;
        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        }
        else{
            platform = this.physics.add.sprite(posX, this.sys.game.config.height * 0.8, "platform");
            platform.setImmovable(true);
            platform.setVelocityX(window.gameOptions.platformStartSpeed * -1);
            this.platformGroup.add(platform);
        }
        platform.displayWidth = platformWidth;
        this.nextPlatformDistance = Phaser.Math.Between(
            window.gameOptions.spawnRange[0], 
            window.gameOptions.spawnRange[1]
        );
    }

    jump() {
        if(this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < window.gameOptions.jumps)){
            if(this.player.body.touching.down){
                this.playerJumps = 0;
            }
            this.player.setVelocityY(window.gameOptions.jumpForce * -1);
            this.playerJumps++;
        }
    }

    update() {
        // Handle ESC key
        if (Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            this.scene.start("SceneSwitcher");
            return;
        }

        // Add spacebar jump check
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.jump();
        }

        if(this.player.y > this.sys.game.config.height){
            this.scene.start("Stage2");
        }
        this.player.x = window.gameOptions.playerStartPosition;

        let minDistance = this.sys.game.config.width;
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = this.sys.game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);
            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        if(minDistance > this.nextPlatformDistance){
            var nextPlatformWidth = Phaser.Math.Between(
                window.gameOptions.platformSizeRange[0], 
                window.gameOptions.platformSizeRange[1]
            );
            this.addPlatform(nextPlatformWidth, this.sys.game.config.width + nextPlatformWidth / 2);
        }
    }
}

window.Stage2 = Stage2;

