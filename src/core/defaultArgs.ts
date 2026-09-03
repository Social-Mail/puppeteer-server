export const defaultArgs = [
    // --- 1. ESSENTIAL VPS / NON-GPU OPTIMIZATIONS ---
    // '--headless=new',                  // Enforces the modern, complete headless engine
    '--disable-gpu',                   // Prevents Chromium from hunting for hardware drivers
    '--use-gl=angle',                  // Forces the ANGLE hardware abstraction layer...
    '--use-angle=swiftshader',         // ...to route exclusively through SwiftShader (CPU software rendering)
    '--disable-software-rasterizer',   // Counter-intuitive, but stops older legacy CPU overrides from clashing
    
    // --- 2. THE ABSOLUTE CRITICAL FIXES FOR EMPTY SCREENCASTS ---
    // DO NOT ADD: '--no-zygote'       <- Must remain REMOVED. Zygote is required to fork the software renderer thread.
    '--disable-dev-shm-usage',         // Good: Vital for restricted Azure VM shared memory
    
    // --- 3. BACKGROUND THROTTLING DEFENSES (Vital for Video Streams) ---
    // If these are missing, Chromium pauses rendering when it thinks the tab is "idle"
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    
    // --- 4. STANDARD HEADLESS CONTAINER CLEANUP ---
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-speech-api',
    '--disable-sync',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--password-store=basic',
    '--use-mock-keychain',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--ignore-urlfetcher-cert-requests',
    '--allow-insecure-localhost'
];