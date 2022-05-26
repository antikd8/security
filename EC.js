var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function (status, toThrow) {
  throw toThrow;
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_IS_NODE =
  typeof process === "object" &&
  typeof process.versions === "object" &&
  typeof process.versions.node === "string";
ENVIRONMENT_IS_SHELL =
  !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (Module["ENVIRONMENT"]) {
  throw new Error(
    "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)"
  );
}
var scriptDirectory = "";
function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require("path").dirname(scriptDirectory) + "/";
  } else {
    scriptDirectory = __dirname + "/";
  }
  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require("fs");
    if (!nodePath) nodePath = require("path");
    filename = nodePath["normalize"](filename);
    return nodeFS["readFileSync"](filename, binary ? null : "utf8");
  };
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };
  if (process["argv"].length > 1) {
    thisProgram = process["argv"][1].replace(/\\/g, "/");
  }
  arguments_ = process["argv"].slice(2);
  if (typeof module !== "undefined") {
    module["exports"] = Module;
  }
  process["on"]("uncaughtException", function (ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  process["on"]("unhandledRejection", abort);
  quit_ = function (status) {
    process["exit"](status);
  };
  Module["inspect"] = function () {
    return "[Emscripten Module object]";
  };
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != "undefined") {
    read_ = function shell_read(f) {
      return read(f);
    };
  }
  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === "function") {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, "binary");
    assert(typeof data === "object");
    return data;
  };
  if (typeof scriptArgs != "undefined") {
    arguments_ = scriptArgs;
  } else if (typeof arguments != "undefined") {
    arguments_ = arguments;
  }
  if (typeof quit === "function") {
    quit_ = function (status) {
      quit(status);
    };
  }
  if (typeof print !== "undefined") {
    if (typeof console === "undefined") console = {};
    console.log = print;
    console.warn = console.error =
      typeof printErr !== "undefined" ? printErr : print;
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href;
  } else if (typeof document !== "undefined" && document.currentScript) {
    scriptDirectory = document.currentScript.src;
  }
  if (scriptDirectory.indexOf("blob:") !== 0) {
    scriptDirectory = scriptDirectory.substr(
      0,
      scriptDirectory.lastIndexOf("/") + 1
    );
  } else {
    scriptDirectory = "";
  }
  {
    read_ = function (url) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function (url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    readAsync = function (url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function () {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
          return;
        }
        onerror();
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
  }
  setWindowTitle = function (title) {
    document.title = title;
  };
} else {
  throw new Error("environment detection error");
}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
moduleOverrides = null;

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}
function convertJsFunctionToWasm(func, sig) {
  if (typeof WebAssembly.Function === "function") {
    var typeNames = { i: "i32", j: "i64", f: "f32", d: "f64" };
    var type = {
      parameters: [],
      results: sig[0] == "v" ? [] : [typeNames[sig[0]]],
    };
    for (var i = 1; i < sig.length; ++i) {
      type.parameters.push(typeNames[sig[i]]);
    }
    return new WebAssembly.Function(type, func);
  }
  var typeSection = [1, 0, 1, 96];
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = { i: 127, j: 126, f: 125, d: 124 };
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]]);
  }
  if (sigRet == "v") {
    typeSection.push(0);
  } else {
    typeSection = typeSection.concat([1, typeCodes[sigRet]]);
  }
  typeSection[1] = typeSection.length - 2;
  var bytes = new Uint8Array(
    [0, 97, 115, 109, 1, 0, 0, 0].concat(
      typeSection,
      [2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0]
    )
  );
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, { e: { f: func } });
  var wrappedFunc = instance.exports["f"];
  return wrappedFunc;
}
var freeTableIndexes = [];
var functionsInTableMap;
function getEmptyTableSlot() {
  if (freeTableIndexes.length) {
    return freeTableIndexes.pop();
  }
  try {
    wasmTable.grow(1);
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err;
    }
    throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
  }
  return wasmTable.length - 1;
}
function addFunctionWasm(func, sig) {
  if (!functionsInTableMap) {
    functionsInTableMap = new WeakMap();
    for (var i = 0; i < wasmTable.length; i++) {
      var item = wasmTable.get(i);
      if (item) {
        functionsInTableMap.set(item, i);
      }
    }
  }
  if (functionsInTableMap.has(func)) {
    return functionsInTableMap.get(func);
  }
  var ret = getEmptyTableSlot();
  try {
    wasmTable.set(ret, func);
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
    assert(
      typeof sig !== "undefined",
      "Missing signature argument to addFunction: " + func
    );
    var wrapped = convertJsFunctionToWasm(func, sig);
    wasmTable.set(ret, wrapped);
  }
  functionsInTableMap.set(func, ret);
  return ret;
}

var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
if (!Object.getOwnPropertyDescriptor(Module, "wasmBinary")) {
  Object.defineProperty(Module, "wasmBinary", {
    configurable: true,
    get: function () {
      abort(
        "Module.wasmBinary has been replaced with plain wasmBinary (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)"
      );
    },
  });
}
var noExitRuntime = Module["noExitRuntime"] || true;
if (!Object.getOwnPropertyDescriptor(Module, "noExitRuntime")) {
  Object.defineProperty(Module, "noExitRuntime", {
    configurable: true,
    get: function () {
      abort(
        "Module.noExitRuntime has been replaced with plain noExitRuntime (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)"
      );
    },
  });
}
if (typeof WebAssembly !== "object") {
  abort("no native wasm support detected");
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;
function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed: " + text);
  }
}
function getCFunc(ident) {
  var func = Module["_" + ident];
  assert(
    func,
    "Cannot call unknown function " + ident + ", make sure it is exported"
  );
  return func;
}
function ccall(ident, returnType, argTypes, args, opts) {
  var toC = {
    string: function (str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
    array: function (arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
  };
  function convertReturnValue(ret) {
    if (returnType === "string") return UTF8ToString(ret);
    if (returnType === "boolean") return Boolean(ret);
    return ret;
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== "array", 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);
  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}
function cwrap(ident, returnType, argTypes, opts) {
  return function () {
    return ccall(ident, returnType, argTypes, arguments, opts);
  };
}
var ALLOC_STACK = 1;
var UTF8Decoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx, endPtr));
  } else {
    var str = "";
    while (idx < endPtr) {
      var u0 = heap[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heap[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode(((u0 & 31) << 6) | u1);
        continue;
      }
      var u2 = heap[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        if ((u0 & 248) != 240)
          warnOnce(
            "Invalid UTF-8 leading byte 0x" +
              u0.toString(16) +
              " encountered when deserializing a UTF-8 string in wasm memory to a JS string!"
          );
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63);
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
      }
    }
  }
  return str;
}
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      if (u >= 2097152)
        warnOnce(
          "Invalid Unicode code point 0x" +
            u.toString(16) +
            " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x1FFFFF)."
        );
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(
    typeof maxBytesToWrite == "number",
    "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"
  );
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343)
      u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
    if (u <= 127) ++len;
    else if (u <= 2047) len += 2;
    else if (u <= 65535) len += 3;
    else len += 4;
  }
  return len;
}
var UTF16Decoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
function writeArrayToMemory(array, buffer) {
  assert(
    array.length >= 0,
    "writeArrayToMemory array must have a length (should be an array or typed array)"
  );
  HEAP8.set(array, buffer);
}

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module["HEAP8"] = HEAP8 = new Int8Array(buf);
  Module["HEAP16"] = HEAP16 = new Int16Array(buf);
  Module["HEAP32"] = HEAP32 = new Int32Array(buf);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
}
var TOTAL_STACK = 5242880;
if (Module["TOTAL_STACK"])
  assert(
    TOTAL_STACK === Module["TOTAL_STACK"],
    "the stack size can no longer be determined at runtime"
  );
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
if (!Object.getOwnPropertyDescriptor(Module, "INITIAL_MEMORY")) {
  Object.defineProperty(Module, "INITIAL_MEMORY", {
    configurable: true,
    get: function () {
      abort(
        "Module.INITIAL_MEMORY has been replaced with plain INITIAL_MEMORY (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)"
      );
    },
  });
}
assert(
  INITIAL_MEMORY >= TOTAL_STACK,
  "INITIAL_MEMORY should be larger than TOTAL_STACK, was " +
    INITIAL_MEMORY +
    "! (TOTAL_STACK=" +
    TOTAL_STACK +
    ")"
);
assert(
  typeof Int32Array !== "undefined" &&
    typeof Float64Array !== "undefined" &&
    Int32Array.prototype.subarray !== undefined &&
    Int32Array.prototype.set !== undefined,
  "JS engine does not provide full typed array support"
);
assert(
  !Module["wasmMemory"],
  "Use of `wasmMemory` detected.  Use -s IMPORTED_MEMORY to define wasmMemory externally"
);
assert(
  INITIAL_MEMORY == 16777216,
  "Detected runtime INITIAL_MEMORY setting.  Use -s IMPORTED_MEMORY to define wasmMemory dynamically"
);
var wasmTable;

function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  HEAPU32[(max >> 2) + 1] = 34821223;
  HEAPU32[(max >> 2) + 2] = 2310721022;
  HEAP32[0] = 1668509029;
}
function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  var cookie1 = HEAPU32[(max >> 2) + 1];
  var cookie2 = HEAPU32[(max >> 2) + 2];
  if (cookie1 != 34821223 || cookie2 != 2310721022) {
    abort(
      "Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x2135467, but received 0x" +
        cookie2.toString(16) +
        " " +
        cookie1.toString(16)
    );
  }
  if (HEAP32[0] !== 1668509029)
    abort(
      "Runtime error: The application has corrupted its heap memory area (address zero)!"
    );
}
(function () {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 25459;
  if (h8[0] !== 115 || h8[1] !== 99)
    throw "Runtime error: expected the system to be little-endian! (Run with -s SUPPORT_BIG_ENDIAN=1 to bypass)";
})();
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function")
      Module["preRun"] = [Module["preRun"]];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function initRuntime() {
  checkStackCookie();
  assert(!runtimeInitialized);
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function postRun() {
  checkStackCookie();
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function")
      Module["postRun"] = [Module["postRun"]];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
var runDependencyTracking = {};
function addRunDependency(id) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
      runDependencyWatcher = setInterval(function () {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err("still waiting on run dependencies:");
          }
          err("dependency: " + dep);
        }
        if (shown) {
          err("(end of list)");
        }
      }, 1e4);
    }
  } else {
    err("warning: run dependency added without ID");
  }
}
function removeRunDependency(id) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err("warning: run dependency removed without ID");
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
function abort(what) {
  if (Module["onAbort"]) {
    Module["onAbort"](what);
  }
  what += "";
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  var output = "abort(" + what + ") at " + stackTrace();
  what = output;
  var e = new WebAssembly.RuntimeError(what);
  throw e;
}
var FS = {
  error: function () {
    abort(
      "Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1"
    );
  },
  init: function () {
    FS.error();
  },
  createDataFile: function () {
    FS.error();
  },
  createPreloadedFile: function () {
    FS.error();
  },
  createLazyFile: function () {
    FS.error();
  },
  open: function () {
    FS.error();
  },
  mkdev: function () {
    FS.error();
  },
  registerDevice: function () {
    FS.error();
  },
  analyzePath: function () {
    FS.error();
  },
  loadFilesFromDB: function () {
    FS.error();
  },
  ErrnoError: function ErrnoError() {
    FS.error();
  },
};
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) {
  return filename.startsWith(dataURIPrefix);
}
function isFileURI(filename) {
  return filename.startsWith("file://");
}
function createExportWrapper(name, fixedasm) {
  return function () {
    var displayName = name;
    var asm = fixedasm;
    if (!fixedasm) {
      asm = Module["asm"];
    }
    assert(
      runtimeInitialized,
      "native function `" +
        displayName +
        "` called before runtime initialization"
    );
    assert(
      !runtimeExited,
      "native function `" +
        displayName +
        "` called after runtime exit (use NO_EXIT_RUNTIME to keep it alive after main() exits)"
    );
    if (!asm[name]) {
      assert(
        asm[name],
        "exported native function `" + displayName + "` not found"
      );
    }
    return asm[name].apply(null, arguments);
  };
}
var wasmBinaryFile = "EC.wasm";
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}
function getBinary(file) {
  try {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(file);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  } catch (err) {
    abort(err);
  }
}
function getBinaryPromise() {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
      return fetch(wasmBinaryFile, { credentials: "same-origin" })
        .then(function (response) {
          if (!response["ok"]) {
            throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
          }
          return response["arrayBuffer"]();
        })
        .catch(function () {
          return getBinary(wasmBinaryFile);
        });
    } else {
      if (readAsync) {
        return new Promise(function (resolve, reject) {
          readAsync(
            wasmBinaryFile,
            function (response) {
              resolve(new Uint8Array(response));
            },
            reject
          );
        });
      }
    }
  }
  return Promise.resolve().then(function () {
    return getBinary(wasmBinaryFile);
  });
}
function createWasm() {
  var info = { env: asmLibraryArg, wasi_snapshot_preview1: asmLibraryArg };
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module["asm"] = exports;
    wasmMemory = Module["asm"]["memory"];
    assert(wasmMemory, "memory not found in wasm exports");
    updateGlobalBufferAndViews(wasmMemory.buffer);
    wasmTable = Module["asm"]["__indirect_function_table"];
    addOnInit(Module["asm"]["__wasm_call_ctors"]);
    removeRunDependency("wasm-instantiate");
  }
  addRunDependency("wasm-instantiate");
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    assert(
      Module === trueModule,
      "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?"
    );
    trueModule = null;
    receiveInstance(result["instance"]);
  }
  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise()
      .then(function (binary) {
        var result = WebAssembly.instantiate(binary, info);
        return result;
      })
      .then(receiver, function (reason) {
        err("failed to asynchronously prepare wasm: " + reason);
        if (isFileURI(wasmBinaryFile)) {
          err(
            "warning: Loading from a file URI (" +
              wasmBinaryFile +
              ") is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing"
          );
        }
        abort(reason);
      });
  }
  function instantiateAsync() {
    if (
      !wasmBinary &&
      typeof WebAssembly.instantiateStreaming === "function" &&
      !isDataURI(wasmBinaryFile) &&
      !isFileURI(wasmBinaryFile) &&
      typeof fetch === "function"
    ) {
      return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(
        function (response) {
          var result = WebAssembly.instantiateStreaming(response, info);
          return result.then(receiveInstantiationResult, function (reason) {
            err("wasm streaming compile failed: " + reason);
            err("falling back to ArrayBuffer instantiation");
            return instantiateArrayBuffer(receiveInstantiationResult);
          });
        }
      );
    } else {
      return instantiateArrayBuffer(receiveInstantiationResult);
    }
  }
  if (Module["instantiateWasm"]) {
    try {
      var exports = Module["instantiateWasm"](info, receiveInstance);
      return exports;
    } catch (e) {
      err("Module.instantiateWasm callback failed with error: " + e);
      return false;
    }
  }
  instantiateAsync();
  return {};
}
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == "function") {
      callback(Module);
      continue;
    }
    var func = callback.func;
    if (typeof func === "number") {
      if (callback.arg === undefined) {
        wasmTable.get(func)();
      } else {
        wasmTable.get(func)(callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

function jsStackTrace() {
  var error = new Error();
  if (!error.stack) {
    try {
      throw new Error();
    } catch (e) {
      error = e;
    }
    if (!error.stack) {
      return "(no stack trace available)";
    }
  }
  return error.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
}
var ExceptionInfoAttrs = {
  DESTRUCTOR_OFFSET: 0,
  REFCOUNT_OFFSET: 4,
  TYPE_OFFSET: 8,
  CAUGHT_OFFSET: 12,
  RETHROWN_OFFSET: 13,
  SIZE: 16,
};
function ___cxa_allocate_exception(size) {}
function ___cxa_atexit(a0, a1) {}
function ___cxa_throw(ptr, type, destructor) {}
function _abort() {}
function _clock() {
  if (_clock.start === undefined) _clock.start = Date.now();
  return ((Date.now() - _clock.start) * (1e6 / 1e3)) | 0;
}
function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.copyWithin(dest, src, src + num);
}

function _emscripten_resize_heap(requestedSize) {}
var ENV = {};
function getExecutableName() {
  return thisProgram || "./this.program";
}
function getEnvStrings() {
  if (!getEnvStrings.strings) {
    var lang =
      (
        (typeof navigator === "object" &&
          navigator.languages &&
          navigator.languages[0]) ||
        "C"
      ).replace("-", "_") + ".UTF-8";
    var env = {
      USER: "web_user",
      LOGNAME: "web_user",
      PATH: "/",
      PWD: "/",
      HOME: "/home/web_user",
      LANG: lang,
      _: getExecutableName(),
    };
    for (var x in ENV) {
      env[x] = ENV[x];
    }
    var strings = [];
    for (var x in env) {
      strings.push(x + "=" + env[x]);
    }
    getEnvStrings.strings = strings;
  }
  return getEnvStrings.strings;
}
var SYSCALLS = {
  mappings: {},
  buffers: [null, [], []],
  printChar: function (stream, curr) {
    var buffer = SYSCALLS.buffers[stream];
    assert(buffer);
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
      buffer.length = 0;
    } else {
      buffer.push(curr);
    }
  },
  varargs: undefined,
  get: function () {
    assert(SYSCALLS.varargs != undefined);
    SYSCALLS.varargs += 4;
    var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
    return ret;
  },
  getStr: function (ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  },
  get64: function (low, high) {
    if (low >= 0) assert(high === 0);
    else assert(high === -1);
    return low;
  },
};
function _environ_get(__environ, environ_buf) {}
function _environ_sizes_get(penviron_count, penviron_buf_size) {}
function _fd_close(fd) {}
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {}

function _fd_write(fd, iov, iovcnt, pnum) {}
function _setTempRet0(val) {}
function __isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function __arraySum(array, index) {
  var sum = 0;
  for (var i = 0; i <= index; sum += array[i++]) {}
  return sum;
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function _strftime_l(s, maxsize, format, tm) {}

var asmLibraryArg = {
  __cxa_allocate_exception: ___cxa_allocate_exception,
  __cxa_atexit: ___cxa_atexit,
  __cxa_throw: ___cxa_throw,
  abort: _abort,
  clock: _clock,
  emscripten_memcpy_big: _emscripten_memcpy_big,
  emscripten_resize_heap: _emscripten_resize_heap,
  environ_get: _environ_get,
  environ_sizes_get: _environ_sizes_get,
  fd_close: _fd_close,
  fd_seek: _fd_seek,
  fd_write: _fd_write,
  setTempRet0: _setTempRet0,
  strftime_l: _strftime_l,
};
var asm = createWasm();
var ___wasm_call_ctors = (Module["___wasm_call_ctors"] =
  createExportWrapper("__wasm_call_ctors"));
var _mult = (Module["_mult"] = createExportWrapper("mult"));
var ___errno_location = (Module["___errno_location"] =
  createExportWrapper("__errno_location"));
var _fflush = (Module["_fflush"] = createExportWrapper("fflush"));
var stackSave = (Module["stackSave"] = createExportWrapper("stackSave"));
var stackRestore = (Module["stackRestore"] =
  createExportWrapper("stackRestore"));
var stackAlloc = (Module["stackAlloc"] = createExportWrapper("stackAlloc"));
var _emscripten_stack_init = (Module["_emscripten_stack_init"] = function () {
  return (_emscripten_stack_init = Module["_emscripten_stack_init"] =
    Module["asm"]["emscripten_stack_init"]).apply(null, arguments);
});
var _emscripten_stack_get_free = (Module["_emscripten_stack_get_free"] =
  function () {
    return (_emscripten_stack_get_free = Module["_emscripten_stack_get_free"] =
      Module["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
  });
var _emscripten_stack_get_end = (Module["_emscripten_stack_get_end"] =
  function () {
    return (_emscripten_stack_get_end = Module["_emscripten_stack_get_end"] =
      Module["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
  });
var _malloc = (Module["_malloc"] = createExportWrapper("malloc"));

Module["ccall"] = ccall;
Module["cwrap"] = cwrap;
var calledRun;
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};

function stackCheckInit() {
  _emscripten_stack_init();
  writeStackCookie();
}
function run(args) {
  args = args || arguments_;
  if (runDependencies > 0) {
    return;
  }
  stackCheckInit();
  preRun();
  if (runDependencies > 0) {
    return;
  }
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    assert(
      !Module["_main"],
      'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]'
    );
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function () {
      setTimeout(function () {
        Module["setStatus"]("");
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}
Module["run"] = run;

if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function")
    Module["preInit"] = [Module["preInit"]];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}
run();
