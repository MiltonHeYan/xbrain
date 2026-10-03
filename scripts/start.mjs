// One startup command; compilation errors stop before opening a listening socket.
await import('./build.mjs');
await import('../.build/server/server.js');
