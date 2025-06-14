# Advanced Control Schemes for Avalanche

This document outlines multiple innovative input systems that maintain the sophisticated dash-jump mechanics while improving accessibility and ergonomics.

## Control Scheme Collection

1. **ONE-HANDED MODE**: Single finger controls everything
2. **TWO-HANDED ZONES**: Screen divided into intuitive regions  
3. **BUTTON-HYBRID**: Combines buttons with screen zones
4. **GESTURE-BASED**: Advanced touch gestures
5. **ACCESSIBILITY**: Customizable for different needs

## Core Principles

- Preserve all advanced mechanics (dash-jumps, variable height, combos)
- Eliminate input conflicts through smart state management
- Provide clear visual/haptic feedback
- Support both casual and competitive play styles
- Maintain 60fps responsiveness

---

## One-Handed Mode Design Philosophy

### Core Principle: Single finger can control everything

- **Tap** = Dash (primary action, most frequent)
- **Hold** = Jump with variable height
- **Release during hold** = Jump execution
- **Tap during dash window** = Dash Jump combo

### Benefits

- Accessible for players with mobility limitations
- Playable with phone in one hand
- Reduces screen obstruction from multiple fingers
- Maintains all advanced mechanics

### Challenges Addressed

- No input conflicts between dash and jump
- Preserves variable jump height system
- Maintains precise dash-jump timing
- Clear visual feedback for different states

### Implementation Concepts

#### Input Timing Constants
```javascript
tapThreshold: 150,        // Max time for tap vs hold (ms)
dashJumpWindow: 200,      // Window after dash to perform dash-jump (ms)
minJumpHold: 50,          // Minimum hold time to register as jump (ms)
maxJumpHold: 300,         // Maximum variable jump time (ms)
```

#### Input State Tracking
- `pointerDownTime` - When pointer went down
- `pointerUpTime` - When pointer went up
- `isHolding` - Currently holding for jump
- `lastDashTime` - Time of last dash
- `isDashReady` - Can perform dash

#### Action Logic Flow
1. **Pointer Down**: Check context (grounded, airborne, dash window)
2. **Pointer Up**: Determine action based on hold duration and context
3. **Context-Aware Execution**: Same input performs different actions based on game state

### Visual Feedback System

- Real-time prompts show intended action
- Jump power percentage during holds
- Dash-jump opportunity notifications
- Clear mode indicator
- Smooth transitions between feedback states

---

## Two-Handed Zone Control System

### Design Philosophy: Natural thumb placement for mobile devices

- **LEFT HALF** = Jump zone (natural left thumb position)
- **RIGHT HALF** = Dash zone (natural right thumb position)
- **SIMULTANEOUS** = Advanced combos possible
- **BUTTONS** = Optional overlay for visual learners

### Advantages

- Intuitive left/right spatial mapping
- No input timing conflicts
- Large target areas (reduces missed inputs)
- Can hide button UI for minimal interface
- Perfect for landscape mobile gaming
- Simultaneous inputs enable advanced techniques

### Ergonomic Benefits

- Natural thumb reach zones
- Reduces hand fatigue
- Works with phone cases/grips
- Supports different hand sizes

### Implementation Concepts

#### Zone Configuration
```javascript
screenWidth: scene.sys.game.config.width,
screenHeight: scene.sys.game.config.height,
dividerLine: screenWidth / 2,
```

#### Multi-Touch Support
- Support up to 3 simultaneous touches
- Detect simultaneous inputs for combos
- Track multiple pointer states independently

#### UI Control Features
- **Button Toggle**: Hide/show physical buttons
- **Zone Overlay**: Visual learning mode shows zones
- **Real-time Feedback**: Zones light up on touch
- **Jump Power Display**: Shows variable height percentage

#### Perfect for Tower1 Scene
- **Left zone** = Wall-jumping with variable height
- **Hold left** = Perfect for precise platform timing
- **Large target** = Much easier than small jump button
- **Right zone** = Reserved for future abilities

---

## Button-Hybrid Control System

### Design Philosophy: Best of both worlds

- Physical buttons remain for tactile feedback lovers
- Screen zones provide large hit areas for improved accuracy  
- Players can use either or both simultaneously
- Prevents "fat finger" missed button presses
- Maintains muscle memory for button users

### Implementation Approach

- Button events trigger same functions as zone touches
- Zone touches work even when buttons are visible
- Double input protection prevents conflicts
- UI can be fully hidden for minimal interface

---

## Gesture-Based Control System

### Design Philosophy: Natural movement mapping

- **Swipe up** = Jump (natural upward motion)
- **Swipe right** = Dash (forward motion)
- **Swipe down (airborne)** = Dive (downward motion)
- **Hold** = Variable jump height
- **Multi-finger** = Advanced combos

### Gesture Detection Parameters
```javascript
swipeMinDistance: 50,     // Minimum swipe distance
swipeMaxTime: 300,        // Maximum time for swipe recognition
swipeMinVelocity: 0.3,    // Minimum velocity threshold
```

### Implementation Considerations

- Requires careful tuning to avoid accidental activations
- May conflict with variable jump height system
- Best suited for simplified control schemes
- Could work well for special abilities

---

## Accessibility Control System

### Design Philosophy: Inclusive design for all players

- Customizable input timing
- Visual/audio/haptic feedback options
- Single-switch support
- Voice control integration
- Eye tracking support (future)
- Simplified control schemes

### Features

#### Customizable Settings
- Adjustable timing windows (100-300ms)
- Visual feedback toggle
- Audio feedback with different tones per action
- Haptic patterns for touch feedback
- Auto-assist options for timing
- Simplified controls (removes advanced combos)

#### Audio Feedback System
```javascript
frequencies: {
    jump: 440,    // A note
    dash: 523,    // C note  
    combo: 659,   // E note
    error: 220    // Lower A
}
```

#### Haptic Feedback Patterns
```javascript
patterns: {
    tap: [50],
    hold: [100],
    combo: [50, 50, 50],
    error: [200]
}
```

#### Visual Enhancements
- High contrast mode
- Larger feedback elements
- Enhanced visual indicators
- Customizable UI scaling

---

## Integration Examples

### Scene Setup
```javascript
// Option 1: One-handed mode
this.controlSystem = new OneHandedInputSystem(this);

// Option 2: Two-handed zones
this.controlSystem = new TwoHandedZoneInputSystem(this);

// Option 3: Button-hybrid
this.controlSystem = new ButtonHybridInputSystem(this);

// Option 4: Gesture-based
this.controlSystem = new GestureInputSystem(this);

// Option 5: Accessibility mode
this.controlSystem = new AccessibilityInputSystem(this);
```

### Scene Update Loop
```javascript
// Update chosen control system
if (this.controlSystem && this.controlSystem.update) {
    this.controlSystem.update(time, delta);
}
```

### Scene Cleanup
```javascript
// Cleanup control system
if (this.controlSystem && this.controlSystem.destroy) {
    this.controlSystem.destroy();
}
```

---

## Tower1 Implementation Example

For the Tower1 scene specifically, the two-handed zone system integration:

```javascript
// In tower1.js create() method, replace existing touch setup with:
this.controlSystem = new TwoHandedZoneInputSystem(this);

// Remove or modify existing button event listeners since zones handle everything
// Keep buttons visible by default, but allow hiding via UI toggle

// In tower1.js update() method, add:
if (this.controlSystem) {
    this.controlSystem.update(time, delta);
}
```

### Automatic Features
- **Left half** = Jump/Wall-jump (preserves variable height)
- **Right half** = Not used in Tower1 (no dash mechanic)
- **Single finger in left zone** = Perfect for wall-jumping timing
- **Hold left zone** = Variable jump height for precise platform reaches

---

## Competitive Features

Advanced players could benefit from:

- Input buffering for frame-perfect timing
- Macro support for complex combos
- Input display for learning/streaming
- Replay system with input visualization
- Customizable sensitivity curves
- Multiple control scheme switching mid-game

---

## Performance Considerations

All systems designed for 60fps performance:

- Event-driven input (no polling)
- Minimal DOM manipulation
- Efficient collision detection for zones
- Debounced visual feedback updates
- Memory-efficient gesture recognition
- Optional features can be disabled for low-end devices

---

## Future Enhancements

Potential additions:

- Machine learning for personalized timing
- Biometric feedback integration
- Advanced haptics (iPhone taptic engine)
- 3D Touch pressure sensitivity
- Hand tracking (WebXR)
- Voice control integration
- Eye tracking for gaze-based input

---

## Implementation Notes

### Code Architecture
- Modular design allows mixing and matching control schemes
- Event-driven system prevents performance issues
- Proper cleanup prevents memory leaks
- Extensive visual feedback for learning and accessibility

### Mobile Optimization
- Touch events optimized for mobile devices
- Responsive design works across screen sizes
- Battery-efficient implementation
- Works with device rotation

### Cross-Platform Support
- Falls back gracefully on unsupported devices
- Keyboard support maintained alongside touch
- Works with game controllers (future enhancement)
- Accessible via screen readers

---

## Conclusion

These advanced control schemes provide multiple pathways to make Avalanche accessible and enjoyable for players with different needs, preferences, and device capabilities while maintaining the sophisticated gameplay mechanics that make the game engaging for skilled players.

The two-handed zone system stands out as particularly promising for mobile endless runners, providing the benefits of large touch targets while maintaining the option for traditional button interfaces.
