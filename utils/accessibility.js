// Accessibility utilities for better keyboard and mobile support

class AccessibilityManager {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.isGameOverScreenActive = false;
    }

    // Initialize accessibility features
    init() {
        this.setupKeyboardNavigation();
        this.setupGameOverScreenNavigation();
    }

    // Setup general keyboard navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.isGameOverScreenActive) {
                this.handleGameOverNavigation(e);
            }
        });
    }

    // Setup game over screen navigation
    setupGameOverScreenNavigation() {
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (!gameOverScreen) return;

        // Monitor game over screen visibility
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = gameOverScreen.style.display !== 'none';
                    this.setGameOverScreenActive(isVisible);
                }
            });
        });        observer.observe(gameOverScreen, {
            attributes: true,
            attributeFilter: ['style']
        });
    }

    // Handle navigation when game over screen is active
    handleGameOverNavigation(e) {
        const restartBtn = document.getElementById('gameOverRestartButtonMobile');
        const menuBtn = document.getElementById('gameOverMenuButtonMobile');
        
        if (!restartBtn || !menuBtn) return;

        switch(e.code) {
            case 'Tab':
                e.preventDefault();
                this.toggleGameOverFocus();
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                e.preventDefault();
                this.toggleGameOverFocus();
                break;
            case 'Enter':
                e.preventDefault();
                this.activateCurrentGameOverButton();
                break;
            case 'KeyR':
                // Direct restart key - always trigger restart button
                e.preventDefault();
                restartBtn.click();
                break;
            case 'Escape':
                // Direct menu key - always trigger menu button
                e.preventDefault();
                menuBtn.click();
                break;
        }
    }

    // Toggle focus between restart and menu buttons
    toggleGameOverFocus() {
        const restartBtn = document.getElementById('gameOverRestartButtonMobile');
        const menuBtn = document.getElementById('gameOverMenuButtonMobile');
        
        if (document.activeElement === restartBtn) {
            menuBtn.focus();
        } else {
            restartBtn.focus();
        }
    }

    // Activate the currently focused game over button
    activateCurrentGameOverButton() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('game-over-btn')) {
            activeElement.click();
        }
    }

    // Set game over screen active state
    setGameOverScreenActive(isActive) {
        this.isGameOverScreenActive = isActive;
        
        if (isActive) {
            // Focus the restart button by default
            const restartBtn = document.getElementById('gameOverRestartButtonMobile');
            if (restartBtn) {
                setTimeout(() => restartBtn.focus(), 100);
            }
        }
    }

    // Add visual feedback for touch/hover states
    addVisualFeedback(element, type = 'touch') {
        if (!element) return;

        element.addEventListener('touchstart', () => {
            element.classList.add('touching');
        });

        element.addEventListener('touchend', () => {
            element.classList.remove('touching');
        });

        element.addEventListener('mousedown', () => {
            element.classList.add('clicking');
        });

        element.addEventListener('mouseup', () => {
            element.classList.remove('clicking');
        });

        element.addEventListener('mouseleave', () => {
            element.classList.remove('clicking');
        });
    }

    // Initialize all interactive elements
    initializeInteractiveElements() {
        const elements = [
            'jumpButton',
            'dashButton', 
            'gameOverRestartButtonMobile',
            'gameOverMenuButtonMobile'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.addVisualFeedback(element);
            }
        });
    }
}

// Global accessibility manager instance
window.accessibilityManager = new AccessibilityManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.accessibilityManager.init();
        window.accessibilityManager.initializeInteractiveElements();
    });
} else {
    window.accessibilityManager.init();
    window.accessibilityManager.initializeInteractiveElements();
}
