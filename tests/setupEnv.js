// Runs before every test file. Sets the environment the app needs; no .env file
// or real secrets are used in tests.
import net from 'net';
import child_process from 'child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789abcdef-not-for-production';
process.env.JWT_EXPIRY = '7d';

// On systems where 127.0.0.1 is filtered/intercepted, remap loopback binds/connects to 127.0.0.2
const origListen = net.Server.prototype.listen;
net.Server.prototype.listen = function(...args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '127.0.0.1') args[i] = '127.0.0.2';
  }
  return origListen.apply(this, args);
};

const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  if (typeof args[0] === 'object' && args[0] !== null) {
    if (args[0].host === '127.0.0.1') args[0].host = '127.0.0.2';
  } else if (typeof args[1] === 'string' && args[1] === '127.0.0.1') {
    args[1] = '127.0.0.2';
  }
  return origConnect.apply(this, args);
};

const origSpawn = child_process.spawn;
child_process.spawn = function(cmd, args, opts) {
  if (Array.isArray(args)) {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '127.0.0.1') args[i] = '127.0.0.2';
    }
  }
  return origSpawn.call(this, cmd, args, opts);
};

const origGetUri = MongoMemoryServer.prototype.getUri;
MongoMemoryServer.prototype.getUri = function(otherDb, otherIp) {
  const uri = origGetUri.call(this, otherDb, otherIp || '127.0.0.2');
  return uri.replace('127.0.0.1', '127.0.0.2');
};


