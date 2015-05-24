(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.1.1
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    function lib$es6$promise$asap$$asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        lib$es6$promise$asap$$scheduleFlush();
      }
    }

    var lib$es6$promise$asap$$default = lib$es6$promise$asap$$asap;

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      var nextTick = process.nextTick;
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // setImmediate should be used instead instead
      var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
      if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
        nextTick = setImmediate;
      }
      return function() {
        nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertex() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$default(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = lib$es6$promise$$internal$$getThen(maybeThenable);

        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
          entry._onerror = null;
          enumerator._settledAt(entry._state, i, entry._result);
        } else {
          enumerator._willSettleAt(c.resolve(entry), i);
        }
      } else {
        enumerator._remaining--;
        enumerator._result[i] = entry;
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        enumerator._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        if (!lib$es6$promise$utils$$isFunction(resolver)) {
          lib$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof lib$es6$promise$promise$$Promise)) {
          lib$es6$promise$promise$$needsNew();
        }

        lib$es6$promise$$internal$$initializePromise(this, resolver);
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$default(function(){
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],3:[function(require,module,exports){
/**
 * OpenLayers 3 Popup Overlay.
 * See [the examples](./examples) for usage. Styling can be done via CSS.
 * @constructor
 * @extends {ol.Overlay}
 * @param {Object} opt_options Overlay options, extends olx.OverlayOptions adding:
 *                              **`panMapIfOutOfView`** `Boolean` - Should the
 *                              map be panned so that the popup is entirely
 *                              within view.
 */
ol.Overlay.Popup = function(opt_options) {

    var options = opt_options || {};

    this.panMapIfOutOfView = options.panMapIfOutOfView;
    if (this.panMapIfOutOfView === undefined) {
        this.panMapIfOutOfView = true;
    }

    this.ani = options.ani;
    if (this.ani === undefined) {
        this.ani = ol.animation.pan;
    }

    this.ani_opts = options.ani_opts;
    if (this.ani_opts === undefined) {
        this.ani_opts = {'duration': 250};
    }

    this.container = document.createElement('div');
    this.container.className = 'ol-popup';

    this.closer = document.createElement('a');
    this.closer.className = 'ol-popup-closer';
    this.closer.href = '#';
    this.container.appendChild(this.closer);

    var that = this;
    this.closer.addEventListener('click', function(evt) {
        that.container.style.display = 'none';
        that.closer.blur();
        evt.preventDefault();
    }, false);

    this.content = document.createElement('div');
    this.content.className = 'ol-popup-content';
    this.container.appendChild(this.content);

    ol.Overlay.call(this, {
        element: this.container,
        stopEvent: true
    });

};

ol.inherits(ol.Overlay.Popup, ol.Overlay);

/**
 * Show the popup.
 * @param {ol.Coordinate} coord Where to anchor the popup.
 * @param {String} html String of HTML to display within the popup.
 */
ol.Overlay.Popup.prototype.show = function(coord, html) {
    this.setPosition(coord);
    this.content.innerHTML = html;
    this.container.style.display = 'block';
    if (this.panMapIfOutOfView) {
        this.panIntoView_(coord);
    }
    return this;
};

/**
 * @private
 */
ol.Overlay.Popup.prototype.panIntoView_ = function(coord) {

    var popSize = {
            width: this.getElement().clientWidth + 20,
            height: this.getElement().clientHeight + 20
        },
        mapSize = this.getMap().getSize();

    var tailHeight = 20,
        tailOffsetLeft = 60,
        tailOffsetRight = popSize.width - tailOffsetLeft,
        popOffset = this.getOffset(),
        popPx = this.getMap().getPixelFromCoordinate(coord);

    var fromLeft = (popPx[0] - tailOffsetLeft),
        fromRight = mapSize[0] - (popPx[0] + tailOffsetRight);

    var fromTop = popPx[1] - popSize.height + popOffset[1],
        fromBottom = mapSize[1] - (popPx[1] + tailHeight) - popOffset[1];

    var center = this.getMap().getView().getCenter(),
        curPx = this.getMap().getPixelFromCoordinate(center),
        newPx = curPx.slice();

    if (fromRight < 0) {
        newPx[0] -= fromRight;
    } else if (fromLeft < 0) {
        newPx[0] += fromLeft;
    }

    if (fromTop < 0) {
        newPx[1] += fromTop;
    } else if (fromBottom < 0) {
        newPx[1] -= fromBottom;
    }

    if (this.ani && this.ani_opts) {
        this.ani_opts.source = center;
        this.getMap().beforeRender(this.ani(this.ani_opts));
    }

    if (newPx[0] !== curPx[0] || newPx[1] !== curPx[1]) {
        this.getMap().getView().setCenter(this.getMap().getCoordinateFromPixel(newPx));
    }

    return this.getMap().getView().getCenter();

};

/**
 * Hide the popup.
 */
ol.Overlay.Popup.prototype.hide = function() {
    this.container.style.display = 'none';
    return this;
};

},{}],4:[function(require,module,exports){
// OpenLayers 3. See http://openlayers.org/
// License: https://raw.githubusercontent.com/openlayers/ol3/master/LICENSE.md
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof exports === "object") {
    module.exports = factory();
  } else {
    root.ol = factory();
  }
}(this, function () {
  var OPENLAYERS = {};
  var l,aa=aa||{},p=this;function v(b){return void 0!==b}function A(b,c,d){b=b.split(".");d=d||p;b[0]in d||!d.execScript||d.execScript("var "+b[0]);for(var e;b.length&&(e=b.shift());)!b.length&&v(c)?d[e]=c:d[e]?d=d[e]:d=d[e]={}}function ba(){}
function ca(b){var c=typeof b;if("object"==c)if(b){if(b instanceof Array)return"array";if(b instanceof Object)return c;var d=Object.prototype.toString.call(b);if("[object Window]"==d)return"object";if("[object Array]"==d||"number"==typeof b.length&&"undefined"!=typeof b.splice&&"undefined"!=typeof b.propertyIsEnumerable&&!b.propertyIsEnumerable("splice"))return"array";if("[object Function]"==d||"undefined"!=typeof b.call&&"undefined"!=typeof b.propertyIsEnumerable&&!b.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==c&&"undefined"==typeof b.call)return"object";return c}function da(b){return"array"==ca(b)}function ea(b){var c=ca(b);return"array"==c||"object"==c&&"number"==typeof b.length}function G(b){return"string"==typeof b}function fa(b){return"number"==typeof b}function ga(b){return"function"==ca(b)}function ha(b){var c=typeof b;return"object"==c&&null!=b||"function"==c}function M(b){return b[ia]||(b[ia]=++ja)}var ia="closure_uid_"+(1E9*Math.random()>>>0),ja=0;
function ka(b,c,d){return b.call.apply(b.bind,arguments)}function ma(b,c,d){if(!b)throw Error();if(2<arguments.length){var e=Array.prototype.slice.call(arguments,2);return function(){var d=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(d,e);return b.apply(c,d)}}return function(){return b.apply(c,arguments)}}function N(b,c,d){N=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ka:ma;return N.apply(null,arguments)}
function na(b,c){var d=Array.prototype.slice.call(arguments,1);return function(){var c=d.slice();c.push.apply(c,arguments);return b.apply(this,c)}}var oa=Date.now||function(){return+new Date};function O(b,c){function d(){}d.prototype=c.prototype;b.C=c.prototype;b.prototype=new d;b.prototype.constructor=b;b.Yd=function(b,d,g){for(var h=Array(arguments.length-2),k=2;k<arguments.length;k++)h[k-2]=arguments[k];return c.prototype[d].apply(b,h)}};var pa;var qa=String.prototype.trim?function(b){return b.trim()}:function(b){return b.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function ra(b){if(!ta.test(b))return b;-1!=b.indexOf("&")&&(b=b.replace(ua,"&amp;"));-1!=b.indexOf("<")&&(b=b.replace(va,"&lt;"));-1!=b.indexOf(">")&&(b=b.replace(wa,"&gt;"));-1!=b.indexOf('"')&&(b=b.replace(xa,"&quot;"));-1!=b.indexOf("'")&&(b=b.replace(ya,"&#39;"));-1!=b.indexOf("\x00")&&(b=b.replace(za,"&#0;"));return b}var ua=/&/g,va=/</g,wa=/>/g,xa=/"/g,ya=/'/g,za=/\x00/g,ta=/[\x00&<>"']/;
function Aa(b,c){return b<c?-1:b>c?1:0};var Da=Array.prototype;function P(b,c,d){Da.forEach.call(b,c,d)}function Ea(b,c){return Da.filter.call(b,c,void 0)}function Fa(b,c,d){return Da.map.call(b,c,d)}function Ga(b){var c;a:{c=Ha;for(var d=b.length,e=G(b)?b.split(""):b,f=0;f<d;f++)if(f in e&&c.call(void 0,e[f],f,b)){c=f;break a}c=-1}return 0>c?null:G(b)?b.charAt(c):b[c]}function Ia(b,c){var d=Da.indexOf.call(b,c,void 0),e;(e=0<=d)&&Da.splice.call(b,d,1);return e}
function Ja(b){var c=b.length;if(0<c){for(var d=Array(c),e=0;e<c;e++)d[e]=b[e];return d}return[]}function Ka(b,c){for(var d=1;d<arguments.length;d++){var e=arguments[d];if(ea(e)){var f=b.length||0,g=e.length||0;b.length=f+g;for(var h=0;h<g;h++)b[f+h]=e[h]}else b.push(e)}}function La(b,c,d,e){Da.splice.apply(b,Ma(arguments,1))}function Ma(b,c,d){return 2>=arguments.length?Da.slice.call(b,c):Da.slice.call(b,c,d)}function Na(b,c){b.sort(c||Oa)}
function Pa(b,c){if(!ea(b)||!ea(c)||b.length!=c.length)return!1;for(var d=b.length,e=Qa,f=0;f<d;f++)if(!e(b[f],c[f]))return!1;return!0}function Oa(b,c){return b>c?1:b<c?-1:0}function Qa(b,c){return b===c};var Ra;a:{var Sa=p.navigator;if(Sa){var Ta=Sa.userAgent;if(Ta){Ra=Ta;break a}}Ra=""}function Ua(b){return-1!=Ra.indexOf(b)};function Va(b,c,d){for(var e in b)c.call(d,b[e],e,b)}function Wa(b,c){for(var d in b)if(c.call(void 0,b[d],d,b))return!0;return!1}function Xa(b){var c=0,d;for(d in b)c++;return c}function Ya(b){var c=[],d=0,e;for(e in b)c[d++]=b[e];return c}function Za(b){var c=[],d=0,e;for(e in b)c[d++]=e;return c}function $a(b){for(var c in b)return!1;return!0}function ab(b){for(var c in b)delete b[c]}function bb(b,c){c in b&&delete b[c]}function cb(b,c,d){return c in b?b[c]:d}
function db(b){var c={},d;for(d in b)c[d]=b[d];return c}var eb="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function fb(b,c){for(var d,e,f=1;f<arguments.length;f++){e=arguments[f];for(d in e)b[d]=e[d];for(var g=0;g<eb.length;g++)d=eb[g],Object.prototype.hasOwnProperty.call(e,d)&&(b[d]=e[d])}}
function gb(b){var c=arguments.length;if(1==c&&da(arguments[0]))return gb.apply(null,arguments[0]);for(var d={},e=0;e<c;e++)d[arguments[e]]=!0;return d};var hb=Ua("Opera")||Ua("OPR"),R=Ua("Trident")||Ua("MSIE"),ib=Ua("Gecko")&&-1==Ra.toLowerCase().indexOf("webkit")&&!(Ua("Trident")||Ua("MSIE")),jb=-1!=Ra.toLowerCase().indexOf("webkit"),kb=Ua("Macintosh"),lb=Ua("Windows"),mb=Ua("Linux")||Ua("CrOS");function nb(){var b=p.document;return b?b.documentMode:void 0}
var ob=function(){var b="",c;if(hb&&p.opera)return b=p.opera.version,ga(b)?b():b;ib?c=/rv\:([^\);]+)(\)|;)/:R?c=/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/:jb&&(c=/WebKit\/(\S+)/);c&&(b=(b=c.exec(Ra))?b[1]:"");return R&&(c=nb(),c>parseFloat(b))?String(c):b}(),pb={};
function qb(b){var c;if(!(c=pb[b])){c=0;for(var d=qa(String(ob)).split("."),e=qa(String(b)).split("."),f=Math.max(d.length,e.length),g=0;0==c&&g<f;g++){var h=d[g]||"",k=e[g]||"",m=RegExp("(\\d*)(\\D*)","g"),n=RegExp("(\\d*)(\\D*)","g");do{var r=m.exec(h)||["","",""],q=n.exec(k)||["","",""];if(0==r[0].length&&0==q[0].length)break;c=Aa(0==r[1].length?0:parseInt(r[1],10),0==q[1].length?0:parseInt(q[1],10))||Aa(0==r[2].length,0==q[2].length)||Aa(r[2],q[2])}while(0==c)}c=pb[b]=0<=c}return c}
var rb=p.document,sb=rb&&R?nb()||("CSS1Compat"==rb.compatMode?parseInt(ob,10):5):void 0;R&&qb("9.0");function tb(b,c,d){return Math.min(Math.max(b,c),d)}function ub(b,c){var d=b%c;return 0>d*c?d+c:d};function vb(b){return function(c){if(v(c))return[tb(c[0],b[0],b[2]),tb(c[1],b[1],b[3])]}}function wb(b){return b};function xb(b,c,d){var e=b.length;if(b[0]<=c)return 0;if(!(c<=b[e-1]))if(0<d)for(d=1;d<e;++d){if(b[d]<c)return d-1}else if(0>d)for(d=1;d<e;++d){if(b[d]<=c)return d}else for(d=1;d<e;++d){if(b[d]==c)return d;if(b[d]<c)return b[d-1]-c<c-b[d]?d-1:d}return e-1};function yb(b){return function(c,d,e){if(v(c))return c=xb(b,c,e),c=tb(c+d,0,b.length-1),b[c]}}function zb(b,c,d){return function(e,f,g){if(v(e))return g=0<g?0:0>g?1:.5,e=Math.floor(Math.log(c/e)/Math.log(b)+g),f=Math.max(e+f,0),v(d)&&(f=Math.min(f,d)),c/Math.pow(b,f)}};function Ab(b){if(v(b))return 0}function Bb(b,c){if(v(b))return b+c}function Cb(b){var c=2*Math.PI/b;return function(b,e){if(v(b))return b=Math.floor((b+e)/c+.5)*c}}function Db(){var b=5*Math.PI/180;return function(c,d){if(v(c))return Math.abs(c+d)<=b?0:c+d}};function Eb(b,c,d){this.center=b;this.resolution=c;this.rotation=d};var Fb=!R||R&&9<=sb,Gb=!R||R&&9<=sb,Hb=R&&!qb("9");!jb||qb("528");ib&&qb("1.9b")||R&&qb("8")||hb&&qb("9.5")||jb&&qb("528");ib&&!qb("8")||R&&qb("9");function Ib(){0!=Jb&&(Kb[M(this)]=this);this.v=this.v;this.o=this.o}var Jb=0,Kb={};Ib.prototype.v=!1;Ib.prototype.kb=function(){if(!this.v&&(this.v=!0,this.u(),0!=Jb)){var b=M(this);delete Kb[b]}};function Lb(b,c){var d=na(Mb,c);b.v?d.call(void 0):(b.o||(b.o=[]),b.o.push(v(void 0)?N(d,void 0):d))}Ib.prototype.u=function(){if(this.o)for(;this.o.length;)this.o.shift()()};function Mb(b){b&&"function"==typeof b.kb&&b.kb()};function S(b,c){this.type=b;this.e=this.target=c;this.f=!1;this.ec=!0}S.prototype.na=function(){this.f=!0};S.prototype.preventDefault=function(){this.ec=!1};function Ob(b){b.na()};var Pb=R?"focusout":"DOMFocusOut";function Qb(b){Qb[" "](b);return b}Qb[" "]=ba;function Rb(b,c){S.call(this,b?b.type:"");this.relatedTarget=this.e=this.target=null;this.o=this.c=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.l=this.d=this.b=this.g=!1;this.state=null;this.h=!1;this.a=null;if(b){this.a=b;var d=this.type=b.type;this.target=b.target||b.srcElement;this.e=c;var e=b.relatedTarget;if(e){if(ib){var f;a:{try{Qb(e.nodeName);f=!0;break a}catch(g){}f=!1}f||(e=null)}}else"mouseover"==d?e=b.fromElement:"mouseout"==d&&(e=b.toElement);
this.relatedTarget=e;Object.defineProperties?Object.defineProperties(this,{offsetX:{configurable:!0,enumerable:!0,get:this.Qb,set:this.Ed},offsetY:{configurable:!0,enumerable:!0,get:this.Rb,set:this.Fd}}):(this.offsetX=this.Qb(),this.offsetY=this.Rb());this.clientX=void 0!==b.clientX?b.clientX:b.pageX;this.clientY=void 0!==b.clientY?b.clientY:b.pageY;this.screenX=b.screenX||0;this.screenY=b.screenY||0;this.button=b.button;this.c=b.keyCode||0;this.o=b.charCode||("keypress"==d?b.keyCode:0);this.g=b.ctrlKey;
this.b=b.altKey;this.d=b.shiftKey;this.l=b.metaKey;this.h=kb?b.metaKey:b.ctrlKey;this.state=b.state;b.defaultPrevented&&this.preventDefault()}}O(Rb,S);var Sb=[1,4,2];function Tb(b){return(Fb?0==b.a.button:"click"==b.type?!0:!!(b.a.button&Sb[0]))&&!(jb&&kb&&b.g)}l=Rb.prototype;l.na=function(){Rb.C.na.call(this);this.a.stopPropagation?this.a.stopPropagation():this.a.cancelBubble=!0};
l.preventDefault=function(){Rb.C.preventDefault.call(this);var b=this.a;if(b.preventDefault)b.preventDefault();else if(b.returnValue=!1,Hb)try{if(b.ctrlKey||112<=b.keyCode&&123>=b.keyCode)b.keyCode=-1}catch(c){}};l.yc=function(){return this.a};l.Qb=function(){return jb||void 0!==this.a.offsetX?this.a.offsetX:this.a.layerX};l.Ed=function(b){Object.defineProperties(this,{offsetX:{writable:!0,enumerable:!0,configurable:!0,value:b}})};
l.Rb=function(){return jb||void 0!==this.a.offsetY?this.a.offsetY:this.a.layerY};l.Fd=function(b){Object.defineProperties(this,{offsetY:{writable:!0,enumerable:!0,configurable:!0,value:b}})};var Ub="closure_listenable_"+(1E6*Math.random()|0);function Vb(b){return!(!b||!b[Ub])}var Wb=0;function Xb(b,c,d,e,f){this.la=b;this.a=null;this.src=c;this.type=d;this.ua=!!e;this.Ra=f;this.key=++Wb;this.qa=this.La=!1}function Yb(b){b.qa=!0;b.la=null;b.a=null;b.src=null;b.Ra=null};function Zb(b){this.src=b;this.a={};this.b=0}Zb.prototype.add=function(b,c,d,e,f){var g=b.toString();b=this.a[g];b||(b=this.a[g]=[],this.b++);var h=$b(b,c,e,f);-1<h?(c=b[h],d||(c.La=!1)):(c=new Xb(c,this.src,g,!!e,f),c.La=d,b.push(c));return c};Zb.prototype.remove=function(b,c,d,e){b=b.toString();if(!(b in this.a))return!1;var f=this.a[b];c=$b(f,c,d,e);return-1<c?(Yb(f[c]),Da.splice.call(f,c,1),0==f.length&&(delete this.a[b],this.b--),!0):!1};
function ac(b,c){var d=c.type;if(!(d in b.a))return!1;var e=Ia(b.a[d],c);e&&(Yb(c),0==b.a[d].length&&(delete b.a[d],b.b--));return e}function bc(b,c,d){var e=v(c),f=e?c.toString():"",g=v(d);return Wa(b.a,function(b){for(var c=0;c<b.length;++c)if(!(e&&b[c].type!=f||g&&b[c].ua!=d))return!0;return!1})}function $b(b,c,d,e){for(var f=0;f<b.length;++f){var g=b[f];if(!g.qa&&g.la==c&&g.ua==!!d&&g.Ra==e)return f}return-1};var cc="closure_lm_"+(1E6*Math.random()|0),dc={},ec=0;function T(b,c,d,e,f){if(da(c)){for(var g=0;g<c.length;g++)T(b,c[g],d,e,f);return null}d=fc(d);return Vb(b)?b.W.add(String(c),d,!1,e,f):gc(b,c,d,!1,e,f)}function gc(b,c,d,e,f,g){if(!c)throw Error("Invalid event type");var h=!!f,k=hc(b);k||(b[cc]=k=new Zb(b));d=k.add(c,d,e,f,g);if(d.a)return d;e=ic();d.a=e;e.src=b;e.la=d;b.addEventListener?b.addEventListener(c.toString(),e,h):b.attachEvent(jc(c.toString()),e);ec++;return d}
function ic(){var b=kc,c=Gb?function(d){return b.call(c.src,c.la,d)}:function(d){d=b.call(c.src,c.la,d);if(!d)return d};return c}function lc(b,c,d,e,f){if(da(c)){for(var g=0;g<c.length;g++)lc(b,c[g],d,e,f);return null}d=fc(d);return Vb(b)?b.W.add(String(c),d,!0,e,f):gc(b,c,d,!0,e,f)}function mc(b,c,d,e,f){if(da(c))for(var g=0;g<c.length;g++)mc(b,c[g],d,e,f);else(d=fc(d),Vb(b))?b.W.remove(String(c),d,e,f):b&&(b=hc(b))&&(c=b.a[c.toString()],b=-1,c&&(b=$b(c,d,!!e,f)),(d=-1<b?c[b]:null)&&U(d))}
function U(b){if(fa(b)||!b||b.qa)return!1;var c=b.src;if(Vb(c))return ac(c.W,b);var d=b.type,e=b.a;c.removeEventListener?c.removeEventListener(d,e,b.ua):c.detachEvent&&c.detachEvent(jc(d),e);ec--;(d=hc(c))?(ac(d,b),0==d.b&&(d.src=null,c[cc]=null)):Yb(b);return!0}function jc(b){return b in dc?dc[b]:dc[b]="on"+b}function nc(b,c,d,e){var f=!0;if(b=hc(b))if(c=b.a[c.toString()])for(c=c.concat(),b=0;b<c.length;b++){var g=c[b];g&&g.ua==d&&!g.qa&&(g=oc(g,e),f=f&&!1!==g)}return f}
function oc(b,c){var d=b.la,e=b.Ra||b.src;b.La&&U(b);return d.call(e,c)}
function kc(b,c){if(b.qa)return!0;if(!Gb){var d;if(!(d=c))a:{d=["window","event"];for(var e=p,f;f=d.shift();)if(null!=e[f])e=e[f];else{d=null;break a}d=e}f=d;d=new Rb(f,this);e=!0;if(!(0>f.keyCode||void 0!=f.returnValue)){a:{var g=!1;if(0==f.keyCode)try{f.keyCode=-1;break a}catch(h){g=!0}if(g||void 0==f.returnValue)f.returnValue=!0}f=[];for(g=d.e;g;g=g.parentNode)f.push(g);for(var g=b.type,k=f.length-1;!d.f&&0<=k;k--){d.e=f[k];var m=nc(f[k],g,!0,d),e=e&&m}for(k=0;!d.f&&k<f.length;k++)d.e=f[k],m=nc(f[k],
g,!1,d),e=e&&m}return e}return oc(b,new Rb(c,this))}function hc(b){b=b[cc];return b instanceof Zb?b:null}var pc="__closure_events_fn_"+(1E9*Math.random()>>>0);function fc(b){if(ga(b))return b;b[pc]||(b[pc]=function(c){return b.handleEvent(c)});return b[pc]};function V(){Ib.call(this);this.W=new Zb(this);this.Fa=this;this.M=null}O(V,Ib);V.prototype[Ub]=!0;V.prototype.addEventListener=function(b,c,d,e){T(this,b,c,d,e)};V.prototype.removeEventListener=function(b,c,d,e){mc(this,b,c,d,e)};
function W(b,c){var d,e=b.M;if(e)for(d=[];e;e=e.M)d.push(e);var e=b.Fa,f=c,g=f.type||f;if(G(f))f=new S(f,e);else if(f instanceof S)f.target=f.target||e;else{var h=f,f=new S(g,e);fb(f,h)}var h=!0,k;if(d)for(var m=d.length-1;!f.f&&0<=m;m--)k=f.e=d[m],h=qc(k,g,!0,f)&&h;f.f||(k=f.e=e,h=qc(k,g,!0,f)&&h,f.f||(h=qc(k,g,!1,f)&&h));if(d)for(m=0;!f.f&&m<d.length;m++)k=f.e=d[m],h=qc(k,g,!1,f)&&h;return h}
V.prototype.u=function(){V.C.u.call(this);if(this.W){var b=this.W,c=0,d;for(d in b.a){for(var e=b.a[d],f=0;f<e.length;f++)++c,Yb(e[f]);delete b.a[d];b.b--}}this.M=null};function qc(b,c,d,e){c=b.W.a[String(c)];if(!c)return!0;c=c.concat();for(var f=!0,g=0;g<c.length;++g){var h=c[g];if(h&&!h.qa&&h.ua==d){var k=h.la,m=h.Ra||h.src;h.La&&ac(b.W,h);f=!1!==k.call(m,e)&&f}}return f&&0!=e.ec}function sc(b,c,d){return bc(b.W,v(c)?String(c):void 0,d)};function tc(){V.call(this);this.e=0}O(tc,V);tc.prototype.c=function(){++this.e;W(this,"change")};tc.prototype.kc=function(b,c,d){return T(this,b,c,!1,d)};function uc(b,c,d){S.call(this,b);this.key=c;this.oldValue=d}O(uc,S);function X(b){tc.call(this);M(this);this.l={};v(b)&&vc(this,b)}O(X,tc);var wc={};function xc(b){return wc.hasOwnProperty(b)?wc[b]:wc[b]="change:"+b}X.prototype.get=function(b){var c;this.l.hasOwnProperty(b)&&(c=this.l[b]);return c};X.prototype.ka=function(){return Za(this.l)};X.prototype.N=function(){var b={},c;for(c in this.l)b[c]=this.l[c];return b};
X.prototype.set=function(b,c){var d=this.l[b];this.l[b]=c;var e;e=xc(b);W(this,new uc(e,b,d));W(this,new uc("propertychange",b,d))};function vc(b,c){for(var d in c)b.set(d,c[d])};function yc(b,c){if(da(b))return b;v(c)?(c[0]=b,c[1]=b):c=[b,b];return c};function zc(b,c){b[0]+=c[0];b[1]+=c[1]}function Ac(b,c){var d=Math.cos(c),e=Math.sin(c),f=b[1]*d+b[0]*e;b[0]=b[0]*d-b[1]*e;b[1]=f};function Bc(b){this.length=b.length||b;for(var c=0;c<this.length;c++)this[c]=b[c]||0}Bc.prototype.a=4;Bc.prototype.set=function(b,c){c=c||0;for(var d=0;d<b.length&&c+d<this.length;d++)this[c+d]=b[d]};Bc.prototype.toString=Array.prototype.join;"undefined"==typeof Float32Array&&(Bc.BYTES_PER_ELEMENT=4,Bc.prototype.BYTES_PER_ELEMENT=Bc.prototype.a,Bc.prototype.set=Bc.prototype.set,Bc.prototype.toString=Bc.prototype.toString,A("Float32Array",Bc,void 0));function Cc(b){this.length=b.length||b;for(var c=0;c<this.length;c++)this[c]=b[c]||0}Cc.prototype.a=8;Cc.prototype.set=function(b,c){c=c||0;for(var d=0;d<b.length&&c+d<this.length;d++)this[c+d]=b[d]};Cc.prototype.toString=Array.prototype.join;if("undefined"==typeof Float64Array){try{Cc.BYTES_PER_ELEMENT=8}catch(Dc){}Cc.prototype.BYTES_PER_ELEMENT=Cc.prototype.a;Cc.prototype.set=Cc.prototype.set;Cc.prototype.toString=Cc.prototype.toString;A("Float64Array",Cc,void 0)};function Ec(){var b=Array(16);b[0]=0;b[1]=0;b[2]=0;b[3]=0;b[4]=0;b[5]=0;b[6]=0;b[7]=0;b[8]=0;b[9]=0;b[10]=0;b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=0;return b}function Fc(b,c,d){var e=b[1]*c+b[5]*d+0*b[9]+b[13],f=b[2]*c+b[6]*d+0*b[10]+b[14],g=b[3]*c+b[7]*d+0*b[11]+b[15];b[12]=b[0]*c+b[4]*d+0*b[8]+b[12];b[13]=e;b[14]=f;b[15]=g}new Float64Array(3);new Float64Array(3);new Float64Array(4);new Float64Array(4);new Float64Array(4);new Float64Array(16);function Gc(b,c){var d=Math.min.apply(null,b),e=Math.min.apply(null,c),f=Math.max.apply(null,b),g=Math.max.apply(null,c);return Hc(d,e,f,g,void 0)}function Ic(b,c,d){return v(d)?(d[0]=b[0]-c,d[1]=b[1]-c,d[2]=b[2]+c,d[3]=b[3]+c,d):[b[0]-c,b[1]-c,b[2]+c,b[3]+c]}function Jc(b,c){return v(c)?(c[0]=b[0],c[1]=b[1],c[2]=b[2],c[3]=b[3],c):b.slice()}function Kc(b,c){return b[0]<=c[0]&&c[2]<=b[2]&&b[1]<=c[1]&&c[3]<=b[3]}function Lc(){return[Infinity,Infinity,-Infinity,-Infinity]}
function Hc(b,c,d,e,f){return v(f)?(f[0]=b,f[1]=c,f[2]=d,f[3]=e,f):[b,c,d,e]}function Mc(b,c){return b[0]==c[0]&&b[2]==c[2]&&b[1]==c[1]&&b[3]==c[3]}function Nc(b,c){c[0]<b[0]&&(b[0]=c[0]);c[0]>b[2]&&(b[2]=c[0]);c[1]<b[1]&&(b[1]=c[1]);c[1]>b[3]&&(b[3]=c[1])}function Oc(b,c,d,e,f){for(;d<e;d+=f){var g=b,h=c[d],k=c[d+1];g[0]=Math.min(g[0],h);g[1]=Math.min(g[1],k);g[2]=Math.max(g[2],h);g[3]=Math.max(g[3],k)}return b}function Pc(b){return[(b[0]+b[2])/2,(b[1]+b[3])/2]}
function Qc(b,c){var d;"bottom-left"===c?d=[b[0],b[1]]:"bottom-right"===c?d=[b[2],b[1]]:"top-left"===c?d=[b[0],b[3]]:"top-right"===c&&(d=[b[2],b[3]]);return d}function Rc(b,c,d,e){var f=c*e[0]/2;e=c*e[1]/2;c=Math.cos(d);d=Math.sin(d);f=[-f,-f,f,f];e=[-e,e,-e,e];var g,h,k;for(g=0;4>g;++g)h=f[g],k=e[g],f[g]=b[0]+h*c-k*d,e[g]=b[1]+h*d+k*c;return Gc(f,e)}
function Sc(b,c){var d=v(void 0)?void 0:Lc();Uc(b,c)&&(d[0]=b[0]>c[0]?b[0]:c[0],d[1]=b[1]>c[1]?b[1]:c[1],d[2]=b[2]<c[2]?b[2]:c[2],d[3]=b[3]<c[3]?b[3]:c[3]);return d}function Uc(b,c){return b[0]<=c[2]&&b[2]>=c[0]&&b[1]<=c[3]&&b[3]>=c[1]};/*

 Latitude/longitude spherical geodesy formulae taken from
 http://www.movable-type.co.uk/scripts/latlong.html
 Licensed under CC-BY-3.0.
*/
function Vc(b){this.radius=b}function Wc(b,c){var d=b[1]*Math.PI/180,e=c[1]*Math.PI/180,f=(e-d)/2,g=(c[0]-b[0])*Math.PI/180/2,d=Math.sin(f)*Math.sin(f)+Math.sin(g)*Math.sin(g)*Math.cos(d)*Math.cos(e);return 2*Xc.radius*Math.atan2(Math.sqrt(d),Math.sqrt(1-d))}
Vc.prototype.offset=function(b,c,d){var e=b[1]*Math.PI/180;c/=this.radius;var f=Math.asin(Math.sin(e)*Math.cos(c)+Math.cos(e)*Math.sin(c)*Math.cos(d));return[180*(b[0]*Math.PI/180+Math.atan2(Math.sin(d)*Math.sin(c)*Math.cos(e),Math.cos(c)-Math.sin(e)*Math.sin(f)))/Math.PI,180*f/Math.PI]};var Xc=new Vc(6370997);var Yc={};Yc.degrees=2*Math.PI*Xc.radius/360;Yc.ft=.3048;Yc.m=1;Yc["us-ft"]=1200/3937;function Zc(b){this.a=b.code;this.b=b.units;this.f=v(b.extent)?b.extent:null;this.c=(this.d=v(b.global)?b.global:!1)&&null!==this.f;this.g=v(b.getPointResolution)?b.getPointResolution:this.h;this.e=null}Zc.prototype.w=function(){return this.f};
Zc.prototype.h=function(b,c){if("degrees"==this.b)return b;var d=$c(this,ad("EPSG:4326")),e=[c[0]-b/2,c[1],c[0]+b/2,c[1],c[0],c[1]-b/2,c[0],c[1]+b/2],e=d(e,e,2),d=(Wc(e.slice(0,2),e.slice(2,4))+Wc(e.slice(4,6),e.slice(6,8)))/2,e=Yc[this.b];v(e)&&(d/=e);return d};Zc.prototype.getPointResolution=function(b,c){return this.g(b,c)};var bd={},cd={};function dd(b){ed(b);P(b,function(c){P(b,function(b){c!==b&&fd(c,b,gd)})})}function hd(b){bd[b.a]=b;fd(b,b,gd)}
function ed(b){var c=[];P(b,function(b){c.push(hd(b))})}function id(b){return null!=b?G(b)?ad(b):b:ad("EPSG:3857")}function fd(b,c,d){b=b.a;c=c.a;b in cd||(cd[b]={});cd[b][c]=d}function ad(b){var c;b instanceof Zc?c=b:G(b)?c=bd[b]:c=null;return c}function jd(b,c){var d=ad(b),e=ad(c);return $c(d,e)}function $c(b,c){var d=b.a,e=c.a,f;d in cd&&e in cd[d]&&(f=cd[d][e]);v(f)||(f=kd);return f}function kd(b,c){if(v(c)&&b!==c){for(var d=0,e=b.length;d<e;++d)c[d]=b[d];b=c}return b}
function gd(b,c){var d;if(v(c)){d=0;for(var e=b.length;d<e;++d)c[d]=b[d];d=c}else d=b.slice();return d};function ld(b){X.call(this);b=v(b)?b:{};this.b=[0,0];var c={};c.center=v(b.center)?b.center:null;this.g=id(b.projection);var d,e,f,g=v(b.minZoom)?b.minZoom:0;d=v(b.maxZoom)?b.maxZoom:28;var h=v(b.zoomFactor)?b.zoomFactor:2;if(v(b.resolutions))d=b.resolutions,e=d[0],d=yb(d);else{e=id(b.projection);f=e.w();var k=(null===f?360*Yc.degrees/Yc[e.b]:Math.max(f[2]-f[0],f[3]-f[1]))/256/Math.pow(2,0),m=k/Math.pow(2,28);e=b.maxResolution;v(e)?g=0:e=k/Math.pow(h,g);f=b.minResolution;v(f)||(f=v(b.maxZoom)?v(b.maxResolution)?
e/Math.pow(h,d):k/Math.pow(h,d):m);d=g+Math.floor(Math.log(e/f)/Math.log(h));d=zb(h,e,d-g)}this.d=e;this.f=g;g=v(b.extent)?vb(b.extent):wb;(v(b.enableRotation)?b.enableRotation:1)?(e=b.constrainRotation,e=v(e)&&!0!==e?!1===e?Bb:fa(e)?Cb(e):Bb:Db()):e=Ab;this.a=new Eb(g,d,e);v(b.resolution)?c.resolution=b.resolution:v(b.zoom)&&(c.resolution=this.constrainResolution(this.d,b.zoom-this.f));c.rotation=v(b.rotation)?b.rotation:0;vc(this,c)}O(ld,X);l=ld.prototype;
l.constrainResolution=function(b,c,d){return this.a.resolution(b,c||0,d||0)};l.constrainRotation=function(b,c){return this.a.rotation(b,c||0)};l.U=function(){return this.get("center")};function md(b){return b.get("resolution")}l.H=function(){return this.get("rotation")};l.I=function(){var b=this.U(),c=this.g,d=md(this),e=this.H();return{center:b.slice(),projection:v(c)?c:null,resolution:d,rotation:e}};
l.rotate=function(b,c){if(v(c)){var d,e=this.U();v(e)&&(d=[e[0]-c[0],e[1]-c[1]],Ac(d,b-this.H()),zc(d,c));nd(this,d)}this.set("rotation",b)};function nd(b,c){b.set("center",c)}function od(b,c){b.b[1]+=c};function pd(b){return 1-Math.pow(1-b,3)};function qd(b){return 3*b*b-2*b*b*b}function rd(b){return b};function sd(b){var c=b.source,d=v(b.start)?b.start:oa(),e=c[0],f=c[1],g=v(b.duration)?b.duration:1E3,h=v(b.easing)?b.easing:qd;return function(b,c){if(c.time<d)return c.animate=!0,c.viewHints[0]+=1,!0;if(c.time<d+g){var n=1-h((c.time-d)/g),r=e-c.viewState.center[0],q=f-c.viewState.center[1];c.animate=!0;c.viewState.center[0]+=n*r;c.viewState.center[1]+=n*q;c.viewHints[0]+=1;return!0}return!1}}
function td(b){var c=v(b.rotation)?b.rotation:0,d=v(b.start)?b.start:oa(),e=v(b.duration)?b.duration:1E3,f=v(b.easing)?b.easing:qd,g=v(b.anchor)?b.anchor:null;return function(b,k){if(k.time<d)return k.animate=!0,k.viewHints[0]+=1,!0;if(k.time<d+e){var m=1-f((k.time-d)/e),m=(c-k.viewState.rotation)*m;k.animate=!0;k.viewState.rotation+=m;if(null!==g){var n=k.viewState.center;n[0]-=g[0];n[1]-=g[1];Ac(n,m);zc(n,g)}k.viewHints[0]+=1;return!0}return!1}}
function ud(b){var c=b.resolution,d=v(b.start)?b.start:oa(),e=v(b.duration)?b.duration:1E3,f=v(b.easing)?b.easing:qd;return function(b,h){if(h.time<d)return h.animate=!0,h.viewHints[0]+=1,!0;if(h.time<d+e){var k=1-f((h.time-d)/e),m=c-h.viewState.resolution;h.animate=!0;h.viewState.resolution+=k*m;h.viewHints[0]+=1;return!0}return!1}};function vd(b,c,d,e){return v(e)?(e[0]=b,e[1]=c,e[2]=d,e):[b,c,d]}function wd(b,c,d){return b+"/"+c+"/"+d}function xd(b){return wd(b[0],b[1],b[2])};function yd(b,c,d,e){this.a=b;this.c=c;this.e=d;this.b=e}function zd(b,c,d,e,f){return v(f)?(f.a=b,f.c=c,f.e=d,f.b=e,f):new yd(b,c,d,e)}yd.prototype.contains=function(b){return Ad(this,b[1],b[2])};function Ad(b,c,d){return b.a<=c&&c<=b.c&&b.e<=d&&d<=b.b}yd.prototype.B=function(){return this.c-this.a+1};function Bd(b,c){return b.a<=c.c&&b.c>=c.a&&b.e<=c.b&&b.b>=c.e};function Cd(b){this.b=b.html;this.a=v(b.tileRanges)?b.tileRanges:null};function Dd(b,c,d){S.call(this,b,d);this.element=c}O(Dd,S);function Ed(b){X.call(this);this.a=v(b)?b:[];Fd(this)}O(Ed,X);l=Ed.prototype;l.clear=function(){for(;0<this.get("length");)Gd(this,this.get("length")-1)};l.forEach=function(b,c){P(this.a,b,c)};l.item=function(b){return this.a[b]};l.push=function(b){var c=this.a.length;La(this.a,c,0,b);Fd(this);W(this,new Dd("add",b,this));return c};l.remove=function(b){var c=this.a,d,e;d=0;for(e=c.length;d<e;++d)if(c[d]===b)return Gd(this,d)};
function Gd(b,c){var d=b.a[c];Da.splice.call(b.a,c,1);Fd(b);W(b,new Dd("remove",d,b));return d}function Fd(b){b.set("length",b.a.length)};function Hd(b){if(!G(b)){var c=b[0];c!=(c|0)&&(c=c+.5|0);var d=b[1];d!=(d|0)&&(d=d+.5|0);var e=b[2];e!=(e|0)&&(e=e+.5|0);b="rgba("+c+","+d+","+e+","+b[3]+")"}return b};var Id=!R||R&&9<=sb;!ib&&!R||R&&R&&9<=sb||ib&&qb("1.9.1");R&&qb("9");gb("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));function Jd(b,c){this.x=v(b)?b:0;this.y=v(c)?c:0}l=Jd.prototype;l.clone=function(){return new Jd(this.x,this.y)};l.ceil=function(){this.x=Math.ceil(this.x);this.y=Math.ceil(this.y);return this};l.floor=function(){this.x=Math.floor(this.x);this.y=Math.floor(this.y);return this};l.round=function(){this.x=Math.round(this.x);this.y=Math.round(this.y);return this};l.scale=function(b,c){var d=fa(c)?c:b;this.x*=b;this.y*=d;return this};function Kd(b,c){this.width=b;this.height=c}l=Kd.prototype;l.clone=function(){return new Kd(this.width,this.height)};l.T=function(){return!(this.width*this.height)};l.ceil=function(){this.width=Math.ceil(this.width);this.height=Math.ceil(this.height);return this};l.floor=function(){this.width=Math.floor(this.width);this.height=Math.floor(this.height);return this};l.round=function(){this.width=Math.round(this.width);this.height=Math.round(this.height);return this};
l.scale=function(b,c){var d=fa(c)?c:b;this.width*=b;this.height*=d;return this};function Ld(b){return b?new Md(Nd(b)):pa||(pa=new Md)}function Od(b){var c=document;return G(b)?c.getElementById(b):b}function Pd(b,c){Va(c,function(c,e){"style"==e?b.style.cssText=c:"class"==e?b.className=c:"for"==e?b.htmlFor=c:e in Qd?b.setAttribute(Qd[e],c):0==e.lastIndexOf("aria-",0)||0==e.lastIndexOf("data-",0)?b.setAttribute(e,c):b[e]=c})}
var Qd={cellpadding:"cellPadding",cellspacing:"cellSpacing",colspan:"colSpan",frameborder:"frameBorder",height:"height",maxlength:"maxLength",role:"role",rowspan:"rowSpan",type:"type",usemap:"useMap",valign:"vAlign",width:"width"};function Rd(b){b=b.document.documentElement;return new Kd(b.clientWidth,b.clientHeight)}
function Sd(b,c,d){var e=arguments,f=document,g=e[0],h=e[1];if(!Id&&h&&(h.name||h.type)){g=["<",g];h.name&&g.push(' name="',ra(h.name),'"');if(h.type){g.push(' type="',ra(h.type),'"');var k={};fb(k,h);delete k.type;h=k}g.push(">");g=g.join("")}g=f.createElement(g);h&&(G(h)?g.className=h:da(h)?g.className=h.join(" "):Pd(g,h));2<e.length&&Td(f,g,e,2);return g}
function Td(b,c,d,e){function f(d){d&&c.appendChild(G(d)?b.createTextNode(d):d)}for(;e<d.length;e++){var g=d[e];!ea(g)||ha(g)&&0<g.nodeType?f(g):P(Ud(g)?Ja(g):g,f)}}function Vd(b,c){Td(Nd(b),b,arguments,1)}function Wd(b){b&&b.parentNode&&b.parentNode.removeChild(b)}function Xd(b,c){if(b.contains&&1==c.nodeType)return b==c||b.contains(c);if("undefined"!=typeof b.compareDocumentPosition)return b==c||Boolean(b.compareDocumentPosition(c)&16);for(;c&&b!=c;)c=c.parentNode;return c==b}
function Nd(b){return 9==b.nodeType?b:b.ownerDocument||b.document}function Ud(b){if(b&&"number"==typeof b.length){if(ha(b))return"function"==typeof b.item||"string"==typeof b.item;if(ga(b))return"function"==typeof b.item}return!1}function Md(b){this.a=b||p.document||document}Md.prototype.appendChild=function(b,c){b.appendChild(c)};Md.prototype.contains=Xd;function Yd(b){if(b.classList)return b.classList;b=b.className;return G(b)&&b.match(/\S+/g)||[]}function Zd(b,c){var d;b.classList?d=b.classList.contains(c):(d=Yd(b),d=0<=Da.indexOf.call(d,c,void 0));return d}function $d(b,c){b.classList?b.classList.add(c):Zd(b,c)||(b.className+=0<b.className.length?" "+c:c)}function ae(b,c){b.classList?b.classList.remove(c):Zd(b,c)&&(b.className=Ea(Yd(b),function(b){return b!=c}).join(" "))};function be(b,c,d,e){this.top=b;this.right=c;this.bottom=d;this.left=e}l=be.prototype;l.B=function(){return this.right-this.left};l.clone=function(){return new be(this.top,this.right,this.bottom,this.left)};l.contains=function(b){return this&&b?b instanceof be?b.left>=this.left&&b.right<=this.right&&b.top>=this.top&&b.bottom<=this.bottom:b.x>=this.left&&b.x<=this.right&&b.y>=this.top&&b.y<=this.bottom:!1};
l.ceil=function(){this.top=Math.ceil(this.top);this.right=Math.ceil(this.right);this.bottom=Math.ceil(this.bottom);this.left=Math.ceil(this.left);return this};l.floor=function(){this.top=Math.floor(this.top);this.right=Math.floor(this.right);this.bottom=Math.floor(this.bottom);this.left=Math.floor(this.left);return this};l.round=function(){this.top=Math.round(this.top);this.right=Math.round(this.right);this.bottom=Math.round(this.bottom);this.left=Math.round(this.left);return this};
l.scale=function(b,c){var d=fa(c)?c:b;this.left*=b;this.right*=b;this.top*=d;this.bottom*=d;return this};function ce(b,c){var d=Nd(b);return d.defaultView&&d.defaultView.getComputedStyle&&(d=d.defaultView.getComputedStyle(b,null))?d[c]||d.getPropertyValue(c)||"":""}function de(b,c){return ce(b,c)||(b.currentStyle?b.currentStyle[c]:null)||b.style&&b.style[c]}
function ee(b){var c;try{c=b.getBoundingClientRect()}catch(d){return{left:0,top:0,right:0,bottom:0}}R&&b.ownerDocument.body&&(b=b.ownerDocument,c.left-=b.documentElement.clientLeft+b.body.clientLeft,c.top-=b.documentElement.clientTop+b.body.clientTop);return c}
function fe(b){if(1==b.nodeType)return b=ee(b),new Jd(b.left,b.top);var c=ga(b.yc),d=b;b.targetTouches&&b.targetTouches.length?d=b.targetTouches[0]:c&&b.a.targetTouches&&b.a.targetTouches.length&&(d=b.a.targetTouches[0]);return new Jd(d.clientX,d.clientY)}function ge(b){var c=he;if("none"!=de(b,"display"))return c(b);var d=b.style,e=d.display,f=d.visibility,g=d.position;d.visibility="hidden";d.position="absolute";d.display="inline";b=c(b);d.display=e;d.position=g;d.visibility=f;return b}
function he(b){var c=b.offsetWidth,d=b.offsetHeight,e=jb&&!c&&!d;return v(c)&&!e||!b.getBoundingClientRect?new Kd(c,d):(b=ee(b),new Kd(b.right-b.left,b.bottom-b.top))}function ie(b,c){b.style.display=c?"":"none"}function je(b,c,d,e){if(/^\d+px?$/.test(c))return parseInt(c,10);var f=b.style[d],g=b.runtimeStyle[d];b.runtimeStyle[d]=b.currentStyle[d];b.style[d]=c;c=b.style[e];b.style[d]=f;b.runtimeStyle[d]=g;return c}
function ke(b,c){var d=b.currentStyle?b.currentStyle[c]:null;return d?je(b,d,"left","pixelLeft"):0}var le={thin:2,medium:4,thick:6};function me(b,c){if("none"==(b.currentStyle?b.currentStyle[c+"Style"]:null))return 0;var d=b.currentStyle?b.currentStyle[c+"Width"]:null;return d in le?le[d]:je(b,d,"left","pixelLeft")};function ne(b,c,d){S.call(this,b);this.map=c;this.frameState=v(d)?d:null}O(ne,S);function oe(b){X.call(this);this.element=v(b.element)?b.element:null;this.f=this.q=null;this.h=[];this.render=v(b.render)?b.render:ba;v(b.target)&&(this.q=Od(b.target))}O(oe,X);oe.prototype.u=function(){Wd(this.element);oe.C.u.call(this)};oe.prototype.setMap=function(b){null===this.f||Wd(this.element);0!=this.h.length&&(P(this.h,U),this.h.length=0);this.f=b;null!==this.f&&((null===this.q?b.j:this.q).appendChild(this.element),this.render!==ba&&this.h.push(T(b,"postrender",this.render,!1,this)),b.render())};function pe(){this.e=0;this.c={};this.a=this.b=null}l=pe.prototype;l.clear=function(){this.e=0;this.c={};this.a=this.b=null};l.forEach=function(b,c){for(var d=this.b;null!==d;)b.call(c,d.ra,d.xb,this),d=d.Q};l.get=function(b){b=this.c[b];if(b===this.a)return b.ra;b===this.b?(this.b=this.b.Q,this.b.fa=null):(b.Q.fa=b.fa,b.fa.Q=b.Q);b.Q=null;b.fa=this.a;this.a=this.a.Q=b;return b.ra};l.Na=function(){return this.e};l.ka=function(){var b=Array(this.e),c=0,d;for(d=this.a;null!==d;d=d.fa)b[c++]=d.xb;return b};
l.Ba=function(){var b=Array(this.e),c=0,d;for(d=this.a;null!==d;d=d.fa)b[c++]=d.ra;return b};l.set=function(b,c){var d={xb:b,Q:null,fa:this.a,ra:c};null===this.a?this.b=d:this.a.Q=d;this.a=d;this.c[b]=d;++this.e};function qe(b){pe.call(this);this.d=v(b)?b:2048}O(qe,pe);function re(b){return b.Na()>b.d};function se(b,c){V.call(this);this.a=b;this.state=c}O(se,V);se.prototype.Ab=function(){return M(this).toString()};se.prototype.I=function(){return this.state};function te(b){X.call(this);this.p=ad(b.projection);this.k=v(b.attributions)?b.attributions:null;this.n=b.logo;this.q=v(b.state)?b.state:"ready";this.h=b.wrapX}O(te,X);te.prototype.I=function(){return this.q};function ue(b){return b.h};function ve(b){return function(){return b}}var we=ve(!1),xe=ve(!0);function ye(b){return b}function ze(b){var c;c=c||0;return function(){return b.apply(this,Array.prototype.slice.call(arguments,0,c))}}function Ae(b){var c=arguments,d=c.length;return function(){for(var b=0;b<d;b++)if(!c[b].apply(this,arguments))return!1;return!0}};function Be(b){this.minZoom=v(b.minZoom)?b.minZoom:0;this.a=b.resolutions;this.maxZoom=this.a.length-1;this.b=v(b.origin)?b.origin:null;this.e=null;v(b.origins)&&(this.e=b.origins);this.d=null;v(b.tileSizes)&&(this.d=b.tileSizes);this.l=v(b.tileSize)?b.tileSize:null===this.d?256:null;this.c=[0,0];this.f=null;v(b.widths)&&(this.f=b.widths)}var Ce=[0,0,0];Be.prototype.g=function(){return ye};
Be.prototype.h=function(b,c,d,e,f){f=De(this,b,f);for(b=b[0]-1;b>=this.minZoom;){if(c.call(d,b,Ee(this,f,b,e)))return!0;--b}return!1};Be.prototype.o=function(b,c,d){return b[0]<this.maxZoom?(d=De(this,b,d),Ee(this,d,b[0]+1,c)):null};function Fe(b,c,d,e){Ge(b,c[0],c[1],d,!1);var f=Ce[1],g=Ce[2];Ge(b,c[2],c[3],d,!0);return zd(f,Ce[1],g,Ce[2],e)}function Ee(b,c,d,e){return Fe(b,c,b.a[d],e)}
function De(b,c,d){var e=null===b.b?b.e[c[0]]:b.b,f=b.a[c[0]];b=yc(He(b,c[0]),b.c);var g=e[0]+c[1]*b[0]*f;c=e[1]+c[2]*b[1]*f;return Hc(g,c,g+b[0]*f,c+b[1]*f,d)}function Ge(b,c,d,e,f){var g=Ie(b,e),h=e/b.a[g],k=null===b.b?b.e[g]:b.b;b=yc(He(b,g),b.c);c=h*(c-k[0])/(e*b[0]);d=h*(d-k[1])/(e*b[1]);f?(c=Math.ceil(c)-1,d=Math.ceil(d)-1):(c=Math.floor(c),d=Math.floor(d));vd(g,c,d,Ce)}function Je(b,c,d){d=Ee(b,Ke(d),c);b=b.B(c);v(b)||(b=d.B());return zd(0,b-1,0,d.b-d.e+1,void 0)}
function He(b,c){return null===b.l?b.d[c]:b.l}Be.prototype.B=function(b){if(null!==this.f)return this.f[b]};function Ie(b,c){var d=xb(b.a,c,0);return tb(d,b.minZoom,b.maxZoom)}function Le(b){var c=b.e;if(null===c){for(var c=Ke(b),d=v(void 0)?yc(void 0):yc(256),e=v(void 0)?void 0:"bottom-left",f=Me(c,void 0,yc(d)),g=Array(f.length),h=c[2]-c[0],k=f.length-1;0<=k;--k)g[k]=h/d[0]/f[k];c=new Be({origin:Qc(c,e),resolutions:f,tileSize:v(void 0)?void 0:256,widths:g});b.e=c}return c}
function Me(b,c,d){c=v(c)?c:42;var e=b[3]-b[1];b=b[2]-b[0];d=v(d)?d:yc(256);d=Math.max(b/d[0],e/d[1]);c+=1;e=Array(c);for(b=0;b<c;++b)e[b]=d/Math.pow(2,b);return e}function Ke(b){b=ad(b);var c=b.w();null===c&&(b=180*Yc.degrees/Yc[b.b],c=Hc(-b,-b,b,b));return c};function Ne(b){te.call(this,{attributions:b.attributions,extent:b.extent,logo:b.logo,projection:b.projection,state:b.state,wrapX:b.wrapX});this.t=v(b.opaque)?b.opaque:!1;this.O=v(b.tilePixelRatio)?b.tilePixelRatio:1;this.tileGrid=v(b.tileGrid)?b.tileGrid:null;this.a=new qe;this.f=[0,0]}O(Ne,te);function Oe(b,c,d,e){for(var f=!0,g,h,k=d.a;k<=d.c;++k)for(var m=d.e;m<=d.b;++m)g=b.d(c,k,m),h=!1,b.a.c.hasOwnProperty(g)&&(g=b.a.get(g),(h=2===g.I())&&(h=!1!==e(g))),h||(f=!1);return f}Ne.prototype.d=wd;
function Pe(b,c){return null===b.tileGrid?Le(c):b.tileGrid}function Qe(b,c,d){d=Pe(b,d);c=yc(He(d,c),b.f);d=b.O;b=b.f;v(b)||(b=[0,0]);b[0]=c[0]*d+.5|0;b[1]=c[1]*d+.5|0;return b}Ne.prototype.g=ba;function Re(b,c){S.call(this,b);this.tile=c}O(Re,S);function Se(b){b=v(b)?b:{};this.k=document.createElement("UL");this.j=document.createElement("LI");this.k.appendChild(this.j);ie(this.j,!1);this.d=v(b.collapsed)?b.collapsed:!0;this.g=v(b.collapsible)?b.collapsible:!0;this.g||(this.d=!1);var c=v(b.className)?b.className:"ol-attribution",d=v(b.tipLabel)?b.tipLabel:"Attributions",e=v(b.collapseLabel)?b.collapseLabel:"\u00bb";this.n=G(e)?Sd("SPAN",{},e):e;e=v(b.label)?b.label:"i";this.p=G(e)?Sd("SPAN",{},e):e;d=Sd("BUTTON",{type:"button",title:d},this.g&&
!this.d?this.n:this.p);T(d,"click",this.r,!1,this);T(d,["mouseout",Pb],function(){this.blur()},!1);c=Sd("DIV",c+" ol-unselectable ol-control"+(this.d&&this.g?" ol-collapsed":"")+(this.g?"":" ol-uncollapsible"),this.k,d);oe.call(this,{element:c,render:v(b.render)?b.render:Te,target:b.target});this.i=!0;this.b={};this.a={};this.t={}}O(Se,oe);
function Te(b){b=b.frameState;if(null===b)this.i&&(ie(this.element,!1),this.i=!1);else{var c,d,e,f,g,h,k,m,n,r,q,u=b.layerStatesArray,t=db(b.attributions),w={},z=b.viewState.projection;d=0;for(c=u.length;d<c;d++)if(h=Ue(u[d].layer),null!==h&&(r=M(h).toString(),n=h.k,null!==n))for(e=0,f=n.length;e<f;e++)if(k=n[e],m=M(k).toString(),!(m in t)){g=b.usedTiles[r];if(v(g)){var B=Pe(h,z);a:{q=k;var y=z;if(null===q.a)q=!0;else{var x=void 0,D=void 0,E=void 0,I=void 0;for(I in g)if(I in q.a)for(var E=g[I],H,
x=0,D=q.a[I].length;x<D;++x){H=q.a[I][x];if(Bd(H,E)){q=!0;break a}var L=Je(B,parseInt(I,10),y),J=L.B();if(E.a<L.a||E.c>L.c)if(Bd(H,new yd(ub(E.a,J),ub(E.c,J),E.e,E.b))||E.B()>J&&Bd(H,L)){q=!0;break a}}q=!1}}}else q=!1;q?(m in w&&delete w[m],t[m]=k):w[m]=k}c=[t,w];d=c[0];c=c[1];for(var C in this.b)C in d?(this.a[C]||(ie(this.b[C],!0),this.a[C]=!0),delete d[C]):C in c?(this.a[C]&&(ie(this.b[C],!1),delete this.a[C]),delete c[C]):(Wd(this.b[C]),delete this.b[C],delete this.a[C]);for(C in d)e=document.createElement("LI"),
e.innerHTML=d[C].b,this.k.appendChild(e),this.b[C]=e,this.a[C]=!0;for(C in c)e=document.createElement("LI"),e.innerHTML=c[C].b,ie(e,!1),this.k.appendChild(e),this.b[C]=e;C=!$a(this.a)||!$a(b.logos);this.i!=C&&(ie(this.element,C),this.i=C);C&&$a(this.a)?$d(this.element,"ol-logo-only"):ae(this.element,"ol-logo-only");var K;b=b.logos;C=this.t;for(K in C)K in b||(Wd(C[K]),delete C[K]);for(var F in b)F in C||(K=new Image,K.src=F,d=b[F],""===d?d=K:(d=Sd("A",{href:d}),d.appendChild(K)),this.j.appendChild(d),
C[F]=d);ie(this.j,!$a(b))}}Se.prototype.r=function(b){b.preventDefault();b=this.element;Zd(b,"ol-collapsed")?ae(b,"ol-collapsed"):$d(b,"ol-collapsed");if(this.d){b=this.p;var c=b.parentNode;c&&c.replaceChild(this.n,b)}else b=this.n,(c=b.parentNode)&&c.replaceChild(this.p,b);this.d=!this.d};function Ve(b){b=v(b)?b:{};var c=v(b.className)?b.className:"ol-rotate",d=v(b.label)?b.label:"\u21e7";this.a=null;G(d)?this.a=Sd("SPAN","ol-compass",d):(this.a=d,$d(this.a,"ol-compass"));d=Sd("BUTTON",{"class":c+"-reset",type:"button",title:v(b.tipLabel)?b.tipLabel:"Reset rotation"},this.a);T(d,"click",Ve.prototype.j,!1,this);T(d,["mouseout",Pb],function(){this.blur()},!1);c=Sd("DIV",c+" ol-unselectable ol-control",d);oe.call(this,{element:c,render:v(b.render)?b.render:We,target:b.target});this.d=
v(b.duration)?b.duration:250;this.b=v(b.autoHide)?b.autoHide:!0;this.g=void 0;this.b&&$d(this.element,"ol-hidden")}O(Ve,oe);Ve.prototype.j=function(b){b.preventDefault();b=this.f;var c=b.A();if(null!==c){for(var d=c.H();d<-Math.PI;)d+=2*Math.PI;for(;d>Math.PI;)d-=2*Math.PI;v(d)&&(0<this.d&&b.R(td({rotation:d,duration:this.d,easing:pd})),c.set("rotation",0))}};
function We(b){b=b.frameState;if(null!==b){b=b.viewState.rotation;if(b!=this.g){var c="rotate("+180*b/Math.PI+"deg)";if(this.b){var d=this.element;0===b?$d(d,"ol-hidden"):ae(d,"ol-hidden")}this.a.style.msTransform=c;this.a.style.webkitTransform=c;this.a.style.transform=c}this.g=b}};function Xe(b){b=v(b)?b:{};var c=v(b.className)?b.className:"ol-zoom",d=v(b.delta)?b.delta:1,e=v(b.zoomOutLabel)?b.zoomOutLabel:"\u2212",f=v(b.zoomOutTipLabel)?b.zoomOutTipLabel:"Zoom out",g=Sd("BUTTON",{"class":c+"-in",type:"button",title:v(b.zoomInTipLabel)?b.zoomInTipLabel:"Zoom in"},v(b.zoomInLabel)?b.zoomInLabel:"+");T(g,"click",na(Xe.prototype.b,d),!1,this);T(g,["mouseout",Pb],function(){this.blur()},!1);e=Sd("BUTTON",{"class":c+"-out",type:"button",title:f},e);T(e,"click",na(Xe.prototype.b,
-d),!1,this);T(e,["mouseout",Pb],function(){this.blur()},!1);c=Sd("DIV",c+" ol-unselectable ol-control",g,e);oe.call(this,{element:c,target:b.target});this.a=v(b.duration)?b.duration:250}O(Xe,oe);Xe.prototype.b=function(b,c){c.preventDefault();var d=this.f,e=d.A();if(null!==e){var f=md(e);v(f)&&(0<this.a&&d.R(ud({resolution:f,duration:this.a,easing:pd})),d=e.constrainResolution(f,b),e.set("resolution",d))}};function Ye(b){b=v(b)?b:{};var c=new Ed;(v(b.zoom)?b.zoom:1)&&c.push(new Xe(b.zoomOptions));(v(b.rotate)?b.rotate:1)&&c.push(new Ve(b.rotateOptions));(v(b.attribution)?b.attribution:1)&&c.push(new Se(b.attributionOptions));return c};function Ze(b,c,d){Ib.call(this);this.e=b;this.c=d;this.a=c||window;this.b=N(this.vc,this)}O(Ze,Ib);l=Ze.prototype;l.P=null;l.Eb=!1;l.start=function(){$e(this);this.Eb=!1;var b=af(this),c=bf(this);b&&!c&&this.a.mozRequestAnimationFrame?(this.P=T(this.a,"MozBeforePaint",this.b),this.a.mozRequestAnimationFrame(null),this.Eb=!0):this.P=b&&c?b.call(this.a,this.b):this.a.setTimeout(ze(this.b),20)};
function $e(b){if(null!=b.P){var c=af(b),d=bf(b);c&&!d&&b.a.mozRequestAnimationFrame?U(b.P):c&&d?d.call(b.a,b.P):b.a.clearTimeout(b.P)}b.P=null}l.vc=function(){this.Eb&&this.P&&U(this.P);this.P=null;this.e.call(this.c,oa())};l.u=function(){$e(this);Ze.C.u.call(this)};function af(b){b=b.a;return b.requestAnimationFrame||b.webkitRequestAnimationFrame||b.mozRequestAnimationFrame||b.oRequestAnimationFrame||b.msRequestAnimationFrame||null}
function bf(b){b=b.a;return b.cancelAnimationFrame||b.cancelRequestAnimationFrame||b.webkitCancelRequestAnimationFrame||b.mozCancelRequestAnimationFrame||b.oCancelRequestAnimationFrame||b.msCancelRequestAnimationFrame||null};var cf;
function df(){var b=p.MessageChannel;"undefined"===typeof b&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&(b=function(){var b=document.createElement("iframe");b.style.display="none";b.src="";document.documentElement.appendChild(b);var c=b.contentWindow,b=c.document;b.open();b.write("");b.close();var d="callImmediate"+Math.random(),e="file:"==c.location.protocol?"*":c.location.protocol+"//"+c.location.host,b=N(function(b){if(("*"==e||b.origin==e)&&b.data==d)this.port1.onmessage()},this);
c.addEventListener("message",b,!1);this.port1={};this.port2={postMessage:function(){c.postMessage(d,e)}}});if("undefined"!==typeof b&&!Ua("Trident")&&!Ua("MSIE")){var c=new b,d={},e=d;c.port1.onmessage=function(){if(v(d.next)){d=d.next;var b=d.Mb;d.Mb=null;b()}};return function(b){e.next={Mb:b};e=e.next;c.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in document.createElement("script")?function(b){var c=document.createElement("script");c.onreadystatechange=function(){c.onreadystatechange=
null;c.parentNode.removeChild(c);c=null;b();b=null};document.documentElement.appendChild(c)}:function(b){p.setTimeout(b,0)}};function ef(b){if("function"==typeof b.Ba)return b.Ba();if(G(b))return b.split("");if(ea(b)){for(var c=[],d=b.length,e=0;e<d;e++)c.push(b[e]);return c}return Ya(b)}
function ff(b,c){if("function"==typeof b.forEach)b.forEach(c,void 0);else if(ea(b)||G(b))P(b,c,void 0);else{var d;if("function"==typeof b.ka)d=b.ka();else if("function"!=typeof b.Ba)if(ea(b)||G(b)){d=[];for(var e=b.length,f=0;f<e;f++)d.push(f)}else d=Za(b);else d=void 0;for(var e=ef(b),f=e.length,g=0;g<f;g++)c.call(void 0,e[g],d&&d[g],b)}};function gf(b,c){this.b={};this.a=[];this.c=0;var d=arguments.length;if(1<d){if(d%2)throw Error("Uneven number of arguments");for(var e=0;e<d;e+=2)this.set(arguments[e],arguments[e+1])}else if(b){b instanceof gf?(d=b.ka(),e=b.Ba()):(d=Za(b),e=Ya(b));for(var f=0;f<d.length;f++)this.set(d[f],e[f])}}l=gf.prototype;l.Na=function(){return this.c};l.Ba=function(){hf(this);for(var b=[],c=0;c<this.a.length;c++)b.push(this.b[this.a[c]]);return b};l.ka=function(){hf(this);return this.a.concat()};
l.T=function(){return 0==this.c};l.clear=function(){this.b={};this.c=this.a.length=0};l.remove=function(b){return Object.prototype.hasOwnProperty.call(this.b,b)?(delete this.b[b],this.c--,this.a.length>2*this.c&&hf(this),!0):!1};
function hf(b){if(b.c!=b.a.length){for(var c=0,d=0;c<b.a.length;){var e=b.a[c];Object.prototype.hasOwnProperty.call(b.b,e)&&(b.a[d++]=e);c++}b.a.length=d}if(b.c!=b.a.length){for(var f={},d=c=0;c<b.a.length;)e=b.a[c],Object.prototype.hasOwnProperty.call(f,e)||(b.a[d++]=e,f[e]=1),c++;b.a.length=d}}l.get=function(b,c){return Object.prototype.hasOwnProperty.call(this.b,b)?this.b[b]:c};l.set=function(b,c){Object.prototype.hasOwnProperty.call(this.b,b)||(this.c++,this.a.push(b));this.b[b]=c};
l.forEach=function(b,c){for(var d=this.ka(),e=0;e<d.length;e++){var f=d[e],g=this.get(f);b.call(c,g,f,this)}};l.clone=function(){return new gf(this)};function jf(){this.a=oa()}new jf;jf.prototype.set=function(b){this.a=b};jf.prototype.get=function(){return this.a};function kf(b){V.call(this);this.Ea=b||window;this.Va=T(this.Ea,"resize",this.Uc,!1,this);this.Pa=Rd(this.Ea||window)}O(kf,V);l=kf.prototype;l.Va=null;l.Ea=null;l.Pa=null;l.u=function(){kf.C.u.call(this);this.Va&&(U(this.Va),this.Va=null);this.Pa=this.Ea=null};l.Uc=function(){var b=Rd(this.Ea||window),c=this.Pa;b==c||b&&c&&b.width==c.width&&b.height==c.height||(this.Pa=b,W(this,"resize"))};function lf(b,c,d,e,f){if(!(R||jb&&qb("525")))return!0;if(kb&&f)return mf(b);if(f&&!e)return!1;fa(c)&&(c=nf(c));if(!d&&(17==c||18==c||kb&&91==c))return!1;if(jb&&e&&d)switch(b){case 220:case 219:case 221:case 192:case 186:case 189:case 187:case 188:case 190:case 191:case 192:case 222:return!1}if(R&&e&&c==b)return!1;switch(b){case 13:return!0;case 27:return!jb}return mf(b)}
function mf(b){if(48<=b&&57>=b||96<=b&&106>=b||65<=b&&90>=b||jb&&0==b)return!0;switch(b){case 32:case 63:case 107:case 109:case 110:case 111:case 186:case 59:case 189:case 187:case 61:case 188:case 190:case 191:case 192:case 222:case 219:case 220:case 221:return!0;default:return!1}}function nf(b){if(ib)b=of(b);else if(kb&&jb)a:switch(b){case 93:b=91;break a}return b}
function of(b){switch(b){case 61:return 187;case 59:return 186;case 173:return 189;case 224:return 91;case 0:return 224;default:return b}};function pf(b,c){V.call(this);b&&qf(this,b,c)}O(pf,V);l=pf.prototype;l.Ca=null;l.Sa=null;l.wb=null;l.Ta=null;l.L=-1;l.ba=-1;l.eb=!1;
var rf={3:13,12:144,63232:38,63233:40,63234:37,63235:39,63236:112,63237:113,63238:114,63239:115,63240:116,63241:117,63242:118,63243:119,63244:120,63245:121,63246:122,63247:123,63248:44,63272:46,63273:36,63275:35,63276:33,63277:34,63289:144,63302:45},sf={Up:38,Down:40,Left:37,Right:39,Enter:13,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123,"U+007F":46,Home:36,End:35,PageUp:33,PageDown:34,Insert:45},tf=R||jb&&qb("525"),uf=kb&&ib;
pf.prototype.a=function(b){jb&&(17==this.L&&!b.g||18==this.L&&!b.b||kb&&91==this.L&&!b.l)&&(this.ba=this.L=-1);-1==this.L&&(b.g&&17!=b.c?this.L=17:b.b&&18!=b.c?this.L=18:b.l&&91!=b.c&&(this.L=91));tf&&!lf(b.c,this.L,b.d,b.g,b.b)?this.handleEvent(b):(this.ba=nf(b.c),uf&&(this.eb=b.b))};pf.prototype.b=function(b){this.ba=this.L=-1;this.eb=b.b};
pf.prototype.handleEvent=function(b){var c=b.a,d,e,f=c.altKey;R&&"keypress"==b.type?(d=this.ba,e=13!=d&&27!=d?c.keyCode:0):jb&&"keypress"==b.type?(d=this.ba,e=0<=c.charCode&&63232>c.charCode&&mf(d)?c.charCode:0):hb?(d=this.ba,e=mf(d)?c.keyCode:0):(d=c.keyCode||this.ba,e=c.charCode||0,uf&&(f=this.eb),kb&&63==e&&224==d&&(d=191));var g=d=nf(d),h=c.keyIdentifier;d?63232<=d&&d in rf?g=rf[d]:25==d&&b.d&&(g=9):h&&h in sf&&(g=sf[h]);this.L=g;b=new vf(g,e,0,c);b.b=f;W(this,b)};
function qf(b,c,d){b.Ta&&wf(b);b.Ca=c;b.Sa=T(b.Ca,"keypress",b,d);b.wb=T(b.Ca,"keydown",b.a,d,b);b.Ta=T(b.Ca,"keyup",b.b,d,b)}function wf(b){b.Sa&&(U(b.Sa),U(b.wb),U(b.Ta),b.Sa=null,b.wb=null,b.Ta=null);b.Ca=null;b.L=-1;b.ba=-1}pf.prototype.u=function(){pf.C.u.call(this);wf(this)};function vf(b,c,d,e){Rb.call(this,e);this.type="key";this.c=b;this.o=c}O(vf,Rb);function xf(b,c){V.call(this);var d=this.a=b;(d=ha(d)&&1==d.nodeType?this.a:this.a?this.a.body:null)&&de(d,"direction");this.b=T(this.a,ib?"DOMMouseScroll":"mousewheel",this,c)}O(xf,V);
xf.prototype.handleEvent=function(b){var c=0,d=0,e=0;b=b.a;if("mousewheel"==b.type){d=1;if(R||jb&&(lb||qb("532.0")))d=40;e=yf(-b.wheelDelta,d);v(b.wheelDeltaX)?(c=yf(-b.wheelDeltaX,d),d=yf(-b.wheelDeltaY,d)):d=e}else e=b.detail,100<e?e=3:-100>e&&(e=-3),v(b.axis)&&b.axis===b.HORIZONTAL_AXIS?c=e:d=e;fa(this.c)&&tb(c,-this.c,this.c);fa(this.e)&&(d=tb(d,-this.e,this.e));c=new zf(e,b,0,d);W(this,c)};function yf(b,c){return jb&&(kb||mb)&&0!=b%c?b:b/c}
xf.prototype.u=function(){xf.C.u.call(this);U(this.b);this.b=null};function zf(b,c,d,e){Rb.call(this,c);this.type="mousewheel";this.detail=b;this.v=e}O(zf,Rb);function Af(b,c,d){S.call(this,b);this.a=c;b=v(d)?d:{};this.buttons=Bf(b);this.pressure=Cf(b,this.buttons);this.bubbles=cb(b,"bubbles",!1);this.cancelable=cb(b,"cancelable",!1);this.view=cb(b,"view",null);this.detail=cb(b,"detail",null);this.screenX=cb(b,"screenX",0);this.screenY=cb(b,"screenY",0);this.clientX=cb(b,"clientX",0);this.clientY=cb(b,"clientY",0);this.button=cb(b,"button",0);this.relatedTarget=cb(b,"relatedTarget",null);this.pointerId=cb(b,"pointerId",0);this.width=cb(b,"width",0);this.height=
cb(b,"height",0);this.pointerType=cb(b,"pointerType","");this.isPrimary=cb(b,"isPrimary",!1);c.preventDefault&&(this.preventDefault=function(){c.preventDefault()})}O(Af,S);function Bf(b){if(b.buttons||Ef)b=b.buttons;else switch(b.which){case 1:b=1;break;case 2:b=4;break;case 3:b=2;break;default:b=0}return b}function Cf(b,c){var d=0;b.pressure?d=b.pressure:d=c?.5:0;return d}var Ef=!1;try{Ef=1===(new MouseEvent("click",{buttons:1})).buttons}catch(Ff){};function Gf(b,c){var d=document.createElement("CANVAS");v(b)&&(d.width=b);v(c)&&(d.height=c);return d.getContext("2d")};var Hf=p.devicePixelRatio||1,If=!1,Jf=function(){if(!("HTMLCanvasElement"in p))return!1;try{var b=Gf();if(null===b)return!1;v(b.setLineDash)&&(If=!0);return!0}catch(c){return!1}}(),Kf="ontouchstart"in p,Lf="PointerEvent"in p,Mf=!!p.navigator.msPointerEnabled;function Nf(b,c){this.a=b;this.d=c};function Of(b){Nf.call(this,b,{mousedown:this.ad,mousemove:this.bd,mouseup:this.ed,mouseover:this.dd,mouseout:this.cd});this.b=b.b;this.c=[]}O(Of,Nf);function Pf(b,c){for(var d=b.c,e=c.clientX,f=c.clientY,g=0,h=d.length,k;g<h&&(k=d[g]);g++){var m=Math.abs(f-k[1]);if(25>=Math.abs(e-k[0])&&25>=m)return!0}return!1}function Qf(b){var c=Rf(b,b.a),d=c.preventDefault;c.preventDefault=function(){b.preventDefault();d()};c.pointerId=1;c.isPrimary=!0;c.pointerType="mouse";return c}l=Of.prototype;
l.ad=function(b){if(!Pf(this,b)){if((1).toString()in this.b){var c=Qf(b);Z(this.a,Sf,c,b);bb(this.b,(1).toString())}c=Qf(b);this.b[(1).toString()]=b;Z(this.a,Tf,c,b)}};l.bd=function(b){if(!Pf(this,b)){var c=Qf(b);Z(this.a,Uf,c,b)}};l.ed=function(b){if(!Pf(this,b)){var c=this.b[(1).toString()];c&&c.button===b.button&&(c=Qf(b),Z(this.a,Vf,c,b),bb(this.b,(1).toString()))}};l.dd=function(b){if(!Pf(this,b)){var c=Qf(b);Wf(this.a,c,b)}};l.cd=function(b){if(!Pf(this,b)){var c=Qf(b);Xf(this.a,c,b)}};function Yf(b){Nf.call(this,b,{MSPointerDown:this.kd,MSPointerMove:this.ld,MSPointerUp:this.od,MSPointerOut:this.md,MSPointerOver:this.nd,MSPointerCancel:this.jd,MSGotPointerCapture:this.gd,MSLostPointerCapture:this.hd});this.b=b.b;this.c=["","unavailable","touch","pen","mouse"]}O(Yf,Nf);function Zf(b,c){var d=c;fa(c.a.pointerType)&&(d=Rf(c,c.a),d.pointerType=b.c[c.a.pointerType]);return d}l=Yf.prototype;l.kd=function(b){this.b[b.a.pointerId]=b;var c=Zf(this,b);Z(this.a,Tf,c,b)};
l.ld=function(b){var c=Zf(this,b);Z(this.a,Uf,c,b)};l.od=function(b){var c=Zf(this,b);Z(this.a,Vf,c,b);bb(this.b,b.a.pointerId)};l.md=function(b){var c=Zf(this,b);Xf(this.a,c,b)};l.nd=function(b){var c=Zf(this,b);Wf(this.a,c,b)};l.jd=function(b){var c=Zf(this,b);Z(this.a,Sf,c,b);bb(this.b,b.a.pointerId)};l.hd=function(b){W(this.a,new Af("lostpointercapture",b,b.a))};l.gd=function(b){W(this.a,new Af("gotpointercapture",b,b.a))};function $f(b){Nf.call(this,b,{pointerdown:this.vd,pointermove:this.wd,pointerup:this.zd,pointerout:this.xd,pointerover:this.yd,pointercancel:this.ud,gotpointercapture:this.Fc,lostpointercapture:this.$c})}O($f,Nf);l=$f.prototype;l.vd=function(b){ag(this.a,b)};l.wd=function(b){ag(this.a,b)};l.zd=function(b){ag(this.a,b)};l.xd=function(b){ag(this.a,b)};l.yd=function(b){ag(this.a,b)};l.ud=function(b){ag(this.a,b)};l.$c=function(b){ag(this.a,b)};l.Fc=function(b){ag(this.a,b)};function bg(b,c){Nf.call(this,b,{touchstart:this.Jd,touchmove:this.Id,touchend:this.Hd,touchcancel:this.Gd});this.b=b.b;this.g=c;this.c=void 0;this.f=0;this.e=void 0}O(bg,Nf);l=bg.prototype;l.dc=function(){this.f=0;this.e=void 0};
function cg(b,c,d){c=Rf(c,d);c.pointerId=d.identifier+2;c.bubbles=!0;c.cancelable=!0;c.detail=b.f;c.button=0;c.buttons=1;c.width=d.webkitRadiusX||d.radiusX||0;c.height=d.webkitRadiusY||d.radiusY||0;c.pressure=d.webkitForce||d.force||.5;c.isPrimary=b.c===d.identifier;c.pointerType="touch";c.clientX=d.clientX;c.clientY=d.clientY;c.screenX=d.screenX;c.screenY=d.screenY;return c}
function dg(b,c,d){function e(){c.preventDefault()}var f=Array.prototype.slice.call(c.a.changedTouches),g=f.length,h,k;for(h=0;h<g;++h)k=cg(b,c,f[h]),k.preventDefault=e,d.call(b,c,k)}
l.Jd=function(b){var c=b.a.touches,d=Za(this.b),e=d.length;if(e>=c.length){var f=[],g,h,k;for(g=0;g<e;++g){h=d[g];k=this.b[h];var m;if(!(m=1==h))a:{m=c.length;for(var n=void 0,r=0;r<m;r++)if(n=c[r],n.identifier===h-2){m=!0;break a}m=!1}m||f.push(k.ma)}for(g=0;g<f.length;++g)this.gb(b,f[g])}c=Xa(this.b);if(!(d=0===c)){if(c=1===c)c=(1).toString()in this.b;d=c}d&&(this.c=b.a.changedTouches[0].identifier,v(this.e)&&p.clearTimeout(this.e));eg(this,b);this.f++;dg(this,b,this.td)};
l.td=function(b,c){this.b[c.pointerId]={target:c.target,ma:c,cc:c.target};var d=this.a;c.bubbles=!0;Z(d,fg,c,b);d=this.a;c.bubbles=!1;Z(d,gg,c,b);Z(this.a,Tf,c,b)};l.Id=function(b){b.preventDefault();dg(this,b,this.fd)};l.fd=function(b,c){var d=this.b[c.pointerId];if(d){var e=d.ma,f=d.cc;Z(this.a,Uf,c,b);e&&f!==c.target&&(e.relatedTarget=c.target,c.relatedTarget=f,e.target=f,c.target?(Xf(this.a,e,b),Wf(this.a,c,b)):(c.target=f,c.relatedTarget=null,this.gb(b,c)));d.ma=c;d.cc=c.target}};
l.Hd=function(b){eg(this,b);dg(this,b,this.Kd)};l.Kd=function(b,c){Z(this.a,Vf,c,b);this.a.ma(c,b);var d=this.a;c.bubbles=!1;Z(d,hg,c,b);bb(this.b,c.pointerId);c.isPrimary&&(this.c=void 0,this.e=p.setTimeout(N(this.dc,this),200))};l.Gd=function(b){dg(this,b,this.gb)};l.gb=function(b,c){Z(this.a,Sf,c,b);this.a.ma(c,b);var d=this.a;c.bubbles=!1;Z(d,hg,c,b);bb(this.b,c.pointerId);c.isPrimary&&(this.c=void 0,this.e=p.setTimeout(N(this.dc,this),200))};
function eg(b,c){var d=b.g.c,e=c.a.changedTouches[0];if(b.c===e.identifier){var f=[e.clientX,e.clientY];d.push(f);p.setTimeout(function(){Ia(d,f)},2500)}};function ig(b){V.call(this);this.d=b;this.b={};this.e={};this.a=[];Lf?jg(this,new $f(this)):Mf?jg(this,new Yf(this)):(b=new Of(this),jg(this,b),Kf&&jg(this,new bg(this,b)));b=this.a.length;for(var c,d=0;d<b;d++)c=this.a[d],kg(this,Za(c.d))}O(ig,V);function jg(b,c){var d=Za(c.d);d&&(P(d,function(b){var d=c.d[b];d&&(this.e[b]=N(d,c))},b),b.a.push(c))}ig.prototype.c=function(b){var c=this.e[b.type];c&&c(b)};function kg(b,c){P(c,function(b){T(this.d,b,this.c,!1,this)},b)}
function lg(b,c){P(c,function(b){mc(this.d,b,this.c,!1,this)},b)}function Rf(b,c){for(var d={},e,f=0,g=mg.length;f<g;f++)e=mg[f][0],d[e]=b[e]||c[e]||mg[f][1];return d}ig.prototype.ma=function(b,c){b.bubbles=!0;Z(this,ng,b,c)};function Xf(b,c,d){b.ma(c,d);var e=c.relatedTarget;null!==e&&Xd(c.target,e)||(c.bubbles=!1,Z(b,hg,c,d))}function Wf(b,c,d){c.bubbles=!0;Z(b,fg,c,d);var e=c.relatedTarget;null!==e&&Xd(c.target,e)||(c.bubbles=!1,Z(b,gg,c,d))}function Z(b,c,d,e){W(b,new Af(c,e,d))}
function ag(b,c){W(b,new Af(c.type,c,c.a))}ig.prototype.u=function(){for(var b=this.a.length,c,d=0;d<b;d++)c=this.a[d],lg(this,Za(c.d));ig.C.u.call(this)};
var Uf="pointermove",Tf="pointerdown",Vf="pointerup",fg="pointerover",ng="pointerout",gg="pointerenter",hg="pointerleave",Sf="pointercancel",mg=[["bubbles",!1],["cancelable",!1],["view",null],["detail",null],["screenX",0],["screenY",0],["clientX",0],["clientY",0],["ctrlKey",!1],["altKey",!1],["shiftKey",!1],["metaKey",!1],["button",0],["relatedTarget",null],["buttons",0],["pointerId",0],["width",0],["height",0],["pressure",0],["tiltX",0],["tiltY",0],["pointerType",""],["hwTimestamp",0],["isPrimary",
!1],["type",""],["target",null],["currentTarget",null],["which",0]];function og(b,c,d,e,f){ne.call(this,b,c,f);this.a=d;this.originalEvent=d.a;d=this.originalEvent;v(d.changedTouches)?(b=d.changedTouches[0],d=fe(c.a),b=[b.clientX-d.x,b.clientY-d.y]):(b=c.a,d=fe(d),b=fe(b),b=new Jd(d.x-b.x,d.y-b.y),b=[b.x,b.y]);this.pixel=b;this.coordinate=c.ja(this.pixel);this.dragging=v(e)?e:!1}O(og,ne);og.prototype.preventDefault=function(){og.C.preventDefault.call(this);this.a.preventDefault()};og.prototype.na=function(){og.C.na.call(this);this.a.na()};
function pg(b,c,d,e,f){og.call(this,b,c,d.a,e,f);this.b=d}O(pg,og);function qg(b){V.call(this);this.c=b;this.f=0;this.g=!1;this.b=this.h=this.e=null;b=this.c.a;this.i=0;this.j={};this.d=new ig(b);this.a=null;this.h=T(this.d,Tf,this.Pc,!1,this);this.l=T(this.d,Uf,this.Ad,!1,this)}O(qg,V);function rg(b,c){var d;d=new pg(sg,b.c,c);W(b,d);0!==b.f?(p.clearTimeout(b.f),b.f=0,d=new pg(tg,b.c,c),W(b,d)):b.f=p.setTimeout(N(function(){this.f=0;var b=new pg(ug,this.c,c);W(this,b)},b),250)}
function vg(b,c){c.type==wg||c.type==xg?delete b.j[c.pointerId]:c.type==yg&&(b.j[c.pointerId]=!0);b.i=Xa(b.j)}l=qg.prototype;l.Vb=function(b){vg(this,b);var c=new pg(wg,this.c,b);W(this,c);!this.g&&0===b.button&&rg(this,this.b);0===this.i&&(P(this.e,U),this.e=null,this.g=!1,this.b=null,Mb(this.a),this.a=null)};
l.Pc=function(b){vg(this,b);var c=new pg(yg,this.c,b);W(this,c);this.b=b;null===this.e&&(this.a=new ig(document),this.e=[T(this.a,zg,this.Qc,!1,this),T(this.a,wg,this.Vb,!1,this),T(this.d,xg,this.Vb,!1,this)])};l.Qc=function(b){if(b.clientX!=this.b.clientX||b.clientY!=this.b.clientY){this.g=!0;var c=new pg(Ag,this.c,b,this.g);W(this,c)}b.preventDefault()};l.Ad=function(b){W(this,new pg(b.type,this.c,b,null!==this.b&&(b.clientX!=this.b.clientX||b.clientY!=this.b.clientY)))};
l.u=function(){null!==this.l&&(U(this.l),this.l=null);null!==this.h&&(U(this.h),this.h=null);null!==this.e&&(P(this.e,U),this.e=null);null!==this.a&&(Mb(this.a),this.a=null);null!==this.d&&(Mb(this.d),this.d=null);qg.C.u.call(this)};var ug="singleclick",sg="click",tg="dblclick",Ag="pointerdrag",zg="pointermove",yg="pointerdown",wg="pointerup",xg="pointercancel",Bg={Wd:ug,Ld:sg,Md:tg,Pd:Ag,Sd:zg,Od:yg,Vd:wg,Ud:"pointerover",Td:"pointerout",Qd:"pointerenter",Rd:"pointerleave",Nd:xg};function Cg(b){X.call(this);var c=db(b);c.brightness=v(b.brightness)?b.brightness:0;c.contrast=v(b.contrast)?b.contrast:1;c.hue=v(b.hue)?b.hue:0;c.opacity=v(b.opacity)?b.opacity:1;c.saturation=v(b.saturation)?b.saturation:1;c.visible=v(b.visible)?b.visible:!0;c.maxResolution=v(b.maxResolution)?b.maxResolution:Infinity;c.minResolution=v(b.minResolution)?b.minResolution:0;vc(this,c)}O(Cg,X);
function Dg(b){var c=b.get("brightness"),d=b.get("contrast"),e=b.get("hue"),f=b.get("opacity"),g=b.get("saturation"),h=b.vb(),k=b.get("visible"),m=b.w(),n=b.get("maxResolution"),r=b.get("minResolution");return{layer:b,brightness:tb(c,-1,1),contrast:Math.max(d,0),hue:e,opacity:tb(f,0,1),saturation:Math.max(g,0),i:h,visible:k,extent:m,maxResolution:n,minResolution:Math.max(r,0)}}Cg.prototype.w=function(){return this.get("extent")};function Eg(b){var c=db(b);delete c.source;Cg.call(this,c);this.a=null;T(this,xc("source"),this.h,!1,this);this.set("source",v(b.source)?b.source:null)}O(Eg,Cg);Eg.prototype.tb=function(b){b=v(b)?b:[];b.push(Dg(this));return b};function Ue(b){b=b.get("source");return v(b)?b:null}Eg.prototype.vb=function(){var b=Ue(this);return null===b?"undefined":b.I()};Eg.prototype.j=function(){this.c()};
Eg.prototype.h=function(){null!==this.a&&(U(this.a),this.a=null);var b=Ue(this);null!==b&&(this.a=T(b,"change",this.j,!1,this));this.c()};function Fg(b,c,d,e,f,g,h,k){b[0]=1;b[1]=0;b[2]=0;b[3]=0;b[4]=0;b[5]=1;b[6]=0;b[7]=0;b[8]=0;b[9]=0;b[10]=1;b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=1;0===c&&0===d||Fc(b,c,d);if(1!=e||1!=f){c=b[1]*e;d=b[2]*e;var m=b[3]*e,n=b[4]*f,r=b[5]*f,q=b[6]*f;f=b[7]*f;var u=1*b[8],t=1*b[9],w=1*b[10],z=1*b[11],B=b[12],y=b[13],x=b[14],D=b[15];b[0]*=e;b[1]=c;b[2]=d;b[3]=m;b[4]=n;b[5]=r;b[6]=q;b[7]=f;b[8]=u;b[9]=t;b[10]=w;b[11]=z;b[12]=B;b[13]=y;b[14]=x;b[15]=D}0!==g&&(e=b[0],c=b[1],d=b[2],m=b[3],n=b[4],r=b[5],q=b[6],
f=b[7],u=Math.cos(g),g=Math.sin(g),b[0]=e*u+n*g,b[1]=c*u+r*g,b[2]=d*u+q*g,b[3]=m*u+f*g,b[4]=e*-g+n*u,b[5]=c*-g+r*u,b[6]=d*-g+q*u,b[7]=m*-g+f*u);0===h&&0===k||Fc(b,h,k);return b}function Gg(b,c,d){var e=b[1],f=b[5],g=b[13],h=c[0];c=c[1];d[0]=b[0]*h+b[4]*c+b[12];d[1]=e*h+f*c+g;return d};function Hg(b){tc.call(this);this.b=b}O(Hg,tc);Hg.prototype.l=ba;function Ig(b,c){return function(d,e){return Oe(b,d,e,function(b){c[d]||(c[d]={});c[d][b.a.toString()]=b})}}function Jg(b,c){re(c.a)&&b.postRenderFunctions.push(na(function(b,c,f){c=M(b).toString();b=b.a;f=f.usedTiles[c];for(var g;re(b)&&!(c=b.b.ra,g=c.a[0].toString(),g in f&&f[g].contains(c.a));)c=b,g=c.b,delete c.c[g.xb],null!==g.Q&&(g.Q.fa=null),c.b=g.Q,null===c.b&&(c.a=null),--c.e,g.ra.kb()},c))}
function Kg(b,c){if(null!=c){var d,e,f;e=0;for(f=c.length;e<f;++e)d=c[e],b[M(d).toString()]=d}}function Lg(b,c){var d=c.n;v(d)&&(G(d)?b.logos[d]="":ha(d)&&(b.logos[d.src]=d.href))};function Mg(b){this.l=b.opacity;this.v=b.rotateWithView;this.p=b.rotation;this.Ya=b.scale;this.j=b.snapToPixel}Mg.prototype.H=function(){return this.p};function Ng(){this.a={};this.b=0}Ng.b=function(){return Ng.a?Ng.a:Ng.a=new Ng};Ng.prototype.clear=function(){this.a={};this.b=0};Ng.prototype.get=function(b,c){var d=c+":"+b;return d in this.a?this.a[d]:null};Ng.prototype.set=function(b,c,d){this.a[c+":"+b]=d;++this.b};function Og(b,c){Ib.call(this);this.g=c;this.d=null;this.b={};this.e={}}O(Og,Ib);Og.prototype.u=function(){Va(this.b,Mb);Og.C.u.call(this)};function Pg(){var b=Ng.b();if(32<b.b){var c=0,d,e;for(d in b.a){e=b.a[d];var f;if(f=0===(c++&3))Vb(e)?e=sc(e,void 0,void 0):(e=hc(e),e=!!e&&bc(e,void 0,void 0)),f=!e;f&&(delete b.a[d],--b.b)}}}
function Qg(b,c,d,e,f,g,h){function k(b){var c=M(b).toString();if(!(c in u))return u[c]=!0,e.call(f,b,null)}var m,n=d.viewState,r=n.resolution,q=n.rotation,u={},t=n.projection,n=c;if(t.c){var w=t.w(),t=w[2]-w[0];m=c[0];if(m<w[0]||m>w[2])n=Math.ceil((w[0]-m)/t),n=[m+t*n,c[1]]}if(null!==b.d&&(m=Rg(b.d,n,r,q,{},k)))return m;q=d.layerStatesArray;for(t=q.length-1;0<=t;--t)if(m=q[t],w=m.layer,m.visible&&r>=m.minResolution&&r<m.maxResolution&&g.call(h,w)&&(m=Sg(b,w).l(ue(Ue(w))?n:c,d,e,f)))return m}
function Sg(b,c){var d=M(c).toString();if(d in b.b)return b.b[d];var e;e=c instanceof Tg?new Ug(c):c instanceof Vg?new Wg(c):null;b.b[d]=e;b.e[d]=T(e,"change",b.l,!1,b);return e}Og.prototype.l=function(){this.g.render()};Og.prototype.h=ba;Og.prototype.i=function(b,c){for(var d in this.b)if(!(null!==c&&d in c.layerStates)){var e=d,f=this.b[e];delete this.b[e];U(this.e[e]);delete this.e[e];Mb(f)}};function Xg(b,c){this.g=b;this.d=c;this.a=[];this.b=[];this.c={}}Xg.prototype.clear=function(){this.a.length=0;this.b.length=0;ab(this.c)};Xg.prototype.Na=function(){return this.a.length};Xg.prototype.T=function(){return 0===this.a.length};function Yg(b,c){for(var d=b.a,e=b.b,f=d.length,g=d[c],h=e[c],k=c;c<f>>1;){var m=2*c+1,n=2*c+2,m=n<f&&e[n]<e[m]?n:m;d[c]=d[m];e[c]=e[m];c=m}d[c]=g;e[c]=h;Zg(b,k,c)}
function Zg(b,c,d){var e=b.a;b=b.b;for(var f=e[d],g=b[d];d>c;){var h=d-1>>1;if(b[h]>g)e[d]=e[h],b[d]=b[h],d=h;else break}e[d]=f;b[d]=g};function $g(b,c){Xg.call(this,function(c){return b.apply(null,c)},function(b){return b[0].Ab()});this.h=c;this.e=0}O($g,Xg);$g.prototype.f=function(b){b=b.target;var c=b.I();if(2===c||3===c||4===c)mc(b,"change",this.f,!1,this),--this.e,this.h()};function ah(){this.a=[];this.b=this.c=0}function bh(b,c){var d=b.b,e=.05-d,f=Math.log(.05/b.b)/-.005;return sd({source:c,duration:f,easing:function(b){return d*(Math.exp(-.005*b*f)-1)/e}})};function ch(b){X.call(this);this.k=null;this.set("active",!0);this.handleEvent=b.handleEvent}O(ch,X);ch.prototype.setMap=function(b){this.k=b};function dh(b,c,d,e,f){if(null!=d){var g=c.H(),h=c.U();v(g)&&v(h)&&v(f)&&0<f&&(b.R(td({rotation:g,duration:f,easing:pd})),v(e)&&b.R(sd({source:h,duration:f,easing:pd})));c.rotate(d,e)}}function eh(b,c,d,e,f){var g=md(c);d=c.constrainResolution(g,d,0);fh(b,c,d,e,f)}
function fh(b,c,d,e,f){if(null!=d){var g=md(c),h=c.U();v(g)&&v(h)&&v(f)&&0<f&&(b.R(ud({resolution:g,duration:f,easing:pd})),v(e)&&b.R(sd({source:h,duration:f,easing:pd})));if(null!=e){var k;b=c.U();f=md(c);v(b)&&v(f)&&(k=[e[0]-d*(e[0]-b[0])/f,e[1]-d*(e[1]-b[1])/f]);nd(c,k)}c.set("resolution",d)}};function gh(b){b=v(b)?b:{};this.a=v(b.delta)?b.delta:1;ch.call(this,{handleEvent:hh});this.b=v(b.duration)?b.duration:250}O(gh,ch);function hh(b){var c=!1,d=b.a;if(b.type==tg){var c=b.map,e=b.coordinate,d=d.d?-this.a:this.a,f=c.A();eh(c,f,d,e,this.b);b.preventDefault();c=!0}return!c};function ih(b){b=b.a;return b.b&&!b.h&&b.d}function jh(b){b=b.a;return!b.b&&!b.h&&!b.d}function kh(b){b=b.a;return!b.b&&!b.h&&b.d}function lh(b){b=b.a.target.tagName;return"INPUT"!==b&&"SELECT"!==b&&"TEXTAREA"!==b};function mh(b){b=v(b)?b:{};ch.call(this,{handleEvent:v(b.handleEvent)?b.handleEvent:nh});this.n=v(b.handleDownEvent)?b.handleDownEvent:we;this.p=v(b.handleDragEvent)?b.handleDragEvent:ba;this.q=v(b.handleMoveEvent)?b.handleMoveEvent:ba;this.t=v(b.handleUpEvent)?b.handleUpEvent:we;this.d=!1;this.j={};this.a=[]}O(mh,ch);function oh(b){for(var c=b.length,d=0,e=0,f=0;f<c;f++)d+=b[f].clientX,e+=b[f].clientY;return[d/c,e/c]}
function nh(b){if(!(b instanceof pg))return!0;var c=!1,d=b.type;if(d===yg||d===Ag||d===wg)d=b.b,b.type==wg?delete this.j[d.pointerId]:b.type==yg?this.j[d.pointerId]=d:d.pointerId in this.j&&(this.j[d.pointerId]=d),this.a=Ya(this.j);this.d&&(b.type==Ag?this.p(b):b.type==wg&&(this.d=this.t(b)));b.type==yg?(this.d=b=this.n(b),c=this.h(b)):b.type==zg&&this.q(b);return!c}mh.prototype.h=ye;function ph(b){mh.call(this,{handleDownEvent:qh,handleDragEvent:rh,handleUpEvent:sh});b=v(b)?b:{};this.b=b.kinetic;this.f=this.g=null;this.r=v(b.condition)?b.condition:jh;this.i=!1}O(ph,mh);function rh(b){var c=oh(this.a);this.b&&this.b.a.push(c[0],c[1],oa());if(null!==this.f){var d=this.f[0]-c[0],e=c[1]-this.f[1];b=b.map;var f=b.A(),g=f.I(),e=d=[d,e],h=g.resolution;e[0]*=h;e[1]*=h;Ac(d,g.rotation);zc(d,g.center);d=f.a.center(d);b.render();nd(f,d)}this.f=c}
function sh(b){b=b.map;var c=b.A();if(0===this.a.length){var d;if(d=!this.i&&this.b)if(d=this.b,6>d.a.length)d=!1;else{var e=oa()-100,f=d.a.length-3;if(d.a[f+2]<e)d=!1;else{for(var g=f-3;0<g&&d.a[g+2]>e;)g-=3;var e=d.a[f+2]-d.a[g+2],h=d.a[f]-d.a[g],f=d.a[f+1]-d.a[g+1];d.c=Math.atan2(f,h);d.b=Math.sqrt(h*h+f*f)/e;d=.05<d.b}}d&&(d=(.05-this.b.b)/-.005,f=this.b.c,g=c.U(),this.g=bh(this.b,g),b.R(this.g),g=b.Oa(g),d=b.ja([g[0]-d*Math.cos(f),g[1]-d*Math.sin(f)]),d=c.a.center(d),nd(c,d));od(c,-1);b.render();
return!1}this.f=null;return!0}function qh(b){if(0<this.a.length&&this.r(b)){var c=b.map,d=c.A();this.f=null;this.d||od(d,1);c.render();null!==this.g&&Ia(c.k,this.g)&&(nd(d,b.frameState.viewState.center),this.g=null);this.b&&(b=this.b,b.a.length=0,b.c=0,b.b=0);this.i=1<this.a.length;return!0}return!1}ph.prototype.h=we;function th(b){b=v(b)?b:{};mh.call(this,{handleDownEvent:uh,handleDragEvent:vh,handleUpEvent:wh});this.f=v(b.condition)?b.condition:ih;this.b=void 0;this.g=v(b.duration)?b.duration:250}O(th,mh);function vh(b){if(1==b.b.pointerId){var c=b.map,d=c.pa();b=b.pixel;d=Math.atan2(d[1]/2-b[1],b[0]-d[0]/2);if(v(this.b)){b=d-this.b;var e=c.A(),f=e.H();c.render();dh(c,e,f-b)}this.b=d}}
function wh(b){if(1!=b.b.pointerId)return!0;b=b.map;var c=b.A();od(c,-1);var d=c.H(),e=this.g,d=c.constrainRotation(d,0);dh(b,c,d,void 0,e);return!1}function uh(b){return 1==b.b.pointerId&&Tb(b.a)&&this.f(b)?(b=b.map,od(b.A(),1),b.render(),this.b=void 0,!0):!1}th.prototype.h=we;function xh(){X.call(this);this.n=Lc();this.p=-1;this.g={};this.k=this.h=0}O(xh,X);xh.prototype.w=function(b){this.p!=this.e&&(this.n=this.jb(this.n),this.p=this.e);var c=this.n;v(b)?(b[0]=c[0],b[1]=c[1],b[2]=c[2],b[3]=c[3]):b=c;return b};xh.prototype.transform=function(b,c){this.fb(jd(b,c));return this};function yh(b,c,d,e,f,g){var h=f[0],k=f[1],m=f[4],n=f[5],r=f[12];f=f[13];for(var q=v(g)?g:[],u=0;c<d;c+=e){var t=b[c],w=b[c+1];q[u++]=h*t+m*w+r;q[u++]=k*t+n*w+f}v(g)&&q.length!=u&&(q.length=u);return q};function zh(){xh.call(this);this.f="XY";this.b=2;this.a=null}O(zh,xh);function Ah(b){if("XY"==b)return 2;if("XYZ"==b||"XYM"==b)return 3;if("XYZM"==b)return 4}zh.prototype.jb=function(b){var c=this.a,d=this.a.length,e=this.b;b=Hc(Infinity,Infinity,-Infinity,-Infinity,b);return Oc(b,c,0,d,e)};
zh.prototype.ub=function(b){this.k!=this.e&&(ab(this.g),this.h=0,this.k=this.e);if(0>b||0!==this.h&&b<=this.h)return this;var c=b.toString();if(this.g.hasOwnProperty(c))return this.g[c];var d=this.j(b);if(d.a.length<this.a.length)return this.g[c]=d;this.h=b;return this};zh.prototype.j=function(){return this};function Bh(b,c,d){b.b=Ah(c);b.f=c;b.a=d}
function Ch(b,c,d,e){if(v(c))d=Ah(c);else{for(c=0;c<e;++c){if(0===d.length){b.f="XY";b.b=2;return}d=d[0]}d=d.length;c=2==d?"XY":3==d?"XYZ":4==d?"XYZM":void 0}b.f=c;b.b=d}zh.prototype.fb=function(b){null!==this.a&&(b(this.a,this.a,this.b),this.c())};function Dh(b,c,d,e){var f,g;f=0;for(g=d.length;f<g;++f){var h=d[f],k;for(k=0;k<e;++k)b[c++]=h[k]}return c}function Eh(b,c,d,e,f){f=v(f)?f:[];var g=0,h,k;h=0;for(k=d.length;h<k;++h)c=Dh(b,c,d[h],e),f[g++]=c;f.length=g;return f};function Fh(b,c,d,e,f,g,h){var k=(d-c)/e;if(3>k){for(;c<d;c+=e)g[h++]=b[c],g[h++]=b[c+1];return h}var m=Array(k);m[0]=1;m[k-1]=1;d=[c,d-e];for(var n=0,r;0<d.length;){var q=d.pop(),u=d.pop(),t=0,w=b[u],z=b[u+1],B=b[q],y=b[q+1];for(r=u+e;r<q;r+=e){var x,D=b[r];x=b[r+1];var E=w,I=z,H=B-E,L=y-I;if(0!==H||0!==L){var J=((D-E)*H+(x-I)*L)/(H*H+L*L);1<J?(E=B,I=y):0<J&&(E+=H*J,I+=L*J)}D=E-D;x=I-x;x=D*D+x*x;x>t&&(n=r,t=x)}t>f&&(m[(n-c)/e]=1,u+e<n&&d.push(u,n),n+e<q&&d.push(n,q))}for(r=0;r<k;++r)m[r]&&(g[h++]=
b[c+r*e],g[h++]=b[c+r*e+1]);return h}
function Gh(b,c,d,e,f,g,h,k){var m,n;m=0;for(n=d.length;m<n;++m){var r=d[m];a:{var q=b,u=r,t=e,w=f,z=g;if(c!=u){var B=w*Math.round(q[c]/w),y=w*Math.round(q[c+1]/w);c+=t;z[h++]=B;z[h++]=y;var x=void 0,D=void 0;do if(x=w*Math.round(q[c]/w),D=w*Math.round(q[c+1]/w),c+=t,c==u){z[h++]=x;z[h++]=D;break a}while(x==B&&D==y);for(;c<u;){var E,I;E=w*Math.round(q[c]/w);I=w*Math.round(q[c+1]/w);c+=t;if(E!=x||I!=D){var H=x-B,L=D-y,J=E-B,C=I-y;H*C==L*J&&(0>H&&J<H||H==J||0<H&&J>H)&&(0>L&&C<L||L==C||0<L&&C>L)||(z[h++]=
x,z[h++]=D,B=x,y=D);x=E;D=I}}z[h++]=x;z[h++]=D}}k.push(h);c=r}return h};function Hh(b,c){zh.call(this);if(null===b)Bh(this,"XY",null);else{Ch(this,c,b,0);null===this.a&&(this.a=[]);var d=this.a,e=this.a,f=0,g,h;g=0;for(h=b.length;g<h;++g)e[f++]=b[g];d.length=f}this.c()}O(Hh,zh);Hh.prototype.clone=function(){var b=new Hh(null);Bh(b,this.f,this.a.slice());b.c();return b};Hh.prototype.jb=function(b){var c=this.a,d=c[0],c=c[1];return Hc(d,c,d,c,b)};Hh.prototype.Y=function(){return"Point"};function Ih(b,c,d,e,f,g){for(var h=!1,k=b[d-e],m=b[d-e+1];c<d;c+=e){var n=b[c],r=b[c+1];m>g!=r>g&&f<(n-k)*(g-m)/(r-m)+k&&(h=!h);k=n;m=r}return h};function Jh(b,c,d,e,f,g,h){var k,m,n,r,q,u=f[g+1],t=[],w=d[0];n=b[w-e];q=b[w-e+1];for(k=c;k<w;k+=e){r=b[k];m=b[k+1];if(u<=q&&m<=u||q<=u&&u<=m)n=(u-q)/(m-q)*(r-n)+n,t.push(n);n=r;q=m}w=NaN;q=-Infinity;t.sort();n=t[0];k=1;for(m=t.length;k<m;++k){r=t[k];var z=Math.abs(r-n);if(z>q){n=(n+r)/2;var B;a:if(0!==d.length&&Ih(b,c,d[0],e,n,u)){var y=B=void 0;B=1;for(y=d.length;B<y;++B)if(Ih(b,d[B-1],d[B],e,n,u)){B=!1;break a}B=!0}else B=!1;B&&(w=n,q=z)}n=r}isNaN(w)&&(w=f[g]);return v(h)?(h.push(w,u),h):[w,u]}
;function Kh(b,c,d,e){for(var f=0,g=b[d-e],h=b[d-e+1];c<d;c+=e)var k=b[c],m=b[c+1],f=f+(k-g)*(m+h),g=k,h=m;return 0<f}function Lh(b,c,d,e){var f=0;e=v(e)?e:!1;var g,h;g=0;for(h=c.length;g<h;++g){var k=c[g],f=Kh(b,f,k,d);if(0===g){if(e&&f||!e&&!f)return!1}else if(e&&!f||!e&&f)return!1;f=k}return!0}
function Mh(b,c,d,e,f){f=v(f)?f:!1;var g,h;g=0;for(h=d.length;g<h;++g){var k=d[g],m=Kh(b,c,k,e);if(0===g?f&&m||!f&&!m:f&&!m||!f&&m)for(var m=b,n=k,r=e;c<n-r;){var q;for(q=0;q<r;++q){var u=m[c+q];m[c+q]=m[n-r+q];m[n-r+q]=u}c+=r;n-=r}c=k}return c};function Nh(b,c){zh.call(this);this.d=[];this.q=-1;this.t=null;this.r=-1;this.i=null;if(null===b){var d=this.d;Bh(this,"XY",null);this.d=d}else Ch(this,c,b,2),null===this.a&&(this.a=[]),d=Eh(this.a,0,b,this.b,this.d),this.a.length=0===d.length?0:d[d.length-1];this.c()}O(Nh,zh);Nh.prototype.clone=function(){var b=new Nh(null),c=this.d.slice();Bh(b,this.f,this.a.slice());b.d=c;b.c();return b};function Oh(b){if(b.q!=b.e){var c=Pc(b.w());b.t=Jh(Ph(b),0,b.d,b.b,c,0);b.q=b.e}return b.t}
function Ph(b){if(b.r!=b.e){var c=b.a;Lh(c,b.d,b.b)?b.i=c:(b.i=c.slice(),b.i.length=Mh(b.i,0,b.d,b.b));b.r=b.e}return b.i}Nh.prototype.j=function(b){var c=[],d=[];c.length=Gh(this.a,0,this.d,this.b,Math.sqrt(b),c,0,d);b=new Nh(null);Bh(b,"XY",c);b.d=d;b.c();return b};Nh.prototype.Y=function(){return"Polygon"};function Qh(){};function Rh(b,c,d,e,f,g,h){S.call(this,b,c);this.vectorContext=d;this.frameState=f;this.context=g;this.glContext=h}O(Rh,S);function Sh(b){this.c=this.b=this.e=this.d=this.a=null;this.g=b}O(Sh,Ib);function Th(b){var c=b.e,d=b.b;b=Fa([c,[c[0],d[1]],d,[d[0],c[1]]],b.a.ja,b.a);b[4]=b[0].slice();return new Nh([b])}Sh.prototype.u=function(){this.setMap(null)};Sh.prototype.f=function(b){var c=this.c,d=this.g;Uh(b.vectorContext,function(b){b.ga(d.aa(),d.S());b.Z(d.V);b.Ma(c,null)})};Sh.prototype.K=function(){return this.c};function Vh(b){null===b.a||null===b.e||null===b.b||b.a.render()}
Sh.prototype.setMap=function(b){null!==this.d&&(U(this.d),this.d=null,this.a.render(),this.a=null);this.a=b;null!==this.a&&(this.d=T(b,"postcompose",this.f,!1,this),Vh(this))};function Wh(b,c){S.call(this,b);this.coordinate=c}O(Wh,S);function Xh(b){mh.call(this,{handleDownEvent:Yh,handleDragEvent:Zh,handleUpEvent:$h});b=v(b)?b:{};this.f=new Sh(v(b.style)?b.style:null);this.b=null;this.i=v(b.condition)?b.condition:xe}O(Xh,mh);function Zh(b){if(1==b.b.pointerId){var c=this.f;b=b.pixel;c.e=this.b;c.b=b;c.c=Th(c);Vh(c)}}Xh.prototype.K=function(){return this.f.K()};Xh.prototype.g=ba;
function $h(b){if(1!=b.b.pointerId)return!0;this.f.setMap(null);var c=b.pixel[0]-this.b[0],d=b.pixel[1]-this.b[1];64<=c*c+d*d&&(this.g(b),W(this,new Wh("boxend",b.coordinate)));return!1}function Yh(b){if(1==b.b.pointerId&&Tb(b.a)&&this.i(b)){this.b=b.pixel;this.f.setMap(b.map);var c=this.f,d=this.b;c.e=this.b;c.b=d;c.c=Th(c);Vh(c);W(this,new Wh("boxstart",b.coordinate));return!0}return!1};function ai(){this.b=-1};function bi(){this.b=-1;this.b=64;this.a=Array(4);this.d=Array(this.b);this.e=this.c=0;this.a[0]=1732584193;this.a[1]=4023233417;this.a[2]=2562383102;this.a[3]=271733878;this.e=this.c=0}O(bi,ai);
function ci(b,c,d){d||(d=0);var e=Array(16);if(G(c))for(var f=0;16>f;++f)e[f]=c.charCodeAt(d++)|c.charCodeAt(d++)<<8|c.charCodeAt(d++)<<16|c.charCodeAt(d++)<<24;else for(f=0;16>f;++f)e[f]=c[d++]|c[d++]<<8|c[d++]<<16|c[d++]<<24;c=b.a[0];d=b.a[1];var f=b.a[2],g=b.a[3],h=0,h=c+(g^d&(f^g))+e[0]+3614090360&4294967295;c=d+(h<<7&4294967295|h>>>25);h=g+(f^c&(d^f))+e[1]+3905402710&4294967295;g=c+(h<<12&4294967295|h>>>20);h=f+(d^g&(c^d))+e[2]+606105819&4294967295;f=g+(h<<17&4294967295|h>>>15);h=d+(c^f&(g^c))+
e[3]+3250441966&4294967295;d=f+(h<<22&4294967295|h>>>10);h=c+(g^d&(f^g))+e[4]+4118548399&4294967295;c=d+(h<<7&4294967295|h>>>25);h=g+(f^c&(d^f))+e[5]+1200080426&4294967295;g=c+(h<<12&4294967295|h>>>20);h=f+(d^g&(c^d))+e[6]+2821735955&4294967295;f=g+(h<<17&4294967295|h>>>15);h=d+(c^f&(g^c))+e[7]+4249261313&4294967295;d=f+(h<<22&4294967295|h>>>10);h=c+(g^d&(f^g))+e[8]+1770035416&4294967295;c=d+(h<<7&4294967295|h>>>25);h=g+(f^c&(d^f))+e[9]+2336552879&4294967295;g=c+(h<<12&4294967295|h>>>20);h=f+(d^g&
(c^d))+e[10]+4294925233&4294967295;f=g+(h<<17&4294967295|h>>>15);h=d+(c^f&(g^c))+e[11]+2304563134&4294967295;d=f+(h<<22&4294967295|h>>>10);h=c+(g^d&(f^g))+e[12]+1804603682&4294967295;c=d+(h<<7&4294967295|h>>>25);h=g+(f^c&(d^f))+e[13]+4254626195&4294967295;g=c+(h<<12&4294967295|h>>>20);h=f+(d^g&(c^d))+e[14]+2792965006&4294967295;f=g+(h<<17&4294967295|h>>>15);h=d+(c^f&(g^c))+e[15]+1236535329&4294967295;d=f+(h<<22&4294967295|h>>>10);h=c+(f^g&(d^f))+e[1]+4129170786&4294967295;c=d+(h<<5&4294967295|h>>>
27);h=g+(d^f&(c^d))+e[6]+3225465664&4294967295;g=c+(h<<9&4294967295|h>>>23);h=f+(c^d&(g^c))+e[11]+643717713&4294967295;f=g+(h<<14&4294967295|h>>>18);h=d+(g^c&(f^g))+e[0]+3921069994&4294967295;d=f+(h<<20&4294967295|h>>>12);h=c+(f^g&(d^f))+e[5]+3593408605&4294967295;c=d+(h<<5&4294967295|h>>>27);h=g+(d^f&(c^d))+e[10]+38016083&4294967295;g=c+(h<<9&4294967295|h>>>23);h=f+(c^d&(g^c))+e[15]+3634488961&4294967295;f=g+(h<<14&4294967295|h>>>18);h=d+(g^c&(f^g))+e[4]+3889429448&4294967295;d=f+(h<<20&4294967295|
h>>>12);h=c+(f^g&(d^f))+e[9]+568446438&4294967295;c=d+(h<<5&4294967295|h>>>27);h=g+(d^f&(c^d))+e[14]+3275163606&4294967295;g=c+(h<<9&4294967295|h>>>23);h=f+(c^d&(g^c))+e[3]+4107603335&4294967295;f=g+(h<<14&4294967295|h>>>18);h=d+(g^c&(f^g))+e[8]+1163531501&4294967295;d=f+(h<<20&4294967295|h>>>12);h=c+(f^g&(d^f))+e[13]+2850285829&4294967295;c=d+(h<<5&4294967295|h>>>27);h=g+(d^f&(c^d))+e[2]+4243563512&4294967295;g=c+(h<<9&4294967295|h>>>23);h=f+(c^d&(g^c))+e[7]+1735328473&4294967295;f=g+(h<<14&4294967295|
h>>>18);h=d+(g^c&(f^g))+e[12]+2368359562&4294967295;d=f+(h<<20&4294967295|h>>>12);h=c+(d^f^g)+e[5]+4294588738&4294967295;c=d+(h<<4&4294967295|h>>>28);h=g+(c^d^f)+e[8]+2272392833&4294967295;g=c+(h<<11&4294967295|h>>>21);h=f+(g^c^d)+e[11]+1839030562&4294967295;f=g+(h<<16&4294967295|h>>>16);h=d+(f^g^c)+e[14]+4259657740&4294967295;d=f+(h<<23&4294967295|h>>>9);h=c+(d^f^g)+e[1]+2763975236&4294967295;c=d+(h<<4&4294967295|h>>>28);h=g+(c^d^f)+e[4]+1272893353&4294967295;g=c+(h<<11&4294967295|h>>>21);h=f+(g^
c^d)+e[7]+4139469664&4294967295;f=g+(h<<16&4294967295|h>>>16);h=d+(f^g^c)+e[10]+3200236656&4294967295;d=f+(h<<23&4294967295|h>>>9);h=c+(d^f^g)+e[13]+681279174&4294967295;c=d+(h<<4&4294967295|h>>>28);h=g+(c^d^f)+e[0]+3936430074&4294967295;g=c+(h<<11&4294967295|h>>>21);h=f+(g^c^d)+e[3]+3572445317&4294967295;f=g+(h<<16&4294967295|h>>>16);h=d+(f^g^c)+e[6]+76029189&4294967295;d=f+(h<<23&4294967295|h>>>9);h=c+(d^f^g)+e[9]+3654602809&4294967295;c=d+(h<<4&4294967295|h>>>28);h=g+(c^d^f)+e[12]+3873151461&4294967295;
g=c+(h<<11&4294967295|h>>>21);h=f+(g^c^d)+e[15]+530742520&4294967295;f=g+(h<<16&4294967295|h>>>16);h=d+(f^g^c)+e[2]+3299628645&4294967295;d=f+(h<<23&4294967295|h>>>9);h=c+(f^(d|~g))+e[0]+4096336452&4294967295;c=d+(h<<6&4294967295|h>>>26);h=g+(d^(c|~f))+e[7]+1126891415&4294967295;g=c+(h<<10&4294967295|h>>>22);h=f+(c^(g|~d))+e[14]+2878612391&4294967295;f=g+(h<<15&4294967295|h>>>17);h=d+(g^(f|~c))+e[5]+4237533241&4294967295;d=f+(h<<21&4294967295|h>>>11);h=c+(f^(d|~g))+e[12]+1700485571&4294967295;c=d+
(h<<6&4294967295|h>>>26);h=g+(d^(c|~f))+e[3]+2399980690&4294967295;g=c+(h<<10&4294967295|h>>>22);h=f+(c^(g|~d))+e[10]+4293915773&4294967295;f=g+(h<<15&4294967295|h>>>17);h=d+(g^(f|~c))+e[1]+2240044497&4294967295;d=f+(h<<21&4294967295|h>>>11);h=c+(f^(d|~g))+e[8]+1873313359&4294967295;c=d+(h<<6&4294967295|h>>>26);h=g+(d^(c|~f))+e[15]+4264355552&4294967295;g=c+(h<<10&4294967295|h>>>22);h=f+(c^(g|~d))+e[6]+2734768916&4294967295;f=g+(h<<15&4294967295|h>>>17);h=d+(g^(f|~c))+e[13]+1309151649&4294967295;
d=f+(h<<21&4294967295|h>>>11);h=c+(f^(d|~g))+e[4]+4149444226&4294967295;c=d+(h<<6&4294967295|h>>>26);h=g+(d^(c|~f))+e[11]+3174756917&4294967295;g=c+(h<<10&4294967295|h>>>22);h=f+(c^(g|~d))+e[2]+718787259&4294967295;f=g+(h<<15&4294967295|h>>>17);h=d+(g^(f|~c))+e[9]+3951481745&4294967295;b.a[0]=b.a[0]+c&4294967295;b.a[1]=b.a[1]+(f+(h<<21&4294967295|h>>>11))&4294967295;b.a[2]=b.a[2]+f&4294967295;b.a[3]=b.a[3]+g&4294967295}
function di(b,c){var d;v(d)||(d=c.length);for(var e=d-b.b,f=b.d,g=b.c,h=0;h<d;){if(0==g)for(;h<=e;)ci(b,c,h),h+=b.b;if(G(c))for(;h<d;){if(f[g++]=c.charCodeAt(h++),g==b.b){ci(b,f);g=0;break}}else for(;h<d;)if(f[g++]=c[h++],g==b.b){ci(b,f);g=0;break}}b.c=g;b.e+=d};function ei(b){b=v(b)?b:{};this.c=v(b.color)?b.color:null;this.ca=b.lineCap;this.a=v(b.lineDash)?b.lineDash:null;this.da=b.lineJoin;this.ea=b.miterLimit;this.e=b.width;this.b=void 0}ei.prototype.D=function(){return this.c};ei.prototype.getLineDash=function(){return this.a};ei.prototype.B=function(){return this.e};
ei.prototype.X=function(){if(!v(this.b)){var b="s"+(null===this.c?"-":Hd(this.c))+","+(v(this.ca)?this.ca.toString():"-")+","+(null===this.a?"-":this.a.toString())+","+(v(this.da)?this.da:"-")+","+(v(this.ea)?this.ea.toString():"-")+","+(v(this.e)?this.e.toString():"-"),c=new bi;di(c,b);var d=Array((56>c.c?c.b:2*c.b)-c.c);d[0]=128;for(b=1;b<d.length-8;++b)d[b]=0;for(var e=8*c.e,b=d.length-8;b<d.length;++b)d[b]=e&255,e/=256;di(c,d);d=Array(16);for(b=e=0;4>b;++b)for(var f=0;32>f;f+=8)d[e++]=c.a[b]>>>
f&255;if(8192>d.length)c=String.fromCharCode.apply(null,d);else for(c="",b=0;b<d.length;b+=8192)c+=String.fromCharCode.apply(null,Ma(d,b,b+8192));this.b=c}return this.b};var fi=[0,0,0,1],gi=[],hi=[0,0,0,1];function ii(b){b=v(b)?b:{};this.b=v(b.color)?b.color:null;this.a=void 0}ii.prototype.D=function(){return this.b};ii.prototype.X=function(){v(this.a)||(this.a="f"+(null===this.b?"-":Hd(this.b)));return this.a};function ji(b){b=v(b)?b:{};this.f=this.a=this.d=null;this.c=v(b.fill)?b.fill:null;this.b=v(b.stroke)?b.stroke:null;this.e=b.radius;this.h=[0,0];this.o=this.g=null;var c=b.atlasManager,d=null,e,f=0;null!==this.b&&(e=Hd(this.b.D()),f=this.b.B(),v(f)||(f=1),d=this.b.getLineDash(),If||(d=null));var g=2*(this.e+f)+1;e={strokeStyle:e,Da:f,size:g,lineDash:d};if(v(c)){var g=Math.round(g),d=null===this.c,h;d&&(h=N(this.Xb,this,e));f=this.X();h=c.add(f,g,g,N(this.Yb,this,e),h);this.a=h.image;this.h=[h.offsetX,
h.offsetY];this.f=d?h.Zc:this.a}else this.a=document.createElement("CANVAS"),this.a.height=g,this.a.width=g,g=this.a.width,h=this.a.getContext("2d"),this.Yb(e,h,0,0),null===this.c?(h=this.f=document.createElement("CANVAS"),h.height=e.size,h.width=e.size,h=h.getContext("2d"),this.Xb(e,h,0,0)):this.f=this.a;this.g=[g/2,g/2];this.o=[g,g];Mg.call(this,{opacity:1,rotateWithView:!1,rotation:0,scale:1,snapToPixel:v(b.snapToPixel)?b.snapToPixel:!0})}O(ji,Mg);l=ji.prototype;l.rb=function(){return this.g};
l.aa=function(){return this.c};l.Zb=function(){return this.f};l.G=function(){return this.a};l.Za=function(){return 2};l.Bb=function(){return this.h};l.Cb=function(){return this.o};l.S=function(){return this.b};l.Wb=ba;l.load=ba;l.hc=ba;
l.Yb=function(b,c,d,e){c.setTransform(1,0,0,1,0,0);c.translate(d,e);c.beginPath();c.arc(b.size/2,b.size/2,this.e,0,2*Math.PI,!0);null!==this.c&&(c.fillStyle=Hd(this.c.D()),c.fill());null!==this.b&&(c.strokeStyle=b.strokeStyle,c.lineWidth=b.Da,null===b.lineDash||c.setLineDash(b.lineDash),c.stroke());c.closePath()};
l.Xb=function(b,c,d,e){c.setTransform(1,0,0,1,0,0);c.translate(d,e);c.beginPath();c.arc(b.size/2,b.size/2,this.e,0,2*Math.PI,!0);c.fillStyle=fi;c.fill();null!==this.b&&(c.strokeStyle=b.strokeStyle,c.lineWidth=b.Da,null===b.lineDash||c.setLineDash(b.lineDash),c.stroke());c.closePath()};l.X=function(){var b=null===this.b?"-":this.b.X(),c=null===this.c?"-":this.c.X();if(null===this.d||b!=this.d[1]||c!=this.d[2]||this.e!=this.d[3])this.d=["c"+b+c+(v(this.e)?this.e.toString():"-"),b,c,this.e];return this.d[0]};function ki(b){b=v(b)?b:{};this.c=null;this.b=li;v(b.geometry)&&mi(this,b.geometry);this.e=v(b.fill)?b.fill:null;this.d=v(b.image)?b.image:null;this.f=v(b.stroke)?b.stroke:null;this.V=v(b.text)?b.text:null;this.a=b.zIndex}ki.prototype.K=function(){return this.c};ki.prototype.aa=function(){return this.e};ki.prototype.G=function(){return this.d};ki.prototype.S=function(){return this.f};
function mi(b,c){ga(c)?b.b=c:G(c)?b.b=function(b){return b.get(c)}:null===c?b.b=li:v(c)&&(b.b=function(){return c});b.c=c}function ni(){var b=new ii({color:"rgba(255,255,255,0.4)"}),c=new ei({color:"#3399CC",width:1.25}),d=[new ki({image:new ji({fill:b,stroke:c,radius:5}),fill:b,stroke:c})];ni=function(){return d};return d}function li(b){return b.K()};function oi(b){var c=v(b)?b:{};b=v(c.condition)?c.condition:kh;this.r=v(c.duration)?c.duration:200;c=v(c.style)?c.style:new ki({stroke:new ei({color:[0,0,255,1]})});Xh.call(this,{condition:b,style:c})}O(oi,Xh);oi.prototype.g=function(){var b=this.k,c=b.A(),d=this.K().w(),e=Pc(d),f=b.pa(),d=Math.max((d[2]-d[0])/f[0],(d[3]-d[1])/f[1]),f=this.r,d=c.constrainResolution(d,0,void 0);fh(b,c,d,e,f)};function pi(b){ch.call(this,{handleEvent:qi});b=v(b)?b:{};this.a=v(b.condition)?b.condition:Ae(jh,lh);this.b=v(b.duration)?b.duration:100;this.d=v(b.pixelDelta)?b.pixelDelta:128}O(pi,ch);
function qi(b){var c=!1;if("key"==b.type){var d=b.a.c;if(this.a(b)&&(40==d||37==d||39==d||38==d)){var e=b.map,c=e.A(),f=c.I(),g=f.resolution*this.d,h=0,k=0;40==d?k=-g:37==d?h=-g:39==d?h=g:k=g;d=[h,k];Ac(d,f.rotation);f=this.b;g=c.U();v(g)&&(v(f)&&0<f&&e.R(sd({source:g,duration:f,easing:rd})),e=c.a.center([g[0]+d[0],g[1]+d[1]]),nd(c,e));b.preventDefault();c=!0}}return!c};function ri(b){ch.call(this,{handleEvent:si});b=v(b)?b:{};this.b=v(b.condition)?b.condition:lh;this.a=v(b.delta)?b.delta:1;this.d=v(b.duration)?b.duration:100}O(ri,ch);function si(b){var c=!1;if("key"==b.type){var d=b.a.o;if(this.b(b)&&(43==d||45==d)){c=b.map;d=43==d?this.a:-this.a;c.render();var e=c.A();eh(c,e,d,void 0,this.d);b.preventDefault();c=!0}}return!c};function ti(b){ch.call(this,{handleEvent:ui});b=v(b)?b:{};this.a=0;this.h=v(b.duration)?b.duration:250;this.d=null;this.f=this.b=void 0}O(ti,ch);function ui(b){var c=!1;if("mousewheel"==b.type){var c=b.map,d=b.a;this.d=b.coordinate;this.a+=d.v;v(this.b)||(this.b=oa());d=Math.max(80-(oa()-this.b),0);p.clearTimeout(this.f);this.f=p.setTimeout(N(this.g,this,c),d);b.preventDefault();c=!0}return!c}
ti.prototype.g=function(b){var c=tb(this.a,-1,1),d=b.A();b.render();eh(b,d,-c,this.d,this.h);this.a=0;this.d=null;this.f=this.b=void 0};function vi(b){mh.call(this,{handleDownEvent:wi,handleDragEvent:xi,handleUpEvent:yi});b=v(b)?b:{};this.f=null;this.g=void 0;this.b=!1;this.i=0;this.O=v(b.threshold)?b.threshold:.3;this.r=v(b.duration)?b.duration:250}O(vi,mh);
function xi(b){var c=0,d=this.a[0],e=this.a[1],d=Math.atan2(e.clientY-d.clientY,e.clientX-d.clientX);v(this.g)&&(c=d-this.g,this.i+=c,!this.b&&Math.abs(this.i)>this.O&&(this.b=!0));this.g=d;b=b.map;d=fe(b.a);e=oh(this.a);e[0]-=d.x;e[1]-=d.y;this.f=b.ja(e);this.b&&(d=b.A(),e=d.H(),b.render(),dh(b,d,e+c,this.f))}function yi(b){if(2>this.a.length){b=b.map;var c=b.A();od(c,-1);if(this.b){var d=c.H(),e=this.f,f=this.r,d=c.constrainRotation(d,0);dh(b,c,d,e,f)}return!1}return!0}
function wi(b){return 2<=this.a.length?(b=b.map,this.f=null,this.g=void 0,this.b=!1,this.i=0,this.d||od(b.A(),1),b.render(),!0):!1}vi.prototype.h=we;function zi(b){mh.call(this,{handleDownEvent:Ai,handleDragEvent:Bi,handleUpEvent:Ci});b=v(b)?b:{};this.f=null;this.i=v(b.duration)?b.duration:400;this.b=void 0;this.g=1}O(zi,mh);function Bi(b){var c=1,d=this.a[0],e=this.a[1],f=d.clientX-e.clientX,d=d.clientY-e.clientY,f=Math.sqrt(f*f+d*d);v(this.b)&&(c=this.b/f);this.b=f;1!=c&&(this.g=c);b=b.map;var f=b.A(),d=md(f),e=fe(b.a),g=oh(this.a);g[0]-=e.x;g[1]-=e.y;this.f=b.ja(g);b.render();fh(b,f,d*c,this.f)}
function Ci(b){if(2>this.a.length){b=b.map;var c=b.A();od(c,-1);var d=md(c),e=this.f,f=this.i,d=c.constrainResolution(d,0,this.g-1);fh(b,c,d,e,f);return!1}return!0}function Ai(b){return 2<=this.a.length?(b=b.map,this.f=null,this.b=void 0,this.g=1,this.d||od(b.A(),1),b.render(),!0):!1}zi.prototype.h=we;function Di(b){var c=v(b)?b:{};b=db(c);delete b.layers;c=c.layers;Cg.call(this,b);this.b=[];this.a={};T(this,xc("layers"),this.Lc,!1,this);null!=c?da(c)&&(c=new Ed(c.slice())):c=new Ed;this.set("layers",c)}O(Di,Cg);l=Di.prototype;l.Qa=function(){this.get("visible")&&this.c()};
l.Lc=function(){P(this.b,U);this.b.length=0;var b=this.get("layers");this.b.push(T(b,"add",this.Kc,!1,this),T(b,"remove",this.Mc,!1,this));Va(this.a,function(b){P(b,U)});ab(this.a);var b=b.a,c,d,e;c=0;for(d=b.length;c<d;c++)e=b[c],this.a[M(e).toString()]=[T(e,"propertychange",this.Qa,!1,this),T(e,"change",this.Qa,!1,this)];this.c()};l.Kc=function(b){b=b.element;var c=M(b).toString();this.a[c]=[T(b,"propertychange",this.Qa,!1,this),T(b,"change",this.Qa,!1,this)];this.c()};
l.Mc=function(b){b=M(b.element).toString();P(this.a[b],U);delete this.a[b];this.c()};
l.tb=function(b){var c=v(b)?b:[],d=c.length;this.get("layers").forEach(function(b){b.tb(c)});b=Dg(this);var e,f;for(e=c.length;d<e;d++)f=c[d],f.brightness=tb(f.brightness+b.brightness,-1,1),f.contrast*=b.contrast,f.hue+=b.hue,f.opacity*=b.opacity,f.saturation*=b.saturation,f.visible=f.visible&&b.visible,f.maxResolution=Math.min(f.maxResolution,b.maxResolution),f.minResolution=Math.max(f.minResolution,b.minResolution),v(b.extent)&&(f.extent=v(f.extent)?Sc(f.extent,b.extent):b.extent);return c};
l.vb=function(){return"ready"};function Ei(b){Zc.call(this,{code:b,units:"m",extent:Fi,global:!0,worldExtent:Gi})}O(Ei,Zc);Ei.prototype.getPointResolution=function(b,c){var d=c[1]/6378137;return b/((Math.exp(d)+Math.exp(-d))/2)};var Hi=6378137*Math.PI,Fi=[-Hi,-Hi,Hi,Hi],Gi=[-180,-85,180,85],Ii=Fa("EPSG:3857 EPSG:102100 EPSG:102113 EPSG:900913 urn:ogc:def:crs:EPSG:6.18:3:3857 urn:ogc:def:crs:EPSG::3857 http://www.opengis.net/gml/srs/epsg.xml#3857".split(" "),function(b){return new Ei(b)});
function Ji(b,c,d){var e=b.length;d=1<d?d:2;v(c)||(2<d?c=b.slice():c=Array(e));for(var f=0;f<e;f+=d)c[f]=6378137*Math.PI*b[f]/180,c[f+1]=6378137*Math.log(Math.tan(Math.PI*(b[f+1]+90)/360));return c}function Ki(b,c,d){var e=b.length;d=1<d?d:2;v(c)||(2<d?c=b.slice():c=Array(e));for(var f=0;f<e;f+=d)c[f]=180*b[f]/(6378137*Math.PI),c[f+1]=360*Math.atan(Math.exp(b[f+1]/6378137))/Math.PI-90;return c};function Li(b,c){Zc.call(this,{code:b,units:"degrees",extent:Mi,axisOrientation:c,global:!0,worldExtent:Mi})}O(Li,Zc);Li.prototype.getPointResolution=function(b){return b};
var Mi=[-180,-90,180,90],Ni=[new Li("CRS:84"),new Li("EPSG:4326","neu"),new Li("urn:ogc:def:crs:EPSG::4326","neu"),new Li("urn:ogc:def:crs:EPSG:6.6:4326","neu"),new Li("urn:ogc:def:crs:OGC:1.3:CRS84"),new Li("urn:ogc:def:crs:OGC:2:84"),new Li("http://www.opengis.net/gml/srs/epsg.xml#4326","neu"),new Li("urn:x-ogc:def:crs:EPSG:4326","neu")];function Tg(b){b=v(b)?b:{};var c=db(b);delete c.preload;delete c.useInterimTilesOnError;Eg.call(this,c);this.set("preload",v(b.preload)?b.preload:0);this.set("useInterimTilesOnError",v(b.useInterimTilesOnError)?b.useInterimTilesOnError:!0)}O(Tg,Eg);function Vg(b){b=v(b)?b:{};var c=db(b);delete c.style;delete c.renderBuffer;delete c.updateWhileAnimating;delete c.updateWhileInteracting;Eg.call(this,c);this.d=v(b.renderBuffer)?b.renderBuffer:100;this.f=null;this.b=void 0;this.g(b.style);this.k=v(b.updateWhileAnimating)?b.updateWhileAnimating:!1;this.n=v(b.updateWhileInteracting)?b.updateWhileInteracting:!1}O(Vg,Eg);Vg.prototype.g=function(b){this.f=v(b)?b:ni;null===b?b=void 0:(b=this.f,ga(b)||(b=da(b)?b:[b],b=ve(b)));this.b=b;this.c()};function Oi(b,c,d,e,f){this.j={};this.c=b;this.k=c;this.g=d;this.p=e;this.bb=f;this.d=this.a=this.b=this.ha=this.$=this.O=null;this.sa=this.ia=this.v=this.M=this.t=this.q=0;this.ta=!1;this.f=this.Fa=0;this.Ga=!1;this.r=0;this.e="";this.o=this.n=this.Ia=this.Ha=0;this.N=this.l=this.h=null;this.i=[];this.Ja=Ec()}
function Pi(b,c,d){if(null!==b.d){c=yh(c,0,d,2,b.p,b.i);d=b.c;var e=b.Ja,f=d.globalAlpha;1!=b.v&&(d.globalAlpha=f*b.v);var g=b.Fa;b.ta&&(g+=b.bb);var h,k;h=0;for(k=c.length;h<k;h+=2){var m=c[h]-b.q,n=c[h+1]-b.t;b.Ga&&(m=m+.5|0,n=n+.5|0);if(0!==g||1!=b.f){var r=m+b.q,q=n+b.t;Fg(e,r,q,b.f,b.f,g,-r,-q);d.setTransform(e[0],e[1],e[4],e[5],e[12],e[13])}d.drawImage(b.d,b.ia,b.sa,b.r,b.M,m,n,b.r,b.M)}0===g&&1==b.f||d.setTransform(1,0,0,1,0,0);1!=b.v&&(d.globalAlpha=f)}}
function Qi(b,c,d,e){var f=0;if(null!==b.N&&""!==b.e){null===b.h||Ri(b,b.h);null===b.l||Si(b,b.l);var g=b.N,h=b.c,k=b.ha;null===k?(h.font=g.font,h.textAlign=g.textAlign,h.textBaseline=g.textBaseline,b.ha={font:g.font,textAlign:g.textAlign,textBaseline:g.textBaseline}):(k.font!=g.font&&(k.font=h.font=g.font),k.textAlign!=g.textAlign&&(k.textAlign=h.textAlign=g.textAlign),k.textBaseline!=g.textBaseline&&(k.textBaseline=h.textBaseline=g.textBaseline));c=yh(c,f,d,e,b.p,b.i);for(g=b.c;f<d;f+=e){h=c[f]+
b.Ha;k=c[f+1]+b.Ia;if(0!==b.n||1!=b.o){var m=Fg(b.Ja,h,k,b.o,b.o,b.n,-h,-k);g.setTransform(m[0],m[1],m[4],m[5],m[12],m[13])}null===b.l||g.strokeText(b.e,h,k);null===b.h||g.fillText(b.e,h,k)}0===b.n&&1==b.o||g.setTransform(1,0,0,1,0,0)}}function Ti(b,c,d,e,f,g){var h=b.c;b=yh(c,d,e,f,b.p,b.i);h.moveTo(b[0],b[1]);for(c=2;c<b.length;c+=2)h.lineTo(b[c],b[c+1]);g&&h.lineTo(b[0],b[1]);return e}function Ui(b,c,d,e,f){var g=b.c,h,k;h=0;for(k=e.length;h<k;++h)d=Ti(b,c,d,e[h],f,!0),g.closePath();return d}
function Uh(b,c){var d=Infinity.toString(),e=b.j[d];v(e)?e.push(c):b.j[d]=[c]}l=Oi.prototype;l.lb=function(b){if(Uc(this.g,b.w())){if(null!==this.b||null!==this.a){null===this.b||Ri(this,this.b);null===this.a||Si(this,this.a);var c;c=b.a;c=null===c?null:yh(c,0,c.length,b.b,this.p,this.i);var d=c[2]-c[0],e=c[3]-c[1],d=Math.sqrt(d*d+e*e),e=this.c;e.beginPath();e.arc(c[0],c[1],d,0,2*Math.PI);null===this.b||e.fill();null===this.a||e.stroke()}""!==this.e&&Qi(this,b.d(),2,2)}};
l.wc=function(b,c){var d=b.a,e,f;e=0;for(f=d.length;e<f;++e){var g=d[e];Vi[g.Y()].call(this,g,c)}};l.qb=function(b){var c=b.a;b=b.b;null===this.d||Pi(this,c,c.length);""!==this.e&&Qi(this,c,c.length,b)};l.ob=function(b){var c=b.a;b=b.b;null===this.d||Pi(this,c,c.length);""!==this.e&&Qi(this,c,c.length,b)};l.mb=function(b){if(Uc(this.g,b.w())){if(null!==this.a){Si(this,this.a);var c=this.c,d=b.a;c.beginPath();Ti(this,d,0,d.length,b.b,!1);c.stroke()}""!==this.e&&(b=Wi(b),Qi(this,b,2,2))}};
l.nb=function(b){var c=b.w();if(Uc(this.g,c)){if(null!==this.a){Si(this,this.a);var c=this.c,d=b.a,e=0,f=b.d,g=b.b;c.beginPath();var h,k;h=0;for(k=f.length;h<k;++h)e=Ti(this,d,e,f[h],g,!1);c.stroke()}""!==this.e&&(b=Xi(b),Qi(this,b,b.length,2))}};
l.Ma=function(b){if(Uc(this.g,b.w())){if(null!==this.a||null!==this.b){null===this.b||Ri(this,this.b);null===this.a||Si(this,this.a);var c=this.c;c.beginPath();Ui(this,Ph(b),0,b.d,b.b);null===this.b||c.fill();null===this.a||c.stroke()}""!==this.e&&(b=Oh(b),Qi(this,b,2,2))}};
l.pb=function(b){if(Uc(this.g,b.w())){if(null!==this.a||null!==this.b){null===this.b||Ri(this,this.b);null===this.a||Si(this,this.a);var c=this.c,d=Yi(b),e=0,f=b.d,g=b.b,h,k;h=0;for(k=f.length;h<k;++h){var m=f[h];c.beginPath();e=Ui(this,d,e,m,g);null===this.b||c.fill();null===this.a||c.stroke()}}""!==this.e&&(b=Zi(b),Qi(this,b,b.length,2))}};function $i(b){var c=Fa(Za(b.j),Number);Na(c);var d,e,f,g,h;d=0;for(e=c.length;d<e;++d)for(f=b.j[c[d].toString()],g=0,h=f.length;g<h;++g)f[g](b)}
function Ri(b,c){var d=b.c,e=b.O;null===e?(d.fillStyle=c.fillStyle,b.O={fillStyle:c.fillStyle}):e.fillStyle!=c.fillStyle&&(e.fillStyle=d.fillStyle=c.fillStyle)}
function Si(b,c){var d=b.c,e=b.$;null===e?(d.lineCap=c.lineCap,If&&d.setLineDash(c.lineDash),d.lineJoin=c.lineJoin,d.lineWidth=c.lineWidth,d.miterLimit=c.miterLimit,d.strokeStyle=c.strokeStyle,b.$={lineCap:c.lineCap,lineDash:c.lineDash,lineJoin:c.lineJoin,lineWidth:c.lineWidth,miterLimit:c.miterLimit,strokeStyle:c.strokeStyle}):(e.lineCap!=c.lineCap&&(e.lineCap=d.lineCap=c.lineCap),If&&!Pa(e.lineDash,c.lineDash)&&d.setLineDash(e.lineDash=c.lineDash),e.lineJoin!=c.lineJoin&&(e.lineJoin=d.lineJoin=
c.lineJoin),e.lineWidth!=c.lineWidth&&(e.lineWidth=d.lineWidth=c.lineWidth),e.miterLimit!=c.miterLimit&&(e.miterLimit=d.miterLimit=c.miterLimit),e.strokeStyle!=c.strokeStyle&&(e.strokeStyle=d.strokeStyle=c.strokeStyle))}
l.ga=function(b,c){if(null===b)this.b=null;else{var d=b.D();this.b={fillStyle:Hd(null===d?fi:d)}}if(null===c)this.a=null;else{var d=c.D(),e=c.ca,f=c.getLineDash(),g=c.da,h=c.B(),k=c.ea;this.a={lineCap:v(e)?e:"round",lineDash:null!=f?f:gi,lineJoin:v(g)?g:"round",lineWidth:this.k*(v(h)?h:1),miterLimit:v(k)?k:10,strokeStyle:Hd(null===d?hi:d)}}};
l.Db=function(b){if(null===b)this.d=null;else{var c=b.rb(),d=b.G(1),e=b.Bb(),f=b.Cb();this.q=c[0];this.t=c[1];this.M=f[1];this.d=d;this.v=b.l;this.ia=e[0];this.sa=e[1];this.ta=b.v;this.Fa=b.H();this.f=b.Ya;this.Ga=b.j;this.r=f[0]}};
l.Z=function(b){if(null===b)this.e="";else{var c=b.aa();null===c?this.h=null:(c=c.D(),this.h={fillStyle:Hd(null===c?fi:c)});var d=b.S();if(null===d)this.l=null;else{var c=d.D(),e=d.ca,f=d.getLineDash(),g=d.da,h=d.B(),d=d.ea;this.l={lineCap:v(e)?e:"round",lineDash:null!=f?f:gi,lineJoin:v(g)?g:"round",lineWidth:v(h)?h:1,miterLimit:v(d)?d:10,strokeStyle:Hd(null===c?hi:c)}}var c=b.zc(),e=b.Ac(),f=b.Bc(),g=b.H(),h=b.Ya,d=b.V,k=b.Cc();b=b.Dc();this.N={font:v(c)?c:"10px sans-serif",textAlign:v(k)?k:"center",
textBaseline:v(b)?b:"middle"};this.e=v(d)?d:"";this.Ha=v(e)?this.k*e:0;this.Ia=v(f)?this.k*f:0;this.n=v(g)?g:0;this.o=this.k*(v(h)?h:1)}};var Vi={Point:Oi.prototype.qb,LineString:Oi.prototype.mb,Polygon:Oi.prototype.Ma,MultiPoint:Oi.prototype.ob,MultiLineString:Oi.prototype.nb,MultiPolygon:Oi.prototype.pb,GeometryCollection:Oi.prototype.wc,Circle:Oi.prototype.lb};var aj=["Polygon","LineString","Image","Text"];function bj(b,c,d){this.ia=b;this.N=c;this.d=null;this.f=0;this.resolution=d;this.M=this.t=null;this.b=[];this.c=[];this.$=Ec();this.a=[];this.O=[];this.ha=Ec()}O(bj,Qh);
function cj(b,c,d,e,f,g){var h=b.c.length,k=b.sb(),m=[c[d],c[d+1]],n=[NaN,NaN],r=!0,q,u,t;for(q=d+f;q<e;q+=f){n[0]=c[q];n[1]=c[q+1];t=k[1];var w=k[2],z=k[3],B=n[0],y=n[1],x=0;B<k[0]?x=x|16:B>w&&(x=x|4);y<t?x|=8:y>z&&(x|=2);0===x&&(x=1);t=x;t!==u?(r&&(b.c[h++]=m[0],b.c[h++]=m[1]),b.c[h++]=n[0],b.c[h++]=n[1],r=!1):1===t?(b.c[h++]=n[0],b.c[h++]=n[1],r=!1):r=!0;m[0]=n[0];m[1]=n[1];u=t}q===d+f&&(b.c[h++]=m[0],b.c[h++]=m[1]);g&&(b.c[h++]=c[d],b.c[h++]=c[d+1]);return h}
function dj(b,c){b.t=[0,c,0];b.b.push(b.t);b.M=[0,c,0];b.a.push(b.M)}
function ej(b,c,d,e,f,g,h,k,m){var n;n=b.$;if(e[0]==n[0]&&e[1]==n[1]&&e[4]==n[4]&&e[5]==n[5]&&e[12]==n[12]&&e[13]==n[13])n=b.O;else{n=yh(b.c,0,b.c.length,2,e,b.O);var r=b.$;r[0]=e[0];r[1]=e[1];r[2]=e[2];r[3]=e[3];r[4]=e[4];r[5]=e[5];r[6]=e[6];r[7]=e[7];r[8]=e[8];r[9]=e[9];r[10]=e[10];r[11]=e[11];r[12]=e[12];r[13]=e[13];r[14]=e[14];r[15]=e[15]}e=0;var r=h.length,q=0,u;for(b=b.ha;e<r;){var t=h[e],w,z,B,y;switch(t[0]){case 0:q=t[1];u=M(q).toString();v(g[u])?e=t[2]:v(m)&&!Uc(m,q.K().w())?e=t[2]:++e;break;
case 1:c.beginPath();++e;break;case 2:q=t[1];u=n[q];var x=n[q+1],D=n[q+2]-u,q=n[q+3]-x;c.arc(u,x,Math.sqrt(D*D+q*q),0,2*Math.PI,!0);++e;break;case 3:c.closePath();++e;break;case 4:q=t[1];u=t[2];w=t[3];B=t[4]*d;var E=t[5]*d,I=t[6];z=t[7];var H=t[8],L=t[9],x=t[11],D=t[12],J=t[13],C=t[14];for(t[10]&&(x+=f);q<u;q+=2){t=n[q]-B;y=n[q+1]-E;J&&(t=t+.5|0,y=y+.5|0);if(1!=D||0!==x){var K=t+B,F=y+E;Fg(b,K,F,D,D,x,-K,-F);c.setTransform(b[0],b[1],b[4],b[5],b[12],b[13])}K=c.globalAlpha;1!=z&&(c.globalAlpha=K*z);
c.drawImage(w,H,L,C,I,t,y,C*d,I*d);1!=z&&(c.globalAlpha=K);1==D&&0===x||c.setTransform(1,0,0,1,0,0)}++e;break;case 5:q=t[1];u=t[2];B=t[3];E=t[4]*d;I=t[5]*d;x=t[6];D=t[7]*d;w=t[8];for(z=t[9];q<u;q+=2){t=n[q]+E;y=n[q+1]+I;if(1!=D||0!==x)Fg(b,t,y,D,D,x,-t,-y),c.setTransform(b[0],b[1],b[4],b[5],b[12],b[13]);z&&c.strokeText(B,t,y);w&&c.fillText(B,t,y);1==D&&0===x||c.setTransform(1,0,0,1,0,0)}++e;break;case 6:if(v(k)&&(q=t[1],q=k(q)))return q;++e;break;case 7:c.fill();++e;break;case 8:q=t[1];u=t[2];c.moveTo(n[q],
n[q+1]);for(q+=2;q<u;q+=2)c.lineTo(n[q],n[q+1]);++e;break;case 9:c.fillStyle=t[1];++e;break;case 10:q=v(t[7])?t[7]:!0;u=t[2];c.strokeStyle=t[1];c.lineWidth=q?u*d:u;c.lineCap=t[3];c.lineJoin=t[4];c.miterLimit=t[5];If&&c.setLineDash(t[6]);++e;break;case 11:c.font=t[1];c.textAlign=t[2];c.textBaseline=t[3];++e;break;case 12:c.stroke();++e;break;default:++e}}}
function fj(b){var c=b.a;c.reverse();var d,e=c.length,f,g,h=-1;for(d=0;d<e;++d)if(f=c[d],g=f[0],6==g)h=d;else if(0==g){f[2]=d;f=b.a;for(g=d;h<g;){var k=f[h];f[h]=f[g];f[g]=k;++h;--g}h=-1}}function gj(b,c){b.t[2]=b.b.length;b.t=null;b.M[2]=b.a.length;b.M=null;var d=[6,c];b.b.push(d);b.a.push(d)}bj.prototype.Xa=ba;bj.prototype.sb=function(){return this.N};function hj(b,c,d){bj.call(this,b,c,d);this.o=this.r=null;this.q=this.p=this.n=this.k=this.i=this.j=this.v=this.l=this.h=this.g=this.e=void 0}
O(hj,bj);hj.prototype.qb=function(b,c){if(null!==this.o){dj(this,c);var d=b.a,e=this.c.length,d=cj(this,d,0,d.length,b.b,!1);this.b.push([4,e,d,this.o,this.e,this.g,this.h,this.l,this.v,this.j,this.i,this.k,this.n,this.p,this.q]);this.a.push([4,e,d,this.r,this.e,this.g,this.h,this.l,this.v,this.j,this.i,this.k,this.n,this.p,this.q]);gj(this,c)}};
hj.prototype.ob=function(b,c){if(null!==this.o){dj(this,c);var d=b.a,e=this.c.length,d=cj(this,d,0,d.length,b.b,!1);this.b.push([4,e,d,this.o,this.e,this.g,this.h,this.l,this.v,this.j,this.i,this.k,this.n,this.p,this.q]);this.a.push([4,e,d,this.r,this.e,this.g,this.h,this.l,this.v,this.j,this.i,this.k,this.n,this.p,this.q]);gj(this,c)}};hj.prototype.Xa=function(){fj(this);this.g=this.e=void 0;this.o=this.r=null;this.q=this.p=this.k=this.i=this.j=this.v=this.l=this.n=this.h=void 0};
hj.prototype.Db=function(b){var c=b.rb(),d=b.Cb(),e=b.Zb(1),f=b.G(1),g=b.Bb();this.e=c[0];this.g=c[1];this.r=e;this.o=f;this.h=d[1];this.l=b.l;this.v=g[0];this.j=g[1];this.i=b.v;this.k=b.H();this.n=b.Ya;this.p=b.j;this.q=d[0]};function ij(b,c,d){bj.call(this,b,c,d);this.e={Aa:void 0,va:void 0,wa:null,xa:void 0,ya:void 0,za:void 0,yb:0,strokeStyle:void 0,lineCap:void 0,lineDash:null,lineJoin:void 0,lineWidth:void 0,miterLimit:void 0}}O(ij,bj);
function jj(b,c,d,e,f){var g=b.c.length;c=cj(b,c,d,e,f,!1);g=[8,g,c];b.b.push(g);b.a.push(g);return e}l=ij.prototype;l.sb=function(){null===this.d&&(this.d=Jc(this.N),0<this.f&&Ic(this.d,this.resolution*(this.f+1)/2,this.d));return this.d};
function kj(b){var c=b.e,d=c.strokeStyle,e=c.lineCap,f=c.lineDash,g=c.lineJoin,h=c.lineWidth,k=c.miterLimit;c.Aa==d&&c.va==e&&Pa(c.wa,f)&&c.xa==g&&c.ya==h&&c.za==k||(c.yb!=b.c.length&&(b.b.push([12]),c.yb=b.c.length),b.b.push([10,d,h,e,g,k,f],[1]),c.Aa=d,c.va=e,c.wa=f,c.xa=g,c.ya=h,c.za=k)}
l.mb=function(b,c){var d=this.e,e=d.lineWidth;v(d.strokeStyle)&&v(e)&&(kj(this),dj(this,c),this.a.push([10,d.strokeStyle,d.lineWidth,d.lineCap,d.lineJoin,d.miterLimit,d.lineDash],[1]),d=b.a,jj(this,d,0,d.length,b.b),this.a.push([12]),gj(this,c))};
l.nb=function(b,c){var d=this.e,e=d.lineWidth;if(v(d.strokeStyle)&&v(e)){kj(this);dj(this,c);this.a.push([10,d.strokeStyle,d.lineWidth,d.lineCap,d.lineJoin,d.miterLimit,d.lineDash],[1]);var d=b.d,e=b.a,f=b.b,g=0,h,k;h=0;for(k=d.length;h<k;++h)g=jj(this,e,g,d[h],f);this.a.push([12]);gj(this,c)}};l.Xa=function(){this.e.yb!=this.c.length&&this.b.push([12]);fj(this);this.e=null};
l.ga=function(b,c){var d=c.D();this.e.strokeStyle=Hd(null===d?hi:d);d=c.ca;this.e.lineCap=v(d)?d:"round";d=c.getLineDash();this.e.lineDash=null===d?gi:d;d=c.da;this.e.lineJoin=v(d)?d:"round";d=c.B();this.e.lineWidth=v(d)?d:1;d=c.ea;this.e.miterLimit=v(d)?d:10;this.e.lineWidth>this.f&&(this.f=this.e.lineWidth,this.d=null)};
function lj(b,c,d){bj.call(this,b,c,d);this.e={Nb:void 0,Aa:void 0,va:void 0,wa:null,xa:void 0,ya:void 0,za:void 0,fillStyle:void 0,strokeStyle:void 0,lineCap:void 0,lineDash:null,lineJoin:void 0,lineWidth:void 0,miterLimit:void 0}}O(lj,bj);
function mj(b,c,d,e,f){var g=b.e,h=[1];b.b.push(h);b.a.push(h);var k,h=0;for(k=e.length;h<k;++h){var m=e[h],n=b.c.length;d=cj(b,c,d,m,f,!0);d=[8,n,d];n=[3];b.b.push(d,n);b.a.push(d,n);d=m}c=[7];b.a.push(c);v(g.fillStyle)&&b.b.push(c);v(g.strokeStyle)&&(g=[12],b.b.push(g),b.a.push(g));return d}l=lj.prototype;
l.lb=function(b,c){var d=this.e,e=d.strokeStyle;if(v(d.fillStyle)||v(e)){nj(this);dj(this,c);this.a.push([9,Hd(fi)]);v(d.strokeStyle)&&this.a.push([10,d.strokeStyle,d.lineWidth,d.lineCap,d.lineJoin,d.miterLimit,d.lineDash]);var f=b.a,e=this.c.length;cj(this,f,0,f.length,b.b,!1);f=[1];e=[2,e];this.b.push(f,e);this.a.push(f,e);e=[7];this.a.push(e);v(d.fillStyle)&&this.b.push(e);v(d.strokeStyle)&&(d=[12],this.b.push(d),this.a.push(d));gj(this,c)}};
l.Ma=function(b,c){var d=this.e,e=d.strokeStyle;if(v(d.fillStyle)||v(e))nj(this),dj(this,c),this.a.push([9,Hd(fi)]),v(d.strokeStyle)&&this.a.push([10,d.strokeStyle,d.lineWidth,d.lineCap,d.lineJoin,d.miterLimit,d.lineDash]),d=b.d,e=Ph(b),mj(this,e,0,d,b.b),gj(this,c)};
l.pb=function(b,c){var d=this.e,e=d.strokeStyle;if(v(d.fillStyle)||v(e)){nj(this);dj(this,c);this.a.push([9,Hd(fi)]);v(d.strokeStyle)&&this.a.push([10,d.strokeStyle,d.lineWidth,d.lineCap,d.lineJoin,d.miterLimit,d.lineDash]);var d=b.d,e=Yi(b),f=b.b,g=0,h,k;h=0;for(k=d.length;h<k;++h)g=mj(this,e,g,d[h],f);gj(this,c)}};l.Xa=function(){fj(this);this.e=null;var b=this.ia;if(0!==b){var c=this.c,d,e;d=0;for(e=c.length;d<e;++d)c[d]=b*Math.round(c[d]/b)}};
l.sb=function(){null===this.d&&(this.d=Jc(this.N),0<this.f&&Ic(this.d,this.resolution*(this.f+1)/2,this.d));return this.d};
l.ga=function(b,c){var d=this.e;if(null===b)d.fillStyle=void 0;else{var e=b.D();d.fillStyle=Hd(null===e?fi:e)}null===c?(d.strokeStyle=void 0,d.lineCap=void 0,d.lineDash=null,d.lineJoin=void 0,d.lineWidth=void 0,d.miterLimit=void 0):(e=c.D(),d.strokeStyle=Hd(null===e?hi:e),e=c.ca,d.lineCap=v(e)?e:"round",e=c.getLineDash(),d.lineDash=null===e?gi:e.slice(),e=c.da,d.lineJoin=v(e)?e:"round",e=c.B(),d.lineWidth=v(e)?e:1,e=c.ea,d.miterLimit=v(e)?e:10,d.lineWidth>this.f&&(this.f=d.lineWidth,this.d=null))};
function nj(b){var c=b.e,d=c.fillStyle,e=c.strokeStyle,f=c.lineCap,g=c.lineDash,h=c.lineJoin,k=c.lineWidth,m=c.miterLimit;v(d)&&c.Nb!=d&&(b.b.push([9,d]),c.Nb=c.fillStyle);!v(e)||c.Aa==e&&c.va==f&&c.wa==g&&c.xa==h&&c.ya==k&&c.za==m||(b.b.push([10,e,k,f,h,m,g]),c.Aa=e,c.va=f,c.wa=g,c.xa=h,c.ya=k,c.za=m)}function oj(b,c,d){bj.call(this,b,c,d);this.p=this.n=this.k=null;this.o="";this.i=this.j=this.v=this.l=0;this.h=this.g=this.e=null}O(oj,bj);
function pj(b,c,d,e,f){if(""!==b.o&&null!==b.h&&(null!==b.e||null!==b.g)){if(null!==b.e){var g=b.e,h=b.k;if(null===h||h.fillStyle!=g.fillStyle){var k=[9,g.fillStyle];b.b.push(k);b.a.push(k);null===h?b.k={fillStyle:g.fillStyle}:h.fillStyle=g.fillStyle}}null!==b.g&&(g=b.g,h=b.n,null===h||h.lineCap!=g.lineCap||h.lineDash!=g.lineDash||h.lineJoin!=g.lineJoin||h.lineWidth!=g.lineWidth||h.miterLimit!=g.miterLimit||h.strokeStyle!=g.strokeStyle)&&(k=[10,g.strokeStyle,g.lineWidth,g.lineCap,g.lineJoin,g.miterLimit,
g.lineDash,!1],b.b.push(k),b.a.push(k),null===h?b.n={lineCap:g.lineCap,lineDash:g.lineDash,lineJoin:g.lineJoin,lineWidth:g.lineWidth,miterLimit:g.miterLimit,strokeStyle:g.strokeStyle}:(h.lineCap=g.lineCap,h.lineDash=g.lineDash,h.lineJoin=g.lineJoin,h.lineWidth=g.lineWidth,h.miterLimit=g.miterLimit,h.strokeStyle=g.strokeStyle));g=b.h;h=b.p;if(null===h||h.font!=g.font||h.textAlign!=g.textAlign||h.textBaseline!=g.textBaseline)k=[11,g.font,g.textAlign,g.textBaseline],b.b.push(k),b.a.push(k),null===h?
b.p={font:g.font,textAlign:g.textAlign,textBaseline:g.textBaseline}:(h.font=g.font,h.textAlign=g.textAlign,h.textBaseline=g.textBaseline);dj(b,f);g=b.c.length;c=cj(b,c,0,d,e,!1);c=[5,g,c,b.o,b.l,b.v,b.j,b.i,null!==b.e,null!==b.g];b.b.push(c);b.a.push(c);gj(b,f)}}
oj.prototype.Z=function(b){if(null===b)this.o="";else{var c=b.aa();null===c?this.e=null:(c=c.D(),c=Hd(null===c?fi:c),null===this.e?this.e={fillStyle:c}:this.e.fillStyle=c);var d=b.S();if(null===d)this.g=null;else{var c=d.D(),e=d.ca,f=d.getLineDash(),g=d.da,h=d.B(),d=d.ea,e=v(e)?e:"round",f=null!=f?f.slice():gi,g=v(g)?g:"round",h=v(h)?h:1,d=v(d)?d:10,c=Hd(null===c?hi:c);if(null===this.g)this.g={lineCap:e,lineDash:f,lineJoin:g,lineWidth:h,miterLimit:d,strokeStyle:c};else{var k=this.g;k.lineCap=e;k.lineDash=
f;k.lineJoin=g;k.lineWidth=h;k.miterLimit=d;k.strokeStyle=c}}var m=b.zc(),c=b.Ac(),e=b.Bc(),f=b.H(),h=b.Ya,d=b.V,g=b.Cc(),k=b.Dc();b=v(m)?m:"10px sans-serif";g=v(g)?g:"center";k=v(k)?k:"middle";null===this.h?this.h={font:b,textAlign:g,textBaseline:k}:(m=this.h,m.font=b,m.textAlign=g,m.textBaseline=k);this.o=v(d)?d:"";this.l=v(c)?c:0;this.v=v(e)?e:0;this.j=v(f)?f:0;this.i=v(h)?h:1}};function qj(b,c,d,e){this.g=b;this.b=c;this.f=d;this.c=e;this.a={};this.e=Gf(1,1);this.d=Ec()}
function rj(b){for(var c in b.a){var d=b.a[c],e;for(e in d)d[e].Xa()}}function Rg(b,c,d,e,f,g){var h=b.d;Fg(h,.5,.5,1/d,-1/d,-e,-c[0],-c[1]);var k=b.e;k.clearRect(0,0,1,1);var m;v(b.c)&&(m=Lc(),Nc(m,c),Ic(m,d*b.c,m));return sj(b,k,h,e,f,function(b){if(0<k.getImageData(0,0,1,1).data[3]){if(b=g(b))return b;k.clearRect(0,0,1,1)}},m)}function tj(b,c,d){var e=v(c)?c.toString():"0";c=b.a[e];v(c)||(c={},b.a[e]=c);e=c[d];v(e)||(e=new uj[d](b.g,b.b,b.f),c[d]=e);return e}qj.prototype.T=function(){return $a(this.a)};
function vj(b,c,d,e,f,g){var h=Fa(Za(b.a),Number);Na(h);var k=b.b,m=k[0],n=k[1],r=k[2],k=k[3],m=[m,n,m,k,r,k,r,n];yh(m,0,8,2,e,m);c.save();c.beginPath();c.moveTo(m[0],m[1]);c.lineTo(m[2],m[3]);c.lineTo(m[4],m[5]);c.lineTo(m[6],m[7]);c.closePath();c.clip();for(var q,u,m=0,n=h.length;m<n;++m)for(q=b.a[h[m].toString()],r=0,k=aj.length;r<k;++r)u=q[aj[r]],v(u)&&ej(u,c,d,e,f,g,u.b,void 0);c.restore()}
function sj(b,c,d,e,f,g,h){var k=Fa(Za(b.a),Number);Na(k,function(b,c){return c-b});var m,n,r,q,u;m=0;for(n=k.length;m<n;++m)for(q=b.a[k[m].toString()],r=aj.length-1;0<=r;--r)if(u=q[aj[r]],v(u)&&(u=ej(u,c,1,d,e,f,u.a,g,h)))return u}var uj={Image:hj,LineString:ij,Polygon:lj,Text:oj};function wj(b){Hg.call(this,b);this.r=Ec()}O(wj,Hg);
wj.prototype.j=function(b,c,d){xj(this,"precompose",d,b,void 0);var e=this.G();if(null!==e){var f=c.extent,g=v(f);if(g){var h=b.pixelRatio,k=[f[0],f[3]],m=[f[2],f[3]],n=[f[2],f[1]],f=[f[0],f[1]];Gg(b.coordinateToPixelMatrix,k,k);Gg(b.coordinateToPixelMatrix,m,m);Gg(b.coordinateToPixelMatrix,n,n);Gg(b.coordinateToPixelMatrix,f,f);d.save();d.beginPath();d.moveTo(k[0]*h,k[1]*h);d.lineTo(m[0]*h,m[1]*h);d.lineTo(n[0]*h,n[1]*h);d.lineTo(f[0]*h,f[1]*h);d.clip()}h=this.n;k=d.globalAlpha;d.globalAlpha=c.opacity;
0===b.viewState.rotation?(c=h[13],m=e.width*h[0],n=e.height*h[5],d.drawImage(e,0,0,+e.width,+e.height,Math.round(h[12]),Math.round(c),Math.round(m),Math.round(n))):(d.setTransform(h[0],h[1],h[4],h[5],h[12],h[13]),d.drawImage(e,0,0),d.setTransform(1,0,0,1,0,0));d.globalAlpha=k;g&&d.restore()}xj(this,"postcompose",d,b,void 0)};function xj(b,c,d,e,f){var g=b.b;sc(g,c)&&(b=v(f)?f:yj(b,e,0),b=new Oi(d,e.pixelRatio,e.extent,b,e.viewState.rotation),W(g,new Rh(c,g,b,0,e,d,null)),$i(b))}
function yj(b,c,d){var e=c.viewState,f=c.pixelRatio;return Fg(b.r,f*c.size[0]/2,f*c.size[1]/2,f/e.resolution,-f/e.resolution,-e.rotation,-e.center[0]+d,-e.center[1])}var zj=function(){var b=null,c=null;return function(d){if(null===b){b=Gf(1,1);c=b.createImageData(1,1);var e=c.data;e[0]=42;e[1]=84;e[2]=126;e[3]=255}var e=b.canvas,f=d[0]<=e.width&&d[1]<=e.height;f||(e.width=d[0],e.height=d[1],e=d[0]-1,d=d[1]-1,b.putImageData(c,e,d),d=b.getImageData(e,d,1,1),f=Pa(c.data,d.data));return f}}();function Aj(b){xh.call(this);this.a=v(b)?b:null;Bj(this)}O(Aj,xh);function Cj(b){var c,d;if(null!==b.a)for(c=0,d=b.a.length;c<d;++c)mc(b.a[c],"change",b.c,!1,b)}function Bj(b){var c,d;if(null!==b.a)for(c=0,d=b.a.length;c<d;++c)T(b.a[c],"change",b.c,!1,b)}l=Aj.prototype;l.clone=function(){var b=new Aj(null),c=this.a,d=[],e,f;e=0;for(f=c.length;e<f;++e)d.push(c[e].clone());Cj(b);b.a=d;Bj(b);b.c();return b};
l.jb=function(b){Hc(Infinity,Infinity,-Infinity,-Infinity,b);for(var c=this.a,d=0,e=c.length;d<e;++d){var f=b,g=c[d].w();g[0]<f[0]&&(f[0]=g[0]);g[2]>f[2]&&(f[2]=g[2]);g[1]<f[1]&&(f[1]=g[1]);g[3]>f[3]&&(f[3]=g[3])}return b};
l.ub=function(b){this.k!=this.e&&(ab(this.g),this.h=0,this.k=this.e);if(0>b||0!==this.h&&b<this.h)return this;var c=b.toString();if(this.g.hasOwnProperty(c))return this.g[c];var d=[],e=this.a,f=!1,g,h;g=0;for(h=e.length;g<h;++g){var k=e[g],m=k.ub(b);d.push(m);m!==k&&(f=!0)}if(f)return b=new Aj(null),Cj(b),b.a=d,Bj(b),b.c(),this.g[c]=b;this.h=b;return this};l.Y=function(){return"GeometryCollection"};l.T=function(){return 0==this.a.length};
l.fb=function(b){var c=this.a,d,e;d=0;for(e=c.length;d<e;++d)c[d].fb(b);this.c()};l.u=function(){Cj(this);Aj.C.u.call(this)};function Dj(b,c,d,e,f){var g=NaN,h=NaN,k=(d-c)/e;if(0!==k)if(1==k)g=b[c],h=b[c+1];else if(2==k)g=.5*b[c]+.5*b[c+e],h=.5*b[c+1]+.5*b[c+e+1];else{var h=b[c],k=b[c+1],m=0,g=[0],n;for(n=c+e;n<d;n+=e){var r=b[n],q=b[n+1],m=m+Math.sqrt((r-h)*(r-h)+(q-k)*(q-k));g.push(m);h=r;k=q}d=.5*m;for(var h=Oa,k=0,m=g.length,u;k<m;)n=k+m>>1,r=h(d,g[n]),0<r?k=n+1:(m=n,u=!r);h=u?k:~k;0>h?(u=(d-g[-h-2])/(g[-h-1]-g[-h-2]),c+=(-h-2)*e,g=b[c],g=g+u*(b[c+e]-g),d=b[c+1],h=d+u*(b[c+e+1]-d)):(g=b[c+h*e],h=b[c+h*e+1])}return null!=
f?(f[0]=g,f[1]=h,f):[g,h]};function Ej(b,c){zh.call(this);this.d=null;this.i=-1;null===b?Bh(this,"XY",null):(Ch(this,c,b,1),null===this.a&&(this.a=[]),this.a.length=Dh(this.a,0,b,this.b));this.c()}O(Ej,zh);Ej.prototype.clone=function(){var b=new Ej(null);Bh(b,this.f,this.a.slice());b.c();return b};Ej.prototype.q=function(){var b=this.a,c=this.a.length,d=this.b,e=v(void 0)?void 0:[],f=0,g;for(g=0;g<c;g+=d)e[f++]=b.slice(g,g+d);e.length=f;return e};
function Wi(b){b.i!=b.e&&(b.d=Dj(b.a,0,b.a.length,b.b,b.d),b.i=b.e);return b.d}Ej.prototype.j=function(b){var c=[];c.length=Fh(this.a,0,this.a.length,this.b,b,c,0);b=new Ej(null);Bh(b,"XY",c);b.c();return b};Ej.prototype.Y=function(){return"LineString"};function Fj(b,c){zh.call(this);this.d=[];if(null===b){var d=this.d;Bh(this,"XY",null);this.d=d}else Ch(this,c,b,2),null===this.a&&(this.a=[]),d=Eh(this.a,0,b,this.b,this.d),this.a.length=0===d.length?0:d[d.length-1];this.c()}O(Fj,zh);Fj.prototype.clone=function(){var b=new Fj(null),c=this.d.slice();Bh(b,this.f,this.a.slice());b.d=c;b.c();return b};function Xi(b){var c=[],d=b.a,e=0,f=b.d;b=b.b;var g,h;g=0;for(h=f.length;g<h;++g){var k=f[g],e=Dj(d,e,k,b);Ka(c,e);e=k}return c}
Fj.prototype.j=function(b){var c=[],d=[],e=this.a,f=this.d,g=this.b,h=0,k=0,m,n;m=0;for(n=f.length;m<n;++m){var r=f[m],k=Fh(e,h,r,g,b,c,k);d.push(k);h=r}c.length=k;b=new Fj(null);Bh(b,"XY",c);b.d=d;b.c();return b};Fj.prototype.Y=function(){return"MultiLineString"};function Gj(b,c){zh.call(this);null===b?Bh(this,"XY",null):(Ch(this,c,b,1),null===this.a&&(this.a=[]),this.a.length=Dh(this.a,0,b,this.b));this.c()}O(Gj,zh);Gj.prototype.clone=function(){var b=new Gj(null);Bh(b,this.f,this.a.slice());b.c();return b};Gj.prototype.Y=function(){return"MultiPoint"};function Hj(b,c){zh.call(this);this.d=[];this.q=-1;this.t=null;this.r=-1;this.i=null;if(null===b){var d=this.d;Bh(this,"XY",null);this.d=d}else{Ch(this,c,b,3);null===this.a&&(this.a=[]);var d=this.a,e=this.b,f=this.d,g=0,f=v(f)?f:[],h=0,k,m;k=0;for(m=b.length;k<m;++k)g=Eh(d,g,b[k],e,f[h]),f[h++]=g,g=g[g.length-1];f.length=h;0===f.length?this.a.length=0:(d=f[f.length-1],this.a.length=0===d.length?0:d[d.length-1])}this.c()}O(Hj,zh);
Hj.prototype.clone=function(){var b=new Hj(null),c=this.d.slice();Bh(b,this.f,this.a.slice());b.d=c;b.c();return b};function Zi(b){if(b.q!=b.e){var c=b.a,d=b.d,e=b.b,f=0,g=[],h,k,m=Lc();h=0;for(k=d.length;h<k;++h){var n=d[h],m=Oc(Hc(Infinity,Infinity,-Infinity,-Infinity,void 0),c,f,n[0],e);g.push((m[0]+m[2])/2,(m[1]+m[3])/2);f=n[n.length-1]}c=Yi(b);d=b.d;e=b.b;f=0;h=[];k=0;for(m=d.length;k<m;++k)n=d[k],h=Jh(c,f,n,e,g,2*k,h),f=n[n.length-1];b.t=h;b.q=b.e}return b.t}
function Yi(b){if(b.r!=b.e){var c=b.a,d;a:{d=b.d;var e,f;e=0;for(f=d.length;e<f;++e)if(!Lh(c,d[e],b.b,void 0)){d=!1;break a}d=!0}if(d)b.i=c;else{b.i=c.slice();d=c=b.i;e=b.d;f=b.b;var g=0,h,k;h=0;for(k=e.length;h<k;++h)g=Mh(d,g,e[h],f,void 0);c.length=g}b.r=b.e}return b.i}
Hj.prototype.j=function(b){var c=[],d=[],e=this.a,f=this.d,g=this.b;b=Math.sqrt(b);var h=0,k=0,m,n;m=0;for(n=f.length;m<n;++m){var r=f[m],q=[],k=Gh(e,h,r,g,b,c,k,q);d.push(q);h=r[r.length-1]}c.length=k;e=new Hj(null);Bh(e,"XY",c);e.d=d;e.c();return e};Hj.prototype.Y=function(){return"MultiPolygon"};function Ij(b,c){return M(b)-M(c)}
var Jj={Point:function(b,c,d,e){var f=d.G();if(null!==f){if(2!=f.Za())return;var g=tj(b,d.a,"Image");g.Db(f);g.qb(c,e)}f=d.V;null!==f&&(b=tj(b,d.a,"Text"),b.Z(f),pj(b,null===c.a?[]:c.a.slice(),2,2,e))},LineString:function(b,c,d,e){var f=d.S();if(null!==f){var g=tj(b,d.a,"LineString");g.ga(null,f);g.mb(c,e)}f=d.V;null!==f&&(b=tj(b,d.a,"Text"),b.Z(f),pj(b,Wi(c),2,2,e))},Polygon:function(b,c,d,e){var f=d.aa(),g=d.S();if(null!==f||null!==g){var h=tj(b,d.a,"Polygon");h.ga(f,g);h.Ma(c,e)}f=d.V;null!==f&&
(b=tj(b,d.a,"Text"),b.Z(f),pj(b,Oh(c),2,2,e))},MultiPoint:function(b,c,d,e){var f=d.G();if(null!==f){if(2!=f.Za())return;var g=tj(b,d.a,"Image");g.Db(f);g.ob(c,e)}f=d.V;null!==f&&(b=tj(b,d.a,"Text"),b.Z(f),d=c.a,pj(b,d,d.length,c.b,e))},MultiLineString:function(b,c,d,e){var f=d.S();if(null!==f){var g=tj(b,d.a,"LineString");g.ga(null,f);g.nb(c,e)}f=d.V;null!==f&&(b=tj(b,d.a,"Text"),b.Z(f),c=Xi(c),pj(b,c,c.length,2,e))},MultiPolygon:function(b,c,d,e){var f=d.aa(),g=d.S();if(null!==g||null!==f){var h=
tj(b,d.a,"Polygon");h.ga(f,g);h.pb(c,e)}f=d.V;null!==f&&(b=tj(b,d.a,"Text"),b.Z(f),c=Zi(c),pj(b,c,c.length,2,e))},GeometryCollection:function(b,c,d,e){c=c.a;var f,g;f=0;for(g=c.length;f<g;++f)(0,Jj[c[f].Y()])(b,c[f],d,e)},Circle:function(b,c,d,e){var f=d.aa(),g=d.S();if(null!==f||null!==g){var h=tj(b,d.a,"Polygon");h.ga(f,g);h.lb(c,e)}f=d.V;null!==f&&(b=tj(b,d.a,"Text"),b.Z(f),pj(b,c.d(),2,2,e))}};function Kj(b,c,d){if(ga(b))d&&(b=N(b,d));else if(b&&"function"==typeof b.handleEvent)b=N(b.handleEvent,b);else throw Error("Invalid listener argument");return 2147483647<c?-1:p.setTimeout(b,c||0)};var Lj=p.JSON.parse;function Mj(){}Mj.prototype.a=null;function Nj(b){var c;(c=b.a)||(c={},Oj(b)&&(c[0]=!0,c[1]=!0),c=b.a=c);return c};var Pj;function Qj(){}O(Qj,Mj);function Rj(b){return(b=Oj(b))?new ActiveXObject(b):new XMLHttpRequest}function Oj(b){if(!b.b&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var c=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],d=0;d<c.length;d++){var e=c[d];try{return new ActiveXObject(e),b.b=e}catch(f){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return b.b}Pj=new Qj;var Sj=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function Tj(b){if(Uj){Uj=!1;var c=p.location;if(c){var d=c.href;if(d&&(d=(d=Tj(d)[3]||null)?decodeURI(d):d)&&d!=c.hostname)throw Uj=!0,Error();}}return b.match(Sj)}var Uj=jb;function Vj(b){V.call(this);this.p=new gf;this.h=b||null;this.a=!1;this.g=this.s=null;this.d=this.i="";this.b=this.j=this.e=this.l=!1;this.f=0;this.c=null;this.k=Wj;this.n=this.q=!1}O(Vj,V);var Wj="",Xj=/^https?$/i,Yj=["POST","PUT"];l=Vj.prototype;
l.send=function(b,c,d,e){if(this.s)throw Error("[goog.net.XhrIo] Object is active with another request="+this.i+"; newUri="+b);c=c?c.toUpperCase():"GET";this.i=b;this.d="";this.l=!1;this.a=!0;this.s=this.h?Rj(this.h):Rj(Pj);this.g=this.h?Nj(this.h):Nj(Pj);this.s.onreadystatechange=N(this.bc,this);try{this.j=!0,this.s.open(c,String(b),!0),this.j=!1}catch(f){Zj(this,f);return}b=d||"";var g=this.p.clone();e&&ff(e,function(b,c){g.set(c,b)});e=Ga(g.ka());d=p.FormData&&b instanceof p.FormData;!(0<=Da.indexOf.call(Yj,
c,void 0))||e||d||g.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");g.forEach(function(b,c){this.s.setRequestHeader(c,b)},this);this.k&&(this.s.responseType=this.k);"withCredentials"in this.s&&(this.s.withCredentials=this.q);try{ak(this),0<this.f&&((this.n=bk(this.s))?(this.s.timeout=this.f,this.s.ontimeout=N(this.gc,this)):this.c=Kj(this.gc,this.f,this)),this.e=!0,this.s.send(b),this.e=!1}catch(h){Zj(this,h)}};function bk(b){return R&&qb(9)&&fa(b.timeout)&&v(b.ontimeout)}
function Ha(b){return"content-type"==b.toLowerCase()}l.gc=function(){"undefined"!=typeof aa&&this.s&&(this.d="Timed out after "+this.f+"ms, aborting",W(this,"timeout"),this.s&&this.a&&(this.a=!1,this.b=!0,this.s.abort(),this.b=!1,W(this,"complete"),W(this,"abort"),ck(this)))};function Zj(b,c){b.a=!1;b.s&&(b.b=!0,b.s.abort(),b.b=!1);b.d=c;dk(b);ck(b)}function dk(b){b.l||(b.l=!0,W(b,"complete"),W(b,"error"))}
l.u=function(){this.s&&(this.a&&(this.a=!1,this.b=!0,this.s.abort(),this.b=!1),ck(this,!0));Vj.C.u.call(this)};l.bc=function(){this.v||(this.j||this.e||this.b?ek(this):this.sd())};l.sd=function(){ek(this)};
function ek(b){if(b.a&&"undefined"!=typeof aa&&(!b.g[1]||4!=fk(b)||2!=gk(b)))if(b.e&&4==fk(b))Kj(b.bc,0,b);else if(W(b,"readystatechange"),4==fk(b)){b.a=!1;try{if(hk(b))W(b,"complete"),W(b,"success");else{var c;try{c=2<fk(b)?b.s.statusText:""}catch(d){c=""}b.d=c+" ["+gk(b)+"]";dk(b)}}finally{ck(b)}}}function ck(b,c){if(b.s){ak(b);var d=b.s,e=b.g[0]?ba:null;b.s=null;b.g=null;c||W(b,"ready");try{d.onreadystatechange=e}catch(f){}}}
function ak(b){b.s&&b.n&&(b.s.ontimeout=null);fa(b.c)&&(p.clearTimeout(b.c),b.c=null)}function hk(b){var c=gk(b),d;a:switch(c){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:d=!0;break a;default:d=!1}if(!d){if(c=0===c)b=Tj(String(b.i))[1]||null,!b&&self.location&&(b=self.location.protocol,b=b.substr(0,b.length-1)),c=!Xj.test(b?b.toLowerCase():"");d=c}return d}function fk(b){return b.s?b.s.readyState:0}function gk(b){try{return 2<fk(b)?b.s.status:-1}catch(c){return-1}};a:if(!document.implementation||!document.implementation.createDocument){if("undefined"!=typeof ActiveXObject){var ik=new ActiveXObject("MSXML2.DOMDocument");if(ik){ik.resolveExternals=!1;ik.validateOnParse=!1;try{ik.setProperty("ProhibitDTD",!0),ik.setProperty("MaxXMLSize",2048),ik.setProperty("MaxElementDepth",256)}catch(jk){}}if(ik)break a}throw Error("Your browser does not support creating new documents");};function kk(b,c,d){return function(e,f,g){e=new Vj;e.k="text";T(e,"complete",function(b){b=b.target;if(hk(b)){var e;try{e=b.s?b.s.responseText:""}catch(f){e=""}null!=e&&(e=c.b(e,{featureProjection:g}),d.call(this,e))}Mb(b)},!1,this);e.send(b)}}function lk(b,c){return kk(b,c,function(b){this.Lb(b)})};function mk(){return[[-Infinity,-Infinity,Infinity,Infinity]]};var nk;
(function(){var b={Ob:{}};(function(){function c(b,d){if(!(this instanceof c))return new c(b,d);this.cb=Math.max(4,b||9);this.Jb=Math.max(2,Math.ceil(.4*this.cb));d&&this.sc(d);this.clear()}function d(b,c){b.bbox=e(b,0,b.children.length,c)}function e(b,c,d,e){for(var g=[Infinity,Infinity,-Infinity,-Infinity],h;c<d;c++)h=b.children[c],f(g,b.F?e(h):h.bbox);return g}function f(b,c){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[2]);b[3]=Math.max(b[3],c[3])}function g(b,c){return b.bbox[0]-
c.bbox[0]}function h(b,c){return b.bbox[1]-c.bbox[1]}function k(b){return(b[2]-b[0])*(b[3]-b[1])}function m(b){return b[2]-b[0]+(b[3]-b[1])}function n(b,c){return b[0]<=c[0]&&b[1]<=c[1]&&c[2]<=b[2]&&c[3]<=b[3]}function r(b,c){return c[0]<=b[2]&&c[1]<=b[3]&&c[2]>=b[0]&&c[3]>=b[1]}function q(b,c,d,e,f){for(var g=[c,d],h;g.length;)d=g.pop(),c=g.pop(),d-c<=e||(h=c+Math.ceil((d-c)/e/2)*e,u(b,c,d,h,f),g.push(c,h,h,d))}function u(b,c,d,e,f){for(var g,h,k,m,n;d>c;){600<d-c&&(g=d-c+1,h=e-c+1,k=Math.log(g),
m=.5*Math.exp(2*k/3),n=.5*Math.sqrt(k*m*(g-m)/g)*(0>h-g/2?-1:1),k=Math.max(c,Math.floor(e-h*m/g+n)),h=Math.min(d,Math.floor(e+(g-h)*m/g+n)),u(b,k,h,e,f));g=b[e];h=c;m=d;t(b,c,e);for(0<f(b[d],g)&&t(b,c,d);h<m;){t(b,h,m);h++;for(m--;0>f(b[h],g);)h++;for(;0<f(b[m],g);)m--}0===f(b[c],g)?t(b,c,m):(m++,t(b,m,d));m<=e&&(c=m+1);e<=m&&(d=m-1)}}function t(b,c,d){var e=b[c];b[c]=b[d];b[d]=e}c.prototype={all:function(){return this.Fb(this.data,[])},search:function(b){var c=this.data,d=[],e=this.J;if(!r(b,c.bbox))return d;
for(var f=[],g,h,k,m;c;){g=0;for(h=c.children.length;g<h;g++)k=c.children[g],m=c.F?e(k):k.bbox,r(b,m)&&(c.F?d.push(k):n(b,m)?this.Fb(k,d):f.push(k));c=f.pop()}return d},load:function(b){if(!b||!b.length)return this;if(b.length<this.Jb){for(var c=0,d=b.length;c<d;c++)this.oa(b[c]);return this}b=this.Hb(b.slice(),0,b.length-1,0);this.data.children.length?this.data.height===b.height?this.Kb(this.data,b):(this.data.height<b.height&&(c=this.data,this.data=b,b=c),this.Ib(b,this.data.height-b.height-1,!0)):
this.data=b;return this},oa:function(b){b&&this.Ib(b,this.data.height-1);return this},clear:function(){this.data={children:[],height:1,bbox:[Infinity,Infinity,-Infinity,-Infinity],F:!0};return this},remove:function(b){if(!b)return this;for(var c=this.data,d=this.J(b),e=[],f=[],g,h,k,m;c||e.length;){c||(c=e.pop(),h=e[e.length-1],g=f.pop(),m=!0);if(c.F&&(k=c.children.indexOf(b),-1!==k)){c.children.splice(k,1);e.push(c);this.rc(e);break}m||c.F||!n(c.bbox,d)?h?(g++,c=h.children[g],m=!1):c=null:(e.push(c),
f.push(g),g=0,h=c,c=c.children[0])}return this},J:function(b){return b},hb:function(b,c){return b[0]-c[0]},ib:function(b,c){return b[1]-c[1]},toJSON:function(){return this.data},Fb:function(b,c){for(var d=[];b;)b.F?c.push.apply(c,b.children):d.push.apply(d,b.children),b=d.pop();return c},Hb:function(b,c,e,f){var g=e-c+1,h=this.cb,k;if(g<=h)return k={children:b.slice(c,e+1),height:1,bbox:null,F:!0},d(k,this.J),k;f||(f=Math.ceil(Math.log(g)/Math.log(h)),h=Math.ceil(g/Math.pow(h,f-1)));k={children:[],
height:f,bbox:null};var g=Math.ceil(g/h),h=g*Math.ceil(Math.sqrt(h)),m,n,r;for(q(b,c,e,h,this.hb);c<=e;c+=h)for(n=Math.min(c+h-1,e),q(b,c,n,g,this.ib),m=c;m<=n;m+=g)r=Math.min(m+g-1,n),k.children.push(this.Hb(b,m,r,f-1));d(k,this.J);return k},qc:function(b,c,d,e){for(var f,g,h,m,n,q,r,t;;){e.push(c);if(c.F||e.length-1===d)break;r=t=Infinity;f=0;for(g=c.children.length;f<g;f++){h=c.children[f];n=k(h.bbox);q=b;var u=h.bbox;q=(Math.max(u[2],q[2])-Math.min(u[0],q[0]))*(Math.max(u[3],q[3])-Math.min(u[1],
q[1]))-n;q<t?(t=q,r=n<r?n:r,m=h):q===t&&n<r&&(r=n,m=h)}c=m}return c},Ib:function(b,c,d){var e=this.J;d=d?b.bbox:e(b);var e=[],g=this.qc(d,this.data,c,e);g.children.push(b);for(f(g.bbox,d);0<=c;)if(e[c].children.length>this.cb)this.tc(e,c),c--;else break;this.nc(d,e,c)},tc:function(b,c){var e=b[c],f=e.children.length,g=this.Jb;this.oc(e,g,f);f={children:e.children.splice(this.pc(e,g,f)),height:e.height};e.F&&(f.F=!0);d(e,this.J);d(f,this.J);c?b[c-1].children.push(f):this.Kb(e,f)},Kb:function(b,c){this.data=
{children:[b,c],height:b.height+1};d(this.data,this.J)},pc:function(b,c,d){var f,g,h,m,n,q,r;n=q=Infinity;for(f=c;f<=d-c;f++){g=e(b,0,f,this.J);h=e(b,f,d,this.J);var t=g,u=h;m=Math.max(t[0],u[0]);var K=Math.max(t[1],u[1]),F=Math.min(t[2],u[2]),t=Math.min(t[3],u[3]);m=Math.max(0,F-m)*Math.max(0,t-K);g=k(g)+k(h);m<n?(n=m,r=f,q=g<q?g:q):m===n&&g<q&&(q=g,r=f)}return r},oc:function(b,c,d){var e=b.F?this.hb:g,f=b.F?this.ib:h,k=this.Gb(b,c,d,e);c=this.Gb(b,c,d,f);k<c&&b.children.sort(e)},Gb:function(b,c,
d,g){b.children.sort(g);g=this.J;var h=e(b,0,c,g),k=e(b,d-c,d,g),n=m(h)+m(k),q,r;for(q=c;q<d-c;q++)r=b.children[q],f(h,b.F?g(r):r.bbox),n+=m(h);for(q=d-c-1;q>=c;q--)r=b.children[q],f(k,b.F?g(r):r.bbox),n+=m(k);return n},nc:function(b,c,d){for(;0<=d;d--)f(c[d].bbox,b)},rc:function(b){for(var c=b.length-1,e;0<=c;c--)0===b[c].children.length?0<c?(e=b[c-1].children,e.splice(e.indexOf(b[c]),1)):this.clear():d(b[c],this.J)},sc:function(b){var c=["return a"," - b",";"];this.hb=new Function("a","b",c.join(b[0]));
this.ib=new Function("a","b",c.join(b[1]));this.J=new Function("a","return [a"+b.join(", a")+"];")}};"function"===typeof define&&define.Xd?define("rbush",function(){return c}):"undefined"!==typeof b?b.Ob=c:"undefined"!==typeof self?self.a=c:window.a=c})();nk=b.Ob})();function ok(b){this.b=nk(b);this.a={}}l=ok.prototype;l.oa=function(b,c){var d=[b[0],b[1],b[2],b[3],c];this.b.oa(d);this.a[M(c)]=d};l.load=function(b,c){for(var d=Array(c.length),e=0,f=c.length;e<f;e++){var g=b[e],h=c[e],g=[g[0],g[1],g[2],g[3],h];d[e]=g;this.a[M(h)]=g}this.b.load(d)};l.remove=function(b){b=M(b);var c=this.a[b];bb(this.a,b);return null!==this.b.remove(c)};function pk(b){b=b.b.all();return Fa(b,function(b){return b[4]})}
function qk(b,c){var d=b.b.search(c);return Fa(d,function(b){return b[4]})}l.forEach=function(b,c){return rk(pk(this),b,c)};function sk(b,c,d,e){return rk(qk(b,c),d,e)}function rk(b,c,d){for(var e,f=0,g=b.length;f<g&&!(e=c.call(d,b[f]));f++);return e}l.T=function(){return $a(this.a)};l.clear=function(){this.b.clear();this.a={}};l.w=function(){return this.b.data.bbox};function tk(b){b=v(b)?b:{};te.call(this,{attributions:b.attributions,logo:b.logo,projection:void 0,state:"ready",wrapX:v(b.wrapX)?b.wrapX:!0});this.j=ba;v(b.loader)?this.j=b.loader:v(b.url)&&(this.j=lk(b.url,b.format));this.t=v(b.strategy)?b.strategy:mk;this.b=new ok;this.i=new ok;this.d={};this.a={};this.f={};this.g={};v(b.features)&&uk(this,b.features)}O(tk,te);l=tk.prototype;l.Lb=function(b){uk(this,b);this.c()};
function uk(b,c){var d,e,f,g,h=[],k=[],m=[];e=0;for(f=c.length;e<f;e++){g=c[e];d=M(g).toString();var n=b,r=g,q=!0,u=r.f;v(u)?u.toString()in n.a?q=!1:n.a[u.toString()]=r:n.f[d]=r;q&&k.push(g)}e=0;for(f=k.length;e<f;e++)g=k[e],d=M(g).toString(),n=b,r=g,n.g[d]=[T(r,"change",n.Tb,!1,n),T(r,"propertychange",n.Tb,!1,n)],n=g.K(),null!=n?(n=n.w(),h.push(n),m.push(g)):b.d[d]=g;b.b.load(h,m);e=0;for(f=k.length;e<f;e++)W(b,new vk("addfeature",k[e]))}
l.clear=function(b){if(b){for(var c in this.g)P(this.g[c],U);this.g={};this.a={};this.f={}}else b=this.Bd,this.b.forEach(b,this),Va(this.d,b,this);this.b.clear();this.i.clear();this.d={};W(this,new vk("clear"));this.c()};function wk(b,c,d,e){sk(b.b,c,d,e)}l.w=function(){return this.b.w()};
l.Tb=function(b){b=b.target;var c=M(b).toString(),d=b.K();if(null!=d)if(d=d.w(),c in this.d)delete this.d[c],this.b.oa(d,b);else{var e=this.b,f=M(b);Mc(e.a[f].slice(0,4),d)||(e.remove(b),e.oa(d,b))}else c in this.d||(this.b.remove(b),this.d[c]=b);d=b.f;v(d)?(d=d.toString(),c in this.f?(delete this.f[c],this.a[d]=b):this.a[d]!==b&&(xk(this,b),this.a[d]=b)):c in this.f||(xk(this,b),this.f[c]=b);this.c();W(this,new vk("changefeature",b))};l.T=function(){return this.b.T()&&$a(this.d)};
function yk(b,c,d,e){var f=b.i;c=b.t(c,d);var g,h;g=0;for(h=c.length;g<h;++g){var k=c[g];sk(f,k,function(b){return Kc(b.extent,k)})||(b.j.call(b,k,d,e),f.oa(k,{extent:k.slice()}))}}l.Bd=function(b){var c=M(b).toString();P(this.g[c],U);delete this.g[c];var d=b.f;v(d)?delete this.a[d.toString()]:delete this.f[c];W(this,new vk("removefeature",b))};function xk(b,c){for(var d in b.a)if(b.a[d]===c){delete b.a[d];break}}function vk(b,c){S.call(this,b);this.feature=c}O(vk,S);function Ug(b){wj.call(this,b);this.a=this.f=null;this.h=!1;this.k=null;this.n=Ec();this.q=this.t=this.p=NaN;this.g=this.d=null;this.N=[0,0]}O(Ug,wj);Ug.prototype.G=function(){return this.f};
Ug.prototype.i=function(b,c){var d=b.pixelRatio,e=b.viewState,f=e.projection,g=this.b,h=Ue(g),k=Pe(h,f),m=Ie(k,e.resolution),n=Qe(h,m,f),r=n[0]/yc(He(k,m),this.N)[0],q=k.a[m],r=q/r,u=e.center,t;if(q==e.resolution){var w=b.size,u=[q*(Math.round(u[0]/q)+w[0]%2/2),q*(Math.round(u[1]/q)+w[1]%2/2)];t=Rc(u,q,e.rotation,b.size)}else t=b.extent;v(c.extent)&&(t=Sc(t,c.extent));if(t[2]<t[0]||t[3]<t[1])return!1;var z=Fe(k,t,q),B=n[0]*z.B(),w=n[1]*(z.b-z.e+1),y,x;null===this.f?(x=Gf(B,w),this.f=x.canvas,this.a=
[B,w],this.k=x,this.h=!zj(this.a)):(y=this.f,x=this.k,this.a[0]<B||this.a[1]<w||this.t!==n[0]||this.q!==n[1]||this.h&&(this.a[0]>B||this.a[1]>w)?(y.width=B,y.height=w,this.a=[B,w],this.h=!zj(this.a),this.d=null):(B=this.a[0],w=this.a[1],(y=m!=this.p)||(y=this.d,y=!(y.a<=z.a&&z.c<=y.c&&y.e<=z.e&&z.b<=y.b)),y&&(this.d=null)));var D,E;null===this.d?(B/=n[0],w/=n[1],D=z.a-Math.floor((B-z.B())/2),E=z.e-Math.floor((w-(z.b-z.e+1))/2),this.p=m,this.t=n[0],this.q=n[1],this.d=new yd(D,D+B-1,E,E+w-1),this.g=
Array(B*w),y=this.d):(y=this.d,B=y.B());var I={};I[m]={};var w=[],H=Ig(h,I),L=g.get("useInterimTilesOnError"),J=Lc(),C=new yd(0,0,0,0),K,F,Y;for(E=z.a;E<=z.c;++E)for(Y=z.e;Y<=z.b;++Y)F=zk(h,m,E,Y,d,f),D=F.I(),2==D||4==D||3==D&&!L?I[m][xd(F.a)]=F:(K=k.h(F.a,H,null,C,J),K||(w.push(F),K=k.o(F.a,C,J),null===K||H(m+1,K)));H=0;for(K=w.length;H<K;++H)F=w[H],E=n[0]*(F.a[1]-y.a),Y=n[1]*(y.b-F.a[2]),x.clearRect(E,Y,n[0],n[1]);var sa=Fa(Za(I),Number);Na(sa);var Ba=h.t,w=De(k,[m,y.a,y.b],J),w=[w[0],w[3]],Q,Ca,
la,Tc,Nb,Df,H=0;for(K=sa.length;H<K;++H)if(Q=sa[H],n=Qe(h,Q,f),Tc=I[Q],Q==m)for(la in Tc)F=Tc[la],Ca=(F.a[2]-y.e)*B+(F.a[1]-y.a),this.g[Ca]!=F&&(E=n[0]*(F.a[1]-y.a),Y=n[1]*(y.b-F.a[2]),D=F.I(),4!=D&&(3!=D||L)&&Ba||x.clearRect(E,Y,n[0],n[1]),2==D&&x.drawImage(F.G(),0,0,n[0],n[1],E,Y,n[0],n[1]),this.g[Ca]=F);else for(la in Q=k.a[Q]/q,Tc)for(F=Tc[la],Ca=De(k,F.a,J),E=(Ca[0]-w[0])/r,Y=(w[1]-Ca[3])/r,Df=Q*n[0],Nb=Q*n[1],D=F.I(),4!=D&&Ba||x.clearRect(E,Y,Df,Nb),2==D&&x.drawImage(F.G(),0,0,n[0],n[1],E,Y,
Df,Nb),F=Ee(k,Ca,m,C),D=Math.max(F.a,y.a),Y=Math.min(F.c,y.c),E=Math.max(F.e,y.e),F=Math.min(F.b,y.b);D<=Y;++D)for(Nb=E;Nb<=F;++Nb)Ca=(Nb-y.e)*B+(D-y.a),this.g[Ca]=void 0;q=b.usedTiles;la=M(h).toString();n=m.toString();la in q?n in q[la]?(q=q[la][n],z.a<q.a&&(q.a=z.a),z.c>q.c&&(q.c=z.c),z.e<q.e&&(q.e=z.e),z.b>q.b&&(q.b=z.b)):q[la][n]=z:(q[la]={},q[la][n]=z);g=g.get("preload");z=M(h).toString();z in b.wantedTiles||(b.wantedTiles[z]={});q=b.wantedTiles[z];la=b.tileQueue;for(var n=k.minZoom,rc,L=m;L>=
n;--L)for(rc=Ee(k,t,L,rc),B=k.a[L],y=rc.a;y<=rc.c;++y)for(I=rc.e;I<=rc.b;++I)m-L<=g?(x=zk(h,L,y,I,d,f),0==x.I()&&(q[xd(x.a)]=!0,x.Ab()in la.c||(C=x,H=x.a,K=null===k.b?k.e[H[0]]:k.b,sa=k.a[H[0]],Ba=yc(He(k,H[0]),k.c),J=la,C=[C,z,[K[0]+(H[1]+.5)*Ba[0]*sa,K[1]+(H[2]+.5)*Ba[1]*sa],B],H=J.g(C),Infinity!=H&&(J.a.push(C),J.b.push(H),J.c[J.d(C)]=!0,Zg(J,0,J.a.length-1)))),v(void 0)&&(void 0).call(void 0,x)):h.g(L,y,I);Jg(b,h);Lg(b,h);Fg(this.n,d*b.size[0]/2,d*b.size[1]/2,d*r/e.resolution,d*r/e.resolution,
e.rotation,(w[0]-u[0])/r,(u[1]-w[1])/r);return!0};function Wg(b){wj.call(this,b);this.d=!1;this.p=-1;this.k=NaN;this.g=Lc();this.a=this.h=null;this.f=Gf()}O(Wg,wj);
Wg.prototype.j=function(b,c,d){var e=b.extent,f=b.focus,g=b.pixelRatio,h=b.skippedFeatureUids,k=b.viewState,m=k.projection,k=k.rotation,n=m.w(),r=Ue(this.b),q=yj(this,b,0);xj(this,"precompose",d,b,q);var u=this.a;if(null!==u&&!u.T()){var t;sc(this.b,"render")?(this.f.canvas.width=d.canvas.width,this.f.canvas.height=d.canvas.height,t=this.f):t=d;var w=t.globalAlpha;t.globalAlpha=c.opacity;c={};f=f[0];if(r.h&&m.c&&!Kc(n,e)){m=n[0];r=n[2];vj(u,t,g,q,k,m<=f&&f<=r?h:c);for(var z=e[0],B=n[2]-n[0],y=0,x;z<
n[0];)--y,x=B*y,q=yj(this,b,x),vj(u,t,g,q,k,m+x<=f&&f<=r+x?h:c),z+=B;y=0;for(z=e[2];z>n[2];)++y,x=B*y,q=yj(this,b,x),vj(u,t,g,q,k,m+x<=f&&f<=r+x?h:c),z-=B}else vj(u,t,g,q,k,h);t!=d&&(xj(this,"render",t,b,q),d.drawImage(t.canvas,0,0));t.globalAlpha=w}xj(this,"postcompose",d,b,q)};
Wg.prototype.l=function(b,c,d,e){if(null!==this.a){var f=this.b,g={};return Rg(this.a,b,c.viewState.resolution,c.viewState.rotation,c.skippedFeatureUids,function(b){var c=M(b).toString();if(!(c in g))return g[c]=!0,d.call(e,b,f)})}};Wg.prototype.q=function(){var b=this.b;b.get("visible")&&"ready"==b.vb()&&this.c()};
Wg.prototype.i=function(b){function c(b){var c;v(b.g)?c=b.g.call(b,n):v(d.b)&&(c=(0,d.b)(b,n));if(null!=c){if(null!=c){var e,f,g=!1;e=0;for(f=c.length;e<f;++e){var h=.5*n/r,k=u,m=b,q=c[e],t=h*h,J=this.q,h=!1,C=void 0,K=void 0,C=q.G();null!==C&&(K=C.Za(),2==K||3==K?C.hc(J,this):(0==K&&C.load(),C.Wb(J,this),h=!0));J=(0,q.b)(m);null!=J&&(t=J.ub(t),(0,Jj[t.Y()])(k,t,q,m));g=h||g}b=g}else b=!1;this.d=this.d||b}}var d=this.b,e=Ue(d);Kg(b.attributions,e.k);Lg(b,e);var f=b.viewHints[0],g=b.viewHints[1],h=
d.k,k=d.n;if(!this.d&&!h&&f||!k&&g)return!0;var m=b.extent,f=b.viewState,g=f.projection,n=f.resolution,r=b.pixelRatio,h=d.e,q=d.d,k=d.get("renderOrder");v(k)||(k=Ij);m=Ic(m,q*n);q=f.projection.w();e.h&&f.projection.c&&!Kc(q,b.extent)&&(m[0]=q[0],m[2]=q[2]);if(!this.d&&this.k==n&&this.p==h&&this.h==k&&Kc(this.g,m))return!0;Mb(this.a);this.a=null;this.d=!1;var u=new qj(.5*n/r,m,n,d.d);yk(e,m,n,g);if(null===k)wk(e,m,c,this);else{var t=[];wk(e,m,function(b){t.push(b)},this);Na(t,k);P(t,c,this)}rj(u);
this.k=n;this.p=h;this.h=k;this.g=m;this.a=u;return!0};function Ak(b,c){Og.call(this,0,c);this.f=Gf();this.a=this.f.canvas;this.a.style.width="100%";this.a.style.height="100%";this.a.className="ol-unselectable";b.insertBefore(this.a,b.childNodes[0]||null);this.c=!0;this.j=Ec()}O(Ak,Og);
function Bk(b,c,d){var e=b.g,f=b.f;if(sc(e,c)){var g=d.extent,h=d.pixelRatio,k=d.viewState,m=k.projection,n=k.resolution,k=k.rotation,r=0;if(m.c){var q=m.w(),m=q[2]-q[0],u=d.focus[0];if(u<q[0]||u>q[2])r=Math.ceil((q[0]-u)/m),r*=m,g=[g[0]+r,g[1],g[2]+r,g[3]]}m=d.pixelRatio;q=d.viewState;u=q.resolution;r=Fg(b.j,b.a.width/2,b.a.height/2,m/u,-m/u,-q.rotation,-q.center[0]-r,-q.center[1]);n=new qj(.5*n/h,g,n);g=new Oi(f,h,g,r,k);W(e,new Rh(c,e,g,0,d,f,null));rj(n);n.T()||vj(n,f,h,r,k,{});$i(g);b.d=n}}
Ak.prototype.h=function(b){if(null===b)this.c&&(ie(this.a,!1),this.c=!1);else{var c=this.f,d=b.size[0]*b.pixelRatio,e=b.size[1]*b.pixelRatio;this.a.width!=d||this.a.height!=e?(this.a.width=d,this.a.height=e):c.clearRect(0,0,this.a.width,this.a.height);var d=b.viewState,f=b.coordinateToPixelMatrix;Fg(f,b.size[0]/2,b.size[1]/2,1/d.resolution,-1/d.resolution,-d.rotation,-d.center[0],-d.center[1]);var d=b.pixelToCoordinateMatrix,e=f[0],g=f[1],h=f[2],k=f[3],m=f[4],n=f[5],r=f[6],q=f[7],u=f[8],t=f[9],w=
f[10],z=f[11],B=f[12],y=f[13],x=f[14],f=f[15],D=e*n-g*m,E=e*r-h*m,I=e*q-k*m,H=g*r-h*n,L=g*q-k*n,J=h*q-k*r,C=u*y-t*B,K=u*x-w*B,F=u*f-z*B,Y=t*x-w*y,sa=t*f-z*y,Ba=w*f-z*x,Q=D*Ba-E*sa+I*Y+H*F-L*K+J*C;0!=Q&&(Q=1/Q,d[0]=(n*Ba-r*sa+q*Y)*Q,d[1]=(-g*Ba+h*sa-k*Y)*Q,d[2]=(y*J-x*L+f*H)*Q,d[3]=(-t*J+w*L-z*H)*Q,d[4]=(-m*Ba+r*F-q*K)*Q,d[5]=(e*Ba-h*F+k*K)*Q,d[6]=(-B*J+x*I-f*E)*Q,d[7]=(u*J-w*I+z*E)*Q,d[8]=(m*sa-n*F+q*C)*Q,d[9]=(-e*sa+g*F-k*C)*Q,d[10]=(B*L-y*I+f*D)*Q,d[11]=(-u*L+t*I-z*D)*Q,d[12]=(-m*Y+n*K-r*C)*Q,d[13]=
(e*Y-g*K+h*C)*Q,d[14]=(-B*H+y*E-x*D)*Q,d[15]=(u*H-t*E+w*D)*Q);Bk(this,"precompose",b);d=b.layerStatesArray;e=b.viewState.resolution;g=0;for(h=d.length;g<h;++g)k=d[g],m=k.layer,m=Sg(this,m),k.visible&&e>=k.minResolution&&e<k.maxResolution&&"ready"==k.i&&m.i(b,k)&&m.j(b,k,c);Bk(this,"postcompose",b);this.c||(ie(this.a,!0),this.c=!0);for(var Ca in this.b)if(!(Ca in b.layerStates)){b.postRenderFunctions.push(N(this.i,this));break}b.postRenderFunctions.push(Pg)}};var Ck=["canvas","webgl","dom"];
function Dk(b){X.call(this);var c=Ek(b);this.Ia=v(b.loadTilesWhileAnimating)?b.loadTilesWhileAnimating:!1;this.Ja=v(b.loadTilesWhileInteracting)?b.loadTilesWhileInteracting:!1;this.jc=v(b.pixelRatio)?b.pixelRatio:Hf;this.bb=c.logos;this.p=new Ze(this.Cd,void 0,this);Lb(this,this.p);this.Ga=Ec();this.lc=Ec();this.Ha=0;this.b=null;this.ia=Lc();this.d=this.n=null;this.a=Sd("DIV","ol-viewport");this.a.style.position="relative";this.a.style.overflow="hidden";this.a.style.width="100%";this.a.style.height=
"100%";this.a.style.msTouchAction="none";Kf&&(this.a.className="ol-touch");this.$=Sd("DIV","ol-overlaycontainer");this.a.appendChild(this.$);this.j=Sd("DIV","ol-overlaycontainer-stopevent");T(this.j,["click","dblclick","mousedown","touchstart","MSPointerDown",yg,ib?"DOMMouseScroll":"mousewheel"],Ob);this.a.appendChild(this.j);b=new qg(this);T(b,Ya(Bg),this.Ub,!1,this);Lb(this,b);this.O=c.keyboardEventTarget;this.h=new pf;T(this.h,"key",this.Sb,!1,this);Lb(this,this.h);b=new xf(this.a);T(b,"mousewheel",
this.Sb,!1,this);Lb(this,b);this.q=c.controls;this.g=c.interactions;this.i=c.overlays;this.r=new c.Dd(this.a,this);Lb(this,this.r);this.ta=new kf;Lb(this,this.ta);this.t=this.f=null;this.k=[];this.ha=[];this.sa=new $g(N(this.Ec,this),N(this.rd,this));this.mc={};T(this,xc("layergroup"),this.Hc,!1,this);T(this,xc("view"),this.Xc,!1,this);T(this,xc("size"),this.Vc,!1,this);T(this,xc("target"),this.Wc,!1,this);vc(this,c.values);this.q.forEach(function(b){b.setMap(this)},this);T(this.q,"add",function(b){b.element.setMap(this)},
!1,this);T(this.q,"remove",function(b){b.element.setMap(null)},!1,this);this.g.forEach(function(b){b.setMap(this)},this);T(this.g,"add",function(b){b.element.setMap(this)},!1,this);T(this.g,"remove",function(b){b.element.setMap(null)},!1,this);this.i.forEach(function(b){b.setMap(this)},this);T(this.i,"add",function(b){b.element.setMap(this)},!1,this);T(this.i,"remove",function(b){b.element.setMap(null)},!1,this)}O(Dk,X);l=Dk.prototype;l.uc=function(b){this.i.push(b)};
l.R=function(b){this.render();Array.prototype.push.apply(this.k,arguments)};l.u=function(){Wd(this.a);Dk.C.u.call(this)};l.xc=function(b,c,d,e,f){if(null!==this.b)return b=this.ja(b),Qg(this.r,b,this.b,c,v(d)?d:null,v(e)?e:xe,v(f)?f:null)};function Fk(b){b=b.get("target");return v(b)?Od(b):null}l.ja=function(b){var c=this.b;if(null===c)return null;b=b.slice();return Gg(c.pixelToCoordinateMatrix,b,b)};
l.Oa=function(b){var c=this.b;if(null===c)return null;b=b.slice(0,2);return Gg(c.coordinateToPixelMatrix,b,b)};l.pa=function(){return this.get("size")};l.A=function(){return this.get("view")};l.Ec=function(b,c,d,e){var f=this.b;if(!(null!==f&&c in f.wantedTiles&&f.wantedTiles[c][xd(b.a)]))return Infinity;b=d[0]-f.focus[0];d=d[1]-f.focus[1];return 65536*Math.log(e)+Math.sqrt(b*b+d*d)/e};l.Sb=function(b,c){var d=new og(c||b.type,this,b);this.Ub(d)};
l.Ub=function(b){if(null!==this.b){this.t=b.coordinate;b.frameState=this.b;var c=this.g.a,d;if(!1!==W(this,b))for(d=c.length-1;0<=d;d--){var e=c[d];if(e.get("active")&&!e.handleEvent(b))break}}};
l.Tc=function(){var b=this.b,c=this.sa;if(!c.T()){var d=16,e=d,f=0;null!==b&&(f=b.viewHints,f[0]&&(d=this.Ia?8:0,e=2),f[1]&&(d=this.Ja?8:0,e=2),f=Xa(b.wantedTiles));d*=f;e*=f;if(c.e<d){var f=c.g,g=c.a,h=c.b,k=0,m=g.length,n,r,q;for(r=0;r<m;++r)n=g[r],q=f(n),Infinity==q?delete c.c[c.d(n)]:(h[k]=q,g[k++]=n);g.length=k;h.length=k;for(f=(c.a.length>>1)-1;0<=f;f--)Yg(c,f);d=Math.min(d-c.e,e,c.Na());for(e=0;e<d;++e)f=c,h=f.a,k=f.b,g=h[0],1==h.length?(h.length=0,k.length=0):(h[0]=h.pop(),k[0]=k.pop(),Yg(f,
0)),h=f.d(g),delete f.c[h],f=g[0],T(f,"change",c.f,!1,c),f.load();c.e+=d}}c=this.ha;d=0;for(e=c.length;d<e;++d)c[d](this,b);c.length=0};l.Vc=function(){this.render()};l.Wc=function(){var b=Fk(this);wf(this.h);null===b?(Wd(this.a),null!==this.f&&(U(this.f),this.f=null)):(b.appendChild(this.a),qf(this.h,null===this.O?b:this.O),null===this.f&&(this.f=T(this.ta,"resize",this.ic,!1,this)));this.ic()};l.rd=function(){this.render()};l.Yc=function(){this.render()};
l.Xc=function(){null!==this.n&&(U(this.n),this.n=null);var b=this.A();null!==b&&(this.n=T(b,"propertychange",this.Yc,!1,this));this.render()};l.Ic=function(){this.render()};l.Jc=function(){this.render()};l.Hc=function(){if(null!==this.d){for(var b=this.d.length,c=0;c<b;++c)U(this.d[c]);this.d=null}b=this.get("layergroup");null!=b&&(this.d=[T(b,"propertychange",this.Jc,!1,this),T(b,"change",this.Ic,!1,this)]);this.render()};l.render=function(){null!=this.p.P||this.p.start()};
l.Cd=function(b){var c,d,e,f=this.pa(),g=this.A(),h=null;if(c=v(f)&&0<f[0]&&0<f[1]&&null!==g)c=null!=g.U()&&v(md(g));if(c){var h=g.b.slice(),k=this.get("layergroup").tb(),m={};c=0;for(d=k.length;c<d;++c)m[M(k[c].layer)]=k[c];e=g.I();h={animate:!1,attributions:{},coordinateToPixelMatrix:this.Ga,extent:null,focus:null===this.t?e.center:this.t,index:this.Ha++,layerStates:m,layerStatesArray:k,logos:db(this.bb),pixelRatio:this.jc,pixelToCoordinateMatrix:this.lc,postRenderFunctions:[],size:f,skippedFeatureUids:this.mc,
tileQueue:this.sa,time:b,usedTiles:{},viewState:e,viewHints:h,wantedTiles:{}}}if(null!==h){b=this.k;c=f=0;for(d=b.length;c<d;++c)g=b[c],g(this,h)&&(b[f++]=g);b.length=f;h.extent=Rc(e.center,e.resolution,e.rotation,h.size)}this.b=h;this.r.h(h);null!==h&&(h.animate&&this.render(),Array.prototype.push.apply(this.ha,h.postRenderFunctions),0!==this.k.length||h.viewHints[0]||h.viewHints[1]||Mc(h.extent,this.ia)||(W(this,new ne("moveend",this,h)),Jc(h.extent,this.ia)));W(this,new ne("postrender",this,h));
c=e=this.Tc;this&&(c=N(e,this));!ga(p.setImmediate)||p.Window&&p.Window.prototype.setImmediate==p.setImmediate?(cf||(cf=df()),cf(c)):p.setImmediate(c)};
l.ic=function(){var b=Fk(this);if(null===b)this.set("size",void 0);else{var c=Nd(b),d=R&&b.currentStyle,e;if(e=d)Ld(c),e=!0;if(e&&"auto"!=d.width&&"auto"!=d.height&&!d.boxSizing)c=je(b,d.width,"width","pixelWidth"),b=je(b,d.height,"height","pixelHeight"),b=new Kd(c,b);else{d=new Kd(b.offsetWidth,b.offsetHeight);if(R){c=ke(b,"paddingLeft");e=ke(b,"paddingRight");var f=ke(b,"paddingTop"),g=ke(b,"paddingBottom"),c=new be(f,e,g,c)}else c=ce(b,"paddingLeft"),e=ce(b,"paddingRight"),f=ce(b,"paddingTop"),
g=ce(b,"paddingBottom"),c=new be(parseFloat(f),parseFloat(e),parseFloat(g),parseFloat(c));!R||R&&9<=sb?(e=ce(b,"borderLeftWidth"),f=ce(b,"borderRightWidth"),g=ce(b,"borderTopWidth"),b=ce(b,"borderBottomWidth"),b=new be(parseFloat(g),parseFloat(f),parseFloat(b),parseFloat(e))):(e=me(b,"borderLeft"),f=me(b,"borderRight"),g=me(b,"borderTop"),b=me(b,"borderBottom"),b=new be(g,f,b,e));b=new Kd(d.width-b.left-c.left-c.right-b.right,d.height-b.top-c.top-c.bottom-b.bottom)}this.set("size",[b.width,b.height])}};
function Ek(b){var c=null;v(b.keyboardEventTarget)&&(c=G(b.keyboardEventTarget)?document.getElementById(b.keyboardEventTarget):b.keyboardEventTarget);var d={},e={};if(!v(b.logo)||"boolean"==typeof b.logo&&b.logo)e["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAHGAAABxgEXwfpGAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAhNQTFRF////AP//AICAgP//AFVVQECA////K1VVSbbbYL/fJ05idsTYJFtbbcjbJllmZszWWMTOIFhoHlNiZszTa9DdUcHNHlNlV8XRIVdiasrUHlZjIVZjaMnVH1RlIFRkH1RkH1ZlasvYasvXVsPQH1VkacnVa8vWIVZjIFRjVMPQa8rXIVVkXsXRsNveIFVkIFZlIVVj3eDeh6GmbMvXH1ZkIFRka8rWbMvXIFVkIFVjIFVkbMvWH1VjbMvWIFVlbcvWIFVla8vVIFVkbMvWbMvVH1VkbMvWIFVlbcvWIFVkbcvVbMvWjNPbIFVkU8LPwMzNIFVkbczWIFVkbsvWbMvXIFVkRnB8bcvW2+TkW8XRIFVkIlZlJVloJlpoKlxrLl9tMmJwOWd0Omh1RXF8TneCT3iDUHiDU8LPVMLPVcLPVcPQVsPPVsPQV8PQWMTQWsTQW8TQXMXSXsXRX4SNX8bSYMfTYcfTYsfTY8jUZcfSZsnUaIqTacrVasrVa8jTa8rWbI2VbMvWbcvWdJObdcvUdszUd8vVeJaee87Yfc3WgJyjhqGnitDYjaarldPZnrK2oNbborW5o9bbo9fbpLa6q9ndrL3ArtndscDDutzfu8fJwN7gwt7gxc/QyuHhy+HizeHi0NfX0+Pj19zb1+Tj2uXk29/e3uLg3+Lh3+bl4uXj4ufl4+fl5Ofl5ufl5ujm5+jmySDnBAAAAFp0Uk5TAAECAgMEBAYHCA0NDg4UGRogIiMmKSssLzU7PkJJT1JTVFliY2hrdHZ3foSFhYeJjY2QkpugqbG1tre5w8zQ09XY3uXn6+zx8vT09vf4+Pj5+fr6/P39/f3+gz7SsAAAAVVJREFUOMtjYKA7EBDnwCPLrObS1BRiLoJLnte6CQy8FLHLCzs2QUG4FjZ5GbcmBDDjxJBXDWxCBrb8aM4zbkIDzpLYnAcE9VXlJSWlZRU13koIeW57mGx5XjoMZEUqwxWYQaQbSzLSkYGfKFSe0QMsX5WbjgY0YS4MBplemI4BdGBW+DQ11eZiymfqQuXZIjqwyadPNoSZ4L+0FVM6e+oGI6g8a9iKNT3o8kVzNkzRg5lgl7p4wyRUL9Yt2jAxVh6mQCogae6GmflI8p0r13VFWTHBQ0rWPW7ahgWVcPm+9cuLoyy4kCJDzCm6d8PSFoh0zvQNC5OjDJhQopPPJqph1doJBUD5tnkbZiUEqaCnB3bTqLTFG1bPn71kw4b+GFdpLElKIzRxxgYgWNYc5SCENVHKeUaltHdXx0dZ8uBI1hJ2UUDgq82CM2MwKeibqAvSO7MCABq0wXEPiqWEAAAAAElFTkSuQmCC"]=
"http://openlayers.org/";else{var f=b.logo;G(f)?e[f]="":ha(f)&&(e[f.src]=f.href)}f=b.layers instanceof Di?b.layers:new Di({layers:b.layers});d.layergroup=f;d.target=b.target;d.view=v(b.view)?b.view:new ld;var f=Og,g;v(b.renderer)?da(b.renderer)?g=b.renderer:G(b.renderer)&&(g=[b.renderer]):g=Ck;var h,k;h=0;for(k=g.length;h<k;++h)if("canvas"==g[h]&&Jf){f=Ak;break}var m;v(b.controls)?m=da(b.controls)?new Ed(b.controls.slice()):b.controls:m=Ye();if(v(b.interactions))g=da(b.interactions)?new Ed(b.interactions.slice()):
b.interactions;else{g=v(void 0)?void 0:{};h=new Ed;k=new ah;(v(g.altShiftDragRotate)?g.altShiftDragRotate:1)&&h.push(new th);(v(g.doubleClickZoom)?g.doubleClickZoom:1)&&h.push(new gh({delta:g.zoomDelta,duration:g.zoomDuration}));(v(g.dragPan)?g.dragPan:1)&&h.push(new ph({kinetic:k}));(v(g.pinchRotate)?g.pinchRotate:1)&&h.push(new vi);(v(g.pinchZoom)?g.pinchZoom:1)&&h.push(new zi({duration:g.zoomDuration}));if(v(g.keyboard)?g.keyboard:1)h.push(new pi),h.push(new ri({delta:g.zoomDelta,duration:g.zoomDuration}));
(v(g.mouseWheelZoom)?g.mouseWheelZoom:1)&&h.push(new ti({duration:g.zoomDuration}));(v(g.shiftDragZoom)?g.shiftDragZoom:1)&&h.push(new oi);g=h}b=v(b.overlays)?da(b.overlays)?new Ed(b.overlays.slice()):b.overlays:new Ed;return{controls:m,interactions:g,keyboardEventTarget:c,logos:e,overlays:b,Dd:f,values:d}}dd(Ii);dd(Ni);P(Ni,function(b){P(Ii,function(c){fd(b,c,Ji);fd(c,b,Ki)})});function Gk(b){X.call(this);this.j=v(b.insertFirst)?b.insertFirst:!0;this.i=v(b.stopEvent)?b.stopEvent:!0;this.b=Sd("DIV",{"class":"ol-overlay-container"});this.b.style.position="absolute";this.h=v(b.autoPan)?b.autoPan:!1;this.f=v(b.autoPanAnimation)?b.autoPanAnimation:{};this.g=v(b.autoPanMargin)?b.autoPanMargin:20;this.a={Ka:"",Ua:"",$a:"",ab:"",visible:!0};this.d=null;T(this,xc("element"),this.Gc,!1,this);T(this,xc("map"),this.Nc,!1,this);T(this,xc("offset"),this.Oc,!1,this);T(this,xc("position"),
this.Rc,!1,this);T(this,xc("positioning"),this.Sc,!1,this);v(b.element)&&this.set("element",b.element);this.set("offset",v(b.offset)?b.offset:[0,0]);this.set("positioning",v(b.positioning)?b.positioning:"top-left");v(b.position)&&this.fc(b.position)}O(Gk,X);l=Gk.prototype;l.zb=function(){return this.get("element")};l.Wa=function(){return this.get("map")};l.Pb=function(){return this.get("offset")};l.Gc=function(){for(var b=this.b,c;c=b.firstChild;)b.removeChild(c);b=this.zb();null!=b&&Vd(this.b,b)};
l.Nc=function(){null!==this.d&&(Wd(this.b),U(this.d),this.d=null);var b=this.Wa();null!=b&&(this.d=T(b,"postrender",this.render,!1,this),Hk(this),b=this.i?b.j:b.$,this.j?b.insertBefore(this.b,b.childNodes[0]||null):Vd(b,this.b))};l.render=function(){Hk(this)};l.Oc=function(){Hk(this)};
l.Rc=function(){Hk(this);if(v(this.get("position"))&&this.h){var b=this.Wa(),c;if(c=v(b))c=null!==Fk(b);if(c){c=Ik(Fk(b),b.pa());var d=this.zb(),e=d.offsetWidth,f=d.currentStyle||window.getComputedStyle(d),e=e+(parseInt(f.marginLeft,10)+parseInt(f.marginRight,10)),f=d.offsetHeight,g=d.currentStyle||window.getComputedStyle(d),f=f+(parseInt(g.marginTop,10)+parseInt(g.marginBottom,10)),h=Ik(d,[e,f]),d=this.g;Kc(c,h)||(e=h[0]-c[0],f=c[2]-h[2],g=h[1]-c[1],h=c[3]-h[3],c=[0,0],0>e?c[0]=e-d:0>f&&(c[0]=Math.abs(f)+
d),0>g?c[1]=g-d:0>h&&(c[1]=Math.abs(h)+d),0===c[0]&&0===c[1])||(d=b.A().U(),e=b.Oa(d),c=[e[0]+c[0],e[1]+c[1]],null!==this.f&&(this.f.source=d,b.R(sd(this.f))),nd(b.A(),b.ja(c)))}}};l.Sc=function(){Hk(this)};l.setMap=function(b){this.set("map",b)};l.fc=function(b){this.set("position",b)};
function Ik(b,c){var d=Nd(b);de(b,"position");var e=new Jd(0,0),f;f=d?Nd(d):document;var g;(g=!R||R&&9<=sb)||(Ld(f),g=!0);b!=(g?f.documentElement:f.body)&&(f=ee(b),g=Ld(d).a,d=jb?g.body||g.documentElement:g.documentElement,g=g.parentWindow||g.defaultView,d=R&&qb("10")&&g.pageYOffset!=d.scrollTop?new Jd(d.scrollLeft,d.scrollTop):new Jd(g.pageXOffset||d.scrollLeft,g.pageYOffset||d.scrollTop),e.x=f.left+d.x,e.y=f.top+d.y);return[e.x,e.y,e.x+c[0],e.y+c[1]]}
function Hk(b){var c=b.Wa(),d=b.get("position");if(v(c)&&null!==c.b&&v(d)){var d=c.Oa(d),e=c.pa(),c=b.b.style,f=b.Pb(),g=b.get("positioning"),h=f[0],f=f[1];if("bottom-right"==g||"center-right"==g||"top-right"==g)""!==b.a.Ua&&(b.a.Ua=c.left=""),h=Math.round(e[0]-d[0]-h)+"px",b.a.$a!=h&&(b.a.$a=c.right=h);else{""!==b.a.$a&&(b.a.$a=c.right="");if("bottom-center"==g||"center-center"==g||"top-center"==g)h-=ge(b.b).width/2;h=Math.round(d[0]+h)+"px";b.a.Ua!=h&&(b.a.Ua=c.left=h)}if("bottom-left"==g||"bottom-center"==
g||"bottom-right"==g)""!==b.a.ab&&(b.a.ab=c.top=""),d=Math.round(e[1]-d[1]-f)+"px",b.a.Ka!=d&&(b.a.Ka=c.bottom=d);else{""!==b.a.Ka&&(b.a.Ka=c.bottom="");if("center-left"==g||"center-center"==g||"center-right"==g)f-=ge(b.b).height/2;d=Math.round(d[1]+f)+"px";b.a.ab!=d&&(b.a.ab=c.top=d)}b.a.visible||(ie(b.b,!0),b.a.visible=!0)}else b.a.visible&&(ie(b.b,!1),b.a.visible=!1)};function Jk(b){X.call(this);this.f=void 0;this.a="geometry";this.h=null;this.g=void 0;this.b=null;T(this,xc(this.a),this.d,!1,this);v(b)&&(b instanceof xh||null===b?this.set(this.a,b):vc(this,b))}O(Jk,X);Jk.prototype.clone=function(){var b=new Jk(this.N());Kk(b,this.a);var c=this.K();null!=c&&(c=c.clone(),b.set(b.a,c));c=this.h;null!==c&&(b.h=c,null===c?c=void 0:ga(c)||(c=da(c)?c:[c],c=ve(c)),b.g=c,b.c());return b};Jk.prototype.K=function(){return this.get(this.a)};Jk.prototype.j=function(){this.c()};
Jk.prototype.d=function(){null!==this.b&&(U(this.b),this.b=null);var b=this.K();null!=b&&(this.b=T(b,"change",this.j,!1,this));this.c()};function Kk(b,c){mc(b,xc(b.a),b.d,!1,b);b.a=c;T(b,xc(b.a),b.d,!1,b);b.d()};function Lk(){this.defaultDataProjection=null};function Mk(){this.defaultDataProjection=null}O(Mk,Lk);function Nk(b){return ha(b)?b:G(b)?(b=Lj(b),v(b)?b:null):null}
Mk.prototype.b=function(b,c){var d=Nk(b),e;v(c)&&(v(c.dataProjection)?e=c.dataProjection:(e=Nk(b).crs,e=null!=e?"name"==e.type?ad(e.properties.name):"EPSG"==e.type?ad("EPSG:"+e.properties.code):null:this.defaultDataProjection),e={dataProjection:e,featureProjection:c.featureProjection});var f;v(e)&&(f={featureProjection:e.featureProjection,dataProjection:null!=e.dataProjection?e.dataProjection:this.defaultDataProjection,rightHanded:e.rightHanded});if("Feature"==d.type)d=[Ok(this,d,f)];else if("FeatureCollection"==
d.type){e=[];var d=d.features,g,h;g=0;for(h=d.length;g<h;++g)e.push(Ok(this,d[g],f));d=e}else d=[];return d};function Pk(b){b=v(b)?b:{};this.defaultDataProjection=null;this.defaultDataProjection=ad(null!=b.defaultDataProjection?b.defaultDataProjection:"EPSG:4326");this.a=b.geometryName}O(Pk,Mk);
function Qk(b,c){var d;if(null===b)d=null;else{d=(0,Rk[b.type])(b);var e=v(c)?ad(c.featureProjection):null,f=v(c)?ad(c.dataProjection):null;null===e||null===f||e===f||e.a===f.a||e.b==f.b&&$c(e,f)===gd||(d instanceof xh?d=d.transform(f,e):(e=jd(f,e),d=[d[0],d[1],d[0],d[3],d[2],d[1],d[2],d[3]],e(d,d,2),d=Gc([d[0],d[2],d[4],d[6]],[d[1],d[3],d[5],d[7]])))}return d}
var Rk={Point:function(b){return new Hh(b.coordinates)},LineString:function(b){return new Ej(b.coordinates)},Polygon:function(b){return new Nh(b.coordinates)},MultiPoint:function(b){return new Gj(b.coordinates)},MultiLineString:function(b){return new Fj(b.coordinates)},MultiPolygon:function(b){return new Hj(b.coordinates)},GeometryCollection:function(b,c){var d=Fa(b.geometries,function(b){return Qk(b,c)});return new Aj(d)}};
function Ok(b,c,d){d=Qk(c.geometry,d);var e=new Jk;v(b.a)&&Kk(e,b.a);e.set(e.a,d);v(c.id)&&(e.f=c.id,e.c());v(c.properties)&&vc(e,c.properties);return e};function Sk(b,c,d,e,f){se.call(this,b,c);this.d=d;this.b=new Image;null!==e&&(this.b.crossOrigin=e);this.c={};this.e=null;this.f=f}O(Sk,se);l=Sk.prototype;l.u=function(){1==this.state&&Tk(this);Sk.C.u.call(this)};l.G=function(b){if(v(b)){var c=M(b);if(c in this.c)return this.c[c];b=$a(this.c)?this.b:this.b.cloneNode(!1);return this.c[c]=b}return this.b};l.Ab=function(){return this.d};l.pd=function(){this.state=3;Tk(this);W(this,"change")};
l.qd=function(){this.state=this.b.naturalWidth&&this.b.naturalHeight?2:4;Tk(this);W(this,"change")};l.load=function(){0==this.state&&(this.state=1,W(this,"change"),this.e=[lc(this.b,"error",this.pd,!1,this),lc(this.b,"load",this.qd,!1,this)],this.f(this,this.d))};function Tk(b){P(b.e,U);b.e=null};function Uk(b){var c=/\{z\}/g,d=/\{x\}/g,e=/\{y\}/g,f=/\{-y\}/g;return function(g){return null===g?void 0:b.replace(c,g[0].toString()).replace(d,g[1].toString()).replace(e,g[2].toString()).replace(f,function(){return((1<<g[0])-g[2]-1).toString()})}}function Vk(b){return Wk(Fa(b,Uk))}function Wk(b){return 1===b.length?b[0]:function(c,d,e){return null===c?void 0:b[ub((c[1]<<c[0])+c[2],b.length)](c,d,e)}}function Xk(){}
function Yk(b,c){var d=[0,0,0];return function(e,f,g){return null===e?void 0:c(b(e,g,d),f,g)}}function Zk(b){var c=[],d=/\{(\d)-(\d)\}/.exec(b)||/\{([a-z])-([a-z])\}/.exec(b);if(d){var e=d[2].charCodeAt(0),f;for(f=d[1].charCodeAt(0);f<=e;++f)c.push(b.replace(d[0],String.fromCharCode(f)))}else c.push(b);return c};function $k(b){Ne.call(this,{attributions:b.attributions,extent:b.extent,logo:b.logo,opaque:b.opaque,projection:b.projection,state:v(b.state)?b.state:void 0,tileGrid:b.tileGrid,tilePixelRatio:b.tilePixelRatio,wrapX:b.wrapX});this.tileUrlFunction=v(b.tileUrlFunction)?b.tileUrlFunction:Xk;this.crossOrigin=v(b.crossOrigin)?b.crossOrigin:null;this.tileLoadFunction=v(b.tileLoadFunction)?b.tileLoadFunction:al;this.tileClass=v(b.tileClass)?b.tileClass:Sk}O($k,Ne);function al(b,c){b.G().src=c}
function zk(b,c,d,e,f,g){var h=b.d(c,d,e);if(b.a.c.hasOwnProperty(h))return b.a.get(h);c=[c,d,e];d=v(g)?g:b.p;e=Pe(b,d);var k=b.h,m;if(m=v(k)){m=c[0];var n=e.B(m);if(v(n)){var r=Le(d),q=d.w();m=yc(He(e,m),e.c)[0]*n==He(r,m)*Ee(r,q,m).B()}else m=d.d}m?k?(k=c[0],m=c[1],d=Je(e,k,d),m<d.a||m>d.c?(m=ub(m,d.B()),d=[k,m,c[2]]):d=c):(k=c[1],d=Je(e,c[0],d),d=k<d.a||k>d.c?null:c):d=c;f=null===d?void 0:b.tileUrlFunction(d,f,g);f=new b.tileClass(c,v(f)?0:4,v(f)?f:"",b.crossOrigin,b.tileLoadFunction);T(f,"change",
b.i,!1,b);b.a.set(h,f);return f}$k.prototype.i=function(b){b=b.target;switch(b.I()){case 1:W(this,new Re("tileloadstart",b));break;case 2:W(this,new Re("tileloadend",b));break;case 3:W(this,new Re("tileloaderror",b))}};$k.prototype.b=function(b){this.a.clear();this.tileUrlFunction=b;this.c()};$k.prototype.g=function(b,c,d){b=this.d(b,c,d);this.a.c.hasOwnProperty(b)&&this.a.get(b)};function bl(b){var c=v(b.extent)?b.extent:Fi,d;v(b.tileSize)&&(d=yc(b.tileSize));d=Me(c,b.maxZoom,d);Be.call(this,{minZoom:b.minZoom,origin:Qc(c,"top-left"),resolutions:d,tileSize:b.tileSize})}O(bl,Be);
bl.prototype.g=function(b){b=v(b)?b:{};var c=this.minZoom,d=this.maxZoom,e=null;if(v(b.extent)){var e=Array(d+1),f;for(f=0;f<=d;++f)e[f]=f<c?null:Ee(this,b.extent,f)}return function(b,f,k){f=b[0];if(f<c||d<f)return null;var m=b[1];b=b[2];return b<-Math.pow(2,f)||-1<b||null!==e&&!Ad(e[f],m,b)?null:vd(f,m,-b-1,k)}};bl.prototype.o=function(b,c){if(b[0]<this.maxZoom){var d=2*b[1],e=2*b[2];return zd(d,d+1,e,e+1,c)}return null};
bl.prototype.h=function(b,c,d,e){e=zd(0,b[1],0,b[2],e);for(b=b[0]-1;b>=this.minZoom;--b)if(e.a=e.c>>=1,e.e=e.b>>=1,c.call(d,b,e))return!0;return!1};function cl(b){var c=v(b.projection)?b.projection:"EPSG:3857",d=new bl({extent:Ke(c),maxZoom:b.maxZoom,tileSize:b.tileSize});$k.call(this,{attributions:b.attributions,crossOrigin:b.crossOrigin,logo:b.logo,projection:c,tileGrid:d,tileLoadFunction:b.tileLoadFunction,tilePixelRatio:b.tilePixelRatio,tileUrlFunction:Xk,wrapX:v(b.wrapX)?b.wrapX:!0});this.r=d.g();v(b.tileUrlFunction)?this.b(b.tileUrlFunction):v(b.urls)?this.b(Vk(b.urls)):v(b.url)&&this.b(Vk(Zk(b.url)))}O(cl,$k);
cl.prototype.b=function(b){cl.C.b.call(this,Yk(this.r,b))};var dl=new Cd({html:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.'});function el(b){b=v(b)?b:{};var c=fl[b.layer];this.j=b.layer;cl.call(this,{attributions:c.attributions,crossOrigin:"anonymous",logo:"https://developer.mapquest.com/content/osm/mq_logo.png",maxZoom:c.maxZoom,opaque:!0,tileLoadFunction:b.tileLoadFunction,url:v(b.url)?b.url:"https://otile{1-4}-s.mqcdn.com/tiles/1.0.0/"+this.j+"/{z}/{x}/{y}.jpg"})}O(el,cl);
var gl=new Cd({html:'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a>'}),fl={osm:{maxZoom:19,attributions:[gl,dl]},sat:{maxZoom:18,attributions:[gl,new Cd({html:"Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency"})]},hyb:{maxZoom:18,attributions:[gl,dl]}};function hl(b){this.o=this.e=this.d=null;this.g=v(b.fill)?b.fill:null;this.k=[0,0];this.a=b.points;this.c=v(b.radius)?b.radius:b.radius1;this.f=v(b.radius2)?b.radius2:this.c;this.h=v(b.angle)?b.angle:0;this.b=v(b.stroke)?b.stroke:null;this.n=this.i=null;var c=b.atlasManager,d="",e="",f=0,g=null,h,k=0;null!==this.b&&(h=Hd(this.b.D()),k=this.b.B(),v(k)||(k=1),g=this.b.getLineDash(),If||(g=null),e=this.b.da,v(e)||(e="round"),d=this.b.ca,v(d)||(d="round"),f=this.b.ea,v(f)||(f=10));var m=2*(this.c+k)+
1,d={strokeStyle:h,Da:k,size:m,lineCap:d,lineDash:g,lineJoin:e,miterLimit:f};if(v(c)){var m=Math.round(m),e=null===this.g,n;e&&(n=N(this.$b,this,d));f=this.X();c=c.add(f,m,m,N(this.ac,this,d),n);this.e=c.image;this.k=[c.offsetX,c.offsetY];this.o=e?c.Zc:this.e}else this.e=document.createElement("CANVAS"),this.e.height=m,this.e.width=m,m=this.e.width,c=this.e.getContext("2d"),this.ac(d,c,0,0),null===this.g?(c=this.o=document.createElement("CANVAS"),c.height=d.size,c.width=d.size,c=c.getContext("2d"),
this.$b(d,c,0,0)):this.o=this.e;this.i=[m/2,m/2];this.n=[m,m];Mg.call(this,{opacity:1,rotateWithView:!1,rotation:v(b.rotation)?b.rotation:0,scale:1,snapToPixel:v(b.snapToPixel)?b.snapToPixel:!0})}O(hl,Mg);l=hl.prototype;l.rb=function(){return this.i};l.aa=function(){return this.g};l.Zb=function(){return this.o};l.G=function(){return this.e};l.Za=function(){return 2};l.Bb=function(){return this.k};l.Cb=function(){return this.n};l.S=function(){return this.b};l.Wb=ba;l.load=ba;l.hc=ba;
l.ac=function(b,c,d,e){var f;c.setTransform(1,0,0,1,0,0);c.translate(d,e);c.beginPath();this.f!==this.c&&(this.a*=2);for(d=0;d<=this.a;d++)e=2*d*Math.PI/this.a-Math.PI/2+this.h,f=0===d%2?this.c:this.f,c.lineTo(b.size/2+f*Math.cos(e),b.size/2+f*Math.sin(e));null!==this.g&&(c.fillStyle=Hd(this.g.D()),c.fill());null!==this.b&&(c.strokeStyle=b.strokeStyle,c.lineWidth=b.Da,null===b.lineDash||c.setLineDash(b.lineDash),c.lineCap=b.lineCap,c.lineJoin=b.lineJoin,c.miterLimit=b.miterLimit,c.stroke());c.closePath()};
l.$b=function(b,c,d,e){c.setTransform(1,0,0,1,0,0);c.translate(d,e);c.beginPath();this.f!==this.c&&(this.a*=2);var f;for(d=0;d<=this.a;d++)f=2*d*Math.PI/this.a-Math.PI/2+this.h,e=0===d%2?this.c:this.f,c.lineTo(b.size/2+e*Math.cos(f),b.size/2+e*Math.sin(f));c.fillStyle=fi;c.fill();null!==this.b&&(c.strokeStyle=b.strokeStyle,c.lineWidth=b.Da,null===b.lineDash||c.setLineDash(b.lineDash),c.stroke());c.closePath()};
l.X=function(){var b=null===this.b?"-":this.b.X(),c=null===this.g?"-":this.g.X();if(null===this.d||b!=this.d[1]||c!=this.d[2]||this.c!=this.d[3]||this.f!=this.d[4]||this.h!=this.d[5]||this.a!=this.d[6])this.d=["r"+b+c+(v(this.c)?this.c.toString():"-")+(v(this.f)?this.f.toString():"-")+(v(this.h)?this.h.toString():"-")+(v(this.a)?this.a.toString():"-"),b,c,this.c,this.f,this.h,this.a];return this.d[0]};A("ol.Map",Dk,OPENLAYERS);Dk.prototype.addOverlay=Dk.prototype.uc;Dk.prototype.forEachFeatureAtPixel=Dk.prototype.xc;Dk.prototype.getPixelFromCoordinate=Dk.prototype.Oa;Dk.prototype.on=Dk.prototype.kc;Dk.prototype.getSize=Dk.prototype.pa;Dk.prototype.getView=Dk.prototype.A;Dk.prototype.beforeRender=Dk.prototype.R;A("ol.View",ld,OPENLAYERS);ld.prototype.getCenter=ld.prototype.U;A("ol.control.defaults",Ye,OPENLAYERS);A("ol.layer.Tile",Tg,OPENLAYERS);A("ol.layer.Vector",Vg,OPENLAYERS);
Vg.prototype.setStyle=Vg.prototype.g;A("ol.source.MapQuest",el,OPENLAYERS);A("ol.source.Vector",tk,OPENLAYERS);tk.prototype.addFeatures=tk.prototype.Lb;A("ol.style.Style",ki,OPENLAYERS);A("ol.style.Stroke",ei,OPENLAYERS);A("ol.style.Fill",ii,OPENLAYERS);A("ol.style.RegularShape",hl,OPENLAYERS);A("ol.format.GeoJSON",Pk,OPENLAYERS);Pk.prototype.readFeatures=Pk.prototype.b;Jk.prototype.getProperties=Jk.prototype.N;Jk.prototype.getGeometry=Jk.prototype.K;
A("ol.proj.transform",function(b,c,d){return jd(c,d)(b,void 0,b.length)},OPENLAYERS);A("ol.inherits",O,OPENLAYERS);A("ol.Overlay",Gk,OPENLAYERS);Gk.prototype.setPosition=Gk.prototype.fc;Gk.prototype.getElement=Gk.prototype.zb;Gk.prototype.getMap=Gk.prototype.Wa;Gk.prototype.getOffset=Gk.prototype.Pb;A("ol.animation.pan",sd,OPENLAYERS);A("ol.geom.Point",Hh,OPENLAYERS);Ej.prototype.getCoordinates=Ej.prototype.q;
  return OPENLAYERS.ol;
}));


},{}],5:[function(require,module,exports){
(function() {
  'use strict';

  if (self.fetch) {
    return
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = name.toString();
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = value.toString();
    }
    return value
  }

  function Headers(headers) {
    this.map = {}

    var self = this
    if (headers instanceof Headers) {
      headers.forEach(function(name, values) {
        values.forEach(function(value) {
          self.append(name, value)
        })
      })

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        self.append(name, headers[name])
      })
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  // Instead of iterable for now.
  Headers.prototype.forEach = function(callback) {
    var self = this
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      callback(name, self.map[name])
    })
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  var support = {
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob();
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self
  }

  function Body() {
    this.bodyUsed = false


    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (!body) {
        this._bodyText = ''
      } else {
        throw new Error('unsupported BodyInit type')
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(url, options) {
    options = options || {}
    this.url = url

    this.credentials = options.credentials || 'omit'
    this.headers = new Headers(options.headers)
    this.method = normalizeMethod(options.method || 'GET')
    this.mode = options.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && options.body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(options.body)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = xhr.getAllResponseHeaders().trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this._initBody(bodyInit)
    this.type = 'default'
    this.url = null
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
  }

  Body.call(Response.prototype)

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function(input, init) {
    // TODO: Request constructor should accept input, init
    var request
    if (Request.prototype.isPrototypeOf(input) && !init) {
      request = input
    } else {
      request = new Request(input, init)
    }

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return;
      }

      xhr.onload = function() {
        var status = (xhr.status === 1223) ? 204 : xhr.status
        if (status < 100 || status > 599) {
          reject(new TypeError('Network request failed'))
          return
        }
        var options = {
          status: status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(name, values) {
        values.forEach(function(value) {
          xhr.setRequestHeader(name, value)
        })
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})();

},{}],6:[function(require,module,exports){
var Promise = require('es6-promise').Promise;
require('whatwg-fetch');
// window.ol = require('./ol-custom.js');
window.ol = require('openlayers');
require('ol3-popup');

var geojsonToFeatures = function geojsonToFeatures(fc, options) {
  var opts = options || {};
  // Declare a formatter to read GeoJSON
  var format = new ol.format.GeoJSON();

  // Read GeoJSON features
  var features = format.readFeatures(fc, opts);
  return features;
};

// Playground using fetch API
// For the demo purpose, we don't want to use OpenLayers 3
// to make call to geojson files here
var fetchJSON = function(url) {
  return fetch(url).then(function(response) {
      return response.json();
    }).then(function(json) {
      return json;
    }).catch(function(ex) {
      console.log('parsing failed', ex);
    });
};

// Declare a source for points and drawing
vectorSourceArcs = new ol.source.Vector({
  format: new ol.format.GeoJSON(),
  wrapX: false
});

vectorLayerArcs = new ol.layer.Vector({
  source: vectorSourceArcs,
  style: [
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'black',
        width: 1
      })
    })
  ]
});

// Instanciate a map and add layers
var map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.MapQuest({
        layer: 'osm'
      })
    }),
    vectorLayerArcs
  ],
  view: new ol.View({
    center: ol.proj.transform(
      [-1.5603, 47.2383],
      'EPSG:4326',
      'EPSG:3857'
    ),
    zoom: 2
  })
});

var maxLineWidth = 8;
var maxElement = 50;

var dataPath = 'assets/data/';
var arcs = 'arcs_ne_10m_admin_0_countries_from_fr_buffered.json';
var vinExportMars2015 = 'national_vin_export_2015-03-01-group.json';
Promise.all([
  fetchJSON(dataPath + arcs, function(json) {
    return json;
  }),
  fetchJSON(dataPath + vinExportMars2015, function(json) {
    return json;
  })
]).then(function(returned) {
  var arcsGeoJSON = returned[0];
  var attributesJSON = returned[1];

  attributesJSON.sort(function(a, b) {
    return b.value - a.value;
  });
  var attributeSliced = attributesJSON.slice(0, maxElement);

  var hash = {};
  for (var i = 0, len = attributeSliced.length; i < len; i++) {
    hash[attributeSliced[i].country] = attributeSliced[i];
  }

  var max = attributeSliced[0].value;
  var ratio = maxLineWidth / max;
  arcsGeoJSON.features.forEach(function(el) {
    if (hash[el.properties.iso_a2]) {
      el.properties.value = hash[el.properties.iso_a2].value;
    } else {
      el.properties.value = undefined;
    }
  });

  vectorLayerArcs.setStyle(function(feature) {
    if (feature.get('value')) {

      var styles = [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'black',
          width: ratio * feature.get('value')
        })
      })];

      var coordinates = feature.getGeometry().getCoordinates();
      var twoCoordinates = coordinates.slice(
        coordinates.length - 2,
        coordinates.length
      );
      var start = twoCoordinates[0];
      var end = twoCoordinates[1];
      var dx = end[0] - start[0];
      var dy = end[1] - start[1];
      var rotation = Math.atan2(dy, dx);
      // arrows
      var radius = 6;
      if (ratio * feature.get('value') > 6) {
        radius = ratio * feature.get('value');
      }
      styles.push(new ol.style.Style({
        geometry: new ol.geom.Point(end),
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({color: 'black'}),
          points: 3,
          radius: radius,
          stroke: new ol.style.Stroke({
            color: 'black'
          }),
          rotateWithView: false,
          rotation: -rotation + (Math.PI / 2) //- 15
        })
      }));
      return styles;
    } else {
      return null;
    }
  });

  vectorSourceArcs.addFeatures(geojsonToFeatures(arcsGeoJSON, {
    featureProjection: 'EPSG:3857'
  }));

  // vectorSourceArcs.getFeatures().forEach(function(el) {
  //     var start = el[0];
  //     var end = el[1];
  //     var dx = end[0] - start[0];
  //     var dy = end[1] - start[1];
  //     var rotation = Math.atan2(dy, dx);
  //     // arrows
  //     styles.push(new ol.style.Style({
  //       geometry: new ol.geom.Point(end),
  //       image: new ol.style.Icon({
  //         src: 'data/arrow.png',
  //         anchor: [0.75, 0.5],
  //         rotateWithView: false,
  //         rotation: -rotation
  //       })
  //     }));
  // });
});

var popup = new ol.Overlay.Popup();
map.addOverlay(popup);

var displayFeatureInfo = function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feat) {
    return feat;
  });
  if (feature) {
    var properties = feature.getProperties();
    console.log(properties);
    popup.show(evt.coordinate,
      '<div><h2>Coordinates</h2><p>' +
      properties.name + ' (' + properties.iso_a2 + ') ' +
      '<br>' + properties.value.toString() +
      '</p></div>');
  } else {
    popup.hide();
  }
};

map.on('singleclick', function(evt) {
  displayFeatureInfo(evt);
});

},{"es6-promise":2,"ol3-popup":3,"openlayers":4,"whatwg-fetch":5}]},{},[6]);