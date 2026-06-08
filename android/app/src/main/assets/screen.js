function updateViewport() {
    // Use screen width to prevent the resize glitch loop
    const screenW = window.screen.width;
    const screenH = window.screen.height;
    
    const isLandscape = screenW > screenH;
    const isDesktop = Math.max(screenW, screenH) >= 1024;
    
    let viewportContent;
    
    // If it's desktop, tablet, or mobile landscape, enforce 1100px
    if (isDesktop || isLandscape) {
        viewportContent = "width=1100";
    } else {
        // Otherwise (mobile portrait), enforce 550px
        viewportContent = "width=550";
    }
    
    // Find or create the viewport tag
    let viewport = document.querySelector('meta[name="viewport"]');
    
    if (viewport) {
        // Only update if it actually needs to change (stops glitching)
        if (viewport.getAttribute('content') !== viewportContent) {
            viewport.setAttribute('content', viewportContent);
        }
    } else {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = viewportContent;
        document.head.appendChild(viewport);
    }
}

// Run immediately so the browser knows the size before painting
updateViewport();

// Listeners for when the user resizes or rotates their phone
window.addEventListener('resize', updateViewport);
window.addEventListener('orientationchange', updateViewport);
