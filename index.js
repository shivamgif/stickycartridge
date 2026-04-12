import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

if (typeof globalThis.__turboModuleProxy !== 'function') {
	const createNoopModule = () => new Proxy(
		{
			getConstants: () => ({}),
			addListener: () => {},
			removeListeners: () => {},
		},
		{
			get: (target, prop) => {
				if (prop in target) {
					return target[prop];
				}
				return () => {};
			},
		},
	);

	globalThis.__turboModuleProxy = (moduleName) => {
		if (moduleName === 'BlobModule') {
			return {
				getConstants: () => ({
					BLOB_URI_SCHEME: 'blob',
					BLOB_URI_HOST: 'localhost',
				}),
				addListener: () => {},
				removeListeners: () => {},
			};
		}

		return createNoopModule();
	};
}

if (!global.Buffer) {
	global.Buffer = Buffer;
}

if (!global.atob) {
	global.atob = (value) => Buffer.from(value, 'base64').toString('binary');
}

if (!global.btoa) {
	global.btoa = (value) => Buffer.from(value, 'binary').toString('base64');
}

if (!global.ImageData) {
	global.ImageData = class ImageData {
		constructor(dataOrWidth, widthOrHeight, maybeHeight) {
			if (typeof dataOrWidth === 'number') {
				const width = dataOrWidth;
				const height = widthOrHeight;
				this.width = width;
				this.height = height;
				this.data = new Uint8ClampedArray(width * height * 4);
				return;
			}

			this.data = dataOrWidth;
			this.width = widthOrHeight;
			this.height = maybeHeight;
		}
	};
}

if (!global.document) {
	global.document = {
		addEventListener: () => {},
		removeEventListener: () => {},
	};
}

if (!global.document.addEventListener) {
	global.document.addEventListener = () => {};
}

if (!global.document.removeEventListener) {
	global.document.removeEventListener = () => {};
}

if (!global.document.createElement) {
	global.document.createElement = () => ({});
}

if (!global.navigator) {
	global.navigator = {};
}

if (!global.window) {
	global.window = global;
}

if (!global.self) {
	global.self = global;
}

if (!global.window.addEventListener) {
	global.window.addEventListener = () => {};
}

if (!global.window.removeEventListener) {
	global.window.removeEventListener = () => {};
}

if (!global.navigator.getGamepads) {
	global.navigator.getGamepads = () => [];
}

if (!global.alert) {
	global.alert = () => {};
}

if (!global.performance) {
	global.performance = { now: () => Date.now() };
}

if (!global.requestAnimationFrame) {
	global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
}

if (!global.cancelAnimationFrame) {
	global.cancelAnimationFrame = (id) => clearTimeout(id);
}

if (!global.URL) {
	global.URL = {};
}

if (!global.URL.createObjectURL) {
	global.URL.createObjectURL = () => 'about:blank';
}

if (!global.Blob) {
	global.Blob = class Blob {
		constructor(parts = [], options = {}) {
			this.parts = parts;
			this.type = options.type ?? '';
		}
	};
}

if (!global.SharedArrayBuffer) {
	// Fallback for browser contexts without cross-origin isolation.
	global.SharedArrayBuffer = ArrayBuffer;
}

if (global.AudioContext && global.crossOriginIsolated !== true) {
	const NativeAudioContext = global.AudioContext;

	global.AudioContext = class PatchedAudioContext extends NativeAudioContext {
		constructor(options = {}) {
			super(options);

			if (this.audioWorklet && this.audioWorklet.addModule) {
				// Keep unresolved so emulator audio worklet setup is skipped safely.
				this.audioWorklet.addModule = () => new Promise(() => {});
			}
		}
	};
}

if (!global.AudioWorkletNode) {
	global.AudioWorkletNode = class AudioWorkletNode {
		constructor() {}
		connect() {}
	};
}

if (!global.AudioContext) {
	global.AudioContext = class AudioContext {
		constructor(options = {}) {
			this.sampleRate = options.sampleRate ?? 44100;
			this.destination = {};
			this.audioWorklet = {
				// Keep pending so ring-buffer setup callback doesn't execute with unsupported APIs.
				addModule: () => new Promise(() => {}),
			};
		}

		resume() {}
		suspend() {}
	};
}

const App = require('./App').default;

registerRootComponent(App);
