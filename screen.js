function updateViewport() {
    // Use screen width/height, NOT innerWidth, to avoid loops
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    const isLandscape = screenWidth > screenHeight;
    const isDesktop = screenWidth >= 1024;
    
    let viewportContent = "width=device-width, initial-scale=1";
    
    if (isDesktop) {
        // Desktop usually ignores the viewport tag anyway, but just in case
        viewportContent = "width=1100"; 
    } else if (!isLandscape) {
        // Force width 550 AND force the browser to zoom out to fit it
        const scale = screenWidth / 550;
        viewportContent = `width=550, initial-scale=${scale}, maximum-scale=${scale}`;
    }
    
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }
    
    // Only update if it actually changed to prevent browser recalculation spam
    if (viewport.content !== viewportContent) {
        viewport.setAttribute('content', viewportContent);
    }
}

// Do NOT run on resize. Only run on load and orientation change.
window.addEventListener('DOMContentLoaded', updateViewport);
window.addEventListener('orientationchange', updateViewport);
