# ARIA Integration Example

## How to Use the Enhanced Accessibility Features

### In Stage1.js and Stage2.js, add these calls:

```javascript
// In create() method:
create() {
    // ...existing code...
    
    // Announce game start
    if (window.accessibilityManager) {
        window.accessibilityManager.onGameStart("Stage 1: Street Runner");
    }
}

// In hitPedestrian() or hitObstacle() methods:
hitObstacle(player, obstacle) {
    // ...existing collision logic...
    
    // Announce obstacle hit
    if (window.accessibilityManager) {
        window.accessibilityManager.onObstacleHit();
    }
}

// When avoiding obstacles (in updateScore method):
updateScore(points = 15) {
    this.gameState.score += points;
    this.gameState.obstaclesAvoided++;
    
    // Announce obstacle avoided
    if (window.accessibilityManager) {
        window.accessibilityManager.onObstacleAvoided();
    }
}

// In dash-related methods when dash becomes ready:
if (this.dashReady && window.accessibilityManager) {
    window.accessibilityManager.onDashReady();
}

// In triggerGameOver():
triggerGameOver(reason) {
    // ...existing game over logic...
    
    // Announce game over
    if (window.accessibilityManager) {
        window.accessibilityManager.onGameEnd(false, reason);
    }
}

// In completeStage():
completeStage(reason) {
    // ...existing completion logic...
    
    // Announce completion
    if (window.accessibilityManager) {
        window.accessibilityManager.onGameEnd(true, reason);
    }
}
```

### Key Benefits:

1. **Screen Reader Support**: Game events are announced to users with visual impairments
2. **Live Updates**: Score and progress changes are communicated automatically  
3. **Context Awareness**: Users understand what's happening even without visual cues
4. **Non-Intrusive**: Announcements are polite and don't interrupt gameplay
5. **Milestone Feedback**: Important game events are highlighted

### ARIA Features Added:

- **aria-live regions** for dynamic content announcements
- **aria-label** attributes for all interactive elements  
- **role** attributes for semantic structure
- **aria-modal** for proper dialog handling
- **Automatic monitoring** of game state changes
