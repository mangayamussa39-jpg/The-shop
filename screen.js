function updateViewport() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isDesktop = window.innerWidth >= 1024;
    
    let viewportContent = "width=device-width, initial-scale=1";
    
    // Force different widths based on device and orientation
    if (isDesktop) {
        viewportContent = "width=1100";
    } else if (!isDesktop && !isLandscape) {
        viewportContent = "width=550";
    }
    
    // Update or create viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', viewportContent);
    } else {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = viewportContent;
        document.head.appendChild(viewport);
    }
}

// Run on load, resize, and orientation change
window.addEventListener('load', updateViewport);
window.addEventListener('resize', updateViewport);
window.addEventListener('orientationchange', updateViewport);