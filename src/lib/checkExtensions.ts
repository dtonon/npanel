interface ExtensionDetectionResult {
	hasExtensions: boolean;
	detectionMethods: string[];
	debugInfo: any;
}

export function checkForExtensions(): boolean {
	const result = checkForExtensionsWithDebug();
	console.log('Extension Detection Result:', result);
	return result.hasExtensions;
}

export function checkForExtensionsWithDebug(): ExtensionDetectionResult {
	const detectionMethods: string[] = [];
	const debugInfo: any = {};

	// Method 1: Check for extension-injected scripts (most reliable)
	const extensionScripts = Array.from(document.scripts).filter(
		(script) => script.src.includes('extension://') || script.src.includes('moz-extension://')
	);
	debugInfo.extensionScripts = extensionScripts.map((s) => s.src);

	if (extensionScripts.length > 0) {
		detectionMethods.push('extension-scripts');
	}

	// Method 2: Check for extension-injected stylesheets
	const extensionStyles = Array.from(document.styleSheets).filter((sheet) => {
		try {
			return (
				sheet.href &&
				(sheet.href.includes('extension://') || sheet.href.includes('moz-extension://'))
			);
		} catch (e) {
			return false;
		}
	});
	debugInfo.extensionStyles = extensionStyles.map((s) => s.href);

	if (extensionStyles.length > 0) {
		detectionMethods.push('extension-styles');
	}

	// Method 3: Check for DOM modifications by extensions
	const suspiciousElements = document.querySelectorAll(
		['[data-extension-id]', '[data-adblock]', '[class*="extension-"]', '[id*="extension-"]'].join(
			','
		)
	);
	debugInfo.suspiciousElements = suspiciousElements.length;

	if (suspiciousElements.length > 0) {
		detectionMethods.push('suspicious-elements');
	}

	// Method 4: Check window object for extension properties (be very specific)
	const windowKeys = Object.keys(window);
	const extensionKeys = windowKeys.filter(
		(key) =>
			key.startsWith('__extension') ||
			key.includes('tampermonkey') ||
			key.includes('greasemonkey') ||
			(key === 'chrome' && typeof (window as any).chrome.runtime?.getManifest === 'function')
	);
	debugInfo.extensionKeys = extensionKeys;

	if (extensionKeys.length > 0) {
		detectionMethods.push('window-properties');
	}

	// Method 5: Check for content script detection
	const hasContentScriptMarkers = !!(
		document.documentElement.hasAttribute('data-extension') ||
		document.head.querySelector('meta[name*="extension"]')
	);
	debugInfo.hasContentScriptMarkers = hasContentScriptMarkers;

	if (hasContentScriptMarkers) {
		detectionMethods.push('content-script-markers');
	}

	// Debug: Log current state
	debugInfo.totalScripts = document.scripts.length;
	debugInfo.totalStyleSheets = document.styleSheets.length;
	debugInfo.windowKeysCount = windowKeys.length;
	debugInfo.userAgent = navigator.userAgent;
	debugInfo.timestamp = new Date().toISOString();

	return {
		hasExtensions: detectionMethods.length > 0,
		detectionMethods,
		debugInfo
	};
}

// Advanced check with Promise for delayed detection
export function checkForExtensionsDelayed(delayMs: number = 2000): Promise<boolean> {
	return new Promise((resolve) => {
		console.log(`Starting delayed extension check (${delayMs}ms)...`);

		setTimeout(() => {
			const result = checkForExtensions();
			console.log(`Delayed extension check completed: ${result}`);
			resolve(result);
		}, delayMs);
	});
}

// Monitor for extension injection over time
export function monitorExtensions(
	callback: (detected: boolean) => void,
	intervalMs: number = 1000
): () => void {
	console.log('Starting extension monitoring...');

	let lastState = false;
	const interval = setInterval(() => {
		const currentState = checkForExtensions();
		if (currentState !== lastState) {
			console.log(`Extension state changed: ${lastState} -> ${currentState}`);
			lastState = currentState;
			callback(currentState);
		}
	}, intervalMs);

	// Return cleanup function
	return () => {
		console.log('Stopping extension monitoring...');
		clearInterval(interval);
	};
}
