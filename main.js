let gameConfig = {
    type: Phaser.AUTO,
    width: 1336,
    height: 768,
    scene: [SceneSwitcher, PlayGame, Dungeon1, Stage2], // Verified correct class names
    backgroundColor: '#B056F5',
    physics: {
        default: "arcade"
    }
};

window.game = new Phaser.Game(gameConfig);

function resize(){
    let canvas = document.querySelector("canvas");
    if (!canvas || !window.game || !window.game.config) return;
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = window.game.config.width / window.game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}

window.focus();
resize();
window.addEventListener("resize", resize, false);