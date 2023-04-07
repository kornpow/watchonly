;(function (f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f()
  } else if (typeof define === 'function' && define.amd) {
    define([], f)
  } else {
    var g
    if (typeof window !== 'undefined') {
      g = window
    } else if (typeof global !== 'undefined') {
      g = global
    } else if (typeof self !== 'undefined') {
      g = self
    } else {
      g = this
    }
    g.trezor = f()
  }
})(function () {
  var define, module, exports
  return (function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = 'function' == typeof require && require
            if (!f && c) return c(i, !0)
            if (u) return u(i, !0)
            var a = new Error("Cannot find module '" + i + "'")
            throw ((a.code = 'MODULE_NOT_FOUND'), a)
          }
          var p = (n[i] = {exports: {}})
          e[i][0].call(
            p.exports,
            function (r) {
              var n = e[i][1][r]
              return o(n || r)
            },
            p,
            p.exports,
            r,
            e,
            n,
            t
          )
        }
        return n[i].exports
      }
      for (
        var u = 'function' == typeof require && require, i = 0;
        i < t.length;
        i++
      )
        o(t[i])
      return o
    }
    return r
  })()(
    {
      1: [
        function (require, module, exports) {
          'use strict'

          exports.byteLength = byteLength
          exports.toByteArray = toByteArray
          exports.fromByteArray = fromByteArray

          var lookup = []
          var revLookup = []
          var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

          var code =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
          for (var i = 0, len = code.length; i < len; ++i) {
            lookup[i] = code[i]
            revLookup[code.charCodeAt(i)] = i
          }

          // Support decoding URL-safe base64 strings, as Node.js does.
          // See: https://en.wikipedia.org/wiki/Base64#URL_applications
          revLookup['-'.charCodeAt(0)] = 62
          revLookup['_'.charCodeAt(0)] = 63

          function getLens(b64) {
            var len = b64.length

            if (len % 4 > 0) {
              throw new Error('Invalid string. Length must be a multiple of 4')
            }

            // Trim off extra bytes after placeholder bytes are found
            // See: https://github.com/beatgammit/base64-js/issues/42
            var validLen = b64.indexOf('=')
            if (validLen === -1) validLen = len

            var placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4)

            return [validLen, placeHoldersLen]
          }

          // base64 is 4/3 + up to two characters of the original data
          function byteLength(b64) {
            var lens = getLens(b64)
            var validLen = lens[0]
            var placeHoldersLen = lens[1]
            return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen
          }

          function _byteLength(b64, validLen, placeHoldersLen) {
            return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen
          }

          function toByteArray(b64) {
            var tmp
            var lens = getLens(b64)
            var validLen = lens[0]
            var placeHoldersLen = lens[1]

            var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

            var curByte = 0

            // if there are placeholders, only get up to the last complete 4 chars
            var len = placeHoldersLen > 0 ? validLen - 4 : validLen

            var i
            for (i = 0; i < len; i += 4) {
              tmp =
                (revLookup[b64.charCodeAt(i)] << 18) |
                (revLookup[b64.charCodeAt(i + 1)] << 12) |
                (revLookup[b64.charCodeAt(i + 2)] << 6) |
                revLookup[b64.charCodeAt(i + 3)]
              arr[curByte++] = (tmp >> 16) & 0xff
              arr[curByte++] = (tmp >> 8) & 0xff
              arr[curByte++] = tmp & 0xff
            }

            if (placeHoldersLen === 2) {
              tmp =
                (revLookup[b64.charCodeAt(i)] << 2) |
                (revLookup[b64.charCodeAt(i + 1)] >> 4)
              arr[curByte++] = tmp & 0xff
            }

            if (placeHoldersLen === 1) {
              tmp =
                (revLookup[b64.charCodeAt(i)] << 10) |
                (revLookup[b64.charCodeAt(i + 1)] << 4) |
                (revLookup[b64.charCodeAt(i + 2)] >> 2)
              arr[curByte++] = (tmp >> 8) & 0xff
              arr[curByte++] = tmp & 0xff
            }

            return arr
          }

          function tripletToBase64(num) {
            return (
              lookup[(num >> 18) & 0x3f] +
              lookup[(num >> 12) & 0x3f] +
              lookup[(num >> 6) & 0x3f] +
              lookup[num & 0x3f]
            )
          }

          function encodeChunk(uint8, start, end) {
            var tmp
            var output = []
            for (var i = start; i < end; i += 3) {
              tmp =
                ((uint8[i] << 16) & 0xff0000) +
                ((uint8[i + 1] << 8) & 0xff00) +
                (uint8[i + 2] & 0xff)
              output.push(tripletToBase64(tmp))
            }
            return output.join('')
          }

          function fromByteArray(uint8) {
            var tmp
            var len = uint8.length
            var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
            var parts = []
            var maxChunkLength = 16383 // must be multiple of 3

            // go through the array every three bytes, we'll deal with trailing stuff later
            for (
              var i = 0, len2 = len - extraBytes;
              i < len2;
              i += maxChunkLength
            ) {
              parts.push(
                encodeChunk(
                  uint8,
                  i,
                  i + maxChunkLength > len2 ? len2 : i + maxChunkLength
                )
              )
            }

            // pad the end with zeros, but make sure to not forget the extra bytes
            if (extraBytes === 1) {
              tmp = uint8[len - 1]
              parts.push(lookup[tmp >> 2] + lookup[(tmp << 4) & 0x3f] + '==')
            } else if (extraBytes === 2) {
              tmp = (uint8[len - 2] << 8) + uint8[len - 1]
              parts.push(
                lookup[tmp >> 10] +
                  lookup[(tmp >> 4) & 0x3f] +
                  lookup[(tmp << 2) & 0x3f] +
                  '='
              )
            }

            return parts.join('')
          }
        },
        {}
      ],
      2: [
        function (require, module, exports) {
          ;(function (Buffer) {
            ;(function () {
              /*!
               * The buffer module from node.js, for the browser.
               *
               * @author   Feross Aboukhadijeh <https://feross.org>
               * @license  MIT
               */
              /* eslint-disable no-proto */

              'use strict'

              var base64 = require('base64-js')
              var ieee754 = require('ieee754')

              exports.Buffer = Buffer
              exports.SlowBuffer = SlowBuffer
              exports.INSPECT_MAX_BYTES = 50

              var K_MAX_LENGTH = 0x7fffffff
              exports.kMaxLength = K_MAX_LENGTH

              /**
               * If `Buffer.TYPED_ARRAY_SUPPORT`:
               *   === true    Use Uint8Array implementation (fastest)
               *   === false   Print warning and recommend using `buffer` v4.x which has an Object
               *               implementation (most compatible, even IE6)
               *
               * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
               * Opera 11.6+, iOS 4.2+.
               *
               * We report that the browser does not support typed arrays if the are not subclassable
               * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
               * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
               * for __proto__ and has a buggy typed array implementation.
               */
              Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

              if (
                !Buffer.TYPED_ARRAY_SUPPORT &&
                typeof console !== 'undefined' &&
                typeof console.error === 'function'
              ) {
                console.error(
                  'This browser lacks typed array (Uint8Array) support which is required by ' +
                    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
                )
              }

              function typedArraySupport() {
                // Can typed array instances can be augmented?
                try {
                  var arr = new Uint8Array(1)
                  arr.__proto__ = {
                    __proto__: Uint8Array.prototype,
                    foo: function () {
                      return 42
                    }
                  }
                  return arr.foo() === 42
                } catch (e) {
                  return false
                }
              }

              Object.defineProperty(Buffer.prototype, 'parent', {
                enumerable: true,
                get: function () {
                  if (!Buffer.isBuffer(this)) return undefined
                  return this.buffer
                }
              })

              Object.defineProperty(Buffer.prototype, 'offset', {
                enumerable: true,
                get: function () {
                  if (!Buffer.isBuffer(this)) return undefined
                  return this.byteOffset
                }
              })

              function createBuffer(length) {
                if (length > K_MAX_LENGTH) {
                  throw new RangeError(
                    'The value "' + length + '" is invalid for option "size"'
                  )
                }
                // Return an augmented `Uint8Array` instance
                var buf = new Uint8Array(length)
                buf.__proto__ = Buffer.prototype
                return buf
              }

              /**
               * The Buffer constructor returns instances of `Uint8Array` that have their
               * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
               * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
               * and the `Uint8Array` methods. Square bracket notation works as expected -- it
               * returns a single octet.
               *
               * The `Uint8Array` prototype remains unmodified.
               */

              function Buffer(arg, encodingOrOffset, length) {
                // Common case.
                if (typeof arg === 'number') {
                  if (typeof encodingOrOffset === 'string') {
                    throw new TypeError(
                      'The "string" argument must be of type string. Received type number'
                    )
                  }
                  return allocUnsafe(arg)
                }
                return from(arg, encodingOrOffset, length)
              }

              // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
              if (
                typeof Symbol !== 'undefined' &&
                Symbol.species != null &&
                Buffer[Symbol.species] === Buffer
              ) {
                Object.defineProperty(Buffer, Symbol.species, {
                  value: null,
                  configurable: true,
                  enumerable: false,
                  writable: false
                })
              }

              Buffer.poolSize = 8192 // not used by this implementation

              function from(value, encodingOrOffset, length) {
                if (typeof value === 'string') {
                  return fromString(value, encodingOrOffset)
                }

                if (ArrayBuffer.isView(value)) {
                  return fromArrayLike(value)
                }

                if (value == null) {
                  throw TypeError(
                    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
                      'or Array-like Object. Received type ' +
                      typeof value
                  )
                }

                if (
                  isInstance(value, ArrayBuffer) ||
                  (value && isInstance(value.buffer, ArrayBuffer))
                ) {
                  return fromArrayBuffer(value, encodingOrOffset, length)
                }

                if (typeof value === 'number') {
                  throw new TypeError(
                    'The "value" argument must not be of type number. Received type number'
                  )
                }

                var valueOf = value.valueOf && value.valueOf()
                if (valueOf != null && valueOf !== value) {
                  return Buffer.from(valueOf, encodingOrOffset, length)
                }

                var b = fromObject(value)
                if (b) return b

                if (
                  typeof Symbol !== 'undefined' &&
                  Symbol.toPrimitive != null &&
                  typeof value[Symbol.toPrimitive] === 'function'
                ) {
                  return Buffer.from(
                    value[Symbol.toPrimitive]('string'),
                    encodingOrOffset,
                    length
                  )
                }

                throw new TypeError(
                  'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
                    'or Array-like Object. Received type ' +
                    typeof value
                )
              }

              /**
               * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
               * if value is a number.
               * Buffer.from(str[, encoding])
               * Buffer.from(array)
               * Buffer.from(buffer)
               * Buffer.from(arrayBuffer[, byteOffset[, length]])
               **/
              Buffer.from = function (value, encodingOrOffset, length) {
                return from(value, encodingOrOffset, length)
              }

              // Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
              // https://github.com/feross/buffer/pull/148
              Buffer.prototype.__proto__ = Uint8Array.prototype
              Buffer.__proto__ = Uint8Array

              function assertSize(size) {
                if (typeof size !== 'number') {
                  throw new TypeError('"size" argument must be of type number')
                } else if (size < 0) {
                  throw new RangeError(
                    'The value "' + size + '" is invalid for option "size"'
                  )
                }
              }

              function alloc(size, fill, encoding) {
                assertSize(size)
                if (size <= 0) {
                  return createBuffer(size)
                }
                if (fill !== undefined) {
                  // Only pay attention to encoding if it's a string. This
                  // prevents accidentally sending in a number that would
                  // be interpretted as a start offset.
                  return typeof encoding === 'string'
                    ? createBuffer(size).fill(fill, encoding)
                    : createBuffer(size).fill(fill)
                }
                return createBuffer(size)
              }

              /**
               * Creates a new filled Buffer instance.
               * alloc(size[, fill[, encoding]])
               **/
              Buffer.alloc = function (size, fill, encoding) {
                return alloc(size, fill, encoding)
              }

              function allocUnsafe(size) {
                assertSize(size)
                return createBuffer(size < 0 ? 0 : checked(size) | 0)
              }

              /**
               * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
               * */
              Buffer.allocUnsafe = function (size) {
                return allocUnsafe(size)
              }
              /**
               * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
               */
              Buffer.allocUnsafeSlow = function (size) {
                return allocUnsafe(size)
              }

              function fromString(string, encoding) {
                if (typeof encoding !== 'string' || encoding === '') {
                  encoding = 'utf8'
                }

                if (!Buffer.isEncoding(encoding)) {
                  throw new TypeError('Unknown encoding: ' + encoding)
                }

                var length = byteLength(string, encoding) | 0
                var buf = createBuffer(length)

                var actual = buf.write(string, encoding)

                if (actual !== length) {
                  // Writing a hex string, for example, that contains invalid characters will
                  // cause everything after the first invalid character to be ignored. (e.g.
                  // 'abxxcd' will be treated as 'ab')
                  buf = buf.slice(0, actual)
                }

                return buf
              }

              function fromArrayLike(array) {
                var length = array.length < 0 ? 0 : checked(array.length) | 0
                var buf = createBuffer(length)
                for (var i = 0; i < length; i += 1) {
                  buf[i] = array[i] & 255
                }
                return buf
              }

              function fromArrayBuffer(array, byteOffset, length) {
                if (byteOffset < 0 || array.byteLength < byteOffset) {
                  throw new RangeError('"offset" is outside of buffer bounds')
                }

                if (array.byteLength < byteOffset + (length || 0)) {
                  throw new RangeError('"length" is outside of buffer bounds')
                }

                var buf
                if (byteOffset === undefined && length === undefined) {
                  buf = new Uint8Array(array)
                } else if (length === undefined) {
                  buf = new Uint8Array(array, byteOffset)
                } else {
                  buf = new Uint8Array(array, byteOffset, length)
                }

                // Return an augmented `Uint8Array` instance
                buf.__proto__ = Buffer.prototype
                return buf
              }

              function fromObject(obj) {
                if (Buffer.isBuffer(obj)) {
                  var len = checked(obj.length) | 0
                  var buf = createBuffer(len)

                  if (buf.length === 0) {
                    return buf
                  }

                  obj.copy(buf, 0, 0, len)
                  return buf
                }

                if (obj.length !== undefined) {
                  if (
                    typeof obj.length !== 'number' ||
                    numberIsNaN(obj.length)
                  ) {
                    return createBuffer(0)
                  }
                  return fromArrayLike(obj)
                }

                if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
                  return fromArrayLike(obj.data)
                }
              }

              function checked(length) {
                // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
                // length is NaN (which is otherwise coerced to zero.)
                if (length >= K_MAX_LENGTH) {
                  throw new RangeError(
                    'Attempt to allocate Buffer larger than maximum ' +
                      'size: 0x' +
                      K_MAX_LENGTH.toString(16) +
                      ' bytes'
                  )
                }
                return length | 0
              }

              function SlowBuffer(length) {
                if (+length != length) {
                  // eslint-disable-line eqeqeq
                  length = 0
                }
                return Buffer.alloc(+length)
              }

              Buffer.isBuffer = function isBuffer(b) {
                return (
                  b != null && b._isBuffer === true && b !== Buffer.prototype
                ) // so Buffer.isBuffer(Buffer.prototype) will be false
              }

              Buffer.compare = function compare(a, b) {
                if (isInstance(a, Uint8Array))
                  a = Buffer.from(a, a.offset, a.byteLength)
                if (isInstance(b, Uint8Array))
                  b = Buffer.from(b, b.offset, b.byteLength)
                if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
                  throw new TypeError(
                    'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
                  )
                }

                if (a === b) return 0

                var x = a.length
                var y = b.length

                for (var i = 0, len = Math.min(x, y); i < len; ++i) {
                  if (a[i] !== b[i]) {
                    x = a[i]
                    y = b[i]
                    break
                  }
                }

                if (x < y) return -1
                if (y < x) return 1
                return 0
              }

              Buffer.isEncoding = function isEncoding(encoding) {
                switch (String(encoding).toLowerCase()) {
                  case 'hex':
                  case 'utf8':
                  case 'utf-8':
                  case 'ascii':
                  case 'latin1':
                  case 'binary':
                  case 'base64':
                  case 'ucs2':
                  case 'ucs-2':
                  case 'utf16le':
                  case 'utf-16le':
                    return true
                  default:
                    return false
                }
              }

              Buffer.concat = function concat(list, length) {
                if (!Array.isArray(list)) {
                  throw new TypeError(
                    '"list" argument must be an Array of Buffers'
                  )
                }

                if (list.length === 0) {
                  return Buffer.alloc(0)
                }

                var i
                if (length === undefined) {
                  length = 0
                  for (i = 0; i < list.length; ++i) {
                    length += list[i].length
                  }
                }

                var buffer = Buffer.allocUnsafe(length)
                var pos = 0
                for (i = 0; i < list.length; ++i) {
                  var buf = list[i]
                  if (isInstance(buf, Uint8Array)) {
                    buf = Buffer.from(buf)
                  }
                  if (!Buffer.isBuffer(buf)) {
                    throw new TypeError(
                      '"list" argument must be an Array of Buffers'
                    )
                  }
                  buf.copy(buffer, pos)
                  pos += buf.length
                }
                return buffer
              }

              function byteLength(string, encoding) {
                if (Buffer.isBuffer(string)) {
                  return string.length
                }
                if (
                  ArrayBuffer.isView(string) ||
                  isInstance(string, ArrayBuffer)
                ) {
                  return string.byteLength
                }
                if (typeof string !== 'string') {
                  throw new TypeError(
                    'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
                      'Received type ' +
                      typeof string
                  )
                }

                var len = string.length
                var mustMatch = arguments.length > 2 && arguments[2] === true
                if (!mustMatch && len === 0) return 0

                // Use a for loop to avoid recursion
                var loweredCase = false
                for (;;) {
                  switch (encoding) {
                    case 'ascii':
                    case 'latin1':
                    case 'binary':
                      return len
                    case 'utf8':
                    case 'utf-8':
                      return utf8ToBytes(string).length
                    case 'ucs2':
                    case 'ucs-2':
                    case 'utf16le':
                    case 'utf-16le':
                      return len * 2
                    case 'hex':
                      return len >>> 1
                    case 'base64':
                      return base64ToBytes(string).length
                    default:
                      if (loweredCase) {
                        return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
                      }
                      encoding = ('' + encoding).toLowerCase()
                      loweredCase = true
                  }
                }
              }
              Buffer.byteLength = byteLength

              function slowToString(encoding, start, end) {
                var loweredCase = false

                // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
                // property of a typed array.

                // This behaves neither like String nor Uint8Array in that we set start/end
                // to their upper/lower bounds if the value passed is out of range.
                // undefined is handled specially as per ECMA-262 6th Edition,
                // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
                if (start === undefined || start < 0) {
                  start = 0
                }
                // Return early if start > this.length. Done here to prevent potential uint32
                // coercion fail below.
                if (start > this.length) {
                  return ''
                }

                if (end === undefined || end > this.length) {
                  end = this.length
                }

                if (end <= 0) {
                  return ''
                }

                // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
                end >>>= 0
                start >>>= 0

                if (end <= start) {
                  return ''
                }

                if (!encoding) encoding = 'utf8'

                while (true) {
                  switch (encoding) {
                    case 'hex':
                      return hexSlice(this, start, end)

                    case 'utf8':
                    case 'utf-8':
                      return utf8Slice(this, start, end)

                    case 'ascii':
                      return asciiSlice(this, start, end)

                    case 'latin1':
                    case 'binary':
                      return latin1Slice(this, start, end)

                    case 'base64':
                      return base64Slice(this, start, end)

                    case 'ucs2':
                    case 'ucs-2':
                    case 'utf16le':
                    case 'utf-16le':
                      return utf16leSlice(this, start, end)

                    default:
                      if (loweredCase)
                        throw new TypeError('Unknown encoding: ' + encoding)
                      encoding = (encoding + '').toLowerCase()
                      loweredCase = true
                  }
                }
              }

              // This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
              // to detect a Buffer instance. It's not possible to use `instanceof Buffer`
              // reliably in a browserify context because there could be multiple different
              // copies of the 'buffer' package in use. This method works even for Buffer
              // instances that were created from another copy of the `buffer` package.
              // See: https://github.com/feross/buffer/issues/154
              Buffer.prototype._isBuffer = true

              function swap(b, n, m) {
                var i = b[n]
                b[n] = b[m]
                b[m] = i
              }

              Buffer.prototype.swap16 = function swap16() {
                var len = this.length
                if (len % 2 !== 0) {
                  throw new RangeError(
                    'Buffer size must be a multiple of 16-bits'
                  )
                }
                for (var i = 0; i < len; i += 2) {
                  swap(this, i, i + 1)
                }
                return this
              }

              Buffer.prototype.swap32 = function swap32() {
                var len = this.length
                if (len % 4 !== 0) {
                  throw new RangeError(
                    'Buffer size must be a multiple of 32-bits'
                  )
                }
                for (var i = 0; i < len; i += 4) {
                  swap(this, i, i + 3)
                  swap(this, i + 1, i + 2)
                }
                return this
              }

              Buffer.prototype.swap64 = function swap64() {
                var len = this.length
                if (len % 8 !== 0) {
                  throw new RangeError(
                    'Buffer size must be a multiple of 64-bits'
                  )
                }
                for (var i = 0; i < len; i += 8) {
                  swap(this, i, i + 7)
                  swap(this, i + 1, i + 6)
                  swap(this, i + 2, i + 5)
                  swap(this, i + 3, i + 4)
                }
                return this
              }

              Buffer.prototype.toString = function toString() {
                var length = this.length
                if (length === 0) return ''
                if (arguments.length === 0) return utf8Slice(this, 0, length)
                return slowToString.apply(this, arguments)
              }

              Buffer.prototype.toLocaleString = Buffer.prototype.toString

              Buffer.prototype.equals = function equals(b) {
                if (!Buffer.isBuffer(b))
                  throw new TypeError('Argument must be a Buffer')
                if (this === b) return true
                return Buffer.compare(this, b) === 0
              }

              Buffer.prototype.inspect = function inspect() {
                var str = ''
                var max = exports.INSPECT_MAX_BYTES
                str = this.toString('hex', 0, max)
                  .replace(/(.{2})/g, '$1 ')
                  .trim()
                if (this.length > max) str += ' ... '
                return '<Buffer ' + str + '>'
              }

              Buffer.prototype.compare = function compare(
                target,
                start,
                end,
                thisStart,
                thisEnd
              ) {
                if (isInstance(target, Uint8Array)) {
                  target = Buffer.from(target, target.offset, target.byteLength)
                }
                if (!Buffer.isBuffer(target)) {
                  throw new TypeError(
                    'The "target" argument must be one of type Buffer or Uint8Array. ' +
                      'Received type ' +
                      typeof target
                  )
                }

                if (start === undefined) {
                  start = 0
                }
                if (end === undefined) {
                  end = target ? target.length : 0
                }
                if (thisStart === undefined) {
                  thisStart = 0
                }
                if (thisEnd === undefined) {
                  thisEnd = this.length
                }

                if (
                  start < 0 ||
                  end > target.length ||
                  thisStart < 0 ||
                  thisEnd > this.length
                ) {
                  throw new RangeError('out of range index')
                }

                if (thisStart >= thisEnd && start >= end) {
                  return 0
                }
                if (thisStart >= thisEnd) {
                  return -1
                }
                if (start >= end) {
                  return 1
                }

                start >>>= 0
                end >>>= 0
                thisStart >>>= 0
                thisEnd >>>= 0

                if (this === target) return 0

                var x = thisEnd - thisStart
                var y = end - start
                var len = Math.min(x, y)

                var thisCopy = this.slice(thisStart, thisEnd)
                var targetCopy = target.slice(start, end)

                for (var i = 0; i < len; ++i) {
                  if (thisCopy[i] !== targetCopy[i]) {
                    x = thisCopy[i]
                    y = targetCopy[i]
                    break
                  }
                }

                if (x < y) return -1
                if (y < x) return 1
                return 0
              }

              // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
              // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
              //
              // Arguments:
              // - buffer - a Buffer to search
              // - val - a string, Buffer, or number
              // - byteOffset - an index into `buffer`; will be clamped to an int32
              // - encoding - an optional encoding, relevant is val is a string
              // - dir - true for indexOf, false for lastIndexOf
              function bidirectionalIndexOf(
                buffer,
                val,
                byteOffset,
                encoding,
                dir
              ) {
                // Empty buffer means no match
                if (buffer.length === 0) return -1

                // Normalize byteOffset
                if (typeof byteOffset === 'string') {
                  encoding = byteOffset
                  byteOffset = 0
                } else if (byteOffset > 0x7fffffff) {
                  byteOffset = 0x7fffffff
                } else if (byteOffset < -0x80000000) {
                  byteOffset = -0x80000000
                }
                byteOffset = +byteOffset // Coerce to Number.
                if (numberIsNaN(byteOffset)) {
                  // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
                  byteOffset = dir ? 0 : buffer.length - 1
                }

                // Normalize byteOffset: negative offsets start from the end of the buffer
                if (byteOffset < 0) byteOffset = buffer.length + byteOffset
                if (byteOffset >= buffer.length) {
                  if (dir) return -1
                  else byteOffset = buffer.length - 1
                } else if (byteOffset < 0) {
                  if (dir) byteOffset = 0
                  else return -1
                }

                // Normalize val
                if (typeof val === 'string') {
                  val = Buffer.from(val, encoding)
                }

                // Finally, search either indexOf (if dir is true) or lastIndexOf
                if (Buffer.isBuffer(val)) {
                  // Special case: looking for empty string/buffer always fails
                  if (val.length === 0) {
                    return -1
                  }
                  return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
                } else if (typeof val === 'number') {
                  val = val & 0xff // Search for a byte value [0-255]
                  if (typeof Uint8Array.prototype.indexOf === 'function') {
                    if (dir) {
                      return Uint8Array.prototype.indexOf.call(
                        buffer,
                        val,
                        byteOffset
                      )
                    } else {
                      return Uint8Array.prototype.lastIndexOf.call(
                        buffer,
                        val,
                        byteOffset
                      )
                    }
                  }
                  return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
                }

                throw new TypeError('val must be string, number or Buffer')
              }

              function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
                var indexSize = 1
                var arrLength = arr.length
                var valLength = val.length

                if (encoding !== undefined) {
                  encoding = String(encoding).toLowerCase()
                  if (
                    encoding === 'ucs2' ||
                    encoding === 'ucs-2' ||
                    encoding === 'utf16le' ||
                    encoding === 'utf-16le'
                  ) {
                    if (arr.length < 2 || val.length < 2) {
                      return -1
                    }
                    indexSize = 2
                    arrLength /= 2
                    valLength /= 2
                    byteOffset /= 2
                  }
                }

                function read(buf, i) {
                  if (indexSize === 1) {
                    return buf[i]
                  } else {
                    return buf.readUInt16BE(i * indexSize)
                  }
                }

                var i
                if (dir) {
                  var foundIndex = -1
                  for (i = byteOffset; i < arrLength; i++) {
                    if (
                      read(arr, i) ===
                      read(val, foundIndex === -1 ? 0 : i - foundIndex)
                    ) {
                      if (foundIndex === -1) foundIndex = i
                      if (i - foundIndex + 1 === valLength)
                        return foundIndex * indexSize
                    } else {
                      if (foundIndex !== -1) i -= i - foundIndex
                      foundIndex = -1
                    }
                  }
                } else {
                  if (byteOffset + valLength > arrLength)
                    byteOffset = arrLength - valLength
                  for (i = byteOffset; i >= 0; i--) {
                    var found = true
                    for (var j = 0; j < valLength; j++) {
                      if (read(arr, i + j) !== read(val, j)) {
                        found = false
                        break
                      }
                    }
                    if (found) return i
                  }
                }

                return -1
              }

              Buffer.prototype.includes = function includes(
                val,
                byteOffset,
                encoding
              ) {
                return this.indexOf(val, byteOffset, encoding) !== -1
              }

              Buffer.prototype.indexOf = function indexOf(
                val,
                byteOffset,
                encoding
              ) {
                return bidirectionalIndexOf(
                  this,
                  val,
                  byteOffset,
                  encoding,
                  true
                )
              }

              Buffer.prototype.lastIndexOf = function lastIndexOf(
                val,
                byteOffset,
                encoding
              ) {
                return bidirectionalIndexOf(
                  this,
                  val,
                  byteOffset,
                  encoding,
                  false
                )
              }

              function hexWrite(buf, string, offset, length) {
                offset = Number(offset) || 0
                var remaining = buf.length - offset
                if (!length) {
                  length = remaining
                } else {
                  length = Number(length)
                  if (length > remaining) {
                    length = remaining
                  }
                }

                var strLen = string.length

                if (length > strLen / 2) {
                  length = strLen / 2
                }
                for (var i = 0; i < length; ++i) {
                  var parsed = parseInt(string.substr(i * 2, 2), 16)
                  if (numberIsNaN(parsed)) return i
                  buf[offset + i] = parsed
                }
                return i
              }

              function utf8Write(buf, string, offset, length) {
                return blitBuffer(
                  utf8ToBytes(string, buf.length - offset),
                  buf,
                  offset,
                  length
                )
              }

              function asciiWrite(buf, string, offset, length) {
                return blitBuffer(asciiToBytes(string), buf, offset, length)
              }

              function latin1Write(buf, string, offset, length) {
                return asciiWrite(buf, string, offset, length)
              }

              function base64Write(buf, string, offset, length) {
                return blitBuffer(base64ToBytes(string), buf, offset, length)
              }

              function ucs2Write(buf, string, offset, length) {
                return blitBuffer(
                  utf16leToBytes(string, buf.length - offset),
                  buf,
                  offset,
                  length
                )
              }

              Buffer.prototype.write = function write(
                string,
                offset,
                length,
                encoding
              ) {
                // Buffer#write(string)
                if (offset === undefined) {
                  encoding = 'utf8'
                  length = this.length
                  offset = 0
                  // Buffer#write(string, encoding)
                } else if (length === undefined && typeof offset === 'string') {
                  encoding = offset
                  length = this.length
                  offset = 0
                  // Buffer#write(string, offset[, length][, encoding])
                } else if (isFinite(offset)) {
                  offset = offset >>> 0
                  if (isFinite(length)) {
                    length = length >>> 0
                    if (encoding === undefined) encoding = 'utf8'
                  } else {
                    encoding = length
                    length = undefined
                  }
                } else {
                  throw new Error(
                    'Buffer.write(string, encoding, offset[, length]) is no longer supported'
                  )
                }

                var remaining = this.length - offset
                if (length === undefined || length > remaining)
                  length = remaining

                if (
                  (string.length > 0 && (length < 0 || offset < 0)) ||
                  offset > this.length
                ) {
                  throw new RangeError('Attempt to write outside buffer bounds')
                }

                if (!encoding) encoding = 'utf8'

                var loweredCase = false
                for (;;) {
                  switch (encoding) {
                    case 'hex':
                      return hexWrite(this, string, offset, length)

                    case 'utf8':
                    case 'utf-8':
                      return utf8Write(this, string, offset, length)

                    case 'ascii':
                      return asciiWrite(this, string, offset, length)

                    case 'latin1':
                    case 'binary':
                      return latin1Write(this, string, offset, length)

                    case 'base64':
                      // Warning: maxLength not taken into account in base64Write
                      return base64Write(this, string, offset, length)

                    case 'ucs2':
                    case 'ucs-2':
                    case 'utf16le':
                    case 'utf-16le':
                      return ucs2Write(this, string, offset, length)

                    default:
                      if (loweredCase)
                        throw new TypeError('Unknown encoding: ' + encoding)
                      encoding = ('' + encoding).toLowerCase()
                      loweredCase = true
                  }
                }
              }

              Buffer.prototype.toJSON = function toJSON() {
                return {
                  type: 'Buffer',
                  data: Array.prototype.slice.call(this._arr || this, 0)
                }
              }

              function base64Slice(buf, start, end) {
                if (start === 0 && end === buf.length) {
                  return base64.fromByteArray(buf)
                } else {
                  return base64.fromByteArray(buf.slice(start, end))
                }
              }

              function utf8Slice(buf, start, end) {
                end = Math.min(buf.length, end)
                var res = []

                var i = start
                while (i < end) {
                  var firstByte = buf[i]
                  var codePoint = null
                  var bytesPerSequence =
                    firstByte > 0xef
                      ? 4
                      : firstByte > 0xdf
                      ? 3
                      : firstByte > 0xbf
                      ? 2
                      : 1

                  if (i + bytesPerSequence <= end) {
                    var secondByte, thirdByte, fourthByte, tempCodePoint

                    switch (bytesPerSequence) {
                      case 1:
                        if (firstByte < 0x80) {
                          codePoint = firstByte
                        }
                        break
                      case 2:
                        secondByte = buf[i + 1]
                        if ((secondByte & 0xc0) === 0x80) {
                          tempCodePoint =
                            ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f)
                          if (tempCodePoint > 0x7f) {
                            codePoint = tempCodePoint
                          }
                        }
                        break
                      case 3:
                        secondByte = buf[i + 1]
                        thirdByte = buf[i + 2]
                        if (
                          (secondByte & 0xc0) === 0x80 &&
                          (thirdByte & 0xc0) === 0x80
                        ) {
                          tempCodePoint =
                            ((firstByte & 0xf) << 0xc) |
                            ((secondByte & 0x3f) << 0x6) |
                            (thirdByte & 0x3f)
                          if (
                            tempCodePoint > 0x7ff &&
                            (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)
                          ) {
                            codePoint = tempCodePoint
                          }
                        }
                        break
                      case 4:
                        secondByte = buf[i + 1]
                        thirdByte = buf[i + 2]
                        fourthByte = buf[i + 3]
                        if (
                          (secondByte & 0xc0) === 0x80 &&
                          (thirdByte & 0xc0) === 0x80 &&
                          (fourthByte & 0xc0) === 0x80
                        ) {
                          tempCodePoint =
                            ((firstByte & 0xf) << 0x12) |
                            ((secondByte & 0x3f) << 0xc) |
                            ((thirdByte & 0x3f) << 0x6) |
                            (fourthByte & 0x3f)
                          if (
                            tempCodePoint > 0xffff &&
                            tempCodePoint < 0x110000
                          ) {
                            codePoint = tempCodePoint
                          }
                        }
                    }
                  }

                  if (codePoint === null) {
                    // we did not generate a valid codePoint so insert a
                    // replacement char (U+FFFD) and advance only 1 byte
                    codePoint = 0xfffd
                    bytesPerSequence = 1
                  } else if (codePoint > 0xffff) {
                    // encode to utf16 (surrogate pair dance)
                    codePoint -= 0x10000
                    res.push(((codePoint >>> 10) & 0x3ff) | 0xd800)
                    codePoint = 0xdc00 | (codePoint & 0x3ff)
                  }

                  res.push(codePoint)
                  i += bytesPerSequence
                }

                return decodeCodePointsArray(res)
              }

              // Based on http://stackoverflow.com/a/22747272/680742, the browser with
              // the lowest limit is Chrome, with 0x10000 args.
              // We go 1 magnitude less, for safety
              var MAX_ARGUMENTS_LENGTH = 0x1000

              function decodeCodePointsArray(codePoints) {
                var len = codePoints.length
                if (len <= MAX_ARGUMENTS_LENGTH) {
                  return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
                }

                // Decode in chunks to avoid "call stack size exceeded".
                var res = ''
                var i = 0
                while (i < len) {
                  res += String.fromCharCode.apply(
                    String,
                    codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH))
                  )
                }
                return res
              }

              function asciiSlice(buf, start, end) {
                var ret = ''
                end = Math.min(buf.length, end)

                for (var i = start; i < end; ++i) {
                  ret += String.fromCharCode(buf[i] & 0x7f)
                }
                return ret
              }

              function latin1Slice(buf, start, end) {
                var ret = ''
                end = Math.min(buf.length, end)

                for (var i = start; i < end; ++i) {
                  ret += String.fromCharCode(buf[i])
                }
                return ret
              }

              function hexSlice(buf, start, end) {
                var len = buf.length

                if (!start || start < 0) start = 0
                if (!end || end < 0 || end > len) end = len

                var out = ''
                for (var i = start; i < end; ++i) {
                  out += toHex(buf[i])
                }
                return out
              }

              function utf16leSlice(buf, start, end) {
                var bytes = buf.slice(start, end)
                var res = ''
                for (var i = 0; i < bytes.length; i += 2) {
                  res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
                }
                return res
              }

              Buffer.prototype.slice = function slice(start, end) {
                var len = this.length
                start = ~~start
                end = end === undefined ? len : ~~end

                if (start < 0) {
                  start += len
                  if (start < 0) start = 0
                } else if (start > len) {
                  start = len
                }

                if (end < 0) {
                  end += len
                  if (end < 0) end = 0
                } else if (end > len) {
                  end = len
                }

                if (end < start) end = start

                var newBuf = this.subarray(start, end)
                // Return an augmented `Uint8Array` instance
                newBuf.__proto__ = Buffer.prototype
                return newBuf
              }

              /*
               * Need to make sure that buffer isn't trying to write out of bounds.
               */
              function checkOffset(offset, ext, length) {
                if (offset % 1 !== 0 || offset < 0)
                  throw new RangeError('offset is not uint')
                if (offset + ext > length)
                  throw new RangeError('Trying to access beyond buffer length')
              }

              Buffer.prototype.readUIntLE = function readUIntLE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0
                byteLength = byteLength >>> 0
                if (!noAssert) checkOffset(offset, byteLength, this.length)

                var val = this[offset]
                var mul = 1
                var i = 0
                while (++i < byteLength && (mul *= 0x100)) {
                  val += this[offset + i] * mul
                }

                return val
              }

              Buffer.prototype.readUIntBE = function readUIntBE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0
                byteLength = byteLength >>> 0
                if (!noAssert) {
                  checkOffset(offset, byteLength, this.length)
                }

                var val = this[offset + --byteLength]
                var mul = 1
                while (byteLength > 0 && (mul *= 0x100)) {
                  val += this[offset + --byteLength] * mul
                }

                return val
              }

              Buffer.prototype.readUInt8 = function readUInt8(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 1, this.length)
                return this[offset]
              }

              Buffer.prototype.readUInt16LE = function readUInt16LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 2, this.length)
                return this[offset] | (this[offset + 1] << 8)
              }

              Buffer.prototype.readUInt16BE = function readUInt16BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 2, this.length)
                return (this[offset] << 8) | this[offset + 1]
              }

              Buffer.prototype.readUInt32LE = function readUInt32LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 4, this.length)

                return (
                  (this[offset] |
                    (this[offset + 1] << 8) |
                    (this[offset + 2] << 16)) +
                  this[offset + 3] * 0x1000000
                )
              }

              Buffer.prototype.readUInt32BE = function readUInt32BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 4, this.length)

                return (
                  this[offset] * 0x1000000 +
                  ((this[offset + 1] << 16) |
                    (this[offset + 2] << 8) |
                    this[offset + 3])
                )
              }

              Buffer.prototype.readIntLE = function readIntLE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0
                byteLength = byteLength >>> 0
                if (!noAssert) checkOffset(offset, byteLength, this.length)

                var val = this[offset]
                var mul = 1
                var i = 0
                while (++i < byteLength && (mul *= 0x100)) {
                  val += this[offset + i] * mul
                }
                mul *= 0x80

                if (val >= mul) val -= Math.pow(2, 8 * byteLength)

                return val
              }

              Buffer.prototype.readIntBE = function readIntBE(
                offset,
                byteLength,
                noAssert
              ) {
                offset = offset >>> 0
                byteLength = byteLength >>> 0
                if (!noAssert) checkOffset(offset, byteLength, this.length)

                var i = byteLength
                var mul = 1
                var val = this[offset + --i]
                while (i > 0 && (mul *= 0x100)) {
                  val += this[offset + --i] * mul
                }
                mul *= 0x80

                if (val >= mul) val -= Math.pow(2, 8 * byteLength)

                return val
              }

              Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 1, this.length)
                if (!(this[offset] & 0x80)) return this[offset]
                return (0xff - this[offset] + 1) * -1
              }

              Buffer.prototype.readInt16LE = function readInt16LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 2, this.length)
                var val = this[offset] | (this[offset + 1] << 8)
                return val & 0x8000 ? val | 0xffff0000 : val
              }

              Buffer.prototype.readInt16BE = function readInt16BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 2, this.length)
                var val = this[offset + 1] | (this[offset] << 8)
                return val & 0x8000 ? val | 0xffff0000 : val
              }

              Buffer.prototype.readInt32LE = function readInt32LE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 4, this.length)

                return (
                  this[offset] |
                  (this[offset + 1] << 8) |
                  (this[offset + 2] << 16) |
                  (this[offset + 3] << 24)
                )
              }

              Buffer.prototype.readInt32BE = function readInt32BE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 4, this.length)

                return (
                  (this[offset] << 24) |
                  (this[offset + 1] << 16) |
                  (this[offset + 2] << 8) |
                  this[offset + 3]
                )
              }

              Buffer.prototype.readFloatLE = function readFloatLE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 4, this.length)
                return ieee754.read(this, offset, true, 23, 4)
              }

              Buffer.prototype.readFloatBE = function readFloatBE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 4, this.length)
                return ieee754.read(this, offset, false, 23, 4)
              }

              Buffer.prototype.readDoubleLE = function readDoubleLE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 8, this.length)
                return ieee754.read(this, offset, true, 52, 8)
              }

              Buffer.prototype.readDoubleBE = function readDoubleBE(
                offset,
                noAssert
              ) {
                offset = offset >>> 0
                if (!noAssert) checkOffset(offset, 8, this.length)
                return ieee754.read(this, offset, false, 52, 8)
              }

              function checkInt(buf, value, offset, ext, max, min) {
                if (!Buffer.isBuffer(buf))
                  throw new TypeError(
                    '"buffer" argument must be a Buffer instance'
                  )
                if (value > max || value < min)
                  throw new RangeError('"value" argument is out of bounds')
                if (offset + ext > buf.length)
                  throw new RangeError('Index out of range')
              }

              Buffer.prototype.writeUIntLE = function writeUIntLE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                byteLength = byteLength >>> 0
                if (!noAssert) {
                  var maxBytes = Math.pow(2, 8 * byteLength) - 1
                  checkInt(this, value, offset, byteLength, maxBytes, 0)
                }

                var mul = 1
                var i = 0
                this[offset] = value & 0xff
                while (++i < byteLength && (mul *= 0x100)) {
                  this[offset + i] = (value / mul) & 0xff
                }

                return offset + byteLength
              }

              Buffer.prototype.writeUIntBE = function writeUIntBE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                byteLength = byteLength >>> 0
                if (!noAssert) {
                  var maxBytes = Math.pow(2, 8 * byteLength) - 1
                  checkInt(this, value, offset, byteLength, maxBytes, 0)
                }

                var i = byteLength - 1
                var mul = 1
                this[offset + i] = value & 0xff
                while (--i >= 0 && (mul *= 0x100)) {
                  this[offset + i] = (value / mul) & 0xff
                }

                return offset + byteLength
              }

              Buffer.prototype.writeUInt8 = function writeUInt8(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
                this[offset] = value & 0xff
                return offset + 1
              }

              Buffer.prototype.writeUInt16LE = function writeUInt16LE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
                this[offset] = value & 0xff
                this[offset + 1] = value >>> 8
                return offset + 2
              }

              Buffer.prototype.writeUInt16BE = function writeUInt16BE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
                this[offset] = value >>> 8
                this[offset + 1] = value & 0xff
                return offset + 2
              }

              Buffer.prototype.writeUInt32LE = function writeUInt32LE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
                this[offset + 3] = value >>> 24
                this[offset + 2] = value >>> 16
                this[offset + 1] = value >>> 8
                this[offset] = value & 0xff
                return offset + 4
              }

              Buffer.prototype.writeUInt32BE = function writeUInt32BE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
                this[offset] = value >>> 24
                this[offset + 1] = value >>> 16
                this[offset + 2] = value >>> 8
                this[offset + 3] = value & 0xff
                return offset + 4
              }

              Buffer.prototype.writeIntLE = function writeIntLE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) {
                  var limit = Math.pow(2, 8 * byteLength - 1)

                  checkInt(this, value, offset, byteLength, limit - 1, -limit)
                }

                var i = 0
                var mul = 1
                var sub = 0
                this[offset] = value & 0xff
                while (++i < byteLength && (mul *= 0x100)) {
                  if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
                    sub = 1
                  }
                  this[offset + i] = (((value / mul) >> 0) - sub) & 0xff
                }

                return offset + byteLength
              }

              Buffer.prototype.writeIntBE = function writeIntBE(
                value,
                offset,
                byteLength,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) {
                  var limit = Math.pow(2, 8 * byteLength - 1)

                  checkInt(this, value, offset, byteLength, limit - 1, -limit)
                }

                var i = byteLength - 1
                var mul = 1
                var sub = 0
                this[offset + i] = value & 0xff
                while (--i >= 0 && (mul *= 0x100)) {
                  if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
                    sub = 1
                  }
                  this[offset + i] = (((value / mul) >> 0) - sub) & 0xff
                }

                return offset + byteLength
              }

              Buffer.prototype.writeInt8 = function writeInt8(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
                if (value < 0) value = 0xff + value + 1
                this[offset] = value & 0xff
                return offset + 1
              }

              Buffer.prototype.writeInt16LE = function writeInt16LE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
                this[offset] = value & 0xff
                this[offset + 1] = value >>> 8
                return offset + 2
              }

              Buffer.prototype.writeInt16BE = function writeInt16BE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
                this[offset] = value >>> 8
                this[offset + 1] = value & 0xff
                return offset + 2
              }

              Buffer.prototype.writeInt32LE = function writeInt32LE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert)
                  checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
                this[offset] = value & 0xff
                this[offset + 1] = value >>> 8
                this[offset + 2] = value >>> 16
                this[offset + 3] = value >>> 24
                return offset + 4
              }

              Buffer.prototype.writeInt32BE = function writeInt32BE(
                value,
                offset,
                noAssert
              ) {
                value = +value
                offset = offset >>> 0
                if (!noAssert)
                  checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
                if (value < 0) value = 0xffffffff + value + 1
                this[offset] = value >>> 24
                this[offset + 1] = value >>> 16
                this[offset + 2] = value >>> 8
                this[offset + 3] = value & 0xff
                return offset + 4
              }

              function checkIEEE754(buf, value, offset, ext, max, min) {
                if (offset + ext > buf.length)
                  throw new RangeError('Index out of range')
                if (offset < 0) throw new RangeError('Index out of range')
              }

              function writeFloat(buf, value, offset, littleEndian, noAssert) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) {
                  checkIEEE754(
                    buf,
                    value,
                    offset,
                    4,
                    3.4028234663852886e38,
                    -3.4028234663852886e38
                  )
                }
                ieee754.write(buf, value, offset, littleEndian, 23, 4)
                return offset + 4
              }

              Buffer.prototype.writeFloatLE = function writeFloatLE(
                value,
                offset,
                noAssert
              ) {
                return writeFloat(this, value, offset, true, noAssert)
              }

              Buffer.prototype.writeFloatBE = function writeFloatBE(
                value,
                offset,
                noAssert
              ) {
                return writeFloat(this, value, offset, false, noAssert)
              }

              function writeDouble(buf, value, offset, littleEndian, noAssert) {
                value = +value
                offset = offset >>> 0
                if (!noAssert) {
                  checkIEEE754(
                    buf,
                    value,
                    offset,
                    8,
                    1.7976931348623157e308,
                    -1.7976931348623157e308
                  )
                }
                ieee754.write(buf, value, offset, littleEndian, 52, 8)
                return offset + 8
              }

              Buffer.prototype.writeDoubleLE = function writeDoubleLE(
                value,
                offset,
                noAssert
              ) {
                return writeDouble(this, value, offset, true, noAssert)
              }

              Buffer.prototype.writeDoubleBE = function writeDoubleBE(
                value,
                offset,
                noAssert
              ) {
                return writeDouble(this, value, offset, false, noAssert)
              }

              // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
              Buffer.prototype.copy = function copy(
                target,
                targetStart,
                start,
                end
              ) {
                if (!Buffer.isBuffer(target))
                  throw new TypeError('argument should be a Buffer')
                if (!start) start = 0
                if (!end && end !== 0) end = this.length
                if (targetStart >= target.length) targetStart = target.length
                if (!targetStart) targetStart = 0
                if (end > 0 && end < start) end = start

                // Copy 0 bytes; we're done
                if (end === start) return 0
                if (target.length === 0 || this.length === 0) return 0

                // Fatal error conditions
                if (targetStart < 0) {
                  throw new RangeError('targetStart out of bounds')
                }
                if (start < 0 || start >= this.length)
                  throw new RangeError('Index out of range')
                if (end < 0) throw new RangeError('sourceEnd out of bounds')

                // Are we oob?
                if (end > this.length) end = this.length
                if (target.length - targetStart < end - start) {
                  end = target.length - targetStart + start
                }

                var len = end - start

                if (
                  this === target &&
                  typeof Uint8Array.prototype.copyWithin === 'function'
                ) {
                  // Use built-in when available, missing from IE11
                  this.copyWithin(targetStart, start, end)
                } else if (
                  this === target &&
                  start < targetStart &&
                  targetStart < end
                ) {
                  // descending copy from end
                  for (var i = len - 1; i >= 0; --i) {
                    target[i + targetStart] = this[i + start]
                  }
                } else {
                  Uint8Array.prototype.set.call(
                    target,
                    this.subarray(start, end),
                    targetStart
                  )
                }

                return len
              }

              // Usage:
              //    buffer.fill(number[, offset[, end]])
              //    buffer.fill(buffer[, offset[, end]])
              //    buffer.fill(string[, offset[, end]][, encoding])
              Buffer.prototype.fill = function fill(val, start, end, encoding) {
                // Handle string cases:
                if (typeof val === 'string') {
                  if (typeof start === 'string') {
                    encoding = start
                    start = 0
                    end = this.length
                  } else if (typeof end === 'string') {
                    encoding = end
                    end = this.length
                  }
                  if (encoding !== undefined && typeof encoding !== 'string') {
                    throw new TypeError('encoding must be a string')
                  }
                  if (
                    typeof encoding === 'string' &&
                    !Buffer.isEncoding(encoding)
                  ) {
                    throw new TypeError('Unknown encoding: ' + encoding)
                  }
                  if (val.length === 1) {
                    var code = val.charCodeAt(0)
                    if (
                      (encoding === 'utf8' && code < 128) ||
                      encoding === 'latin1'
                    ) {
                      // Fast path: If `val` fits into a single byte, use that numeric value.
                      val = code
                    }
                  }
                } else if (typeof val === 'number') {
                  val = val & 255
                }

                // Invalid ranges are not set to a default, so can range check early.
                if (start < 0 || this.length < start || this.length < end) {
                  throw new RangeError('Out of range index')
                }

                if (end <= start) {
                  return this
                }

                start = start >>> 0
                end = end === undefined ? this.length : end >>> 0

                if (!val) val = 0

                var i
                if (typeof val === 'number') {
                  for (i = start; i < end; ++i) {
                    this[i] = val
                  }
                } else {
                  var bytes = Buffer.isBuffer(val)
                    ? val
                    : Buffer.from(val, encoding)
                  var len = bytes.length
                  if (len === 0) {
                    throw new TypeError(
                      'The value "' + val + '" is invalid for argument "value"'
                    )
                  }
                  for (i = 0; i < end - start; ++i) {
                    this[i + start] = bytes[i % len]
                  }
                }

                return this
              }

              // HELPER FUNCTIONS
              // ================

              var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

              function base64clean(str) {
                // Node takes equal signs as end of the Base64 encoding
                str = str.split('=')[0]
                // Node strips out invalid characters like \n and \t from the string, base64-js does not
                str = str.trim().replace(INVALID_BASE64_RE, '')
                // Node converts strings with length < 2 to ''
                if (str.length < 2) return ''
                // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
                while (str.length % 4 !== 0) {
                  str = str + '='
                }
                return str
              }

              function toHex(n) {
                if (n < 16) return '0' + n.toString(16)
                return n.toString(16)
              }

              function utf8ToBytes(string, units) {
                units = units || Infinity
                var codePoint
                var length = string.length
                var leadSurrogate = null
                var bytes = []

                for (var i = 0; i < length; ++i) {
                  codePoint = string.charCodeAt(i)

                  // is surrogate component
                  if (codePoint > 0xd7ff && codePoint < 0xe000) {
                    // last char was a lead
                    if (!leadSurrogate) {
                      // no lead yet
                      if (codePoint > 0xdbff) {
                        // unexpected trail
                        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
                        continue
                      } else if (i + 1 === length) {
                        // unpaired lead
                        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
                        continue
                      }

                      // valid lead
                      leadSurrogate = codePoint

                      continue
                    }

                    // 2 leads in a row
                    if (codePoint < 0xdc00) {
                      if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
                      leadSurrogate = codePoint
                      continue
                    }

                    // valid surrogate pair
                    codePoint =
                      (((leadSurrogate - 0xd800) << 10) |
                        (codePoint - 0xdc00)) +
                      0x10000
                  } else if (leadSurrogate) {
                    // valid bmp char, but last char was a lead
                    if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
                  }

                  leadSurrogate = null

                  // encode utf8
                  if (codePoint < 0x80) {
                    if ((units -= 1) < 0) break
                    bytes.push(codePoint)
                  } else if (codePoint < 0x800) {
                    if ((units -= 2) < 0) break
                    bytes.push(
                      (codePoint >> 0x6) | 0xc0,
                      (codePoint & 0x3f) | 0x80
                    )
                  } else if (codePoint < 0x10000) {
                    if ((units -= 3) < 0) break
                    bytes.push(
                      (codePoint >> 0xc) | 0xe0,
                      ((codePoint >> 0x6) & 0x3f) | 0x80,
                      (codePoint & 0x3f) | 0x80
                    )
                  } else if (codePoint < 0x110000) {
                    if ((units -= 4) < 0) break
                    bytes.push(
                      (codePoint >> 0x12) | 0xf0,
                      ((codePoint >> 0xc) & 0x3f) | 0x80,
                      ((codePoint >> 0x6) & 0x3f) | 0x80,
                      (codePoint & 0x3f) | 0x80
                    )
                  } else {
                    throw new Error('Invalid code point')
                  }
                }

                return bytes
              }

              function asciiToBytes(str) {
                var byteArray = []
                for (var i = 0; i < str.length; ++i) {
                  // Node's code seems to be doing this and not & 0x7F..
                  byteArray.push(str.charCodeAt(i) & 0xff)
                }
                return byteArray
              }

              function utf16leToBytes(str, units) {
                var c, hi, lo
                var byteArray = []
                for (var i = 0; i < str.length; ++i) {
                  if ((units -= 2) < 0) break

                  c = str.charCodeAt(i)
                  hi = c >> 8
                  lo = c % 256
                  byteArray.push(lo)
                  byteArray.push(hi)
                }

                return byteArray
              }

              function base64ToBytes(str) {
                return base64.toByteArray(base64clean(str))
              }

              function blitBuffer(src, dst, offset, length) {
                for (var i = 0; i < length; ++i) {
                  if (i + offset >= dst.length || i >= src.length) break
                  dst[i + offset] = src[i]
                }
                return i
              }

              // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
              // the `instanceof` check but they should be treated as of that type.
              // See: https://github.com/feross/buffer/issues/166
              function isInstance(obj, type) {
                return (
                  obj instanceof type ||
                  (obj != null &&
                    obj.constructor != null &&
                    obj.constructor.name != null &&
                    obj.constructor.name === type.name)
                )
              }
              function numberIsNaN(obj) {
                // For IE11 support
                return obj !== obj // eslint-disable-line no-self-compare
              }
            }).call(this)
          }).call(this, require('buffer').Buffer)
        },
        {'base64-js': 1, buffer: 2, ieee754: 4}
      ],
      3: [
        function (require, module, exports) {
          // Copyright Joyent, Inc. and other Node contributors.
          //
          // Permission is hereby granted, free of charge, to any person obtaining a
          // copy of this software and associated documentation files (the
          // "Software"), to deal in the Software without restriction, including
          // without limitation the rights to use, copy, modify, merge, publish,
          // distribute, sublicense, and/or sell copies of the Software, and to permit
          // persons to whom the Software is furnished to do so, subject to the
          // following conditions:
          //
          // The above copyright notice and this permission notice shall be included
          // in all copies or substantial portions of the Software.
          //
          // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
          // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
          // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
          // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
          // USE OR OTHER DEALINGS IN THE SOFTWARE.

          'use strict'

          var R = typeof Reflect === 'object' ? Reflect : null
          var ReflectApply =
            R && typeof R.apply === 'function'
              ? R.apply
              : function ReflectApply(target, receiver, args) {
                  return Function.prototype.apply.call(target, receiver, args)
                }

          var ReflectOwnKeys
          if (R && typeof R.ownKeys === 'function') {
            ReflectOwnKeys = R.ownKeys
          } else if (Object.getOwnPropertySymbols) {
            ReflectOwnKeys = function ReflectOwnKeys(target) {
              return Object.getOwnPropertyNames(target).concat(
                Object.getOwnPropertySymbols(target)
              )
            }
          } else {
            ReflectOwnKeys = function ReflectOwnKeys(target) {
              return Object.getOwnPropertyNames(target)
            }
          }

          function ProcessEmitWarning(warning) {
            if (console && console.warn) console.warn(warning)
          }

          var NumberIsNaN =
            Number.isNaN ||
            function NumberIsNaN(value) {
              return value !== value
            }

          function EventEmitter() {
            EventEmitter.init.call(this)
          }
          module.exports = EventEmitter
          module.exports.once = once

          // Backwards-compat with node 0.10.x
          EventEmitter.EventEmitter = EventEmitter

          EventEmitter.prototype._events = undefined
          EventEmitter.prototype._eventsCount = 0
          EventEmitter.prototype._maxListeners = undefined

          // By default EventEmitters will print a warning if more than 10 listeners are
          // added to it. This is a useful default which helps finding memory leaks.
          var defaultMaxListeners = 10

          function checkListener(listener) {
            if (typeof listener !== 'function') {
              throw new TypeError(
                'The "listener" argument must be of type Function. Received type ' +
                  typeof listener
              )
            }
          }

          Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
            enumerable: true,
            get: function () {
              return defaultMaxListeners
            },
            set: function (arg) {
              if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
                throw new RangeError(
                  'The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' +
                    arg +
                    '.'
                )
              }
              defaultMaxListeners = arg
            }
          })

          EventEmitter.init = function () {
            if (
              this._events === undefined ||
              this._events === Object.getPrototypeOf(this)._events
            ) {
              this._events = Object.create(null)
              this._eventsCount = 0
            }

            this._maxListeners = this._maxListeners || undefined
          }

          // Obviously not all Emitters should be limited to 10. This function allows
          // that to be increased. Set to zero for unlimited.
          EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
            if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
              throw new RangeError(
                'The value of "n" is out of range. It must be a non-negative number. Received ' +
                  n +
                  '.'
              )
            }
            this._maxListeners = n
            return this
          }

          function _getMaxListeners(that) {
            if (that._maxListeners === undefined)
              return EventEmitter.defaultMaxListeners
            return that._maxListeners
          }

          EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
            return _getMaxListeners(this)
          }

          EventEmitter.prototype.emit = function emit(type) {
            var args = []
            for (var i = 1; i < arguments.length; i++) args.push(arguments[i])
            var doError = type === 'error'

            var events = this._events
            if (events !== undefined)
              doError = doError && events.error === undefined
            else if (!doError) return false

            // If there is no 'error' event listener then throw.
            if (doError) {
              var er
              if (args.length > 0) er = args[0]
              if (er instanceof Error) {
                // Note: The comments on the `throw` lines are intentional, they show
                // up in Node's output if this results in an unhandled exception.
                throw er // Unhandled 'error' event
              }
              // At least give some kind of context to the user
              var err = new Error(
                'Unhandled error.' + (er ? ' (' + er.message + ')' : '')
              )
              err.context = er
              throw err // Unhandled 'error' event
            }

            var handler = events[type]

            if (handler === undefined) return false

            if (typeof handler === 'function') {
              ReflectApply(handler, this, args)
            } else {
              var len = handler.length
              var listeners = arrayClone(handler, len)
              for (var i = 0; i < len; ++i)
                ReflectApply(listeners[i], this, args)
            }

            return true
          }

          function _addListener(target, type, listener, prepend) {
            var m
            var events
            var existing

            checkListener(listener)

            events = target._events
            if (events === undefined) {
              events = target._events = Object.create(null)
              target._eventsCount = 0
            } else {
              // To avoid recursion in the case that type === "newListener"! Before
              // adding it to the listeners, first emit "newListener".
              if (events.newListener !== undefined) {
                target.emit(
                  'newListener',
                  type,
                  listener.listener ? listener.listener : listener
                )

                // Re-assign `events` because a newListener handler could have caused the
                // this._events to be assigned to a new object
                events = target._events
              }
              existing = events[type]
            }

            if (existing === undefined) {
              // Optimize the case of one listener. Don't need the extra array object.
              existing = events[type] = listener
              ++target._eventsCount
            } else {
              if (typeof existing === 'function') {
                // Adding the second element, need to change to array.
                existing = events[type] = prepend
                  ? [listener, existing]
                  : [existing, listener]
                // If we've already got an array, just append.
              } else if (prepend) {
                existing.unshift(listener)
              } else {
                existing.push(listener)
              }

              // Check for listener leak
              m = _getMaxListeners(target)
              if (m > 0 && existing.length > m && !existing.warned) {
                existing.warned = true
                // No error code for this since it is a Warning
                // eslint-disable-next-line no-restricted-syntax
                var w = new Error(
                  'Possible EventEmitter memory leak detected. ' +
                    existing.length +
                    ' ' +
                    String(type) +
                    ' listeners ' +
                    'added. Use emitter.setMaxListeners() to ' +
                    'increase limit'
                )
                w.name = 'MaxListenersExceededWarning'
                w.emitter = target
                w.type = type
                w.count = existing.length
                ProcessEmitWarning(w)
              }
            }

            return target
          }

          EventEmitter.prototype.addListener = function addListener(
            type,
            listener
          ) {
            return _addListener(this, type, listener, false)
          }

          EventEmitter.prototype.on = EventEmitter.prototype.addListener

          EventEmitter.prototype.prependListener = function prependListener(
            type,
            listener
          ) {
            return _addListener(this, type, listener, true)
          }

          function onceWrapper() {
            if (!this.fired) {
              this.target.removeListener(this.type, this.wrapFn)
              this.fired = true
              if (arguments.length === 0) return this.listener.call(this.target)
              return this.listener.apply(this.target, arguments)
            }
          }

          function _onceWrap(target, type, listener) {
            var state = {
              fired: false,
              wrapFn: undefined,
              target: target,
              type: type,
              listener: listener
            }
            var wrapped = onceWrapper.bind(state)
            wrapped.listener = listener
            state.wrapFn = wrapped
            return wrapped
          }

          EventEmitter.prototype.once = function once(type, listener) {
            checkListener(listener)
            this.on(type, _onceWrap(this, type, listener))
            return this
          }

          EventEmitter.prototype.prependOnceListener =
            function prependOnceListener(type, listener) {
              checkListener(listener)
              this.prependListener(type, _onceWrap(this, type, listener))
              return this
            }

          // Emits a 'removeListener' event if and only if the listener was removed.
          EventEmitter.prototype.removeListener = function removeListener(
            type,
            listener
          ) {
            var list, events, position, i, originalListener

            checkListener(listener)

            events = this._events
            if (events === undefined) return this

            list = events[type]
            if (list === undefined) return this

            if (list === listener || list.listener === listener) {
              if (--this._eventsCount === 0) this._events = Object.create(null)
              else {
                delete events[type]
                if (events.removeListener)
                  this.emit('removeListener', type, list.listener || listener)
              }
            } else if (typeof list !== 'function') {
              position = -1

              for (i = list.length - 1; i >= 0; i--) {
                if (list[i] === listener || list[i].listener === listener) {
                  originalListener = list[i].listener
                  position = i
                  break
                }
              }

              if (position < 0) return this

              if (position === 0) list.shift()
              else {
                spliceOne(list, position)
              }

              if (list.length === 1) events[type] = list[0]

              if (events.removeListener !== undefined)
                this.emit('removeListener', type, originalListener || listener)
            }

            return this
          }

          EventEmitter.prototype.off = EventEmitter.prototype.removeListener

          EventEmitter.prototype.removeAllListeners =
            function removeAllListeners(type) {
              var listeners, events, i

              events = this._events
              if (events === undefined) return this

              // not listening for removeListener, no need to emit
              if (events.removeListener === undefined) {
                if (arguments.length === 0) {
                  this._events = Object.create(null)
                  this._eventsCount = 0
                } else if (events[type] !== undefined) {
                  if (--this._eventsCount === 0)
                    this._events = Object.create(null)
                  else delete events[type]
                }
                return this
              }

              // emit removeListener for all listeners on all events
              if (arguments.length === 0) {
                var keys = Object.keys(events)
                var key
                for (i = 0; i < keys.length; ++i) {
                  key = keys[i]
                  if (key === 'removeListener') continue
                  this.removeAllListeners(key)
                }
                this.removeAllListeners('removeListener')
                this._events = Object.create(null)
                this._eventsCount = 0
                return this
              }

              listeners = events[type]

              if (typeof listeners === 'function') {
                this.removeListener(type, listeners)
              } else if (listeners !== undefined) {
                // LIFO order
                for (i = listeners.length - 1; i >= 0; i--) {
                  this.removeListener(type, listeners[i])
                }
              }

              return this
            }

          function _listeners(target, type, unwrap) {
            var events = target._events

            if (events === undefined) return []

            var evlistener = events[type]
            if (evlistener === undefined) return []

            if (typeof evlistener === 'function')
              return unwrap ? [evlistener.listener || evlistener] : [evlistener]

            return unwrap
              ? unwrapListeners(evlistener)
              : arrayClone(evlistener, evlistener.length)
          }

          EventEmitter.prototype.listeners = function listeners(type) {
            return _listeners(this, type, true)
          }

          EventEmitter.prototype.rawListeners = function rawListeners(type) {
            return _listeners(this, type, false)
          }

          EventEmitter.listenerCount = function (emitter, type) {
            if (typeof emitter.listenerCount === 'function') {
              return emitter.listenerCount(type)
            } else {
              return listenerCount.call(emitter, type)
            }
          }

          EventEmitter.prototype.listenerCount = listenerCount
          function listenerCount(type) {
            var events = this._events

            if (events !== undefined) {
              var evlistener = events[type]

              if (typeof evlistener === 'function') {
                return 1
              } else if (evlistener !== undefined) {
                return evlistener.length
              }
            }

            return 0
          }

          EventEmitter.prototype.eventNames = function eventNames() {
            return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : []
          }

          function arrayClone(arr, n) {
            var copy = new Array(n)
            for (var i = 0; i < n; ++i) copy[i] = arr[i]
            return copy
          }

          function spliceOne(list, index) {
            for (; index + 1 < list.length; index++)
              list[index] = list[index + 1]
            list.pop()
          }

          function unwrapListeners(arr) {
            var ret = new Array(arr.length)
            for (var i = 0; i < ret.length; ++i) {
              ret[i] = arr[i].listener || arr[i]
            }
            return ret
          }

          function once(emitter, name) {
            return new Promise(function (resolve, reject) {
              function errorListener(err) {
                emitter.removeListener(name, resolver)
                reject(err)
              }

              function resolver() {
                if (typeof emitter.removeListener === 'function') {
                  emitter.removeListener('error', errorListener)
                }
                resolve([].slice.call(arguments))
              }

              eventTargetAgnosticAddListener(emitter, name, resolver, {
                once: true
              })
              if (name !== 'error') {
                addErrorHandlerIfEventEmitter(emitter, errorListener, {
                  once: true
                })
              }
            })
          }

          function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
            if (typeof emitter.on === 'function') {
              eventTargetAgnosticAddListener(emitter, 'error', handler, flags)
            }
          }

          function eventTargetAgnosticAddListener(
            emitter,
            name,
            listener,
            flags
          ) {
            if (typeof emitter.on === 'function') {
              if (flags.once) {
                emitter.once(name, listener)
              } else {
                emitter.on(name, listener)
              }
            } else if (typeof emitter.addEventListener === 'function') {
              // EventTarget does not have `error` event semantics like Node
              // EventEmitters, we do not listen for `error` events here.
              emitter.addEventListener(name, function wrapListener(arg) {
                // IE does not have builtin `{ once: true }` support so we
                // have to do it manually.
                if (flags.once) {
                  emitter.removeEventListener(name, wrapListener)
                }
                listener(arg)
              })
            } else {
              throw new TypeError(
                'The "emitter" argument must be of type EventEmitter. Received type ' +
                  typeof emitter
              )
            }
          }
        },
        {}
      ],
      4: [
        function (require, module, exports) {
          /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
          exports.read = function (buffer, offset, isLE, mLen, nBytes) {
            var e, m
            var eLen = nBytes * 8 - mLen - 1
            var eMax = (1 << eLen) - 1
            var eBias = eMax >> 1
            var nBits = -7
            var i = isLE ? nBytes - 1 : 0
            var d = isLE ? -1 : 1
            var s = buffer[offset + i]

            i += d

            e = s & ((1 << -nBits) - 1)
            s >>= -nBits
            nBits += eLen
            for (
              ;
              nBits > 0;
              e = e * 256 + buffer[offset + i], i += d, nBits -= 8
            ) {}

            m = e & ((1 << -nBits) - 1)
            e >>= -nBits
            nBits += mLen
            for (
              ;
              nBits > 0;
              m = m * 256 + buffer[offset + i], i += d, nBits -= 8
            ) {}

            if (e === 0) {
              e = 1 - eBias
            } else if (e === eMax) {
              return m ? NaN : (s ? -1 : 1) * Infinity
            } else {
              m = m + Math.pow(2, mLen)
              e = e - eBias
            }
            return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
          }

          exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
            var e, m, c
            var eLen = nBytes * 8 - mLen - 1
            var eMax = (1 << eLen) - 1
            var eBias = eMax >> 1
            var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0
            var i = isLE ? 0 : nBytes - 1
            var d = isLE ? 1 : -1
            var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

            value = Math.abs(value)

            if (isNaN(value) || value === Infinity) {
              m = isNaN(value) ? 1 : 0
              e = eMax
            } else {
              e = Math.floor(Math.log(value) / Math.LN2)
              if (value * (c = Math.pow(2, -e)) < 1) {
                e--
                c *= 2
              }
              if (e + eBias >= 1) {
                value += rt / c
              } else {
                value += rt * Math.pow(2, 1 - eBias)
              }
              if (value * c >= 2) {
                e++
                c /= 2
              }

              if (e + eBias >= eMax) {
                m = 0
                e = eMax
              } else if (e + eBias >= 1) {
                m = (value * c - 1) * Math.pow(2, mLen)
                e = e + eBias
              } else {
                m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
                e = 0
              }
            }

            for (
              ;
              mLen >= 8;
              buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8
            ) {}

            e = (e << mLen) | m
            eLen += mLen
            for (
              ;
              eLen > 0;
              buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8
            ) {}

            buffer[offset + i - d] |= s * 128
          }
        },
        {}
      ],
      5: [
        function (require, module, exports) {
          // shim for using process in browser
          var process = (module.exports = {})

          // cached from whatever global is present so that test runners that stub it
          // don't break things.  But we need to wrap it in a try catch in case it is
          // wrapped in strict mode code which doesn't define any globals.  It's inside a
          // function because try/catches deoptimize in certain engines.

          var cachedSetTimeout
          var cachedClearTimeout

          function defaultSetTimout() {
            throw new Error('setTimeout has not been defined')
          }
          function defaultClearTimeout() {
            throw new Error('clearTimeout has not been defined')
          }
          ;(function () {
            try {
              if (typeof setTimeout === 'function') {
                cachedSetTimeout = setTimeout
              } else {
                cachedSetTimeout = defaultSetTimout
              }
            } catch (e) {
              cachedSetTimeout = defaultSetTimout
            }
            try {
              if (typeof clearTimeout === 'function') {
                cachedClearTimeout = clearTimeout
              } else {
                cachedClearTimeout = defaultClearTimeout
              }
            } catch (e) {
              cachedClearTimeout = defaultClearTimeout
            }
          })()
          function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
              //normal enviroments in sane situations
              return setTimeout(fun, 0)
            }
            // if setTimeout wasn't available but was latter defined
            if (
              (cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) &&
              setTimeout
            ) {
              cachedSetTimeout = setTimeout
              return setTimeout(fun, 0)
            }
            try {
              // when when somebody has screwed with setTimeout but no I.E. maddness
              return cachedSetTimeout(fun, 0)
            } catch (e) {
              try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0)
              } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0)
              }
            }
          }
          function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
              //normal enviroments in sane situations
              return clearTimeout(marker)
            }
            // if clearTimeout wasn't available but was latter defined
            if (
              (cachedClearTimeout === defaultClearTimeout ||
                !cachedClearTimeout) &&
              clearTimeout
            ) {
              cachedClearTimeout = clearTimeout
              return clearTimeout(marker)
            }
            try {
              // when when somebody has screwed with setTimeout but no I.E. maddness
              return cachedClearTimeout(marker)
            } catch (e) {
              try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker)
              } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker)
              }
            }
          }
          var queue = []
          var draining = false
          var currentQueue
          var queueIndex = -1

          function cleanUpNextTick() {
            if (!draining || !currentQueue) {
              return
            }
            draining = false
            if (currentQueue.length) {
              queue = currentQueue.concat(queue)
            } else {
              queueIndex = -1
            }
            if (queue.length) {
              drainQueue()
            }
          }

          function drainQueue() {
            if (draining) {
              return
            }
            var timeout = runTimeout(cleanUpNextTick)
            draining = true

            var len = queue.length
            while (len) {
              currentQueue = queue
              queue = []
              while (++queueIndex < len) {
                if (currentQueue) {
                  currentQueue[queueIndex].run()
                }
              }
              queueIndex = -1
              len = queue.length
            }
            currentQueue = null
            draining = false
            runClearTimeout(timeout)
          }

          process.nextTick = function (fun) {
            var args = new Array(arguments.length - 1)
            if (arguments.length > 1) {
              for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i]
              }
            }
            queue.push(new Item(fun, args))
            if (queue.length === 1 && !draining) {
              runTimeout(drainQueue)
            }
          }

          // v8 likes predictible objects
          function Item(fun, array) {
            this.fun = fun
            this.array = array
          }
          Item.prototype.run = function () {
            this.fun.apply(null, this.array)
          }
          process.title = 'browser'
          process.browser = true
          process.env = {}
          process.argv = []
          process.version = '' // empty string to avoid regexp issues
          process.versions = {}

          function noop() {}

          process.on = noop
          process.addListener = noop
          process.once = noop
          process.off = noop
          process.removeListener = noop
          process.removeAllListeners = noop
          process.emit = noop
          process.prependListener = noop
          process.prependOnceListener = noop

          process.listeners = function (name) {
            return []
          }

          process.binding = function (name) {
            throw new Error('process.binding is not supported')
          }

          process.cwd = function () {
            return '/'
          }
          process.chdir = function (dir) {
            throw new Error('process.chdir is not supported')
          }
          process.umask = function () {
            return 0
          }
        },
        {}
      ],
      6: [
        function (require, module, exports) {
          'use strict'
          module.exports = asPromise

          /**
           * Callback as used by {@link util.asPromise}.
           * @typedef asPromiseCallback
           * @type {function}
           * @param {Error|null} error Error, if any
           * @param {...*} params Additional arguments
           * @returns {undefined}
           */

          /**
           * Returns a promise from a node-style callback function.
           * @memberof util
           * @param {asPromiseCallback} fn Function to call
           * @param {*} ctx Function context
           * @param {...*} params Function arguments
           * @returns {Promise<*>} Promisified function
           */
          function asPromise(fn, ctx /*, varargs */) {
            var params = new Array(arguments.length - 1),
              offset = 0,
              index = 2,
              pending = true
            while (index < arguments.length)
              params[offset++] = arguments[index++]
            return new Promise(function executor(resolve, reject) {
              params[offset] = function callback(err /*, varargs */) {
                if (pending) {
                  pending = false
                  if (err) reject(err)
                  else {
                    var params = new Array(arguments.length - 1),
                      offset = 0
                    while (offset < params.length)
                      params[offset++] = arguments[offset]
                    resolve.apply(null, params)
                  }
                }
              }
              try {
                fn.apply(ctx || null, params)
              } catch (err) {
                if (pending) {
                  pending = false
                  reject(err)
                }
              }
            })
          }
        },
        {}
      ],
      7: [
        function (require, module, exports) {
          'use strict'

          /**
           * A minimal base64 implementation for number arrays.
           * @memberof util
           * @namespace
           */
          var base64 = exports

          /**
           * Calculates the byte length of a base64 encoded string.
           * @param {string} string Base64 encoded string
           * @returns {number} Byte length
           */
          base64.length = function length(string) {
            var p = string.length
            if (!p) return 0
            var n = 0
            while (--p % 4 > 1 && string.charAt(p) === '=') ++n
            return Math.ceil(string.length * 3) / 4 - n
          }

          // Base64 encoding table
          var b64 = new Array(64)

          // Base64 decoding table
          var s64 = new Array(123)

          // 65..90, 97..122, 48..57, 43, 47
          for (var i = 0; i < 64; )
            s64[
              (b64[i] =
                i < 26
                  ? i + 65
                  : i < 52
                  ? i + 71
                  : i < 62
                  ? i - 4
                  : (i - 59) | 43)
            ] = i++

          /**
           * Encodes a buffer to a base64 encoded string.
           * @param {Uint8Array} buffer Source buffer
           * @param {number} start Source start
           * @param {number} end Source end
           * @returns {string} Base64 encoded string
           */
          base64.encode = function encode(buffer, start, end) {
            var parts = null,
              chunk = []
            var i = 0, // output index
              j = 0, // goto index
              t // temporary
            while (start < end) {
              var b = buffer[start++]
              switch (j) {
                case 0:
                  chunk[i++] = b64[b >> 2]
                  t = (b & 3) << 4
                  j = 1
                  break
                case 1:
                  chunk[i++] = b64[t | (b >> 4)]
                  t = (b & 15) << 2
                  j = 2
                  break
                case 2:
                  chunk[i++] = b64[t | (b >> 6)]
                  chunk[i++] = b64[b & 63]
                  j = 0
                  break
              }
              if (i > 8191) {
                ;(parts || (parts = [])).push(
                  String.fromCharCode.apply(String, chunk)
                )
                i = 0
              }
            }
            if (j) {
              chunk[i++] = b64[t]
              chunk[i++] = 61
              if (j === 1) chunk[i++] = 61
            }
            if (parts) {
              if (i)
                parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)))
              return parts.join('')
            }
            return String.fromCharCode.apply(String, chunk.slice(0, i))
          }

          var invalidEncoding = 'invalid encoding'

          /**
           * Decodes a base64 encoded string to a buffer.
           * @param {string} string Source string
           * @param {Uint8Array} buffer Destination buffer
           * @param {number} offset Destination offset
           * @returns {number} Number of bytes written
           * @throws {Error} If encoding is invalid
           */
          base64.decode = function decode(string, buffer, offset) {
            var start = offset
            var j = 0, // goto index
              t // temporary
            for (var i = 0; i < string.length; ) {
              var c = string.charCodeAt(i++)
              if (c === 61 && j > 1) break
              if ((c = s64[c]) === undefined) throw Error(invalidEncoding)
              switch (j) {
                case 0:
                  t = c
                  j = 1
                  break
                case 1:
                  buffer[offset++] = (t << 2) | ((c & 48) >> 4)
                  t = c
                  j = 2
                  break
                case 2:
                  buffer[offset++] = ((t & 15) << 4) | ((c & 60) >> 2)
                  t = c
                  j = 3
                  break
                case 3:
                  buffer[offset++] = ((t & 3) << 6) | c
                  j = 0
                  break
              }
            }
            if (j === 1) throw Error(invalidEncoding)
            return offset - start
          }

          /**
           * Tests if the specified string appears to be base64 encoded.
           * @param {string} string String to test
           * @returns {boolean} `true` if probably base64 encoded, otherwise false
           */
          base64.test = function test(string) {
            return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
              string
            )
          }
        },
        {}
      ],
      8: [
        function (require, module, exports) {
          'use strict'
          module.exports = codegen

          /**
           * Begins generating a function.
           * @memberof util
           * @param {string[]} functionParams Function parameter names
           * @param {string} [functionName] Function name if not anonymous
           * @returns {Codegen} Appender that appends code to the function's body
           */
          function codegen(functionParams, functionName) {
            /* istanbul ignore if */
            if (typeof functionParams === 'string') {
              functionName = functionParams
              functionParams = undefined
            }

            var body = []

            /**
             * Appends code to the function's body or finishes generation.
             * @typedef Codegen
             * @type {function}
             * @param {string|Object.<string,*>} [formatStringOrScope] Format string or, to finish the function, an object of additional scope variables, if any
             * @param {...*} [formatParams] Format parameters
             * @returns {Codegen|Function} Itself or the generated function if finished
             * @throws {Error} If format parameter counts do not match
             */

            function Codegen(formatStringOrScope) {
              // note that explicit array handling below makes this ~50% faster

              // finish the function
              if (typeof formatStringOrScope !== 'string') {
                var source = toString()
                if (codegen.verbose) console.log('codegen: ' + source) // eslint-disable-line no-console
                source = 'return ' + source
                if (formatStringOrScope) {
                  var scopeKeys = Object.keys(formatStringOrScope),
                    scopeParams = new Array(scopeKeys.length + 1),
                    scopeValues = new Array(scopeKeys.length),
                    scopeOffset = 0
                  while (scopeOffset < scopeKeys.length) {
                    scopeParams[scopeOffset] = scopeKeys[scopeOffset]
                    scopeValues[scopeOffset] =
                      formatStringOrScope[scopeKeys[scopeOffset++]]
                  }
                  scopeParams[scopeOffset] = source
                  return Function.apply(null, scopeParams).apply(
                    null,
                    scopeValues
                  ) // eslint-disable-line no-new-func
                }
                return Function(source)() // eslint-disable-line no-new-func
              }

              // otherwise append to body
              var formatParams = new Array(arguments.length - 1),
                formatOffset = 0
              while (formatOffset < formatParams.length)
                formatParams[formatOffset] = arguments[++formatOffset]
              formatOffset = 0
              formatStringOrScope = formatStringOrScope.replace(
                /%([%dfijs])/g,
                function replace($0, $1) {
                  var value = formatParams[formatOffset++]
                  switch ($1) {
                    case 'd':
                    case 'f':
                      return String(Number(value))
                    case 'i':
                      return String(Math.floor(value))
                    case 'j':
                      return JSON.stringify(value)
                    case 's':
                      return String(value)
                  }
                  return '%'
                }
              )
              if (formatOffset !== formatParams.length)
                throw Error('parameter count mismatch')
              body.push(formatStringOrScope)
              return Codegen
            }

            function toString(functionNameOverride) {
              return (
                'function ' +
                (functionNameOverride || functionName || '') +
                '(' +
                ((functionParams && functionParams.join(',')) || '') +
                '){\n  ' +
                body.join('\n  ') +
                '\n}'
              )
            }

            Codegen.toString = toString
            return Codegen
          }

          /**
           * Begins generating a function.
           * @memberof util
           * @function codegen
           * @param {string} [functionName] Function name if not anonymous
           * @returns {Codegen} Appender that appends code to the function's body
           * @variation 2
           */

          /**
           * When set to `true`, codegen will log generated code to console. Useful for debugging.
           * @name util.codegen.verbose
           * @type {boolean}
           */
          codegen.verbose = false
        },
        {}
      ],
      9: [
        function (require, module, exports) {
          'use strict'
          module.exports = EventEmitter

          /**
           * Constructs a new event emitter instance.
           * @classdesc A minimal event emitter.
           * @memberof util
           * @constructor
           */
          function EventEmitter() {
            /**
             * Registered listeners.
             * @type {Object.<string,*>}
             * @private
             */
            this._listeners = {}
          }

          /**
           * Registers an event listener.
           * @param {string} evt Event name
           * @param {function} fn Listener
           * @param {*} [ctx] Listener context
           * @returns {util.EventEmitter} `this`
           */
          EventEmitter.prototype.on = function on(evt, fn, ctx) {
            ;(this._listeners[evt] || (this._listeners[evt] = [])).push({
              fn: fn,
              ctx: ctx || this
            })
            return this
          }

          /**
           * Removes an event listener or any matching listeners if arguments are omitted.
           * @param {string} [evt] Event name. Removes all listeners if omitted.
           * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
           * @returns {util.EventEmitter} `this`
           */
          EventEmitter.prototype.off = function off(evt, fn) {
            if (evt === undefined) this._listeners = {}
            else {
              if (fn === undefined) this._listeners[evt] = []
              else {
                var listeners = this._listeners[evt]
                for (var i = 0; i < listeners.length; )
                  if (listeners[i].fn === fn) listeners.splice(i, 1)
                  else ++i
              }
            }
            return this
          }

          /**
           * Emits an event by calling its listeners with the specified arguments.
           * @param {string} evt Event name
           * @param {...*} args Arguments
           * @returns {util.EventEmitter} `this`
           */
          EventEmitter.prototype.emit = function emit(evt) {
            var listeners = this._listeners[evt]
            if (listeners) {
              var args = [],
                i = 1
              for (; i < arguments.length; ) args.push(arguments[i++])
              for (i = 0; i < listeners.length; )
                listeners[i].fn.apply(listeners[i++].ctx, args)
            }
            return this
          }
        },
        {}
      ],
      10: [
        function (require, module, exports) {
          'use strict'
          module.exports = fetch

          var asPromise = require('@protobufjs/aspromise'),
            inquire = require('@protobufjs/inquire')

          var fs = inquire('fs')

          /**
           * Node-style callback as used by {@link util.fetch}.
           * @typedef FetchCallback
           * @type {function}
           * @param {?Error} error Error, if any, otherwise `null`
           * @param {string} [contents] File contents, if there hasn't been an error
           * @returns {undefined}
           */

          /**
           * Options as used by {@link util.fetch}.
           * @typedef FetchOptions
           * @type {Object}
           * @property {boolean} [binary=false] Whether expecting a binary response
           * @property {boolean} [xhr=false] If `true`, forces the use of XMLHttpRequest
           */

          /**
           * Fetches the contents of a file.
           * @memberof util
           * @param {string} filename File path or url
           * @param {FetchOptions} options Fetch options
           * @param {FetchCallback} callback Callback function
           * @returns {undefined}
           */
          function fetch(filename, options, callback) {
            if (typeof options === 'function') {
              callback = options
              options = {}
            } else if (!options) options = {}

            if (!callback) return asPromise(fetch, this, filename, options) // eslint-disable-line no-invalid-this

            // if a node-like filesystem is present, try it first but fall back to XHR if nothing is found.
            if (!options.xhr && fs && fs.readFile)
              return fs.readFile(
                filename,
                function fetchReadFileCallback(err, contents) {
                  return err && typeof XMLHttpRequest !== 'undefined'
                    ? fetch.xhr(filename, options, callback)
                    : err
                    ? callback(err)
                    : callback(
                        null,
                        options.binary ? contents : contents.toString('utf8')
                      )
                }
              )

            // use the XHR version otherwise.
            return fetch.xhr(filename, options, callback)
          }

          /**
           * Fetches the contents of a file.
           * @name util.fetch
           * @function
           * @param {string} path File path or url
           * @param {FetchCallback} callback Callback function
           * @returns {undefined}
           * @variation 2
           */

          /**
           * Fetches the contents of a file.
           * @name util.fetch
           * @function
           * @param {string} path File path or url
           * @param {FetchOptions} [options] Fetch options
           * @returns {Promise<string|Uint8Array>} Promise
           * @variation 3
           */

          /**/
          fetch.xhr = function fetch_xhr(filename, options, callback) {
            var xhr = new XMLHttpRequest()
            xhr.onreadystatechange /* works everywhere */ =
              function fetchOnReadyStateChange() {
                if (xhr.readyState !== 4) return undefined

                // local cors security errors return status 0 / empty string, too. afaik this cannot be
                // reliably distinguished from an actually empty file for security reasons. feel free
                // to send a pull request if you are aware of a solution.
                if (xhr.status !== 0 && xhr.status !== 200)
                  return callback(Error('status ' + xhr.status))

                // if binary data is expected, make sure that some sort of array is returned, even if
                // ArrayBuffers are not supported. the binary string fallback, however, is unsafe.
                if (options.binary) {
                  var buffer = xhr.response
                  if (!buffer) {
                    buffer = []
                    for (var i = 0; i < xhr.responseText.length; ++i)
                      buffer.push(xhr.responseText.charCodeAt(i) & 255)
                  }
                  return callback(
                    null,
                    typeof Uint8Array !== 'undefined'
                      ? new Uint8Array(buffer)
                      : buffer
                  )
                }
                return callback(null, xhr.responseText)
              }

            if (options.binary) {
              // ref: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data#Receiving_binary_data_in_older_browsers
              if ('overrideMimeType' in xhr)
                xhr.overrideMimeType('text/plain; charset=x-user-defined')
              xhr.responseType = 'arraybuffer'
            }

            xhr.open('GET', filename)
            xhr.send()
          }
        },
        {'@protobufjs/aspromise': 6, '@protobufjs/inquire': 12}
      ],
      11: [
        function (require, module, exports) {
          'use strict'

          module.exports = factory(factory)

          /**
           * Reads / writes floats / doubles from / to buffers.
           * @name util.float
           * @namespace
           */

          /**
           * Writes a 32 bit float to a buffer using little endian byte order.
           * @name util.float.writeFloatLE
           * @function
           * @param {number} val Value to write
           * @param {Uint8Array} buf Target buffer
           * @param {number} pos Target buffer offset
           * @returns {undefined}
           */

          /**
           * Writes a 32 bit float to a buffer using big endian byte order.
           * @name util.float.writeFloatBE
           * @function
           * @param {number} val Value to write
           * @param {Uint8Array} buf Target buffer
           * @param {number} pos Target buffer offset
           * @returns {undefined}
           */

          /**
           * Reads a 32 bit float from a buffer using little endian byte order.
           * @name util.float.readFloatLE
           * @function
           * @param {Uint8Array} buf Source buffer
           * @param {number} pos Source buffer offset
           * @returns {number} Value read
           */

          /**
           * Reads a 32 bit float from a buffer using big endian byte order.
           * @name util.float.readFloatBE
           * @function
           * @param {Uint8Array} buf Source buffer
           * @param {number} pos Source buffer offset
           * @returns {number} Value read
           */

          /**
           * Writes a 64 bit double to a buffer using little endian byte order.
           * @name util.float.writeDoubleLE
           * @function
           * @param {number} val Value to write
           * @param {Uint8Array} buf Target buffer
           * @param {number} pos Target buffer offset
           * @returns {undefined}
           */

          /**
           * Writes a 64 bit double to a buffer using big endian byte order.
           * @name util.float.writeDoubleBE
           * @function
           * @param {number} val Value to write
           * @param {Uint8Array} buf Target buffer
           * @param {number} pos Target buffer offset
           * @returns {undefined}
           */

          /**
           * Reads a 64 bit double from a buffer using little endian byte order.
           * @name util.float.readDoubleLE
           * @function
           * @param {Uint8Array} buf Source buffer
           * @param {number} pos Source buffer offset
           * @returns {number} Value read
           */

          /**
           * Reads a 64 bit double from a buffer using big endian byte order.
           * @name util.float.readDoubleBE
           * @function
           * @param {Uint8Array} buf Source buffer
           * @param {number} pos Source buffer offset
           * @returns {number} Value read
           */

          // Factory function for the purpose of node-based testing in modified global environments
          function factory(exports) {
            // float: typed array
            if (typeof Float32Array !== 'undefined')
              (function () {
                var f32 = new Float32Array([-0]),
                  f8b = new Uint8Array(f32.buffer),
                  le = f8b[3] === 128

                function writeFloat_f32_cpy(val, buf, pos) {
                  f32[0] = val
                  buf[pos] = f8b[0]
                  buf[pos + 1] = f8b[1]
                  buf[pos + 2] = f8b[2]
                  buf[pos + 3] = f8b[3]
                }

                function writeFloat_f32_rev(val, buf, pos) {
                  f32[0] = val
                  buf[pos] = f8b[3]
                  buf[pos + 1] = f8b[2]
                  buf[pos + 2] = f8b[1]
                  buf[pos + 3] = f8b[0]
                }

                /* istanbul ignore next */
                exports.writeFloatLE = le
                  ? writeFloat_f32_cpy
                  : writeFloat_f32_rev
                /* istanbul ignore next */
                exports.writeFloatBE = le
                  ? writeFloat_f32_rev
                  : writeFloat_f32_cpy

                function readFloat_f32_cpy(buf, pos) {
                  f8b[0] = buf[pos]
                  f8b[1] = buf[pos + 1]
                  f8b[2] = buf[pos + 2]
                  f8b[3] = buf[pos + 3]
                  return f32[0]
                }

                function readFloat_f32_rev(buf, pos) {
                  f8b[3] = buf[pos]
                  f8b[2] = buf[pos + 1]
                  f8b[1] = buf[pos + 2]
                  f8b[0] = buf[pos + 3]
                  return f32[0]
                }

                /* istanbul ignore next */
                exports.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev
                /* istanbul ignore next */
                exports.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy

                // float: ieee754
              })()
            else
              (function () {
                function writeFloat_ieee754(writeUint, val, buf, pos) {
                  var sign = val < 0 ? 1 : 0
                  if (sign) val = -val
                  if (val === 0)
                    writeUint(
                      1 / val > 0
                        ? /* positive */ 0
                        : /* negative 0 */ 2147483648,
                      buf,
                      pos
                    )
                  else if (isNaN(val)) writeUint(2143289344, buf, pos)
                  else if (val > 3.4028234663852886e38)
                    // +-Infinity
                    writeUint(((sign << 31) | 2139095040) >>> 0, buf, pos)
                  else if (val < 1.1754943508222875e-38)
                    // denormal
                    writeUint(
                      ((sign << 31) |
                        Math.round(val / 1.401298464324817e-45)) >>>
                        0,
                      buf,
                      pos
                    )
                  else {
                    var exponent = Math.floor(Math.log(val) / Math.LN2),
                      mantissa =
                        Math.round(val * Math.pow(2, -exponent) * 8388608) &
                        8388607
                    writeUint(
                      ((sign << 31) | ((exponent + 127) << 23) | mantissa) >>>
                        0,
                      buf,
                      pos
                    )
                  }
                }

                exports.writeFloatLE = writeFloat_ieee754.bind(
                  null,
                  writeUintLE
                )
                exports.writeFloatBE = writeFloat_ieee754.bind(
                  null,
                  writeUintBE
                )

                function readFloat_ieee754(readUint, buf, pos) {
                  var uint = readUint(buf, pos),
                    sign = (uint >> 31) * 2 + 1,
                    exponent = (uint >>> 23) & 255,
                    mantissa = uint & 8388607
                  return exponent === 255
                    ? mantissa
                      ? NaN
                      : sign * Infinity
                    : exponent === 0 // denormal
                    ? sign * 1.401298464324817e-45 * mantissa
                    : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608)
                }

                exports.readFloatLE = readFloat_ieee754.bind(null, readUintLE)
                exports.readFloatBE = readFloat_ieee754.bind(null, readUintBE)
              })()

            // double: typed array
            if (typeof Float64Array !== 'undefined')
              (function () {
                var f64 = new Float64Array([-0]),
                  f8b = new Uint8Array(f64.buffer),
                  le = f8b[7] === 128

                function writeDouble_f64_cpy(val, buf, pos) {
                  f64[0] = val
                  buf[pos] = f8b[0]
                  buf[pos + 1] = f8b[1]
                  buf[pos + 2] = f8b[2]
                  buf[pos + 3] = f8b[3]
                  buf[pos + 4] = f8b[4]
                  buf[pos + 5] = f8b[5]
                  buf[pos + 6] = f8b[6]
                  buf[pos + 7] = f8b[7]
                }

                function writeDouble_f64_rev(val, buf, pos) {
                  f64[0] = val
                  buf[pos] = f8b[7]
                  buf[pos + 1] = f8b[6]
                  buf[pos + 2] = f8b[5]
                  buf[pos + 3] = f8b[4]
                  buf[pos + 4] = f8b[3]
                  buf[pos + 5] = f8b[2]
                  buf[pos + 6] = f8b[1]
                  buf[pos + 7] = f8b[0]
                }

                /* istanbul ignore next */
                exports.writeDoubleLE = le
                  ? writeDouble_f64_cpy
                  : writeDouble_f64_rev
                /* istanbul ignore next */
                exports.writeDoubleBE = le
                  ? writeDouble_f64_rev
                  : writeDouble_f64_cpy

                function readDouble_f64_cpy(buf, pos) {
                  f8b[0] = buf[pos]
                  f8b[1] = buf[pos + 1]
                  f8b[2] = buf[pos + 2]
                  f8b[3] = buf[pos + 3]
                  f8b[4] = buf[pos + 4]
                  f8b[5] = buf[pos + 5]
                  f8b[6] = buf[pos + 6]
                  f8b[7] = buf[pos + 7]
                  return f64[0]
                }

                function readDouble_f64_rev(buf, pos) {
                  f8b[7] = buf[pos]
                  f8b[6] = buf[pos + 1]
                  f8b[5] = buf[pos + 2]
                  f8b[4] = buf[pos + 3]
                  f8b[3] = buf[pos + 4]
                  f8b[2] = buf[pos + 5]
                  f8b[1] = buf[pos + 6]
                  f8b[0] = buf[pos + 7]
                  return f64[0]
                }

                /* istanbul ignore next */
                exports.readDoubleLE = le
                  ? readDouble_f64_cpy
                  : readDouble_f64_rev
                /* istanbul ignore next */
                exports.readDoubleBE = le
                  ? readDouble_f64_rev
                  : readDouble_f64_cpy

                // double: ieee754
              })()
            else
              (function () {
                function writeDouble_ieee754(
                  writeUint,
                  off0,
                  off1,
                  val,
                  buf,
                  pos
                ) {
                  var sign = val < 0 ? 1 : 0
                  if (sign) val = -val
                  if (val === 0) {
                    writeUint(0, buf, pos + off0)
                    writeUint(
                      1 / val > 0
                        ? /* positive */ 0
                        : /* negative 0 */ 2147483648,
                      buf,
                      pos + off1
                    )
                  } else if (isNaN(val)) {
                    writeUint(0, buf, pos + off0)
                    writeUint(2146959360, buf, pos + off1)
                  } else if (val > 1.7976931348623157e308) {
                    // +-Infinity
                    writeUint(0, buf, pos + off0)
                    writeUint(
                      ((sign << 31) | 2146435072) >>> 0,
                      buf,
                      pos + off1
                    )
                  } else {
                    var mantissa
                    if (val < 2.2250738585072014e-308) {
                      // denormal
                      mantissa = val / 5e-324
                      writeUint(mantissa >>> 0, buf, pos + off0)
                      writeUint(
                        ((sign << 31) | (mantissa / 4294967296)) >>> 0,
                        buf,
                        pos + off1
                      )
                    } else {
                      var exponent = Math.floor(Math.log(val) / Math.LN2)
                      if (exponent === 1024) exponent = 1023
                      mantissa = val * Math.pow(2, -exponent)
                      writeUint(
                        (mantissa * 4503599627370496) >>> 0,
                        buf,
                        pos + off0
                      )
                      writeUint(
                        ((sign << 31) |
                          ((exponent + 1023) << 20) |
                          ((mantissa * 1048576) & 1048575)) >>>
                          0,
                        buf,
                        pos + off1
                      )
                    }
                  }
                }

                exports.writeDoubleLE = writeDouble_ieee754.bind(
                  null,
                  writeUintLE,
                  0,
                  4
                )
                exports.writeDoubleBE = writeDouble_ieee754.bind(
                  null,
                  writeUintBE,
                  4,
                  0
                )

                function readDouble_ieee754(readUint, off0, off1, buf, pos) {
                  var lo = readUint(buf, pos + off0),
                    hi = readUint(buf, pos + off1)
                  var sign = (hi >> 31) * 2 + 1,
                    exponent = (hi >>> 20) & 2047,
                    mantissa = 4294967296 * (hi & 1048575) + lo
                  return exponent === 2047
                    ? mantissa
                      ? NaN
                      : sign * Infinity
                    : exponent === 0 // denormal
                    ? sign * 5e-324 * mantissa
                    : sign *
                      Math.pow(2, exponent - 1075) *
                      (mantissa + 4503599627370496)
                }

                exports.readDoubleLE = readDouble_ieee754.bind(
                  null,
                  readUintLE,
                  0,
                  4
                )
                exports.readDoubleBE = readDouble_ieee754.bind(
                  null,
                  readUintBE,
                  4,
                  0
                )
              })()

            return exports
          }

          // uint helpers

          function writeUintLE(val, buf, pos) {
            buf[pos] = val & 255
            buf[pos + 1] = (val >>> 8) & 255
            buf[pos + 2] = (val >>> 16) & 255
            buf[pos + 3] = val >>> 24
          }

          function writeUintBE(val, buf, pos) {
            buf[pos] = val >>> 24
            buf[pos + 1] = (val >>> 16) & 255
            buf[pos + 2] = (val >>> 8) & 255
            buf[pos + 3] = val & 255
          }

          function readUintLE(buf, pos) {
            return (
              (buf[pos] |
                (buf[pos + 1] << 8) |
                (buf[pos + 2] << 16) |
                (buf[pos + 3] << 24)) >>>
              0
            )
          }

          function readUintBE(buf, pos) {
            return (
              ((buf[pos] << 24) |
                (buf[pos + 1] << 16) |
                (buf[pos + 2] << 8) |
                buf[pos + 3]) >>>
              0
            )
          }
        },
        {}
      ],
      12: [
        function (require, module, exports) {
          'use strict'
          module.exports = inquire

          /**
           * Requires a module only if available.
           * @memberof util
           * @param {string} moduleName Module to require
           * @returns {?Object} Required module if available and not empty, otherwise `null`
           */
          function inquire(moduleName) {
            try {
              var mod = eval('quire'.replace(/^/, 're'))(moduleName) // eslint-disable-line no-eval
              if (mod && (mod.length || Object.keys(mod).length)) return mod
            } catch (e) {} // eslint-disable-line no-empty
            return null
          }
        },
        {}
      ],
      13: [
        function (require, module, exports) {
          'use strict'

          /**
           * A minimal path module to resolve Unix, Windows and URL paths alike.
           * @memberof util
           * @namespace
           */
          var path = exports

          var isAbsolute =
            /**
             * Tests if the specified path is absolute.
             * @param {string} path Path to test
             * @returns {boolean} `true` if path is absolute
             */
            (path.isAbsolute = function isAbsolute(path) {
              return /^(?:\/|\w+:)/.test(path)
            })

          var normalize =
            /**
             * Normalizes the specified path.
             * @param {string} path Path to normalize
             * @returns {string} Normalized path
             */
            (path.normalize = function normalize(path) {
              path = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
              var parts = path.split('/'),
                absolute = isAbsolute(path),
                prefix = ''
              if (absolute) prefix = parts.shift() + '/'
              for (var i = 0; i < parts.length; ) {
                if (parts[i] === '..') {
                  if (i > 0 && parts[i - 1] !== '..') parts.splice(--i, 2)
                  else if (absolute) parts.splice(i, 1)
                  else ++i
                } else if (parts[i] === '.') parts.splice(i, 1)
                else ++i
              }
              return prefix + parts.join('/')
            })

          /**
           * Resolves the specified include path against the specified origin path.
           * @param {string} originPath Path to the origin file
           * @param {string} includePath Include path relative to origin path
           * @param {boolean} [alreadyNormalized=false] `true` if both paths are already known to be normalized
           * @returns {string} Path to the include file
           */
          path.resolve = function resolve(
            originPath,
            includePath,
            alreadyNormalized
          ) {
            if (!alreadyNormalized) includePath = normalize(includePath)
            if (isAbsolute(includePath)) return includePath
            if (!alreadyNormalized) originPath = normalize(originPath)
            return (originPath = originPath.replace(/(?:\/|^)[^/]+$/, ''))
              .length
              ? normalize(originPath + '/' + includePath)
              : includePath
          }
        },
        {}
      ],
      14: [
        function (require, module, exports) {
          'use strict'
          module.exports = pool

          /**
           * An allocator as used by {@link util.pool}.
           * @typedef PoolAllocator
           * @type {function}
           * @param {number} size Buffer size
           * @returns {Uint8Array} Buffer
           */

          /**
           * A slicer as used by {@link util.pool}.
           * @typedef PoolSlicer
           * @type {function}
           * @param {number} start Start offset
           * @param {number} end End offset
           * @returns {Uint8Array} Buffer slice
           * @this {Uint8Array}
           */

          /**
           * A general purpose buffer pool.
           * @memberof util
           * @function
           * @param {PoolAllocator} alloc Allocator
           * @param {PoolSlicer} slice Slicer
           * @param {number} [size=8192] Slab size
           * @returns {PoolAllocator} Pooled allocator
           */
          function pool(alloc, slice, size) {
            var SIZE = size || 8192
            var MAX = SIZE >>> 1
            var slab = null
            var offset = SIZE
            return function pool_alloc(size) {
              if (size < 1 || size > MAX) return alloc(size)
              if (offset + size > SIZE) {
                slab = alloc(SIZE)
                offset = 0
              }
              var buf = slice.call(slab, offset, (offset += size))
              if (offset & 7)
                // align to 32 bit
                offset = (offset | 7) + 1
              return buf
            }
          }
        },
        {}
      ],
      15: [
        function (require, module, exports) {
          'use strict'

          /**
           * A minimal UTF8 implementation for number arrays.
           * @memberof util
           * @namespace
           */
          var utf8 = exports

          /**
           * Calculates the UTF8 byte length of a string.
           * @param {string} string String
           * @returns {number} Byte length
           */
          utf8.length = function utf8_length(string) {
            var len = 0,
              c = 0
            for (var i = 0; i < string.length; ++i) {
              c = string.charCodeAt(i)
              if (c < 128) len += 1
              else if (c < 2048) len += 2
              else if (
                (c & 0xfc00) === 0xd800 &&
                (string.charCodeAt(i + 1) & 0xfc00) === 0xdc00
              ) {
                ++i
                len += 4
              } else len += 3
            }
            return len
          }

          /**
           * Reads UTF8 bytes as a string.
           * @param {Uint8Array} buffer Source buffer
           * @param {number} start Source start
           * @param {number} end Source end
           * @returns {string} String read
           */
          utf8.read = function utf8_read(buffer, start, end) {
            var len = end - start
            if (len < 1) return ''
            var parts = null,
              chunk = [],
              i = 0, // char offset
              t // temporary
            while (start < end) {
              t = buffer[start++]
              if (t < 128) chunk[i++] = t
              else if (t > 191 && t < 224)
                chunk[i++] = ((t & 31) << 6) | (buffer[start++] & 63)
              else if (t > 239 && t < 365) {
                t =
                  (((t & 7) << 18) |
                    ((buffer[start++] & 63) << 12) |
                    ((buffer[start++] & 63) << 6) |
                    (buffer[start++] & 63)) -
                  0x10000
                chunk[i++] = 0xd800 + (t >> 10)
                chunk[i++] = 0xdc00 + (t & 1023)
              } else
                chunk[i++] =
                  ((t & 15) << 12) |
                  ((buffer[start++] & 63) << 6) |
                  (buffer[start++] & 63)
              if (i > 8191) {
                ;(parts || (parts = [])).push(
                  String.fromCharCode.apply(String, chunk)
                )
                i = 0
              }
            }
            if (parts) {
              if (i)
                parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)))
              return parts.join('')
            }
            return String.fromCharCode.apply(String, chunk.slice(0, i))
          }

          /**
           * Writes a string as UTF8 bytes.
           * @param {string} string Source string
           * @param {Uint8Array} buffer Destination buffer
           * @param {number} offset Destination offset
           * @returns {number} Bytes written
           */
          utf8.write = function utf8_write(string, buffer, offset) {
            var start = offset,
              c1, // character 1
              c2 // character 2
            for (var i = 0; i < string.length; ++i) {
              c1 = string.charCodeAt(i)
              if (c1 < 128) {
                buffer[offset++] = c1
              } else if (c1 < 2048) {
                buffer[offset++] = (c1 >> 6) | 192
                buffer[offset++] = (c1 & 63) | 128
              } else if (
                (c1 & 0xfc00) === 0xd800 &&
                ((c2 = string.charCodeAt(i + 1)) & 0xfc00) === 0xdc00
              ) {
                c1 = 0x10000 + ((c1 & 0x03ff) << 10) + (c2 & 0x03ff)
                ++i
                buffer[offset++] = (c1 >> 18) | 240
                buffer[offset++] = ((c1 >> 12) & 63) | 128
                buffer[offset++] = ((c1 >> 6) & 63) | 128
                buffer[offset++] = (c1 & 63) | 128
              } else {
                buffer[offset++] = (c1 >> 12) | 224
                buffer[offset++] = ((c1 >> 6) & 63) | 128
                buffer[offset++] = (c1 & 63) | 128
              }
            }
            return offset - start
          }
        },
        {}
      ],
      16: [
        function (require, module, exports) {
          /*
 Copyright 2013-2014 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

          /**
           * @license bytebuffer.js (c) 2015 Daniel Wirtz <dcode@dcode.io>
           * Backing buffer: ArrayBuffer, Accessor: Uint8Array
           * Released under the Apache License, Version 2.0
           * see: https://github.com/dcodeIO/bytebuffer.js for details
           */
          ;(function (global, factory) {
            /* AMD */ if (typeof define === 'function' && define['amd'])
              define(['long'], factory)
            /* CommonJS */ else if (
              typeof require === 'function' &&
              typeof module === 'object' &&
              module &&
              module['exports']
            )
              module['exports'] = (function () {
                var Long
                try {
                  Long = require('long')
                } catch (e) {}
                return factory(Long)
              })()
            /* Global */ else
              (global['dcodeIO'] = global['dcodeIO'] || {})['ByteBuffer'] =
                factory(global['dcodeIO']['Long'])
          })(this, function (Long) {
            'use strict'

            /**
             * Constructs a new ByteBuffer.
             * @class The swiss army knife for binary data in JavaScript.
             * @exports ByteBuffer
             * @constructor
             * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @expose
             */
            var ByteBuffer = function (capacity, littleEndian, noAssert) {
              if (typeof capacity === 'undefined')
                capacity = ByteBuffer.DEFAULT_CAPACITY
              if (typeof littleEndian === 'undefined')
                littleEndian = ByteBuffer.DEFAULT_ENDIAN
              if (typeof noAssert === 'undefined')
                noAssert = ByteBuffer.DEFAULT_NOASSERT
              if (!noAssert) {
                capacity = capacity | 0
                if (capacity < 0) throw RangeError('Illegal capacity')
                littleEndian = !!littleEndian
                noAssert = !!noAssert
              }

              /**
               * Backing ArrayBuffer.
               * @type {!ArrayBuffer}
               * @expose
               */
              this.buffer =
                capacity === 0 ? EMPTY_BUFFER : new ArrayBuffer(capacity)

              /**
               * Uint8Array utilized to manipulate the backing buffer. Becomes `null` if the backing buffer has a capacity of `0`.
               * @type {?Uint8Array}
               * @expose
               */
              this.view = capacity === 0 ? null : new Uint8Array(this.buffer)

              /**
               * Absolute read/write offset.
               * @type {number}
               * @expose
               * @see ByteBuffer#flip
               * @see ByteBuffer#clear
               */
              this.offset = 0

              /**
               * Marked offset.
               * @type {number}
               * @expose
               * @see ByteBuffer#mark
               * @see ByteBuffer#reset
               */
              this.markedOffset = -1

              /**
               * Absolute limit of the contained data. Set to the backing buffer's capacity upon allocation.
               * @type {number}
               * @expose
               * @see ByteBuffer#flip
               * @see ByteBuffer#clear
               */
              this.limit = capacity

              /**
               * Whether to use little endian byte order, defaults to `false` for big endian.
               * @type {boolean}
               * @expose
               */
              this.littleEndian = littleEndian

              /**
               * Whether to skip assertions of offsets and values, defaults to `false`.
               * @type {boolean}
               * @expose
               */
              this.noAssert = noAssert
            }

            /**
             * ByteBuffer version.
             * @type {string}
             * @const
             * @expose
             */
            ByteBuffer.VERSION = '5.0.1'

            /**
             * Little endian constant that can be used instead of its boolean value. Evaluates to `true`.
             * @type {boolean}
             * @const
             * @expose
             */
            ByteBuffer.LITTLE_ENDIAN = true

            /**
             * Big endian constant that can be used instead of its boolean value. Evaluates to `false`.
             * @type {boolean}
             * @const
             * @expose
             */
            ByteBuffer.BIG_ENDIAN = false

            /**
             * Default initial capacity of `16`.
             * @type {number}
             * @expose
             */
            ByteBuffer.DEFAULT_CAPACITY = 16

            /**
             * Default endianess of `false` for big endian.
             * @type {boolean}
             * @expose
             */
            ByteBuffer.DEFAULT_ENDIAN = ByteBuffer.BIG_ENDIAN

            /**
             * Default no assertions flag of `false`.
             * @type {boolean}
             * @expose
             */
            ByteBuffer.DEFAULT_NOASSERT = false

            /**
             * A `Long` class for representing a 64-bit two's-complement integer value. May be `null` if Long.js has not been loaded
             *  and int64 support is not available.
             * @type {?Long}
             * @const
             * @see https://github.com/dcodeIO/long.js
             * @expose
             */
            ByteBuffer.Long = Long || null

            /**
             * @alias ByteBuffer.prototype
             * @inner
             */
            var ByteBufferPrototype = ByteBuffer.prototype

            /**
             * An indicator used to reliably determine if an object is a ByteBuffer or not.
             * @type {boolean}
             * @const
             * @expose
             * @private
             */
            ByteBufferPrototype.__isByteBuffer__

            Object.defineProperty(ByteBufferPrototype, '__isByteBuffer__', {
              value: true,
              enumerable: false,
              configurable: false
            })

            // helpers

            /**
             * @type {!ArrayBuffer}
             * @inner
             */
            var EMPTY_BUFFER = new ArrayBuffer(0)

            /**
             * String.fromCharCode reference for compile-time renaming.
             * @type {function(...number):string}
             * @inner
             */
            var stringFromCharCode = String.fromCharCode

            /**
             * Creates a source function for a string.
             * @param {string} s String to read from
             * @returns {function():number|null} Source function returning the next char code respectively `null` if there are
             *  no more characters left.
             * @throws {TypeError} If the argument is invalid
             * @inner
             */
            function stringSource(s) {
              var i = 0
              return function () {
                return i < s.length ? s.charCodeAt(i++) : null
              }
            }

            /**
             * Creates a destination function for a string.
             * @returns {function(number=):undefined|string} Destination function successively called with the next char code.
             *  Returns the final string when called without arguments.
             * @inner
             */
            function stringDestination() {
              var cs = [],
                ps = []
              return function () {
                if (arguments.length === 0)
                  return ps.join('') + stringFromCharCode.apply(String, cs)
                if (cs.length + arguments.length > 1024)
                  ps.push(stringFromCharCode.apply(String, cs)), (cs.length = 0)
                Array.prototype.push.apply(cs, arguments)
              }
            }

            /**
             * Gets the accessor type.
             * @returns {Function} `Buffer` under node.js, `Uint8Array` respectively `DataView` in the browser (classes)
             * @expose
             */
            ByteBuffer.accessor = function () {
              return Uint8Array
            }
            /**
             * Allocates a new ByteBuffer backed by a buffer of the specified capacity.
             * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @returns {!ByteBuffer}
             * @expose
             */
            ByteBuffer.allocate = function (capacity, littleEndian, noAssert) {
              return new ByteBuffer(capacity, littleEndian, noAssert)
            }

            /**
             * Concatenates multiple ByteBuffers into one.
             * @param {!Array.<!ByteBuffer|!ArrayBuffer|!Uint8Array|string>} buffers Buffers to concatenate
             * @param {(string|boolean)=} encoding String encoding if `buffers` contains a string ("base64", "hex", "binary",
             *  defaults to "utf8")
             * @param {boolean=} littleEndian Whether to use little or big endian byte order for the resulting ByteBuffer. Defaults
             *  to {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values for the resulting ByteBuffer. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @returns {!ByteBuffer} Concatenated ByteBuffer
             * @expose
             */
            ByteBuffer.concat = function (
              buffers,
              encoding,
              littleEndian,
              noAssert
            ) {
              if (
                typeof encoding === 'boolean' ||
                typeof encoding !== 'string'
              ) {
                noAssert = littleEndian
                littleEndian = encoding
                encoding = undefined
              }
              var capacity = 0
              for (var i = 0, k = buffers.length, length; i < k; ++i) {
                if (!ByteBuffer.isByteBuffer(buffers[i]))
                  buffers[i] = ByteBuffer.wrap(buffers[i], encoding)
                length = buffers[i].limit - buffers[i].offset
                if (length > 0) capacity += length
              }
              if (capacity === 0)
                return new ByteBuffer(0, littleEndian, noAssert)
              var bb = new ByteBuffer(capacity, littleEndian, noAssert),
                bi
              i = 0
              while (i < k) {
                bi = buffers[i++]
                length = bi.limit - bi.offset
                if (length <= 0) continue
                bb.view.set(bi.view.subarray(bi.offset, bi.limit), bb.offset)
                bb.offset += length
              }
              bb.limit = bb.offset
              bb.offset = 0
              return bb
            }

            /**
             * Tests if the specified type is a ByteBuffer.
             * @param {*} bb ByteBuffer to test
             * @returns {boolean} `true` if it is a ByteBuffer, otherwise `false`
             * @expose
             */
            ByteBuffer.isByteBuffer = function (bb) {
              return (bb && bb['__isByteBuffer__']) === true
            }
            /**
             * Gets the backing buffer type.
             * @returns {Function} `Buffer` under node.js, `ArrayBuffer` in the browser (classes)
             * @expose
             */
            ByteBuffer.type = function () {
              return ArrayBuffer
            }
            /**
             * Wraps a buffer or a string. Sets the allocated ByteBuffer's {@link ByteBuffer#offset} to `0` and its
             *  {@link ByteBuffer#limit} to the length of the wrapped data.
             * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string|!Array.<number>} buffer Anything that can be wrapped
             * @param {(string|boolean)=} encoding String encoding if `buffer` is a string ("base64", "hex", "binary", defaults to
             *  "utf8")
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @returns {!ByteBuffer} A ByteBuffer wrapping `buffer`
             * @expose
             */
            ByteBuffer.wrap = function (
              buffer,
              encoding,
              littleEndian,
              noAssert
            ) {
              if (typeof encoding !== 'string') {
                noAssert = littleEndian
                littleEndian = encoding
                encoding = undefined
              }
              if (typeof buffer === 'string') {
                if (typeof encoding === 'undefined') encoding = 'utf8'
                switch (encoding) {
                  case 'base64':
                    return ByteBuffer.fromBase64(buffer, littleEndian)
                  case 'hex':
                    return ByteBuffer.fromHex(buffer, littleEndian)
                  case 'binary':
                    return ByteBuffer.fromBinary(buffer, littleEndian)
                  case 'utf8':
                    return ByteBuffer.fromUTF8(buffer, littleEndian)
                  case 'debug':
                    return ByteBuffer.fromDebug(buffer, littleEndian)
                  default:
                    throw Error('Unsupported encoding: ' + encoding)
                }
              }
              if (buffer === null || typeof buffer !== 'object')
                throw TypeError('Illegal buffer')
              var bb
              if (ByteBuffer.isByteBuffer(buffer)) {
                bb = ByteBufferPrototype.clone.call(buffer)
                bb.markedOffset = -1
                return bb
              }
              if (buffer instanceof Uint8Array) {
                // Extract ArrayBuffer from Uint8Array
                bb = new ByteBuffer(0, littleEndian, noAssert)
                if (buffer.length > 0) {
                  // Avoid references to more than one EMPTY_BUFFER
                  bb.buffer = buffer.buffer
                  bb.offset = buffer.byteOffset
                  bb.limit = buffer.byteOffset + buffer.byteLength
                  bb.view = new Uint8Array(buffer.buffer)
                }
              } else if (buffer instanceof ArrayBuffer) {
                // Reuse ArrayBuffer
                bb = new ByteBuffer(0, littleEndian, noAssert)
                if (buffer.byteLength > 0) {
                  bb.buffer = buffer
                  bb.offset = 0
                  bb.limit = buffer.byteLength
                  bb.view =
                    buffer.byteLength > 0 ? new Uint8Array(buffer) : null
                }
              } else if (
                Object.prototype.toString.call(buffer) === '[object Array]'
              ) {
                // Create from octets
                bb = new ByteBuffer(buffer.length, littleEndian, noAssert)
                bb.limit = buffer.length
                for (var i = 0; i < buffer.length; ++i) bb.view[i] = buffer[i]
              } else throw TypeError('Illegal buffer') // Otherwise fail
              return bb
            }

            /**
             * Writes the array as a bitset.
             * @param {Array<boolean>} value Array of booleans to write
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `length` if omitted.
             * @returns {!ByteBuffer}
             * @expose
             */
            ByteBufferPrototype.writeBitSet = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (!(value instanceof Array))
                  throw TypeError('Illegal BitSet: Not an array')
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }

              var start = offset,
                bits = value.length,
                bytes = bits >> 3,
                bit = 0,
                k

              offset += this.writeVarint32(bits, offset)

              while (bytes--) {
                k =
                  (!!value[bit++] & 1) |
                  ((!!value[bit++] & 1) << 1) |
                  ((!!value[bit++] & 1) << 2) |
                  ((!!value[bit++] & 1) << 3) |
                  ((!!value[bit++] & 1) << 4) |
                  ((!!value[bit++] & 1) << 5) |
                  ((!!value[bit++] & 1) << 6) |
                  ((!!value[bit++] & 1) << 7)
                this.writeByte(k, offset++)
              }

              if (bit < bits) {
                var m = 0
                k = 0
                while (bit < bits) k = k | ((!!value[bit++] & 1) << m++)
                this.writeByte(k, offset++)
              }

              if (relative) {
                this.offset = offset
                return this
              }
              return offset - start
            }

            /**
             * Reads a BitSet as an array of booleans.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `length` if omitted.
             * @returns {Array<boolean>
             * @expose
             */
            ByteBufferPrototype.readBitSet = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset

              var ret = this.readVarint32(offset),
                bits = ret.value,
                bytes = bits >> 3,
                bit = 0,
                value = [],
                k

              offset += ret.length

              while (bytes--) {
                k = this.readByte(offset++)
                value[bit++] = !!(k & 0x01)
                value[bit++] = !!(k & 0x02)
                value[bit++] = !!(k & 0x04)
                value[bit++] = !!(k & 0x08)
                value[bit++] = !!(k & 0x10)
                value[bit++] = !!(k & 0x20)
                value[bit++] = !!(k & 0x40)
                value[bit++] = !!(k & 0x80)
              }

              if (bit < bits) {
                var m = 0
                k = this.readByte(offset++)
                while (bit < bits) value[bit++] = !!((k >> m++) & 1)
              }

              if (relative) {
                this.offset = offset
              }
              return value
            }
            /**
             * Reads the specified number of bytes.
             * @param {number} length Number of bytes to read
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `length` if omitted.
             * @returns {!ByteBuffer}
             * @expose
             */
            ByteBufferPrototype.readBytes = function (length, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + length > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      length +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var slice = this.slice(offset, offset + length)
              if (relative) this.offset += length
              return slice
            }

            /**
             * Writes a payload of bytes. This is an alias of {@link ByteBuffer#append}.
             * @function
             * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to write. If `source` is a ByteBuffer, its offsets
             *  will be modified according to the performed read operation.
             * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeBytes = ByteBufferPrototype.append

            // types/ints/int8

            /**
             * Writes an 8bit signed integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeInt8 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value |= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 1
              var capacity0 = this.buffer.byteLength
              if (offset > capacity0)
                this.resize((capacity0 *= 2) > offset ? capacity0 : offset)
              offset -= 1
              this.view[offset] = value
              if (relative) this.offset += 1
              return this
            }

            /**
             * Writes an 8bit signed integer. This is an alias of {@link ByteBuffer#writeInt8}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeByte = ByteBufferPrototype.writeInt8

            /**
             * Reads an 8bit signed integer.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readInt8 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      1 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = this.view[offset]
              if ((value & 0x80) === 0x80) value = -(0xff - value + 1) // Cast to signed
              if (relative) this.offset += 1
              return value
            }

            /**
             * Reads an 8bit signed integer. This is an alias of {@link ByteBuffer#readInt8}.
             * @function
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readByte = ByteBufferPrototype.readInt8

            /**
             * Writes an 8bit unsigned integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeUint8 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value >>>= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 1
              var capacity1 = this.buffer.byteLength
              if (offset > capacity1)
                this.resize((capacity1 *= 2) > offset ? capacity1 : offset)
              offset -= 1
              this.view[offset] = value
              if (relative) this.offset += 1
              return this
            }

            /**
             * Writes an 8bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint8}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeUInt8 = ByteBufferPrototype.writeUint8

            /**
             * Reads an 8bit unsigned integer.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readUint8 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      1 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = this.view[offset]
              if (relative) this.offset += 1
              return value
            }

            /**
             * Reads an 8bit unsigned integer. This is an alias of {@link ByteBuffer#readUint8}.
             * @function
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readUInt8 = ByteBufferPrototype.readUint8

            // types/ints/int16

            /**
             * Writes a 16bit signed integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @throws {TypeError} If `offset` or `value` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.writeInt16 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value |= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 2
              var capacity2 = this.buffer.byteLength
              if (offset > capacity2)
                this.resize((capacity2 *= 2) > offset ? capacity2 : offset)
              offset -= 2
              if (this.littleEndian) {
                this.view[offset + 1] = (value & 0xff00) >>> 8
                this.view[offset] = value & 0x00ff
              } else {
                this.view[offset] = (value & 0xff00) >>> 8
                this.view[offset + 1] = value & 0x00ff
              }
              if (relative) this.offset += 2
              return this
            }

            /**
             * Writes a 16bit signed integer. This is an alias of {@link ByteBuffer#writeInt16}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @throws {TypeError} If `offset` or `value` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.writeShort = ByteBufferPrototype.writeInt16

            /**
             * Reads a 16bit signed integer.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @returns {number} Value read
             * @throws {TypeError} If `offset` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.readInt16 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      2 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = 0
              if (this.littleEndian) {
                value = this.view[offset]
                value |= this.view[offset + 1] << 8
              } else {
                value = this.view[offset] << 8
                value |= this.view[offset + 1]
              }
              if ((value & 0x8000) === 0x8000) value = -(0xffff - value + 1) // Cast to signed
              if (relative) this.offset += 2
              return value
            }

            /**
             * Reads a 16bit signed integer. This is an alias of {@link ByteBuffer#readInt16}.
             * @function
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @returns {number} Value read
             * @throws {TypeError} If `offset` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.readShort = ByteBufferPrototype.readInt16

            /**
             * Writes a 16bit unsigned integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @throws {TypeError} If `offset` or `value` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.writeUint16 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value >>>= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 2
              var capacity3 = this.buffer.byteLength
              if (offset > capacity3)
                this.resize((capacity3 *= 2) > offset ? capacity3 : offset)
              offset -= 2
              if (this.littleEndian) {
                this.view[offset + 1] = (value & 0xff00) >>> 8
                this.view[offset] = value & 0x00ff
              } else {
                this.view[offset] = (value & 0xff00) >>> 8
                this.view[offset + 1] = value & 0x00ff
              }
              if (relative) this.offset += 2
              return this
            }

            /**
             * Writes a 16bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint16}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @throws {TypeError} If `offset` or `value` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.writeUInt16 = ByteBufferPrototype.writeUint16

            /**
             * Reads a 16bit unsigned integer.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @returns {number} Value read
             * @throws {TypeError} If `offset` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.readUint16 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      2 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = 0
              if (this.littleEndian) {
                value = this.view[offset]
                value |= this.view[offset + 1] << 8
              } else {
                value = this.view[offset] << 8
                value |= this.view[offset + 1]
              }
              if (relative) this.offset += 2
              return value
            }

            /**
             * Reads a 16bit unsigned integer. This is an alias of {@link ByteBuffer#readUint16}.
             * @function
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
             * @returns {number} Value read
             * @throws {TypeError} If `offset` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @expose
             */
            ByteBufferPrototype.readUInt16 = ByteBufferPrototype.readUint16

            // types/ints/int32

            /**
             * Writes a 32bit signed integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @expose
             */
            ByteBufferPrototype.writeInt32 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value |= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 4
              var capacity4 = this.buffer.byteLength
              if (offset > capacity4)
                this.resize((capacity4 *= 2) > offset ? capacity4 : offset)
              offset -= 4
              if (this.littleEndian) {
                this.view[offset + 3] = (value >>> 24) & 0xff
                this.view[offset + 2] = (value >>> 16) & 0xff
                this.view[offset + 1] = (value >>> 8) & 0xff
                this.view[offset] = value & 0xff
              } else {
                this.view[offset] = (value >>> 24) & 0xff
                this.view[offset + 1] = (value >>> 16) & 0xff
                this.view[offset + 2] = (value >>> 8) & 0xff
                this.view[offset + 3] = value & 0xff
              }
              if (relative) this.offset += 4
              return this
            }

            /**
             * Writes a 32bit signed integer. This is an alias of {@link ByteBuffer#writeInt32}.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @expose
             */
            ByteBufferPrototype.writeInt = ByteBufferPrototype.writeInt32

            /**
             * Reads a 32bit signed integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readInt32 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      4 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = 0
              if (this.littleEndian) {
                value = this.view[offset + 2] << 16
                value |= this.view[offset + 1] << 8
                value |= this.view[offset]
                value += (this.view[offset + 3] << 24) >>> 0
              } else {
                value = this.view[offset + 1] << 16
                value |= this.view[offset + 2] << 8
                value |= this.view[offset + 3]
                value += (this.view[offset] << 24) >>> 0
              }
              value |= 0 // Cast to signed
              if (relative) this.offset += 4
              return value
            }

            /**
             * Reads a 32bit signed integer. This is an alias of {@link ByteBuffer#readInt32}.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readInt = ByteBufferPrototype.readInt32

            /**
             * Writes a 32bit unsigned integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @expose
             */
            ByteBufferPrototype.writeUint32 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value >>>= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 4
              var capacity5 = this.buffer.byteLength
              if (offset > capacity5)
                this.resize((capacity5 *= 2) > offset ? capacity5 : offset)
              offset -= 4
              if (this.littleEndian) {
                this.view[offset + 3] = (value >>> 24) & 0xff
                this.view[offset + 2] = (value >>> 16) & 0xff
                this.view[offset + 1] = (value >>> 8) & 0xff
                this.view[offset] = value & 0xff
              } else {
                this.view[offset] = (value >>> 24) & 0xff
                this.view[offset + 1] = (value >>> 16) & 0xff
                this.view[offset + 2] = (value >>> 8) & 0xff
                this.view[offset + 3] = value & 0xff
              }
              if (relative) this.offset += 4
              return this
            }

            /**
             * Writes a 32bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint32}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @expose
             */
            ByteBufferPrototype.writeUInt32 = ByteBufferPrototype.writeUint32

            /**
             * Reads a 32bit unsigned integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readUint32 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      4 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = 0
              if (this.littleEndian) {
                value = this.view[offset + 2] << 16
                value |= this.view[offset + 1] << 8
                value |= this.view[offset]
                value += (this.view[offset + 3] << 24) >>> 0
              } else {
                value = this.view[offset + 1] << 16
                value |= this.view[offset + 2] << 8
                value |= this.view[offset + 3]
                value += (this.view[offset] << 24) >>> 0
              }
              if (relative) this.offset += 4
              return value
            }

            /**
             * Reads a 32bit unsigned integer. This is an alias of {@link ByteBuffer#readUint32}.
             * @function
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {number} Value read
             * @expose
             */
            ByteBufferPrototype.readUInt32 = ByteBufferPrototype.readUint32

            // types/ints/int64

            if (Long) {
              /**
               * Writes a 64bit signed integer.
               * @param {number|!Long} value Value to write
               * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!ByteBuffer} this
               * @expose
               */
              ByteBufferPrototype.writeInt64 = function (value, offset) {
                var relative = typeof offset === 'undefined'
                if (relative) offset = this.offset
                if (!this.noAssert) {
                  if (typeof value === 'number') value = Long.fromNumber(value)
                  else if (typeof value === 'string')
                    value = Long.fromString(value)
                  else if (!(value && value instanceof Long))
                    throw TypeError(
                      'Illegal value: ' + value + ' (not an integer or Long)'
                    )
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        0 +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                if (typeof value === 'number') value = Long.fromNumber(value)
                else if (typeof value === 'string')
                  value = Long.fromString(value)
                offset += 8
                var capacity6 = this.buffer.byteLength
                if (offset > capacity6)
                  this.resize((capacity6 *= 2) > offset ? capacity6 : offset)
                offset -= 8
                var lo = value.low,
                  hi = value.high
                if (this.littleEndian) {
                  this.view[offset + 3] = (lo >>> 24) & 0xff
                  this.view[offset + 2] = (lo >>> 16) & 0xff
                  this.view[offset + 1] = (lo >>> 8) & 0xff
                  this.view[offset] = lo & 0xff
                  offset += 4
                  this.view[offset + 3] = (hi >>> 24) & 0xff
                  this.view[offset + 2] = (hi >>> 16) & 0xff
                  this.view[offset + 1] = (hi >>> 8) & 0xff
                  this.view[offset] = hi & 0xff
                } else {
                  this.view[offset] = (hi >>> 24) & 0xff
                  this.view[offset + 1] = (hi >>> 16) & 0xff
                  this.view[offset + 2] = (hi >>> 8) & 0xff
                  this.view[offset + 3] = hi & 0xff
                  offset += 4
                  this.view[offset] = (lo >>> 24) & 0xff
                  this.view[offset + 1] = (lo >>> 16) & 0xff
                  this.view[offset + 2] = (lo >>> 8) & 0xff
                  this.view[offset + 3] = lo & 0xff
                }
                if (relative) this.offset += 8
                return this
              }

              /**
               * Writes a 64bit signed integer. This is an alias of {@link ByteBuffer#writeInt64}.
               * @param {number|!Long} value Value to write
               * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!ByteBuffer} this
               * @expose
               */
              ByteBufferPrototype.writeLong = ByteBufferPrototype.writeInt64

              /**
               * Reads a 64bit signed integer.
               * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!Long}
               * @expose
               */
              ByteBufferPrototype.readInt64 = function (offset) {
                var relative = typeof offset === 'undefined'
                if (relative) offset = this.offset
                if (!this.noAssert) {
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + 8 > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        8 +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                var lo = 0,
                  hi = 0
                if (this.littleEndian) {
                  lo = this.view[offset + 2] << 16
                  lo |= this.view[offset + 1] << 8
                  lo |= this.view[offset]
                  lo += (this.view[offset + 3] << 24) >>> 0
                  offset += 4
                  hi = this.view[offset + 2] << 16
                  hi |= this.view[offset + 1] << 8
                  hi |= this.view[offset]
                  hi += (this.view[offset + 3] << 24) >>> 0
                } else {
                  hi = this.view[offset + 1] << 16
                  hi |= this.view[offset + 2] << 8
                  hi |= this.view[offset + 3]
                  hi += (this.view[offset] << 24) >>> 0
                  offset += 4
                  lo = this.view[offset + 1] << 16
                  lo |= this.view[offset + 2] << 8
                  lo |= this.view[offset + 3]
                  lo += (this.view[offset] << 24) >>> 0
                }
                var value = new Long(lo, hi, false)
                if (relative) this.offset += 8
                return value
              }

              /**
               * Reads a 64bit signed integer. This is an alias of {@link ByteBuffer#readInt64}.
               * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!Long}
               * @expose
               */
              ByteBufferPrototype.readLong = ByteBufferPrototype.readInt64

              /**
               * Writes a 64bit unsigned integer.
               * @param {number|!Long} value Value to write
               * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!ByteBuffer} this
               * @expose
               */
              ByteBufferPrototype.writeUint64 = function (value, offset) {
                var relative = typeof offset === 'undefined'
                if (relative) offset = this.offset
                if (!this.noAssert) {
                  if (typeof value === 'number') value = Long.fromNumber(value)
                  else if (typeof value === 'string')
                    value = Long.fromString(value)
                  else if (!(value && value instanceof Long))
                    throw TypeError(
                      'Illegal value: ' + value + ' (not an integer or Long)'
                    )
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        0 +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                if (typeof value === 'number') value = Long.fromNumber(value)
                else if (typeof value === 'string')
                  value = Long.fromString(value)
                offset += 8
                var capacity7 = this.buffer.byteLength
                if (offset > capacity7)
                  this.resize((capacity7 *= 2) > offset ? capacity7 : offset)
                offset -= 8
                var lo = value.low,
                  hi = value.high
                if (this.littleEndian) {
                  this.view[offset + 3] = (lo >>> 24) & 0xff
                  this.view[offset + 2] = (lo >>> 16) & 0xff
                  this.view[offset + 1] = (lo >>> 8) & 0xff
                  this.view[offset] = lo & 0xff
                  offset += 4
                  this.view[offset + 3] = (hi >>> 24) & 0xff
                  this.view[offset + 2] = (hi >>> 16) & 0xff
                  this.view[offset + 1] = (hi >>> 8) & 0xff
                  this.view[offset] = hi & 0xff
                } else {
                  this.view[offset] = (hi >>> 24) & 0xff
                  this.view[offset + 1] = (hi >>> 16) & 0xff
                  this.view[offset + 2] = (hi >>> 8) & 0xff
                  this.view[offset + 3] = hi & 0xff
                  offset += 4
                  this.view[offset] = (lo >>> 24) & 0xff
                  this.view[offset + 1] = (lo >>> 16) & 0xff
                  this.view[offset + 2] = (lo >>> 8) & 0xff
                  this.view[offset + 3] = lo & 0xff
                }
                if (relative) this.offset += 8
                return this
              }

              /**
               * Writes a 64bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint64}.
               * @function
               * @param {number|!Long} value Value to write
               * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!ByteBuffer} this
               * @expose
               */
              ByteBufferPrototype.writeUInt64 = ByteBufferPrototype.writeUint64

              /**
               * Reads a 64bit unsigned integer.
               * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!Long}
               * @expose
               */
              ByteBufferPrototype.readUint64 = function (offset) {
                var relative = typeof offset === 'undefined'
                if (relative) offset = this.offset
                if (!this.noAssert) {
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + 8 > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        8 +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                var lo = 0,
                  hi = 0
                if (this.littleEndian) {
                  lo = this.view[offset + 2] << 16
                  lo |= this.view[offset + 1] << 8
                  lo |= this.view[offset]
                  lo += (this.view[offset + 3] << 24) >>> 0
                  offset += 4
                  hi = this.view[offset + 2] << 16
                  hi |= this.view[offset + 1] << 8
                  hi |= this.view[offset]
                  hi += (this.view[offset + 3] << 24) >>> 0
                } else {
                  hi = this.view[offset + 1] << 16
                  hi |= this.view[offset + 2] << 8
                  hi |= this.view[offset + 3]
                  hi += (this.view[offset] << 24) >>> 0
                  offset += 4
                  lo = this.view[offset + 1] << 16
                  lo |= this.view[offset + 2] << 8
                  lo |= this.view[offset + 3]
                  lo += (this.view[offset] << 24) >>> 0
                }
                var value = new Long(lo, hi, true)
                if (relative) this.offset += 8
                return value
              }

              /**
               * Reads a 64bit unsigned integer. This is an alias of {@link ByteBuffer#readUint64}.
               * @function
               * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
               * @returns {!Long}
               * @expose
               */
              ByteBufferPrototype.readUInt64 = ByteBufferPrototype.readUint64
            } // Long

            // types/floats/float32

            /*
     ieee754 - https://github.com/feross/ieee754

     The MIT License (MIT)

     Copyright (c) Feross Aboukhadijeh

     Permission is hereby granted, free of charge, to any person obtaining a copy
     of this software and associated documentation files (the "Software"), to deal
     in the Software without restriction, including without limitation the rights
     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     copies of the Software, and to permit persons to whom the Software is
     furnished to do so, subject to the following conditions:

     The above copyright notice and this permission notice shall be included in
     all copies or substantial portions of the Software.

     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
     THE SOFTWARE.
    */

            /**
             * Reads an IEEE754 float from a byte array.
             * @param {!Array} buffer
             * @param {number} offset
             * @param {boolean} isLE
             * @param {number} mLen
             * @param {number} nBytes
             * @returns {number}
             * @inner
             */
            function ieee754_read(buffer, offset, isLE, mLen, nBytes) {
              var e,
                m,
                eLen = nBytes * 8 - mLen - 1,
                eMax = (1 << eLen) - 1,
                eBias = eMax >> 1,
                nBits = -7,
                i = isLE ? nBytes - 1 : 0,
                d = isLE ? -1 : 1,
                s = buffer[offset + i]

              i += d

              e = s & ((1 << -nBits) - 1)
              s >>= -nBits
              nBits += eLen
              for (
                ;
                nBits > 0;
                e = e * 256 + buffer[offset + i], i += d, nBits -= 8
              ) {}

              m = e & ((1 << -nBits) - 1)
              e >>= -nBits
              nBits += mLen
              for (
                ;
                nBits > 0;
                m = m * 256 + buffer[offset + i], i += d, nBits -= 8
              ) {}

              if (e === 0) {
                e = 1 - eBias
              } else if (e === eMax) {
                return m ? NaN : (s ? -1 : 1) * Infinity
              } else {
                m = m + Math.pow(2, mLen)
                e = e - eBias
              }
              return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
            }

            /**
             * Writes an IEEE754 float to a byte array.
             * @param {!Array} buffer
             * @param {number} value
             * @param {number} offset
             * @param {boolean} isLE
             * @param {number} mLen
             * @param {number} nBytes
             * @inner
             */
            function ieee754_write(buffer, value, offset, isLE, mLen, nBytes) {
              var e,
                m,
                c,
                eLen = nBytes * 8 - mLen - 1,
                eMax = (1 << eLen) - 1,
                eBias = eMax >> 1,
                rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
                i = isLE ? 0 : nBytes - 1,
                d = isLE ? 1 : -1,
                s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

              value = Math.abs(value)

              if (isNaN(value) || value === Infinity) {
                m = isNaN(value) ? 1 : 0
                e = eMax
              } else {
                e = Math.floor(Math.log(value) / Math.LN2)
                if (value * (c = Math.pow(2, -e)) < 1) {
                  e--
                  c *= 2
                }
                if (e + eBias >= 1) {
                  value += rt / c
                } else {
                  value += rt * Math.pow(2, 1 - eBias)
                }
                if (value * c >= 2) {
                  e++
                  c /= 2
                }

                if (e + eBias >= eMax) {
                  m = 0
                  e = eMax
                } else if (e + eBias >= 1) {
                  m = (value * c - 1) * Math.pow(2, mLen)
                  e = e + eBias
                } else {
                  m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
                  e = 0
                }
              }

              for (
                ;
                mLen >= 8;
                buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8
              ) {}

              e = (e << mLen) | m
              eLen += mLen
              for (
                ;
                eLen > 0;
                buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8
              ) {}

              buffer[offset + i - d] |= s * 128
            }

            /**
             * Writes a 32bit float.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeFloat32 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number')
                  throw TypeError('Illegal value: ' + value + ' (not a number)')
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 4
              var capacity8 = this.buffer.byteLength
              if (offset > capacity8)
                this.resize((capacity8 *= 2) > offset ? capacity8 : offset)
              offset -= 4
              ieee754_write(this.view, value, offset, this.littleEndian, 23, 4)
              if (relative) this.offset += 4
              return this
            }

            /**
             * Writes a 32bit float. This is an alias of {@link ByteBuffer#writeFloat32}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeFloat = ByteBufferPrototype.writeFloat32

            /**
             * Reads a 32bit float.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {number}
             * @expose
             */
            ByteBufferPrototype.readFloat32 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      4 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = ieee754_read(
                this.view,
                offset,
                this.littleEndian,
                23,
                4
              )
              if (relative) this.offset += 4
              return value
            }

            /**
             * Reads a 32bit float. This is an alias of {@link ByteBuffer#readFloat32}.
             * @function
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
             * @returns {number}
             * @expose
             */
            ByteBufferPrototype.readFloat = ByteBufferPrototype.readFloat32

            // types/floats/float64

            /**
             * Writes a 64bit float.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeFloat64 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number')
                  throw TypeError('Illegal value: ' + value + ' (not a number)')
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              offset += 8
              var capacity9 = this.buffer.byteLength
              if (offset > capacity9)
                this.resize((capacity9 *= 2) > offset ? capacity9 : offset)
              offset -= 8
              ieee754_write(this.view, value, offset, this.littleEndian, 52, 8)
              if (relative) this.offset += 8
              return this
            }

            /**
             * Writes a 64bit float. This is an alias of {@link ByteBuffer#writeFloat64}.
             * @function
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeDouble = ByteBufferPrototype.writeFloat64

            /**
             * Reads a 64bit float.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {number}
             * @expose
             */
            ByteBufferPrototype.readFloat64 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 8 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      8 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var value = ieee754_read(
                this.view,
                offset,
                this.littleEndian,
                52,
                8
              )
              if (relative) this.offset += 8
              return value
            }

            /**
             * Reads a 64bit float. This is an alias of {@link ByteBuffer#readFloat64}.
             * @function
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {number}
             * @expose
             */
            ByteBufferPrototype.readDouble = ByteBufferPrototype.readFloat64

            // types/varints/varint32

            /**
             * Maximum number of bytes required to store a 32bit base 128 variable-length integer.
             * @type {number}
             * @const
             * @expose
             */
            ByteBuffer.MAX_VARINT32_BYTES = 5

            /**
             * Calculates the actual number of bytes required to store a 32bit base 128 variable-length integer.
             * @param {number} value Value to encode
             * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT32_BYTES}
             * @expose
             */
            ByteBuffer.calculateVarint32 = function (value) {
              // ref: src/google/protobuf/io/coded_stream.cc
              value = value >>> 0
              if (value < 1 << 7) return 1
              else if (value < 1 << 14) return 2
              else if (value < 1 << 21) return 3
              else if (value < 1 << 28) return 4
              else return 5
            }

            /**
             * Zigzag encodes a signed 32bit integer so that it can be effectively used with varint encoding.
             * @param {number} n Signed 32bit integer
             * @returns {number} Unsigned zigzag encoded 32bit integer
             * @expose
             */
            ByteBuffer.zigZagEncode32 = function (n) {
              return (((n |= 0) << 1) ^ (n >> 31)) >>> 0 // ref: src/google/protobuf/wire_format_lite.h
            }

            /**
             * Decodes a zigzag encoded signed 32bit integer.
             * @param {number} n Unsigned zigzag encoded 32bit integer
             * @returns {number} Signed 32bit integer
             * @expose
             */
            ByteBuffer.zigZagDecode32 = function (n) {
              return ((n >>> 1) ^ -(n & 1)) | 0 // // ref: src/google/protobuf/wire_format_lite.h
            }

            /**
             * Writes a 32bit base 128 variable-length integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
             * @expose
             */
            ByteBufferPrototype.writeVarint32 = function (value, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value |= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var size = ByteBuffer.calculateVarint32(value),
                b
              offset += size
              var capacity10 = this.buffer.byteLength
              if (offset > capacity10)
                this.resize((capacity10 *= 2) > offset ? capacity10 : offset)
              offset -= size
              value >>>= 0
              while (value >= 0x80) {
                b = (value & 0x7f) | 0x80
                this.view[offset++] = b
                value >>>= 7
              }
              this.view[offset++] = value
              if (relative) {
                this.offset = offset
                return this
              }
              return size
            }

            /**
             * Writes a zig-zag encoded (signed) 32bit base 128 variable-length integer.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
             * @expose
             */
            ByteBufferPrototype.writeVarint32ZigZag = function (value, offset) {
              return this.writeVarint32(
                ByteBuffer.zigZagEncode32(value),
                offset
              )
            }

            /**
             * Reads a 32bit base 128 variable-length integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
             *  and the actual number of bytes read.
             * @throws {Error} If it's not a valid varint. Has a property `truncated = true` if there is not enough data available
             *  to fully decode the varint.
             * @expose
             */
            ByteBufferPrototype.readVarint32 = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      1 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var c = 0,
                value = 0 >>> 0,
                b
              do {
                if (!this.noAssert && offset > this.limit) {
                  var err = Error('Truncated')
                  err['truncated'] = true
                  throw err
                }
                b = this.view[offset++]
                if (c < 5) value |= (b & 0x7f) << (7 * c)
                ++c
              } while ((b & 0x80) !== 0)
              value |= 0
              if (relative) {
                this.offset = offset
                return value
              }
              return {
                value: value,
                length: c
              }
            }

            /**
             * Reads a zig-zag encoded (signed) 32bit base 128 variable-length integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
             *  and the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBufferPrototype.readVarint32ZigZag = function (offset) {
              var val = this.readVarint32(offset)
              if (typeof val === 'object')
                val['value'] = ByteBuffer.zigZagDecode32(val['value'])
              else val = ByteBuffer.zigZagDecode32(val)
              return val
            }

            // types/varints/varint64

            if (Long) {
              /**
               * Maximum number of bytes required to store a 64bit base 128 variable-length integer.
               * @type {number}
               * @const
               * @expose
               */
              ByteBuffer.MAX_VARINT64_BYTES = 10

              /**
               * Calculates the actual number of bytes required to store a 64bit base 128 variable-length integer.
               * @param {number|!Long} value Value to encode
               * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT64_BYTES}
               * @expose
               */
              ByteBuffer.calculateVarint64 = function (value) {
                if (typeof value === 'number') value = Long.fromNumber(value)
                else if (typeof value === 'string')
                  value = Long.fromString(value)
                // ref: src/google/protobuf/io/coded_stream.cc
                var part0 = value.toInt() >>> 0,
                  part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                  part2 = value.shiftRightUnsigned(56).toInt() >>> 0
                if (part2 == 0) {
                  if (part1 == 0) {
                    if (part0 < 1 << 14) return part0 < 1 << 7 ? 1 : 2
                    else return part0 < 1 << 21 ? 3 : 4
                  } else {
                    if (part1 < 1 << 14) return part1 < 1 << 7 ? 5 : 6
                    else return part1 < 1 << 21 ? 7 : 8
                  }
                } else return part2 < 1 << 7 ? 9 : 10
              }

              /**
               * Zigzag encodes a signed 64bit integer so that it can be effectively used with varint encoding.
               * @param {number|!Long} value Signed long
               * @returns {!Long} Unsigned zigzag encoded long
               * @expose
               */
              ByteBuffer.zigZagEncode64 = function (value) {
                if (typeof value === 'number')
                  value = Long.fromNumber(value, false)
                else if (typeof value === 'string')
                  value = Long.fromString(value, false)
                else if (value.unsigned !== false) value = value.toSigned()
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftLeft(1).xor(value.shiftRight(63)).toUnsigned()
              }

              /**
               * Decodes a zigzag encoded signed 64bit integer.
               * @param {!Long|number} value Unsigned zigzag encoded long or JavaScript number
               * @returns {!Long} Signed long
               * @expose
               */
              ByteBuffer.zigZagDecode64 = function (value) {
                if (typeof value === 'number')
                  value = Long.fromNumber(value, false)
                else if (typeof value === 'string')
                  value = Long.fromString(value, false)
                else if (value.unsigned !== false) value = value.toSigned()
                // ref: src/google/protobuf/wire_format_lite.h
                return value
                  .shiftRightUnsigned(1)
                  .xor(value.and(Long.ONE).toSigned().negate())
                  .toSigned()
              }

              /**
               * Writes a 64bit base 128 variable-length integer.
               * @param {number|Long} value Value to write
               * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
               *  written if omitted.
               * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
               * @expose
               */
              ByteBufferPrototype.writeVarint64 = function (value, offset) {
                var relative = typeof offset === 'undefined'
                if (relative) offset = this.offset
                if (!this.noAssert) {
                  if (typeof value === 'number') value = Long.fromNumber(value)
                  else if (typeof value === 'string')
                    value = Long.fromString(value)
                  else if (!(value && value instanceof Long))
                    throw TypeError(
                      'Illegal value: ' + value + ' (not an integer or Long)'
                    )
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        0 +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                if (typeof value === 'number')
                  value = Long.fromNumber(value, false)
                else if (typeof value === 'string')
                  value = Long.fromString(value, false)
                else if (value.unsigned !== false) value = value.toSigned()
                var size = ByteBuffer.calculateVarint64(value),
                  part0 = value.toInt() >>> 0,
                  part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                  part2 = value.shiftRightUnsigned(56).toInt() >>> 0
                offset += size
                var capacity11 = this.buffer.byteLength
                if (offset > capacity11)
                  this.resize((capacity11 *= 2) > offset ? capacity11 : offset)
                offset -= size
                switch (size) {
                  case 10:
                    this.view[offset + 9] = (part2 >>> 7) & 0x01
                  case 9:
                    this.view[offset + 8] =
                      size !== 9 ? part2 | 0x80 : part2 & 0x7f
                  case 8:
                    this.view[offset + 7] =
                      size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7f
                  case 7:
                    this.view[offset + 6] =
                      size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7f
                  case 6:
                    this.view[offset + 5] =
                      size !== 6 ? (part1 >>> 7) | 0x80 : (part1 >>> 7) & 0x7f
                  case 5:
                    this.view[offset + 4] =
                      size !== 5 ? part1 | 0x80 : part1 & 0x7f
                  case 4:
                    this.view[offset + 3] =
                      size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7f
                  case 3:
                    this.view[offset + 2] =
                      size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7f
                  case 2:
                    this.view[offset + 1] =
                      size !== 2 ? (part0 >>> 7) | 0x80 : (part0 >>> 7) & 0x7f
                  case 1:
                    this.view[offset] = size !== 1 ? part0 | 0x80 : part0 & 0x7f
                }
                if (relative) {
                  this.offset += size
                  return this
                } else {
                  return size
                }
              }

              /**
               * Writes a zig-zag encoded 64bit base 128 variable-length integer.
               * @param {number|Long} value Value to write
               * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
               *  written if omitted.
               * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
               * @expose
               */
              ByteBufferPrototype.writeVarint64ZigZag = function (
                value,
                offset
              ) {
                return this.writeVarint64(
                  ByteBuffer.zigZagEncode64(value),
                  offset
                )
              }

              /**
               * Reads a 64bit base 128 variable-length integer. Requires Long.js.
               * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
               *  read if omitted.
               * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
               *  the actual number of bytes read.
               * @throws {Error} If it's not a valid varint
               * @expose
               */
              ByteBufferPrototype.readVarint64 = function (offset) {
                var relative = typeof offset === 'undefined'
                if (relative) offset = this.offset
                if (!this.noAssert) {
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        1 +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                // ref: src/google/protobuf/io/coded_stream.cc
                var start = offset,
                  part0 = 0,
                  part1 = 0,
                  part2 = 0,
                  b = 0
                b = this.view[offset++]
                part0 = b & 0x7f
                if (b & 0x80) {
                  b = this.view[offset++]
                  part0 |= (b & 0x7f) << 7
                  if (b & 0x80 || (this.noAssert && typeof b === 'undefined')) {
                    b = this.view[offset++]
                    part0 |= (b & 0x7f) << 14
                    if (
                      b & 0x80 ||
                      (this.noAssert && typeof b === 'undefined')
                    ) {
                      b = this.view[offset++]
                      part0 |= (b & 0x7f) << 21
                      if (
                        b & 0x80 ||
                        (this.noAssert && typeof b === 'undefined')
                      ) {
                        b = this.view[offset++]
                        part1 = b & 0x7f
                        if (
                          b & 0x80 ||
                          (this.noAssert && typeof b === 'undefined')
                        ) {
                          b = this.view[offset++]
                          part1 |= (b & 0x7f) << 7
                          if (
                            b & 0x80 ||
                            (this.noAssert && typeof b === 'undefined')
                          ) {
                            b = this.view[offset++]
                            part1 |= (b & 0x7f) << 14
                            if (
                              b & 0x80 ||
                              (this.noAssert && typeof b === 'undefined')
                            ) {
                              b = this.view[offset++]
                              part1 |= (b & 0x7f) << 21
                              if (
                                b & 0x80 ||
                                (this.noAssert && typeof b === 'undefined')
                              ) {
                                b = this.view[offset++]
                                part2 = b & 0x7f
                                if (
                                  b & 0x80 ||
                                  (this.noAssert && typeof b === 'undefined')
                                ) {
                                  b = this.view[offset++]
                                  part2 |= (b & 0x7f) << 7
                                  if (
                                    b & 0x80 ||
                                    (this.noAssert && typeof b === 'undefined')
                                  ) {
                                    throw Error('Buffer overrun')
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                var value = Long.fromBits(
                  part0 | (part1 << 28),
                  (part1 >>> 4) | (part2 << 24),
                  false
                )
                if (relative) {
                  this.offset = offset
                  return value
                } else {
                  return {
                    value: value,
                    length: offset - start
                  }
                }
              }

              /**
               * Reads a zig-zag encoded 64bit base 128 variable-length integer. Requires Long.js.
               * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
               *  read if omitted.
               * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
               *  the actual number of bytes read.
               * @throws {Error} If it's not a valid varint
               * @expose
               */
              ByteBufferPrototype.readVarint64ZigZag = function (offset) {
                var val = this.readVarint64(offset)
                if (val && val['value'] instanceof Long)
                  val['value'] = ByteBuffer.zigZagDecode64(val['value'])
                else val = ByteBuffer.zigZagDecode64(val)
                return val
              }
            } // Long

            // types/strings/cstring

            /**
             * Writes a NULL-terminated UTF8 encoded string. For this to work the specified string must not contain any NULL
             *  characters itself.
             * @param {string} str String to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  contained in `str` + 1 if omitted.
             * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
             * @expose
             */
            ByteBufferPrototype.writeCString = function (str, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              var i,
                k = str.length
              if (!this.noAssert) {
                if (typeof str !== 'string')
                  throw TypeError('Illegal str: Not a string')
                for (i = 0; i < k; ++i) {
                  if (str.charCodeAt(i) === 0)
                    throw RangeError('Illegal str: Contains NULL-characters')
                }
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              // UTF8 strings do not contain zero bytes in between except for the zero character, so:
              k = utfx.calculateUTF16asUTF8(stringSource(str))[1]
              offset += k + 1
              var capacity12 = this.buffer.byteLength
              if (offset > capacity12)
                this.resize((capacity12 *= 2) > offset ? capacity12 : offset)
              offset -= k + 1
              utfx.encodeUTF16toUTF8(
                stringSource(str),
                function (b) {
                  this.view[offset++] = b
                }.bind(this)
              )
              this.view[offset++] = 0
              if (relative) {
                this.offset = offset
                return this
              }
              return k
            }

            /**
             * Reads a NULL-terminated UTF8 encoded string. For this to work the string read must not contain any NULL characters
             *  itself.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
             *  read and the actual number of bytes read.
             * @expose
             */
            ByteBufferPrototype.readCString = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      1 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var start = offset,
                temp
              // UTF8 strings do not contain zero bytes in between except for the zero character itself, so:
              var sd,
                b = -1
              utfx.decodeUTF8toUTF16(
                function () {
                  if (b === 0) return null
                  if (offset >= this.limit)
                    throw RangeError(
                      'Illegal range: Truncated data, ' +
                        offset +
                        ' < ' +
                        this.limit
                    )
                  b = this.view[offset++]
                  return b === 0 ? null : b
                }.bind(this),
                (sd = stringDestination()),
                true
              )
              if (relative) {
                this.offset = offset
                return sd()
              } else {
                return {
                  string: sd(),
                  length: offset - start
                }
              }
            }

            // types/strings/istring

            /**
             * Writes a length as uint32 prefixed UTF8 encoded string.
             * @param {string} str String to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
             * @expose
             * @see ByteBuffer#writeVarint32
             */
            ByteBufferPrototype.writeIString = function (str, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof str !== 'string')
                  throw TypeError('Illegal str: Not a string')
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var start = offset,
                k
              k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1]
              offset += 4 + k
              var capacity13 = this.buffer.byteLength
              if (offset > capacity13)
                this.resize((capacity13 *= 2) > offset ? capacity13 : offset)
              offset -= 4 + k
              if (this.littleEndian) {
                this.view[offset + 3] = (k >>> 24) & 0xff
                this.view[offset + 2] = (k >>> 16) & 0xff
                this.view[offset + 1] = (k >>> 8) & 0xff
                this.view[offset] = k & 0xff
              } else {
                this.view[offset] = (k >>> 24) & 0xff
                this.view[offset + 1] = (k >>> 16) & 0xff
                this.view[offset + 2] = (k >>> 8) & 0xff
                this.view[offset + 3] = k & 0xff
              }
              offset += 4
              utfx.encodeUTF16toUTF8(
                stringSource(str),
                function (b) {
                  this.view[offset++] = b
                }.bind(this)
              )
              if (offset !== start + 4 + k)
                throw RangeError(
                  'Illegal range: Truncated data, ' +
                    offset +
                    ' == ' +
                    (offset + 4 + k)
                )
              if (relative) {
                this.offset = offset
                return this
              }
              return offset - start
            }

            /**
             * Reads a length as uint32 prefixed UTF8 encoded string.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
             *  read and the actual number of bytes read.
             * @expose
             * @see ByteBuffer#readVarint32
             */
            ByteBufferPrototype.readIString = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      4 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var start = offset
              var len = this.readUint32(offset)
              var str = this.readUTF8String(
                len,
                ByteBuffer.METRICS_BYTES,
                (offset += 4)
              )
              offset += str['length']
              if (relative) {
                this.offset = offset
                return str['string']
              } else {
                return {
                  string: str['string'],
                  length: offset - start
                }
              }
            }

            // types/strings/utf8string

            /**
             * Metrics representing number of UTF8 characters. Evaluates to `c`.
             * @type {string}
             * @const
             * @expose
             */
            ByteBuffer.METRICS_CHARS = 'c'

            /**
             * Metrics representing number of bytes. Evaluates to `b`.
             * @type {string}
             * @const
             * @expose
             */
            ByteBuffer.METRICS_BYTES = 'b'

            /**
             * Writes an UTF8 encoded string.
             * @param {string} str String to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
             * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBufferPrototype.writeUTF8String = function (str, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var k
              var start = offset
              k = utfx.calculateUTF16asUTF8(stringSource(str))[1]
              offset += k
              var capacity14 = this.buffer.byteLength
              if (offset > capacity14)
                this.resize((capacity14 *= 2) > offset ? capacity14 : offset)
              offset -= k
              utfx.encodeUTF16toUTF8(
                stringSource(str),
                function (b) {
                  this.view[offset++] = b
                }.bind(this)
              )
              if (relative) {
                this.offset = offset
                return this
              }
              return offset - start
            }

            /**
             * Writes an UTF8 encoded string. This is an alias of {@link ByteBuffer#writeUTF8String}.
             * @function
             * @param {string} str String to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
             * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBufferPrototype.writeString =
              ByteBufferPrototype.writeUTF8String

            /**
             * Calculates the number of UTF8 characters of a string. JavaScript itself uses UTF-16, so that a string's
             *  `length` property does not reflect its actual UTF8 size if it contains code points larger than 0xFFFF.
             * @param {string} str String to calculate
             * @returns {number} Number of UTF8 characters
             * @expose
             */
            ByteBuffer.calculateUTF8Chars = function (str) {
              return utfx.calculateUTF16asUTF8(stringSource(str))[0]
            }

            /**
             * Calculates the number of UTF8 bytes of a string.
             * @param {string} str String to calculate
             * @returns {number} Number of UTF8 bytes
             * @expose
             */
            ByteBuffer.calculateUTF8Bytes = function (str) {
              return utfx.calculateUTF16asUTF8(stringSource(str))[1]
            }

            /**
             * Calculates the number of UTF8 bytes of a string. This is an alias of {@link ByteBuffer.calculateUTF8Bytes}.
             * @function
             * @param {string} str String to calculate
             * @returns {number} Number of UTF8 bytes
             * @expose
             */
            ByteBuffer.calculateString = ByteBuffer.calculateUTF8Bytes

            /**
             * Reads an UTF8 encoded string.
             * @param {number} length Number of characters or bytes to read.
             * @param {string=} metrics Metrics specifying what `length` is meant to count. Defaults to
             *  {@link ByteBuffer.METRICS_CHARS}.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
             *  read and the actual number of bytes read.
             * @expose
             */
            ByteBufferPrototype.readUTF8String = function (
              length,
              metrics,
              offset
            ) {
              if (typeof metrics === 'number') {
                offset = metrics
                metrics = undefined
              }
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (typeof metrics === 'undefined')
                metrics = ByteBuffer.METRICS_CHARS
              if (!this.noAssert) {
                if (typeof length !== 'number' || length % 1 !== 0)
                  throw TypeError(
                    'Illegal length: ' + length + ' (not an integer)'
                  )
                length |= 0
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var i = 0,
                start = offset,
                sd
              if (metrics === ByteBuffer.METRICS_CHARS) {
                // The same for node and the browser
                sd = stringDestination()
                utfx.decodeUTF8(
                  function () {
                    return i < length && offset < this.limit
                      ? this.view[offset++]
                      : null
                  }.bind(this),
                  function (cp) {
                    ++i
                    utfx.UTF8toUTF16(cp, sd)
                  }
                )
                if (i !== length)
                  throw RangeError(
                    'Illegal range: Truncated data, ' + i + ' == ' + length
                  )
                if (relative) {
                  this.offset = offset
                  return sd()
                } else {
                  return {
                    string: sd(),
                    length: offset - start
                  }
                }
              } else if (metrics === ByteBuffer.METRICS_BYTES) {
                if (!this.noAssert) {
                  if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError(
                      'Illegal offset: ' + offset + ' (not an integer)'
                    )
                  offset >>>= 0
                  if (offset < 0 || offset + length > this.buffer.byteLength)
                    throw RangeError(
                      'Illegal offset: 0 <= ' +
                        offset +
                        ' (+' +
                        length +
                        ') <= ' +
                        this.buffer.byteLength
                    )
                }
                var k = offset + length
                utfx.decodeUTF8toUTF16(
                  function () {
                    return offset < k ? this.view[offset++] : null
                  }.bind(this),
                  (sd = stringDestination()),
                  this.noAssert
                )
                if (offset !== k)
                  throw RangeError(
                    'Illegal range: Truncated data, ' + offset + ' == ' + k
                  )
                if (relative) {
                  this.offset = offset
                  return sd()
                } else {
                  return {
                    string: sd(),
                    length: offset - start
                  }
                }
              } else throw TypeError('Unsupported metrics: ' + metrics)
            }

            /**
             * Reads an UTF8 encoded string. This is an alias of {@link ByteBuffer#readUTF8String}.
             * @function
             * @param {number} length Number of characters or bytes to read
             * @param {number=} metrics Metrics specifying what `n` is meant to count. Defaults to
             *  {@link ByteBuffer.METRICS_CHARS}.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
             *  read and the actual number of bytes read.
             * @expose
             */
            ByteBufferPrototype.readString = ByteBufferPrototype.readUTF8String

            // types/strings/vstring

            /**
             * Writes a length as varint32 prefixed UTF8 encoded string.
             * @param {string} str String to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
             * @expose
             * @see ByteBuffer#writeVarint32
             */
            ByteBufferPrototype.writeVString = function (str, offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof str !== 'string')
                  throw TypeError('Illegal str: Not a string')
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var start = offset,
                k,
                l
              k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1]
              l = ByteBuffer.calculateVarint32(k)
              offset += l + k
              var capacity15 = this.buffer.byteLength
              if (offset > capacity15)
                this.resize((capacity15 *= 2) > offset ? capacity15 : offset)
              offset -= l + k
              offset += this.writeVarint32(k, offset)
              utfx.encodeUTF16toUTF8(
                stringSource(str),
                function (b) {
                  this.view[offset++] = b
                }.bind(this)
              )
              if (offset !== start + k + l)
                throw RangeError(
                  'Illegal range: Truncated data, ' +
                    offset +
                    ' == ' +
                    (offset + k + l)
                )
              if (relative) {
                this.offset = offset
                return this
              }
              return offset - start
            }

            /**
             * Reads a length as varint32 prefixed UTF8 encoded string.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
             *  read and the actual number of bytes read.
             * @expose
             * @see ByteBuffer#readVarint32
             */
            ByteBufferPrototype.readVString = function (offset) {
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      1 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              var start = offset
              var len = this.readVarint32(offset)
              var str = this.readUTF8String(
                len['value'],
                ByteBuffer.METRICS_BYTES,
                (offset += len['length'])
              )
              offset += str['length']
              if (relative) {
                this.offset = offset
                return str['string']
              } else {
                return {
                  string: str['string'],
                  length: offset - start
                }
              }
            }

            /**
             * Appends some data to this ByteBuffer. This will overwrite any contents behind the specified offset up to the appended
             *  data's length.
             * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to append. If `source` is a ByteBuffer, its offsets
             *  will be modified according to the performed read operation.
             * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
             * @param {number=} offset Offset to append at. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             * @example A relative `<01 02>03.append(<04 05>)` will result in `<01 02 04 05>, 04 05|`
             * @example An absolute `<01 02>03.append(04 05>, 1)` will result in `<01 04>05, 04 05|`
             */
            ByteBufferPrototype.append = function (source, encoding, offset) {
              if (
                typeof encoding === 'number' ||
                typeof encoding !== 'string'
              ) {
                offset = encoding
                encoding = undefined
              }
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding)
              var length = source.limit - source.offset
              if (length <= 0) return this // Nothing to append
              offset += length
              var capacity16 = this.buffer.byteLength
              if (offset > capacity16)
                this.resize((capacity16 *= 2) > offset ? capacity16 : offset)
              offset -= length
              this.view.set(
                source.view.subarray(source.offset, source.limit),
                offset
              )
              source.offset += length
              if (relative) this.offset += length
              return this
            }

            /**
     * Appends this ByteBuffer's contents to another ByteBuffer. This will overwrite any contents at and after the
        specified offset up to the length of this ByteBuffer's data.
     * @param {!ByteBuffer} target Target ByteBuffer
     * @param {number=} offset Offset to append to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
     *  read if omitted.
     * @returns {!ByteBuffer} this
     * @expose
     * @see ByteBuffer#append
     */
            ByteBufferPrototype.appendTo = function (target, offset) {
              target.append(this, offset)
              return this
            }

            /**
             * Enables or disables assertions of argument types and offsets. Assertions are enabled by default but you can opt to
             *  disable them if your code already makes sure that everything is valid.
             * @param {boolean} assert `true` to enable assertions, otherwise `false`
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.assert = function (assert) {
              this.noAssert = !assert
              return this
            }

            /**
             * Gets the capacity of this ByteBuffer's backing buffer.
             * @returns {number} Capacity of the backing buffer
             * @expose
             */
            ByteBufferPrototype.capacity = function () {
              return this.buffer.byteLength
            }
            /**
             * Clears this ByteBuffer's offsets by setting {@link ByteBuffer#offset} to `0` and {@link ByteBuffer#limit} to the
             *  backing buffer's capacity. Discards {@link ByteBuffer#markedOffset}.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.clear = function () {
              this.offset = 0
              this.limit = this.buffer.byteLength
              this.markedOffset = -1
              return this
            }

            /**
             * Creates a cloned instance of this ByteBuffer, preset with this ByteBuffer's values for {@link ByteBuffer#offset},
             *  {@link ByteBuffer#markedOffset} and {@link ByteBuffer#limit}.
             * @param {boolean=} copy Whether to copy the backing buffer or to return another view on the same, defaults to `false`
             * @returns {!ByteBuffer} Cloned instance
             * @expose
             */
            ByteBufferPrototype.clone = function (copy) {
              var bb = new ByteBuffer(0, this.littleEndian, this.noAssert)
              if (copy) {
                bb.buffer = new ArrayBuffer(this.buffer.byteLength)
                bb.view = new Uint8Array(bb.buffer)
              } else {
                bb.buffer = this.buffer
                bb.view = this.view
              }
              bb.offset = this.offset
              bb.markedOffset = this.markedOffset
              bb.limit = this.limit
              return bb
            }

            /**
             * Compacts this ByteBuffer to be backed by a {@link ByteBuffer#buffer} of its contents' length. Contents are the bytes
             *  between {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will set `offset = 0` and `limit = capacity` and
             *  adapt {@link ByteBuffer#markedOffset} to the same relative position if set.
             * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
             * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.compact = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              if (begin === 0 && end === this.buffer.byteLength) return this // Already compacted
              var len = end - begin
              if (len === 0) {
                this.buffer = EMPTY_BUFFER
                this.view = null
                if (this.markedOffset >= 0) this.markedOffset -= begin
                this.offset = 0
                this.limit = 0
                return this
              }
              var buffer = new ArrayBuffer(len)
              var view = new Uint8Array(buffer)
              view.set(this.view.subarray(begin, end))
              this.buffer = buffer
              this.view = view
              if (this.markedOffset >= 0) this.markedOffset -= begin
              this.offset = 0
              this.limit = len
              return this
            }

            /**
             * Creates a copy of this ByteBuffer's contents. Contents are the bytes between {@link ByteBuffer#offset} and
             *  {@link ByteBuffer#limit}.
             * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
             * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
             * @returns {!ByteBuffer} Copy
             * @expose
             */
            ByteBufferPrototype.copy = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              if (begin === end)
                return new ByteBuffer(0, this.littleEndian, this.noAssert)
              var capacity = end - begin,
                bb = new ByteBuffer(capacity, this.littleEndian, this.noAssert)
              bb.offset = 0
              bb.limit = capacity
              if (bb.markedOffset >= 0) bb.markedOffset -= begin
              this.copyTo(bb, 0, begin, end)
              return bb
            }

            /**
             * Copies this ByteBuffer's contents to another ByteBuffer. Contents are the bytes between {@link ByteBuffer#offset} and
             *  {@link ByteBuffer#limit}.
             * @param {!ByteBuffer} target Target ByteBuffer
             * @param {number=} targetOffset Offset to copy to. Will use and increase the target's {@link ByteBuffer#offset}
             *  by the number of bytes copied if omitted.
             * @param {number=} sourceOffset Offset to start copying from. Will use and increase {@link ByteBuffer#offset} by the
             *  number of bytes copied if omitted.
             * @param {number=} sourceLimit Offset to end copying from, defaults to {@link ByteBuffer#limit}
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.copyTo = function (
              target,
              targetOffset,
              sourceOffset,
              sourceLimit
            ) {
              var relative, targetRelative
              if (!this.noAssert) {
                if (!ByteBuffer.isByteBuffer(target))
                  throw TypeError('Illegal target: Not a ByteBuffer')
              }
              targetOffset = (targetRelative =
                typeof targetOffset === 'undefined')
                ? target.offset
                : targetOffset | 0
              sourceOffset = (relative = typeof sourceOffset === 'undefined')
                ? this.offset
                : sourceOffset | 0
              sourceLimit =
                typeof sourceLimit === 'undefined'
                  ? this.limit
                  : sourceLimit | 0

              if (targetOffset < 0 || targetOffset > target.buffer.byteLength)
                throw RangeError(
                  'Illegal target range: 0 <= ' +
                    targetOffset +
                    ' <= ' +
                    target.buffer.byteLength
                )
              if (sourceOffset < 0 || sourceLimit > this.buffer.byteLength)
                throw RangeError(
                  'Illegal source range: 0 <= ' +
                    sourceOffset +
                    ' <= ' +
                    this.buffer.byteLength
                )

              var len = sourceLimit - sourceOffset
              if (len === 0) return target // Nothing to copy

              target.ensureCapacity(targetOffset + len)

              target.view.set(
                this.view.subarray(sourceOffset, sourceLimit),
                targetOffset
              )

              if (relative) this.offset += len
              if (targetRelative) target.offset += len

              return this
            }

            /**
             * Makes sure that this ByteBuffer is backed by a {@link ByteBuffer#buffer} of at least the specified capacity. If the
             *  current capacity is exceeded, it will be doubled. If double the current capacity is less than the required capacity,
             *  the required capacity will be used instead.
             * @param {number} capacity Required capacity
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.ensureCapacity = function (capacity) {
              var current = this.buffer.byteLength
              if (current < capacity)
                return this.resize(
                  (current *= 2) > capacity ? current : capacity
                )
              return this
            }

            /**
             * Overwrites this ByteBuffer's contents with the specified value. Contents are the bytes between
             *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
             * @param {number|string} value Byte value to fill with. If given as a string, the first character is used.
             * @param {number=} begin Begin offset. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted. defaults to {@link ByteBuffer#offset}.
             * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
             * @returns {!ByteBuffer} this
             * @expose
             * @example `someByteBuffer.clear().fill(0)` fills the entire backing buffer with zeroes
             */
            ByteBufferPrototype.fill = function (value, begin, end) {
              var relative = typeof begin === 'undefined'
              if (relative) begin = this.offset
              if (typeof value === 'string' && value.length > 0)
                value = value.charCodeAt(0)
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                  throw TypeError(
                    'Illegal value: ' + value + ' (not an integer)'
                  )
                value |= 0
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              if (begin >= end) return this // Nothing to fill
              while (begin < end) this.view[begin++] = value
              if (relative) this.offset = begin
              return this
            }

            /**
             * Makes this ByteBuffer ready for a new sequence of write or relative read operations. Sets `limit = offset` and
             *  `offset = 0`. Make sure always to flip a ByteBuffer when all relative read or write operations are complete.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.flip = function () {
              this.limit = this.offset
              this.offset = 0
              return this
            }
            /**
             * Marks an offset on this ByteBuffer to be used later.
             * @param {number=} offset Offset to mark. Defaults to {@link ByteBuffer#offset}.
             * @returns {!ByteBuffer} this
             * @throws {TypeError} If `offset` is not a valid number
             * @throws {RangeError} If `offset` is out of bounds
             * @see ByteBuffer#reset
             * @expose
             */
            ByteBufferPrototype.mark = function (offset) {
              offset = typeof offset === 'undefined' ? this.offset : offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              this.markedOffset = offset
              return this
            }
            /**
             * Sets the byte order.
             * @param {boolean} littleEndian `true` for little endian byte order, `false` for big endian
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.order = function (littleEndian) {
              if (!this.noAssert) {
                if (typeof littleEndian !== 'boolean')
                  throw TypeError('Illegal littleEndian: Not a boolean')
              }
              this.littleEndian = !!littleEndian
              return this
            }

            /**
             * Switches (to) little endian byte order.
             * @param {boolean=} littleEndian Defaults to `true`, otherwise uses big endian
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.LE = function (littleEndian) {
              this.littleEndian =
                typeof littleEndian !== 'undefined' ? !!littleEndian : true
              return this
            }

            /**
             * Switches (to) big endian byte order.
             * @param {boolean=} bigEndian Defaults to `true`, otherwise uses little endian
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.BE = function (bigEndian) {
              this.littleEndian =
                typeof bigEndian !== 'undefined' ? !bigEndian : false
              return this
            }
            /**
             * Prepends some data to this ByteBuffer. This will overwrite any contents before the specified offset up to the
             *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
             *  will be resized and its contents moved accordingly.
             * @param {!ByteBuffer|string|!ArrayBuffer} source Data to prepend. If `source` is a ByteBuffer, its offset will be
             *  modified according to the performed read operation.
             * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
             * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
             *  prepended if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             * @example A relative `00<01 02 03>.prepend(<04 05>)` results in `<04 05 01 02 03>, 04 05|`
             * @example An absolute `00<01 02 03>.prepend(<04 05>, 2)` results in `04<05 02 03>, 04 05|`
             */
            ByteBufferPrototype.prepend = function (source, encoding, offset) {
              if (
                typeof encoding === 'number' ||
                typeof encoding !== 'string'
              ) {
                offset = encoding
                encoding = undefined
              }
              var relative = typeof offset === 'undefined'
              if (relative) offset = this.offset
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError(
                    'Illegal offset: ' + offset + ' (not an integer)'
                  )
                offset >>>= 0
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal offset: 0 <= ' +
                      offset +
                      ' (+' +
                      0 +
                      ') <= ' +
                      this.buffer.byteLength
                  )
              }
              if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding)
              var len = source.limit - source.offset
              if (len <= 0) return this // Nothing to prepend
              var diff = len - offset
              if (diff > 0) {
                // Not enough space before offset, so resize + move
                var buffer = new ArrayBuffer(this.buffer.byteLength + diff)
                var view = new Uint8Array(buffer)
                view.set(
                  this.view.subarray(offset, this.buffer.byteLength),
                  len
                )
                this.buffer = buffer
                this.view = view
                this.offset += diff
                if (this.markedOffset >= 0) this.markedOffset += diff
                this.limit += diff
                offset += diff
              } else {
                var arrayView = new Uint8Array(this.buffer)
              }
              this.view.set(
                source.view.subarray(source.offset, source.limit),
                offset - len
              )

              source.offset = source.limit
              if (relative) this.offset -= len
              return this
            }

            /**
             * Prepends this ByteBuffer to another ByteBuffer. This will overwrite any contents before the specified offset up to the
             *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
             *  will be resized and its contents moved accordingly.
             * @param {!ByteBuffer} target Target ByteBuffer
             * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
             *  prepended if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             * @see ByteBuffer#prepend
             */
            ByteBufferPrototype.prependTo = function (target, offset) {
              target.prepend(this, offset)
              return this
            }
            /**
             * Prints debug information about this ByteBuffer's contents.
             * @param {function(string)=} out Output function to call, defaults to console.log
             * @expose
             */
            ByteBufferPrototype.printDebug = function (out) {
              if (typeof out !== 'function') out = console.log.bind(console)
              out(
                this.toString() +
                  '\n' +
                  '-------------------------------------------------------------------\n' +
                  this.toDebug(/* columns */ true)
              )
            }

            /**
             * Gets the number of remaining readable bytes. Contents are the bytes between {@link ByteBuffer#offset} and
             *  {@link ByteBuffer#limit}, so this returns `limit - offset`.
             * @returns {number} Remaining readable bytes. May be negative if `offset > limit`.
             * @expose
             */
            ByteBufferPrototype.remaining = function () {
              return this.limit - this.offset
            }
            /**
             * Resets this ByteBuffer's {@link ByteBuffer#offset}. If an offset has been marked through {@link ByteBuffer#mark}
             *  before, `offset` will be set to {@link ByteBuffer#markedOffset}, which will then be discarded. If no offset has been
             *  marked, sets `offset = 0`.
             * @returns {!ByteBuffer} this
             * @see ByteBuffer#mark
             * @expose
             */
            ByteBufferPrototype.reset = function () {
              if (this.markedOffset >= 0) {
                this.offset = this.markedOffset
                this.markedOffset = -1
              } else {
                this.offset = 0
              }
              return this
            }
            /**
             * Resizes this ByteBuffer to be backed by a buffer of at least the given capacity. Will do nothing if already that
             *  large or larger.
             * @param {number} capacity Capacity required
             * @returns {!ByteBuffer} this
             * @throws {TypeError} If `capacity` is not a number
             * @throws {RangeError} If `capacity < 0`
             * @expose
             */
            ByteBufferPrototype.resize = function (capacity) {
              if (!this.noAssert) {
                if (typeof capacity !== 'number' || capacity % 1 !== 0)
                  throw TypeError(
                    'Illegal capacity: ' + capacity + ' (not an integer)'
                  )
                capacity |= 0
                if (capacity < 0)
                  throw RangeError('Illegal capacity: 0 <= ' + capacity)
              }
              if (this.buffer.byteLength < capacity) {
                var buffer = new ArrayBuffer(capacity)
                var view = new Uint8Array(buffer)
                view.set(this.view)
                this.buffer = buffer
                this.view = view
              }
              return this
            }
            /**
             * Reverses this ByteBuffer's contents.
             * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
             * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.reverse = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              if (begin === end) return this // Nothing to reverse
              Array.prototype.reverse.call(this.view.subarray(begin, end))
              return this
            }
            /**
             * Skips the next `length` bytes. This will just advance
             * @param {number} length Number of bytes to skip. May also be negative to move the offset back.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.skip = function (length) {
              if (!this.noAssert) {
                if (typeof length !== 'number' || length % 1 !== 0)
                  throw TypeError(
                    'Illegal length: ' + length + ' (not an integer)'
                  )
                length |= 0
              }
              var offset = this.offset + length
              if (!this.noAssert) {
                if (offset < 0 || offset > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal length: 0 <= ' +
                      this.offset +
                      ' + ' +
                      length +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              this.offset = offset
              return this
            }

            /**
             * Slices this ByteBuffer by creating a cloned instance with `offset = begin` and `limit = end`.
             * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
             * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
             * @returns {!ByteBuffer} Clone of this ByteBuffer with slicing applied, backed by the same {@link ByteBuffer#buffer}
             * @expose
             */
            ByteBufferPrototype.slice = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              var bb = this.clone()
              bb.offset = begin
              bb.limit = end
              return bb
            }
            /**
             * Returns a copy of the backing buffer that contains this ByteBuffer's contents. Contents are the bytes between
             *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
             * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory if
             *  possible. Defaults to `false`
             * @returns {!ArrayBuffer} Contents as an ArrayBuffer
             * @expose
             */
            ByteBufferPrototype.toBuffer = function (forceCopy) {
              var offset = this.offset,
                limit = this.limit
              if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                  throw TypeError('Illegal offset: Not an integer')
                offset >>>= 0
                if (typeof limit !== 'number' || limit % 1 !== 0)
                  throw TypeError('Illegal limit: Not an integer')
                limit >>>= 0
                if (
                  offset < 0 ||
                  offset > limit ||
                  limit > this.buffer.byteLength
                )
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      offset +
                      ' <= ' +
                      limit +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              // NOTE: It's not possible to have another ArrayBuffer reference the same memory as the backing buffer. This is
              // possible with Uint8Array#subarray only, but we have to return an ArrayBuffer by contract. So:
              if (
                !forceCopy &&
                offset === 0 &&
                limit === this.buffer.byteLength
              )
                return this.buffer
              if (offset === limit) return EMPTY_BUFFER
              var buffer = new ArrayBuffer(limit - offset)
              new Uint8Array(buffer).set(
                new Uint8Array(this.buffer).subarray(offset, limit),
                0
              )
              return buffer
            }

            /**
             * Returns a raw buffer compacted to contain this ByteBuffer's contents. Contents are the bytes between
             *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. This is an alias of {@link ByteBuffer#toBuffer}.
             * @function
             * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory.
             *  Defaults to `false`
             * @returns {!ArrayBuffer} Contents as an ArrayBuffer
             * @expose
             */
            ByteBufferPrototype.toArrayBuffer = ByteBufferPrototype.toBuffer

            /**
             * Converts the ByteBuffer's contents to a string.
             * @param {string=} encoding Output encoding. Returns an informative string representation if omitted but also allows
             *  direct conversion to "utf8", "hex", "base64" and "binary" encoding. "debug" returns a hex representation with
             *  highlighted offsets.
             * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}
             * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
             * @returns {string} String representation
             * @throws {Error} If `encoding` is invalid
             * @expose
             */
            ByteBufferPrototype.toString = function (encoding, begin, end) {
              if (typeof encoding === 'undefined')
                return (
                  'ByteBufferAB(offset=' +
                  this.offset +
                  ',markedOffset=' +
                  this.markedOffset +
                  ',limit=' +
                  this.limit +
                  ',capacity=' +
                  this.capacity() +
                  ')'
                )
              if (typeof encoding === 'number')
                (encoding = 'utf8'), (begin = encoding), (end = begin)
              switch (encoding) {
                case 'utf8':
                  return this.toUTF8(begin, end)
                case 'base64':
                  return this.toBase64(begin, end)
                case 'hex':
                  return this.toHex(begin, end)
                case 'binary':
                  return this.toBinary(begin, end)
                case 'debug':
                  return this.toDebug()
                case 'columns':
                  return this.toColumns()
                default:
                  throw Error('Unsupported encoding: ' + encoding)
              }
            }

            // lxiv-embeddable

            /**
             * lxiv-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
             * Released under the Apache License, Version 2.0
             * see: https://github.com/dcodeIO/lxiv for details
             */
            var lxiv = (function () {
              'use strict'

              /**
               * lxiv namespace.
               * @type {!Object.<string,*>}
               * @exports lxiv
               */
              var lxiv = {}

              /**
               * Character codes for output.
               * @type {!Array.<number>}
               * @inner
               */
              var aout = [
                65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
                81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101,
                102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
                115, 116, 117, 118, 119, 120, 121, 122, 48, 49, 50, 51, 52, 53,
                54, 55, 56, 57, 43, 47
              ]

              /**
               * Character codes for input.
               * @type {!Array.<number>}
               * @inner
               */
              var ain = []
              for (var i = 0, k = aout.length; i < k; ++i) ain[aout[i]] = i

              /**
               * Encodes bytes to base64 char codes.
               * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if
               *  there are no more bytes left.
               * @param {!function(number)} dst Characters destination as a function successively called with each encoded char
               *  code.
               */
              lxiv.encode = function (src, dst) {
                var b, t
                while ((b = src()) !== null) {
                  dst(aout[(b >> 2) & 0x3f])
                  t = (b & 0x3) << 4
                  if ((b = src()) !== null) {
                    t |= (b >> 4) & 0xf
                    dst(aout[(t | ((b >> 4) & 0xf)) & 0x3f])
                    t = (b & 0xf) << 2
                    if ((b = src()) !== null)
                      dst(aout[(t | ((b >> 6) & 0x3)) & 0x3f]),
                        dst(aout[b & 0x3f])
                    else dst(aout[t & 0x3f]), dst(61)
                  } else dst(aout[t & 0x3f]), dst(61), dst(61)
                }
              }

              /**
               * Decodes base64 char codes to bytes.
               * @param {!function():number|null} src Characters source as a function returning the next char code respectively
               *  `null` if there are no more characters left.
               * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
               * @throws {Error} If a character code is invalid
               */
              lxiv.decode = function (src, dst) {
                var c, t1, t2
                function fail(c) {
                  throw Error('Illegal character code: ' + c)
                }
                while ((c = src()) !== null) {
                  t1 = ain[c]
                  if (typeof t1 === 'undefined') fail(c)
                  if ((c = src()) !== null) {
                    t2 = ain[c]
                    if (typeof t2 === 'undefined') fail(c)
                    dst(((t1 << 2) >>> 0) | ((t2 & 0x30) >> 4))
                    if ((c = src()) !== null) {
                      t1 = ain[c]
                      if (typeof t1 === 'undefined')
                        if (c === 61) break
                        else fail(c)
                      dst((((t2 & 0xf) << 4) >>> 0) | ((t1 & 0x3c) >> 2))
                      if ((c = src()) !== null) {
                        t2 = ain[c]
                        if (typeof t2 === 'undefined')
                          if (c === 61) break
                          else fail(c)
                        dst((((t1 & 0x3) << 6) >>> 0) | t2)
                      }
                    }
                  }
                }
              }

              /**
               * Tests if a string is valid base64.
               * @param {string} str String to test
               * @returns {boolean} `true` if valid, otherwise `false`
               */
              lxiv.test = function (str) {
                return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
                  str
                )
              }

              return lxiv
            })()

            // encodings/base64

            /**
             * Encodes this ByteBuffer's contents to a base64 encoded string.
             * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}.
             * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}.
             * @returns {string} Base64 encoded string
             * @throws {RangeError} If `begin` or `end` is out of bounds
             * @expose
             */
            ByteBufferPrototype.toBase64 = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              begin = begin | 0
              end = end | 0
              if (begin < 0 || end > this.capacity || begin > end)
                throw RangeError('begin, end')
              var sd
              lxiv.encode(
                function () {
                  return begin < end ? this.view[begin++] : null
                }.bind(this),
                (sd = stringDestination())
              )
              return sd()
            }

            /**
             * Decodes a base64 encoded string to a ByteBuffer.
             * @param {string} str String to decode
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @returns {!ByteBuffer} ByteBuffer
             * @expose
             */
            ByteBuffer.fromBase64 = function (str, littleEndian) {
              if (typeof str !== 'string') throw TypeError('str')
              var bb = new ByteBuffer((str.length / 4) * 3, littleEndian),
                i = 0
              lxiv.decode(stringSource(str), function (b) {
                bb.view[i++] = b
              })
              bb.limit = i
              return bb
            }

            /**
             * Encodes a binary string to base64 like `window.btoa` does.
             * @param {string} str Binary string
             * @returns {string} Base64 encoded string
             * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
             * @expose
             */
            ByteBuffer.btoa = function (str) {
              return ByteBuffer.fromBinary(str).toBase64()
            }

            /**
             * Decodes a base64 encoded string to binary like `window.atob` does.
             * @param {string} b64 Base64 encoded string
             * @returns {string} Binary string
             * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.atob
             * @expose
             */
            ByteBuffer.atob = function (b64) {
              return ByteBuffer.fromBase64(b64).toBinary()
            }

            // encodings/binary

            /**
             * Encodes this ByteBuffer to a binary encoded string, that is using only characters 0x00-0xFF as bytes.
             * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
             * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
             * @returns {string} Binary encoded string
             * @throws {RangeError} If `offset > limit`
             * @expose
             */
            ByteBufferPrototype.toBinary = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              begin |= 0
              end |= 0
              if (begin < 0 || end > this.capacity() || begin > end)
                throw RangeError('begin, end')
              if (begin === end) return ''
              var chars = [],
                parts = []
              while (begin < end) {
                chars.push(this.view[begin++])
                if (chars.length >= 1024)
                  parts.push(String.fromCharCode.apply(String, chars)),
                    (chars = [])
              }
              return parts.join('') + String.fromCharCode.apply(String, chars)
            }

            /**
             * Decodes a binary encoded string, that is using only characters 0x00-0xFF as bytes, to a ByteBuffer.
             * @param {string} str String to decode
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @returns {!ByteBuffer} ByteBuffer
             * @expose
             */
            ByteBuffer.fromBinary = function (str, littleEndian) {
              if (typeof str !== 'string') throw TypeError('str')
              var i = 0,
                k = str.length,
                charCode,
                bb = new ByteBuffer(k, littleEndian)
              while (i < k) {
                charCode = str.charCodeAt(i)
                if (charCode > 0xff)
                  throw RangeError('illegal char code: ' + charCode)
                bb.view[i++] = charCode
              }
              bb.limit = k
              return bb
            }

            // encodings/debug

            /**
             * Encodes this ByteBuffer to a hex encoded string with marked offsets. Offset symbols are:
             * * `<` : offset,
             * * `'` : markedOffset,
             * * `>` : limit,
             * * `|` : offset and limit,
             * * `[` : offset and markedOffset,
             * * `]` : markedOffset and limit,
             * * `!` : offset, markedOffset and limit
             * @param {boolean=} columns If `true` returns two columns hex + ascii, defaults to `false`
             * @returns {string|!Array.<string>} Debug string or array of lines if `asArray = true`
             * @expose
             * @example `>00'01 02<03` contains four bytes with `limit=0, markedOffset=1, offset=3`
             * @example `00[01 02 03>` contains four bytes with `offset=markedOffset=1, limit=4`
             * @example `00|01 02 03` contains four bytes with `offset=limit=1, markedOffset=-1`
             * @example `|` contains zero bytes with `offset=limit=0, markedOffset=-1`
             */
            ByteBufferPrototype.toDebug = function (columns) {
              var i = -1,
                k = this.buffer.byteLength,
                b,
                hex = '',
                asc = '',
                out = ''
              while (i < k) {
                if (i !== -1) {
                  b = this.view[i]
                  if (b < 0x10) hex += '0' + b.toString(16).toUpperCase()
                  else hex += b.toString(16).toUpperCase()
                  if (columns)
                    asc += b > 32 && b < 127 ? String.fromCharCode(b) : '.'
                }
                ++i
                if (columns) {
                  if (i > 0 && i % 16 === 0 && i !== k) {
                    while (hex.length < 3 * 16 + 3) hex += ' '
                    out += hex + asc + '\n'
                    hex = asc = ''
                  }
                }
                if (i === this.offset && i === this.limit)
                  hex += i === this.markedOffset ? '!' : '|'
                else if (i === this.offset)
                  hex += i === this.markedOffset ? '[' : '<'
                else if (i === this.limit)
                  hex += i === this.markedOffset ? ']' : '>'
                else
                  hex +=
                    i === this.markedOffset
                      ? "'"
                      : columns || (i !== 0 && i !== k)
                      ? ' '
                      : ''
              }
              if (columns && hex !== ' ') {
                while (hex.length < 3 * 16 + 3) hex += ' '
                out += hex + asc + '\n'
              }
              return columns ? out : hex
            }

            /**
             * Decodes a hex encoded string with marked offsets to a ByteBuffer.
             * @param {string} str Debug string to decode (not be generated with `columns = true`)
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @returns {!ByteBuffer} ByteBuffer
             * @expose
             * @see ByteBuffer#toDebug
             */
            ByteBuffer.fromDebug = function (str, littleEndian, noAssert) {
              var k = str.length,
                bb = new ByteBuffer(((k + 1) / 3) | 0, littleEndian, noAssert)
              var i = 0,
                j = 0,
                ch,
                b,
                rs = false, // Require symbol next
                ho = false,
                hm = false,
                hl = false, // Already has offset (ho), markedOffset (hm), limit (hl)?
                fail = false
              while (i < k) {
                switch ((ch = str.charAt(i++))) {
                  case '!':
                    if (!noAssert) {
                      if (ho || hm || hl) {
                        fail = true
                        break
                      }
                      ho = hm = hl = true
                    }
                    bb.offset = bb.markedOffset = bb.limit = j
                    rs = false
                    break
                  case '|':
                    if (!noAssert) {
                      if (ho || hl) {
                        fail = true
                        break
                      }
                      ho = hl = true
                    }
                    bb.offset = bb.limit = j
                    rs = false
                    break
                  case '[':
                    if (!noAssert) {
                      if (ho || hm) {
                        fail = true
                        break
                      }
                      ho = hm = true
                    }
                    bb.offset = bb.markedOffset = j
                    rs = false
                    break
                  case '<':
                    if (!noAssert) {
                      if (ho) {
                        fail = true
                        break
                      }
                      ho = true
                    }
                    bb.offset = j
                    rs = false
                    break
                  case ']':
                    if (!noAssert) {
                      if (hl || hm) {
                        fail = true
                        break
                      }
                      hl = hm = true
                    }
                    bb.limit = bb.markedOffset = j
                    rs = false
                    break
                  case '>':
                    if (!noAssert) {
                      if (hl) {
                        fail = true
                        break
                      }
                      hl = true
                    }
                    bb.limit = j
                    rs = false
                    break
                  case "'":
                    if (!noAssert) {
                      if (hm) {
                        fail = true
                        break
                      }
                      hm = true
                    }
                    bb.markedOffset = j
                    rs = false
                    break
                  case ' ':
                    rs = false
                    break
                  default:
                    if (!noAssert) {
                      if (rs) {
                        fail = true
                        break
                      }
                    }
                    b = parseInt(ch + str.charAt(i++), 16)
                    if (!noAssert) {
                      if (isNaN(b) || b < 0 || b > 255)
                        throw TypeError(
                          'Illegal str: Not a debug encoded string'
                        )
                    }
                    bb.view[j++] = b
                    rs = true
                }
                if (fail) throw TypeError('Illegal str: Invalid symbol at ' + i)
              }
              if (!noAssert) {
                if (!ho || !hl)
                  throw TypeError('Illegal str: Missing offset or limit')
                if (j < bb.buffer.byteLength)
                  throw TypeError(
                    'Illegal str: Not a debug encoded string (is it hex?) ' +
                      j +
                      ' < ' +
                      k
                  )
              }
              return bb
            }

            // encodings/hex

            /**
             * Encodes this ByteBuffer's contents to a hex encoded string.
             * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
             * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
             * @returns {string} Hex encoded string
             * @expose
             */
            ByteBufferPrototype.toHex = function (begin, end) {
              begin = typeof begin === 'undefined' ? this.offset : begin
              end = typeof end === 'undefined' ? this.limit : end
              if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              var out = new Array(end - begin),
                b
              while (begin < end) {
                b = this.view[begin++]
                if (b < 0x10) out.push('0', b.toString(16))
                else out.push(b.toString(16))
              }
              return out.join('')
            }

            /**
             * Decodes a hex encoded string to a ByteBuffer.
             * @param {string} str String to decode
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @returns {!ByteBuffer} ByteBuffer
             * @expose
             */
            ByteBuffer.fromHex = function (str, littleEndian, noAssert) {
              if (!noAssert) {
                if (typeof str !== 'string')
                  throw TypeError('Illegal str: Not a string')
                if (str.length % 2 !== 0)
                  throw TypeError('Illegal str: Length not a multiple of 2')
              }
              var k = str.length,
                bb = new ByteBuffer((k / 2) | 0, littleEndian),
                b
              for (var i = 0, j = 0; i < k; i += 2) {
                b = parseInt(str.substring(i, i + 2), 16)
                if (!noAssert)
                  if (!isFinite(b) || b < 0 || b > 255)
                    throw TypeError('Illegal str: Contains non-hex characters')
                bb.view[j++] = b
              }
              bb.limit = j
              return bb
            }

            // utfx-embeddable

            /**
             * utfx-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
             * Released under the Apache License, Version 2.0
             * see: https://github.com/dcodeIO/utfx for details
             */
            var utfx = (function () {
              'use strict'

              /**
               * utfx namespace.
               * @inner
               * @type {!Object.<string,*>}
               */
              var utfx = {}

              /**
               * Maximum valid code point.
               * @type {number}
               * @const
               */
              utfx.MAX_CODEPOINT = 0x10ffff

              /**
               * Encodes UTF8 code points to UTF8 bytes.
               * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
               *  respectively `null` if there are no more code points left or a single numeric code point.
               * @param {!function(number)} dst Bytes destination as a function successively called with the next byte
               */
              utfx.encodeUTF8 = function (src, dst) {
                var cp = null
                if (typeof src === 'number')
                  (cp = src),
                    (src = function () {
                      return null
                    })
                while (cp !== null || (cp = src()) !== null) {
                  if (cp < 0x80) dst(cp & 0x7f)
                  else if (cp < 0x800)
                    dst(((cp >> 6) & 0x1f) | 0xc0), dst((cp & 0x3f) | 0x80)
                  else if (cp < 0x10000)
                    dst(((cp >> 12) & 0x0f) | 0xe0),
                      dst(((cp >> 6) & 0x3f) | 0x80),
                      dst((cp & 0x3f) | 0x80)
                  else
                    dst(((cp >> 18) & 0x07) | 0xf0),
                      dst(((cp >> 12) & 0x3f) | 0x80),
                      dst(((cp >> 6) & 0x3f) | 0x80),
                      dst((cp & 0x3f) | 0x80)
                  cp = null
                }
              }

              /**
               * Decodes UTF8 bytes to UTF8 code points.
               * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
               *  are no more bytes left.
               * @param {!function(number)} dst Code points destination as a function successively called with each decoded code point.
               * @throws {RangeError} If a starting byte is invalid in UTF8
               * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the
               *  remaining bytes.
               */
              utfx.decodeUTF8 = function (src, dst) {
                var a,
                  b,
                  c,
                  d,
                  fail = function (b) {
                    b = b.slice(0, b.indexOf(null))
                    var err = Error(b.toString())
                    err.name = 'TruncatedError'
                    err['bytes'] = b
                    throw err
                  }
                while ((a = src()) !== null) {
                  if ((a & 0x80) === 0) dst(a)
                  else if ((a & 0xe0) === 0xc0)
                    (b = src()) === null && fail([a, b]),
                      dst(((a & 0x1f) << 6) | (b & 0x3f))
                  else if ((a & 0xf0) === 0xe0)
                    ((b = src()) === null || (c = src()) === null) &&
                      fail([a, b, c]),
                      dst(((a & 0x0f) << 12) | ((b & 0x3f) << 6) | (c & 0x3f))
                  else if ((a & 0xf8) === 0xf0)
                    ((b = src()) === null ||
                      (c = src()) === null ||
                      (d = src()) === null) &&
                      fail([a, b, c, d]),
                      dst(
                        ((a & 0x07) << 18) |
                          ((b & 0x3f) << 12) |
                          ((c & 0x3f) << 6) |
                          (d & 0x3f)
                      )
                  else throw RangeError('Illegal starting byte: ' + a)
                }
              }

              /**
               * Converts UTF16 characters to UTF8 code points.
               * @param {!function():number|null} src Characters source as a function returning the next char code respectively
               *  `null` if there are no more characters left.
               * @param {!function(number)} dst Code points destination as a function successively called with each converted code
               *  point.
               */
              utfx.UTF16toUTF8 = function (src, dst) {
                var c1,
                  c2 = null
                while (true) {
                  if ((c1 = c2 !== null ? c2 : src()) === null) break
                  if (c1 >= 0xd800 && c1 <= 0xdfff) {
                    if ((c2 = src()) !== null) {
                      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
                        dst((c1 - 0xd800) * 0x400 + c2 - 0xdc00 + 0x10000)
                        c2 = null
                        continue
                      }
                    }
                  }
                  dst(c1)
                }
                if (c2 !== null) dst(c2)
              }

              /**
               * Converts UTF8 code points to UTF16 characters.
               * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
               *  respectively `null` if there are no more code points left or a single numeric code point.
               * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
               * @throws {RangeError} If a code point is out of range
               */
              utfx.UTF8toUTF16 = function (src, dst) {
                var cp = null
                if (typeof src === 'number')
                  (cp = src),
                    (src = function () {
                      return null
                    })
                while (cp !== null || (cp = src()) !== null) {
                  if (cp <= 0xffff) dst(cp)
                  else
                    (cp -= 0x10000),
                      dst((cp >> 10) + 0xd800),
                      dst((cp % 0x400) + 0xdc00)
                  cp = null
                }
              }

              /**
               * Converts and encodes UTF16 characters to UTF8 bytes.
               * @param {!function():number|null} src Characters source as a function returning the next char code respectively `null`
               *  if there are no more characters left.
               * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
               */
              utfx.encodeUTF16toUTF8 = function (src, dst) {
                utfx.UTF16toUTF8(src, function (cp) {
                  utfx.encodeUTF8(cp, dst)
                })
              }

              /**
               * Decodes and converts UTF8 bytes to UTF16 characters.
               * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
               *  are no more bytes left.
               * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
               * @throws {RangeError} If a starting byte is invalid in UTF8
               * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the remaining bytes.
               */
              utfx.decodeUTF8toUTF16 = function (src, dst) {
                utfx.decodeUTF8(src, function (cp) {
                  utfx.UTF8toUTF16(cp, dst)
                })
              }

              /**
               * Calculates the byte length of an UTF8 code point.
               * @param {number} cp UTF8 code point
               * @returns {number} Byte length
               */
              utfx.calculateCodePoint = function (cp) {
                return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4
              }

              /**
               * Calculates the number of UTF8 bytes required to store UTF8 code points.
               * @param {(!function():number|null)} src Code points source as a function returning the next code point respectively
               *  `null` if there are no more code points left.
               * @returns {number} The number of UTF8 bytes required
               */
              utfx.calculateUTF8 = function (src) {
                var cp,
                  l = 0
                while ((cp = src()) !== null)
                  l += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4
                return l
              }

              /**
               * Calculates the number of UTF8 code points respectively UTF8 bytes required to store UTF16 char codes.
               * @param {(!function():number|null)} src Characters source as a function returning the next char code respectively
               *  `null` if there are no more characters left.
               * @returns {!Array.<number>} The number of UTF8 code points at index 0 and the number of UTF8 bytes required at index 1.
               */
              utfx.calculateUTF16asUTF8 = function (src) {
                var n = 0,
                  l = 0
                utfx.UTF16toUTF8(src, function (cp) {
                  ++n
                  l += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4
                })
                return [n, l]
              }

              return utfx
            })()

            // encodings/utf8

            /**
             * Encodes this ByteBuffer's contents between {@link ByteBuffer#offset} and {@link ByteBuffer#limit} to an UTF8 encoded
             *  string.
             * @returns {string} Hex encoded string
             * @throws {RangeError} If `offset > limit`
             * @expose
             */
            ByteBufferPrototype.toUTF8 = function (begin, end) {
              if (typeof begin === 'undefined') begin = this.offset
              if (typeof end === 'undefined') end = this.limit
              if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                  throw TypeError('Illegal begin: Not an integer')
                begin >>>= 0
                if (typeof end !== 'number' || end % 1 !== 0)
                  throw TypeError('Illegal end: Not an integer')
                end >>>= 0
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                  throw RangeError(
                    'Illegal range: 0 <= ' +
                      begin +
                      ' <= ' +
                      end +
                      ' <= ' +
                      this.buffer.byteLength
                  )
              }
              var sd
              try {
                utfx.decodeUTF8toUTF16(
                  function () {
                    return begin < end ? this.view[begin++] : null
                  }.bind(this),
                  (sd = stringDestination())
                )
              } catch (e) {
                if (begin !== end)
                  throw RangeError(
                    'Illegal range: Truncated data, ' + begin + ' != ' + end
                  )
              }
              return sd()
            }

            /**
             * Decodes an UTF8 encoded string to a ByteBuffer.
             * @param {string} str String to decode
             * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
             *  {@link ByteBuffer.DEFAULT_ENDIAN}.
             * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
             *  {@link ByteBuffer.DEFAULT_NOASSERT}.
             * @returns {!ByteBuffer} ByteBuffer
             * @expose
             */
            ByteBuffer.fromUTF8 = function (str, littleEndian, noAssert) {
              if (!noAssert)
                if (typeof str !== 'string')
                  throw TypeError('Illegal str: Not a string')
              var bb = new ByteBuffer(
                  utfx.calculateUTF16asUTF8(stringSource(str), true)[1],
                  littleEndian,
                  noAssert
                ),
                i = 0
              utfx.encodeUTF16toUTF8(stringSource(str), function (b) {
                bb.view[i++] = b
              })
              bb.limit = i
              return bb
            }

            return ByteBuffer
          })
        },
        {long: 17}
      ],
      17: [
        function (require, module, exports) {
          /*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Copyright 2009 The Closure Library Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

          /**
           * @license long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
           * Released under the Apache License, Version 2.0
           * see: https://github.com/dcodeIO/long.js for details
           */
          ;(function (global, factory) {
            /* AMD */ if (typeof define === 'function' && define['amd'])
              define([], factory)
            /* CommonJS */ else if (
              typeof require === 'function' &&
              typeof module === 'object' &&
              module &&
              module['exports']
            )
              module['exports'] = factory()
            /* Global */ else
              (global['dcodeIO'] = global['dcodeIO'] || {})['Long'] = factory()
          })(this, function () {
            'use strict'

            /**
             * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
             *  See the from* functions below for more convenient ways of constructing Longs.
             * @exports Long
             * @class A Long class for representing a 64 bit two's-complement integer value.
             * @param {number} low The low (signed) 32 bits of the long
             * @param {number} high The high (signed) 32 bits of the long
             * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
             * @constructor
             */
            function Long(low, high, unsigned) {
              /**
               * The low 32 bits as a signed value.
               * @type {number}
               */
              this.low = low | 0

              /**
               * The high 32 bits as a signed value.
               * @type {number}
               */
              this.high = high | 0

              /**
               * Whether unsigned or not.
               * @type {boolean}
               */
              this.unsigned = !!unsigned
            }

            // The internal representation of a long is the two given signed, 32-bit values.
            // We use 32-bit pieces because these are the size of integers on which
            // Javascript performs bit-operations.  For operations like addition and
            // multiplication, we split each number into 16 bit pieces, which can easily be
            // multiplied within Javascript's floating-point representation without overflow
            // or change in sign.
            //
            // In the algorithms below, we frequently reduce the negative case to the
            // positive case by negating the input(s) and then post-processing the result.
            // Note that we must ALWAYS check specially whether those values are MIN_VALUE
            // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
            // a positive number, it overflows back into a negative).  Not handling this
            // case would often result in infinite recursion.
            //
            // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
            // methods on which they depend.

            /**
             * An indicator used to reliably determine if an object is a Long or not.
             * @type {boolean}
             * @const
             * @private
             */
            Long.prototype.__isLong__

            Object.defineProperty(Long.prototype, '__isLong__', {
              value: true,
              enumerable: false,
              configurable: false
            })

            /**
             * @function
             * @param {*} obj Object
             * @returns {boolean}
             * @inner
             */
            function isLong(obj) {
              return (obj && obj['__isLong__']) === true
            }

            /**
             * Tests if the specified object is a Long.
             * @function
             * @param {*} obj Object
             * @returns {boolean}
             */
            Long.isLong = isLong

            /**
             * A cache of the Long representations of small integer values.
             * @type {!Object}
             * @inner
             */
            var INT_CACHE = {}

            /**
             * A cache of the Long representations of small unsigned integer values.
             * @type {!Object}
             * @inner
             */
            var UINT_CACHE = {}

            /**
             * @param {number} value
             * @param {boolean=} unsigned
             * @returns {!Long}
             * @inner
             */
            function fromInt(value, unsigned) {
              var obj, cachedObj, cache
              if (unsigned) {
                value >>>= 0
                if ((cache = 0 <= value && value < 256)) {
                  cachedObj = UINT_CACHE[value]
                  if (cachedObj) return cachedObj
                }
                obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true)
                if (cache) UINT_CACHE[value] = obj
                return obj
              } else {
                value |= 0
                if ((cache = -128 <= value && value < 128)) {
                  cachedObj = INT_CACHE[value]
                  if (cachedObj) return cachedObj
                }
                obj = fromBits(value, value < 0 ? -1 : 0, false)
                if (cache) INT_CACHE[value] = obj
                return obj
              }
            }

            /**
             * Returns a Long representing the given 32 bit integer value.
             * @function
             * @param {number} value The 32 bit integer in question
             * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
             * @returns {!Long} The corresponding Long value
             */
            Long.fromInt = fromInt

            /**
             * @param {number} value
             * @param {boolean=} unsigned
             * @returns {!Long}
             * @inner
             */
            function fromNumber(value, unsigned) {
              if (isNaN(value) || !isFinite(value))
                return unsigned ? UZERO : ZERO
              if (unsigned) {
                if (value < 0) return UZERO
                if (value >= TWO_PWR_64_DBL) return MAX_UNSIGNED_VALUE
              } else {
                if (value <= -TWO_PWR_63_DBL) return MIN_VALUE
                if (value + 1 >= TWO_PWR_63_DBL) return MAX_VALUE
              }
              if (value < 0) return fromNumber(-value, unsigned).neg()
              return fromBits(
                value % TWO_PWR_32_DBL | 0,
                (value / TWO_PWR_32_DBL) | 0,
                unsigned
              )
            }

            /**
             * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
             * @function
             * @param {number} value The number in question
             * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
             * @returns {!Long} The corresponding Long value
             */
            Long.fromNumber = fromNumber

            /**
             * @param {number} lowBits
             * @param {number} highBits
             * @param {boolean=} unsigned
             * @returns {!Long}
             * @inner
             */
            function fromBits(lowBits, highBits, unsigned) {
              return new Long(lowBits, highBits, unsigned)
            }

            /**
             * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
             *  assumed to use 32 bits.
             * @function
             * @param {number} lowBits The low 32 bits
             * @param {number} highBits The high 32 bits
             * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
             * @returns {!Long} The corresponding Long value
             */
            Long.fromBits = fromBits

            /**
             * @function
             * @param {number} base
             * @param {number} exponent
             * @returns {number}
             * @inner
             */
            var pow_dbl = Math.pow // Used 4 times (4*8 to 15+4)

            /**
             * @param {string} str
             * @param {(boolean|number)=} unsigned
             * @param {number=} radix
             * @returns {!Long}
             * @inner
             */
            function fromString(str, unsigned, radix) {
              if (str.length === 0) throw Error('empty string')
              if (
                str === 'NaN' ||
                str === 'Infinity' ||
                str === '+Infinity' ||
                str === '-Infinity'
              )
                return ZERO
              if (typeof unsigned === 'number') {
                // For goog.math.long compatibility
                ;(radix = unsigned), (unsigned = false)
              } else {
                unsigned = !!unsigned
              }
              radix = radix || 10
              if (radix < 2 || 36 < radix) throw RangeError('radix')

              var p
              if ((p = str.indexOf('-')) > 0) throw Error('interior hyphen')
              else if (p === 0) {
                return fromString(str.substring(1), unsigned, radix).neg()
              }

              // Do several (8) digits each time through the loop, so as to
              // minimize the calls to the very expensive emulated div.
              var radixToPower = fromNumber(pow_dbl(radix, 8))

              var result = ZERO
              for (var i = 0; i < str.length; i += 8) {
                var size = Math.min(8, str.length - i),
                  value = parseInt(str.substring(i, i + size), radix)
                if (size < 8) {
                  var power = fromNumber(pow_dbl(radix, size))
                  result = result.mul(power).add(fromNumber(value))
                } else {
                  result = result.mul(radixToPower)
                  result = result.add(fromNumber(value))
                }
              }
              result.unsigned = unsigned
              return result
            }

            /**
             * Returns a Long representation of the given string, written using the specified radix.
             * @function
             * @param {string} str The textual representation of the Long
             * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to `false` for signed
             * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
             * @returns {!Long} The corresponding Long value
             */
            Long.fromString = fromString

            /**
             * @function
             * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val
             * @returns {!Long}
             * @inner
             */
            function fromValue(val) {
              if (val /* is compatible */ instanceof Long) return val
              if (typeof val === 'number') return fromNumber(val)
              if (typeof val === 'string') return fromString(val)
              // Throws for non-objects, converts non-instanceof Long:
              return fromBits(val.low, val.high, val.unsigned)
            }

            /**
             * Converts the specified value to a Long.
             * @function
             * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
             * @returns {!Long}
             */
            Long.fromValue = fromValue

            // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
            // no runtime penalty for these.

            /**
             * @type {number}
             * @const
             * @inner
             */
            var TWO_PWR_16_DBL = 1 << 16

            /**
             * @type {number}
             * @const
             * @inner
             */
            var TWO_PWR_24_DBL = 1 << 24

            /**
             * @type {number}
             * @const
             * @inner
             */
            var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL

            /**
             * @type {number}
             * @const
             * @inner
             */
            var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL

            /**
             * @type {number}
             * @const
             * @inner
             */
            var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2

            /**
             * @type {!Long}
             * @const
             * @inner
             */
            var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL)

            /**
             * @type {!Long}
             * @inner
             */
            var ZERO = fromInt(0)

            /**
             * Signed zero.
             * @type {!Long}
             */
            Long.ZERO = ZERO

            /**
             * @type {!Long}
             * @inner
             */
            var UZERO = fromInt(0, true)

            /**
             * Unsigned zero.
             * @type {!Long}
             */
            Long.UZERO = UZERO

            /**
             * @type {!Long}
             * @inner
             */
            var ONE = fromInt(1)

            /**
             * Signed one.
             * @type {!Long}
             */
            Long.ONE = ONE

            /**
             * @type {!Long}
             * @inner
             */
            var UONE = fromInt(1, true)

            /**
             * Unsigned one.
             * @type {!Long}
             */
            Long.UONE = UONE

            /**
             * @type {!Long}
             * @inner
             */
            var NEG_ONE = fromInt(-1)

            /**
             * Signed negative one.
             * @type {!Long}
             */
            Long.NEG_ONE = NEG_ONE

            /**
             * @type {!Long}
             * @inner
             */
            var MAX_VALUE = fromBits(0xffffffff | 0, 0x7fffffff | 0, false)

            /**
             * Maximum signed value.
             * @type {!Long}
             */
            Long.MAX_VALUE = MAX_VALUE

            /**
             * @type {!Long}
             * @inner
             */
            var MAX_UNSIGNED_VALUE = fromBits(
              0xffffffff | 0,
              0xffffffff | 0,
              true
            )

            /**
             * Maximum unsigned value.
             * @type {!Long}
             */
            Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE

            /**
             * @type {!Long}
             * @inner
             */
            var MIN_VALUE = fromBits(0, 0x80000000 | 0, false)

            /**
             * Minimum signed value.
             * @type {!Long}
             */
            Long.MIN_VALUE = MIN_VALUE

            /**
             * @alias Long.prototype
             * @inner
             */
            var LongPrototype = Long.prototype

            /**
             * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
             * @returns {number}
             */
            LongPrototype.toInt = function toInt() {
              return this.unsigned ? this.low >>> 0 : this.low
            }

            /**
             * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
             * @returns {number}
             */
            LongPrototype.toNumber = function toNumber() {
              if (this.unsigned)
                return (this.high >>> 0) * TWO_PWR_32_DBL + (this.low >>> 0)
              return this.high * TWO_PWR_32_DBL + (this.low >>> 0)
            }

            /**
             * Converts the Long to a string written in the specified radix.
             * @param {number=} radix Radix (2-36), defaults to 10
             * @returns {string}
             * @override
             * @throws {RangeError} If `radix` is out of range
             */
            LongPrototype.toString = function toString(radix) {
              radix = radix || 10
              if (radix < 2 || 36 < radix) throw RangeError('radix')
              if (this.isZero()) return '0'
              if (this.isNegative()) {
                // Unsigned Longs are never negative
                if (this.eq(MIN_VALUE)) {
                  // We need to change the Long value before it can be negated, so we remove
                  // the bottom-most digit in this base and then recurse to do the rest.
                  var radixLong = fromNumber(radix),
                    div = this.div(radixLong),
                    rem1 = div.mul(radixLong).sub(this)
                  return div.toString(radix) + rem1.toInt().toString(radix)
                } else return '-' + this.neg().toString(radix)
              }

              // Do several (6) digits each time through the loop, so as to
              // minimize the calls to the very expensive emulated div.
              var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
                rem = this
              var result = ''
              while (true) {
                var remDiv = rem.div(radixToPower),
                  intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
                  digits = intval.toString(radix)
                rem = remDiv
                if (rem.isZero()) return digits + result
                else {
                  while (digits.length < 6) digits = '0' + digits
                  result = '' + digits + result
                }
              }
            }

            /**
             * Gets the high 32 bits as a signed integer.
             * @returns {number} Signed high bits
             */
            LongPrototype.getHighBits = function getHighBits() {
              return this.high
            }

            /**
             * Gets the high 32 bits as an unsigned integer.
             * @returns {number} Unsigned high bits
             */
            LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
              return this.high >>> 0
            }

            /**
             * Gets the low 32 bits as a signed integer.
             * @returns {number} Signed low bits
             */
            LongPrototype.getLowBits = function getLowBits() {
              return this.low
            }

            /**
             * Gets the low 32 bits as an unsigned integer.
             * @returns {number} Unsigned low bits
             */
            LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
              return this.low >>> 0
            }

            /**
             * Gets the number of bits needed to represent the absolute value of this Long.
             * @returns {number}
             */
            LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
              if (this.isNegative())
                // Unsigned Longs are never negative
                return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs()
              var val = this.high != 0 ? this.high : this.low
              for (var bit = 31; bit > 0; bit--)
                if ((val & (1 << bit)) != 0) break
              return this.high != 0 ? bit + 33 : bit + 1
            }

            /**
             * Tests if this Long's value equals zero.
             * @returns {boolean}
             */
            LongPrototype.isZero = function isZero() {
              return this.high === 0 && this.low === 0
            }

            /**
             * Tests if this Long's value is negative.
             * @returns {boolean}
             */
            LongPrototype.isNegative = function isNegative() {
              return !this.unsigned && this.high < 0
            }

            /**
             * Tests if this Long's value is positive.
             * @returns {boolean}
             */
            LongPrototype.isPositive = function isPositive() {
              return this.unsigned || this.high >= 0
            }

            /**
             * Tests if this Long's value is odd.
             * @returns {boolean}
             */
            LongPrototype.isOdd = function isOdd() {
              return (this.low & 1) === 1
            }

            /**
             * Tests if this Long's value is even.
             * @returns {boolean}
             */
            LongPrototype.isEven = function isEven() {
              return (this.low & 1) === 0
            }

            /**
             * Tests if this Long's value equals the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.equals = function equals(other) {
              if (!isLong(other)) other = fromValue(other)
              if (
                this.unsigned !== other.unsigned &&
                this.high >>> 31 === 1 &&
                other.high >>> 31 === 1
              )
                return false
              return this.high === other.high && this.low === other.low
            }

            /**
             * Tests if this Long's value equals the specified's. This is an alias of {@link Long#equals}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.eq = LongPrototype.equals

            /**
             * Tests if this Long's value differs from the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.notEquals = function notEquals(other) {
              return !this.eq(/* validates */ other)
            }

            /**
             * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.neq = LongPrototype.notEquals

            /**
             * Tests if this Long's value is less than the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.lessThan = function lessThan(other) {
              return this.comp(/* validates */ other) < 0
            }

            /**
             * Tests if this Long's value is less than the specified's. This is an alias of {@link Long#lessThan}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.lt = LongPrototype.lessThan

            /**
             * Tests if this Long's value is less than or equal the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
              return this.comp(/* validates */ other) <= 0
            }

            /**
             * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.lte = LongPrototype.lessThanOrEqual

            /**
             * Tests if this Long's value is greater than the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.greaterThan = function greaterThan(other) {
              return this.comp(/* validates */ other) > 0
            }

            /**
             * Tests if this Long's value is greater than the specified's. This is an alias of {@link Long#greaterThan}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.gt = LongPrototype.greaterThan

            /**
             * Tests if this Long's value is greater than or equal the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(
              other
            ) {
              return this.comp(/* validates */ other) >= 0
            }

            /**
             * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {boolean}
             */
            LongPrototype.gte = LongPrototype.greaterThanOrEqual

            /**
             * Compares this Long's value with the specified's.
             * @param {!Long|number|string} other Other value
             * @returns {number} 0 if they are the same, 1 if the this is greater and -1
             *  if the given one is greater
             */
            LongPrototype.compare = function compare(other) {
              if (!isLong(other)) other = fromValue(other)
              if (this.eq(other)) return 0
              var thisNeg = this.isNegative(),
                otherNeg = other.isNegative()
              if (thisNeg && !otherNeg) return -1
              if (!thisNeg && otherNeg) return 1
              // At this point the sign bits are the same
              if (!this.unsigned) return this.sub(other).isNegative() ? -1 : 1
              // Both are positive if at least one is unsigned
              return other.high >>> 0 > this.high >>> 0 ||
                (other.high === this.high && other.low >>> 0 > this.low >>> 0)
                ? -1
                : 1
            }

            /**
             * Compares this Long's value with the specified's. This is an alias of {@link Long#compare}.
             * @function
             * @param {!Long|number|string} other Other value
             * @returns {number} 0 if they are the same, 1 if the this is greater and -1
             *  if the given one is greater
             */
            LongPrototype.comp = LongPrototype.compare

            /**
             * Negates this Long's value.
             * @returns {!Long} Negated Long
             */
            LongPrototype.negate = function negate() {
              if (!this.unsigned && this.eq(MIN_VALUE)) return MIN_VALUE
              return this.not().add(ONE)
            }

            /**
             * Negates this Long's value. This is an alias of {@link Long#negate}.
             * @function
             * @returns {!Long} Negated Long
             */
            LongPrototype.neg = LongPrototype.negate

            /**
             * Returns the sum of this and the specified Long.
             * @param {!Long|number|string} addend Addend
             * @returns {!Long} Sum
             */
            LongPrototype.add = function add(addend) {
              if (!isLong(addend)) addend = fromValue(addend)

              // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

              var a48 = this.high >>> 16
              var a32 = this.high & 0xffff
              var a16 = this.low >>> 16
              var a00 = this.low & 0xffff

              var b48 = addend.high >>> 16
              var b32 = addend.high & 0xffff
              var b16 = addend.low >>> 16
              var b00 = addend.low & 0xffff

              var c48 = 0,
                c32 = 0,
                c16 = 0,
                c00 = 0
              c00 += a00 + b00
              c16 += c00 >>> 16
              c00 &= 0xffff
              c16 += a16 + b16
              c32 += c16 >>> 16
              c16 &= 0xffff
              c32 += a32 + b32
              c48 += c32 >>> 16
              c32 &= 0xffff
              c48 += a48 + b48
              c48 &= 0xffff
              return fromBits(
                (c16 << 16) | c00,
                (c48 << 16) | c32,
                this.unsigned
              )
            }

            /**
             * Returns the difference of this and the specified Long.
             * @param {!Long|number|string} subtrahend Subtrahend
             * @returns {!Long} Difference
             */
            LongPrototype.subtract = function subtract(subtrahend) {
              if (!isLong(subtrahend)) subtrahend = fromValue(subtrahend)
              return this.add(subtrahend.neg())
            }

            /**
             * Returns the difference of this and the specified Long. This is an alias of {@link Long#subtract}.
             * @function
             * @param {!Long|number|string} subtrahend Subtrahend
             * @returns {!Long} Difference
             */
            LongPrototype.sub = LongPrototype.subtract

            /**
             * Returns the product of this and the specified Long.
             * @param {!Long|number|string} multiplier Multiplier
             * @returns {!Long} Product
             */
            LongPrototype.multiply = function multiply(multiplier) {
              if (this.isZero()) return ZERO
              if (!isLong(multiplier)) multiplier = fromValue(multiplier)
              if (multiplier.isZero()) return ZERO
              if (this.eq(MIN_VALUE))
                return multiplier.isOdd() ? MIN_VALUE : ZERO
              if (multiplier.eq(MIN_VALUE))
                return this.isOdd() ? MIN_VALUE : ZERO

              if (this.isNegative()) {
                if (multiplier.isNegative())
                  return this.neg().mul(multiplier.neg())
                else return this.neg().mul(multiplier).neg()
              } else if (multiplier.isNegative())
                return this.mul(multiplier.neg()).neg()

              // If both longs are small, use float multiplication
              if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
                return fromNumber(
                  this.toNumber() * multiplier.toNumber(),
                  this.unsigned
                )

              // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
              // We can skip products that would overflow.

              var a48 = this.high >>> 16
              var a32 = this.high & 0xffff
              var a16 = this.low >>> 16
              var a00 = this.low & 0xffff

              var b48 = multiplier.high >>> 16
              var b32 = multiplier.high & 0xffff
              var b16 = multiplier.low >>> 16
              var b00 = multiplier.low & 0xffff

              var c48 = 0,
                c32 = 0,
                c16 = 0,
                c00 = 0
              c00 += a00 * b00
              c16 += c00 >>> 16
              c00 &= 0xffff
              c16 += a16 * b00
              c32 += c16 >>> 16
              c16 &= 0xffff
              c16 += a00 * b16
              c32 += c16 >>> 16
              c16 &= 0xffff
              c32 += a32 * b00
              c48 += c32 >>> 16
              c32 &= 0xffff
              c32 += a16 * b16
              c48 += c32 >>> 16
              c32 &= 0xffff
              c32 += a00 * b32
              c48 += c32 >>> 16
              c32 &= 0xffff
              c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48
              c48 &= 0xffff
              return fromBits(
                (c16 << 16) | c00,
                (c48 << 16) | c32,
                this.unsigned
              )
            }

            /**
             * Returns the product of this and the specified Long. This is an alias of {@link Long#multiply}.
             * @function
             * @param {!Long|number|string} multiplier Multiplier
             * @returns {!Long} Product
             */
            LongPrototype.mul = LongPrototype.multiply

            /**
             * Returns this Long divided by the specified. The result is signed if this Long is signed or
             *  unsigned if this Long is unsigned.
             * @param {!Long|number|string} divisor Divisor
             * @returns {!Long} Quotient
             */
            LongPrototype.divide = function divide(divisor) {
              if (!isLong(divisor)) divisor = fromValue(divisor)
              if (divisor.isZero()) throw Error('division by zero')
              if (this.isZero()) return this.unsigned ? UZERO : ZERO
              var approx, rem, res
              if (!this.unsigned) {
                // This section is only relevant for signed longs and is derived from the
                // closure library as a whole.
                if (this.eq(MIN_VALUE)) {
                  if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                    return MIN_VALUE // recall that -MIN_VALUE == MIN_VALUE
                  else if (divisor.eq(MIN_VALUE)) return ONE
                  else {
                    // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                    var halfThis = this.shr(1)
                    approx = halfThis.div(divisor).shl(1)
                    if (approx.eq(ZERO)) {
                      return divisor.isNegative() ? ONE : NEG_ONE
                    } else {
                      rem = this.sub(divisor.mul(approx))
                      res = approx.add(rem.div(divisor))
                      return res
                    }
                  }
                } else if (divisor.eq(MIN_VALUE))
                  return this.unsigned ? UZERO : ZERO
                if (this.isNegative()) {
                  if (divisor.isNegative()) return this.neg().div(divisor.neg())
                  return this.neg().div(divisor).neg()
                } else if (divisor.isNegative())
                  return this.div(divisor.neg()).neg()
                res = ZERO
              } else {
                // The algorithm below has not been made for unsigned longs. It's therefore
                // required to take special care of the MSB prior to running it.
                if (!divisor.unsigned) divisor = divisor.toUnsigned()
                if (divisor.gt(this)) return UZERO
                if (divisor.gt(this.shru(1)))
                  // 15 >>> 1 = 7 ; with divisor = 8 ; true
                  return UONE
                res = UZERO
              }

              // Repeat the following until the remainder is less than other:  find a
              // floating-point that approximates remainder / other *from below*, add this
              // into the result, and subtract it from the remainder.  It is critical that
              // the approximate value is less than or equal to the real value so that the
              // remainder never becomes negative.
              rem = this
              while (rem.gte(divisor)) {
                // Approximate the result of division. This may be a little greater or
                // smaller than the actual value.
                approx = Math.max(
                  1,
                  Math.floor(rem.toNumber() / divisor.toNumber())
                )

                // We will tweak the approximate result by changing it in the 48-th digit or
                // the smallest non-fractional digit, whichever is larger.
                var log2 = Math.ceil(Math.log(approx) / Math.LN2),
                  delta = log2 <= 48 ? 1 : pow_dbl(2, log2 - 48),
                  // Decrease the approximation until it is smaller than the remainder.  Note
                  // that if it is too large, the product overflows and is negative.
                  approxRes = fromNumber(approx),
                  approxRem = approxRes.mul(divisor)
                while (approxRem.isNegative() || approxRem.gt(rem)) {
                  approx -= delta
                  approxRes = fromNumber(approx, this.unsigned)
                  approxRem = approxRes.mul(divisor)
                }

                // We know the answer can't be zero... and actually, zero would cause
                // infinite recursion since we would make no progress.
                if (approxRes.isZero()) approxRes = ONE

                res = res.add(approxRes)
                rem = rem.sub(approxRem)
              }
              return res
            }

            /**
             * Returns this Long divided by the specified. This is an alias of {@link Long#divide}.
             * @function
             * @param {!Long|number|string} divisor Divisor
             * @returns {!Long} Quotient
             */
            LongPrototype.div = LongPrototype.divide

            /**
             * Returns this Long modulo the specified.
             * @param {!Long|number|string} divisor Divisor
             * @returns {!Long} Remainder
             */
            LongPrototype.modulo = function modulo(divisor) {
              if (!isLong(divisor)) divisor = fromValue(divisor)
              return this.sub(this.div(divisor).mul(divisor))
            }

            /**
             * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
             * @function
             * @param {!Long|number|string} divisor Divisor
             * @returns {!Long} Remainder
             */
            LongPrototype.mod = LongPrototype.modulo

            /**
             * Returns the bitwise NOT of this Long.
             * @returns {!Long}
             */
            LongPrototype.not = function not() {
              return fromBits(~this.low, ~this.high, this.unsigned)
            }

            /**
             * Returns the bitwise AND of this Long and the specified.
             * @param {!Long|number|string} other Other Long
             * @returns {!Long}
             */
            LongPrototype.and = function and(other) {
              if (!isLong(other)) other = fromValue(other)
              return fromBits(
                this.low & other.low,
                this.high & other.high,
                this.unsigned
              )
            }

            /**
             * Returns the bitwise OR of this Long and the specified.
             * @param {!Long|number|string} other Other Long
             * @returns {!Long}
             */
            LongPrototype.or = function or(other) {
              if (!isLong(other)) other = fromValue(other)
              return fromBits(
                this.low | other.low,
                this.high | other.high,
                this.unsigned
              )
            }

            /**
             * Returns the bitwise XOR of this Long and the given one.
             * @param {!Long|number|string} other Other Long
             * @returns {!Long}
             */
            LongPrototype.xor = function xor(other) {
              if (!isLong(other)) other = fromValue(other)
              return fromBits(
                this.low ^ other.low,
                this.high ^ other.high,
                this.unsigned
              )
            }

            /**
             * Returns this Long with bits shifted to the left by the given amount.
             * @param {number|!Long} numBits Number of bits
             * @returns {!Long} Shifted Long
             */
            LongPrototype.shiftLeft = function shiftLeft(numBits) {
              if (isLong(numBits)) numBits = numBits.toInt()
              if ((numBits &= 63) === 0) return this
              else if (numBits < 32)
                return fromBits(
                  this.low << numBits,
                  (this.high << numBits) | (this.low >>> (32 - numBits)),
                  this.unsigned
                )
              else return fromBits(0, this.low << (numBits - 32), this.unsigned)
            }

            /**
             * Returns this Long with bits shifted to the left by the given amount. This is an alias of {@link Long#shiftLeft}.
             * @function
             * @param {number|!Long} numBits Number of bits
             * @returns {!Long} Shifted Long
             */
            LongPrototype.shl = LongPrototype.shiftLeft

            /**
             * Returns this Long with bits arithmetically shifted to the right by the given amount.
             * @param {number|!Long} numBits Number of bits
             * @returns {!Long} Shifted Long
             */
            LongPrototype.shiftRight = function shiftRight(numBits) {
              if (isLong(numBits)) numBits = numBits.toInt()
              if ((numBits &= 63) === 0) return this
              else if (numBits < 32)
                return fromBits(
                  (this.low >>> numBits) | (this.high << (32 - numBits)),
                  this.high >> numBits,
                  this.unsigned
                )
              else
                return fromBits(
                  this.high >> (numBits - 32),
                  this.high >= 0 ? 0 : -1,
                  this.unsigned
                )
            }

            /**
             * Returns this Long with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Long#shiftRight}.
             * @function
             * @param {number|!Long} numBits Number of bits
             * @returns {!Long} Shifted Long
             */
            LongPrototype.shr = LongPrototype.shiftRight

            /**
             * Returns this Long with bits logically shifted to the right by the given amount.
             * @param {number|!Long} numBits Number of bits
             * @returns {!Long} Shifted Long
             */
            LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(
              numBits
            ) {
              if (isLong(numBits)) numBits = numBits.toInt()
              numBits &= 63
              if (numBits === 0) return this
              else {
                var high = this.high
                if (numBits < 32) {
                  var low = this.low
                  return fromBits(
                    (low >>> numBits) | (high << (32 - numBits)),
                    high >>> numBits,
                    this.unsigned
                  )
                } else if (numBits === 32)
                  return fromBits(high, 0, this.unsigned)
                else return fromBits(high >>> (numBits - 32), 0, this.unsigned)
              }
            }

            /**
             * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
             * @function
             * @param {number|!Long} numBits Number of bits
             * @returns {!Long} Shifted Long
             */
            LongPrototype.shru = LongPrototype.shiftRightUnsigned

            /**
             * Converts this Long to signed.
             * @returns {!Long} Signed long
             */
            LongPrototype.toSigned = function toSigned() {
              if (!this.unsigned) return this
              return fromBits(this.low, this.high, false)
            }

            /**
             * Converts this Long to unsigned.
             * @returns {!Long} Unsigned long
             */
            LongPrototype.toUnsigned = function toUnsigned() {
              if (this.unsigned) return this
              return fromBits(this.low, this.high, true)
            }

            /**
             * Converts this Long to its byte representation.
             * @param {boolean=} le Whether little or big endian, defaults to big endian
             * @returns {!Array.<number>} Byte representation
             */
            LongPrototype.toBytes = function (le) {
              return le ? this.toBytesLE() : this.toBytesBE()
            }

            /**
             * Converts this Long to its little endian byte representation.
             * @returns {!Array.<number>} Little endian byte representation
             */
            LongPrototype.toBytesLE = function () {
              var hi = this.high,
                lo = this.low
              return [
                lo & 0xff,
                (lo >>> 8) & 0xff,
                (lo >>> 16) & 0xff,
                (lo >>> 24) & 0xff,
                hi & 0xff,
                (hi >>> 8) & 0xff,
                (hi >>> 16) & 0xff,
                (hi >>> 24) & 0xff
              ]
            }

            /**
             * Converts this Long to its big endian byte representation.
             * @returns {!Array.<number>} Big endian byte representation
             */
            LongPrototype.toBytesBE = function () {
              var hi = this.high,
                lo = this.low
              return [
                (hi >>> 24) & 0xff,
                (hi >>> 16) & 0xff,
                (hi >>> 8) & 0xff,
                hi & 0xff,
                (lo >>> 24) & 0xff,
                (lo >>> 16) & 0xff,
                (lo >>> 8) & 0xff,
                lo & 0xff
              ]
            }

            return Long
          })
        },
        {}
      ],
      18: [
        function (require, module, exports) {
          'use strict'

          var json = typeof JSON !== 'undefined' ? JSON : require('jsonify')

          var isArray =
            Array.isArray ||
            function (x) {
              return {}.toString.call(x) === '[object Array]'
            }

          var objectKeys =
            Object.keys ||
            function (obj) {
              var has =
                Object.prototype.hasOwnProperty ||
                function () {
                  return true
                }
              var keys = []
              for (var key in obj) {
                if (has.call(obj, key)) {
                  keys.push(key)
                }
              }
              return keys
            }

          module.exports = function (obj, opts) {
            if (!opts) {
              opts = {}
            }
            if (typeof opts === 'function') {
              opts = {cmp: opts}
            }
            var space = opts.space || ''
            if (typeof space === 'number') {
              space = Array(space + 1).join(' ')
            }
            var cycles = typeof opts.cycles === 'boolean' ? opts.cycles : false
            var replacer =
              opts.replacer ||
              function (key, value) {
                return value
              }

            var cmp =
              opts.cmp &&
              (function (f) {
                return function (node) {
                  return function (a, b) {
                    var aobj = {key: a, value: node[a]}
                    var bobj = {key: b, value: node[b]}
                    return f(aobj, bobj)
                  }
                }
              })(opts.cmp)

            var seen = []
            return (function stringify(parent, key, node, level) {
              var indent = space ? '\n' + new Array(level + 1).join(space) : ''
              var colonSeparator = space ? ': ' : ':'

              if (node && node.toJSON && typeof node.toJSON === 'function') {
                node = node.toJSON()
              }

              node = replacer.call(parent, key, node)

              if (node === undefined) {
                return
              }
              if (typeof node !== 'object' || node === null) {
                return json.stringify(node)
              }
              if (isArray(node)) {
                var out = []
                for (var i = 0; i < node.length; i++) {
                  var item =
                    stringify(node, i, node[i], level + 1) ||
                    json.stringify(null)
                  out.push(indent + space + item)
                }
                return '[' + out.join(',') + indent + ']'
              }

              if (seen.indexOf(node) !== -1) {
                if (cycles) {
                  return json.stringify('__cycle__')
                }
                throw new TypeError('Converting circular structure to JSON')
              } else {
                seen.push(node)
              }

              var keys = objectKeys(node).sort(cmp && cmp(node))
              var out = []
              for (var i = 0; i < keys.length; i++) {
                var key = keys[i]
                var value = stringify(node, key, node[key], level + 1)

                if (!value) {
                  continue
                }

                var keyValue = json.stringify(key) + colonSeparator + value

                out.push(indent + space + keyValue)
              }
              seen.splice(seen.indexOf(node), 1)
              return '{' + out.join(',') + indent + '}'
            })({'': obj}, '', obj, 0)
          }
        },
        {jsonify: 19}
      ],
      19: [
        function (require, module, exports) {
          'use strict'

          exports.parse = require('./lib/parse')
          exports.stringify = require('./lib/stringify')
        },
        {'./lib/parse': 20, './lib/stringify': 21}
      ],
      20: [
        function (require, module, exports) {
          'use strict'

          var at // The index of the current character
          var ch // The current character
          var escapee = {
            '"': '"',
            '\\': '\\',
            '/': '/',
            b: '\b',
            f: '\f',
            n: '\n',
            r: '\r',
            t: '\t'
          }
          var text

          // Call error when something is wrong.
          function error(m) {
            throw {
              name: 'SyntaxError',
              message: m,
              at: at,
              text: text
            }
          }

          function next(c) {
            // If a c parameter is provided, verify that it matches the current character.
            if (c && c !== ch) {
              error("Expected '" + c + "' instead of '" + ch + "'")
            }

            // Get the next character. When there are no more characters, return the empty string.

            ch = text.charAt(at)
            at += 1
            return ch
          }

          function number() {
            // Parse a number value.
            var num
            var str = ''

            if (ch === '-') {
              str = '-'
              next('-')
            }
            while (ch >= '0' && ch <= '9') {
              str += ch
              next()
            }
            if (ch === '.') {
              str += '.'
              while (next() && ch >= '0' && ch <= '9') {
                str += ch
              }
            }
            if (ch === 'e' || ch === 'E') {
              str += ch
              next()
              if (ch === '-' || ch === '+') {
                str += ch
                next()
              }
              while (ch >= '0' && ch <= '9') {
                str += ch
                next()
              }
            }
            num = Number(str)
            if (!isFinite(num)) {
              error('Bad number')
            }
            return num
          }

          function string() {
            // Parse a string value.
            var hex
            var i
            var str = ''
            var uffff

            // When parsing for string values, we must look for " and \ characters.
            if (ch === '"') {
              while (next()) {
                if (ch === '"') {
                  next()
                  return str
                } else if (ch === '\\') {
                  next()
                  if (ch === 'u') {
                    uffff = 0
                    for (i = 0; i < 4; i += 1) {
                      hex = parseInt(next(), 16)
                      if (!isFinite(hex)) {
                        break
                      }
                      uffff = uffff * 16 + hex
                    }
                    str += String.fromCharCode(uffff)
                  } else if (typeof escapee[ch] === 'string') {
                    str += escapee[ch]
                  } else {
                    break
                  }
                } else {
                  str += ch
                }
              }
            }
            error('Bad string')
          }

          // Skip whitespace.
          function white() {
            while (ch && ch <= ' ') {
              next()
            }
          }

          // true, false, or null.
          function word() {
            switch (ch) {
              case 't':
                next('t')
                next('r')
                next('u')
                next('e')
                return true
              case 'f':
                next('f')
                next('a')
                next('l')
                next('s')
                next('e')
                return false
              case 'n':
                next('n')
                next('u')
                next('l')
                next('l')
                return null
              default:
                error("Unexpected '" + ch + "'")
            }
          }

          // Parse an array value.
          function array() {
            var arr = []

            if (ch === '[') {
              next('[')
              white()
              if (ch === ']') {
                next(']')
                return arr // empty array
              }
              while (ch) {
                arr.push(value()) // eslint-disable-line no-use-before-define
                white()
                if (ch === ']') {
                  next(']')
                  return arr
                }
                next(',')
                white()
              }
            }
            error('Bad array')
          }

          // Parse an object value.
          function object() {
            var key
            var obj = {}

            if (ch === '{') {
              next('{')
              white()
              if (ch === '}') {
                next('}')
                return obj // empty object
              }
              while (ch) {
                key = string()
                white()
                next(':')
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  error('Duplicate key "' + key + '"')
                }
                obj[key] = value() // eslint-disable-line no-use-before-define
                white()
                if (ch === '}') {
                  next('}')
                  return obj
                }
                next(',')
                white()
              }
            }
            error('Bad object')
          }

          // Parse a JSON value. It could be an object, an array, a string, a number, or a word.
          function value() {
            white()
            switch (ch) {
              case '{':
                return object()
              case '[':
                return array()
              case '"':
                return string()
              case '-':
                return number()
              default:
                return ch >= '0' && ch <= '9' ? number() : word()
            }
          }

          // Return the json_parse function. It will have access to all of the above functions and variables.
          module.exports = function (source, reviver) {
            var result

            text = source
            at = 0
            ch = ' '
            result = value()
            white()
            if (ch) {
              error('Syntax error')
            }

            // If there is a reviver function, we recursively walk the new structure,
            // passing each name/value pair to the reviver function for possible
            // transformation, starting with a temporary root object that holds the result
            // in an empty key. If there is not a reviver function, we simply return the
            // result.

            return typeof reviver === 'function'
              ? (function walk(holder, key) {
                  var k
                  var v
                  var val = holder[key]
                  if (val && typeof val === 'object') {
                    for (k in value) {
                      if (Object.prototype.hasOwnProperty.call(val, k)) {
                        v = walk(val, k)
                        if (typeof v === 'undefined') {
                          delete val[k]
                        } else {
                          val[k] = v
                        }
                      }
                    }
                  }
                  return reviver.call(holder, key, val)
                })({'': result}, '')
              : result
          }
        },
        {}
      ],
      21: [
        function (require, module, exports) {
          'use strict'

          var escapable =
            /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g
          var gap
          var indent
          var meta = {
            // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
          }
          var rep

          function quote(string) {
            // If the string contains no control characters, no quote characters, and no
            // backslash characters, then we can safely slap some quotes around it.
            // Otherwise we must also replace the offending characters with safe escape sequences.

            escapable.lastIndex = 0
            return escapable.test(string)
              ? '"' +
                  string.replace(escapable, function (a) {
                    var c = meta[a]
                    return typeof c === 'string'
                      ? c
                      : '\\u' +
                          ('0000' + a.charCodeAt(0).toString(16)).slice(-4)
                  }) +
                  '"'
              : '"' + string + '"'
          }

          function str(key, holder) {
            // Produce a string from holder[key].
            var i // The loop counter.
            var k // The member key.
            var v // The member value.
            var length
            var mind = gap
            var partial
            var value = holder[key]

            // If the value has a toJSON method, call it to obtain a replacement value.
            if (
              value &&
              typeof value === 'object' &&
              typeof value.toJSON === 'function'
            ) {
              value = value.toJSON(key)
            }

            // If we were called with a replacer function, then call the replacer to obtain a replacement value.
            if (typeof rep === 'function') {
              value = rep.call(holder, key, value)
            }

            // What happens next depends on the value's type.
            switch (typeof value) {
              case 'string':
                return quote(value)

              case 'number':
                // JSON numbers must be finite. Encode non-finite numbers as null.
                return isFinite(value) ? String(value) : 'null'

              case 'boolean':
              case 'null':
                // If the value is a boolean or null, convert it to a string. Note:
                // typeof null does not produce 'null'. The case is included here in
                // the remote chance that this gets fixed someday.
                return String(value)

              case 'object':
                if (!value) {
                  return 'null'
                }
                gap += indent
                partial = []

                // Array.isArray
                if (
                  Object.prototype.toString.apply(value) === '[object Array]'
                ) {
                  length = value.length
                  for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null'
                  }

                  // Join all of the elements together, separated with commas, and wrap them in brackets.
                  v =
                    partial.length === 0
                      ? '[]'
                      : gap
                      ? '[\n' +
                        gap +
                        partial.join(',\n' + gap) +
                        '\n' +
                        mind +
                        ']'
                      : '[' + partial.join(',') + ']'
                  gap = mind
                  return v
                }

                // If the replacer is an array, use it to select the members to be stringified.
                if (rep && typeof rep === 'object') {
                  length = rep.length
                  for (i = 0; i < length; i += 1) {
                    k = rep[i]
                    if (typeof k === 'string') {
                      v = str(k, value)
                      if (v) {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v)
                      }
                    }
                  }
                } else {
                  // Otherwise, iterate through all of the keys in the object.
                  for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value)
                      if (v) {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v)
                      }
                    }
                  }
                }

                // Join all of the member texts together, separated with commas, and wrap them in braces.

                v =
                  partial.length === 0
                    ? '{}'
                    : gap
                    ? '{\n' +
                      gap +
                      partial.join(',\n' + gap) +
                      '\n' +
                      mind +
                      '}'
                    : '{' + partial.join(',') + '}'
                gap = mind
                return v
              default:
            }
          }

          module.exports = function (value, replacer, space) {
            var i
            gap = ''
            indent = ''

            // If the space parameter is a number, make an indent string containing that many spaces.
            if (typeof space === 'number') {
              for (i = 0; i < space; i += 1) {
                indent += ' '
              }
            } else if (typeof space === 'string') {
              // If the space parameter is a string, it will be used as the indent string.
              indent = space
            }

            // If there is a replacer, it must be a function or an array. Otherwise, throw an error.
            rep = replacer
            if (
              replacer &&
              typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')
            ) {
              throw new Error('JSON.stringify')
            }

            // Make a fake root object containing our value under the key of ''.
            // Return the result of stringifying the value.
            return str('', {'': value})
          }
        },
        {}
      ],
      22: [
        function (require, module, exports) {
          module.exports = Long

          /**
           * wasm optimizations, to do native i64 multiplication and divide
           */
          var wasm = null

          try {
            wasm = new WebAssembly.Instance(
              new WebAssembly.Module(
                new Uint8Array([
                  0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 2, 96, 0, 1, 127, 96, 4,
                  127, 127, 127, 127, 1, 127, 3, 7, 6, 0, 1, 1, 1, 1, 1, 6, 6,
                  1, 127, 1, 65, 0, 11, 7, 50, 6, 3, 109, 117, 108, 0, 1, 5,
                  100, 105, 118, 95, 115, 0, 2, 5, 100, 105, 118, 95, 117, 0, 3,
                  5, 114, 101, 109, 95, 115, 0, 4, 5, 114, 101, 109, 95, 117, 0,
                  5, 8, 103, 101, 116, 95, 104, 105, 103, 104, 0, 0, 10, 191, 1,
                  6, 4, 0, 35, 0, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66,
                  32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 126,
                  34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126,
                  32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3,
                  173, 66, 32, 134, 132, 127, 34, 4, 66, 32, 135, 167, 36, 0,
                  32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32,
                  134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 128, 34,
                  4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32,
                  0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173,
                  66, 32, 134, 132, 129, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4,
                  167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134,
                  132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 130, 34, 4, 66,
                  32, 135, 167, 36, 0, 32, 4, 167, 11
                ])
              ),
              {}
            ).exports
          } catch (e) {
            // no wasm support :(
          }

          /**
           * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
           *  See the from* functions below for more convenient ways of constructing Longs.
           * @exports Long
           * @class A Long class for representing a 64 bit two's-complement integer value.
           * @param {number} low The low (signed) 32 bits of the long
           * @param {number} high The high (signed) 32 bits of the long
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @constructor
           */
          function Long(low, high, unsigned) {
            /**
             * The low 32 bits as a signed value.
             * @type {number}
             */
            this.low = low | 0

            /**
             * The high 32 bits as a signed value.
             * @type {number}
             */
            this.high = high | 0

            /**
             * Whether unsigned or not.
             * @type {boolean}
             */
            this.unsigned = !!unsigned
          }

          // The internal representation of a long is the two given signed, 32-bit values.
          // We use 32-bit pieces because these are the size of integers on which
          // Javascript performs bit-operations.  For operations like addition and
          // multiplication, we split each number into 16 bit pieces, which can easily be
          // multiplied within Javascript's floating-point representation without overflow
          // or change in sign.
          //
          // In the algorithms below, we frequently reduce the negative case to the
          // positive case by negating the input(s) and then post-processing the result.
          // Note that we must ALWAYS check specially whether those values are MIN_VALUE
          // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
          // a positive number, it overflows back into a negative).  Not handling this
          // case would often result in infinite recursion.
          //
          // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
          // methods on which they depend.

          /**
           * An indicator used to reliably determine if an object is a Long or not.
           * @type {boolean}
           * @const
           * @private
           */
          Long.prototype.__isLong__

          Object.defineProperty(Long.prototype, '__isLong__', {value: true})

          /**
           * @function
           * @param {*} obj Object
           * @returns {boolean}
           * @inner
           */
          function isLong(obj) {
            return (obj && obj['__isLong__']) === true
          }

          /**
           * Tests if the specified object is a Long.
           * @function
           * @param {*} obj Object
           * @returns {boolean}
           */
          Long.isLong = isLong

          /**
           * A cache of the Long representations of small integer values.
           * @type {!Object}
           * @inner
           */
          var INT_CACHE = {}

          /**
           * A cache of the Long representations of small unsigned integer values.
           * @type {!Object}
           * @inner
           */
          var UINT_CACHE = {}

          /**
           * @param {number} value
           * @param {boolean=} unsigned
           * @returns {!Long}
           * @inner
           */
          function fromInt(value, unsigned) {
            var obj, cachedObj, cache
            if (unsigned) {
              value >>>= 0
              if ((cache = 0 <= value && value < 256)) {
                cachedObj = UINT_CACHE[value]
                if (cachedObj) return cachedObj
              }
              obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true)
              if (cache) UINT_CACHE[value] = obj
              return obj
            } else {
              value |= 0
              if ((cache = -128 <= value && value < 128)) {
                cachedObj = INT_CACHE[value]
                if (cachedObj) return cachedObj
              }
              obj = fromBits(value, value < 0 ? -1 : 0, false)
              if (cache) INT_CACHE[value] = obj
              return obj
            }
          }

          /**
           * Returns a Long representing the given 32 bit integer value.
           * @function
           * @param {number} value The 32 bit integer in question
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @returns {!Long} The corresponding Long value
           */
          Long.fromInt = fromInt

          /**
           * @param {number} value
           * @param {boolean=} unsigned
           * @returns {!Long}
           * @inner
           */
          function fromNumber(value, unsigned) {
            if (isNaN(value)) return unsigned ? UZERO : ZERO
            if (unsigned) {
              if (value < 0) return UZERO
              if (value >= TWO_PWR_64_DBL) return MAX_UNSIGNED_VALUE
            } else {
              if (value <= -TWO_PWR_63_DBL) return MIN_VALUE
              if (value + 1 >= TWO_PWR_63_DBL) return MAX_VALUE
            }
            if (value < 0) return fromNumber(-value, unsigned).neg()
            return fromBits(
              value % TWO_PWR_32_DBL | 0,
              (value / TWO_PWR_32_DBL) | 0,
              unsigned
            )
          }

          /**
           * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
           * @function
           * @param {number} value The number in question
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @returns {!Long} The corresponding Long value
           */
          Long.fromNumber = fromNumber

          /**
           * @param {number} lowBits
           * @param {number} highBits
           * @param {boolean=} unsigned
           * @returns {!Long}
           * @inner
           */
          function fromBits(lowBits, highBits, unsigned) {
            return new Long(lowBits, highBits, unsigned)
          }

          /**
           * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
           *  assumed to use 32 bits.
           * @function
           * @param {number} lowBits The low 32 bits
           * @param {number} highBits The high 32 bits
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @returns {!Long} The corresponding Long value
           */
          Long.fromBits = fromBits

          /**
           * @function
           * @param {number} base
           * @param {number} exponent
           * @returns {number}
           * @inner
           */
          var pow_dbl = Math.pow // Used 4 times (4*8 to 15+4)

          /**
           * @param {string} str
           * @param {(boolean|number)=} unsigned
           * @param {number=} radix
           * @returns {!Long}
           * @inner
           */
          function fromString(str, unsigned, radix) {
            if (str.length === 0) throw Error('empty string')
            if (
              str === 'NaN' ||
              str === 'Infinity' ||
              str === '+Infinity' ||
              str === '-Infinity'
            )
              return ZERO
            if (typeof unsigned === 'number') {
              // For goog.math.long compatibility
              ;(radix = unsigned), (unsigned = false)
            } else {
              unsigned = !!unsigned
            }
            radix = radix || 10
            if (radix < 2 || 36 < radix) throw RangeError('radix')

            var p
            if ((p = str.indexOf('-')) > 0) throw Error('interior hyphen')
            else if (p === 0) {
              return fromString(str.substring(1), unsigned, radix).neg()
            }

            // Do several (8) digits each time through the loop, so as to
            // minimize the calls to the very expensive emulated div.
            var radixToPower = fromNumber(pow_dbl(radix, 8))

            var result = ZERO
            for (var i = 0; i < str.length; i += 8) {
              var size = Math.min(8, str.length - i),
                value = parseInt(str.substring(i, i + size), radix)
              if (size < 8) {
                var power = fromNumber(pow_dbl(radix, size))
                result = result.mul(power).add(fromNumber(value))
              } else {
                result = result.mul(radixToPower)
                result = result.add(fromNumber(value))
              }
            }
            result.unsigned = unsigned
            return result
          }

          /**
           * Returns a Long representation of the given string, written using the specified radix.
           * @function
           * @param {string} str The textual representation of the Long
           * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to signed
           * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
           * @returns {!Long} The corresponding Long value
           */
          Long.fromString = fromString

          /**
           * @function
           * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val
           * @param {boolean=} unsigned
           * @returns {!Long}
           * @inner
           */
          function fromValue(val, unsigned) {
            if (typeof val === 'number') return fromNumber(val, unsigned)
            if (typeof val === 'string') return fromString(val, unsigned)
            // Throws for non-objects, converts non-instanceof Long:
            return fromBits(
              val.low,
              val.high,
              typeof unsigned === 'boolean' ? unsigned : val.unsigned
            )
          }

          /**
           * Converts the specified value to a Long using the appropriate from* function for its type.
           * @function
           * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @returns {!Long}
           */
          Long.fromValue = fromValue

          // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
          // no runtime penalty for these.

          /**
           * @type {number}
           * @const
           * @inner
           */
          var TWO_PWR_16_DBL = 1 << 16

          /**
           * @type {number}
           * @const
           * @inner
           */
          var TWO_PWR_24_DBL = 1 << 24

          /**
           * @type {number}
           * @const
           * @inner
           */
          var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL

          /**
           * @type {number}
           * @const
           * @inner
           */
          var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL

          /**
           * @type {number}
           * @const
           * @inner
           */
          var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2

          /**
           * @type {!Long}
           * @const
           * @inner
           */
          var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL)

          /**
           * @type {!Long}
           * @inner
           */
          var ZERO = fromInt(0)

          /**
           * Signed zero.
           * @type {!Long}
           */
          Long.ZERO = ZERO

          /**
           * @type {!Long}
           * @inner
           */
          var UZERO = fromInt(0, true)

          /**
           * Unsigned zero.
           * @type {!Long}
           */
          Long.UZERO = UZERO

          /**
           * @type {!Long}
           * @inner
           */
          var ONE = fromInt(1)

          /**
           * Signed one.
           * @type {!Long}
           */
          Long.ONE = ONE

          /**
           * @type {!Long}
           * @inner
           */
          var UONE = fromInt(1, true)

          /**
           * Unsigned one.
           * @type {!Long}
           */
          Long.UONE = UONE

          /**
           * @type {!Long}
           * @inner
           */
          var NEG_ONE = fromInt(-1)

          /**
           * Signed negative one.
           * @type {!Long}
           */
          Long.NEG_ONE = NEG_ONE

          /**
           * @type {!Long}
           * @inner
           */
          var MAX_VALUE = fromBits(0xffffffff | 0, 0x7fffffff | 0, false)

          /**
           * Maximum signed value.
           * @type {!Long}
           */
          Long.MAX_VALUE = MAX_VALUE

          /**
           * @type {!Long}
           * @inner
           */
          var MAX_UNSIGNED_VALUE = fromBits(
            0xffffffff | 0,
            0xffffffff | 0,
            true
          )

          /**
           * Maximum unsigned value.
           * @type {!Long}
           */
          Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE

          /**
           * @type {!Long}
           * @inner
           */
          var MIN_VALUE = fromBits(0, 0x80000000 | 0, false)

          /**
           * Minimum signed value.
           * @type {!Long}
           */
          Long.MIN_VALUE = MIN_VALUE

          /**
           * @alias Long.prototype
           * @inner
           */
          var LongPrototype = Long.prototype

          /**
           * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
           * @returns {number}
           */
          LongPrototype.toInt = function toInt() {
            return this.unsigned ? this.low >>> 0 : this.low
          }

          /**
           * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
           * @returns {number}
           */
          LongPrototype.toNumber = function toNumber() {
            if (this.unsigned)
              return (this.high >>> 0) * TWO_PWR_32_DBL + (this.low >>> 0)
            return this.high * TWO_PWR_32_DBL + (this.low >>> 0)
          }

          /**
           * Converts the Long to a string written in the specified radix.
           * @param {number=} radix Radix (2-36), defaults to 10
           * @returns {string}
           * @override
           * @throws {RangeError} If `radix` is out of range
           */
          LongPrototype.toString = function toString(radix) {
            radix = radix || 10
            if (radix < 2 || 36 < radix) throw RangeError('radix')
            if (this.isZero()) return '0'
            if (this.isNegative()) {
              // Unsigned Longs are never negative
              if (this.eq(MIN_VALUE)) {
                // We need to change the Long value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixLong = fromNumber(radix),
                  div = this.div(radixLong),
                  rem1 = div.mul(radixLong).sub(this)
                return div.toString(radix) + rem1.toInt().toString(radix)
              } else return '-' + this.neg().toString(radix)
            }

            // Do several (6) digits each time through the loop, so as to
            // minimize the calls to the very expensive emulated div.
            var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
              rem = this
            var result = ''
            while (true) {
              var remDiv = rem.div(radixToPower),
                intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
                digits = intval.toString(radix)
              rem = remDiv
              if (rem.isZero()) return digits + result
              else {
                while (digits.length < 6) digits = '0' + digits
                result = '' + digits + result
              }
            }
          }

          /**
           * Gets the high 32 bits as a signed integer.
           * @returns {number} Signed high bits
           */
          LongPrototype.getHighBits = function getHighBits() {
            return this.high
          }

          /**
           * Gets the high 32 bits as an unsigned integer.
           * @returns {number} Unsigned high bits
           */
          LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
            return this.high >>> 0
          }

          /**
           * Gets the low 32 bits as a signed integer.
           * @returns {number} Signed low bits
           */
          LongPrototype.getLowBits = function getLowBits() {
            return this.low
          }

          /**
           * Gets the low 32 bits as an unsigned integer.
           * @returns {number} Unsigned low bits
           */
          LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
            return this.low >>> 0
          }

          /**
           * Gets the number of bits needed to represent the absolute value of this Long.
           * @returns {number}
           */
          LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
            if (this.isNegative())
              // Unsigned Longs are never negative
              return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs()
            var val = this.high != 0 ? this.high : this.low
            for (var bit = 31; bit > 0; bit--)
              if ((val & (1 << bit)) != 0) break
            return this.high != 0 ? bit + 33 : bit + 1
          }

          /**
           * Tests if this Long's value equals zero.
           * @returns {boolean}
           */
          LongPrototype.isZero = function isZero() {
            return this.high === 0 && this.low === 0
          }

          /**
           * Tests if this Long's value equals zero. This is an alias of {@link Long#isZero}.
           * @returns {boolean}
           */
          LongPrototype.eqz = LongPrototype.isZero

          /**
           * Tests if this Long's value is negative.
           * @returns {boolean}
           */
          LongPrototype.isNegative = function isNegative() {
            return !this.unsigned && this.high < 0
          }

          /**
           * Tests if this Long's value is positive.
           * @returns {boolean}
           */
          LongPrototype.isPositive = function isPositive() {
            return this.unsigned || this.high >= 0
          }

          /**
           * Tests if this Long's value is odd.
           * @returns {boolean}
           */
          LongPrototype.isOdd = function isOdd() {
            return (this.low & 1) === 1
          }

          /**
           * Tests if this Long's value is even.
           * @returns {boolean}
           */
          LongPrototype.isEven = function isEven() {
            return (this.low & 1) === 0
          }

          /**
           * Tests if this Long's value equals the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.equals = function equals(other) {
            if (!isLong(other)) other = fromValue(other)
            if (
              this.unsigned !== other.unsigned &&
              this.high >>> 31 === 1 &&
              other.high >>> 31 === 1
            )
              return false
            return this.high === other.high && this.low === other.low
          }

          /**
           * Tests if this Long's value equals the specified's. This is an alias of {@link Long#equals}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.eq = LongPrototype.equals

          /**
           * Tests if this Long's value differs from the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.notEquals = function notEquals(other) {
            return !this.eq(/* validates */ other)
          }

          /**
           * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.neq = LongPrototype.notEquals

          /**
           * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.ne = LongPrototype.notEquals

          /**
           * Tests if this Long's value is less than the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.lessThan = function lessThan(other) {
            return this.comp(/* validates */ other) < 0
          }

          /**
           * Tests if this Long's value is less than the specified's. This is an alias of {@link Long#lessThan}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.lt = LongPrototype.lessThan

          /**
           * Tests if this Long's value is less than or equal the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
            return this.comp(/* validates */ other) <= 0
          }

          /**
           * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.lte = LongPrototype.lessThanOrEqual

          /**
           * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.le = LongPrototype.lessThanOrEqual

          /**
           * Tests if this Long's value is greater than the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.greaterThan = function greaterThan(other) {
            return this.comp(/* validates */ other) > 0
          }

          /**
           * Tests if this Long's value is greater than the specified's. This is an alias of {@link Long#greaterThan}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.gt = LongPrototype.greaterThan

          /**
           * Tests if this Long's value is greater than or equal the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(
            other
          ) {
            return this.comp(/* validates */ other) >= 0
          }

          /**
           * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.gte = LongPrototype.greaterThanOrEqual

          /**
           * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {boolean}
           */
          LongPrototype.ge = LongPrototype.greaterThanOrEqual

          /**
           * Compares this Long's value with the specified's.
           * @param {!Long|number|string} other Other value
           * @returns {number} 0 if they are the same, 1 if the this is greater and -1
           *  if the given one is greater
           */
          LongPrototype.compare = function compare(other) {
            if (!isLong(other)) other = fromValue(other)
            if (this.eq(other)) return 0
            var thisNeg = this.isNegative(),
              otherNeg = other.isNegative()
            if (thisNeg && !otherNeg) return -1
            if (!thisNeg && otherNeg) return 1
            // At this point the sign bits are the same
            if (!this.unsigned) return this.sub(other).isNegative() ? -1 : 1
            // Both are positive if at least one is unsigned
            return other.high >>> 0 > this.high >>> 0 ||
              (other.high === this.high && other.low >>> 0 > this.low >>> 0)
              ? -1
              : 1
          }

          /**
           * Compares this Long's value with the specified's. This is an alias of {@link Long#compare}.
           * @function
           * @param {!Long|number|string} other Other value
           * @returns {number} 0 if they are the same, 1 if the this is greater and -1
           *  if the given one is greater
           */
          LongPrototype.comp = LongPrototype.compare

          /**
           * Negates this Long's value.
           * @returns {!Long} Negated Long
           */
          LongPrototype.negate = function negate() {
            if (!this.unsigned && this.eq(MIN_VALUE)) return MIN_VALUE
            return this.not().add(ONE)
          }

          /**
           * Negates this Long's value. This is an alias of {@link Long#negate}.
           * @function
           * @returns {!Long} Negated Long
           */
          LongPrototype.neg = LongPrototype.negate

          /**
           * Returns the sum of this and the specified Long.
           * @param {!Long|number|string} addend Addend
           * @returns {!Long} Sum
           */
          LongPrototype.add = function add(addend) {
            if (!isLong(addend)) addend = fromValue(addend)

            // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

            var a48 = this.high >>> 16
            var a32 = this.high & 0xffff
            var a16 = this.low >>> 16
            var a00 = this.low & 0xffff

            var b48 = addend.high >>> 16
            var b32 = addend.high & 0xffff
            var b16 = addend.low >>> 16
            var b00 = addend.low & 0xffff

            var c48 = 0,
              c32 = 0,
              c16 = 0,
              c00 = 0
            c00 += a00 + b00
            c16 += c00 >>> 16
            c00 &= 0xffff
            c16 += a16 + b16
            c32 += c16 >>> 16
            c16 &= 0xffff
            c32 += a32 + b32
            c48 += c32 >>> 16
            c32 &= 0xffff
            c48 += a48 + b48
            c48 &= 0xffff
            return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned)
          }

          /**
           * Returns the difference of this and the specified Long.
           * @param {!Long|number|string} subtrahend Subtrahend
           * @returns {!Long} Difference
           */
          LongPrototype.subtract = function subtract(subtrahend) {
            if (!isLong(subtrahend)) subtrahend = fromValue(subtrahend)
            return this.add(subtrahend.neg())
          }

          /**
           * Returns the difference of this and the specified Long. This is an alias of {@link Long#subtract}.
           * @function
           * @param {!Long|number|string} subtrahend Subtrahend
           * @returns {!Long} Difference
           */
          LongPrototype.sub = LongPrototype.subtract

          /**
           * Returns the product of this and the specified Long.
           * @param {!Long|number|string} multiplier Multiplier
           * @returns {!Long} Product
           */
          LongPrototype.multiply = function multiply(multiplier) {
            if (this.isZero()) return ZERO
            if (!isLong(multiplier)) multiplier = fromValue(multiplier)

            // use wasm support if present
            if (wasm) {
              var low = wasm.mul(
                this.low,
                this.high,
                multiplier.low,
                multiplier.high
              )
              return fromBits(low, wasm.get_high(), this.unsigned)
            }

            if (multiplier.isZero()) return ZERO
            if (this.eq(MIN_VALUE)) return multiplier.isOdd() ? MIN_VALUE : ZERO
            if (multiplier.eq(MIN_VALUE)) return this.isOdd() ? MIN_VALUE : ZERO

            if (this.isNegative()) {
              if (multiplier.isNegative())
                return this.neg().mul(multiplier.neg())
              else return this.neg().mul(multiplier).neg()
            } else if (multiplier.isNegative())
              return this.mul(multiplier.neg()).neg()

            // If both longs are small, use float multiplication
            if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
              return fromNumber(
                this.toNumber() * multiplier.toNumber(),
                this.unsigned
              )

            // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
            // We can skip products that would overflow.

            var a48 = this.high >>> 16
            var a32 = this.high & 0xffff
            var a16 = this.low >>> 16
            var a00 = this.low & 0xffff

            var b48 = multiplier.high >>> 16
            var b32 = multiplier.high & 0xffff
            var b16 = multiplier.low >>> 16
            var b00 = multiplier.low & 0xffff

            var c48 = 0,
              c32 = 0,
              c16 = 0,
              c00 = 0
            c00 += a00 * b00
            c16 += c00 >>> 16
            c00 &= 0xffff
            c16 += a16 * b00
            c32 += c16 >>> 16
            c16 &= 0xffff
            c16 += a00 * b16
            c32 += c16 >>> 16
            c16 &= 0xffff
            c32 += a32 * b00
            c48 += c32 >>> 16
            c32 &= 0xffff
            c32 += a16 * b16
            c48 += c32 >>> 16
            c32 &= 0xffff
            c32 += a00 * b32
            c48 += c32 >>> 16
            c32 &= 0xffff
            c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48
            c48 &= 0xffff
            return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned)
          }

          /**
           * Returns the product of this and the specified Long. This is an alias of {@link Long#multiply}.
           * @function
           * @param {!Long|number|string} multiplier Multiplier
           * @returns {!Long} Product
           */
          LongPrototype.mul = LongPrototype.multiply

          /**
           * Returns this Long divided by the specified. The result is signed if this Long is signed or
           *  unsigned if this Long is unsigned.
           * @param {!Long|number|string} divisor Divisor
           * @returns {!Long} Quotient
           */
          LongPrototype.divide = function divide(divisor) {
            if (!isLong(divisor)) divisor = fromValue(divisor)
            if (divisor.isZero()) throw Error('division by zero')

            // use wasm support if present
            if (wasm) {
              // guard against signed division overflow: the largest
              // negative number / -1 would be 1 larger than the largest
              // positive number, due to two's complement.
              if (
                !this.unsigned &&
                this.high === -0x80000000 &&
                divisor.low === -1 &&
                divisor.high === -1
              ) {
                // be consistent with non-wasm code path
                return this
              }
              var low = (this.unsigned ? wasm.div_u : wasm.div_s)(
                this.low,
                this.high,
                divisor.low,
                divisor.high
              )
              return fromBits(low, wasm.get_high(), this.unsigned)
            }

            if (this.isZero()) return this.unsigned ? UZERO : ZERO
            var approx, rem, res
            if (!this.unsigned) {
              // This section is only relevant for signed longs and is derived from the
              // closure library as a whole.
              if (this.eq(MIN_VALUE)) {
                if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                  return MIN_VALUE // recall that -MIN_VALUE == MIN_VALUE
                else if (divisor.eq(MIN_VALUE)) return ONE
                else {
                  // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                  var halfThis = this.shr(1)
                  approx = halfThis.div(divisor).shl(1)
                  if (approx.eq(ZERO)) {
                    return divisor.isNegative() ? ONE : NEG_ONE
                  } else {
                    rem = this.sub(divisor.mul(approx))
                    res = approx.add(rem.div(divisor))
                    return res
                  }
                }
              } else if (divisor.eq(MIN_VALUE))
                return this.unsigned ? UZERO : ZERO
              if (this.isNegative()) {
                if (divisor.isNegative()) return this.neg().div(divisor.neg())
                return this.neg().div(divisor).neg()
              } else if (divisor.isNegative())
                return this.div(divisor.neg()).neg()
              res = ZERO
            } else {
              // The algorithm below has not been made for unsigned longs. It's therefore
              // required to take special care of the MSB prior to running it.
              if (!divisor.unsigned) divisor = divisor.toUnsigned()
              if (divisor.gt(this)) return UZERO
              if (divisor.gt(this.shru(1)))
                // 15 >>> 1 = 7 ; with divisor = 8 ; true
                return UONE
              res = UZERO
            }

            // Repeat the following until the remainder is less than other:  find a
            // floating-point that approximates remainder / other *from below*, add this
            // into the result, and subtract it from the remainder.  It is critical that
            // the approximate value is less than or equal to the real value so that the
            // remainder never becomes negative.
            rem = this
            while (rem.gte(divisor)) {
              // Approximate the result of division. This may be a little greater or
              // smaller than the actual value.
              approx = Math.max(
                1,
                Math.floor(rem.toNumber() / divisor.toNumber())
              )

              // We will tweak the approximate result by changing it in the 48-th digit or
              // the smallest non-fractional digit, whichever is larger.
              var log2 = Math.ceil(Math.log(approx) / Math.LN2),
                delta = log2 <= 48 ? 1 : pow_dbl(2, log2 - 48),
                // Decrease the approximation until it is smaller than the remainder.  Note
                // that if it is too large, the product overflows and is negative.
                approxRes = fromNumber(approx),
                approxRem = approxRes.mul(divisor)
              while (approxRem.isNegative() || approxRem.gt(rem)) {
                approx -= delta
                approxRes = fromNumber(approx, this.unsigned)
                approxRem = approxRes.mul(divisor)
              }

              // We know the answer can't be zero... and actually, zero would cause
              // infinite recursion since we would make no progress.
              if (approxRes.isZero()) approxRes = ONE

              res = res.add(approxRes)
              rem = rem.sub(approxRem)
            }
            return res
          }

          /**
           * Returns this Long divided by the specified. This is an alias of {@link Long#divide}.
           * @function
           * @param {!Long|number|string} divisor Divisor
           * @returns {!Long} Quotient
           */
          LongPrototype.div = LongPrototype.divide

          /**
           * Returns this Long modulo the specified.
           * @param {!Long|number|string} divisor Divisor
           * @returns {!Long} Remainder
           */
          LongPrototype.modulo = function modulo(divisor) {
            if (!isLong(divisor)) divisor = fromValue(divisor)

            // use wasm support if present
            if (wasm) {
              var low = (this.unsigned ? wasm.rem_u : wasm.rem_s)(
                this.low,
                this.high,
                divisor.low,
                divisor.high
              )
              return fromBits(low, wasm.get_high(), this.unsigned)
            }

            return this.sub(this.div(divisor).mul(divisor))
          }

          /**
           * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
           * @function
           * @param {!Long|number|string} divisor Divisor
           * @returns {!Long} Remainder
           */
          LongPrototype.mod = LongPrototype.modulo

          /**
           * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
           * @function
           * @param {!Long|number|string} divisor Divisor
           * @returns {!Long} Remainder
           */
          LongPrototype.rem = LongPrototype.modulo

          /**
           * Returns the bitwise NOT of this Long.
           * @returns {!Long}
           */
          LongPrototype.not = function not() {
            return fromBits(~this.low, ~this.high, this.unsigned)
          }

          /**
           * Returns the bitwise AND of this Long and the specified.
           * @param {!Long|number|string} other Other Long
           * @returns {!Long}
           */
          LongPrototype.and = function and(other) {
            if (!isLong(other)) other = fromValue(other)
            return fromBits(
              this.low & other.low,
              this.high & other.high,
              this.unsigned
            )
          }

          /**
           * Returns the bitwise OR of this Long and the specified.
           * @param {!Long|number|string} other Other Long
           * @returns {!Long}
           */
          LongPrototype.or = function or(other) {
            if (!isLong(other)) other = fromValue(other)
            return fromBits(
              this.low | other.low,
              this.high | other.high,
              this.unsigned
            )
          }

          /**
           * Returns the bitwise XOR of this Long and the given one.
           * @param {!Long|number|string} other Other Long
           * @returns {!Long}
           */
          LongPrototype.xor = function xor(other) {
            if (!isLong(other)) other = fromValue(other)
            return fromBits(
              this.low ^ other.low,
              this.high ^ other.high,
              this.unsigned
            )
          }

          /**
           * Returns this Long with bits shifted to the left by the given amount.
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shiftLeft = function shiftLeft(numBits) {
            if (isLong(numBits)) numBits = numBits.toInt()
            if ((numBits &= 63) === 0) return this
            else if (numBits < 32)
              return fromBits(
                this.low << numBits,
                (this.high << numBits) | (this.low >>> (32 - numBits)),
                this.unsigned
              )
            else return fromBits(0, this.low << (numBits - 32), this.unsigned)
          }

          /**
           * Returns this Long with bits shifted to the left by the given amount. This is an alias of {@link Long#shiftLeft}.
           * @function
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shl = LongPrototype.shiftLeft

          /**
           * Returns this Long with bits arithmetically shifted to the right by the given amount.
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shiftRight = function shiftRight(numBits) {
            if (isLong(numBits)) numBits = numBits.toInt()
            if ((numBits &= 63) === 0) return this
            else if (numBits < 32)
              return fromBits(
                (this.low >>> numBits) | (this.high << (32 - numBits)),
                this.high >> numBits,
                this.unsigned
              )
            else
              return fromBits(
                this.high >> (numBits - 32),
                this.high >= 0 ? 0 : -1,
                this.unsigned
              )
          }

          /**
           * Returns this Long with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Long#shiftRight}.
           * @function
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shr = LongPrototype.shiftRight

          /**
           * Returns this Long with bits logically shifted to the right by the given amount.
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(
            numBits
          ) {
            if (isLong(numBits)) numBits = numBits.toInt()
            numBits &= 63
            if (numBits === 0) return this
            else {
              var high = this.high
              if (numBits < 32) {
                var low = this.low
                return fromBits(
                  (low >>> numBits) | (high << (32 - numBits)),
                  high >>> numBits,
                  this.unsigned
                )
              } else if (numBits === 32) return fromBits(high, 0, this.unsigned)
              else return fromBits(high >>> (numBits - 32), 0, this.unsigned)
            }
          }

          /**
           * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
           * @function
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shru = LongPrototype.shiftRightUnsigned

          /**
           * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
           * @function
           * @param {number|!Long} numBits Number of bits
           * @returns {!Long} Shifted Long
           */
          LongPrototype.shr_u = LongPrototype.shiftRightUnsigned

          /**
           * Converts this Long to signed.
           * @returns {!Long} Signed long
           */
          LongPrototype.toSigned = function toSigned() {
            if (!this.unsigned) return this
            return fromBits(this.low, this.high, false)
          }

          /**
           * Converts this Long to unsigned.
           * @returns {!Long} Unsigned long
           */
          LongPrototype.toUnsigned = function toUnsigned() {
            if (this.unsigned) return this
            return fromBits(this.low, this.high, true)
          }

          /**
           * Converts this Long to its byte representation.
           * @param {boolean=} le Whether little or big endian, defaults to big endian
           * @returns {!Array.<number>} Byte representation
           */
          LongPrototype.toBytes = function toBytes(le) {
            return le ? this.toBytesLE() : this.toBytesBE()
          }

          /**
           * Converts this Long to its little endian byte representation.
           * @returns {!Array.<number>} Little endian byte representation
           */
          LongPrototype.toBytesLE = function toBytesLE() {
            var hi = this.high,
              lo = this.low
            return [
              lo & 0xff,
              (lo >>> 8) & 0xff,
              (lo >>> 16) & 0xff,
              lo >>> 24,
              hi & 0xff,
              (hi >>> 8) & 0xff,
              (hi >>> 16) & 0xff,
              hi >>> 24
            ]
          }

          /**
           * Converts this Long to its big endian byte representation.
           * @returns {!Array.<number>} Big endian byte representation
           */
          LongPrototype.toBytesBE = function toBytesBE() {
            var hi = this.high,
              lo = this.low
            return [
              hi >>> 24,
              (hi >>> 16) & 0xff,
              (hi >>> 8) & 0xff,
              hi & 0xff,
              lo >>> 24,
              (lo >>> 16) & 0xff,
              (lo >>> 8) & 0xff,
              lo & 0xff
            ]
          }

          /**
           * Creates a Long from its byte representation.
           * @param {!Array.<number>} bytes Byte representation
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @param {boolean=} le Whether little or big endian, defaults to big endian
           * @returns {Long} The corresponding Long value
           */
          Long.fromBytes = function fromBytes(bytes, unsigned, le) {
            return le
              ? Long.fromBytesLE(bytes, unsigned)
              : Long.fromBytesBE(bytes, unsigned)
          }

          /**
           * Creates a Long from its little endian byte representation.
           * @param {!Array.<number>} bytes Little endian byte representation
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @returns {Long} The corresponding Long value
           */
          Long.fromBytesLE = function fromBytesLE(bytes, unsigned) {
            return new Long(
              bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24),
              bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24),
              unsigned
            )
          }

          /**
           * Creates a Long from its big endian byte representation.
           * @param {!Array.<number>} bytes Big endian byte representation
           * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
           * @returns {Long} The corresponding Long value
           */
          Long.fromBytesBE = function fromBytesBE(bytes, unsigned) {
            return new Long(
              (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7],
              (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3],
              unsigned
            )
          }
        },
        {}
      ],
      23: [
        function (require, module, exports) {
          // light library entry point.

          'use strict'
          module.exports = require('./src/index-light')
        },
        {'./src/index-light': 29}
      ],
      24: [
        function (require, module, exports) {
          'use strict'
          /**
           * Runtime message from/to plain object converters.
           * @namespace
           */
          var converter = exports

          var Enum = require('./enum'),
            util = require('./util')

          /**
           * Generates a partial value fromObject conveter.
           * @param {Codegen} gen Codegen instance
           * @param {Field} field Reflected field
           * @param {number} fieldIndex Field index
           * @param {string} prop Property reference
           * @returns {Codegen} Codegen instance
           * @ignore
           */
          function genValuePartial_fromObject(gen, field, fieldIndex, prop) {
            /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
            if (field.resolvedType) {
              if (field.resolvedType instanceof Enum) {
                gen('switch(d%s){', prop)
                for (
                  var values = field.resolvedType.values,
                    keys = Object.keys(values),
                    i = 0;
                  i < keys.length;
                  ++i
                ) {
                  if (field.repeated && values[keys[i]] === field.typeDefault)
                    gen('default:')
                  gen('case%j:', keys[i])('case %i:', values[keys[i]])(
                    'm%s=%j',
                    prop,
                    values[keys[i]]
                  )('break')
                }
                gen('}')
              } else
                gen('if(typeof d%s!=="object")', prop)(
                  'throw TypeError(%j)',
                  field.fullName + ': object expected'
                )('m%s=types[%i].fromObject(d%s)', prop, fieldIndex, prop)
            } else {
              var isUnsigned = false
              switch (field.type) {
                case 'double':
                case 'float':
                  gen('m%s=Number(d%s)', prop, prop) // also catches "NaN", "Infinity"
                  break
                case 'uint32':
                case 'fixed32':
                  gen('m%s=d%s>>>0', prop, prop)
                  break
                case 'int32':
                case 'sint32':
                case 'sfixed32':
                  gen('m%s=d%s|0', prop, prop)
                  break
                case 'uint64':
                  isUnsigned = true
                // eslint-disable-line no-fallthrough
                case 'int64':
                case 'sint64':
                case 'fixed64':
                case 'sfixed64':
                  gen('if(util.Long)')(
                    '(m%s=util.Long.fromValue(d%s)).unsigned=%j',
                    prop,
                    prop,
                    isUnsigned
                  )('else if(typeof d%s==="string")', prop)(
                    'm%s=parseInt(d%s,10)',
                    prop,
                    prop
                  )('else if(typeof d%s==="number")', prop)(
                    'm%s=d%s',
                    prop,
                    prop
                  )('else if(typeof d%s==="object")', prop)(
                    'm%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)',
                    prop,
                    prop,
                    prop,
                    isUnsigned ? 'true' : ''
                  )
                  break
                case 'bytes':
                  gen('if(typeof d%s==="string")', prop)(
                    'util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)',
                    prop,
                    prop,
                    prop
                  )('else if(d%s.length)', prop)('m%s=d%s', prop, prop)
                  break
                case 'string':
                  gen('m%s=String(d%s)', prop, prop)
                  break
                case 'bool':
                  gen('m%s=Boolean(d%s)', prop, prop)
                  break
                /* default: gen
                ("m%s=d%s", prop, prop);
                break; */
              }
            }
            return gen
            /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
          }

          /**
           * Generates a plain object to runtime message converter specific to the specified message type.
           * @param {Type} mtype Message type
           * @returns {Codegen} Codegen instance
           */
          converter.fromObject = function fromObject(mtype) {
            /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
            var fields = mtype.fieldsArray
            var gen = util.codegen(
              ['d'],
              mtype.name + '$fromObject'
            )('if(d instanceof this.ctor)')('return d')
            if (!fields.length) return gen('return new this.ctor')
            gen('var m=new this.ctor')
            for (var i = 0; i < fields.length; ++i) {
              var field = fields[i].resolve(),
                prop = util.safeProp(field.name)

              // Map fields
              if (field.map) {
                gen('if(d%s){', prop)('if(typeof d%s!=="object")', prop)(
                  'throw TypeError(%j)',
                  field.fullName + ': object expected'
                )('m%s={}', prop)(
                  'for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){',
                  prop
                )
                genValuePartial_fromObject(
                  gen,
                  field,
                  /* not sorted */ i,
                  prop + '[ks[i]]'
                )('}')('}')

                // Repeated fields
              } else if (field.repeated) {
                gen('if(d%s){', prop)('if(!Array.isArray(d%s))', prop)(
                  'throw TypeError(%j)',
                  field.fullName + ': array expected'
                )('m%s=[]', prop)('for(var i=0;i<d%s.length;++i){', prop)
                genValuePartial_fromObject(
                  gen,
                  field,
                  /* not sorted */ i,
                  prop + '[i]'
                )('}')('}')

                // Non-repeated fields
              } else {
                if (!(field.resolvedType instanceof Enum))
                  gen(
                    // no need to test for null/undefined if an enum (uses switch)
                    'if(d%s!=null){',
                    prop
                  ) // !== undefined && !== null
                genValuePartial_fromObject(gen, field, /* not sorted */ i, prop)
                if (!(field.resolvedType instanceof Enum)) gen('}')
              }
            }
            return gen('return m')
            /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
          }

          /**
           * Generates a partial value toObject converter.
           * @param {Codegen} gen Codegen instance
           * @param {Field} field Reflected field
           * @param {number} fieldIndex Field index
           * @param {string} prop Property reference
           * @returns {Codegen} Codegen instance
           * @ignore
           */
          function genValuePartial_toObject(gen, field, fieldIndex, prop) {
            /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
            if (field.resolvedType) {
              if (field.resolvedType instanceof Enum)
                gen(
                  'd%s=o.enums===String?types[%i].values[m%s]:m%s',
                  prop,
                  fieldIndex,
                  prop,
                  prop
                )
              else gen('d%s=types[%i].toObject(m%s,o)', prop, fieldIndex, prop)
            } else {
              var isUnsigned = false
              switch (field.type) {
                case 'double':
                case 'float':
                  gen(
                    'd%s=o.json&&!isFinite(m%s)?String(m%s):m%s',
                    prop,
                    prop,
                    prop,
                    prop
                  )
                  break
                case 'uint64':
                  isUnsigned = true
                // eslint-disable-line no-fallthrough
                case 'int64':
                case 'sint64':
                case 'fixed64':
                case 'sfixed64':
                  gen('if(typeof m%s==="number")', prop)(
                    'd%s=o.longs===String?String(m%s):m%s',
                    prop,
                    prop,
                    prop
                  )('else')(
                    // Long-like
                    'd%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s',
                    prop,
                    prop,
                    prop,
                    prop,
                    isUnsigned ? 'true' : '',
                    prop
                  )
                  break
                case 'bytes':
                  gen(
                    'd%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s',
                    prop,
                    prop,
                    prop,
                    prop,
                    prop
                  )
                  break
                default:
                  gen('d%s=m%s', prop, prop)
                  break
              }
            }
            return gen
            /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
          }

          /**
           * Generates a runtime message to plain object converter specific to the specified message type.
           * @param {Type} mtype Message type
           * @returns {Codegen} Codegen instance
           */
          converter.toObject = function toObject(mtype) {
            /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
            var fields = mtype.fieldsArray.slice().sort(util.compareFieldsById)
            if (!fields.length) return util.codegen()('return {}')
            var gen = util.codegen(
              ['m', 'o'],
              mtype.name + '$toObject'
            )('if(!o)')('o={}')('var d={}')

            var repeatedFields = [],
              mapFields = [],
              normalFields = [],
              i = 0
            for (; i < fields.length; ++i)
              if (!fields[i].partOf)
                (fields[i].resolve().repeated
                  ? repeatedFields
                  : fields[i].map
                  ? mapFields
                  : normalFields
                ).push(fields[i])

            if (repeatedFields.length) {
              gen('if(o.arrays||o.defaults){')
              for (i = 0; i < repeatedFields.length; ++i)
                gen('d%s=[]', util.safeProp(repeatedFields[i].name))
              gen('}')
            }

            if (mapFields.length) {
              gen('if(o.objects||o.defaults){')
              for (i = 0; i < mapFields.length; ++i)
                gen('d%s={}', util.safeProp(mapFields[i].name))
              gen('}')
            }

            if (normalFields.length) {
              gen('if(o.defaults){')
              for (i = 0; i < normalFields.length; ++i) {
                var field = normalFields[i],
                  prop = util.safeProp(field.name)
                if (field.resolvedType instanceof Enum)
                  gen(
                    'd%s=o.enums===String?%j:%j',
                    prop,
                    field.resolvedType.valuesById[field.typeDefault],
                    field.typeDefault
                  )
                else if (field.long)
                  gen('if(util.Long){')(
                    'var n=new util.Long(%i,%i,%j)',
                    field.typeDefault.low,
                    field.typeDefault.high,
                    field.typeDefault.unsigned
                  )(
                    'd%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n',
                    prop
                  )('}else')(
                    'd%s=o.longs===String?%j:%i',
                    prop,
                    field.typeDefault.toString(),
                    field.typeDefault.toNumber()
                  )
                else if (field.bytes) {
                  var arrayDefault =
                    '[' +
                    Array.prototype.slice.call(field.typeDefault).join(',') +
                    ']'
                  gen(
                    'if(o.bytes===String)d%s=%j',
                    prop,
                    String.fromCharCode.apply(String, field.typeDefault)
                  )('else{')('d%s=%s', prop, arrayDefault)(
                    'if(o.bytes!==Array)d%s=util.newBuffer(d%s)',
                    prop,
                    prop
                  )('}')
                } else gen('d%s=%j', prop, field.typeDefault) // also messages (=null)
              }
              gen('}')
            }
            var hasKs2 = false
            for (i = 0; i < fields.length; ++i) {
              var field = fields[i],
                index = mtype._fieldsArray.indexOf(field),
                prop = util.safeProp(field.name)
              if (field.map) {
                if (!hasKs2) {
                  hasKs2 = true
                  gen('var ks2')
                }
                gen(
                  'if(m%s&&(ks2=Object.keys(m%s)).length){',
                  prop,
                  prop
                )(
                  'd%s={}',
                  prop
                )('for(var j=0;j<ks2.length;++j){')
                genValuePartial_toObject(
                  gen,
                  field,
                  /* sorted */ index,
                  prop + '[ks2[j]]'
                )('}')
              } else if (field.repeated) {
                gen('if(m%s&&m%s.length){', prop, prop)('d%s=[]', prop)(
                  'for(var j=0;j<m%s.length;++j){',
                  prop
                )
                genValuePartial_toObject(
                  gen,
                  field,
                  /* sorted */ index,
                  prop + '[j]'
                )('}')
              } else {
                gen('if(m%s!=null&&m.hasOwnProperty(%j)){', prop, field.name) // !== undefined && !== null
                genValuePartial_toObject(gen, field, /* sorted */ index, prop)
                if (field.partOf)
                  gen('if(o.oneofs)')(
                    'd%s=%j',
                    util.safeProp(field.partOf.name),
                    field.name
                  )
              }
              gen('}')
            }
            return gen('return d')
            /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
          }
        },
        {'./enum': 27, './util': 46}
      ],
      25: [
        function (require, module, exports) {
          'use strict'
          module.exports = decoder

          var Enum = require('./enum'),
            types = require('./types'),
            util = require('./util')

          function missing(field) {
            return "missing required '" + field.name + "'"
          }

          /**
           * Generates a decoder specific to the specified message type.
           * @param {Type} mtype Message type
           * @returns {Codegen} Codegen instance
           */
          function decoder(mtype) {
            /* eslint-disable no-unexpected-multiline */
            var gen = util.codegen(
              ['r', 'l'],
              mtype.name + '$decode'
            )('if(!(r instanceof Reader))')('r=Reader.create(r)')(
              'var c=l===undefined?r.len:r.pos+l,m=new this.ctor' +
                (mtype.fieldsArray.filter(function (field) {
                  return field.map
                }).length
                  ? ',k,value'
                  : '')
            )('while(r.pos<c){')('var t=r.uint32()')
            if (mtype.group) gen('if((t&7)===4)')('break')
            gen('switch(t>>>3){')

            var i = 0
            for (; i < /* initializes */ mtype.fieldsArray.length; ++i) {
              var field = mtype._fieldsArray[i].resolve(),
                type =
                  field.resolvedType instanceof Enum ? 'int32' : field.type,
                ref = 'm' + util.safeProp(field.name)
              gen('case %i:', field.id)

              // Map fields
              if (field.map) {
                gen('if(%s===util.emptyObject)', ref)('%s={}', ref)(
                  'var c2 = r.uint32()+r.pos'
                )

                if (types.defaults[field.keyType] !== undefined)
                  gen('k=%j', types.defaults[field.keyType])
                else gen('k=null')

                if (types.defaults[type] !== undefined)
                  gen('value=%j', types.defaults[type])
                else gen('value=null')

                gen('while(r.pos<c2){')('var tag2=r.uint32()')(
                  'switch(tag2>>>3){'
                )(
                  'case 1: k=r.%s(); break',
                  field.keyType
                )('case 2:')

                if (types.basic[type] === undefined)
                  gen('value=types[%i].decode(r,r.uint32())', i)
                // can't be groups
                else gen('value=r.%s()', type)

                gen('break')('default:')('r.skipType(tag2&7)')('break')('}')(
                  '}'
                )

                if (types.long[field.keyType] !== undefined)
                  gen('%s[typeof k==="object"?util.longToHash(k):k]=value', ref)
                else gen('%s[k]=value', ref)

                // Repeated fields
              } else if (field.repeated) {
                gen('if(!(%s&&%s.length))', ref, ref)('%s=[]', ref)

                // Packable (always check for forward and backward compatiblity)
                if (types.packed[type] !== undefined)
                  gen('if((t&7)===2){')('var c2=r.uint32()+r.pos')(
                    'while(r.pos<c2)'
                  )(
                    '%s.push(r.%s())',
                    ref,
                    type
                  )('}else')

                // Non-packed
                if (types.basic[type] === undefined)
                  gen(
                    field.resolvedType.group
                      ? '%s.push(types[%i].decode(r))'
                      : '%s.push(types[%i].decode(r,r.uint32()))',
                    ref,
                    i
                  )
                else gen('%s.push(r.%s())', ref, type)

                // Non-repeated
              } else if (types.basic[type] === undefined)
                gen(
                  field.resolvedType.group
                    ? '%s=types[%i].decode(r)'
                    : '%s=types[%i].decode(r,r.uint32())',
                  ref,
                  i
                )
              else gen('%s=r.%s()', ref, type)
              gen('break')
              // Unknown fields
            }
            gen('default:')('r.skipType(t&7)')('break')('}')('}')

            // Field presence
            for (i = 0; i < mtype._fieldsArray.length; ++i) {
              var rfield = mtype._fieldsArray[i]
              if (rfield.required)
                gen('if(!m.hasOwnProperty(%j))', rfield.name)(
                  'throw util.ProtocolError(%j,{instance:m})',
                  missing(rfield)
                )
            }

            return gen('return m')
            /* eslint-enable no-unexpected-multiline */
          }
        },
        {'./enum': 27, './types': 45, './util': 46}
      ],
      26: [
        function (require, module, exports) {
          'use strict'
          module.exports = encoder

          var Enum = require('./enum'),
            types = require('./types'),
            util = require('./util')

          /**
           * Generates a partial message type encoder.
           * @param {Codegen} gen Codegen instance
           * @param {Field} field Reflected field
           * @param {number} fieldIndex Field index
           * @param {string} ref Variable reference
           * @returns {Codegen} Codegen instance
           * @ignore
           */
          function genTypePartial(gen, field, fieldIndex, ref) {
            return field.resolvedType.group
              ? gen(
                  'types[%i].encode(%s,w.uint32(%i)).uint32(%i)',
                  fieldIndex,
                  ref,
                  ((field.id << 3) | 3) >>> 0,
                  ((field.id << 3) | 4) >>> 0
                )
              : gen(
                  'types[%i].encode(%s,w.uint32(%i).fork()).ldelim()',
                  fieldIndex,
                  ref,
                  ((field.id << 3) | 2) >>> 0
                )
          }

          /**
           * Generates an encoder specific to the specified message type.
           * @param {Type} mtype Message type
           * @returns {Codegen} Codegen instance
           */
          function encoder(mtype) {
            /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
            var gen = util.codegen(
              ['m', 'w'],
              mtype.name + '$encode'
            )('if(!w)')('w=Writer.create()')

            var i, ref

            // "when a message is serialized its known fields should be written sequentially by field number"
            var fields = /* initializes */ mtype.fieldsArray
              .slice()
              .sort(util.compareFieldsById)

            for (var i = 0; i < fields.length; ++i) {
              var field = fields[i].resolve(),
                index = mtype._fieldsArray.indexOf(field),
                type =
                  field.resolvedType instanceof Enum ? 'int32' : field.type,
                wireType = types.basic[type]
              ref = 'm' + util.safeProp(field.name)

              // Map fields
              if (field.map) {
                gen(
                  'if(%s!=null&&Object.hasOwnProperty.call(m,%j)){',
                  ref,
                  field.name
                )(
                  // !== undefined && !== null
                  'for(var ks=Object.keys(%s),i=0;i<ks.length;++i){',
                  ref
                )(
                  'w.uint32(%i).fork().uint32(%i).%s(ks[i])',
                  ((field.id << 3) | 2) >>> 0,
                  8 | types.mapKey[field.keyType],
                  field.keyType
                )
                if (wireType === undefined)
                  gen(
                    'types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()',
                    index,
                    ref
                  )
                // can't be groups
                else
                  gen(
                    '.uint32(%i).%s(%s[ks[i]]).ldelim()',
                    16 | wireType,
                    type,
                    ref
                  )
                gen('}')('}')

                // Repeated fields
              } else if (field.repeated) {
                gen('if(%s!=null&&%s.length){', ref, ref) // !== undefined && !== null

                // Packed repeated
                if (field.packed && types.packed[type] !== undefined) {
                  gen('w.uint32(%i).fork()', ((field.id << 3) | 2) >>> 0)(
                    'for(var i=0;i<%s.length;++i)',
                    ref
                  )(
                    'w.%s(%s[i])',
                    type,
                    ref
                  )('w.ldelim()')

                  // Non-packed
                } else {
                  gen('for(var i=0;i<%s.length;++i)', ref)
                  if (wireType === undefined)
                    genTypePartial(gen, field, index, ref + '[i]')
                  else
                    gen(
                      'w.uint32(%i).%s(%s[i])',
                      ((field.id << 3) | wireType) >>> 0,
                      type,
                      ref
                    )
                }
                gen('}')

                // Non-repeated
              } else {
                if (field.optional)
                  gen(
                    'if(%s!=null&&Object.hasOwnProperty.call(m,%j))',
                    ref,
                    field.name
                  ) // !== undefined && !== null

                if (wireType === undefined)
                  genTypePartial(gen, field, index, ref)
                else
                  gen(
                    'w.uint32(%i).%s(%s)',
                    ((field.id << 3) | wireType) >>> 0,
                    type,
                    ref
                  )
              }
            }

            return gen('return w')
            /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
          }
        },
        {'./enum': 27, './types': 45, './util': 46}
      ],
      27: [
        function (require, module, exports) {
          'use strict'
          module.exports = Enum

          // extends ReflectionObject
          var ReflectionObject = require('./object')
          ;((Enum.prototype = Object.create(
            ReflectionObject.prototype
          )).constructor = Enum).className = 'Enum'

          var Namespace = require('./namespace'),
            util = require('./util')

          /**
           * Constructs a new enum instance.
           * @classdesc Reflected enum.
           * @extends ReflectionObject
           * @constructor
           * @param {string} name Unique name within its namespace
           * @param {Object.<string,number>} [values] Enum values as an object, by name
           * @param {Object.<string,*>} [options] Declared options
           * @param {string} [comment] The comment for this enum
           * @param {Object.<string,string>} [comments] The value comments for this enum
           */
          function Enum(name, values, options, comment, comments) {
            ReflectionObject.call(this, name, options)

            if (values && typeof values !== 'object')
              throw TypeError('values must be an object')

            /**
             * Enum values by id.
             * @type {Object.<number,string>}
             */
            this.valuesById = {}

            /**
             * Enum values by name.
             * @type {Object.<string,number>}
             */
            this.values = Object.create(this.valuesById) // toJSON, marker

            /**
             * Enum comment text.
             * @type {string|null}
             */
            this.comment = comment

            /**
             * Value comment texts, if any.
             * @type {Object.<string,string>}
             */
            this.comments = comments || {}

            /**
             * Reserved ranges, if any.
             * @type {Array.<number[]|string>}
             */
            this.reserved = undefined // toJSON

            // Note that values inherit valuesById on their prototype which makes them a TypeScript-
            // compatible enum. This is used by pbts to write actual enum definitions that work for
            // static and reflection code alike instead of emitting generic object definitions.

            if (values)
              for (var keys = Object.keys(values), i = 0; i < keys.length; ++i)
                if (typeof values[keys[i]] === 'number')
                  // use forward entries only
                  this.valuesById[(this.values[keys[i]] = values[keys[i]])] =
                    keys[i]
          }

          /**
           * Enum descriptor.
           * @interface IEnum
           * @property {Object.<string,number>} values Enum values
           * @property {Object.<string,*>} [options] Enum options
           */

          /**
           * Constructs an enum from an enum descriptor.
           * @param {string} name Enum name
           * @param {IEnum} json Enum descriptor
           * @returns {Enum} Created enum
           * @throws {TypeError} If arguments are invalid
           */
          Enum.fromJSON = function fromJSON(name, json) {
            var enm = new Enum(
              name,
              json.values,
              json.options,
              json.comment,
              json.comments
            )
            enm.reserved = json.reserved
            return enm
          }

          /**
           * Converts this enum to an enum descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IEnum} Enum descriptor
           */
          Enum.prototype.toJSON = function toJSON(toJSONOptions) {
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'options',
              this.options,
              'values',
              this.values,
              'reserved',
              this.reserved && this.reserved.length ? this.reserved : undefined,
              'comment',
              keepComments ? this.comment : undefined,
              'comments',
              keepComments ? this.comments : undefined
            ])
          }

          /**
           * Adds a value to this enum.
           * @param {string} name Value name
           * @param {number} id Value id
           * @param {string} [comment] Comment, if any
           * @returns {Enum} `this`
           * @throws {TypeError} If arguments are invalid
           * @throws {Error} If there is already a value with this name or id
           */
          Enum.prototype.add = function add(name, id, comment) {
            // utilized by the parser but not by .fromJSON

            if (!util.isString(name)) throw TypeError('name must be a string')

            if (!util.isInteger(id)) throw TypeError('id must be an integer')

            if (this.values[name] !== undefined)
              throw Error("duplicate name '" + name + "' in " + this)

            if (this.isReservedId(id))
              throw Error('id ' + id + ' is reserved in ' + this)

            if (this.isReservedName(name))
              throw Error("name '" + name + "' is reserved in " + this)

            if (this.valuesById[id] !== undefined) {
              if (!(this.options && this.options.allow_alias))
                throw Error('duplicate id ' + id + ' in ' + this)
              this.values[name] = id
            } else this.valuesById[(this.values[name] = id)] = name

            this.comments[name] = comment || null
            return this
          }

          /**
           * Removes a value from this enum
           * @param {string} name Value name
           * @returns {Enum} `this`
           * @throws {TypeError} If arguments are invalid
           * @throws {Error} If `name` is not a name of this enum
           */
          Enum.prototype.remove = function remove(name) {
            if (!util.isString(name)) throw TypeError('name must be a string')

            var val = this.values[name]
            if (val == null)
              throw Error("name '" + name + "' does not exist in " + this)

            delete this.valuesById[val]
            delete this.values[name]
            delete this.comments[name]

            return this
          }

          /**
           * Tests if the specified id is reserved.
           * @param {number} id Id to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          Enum.prototype.isReservedId = function isReservedId(id) {
            return Namespace.isReservedId(this.reserved, id)
          }

          /**
           * Tests if the specified name is reserved.
           * @param {string} name Name to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          Enum.prototype.isReservedName = function isReservedName(name) {
            return Namespace.isReservedName(this.reserved, name)
          }
        },
        {'./namespace': 34, './object': 35, './util': 46}
      ],
      28: [
        function (require, module, exports) {
          'use strict'
          module.exports = Field

          // extends ReflectionObject
          var ReflectionObject = require('./object')
          ;((Field.prototype = Object.create(
            ReflectionObject.prototype
          )).constructor = Field).className = 'Field'

          var Enum = require('./enum'),
            types = require('./types'),
            util = require('./util')

          var Type // cyclic

          var ruleRe = /^required|optional|repeated$/

          /**
           * Constructs a new message field instance. Note that {@link MapField|map fields} have their own class.
           * @name Field
           * @classdesc Reflected message field.
           * @extends FieldBase
           * @constructor
           * @param {string} name Unique name within its namespace
           * @param {number} id Unique id within its namespace
           * @param {string} type Value type
           * @param {string|Object.<string,*>} [rule="optional"] Field rule
           * @param {string|Object.<string,*>} [extend] Extended type if different from parent
           * @param {Object.<string,*>} [options] Declared options
           */

          /**
           * Constructs a field from a field descriptor.
           * @param {string} name Field name
           * @param {IField} json Field descriptor
           * @returns {Field} Created field
           * @throws {TypeError} If arguments are invalid
           */
          Field.fromJSON = function fromJSON(name, json) {
            return new Field(
              name,
              json.id,
              json.type,
              json.rule,
              json.extend,
              json.options,
              json.comment
            )
          }

          /**
           * Not an actual constructor. Use {@link Field} instead.
           * @classdesc Base class of all reflected message fields. This is not an actual class but here for the sake of having consistent type definitions.
           * @exports FieldBase
           * @extends ReflectionObject
           * @constructor
           * @param {string} name Unique name within its namespace
           * @param {number} id Unique id within its namespace
           * @param {string} type Value type
           * @param {string|Object.<string,*>} [rule="optional"] Field rule
           * @param {string|Object.<string,*>} [extend] Extended type if different from parent
           * @param {Object.<string,*>} [options] Declared options
           * @param {string} [comment] Comment associated with this field
           */
          function Field(name, id, type, rule, extend, options, comment) {
            if (util.isObject(rule)) {
              comment = extend
              options = rule
              rule = extend = undefined
            } else if (util.isObject(extend)) {
              comment = options
              options = extend
              extend = undefined
            }

            ReflectionObject.call(this, name, options)

            if (!util.isInteger(id) || id < 0)
              throw TypeError('id must be a non-negative integer')

            if (!util.isString(type)) throw TypeError('type must be a string')

            if (
              rule !== undefined &&
              !ruleRe.test((rule = rule.toString().toLowerCase()))
            )
              throw TypeError('rule must be a string rule')

            if (extend !== undefined && !util.isString(extend))
              throw TypeError('extend must be a string')

            if (rule === 'proto3_optional') {
              rule = 'optional'
            }
            /**
             * Field rule, if any.
             * @type {string|undefined}
             */
            this.rule = rule && rule !== 'optional' ? rule : undefined // toJSON

            /**
             * Field type.
             * @type {string}
             */
            this.type = type // toJSON

            /**
             * Unique field id.
             * @type {number}
             */
            this.id = id // toJSON, marker

            /**
             * Extended type if different from parent.
             * @type {string|undefined}
             */
            this.extend = extend || undefined // toJSON

            /**
             * Whether this field is required.
             * @type {boolean}
             */
            this.required = rule === 'required'

            /**
             * Whether this field is optional.
             * @type {boolean}
             */
            this.optional = !this.required

            /**
             * Whether this field is repeated.
             * @type {boolean}
             */
            this.repeated = rule === 'repeated'

            /**
             * Whether this field is a map or not.
             * @type {boolean}
             */
            this.map = false

            /**
             * Message this field belongs to.
             * @type {Type|null}
             */
            this.message = null

            /**
             * OneOf this field belongs to, if any,
             * @type {OneOf|null}
             */
            this.partOf = null

            /**
             * The field type's default value.
             * @type {*}
             */
            this.typeDefault = null

            /**
             * The field's default value on prototypes.
             * @type {*}
             */
            this.defaultValue = null

            /**
             * Whether this field's value should be treated as a long.
             * @type {boolean}
             */
            this.long = util.Long
              ? types.long[type] !== undefined
              : /* istanbul ignore next */ false

            /**
             * Whether this field's value is a buffer.
             * @type {boolean}
             */
            this.bytes = type === 'bytes'

            /**
             * Resolved type if not a basic type.
             * @type {Type|Enum|null}
             */
            this.resolvedType = null

            /**
             * Sister-field within the extended type if a declaring extension field.
             * @type {Field|null}
             */
            this.extensionField = null

            /**
             * Sister-field within the declaring namespace if an extended field.
             * @type {Field|null}
             */
            this.declaringField = null

            /**
             * Internally remembers whether this field is packed.
             * @type {boolean|null}
             * @private
             */
            this._packed = null

            /**
             * Comment for this field.
             * @type {string|null}
             */
            this.comment = comment
          }

          /**
           * Determines whether this field is packed. Only relevant when repeated and working with proto2.
           * @name Field#packed
           * @type {boolean}
           * @readonly
           */
          Object.defineProperty(Field.prototype, 'packed', {
            get: function () {
              // defaults to packed=true if not explicity set to false
              if (this._packed === null)
                this._packed = this.getOption('packed') !== false
              return this._packed
            }
          })

          /**
           * @override
           */
          Field.prototype.setOption = function setOption(
            name,
            value,
            ifNotSet
          ) {
            if (name === 'packed')
              // clear cached before setting
              this._packed = null
            return ReflectionObject.prototype.setOption.call(
              this,
              name,
              value,
              ifNotSet
            )
          }

          /**
           * Field descriptor.
           * @interface IField
           * @property {string} [rule="optional"] Field rule
           * @property {string} type Field type
           * @property {number} id Field id
           * @property {Object.<string,*>} [options] Field options
           */

          /**
           * Extension field descriptor.
           * @interface IExtensionField
           * @extends IField
           * @property {string} extend Extended type
           */

          /**
           * Converts this field to a field descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IField} Field descriptor
           */
          Field.prototype.toJSON = function toJSON(toJSONOptions) {
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'rule',
              (this.rule !== 'optional' && this.rule) || undefined,
              'type',
              this.type,
              'id',
              this.id,
              'extend',
              this.extend,
              'options',
              this.options,
              'comment',
              keepComments ? this.comment : undefined
            ])
          }

          /**
           * Resolves this field's type references.
           * @returns {Field} `this`
           * @throws {Error} If any reference cannot be resolved
           */
          Field.prototype.resolve = function resolve() {
            if (this.resolved) return this

            if ((this.typeDefault = types.defaults[this.type]) === undefined) {
              // if not a basic type, resolve it
              this.resolvedType = (
                this.declaringField ? this.declaringField.parent : this.parent
              ).lookupTypeOrEnum(this.type)
              if (this.resolvedType instanceof Type) this.typeDefault = null
              // instanceof Enum
              else
                this.typeDefault =
                  this.resolvedType.values[
                    Object.keys(this.resolvedType.values)[0]
                  ] // first defined
            }

            // use explicitly set default value if present
            if (this.options && this.options['default'] != null) {
              this.typeDefault = this.options['default']
              if (
                this.resolvedType instanceof Enum &&
                typeof this.typeDefault === 'string'
              )
                this.typeDefault = this.resolvedType.values[this.typeDefault]
            }

            // remove unnecessary options
            if (this.options) {
              if (
                this.options.packed === true ||
                (this.options.packed !== undefined &&
                  this.resolvedType &&
                  !(this.resolvedType instanceof Enum))
              )
                delete this.options.packed
              if (!Object.keys(this.options).length) this.options = undefined
            }

            // convert to internal data type if necesssary
            if (this.long) {
              this.typeDefault = util.Long.fromNumber(
                this.typeDefault,
                this.type.charAt(0) === 'u'
              )

              /* istanbul ignore else */
              if (Object.freeze) Object.freeze(this.typeDefault) // long instances are meant to be immutable anyway (i.e. use small int cache that even requires it)
            } else if (this.bytes && typeof this.typeDefault === 'string') {
              var buf
              if (util.base64.test(this.typeDefault))
                util.base64.decode(
                  this.typeDefault,
                  (buf = util.newBuffer(util.base64.length(this.typeDefault))),
                  0
                )
              else
                util.utf8.write(
                  this.typeDefault,
                  (buf = util.newBuffer(util.utf8.length(this.typeDefault))),
                  0
                )
              this.typeDefault = buf
            }

            // take special care of maps and repeated fields
            if (this.map) this.defaultValue = util.emptyObject
            else if (this.repeated) this.defaultValue = util.emptyArray
            else this.defaultValue = this.typeDefault

            // ensure proper value on prototype
            if (this.parent instanceof Type)
              this.parent.ctor.prototype[this.name] = this.defaultValue

            return ReflectionObject.prototype.resolve.call(this)
          }

          /**
           * Decorator function as returned by {@link Field.d} and {@link MapField.d} (TypeScript).
           * @typedef FieldDecorator
           * @type {function}
           * @param {Object} prototype Target prototype
           * @param {string} fieldName Field name
           * @returns {undefined}
           */

          /**
           * Field decorator (TypeScript).
           * @name Field.d
           * @function
           * @param {number} fieldId Field id
           * @param {"double"|"float"|"int32"|"uint32"|"sint32"|"fixed32"|"sfixed32"|"int64"|"uint64"|"sint64"|"fixed64"|"sfixed64"|"string"|"bool"|"bytes"|Object} fieldType Field type
           * @param {"optional"|"required"|"repeated"} [fieldRule="optional"] Field rule
           * @param {T} [defaultValue] Default value
           * @returns {FieldDecorator} Decorator function
           * @template T extends number | number[] | Long | Long[] | string | string[] | boolean | boolean[] | Uint8Array | Uint8Array[] | Buffer | Buffer[]
           */
          Field.d = function decorateField(
            fieldId,
            fieldType,
            fieldRule,
            defaultValue
          ) {
            // submessage: decorate the submessage and use its name as the type
            if (typeof fieldType === 'function')
              fieldType = util.decorateType(fieldType).name
            // enum reference: create a reflected copy of the enum and keep reuseing it
            else if (fieldType && typeof fieldType === 'object')
              fieldType = util.decorateEnum(fieldType).name

            return function fieldDecorator(prototype, fieldName) {
              util.decorateType(prototype.constructor).add(
                new Field(fieldName, fieldId, fieldType, fieldRule, {
                  default: defaultValue
                })
              )
            }
          }

          /**
           * Field decorator (TypeScript).
           * @name Field.d
           * @function
           * @param {number} fieldId Field id
           * @param {Constructor<T>|string} fieldType Field type
           * @param {"optional"|"required"|"repeated"} [fieldRule="optional"] Field rule
           * @returns {FieldDecorator} Decorator function
           * @template T extends Message<T>
           * @variation 2
           */
          // like Field.d but without a default value

          // Sets up cyclic dependencies (called in index-light)
          Field._configure = function configure(Type_) {
            Type = Type_
          }
        },
        {'./enum': 27, './object': 35, './types': 45, './util': 46}
      ],
      29: [
        function (require, module, exports) {
          'use strict'
          var protobuf = (module.exports = require('./index-minimal'))

          protobuf.build = 'light'

          /**
           * A node-style callback as used by {@link load} and {@link Root#load}.
           * @typedef LoadCallback
           * @type {function}
           * @param {Error|null} error Error, if any, otherwise `null`
           * @param {Root} [root] Root, if there hasn't been an error
           * @returns {undefined}
           */

          /**
           * Loads one or multiple .proto or preprocessed .json files into a common root namespace and calls the callback.
           * @param {string|string[]} filename One or multiple files to load
           * @param {Root} root Root namespace, defaults to create a new one if omitted.
           * @param {LoadCallback} callback Callback function
           * @returns {undefined}
           * @see {@link Root#load}
           */
          function load(filename, root, callback) {
            if (typeof root === 'function') {
              callback = root
              root = new protobuf.Root()
            } else if (!root) root = new protobuf.Root()
            return root.load(filename, callback)
          }

          /**
           * Loads one or multiple .proto or preprocessed .json files into a common root namespace and calls the callback.
           * @name load
           * @function
           * @param {string|string[]} filename One or multiple files to load
           * @param {LoadCallback} callback Callback function
           * @returns {undefined}
           * @see {@link Root#load}
           * @variation 2
           */
          // function load(filename:string, callback:LoadCallback):undefined

          /**
           * Loads one or multiple .proto or preprocessed .json files into a common root namespace and returns a promise.
           * @name load
           * @function
           * @param {string|string[]} filename One or multiple files to load
           * @param {Root} [root] Root namespace, defaults to create a new one if omitted.
           * @returns {Promise<Root>} Promise
           * @see {@link Root#load}
           * @variation 3
           */
          // function load(filename:string, [root:Root]):Promise<Root>

          protobuf.load = load

          /**
           * Synchronously loads one or multiple .proto or preprocessed .json files into a common root namespace (node only).
           * @param {string|string[]} filename One or multiple files to load
           * @param {Root} [root] Root namespace, defaults to create a new one if omitted.
           * @returns {Root} Root namespace
           * @throws {Error} If synchronous fetching is not supported (i.e. in browsers) or if a file's syntax is invalid
           * @see {@link Root#loadSync}
           */
          function loadSync(filename, root) {
            if (!root) root = new protobuf.Root()
            return root.loadSync(filename)
          }

          protobuf.loadSync = loadSync

          // Serialization
          protobuf.encoder = require('./encoder')
          protobuf.decoder = require('./decoder')
          protobuf.verifier = require('./verifier')
          protobuf.converter = require('./converter')

          // Reflection
          protobuf.ReflectionObject = require('./object')
          protobuf.Namespace = require('./namespace')
          protobuf.Root = require('./root')
          protobuf.Enum = require('./enum')
          protobuf.Type = require('./type')
          protobuf.Field = require('./field')
          protobuf.OneOf = require('./oneof')
          protobuf.MapField = require('./mapfield')
          protobuf.Service = require('./service')
          protobuf.Method = require('./method')

          // Runtime
          protobuf.Message = require('./message')
          protobuf.wrappers = require('./wrappers')

          // Utility
          protobuf.types = require('./types')
          protobuf.util = require('./util')

          // Set up possibly cyclic reflection dependencies
          protobuf.ReflectionObject._configure(protobuf.Root)
          protobuf.Namespace._configure(
            protobuf.Type,
            protobuf.Service,
            protobuf.Enum
          )
          protobuf.Root._configure(protobuf.Type)
          protobuf.Field._configure(protobuf.Type)
        },
        {
          './converter': 24,
          './decoder': 25,
          './encoder': 26,
          './enum': 27,
          './field': 28,
          './index-minimal': 30,
          './mapfield': 31,
          './message': 32,
          './method': 33,
          './namespace': 34,
          './object': 35,
          './oneof': 36,
          './root': 39,
          './service': 43,
          './type': 44,
          './types': 45,
          './util': 46,
          './verifier': 49,
          './wrappers': 50
        }
      ],
      30: [
        function (require, module, exports) {
          'use strict'
          var protobuf = exports

          /**
           * Build type, one of `"full"`, `"light"` or `"minimal"`.
           * @name build
           * @type {string}
           * @const
           */
          protobuf.build = 'minimal'

          // Serialization
          protobuf.Writer = require('./writer')
          protobuf.BufferWriter = require('./writer_buffer')
          protobuf.Reader = require('./reader')
          protobuf.BufferReader = require('./reader_buffer')

          // Utility
          protobuf.util = require('./util/minimal')
          protobuf.rpc = require('./rpc')
          protobuf.roots = require('./roots')
          protobuf.configure = configure

          /* istanbul ignore next */
          /**
           * Reconfigures the library according to the environment.
           * @returns {undefined}
           */
          function configure() {
            protobuf.util._configure()
            protobuf.Writer._configure(protobuf.BufferWriter)
            protobuf.Reader._configure(protobuf.BufferReader)
          }

          // Set up buffer utility according to the environment
          configure()
        },
        {
          './reader': 37,
          './reader_buffer': 38,
          './roots': 40,
          './rpc': 41,
          './util/minimal': 48,
          './writer': 51,
          './writer_buffer': 52
        }
      ],
      31: [
        function (require, module, exports) {
          'use strict'
          module.exports = MapField

          // extends Field
          var Field = require('./field')
          ;((MapField.prototype = Object.create(Field.prototype)).constructor =
            MapField).className = 'MapField'

          var types = require('./types'),
            util = require('./util')

          /**
           * Constructs a new map field instance.
           * @classdesc Reflected map field.
           * @extends FieldBase
           * @constructor
           * @param {string} name Unique name within its namespace
           * @param {number} id Unique id within its namespace
           * @param {string} keyType Key type
           * @param {string} type Value type
           * @param {Object.<string,*>} [options] Declared options
           * @param {string} [comment] Comment associated with this field
           */
          function MapField(name, id, keyType, type, options, comment) {
            Field.call(
              this,
              name,
              id,
              type,
              undefined,
              undefined,
              options,
              comment
            )

            /* istanbul ignore if */
            if (!util.isString(keyType))
              throw TypeError('keyType must be a string')

            /**
             * Key type.
             * @type {string}
             */
            this.keyType = keyType // toJSON, marker

            /**
             * Resolved key type if not a basic type.
             * @type {ReflectionObject|null}
             */
            this.resolvedKeyType = null

            // Overrides Field#map
            this.map = true
          }

          /**
           * Map field descriptor.
           * @interface IMapField
           * @extends {IField}
           * @property {string} keyType Key type
           */

          /**
           * Extension map field descriptor.
           * @interface IExtensionMapField
           * @extends IMapField
           * @property {string} extend Extended type
           */

          /**
           * Constructs a map field from a map field descriptor.
           * @param {string} name Field name
           * @param {IMapField} json Map field descriptor
           * @returns {MapField} Created map field
           * @throws {TypeError} If arguments are invalid
           */
          MapField.fromJSON = function fromJSON(name, json) {
            return new MapField(
              name,
              json.id,
              json.keyType,
              json.type,
              json.options,
              json.comment
            )
          }

          /**
           * Converts this map field to a map field descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IMapField} Map field descriptor
           */
          MapField.prototype.toJSON = function toJSON(toJSONOptions) {
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'keyType',
              this.keyType,
              'type',
              this.type,
              'id',
              this.id,
              'extend',
              this.extend,
              'options',
              this.options,
              'comment',
              keepComments ? this.comment : undefined
            ])
          }

          /**
           * @override
           */
          MapField.prototype.resolve = function resolve() {
            if (this.resolved) return this

            // Besides a value type, map fields have a key type that may be "any scalar type except for floating point types and bytes"
            if (types.mapKey[this.keyType] === undefined)
              throw Error('invalid key type: ' + this.keyType)

            return Field.prototype.resolve.call(this)
          }

          /**
           * Map field decorator (TypeScript).
           * @name MapField.d
           * @function
           * @param {number} fieldId Field id
           * @param {"int32"|"uint32"|"sint32"|"fixed32"|"sfixed32"|"int64"|"uint64"|"sint64"|"fixed64"|"sfixed64"|"bool"|"string"} fieldKeyType Field key type
           * @param {"double"|"float"|"int32"|"uint32"|"sint32"|"fixed32"|"sfixed32"|"int64"|"uint64"|"sint64"|"fixed64"|"sfixed64"|"bool"|"string"|"bytes"|Object|Constructor<{}>} fieldValueType Field value type
           * @returns {FieldDecorator} Decorator function
           * @template T extends { [key: string]: number | Long | string | boolean | Uint8Array | Buffer | number[] | Message<{}> }
           */
          MapField.d = function decorateMapField(
            fieldId,
            fieldKeyType,
            fieldValueType
          ) {
            // submessage value: decorate the submessage and use its name as the type
            if (typeof fieldValueType === 'function')
              fieldValueType = util.decorateType(fieldValueType).name
            // enum reference value: create a reflected copy of the enum and keep reuseing it
            else if (fieldValueType && typeof fieldValueType === 'object')
              fieldValueType = util.decorateEnum(fieldValueType).name

            return function mapFieldDecorator(prototype, fieldName) {
              util
                .decorateType(prototype.constructor)
                .add(
                  new MapField(fieldName, fieldId, fieldKeyType, fieldValueType)
                )
            }
          }
        },
        {'./field': 28, './types': 45, './util': 46}
      ],
      32: [
        function (require, module, exports) {
          'use strict'
          module.exports = Message

          var util = require('./util/minimal')

          /**
           * Constructs a new message instance.
           * @classdesc Abstract runtime message.
           * @constructor
           * @param {Properties<T>} [properties] Properties to set
           * @template T extends object = object
           */
          function Message(properties) {
            // not used internally
            if (properties)
              for (
                var keys = Object.keys(properties), i = 0;
                i < keys.length;
                ++i
              )
                this[keys[i]] = properties[keys[i]]
          }

          /**
           * Reference to the reflected type.
           * @name Message.$type
           * @type {Type}
           * @readonly
           */

          /**
           * Reference to the reflected type.
           * @name Message#$type
           * @type {Type}
           * @readonly
           */

          /*eslint-disable valid-jsdoc*/

          /**
           * Creates a new message of this type using the specified properties.
           * @param {Object.<string,*>} [properties] Properties to set
           * @returns {Message<T>} Message instance
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.create = function create(properties) {
            return this.$type.create(properties)
          }

          /**
           * Encodes a message of this type.
           * @param {T|Object.<string,*>} message Message to encode
           * @param {Writer} [writer] Writer to use
           * @returns {Writer} Writer
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.encode = function encode(message, writer) {
            return this.$type.encode(message, writer)
          }

          /**
           * Encodes a message of this type preceeded by its length as a varint.
           * @param {T|Object.<string,*>} message Message to encode
           * @param {Writer} [writer] Writer to use
           * @returns {Writer} Writer
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.$type.encodeDelimited(message, writer)
          }

          /**
           * Decodes a message of this type.
           * @name Message.decode
           * @function
           * @param {Reader|Uint8Array} reader Reader or buffer to decode
           * @returns {T} Decoded message
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.decode = function decode(reader) {
            return this.$type.decode(reader)
          }

          /**
           * Decodes a message of this type preceeded by its length as a varint.
           * @name Message.decodeDelimited
           * @function
           * @param {Reader|Uint8Array} reader Reader or buffer to decode
           * @returns {T} Decoded message
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.decodeDelimited = function decodeDelimited(reader) {
            return this.$type.decodeDelimited(reader)
          }

          /**
           * Verifies a message of this type.
           * @name Message.verify
           * @function
           * @param {Object.<string,*>} message Plain object to verify
           * @returns {string|null} `null` if valid, otherwise the reason why it is not
           */
          Message.verify = function verify(message) {
            return this.$type.verify(message)
          }

          /**
           * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
           * @param {Object.<string,*>} object Plain object
           * @returns {T} Message instance
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.fromObject = function fromObject(object) {
            return this.$type.fromObject(object)
          }

          /**
           * Creates a plain object from a message of this type. Also converts values to other types if specified.
           * @param {T} message Message instance
           * @param {IConversionOptions} [options] Conversion options
           * @returns {Object.<string,*>} Plain object
           * @template T extends Message<T>
           * @this Constructor<T>
           */
          Message.toObject = function toObject(message, options) {
            return this.$type.toObject(message, options)
          }

          /**
           * Converts this message to JSON.
           * @returns {Object.<string,*>} JSON object
           */
          Message.prototype.toJSON = function toJSON() {
            return this.$type.toObject(this, util.toJSONOptions)
          }

          /*eslint-enable valid-jsdoc*/
        },
        {'./util/minimal': 48}
      ],
      33: [
        function (require, module, exports) {
          'use strict'
          module.exports = Method

          // extends ReflectionObject
          var ReflectionObject = require('./object')
          ;((Method.prototype = Object.create(
            ReflectionObject.prototype
          )).constructor = Method).className = 'Method'

          var util = require('./util')

          /**
           * Constructs a new service method instance.
           * @classdesc Reflected service method.
           * @extends ReflectionObject
           * @constructor
           * @param {string} name Method name
           * @param {string|undefined} type Method type, usually `"rpc"`
           * @param {string} requestType Request message type
           * @param {string} responseType Response message type
           * @param {boolean|Object.<string,*>} [requestStream] Whether the request is streamed
           * @param {boolean|Object.<string,*>} [responseStream] Whether the response is streamed
           * @param {Object.<string,*>} [options] Declared options
           * @param {string} [comment] The comment for this method
           * @param {Object.<string,*>} [parsedOptions] Declared options, properly parsed into an object
           */
          function Method(
            name,
            type,
            requestType,
            responseType,
            requestStream,
            responseStream,
            options,
            comment,
            parsedOptions
          ) {
            /* istanbul ignore next */
            if (util.isObject(requestStream)) {
              options = requestStream
              requestStream = responseStream = undefined
            } else if (util.isObject(responseStream)) {
              options = responseStream
              responseStream = undefined
            }

            /* istanbul ignore if */
            if (!(type === undefined || util.isString(type)))
              throw TypeError('type must be a string')

            /* istanbul ignore if */
            if (!util.isString(requestType))
              throw TypeError('requestType must be a string')

            /* istanbul ignore if */
            if (!util.isString(responseType))
              throw TypeError('responseType must be a string')

            ReflectionObject.call(this, name, options)

            /**
             * Method type.
             * @type {string}
             */
            this.type = type || 'rpc' // toJSON

            /**
             * Request type.
             * @type {string}
             */
            this.requestType = requestType // toJSON, marker

            /**
             * Whether requests are streamed or not.
             * @type {boolean|undefined}
             */
            this.requestStream = requestStream ? true : undefined // toJSON

            /**
             * Response type.
             * @type {string}
             */
            this.responseType = responseType // toJSON

            /**
             * Whether responses are streamed or not.
             * @type {boolean|undefined}
             */
            this.responseStream = responseStream ? true : undefined // toJSON

            /**
             * Resolved request type.
             * @type {Type|null}
             */
            this.resolvedRequestType = null

            /**
             * Resolved response type.
             * @type {Type|null}
             */
            this.resolvedResponseType = null

            /**
             * Comment for this method
             * @type {string|null}
             */
            this.comment = comment

            /**
             * Options properly parsed into an object
             */
            this.parsedOptions = parsedOptions
          }

          /**
           * Method descriptor.
           * @interface IMethod
           * @property {string} [type="rpc"] Method type
           * @property {string} requestType Request type
           * @property {string} responseType Response type
           * @property {boolean} [requestStream=false] Whether requests are streamed
           * @property {boolean} [responseStream=false] Whether responses are streamed
           * @property {Object.<string,*>} [options] Method options
           * @property {string} comment Method comments
           * @property {Object.<string,*>} [parsedOptions] Method options properly parsed into an object
           */

          /**
           * Constructs a method from a method descriptor.
           * @param {string} name Method name
           * @param {IMethod} json Method descriptor
           * @returns {Method} Created method
           * @throws {TypeError} If arguments are invalid
           */
          Method.fromJSON = function fromJSON(name, json) {
            return new Method(
              name,
              json.type,
              json.requestType,
              json.responseType,
              json.requestStream,
              json.responseStream,
              json.options,
              json.comment,
              json.parsedOptions
            )
          }

          /**
           * Converts this method to a method descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IMethod} Method descriptor
           */
          Method.prototype.toJSON = function toJSON(toJSONOptions) {
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'type',
              (this.type !== 'rpc' && /* istanbul ignore next */ this.type) ||
                undefined,
              'requestType',
              this.requestType,
              'requestStream',
              this.requestStream,
              'responseType',
              this.responseType,
              'responseStream',
              this.responseStream,
              'options',
              this.options,
              'comment',
              keepComments ? this.comment : undefined,
              'parsedOptions',
              this.parsedOptions
            ])
          }

          /**
           * @override
           */
          Method.prototype.resolve = function resolve() {
            /* istanbul ignore if */
            if (this.resolved) return this

            this.resolvedRequestType = this.parent.lookupType(this.requestType)
            this.resolvedResponseType = this.parent.lookupType(
              this.responseType
            )

            return ReflectionObject.prototype.resolve.call(this)
          }
        },
        {'./object': 35, './util': 46}
      ],
      34: [
        function (require, module, exports) {
          'use strict'
          module.exports = Namespace

          // extends ReflectionObject
          var ReflectionObject = require('./object')
          ;((Namespace.prototype = Object.create(
            ReflectionObject.prototype
          )).constructor = Namespace).className = 'Namespace'

          var Field = require('./field'),
            OneOf = require('./oneof'),
            util = require('./util')

          var Type, // cyclic
            Service,
            Enum

          /**
           * Constructs a new namespace instance.
           * @name Namespace
           * @classdesc Reflected namespace.
           * @extends NamespaceBase
           * @constructor
           * @param {string} name Namespace name
           * @param {Object.<string,*>} [options] Declared options
           */

          /**
           * Constructs a namespace from JSON.
           * @memberof Namespace
           * @function
           * @param {string} name Namespace name
           * @param {Object.<string,*>} json JSON object
           * @returns {Namespace} Created namespace
           * @throws {TypeError} If arguments are invalid
           */
          Namespace.fromJSON = function fromJSON(name, json) {
            return new Namespace(name, json.options).addJSON(json.nested)
          }

          /**
           * Converts an array of reflection objects to JSON.
           * @memberof Namespace
           * @param {ReflectionObject[]} array Object array
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {Object.<string,*>|undefined} JSON object or `undefined` when array is empty
           */
          function arrayToJSON(array, toJSONOptions) {
            if (!(array && array.length)) return undefined
            var obj = {}
            for (var i = 0; i < array.length; ++i)
              obj[array[i].name] = array[i].toJSON(toJSONOptions)
            return obj
          }

          Namespace.arrayToJSON = arrayToJSON

          /**
           * Tests if the specified id is reserved.
           * @param {Array.<number[]|string>|undefined} reserved Array of reserved ranges and names
           * @param {number} id Id to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          Namespace.isReservedId = function isReservedId(reserved, id) {
            if (reserved)
              for (var i = 0; i < reserved.length; ++i)
                if (
                  typeof reserved[i] !== 'string' &&
                  reserved[i][0] <= id &&
                  reserved[i][1] > id
                )
                  return true
            return false
          }

          /**
           * Tests if the specified name is reserved.
           * @param {Array.<number[]|string>|undefined} reserved Array of reserved ranges and names
           * @param {string} name Name to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          Namespace.isReservedName = function isReservedName(reserved, name) {
            if (reserved)
              for (var i = 0; i < reserved.length; ++i)
                if (reserved[i] === name) return true
            return false
          }

          /**
           * Not an actual constructor. Use {@link Namespace} instead.
           * @classdesc Base class of all reflection objects containing nested objects. This is not an actual class but here for the sake of having consistent type definitions.
           * @exports NamespaceBase
           * @extends ReflectionObject
           * @abstract
           * @constructor
           * @param {string} name Namespace name
           * @param {Object.<string,*>} [options] Declared options
           * @see {@link Namespace}
           */
          function Namespace(name, options) {
            ReflectionObject.call(this, name, options)

            /**
             * Nested objects by name.
             * @type {Object.<string,ReflectionObject>|undefined}
             */
            this.nested = undefined // toJSON

            /**
             * Cached nested objects as an array.
             * @type {ReflectionObject[]|null}
             * @private
             */
            this._nestedArray = null
          }

          function clearCache(namespace) {
            namespace._nestedArray = null
            return namespace
          }

          /**
           * Nested objects of this namespace as an array for iteration.
           * @name NamespaceBase#nestedArray
           * @type {ReflectionObject[]}
           * @readonly
           */
          Object.defineProperty(Namespace.prototype, 'nestedArray', {
            get: function () {
              return (
                this._nestedArray ||
                (this._nestedArray = util.toArray(this.nested))
              )
            }
          })

          /**
           * Namespace descriptor.
           * @interface INamespace
           * @property {Object.<string,*>} [options] Namespace options
           * @property {Object.<string,AnyNestedObject>} [nested] Nested object descriptors
           */

          /**
           * Any extension field descriptor.
           * @typedef AnyExtensionField
           * @type {IExtensionField|IExtensionMapField}
           */

          /**
           * Any nested object descriptor.
           * @typedef AnyNestedObject
           * @type {IEnum|IType|IService|AnyExtensionField|INamespace}
           */
          // ^ BEWARE: VSCode hangs forever when using more than 5 types (that's why AnyExtensionField exists in the first place)

          /**
           * Converts this namespace to a namespace descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {INamespace} Namespace descriptor
           */
          Namespace.prototype.toJSON = function toJSON(toJSONOptions) {
            return util.toObject([
              'options',
              this.options,
              'nested',
              arrayToJSON(this.nestedArray, toJSONOptions)
            ])
          }

          /**
           * Adds nested objects to this namespace from nested object descriptors.
           * @param {Object.<string,AnyNestedObject>} nestedJson Any nested object descriptors
           * @returns {Namespace} `this`
           */
          Namespace.prototype.addJSON = function addJSON(nestedJson) {
            var ns = this
            /* istanbul ignore else */
            if (nestedJson) {
              for (
                var names = Object.keys(nestedJson), i = 0, nested;
                i < names.length;
                ++i
              ) {
                nested = nestedJson[names[i]]
                ns.add(
                  // most to least likely
                  (nested.fields !== undefined
                    ? Type.fromJSON
                    : nested.values !== undefined
                    ? Enum.fromJSON
                    : nested.methods !== undefined
                    ? Service.fromJSON
                    : nested.id !== undefined
                    ? Field.fromJSON
                    : Namespace.fromJSON)(names[i], nested)
                )
              }
            }
            return this
          }

          /**
           * Gets the nested object of the specified name.
           * @param {string} name Nested object name
           * @returns {ReflectionObject|null} The reflection object or `null` if it doesn't exist
           */
          Namespace.prototype.get = function get(name) {
            return (this.nested && this.nested[name]) || null
          }

          /**
           * Gets the values of the nested {@link Enum|enum} of the specified name.
           * This methods differs from {@link Namespace#get|get} in that it returns an enum's values directly and throws instead of returning `null`.
           * @param {string} name Nested enum name
           * @returns {Object.<string,number>} Enum values
           * @throws {Error} If there is no such enum
           */
          Namespace.prototype.getEnum = function getEnum(name) {
            if (this.nested && this.nested[name] instanceof Enum)
              return this.nested[name].values
            throw Error('no such enum: ' + name)
          }

          /**
           * Adds a nested object to this namespace.
           * @param {ReflectionObject} object Nested object to add
           * @returns {Namespace} `this`
           * @throws {TypeError} If arguments are invalid
           * @throws {Error} If there is already a nested object with this name
           */
          Namespace.prototype.add = function add(object) {
            if (
              !(
                (object instanceof Field && object.extend !== undefined) ||
                object instanceof Type ||
                object instanceof Enum ||
                object instanceof Service ||
                object instanceof Namespace ||
                object instanceof OneOf
              )
            )
              throw TypeError('object must be a valid nested object')

            if (!this.nested) this.nested = {}
            else {
              var prev = this.get(object.name)
              if (prev) {
                if (
                  prev instanceof Namespace &&
                  object instanceof Namespace &&
                  !(prev instanceof Type || prev instanceof Service)
                ) {
                  // replace plain namespace but keep existing nested elements and options
                  var nested = prev.nestedArray
                  for (var i = 0; i < nested.length; ++i) object.add(nested[i])
                  this.remove(prev)
                  if (!this.nested) this.nested = {}
                  object.setOptions(prev.options, true)
                } else
                  throw Error("duplicate name '" + object.name + "' in " + this)
              }
            }
            this.nested[object.name] = object
            object.onAdd(this)
            return clearCache(this)
          }

          /**
           * Removes a nested object from this namespace.
           * @param {ReflectionObject} object Nested object to remove
           * @returns {Namespace} `this`
           * @throws {TypeError} If arguments are invalid
           * @throws {Error} If `object` is not a member of this namespace
           */
          Namespace.prototype.remove = function remove(object) {
            if (!(object instanceof ReflectionObject))
              throw TypeError('object must be a ReflectionObject')
            if (object.parent !== this)
              throw Error(object + ' is not a member of ' + this)

            delete this.nested[object.name]
            if (!Object.keys(this.nested).length) this.nested = undefined

            object.onRemove(this)
            return clearCache(this)
          }

          /**
           * Defines additial namespaces within this one if not yet existing.
           * @param {string|string[]} path Path to create
           * @param {*} [json] Nested types to create from JSON
           * @returns {Namespace} Pointer to the last namespace created or `this` if path is empty
           */
          Namespace.prototype.define = function define(path, json) {
            if (util.isString(path)) path = path.split('.')
            else if (!Array.isArray(path)) throw TypeError('illegal path')
            if (path && path.length && path[0] === '')
              throw Error('path must be relative')

            var ptr = this
            while (path.length > 0) {
              var part = path.shift()
              if (ptr.nested && ptr.nested[part]) {
                ptr = ptr.nested[part]
                if (!(ptr instanceof Namespace))
                  throw Error('path conflicts with non-namespace objects')
              } else ptr.add((ptr = new Namespace(part)))
            }
            if (json) ptr.addJSON(json)
            return ptr
          }

          /**
           * Resolves this namespace's and all its nested objects' type references. Useful to validate a reflection tree, but comes at a cost.
           * @returns {Namespace} `this`
           */
          Namespace.prototype.resolveAll = function resolveAll() {
            var nested = this.nestedArray,
              i = 0
            while (i < nested.length)
              if (nested[i] instanceof Namespace) nested[i++].resolveAll()
              else nested[i++].resolve()
            return this.resolve()
          }

          /**
           * Recursively looks up the reflection object matching the specified path in the scope of this namespace.
           * @param {string|string[]} path Path to look up
           * @param {*|Array.<*>} filterTypes Filter types, any combination of the constructors of `protobuf.Type`, `protobuf.Enum`, `protobuf.Service` etc.
           * @param {boolean} [parentAlreadyChecked=false] If known, whether the parent has already been checked
           * @returns {ReflectionObject|null} Looked up object or `null` if none could be found
           */
          Namespace.prototype.lookup = function lookup(
            path,
            filterTypes,
            parentAlreadyChecked
          ) {
            /* istanbul ignore next */
            if (typeof filterTypes === 'boolean') {
              parentAlreadyChecked = filterTypes
              filterTypes = undefined
            } else if (filterTypes && !Array.isArray(filterTypes))
              filterTypes = [filterTypes]

            if (util.isString(path) && path.length) {
              if (path === '.') return this.root
              path = path.split('.')
            } else if (!path.length) return this

            // Start at root if path is absolute
            if (path[0] === '')
              return this.root.lookup(path.slice(1), filterTypes)

            // Test if the first part matches any nested object, and if so, traverse if path contains more
            var found = this.get(path[0])
            if (found) {
              if (path.length === 1) {
                if (!filterTypes || filterTypes.indexOf(found.constructor) > -1)
                  return found
              } else if (
                found instanceof Namespace &&
                (found = found.lookup(path.slice(1), filterTypes, true))
              )
                return found

              // Otherwise try each nested namespace
            } else
              for (var i = 0; i < this.nestedArray.length; ++i)
                if (
                  this._nestedArray[i] instanceof Namespace &&
                  (found = this._nestedArray[i].lookup(path, filterTypes, true))
                )
                  return found

            // If there hasn't been a match, try again at the parent
            if (this.parent === null || parentAlreadyChecked) return null
            return this.parent.lookup(path, filterTypes)
          }

          /**
           * Looks up the reflection object at the specified path, relative to this namespace.
           * @name NamespaceBase#lookup
           * @function
           * @param {string|string[]} path Path to look up
           * @param {boolean} [parentAlreadyChecked=false] Whether the parent has already been checked
           * @returns {ReflectionObject|null} Looked up object or `null` if none could be found
           * @variation 2
           */
          // lookup(path: string, [parentAlreadyChecked: boolean])

          /**
           * Looks up the {@link Type|type} at the specified path, relative to this namespace.
           * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
           * @param {string|string[]} path Path to look up
           * @returns {Type} Looked up type
           * @throws {Error} If `path` does not point to a type
           */
          Namespace.prototype.lookupType = function lookupType(path) {
            var found = this.lookup(path, [Type])
            if (!found) throw Error('no such type: ' + path)
            return found
          }

          /**
           * Looks up the values of the {@link Enum|enum} at the specified path, relative to this namespace.
           * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
           * @param {string|string[]} path Path to look up
           * @returns {Enum} Looked up enum
           * @throws {Error} If `path` does not point to an enum
           */
          Namespace.prototype.lookupEnum = function lookupEnum(path) {
            var found = this.lookup(path, [Enum])
            if (!found) throw Error("no such Enum '" + path + "' in " + this)
            return found
          }

          /**
           * Looks up the {@link Type|type} or {@link Enum|enum} at the specified path, relative to this namespace.
           * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
           * @param {string|string[]} path Path to look up
           * @returns {Type} Looked up type or enum
           * @throws {Error} If `path` does not point to a type or enum
           */
          Namespace.prototype.lookupTypeOrEnum = function lookupTypeOrEnum(
            path
          ) {
            var found = this.lookup(path, [Type, Enum])
            if (!found)
              throw Error("no such Type or Enum '" + path + "' in " + this)
            return found
          }

          /**
           * Looks up the {@link Service|service} at the specified path, relative to this namespace.
           * Besides its signature, this methods differs from {@link Namespace#lookup|lookup} in that it throws instead of returning `null`.
           * @param {string|string[]} path Path to look up
           * @returns {Service} Looked up service
           * @throws {Error} If `path` does not point to a service
           */
          Namespace.prototype.lookupService = function lookupService(path) {
            var found = this.lookup(path, [Service])
            if (!found) throw Error("no such Service '" + path + "' in " + this)
            return found
          }

          // Sets up cyclic dependencies (called in index-light)
          Namespace._configure = function (Type_, Service_, Enum_) {
            Type = Type_
            Service = Service_
            Enum = Enum_
          }
        },
        {'./field': 28, './object': 35, './oneof': 36, './util': 46}
      ],
      35: [
        function (require, module, exports) {
          'use strict'
          module.exports = ReflectionObject

          ReflectionObject.className = 'ReflectionObject'

          var util = require('./util')

          var Root // cyclic

          /**
           * Constructs a new reflection object instance.
           * @classdesc Base class of all reflection objects.
           * @constructor
           * @param {string} name Object name
           * @param {Object.<string,*>} [options] Declared options
           * @abstract
           */
          function ReflectionObject(name, options) {
            if (!util.isString(name)) throw TypeError('name must be a string')

            if (options && !util.isObject(options))
              throw TypeError('options must be an object')

            /**
             * Options.
             * @type {Object.<string,*>|undefined}
             */
            this.options = options // toJSON

            /**
             * Parsed Options.
             * @type {Array.<Object.<string,*>>|undefined}
             */
            this.parsedOptions = null

            /**
             * Unique name within its namespace.
             * @type {string}
             */
            this.name = name

            /**
             * Parent namespace.
             * @type {Namespace|null}
             */
            this.parent = null

            /**
             * Whether already resolved or not.
             * @type {boolean}
             */
            this.resolved = false

            /**
             * Comment text, if any.
             * @type {string|null}
             */
            this.comment = null

            /**
             * Defining file name.
             * @type {string|null}
             */
            this.filename = null
          }

          Object.defineProperties(ReflectionObject.prototype, {
            /**
             * Reference to the root namespace.
             * @name ReflectionObject#root
             * @type {Root}
             * @readonly
             */
            root: {
              get: function () {
                var ptr = this
                while (ptr.parent !== null) ptr = ptr.parent
                return ptr
              }
            },

            /**
             * Full name including leading dot.
             * @name ReflectionObject#fullName
             * @type {string}
             * @readonly
             */
            fullName: {
              get: function () {
                var path = [this.name],
                  ptr = this.parent
                while (ptr) {
                  path.unshift(ptr.name)
                  ptr = ptr.parent
                }
                return path.join('.')
              }
            }
          })

          /**
           * Converts this reflection object to its descriptor representation.
           * @returns {Object.<string,*>} Descriptor
           * @abstract
           */
          ReflectionObject.prototype.toJSON =
            /* istanbul ignore next */ function toJSON() {
              throw Error() // not implemented, shouldn't happen
            }

          /**
           * Called when this object is added to a parent.
           * @param {ReflectionObject} parent Parent added to
           * @returns {undefined}
           */
          ReflectionObject.prototype.onAdd = function onAdd(parent) {
            if (this.parent && this.parent !== parent) this.parent.remove(this)
            this.parent = parent
            this.resolved = false
            var root = parent.root
            if (root instanceof Root) root._handleAdd(this)
          }

          /**
           * Called when this object is removed from a parent.
           * @param {ReflectionObject} parent Parent removed from
           * @returns {undefined}
           */
          ReflectionObject.prototype.onRemove = function onRemove(parent) {
            var root = parent.root
            if (root instanceof Root) root._handleRemove(this)
            this.parent = null
            this.resolved = false
          }

          /**
           * Resolves this objects type references.
           * @returns {ReflectionObject} `this`
           */
          ReflectionObject.prototype.resolve = function resolve() {
            if (this.resolved) return this
            if (this.root instanceof Root) this.resolved = true // only if part of a root
            return this
          }

          /**
           * Gets an option value.
           * @param {string} name Option name
           * @returns {*} Option value or `undefined` if not set
           */
          ReflectionObject.prototype.getOption = function getOption(name) {
            if (this.options) return this.options[name]
            return undefined
          }

          /**
           * Sets an option.
           * @param {string} name Option name
           * @param {*} value Option value
           * @param {boolean} [ifNotSet] Sets the option only if it isn't currently set
           * @returns {ReflectionObject} `this`
           */
          ReflectionObject.prototype.setOption = function setOption(
            name,
            value,
            ifNotSet
          ) {
            if (!ifNotSet || !this.options || this.options[name] === undefined)
              (this.options || (this.options = {}))[name] = value
            return this
          }

          /**
           * Sets a parsed option.
           * @param {string} name parsed Option name
           * @param {*} value Option value
           * @param {string} propName dot '.' delimited full path of property within the option to set. if undefined\empty, will add a new option with that value
           * @returns {ReflectionObject} `this`
           */
          ReflectionObject.prototype.setParsedOption = function setParsedOption(
            name,
            value,
            propName
          ) {
            if (!this.parsedOptions) {
              this.parsedOptions = []
            }
            var parsedOptions = this.parsedOptions
            if (propName) {
              // If setting a sub property of an option then try to merge it
              // with an existing option
              var opt = parsedOptions.find(function (opt) {
                return Object.prototype.hasOwnProperty.call(opt, name)
              })
              if (opt) {
                // If we found an existing option - just merge the property value
                var newValue = opt[name]
                util.setProperty(newValue, propName, value)
              } else {
                // otherwise, create a new option, set it's property and add it to the list
                opt = {}
                opt[name] = util.setProperty({}, propName, value)
                parsedOptions.push(opt)
              }
            } else {
              // Always create a new option when setting the value of the option itself
              var newOpt = {}
              newOpt[name] = value
              parsedOptions.push(newOpt)
            }
            return this
          }

          /**
           * Sets multiple options.
           * @param {Object.<string,*>} options Options to set
           * @param {boolean} [ifNotSet] Sets an option only if it isn't currently set
           * @returns {ReflectionObject} `this`
           */
          ReflectionObject.prototype.setOptions = function setOptions(
            options,
            ifNotSet
          ) {
            if (options)
              for (var keys = Object.keys(options), i = 0; i < keys.length; ++i)
                this.setOption(keys[i], options[keys[i]], ifNotSet)
            return this
          }

          /**
           * Converts this instance to its string representation.
           * @returns {string} Class name[, space, full name]
           */
          ReflectionObject.prototype.toString = function toString() {
            var className = this.constructor.className,
              fullName = this.fullName
            if (fullName.length) return className + ' ' + fullName
            return className
          }

          // Sets up cyclic dependencies (called in index-light)
          ReflectionObject._configure = function (Root_) {
            Root = Root_
          }
        },
        {'./util': 46}
      ],
      36: [
        function (require, module, exports) {
          'use strict'
          module.exports = OneOf

          // extends ReflectionObject
          var ReflectionObject = require('./object')
          ;((OneOf.prototype = Object.create(
            ReflectionObject.prototype
          )).constructor = OneOf).className = 'OneOf'

          var Field = require('./field'),
            util = require('./util')

          /**
           * Constructs a new oneof instance.
           * @classdesc Reflected oneof.
           * @extends ReflectionObject
           * @constructor
           * @param {string} name Oneof name
           * @param {string[]|Object.<string,*>} [fieldNames] Field names
           * @param {Object.<string,*>} [options] Declared options
           * @param {string} [comment] Comment associated with this field
           */
          function OneOf(name, fieldNames, options, comment) {
            if (!Array.isArray(fieldNames)) {
              options = fieldNames
              fieldNames = undefined
            }
            ReflectionObject.call(this, name, options)

            /* istanbul ignore if */
            if (!(fieldNames === undefined || Array.isArray(fieldNames)))
              throw TypeError('fieldNames must be an Array')

            /**
             * Field names that belong to this oneof.
             * @type {string[]}
             */
            this.oneof = fieldNames || [] // toJSON, marker

            /**
             * Fields that belong to this oneof as an array for iteration.
             * @type {Field[]}
             * @readonly
             */
            this.fieldsArray = [] // declared readonly for conformance, possibly not yet added to parent

            /**
             * Comment for this field.
             * @type {string|null}
             */
            this.comment = comment
          }

          /**
           * Oneof descriptor.
           * @interface IOneOf
           * @property {Array.<string>} oneof Oneof field names
           * @property {Object.<string,*>} [options] Oneof options
           */

          /**
           * Constructs a oneof from a oneof descriptor.
           * @param {string} name Oneof name
           * @param {IOneOf} json Oneof descriptor
           * @returns {OneOf} Created oneof
           * @throws {TypeError} If arguments are invalid
           */
          OneOf.fromJSON = function fromJSON(name, json) {
            return new OneOf(name, json.oneof, json.options, json.comment)
          }

          /**
           * Converts this oneof to a oneof descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IOneOf} Oneof descriptor
           */
          OneOf.prototype.toJSON = function toJSON(toJSONOptions) {
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'options',
              this.options,
              'oneof',
              this.oneof,
              'comment',
              keepComments ? this.comment : undefined
            ])
          }

          /**
           * Adds the fields of the specified oneof to the parent if not already done so.
           * @param {OneOf} oneof The oneof
           * @returns {undefined}
           * @inner
           * @ignore
           */
          function addFieldsToParent(oneof) {
            if (oneof.parent)
              for (var i = 0; i < oneof.fieldsArray.length; ++i)
                if (!oneof.fieldsArray[i].parent)
                  oneof.parent.add(oneof.fieldsArray[i])
          }

          /**
           * Adds a field to this oneof and removes it from its current parent, if any.
           * @param {Field} field Field to add
           * @returns {OneOf} `this`
           */
          OneOf.prototype.add = function add(field) {
            /* istanbul ignore if */
            if (!(field instanceof Field))
              throw TypeError('field must be a Field')

            if (field.parent && field.parent !== this.parent)
              field.parent.remove(field)
            this.oneof.push(field.name)
            this.fieldsArray.push(field)
            field.partOf = this // field.parent remains null
            addFieldsToParent(this)
            return this
          }

          /**
           * Removes a field from this oneof and puts it back to the oneof's parent.
           * @param {Field} field Field to remove
           * @returns {OneOf} `this`
           */
          OneOf.prototype.remove = function remove(field) {
            /* istanbul ignore if */
            if (!(field instanceof Field))
              throw TypeError('field must be a Field')

            var index = this.fieldsArray.indexOf(field)

            /* istanbul ignore if */
            if (index < 0) throw Error(field + ' is not a member of ' + this)

            this.fieldsArray.splice(index, 1)
            index = this.oneof.indexOf(field.name)

            /* istanbul ignore else */
            if (index > -1)
              // theoretical
              this.oneof.splice(index, 1)

            field.partOf = null
            return this
          }

          /**
           * @override
           */
          OneOf.prototype.onAdd = function onAdd(parent) {
            ReflectionObject.prototype.onAdd.call(this, parent)
            var self = this
            // Collect present fields
            for (var i = 0; i < this.oneof.length; ++i) {
              var field = parent.get(this.oneof[i])
              if (field && !field.partOf) {
                field.partOf = self
                self.fieldsArray.push(field)
              }
            }
            // Add not yet present fields
            addFieldsToParent(this)
          }

          /**
           * @override
           */
          OneOf.prototype.onRemove = function onRemove(parent) {
            for (var i = 0, field; i < this.fieldsArray.length; ++i)
              if ((field = this.fieldsArray[i]).parent)
                field.parent.remove(field)
            ReflectionObject.prototype.onRemove.call(this, parent)
          }

          /**
           * Decorator function as returned by {@link OneOf.d} (TypeScript).
           * @typedef OneOfDecorator
           * @type {function}
           * @param {Object} prototype Target prototype
           * @param {string} oneofName OneOf name
           * @returns {undefined}
           */

          /**
           * OneOf decorator (TypeScript).
           * @function
           * @param {...string} fieldNames Field names
           * @returns {OneOfDecorator} Decorator function
           * @template T extends string
           */
          OneOf.d = function decorateOneOf() {
            var fieldNames = new Array(arguments.length),
              index = 0
            while (index < arguments.length)
              fieldNames[index] = arguments[index++]
            return function oneOfDecorator(prototype, oneofName) {
              util
                .decorateType(prototype.constructor)
                .add(new OneOf(oneofName, fieldNames))
              Object.defineProperty(prototype, oneofName, {
                get: util.oneOfGetter(fieldNames),
                set: util.oneOfSetter(fieldNames)
              })
            }
          }
        },
        {'./field': 28, './object': 35, './util': 46}
      ],
      37: [
        function (require, module, exports) {
          'use strict'
          module.exports = Reader

          var util = require('./util/minimal')

          var BufferReader // cyclic

          var LongBits = util.LongBits,
            utf8 = util.utf8

          /* istanbul ignore next */
          function indexOutOfRange(reader, writeLength) {
            return RangeError(
              'index out of range: ' +
                reader.pos +
                ' + ' +
                (writeLength || 1) +
                ' > ' +
                reader.len
            )
          }

          /**
           * Constructs a new reader instance using the specified buffer.
           * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
           * @constructor
           * @param {Uint8Array} buffer Buffer to read from
           */
          function Reader(buffer) {
            /**
             * Read buffer.
             * @type {Uint8Array}
             */
            this.buf = buffer

            /**
             * Read buffer position.
             * @type {number}
             */
            this.pos = 0

            /**
             * Read buffer length.
             * @type {number}
             */
            this.len = buffer.length
          }

          var create_array =
            typeof Uint8Array !== 'undefined'
              ? function create_typed_array(buffer) {
                  if (buffer instanceof Uint8Array || Array.isArray(buffer))
                    return new Reader(buffer)
                  throw Error('illegal buffer')
                }
              : /* istanbul ignore next */
                function create_array(buffer) {
                  if (Array.isArray(buffer)) return new Reader(buffer)
                  throw Error('illegal buffer')
                }

          var create = function create() {
            return util.Buffer
              ? function create_buffer_setup(buffer) {
                  return (Reader.create = function create_buffer(buffer) {
                    return util.Buffer.isBuffer(buffer)
                      ? new BufferReader(buffer)
                      : /* istanbul ignore next */
                        create_array(buffer)
                  })(buffer)
                }
              : /* istanbul ignore next */
                create_array
          }

          /**
           * Creates a new reader using the specified buffer.
           * @function
           * @param {Uint8Array|Buffer} buffer Buffer to read from
           * @returns {Reader|BufferReader} A {@link BufferReader} if `buffer` is a Buffer, otherwise a {@link Reader}
           * @throws {Error} If `buffer` is not a valid buffer
           */
          Reader.create = create()

          Reader.prototype._slice =
            util.Array.prototype.subarray ||
            /* istanbul ignore next */ util.Array.prototype.slice

          /**
           * Reads a varint as an unsigned 32 bit value.
           * @function
           * @returns {number} Value read
           */
          Reader.prototype.uint32 = (function read_uint32_setup() {
            var value = 4294967295 // optimizer type-hint, tends to deopt otherwise (?!)
            return function read_uint32() {
              value = (this.buf[this.pos] & 127) >>> 0
              if (this.buf[this.pos++] < 128) return value
              value = (value | ((this.buf[this.pos] & 127) << 7)) >>> 0
              if (this.buf[this.pos++] < 128) return value
              value = (value | ((this.buf[this.pos] & 127) << 14)) >>> 0
              if (this.buf[this.pos++] < 128) return value
              value = (value | ((this.buf[this.pos] & 127) << 21)) >>> 0
              if (this.buf[this.pos++] < 128) return value
              value = (value | ((this.buf[this.pos] & 15) << 28)) >>> 0
              if (this.buf[this.pos++] < 128) return value

              /* istanbul ignore if */
              if ((this.pos += 5) > this.len) {
                this.pos = this.len
                throw indexOutOfRange(this, 10)
              }
              return value
            }
          })()

          /**
           * Reads a varint as a signed 32 bit value.
           * @returns {number} Value read
           */
          Reader.prototype.int32 = function read_int32() {
            return this.uint32() | 0
          }

          /**
           * Reads a zig-zag encoded varint as a signed 32 bit value.
           * @returns {number} Value read
           */
          Reader.prototype.sint32 = function read_sint32() {
            var value = this.uint32()
            return ((value >>> 1) ^ -(value & 1)) | 0
          }

          /* eslint-disable no-invalid-this */

          function readLongVarint() {
            // tends to deopt with local vars for octet etc.
            var bits = new LongBits(0, 0)
            var i = 0
            if (this.len - this.pos > 4) {
              // fast route (lo)
              for (; i < 4; ++i) {
                // 1st..4th
                bits.lo =
                  (bits.lo | ((this.buf[this.pos] & 127) << (i * 7))) >>> 0
                if (this.buf[this.pos++] < 128) return bits
              }
              // 5th
              bits.lo = (bits.lo | ((this.buf[this.pos] & 127) << 28)) >>> 0
              bits.hi = (bits.hi | ((this.buf[this.pos] & 127) >> 4)) >>> 0
              if (this.buf[this.pos++] < 128) return bits
              i = 0
            } else {
              for (; i < 3; ++i) {
                /* istanbul ignore if */
                if (this.pos >= this.len) throw indexOutOfRange(this)
                // 1st..3th
                bits.lo =
                  (bits.lo | ((this.buf[this.pos] & 127) << (i * 7))) >>> 0
                if (this.buf[this.pos++] < 128) return bits
              }
              // 4th
              bits.lo =
                (bits.lo | ((this.buf[this.pos++] & 127) << (i * 7))) >>> 0
              return bits
            }
            if (this.len - this.pos > 4) {
              // fast route (hi)
              for (; i < 5; ++i) {
                // 6th..10th
                bits.hi =
                  (bits.hi | ((this.buf[this.pos] & 127) << (i * 7 + 3))) >>> 0
                if (this.buf[this.pos++] < 128) return bits
              }
            } else {
              for (; i < 5; ++i) {
                /* istanbul ignore if */
                if (this.pos >= this.len) throw indexOutOfRange(this)
                // 6th..10th
                bits.hi =
                  (bits.hi | ((this.buf[this.pos] & 127) << (i * 7 + 3))) >>> 0
                if (this.buf[this.pos++] < 128) return bits
              }
            }
            /* istanbul ignore next */
            throw Error('invalid varint encoding')
          }

          /* eslint-enable no-invalid-this */

          /**
           * Reads a varint as a signed 64 bit value.
           * @name Reader#int64
           * @function
           * @returns {Long} Value read
           */

          /**
           * Reads a varint as an unsigned 64 bit value.
           * @name Reader#uint64
           * @function
           * @returns {Long} Value read
           */

          /**
           * Reads a zig-zag encoded varint as a signed 64 bit value.
           * @name Reader#sint64
           * @function
           * @returns {Long} Value read
           */

          /**
           * Reads a varint as a boolean.
           * @returns {boolean} Value read
           */
          Reader.prototype.bool = function read_bool() {
            return this.uint32() !== 0
          }

          function readFixed32_end(buf, end) {
            // note that this uses `end`, not `pos`
            return (
              (buf[end - 4] |
                (buf[end - 3] << 8) |
                (buf[end - 2] << 16) |
                (buf[end - 1] << 24)) >>>
              0
            )
          }

          /**
           * Reads fixed 32 bits as an unsigned 32 bit integer.
           * @returns {number} Value read
           */
          Reader.prototype.fixed32 = function read_fixed32() {
            /* istanbul ignore if */
            if (this.pos + 4 > this.len) throw indexOutOfRange(this, 4)

            return readFixed32_end(this.buf, (this.pos += 4))
          }

          /**
           * Reads fixed 32 bits as a signed 32 bit integer.
           * @returns {number} Value read
           */
          Reader.prototype.sfixed32 = function read_sfixed32() {
            /* istanbul ignore if */
            if (this.pos + 4 > this.len) throw indexOutOfRange(this, 4)

            return readFixed32_end(this.buf, (this.pos += 4)) | 0
          }

          /* eslint-disable no-invalid-this */

          function readFixed64(/* this: Reader */) {
            /* istanbul ignore if */
            if (this.pos + 8 > this.len) throw indexOutOfRange(this, 8)

            return new LongBits(
              readFixed32_end(this.buf, (this.pos += 4)),
              readFixed32_end(this.buf, (this.pos += 4))
            )
          }

          /* eslint-enable no-invalid-this */

          /**
           * Reads fixed 64 bits.
           * @name Reader#fixed64
           * @function
           * @returns {Long} Value read
           */

          /**
           * Reads zig-zag encoded fixed 64 bits.
           * @name Reader#sfixed64
           * @function
           * @returns {Long} Value read
           */

          /**
           * Reads a float (32 bit) as a number.
           * @function
           * @returns {number} Value read
           */
          Reader.prototype.float = function read_float() {
            /* istanbul ignore if */
            if (this.pos + 4 > this.len) throw indexOutOfRange(this, 4)

            var value = util.float.readFloatLE(this.buf, this.pos)
            this.pos += 4
            return value
          }

          /**
           * Reads a double (64 bit float) as a number.
           * @function
           * @returns {number} Value read
           */
          Reader.prototype.double = function read_double() {
            /* istanbul ignore if */
            if (this.pos + 8 > this.len) throw indexOutOfRange(this, 4)

            var value = util.float.readDoubleLE(this.buf, this.pos)
            this.pos += 8
            return value
          }

          /**
           * Reads a sequence of bytes preceeded by its length as a varint.
           * @returns {Uint8Array} Value read
           */
          Reader.prototype.bytes = function read_bytes() {
            var length = this.uint32(),
              start = this.pos,
              end = this.pos + length

            /* istanbul ignore if */
            if (end > this.len) throw indexOutOfRange(this, length)

            this.pos += length
            if (Array.isArray(this.buf))
              // plain array
              return this.buf.slice(start, end)
            return start === end // fix for IE 10/Win8 and others' subarray returning array of size 1
              ? new this.buf.constructor(0)
              : this._slice.call(this.buf, start, end)
          }

          /**
           * Reads a string preceeded by its byte length as a varint.
           * @returns {string} Value read
           */
          Reader.prototype.string = function read_string() {
            var bytes = this.bytes()
            return utf8.read(bytes, 0, bytes.length)
          }

          /**
           * Skips the specified number of bytes if specified, otherwise skips a varint.
           * @param {number} [length] Length if known, otherwise a varint is assumed
           * @returns {Reader} `this`
           */
          Reader.prototype.skip = function skip(length) {
            if (typeof length === 'number') {
              /* istanbul ignore if */
              if (this.pos + length > this.len)
                throw indexOutOfRange(this, length)
              this.pos += length
            } else {
              do {
                /* istanbul ignore if */
                if (this.pos >= this.len) throw indexOutOfRange(this)
              } while (this.buf[this.pos++] & 128)
            }
            return this
          }

          /**
           * Skips the next element of the specified wire type.
           * @param {number} wireType Wire type received
           * @returns {Reader} `this`
           */
          Reader.prototype.skipType = function (wireType) {
            switch (wireType) {
              case 0:
                this.skip()
                break
              case 1:
                this.skip(8)
                break
              case 2:
                this.skip(this.uint32())
                break
              case 3:
                while ((wireType = this.uint32() & 7) !== 4) {
                  this.skipType(wireType)
                }
                break
              case 5:
                this.skip(4)
                break

              /* istanbul ignore next */
              default:
                throw Error(
                  'invalid wire type ' + wireType + ' at offset ' + this.pos
                )
            }
            return this
          }

          Reader._configure = function (BufferReader_) {
            BufferReader = BufferReader_
            Reader.create = create()
            BufferReader._configure()

            var fn = util.Long
              ? 'toLong'
              : /* istanbul ignore next */ 'toNumber'
            util.merge(Reader.prototype, {
              int64: function read_int64() {
                return readLongVarint.call(this)[fn](false)
              },

              uint64: function read_uint64() {
                return readLongVarint.call(this)[fn](true)
              },

              sint64: function read_sint64() {
                return readLongVarint.call(this).zzDecode()[fn](false)
              },

              fixed64: function read_fixed64() {
                return readFixed64.call(this)[fn](true)
              },

              sfixed64: function read_sfixed64() {
                return readFixed64.call(this)[fn](false)
              }
            })
          }
        },
        {'./util/minimal': 48}
      ],
      38: [
        function (require, module, exports) {
          'use strict'
          module.exports = BufferReader

          // extends Reader
          var Reader = require('./reader')
          ;(BufferReader.prototype = Object.create(
            Reader.prototype
          )).constructor = BufferReader

          var util = require('./util/minimal')

          /**
           * Constructs a new buffer reader instance.
           * @classdesc Wire format reader using node buffers.
           * @extends Reader
           * @constructor
           * @param {Buffer} buffer Buffer to read from
           */
          function BufferReader(buffer) {
            Reader.call(this, buffer)

            /**
             * Read buffer.
             * @name BufferReader#buf
             * @type {Buffer}
             */
          }

          BufferReader._configure = function () {
            /* istanbul ignore else */
            if (util.Buffer)
              BufferReader.prototype._slice = util.Buffer.prototype.slice
          }

          /**
           * @override
           */
          BufferReader.prototype.string = function read_string_buffer() {
            var len = this.uint32() // modifies pos
            return this.buf.utf8Slice
              ? this.buf.utf8Slice(
                  this.pos,
                  (this.pos = Math.min(this.pos + len, this.len))
                )
              : this.buf.toString(
                  'utf-8',
                  this.pos,
                  (this.pos = Math.min(this.pos + len, this.len))
                )
          }

          /**
           * Reads a sequence of bytes preceeded by its length as a varint.
           * @name BufferReader#bytes
           * @function
           * @returns {Buffer} Value read
           */

          BufferReader._configure()
        },
        {'./reader': 37, './util/minimal': 48}
      ],
      39: [
        function (require, module, exports) {
          'use strict'
          module.exports = Root

          // extends Namespace
          var Namespace = require('./namespace')
          ;((Root.prototype = Object.create(Namespace.prototype)).constructor =
            Root).className = 'Root'

          var Field = require('./field'),
            Enum = require('./enum'),
            OneOf = require('./oneof'),
            util = require('./util')

          var Type, // cyclic
            parse, // might be excluded
            common // "

          /**
           * Constructs a new root namespace instance.
           * @classdesc Root namespace wrapping all types, enums, services, sub-namespaces etc. that belong together.
           * @extends NamespaceBase
           * @constructor
           * @param {Object.<string,*>} [options] Top level options
           */
          function Root(options) {
            Namespace.call(this, '', options)

            /**
             * Deferred extension fields.
             * @type {Field[]}
             */
            this.deferred = []

            /**
             * Resolved file names of loaded files.
             * @type {string[]}
             */
            this.files = []
          }

          /**
           * Loads a namespace descriptor into a root namespace.
           * @param {INamespace} json Nameespace descriptor
           * @param {Root} [root] Root namespace, defaults to create a new one if omitted
           * @returns {Root} Root namespace
           */
          Root.fromJSON = function fromJSON(json, root) {
            if (!root) root = new Root()
            if (json.options) root.setOptions(json.options)
            return root.addJSON(json.nested)
          }

          /**
           * Resolves the path of an imported file, relative to the importing origin.
           * This method exists so you can override it with your own logic in case your imports are scattered over multiple directories.
           * @function
           * @param {string} origin The file name of the importing file
           * @param {string} target The file name being imported
           * @returns {string|null} Resolved path to `target` or `null` to skip the file
           */
          Root.prototype.resolvePath = util.path.resolve

          /**
           * Fetch content from file path or url
           * This method exists so you can override it with your own logic.
           * @function
           * @param {string} path File path or url
           * @param {FetchCallback} callback Callback function
           * @returns {undefined}
           */
          Root.prototype.fetch = util.fetch

          // A symbol-like function to safely signal synchronous loading
          /* istanbul ignore next */
          function SYNC() {} // eslint-disable-line no-empty-function

          /**
           * Loads one or multiple .proto or preprocessed .json files into this root namespace and calls the callback.
           * @param {string|string[]} filename Names of one or multiple files to load
           * @param {IParseOptions} options Parse options
           * @param {LoadCallback} callback Callback function
           * @returns {undefined}
           */
          Root.prototype.load = function load(filename, options, callback) {
            if (typeof options === 'function') {
              callback = options
              options = undefined
            }
            var self = this
            if (!callback) return util.asPromise(load, self, filename, options)

            var sync = callback === SYNC // undocumented

            // Finishes loading by calling the callback (exactly once)
            function finish(err, root) {
              /* istanbul ignore if */
              if (!callback) return
              var cb = callback
              callback = null
              if (sync) throw err
              cb(err, root)
            }

            // Bundled definition existence checking
            function getBundledFileName(filename) {
              var idx = filename.lastIndexOf('google/protobuf/')
              if (idx > -1) {
                var altname = filename.substring(idx)
                if (altname in common) return altname
              }
              return null
            }

            // Processes a single file
            function process(filename, source) {
              try {
                if (util.isString(source) && source.charAt(0) === '{')
                  source = JSON.parse(source)
                if (!util.isString(source))
                  self.setOptions(source.options).addJSON(source.nested)
                else {
                  parse.filename = filename
                  var parsed = parse(source, self, options),
                    resolved,
                    i = 0
                  if (parsed.imports)
                    for (; i < parsed.imports.length; ++i)
                      if (
                        (resolved =
                          getBundledFileName(parsed.imports[i]) ||
                          self.resolvePath(filename, parsed.imports[i]))
                      )
                        fetch(resolved)
                  if (parsed.weakImports)
                    for (i = 0; i < parsed.weakImports.length; ++i)
                      if (
                        (resolved =
                          getBundledFileName(parsed.weakImports[i]) ||
                          self.resolvePath(filename, parsed.weakImports[i]))
                      )
                        fetch(resolved, true)
                }
              } catch (err) {
                finish(err)
              }
              if (!sync && !queued) finish(null, self) // only once anyway
            }

            // Fetches a single file
            function fetch(filename, weak) {
              // Skip if already loaded / attempted
              if (self.files.indexOf(filename) > -1) return
              self.files.push(filename)

              // Shortcut bundled definitions
              if (filename in common) {
                if (sync) process(filename, common[filename])
                else {
                  ++queued
                  setTimeout(function () {
                    --queued
                    process(filename, common[filename])
                  })
                }
                return
              }

              // Otherwise fetch from disk or network
              if (sync) {
                var source
                try {
                  source = util.fs.readFileSync(filename).toString('utf8')
                } catch (err) {
                  if (!weak) finish(err)
                  return
                }
                process(filename, source)
              } else {
                ++queued
                self.fetch(filename, function (err, source) {
                  --queued
                  /* istanbul ignore if */
                  if (!callback) return // terminated meanwhile
                  if (err) {
                    /* istanbul ignore else */
                    if (!weak) finish(err)
                    else if (!queued)
                      // can't be covered reliably
                      finish(null, self)
                    return
                  }
                  process(filename, source)
                })
              }
            }
            var queued = 0

            // Assembling the root namespace doesn't require working type
            // references anymore, so we can load everything in parallel
            if (util.isString(filename)) filename = [filename]
            for (var i = 0, resolved; i < filename.length; ++i)
              if ((resolved = self.resolvePath('', filename[i])))
                fetch(resolved)

            if (sync) return self
            if (!queued) finish(null, self)
            return undefined
          }
          // function load(filename:string, options:IParseOptions, callback:LoadCallback):undefined

          /**
           * Loads one or multiple .proto or preprocessed .json files into this root namespace and calls the callback.
           * @function Root#load
           * @param {string|string[]} filename Names of one or multiple files to load
           * @param {LoadCallback} callback Callback function
           * @returns {undefined}
           * @variation 2
           */
          // function load(filename:string, callback:LoadCallback):undefined

          /**
           * Loads one or multiple .proto or preprocessed .json files into this root namespace and returns a promise.
           * @function Root#load
           * @param {string|string[]} filename Names of one or multiple files to load
           * @param {IParseOptions} [options] Parse options. Defaults to {@link parse.defaults} when omitted.
           * @returns {Promise<Root>} Promise
           * @variation 3
           */
          // function load(filename:string, [options:IParseOptions]):Promise<Root>

          /**
           * Synchronously loads one or multiple .proto or preprocessed .json files into this root namespace (node only).
           * @function Root#loadSync
           * @param {string|string[]} filename Names of one or multiple files to load
           * @param {IParseOptions} [options] Parse options. Defaults to {@link parse.defaults} when omitted.
           * @returns {Root} Root namespace
           * @throws {Error} If synchronous fetching is not supported (i.e. in browsers) or if a file's syntax is invalid
           */
          Root.prototype.loadSync = function loadSync(filename, options) {
            if (!util.isNode) throw Error('not supported')
            return this.load(filename, options, SYNC)
          }

          /**
           * @override
           */
          Root.prototype.resolveAll = function resolveAll() {
            if (this.deferred.length)
              throw Error(
                'unresolvable extensions: ' +
                  this.deferred
                    .map(function (field) {
                      return (
                        "'extend " +
                        field.extend +
                        "' in " +
                        field.parent.fullName
                      )
                    })
                    .join(', ')
              )
            return Namespace.prototype.resolveAll.call(this)
          }

          // only uppercased (and thus conflict-free) children are exposed, see below
          var exposeRe = /^[A-Z]/

          /**
           * Handles a deferred declaring extension field by creating a sister field to represent it within its extended type.
           * @param {Root} root Root instance
           * @param {Field} field Declaring extension field witin the declaring type
           * @returns {boolean} `true` if successfully added to the extended type, `false` otherwise
           * @inner
           * @ignore
           */
          function tryHandleExtension(root, field) {
            var extendedType = field.parent.lookup(field.extend)
            if (extendedType) {
              var sisterField = new Field(
                field.fullName,
                field.id,
                field.type,
                field.rule,
                undefined,
                field.options
              )
              sisterField.declaringField = field
              field.extensionField = sisterField
              extendedType.add(sisterField)
              return true
            }
            return false
          }

          /**
           * Called when any object is added to this root or its sub-namespaces.
           * @param {ReflectionObject} object Object added
           * @returns {undefined}
           * @private
           */
          Root.prototype._handleAdd = function _handleAdd(object) {
            if (object instanceof Field) {
              if (
                /* an extension field (implies not part of a oneof) */ object.extend !==
                  undefined &&
                /* not already handled */ !object.extensionField
              )
                if (!tryHandleExtension(this, object))
                  this.deferred.push(object)
            } else if (object instanceof Enum) {
              if (exposeRe.test(object.name))
                object.parent[object.name] = object.values // expose enum values as property of its parent
            } else if (!(object instanceof OneOf)) {
              /* everything else is a namespace */ if (object instanceof Type)
                // Try to handle any deferred extensions
                for (var i = 0; i < this.deferred.length; )
                  if (tryHandleExtension(this, this.deferred[i]))
                    this.deferred.splice(i, 1)
                  else ++i
              for (
                var j = 0;
                j < /* initializes */ object.nestedArray.length;
                ++j // recurse into the namespace
              )
                this._handleAdd(object._nestedArray[j])
              if (exposeRe.test(object.name))
                object.parent[object.name] = object // expose namespace as property of its parent
            }

            // The above also adds uppercased (and thus conflict-free) nested types, services and enums as
            // properties of namespaces just like static code does. This allows using a .d.ts generated for
            // a static module with reflection-based solutions where the condition is met.
          }

          /**
           * Called when any object is removed from this root or its sub-namespaces.
           * @param {ReflectionObject} object Object removed
           * @returns {undefined}
           * @private
           */
          Root.prototype._handleRemove = function _handleRemove(object) {
            if (object instanceof Field) {
              if (/* an extension field */ object.extend !== undefined) {
                if (/* already handled */ object.extensionField) {
                  // remove its sister field
                  object.extensionField.parent.remove(object.extensionField)
                  object.extensionField = null
                } else {
                  // cancel the extension
                  var index = this.deferred.indexOf(object)
                  /* istanbul ignore else */
                  if (index > -1) this.deferred.splice(index, 1)
                }
              }
            } else if (object instanceof Enum) {
              if (exposeRe.test(object.name)) delete object.parent[object.name] // unexpose enum values
            } else if (object instanceof Namespace) {
              for (
                var i = 0;
                i < /* initializes */ object.nestedArray.length;
                ++i // recurse into the namespace
              )
                this._handleRemove(object._nestedArray[i])

              if (exposeRe.test(object.name)) delete object.parent[object.name] // unexpose namespaces
            }
          }

          // Sets up cyclic dependencies (called in index-light)
          Root._configure = function (Type_, parse_, common_) {
            Type = Type_
            parse = parse_
            common = common_
          }
        },
        {
          './enum': 27,
          './field': 28,
          './namespace': 34,
          './oneof': 36,
          './util': 46
        }
      ],
      40: [
        function (require, module, exports) {
          'use strict'
          module.exports = {}

          /**
           * Named roots.
           * This is where pbjs stores generated structures (the option `-r, --root` specifies a name).
           * Can also be used manually to make roots available accross modules.
           * @name roots
           * @type {Object.<string,Root>}
           * @example
           * // pbjs -r myroot -o compiled.js ...
           *
           * // in another module:
           * require("./compiled.js");
           *
           * // in any subsequent module:
           * var root = protobuf.roots["myroot"];
           */
        },
        {}
      ],
      41: [
        function (require, module, exports) {
          'use strict'

          /**
           * Streaming RPC helpers.
           * @namespace
           */
          var rpc = exports

          /**
           * RPC implementation passed to {@link Service#create} performing a service request on network level, i.e. by utilizing http requests or websockets.
           * @typedef RPCImpl
           * @type {function}
           * @param {Method|rpc.ServiceMethod<Message<{}>,Message<{}>>} method Reflected or static method being called
           * @param {Uint8Array} requestData Request data
           * @param {RPCImplCallback} callback Callback function
           * @returns {undefined}
           * @example
           * function rpcImpl(method, requestData, callback) {
           *     if (protobuf.util.lcFirst(method.name) !== "myMethod") // compatible with static code
           *         throw Error("no such method");
           *     asynchronouslyObtainAResponse(requestData, function(err, responseData) {
           *         callback(err, responseData);
           *     });
           * }
           */

          /**
           * Node-style callback as used by {@link RPCImpl}.
           * @typedef RPCImplCallback
           * @type {function}
           * @param {Error|null} error Error, if any, otherwise `null`
           * @param {Uint8Array|null} [response] Response data or `null` to signal end of stream, if there hasn't been an error
           * @returns {undefined}
           */

          rpc.Service = require('./rpc/service')
        },
        {'./rpc/service': 42}
      ],
      42: [
        function (require, module, exports) {
          'use strict'
          module.exports = Service

          var util = require('../util/minimal')

          // Extends EventEmitter
          ;(Service.prototype = Object.create(
            util.EventEmitter.prototype
          )).constructor = Service

          /**
           * A service method callback as used by {@link rpc.ServiceMethod|ServiceMethod}.
           *
           * Differs from {@link RPCImplCallback} in that it is an actual callback of a service method which may not return `response = null`.
           * @typedef rpc.ServiceMethodCallback
           * @template TRes extends Message<TRes>
           * @type {function}
           * @param {Error|null} error Error, if any
           * @param {TRes} [response] Response message
           * @returns {undefined}
           */

          /**
           * A service method part of a {@link rpc.Service} as created by {@link Service.create}.
           * @typedef rpc.ServiceMethod
           * @template TReq extends Message<TReq>
           * @template TRes extends Message<TRes>
           * @type {function}
           * @param {TReq|Properties<TReq>} request Request message or plain object
           * @param {rpc.ServiceMethodCallback<TRes>} [callback] Node-style callback called with the error, if any, and the response message
           * @returns {Promise<Message<TRes>>} Promise if `callback` has been omitted, otherwise `undefined`
           */

          /**
           * Constructs a new RPC service instance.
           * @classdesc An RPC service as returned by {@link Service#create}.
           * @exports rpc.Service
           * @extends util.EventEmitter
           * @constructor
           * @param {RPCImpl} rpcImpl RPC implementation
           * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
           * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
           */
          function Service(rpcImpl, requestDelimited, responseDelimited) {
            if (typeof rpcImpl !== 'function')
              throw TypeError('rpcImpl must be a function')

            util.EventEmitter.call(this)

            /**
             * RPC implementation. Becomes `null` once the service is ended.
             * @type {RPCImpl|null}
             */
            this.rpcImpl = rpcImpl

            /**
             * Whether requests are length-delimited.
             * @type {boolean}
             */
            this.requestDelimited = Boolean(requestDelimited)

            /**
             * Whether responses are length-delimited.
             * @type {boolean}
             */
            this.responseDelimited = Boolean(responseDelimited)
          }

          /**
           * Calls a service method through {@link rpc.Service#rpcImpl|rpcImpl}.
           * @param {Method|rpc.ServiceMethod<TReq,TRes>} method Reflected or static method
           * @param {Constructor<TReq>} requestCtor Request constructor
           * @param {Constructor<TRes>} responseCtor Response constructor
           * @param {TReq|Properties<TReq>} request Request message or plain object
           * @param {rpc.ServiceMethodCallback<TRes>} callback Service callback
           * @returns {undefined}
           * @template TReq extends Message<TReq>
           * @template TRes extends Message<TRes>
           */
          Service.prototype.rpcCall = function rpcCall(
            method,
            requestCtor,
            responseCtor,
            request,
            callback
          ) {
            if (!request) throw TypeError('request must be specified')

            var self = this
            if (!callback)
              return util.asPromise(
                rpcCall,
                self,
                method,
                requestCtor,
                responseCtor,
                request
              )

            if (!self.rpcImpl) {
              setTimeout(function () {
                callback(Error('already ended'))
              }, 0)
              return undefined
            }

            try {
              return self.rpcImpl(
                method,
                requestCtor[
                  self.requestDelimited ? 'encodeDelimited' : 'encode'
                ](request).finish(),
                function rpcCallback(err, response) {
                  if (err) {
                    self.emit('error', err, method)
                    return callback(err)
                  }

                  if (response === null) {
                    self.end(/* endedByRPC */ true)
                    return undefined
                  }

                  if (!(response instanceof responseCtor)) {
                    try {
                      response =
                        responseCtor[
                          self.responseDelimited ? 'decodeDelimited' : 'decode'
                        ](response)
                    } catch (err) {
                      self.emit('error', err, method)
                      return callback(err)
                    }
                  }

                  self.emit('data', response, method)
                  return callback(null, response)
                }
              )
            } catch (err) {
              self.emit('error', err, method)
              setTimeout(function () {
                callback(err)
              }, 0)
              return undefined
            }
          }

          /**
           * Ends this service and emits the `end` event.
           * @param {boolean} [endedByRPC=false] Whether the service has been ended by the RPC implementation.
           * @returns {rpc.Service} `this`
           */
          Service.prototype.end = function end(endedByRPC) {
            if (this.rpcImpl) {
              if (!endedByRPC)
                // signal end to rpcImpl
                this.rpcImpl(null, null, null)
              this.rpcImpl = null
              this.emit('end').off()
            }
            return this
          }
        },
        {'../util/minimal': 48}
      ],
      43: [
        function (require, module, exports) {
          'use strict'
          module.exports = Service

          // extends Namespace
          var Namespace = require('./namespace')
          ;((Service.prototype = Object.create(
            Namespace.prototype
          )).constructor = Service).className = 'Service'

          var Method = require('./method'),
            util = require('./util'),
            rpc = require('./rpc')

          /**
           * Constructs a new service instance.
           * @classdesc Reflected service.
           * @extends NamespaceBase
           * @constructor
           * @param {string} name Service name
           * @param {Object.<string,*>} [options] Service options
           * @throws {TypeError} If arguments are invalid
           */
          function Service(name, options) {
            Namespace.call(this, name, options)

            /**
             * Service methods.
             * @type {Object.<string,Method>}
             */
            this.methods = {} // toJSON, marker

            /**
             * Cached methods as an array.
             * @type {Method[]|null}
             * @private
             */
            this._methodsArray = null
          }

          /**
           * Service descriptor.
           * @interface IService
           * @extends INamespace
           * @property {Object.<string,IMethod>} methods Method descriptors
           */

          /**
           * Constructs a service from a service descriptor.
           * @param {string} name Service name
           * @param {IService} json Service descriptor
           * @returns {Service} Created service
           * @throws {TypeError} If arguments are invalid
           */
          Service.fromJSON = function fromJSON(name, json) {
            var service = new Service(name, json.options)
            /* istanbul ignore else */
            if (json.methods)
              for (
                var names = Object.keys(json.methods), i = 0;
                i < names.length;
                ++i
              )
                service.add(Method.fromJSON(names[i], json.methods[names[i]]))
            if (json.nested) service.addJSON(json.nested)
            service.comment = json.comment
            return service
          }

          /**
           * Converts this service to a service descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IService} Service descriptor
           */
          Service.prototype.toJSON = function toJSON(toJSONOptions) {
            var inherited = Namespace.prototype.toJSON.call(this, toJSONOptions)
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'options',
              (inherited && inherited.options) || undefined,
              'methods',
              Namespace.arrayToJSON(this.methodsArray, toJSONOptions) ||
                /* istanbul ignore next */ {},
              'nested',
              (inherited && inherited.nested) || undefined,
              'comment',
              keepComments ? this.comment : undefined
            ])
          }

          /**
           * Methods of this service as an array for iteration.
           * @name Service#methodsArray
           * @type {Method[]}
           * @readonly
           */
          Object.defineProperty(Service.prototype, 'methodsArray', {
            get: function () {
              return (
                this._methodsArray ||
                (this._methodsArray = util.toArray(this.methods))
              )
            }
          })

          function clearCache(service) {
            service._methodsArray = null
            return service
          }

          /**
           * @override
           */
          Service.prototype.get = function get(name) {
            return (
              this.methods[name] || Namespace.prototype.get.call(this, name)
            )
          }

          /**
           * @override
           */
          Service.prototype.resolveAll = function resolveAll() {
            var methods = this.methodsArray
            for (var i = 0; i < methods.length; ++i) methods[i].resolve()
            return Namespace.prototype.resolve.call(this)
          }

          /**
           * @override
           */
          Service.prototype.add = function add(object) {
            /* istanbul ignore if */
            if (this.get(object.name))
              throw Error("duplicate name '" + object.name + "' in " + this)

            if (object instanceof Method) {
              this.methods[object.name] = object
              object.parent = this
              return clearCache(this)
            }
            return Namespace.prototype.add.call(this, object)
          }

          /**
           * @override
           */
          Service.prototype.remove = function remove(object) {
            if (object instanceof Method) {
              /* istanbul ignore if */
              if (this.methods[object.name] !== object)
                throw Error(object + ' is not a member of ' + this)

              delete this.methods[object.name]
              object.parent = null
              return clearCache(this)
            }
            return Namespace.prototype.remove.call(this, object)
          }

          /**
           * Creates a runtime service using the specified rpc implementation.
           * @param {RPCImpl} rpcImpl RPC implementation
           * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
           * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
           * @returns {rpc.Service} RPC service. Useful where requests and/or responses are streamed.
           */
          Service.prototype.create = function create(
            rpcImpl,
            requestDelimited,
            responseDelimited
          ) {
            var rpcService = new rpc.Service(
              rpcImpl,
              requestDelimited,
              responseDelimited
            )
            for (
              var i = 0, method;
              i < /* initializes */ this.methodsArray.length;
              ++i
            ) {
              var methodName = util
                .lcFirst((method = this._methodsArray[i]).resolve().name)
                .replace(/[^$\w_]/g, '')
              rpcService[methodName] = util.codegen(
                ['r', 'c'],
                util.isReserved(methodName) ? methodName + '_' : methodName
              )('return this.rpcCall(m,q,s,r,c)')({
                m: method,
                q: method.resolvedRequestType.ctor,
                s: method.resolvedResponseType.ctor
              })
            }
            return rpcService
          }
        },
        {'./method': 33, './namespace': 34, './rpc': 41, './util': 46}
      ],
      44: [
        function (require, module, exports) {
          'use strict'
          module.exports = Type

          // extends Namespace
          var Namespace = require('./namespace')
          ;((Type.prototype = Object.create(Namespace.prototype)).constructor =
            Type).className = 'Type'

          var Enum = require('./enum'),
            OneOf = require('./oneof'),
            Field = require('./field'),
            MapField = require('./mapfield'),
            Service = require('./service'),
            Message = require('./message'),
            Reader = require('./reader'),
            Writer = require('./writer'),
            util = require('./util'),
            encoder = require('./encoder'),
            decoder = require('./decoder'),
            verifier = require('./verifier'),
            converter = require('./converter'),
            wrappers = require('./wrappers')

          /**
           * Constructs a new reflected message type instance.
           * @classdesc Reflected message type.
           * @extends NamespaceBase
           * @constructor
           * @param {string} name Message name
           * @param {Object.<string,*>} [options] Declared options
           */
          function Type(name, options) {
            Namespace.call(this, name, options)

            /**
             * Message fields.
             * @type {Object.<string,Field>}
             */
            this.fields = {} // toJSON, marker

            /**
             * Oneofs declared within this namespace, if any.
             * @type {Object.<string,OneOf>}
             */
            this.oneofs = undefined // toJSON

            /**
             * Extension ranges, if any.
             * @type {number[][]}
             */
            this.extensions = undefined // toJSON

            /**
             * Reserved ranges, if any.
             * @type {Array.<number[]|string>}
             */
            this.reserved = undefined // toJSON

            /*?
             * Whether this type is a legacy group.
             * @type {boolean|undefined}
             */
            this.group = undefined // toJSON

            /**
             * Cached fields by id.
             * @type {Object.<number,Field>|null}
             * @private
             */
            this._fieldsById = null

            /**
             * Cached fields as an array.
             * @type {Field[]|null}
             * @private
             */
            this._fieldsArray = null

            /**
             * Cached oneofs as an array.
             * @type {OneOf[]|null}
             * @private
             */
            this._oneofsArray = null

            /**
             * Cached constructor.
             * @type {Constructor<{}>}
             * @private
             */
            this._ctor = null
          }

          Object.defineProperties(Type.prototype, {
            /**
             * Message fields by id.
             * @name Type#fieldsById
             * @type {Object.<number,Field>}
             * @readonly
             */
            fieldsById: {
              get: function () {
                /* istanbul ignore if */
                if (this._fieldsById) return this._fieldsById

                this._fieldsById = {}
                for (
                  var names = Object.keys(this.fields), i = 0;
                  i < names.length;
                  ++i
                ) {
                  var field = this.fields[names[i]],
                    id = field.id

                  /* istanbul ignore if */
                  if (this._fieldsById[id])
                    throw Error('duplicate id ' + id + ' in ' + this)

                  this._fieldsById[id] = field
                }
                return this._fieldsById
              }
            },

            /**
             * Fields of this message as an array for iteration.
             * @name Type#fieldsArray
             * @type {Field[]}
             * @readonly
             */
            fieldsArray: {
              get: function () {
                return (
                  this._fieldsArray ||
                  (this._fieldsArray = util.toArray(this.fields))
                )
              }
            },

            /**
             * Oneofs of this message as an array for iteration.
             * @name Type#oneofsArray
             * @type {OneOf[]}
             * @readonly
             */
            oneofsArray: {
              get: function () {
                return (
                  this._oneofsArray ||
                  (this._oneofsArray = util.toArray(this.oneofs))
                )
              }
            },

            /**
             * The registered constructor, if any registered, otherwise a generic constructor.
             * Assigning a function replaces the internal constructor. If the function does not extend {@link Message} yet, its prototype will be setup accordingly and static methods will be populated. If it already extends {@link Message}, it will just replace the internal constructor.
             * @name Type#ctor
             * @type {Constructor<{}>}
             */
            ctor: {
              get: function () {
                return (
                  this._ctor || (this.ctor = Type.generateConstructor(this)())
                )
              },
              set: function (ctor) {
                // Ensure proper prototype
                var prototype = ctor.prototype
                if (!(prototype instanceof Message)) {
                  ;(ctor.prototype = new Message()).constructor = ctor
                  util.merge(ctor.prototype, prototype)
                }

                // Classes and messages reference their reflected type
                ctor.$type = ctor.prototype.$type = this

                // Mix in static methods
                util.merge(ctor, Message, true)

                this._ctor = ctor

                // Messages have non-enumerable default values on their prototype
                var i = 0
                for (; i < /* initializes */ this.fieldsArray.length; ++i)
                  this._fieldsArray[i].resolve() // ensures a proper value

                // Messages have non-enumerable getters and setters for each virtual oneof field
                var ctorProperties = {}
                for (i = 0; i < /* initializes */ this.oneofsArray.length; ++i)
                  ctorProperties[this._oneofsArray[i].resolve().name] = {
                    get: util.oneOfGetter(this._oneofsArray[i].oneof),
                    set: util.oneOfSetter(this._oneofsArray[i].oneof)
                  }
                if (i) Object.defineProperties(ctor.prototype, ctorProperties)
              }
            }
          })

          /**
           * Generates a constructor function for the specified type.
           * @param {Type} mtype Message type
           * @returns {Codegen} Codegen instance
           */
          Type.generateConstructor = function generateConstructor(mtype) {
            /* eslint-disable no-unexpected-multiline */
            var gen = util.codegen(['p'], mtype.name)
            // explicitly initialize mutable object/array fields so that these aren't just inherited from the prototype
            for (var i = 0, field; i < mtype.fieldsArray.length; ++i)
              if ((field = mtype._fieldsArray[i]).map)
                gen('this%s={}', util.safeProp(field.name))
              else if (field.repeated)
                gen('this%s=[]', util.safeProp(field.name))
            return gen(
              'if(p)for(var ks=Object.keys(p),i=0;i<ks.length;++i)if(p[ks[i]]!=null)'
            )(
              // omit undefined or null
              'this[ks[i]]=p[ks[i]]'
            )
            /* eslint-enable no-unexpected-multiline */
          }

          function clearCache(type) {
            type._fieldsById = type._fieldsArray = type._oneofsArray = null
            delete type.encode
            delete type.decode
            delete type.verify
            return type
          }

          /**
           * Message type descriptor.
           * @interface IType
           * @extends INamespace
           * @property {Object.<string,IOneOf>} [oneofs] Oneof descriptors
           * @property {Object.<string,IField>} fields Field descriptors
           * @property {number[][]} [extensions] Extension ranges
           * @property {number[][]} [reserved] Reserved ranges
           * @property {boolean} [group=false] Whether a legacy group or not
           */

          /**
           * Creates a message type from a message type descriptor.
           * @param {string} name Message name
           * @param {IType} json Message type descriptor
           * @returns {Type} Created message type
           */
          Type.fromJSON = function fromJSON(name, json) {
            var type = new Type(name, json.options)
            type.extensions = json.extensions
            type.reserved = json.reserved
            var names = Object.keys(json.fields),
              i = 0
            for (; i < names.length; ++i)
              type.add(
                (typeof json.fields[names[i]].keyType !== 'undefined'
                  ? MapField.fromJSON
                  : Field.fromJSON)(names[i], json.fields[names[i]])
              )
            if (json.oneofs)
              for (
                names = Object.keys(json.oneofs), i = 0;
                i < names.length;
                ++i
              )
                type.add(OneOf.fromJSON(names[i], json.oneofs[names[i]]))
            if (json.nested)
              for (
                names = Object.keys(json.nested), i = 0;
                i < names.length;
                ++i
              ) {
                var nested = json.nested[names[i]]
                type.add(
                  // most to least likely
                  (nested.id !== undefined
                    ? Field.fromJSON
                    : nested.fields !== undefined
                    ? Type.fromJSON
                    : nested.values !== undefined
                    ? Enum.fromJSON
                    : nested.methods !== undefined
                    ? Service.fromJSON
                    : Namespace.fromJSON)(names[i], nested)
                )
              }
            if (json.extensions && json.extensions.length)
              type.extensions = json.extensions
            if (json.reserved && json.reserved.length)
              type.reserved = json.reserved
            if (json.group) type.group = true
            if (json.comment) type.comment = json.comment
            return type
          }

          /**
           * Converts this message type to a message type descriptor.
           * @param {IToJSONOptions} [toJSONOptions] JSON conversion options
           * @returns {IType} Message type descriptor
           */
          Type.prototype.toJSON = function toJSON(toJSONOptions) {
            var inherited = Namespace.prototype.toJSON.call(this, toJSONOptions)
            var keepComments = toJSONOptions
              ? Boolean(toJSONOptions.keepComments)
              : false
            return util.toObject([
              'options',
              (inherited && inherited.options) || undefined,
              'oneofs',
              Namespace.arrayToJSON(this.oneofsArray, toJSONOptions),
              'fields',
              Namespace.arrayToJSON(
                this.fieldsArray.filter(function (obj) {
                  return !obj.declaringField
                }),
                toJSONOptions
              ) || {},
              'extensions',
              this.extensions && this.extensions.length
                ? this.extensions
                : undefined,
              'reserved',
              this.reserved && this.reserved.length ? this.reserved : undefined,
              'group',
              this.group || undefined,
              'nested',
              (inherited && inherited.nested) || undefined,
              'comment',
              keepComments ? this.comment : undefined
            ])
          }

          /**
           * @override
           */
          Type.prototype.resolveAll = function resolveAll() {
            var fields = this.fieldsArray,
              i = 0
            while (i < fields.length) fields[i++].resolve()
            var oneofs = this.oneofsArray
            i = 0
            while (i < oneofs.length) oneofs[i++].resolve()
            return Namespace.prototype.resolveAll.call(this)
          }

          /**
           * @override
           */
          Type.prototype.get = function get(name) {
            return (
              this.fields[name] ||
              (this.oneofs && this.oneofs[name]) ||
              (this.nested && this.nested[name]) ||
              null
            )
          }

          /**
           * Adds a nested object to this type.
           * @param {ReflectionObject} object Nested object to add
           * @returns {Type} `this`
           * @throws {TypeError} If arguments are invalid
           * @throws {Error} If there is already a nested object with this name or, if a field, when there is already a field with this id
           */
          Type.prototype.add = function add(object) {
            if (this.get(object.name))
              throw Error("duplicate name '" + object.name + "' in " + this)

            if (object instanceof Field && object.extend === undefined) {
              // NOTE: Extension fields aren't actual fields on the declaring type, but nested objects.
              // The root object takes care of adding distinct sister-fields to the respective extended
              // type instead.

              // avoids calling the getter if not absolutely necessary because it's called quite frequently
              if (
                this._fieldsById
                  ? /* istanbul ignore next */ this._fieldsById[object.id]
                  : this.fieldsById[object.id]
              )
                throw Error('duplicate id ' + object.id + ' in ' + this)
              if (this.isReservedId(object.id))
                throw Error('id ' + object.id + ' is reserved in ' + this)
              if (this.isReservedName(object.name))
                throw Error("name '" + object.name + "' is reserved in " + this)

              if (object.parent) object.parent.remove(object)
              this.fields[object.name] = object
              object.message = this
              object.onAdd(this)
              return clearCache(this)
            }
            if (object instanceof OneOf) {
              if (!this.oneofs) this.oneofs = {}
              this.oneofs[object.name] = object
              object.onAdd(this)
              return clearCache(this)
            }
            return Namespace.prototype.add.call(this, object)
          }

          /**
           * Removes a nested object from this type.
           * @param {ReflectionObject} object Nested object to remove
           * @returns {Type} `this`
           * @throws {TypeError} If arguments are invalid
           * @throws {Error} If `object` is not a member of this type
           */
          Type.prototype.remove = function remove(object) {
            if (object instanceof Field && object.extend === undefined) {
              // See Type#add for the reason why extension fields are excluded here.

              /* istanbul ignore if */
              if (!this.fields || this.fields[object.name] !== object)
                throw Error(object + ' is not a member of ' + this)

              delete this.fields[object.name]
              object.parent = null
              object.onRemove(this)
              return clearCache(this)
            }
            if (object instanceof OneOf) {
              /* istanbul ignore if */
              if (!this.oneofs || this.oneofs[object.name] !== object)
                throw Error(object + ' is not a member of ' + this)

              delete this.oneofs[object.name]
              object.parent = null
              object.onRemove(this)
              return clearCache(this)
            }
            return Namespace.prototype.remove.call(this, object)
          }

          /**
           * Tests if the specified id is reserved.
           * @param {number} id Id to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          Type.prototype.isReservedId = function isReservedId(id) {
            return Namespace.isReservedId(this.reserved, id)
          }

          /**
           * Tests if the specified name is reserved.
           * @param {string} name Name to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          Type.prototype.isReservedName = function isReservedName(name) {
            return Namespace.isReservedName(this.reserved, name)
          }

          /**
           * Creates a new message of this type using the specified properties.
           * @param {Object.<string,*>} [properties] Properties to set
           * @returns {Message<{}>} Message instance
           */
          Type.prototype.create = function create(properties) {
            return new this.ctor(properties)
          }

          /**
           * Sets up {@link Type#encode|encode}, {@link Type#decode|decode} and {@link Type#verify|verify}.
           * @returns {Type} `this`
           */
          Type.prototype.setup = function setup() {
            // Sets up everything at once so that the prototype chain does not have to be re-evaluated
            // multiple times (V8, soft-deopt prototype-check).

            var fullName = this.fullName,
              types = []
            for (var i = 0; i < /* initializes */ this.fieldsArray.length; ++i)
              types.push(this._fieldsArray[i].resolve().resolvedType)

            // Replace setup methods with type-specific generated functions
            this.encode = encoder(this)({
              Writer: Writer,
              types: types,
              util: util
            })
            this.decode = decoder(this)({
              Reader: Reader,
              types: types,
              util: util
            })
            this.verify = verifier(this)({
              types: types,
              util: util
            })
            this.fromObject = converter.fromObject(this)({
              types: types,
              util: util
            })
            this.toObject = converter.toObject(this)({
              types: types,
              util: util
            })

            // Inject custom wrappers for common types
            var wrapper = wrappers[fullName]
            if (wrapper) {
              var originalThis = Object.create(this)
              // if (wrapper.fromObject) {
              originalThis.fromObject = this.fromObject
              this.fromObject = wrapper.fromObject.bind(originalThis)
              // }
              // if (wrapper.toObject) {
              originalThis.toObject = this.toObject
              this.toObject = wrapper.toObject.bind(originalThis)
              // }
            }

            return this
          }

          /**
           * Encodes a message of this type. Does not implicitly {@link Type#verify|verify} messages.
           * @param {Message<{}>|Object.<string,*>} message Message instance or plain object
           * @param {Writer} [writer] Writer to encode to
           * @returns {Writer} writer
           */
          Type.prototype.encode = function encode_setup(message, writer) {
            return this.setup().encode(message, writer) // overrides this method
          }

          /**
           * Encodes a message of this type preceeded by its byte length as a varint. Does not implicitly {@link Type#verify|verify} messages.
           * @param {Message<{}>|Object.<string,*>} message Message instance or plain object
           * @param {Writer} [writer] Writer to encode to
           * @returns {Writer} writer
           */
          Type.prototype.encodeDelimited = function encodeDelimited(
            message,
            writer
          ) {
            return this.encode(
              message,
              writer && writer.len ? writer.fork() : writer
            ).ldelim()
          }

          /**
           * Decodes a message of this type.
           * @param {Reader|Uint8Array} reader Reader or buffer to decode from
           * @param {number} [length] Length of the message, if known beforehand
           * @returns {Message<{}>} Decoded message
           * @throws {Error} If the payload is not a reader or valid buffer
           * @throws {util.ProtocolError<{}>} If required fields are missing
           */
          Type.prototype.decode = function decode_setup(reader, length) {
            return this.setup().decode(reader, length) // overrides this method
          }

          /**
           * Decodes a message of this type preceeded by its byte length as a varint.
           * @param {Reader|Uint8Array} reader Reader or buffer to decode from
           * @returns {Message<{}>} Decoded message
           * @throws {Error} If the payload is not a reader or valid buffer
           * @throws {util.ProtocolError} If required fields are missing
           */
          Type.prototype.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof Reader)) reader = Reader.create(reader)
            return this.decode(reader, reader.uint32())
          }

          /**
           * Verifies that field values are valid and that required fields are present.
           * @param {Object.<string,*>} message Plain object to verify
           * @returns {null|string} `null` if valid, otherwise the reason why it is not
           */
          Type.prototype.verify = function verify_setup(message) {
            return this.setup().verify(message) // overrides this method
          }

          /**
           * Creates a new message of this type from a plain object. Also converts values to their respective internal types.
           * @param {Object.<string,*>} object Plain object to convert
           * @returns {Message<{}>} Message instance
           */
          Type.prototype.fromObject = function fromObject(object) {
            return this.setup().fromObject(object)
          }

          /**
           * Conversion options as used by {@link Type#toObject} and {@link Message.toObject}.
           * @interface IConversionOptions
           * @property {Function} [longs] Long conversion type.
           * Valid values are `String` and `Number` (the global types).
           * Defaults to copy the present value, which is a possibly unsafe number without and a {@link Long} with a long library.
           * @property {Function} [enums] Enum value conversion type.
           * Only valid value is `String` (the global type).
           * Defaults to copy the present value, which is the numeric id.
           * @property {Function} [bytes] Bytes value conversion type.
           * Valid values are `Array` and (a base64 encoded) `String` (the global types).
           * Defaults to copy the present value, which usually is a Buffer under node and an Uint8Array in the browser.
           * @property {boolean} [defaults=false] Also sets default values on the resulting object
           * @property {boolean} [arrays=false] Sets empty arrays for missing repeated fields even if `defaults=false`
           * @property {boolean} [objects=false] Sets empty objects for missing map fields even if `defaults=false`
           * @property {boolean} [oneofs=false] Includes virtual oneof properties set to the present field's name, if any
           * @property {boolean} [json=false] Performs additional JSON compatibility conversions, i.e. NaN and Infinity to strings
           */

          /**
           * Creates a plain object from a message of this type. Also converts values to other types if specified.
           * @param {Message<{}>} message Message instance
           * @param {IConversionOptions} [options] Conversion options
           * @returns {Object.<string,*>} Plain object
           */
          Type.prototype.toObject = function toObject(message, options) {
            return this.setup().toObject(message, options)
          }

          /**
           * Decorator function as returned by {@link Type.d} (TypeScript).
           * @typedef TypeDecorator
           * @type {function}
           * @param {Constructor<T>} target Target constructor
           * @returns {undefined}
           * @template T extends Message<T>
           */

          /**
           * Type decorator (TypeScript).
           * @param {string} [typeName] Type name, defaults to the constructor's name
           * @returns {TypeDecorator<T>} Decorator function
           * @template T extends Message<T>
           */
          Type.d = function decorateType(typeName) {
            return function typeDecorator(target) {
              util.decorateType(target, typeName)
            }
          }
        },
        {
          './converter': 24,
          './decoder': 25,
          './encoder': 26,
          './enum': 27,
          './field': 28,
          './mapfield': 31,
          './message': 32,
          './namespace': 34,
          './oneof': 36,
          './reader': 37,
          './service': 43,
          './util': 46,
          './verifier': 49,
          './wrappers': 50,
          './writer': 51
        }
      ],
      45: [
        function (require, module, exports) {
          'use strict'

          /**
           * Common type constants.
           * @namespace
           */
          var types = exports

          var util = require('./util')

          var s = [
            'double', // 0
            'float', // 1
            'int32', // 2
            'uint32', // 3
            'sint32', // 4
            'fixed32', // 5
            'sfixed32', // 6
            'int64', // 7
            'uint64', // 8
            'sint64', // 9
            'fixed64', // 10
            'sfixed64', // 11
            'bool', // 12
            'string', // 13
            'bytes' // 14
          ]

          function bake(values, offset) {
            var i = 0,
              o = {}
            offset |= 0
            while (i < values.length) o[s[i + offset]] = values[i++]
            return o
          }

          /**
           * Basic type wire types.
           * @type {Object.<string,number>}
           * @const
           * @property {number} double=1 Fixed64 wire type
           * @property {number} float=5 Fixed32 wire type
           * @property {number} int32=0 Varint wire type
           * @property {number} uint32=0 Varint wire type
           * @property {number} sint32=0 Varint wire type
           * @property {number} fixed32=5 Fixed32 wire type
           * @property {number} sfixed32=5 Fixed32 wire type
           * @property {number} int64=0 Varint wire type
           * @property {number} uint64=0 Varint wire type
           * @property {number} sint64=0 Varint wire type
           * @property {number} fixed64=1 Fixed64 wire type
           * @property {number} sfixed64=1 Fixed64 wire type
           * @property {number} bool=0 Varint wire type
           * @property {number} string=2 Ldelim wire type
           * @property {number} bytes=2 Ldelim wire type
           */
          types.basic = bake([
            /* double   */ 1, /* float    */ 5, /* int32    */ 0,
            /* uint32   */ 0, /* sint32   */ 0, /* fixed32  */ 5,
            /* sfixed32 */ 5, /* int64    */ 0, /* uint64   */ 0,
            /* sint64   */ 0, /* fixed64  */ 1, /* sfixed64 */ 1,
            /* bool     */ 0, /* string   */ 2, /* bytes    */ 2
          ])

          /**
           * Basic type defaults.
           * @type {Object.<string,*>}
           * @const
           * @property {number} double=0 Double default
           * @property {number} float=0 Float default
           * @property {number} int32=0 Int32 default
           * @property {number} uint32=0 Uint32 default
           * @property {number} sint32=0 Sint32 default
           * @property {number} fixed32=0 Fixed32 default
           * @property {number} sfixed32=0 Sfixed32 default
           * @property {number} int64=0 Int64 default
           * @property {number} uint64=0 Uint64 default
           * @property {number} sint64=0 Sint32 default
           * @property {number} fixed64=0 Fixed64 default
           * @property {number} sfixed64=0 Sfixed64 default
           * @property {boolean} bool=false Bool default
           * @property {string} string="" String default
           * @property {Array.<number>} bytes=Array(0) Bytes default
           * @property {null} message=null Message default
           */
          types.defaults = bake([
            /* double   */ 0,
            /* float    */ 0,
            /* int32    */ 0,
            /* uint32   */ 0,
            /* sint32   */ 0,
            /* fixed32  */ 0,
            /* sfixed32 */ 0,
            /* int64    */ 0,
            /* uint64   */ 0,
            /* sint64   */ 0,
            /* fixed64  */ 0,
            /* sfixed64 */ 0,
            /* bool     */ false,
            /* string   */ '',
            /* bytes    */ util.emptyArray,
            /* message  */ null
          ])

          /**
           * Basic long type wire types.
           * @type {Object.<string,number>}
           * @const
           * @property {number} int64=0 Varint wire type
           * @property {number} uint64=0 Varint wire type
           * @property {number} sint64=0 Varint wire type
           * @property {number} fixed64=1 Fixed64 wire type
           * @property {number} sfixed64=1 Fixed64 wire type
           */
          types.long = bake(
            [
              /* int64    */ 0, /* uint64   */ 0, /* sint64   */ 0,
              /* fixed64  */ 1, /* sfixed64 */ 1
            ],
            7
          )

          /**
           * Allowed types for map keys with their associated wire type.
           * @type {Object.<string,number>}
           * @const
           * @property {number} int32=0 Varint wire type
           * @property {number} uint32=0 Varint wire type
           * @property {number} sint32=0 Varint wire type
           * @property {number} fixed32=5 Fixed32 wire type
           * @property {number} sfixed32=5 Fixed32 wire type
           * @property {number} int64=0 Varint wire type
           * @property {number} uint64=0 Varint wire type
           * @property {number} sint64=0 Varint wire type
           * @property {number} fixed64=1 Fixed64 wire type
           * @property {number} sfixed64=1 Fixed64 wire type
           * @property {number} bool=0 Varint wire type
           * @property {number} string=2 Ldelim wire type
           */
          types.mapKey = bake(
            [
              /* int32    */ 0, /* uint32   */ 0, /* sint32   */ 0,
              /* fixed32  */ 5, /* sfixed32 */ 5, /* int64    */ 0,
              /* uint64   */ 0, /* sint64   */ 0, /* fixed64  */ 1,
              /* sfixed64 */ 1, /* bool     */ 0, /* string   */ 2
            ],
            2
          )

          /**
           * Allowed types for packed repeated fields with their associated wire type.
           * @type {Object.<string,number>}
           * @const
           * @property {number} double=1 Fixed64 wire type
           * @property {number} float=5 Fixed32 wire type
           * @property {number} int32=0 Varint wire type
           * @property {number} uint32=0 Varint wire type
           * @property {number} sint32=0 Varint wire type
           * @property {number} fixed32=5 Fixed32 wire type
           * @property {number} sfixed32=5 Fixed32 wire type
           * @property {number} int64=0 Varint wire type
           * @property {number} uint64=0 Varint wire type
           * @property {number} sint64=0 Varint wire type
           * @property {number} fixed64=1 Fixed64 wire type
           * @property {number} sfixed64=1 Fixed64 wire type
           * @property {number} bool=0 Varint wire type
           */
          types.packed = bake([
            /* double   */ 1, /* float    */ 5, /* int32    */ 0,
            /* uint32   */ 0, /* sint32   */ 0, /* fixed32  */ 5,
            /* sfixed32 */ 5, /* int64    */ 0, /* uint64   */ 0,
            /* sint64   */ 0, /* fixed64  */ 1, /* sfixed64 */ 1,
            /* bool     */ 0
          ])
        },
        {'./util': 46}
      ],
      46: [
        function (require, module, exports) {
          'use strict'

          /**
           * Various utility functions.
           * @namespace
           */
          var util = (module.exports = require('./util/minimal'))

          var roots = require('./roots')

          var Type, // cyclic
            Enum

          util.codegen = require('@protobufjs/codegen')
          util.fetch = require('@protobufjs/fetch')
          util.path = require('@protobufjs/path')

          /**
           * Node's fs module if available.
           * @type {Object.<string,*>}
           */
          util.fs = util.inquire('fs')

          /**
           * Converts an object's values to an array.
           * @param {Object.<string,*>} object Object to convert
           * @returns {Array.<*>} Converted array
           */
          util.toArray = function toArray(object) {
            if (object) {
              var keys = Object.keys(object),
                array = new Array(keys.length),
                index = 0
              while (index < keys.length) array[index] = object[keys[index++]]
              return array
            }
            return []
          }

          /**
           * Converts an array of keys immediately followed by their respective value to an object, omitting undefined values.
           * @param {Array.<*>} array Array to convert
           * @returns {Object.<string,*>} Converted object
           */
          util.toObject = function toObject(array) {
            var object = {},
              index = 0
            while (index < array.length) {
              var key = array[index++],
                val = array[index++]
              if (val !== undefined) object[key] = val
            }
            return object
          }

          var safePropBackslashRe = /\\/g,
            safePropQuoteRe = /"/g

          /**
           * Tests whether the specified name is a reserved word in JS.
           * @param {string} name Name to test
           * @returns {boolean} `true` if reserved, otherwise `false`
           */
          util.isReserved = function isReserved(name) {
            return /^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/.test(
              name
            )
          }

          /**
           * Returns a safe property accessor for the specified property name.
           * @param {string} prop Property name
           * @returns {string} Safe accessor
           */
          util.safeProp = function safeProp(prop) {
            if (!/^[$\w_]+$/.test(prop) || util.isReserved(prop))
              return (
                '["' +
                prop
                  .replace(safePropBackslashRe, '\\\\')
                  .replace(safePropQuoteRe, '\\"') +
                '"]'
              )
            return '.' + prop
          }

          /**
           * Converts the first character of a string to upper case.
           * @param {string} str String to convert
           * @returns {string} Converted string
           */
          util.ucFirst = function ucFirst(str) {
            return str.charAt(0).toUpperCase() + str.substring(1)
          }

          var camelCaseRe = /_([a-z])/g

          /**
           * Converts a string to camel case.
           * @param {string} str String to convert
           * @returns {string} Converted string
           */
          util.camelCase = function camelCase(str) {
            return (
              str.substring(0, 1) +
              str.substring(1).replace(camelCaseRe, function ($0, $1) {
                return $1.toUpperCase()
              })
            )
          }

          /**
           * Compares reflected fields by id.
           * @param {Field} a First field
           * @param {Field} b Second field
           * @returns {number} Comparison value
           */
          util.compareFieldsById = function compareFieldsById(a, b) {
            return a.id - b.id
          }

          /**
           * Decorator helper for types (TypeScript).
           * @param {Constructor<T>} ctor Constructor function
           * @param {string} [typeName] Type name, defaults to the constructor's name
           * @returns {Type} Reflected type
           * @template T extends Message<T>
           * @property {Root} root Decorators root
           */
          util.decorateType = function decorateType(ctor, typeName) {
            /* istanbul ignore if */
            if (ctor.$type) {
              if (typeName && ctor.$type.name !== typeName) {
                util.decorateRoot.remove(ctor.$type)
                ctor.$type.name = typeName
                util.decorateRoot.add(ctor.$type)
              }
              return ctor.$type
            }

            /* istanbul ignore next */
            if (!Type) Type = require('./type')

            var type = new Type(typeName || ctor.name)
            util.decorateRoot.add(type)
            type.ctor = ctor // sets up .encode, .decode etc.
            Object.defineProperty(ctor, '$type', {
              value: type,
              enumerable: false
            })
            Object.defineProperty(ctor.prototype, '$type', {
              value: type,
              enumerable: false
            })
            return type
          }

          var decorateEnumIndex = 0

          /**
           * Decorator helper for enums (TypeScript).
           * @param {Object} object Enum object
           * @returns {Enum} Reflected enum
           */
          util.decorateEnum = function decorateEnum(object) {
            /* istanbul ignore if */
            if (object.$type) return object.$type

            /* istanbul ignore next */
            if (!Enum) Enum = require('./enum')

            var enm = new Enum('Enum' + decorateEnumIndex++, object)
            util.decorateRoot.add(enm)
            Object.defineProperty(object, '$type', {
              value: enm,
              enumerable: false
            })
            return enm
          }

          /**
           * Sets the value of a property by property path. If a value already exists, it is turned to an array
           * @param {Object.<string,*>} dst Destination object
           * @param {string} path dot '.' delimited path of the property to set
           * @param {Object} value the value to set
           * @returns {Object.<string,*>} Destination object
           */
          util.setProperty = function setProperty(dst, path, value) {
            function setProp(dst, path, value) {
              var part = path.shift()
              if (part === '__proto__') {
                return dst
              }
              if (path.length > 0) {
                dst[part] = setProp(dst[part] || {}, path, value)
              } else {
                var prevValue = dst[part]
                if (prevValue) value = [].concat(prevValue).concat(value)
                dst[part] = value
              }
              return dst
            }

            if (typeof dst !== 'object')
              throw TypeError('dst must be an object')
            if (!path) throw TypeError('path must be specified')

            path = path.split('.')
            return setProp(dst, path, value)
          }

          /**
           * Decorator root (TypeScript).
           * @name util.decorateRoot
           * @type {Root}
           * @readonly
           */
          Object.defineProperty(util, 'decorateRoot', {
            get: function () {
              return (
                roots['decorated'] ||
                (roots['decorated'] = new (require('./root'))())
              )
            }
          })
        },
        {
          './enum': 27,
          './root': 39,
          './roots': 40,
          './type': 44,
          './util/minimal': 48,
          '@protobufjs/codegen': 8,
          '@protobufjs/fetch': 10,
          '@protobufjs/path': 13
        }
      ],
      47: [
        function (require, module, exports) {
          'use strict'
          module.exports = LongBits

          var util = require('../util/minimal')

          /**
           * Constructs new long bits.
           * @classdesc Helper class for working with the low and high bits of a 64 bit value.
           * @memberof util
           * @constructor
           * @param {number} lo Low 32 bits, unsigned
           * @param {number} hi High 32 bits, unsigned
           */
          function LongBits(lo, hi) {
            // note that the casts below are theoretically unnecessary as of today, but older statically
            // generated converter code might still call the ctor with signed 32bits. kept for compat.

            /**
             * Low bits.
             * @type {number}
             */
            this.lo = lo >>> 0

            /**
             * High bits.
             * @type {number}
             */
            this.hi = hi >>> 0
          }

          /**
           * Zero bits.
           * @memberof util.LongBits
           * @type {util.LongBits}
           */
          var zero = (LongBits.zero = new LongBits(0, 0))

          zero.toNumber = function () {
            return 0
          }
          zero.zzEncode = zero.zzDecode = function () {
            return this
          }
          zero.length = function () {
            return 1
          }

          /**
           * Zero hash.
           * @memberof util.LongBits
           * @type {string}
           */
          var zeroHash = (LongBits.zeroHash = '\0\0\0\0\0\0\0\0')

          /**
           * Constructs new long bits from the specified number.
           * @param {number} value Value
           * @returns {util.LongBits} Instance
           */
          LongBits.fromNumber = function fromNumber(value) {
            if (value === 0) return zero
            var sign = value < 0
            if (sign) value = -value
            var lo = value >>> 0,
              hi = ((value - lo) / 4294967296) >>> 0
            if (sign) {
              hi = ~hi >>> 0
              lo = ~lo >>> 0
              if (++lo > 4294967295) {
                lo = 0
                if (++hi > 4294967295) hi = 0
              }
            }
            return new LongBits(lo, hi)
          }

          /**
           * Constructs new long bits from a number, long or string.
           * @param {Long|number|string} value Value
           * @returns {util.LongBits} Instance
           */
          LongBits.from = function from(value) {
            if (typeof value === 'number') return LongBits.fromNumber(value)
            if (util.isString(value)) {
              /* istanbul ignore else */
              if (util.Long) value = util.Long.fromString(value)
              else return LongBits.fromNumber(parseInt(value, 10))
            }
            return value.low || value.high
              ? new LongBits(value.low >>> 0, value.high >>> 0)
              : zero
          }

          /**
           * Converts this long bits to a possibly unsafe JavaScript number.
           * @param {boolean} [unsigned=false] Whether unsigned or not
           * @returns {number} Possibly unsafe number
           */
          LongBits.prototype.toNumber = function toNumber(unsigned) {
            if (!unsigned && this.hi >>> 31) {
              var lo = (~this.lo + 1) >>> 0,
                hi = ~this.hi >>> 0
              if (!lo) hi = (hi + 1) >>> 0
              return -(lo + hi * 4294967296)
            }
            return this.lo + this.hi * 4294967296
          }

          /**
           * Converts this long bits to a long.
           * @param {boolean} [unsigned=false] Whether unsigned or not
           * @returns {Long} Long
           */
          LongBits.prototype.toLong = function toLong(unsigned) {
            return util.Long
              ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
              : /* istanbul ignore next */
                {
                  low: this.lo | 0,
                  high: this.hi | 0,
                  unsigned: Boolean(unsigned)
                }
          }

          var charCodeAt = String.prototype.charCodeAt

          /**
           * Constructs new long bits from the specified 8 characters long hash.
           * @param {string} hash Hash
           * @returns {util.LongBits} Bits
           */
          LongBits.fromHash = function fromHash(hash) {
            if (hash === zeroHash) return zero
            return new LongBits(
              (charCodeAt.call(hash, 0) |
                (charCodeAt.call(hash, 1) << 8) |
                (charCodeAt.call(hash, 2) << 16) |
                (charCodeAt.call(hash, 3) << 24)) >>>
                0,
              (charCodeAt.call(hash, 4) |
                (charCodeAt.call(hash, 5) << 8) |
                (charCodeAt.call(hash, 6) << 16) |
                (charCodeAt.call(hash, 7) << 24)) >>>
                0
            )
          }

          /**
           * Converts this long bits to a 8 characters long hash.
           * @returns {string} Hash
           */
          LongBits.prototype.toHash = function toHash() {
            return String.fromCharCode(
              this.lo & 255,
              (this.lo >>> 8) & 255,
              (this.lo >>> 16) & 255,
              this.lo >>> 24,
              this.hi & 255,
              (this.hi >>> 8) & 255,
              (this.hi >>> 16) & 255,
              this.hi >>> 24
            )
          }

          /**
           * Zig-zag encodes this long bits.
           * @returns {util.LongBits} `this`
           */
          LongBits.prototype.zzEncode = function zzEncode() {
            var mask = this.hi >> 31
            this.hi = (((this.hi << 1) | (this.lo >>> 31)) ^ mask) >>> 0
            this.lo = ((this.lo << 1) ^ mask) >>> 0
            return this
          }

          /**
           * Zig-zag decodes this long bits.
           * @returns {util.LongBits} `this`
           */
          LongBits.prototype.zzDecode = function zzDecode() {
            var mask = -(this.lo & 1)
            this.lo = (((this.lo >>> 1) | (this.hi << 31)) ^ mask) >>> 0
            this.hi = ((this.hi >>> 1) ^ mask) >>> 0
            return this
          }

          /**
           * Calculates the length of this longbits when encoded as a varint.
           * @returns {number} Length
           */
          LongBits.prototype.length = function length() {
            var part0 = this.lo,
              part1 = ((this.lo >>> 28) | (this.hi << 4)) >>> 0,
              part2 = this.hi >>> 24
            return part2 === 0
              ? part1 === 0
                ? part0 < 16384
                  ? part0 < 128
                    ? 1
                    : 2
                  : part0 < 2097152
                  ? 3
                  : 4
                : part1 < 16384
                ? part1 < 128
                  ? 5
                  : 6
                : part1 < 2097152
                ? 7
                : 8
              : part2 < 128
              ? 9
              : 10
          }
        },
        {'../util/minimal': 48}
      ],
      48: [
        function (require, module, exports) {
          ;(function (global) {
            ;(function () {
              'use strict'
              var util = exports

              // used to return a Promise where callback is omitted
              util.asPromise = require('@protobufjs/aspromise')

              // converts to / from base64 encoded strings
              util.base64 = require('@protobufjs/base64')

              // base class of rpc.Service
              util.EventEmitter = require('@protobufjs/eventemitter')

              // float handling accross browsers
              util.float = require('@protobufjs/float')

              // requires modules optionally and hides the call from bundlers
              util.inquire = require('@protobufjs/inquire')

              // converts to / from utf8 encoded strings
              util.utf8 = require('@protobufjs/utf8')

              // provides a node-like buffer pool in the browser
              util.pool = require('@protobufjs/pool')

              // utility to work with the low and high bits of a 64 bit value
              util.LongBits = require('./longbits')

              /**
               * Whether running within node or not.
               * @memberof util
               * @type {boolean}
               */
              util.isNode = Boolean(
                typeof global !== 'undefined' &&
                  global &&
                  global.process &&
                  global.process.versions &&
                  global.process.versions.node
              )

              /**
               * Global object reference.
               * @memberof util
               * @type {Object}
               */
              util.global =
                (util.isNode && global) ||
                (typeof window !== 'undefined' && window) ||
                (typeof self !== 'undefined' && self) ||
                this // eslint-disable-line no-invalid-this

              /**
               * An immuable empty array.
               * @memberof util
               * @type {Array.<*>}
               * @const
               */
              util.emptyArray = Object.freeze
                ? Object.freeze([])
                : /* istanbul ignore next */ [] // used on prototypes

              /**
               * An immutable empty object.
               * @type {Object}
               * @const
               */
              util.emptyObject = Object.freeze
                ? Object.freeze({})
                : /* istanbul ignore next */ {} // used on prototypes

              /**
               * Tests if the specified value is an integer.
               * @function
               * @param {*} value Value to test
               * @returns {boolean} `true` if the value is an integer
               */
              util.isInteger =
                Number.isInteger ||
                /* istanbul ignore next */ function isInteger(value) {
                  return (
                    typeof value === 'number' &&
                    isFinite(value) &&
                    Math.floor(value) === value
                  )
                }

              /**
               * Tests if the specified value is a string.
               * @param {*} value Value to test
               * @returns {boolean} `true` if the value is a string
               */
              util.isString = function isString(value) {
                return typeof value === 'string' || value instanceof String
              }

              /**
               * Tests if the specified value is a non-null object.
               * @param {*} value Value to test
               * @returns {boolean} `true` if the value is a non-null object
               */
              util.isObject = function isObject(value) {
                return value && typeof value === 'object'
              }

              /**
               * Checks if a property on a message is considered to be present.
               * This is an alias of {@link util.isSet}.
               * @function
               * @param {Object} obj Plain object or message instance
               * @param {string} prop Property name
               * @returns {boolean} `true` if considered to be present, otherwise `false`
               */
              util.isset =
                /**
                 * Checks if a property on a message is considered to be present.
                 * @param {Object} obj Plain object or message instance
                 * @param {string} prop Property name
                 * @returns {boolean} `true` if considered to be present, otherwise `false`
                 */
                util.isSet = function isSet(obj, prop) {
                  var value = obj[prop]
                  if (value != null && obj.hasOwnProperty(prop))
                    // eslint-disable-line eqeqeq, no-prototype-builtins
                    return (
                      typeof value !== 'object' ||
                      (Array.isArray(value)
                        ? value.length
                        : Object.keys(value).length) > 0
                    )
                  return false
                }

              /**
               * Any compatible Buffer instance.
               * This is a minimal stand-alone definition of a Buffer instance. The actual type is that exported by node's typings.
               * @interface Buffer
               * @extends Uint8Array
               */

              /**
               * Node's Buffer class if available.
               * @type {Constructor<Buffer>}
               */
              util.Buffer = (function () {
                try {
                  var Buffer = util.inquire('buffer').Buffer
                  // refuse to use non-node buffers if not explicitly assigned (perf reasons):
                  return Buffer.prototype.utf8Write
                    ? Buffer
                    : /* istanbul ignore next */ null
                } catch (e) {
                  /* istanbul ignore next */
                  return null
                }
              })()

              // Internal alias of or polyfull for Buffer.from.
              util._Buffer_from = null

              // Internal alias of or polyfill for Buffer.allocUnsafe.
              util._Buffer_allocUnsafe = null

              /**
               * Creates a new buffer of whatever type supported by the environment.
               * @param {number|number[]} [sizeOrArray=0] Buffer size or number array
               * @returns {Uint8Array|Buffer} Buffer
               */
              util.newBuffer = function newBuffer(sizeOrArray) {
                /* istanbul ignore next */
                return typeof sizeOrArray === 'number'
                  ? util.Buffer
                    ? util._Buffer_allocUnsafe(sizeOrArray)
                    : new util.Array(sizeOrArray)
                  : util.Buffer
                  ? util._Buffer_from(sizeOrArray)
                  : typeof Uint8Array === 'undefined'
                  ? sizeOrArray
                  : new Uint8Array(sizeOrArray)
              }

              /**
               * Array implementation used in the browser. `Uint8Array` if supported, otherwise `Array`.
               * @type {Constructor<Uint8Array>}
               */
              util.Array =
                typeof Uint8Array !== 'undefined'
                  ? Uint8Array /* istanbul ignore next */
                  : Array

              /**
               * Any compatible Long instance.
               * This is a minimal stand-alone definition of a Long instance. The actual type is that exported by long.js.
               * @interface Long
               * @property {number} low Low bits
               * @property {number} high High bits
               * @property {boolean} unsigned Whether unsigned or not
               */

              /**
               * Long.js's Long class if available.
               * @type {Constructor<Long>}
               */
              util.Long =
                /* istanbul ignore next */ (util.global.dcodeIO &&
                  /* istanbul ignore next */ util.global.dcodeIO.Long) ||
                /* istanbul ignore next */ util.global.Long ||
                util.inquire('long')

              /**
               * Regular expression used to verify 2 bit (`bool`) map keys.
               * @type {RegExp}
               * @const
               */
              util.key2Re = /^true|false|0|1$/

              /**
               * Regular expression used to verify 32 bit (`int32` etc.) map keys.
               * @type {RegExp}
               * @const
               */
              util.key32Re = /^-?(?:0|[1-9][0-9]*)$/

              /**
               * Regular expression used to verify 64 bit (`int64` etc.) map keys.
               * @type {RegExp}
               * @const
               */
              util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/

              /**
               * Converts a number or long to an 8 characters long hash string.
               * @param {Long|number} value Value to convert
               * @returns {string} Hash
               */
              util.longToHash = function longToHash(value) {
                return value
                  ? util.LongBits.from(value).toHash()
                  : util.LongBits.zeroHash
              }

              /**
               * Converts an 8 characters long hash string to a long or number.
               * @param {string} hash Hash
               * @param {boolean} [unsigned=false] Whether unsigned or not
               * @returns {Long|number} Original value
               */
              util.longFromHash = function longFromHash(hash, unsigned) {
                var bits = util.LongBits.fromHash(hash)
                if (util.Long)
                  return util.Long.fromBits(bits.lo, bits.hi, unsigned)
                return bits.toNumber(Boolean(unsigned))
              }

              /**
               * Merges the properties of the source object into the destination object.
               * @memberof util
               * @param {Object.<string,*>} dst Destination object
               * @param {Object.<string,*>} src Source object
               * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
               * @returns {Object.<string,*>} Destination object
               */
              function merge(dst, src, ifNotSet) {
                // used by converters
                for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
                  if (dst[keys[i]] === undefined || !ifNotSet)
                    dst[keys[i]] = src[keys[i]]
                return dst
              }

              util.merge = merge

              /**
               * Converts the first character of a string to lower case.
               * @param {string} str String to convert
               * @returns {string} Converted string
               */
              util.lcFirst = function lcFirst(str) {
                return str.charAt(0).toLowerCase() + str.substring(1)
              }

              /**
               * Creates a custom error constructor.
               * @memberof util
               * @param {string} name Error name
               * @returns {Constructor<Error>} Custom error constructor
               */
              function newError(name) {
                function CustomError(message, properties) {
                  if (!(this instanceof CustomError))
                    return new CustomError(message, properties)

                  // Error.call(this, message);
                  // ^ just returns a new error instance because the ctor can be called as a function

                  Object.defineProperty(this, 'message', {
                    get: function () {
                      return message
                    }
                  })

                  /* istanbul ignore next */
                  if (Error.captureStackTrace)
                    // node
                    Error.captureStackTrace(this, CustomError)
                  else
                    Object.defineProperty(this, 'stack', {
                      value: new Error().stack || ''
                    })

                  if (properties) merge(this, properties)
                }

                ;(CustomError.prototype = Object.create(
                  Error.prototype
                )).constructor = CustomError

                Object.defineProperty(CustomError.prototype, 'name', {
                  get: function () {
                    return name
                  }
                })

                CustomError.prototype.toString = function toString() {
                  return this.name + ': ' + this.message
                }

                return CustomError
              }

              util.newError = newError

              /**
               * Constructs a new protocol error.
               * @classdesc Error subclass indicating a protocol specifc error.
               * @memberof util
               * @extends Error
               * @template T extends Message<T>
               * @constructor
               * @param {string} message Error message
               * @param {Object.<string,*>} [properties] Additional properties
               * @example
               * try {
               *     MyMessage.decode(someBuffer); // throws if required fields are missing
               * } catch (e) {
               *     if (e instanceof ProtocolError && e.instance)
               *         console.log("decoded so far: " + JSON.stringify(e.instance));
               * }
               */
              util.ProtocolError = newError('ProtocolError')

              /**
               * So far decoded message instance.
               * @name util.ProtocolError#instance
               * @type {Message<T>}
               */

              /**
               * A OneOf getter as returned by {@link util.oneOfGetter}.
               * @typedef OneOfGetter
               * @type {function}
               * @returns {string|undefined} Set field name, if any
               */

              /**
               * Builds a getter for a oneof's present field name.
               * @param {string[]} fieldNames Field names
               * @returns {OneOfGetter} Unbound getter
               */
              util.oneOfGetter = function getOneOf(fieldNames) {
                var fieldMap = {}
                for (var i = 0; i < fieldNames.length; ++i)
                  fieldMap[fieldNames[i]] = 1

                /**
                 * @returns {string|undefined} Set field name, if any
                 * @this Object
                 * @ignore
                 */
                return function () {
                  // eslint-disable-line consistent-return
                  for (
                    var keys = Object.keys(this), i = keys.length - 1;
                    i > -1;
                    --i
                  )
                    if (
                      fieldMap[keys[i]] === 1 &&
                      this[keys[i]] !== undefined &&
                      this[keys[i]] !== null
                    )
                      return keys[i]
                }
              }

              /**
               * A OneOf setter as returned by {@link util.oneOfSetter}.
               * @typedef OneOfSetter
               * @type {function}
               * @param {string|undefined} value Field name
               * @returns {undefined}
               */

              /**
               * Builds a setter for a oneof's present field name.
               * @param {string[]} fieldNames Field names
               * @returns {OneOfSetter} Unbound setter
               */
              util.oneOfSetter = function setOneOf(fieldNames) {
                /**
                 * @param {string} name Field name
                 * @returns {undefined}
                 * @this Object
                 * @ignore
                 */
                return function (name) {
                  for (var i = 0; i < fieldNames.length; ++i)
                    if (fieldNames[i] !== name) delete this[fieldNames[i]]
                }
              }

              /**
               * Default conversion options used for {@link Message#toJSON} implementations.
               *
               * These options are close to proto3's JSON mapping with the exception that internal types like Any are handled just like messages. More precisely:
               *
               * - Longs become strings
               * - Enums become string keys
               * - Bytes become base64 encoded strings
               * - (Sub-)Messages become plain objects
               * - Maps become plain objects with all string keys
               * - Repeated fields become arrays
               * - NaN and Infinity for float and double fields become strings
               *
               * @type {IConversionOptions}
               * @see https://developers.google.com/protocol-buffers/docs/proto3?hl=en#json
               */
              util.toJSONOptions = {
                longs: String,
                enums: String,
                bytes: String,
                json: true
              }

              // Sets up buffer utility according to the environment (called in index-minimal)
              util._configure = function () {
                var Buffer = util.Buffer
                /* istanbul ignore if */
                if (!Buffer) {
                  util._Buffer_from = util._Buffer_allocUnsafe = null
                  return
                }
                // because node 4.x buffers are incompatible & immutable
                // see: https://github.com/dcodeIO/protobuf.js/pull/665
                util._Buffer_from =
                  (Buffer.from !== Uint8Array.from && Buffer.from) ||
                  /* istanbul ignore next */
                  function Buffer_from(value, encoding) {
                    return new Buffer(value, encoding)
                  }
                util._Buffer_allocUnsafe =
                  Buffer.allocUnsafe ||
                  /* istanbul ignore next */
                  function Buffer_allocUnsafe(size) {
                    return new Buffer(size)
                  }
              }
            }).call(this)
          }).call(
            this,
            typeof global !== 'undefined'
              ? global
              : typeof self !== 'undefined'
              ? self
              : typeof window !== 'undefined'
              ? window
              : {}
          )
        },
        {
          './longbits': 47,
          '@protobufjs/aspromise': 6,
          '@protobufjs/base64': 7,
          '@protobufjs/eventemitter': 9,
          '@protobufjs/float': 11,
          '@protobufjs/inquire': 12,
          '@protobufjs/pool': 14,
          '@protobufjs/utf8': 15
        }
      ],
      49: [
        function (require, module, exports) {
          'use strict'
          module.exports = verifier

          var Enum = require('./enum'),
            util = require('./util')

          function invalid(field, expected) {
            return (
              field.name +
              ': ' +
              expected +
              (field.repeated && expected !== 'array'
                ? '[]'
                : field.map && expected !== 'object'
                ? '{k:' + field.keyType + '}'
                : '') +
              ' expected'
            )
          }

          /**
           * Generates a partial value verifier.
           * @param {Codegen} gen Codegen instance
           * @param {Field} field Reflected field
           * @param {number} fieldIndex Field index
           * @param {string} ref Variable reference
           * @returns {Codegen} Codegen instance
           * @ignore
           */
          function genVerifyValue(gen, field, fieldIndex, ref) {
            /* eslint-disable no-unexpected-multiline */
            if (field.resolvedType) {
              if (field.resolvedType instanceof Enum) {
                gen('switch(%s){', ref)('default:')(
                  'return%j',
                  invalid(field, 'enum value')
                )
                for (
                  var keys = Object.keys(field.resolvedType.values), j = 0;
                  j < keys.length;
                  ++j
                )
                  gen('case %i:', field.resolvedType.values[keys[j]])
                gen('break')('}')
              } else {
                gen('{')('var e=types[%i].verify(%s);', fieldIndex, ref)(
                  'if(e)'
                )(
                  'return%j+e',
                  field.name + '.'
                )('}')
              }
            } else {
              switch (field.type) {
                case 'int32':
                case 'uint32':
                case 'sint32':
                case 'fixed32':
                case 'sfixed32':
                  gen('if(!util.isInteger(%s))', ref)(
                    'return%j',
                    invalid(field, 'integer')
                  )
                  break
                case 'int64':
                case 'uint64':
                case 'sint64':
                case 'fixed64':
                case 'sfixed64':
                  gen(
                    'if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))',
                    ref,
                    ref,
                    ref,
                    ref
                  )('return%j', invalid(field, 'integer|Long'))
                  break
                case 'float':
                case 'double':
                  gen('if(typeof %s!=="number")', ref)(
                    'return%j',
                    invalid(field, 'number')
                  )
                  break
                case 'bool':
                  gen('if(typeof %s!=="boolean")', ref)(
                    'return%j',
                    invalid(field, 'boolean')
                  )
                  break
                case 'string':
                  gen('if(!util.isString(%s))', ref)(
                    'return%j',
                    invalid(field, 'string')
                  )
                  break
                case 'bytes':
                  gen(
                    'if(!(%s&&typeof %s.length==="number"||util.isString(%s)))',
                    ref,
                    ref,
                    ref
                  )('return%j', invalid(field, 'buffer'))
                  break
              }
            }
            return gen
            /* eslint-enable no-unexpected-multiline */
          }

          /**
           * Generates a partial key verifier.
           * @param {Codegen} gen Codegen instance
           * @param {Field} field Reflected field
           * @param {string} ref Variable reference
           * @returns {Codegen} Codegen instance
           * @ignore
           */
          function genVerifyKey(gen, field, ref) {
            /* eslint-disable no-unexpected-multiline */
            switch (field.keyType) {
              case 'int32':
              case 'uint32':
              case 'sint32':
              case 'fixed32':
              case 'sfixed32':
                gen('if(!util.key32Re.test(%s))', ref)(
                  'return%j',
                  invalid(field, 'integer key')
                )
                break
              case 'int64':
              case 'uint64':
              case 'sint64':
              case 'fixed64':
              case 'sfixed64':
                gen('if(!util.key64Re.test(%s))', ref)(
                  // see comment above: x is ok, d is not
                  'return%j',
                  invalid(field, 'integer|Long key')
                )
                break
              case 'bool':
                gen('if(!util.key2Re.test(%s))', ref)(
                  'return%j',
                  invalid(field, 'boolean key')
                )
                break
            }
            return gen
            /* eslint-enable no-unexpected-multiline */
          }

          /**
           * Generates a verifier specific to the specified message type.
           * @param {Type} mtype Message type
           * @returns {Codegen} Codegen instance
           */
          function verifier(mtype) {
            /* eslint-disable no-unexpected-multiline */

            var gen = util.codegen(
              ['m'],
              mtype.name + '$verify'
            )('if(typeof m!=="object"||m===null)')(
              'return%j',
              'object expected'
            )
            var oneofs = mtype.oneofsArray,
              seenFirstField = {}
            if (oneofs.length) gen('var p={}')

            for (
              var i = 0;
              i < /* initializes */ mtype.fieldsArray.length;
              ++i
            ) {
              var field = mtype._fieldsArray[i].resolve(),
                ref = 'm' + util.safeProp(field.name)

              if (field.optional)
                gen('if(%s!=null&&m.hasOwnProperty(%j)){', ref, field.name) // !== undefined && !== null

              // map fields
              if (field.map) {
                gen('if(!util.isObject(%s))', ref)(
                  'return%j',
                  invalid(field, 'object')
                )(
                  'var k=Object.keys(%s)',
                  ref
                )('for(var i=0;i<k.length;++i){')
                genVerifyKey(gen, field, 'k[i]')
                genVerifyValue(gen, field, i, ref + '[k[i]]')('}')

                // repeated fields
              } else if (field.repeated) {
                gen('if(!Array.isArray(%s))', ref)(
                  'return%j',
                  invalid(field, 'array')
                )('for(var i=0;i<%s.length;++i){', ref)
                genVerifyValue(gen, field, i, ref + '[i]')('}')

                // required or present fields
              } else {
                if (field.partOf) {
                  var oneofProp = util.safeProp(field.partOf.name)
                  if (seenFirstField[field.partOf.name] === 1)
                    gen('if(p%s===1)', oneofProp)(
                      'return%j',
                      field.partOf.name + ': multiple values'
                    )
                  seenFirstField[field.partOf.name] = 1
                  gen('p%s=1', oneofProp)
                }
                genVerifyValue(gen, field, i, ref)
              }
              if (field.optional) gen('}')
            }
            return gen('return null')
            /* eslint-enable no-unexpected-multiline */
          }
        },
        {'./enum': 27, './util': 46}
      ],
      50: [
        function (require, module, exports) {
          'use strict'

          /**
           * Wrappers for common types.
           * @type {Object.<string,IWrapper>}
           * @const
           */
          var wrappers = exports

          var Message = require('./message')

          /**
           * From object converter part of an {@link IWrapper}.
           * @typedef WrapperFromObjectConverter
           * @type {function}
           * @param {Object.<string,*>} object Plain object
           * @returns {Message<{}>} Message instance
           * @this Type
           */

          /**
           * To object converter part of an {@link IWrapper}.
           * @typedef WrapperToObjectConverter
           * @type {function}
           * @param {Message<{}>} message Message instance
           * @param {IConversionOptions} [options] Conversion options
           * @returns {Object.<string,*>} Plain object
           * @this Type
           */

          /**
           * Common type wrapper part of {@link wrappers}.
           * @interface IWrapper
           * @property {WrapperFromObjectConverter} [fromObject] From object converter
           * @property {WrapperToObjectConverter} [toObject] To object converter
           */

          // Custom wrapper for Any
          wrappers['.google.protobuf.Any'] = {
            fromObject: function (object) {
              // unwrap value type if mapped
              if (object && object['@type']) {
                // Only use fully qualified type name after the last '/'
                var name = object['@type'].substring(
                  object['@type'].lastIndexOf('/') + 1
                )
                var type = this.lookup(name)
                /* istanbul ignore else */
                if (type) {
                  // type_url does not accept leading "."
                  var type_url =
                    object['@type'].charAt(0) === '.'
                      ? object['@type'].substr(1)
                      : object['@type']
                  // type_url prefix is optional, but path seperator is required
                  if (type_url.indexOf('/') === -1) {
                    type_url = '/' + type_url
                  }
                  return this.create({
                    type_url: type_url,
                    value: type.encode(type.fromObject(object)).finish()
                  })
                }
              }

              return this.fromObject(object)
            },

            toObject: function (message, options) {
              // Default prefix
              var googleApi = 'type.googleapis.com/'
              var prefix = ''
              var name = ''

              // decode value if requested and unmapped
              if (
                options &&
                options.json &&
                message.type_url &&
                message.value
              ) {
                // Only use fully qualified type name after the last '/'
                name = message.type_url.substring(
                  message.type_url.lastIndexOf('/') + 1
                )
                // Separate the prefix used
                prefix = message.type_url.substring(
                  0,
                  message.type_url.lastIndexOf('/') + 1
                )
                var type = this.lookup(name)
                /* istanbul ignore else */
                if (type) message = type.decode(message.value)
              }

              // wrap value if unmapped
              if (
                !(message instanceof this.ctor) &&
                message instanceof Message
              ) {
                var object = message.$type.toObject(message, options)
                var messageName =
                  message.$type.fullName[0] === '.'
                    ? message.$type.fullName.substr(1)
                    : message.$type.fullName
                // Default to type.googleapis.com prefix if no prefix is used
                if (prefix === '') {
                  prefix = googleApi
                }
                name = prefix + messageName
                object['@type'] = name
                return object
              }

              return this.toObject(message, options)
            }
          }
        },
        {'./message': 32}
      ],
      51: [
        function (require, module, exports) {
          'use strict'
          module.exports = Writer

          var util = require('./util/minimal')

          var BufferWriter // cyclic

          var LongBits = util.LongBits,
            base64 = util.base64,
            utf8 = util.utf8

          /**
           * Constructs a new writer operation instance.
           * @classdesc Scheduled writer operation.
           * @constructor
           * @param {function(*, Uint8Array, number)} fn Function to call
           * @param {number} len Value byte length
           * @param {*} val Value to write
           * @ignore
           */
          function Op(fn, len, val) {
            /**
             * Function to call.
             * @type {function(Uint8Array, number, *)}
             */
            this.fn = fn

            /**
             * Value byte length.
             * @type {number}
             */
            this.len = len

            /**
             * Next operation.
             * @type {Writer.Op|undefined}
             */
            this.next = undefined

            /**
             * Value to write.
             * @type {*}
             */
            this.val = val // type varies
          }

          /* istanbul ignore next */
          function noop() {} // eslint-disable-line no-empty-function

          /**
           * Constructs a new writer state instance.
           * @classdesc Copied writer state.
           * @memberof Writer
           * @constructor
           * @param {Writer} writer Writer to copy state from
           * @ignore
           */
          function State(writer) {
            /**
             * Current head.
             * @type {Writer.Op}
             */
            this.head = writer.head

            /**
             * Current tail.
             * @type {Writer.Op}
             */
            this.tail = writer.tail

            /**
             * Current buffer length.
             * @type {number}
             */
            this.len = writer.len

            /**
             * Next state.
             * @type {State|null}
             */
            this.next = writer.states
          }

          /**
           * Constructs a new writer instance.
           * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
           * @constructor
           */
          function Writer() {
            /**
             * Current length.
             * @type {number}
             */
            this.len = 0

            /**
             * Operations head.
             * @type {Object}
             */
            this.head = new Op(noop, 0, 0)

            /**
             * Operations tail
             * @type {Object}
             */
            this.tail = this.head

            /**
             * Linked forked states.
             * @type {Object|null}
             */
            this.states = null

            // When a value is written, the writer calculates its byte length and puts it into a linked
            // list of operations to perform when finish() is called. This both allows us to allocate
            // buffers of the exact required size and reduces the amount of work we have to do compared
            // to first calculating over objects and then encoding over objects. In our case, the encoding
            // part is just a linked list walk calling operations with already prepared values.
          }

          var create = function create() {
            return util.Buffer
              ? function create_buffer_setup() {
                  return (Writer.create = function create_buffer() {
                    return new BufferWriter()
                  })()
                }
              : /* istanbul ignore next */
                function create_array() {
                  return new Writer()
                }
          }

          /**
           * Creates a new writer.
           * @function
           * @returns {BufferWriter|Writer} A {@link BufferWriter} when Buffers are supported, otherwise a {@link Writer}
           */
          Writer.create = create()

          /**
           * Allocates a buffer of the specified size.
           * @param {number} size Buffer size
           * @returns {Uint8Array} Buffer
           */
          Writer.alloc = function alloc(size) {
            return new util.Array(size)
          }

          // Use Uint8Array buffer pool in the browser, just like node does with buffers
          /* istanbul ignore else */
          if (util.Array !== Array)
            Writer.alloc = util.pool(
              Writer.alloc,
              util.Array.prototype.subarray
            )

          /**
           * Pushes a new operation to the queue.
           * @param {function(Uint8Array, number, *)} fn Function to call
           * @param {number} len Value byte length
           * @param {number} val Value to write
           * @returns {Writer} `this`
           * @private
           */
          Writer.prototype._push = function push(fn, len, val) {
            this.tail = this.tail.next = new Op(fn, len, val)
            this.len += len
            return this
          }

          function writeByte(val, buf, pos) {
            buf[pos] = val & 255
          }

          function writeVarint32(val, buf, pos) {
            while (val > 127) {
              buf[pos++] = (val & 127) | 128
              val >>>= 7
            }
            buf[pos] = val
          }

          /**
           * Constructs a new varint writer operation instance.
           * @classdesc Scheduled varint writer operation.
           * @extends Op
           * @constructor
           * @param {number} len Value byte length
           * @param {number} val Value to write
           * @ignore
           */
          function VarintOp(len, val) {
            this.len = len
            this.next = undefined
            this.val = val
          }

          VarintOp.prototype = Object.create(Op.prototype)
          VarintOp.prototype.fn = writeVarint32

          /**
           * Writes an unsigned 32 bit value as a varint.
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.uint32 = function write_uint32(value) {
            // here, the call to this.push has been inlined and a varint specific Op subclass is used.
            // uint32 is by far the most frequently used operation and benefits significantly from this.
            this.len += (this.tail = this.tail.next =
              new VarintOp(
                (value = value >>> 0) < 128
                  ? 1
                  : value < 16384
                  ? 2
                  : value < 2097152
                  ? 3
                  : value < 268435456
                  ? 4
                  : 5,
                value
              )).len
            return this
          }

          /**
           * Writes a signed 32 bit value as a varint.
           * @function
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.int32 = function write_int32(value) {
            return value < 0
              ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) // 10 bytes per spec
              : this.uint32(value)
          }

          /**
           * Writes a 32 bit value as a varint, zig-zag encoded.
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.sint32 = function write_sint32(value) {
            return this.uint32(((value << 1) ^ (value >> 31)) >>> 0)
          }

          function writeVarint64(val, buf, pos) {
            while (val.hi) {
              buf[pos++] = (val.lo & 127) | 128
              val.lo = ((val.lo >>> 7) | (val.hi << 25)) >>> 0
              val.hi >>>= 7
            }
            while (val.lo > 127) {
              buf[pos++] = (val.lo & 127) | 128
              val.lo = val.lo >>> 7
            }
            buf[pos++] = val.lo
          }

          /**
           * Writes an unsigned 64 bit value as a varint.
           * @param {Long|number|string} value Value to write
           * @returns {Writer} `this`
           * @throws {TypeError} If `value` is a string and no long library is present.
           */
          Writer.prototype.uint64 = function write_uint64(value) {
            var bits = LongBits.from(value)
            return this._push(writeVarint64, bits.length(), bits)
          }

          /**
           * Writes a signed 64 bit value as a varint.
           * @function
           * @param {Long|number|string} value Value to write
           * @returns {Writer} `this`
           * @throws {TypeError} If `value` is a string and no long library is present.
           */
          Writer.prototype.int64 = Writer.prototype.uint64

          /**
           * Writes a signed 64 bit value as a varint, zig-zag encoded.
           * @param {Long|number|string} value Value to write
           * @returns {Writer} `this`
           * @throws {TypeError} If `value` is a string and no long library is present.
           */
          Writer.prototype.sint64 = function write_sint64(value) {
            var bits = LongBits.from(value).zzEncode()
            return this._push(writeVarint64, bits.length(), bits)
          }

          /**
           * Writes a boolish value as a varint.
           * @param {boolean} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.bool = function write_bool(value) {
            return this._push(writeByte, 1, value ? 1 : 0)
          }

          function writeFixed32(val, buf, pos) {
            buf[pos] = val & 255
            buf[pos + 1] = (val >>> 8) & 255
            buf[pos + 2] = (val >>> 16) & 255
            buf[pos + 3] = val >>> 24
          }

          /**
           * Writes an unsigned 32 bit value as fixed 32 bits.
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.fixed32 = function write_fixed32(value) {
            return this._push(writeFixed32, 4, value >>> 0)
          }

          /**
           * Writes a signed 32 bit value as fixed 32 bits.
           * @function
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.sfixed32 = Writer.prototype.fixed32

          /**
           * Writes an unsigned 64 bit value as fixed 64 bits.
           * @param {Long|number|string} value Value to write
           * @returns {Writer} `this`
           * @throws {TypeError} If `value` is a string and no long library is present.
           */
          Writer.prototype.fixed64 = function write_fixed64(value) {
            var bits = LongBits.from(value)
            return this._push(writeFixed32, 4, bits.lo)._push(
              writeFixed32,
              4,
              bits.hi
            )
          }

          /**
           * Writes a signed 64 bit value as fixed 64 bits.
           * @function
           * @param {Long|number|string} value Value to write
           * @returns {Writer} `this`
           * @throws {TypeError} If `value` is a string and no long library is present.
           */
          Writer.prototype.sfixed64 = Writer.prototype.fixed64

          /**
           * Writes a float (32 bit).
           * @function
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.float = function write_float(value) {
            return this._push(util.float.writeFloatLE, 4, value)
          }

          /**
           * Writes a double (64 bit float).
           * @function
           * @param {number} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.double = function write_double(value) {
            return this._push(util.float.writeDoubleLE, 8, value)
          }

          var writeBytes = util.Array.prototype.set
            ? function writeBytes_set(val, buf, pos) {
                buf.set(val, pos) // also works for plain array values
              }
            : /* istanbul ignore next */
              function writeBytes_for(val, buf, pos) {
                for (var i = 0; i < val.length; ++i) buf[pos + i] = val[i]
              }

          /**
           * Writes a sequence of bytes.
           * @param {Uint8Array|string} value Buffer or base64 encoded string to write
           * @returns {Writer} `this`
           */
          Writer.prototype.bytes = function write_bytes(value) {
            var len = value.length >>> 0
            if (!len) return this._push(writeByte, 1, 0)
            if (util.isString(value)) {
              var buf = Writer.alloc((len = base64.length(value)))
              base64.decode(value, buf, 0)
              value = buf
            }
            return this.uint32(len)._push(writeBytes, len, value)
          }

          /**
           * Writes a string.
           * @param {string} value Value to write
           * @returns {Writer} `this`
           */
          Writer.prototype.string = function write_string(value) {
            var len = utf8.length(value)
            return len
              ? this.uint32(len)._push(utf8.write, len, value)
              : this._push(writeByte, 1, 0)
          }

          /**
           * Forks this writer's state by pushing it to a stack.
           * Calling {@link Writer#reset|reset} or {@link Writer#ldelim|ldelim} resets the writer to the previous state.
           * @returns {Writer} `this`
           */
          Writer.prototype.fork = function fork() {
            this.states = new State(this)
            this.head = this.tail = new Op(noop, 0, 0)
            this.len = 0
            return this
          }

          /**
           * Resets this instance to the last state.
           * @returns {Writer} `this`
           */
          Writer.prototype.reset = function reset() {
            if (this.states) {
              this.head = this.states.head
              this.tail = this.states.tail
              this.len = this.states.len
              this.states = this.states.next
            } else {
              this.head = this.tail = new Op(noop, 0, 0)
              this.len = 0
            }
            return this
          }

          /**
           * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
           * @returns {Writer} `this`
           */
          Writer.prototype.ldelim = function ldelim() {
            var head = this.head,
              tail = this.tail,
              len = this.len
            this.reset().uint32(len)
            if (len) {
              this.tail.next = head.next // skip noop
              this.tail = tail
              this.len += len
            }
            return this
          }

          /**
           * Finishes the write operation.
           * @returns {Uint8Array} Finished buffer
           */
          Writer.prototype.finish = function finish() {
            var head = this.head.next, // skip noop
              buf = this.constructor.alloc(this.len),
              pos = 0
            while (head) {
              head.fn(head.val, buf, pos)
              pos += head.len
              head = head.next
            }
            // this.head = this.tail = null;
            return buf
          }

          Writer._configure = function (BufferWriter_) {
            BufferWriter = BufferWriter_
            Writer.create = create()
            BufferWriter._configure()
          }
        },
        {'./util/minimal': 48}
      ],
      52: [
        function (require, module, exports) {
          'use strict'
          module.exports = BufferWriter

          // extends Writer
          var Writer = require('./writer')
          ;(BufferWriter.prototype = Object.create(
            Writer.prototype
          )).constructor = BufferWriter

          var util = require('./util/minimal')

          /**
           * Constructs a new buffer writer instance.
           * @classdesc Wire format writer using node buffers.
           * @extends Writer
           * @constructor
           */
          function BufferWriter() {
            Writer.call(this)
          }

          BufferWriter._configure = function () {
            /**
             * Allocates a buffer of the specified size.
             * @function
             * @param {number} size Buffer size
             * @returns {Buffer} Buffer
             */
            BufferWriter.alloc = util._Buffer_allocUnsafe

            BufferWriter.writeBytesBuffer =
              util.Buffer &&
              util.Buffer.prototype instanceof Uint8Array &&
              util.Buffer.prototype.set.name === 'set'
                ? function writeBytesBuffer_set(val, buf, pos) {
                    buf.set(val, pos) // faster than copy (requires node >= 4 where Buffers extend Uint8Array and set is properly inherited)
                    // also works for plain array values
                  }
                : /* istanbul ignore next */
                  function writeBytesBuffer_copy(val, buf, pos) {
                    if (val.copy)
                      // Buffer values
                      val.copy(buf, pos, 0, val.length)
                    else
                      for (
                        var i = 0;
                        i < val.length; // plain array values

                      )
                        buf[pos++] = val[i++]
                  }
          }

          /**
           * @override
           */
          BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
            if (util.isString(value)) value = util._Buffer_from(value, 'base64')
            var len = value.length >>> 0
            this.uint32(len)
            if (len) this._push(BufferWriter.writeBytesBuffer, len, value)
            return this
          }

          function writeStringBuffer(val, buf, pos) {
            if (val.length < 40)
              // plain js is faster for short strings (probably due to redundant assertions)
              util.utf8.write(val, buf, pos)
            else if (buf.utf8Write) buf.utf8Write(val, pos)
            else buf.write(val, pos)
          }

          /**
           * @override
           */
          BufferWriter.prototype.string = function write_string_buffer(value) {
            var len = util.Buffer.byteLength(value)
            this.uint32(len)
            if (len) this._push(writeStringBuffer, len, value)
            return this
          }

          /**
           * Finishes the write operation.
           * @name BufferWriter#finish
           * @function
           * @returns {Buffer} Finished buffer
           */

          BufferWriter._configure()
        },
        {'./util/minimal': 48, './writer': 51}
      ],
      53: [
        function (require, module, exports) {
          ;(function (global) {
            ;(function () {
              /******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
              /* global global, define, System, Reflect, Promise */
              var __extends
              var __assign
              var __rest
              var __decorate
              var __param
              var __esDecorate
              var __runInitializers
              var __propKey
              var __setFunctionName
              var __metadata
              var __awaiter
              var __generator
              var __exportStar
              var __values
              var __read
              var __spread
              var __spreadArrays
              var __spreadArray
              var __await
              var __asyncGenerator
              var __asyncDelegator
              var __asyncValues
              var __makeTemplateObject
              var __importStar
              var __importDefault
              var __classPrivateFieldGet
              var __classPrivateFieldSet
              var __classPrivateFieldIn
              var __createBinding
              ;(function (factory) {
                var root =
                  typeof global === 'object'
                    ? global
                    : typeof self === 'object'
                    ? self
                    : typeof this === 'object'
                    ? this
                    : {}
                if (typeof define === 'function' && define.amd) {
                  define('tslib', ['exports'], function (exports) {
                    factory(createExporter(root, createExporter(exports)))
                  })
                } else if (
                  typeof module === 'object' &&
                  typeof module.exports === 'object'
                ) {
                  factory(createExporter(root, createExporter(module.exports)))
                } else {
                  factory(createExporter(root))
                }
                function createExporter(exports, previous) {
                  if (exports !== root) {
                    if (typeof Object.create === 'function') {
                      Object.defineProperty(exports, '__esModule', {
                        value: true
                      })
                    } else {
                      exports.__esModule = true
                    }
                  }
                  return function (id, v) {
                    return (exports[id] = previous ? previous(id, v) : v)
                  }
                }
              })(function (exporter) {
                var extendStatics =
                  Object.setPrototypeOf ||
                  ({__proto__: []} instanceof Array &&
                    function (d, b) {
                      d.__proto__ = b
                    }) ||
                  function (d, b) {
                    for (var p in b)
                      if (Object.prototype.hasOwnProperty.call(b, p))
                        d[p] = b[p]
                  }

                __extends = function (d, b) {
                  if (typeof b !== 'function' && b !== null)
                    throw new TypeError(
                      'Class extends value ' +
                        String(b) +
                        ' is not a constructor or null'
                    )
                  extendStatics(d, b)
                  function __() {
                    this.constructor = d
                  }
                  d.prototype =
                    b === null
                      ? Object.create(b)
                      : ((__.prototype = b.prototype), new __())
                }

                __assign =
                  Object.assign ||
                  function (t) {
                    for (var s, i = 1, n = arguments.length; i < n; i++) {
                      s = arguments[i]
                      for (var p in s)
                        if (Object.prototype.hasOwnProperty.call(s, p))
                          t[p] = s[p]
                    }
                    return t
                  }

                __rest = function (s, e) {
                  var t = {}
                  for (var p in s)
                    if (
                      Object.prototype.hasOwnProperty.call(s, p) &&
                      e.indexOf(p) < 0
                    )
                      t[p] = s[p]
                  if (
                    s != null &&
                    typeof Object.getOwnPropertySymbols === 'function'
                  )
                    for (
                      var i = 0, p = Object.getOwnPropertySymbols(s);
                      i < p.length;
                      i++
                    ) {
                      if (
                        e.indexOf(p[i]) < 0 &&
                        Object.prototype.propertyIsEnumerable.call(s, p[i])
                      )
                        t[p[i]] = s[p[i]]
                    }
                  return t
                }

                __decorate = function (decorators, target, key, desc) {
                  var c = arguments.length,
                    r =
                      c < 3
                        ? target
                        : desc === null
                        ? (desc = Object.getOwnPropertyDescriptor(target, key))
                        : desc,
                    d
                  if (
                    typeof Reflect === 'object' &&
                    typeof Reflect.decorate === 'function'
                  )
                    r = Reflect.decorate(decorators, target, key, desc)
                  else
                    for (var i = decorators.length - 1; i >= 0; i--)
                      if ((d = decorators[i]))
                        r =
                          (c < 3
                            ? d(r)
                            : c > 3
                            ? d(target, key, r)
                            : d(target, key)) || r
                  return c > 3 && r && Object.defineProperty(target, key, r), r
                }

                __param = function (paramIndex, decorator) {
                  return function (target, key) {
                    decorator(target, key, paramIndex)
                  }
                }

                __esDecorate = function (
                  ctor,
                  descriptorIn,
                  decorators,
                  contextIn,
                  initializers,
                  extraInitializers
                ) {
                  function accept(f) {
                    if (f !== void 0 && typeof f !== 'function')
                      throw new TypeError('Function expected')
                    return f
                  }
                  var kind = contextIn.kind,
                    key =
                      kind === 'getter'
                        ? 'get'
                        : kind === 'setter'
                        ? 'set'
                        : 'value'
                  var target =
                    !descriptorIn && ctor
                      ? contextIn['static']
                        ? ctor
                        : ctor.prototype
                      : null
                  var descriptor =
                    descriptorIn ||
                    (target
                      ? Object.getOwnPropertyDescriptor(target, contextIn.name)
                      : {})
                  var _,
                    done = false
                  for (var i = decorators.length - 1; i >= 0; i--) {
                    var context = {}
                    for (var p in contextIn)
                      context[p] = p === 'access' ? {} : contextIn[p]
                    for (var p in contextIn.access)
                      context.access[p] = contextIn.access[p]
                    context.addInitializer = function (f) {
                      if (done)
                        throw new TypeError(
                          'Cannot add initializers after decoration has completed'
                        )
                      extraInitializers.push(accept(f || null))
                    }
                    var result = (0, decorators[i])(
                      kind === 'accessor'
                        ? {get: descriptor.get, set: descriptor.set}
                        : descriptor[key],
                      context
                    )
                    if (kind === 'accessor') {
                      if (result === void 0) continue
                      if (result === null || typeof result !== 'object')
                        throw new TypeError('Object expected')
                      if ((_ = accept(result.get))) descriptor.get = _
                      if ((_ = accept(result.set))) descriptor.set = _
                      if ((_ = accept(result.init))) initializers.push(_)
                    } else if ((_ = accept(result))) {
                      if (kind === 'field') initializers.push(_)
                      else descriptor[key] = _
                    }
                  }
                  if (target)
                    Object.defineProperty(target, contextIn.name, descriptor)
                  done = true
                }

                __runInitializers = function (thisArg, initializers, value) {
                  var useValue = arguments.length > 2
                  for (var i = 0; i < initializers.length; i++) {
                    value = useValue
                      ? initializers[i].call(thisArg, value)
                      : initializers[i].call(thisArg)
                  }
                  return useValue ? value : void 0
                }

                __propKey = function (x) {
                  return typeof x === 'symbol' ? x : ''.concat(x)
                }

                __setFunctionName = function (f, name, prefix) {
                  if (typeof name === 'symbol')
                    name = name.description
                      ? '['.concat(name.description, ']')
                      : ''
                  return Object.defineProperty(f, 'name', {
                    configurable: true,
                    value: prefix ? ''.concat(prefix, ' ', name) : name
                  })
                }

                __metadata = function (metadataKey, metadataValue) {
                  if (
                    typeof Reflect === 'object' &&
                    typeof Reflect.metadata === 'function'
                  )
                    return Reflect.metadata(metadataKey, metadataValue)
                }

                __awaiter = function (thisArg, _arguments, P, generator) {
                  function adopt(value) {
                    return value instanceof P
                      ? value
                      : new P(function (resolve) {
                          resolve(value)
                        })
                  }
                  return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value) {
                      try {
                        step(generator.next(value))
                      } catch (e) {
                        reject(e)
                      }
                    }
                    function rejected(value) {
                      try {
                        step(generator['throw'](value))
                      } catch (e) {
                        reject(e)
                      }
                    }
                    function step(result) {
                      result.done
                        ? resolve(result.value)
                        : adopt(result.value).then(fulfilled, rejected)
                    }
                    step(
                      (generator = generator.apply(
                        thisArg,
                        _arguments || []
                      )).next()
                    )
                  })
                }

                __generator = function (thisArg, body) {
                  var _ = {
                      label: 0,
                      sent: function () {
                        if (t[0] & 1) throw t[1]
                        return t[1]
                      },
                      trys: [],
                      ops: []
                    },
                    f,
                    y,
                    t,
                    g
                  return (
                    (g = {next: verb(0), throw: verb(1), return: verb(2)}),
                    typeof Symbol === 'function' &&
                      (g[Symbol.iterator] = function () {
                        return this
                      }),
                    g
                  )
                  function verb(n) {
                    return function (v) {
                      return step([n, v])
                    }
                  }
                  function step(op) {
                    if (f)
                      throw new TypeError('Generator is already executing.')
                    while ((g && ((g = 0), op[0] && (_ = 0)), _))
                      try {
                        if (
                          ((f = 1),
                          y &&
                            (t =
                              op[0] & 2
                                ? y['return']
                                : op[0]
                                ? y['throw'] ||
                                  ((t = y['return']) && t.call(y), 0)
                                : y.next) &&
                            !(t = t.call(y, op[1])).done)
                        )
                          return t
                        if (((y = 0), t)) op = [op[0] & 2, t.value]
                        switch (op[0]) {
                          case 0:
                          case 1:
                            t = op
                            break
                          case 4:
                            _.label++
                            return {value: op[1], done: false}
                          case 5:
                            _.label++
                            y = op[1]
                            op = [0]
                            continue
                          case 7:
                            op = _.ops.pop()
                            _.trys.pop()
                            continue
                          default:
                            if (
                              !((t = _.trys),
                              (t = t.length > 0 && t[t.length - 1])) &&
                              (op[0] === 6 || op[0] === 2)
                            ) {
                              _ = 0
                              continue
                            }
                            if (
                              op[0] === 3 &&
                              (!t || (op[1] > t[0] && op[1] < t[3]))
                            ) {
                              _.label = op[1]
                              break
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                              _.label = t[1]
                              t = op
                              break
                            }
                            if (t && _.label < t[2]) {
                              _.label = t[2]
                              _.ops.push(op)
                              break
                            }
                            if (t[2]) _.ops.pop()
                            _.trys.pop()
                            continue
                        }
                        op = body.call(thisArg, _)
                      } catch (e) {
                        op = [6, e]
                        y = 0
                      } finally {
                        f = t = 0
                      }
                    if (op[0] & 5) throw op[1]
                    return {value: op[0] ? op[1] : void 0, done: true}
                  }
                }

                __exportStar = function (m, o) {
                  for (var p in m)
                    if (
                      p !== 'default' &&
                      !Object.prototype.hasOwnProperty.call(o, p)
                    )
                      __createBinding(o, m, p)
                }

                __createBinding = Object.create
                  ? function (o, m, k, k2) {
                      if (k2 === undefined) k2 = k
                      var desc = Object.getOwnPropertyDescriptor(m, k)
                      if (
                        !desc ||
                        ('get' in desc
                          ? !m.__esModule
                          : desc.writable || desc.configurable)
                      ) {
                        desc = {
                          enumerable: true,
                          get: function () {
                            return m[k]
                          }
                        }
                      }
                      Object.defineProperty(o, k2, desc)
                    }
                  : function (o, m, k, k2) {
                      if (k2 === undefined) k2 = k
                      o[k2] = m[k]
                    }

                __values = function (o) {
                  var s = typeof Symbol === 'function' && Symbol.iterator,
                    m = s && o[s],
                    i = 0
                  if (m) return m.call(o)
                  if (o && typeof o.length === 'number')
                    return {
                      next: function () {
                        if (o && i >= o.length) o = void 0
                        return {value: o && o[i++], done: !o}
                      }
                    }
                  throw new TypeError(
                    s
                      ? 'Object is not iterable.'
                      : 'Symbol.iterator is not defined.'
                  )
                }

                __read = function (o, n) {
                  var m = typeof Symbol === 'function' && o[Symbol.iterator]
                  if (!m) return o
                  var i = m.call(o),
                    r,
                    ar = [],
                    e
                  try {
                    while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                      ar.push(r.value)
                  } catch (error) {
                    e = {error: error}
                  } finally {
                    try {
                      if (r && !r.done && (m = i['return'])) m.call(i)
                    } finally {
                      if (e) throw e.error
                    }
                  }
                  return ar
                }

                /** @deprecated */
                __spread = function () {
                  for (var ar = [], i = 0; i < arguments.length; i++)
                    ar = ar.concat(__read(arguments[i]))
                  return ar
                }

                /** @deprecated */
                __spreadArrays = function () {
                  for (var s = 0, i = 0, il = arguments.length; i < il; i++)
                    s += arguments[i].length
                  for (var r = Array(s), k = 0, i = 0; i < il; i++)
                    for (
                      var a = arguments[i], j = 0, jl = a.length;
                      j < jl;
                      j++, k++
                    )
                      r[k] = a[j]
                  return r
                }

                __spreadArray = function (to, from, pack) {
                  if (pack || arguments.length === 2)
                    for (var i = 0, l = from.length, ar; i < l; i++) {
                      if (ar || !(i in from)) {
                        if (!ar) ar = Array.prototype.slice.call(from, 0, i)
                        ar[i] = from[i]
                      }
                    }
                  return to.concat(ar || Array.prototype.slice.call(from))
                }

                __await = function (v) {
                  return this instanceof __await
                    ? ((this.v = v), this)
                    : new __await(v)
                }

                __asyncGenerator = function (thisArg, _arguments, generator) {
                  if (!Symbol.asyncIterator)
                    throw new TypeError('Symbol.asyncIterator is not defined.')
                  var g = generator.apply(thisArg, _arguments || []),
                    i,
                    q = []
                  return (
                    (i = {}),
                    verb('next'),
                    verb('throw'),
                    verb('return'),
                    (i[Symbol.asyncIterator] = function () {
                      return this
                    }),
                    i
                  )
                  function verb(n) {
                    if (g[n])
                      i[n] = function (v) {
                        return new Promise(function (a, b) {
                          q.push([n, v, a, b]) > 1 || resume(n, v)
                        })
                      }
                  }
                  function resume(n, v) {
                    try {
                      step(g[n](v))
                    } catch (e) {
                      settle(q[0][3], e)
                    }
                  }
                  function step(r) {
                    r.value instanceof __await
                      ? Promise.resolve(r.value.v).then(fulfill, reject)
                      : settle(q[0][2], r)
                  }
                  function fulfill(value) {
                    resume('next', value)
                  }
                  function reject(value) {
                    resume('throw', value)
                  }
                  function settle(f, v) {
                    if ((f(v), q.shift(), q.length)) resume(q[0][0], q[0][1])
                  }
                }

                __asyncDelegator = function (o) {
                  var i, p
                  return (
                    (i = {}),
                    verb('next'),
                    verb('throw', function (e) {
                      throw e
                    }),
                    verb('return'),
                    (i[Symbol.iterator] = function () {
                      return this
                    }),
                    i
                  )
                  function verb(n, f) {
                    i[n] = o[n]
                      ? function (v) {
                          return (p = !p)
                            ? {value: __await(o[n](v)), done: false}
                            : f
                            ? f(v)
                            : v
                        }
                      : f
                  }
                }

                __asyncValues = function (o) {
                  if (!Symbol.asyncIterator)
                    throw new TypeError('Symbol.asyncIterator is not defined.')
                  var m = o[Symbol.asyncIterator],
                    i
                  return m
                    ? m.call(o)
                    : ((o =
                        typeof __values === 'function'
                          ? __values(o)
                          : o[Symbol.iterator]()),
                      (i = {}),
                      verb('next'),
                      verb('throw'),
                      verb('return'),
                      (i[Symbol.asyncIterator] = function () {
                        return this
                      }),
                      i)
                  function verb(n) {
                    i[n] =
                      o[n] &&
                      function (v) {
                        return new Promise(function (resolve, reject) {
                          ;(v = o[n](v)),
                            settle(resolve, reject, v.done, v.value)
                        })
                      }
                  }
                  function settle(resolve, reject, d, v) {
                    Promise.resolve(v).then(function (v) {
                      resolve({value: v, done: d})
                    }, reject)
                  }
                }

                __makeTemplateObject = function (cooked, raw) {
                  if (Object.defineProperty) {
                    Object.defineProperty(cooked, 'raw', {value: raw})
                  } else {
                    cooked.raw = raw
                  }
                  return cooked
                }

                var __setModuleDefault = Object.create
                  ? function (o, v) {
                      Object.defineProperty(o, 'default', {
                        enumerable: true,
                        value: v
                      })
                    }
                  : function (o, v) {
                      o['default'] = v
                    }

                __importStar = function (mod) {
                  if (mod && mod.__esModule) return mod
                  var result = {}
                  if (mod != null)
                    for (var k in mod)
                      if (
                        k !== 'default' &&
                        Object.prototype.hasOwnProperty.call(mod, k)
                      )
                        __createBinding(result, mod, k)
                  __setModuleDefault(result, mod)
                  return result
                }

                __importDefault = function (mod) {
                  return mod && mod.__esModule ? mod : {default: mod}
                }

                __classPrivateFieldGet = function (receiver, state, kind, f) {
                  if (kind === 'a' && !f)
                    throw new TypeError(
                      'Private accessor was defined without a getter'
                    )
                  if (
                    typeof state === 'function'
                      ? receiver !== state || !f
                      : !state.has(receiver)
                  )
                    throw new TypeError(
                      'Cannot read private member from an object whose class did not declare it'
                    )
                  return kind === 'm'
                    ? f
                    : kind === 'a'
                    ? f.call(receiver)
                    : f
                    ? f.value
                    : state.get(receiver)
                }

                __classPrivateFieldSet = function (
                  receiver,
                  state,
                  value,
                  kind,
                  f
                ) {
                  if (kind === 'm')
                    throw new TypeError('Private method is not writable')
                  if (kind === 'a' && !f)
                    throw new TypeError(
                      'Private accessor was defined without a setter'
                    )
                  if (
                    typeof state === 'function'
                      ? receiver !== state || !f
                      : !state.has(receiver)
                  )
                    throw new TypeError(
                      'Cannot write private member to an object whose class did not declare it'
                    )
                  return (
                    kind === 'a'
                      ? f.call(receiver, value)
                      : f
                      ? (f.value = value)
                      : state.set(receiver, value),
                    value
                  )
                }

                __classPrivateFieldIn = function (state, receiver) {
                  if (
                    receiver === null ||
                    (typeof receiver !== 'object' &&
                      typeof receiver !== 'function')
                  )
                    throw new TypeError(
                      "Cannot use 'in' operator on non-object"
                    )
                  return typeof state === 'function'
                    ? receiver === state
                    : state.has(receiver)
                }

                exporter('__extends', __extends)
                exporter('__assign', __assign)
                exporter('__rest', __rest)
                exporter('__decorate', __decorate)
                exporter('__param', __param)
                exporter('__esDecorate', __esDecorate)
                exporter('__runInitializers', __runInitializers)
                exporter('__propKey', __propKey)
                exporter('__setFunctionName', __setFunctionName)
                exporter('__metadata', __metadata)
                exporter('__awaiter', __awaiter)
                exporter('__generator', __generator)
                exporter('__exportStar', __exportStar)
                exporter('__createBinding', __createBinding)
                exporter('__values', __values)
                exporter('__read', __read)
                exporter('__spread', __spread)
                exporter('__spreadArrays', __spreadArrays)
                exporter('__spreadArray', __spreadArray)
                exporter('__await', __await)
                exporter('__asyncGenerator', __asyncGenerator)
                exporter('__asyncDelegator', __asyncDelegator)
                exporter('__asyncValues', __asyncValues)
                exporter('__makeTemplateObject', __makeTemplateObject)
                exporter('__importStar', __importStar)
                exporter('__importDefault', __importDefault)
                exporter('__classPrivateFieldGet', __classPrivateFieldGet)
                exporter('__classPrivateFieldSet', __classPrivateFieldSet)
                exporter('__classPrivateFieldIn', __classPrivateFieldIn)
              })
            }).call(this)
          }).call(
            this,
            typeof global !== 'undefined'
              ? global
              : typeof self !== 'undefined'
              ? self
              : typeof window !== 'undefined'
              ? window
              : {}
          )
        },
        {}
      ],
      54: [
        function (require, module, exports) {
          ;(function (global) {
            ;(function () {
              'use strict'
              Object.defineProperty(exports, '__esModule', {value: true})
              exports.parseConnectSettings = exports.getEnv = void 0
              const exports_1 = require('@trezor/connect/lib/exports')
              const getEnv = () => {
                var _a
                if (
                  typeof chrome !== 'undefined' &&
                  typeof ((_a = chrome.runtime) === null || _a === void 0
                    ? void 0
                    : _a.onConnect) !== 'undefined'
                ) {
                  return 'webextension'
                }
                if (typeof navigator !== 'undefined') {
                  if (
                    typeof navigator.product === 'string' &&
                    navigator.product.toLowerCase() === 'reactnative'
                  ) {
                    return 'react-native'
                  }
                  const userAgent = navigator.userAgent.toLowerCase()
                  if (userAgent.indexOf(' electron/') > -1) {
                    return 'electron'
                  }
                }
                return 'web'
              }
              exports.getEnv = getEnv
              const parseConnectSettings = (input = {}) => {
                var _a
                const settings = Object.assign({popup: true}, input)
                let globalSrc
                if (typeof window !== 'undefined') {
                  globalSrc = window.__TREZOR_CONNECT_SRC
                } else if (typeof global !== 'undefined') {
                  globalSrc = global.__TREZOR_CONNECT_SRC
                }
                if (typeof globalSrc === 'string') {
                  settings.connectSrc = globalSrc
                  settings.debug = true
                }
                if (
                  typeof window !== 'undefined' &&
                  typeof ((_a = window.location) === null || _a === void 0
                    ? void 0
                    : _a.search) === 'string'
                ) {
                  const vars = window.location.search.split('&')
                  const customUrl = vars.find(
                    v => v.indexOf('trezor-connect-src') >= 0
                  )
                  if (customUrl) {
                    const [, connectSrc] = customUrl.split('=')
                    settings.connectSrc = decodeURIComponent(connectSrc)
                    settings.debug = true
                  }
                }
                if (typeof input.env !== 'string') {
                  settings.env = (0, exports.getEnv)()
                }
                return (0, exports_1.parseConnectSettings)(settings)
              }
              exports.parseConnectSettings = parseConnectSettings
            }).call(this)
          }).call(
            this,
            typeof global !== 'undefined'
              ? global
              : typeof self !== 'undefined'
              ? self
              : typeof window !== 'undefined'
              ? window
              : {}
          )
        },
        {'@trezor/connect/lib/exports': 80}
      ],
      55: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.clearTimeout =
            exports.postMessage =
            exports.init =
            exports.dispose =
            exports.messagePromises =
            exports.error =
            exports.timeout =
            exports.initPromise =
            exports.origin =
            exports.instance =
              void 0
          const tslib_1 = require('tslib')
          const utils_1 = require('@trezor/utils')
          const index_1 = require('@trezor/connect/lib/index')
          const urlUtils_1 = require('@trezor/connect/lib/utils/urlUtils')
          const inlineStyles_1 = tslib_1.__importDefault(
            require('./inlineStyles')
          )
          exports.initPromise = (0, utils_1.createDeferred)()
          exports.timeout = 0
          let _messageID = 0
          exports.messagePromises = {}
          const dispose = () => {
            if (exports.instance && exports.instance.parentNode) {
              try {
                exports.instance.parentNode.removeChild(exports.instance)
              } catch (e) {}
            }
            exports.instance = null
            exports.timeout = 0
          }
          exports.dispose = dispose
          const handleIframeBlocked = () => {
            window.clearTimeout(exports.timeout)
            exports.error = index_1.ERRORS.TypedError('Init_IframeBlocked')
            ;(0, exports.dispose)()
            exports.initPromise.reject(exports.error)
          }
          const injectStyleSheet = () => {
            if (!exports.instance) {
              throw index_1.ERRORS.TypedError('Init_IframeBlocked')
            }
            const doc = exports.instance.ownerDocument
            const head = doc.head || doc.getElementsByTagName('head')[0]
            const style = document.createElement('style')
            style.setAttribute('type', 'text/css')
            style.setAttribute('id', 'TrezorConnectStylesheet')
            if (style.styleSheet) {
              style.styleSheet.cssText = inlineStyles_1.default
              head.appendChild(style)
            } else {
              style.appendChild(document.createTextNode(inlineStyles_1.default))
              head.append(style)
            }
          }
          const init = async settings => {
            var _a
            exports.initPromise = (0, utils_1.createDeferred)()
            const existedFrame = document.getElementById('trezorconnect')
            if (existedFrame) {
              exports.instance = existedFrame
            } else {
              exports.instance = document.createElement('iframe')
              exports.instance.frameBorder = '0'
              exports.instance.width = '0px'
              exports.instance.height = '0px'
              exports.instance.style.position = 'absolute'
              exports.instance.style.display = 'none'
              exports.instance.style.border = '0px'
              exports.instance.style.width = '0px'
              exports.instance.style.height = '0px'
              exports.instance.id = 'trezorconnect'
            }
            let src
            if (settings.env === 'web') {
              const manifestString = settings.manifest
                ? JSON.stringify(settings.manifest)
                : 'undefined'
              const manifest = `version=${
                settings.version
              }&manifest=${encodeURIComponent(
                btoa(JSON.stringify(manifestString))
              )}`
              src = `${settings.iframeSrc}?${manifest}`
            } else {
              src = settings.iframeSrc
            }
            exports.instance.setAttribute('src', src)
            if (settings.webusb) {
              console.warn(
                'webusb option is deprecated. use `transports: ["WebUsbTransport"] instead`'
              )
            }
            if (
              settings.webusb ||
              ((_a = settings.transports) === null || _a === void 0
                ? void 0
                : _a.includes('WebUsbTransport'))
            ) {
              exports.instance.setAttribute('allow', 'usb')
            }
            exports.origin = (0, urlUtils_1.getOrigin)(exports.instance.src)
            exports.timeout = window.setTimeout(() => {
              exports.initPromise.reject(
                index_1.ERRORS.TypedError('Init_IframeTimeout')
              )
            }, 10000)
            const onLoad = () => {
              var _a, _b
              if (!exports.instance) {
                exports.initPromise.reject(
                  index_1.ERRORS.TypedError('Init_IframeBlocked')
                )
                return
              }
              try {
                const iframeOrigin =
                  (_a = exports.instance.contentWindow) === null ||
                  _a === void 0
                    ? void 0
                    : _a.location.origin
                if (!iframeOrigin || iframeOrigin === 'null') {
                  handleIframeBlocked()
                  return
                }
              } catch (e) {}
              let extension
              if (
                typeof chrome !== 'undefined' &&
                chrome.runtime &&
                typeof chrome.runtime.onConnect !== 'undefined'
              ) {
                chrome.runtime.onConnect.addListener(() => {})
                extension = chrome.runtime.id
              }
              ;(_b = exports.instance.contentWindow) === null || _b === void 0
                ? void 0
                : _b.postMessage(
                    {
                      type: index_1.IFRAME.INIT,
                      payload: {
                        settings,
                        extension
                      }
                    },
                    exports.origin
                  )
              exports.instance.onload = null
            }
            if (exports.instance.attachEvent) {
              exports.instance.attachEvent('onload', onLoad)
            } else {
              exports.instance.onload = onLoad
            }
            if (document.body) {
              document.body.appendChild(exports.instance)
              injectStyleSheet()
            }
            try {
              await exports.initPromise.promise
            } catch (e) {
              if (exports.instance) {
                if (exports.instance.parentNode) {
                  exports.instance.parentNode.removeChild(exports.instance)
                }
                exports.instance = null
              }
              throw e
            } finally {
              window.clearTimeout(exports.timeout)
              exports.timeout = 0
            }
          }
          exports.init = init
          const postMessage = (message, usePromise = true) => {
            var _a, _b
            if (!exports.instance) {
              throw index_1.ERRORS.TypedError('Init_IframeBlocked')
            }
            if (usePromise) {
              _messageID++
              message.id = _messageID
              exports.messagePromises[_messageID] = (0,
              utils_1.createDeferred)()
              const {promise} = exports.messagePromises[_messageID]
              ;(_a = exports.instance.contentWindow) === null || _a === void 0
                ? void 0
                : _a.postMessage(message, exports.origin)
              return promise
            }
            ;(_b = exports.instance.contentWindow) === null || _b === void 0
              ? void 0
              : _b.postMessage(message, exports.origin)
            return null
          }
          exports.postMessage = postMessage
          const clearTimeout = () => {
            window.clearTimeout(exports.timeout)
          }
          exports.clearTimeout = clearTimeout
        },
        {
          './inlineStyles': 56,
          '@trezor/connect/lib/index': 82,
          '@trezor/connect/lib/utils/urlUtils': 100,
          '@trezor/utils': 140,
          tslib: 53
        }
      ],
      56: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          const css =
            '.trezorconnect-container{position:fixed!important;display:-webkit-box!important;display:-webkit-flex!important;display:-ms-flexbox!important;display:flex!important;-webkit-box-orient:vertical!important;-webkit-box-direction:normal!important;-webkit-flex-direction:column!important;-ms-flex-direction:column!important;flex-direction:column!important;-webkit-box-align:center!important;-webkit-align-items:center!important;-ms-flex-align:center!important;align-items:center!important;z-index:10000!important;width:100%!important;height:100%!important;top:0!important;left:0!important;background:rgba(0,0,0,.35)!important;overflow:auto!important;padding:20px!important;margin:0!important}.trezorconnect-container .trezorconnect-window{position:relative!important;display:block!important;width:370px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif!important;margin:auto!important;border-radius:3px!important;background-color:#fff!important;text-align:center!important;overflow:hidden!important}.trezorconnect-container .trezorconnect-window .trezorconnect-head{text-align:left;padding:12px 24px!important;display:-webkit-box!important;display:-webkit-flex!important;display:-ms-flexbox!important;display:flex!important;-webkit-box-align:center!important;-webkit-align-items:center!important;-ms-flex-align:center!important;align-items:center!important}.trezorconnect-container .trezorconnect-window .trezorconnect-head .trezorconnect-logo{-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1}.trezorconnect-container .trezorconnect-window .trezorconnect-head .trezorconnect-close{cursor:pointer!important;height:24px!important}.trezorconnect-container .trezorconnect-window .trezorconnect-head .trezorconnect-close svg{fill:#757575;-webkit-transition:fill .3s ease-in-out!important;transition:fill .3s ease-in-out!important}.trezorconnect-container .trezorconnect-window .trezorconnect-head .trezorconnect-close:hover svg{fill:#494949}.trezorconnect-container .trezorconnect-window .trezorconnect-body{padding:24px 24px 32px!important;background:#FBFBFB!important;border-top:1px solid #EBEBEB}.trezorconnect-container .trezorconnect-window .trezorconnect-body h3{color:#505050!important;font-size:16px!important;font-weight:500!important}.trezorconnect-container .trezorconnect-window .trezorconnect-body p{margin:8px 0 24px!important;font-weight:400!important;color:#A9A9A9!important;font-size:12px!important}.trezorconnect-container .trezorconnect-window .trezorconnect-body button{width:100%!important;padding:12px 24px!important;margin:0!important;border-radius:3px!important;font-size:14px!important;font-weight:300!important;cursor:pointer!important;background:#01B757!important;color:#fff!important;border:0!important;-webkit-transition:background-color .3s ease-in-out!important;transition:background-color .3s ease-in-out!important}.trezorconnect-container .trezorconnect-window .trezorconnect-body button:hover{background-color:#00AB51!important}.trezorconnect-container .trezorconnect-window .trezorconnect-body button:active{background-color:#009546!important}/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlucHV0IiwiJHN0ZGluIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWNBLHlCQUNJLFNBQUEsZ0JBQ0EsUUFBQSxzQkFDQSxRQUFBLHVCQUNBLFFBQUEsc0JBRUEsUUFBQSxlQUNBLG1CQUFBLG1CQUNBLHNCQUFBLGlCQUNBLHVCQUFBLGlCQUNBLG1CQUFBLGlCQUNBLGVBQUEsaUJBRUEsa0JBQUEsaUJBQ0Esb0JBQUEsaUJBQ0EsZUFBQSxpQkNmTSxZQUFhLGlCREFyQixRQUFTLGdCQWtCSCxNQUFBLGVBQ0EsT0FBQSxlQUNBLElBQUEsWUFDQSxLQUFBLFlBQ0EsV0FBQSwwQkFDQSxTQUFBLGVBQ0EsUUFBQSxlQUNBLE9BQUEsWUNkUiwrQ0RYRSxTQUFVLG1CQTZCQSxRQUFBLGdCQUNBLE1BQUEsZ0JBQ0EsWUFBQSxjQUFBLG1CQUFBLFdBQUEsT0FBQSxpQkFBQSxNQUFBLHFCQUNBLE9BQUEsZUNmVixjQUFlLGNEakJmLGlCQWlCRSxlQWtCWSxXQUFBLGlCQ2ZkLFNBQVUsaUJEbUJJLG1FQUNBLFdBQUEsS0NoQmQsUUFBUyxLQUFLLGVEeEJkLFFBQVMsc0JBMENTLFFBQUEsdUJBQ0EsUUFBQSxzQkNmbEIsUUFBUyxlRGlCSyxrQkE1QlosaUJBOEJvQixvQkFBQSxpQkNoQmxCLGVBQWdCLGlCRC9CWixZQWlCTixpQkFzQ1EsdUZBQ0EsaUJBQUEsRUNwQlYsYUFBYyxFRHBDVixTQUFVLEVBMkRBLEtBQUEsRUFFQSx3RkNwQmQsT0FBUSxrQkR6Q1IsT0FBUSxlQWlFTSw0RkFDQSxLQUFBLFFBQ0EsbUJBQUEsS0FBQSxJQUFBLHNCQ3BCZCxXQUFZLEtBQUssSUFBSyxzQkR3QlIsa0dBQ0EsS0FBQSxRQUVBLG1FQUNBLFFBQUEsS0FBQSxLQUFBLGVBQ0EsV0FBQSxrQkFDQSxXQUFBLElBQUEsTUFBQSxRQUVBLHNFQUNBLE1BQUEsa0JBQ0EsVUFBQSxlQ3JCZCxZQUFhLGNEd0JLLHFFQ3JCbEIsT0FBUSxJQUFJLEVBQUksZUR3QkYsWUFBQSxjQUNJLE1BQUEsa0JDdEJsQixVQUFXLGVBRWIsMEVBQ0UsTUFBTyxlQUNQLFFBQVMsS0FBSyxlQUNkLE9BQVEsWUFDUixjQUFlLGNBQ2YsVUFBVyxlQUNYLFlBQWEsY0FDYixPQUFRLGtCQUNSLFdBQVksa0JBQ1osTUFBTyxlQUNQLE9BQVEsWUFDUixtQkFBb0IsaUJBQWlCLElBQUssc0JBQzFDLFdBQVksaUJBQWlCLElBQUssc0JBRXBDLGdGQUNFLGlCQUFrQixrQkFFcEIsaUZBQ0UsaUJBQWtCIn0= */'
          exports.default = css
        },
        {}
      ],
      57: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          const tslib_1 = require('tslib')
          const events_1 = tslib_1.__importDefault(require('events'))
          const exports_1 = require('@trezor/connect/lib/exports')
          const factory_1 = require('@trezor/connect/lib/factory')
          const debug_1 = require('@trezor/connect/lib/utils/debug')
          const config_1 = require('@trezor/connect/lib/data/config')
          const iframe = tslib_1.__importStar(require('./iframe'))
          const popup = tslib_1.__importStar(require('./popup'))
          const button_1 = tslib_1.__importDefault(require('./webusb/button'))
          const connectSettings_1 = require('./connectSettings')
          const eventEmitter = new events_1.default()
          const _log = (0, debug_1.initLog)('@trezor/connect')
          let _settings = (0, connectSettings_1.parseConnectSettings)()
          let _popupManager
          const initPopupManager = () => {
            const pm = new popup.PopupManager(_settings)
            pm.on(exports_1.POPUP.CLOSED, error => {
              iframe.postMessage(
                {
                  type: exports_1.POPUP.CLOSED,
                  payload: error ? {error} : null
                },
                false
              )
            })
            return pm
          }
          const manifest = data => {
            _settings = (0, connectSettings_1.parseConnectSettings)(
              Object.assign(Object.assign({}, _settings), {manifest: data})
            )
          }
          const dispose = () => {
            eventEmitter.removeAllListeners()
            iframe.dispose()
            _settings = (0, connectSettings_1.parseConnectSettings)()
            if (_popupManager) {
              _popupManager.close()
            }
            return Promise.resolve(undefined)
          }
          const cancel = error => {
            if (_popupManager) {
              _popupManager.emit(exports_1.POPUP.CLOSED, error)
            }
          }
          const handleMessage = messageEvent => {
            if (messageEvent.origin !== iframe.origin) return
            const message = (0, exports_1.parseMessage)(messageEvent.data)
            const id = message.id || 0
            _log.log('handleMessage', message)
            switch (message.event) {
              case exports_1.RESPONSE_EVENT:
                if (iframe.messagePromises[id]) {
                  iframe.messagePromises[id].resolve({
                    id,
                    success: message.success,
                    payload: message.payload
                  })
                  delete iframe.messagePromises[id]
                } else {
                  _log.warn(`Unknown message id ${id}`)
                }
                break
              case exports_1.DEVICE_EVENT:
                eventEmitter.emit(message.event, message)
                eventEmitter.emit(message.type, message.payload)
                break
              case exports_1.TRANSPORT_EVENT:
                eventEmitter.emit(message.event, message)
                eventEmitter.emit(message.type, message.payload)
                break
              case exports_1.BLOCKCHAIN_EVENT:
                eventEmitter.emit(message.event, message)
                eventEmitter.emit(message.type, message.payload)
                break
              case exports_1.UI_EVENT:
                if (message.type === exports_1.IFRAME.BOOTSTRAP) {
                  iframe.clearTimeout()
                  break
                }
                if (message.type === exports_1.IFRAME.LOADED) {
                  iframe.initPromise.resolve()
                }
                if (message.type === exports_1.IFRAME.ERROR) {
                  iframe.initPromise.reject(message.payload.error)
                }
                eventEmitter.emit(message.event, message)
                eventEmitter.emit(message.type, message.payload)
                break
              default:
                _log.log('Undefined message', message.event, messageEvent)
            }
          }
          const init = async (settings = {}) => {
            var _a
            if (iframe.instance) {
              throw exports_1.ERRORS.TypedError('Init_AlreadyInitialized')
            }
            _settings = (0, connectSettings_1.parseConnectSettings)(
              Object.assign(Object.assign({}, _settings), settings)
            )
            if (!_settings.manifest) {
              throw exports_1.ERRORS.TypedError('Init_ManifestMissing')
            }
            if (
              !((_a = _settings.transports) === null || _a === void 0
                ? void 0
                : _a.length)
            ) {
              _settings.transports = ['BridgeTransport', 'WebUsbTransport']
            }
            if (_settings.lazyLoad) {
              _settings.lazyLoad = false
              return
            }
            if (!_popupManager) {
              _popupManager = initPopupManager()
            }
            _log.enabled = !!_settings.debug
            window.addEventListener('message', handleMessage)
            window.addEventListener('unload', dispose)
            await iframe.init(_settings)
          }
          const call = async params => {
            if (!iframe.instance && !iframe.timeout) {
              _settings = (0, connectSettings_1.parseConnectSettings)(_settings)
              if (!_settings.manifest) {
                return (0, exports_1.createErrorMessage)(
                  exports_1.ERRORS.TypedError('Init_ManifestMissing')
                )
              }
              if (!_popupManager) {
                _popupManager = initPopupManager()
              }
              _popupManager.request(true)
              try {
                await init(_settings)
              } catch (error) {
                if (_popupManager) {
                  if (
                    ['Init_IframeBlocked', 'Init_IframeTimeout'].includes(
                      error.code
                    )
                  ) {
                    _popupManager.postMessage(
                      (0, exports_1.createUiMessage)(
                        exports_1.UI.IFRAME_FAILURE
                      )
                    )
                  } else {
                    _popupManager.close()
                  }
                }
                return (0, exports_1.createErrorMessage)(error)
              }
            }
            if (iframe.timeout) {
              return (0, exports_1.createErrorMessage)(
                exports_1.ERRORS.TypedError('Init_ManifestMissing')
              )
            }
            if (iframe.error) {
              return (0, exports_1.createErrorMessage)(iframe.error)
            }
            if (_settings.popup && _popupManager) {
              _popupManager.request()
            }
            try {
              const response = await iframe.postMessage({
                type: exports_1.IFRAME.CALL,
                payload: params
              })
              if (response) {
                if (
                  !response.success &&
                  response.payload.code !== 'Device_CallInProgress' &&
                  _popupManager
                ) {
                  _popupManager.unlock()
                }
                return response
              }
              if (_popupManager) {
                _popupManager.unlock()
              }
              return (0, exports_1.createErrorMessage)(
                exports_1.ERRORS.TypedError('Method_NoResponse')
              )
            } catch (error) {
              _log.error('__call error', error)
              if (_popupManager) {
                _popupManager.close()
              }
              return (0, exports_1.createErrorMessage)(error)
            }
          }
          const uiResponse = response => {
            if (!iframe.instance) {
              throw exports_1.ERRORS.TypedError('Init_NotInitialized')
            }
            const {type, payload} = response
            iframe.postMessage({event: exports_1.UI_EVENT, type, payload})
          }
          const renderWebUSBButton = className => {
            ;(0, button_1.default)(className, _settings.webusbSrc)
          }
          const requestLogin = async params => {
            if (typeof params.callback === 'function') {
              const {callback} = params
              const loginChallengeListener = async event => {
                const {data} = event
                if (
                  data &&
                  data.type === exports_1.UI.LOGIN_CHALLENGE_REQUEST
                ) {
                  try {
                    const payload = await callback()
                    iframe.postMessage({
                      event: exports_1.UI_EVENT,
                      type: exports_1.UI.LOGIN_CHALLENGE_RESPONSE,
                      payload
                    })
                  } catch (error) {
                    iframe.postMessage({
                      event: exports_1.UI_EVENT,
                      type: exports_1.UI.LOGIN_CHALLENGE_RESPONSE,
                      payload: error.message
                    })
                  }
                }
              }
              window.addEventListener('message', loginChallengeListener, false)
              const response = await call(
                Object.assign(Object.assign({method: 'requestLogin'}, params), {
                  asyncChallenge: true,
                  callback: null
                })
              )
              window.removeEventListener('message', loginChallengeListener)
              return response
            }
            return call(Object.assign({method: 'requestLogin'}, params))
          }
          const disableWebUSB = () => {
            if (!iframe.instance) {
              throw exports_1.ERRORS.TypedError('Init_NotInitialized')
            }
            iframe.postMessage({
              event: exports_1.UI_EVENT,
              type: exports_1.TRANSPORT.DISABLE_WEBUSB
            })
          }
          const requestWebUSBDevice = async () => {
            try {
              await window.navigator.usb.requestDevice({
                filters: config_1.config.webusb
              })
              iframe.postMessage({
                event: exports_1.UI_EVENT,
                type: exports_1.TRANSPORT.REQUEST_DEVICE
              })
            } catch (_err) {}
          }
          const TrezorConnect = (0, factory_1.factory)({
            eventEmitter,
            manifest,
            init,
            call,
            requestLogin,
            uiResponse,
            renderWebUSBButton,
            disableWebUSB,
            requestWebUSBDevice,
            cancel,
            dispose
          })
          exports.default = TrezorConnect
          tslib_1.__exportStar(require('@trezor/connect/lib/exports'), exports)
        },
        {
          './connectSettings': 54,
          './iframe': 55,
          './popup': 58,
          './webusb/button': 60,
          '@trezor/connect/lib/data/config': 66,
          '@trezor/connect/lib/exports': 80,
          '@trezor/connect/lib/factory': 81,
          '@trezor/connect/lib/utils/debug': 99,
          events: 3,
          tslib: 53
        }
      ],
      58: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.PopupManager = void 0
          const tslib_1 = require('tslib')
          const events_1 = tslib_1.__importDefault(require('events'))
          const utils_1 = require('@trezor/utils')
          const index_1 = require('@trezor/connect/lib/index')
          const urlUtils_1 = require('@trezor/connect/lib/utils/urlUtils')
          const showPopupRequest_1 = require('./showPopupRequest')
          const POPUP_REQUEST_TIMEOUT = 850
          const POPUP_CLOSE_INTERVAL = 500
          const POPUP_OPEN_TIMEOUT = 3000
          class PopupManager extends events_1.default {
            constructor(settings) {
              super()
              this.locked = false
              this.requestTimeout = 0
              this.closeInterval = 0
              this.extensionTabId = 0
              this.settings = settings
              this.origin = (0, urlUtils_1.getOrigin)(settings.popupSrc)
              this.handleMessage = this.handleMessage.bind(this)
              this.iframeHandshake = (0, utils_1.createDeferred)(
                index_1.IFRAME.LOADED
              )
              if (this.settings.env === 'webextension') {
                this.handleExtensionConnect =
                  this.handleExtensionConnect.bind(this)
                this.handleExtensionMessage =
                  this.handleExtensionMessage.bind(this)
                chrome.runtime.onConnect.addListener(
                  this.handleExtensionConnect
                )
              }
              window.addEventListener('message', this.handleMessage, false)
            }
            request(lazyLoad = false) {
              if (this.locked) {
                if (this._window) {
                  if (this.settings.env === 'webextension') {
                    chrome.tabs.update(this._window.id, {active: true})
                  } else {
                    this._window.focus()
                  }
                }
                return
              }
              const openFn = this.open.bind(this)
              this.locked = true
              const timeout =
                lazyLoad || this.settings.env === 'webextension'
                  ? 1
                  : POPUP_REQUEST_TIMEOUT
              this.requestTimeout = window.setTimeout(() => {
                this.requestTimeout = 0
                openFn(lazyLoad)
              }, timeout)
            }
            cancel() {
              this.close()
            }
            unlock() {
              this.locked = false
            }
            open(lazyLoad) {
              const src = this.settings.popupSrc
              this.popupPromise = (0, utils_1.createDeferred)(
                index_1.POPUP.LOADED
              )
              this.openWrapper(lazyLoad ? `${src}#loading` : src)
              this.closeInterval = window.setInterval(() => {
                if (!this._window) return
                if (this.settings.env === 'webextension') {
                  chrome.tabs.get(this._window.id, tab => {
                    if (!tab) {
                      this.close()
                      this.emit(index_1.POPUP.CLOSED)
                    }
                  })
                } else if (this._window.closed) {
                  this.close()
                  this.emit(index_1.POPUP.CLOSED)
                }
              }, POPUP_CLOSE_INTERVAL)
              this.openTimeout = setTimeout(() => {
                this.close()
                ;(0, showPopupRequest_1.showPopupRequest)(
                  this.open.bind(this),
                  () => {
                    this.emit(index_1.POPUP.CLOSED)
                  }
                )
              }, POPUP_OPEN_TIMEOUT)
            }
            openWrapper(url) {
              if (this.settings.env === 'webextension') {
                chrome.windows.getCurrent(currentWindow => {
                  if (currentWindow.type !== 'normal') {
                    chrome.windows.create({url}, newWindow => {
                      chrome.tabs.query(
                        {
                          windowId:
                            newWindow === null || newWindow === void 0
                              ? void 0
                              : newWindow.id,
                          active: true
                        },
                        tabs => {
                          this._window = tabs[0]
                        }
                      )
                    })
                  } else {
                    chrome.tabs.query(
                      {
                        currentWindow: true,
                        active: true
                      },
                      tabs => {
                        this.extensionTabId = tabs[0].id
                        chrome.tabs.create(
                          {
                            url,
                            index: tabs[0].index + 1
                          },
                          tab => {
                            this._window = tab
                          }
                        )
                      }
                    )
                  }
                })
              } else if (this.settings.env === 'electron') {
                this._window = window.open(url, 'modal')
              } else {
                this._window = window.open('', '_blank')
                if (this._window) {
                  this._window.location.href = url
                }
              }
            }
            handleExtensionConnect(port) {
              var _a, _b
              if (port.name !== 'trezor-connect') return
              if (
                !this._window ||
                (this._window &&
                  this._window.id !==
                    ((_b =
                      (_a = port.sender) === null || _a === void 0
                        ? void 0
                        : _a.tab) === null || _b === void 0
                      ? void 0
                      : _b.id))
              )
                return
              if (this.openTimeout) clearTimeout(this.openTimeout)
              this.extensionPort = port
              this.extensionPort.onMessage.addListener(
                this.handleExtensionMessage
              )
            }
            handleExtensionMessage(message) {
              if (!this.extensionPort) return
              const port = this.extensionPort
              const {data} = message
              if (!data || typeof data !== 'object') return
              if (data.type === index_1.POPUP.ERROR) {
                const errorMessage =
                  data.payload && typeof data.payload.error === 'string'
                    ? data.payload.error
                    : null
                this.emit(
                  index_1.POPUP.CLOSED,
                  errorMessage ? `Popup error: ${errorMessage}` : null
                )
                this.close()
              } else if (data.type === index_1.POPUP.LOADED) {
                if (this.popupPromise) {
                  this.popupPromise.resolve()
                }
                this.iframeHandshake.promise.then(payload => {
                  port.postMessage({
                    type: index_1.POPUP.INIT,
                    payload: Object.assign(Object.assign({}, payload), {
                      settings: this.settings
                    })
                  })
                })
              } else if (
                data.type === index_1.POPUP.EXTENSION_USB_PERMISSIONS
              ) {
                chrome.tabs.query(
                  {
                    currentWindow: true,
                    active: true
                  },
                  tabs => {
                    chrome.tabs.create(
                      {
                        url: 'trezor-usb-permissions.html',
                        index: tabs[0].index + 1
                      },
                      _tab => {}
                    )
                  }
                )
              } else if (data.type === index_1.POPUP.CLOSE_WINDOW) {
                this.emit(index_1.POPUP.CLOSED)
                this.close()
              }
            }
            handleMessage(message) {
              const {data} = message
              if (
                (0, urlUtils_1.getOrigin)(message.origin) !== this.origin ||
                !data ||
                typeof data !== 'object'
              )
                return
              if (data.type === index_1.IFRAME.LOADED) {
                this.iframeHandshake.resolve(data.payload)
              } else if (data.type === index_1.POPUP.BOOTSTRAP) {
                if (this.openTimeout) clearTimeout(this.openTimeout)
              } else if (data.type === index_1.POPUP.ERROR && this._window) {
                const errorMessage =
                  data.payload && typeof data.payload.error === 'string'
                    ? data.payload.error
                    : null
                this.emit(
                  index_1.POPUP.CLOSED,
                  errorMessage ? `Popup error: ${errorMessage}` : null
                )
                this.close()
              } else if (data.type === index_1.POPUP.LOADED) {
                if (this.popupPromise) {
                  this.popupPromise.resolve()
                }
                this.iframeHandshake.promise.then(payload => {
                  this._window.postMessage(
                    {
                      type: index_1.POPUP.INIT,
                      payload: Object.assign(Object.assign({}, payload), {
                        settings: this.settings
                      })
                    },
                    this.origin
                  )
                })
              } else if (
                data.type === index_1.POPUP.CANCEL_POPUP_REQUEST ||
                data.type === index_1.UI.CLOSE_UI_WINDOW
              ) {
                this.close()
              }
            }
            close() {
              this.locked = false
              this.popupPromise = undefined
              if (this.requestTimeout) {
                window.clearTimeout(this.requestTimeout)
                this.requestTimeout = 0
              }
              if (this.openTimeout) {
                clearTimeout(this.openTimeout)
                this.openTimeout = undefined
              }
              if (this.closeInterval) {
                window.clearInterval(this.closeInterval)
                this.closeInterval = 0
              }
              if (this.extensionPort) {
                this.extensionPort.disconnect()
                this.extensionPort = undefined
              }
              if (this.extensionTabId) {
                chrome.tabs.update(this.extensionTabId, {active: true})
                this.extensionTabId = 0
              }
              if (this._window) {
                if (this.settings.env === 'webextension') {
                  let _e = chrome.runtime.lastError
                  chrome.tabs.remove(this._window.id, () => {
                    _e = chrome.runtime.lastError
                  })
                } else {
                  this._window.close()
                }
                this._window = null
              }
            }
            async postMessage(message) {
              if (
                !this._window &&
                message.type !== index_1.UI.REQUEST_UI_WINDOW &&
                this.openTimeout
              ) {
                this.close()
                ;(0, showPopupRequest_1.showPopupRequest)(
                  this.open.bind(this),
                  () => {
                    this.emit(index_1.POPUP.CLOSED)
                  }
                )
                return
              }
              if (this.popupPromise) {
                await this.popupPromise.promise
              }
              if (this._window) {
                this._window.postMessage(message, this.origin)
              }
            }
          }
          exports.PopupManager = PopupManager
        },
        {
          './showPopupRequest': 59,
          '@trezor/connect/lib/index': 82,
          '@trezor/connect/lib/utils/urlUtils': 100,
          '@trezor/utils': 140,
          events: 3,
          tslib: 53
        }
      ],
      59: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.showPopupRequest = void 0
          const LAYER_ID = 'TrezorConnectInteractionLayer'
          const HTML = `
    <div class="trezorconnect-container" id="${LAYER_ID}">
        <div class="trezorconnect-window">
            <div class="trezorconnect-head">
                <svg class="trezorconnect-logo" x="0px" y="0px" viewBox="0 0 163.7 41.9" width="78px" height="20px" preserveAspectRatio="xMinYMin meet">
                    <polygon points="101.1,12.8 118.2,12.8 118.2,17.3 108.9,29.9 118.2,29.9 118.2,35.2 101.1,35.2 101.1,30.7 110.4,18.1 101.1,18.1"/>
                    <path d="M158.8,26.9c2.1-0.8,4.3-2.9,4.3-6.6c0-4.5-3.1-7.4-7.7-7.4h-10.5v22.3h5.8v-7.5h2.2l4.1,7.5h6.7L158.8,26.9z M154.7,22.5 h-4V18h4c1.5,0,2.5,0.9,2.5,2.2C157.2,21.6,156.2,22.5,154.7,22.5z"/>
                    <path d="M130.8,12.5c-6.8,0-11.6,4.9-11.6,11.5s4.9,11.5,11.6,11.5s11.7-4.9,11.7-11.5S137.6,12.5,130.8,12.5z M130.8,30.3 c-3.4,0-5.7-2.6-5.7-6.3c0-3.8,2.3-6.3,5.7-6.3c3.4,0,5.8,2.6,5.8,6.3C136.6,27.7,134.2,30.3,130.8,30.3z"/>
                    <polygon points="82.1,12.8 98.3,12.8 98.3,18 87.9,18 87.9,21.3 98,21.3 98,26.4 87.9,26.4 87.9,30 98.3,30 98.3,35.2 82.1,35.2 "/>
                    <path d="M24.6,9.7C24.6,4.4,20,0,14.4,0S4.2,4.4,4.2,9.7v3.1H0v22.3h0l14.4,6.7l14.4-6.7h0V12.9h-4.2V9.7z M9.4,9.7 c0-2.5,2.2-4.5,5-4.5s5,2,5,4.5v3.1H9.4V9.7z M23,31.5l-8.6,4l-8.6-4V18.1H23V31.5z"/>
                    <path d="M79.4,20.3c0-4.5-3.1-7.4-7.7-7.4H61.2v22.3H67v-7.5h2.2l4.1,7.5H80l-4.9-8.3C77.2,26.1,79.4,24,79.4,20.3z M71,22.5h-4V18 h4c1.5,0,2.5,0.9,2.5,2.2C73.5,21.6,72.5,22.5,71,22.5z"/>
                    <polygon points="40.5,12.8 58.6,12.8 58.6,18.1 52.4,18.1 52.4,35.2 46.6,35.2 46.6,18.1 40.5,18.1 "/>
                </svg>
                <div class="trezorconnect-close">
                    <svg x="0px" y="0px" viewBox="24 24 60 60" width="24px" height="24px" preserveAspectRatio="xMinYMin meet">
                        <polygon class="st0" points="40,67.9 42.1,70 55,57.1 67.9,70 70,67.9 57.1,55 70,42.1 67.9,40 55,52.9 42.1,40 40,42.1 52.9,55 "/>
                    </svg>
                </div>
            </div>
            <div class="trezorconnect-body">
                <h3>Popup was blocked</h3>
                <p>Please click to "Continue" to open popup manually</p>
                <button class="trezorconnect-open">Continue</button>
            </div>
        </div>
    </div>
`
          const showPopupRequest = (open, cancel) => {
            if (document.getElementById(LAYER_ID)) {
              return
            }
            const div = document.createElement('div')
            div.id = LAYER_ID
            div.className = 'trezorconnect-container'
            div.innerHTML = HTML
            if (document.body) {
              document.body.appendChild(div)
            }
            const button = div.getElementsByClassName('trezorconnect-open')[0]
            button.onclick = () => {
              open()
              if (document.body) {
                document.body.removeChild(div)
              }
            }
            const close = div.getElementsByClassName('trezorconnect-close')[0]
            close.onclick = () => {
              cancel()
              if (document.body) {
                document.body.removeChild(div)
              }
            }
          }
          exports.showPopupRequest = showPopupRequest
        },
        {}
      ],
      60: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          const render = (className = '', url) => {
            const query = className || '.trezor-webusb-button'
            const buttons = document.querySelectorAll(query)
            const src = `${url}?${Date.now()}`
            buttons.forEach(b => {
              if (b.getElementsByTagName('iframe').length < 1) {
                const bounds = b.getBoundingClientRect()
                const btnIframe = document.createElement('iframe')
                btnIframe.frameBorder = '0'
                btnIframe.width = `${Math.round(bounds.width)}px`
                btnIframe.height = `${Math.round(bounds.height)}px`
                btnIframe.style.position = 'absolute'
                btnIframe.style.top = '0px'
                btnIframe.style.left = '0px'
                btnIframe.style.zIndex = '1'
                btnIframe.setAttribute('allow', 'usb')
                btnIframe.setAttribute('scrolling', 'no')
                btnIframe.src = src
                b.append(btnIframe)
              }
            })
          }
          exports.default = render
        },
        {}
      ],
      61: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.NETWORK_IDS = exports.PROTOCOL_MAGICS = void 0
          var PROTOCOL_MAGICS
          ;(function (PROTOCOL_MAGICS) {
            PROTOCOL_MAGICS[(PROTOCOL_MAGICS['mainnet'] = 764824073)] =
              'mainnet'
            PROTOCOL_MAGICS[(PROTOCOL_MAGICS['testnet_preprod'] = 1)] =
              'testnet_preprod'
            PROTOCOL_MAGICS[(PROTOCOL_MAGICS['testnet_preview'] = 2)] =
              'testnet_preview'
            PROTOCOL_MAGICS[(PROTOCOL_MAGICS['testnet_legacy'] = 1097911063)] =
              'testnet_legacy'
          })(
            (PROTOCOL_MAGICS =
              exports.PROTOCOL_MAGICS || (exports.PROTOCOL_MAGICS = {}))
          )
          var NETWORK_IDS
          ;(function (NETWORK_IDS) {
            NETWORK_IDS[(NETWORK_IDS['mainnet'] = 1)] = 'mainnet'
            NETWORK_IDS[(NETWORK_IDS['testnet'] = 0)] = 'testnet'
          })((NETWORK_IDS = exports.NETWORK_IDS || (exports.NETWORK_IDS = {})))
        },
        {}
      ],
      62: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.LIBUSB_ERROR_MESSAGE =
            exports.WEBUSB_ERROR_MESSAGE =
            exports.INVALID_PIN_ERROR_MESSAGE =
            exports.WRONG_PREVIOUS_SESSION_ERROR_MESSAGE =
            exports.serializeError =
            exports.TypedError =
            exports.TrezorError =
            exports.ERROR_CODES =
              void 0
          exports.ERROR_CODES = {
            Init_NotInitialized: 'TrezorConnect not initialized',
            Init_AlreadyInitialized:
              'TrezorConnect has been already initialized',
            Init_IframeBlocked: 'Iframe blocked',
            Init_IframeTimeout: 'Iframe timeout',
            Init_ManifestMissing:
              'Manifest not set. Read more at https://github.com/trezor/trezor-suite/blob/develop/docs/packages/connect/index.md',
            Popup_ConnectionMissing:
              'Unable to establish connection with iframe',
            Transport_Missing: 'Transport is missing',
            Transport_InvalidProtobuf: '',
            Method_InvalidPackage:
              'This package is not suitable to work with browser. Use @trezor/connect-web package instead',
            Method_InvalidParameter: '',
            Method_NotAllowed: 'Method not allowed for this configuration',
            Method_PermissionsNotGranted: 'Permissions not granted',
            Method_Cancel: 'Cancelled',
            Method_Interrupted: 'Popup closed',
            Method_UnknownCoin: 'Coin not found',
            Method_AddressNotMatch: 'Addresses do not match',
            Method_FirmwareUpdate_DownloadFailed:
              'Failed to download firmware binary',
            Method_Discovery_BundleException: '',
            Method_Override: 'override',
            Method_NoResponse: 'Call resolved without response',
            Backend_NotSupported:
              'BlockchainLink settings not found in coins.json',
            Backend_WorkerMissing: '',
            Backend_Disconnected: 'Backend disconnected',
            Backend_Invalid: 'Invalid backend',
            Backend_Error: '',
            Runtime: '',
            Device_NotFound: 'Device not found',
            Device_InitializeFailed: '',
            Device_FwException: '',
            Device_ModeException: '',
            Device_Disconnected: 'Device disconnected',
            Device_UsedElsewhere: 'Device is used in another window',
            Device_InvalidState: 'Passphrase is incorrect',
            Device_CallInProgress: 'Device call in progress'
          }
          class TrezorError extends Error {
            constructor(code, message) {
              super(message)
              this.code = code
              this.message = message
            }
          }
          exports.TrezorError = TrezorError
          const TypedError = (id, message) =>
            new TrezorError(id, message || exports.ERROR_CODES[id])
          exports.TypedError = TypedError
          const serializeError = payload => {
            if (payload && payload.error instanceof Error) {
              return {error: payload.error.message, code: payload.error.code}
            }
            return payload
          }
          exports.serializeError = serializeError
          exports.WRONG_PREVIOUS_SESSION_ERROR_MESSAGE =
            'wrong previous session'
          exports.INVALID_PIN_ERROR_MESSAGE = 'PIN invalid'
          exports.WEBUSB_ERROR_MESSAGE =
            'NetworkError: Unable to claim interface.'
          exports.LIBUSB_ERROR_MESSAGE = 'LIBUSB_ERROR'
        },
        {}
      ],
      63: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.PROTO =
            exports.NEM =
            exports.CARDANO =
            exports.NETWORK =
            exports.ERRORS =
              void 0
          const tslib_1 = require('tslib')
          exports.ERRORS = tslib_1.__importStar(require('./errors'))
          exports.NETWORK = tslib_1.__importStar(require('./network'))
          exports.CARDANO = tslib_1.__importStar(require('./cardano'))
          exports.NEM = tslib_1.__importStar(require('./nem'))
          exports.PROTO = tslib_1.__importStar(
            require('@trezor/transport/lib/types/messages')
          )
        },
        {
          './cardano': 61,
          './errors': 62,
          './nem': 64,
          './network': 65,
          '@trezor/transport/lib/types/messages': 120,
          tslib: 53
        }
      ],
      64: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.TxVersion = exports.TxType = exports.Networks = void 0
          var Networks
          ;(function (Networks) {
            Networks[(Networks['mainnet'] = 104)] = 'mainnet'
            Networks[(Networks['testnet'] = 152)] = 'testnet'
            Networks[(Networks['mijin'] = 96)] = 'mijin'
          })((Networks = exports.Networks || (exports.Networks = {})))
          var TxType
          ;(function (TxType) {
            TxType[(TxType['TRANSFER'] = 257)] = 'TRANSFER'
            TxType[(TxType['COSIGNING'] = 258)] = 'COSIGNING'
            TxType[(TxType['IMPORTANCE_TRANSFER'] = 2049)] =
              'IMPORTANCE_TRANSFER'
            TxType[(TxType['AGGREGATE_MODIFICATION'] = 4097)] =
              'AGGREGATE_MODIFICATION'
            TxType[(TxType['MULTISIG_SIGNATURE'] = 4098)] = 'MULTISIG_SIGNATURE'
            TxType[(TxType['MULTISIG'] = 4100)] = 'MULTISIG'
            TxType[(TxType['PROVISION_NAMESPACE'] = 8193)] =
              'PROVISION_NAMESPACE'
            TxType[(TxType['MOSAIC_CREATION'] = 16385)] = 'MOSAIC_CREATION'
            TxType[(TxType['SUPPLY_CHANGE'] = 16386)] = 'SUPPLY_CHANGE'
          })((TxType = exports.TxType || (exports.TxType = {})))
          var TxVersion
          ;(function (TxVersion) {
            TxVersion[(TxVersion['mainnet'] = 1744830464)] = 'mainnet'
            TxVersion[(TxVersion['testnet'] = -1744830464)] = 'testnet'
            TxVersion[(TxVersion['mijin'] = 1610612736)] = 'mijin'
          })((TxVersion = exports.TxVersion || (exports.TxVersion = {})))
        },
        {}
      ],
      65: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.TYPES = void 0
          exports.TYPES = {
            bitcoin: 'Bitcoin',
            ethereum: 'Ethereum',
            eos: 'Eos',
            nem: 'NEM',
            stellar: 'Stellar',
            cardano: 'Cardano',
            ripple: 'Ripple',
            tezos: 'Tezos',
            binance: 'Binance'
          }
        },
        {}
      ],
      66: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.config = void 0
          const transport_1 = require('@trezor/transport')
          exports.config = {
            webusb: transport_1.TREZOR_DESCS,
            whitelist: [
              {
                origin: 'chrome-extension://imloifkgjagghnncjkhggdhalmcnfklk',
                priority: 1
              },
              {
                origin: 'chrome-extension://niebkpllfhmpfbffbfifagfgoamhpflf',
                priority: 1
              },
              {origin: 'file://', priority: 2},
              {origin: 'trezor.io', priority: 0},
              {origin: 'sldev.cz', priority: 0},
              {origin: 'localhost', priority: 0},
              {
                origin:
                  'trezoriovpjcahpzkrewelclulmszwbqpzmzgub37gbcjlvluxtruqad.onion',
                priority: 0
              }
            ],
            management: [
              {origin: 'trezor.io'},
              {origin: 'sldev.cz'},
              {origin: 'localhost'}
            ],
            knownHosts: [
              {
                origin: 'imloifkgjagghnncjkhggdhalmcnfklk',
                label: 'Trezor Password Manager (Develop)',
                icon: ''
              },
              {
                origin: 'niebkpllfhmpfbffbfifagfgoamhpflf',
                label: 'Trezor Password Manager',
                icon: ''
              },
              {
                origin: 'trezor-connect@trezor.io',
                label: 'Trezor Connect FF Extension',
                icon: ''
              },
              {
                origin: 'efbfhenfhihgdcmnfdkhaphjdnopihlf',
                label: 'Trezor Connect Chrome Extension',
                icon: ''
              },
              {
                origin: 'mnpfhpndmjholfdlhpkjfmjkgppmodaf',
                label: 'MetaMask',
                icon: ''
              },
              {
                origin: 'webextension@metamask.io',
                label: 'MetaMask',
                icon: ''
              },
              {origin: 'file://', label: ' ', icon: ''}
            ],
            onionDomains: {
              'trezor.io':
                'trezoriovpjcahpzkrewelclulmszwbqpzmzgub37gbcjlvluxtruqad.onion'
            },
            assets: [
              {
                name: 'coins',
                url: './data/coins.json'
              },
              {
                name: 'bridge',
                url: './data/bridge/releases.json'
              },
              {
                name: 'firmware-t1',
                url: './data/firmware/1/releases.json'
              },
              {
                name: 'firmware-t2',
                url: './data/firmware/2/releases.json'
              }
            ],
            messages: './data/messages/messages.json',
            supportedBrowsers: {
              chrome: {
                version: 59,
                download: 'https://www.google.com/chrome/',
                update: 'https://support.google.com/chrome/answer/95414'
              },
              chromium: {
                version: 59,
                download: 'https://www.chromium.org/',
                update: 'https://www.chromium.org/'
              },
              electron: {
                version: 0,
                download: 'https://www.electronjs.org/',
                update: 'https://www.electronjs.org/'
              },
              firefox: {
                version: 54,
                download: 'https://www.mozilla.org/en-US/firefox/new/',
                update:
                  'https://support.mozilla.org/en-US/kb/update-firefox-latest-version'
              }
            },
            supportedFirmware: [
              {
                coin: ['xrp', 'txrp'],
                methods: ['getAccountInfo'],
                min: ['0', '2.1.0'],
                max: undefined,
                comment: [
                  "Since firmware 2.1.0 there is a new protobuf field 'destination_tag' in RippleSignTx"
                ]
              },
              {
                coin: ['bnb'],
                min: ['1.9.0', '2.3.0'],
                comment: [
                  'There were protobuf backwards incompatible changes with introduction of 1.9.0/2.3.0 firmwares'
                ]
              },
              {
                coin: ['eth', 'trop', 'tgor'],
                min: ['1.8.0', '2.1.0'],
                comment: ['There were protobuf backwards incompatible changes.']
              },
              {
                methods: ['rippleGetAddress', 'rippleSignTransaction'],
                min: ['0', '2.1.0'],
                comment: [
                  "Since firmware 2.1.0 there is a new protobuf field 'destination_tag' in RippleSignTx"
                ]
              },
              {
                methods: ['cardanoGetAddress', 'cardanoGetPublicKey'],
                min: ['0', '2.3.2'],
                comment: ['Shelley fork support since firmware 2.3.2']
              },
              {
                methods: ['cardanoSignTransaction'],
                min: ['0', '2.4.2'],
                comment: ['Non-streamed signing no longer supported']
              },
              {
                methods: ['cardanoGetNativeScriptHash'],
                min: ['0', '2.4.3'],
                comment: ['Cardano GetNativeScriptHash call added in 2.4.3']
              },
              {
                methods: ['tezosSignTransaction'],
                min: ['0', '2.1.8'],
                comment: [
                  'Since 2.1.8 there are new protobuf fields in tezos transaction (Babylon fork)'
                ]
              },
              {
                methods: ['stellarSignTransaction'],
                min: ['1.9.0', '2.3.0'],
                comment: [
                  'There were protobuf backwards incompatible changes with introduction of 1.9.0/2.3.0 firmwares'
                ]
              },
              {
                capabilities: ['replaceTransaction', 'amountUnit'],
                min: ['1.9.4', '2.3.5'],
                comment: ['new sign tx process since 1.9.4/2.3.5']
              },
              {
                capabilities: ['decreaseOutput'],
                min: ['1.10.0', '2.4.0'],
                comment: [
                  'allow reduce output in RBF transaction since 1.10.0/2.4.0'
                ]
              },
              {
                capabilities: ['eip1559'],
                min: ['1.10.4', '2.4.2'],
                comment: [
                  'new eth transaction pricing mechanism (EIP1559) since 1.10.4/2.4.2'
                ]
              },
              {
                capabilities: ['taproot', 'signMessageNoScriptType'],
                min: ['1.10.4', '2.4.3'],
                comment: [
                  'new btc accounts taproot since 1.10.4/2.4.3 (BTC + TEST only)',
                  'SignMessage with no_script_type support'
                ]
              },
              {
                coin: ['dcr', 'tdcr'],
                methods: ['signTransaction'],
                min: ['1.10.1', '2.4.0'],
                comment: ['']
              },
              {
                methods: ['ethereumSignTypedData'],
                min: ['1.10.5', '2.4.3'],
                comment: ['EIP-712 typed signing support added in 1.10.5/2.4.3']
              },
              {
                capabilities: ['eip712-domain-only'],
                min: ['1.10.6', '2.4.4'],
                comment: [
                  'EIP-712 domain-only signing, when primaryType=EIP712Domain'
                ]
              },
              {
                capabilities: ['coinjoin'],
                methods: [
                  'authorizeCoinjoin',
                  'getOwnershipId',
                  'getOwnershipProof',
                  'setBusy',
                  'unlockPath'
                ],
                min: ['1.12.1', '2.5.3']
              }
            ]
          }
        },
        {'@trezor/transport': 106}
      ],
      67: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.parseConnectSettings =
            exports.corsValidator =
            exports.DEFAULT_PRIORITY =
              void 0
          const version_1 = require('./version')
          exports.DEFAULT_PRIORITY = 2
          const initialSettings = {
            configSrc: './data/config.json',
            version: version_1.VERSION,
            debug: false,
            priority: exports.DEFAULT_PRIORITY,
            trustedHost: true,
            connectSrc: version_1.DEFAULT_DOMAIN,
            iframeSrc: `${version_1.DEFAULT_DOMAIN}iframe.html`,
            popup: false,
            popupSrc: `${version_1.DEFAULT_DOMAIN}popup.html`,
            webusbSrc: `${version_1.DEFAULT_DOMAIN}webusb.html`,
            transports: undefined,
            pendingTransportEvent: true,
            env: 'node',
            lazyLoad: false,
            timestamp: new Date().getTime(),
            interactionTimeout: 600
          }
          const parseManifest = manifest => {
            if (!manifest) return
            if (typeof manifest.email !== 'string') return
            if (typeof manifest.appUrl !== 'string') return
            return {
              email: manifest.email,
              appUrl: manifest.appUrl
            }
          }
          const corsValidator = url => {
            if (typeof url !== 'string') return
            if (url.match(/^https:\/\/([A-Za-z0-9\-_]+\.)*trezor\.io\//))
              return url
            if (url.match(/^https?:\/\/localhost:[58][0-9]{3}\//)) return url
            if (url.match(/^https:\/\/([A-Za-z0-9\-_]+\.)*sldev\.cz\//))
              return url
            if (
              url.match(
                /^https?:\/\/([A-Za-z0-9\-_]+\.)*trezoriovpjcahpzkrewelclulmszwbqpzmzgub37gbcjlvluxtruqad\.onion\//
              )
            )
              return url
          }
          exports.corsValidator = corsValidator
          const parseConnectSettings = (input = {}) => {
            var _a
            const settings = {...initialSettings}
            if ('debug' in input) {
              if (typeof input.debug === 'boolean') {
                settings.debug = input.debug
              } else if (typeof input.debug === 'string') {
                settings.debug = input.debug === 'true'
              }
            }
            if (
              typeof input.connectSrc === 'string' &&
              ((_a = input.connectSrc) === null || _a === void 0
                ? void 0
                : _a.startsWith('http'))
            ) {
              settings.connectSrc = (0, exports.corsValidator)(input.connectSrc)
            } else if (settings.trustedHost) {
              settings.connectSrc = input.connectSrc
            }
            const src = settings.connectSrc || version_1.DEFAULT_DOMAIN
            settings.iframeSrc = `${src}iframe.html`
            settings.popupSrc = `${src}popup.html`
            settings.webusbSrc = `${src}webusb.html`
            if (typeof input.transportReconnect === 'boolean') {
              settings.transportReconnect = input.transportReconnect
            }
            if (typeof input.webusb === 'boolean') {
              settings.webusb = input.webusb
            }
            if (Array.isArray(input.transports)) {
              settings.transports = input.transports
            }
            if (typeof input.popup === 'boolean') {
              settings.popup = input.popup
            }
            if (typeof input.lazyLoad === 'boolean') {
              settings.lazyLoad = input.lazyLoad
            }
            if (typeof input.pendingTransportEvent === 'boolean') {
              settings.pendingTransportEvent = input.pendingTransportEvent
            }
            if (typeof input.extension === 'string') {
              settings.extension = input.extension
            }
            if (typeof input.env === 'string') {
              settings.env = input.env
            }
            if (typeof input.timestamp === 'number') {
              settings.timestamp = input.timestamp
            }
            if (typeof input.interactionTimeout === 'number') {
              settings.interactionTimeout = input.interactionTimeout
            }
            if (typeof input.manifest === 'object') {
              settings.manifest = parseManifest(input.manifest)
            }
            return settings
          }
          exports.parseConnectSettings = parseConnectSettings
        },
        {'./version': 68}
      ],
      68: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.DEFAULT_DOMAIN = exports.VERSION = void 0
          exports.VERSION = '9.0.7'
          const versionN = exports.VERSION.split('.').map(s => parseInt(s, 10))
          exports.DEFAULT_DOMAIN = `https://connect.trezor.io/${versionN[0]}/`
        },
        {}
      ],
      69: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createBlockchainMessage =
            exports.BLOCKCHAIN =
            exports.BLOCKCHAIN_EVENT =
              void 0
          exports.BLOCKCHAIN_EVENT = 'BLOCKCHAIN_EVENT'
          exports.BLOCKCHAIN = {
            CONNECT: 'blockchain-connect',
            ERROR: 'blockchain-error',
            BLOCK: 'blockchain-block',
            NOTIFICATION: 'blockchain-notification',
            FIAT_RATES_UPDATE: 'fiat-rates-update'
          }
          const createBlockchainMessage = (type, payload) => ({
            event: exports.BLOCKCHAIN_EVENT,
            type,
            payload
          })
          exports.createBlockchainMessage = createBlockchainMessage
        },
        {}
      ],
      70: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createResponseMessage = exports.RESPONSE_EVENT = void 0
          const errors_1 = require('../constants/errors')
          exports.RESPONSE_EVENT = 'RESPONSE_EVENT'
          const createResponseMessage = (id, success, payload) => ({
            event: exports.RESPONSE_EVENT,
            type: exports.RESPONSE_EVENT,
            id,
            success,
            payload: success ? payload : (0, errors_1.serializeError)(payload)
          })
          exports.createResponseMessage = createResponseMessage
        },
        {'../constants/errors': 62}
      ],
      71: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createErrorMessage =
            exports.parseMessage =
            exports.CORE_EVENT =
              void 0
          exports.CORE_EVENT = 'CORE_EVENT'
          const parseMessage = messageData => {
            const message = {
              event: messageData.event,
              type: messageData.type,
              payload: messageData.payload
            }
            if (typeof messageData.id === 'number') {
              message.id = messageData.id
            }
            if (typeof messageData.success === 'boolean') {
              message.success = messageData.success
            }
            return message
          }
          exports.parseMessage = parseMessage
          const createErrorMessage = error => ({
            success: false,
            payload: {
              error: error.message,
              code: error.code
            }
          })
          exports.createErrorMessage = createErrorMessage
        },
        {}
      ],
      72: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createDeviceMessage =
            exports.DEVICE =
            exports.DEVICE_EVENT =
              void 0
          exports.DEVICE_EVENT = 'DEVICE_EVENT'
          exports.DEVICE = {
            CONNECT: 'device-connect',
            CONNECT_UNACQUIRED: 'device-connect_unacquired',
            DISCONNECT: 'device-disconnect',
            CHANGED: 'device-changed',
            ACQUIRE: 'device-acquire',
            RELEASE: 'device-release',
            ACQUIRED: 'device-acquired',
            RELEASED: 'device-released',
            USED_ELSEWHERE: 'device-used_elsewhere',
            LOADING: 'device-loading',
            BUTTON: 'button',
            PIN: 'pin',
            PASSPHRASE: 'passphrase',
            PASSPHRASE_ON_DEVICE: 'passphrase_on_device',
            WORD: 'word'
          }
          const createDeviceMessage = (type, payload) => ({
            event: exports.DEVICE_EVENT,
            type,
            payload
          })
          exports.createDeviceMessage = createDeviceMessage
        },
        {}
      ],
      73: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createIFrameMessage = exports.IFRAME = void 0
          const ui_request_1 = require('./ui-request')
          exports.IFRAME = {
            BOOTSTRAP: 'iframe-bootstrap',
            LOADED: 'iframe-loaded',
            INIT: 'iframe-init',
            ERROR: 'iframe-error',
            CALL: 'iframe-call'
          }
          const createIFrameMessage = (type, payload) => ({
            event: ui_request_1.UI_EVENT,
            type,
            payload
          })
          exports.createIFrameMessage = createIFrameMessage
        },
        {'./ui-request': 78}
      ],
      74: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.UI = void 0
          const tslib_1 = require('tslib')
          const ui_request_1 = require('./ui-request')
          const ui_response_1 = require('./ui-response')
          tslib_1.__exportStar(require('./blockchain'), exports)
          tslib_1.__exportStar(require('./call'), exports)
          tslib_1.__exportStar(require('./core'), exports)
          tslib_1.__exportStar(require('./device'), exports)
          tslib_1.__exportStar(require('./iframe'), exports)
          tslib_1.__exportStar(require('./popup'), exports)
          tslib_1.__exportStar(require('./transport'), exports)
          tslib_1.__exportStar(require('./ui-promise'), exports)
          tslib_1.__exportStar(require('./ui-request'), exports)
          tslib_1.__exportStar(require('./ui-response'), exports)
          exports.UI = {
            ...ui_request_1.UI_REQUEST,
            ...ui_response_1.UI_RESPONSE
          }
        },
        {
          './blockchain': 69,
          './call': 70,
          './core': 71,
          './device': 72,
          './iframe': 73,
          './popup': 75,
          './transport': 76,
          './ui-promise': 77,
          './ui-request': 78,
          './ui-response': 79,
          tslib: 53
        }
      ],
      75: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createPopupMessage = exports.POPUP = void 0
          const ui_request_1 = require('./ui-request')
          exports.POPUP = {
            BOOTSTRAP: 'popup-bootstrap',
            LOADED: 'popup-loaded',
            INIT: 'popup-init',
            ERROR: 'popup-error',
            EXTENSION_USB_PERMISSIONS: 'open-usb-permissions',
            HANDSHAKE: 'popup-handshake',
            CLOSED: 'popup-closed',
            CANCEL_POPUP_REQUEST: 'ui-cancel-popup-request',
            CLOSE_WINDOW: 'window.close'
          }
          const createPopupMessage = (type, payload) => ({
            event: ui_request_1.UI_EVENT,
            type,
            payload
          })
          exports.createPopupMessage = createPopupMessage
        },
        {'./ui-request': 78}
      ],
      76: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createTransportMessage =
            exports.TRANSPORT =
            exports.TRANSPORT_EVENT =
              void 0
          const errors_1 = require('../constants/errors')
          exports.TRANSPORT_EVENT = 'TRANSPORT_EVENT'
          exports.TRANSPORT = {
            START: 'transport-start',
            ERROR: 'transport-error',
            UPDATE: 'transport-update',
            STREAM: 'transport-stream',
            REQUEST_DEVICE: 'transport-request_device',
            DISABLE_WEBUSB: 'transport-disable_webusb',
            START_PENDING: 'transport-start_pending'
          }
          const createTransportMessage = (type, payload) => ({
            event: exports.TRANSPORT_EVENT,
            type,
            payload:
              'error' in payload
                ? (0, errors_1.serializeError)(payload)
                : payload
          })
          exports.createTransportMessage = createTransportMessage
        },
        {'../constants/errors': 62}
      ],
      77: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      78: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createUiMessage =
            exports.UI_REQUEST =
            exports.UI_EVENT =
              void 0
          exports.UI_EVENT = 'UI_EVENT'
          exports.UI_REQUEST = {
            TRANSPORT: 'ui-no_transport',
            BOOTLOADER: 'ui-device_bootloader_mode',
            NOT_IN_BOOTLOADER: 'ui-device_not_in_bootloader_mode',
            REQUIRE_MODE: 'ui-device_require_mode',
            INITIALIZE: 'ui-device_not_initialized',
            SEEDLESS: 'ui-device_seedless',
            FIRMWARE_OLD: 'ui-device_firmware_old',
            FIRMWARE_OUTDATED: 'ui-device_firmware_outdated',
            FIRMWARE_NOT_SUPPORTED: 'ui-device_firmware_unsupported',
            FIRMWARE_NOT_COMPATIBLE: 'ui-device_firmware_not_compatible',
            FIRMWARE_NOT_INSTALLED: 'ui-device_firmware_not_installed',
            FIRMWARE_PROGRESS: 'ui-firmware-progress',
            DEVICE_NEEDS_BACKUP: 'ui-device_needs_backup',
            REQUEST_UI_WINDOW: 'ui-request_window',
            CLOSE_UI_WINDOW: 'ui-close_window',
            REQUEST_PERMISSION: 'ui-request_permission',
            REQUEST_CONFIRMATION: 'ui-request_confirmation',
            REQUEST_PIN: 'ui-request_pin',
            INVALID_PIN: 'ui-invalid_pin',
            REQUEST_PASSPHRASE: 'ui-request_passphrase',
            REQUEST_PASSPHRASE_ON_DEVICE: 'ui-request_passphrase_on_device',
            INVALID_PASSPHRASE: 'ui-invalid_passphrase',
            CONNECT: 'ui-connect',
            LOADING: 'ui-loading',
            SET_OPERATION: 'ui-set_operation',
            SELECT_DEVICE: 'ui-select_device',
            SELECT_ACCOUNT: 'ui-select_account',
            SELECT_FEE: 'ui-select_fee',
            UPDATE_CUSTOM_FEE: 'ui-update_custom_fee',
            INSUFFICIENT_FUNDS: 'ui-insufficient_funds',
            REQUEST_BUTTON: 'ui-button',
            REQUEST_WORD: 'ui-request_word',
            LOGIN_CHALLENGE_REQUEST: 'ui-login_challenge_request',
            BUNDLE_PROGRESS: 'ui-bundle_progress',
            ADDRESS_VALIDATION: 'ui-address_validation',
            IFRAME_FAILURE: 'ui-iframe_failure'
          }
          const createUiMessage = (type, payload) => ({
            event: exports.UI_EVENT,
            type,
            payload
          })
          exports.createUiMessage = createUiMessage
        },
        {}
      ],
      79: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createUiResponse = exports.UI_RESPONSE = void 0
          const ui_request_1 = require('./ui-request')
          exports.UI_RESPONSE = {
            RECEIVE_PERMISSION: 'ui-receive_permission',
            RECEIVE_CONFIRMATION: 'ui-receive_confirmation',
            RECEIVE_PIN: 'ui-receive_pin',
            RECEIVE_PASSPHRASE: 'ui-receive_passphrase',
            RECEIVE_DEVICE: 'ui-receive_device',
            RECEIVE_ACCOUNT: 'ui-receive_account',
            RECEIVE_FEE: 'ui-receive_fee',
            RECEIVE_WORD: 'ui-receive_word',
            INVALID_PASSPHRASE_ACTION: 'ui-invalid_passphrase_action',
            CHANGE_SETTINGS: 'ui-change_settings',
            LOGIN_CHALLENGE_RESPONSE: 'ui-login_challenge_response'
          }
          const createUiResponse = (type, payload) => ({
            event: ui_request_1.UI_EVENT,
            type,
            payload
          })
          exports.createUiResponse = createUiResponse
        },
        {'./ui-request': 78}
      ],
      80: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.parseConnectSettings = void 0
          const tslib_1 = require('tslib')
          tslib_1.__exportStar(require('./constants'), exports)
          tslib_1.__exportStar(require('./events'), exports)
          tslib_1.__exportStar(require('./types'), exports)
          var connectSettings_1 = require('./data/connectSettings')
          Object.defineProperty(exports, 'parseConnectSettings', {
            enumerable: true,
            get: function () {
              return connectSettings_1.parseConnectSettings
            }
          })
        },
        {
          './constants': 63,
          './data/connectSettings': 67,
          './events': 74,
          './types': 96,
          tslib: 53
        }
      ],
      81: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.factory = void 0
          const events_1 = require('./events')
          const factory = ({
            eventEmitter,
            manifest,
            init,
            call,
            requestLogin,
            uiResponse,
            renderWebUSBButton,
            disableWebUSB,
            requestWebUSBDevice,
            cancel,
            dispose
          }) => {
            const api = {
              manifest,
              init,
              getSettings: () => call({method: 'getSettings'}),
              on: (type, fn) => {
                eventEmitter.on(type, fn)
              },
              off: (type, fn) => {
                eventEmitter.removeListener(type, fn)
              },
              removeAllListeners: type => {
                if (typeof type === 'string') {
                  eventEmitter.removeAllListeners(type)
                } else {
                  eventEmitter.removeAllListeners()
                }
              },
              uiResponse,
              blockchainGetAccountBalanceHistory: params =>
                call({...params, method: 'blockchainGetAccountBalanceHistory'}),
              blockchainGetCurrentFiatRates: params =>
                call({...params, method: 'blockchainGetCurrentFiatRates'}),
              blockchainGetFiatRatesForTimestamps: params =>
                call({
                  ...params,
                  method: 'blockchainGetFiatRatesForTimestamps'
                }),
              blockchainDisconnect: params =>
                call({...params, method: 'blockchainDisconnect'}),
              blockchainEstimateFee: params =>
                call({...params, method: 'blockchainEstimateFee'}),
              blockchainGetTransactions: params =>
                call({...params, method: 'blockchainGetTransactions'}),
              blockchainSetCustomBackend: params =>
                call({...params, method: 'blockchainSetCustomBackend'}),
              blockchainSubscribe: params =>
                call({...params, method: 'blockchainSubscribe'}),
              blockchainSubscribeFiatRates: params =>
                call({...params, method: 'blockchainSubscribeFiatRates'}),
              blockchainUnsubscribe: params =>
                call({...params, method: 'blockchainUnsubscribe'}),
              blockchainUnsubscribeFiatRates: params =>
                call({...params, method: 'blockchainUnsubscribeFiatRates'}),
              requestLogin: params => requestLogin(params),
              cardanoGetAddress: params =>
                call({
                  ...params,
                  method: 'cardanoGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              cardanoGetNativeScriptHash: params =>
                call({...params, method: 'cardanoGetNativeScriptHash'}),
              cardanoGetPublicKey: params =>
                call({...params, method: 'cardanoGetPublicKey'}),
              cardanoSignTransaction: params =>
                call({...params, method: 'cardanoSignTransaction'}),
              cipherKeyValue: params =>
                call({...params, method: 'cipherKeyValue'}),
              composeTransaction: params =>
                call({...params, method: 'composeTransaction'}),
              ethereumGetAddress: params =>
                call({
                  ...params,
                  method: 'ethereumGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              ethereumGetPublicKey: params =>
                call({...params, method: 'ethereumGetPublicKey'}),
              ethereumSignMessage: params =>
                call({...params, method: 'ethereumSignMessage'}),
              ethereumSignTransaction: params =>
                call({...params, method: 'ethereumSignTransaction'}),
              ethereumSignTypedData: params =>
                call({...params, method: 'ethereumSignTypedData'}),
              ethereumVerifyMessage: params =>
                call({...params, method: 'ethereumVerifyMessage'}),
              getAccountInfo: params =>
                call({...params, method: 'getAccountInfo'}),
              getAddress: params =>
                call({
                  ...params,
                  method: 'getAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              getDeviceState: params =>
                call({...params, method: 'getDeviceState'}),
              getFeatures: params => call({...params, method: 'getFeatures'}),
              getFirmwareHash: params =>
                call({...params, method: 'getFirmwareHash'}),
              getOwnershipId: params =>
                call({...params, method: 'getOwnershipId'}),
              getOwnershipProof: params =>
                call({...params, method: 'getOwnershipProof'}),
              getPublicKey: params => call({...params, method: 'getPublicKey'}),
              nemGetAddress: params =>
                call({
                  ...params,
                  method: 'nemGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              nemSignTransaction: params =>
                call({...params, method: 'nemSignTransaction'}),
              pushTransaction: params =>
                call({...params, method: 'pushTransaction'}),
              rippleGetAddress: params =>
                call({
                  ...params,
                  method: 'rippleGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              rippleSignTransaction: params =>
                call({...params, method: 'rippleSignTransaction'}),
              signMessage: params => call({...params, method: 'signMessage'}),
              signTransaction: params =>
                call({...params, method: 'signTransaction'}),
              stellarGetAddress: params =>
                call({
                  ...params,
                  method: 'stellarGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              stellarSignTransaction: params =>
                call({...params, method: 'stellarSignTransaction'}),
              tezosGetAddress: params =>
                call({
                  ...params,
                  method: 'tezosGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              tezosGetPublicKey: params =>
                call({...params, method: 'tezosGetPublicKey'}),
              tezosSignTransaction: params =>
                call({...params, method: 'tezosSignTransaction'}),
              unlockPath: params => call({...params, method: 'unlockPath'}),
              eosGetPublicKey: params =>
                call({...params, method: 'eosGetPublicKey'}),
              eosSignTransaction: params =>
                call({...params, method: 'eosSignTransaction'}),
              binanceGetAddress: params =>
                call({
                  ...params,
                  method: 'binanceGetAddress',
                  useEventListener:
                    eventEmitter.listenerCount(events_1.UI.ADDRESS_VALIDATION) >
                    0
                }),
              binanceGetPublicKey: params =>
                call({...params, method: 'binanceGetPublicKey'}),
              binanceSignTransaction: params =>
                call({...params, method: 'binanceSignTransaction'}),
              verifyMessage: params =>
                call({...params, method: 'verifyMessage'}),
              resetDevice: params => call({...params, method: 'resetDevice'}),
              wipeDevice: params => call({...params, method: 'wipeDevice'}),
              checkFirmwareAuthenticity: params =>
                call({...params, method: 'checkFirmwareAuthenticity'}),
              applyFlags: params => call({...params, method: 'applyFlags'}),
              applySettings: params =>
                call({...params, method: 'applySettings'}),
              authorizeCoinjoin: params =>
                call({...params, method: 'authorizeCoinjoin'}),
              backupDevice: params => call({...params, method: 'backupDevice'}),
              changePin: params => call({...params, method: 'changePin'}),
              firmwareUpdate: params =>
                call({...params, method: 'firmwareUpdate'}),
              recoveryDevice: params =>
                call({...params, method: 'recoveryDevice'}),
              getCoinInfo: params => call({...params, method: 'getCoinInfo'}),
              rebootToBootloader: params =>
                call({...params, method: 'rebootToBootloader'}),
              setBusy: params => call({...params, method: 'setBusy'}),
              setProxy: params => call({...params, method: 'setProxy'}),
              dispose,
              cancel,
              renderWebUSBButton,
              disableWebUSB,
              requestWebUSBDevice
            }
            return api
          }
          exports.factory = factory
        },
        {'./events': 74}
      ],
      82: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          const tslib_1 = require('tslib')
          const errors_1 = require('./constants/errors')
          const factory_1 = require('./factory')
          const fallback = () => {
            throw (0, errors_1.TypedError)('Method_InvalidPackage')
          }
          const TrezorConnect = (0, factory_1.factory)({
            eventEmitter: {
              on: fallback,
              off: fallback,
              removeAllListeners: fallback,
              listenerCount: fallback
            },
            manifest: fallback,
            init: fallback,
            call: fallback,
            requestLogin: fallback,
            requestWebUSBDevice: fallback,
            uiResponse: fallback,
            renderWebUSBButton: fallback,
            disableWebUSB: fallback,
            cancel: fallback,
            dispose: fallback
          })
          exports.default = TrezorConnect
          tslib_1.__exportStar(require('./exports'), exports)
        },
        {'./constants/errors': 62, './exports': 80, './factory': 81, tslib: 53}
      ],
      83: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      84: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      85: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      86: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      87: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      88: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      89: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      90: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      91: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      92: [
        function (require, module, exports) {
          arguments[4][84][0].apply(exports, arguments)
        },
        {dup: 84}
      ],
      93: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      94: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      95: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      96: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          const tslib_1 = require('tslib')
          tslib_1.__exportStar(require('./api'), exports)
          tslib_1.__exportStar(require('./account'), exports)
          tslib_1.__exportStar(require('./coinInfo'), exports)
          tslib_1.__exportStar(require('./device'), exports)
          tslib_1.__exportStar(require('./firmware'), exports)
          tslib_1.__exportStar(require('./params'), exports)
          tslib_1.__exportStar(require('./settings'), exports)
          tslib_1.__exportStar(require('./api/cardano'), exports)
          tslib_1.__exportStar(require('./api/binance'), exports)
          tslib_1.__exportStar(require('./api/bitcoin'), exports)
          tslib_1.__exportStar(require('./api/eos'), exports)
          tslib_1.__exportStar(require('./api/ripple'), exports)
          tslib_1.__exportStar(require('./api/ethereum'), exports)
          tslib_1.__exportStar(require('./api/stellar'), exports)
          tslib_1.__exportStar(require('./api/tezos'), exports)
        },
        {
          './account': 83,
          './api': 89,
          './api/binance': 84,
          './api/bitcoin': 85,
          './api/cardano': 86,
          './api/eos': 87,
          './api/ethereum': 88,
          './api/ripple': 90,
          './api/stellar': 91,
          './api/tezos': 92,
          './coinInfo': 93,
          './device': 94,
          './firmware': 95,
          './params': 97,
          './settings': 98,
          tslib: 53
        }
      ],
      97: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      98: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
        },
        {}
      ],
      99: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.getLog =
            exports.enableLogByPrefix =
            exports.enableLog =
            exports.initLog =
              void 0
          const colors = {
            '@trezor/connect': 'color: #f4a742; background: #000;',
            IFrame: 'color: #f4a742; background: #000;',
            Core: 'color: #f4a742; background: #000;',
            DescriptorStream: 'color: #77ab59; background: #000;',
            DeviceList: 'color: #77ab59; background: #000;',
            Device: 'color: #bada55; background: #000;',
            DeviceCommands: 'color: #bada55; background: #000;'
          }
          const MAX_ENTRIES = 100
          class Log {
            constructor(prefix, enabled) {
              this.prefix = prefix
              this.enabled = enabled
              this.messages = []
              this.css =
                typeof window !== 'undefined' && colors[prefix]
                  ? colors[prefix]
                  : ''
            }
            addMessage(level, prefix, ...args) {
              this.messages.push({
                level,
                prefix,
                message: args,
                timestamp: new Date().getTime()
              })
              if (this.messages.length > MAX_ENTRIES) {
                this.messages.shift()
              }
            }
            log(...args) {
              this.addMessage('log', this.prefix, ...args)
              if (this.enabled) {
                console.log(this.prefix, ...args)
              }
            }
            error(...args) {
              this.addMessage('error', this.prefix, ...args)
              if (this.enabled) {
                console.error(this.prefix, ...args)
              }
            }
            warn(...args) {
              this.addMessage('warn', this.prefix, ...args)
              if (this.enabled) {
                console.warn(this.prefix, ...args)
              }
            }
            debug(...args) {
              this.addMessage('debug', this.prefix, ...args)
              if (this.enabled) {
                if (this.css) {
                  console.log(`%c${this.prefix}`, this.css, ...args)
                } else {
                  console.log(this.prefix, ...args)
                }
              }
            }
          }
          const _logs = {}
          const initLog = (prefix, enabled) => {
            const instance = new Log(prefix, !!enabled)
            _logs[prefix] = instance
            return instance
          }
          exports.initLog = initLog
          const enableLog = enabled => {
            Object.keys(_logs).forEach(key => {
              _logs[key].enabled = !!enabled
            })
          }
          exports.enableLog = enableLog
          const enableLogByPrefix = (prefix, enabled) => {
            if (_logs[prefix]) {
              _logs[prefix].enabled = enabled
            }
          }
          exports.enableLogByPrefix = enableLogByPrefix
          const getLog = () => {
            let logs = []
            Object.keys(_logs).forEach(key => {
              logs = logs.concat(_logs[key].messages)
            })
            logs.sort((a, b) => a.timestamp - b.timestamp)
            return logs
          }
          exports.getLog = getLog
        },
        {}
      ],
      100: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.getOnionDomain = exports.getHost = exports.getOrigin = void 0
          const getOrigin = url => {
            var _a
            if (typeof url !== 'string') return 'unknown'
            if (url.indexOf('file://') === 0) return 'file://'
            const [origin] =
              (_a = url.match(/^https?:\/\/[^/]+/)) !== null && _a !== void 0
                ? _a
                : []
            return origin !== null && origin !== void 0 ? origin : 'unknown'
          }
          exports.getOrigin = getOrigin
          const getHost = url => {
            var _a
            if (typeof url !== 'string') return
            const [, , uri] =
              (_a = url.match(/^(https?):\/\/([^:/]+)?/i)) !== null &&
              _a !== void 0
                ? _a
                : []
            if (uri) {
              const parts = uri.split('.')
              return parts.length > 2
                ? parts.slice(parts.length - 2, parts.length).join('.')
                : uri
            }
          }
          exports.getHost = getHost
          const getOnionDomain = (url, dict) => {
            var _a
            if (Array.isArray(url)) {
              return url.map(u => (0, exports.getOnionDomain)(u, dict))
            }
            if (typeof url === 'string') {
              const [, protocol, subdomain, domain, rest] =
                (_a = url.match(
                  /^(http|ws)s?:\/\/([^:/]+\.)?([^/.]+\.[^/.]+)(\/.*)?$/i
                )) !== null && _a !== void 0
                  ? _a
                  : []
              if (!domain || !dict[domain]) return url
              return `${protocol}://${subdomain || ''}${dict[domain]}${
                rest || ''
              }`
            }
            return url
          }
          exports.getOnionDomain = getOnionDomain
        },
        {}
      ],
      101: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.request = exports.setFetch = void 0
          let _fetch =
            typeof window === 'undefined'
              ? () => Promise.reject()
              : window.fetch
          let _isNode = false
          function setFetch(fetch, isNode) {
            _fetch = fetch
            _isNode = !!isNode
          }
          exports.setFetch = setFetch
          function contentType(body) {
            if (typeof body === 'string') {
              if (body === '') {
                return 'text/plain'
              }
              return 'application/octet-stream'
            }
            return 'application/json'
          }
          function wrapBody(body) {
            if (typeof body === 'string') {
              return body
            }
            return JSON.stringify(body)
          }
          function parseResult(text) {
            try {
              return JSON.parse(text)
            } catch (e) {
              return text
            }
          }
          function request(options) {
            return __awaiter(this, void 0, void 0, function* () {
              const fetchOptions = {
                method: options.method,
                body: wrapBody(options.body),
                credentials: 'same-origin',
                headers: {}
              }
              if (
                options.skipContentTypeHeader == null ||
                options.skipContentTypeHeader === false
              ) {
                fetchOptions.headers = Object.assign(
                  Object.assign({}, fetchOptions.headers),
                  {
                    'Content-Type': contentType(
                      options.body == null ? '' : options.body
                    )
                  }
                )
              }
              if (_isNode) {
                fetchOptions.headers = Object.assign(
                  Object.assign({}, fetchOptions.headers),
                  {Origin: 'https://node.trezor.io'}
                )
              }
              const res = yield _fetch(options.url, fetchOptions)
              const resText = yield res.text()
              if (res.ok) {
                return parseResult(resText)
              }
              const resJson = parseResult(resText)
              if (
                typeof resJson === 'object' &&
                resJson != null &&
                resJson.error != null
              ) {
                throw new Error(resJson.error)
              } else {
                throw new Error(resText)
              }
            })
          }
          exports.request = request
        },
        {}
      ],
      102: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __setModuleDefault =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (o, v) {
                  Object.defineProperty(o, 'default', {
                    enumerable: true,
                    value: v
                  })
                }
              : function (o, v) {
                  o['default'] = v
                })
          var __importStar =
            (this && this.__importStar) ||
            function (mod) {
              if (mod && mod.__esModule) return mod
              var result = {}
              if (mod != null)
                for (var k in mod)
                  if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                  )
                    __createBinding(result, mod, k)
              __setModuleDefault(result, mod)
              return result
            }
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          const utils_1 = require('@trezor/utils')
          const http_1 = require('./http')
          const check = __importStar(require('../utils/highlevel-checks'))
          const send_1 = require('../lowlevel/send')
          const messages_1 = require('../lowlevel/protobuf/messages')
          const receive_1 = require('../lowlevel/receive')
          const config_1 = require('../config')
          class BridgeTransport {
            constructor(url, newestVersionUrl) {
              this.configured = false
              this.debug = false
              this.name = 'BridgeTransport'
              this.requestNeeded = false
              this.stopped = false
              this.version = ''
              this.url = url == null ? config_1.DEFAULT_URL : url
              this.newestVersionUrl =
                newestVersionUrl == null
                  ? config_1.DEFAULT_VERSION_URL
                  : newestVersionUrl
            }
            _post(options) {
              if (this.stopped) {
                return Promise.reject('Transport stopped.')
              }
              return (0, http_1.request)(
                Object.assign(Object.assign({}, options), {
                  method: 'POST',
                  url: this.url + options.url,
                  skipContentTypeHeader: true
                })
              )
            }
            init(debug) {
              return __awaiter(this, void 0, void 0, function* () {
                this.debug = !!debug
                yield this._silentInit()
              })
            }
            _silentInit() {
              return __awaiter(this, void 0, void 0, function* () {
                const infoS = yield (0, http_1.request)({
                  url: this.url,
                  method: 'POST'
                })
                const info = check.info(infoS)
                this.version = info.version
                const newVersion =
                  typeof this.bridgeVersion === 'string'
                    ? this.bridgeVersion
                    : check.version(
                        yield (0, http_1.request)({
                          url: `${this.newestVersionUrl}?${Date.now()}`,
                          method: 'GET'
                        })
                      )
                this.isOutdated = utils_1.versionUtils.isNewer(
                  newVersion,
                  this.version
                )
              })
            }
            configure(signedData) {
              const messages = (0, messages_1.parseConfigure)(signedData)
              this.configured = true
              this._messages = messages
            }
            listen(old) {
              return __awaiter(this, void 0, void 0, function* () {
                if (old == null) {
                  throw new Error(
                    'Bridge v2 does not support listen without previous.'
                  )
                }
                const devicesS = yield this._post({
                  url: '/listen',
                  body: old
                })
                const devices = check.devices(devicesS)
                return devices
              })
            }
            enumerate() {
              return __awaiter(this, void 0, void 0, function* () {
                const devicesS = yield this._post({url: '/enumerate'})
                const devices = check.devices(devicesS)
                return devices
              })
            }
            _acquireMixed(input, debugLink) {
              const previousStr =
                input.previous == null ? 'null' : input.previous
              const url = `${debugLink ? '/debug' : ''}/acquire/${
                input.path
              }/${previousStr}`
              return this._post({url})
            }
            acquire(input, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                const acquireS = yield this._acquireMixed(input, debugLink)
                return check.acquire(acquireS)
              })
            }
            release(session, onclose, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                const res = this._post({
                  url: `${debugLink ? '/debug' : ''}/release/${session}`
                })
                if (onclose) {
                  return
                }
                yield res
              })
            }
            call(session, name, data, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                if (this._messages == null) {
                  throw new Error('Transport not configured.')
                }
                const messages = this._messages
                const o = (0, send_1.buildOne)(messages, name, data)
                const outData = o.toString('hex')
                const resData = yield this._post({
                  url: `${debugLink ? '/debug' : ''}/call/${session}`,
                  body: outData
                })
                if (typeof resData !== 'string') {
                  throw new Error('Returning data is not string.')
                }
                const jsonData = (0, receive_1.receiveOne)(messages, resData)
                return check.call(jsonData)
              })
            }
            post(session, name, data, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                if (this._messages == null) {
                  throw new Error('Transport not configured.')
                }
                const messages = this._messages
                const outData = (0, send_1.buildOne)(
                  messages,
                  name,
                  data
                ).toString('hex')
                yield this._post({
                  url: `${debugLink ? '/debug' : ''}/post/${session}`,
                  body: outData
                })
              })
            }
            read(session, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                if (this._messages == null) {
                  throw new Error('Transport not configured.')
                }
                const messages = this._messages
                const resData = yield this._post({
                  url: `${debugLink ? '/debug' : ''}/read/${session}`
                })
                if (typeof resData !== 'string') {
                  throw new Error('Returning data is not string.')
                }
                const jsonData = (0, receive_1.receiveOne)(messages, resData)
                return check.call(jsonData)
              })
            }
            static setFetch(fetch, isNode) {
              ;(0, http_1.setFetch)(fetch, isNode)
            }
            requestDevice() {
              return Promise.reject()
            }
            setBridgeLatestUrl(url) {
              this.newestVersionUrl = url
            }
            setBridgeLatestVersion(version) {
              this.bridgeVersion = version
            }
            stop() {
              this.stopped = true
            }
          }
          exports.default = BridgeTransport
        },
        {
          '../config': 103,
          '../lowlevel/protobuf/messages': 110,
          '../lowlevel/receive': 114,
          '../lowlevel/send': 115,
          '../utils/highlevel-checks': 122,
          './http': 101,
          '@trezor/utils': 140
        }
      ],
      103: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.BUFFER_SIZE =
            exports.HEADER_SIZE =
            exports.MESSAGE_HEADER_BYTE =
            exports.DEFAULT_VERSION_URL =
            exports.DEFAULT_URL =
              void 0
          exports.DEFAULT_URL = 'http://127.0.0.1:21325'
          exports.DEFAULT_VERSION_URL =
            'https://data.trezor.io/bridge/latest.txt'
          exports.MESSAGE_HEADER_BYTE = 0x23
          exports.HEADER_SIZE = 1 + 1 + 4 + 2
          exports.BUFFER_SIZE = 63
        },
        {}
      ],
      104: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.TREZOR_DESCS = void 0
          exports.TREZOR_DESCS = [
            {vendorId: 0x534c, productId: 0x0001},
            {vendorId: 0x1209, productId: 0x53c0},
            {vendorId: 0x1209, productId: 0x53c1}
          ]
        },
        {}
      ],
      105: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          class FallbackTransport {
            constructor(transports) {
              this._availableTransports = []
              this.activeName = ''
              this.configured = false
              this.debug = false
              this.isOutdated = false
              this.name = 'FallbackTransport'
              this.requestNeeded = false
              this.transports = []
              this.version = ''
              this.transports = transports
            }
            _tryInitTransports() {
              return __awaiter(this, void 0, void 0, function* () {
                const res = []
                let lastError = null
                for (const transport of this.transports) {
                  try {
                    yield transport.init(this.debug)
                    res.push(transport)
                  } catch (e) {
                    lastError = e
                  }
                }
                if (res.length === 0) {
                  throw (
                    lastError || new Error('No transport could be initialized.')
                  )
                }
                return res
              })
            }
            _tryConfigureTransports(data) {
              return __awaiter(this, void 0, void 0, function* () {
                let lastError = null
                for (const transport of this._availableTransports) {
                  try {
                    yield transport.configure(data)
                    return transport
                  } catch (e) {
                    lastError = e
                  }
                }
                throw (
                  lastError || new Error('No transport could be initialized.')
                )
              })
            }
            init(debug) {
              return __awaiter(this, void 0, void 0, function* () {
                this.debug = !!debug
                const transports = yield this._tryInitTransports()
                this._availableTransports = transports
                this.version = transports[0].version
                this.configured = false
              })
            }
            configure(signedData) {
              return __awaiter(this, void 0, void 0, function* () {
                const pt = this._tryConfigureTransports(signedData)
                this.activeTransport = yield pt
                this.configured = this.activeTransport.configured
                this.version = this.activeTransport.version
                this.activeName = this.activeTransport.name
                this.requestNeeded = this.activeTransport.requestNeeded
                this.isOutdated = this.activeTransport.isOutdated
              })
            }
            enumerate() {
              return this.activeTransport.enumerate()
            }
            listen(old) {
              return this.activeTransport.listen(old)
            }
            acquire(input, debugLink) {
              return this.activeTransport.acquire(input, debugLink)
            }
            release(session, onclose, debugLink) {
              return this.activeTransport.release(session, onclose, debugLink)
            }
            call(session, name, data, debugLink) {
              return this.activeTransport.call(session, name, data, debugLink)
            }
            post(session, name, data, debugLink) {
              return this.activeTransport.post(session, name, data, debugLink)
            }
            read(session, debugLink) {
              return this.activeTransport.read(session, debugLink)
            }
            requestDevice() {
              return this.activeTransport.requestDevice()
            }
            setBridgeLatestUrl(url) {
              for (const transport of this.transports) {
                transport.setBridgeLatestUrl(url)
              }
            }
            setBridgeLatestVersion(version) {
              for (const transport of this.transports) {
                transport.setBridgeLatestVersion(version)
              }
            }
            stop() {
              for (const transport of this.transports) {
                transport.stop()
              }
            }
          }
          exports.default = FallbackTransport
        },
        {}
      ],
      106: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __setModuleDefault =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (o, v) {
                  Object.defineProperty(o, 'default', {
                    enumerable: true,
                    value: v
                  })
                }
              : function (o, v) {
                  o['default'] = v
                })
          var __importStar =
            (this && this.__importStar) ||
            function (mod) {
              if (mod && mod.__esModule) return mod
              var result = {}
              if (mod != null)
                for (var k in mod)
                  if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                  )
                    __createBinding(result, mod, k)
              __setModuleDefault(result, mod)
              return result
            }
          var __importDefault =
            (this && this.__importDefault) ||
            function (mod) {
              return mod && mod.__esModule ? mod : {default: mod}
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.Messages = exports.TREZOR_DESCS = void 0
          const v2_1 = __importDefault(require('./bridge/v2'))
          const withSharedConnections_1 = __importDefault(
            require('./lowlevel/withSharedConnections')
          )
          const fallback_1 = __importDefault(require('./fallback'))
          const webusb_1 = __importDefault(require('./lowlevel/webusb'))
          const protobuf = __importStar(require('protobufjs/light'))
          const long_1 = __importDefault(require('long'))
          protobuf.util.Long = long_1.default
          protobuf.configure()
          var constants_1 = require('./constants')
          Object.defineProperty(exports, 'TREZOR_DESCS', {
            enumerable: true,
            get: function () {
              return constants_1.TREZOR_DESCS
            }
          })
          var types_1 = require('./types')
          Object.defineProperty(exports, 'Messages', {
            enumerable: true,
            get: function () {
              return types_1.Messages
            }
          })
          exports.default = {
            BridgeV2: v2_1.default,
            Fallback: fallback_1.default,
            Lowlevel: withSharedConnections_1.default,
            WebUsb: webusb_1.default
          }
        },
        {
          './bridge/v2': 102,
          './constants': 104,
          './fallback': 105,
          './lowlevel/webusb': 117,
          './lowlevel/withSharedConnections': 118,
          './types': 119,
          long: 22,
          'protobufjs/light': 23
        }
      ],
      107: [
        function (require, module, exports) {
          'use strict'
          var __rest =
            (this && this.__rest) ||
            function (s, e) {
              var t = {}
              for (var p in s)
                if (
                  Object.prototype.hasOwnProperty.call(s, p) &&
                  e.indexOf(p) < 0
                )
                  t[p] = s[p]
              if (
                s != null &&
                typeof Object.getOwnPropertySymbols === 'function'
              )
                for (
                  var i = 0, p = Object.getOwnPropertySymbols(s);
                  i < p.length;
                  i++
                ) {
                  if (
                    e.indexOf(p[i]) < 0 &&
                    Object.prototype.propertyIsEnumerable.call(s, p[i])
                  )
                    t[p[i]] = s[p[i]]
                }
              return t
            }
          var __importDefault =
            (this && this.__importDefault) ||
            function (mod) {
              return mod && mod.__esModule ? mod : {default: mod}
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.decode = void 0
          const bytebuffer_1 = __importDefault(require('bytebuffer'))
          const protobuf_1 = require('../../utils/protobuf')
          const transform = (field, value) => {
            if ((0, protobuf_1.isPrimitiveField)(field.type)) {
              if (field.optional && typeof value === 'undefined') {
                return null
              }
              if (field.type === 'bytes') {
                return bytebuffer_1.default.wrap(value).toString('hex')
              }
              if (field.long) {
                if (Number.isSafeInteger(value.toNumber())) {
                  return value.toNumber()
                }
                return value.toString()
              }
              return value
            }
            if ('valuesById' in field.resolvedType) {
              return field.resolvedType.valuesById[value]
            }
            if (field.resolvedType.fields) {
              return messageToJSON(value, field.resolvedType.fields)
            }
            throw new Error(`transport: decode: case not handled: ${field}`)
          }
          function messageToJSON(Message, fields) {
            const message = __rest(Message, [])
            const res = {}
            Object.keys(fields).forEach(key => {
              const field = fields[key]
              const value = message[key]
              if (field.repeated) {
                res[key] = value.map(v => transform(field, v))
              } else {
                res[key] = transform(field, value)
              }
            })
            return res
          }
          const decode = (Message, data) => {
            const buff = data.toBuffer()
            const a = new Uint8Array(buff)
            const decoded = Message.decode(a)
            return messageToJSON(decoded, decoded.$type.fields)
          }
          exports.decode = decode
        },
        {'../../utils/protobuf': 123, bytebuffer: 16}
      ],
      108: [
        function (require, module, exports) {
          ;(function (Buffer) {
            ;(function () {
              'use strict'
              var __importDefault =
                (this && this.__importDefault) ||
                function (mod) {
                  return mod && mod.__esModule ? mod : {default: mod}
                }
              Object.defineProperty(exports, '__esModule', {value: true})
              exports.encode = exports.patch = void 0
              const bytebuffer_1 = __importDefault(require('bytebuffer'))
              const protobuf_1 = require('../../utils/protobuf')
              const transform = (fieldType, value) => {
                if (fieldType === 'bytes') {
                  if (typeof value === 'string' && !value) return value
                  return Buffer.from(value, 'hex')
                }
                if (typeof value === 'number' && !Number.isSafeInteger(value)) {
                  throw new RangeError(
                    'field value is not within safe integer range'
                  )
                }
                return value
              }
              function patch(Message, payload) {
                const patched = {}
                if (!Message.fields) {
                  return patched
                }
                Object.keys(Message.fields).forEach(key => {
                  const field = Message.fields[key]
                  const value = payload[key]
                  if (typeof value === 'undefined') {
                    return
                  }
                  if ((0, protobuf_1.isPrimitiveField)(field.type)) {
                    if (field.repeated) {
                      patched[key] = value.map(v => transform(field.type, v))
                    } else {
                      patched[key] = transform(field.type, value)
                    }
                    return
                  }
                  if (field.repeated) {
                    const RefMessage = Message.lookupTypeOrEnum(field.type)
                    patched[key] = value.map(v => patch(RefMessage, v))
                  } else if (typeof value === 'object' && value !== null) {
                    const RefMessage = Message.lookupType(field.type)
                    patched[key] = patch(RefMessage, value)
                  } else if (typeof value === 'number') {
                    const RefMessage = Message.lookupEnum(field.type)
                    patched[key] = RefMessage.values[value]
                  } else {
                    patched[key] = value
                  }
                })
                return patched
              }
              exports.patch = patch
              const encode = (Message, data) => {
                const payload = patch(Message, data)
                const message = Message.fromObject(payload)
                const buffer = Message.encode(message).finish()
                const bytebuffer = new bytebuffer_1.default(buffer.byteLength)
                bytebuffer.append(buffer)
                bytebuffer.reset()
                return bytebuffer
              }
              exports.encode = encode
            }).call(this)
          }).call(this, require('buffer').Buffer)
        },
        {'../../utils/protobuf': 123, buffer: 2, bytebuffer: 16}
      ],
      109: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __exportStar =
            (this && this.__exportStar) ||
            function (m, exports) {
              for (var p in m)
                if (
                  p !== 'default' &&
                  !Object.prototype.hasOwnProperty.call(exports, p)
                )
                  __createBinding(exports, m, p)
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          __exportStar(require('./decode'), exports)
          __exportStar(require('./encode'), exports)
        },
        {'./decode': 107, './encode': 108}
      ],
      110: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __setModuleDefault =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (o, v) {
                  Object.defineProperty(o, 'default', {
                    enumerable: true,
                    value: v
                  })
                }
              : function (o, v) {
                  o['default'] = v
                })
          var __importStar =
            (this && this.__importStar) ||
            function (mod) {
              if (mod && mod.__esModule) return mod
              var result = {}
              if (mod != null)
                for (var k in mod)
                  if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                  )
                    __createBinding(result, mod, k)
              __setModuleDefault(result, mod)
              return result
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createMessageFromType =
            exports.createMessageFromName =
            exports.parseConfigure =
              void 0
          const protobuf = __importStar(require('protobufjs/light'))
          function parseConfigure(data) {
            if (typeof data === 'string') {
              return protobuf.Root.fromJSON(JSON.parse(data))
            }
            return protobuf.Root.fromJSON(data)
          }
          exports.parseConfigure = parseConfigure
          const createMessageFromName = (messages, name) => {
            const Message = messages.lookupType(name)
            const MessageType = messages.lookupEnum('MessageType')
            let messageType = MessageType.values[`MessageType_${name}`]
            if (!messageType && Message.options) {
              messageType = Message.options['(wire_type)']
            }
            return {
              Message,
              messageType
            }
          }
          exports.createMessageFromName = createMessageFromName
          const createMessageFromType = (messages, typeId) => {
            const MessageType = messages.lookupEnum('MessageType')
            const messageName = MessageType.valuesById[typeId].replace(
              'MessageType_',
              ''
            )
            const Message = messages.lookupType(messageName)
            return {
              Message,
              messageName
            }
          }
          exports.createMessageFromType = createMessageFromType
        },
        {'protobufjs/light': 23}
      ],
      111: [
        function (require, module, exports) {
          'use strict'
          var __importDefault =
            (this && this.__importDefault) ||
            function (mod) {
              return mod && mod.__esModule ? mod : {default: mod}
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.decodeChunked = exports.decode = void 0
          const config_1 = require('../../config')
          const bytebuffer_1 = __importDefault(require('bytebuffer'))
          const readHeader = buffer => {
            const typeId = buffer.readUint16()
            const length = buffer.readUint32()
            return {typeId, length}
          }
          const readHeaderChunked = buffer => {
            const sharp1 = buffer.readByte()
            const sharp2 = buffer.readByte()
            const typeId = buffer.readUint16()
            const length = buffer.readUint32()
            return {sharp1, sharp2, typeId, length}
          }
          const decode = byteBuffer => {
            const {typeId} = readHeader(byteBuffer)
            return {
              typeId,
              buffer: byteBuffer
            }
          }
          exports.decode = decode
          const decodeChunked = bytes => {
            const byteBuffer = bytebuffer_1.default.wrap(
              bytes,
              undefined,
              undefined,
              true
            )
            const {sharp1, sharp2, typeId, length} =
              readHeaderChunked(byteBuffer)
            if (
              sharp1 !== config_1.MESSAGE_HEADER_BYTE ||
              sharp2 !== config_1.MESSAGE_HEADER_BYTE
            ) {
              throw new Error("Didn't receive expected header signature.")
            }
            return {length, typeId, restBuffer: byteBuffer}
          }
          exports.decodeChunked = decodeChunked
        },
        {'../../config': 103, bytebuffer: 16}
      ],
      112: [
        function (require, module, exports) {
          'use strict'
          var __importDefault =
            (this && this.__importDefault) ||
            function (mod) {
              return mod && mod.__esModule ? mod : {default: mod}
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.encode = void 0
          const bytebuffer_1 = __importDefault(require('bytebuffer'))
          const config_1 = require('../../config')
          function encode(data, options) {
            const {addTrezorHeaders, chunked, messageType} = options
            const fullSize =
              (addTrezorHeaders
                ? config_1.HEADER_SIZE
                : config_1.HEADER_SIZE - 2) + data.limit
            const encodedByteBuffer = new bytebuffer_1.default(fullSize)
            if (addTrezorHeaders) {
              encodedByteBuffer.writeByte(config_1.MESSAGE_HEADER_BYTE)
              encodedByteBuffer.writeByte(config_1.MESSAGE_HEADER_BYTE)
            }
            encodedByteBuffer.writeUint16(messageType)
            encodedByteBuffer.writeUint32(data.limit)
            encodedByteBuffer.append(data.buffer)
            encodedByteBuffer.reset()
            if (chunked === false) {
              return encodedByteBuffer
            }
            const result = []
            const size = config_1.BUFFER_SIZE
            const count =
              Math.floor((encodedByteBuffer.limit - 1) / size) + 1 || 1
            for (let i = 0; i < count; i++) {
              const start = i * size
              const end = Math.min((i + 1) * size, encodedByteBuffer.limit)
              const slice = encodedByteBuffer.slice(start, end)
              slice.compact()
              result.push(slice.buffer)
            }
            return result
          }
          exports.encode = encode
        },
        {'../../config': 103, bytebuffer: 16}
      ],
      113: [
        function (require, module, exports) {
          arguments[4][109][0].apply(exports, arguments)
        },
        {'./decode': 111, './encode': 112, dup: 109}
      ],
      114: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __setModuleDefault =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (o, v) {
                  Object.defineProperty(o, 'default', {
                    enumerable: true,
                    value: v
                  })
                }
              : function (o, v) {
                  o['default'] = v
                })
          var __importStar =
            (this && this.__importStar) ||
            function (mod) {
              if (mod && mod.__esModule) return mod
              var result = {}
              if (mod != null)
                for (var k in mod)
                  if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                  )
                    __createBinding(result, mod, k)
              __setModuleDefault(result, mod)
              return result
            }
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          var __importDefault =
            (this && this.__importDefault) ||
            function (mod) {
              return mod && mod.__esModule ? mod : {default: mod}
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.receiveAndParse = exports.receiveOne = void 0
          const bytebuffer_1 = __importDefault(require('bytebuffer'))
          const decodeProtobuf = __importStar(require('./protobuf/decode'))
          const decodeProtocol = __importStar(require('./protocol/decode'))
          const messages_1 = require('./protobuf/messages')
          function receiveOne(messages, data) {
            const bytebuffer = bytebuffer_1.default.wrap(data, 'hex')
            const {typeId, buffer} = decodeProtocol.decode(bytebuffer)
            const {Message, messageName} = (0,
            messages_1.createMessageFromType)(messages, typeId)
            const message = decodeProtobuf.decode(Message, buffer)
            return {
              message,
              type: messageName
            }
          }
          exports.receiveOne = receiveOne
          function receiveRest(parsedInput, receiver, expectedLength) {
            return __awaiter(this, void 0, void 0, function* () {
              if (parsedInput.offset >= expectedLength) {
                return
              }
              const data = yield receiver()
              if (data == null) {
                throw new Error('Received no data.')
              }
              parsedInput.append(data)
              return receiveRest(parsedInput, receiver, expectedLength)
            })
          }
          function receiveBuffer(receiver) {
            return __awaiter(this, void 0, void 0, function* () {
              const data = yield receiver()
              const {length, typeId, restBuffer} =
                decodeProtocol.decodeChunked(data)
              const decoded = new bytebuffer_1.default(length)
              if (length) {
                decoded.append(restBuffer)
              }
              yield receiveRest(decoded, receiver, length)
              return {received: decoded, typeId}
            })
          }
          function receiveAndParse(messages, receiver) {
            return __awaiter(this, void 0, void 0, function* () {
              const {received, typeId} = yield receiveBuffer(receiver)
              const {Message, messageName} = (0,
              messages_1.createMessageFromType)(messages, typeId)
              received.reset()
              const message = decodeProtobuf.decode(Message, received)
              return {
                message,
                type: messageName
              }
            })
          }
          exports.receiveAndParse = receiveAndParse
        },
        {
          './protobuf/decode': 107,
          './protobuf/messages': 110,
          './protocol/decode': 111,
          bytebuffer: 16
        }
      ],
      115: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.buildAndSend =
            exports.buildBuffers =
            exports.buildOne =
              void 0
          const protobuf_1 = require('./protobuf')
          const protocol_1 = require('./protocol')
          const messages_1 = require('./protobuf/messages')
          function sendBuffers(sender, buffers) {
            return __awaiter(this, void 0, void 0, function* () {
              for (const buffer of buffers) {
                yield sender(buffer)
              }
            })
          }
          function buildOne(messages, name, data) {
            const {Message, messageType} = (0,
            messages_1.createMessageFromName)(messages, name)
            const buffer = (0, protobuf_1.encode)(Message, data)
            return (0, protocol_1.encode)(buffer, {
              addTrezorHeaders: false,
              chunked: false,
              messageType
            })
          }
          exports.buildOne = buildOne
          const buildBuffers = (messages, name, data) => {
            const {Message, messageType} = (0,
            messages_1.createMessageFromName)(messages, name)
            const buffer = (0, protobuf_1.encode)(Message, data)
            return (0, protocol_1.encode)(buffer, {
              addTrezorHeaders: true,
              chunked: true,
              messageType
            })
          }
          exports.buildBuffers = buildBuffers
          function buildAndSend(messages, sender, name, data) {
            const buffers = (0, exports.buildBuffers)(messages, name, data)
            return sendBuffers(sender, buffers)
          }
          exports.buildAndSend = buildAndSend
        },
        {'./protobuf': 109, './protobuf/messages': 110, './protocol': 113}
      ],
      116: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.postModuleMessage = void 0
          const defered_1 = require('../utils/defered')
          const normalSessions = {}
          const debugSessions = {}
          let lock = null
          let waitPromise = Promise.resolve()
          function startLock() {
            const newLock = (0, defered_1.create)()
            lock = newLock
            setTimeout(() => newLock.reject(new Error('Timed out')), 10 * 1000)
          }
          function releaseLock(obj) {
            if (lock == null) {
              return
            }
            lock.resolve(obj)
          }
          function waitForLock() {
            if (lock == null) {
              return Promise.reject(new Error('???'))
            }
            return lock.promise
          }
          function waitInQueue(fn) {
            const res = waitPromise.then(() => fn())
            waitPromise = res.catch(() => {})
          }
          function sendBack(message, id, port) {
            port.postMessage({id, message})
          }
          function handleEnumerateIntent(id, port) {
            startLock()
            sendBack({type: 'ok'}, id, port)
            return waitForLock().then(obj => {
              sendBack({type: 'ok'}, obj.id, port)
            })
          }
          function handleReleaseDone(id) {
            releaseLock({id})
          }
          function handleReleaseOnClose(session) {
            let path_ = null
            Object.keys(normalSessions).forEach(kpath => {
              if (normalSessions[kpath] === session) {
                path_ = kpath
              }
            })
            if (path_ == null) {
              return Promise.resolve()
            }
            const path = path_
            delete normalSessions[path]
            delete debugSessions[path]
            return Promise.resolve()
          }
          function handleReleaseIntent(session, debug, id, port) {
            let path_ = null
            const sessions = debug ? debugSessions : normalSessions
            const otherSessions = !debug ? debugSessions : normalSessions
            Object.keys(sessions).forEach(kpath => {
              if (sessions[kpath] === session) {
                path_ = kpath
              }
            })
            if (path_ == null) {
              sendBack({type: 'double-release'}, id, port)
              return Promise.resolve()
            }
            const path = path_
            const otherSession = otherSessions[path]
            startLock()
            sendBack({type: 'path', path, otherSession}, id, port)
            return waitForLock().then(obj => {
              delete sessions[path]
              sendBack({type: 'ok'}, obj.id, port)
            })
          }
          function handleGetSessions(id, port, devices) {
            if (devices != null) {
              const connected = {}
              devices.forEach(d => {
                connected[d.path] = true
              })
              Object.keys(normalSessions).forEach(path => {
                if (!normalSessions[path]) {
                  delete normalSessions[path]
                }
              })
              Object.keys(debugSessions).forEach(path => {
                if (!debugSessions[path]) {
                  delete debugSessions[path]
                }
              })
            }
            sendBack(
              {type: 'sessions', debugSessions, normalSessions},
              id,
              port
            )
            return Promise.resolve()
          }
          let lastSession = 0
          function handleAcquireDone(id) {
            releaseLock({good: true, id})
          }
          function handleAcquireFailed(id) {
            releaseLock({good: false, id})
          }
          function handleAcquireIntent(path, id, port, previous, debug) {
            let error = false
            const thisTable = debug ? debugSessions : normalSessions
            const otherTable = !debug ? debugSessions : normalSessions
            const realPrevious = thisTable[path]
            if (realPrevious == null) {
              error = previous != null
            } else {
              error = previous !== realPrevious
            }
            if (error) {
              sendBack({type: 'wrong-previous-session'}, id, port)
              return Promise.resolve()
            }
            startLock()
            sendBack(
              {type: 'other-session', otherSession: otherTable[path]},
              id,
              port
            )
            return waitForLock().then(obj => {
              if (obj.good) {
                lastSession++
                let session = lastSession.toString()
                if (debug) {
                  session = `debug${session}`
                }
                thisTable[path] = session
                sendBack(
                  {type: 'session-number', number: session},
                  obj.id,
                  port
                )
              } else {
                sendBack({type: 'ok'}, obj.id, port)
              }
            })
          }
          function handleMessage({id, message}, port) {
            if (message.type === 'acquire-intent') {
              const {path} = message
              const {previous} = message
              const {debug} = message
              waitInQueue(() =>
                handleAcquireIntent(path, id, port, previous, debug)
              )
            }
            if (message.type === 'acquire-done') {
              handleAcquireDone(id)
            }
            if (message.type === 'acquire-failed') {
              handleAcquireFailed(id)
            }
            if (message.type === 'get-sessions') {
              waitInQueue(() => handleGetSessions(id, port))
            }
            if (message.type === 'get-sessions-and-disconnect') {
              const {devices} = message
              waitInQueue(() => handleGetSessions(id, port, devices))
            }
            if (message.type === 'release-onclose') {
              const {session} = message
              waitInQueue(() => handleReleaseOnClose(session))
            }
            if (message.type === 'release-intent') {
              const {session} = message
              const {debug} = message
              waitInQueue(() => handleReleaseIntent(session, debug, id, port))
            }
            if (message.type === 'release-done') {
              handleReleaseDone(id)
            }
            if (message.type === 'enumerate-intent') {
              waitInQueue(() => handleEnumerateIntent(id, port))
            }
            if (message.type === 'enumerate-done') {
              handleReleaseDone(id)
            }
          }
          if (typeof onconnect !== 'undefined') {
            onconnect = function (e) {
              const port = e.ports[0]
              port.onmessage = function (e) {
                handleMessage(e.data, port)
              }
            }
          }
          function postModuleMessage({id, message}, fn) {
            handleMessage({id, message}, {postMessage: fn})
          }
          exports.postModuleMessage = postModuleMessage
        },
        {'../utils/defered': 121}
      ],
      117: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          const events_1 = require('events')
          const constants_1 = require('../constants')
          const T1HID_VENDOR = 0x534c
          const CONFIGURATION_ID = 1
          const INTERFACE_ID = 0
          const ENDPOINT_ID = 1
          const DEBUG_INTERFACE_ID = 1
          const DEBUG_ENDPOINT_ID = 2
          class WebUsbPlugin {
            constructor() {
              this.allowsWriteAndEnumerate = true
              this.configurationId = CONFIGURATION_ID
              this.debug = false
              this.debugEndpointId = DEBUG_ENDPOINT_ID
              this.debugInterfaceId = DEBUG_INTERFACE_ID
              this.name = 'WebUsbPlugin'
              this.normalEndpointId = ENDPOINT_ID
              this.normalInterfaceId = INTERFACE_ID
              this.requestNeeded = true
              this.unreadableHidDevice = false
              this.unreadableHidDeviceChange = new events_1.EventEmitter()
              this.version = ''
              this._lastDevices = []
            }
            init(debug) {
              this.debug = !!debug
              const {usb} = navigator
              if (!usb) {
                throw new Error('WebUSB is not available on this browser.')
              } else {
                this.usb = usb
              }
            }
            _deviceHasDebugLink(device) {
              try {
                const iface =
                  device.configurations[0].interfaces[DEBUG_INTERFACE_ID]
                    .alternates[0]
                return (
                  iface.interfaceClass === 255 &&
                  iface.endpoints[0].endpointNumber === DEBUG_ENDPOINT_ID
                )
              } catch (e) {
                return false
              }
            }
            _deviceIsHid(device) {
              return device.vendorId === T1HID_VENDOR
            }
            _listDevices() {
              return __awaiter(this, void 0, void 0, function* () {
                let bootloaderId = 0
                const devices = yield this.usb.getDevices()
                const trezorDevices = devices.filter(dev => {
                  const isTrezor = constants_1.TREZOR_DESCS.some(
                    desc =>
                      dev.vendorId === desc.vendorId &&
                      dev.productId === desc.productId
                  )
                  return isTrezor
                })
                const hidDevices = trezorDevices.filter(dev =>
                  this._deviceIsHid(dev)
                )
                const nonHidDevices = trezorDevices.filter(
                  dev => !this._deviceIsHid(dev)
                )
                this._lastDevices = nonHidDevices.map(device => {
                  const {serialNumber} = device
                  let path =
                    serialNumber == null || serialNumber === ''
                      ? 'bootloader'
                      : serialNumber
                  if (path === 'bootloader') {
                    bootloaderId++
                    path += bootloaderId
                  }
                  const debug = this._deviceHasDebugLink(device)
                  return {path, device, debug}
                })
                const oldUnreadableHidDevice = this.unreadableHidDevice
                this.unreadableHidDevice = hidDevices.length > 0
                if (oldUnreadableHidDevice !== this.unreadableHidDevice) {
                  this.unreadableHidDeviceChange.emit('change')
                }
                return this._lastDevices
              })
            }
            enumerate() {
              return __awaiter(this, void 0, void 0, function* () {
                return (yield this._listDevices()).map(info => ({
                  path: info.path,
                  debug: info.debug
                }))
              })
            }
            _findDevice(path) {
              const deviceO = this._lastDevices.find(d => d.path === path)
              if (deviceO == null) {
                throw new Error('Action was interrupted.')
              }
              return deviceO.device
            }
            send(path, data, debug) {
              return __awaiter(this, void 0, void 0, function* () {
                const device = yield this._findDevice(path)
                const newArray = new Uint8Array(64)
                newArray[0] = 63
                newArray.set(new Uint8Array(data), 1)
                if (!device.opened) {
                  yield this.connect(path, debug, false)
                }
                const endpoint = debug
                  ? this.debugEndpointId
                  : this.normalEndpointId
                return device.transferOut(endpoint, newArray).then(() => {})
              })
            }
            receive(path, debug) {
              return __awaiter(this, void 0, void 0, function* () {
                const device = yield this._findDevice(path)
                const endpoint = debug
                  ? this.debugEndpointId
                  : this.normalEndpointId
                try {
                  if (!device.opened) {
                    yield this.connect(path, debug, false)
                  }
                  const res = yield device.transferIn(endpoint, 64)
                  if (!res.data) {
                    throw new Error('no data')
                  }
                  if (res.data.byteLength === 0) {
                    return this.receive(path, debug)
                  }
                  return res.data.buffer.slice(1)
                } catch (e) {
                  if (e.message === 'Device unavailable.') {
                    throw new Error('Action was interrupted.')
                  } else {
                    throw e
                  }
                }
              })
            }
            connect(path, debug, first) {
              return __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < 5; i++) {
                  if (i > 0) {
                    yield new Promise(resolve =>
                      setTimeout(() => resolve(undefined), i * 200)
                    )
                  }
                  try {
                    return yield this._connectIn(path, debug, first)
                  } catch (e) {
                    if (i === 4) {
                      throw e
                    }
                  }
                }
              })
            }
            _connectIn(path, debug, first) {
              return __awaiter(this, void 0, void 0, function* () {
                const device = yield this._findDevice(path)
                yield device.open()
                if (first) {
                  yield device.selectConfiguration(this.configurationId)
                  try {
                    yield device.reset()
                  } catch (error) {}
                }
                const interfaceId = debug
                  ? this.debugInterfaceId
                  : this.normalInterfaceId
                yield device.claimInterface(interfaceId)
              })
            }
            disconnect(path, debug, last) {
              return __awaiter(this, void 0, void 0, function* () {
                const device = yield this._findDevice(path)
                const interfaceId = debug
                  ? this.debugInterfaceId
                  : this.normalInterfaceId
                yield device.releaseInterface(interfaceId)
                if (last) {
                  yield device.close()
                }
              })
            }
            requestDevice() {
              return __awaiter(this, void 0, void 0, function* () {
                yield this.usb.requestDevice({
                  filters: constants_1.TREZOR_DESCS
                })
              })
            }
          }
          exports.default = WebUsbPlugin
        },
        {'../constants': 104, events: 3}
      ],
      118: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          const defered_1 = require('../utils/defered')
          const messages_1 = require('./protobuf/messages')
          const send_1 = require('./send')
          const receive_1 = require('./receive')
          const sharedConnectionWorker_1 = require('./sharedConnectionWorker')
          const stringify = require('json-stable-stringify')
          function stableStringify(devices) {
            if (devices == null) {
              return 'null'
            }
            const pureDevices = devices.map(device => {
              const {path} = device
              const session = device.session == null ? null : device.session
              return {path, session}
            })
            return stringify(pureDevices)
          }
          function compare(a, b) {
            if (!Number.isNaN(parseInt(a.path, 10))) {
              return parseInt(a.path, 10) - parseInt(b.path, 10)
            }
            if (a.path < b.path) {
              return -1
            }
            return a.path > b.path ? 1 : 0
          }
          const ITER_MAX = 60
          const ITER_DELAY = 500
          class LowlevelTransportWithSharedConnections {
            constructor(plugin, sharedWorkerFactory) {
              this.configured = false
              this.debug = false
              this.deferedDebugOnRelease = {}
              this.deferedNormalOnRelease = {}
              this.defereds = {}
              this.isOutdated = false
              this.latestId = 0
              this.name = 'WebUsbTransport'
              this.requestNeeded = false
              this.sharedWorker = null
              this.stopped = false
              this._lastStringified = ''
              this.plugin = plugin
              this.version = plugin.version
              this._sharedWorkerFactory = sharedWorkerFactory
              if (!this.plugin.allowsWriteAndEnumerate) {
                throw new Error(
                  'Plugin with shared connections cannot disallow write and enumerate'
                )
              }
            }
            enumerate() {
              return this._silentEnumerate()
            }
            _silentEnumerate() {
              return __awaiter(this, void 0, void 0, function* () {
                yield this.sendToWorker({type: 'enumerate-intent'})
                let devices = []
                try {
                  devices = yield this.plugin.enumerate()
                } finally {
                  yield this.sendToWorker({type: 'enumerate-done'})
                }
                const sessionsM = yield this.sendToWorker({
                  type: 'get-sessions-and-disconnect',
                  devices
                })
                if (sessionsM.type !== 'sessions') {
                  throw new Error('Wrong reply')
                }
                const {debugSessions} = sessionsM
                const {normalSessions} = sessionsM
                const devicesWithSessions = devices.map(device => {
                  const session = normalSessions[device.path]
                  const debugSession = debugSessions[device.path]
                  return {
                    path: device.path,
                    session,
                    debug: device.debug,
                    debugSession
                  }
                })
                this._releaseDisconnected(devicesWithSessions)
                return devicesWithSessions.sort(compare)
              })
            }
            _releaseDisconnected(devices) {
              const connected = {}
              devices.forEach(device => {
                if (device.session != null) {
                  connected[device.session] = true
                }
              })
              Object.keys(this.deferedDebugOnRelease).forEach(session => {
                if (connected[session] == null) {
                  this._releaseCleanup(session, true)
                }
              })
              Object.keys(this.deferedNormalOnRelease).forEach(session => {
                if (connected[session] == null) {
                  this._releaseCleanup(session, false)
                }
              })
            }
            listen(old) {
              const oldStringified = stableStringify(old)
              const last = old == null ? this._lastStringified : oldStringified
              return this._runIter(0, last)
            }
            _runIter(iteration, oldStringified) {
              return __awaiter(this, void 0, void 0, function* () {
                const devices = yield this._silentEnumerate()
                const stringified = stableStringify(devices)
                if (stringified !== oldStringified || iteration === ITER_MAX) {
                  this._lastStringified = stringified
                  return devices
                }
                yield (0, defered_1.resolveTimeoutPromise)(ITER_DELAY, null)
                return this._runIter(iteration + 1, stringified)
              })
            }
            acquire(input, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                const messBack = yield this.sendToWorker({
                  type: 'acquire-intent',
                  path: input.path,
                  previous: input.previous,
                  debug: debugLink
                })
                if (messBack.type === 'wrong-previous-session') {
                  throw new Error('wrong previous session')
                }
                if (messBack.type !== 'other-session') {
                  throw new Error('Strange reply')
                }
                const reset = messBack.otherSession == null
                try {
                  yield this.plugin.connect(input.path, debugLink, reset)
                } catch (e) {
                  yield this.sendToWorker({type: 'acquire-failed'})
                  throw e
                }
                const messBack2 = yield this.sendToWorker({
                  type: 'acquire-done'
                })
                if (messBack2.type !== 'session-number') {
                  throw new Error('Strange reply.')
                }
                const session = messBack2.number
                if (debugLink) {
                  this.deferedDebugOnRelease[session] = (0, defered_1.create)()
                } else {
                  this.deferedNormalOnRelease[session] = (0, defered_1.create)()
                }
                return session
              })
            }
            release(session, onclose, debugLink) {
              return __awaiter(this, void 0, void 0, function* () {
                if (onclose && !debugLink) {
                  this.sendToWorker({type: 'release-onclose', session})
                  return
                }
                const messback = yield this.sendToWorker({
                  type: 'release-intent',
                  session,
                  debug: debugLink
                })
                if (messback.type === 'double-release') {
                  throw new Error('Trying to double release.')
                }
                if (messback.type !== 'path') {
                  throw new Error('Strange reply.')
                }
                const {path} = messback
                const {otherSession} = messback
                const last = otherSession == null
                this._releaseCleanup(session, debugLink)
                try {
                  yield this.plugin.disconnect(path, debugLink, last)
                } catch (e) {}
                yield this.sendToWorker({type: 'release-done'})
              })
            }
            _releaseCleanup(session, debugLink) {
              const table = debugLink
                ? this.deferedDebugOnRelease
                : this.deferedNormalOnRelease
              if (table[session] != null) {
                table[session].reject(
                  new Error('Device released or disconnected')
                )
                delete table[session]
              }
            }
            configure(signedData) {
              const messages = (0, messages_1.parseConfigure)(signedData)
              this._messages = messages
              this.configured = true
            }
            _sendLowlevel(path, debug) {
              return data => this.plugin.send(path, data, debug)
            }
            _receiveLowlevel(path, debug) {
              return () => this.plugin.receive(path, debug)
            }
            messages() {
              if (this._messages == null) {
                throw new Error('Transport not configured.')
              }
              return this._messages
            }
            doWithSession(session, debugLink, inside) {
              return __awaiter(this, void 0, void 0, function* () {
                const sessionsM = yield this.sendToWorker({
                  type: 'get-sessions'
                })
                if (sessionsM.type !== 'sessions') {
                  throw new Error('Wrong reply')
                }
                const sessionsMM = debugLink
                  ? sessionsM.debugSessions
                  : sessionsM.normalSessions
                let path_ = null
                Object.keys(sessionsMM).forEach(kpath => {
                  if (sessionsMM[kpath] === session) {
                    path_ = kpath
                  }
                })
                if (path_ == null) {
                  throw new Error('Session not available.')
                }
                const path = path_
                const resPromise = yield inside(path)
                const defered = debugLink
                  ? this.deferedDebugOnRelease[session]
                  : this.deferedNormalOnRelease[session]
                return Promise.race([defered.rejectingPromise, resPromise])
              })
            }
            call(session, name, data, debugLink) {
              const callInside = path =>
                __awaiter(this, void 0, void 0, function* () {
                  const messages = this.messages()
                  yield (0,
                  send_1.buildAndSend)(messages, this._sendLowlevel(path, debugLink), name, data)
                  const message = yield (0, receive_1.receiveAndParse)(
                    messages,
                    this._receiveLowlevel(path, debugLink)
                  )
                  return message
                })
              return this.doWithSession(session, debugLink, callInside)
            }
            post(session, name, data, debugLink) {
              const callInside = path =>
                __awaiter(this, void 0, void 0, function* () {
                  const messages = this.messages()
                  yield (0,
                  send_1.buildAndSend)(messages, this._sendLowlevel(path, debugLink), name, data)
                })
              return this.doWithSession(session, debugLink, callInside)
            }
            read(session, debugLink) {
              const callInside = path =>
                __awaiter(this, void 0, void 0, function* () {
                  const messages = this.messages()
                  const message = yield (0, receive_1.receiveAndParse)(
                    messages,
                    this._receiveLowlevel(path, debugLink)
                  )
                  return message
                })
              return this.doWithSession(session, debugLink, callInside)
            }
            init(debug) {
              return __awaiter(this, void 0, void 0, function* () {
                this.debug = !!debug
                this.requestNeeded = this.plugin.requestNeeded
                yield this.plugin.init(debug)
                if (this._sharedWorkerFactory != null) {
                  this.sharedWorker = this._sharedWorkerFactory()
                  if (this.sharedWorker != null) {
                    this.sharedWorker.port.onmessage = e => {
                      this.receiveFromWorker(e.data)
                    }
                  }
                }
              })
            }
            requestDevice() {
              return this.plugin.requestDevice()
            }
            sendToWorker(message) {
              if (this.stopped) {
                return Promise.reject('Transport stopped.')
              }
              this.latestId++
              const id = this.latestId
              this.defereds[id] = (0, defered_1.create)()
              if (this.sharedWorker != null) {
                this.sharedWorker.port.postMessage({id, message})
              } else {
                ;(0, sharedConnectionWorker_1.postModuleMessage)(
                  {id, message},
                  m => this.receiveFromWorker(m)
                )
              }
              return this.defereds[id].promise
            }
            receiveFromWorker(m) {
              this.defereds[m.id].resolve(m.message)
              delete this.defereds[m.id]
            }
            stop() {
              this.stopped = true
              this.sharedWorker = null
            }
          }
          exports.default = LowlevelTransportWithSharedConnections
        },
        {
          '../utils/defered': 121,
          './protobuf/messages': 110,
          './receive': 114,
          './send': 115,
          './sharedConnectionWorker': 116,
          'json-stable-stringify': 18
        }
      ],
      119: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __setModuleDefault =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (o, v) {
                  Object.defineProperty(o, 'default', {
                    enumerable: true,
                    value: v
                  })
                }
              : function (o, v) {
                  o['default'] = v
                })
          var __importStar =
            (this && this.__importStar) ||
            function (mod) {
              if (mod && mod.__esModule) return mod
              var result = {}
              if (mod != null)
                for (var k in mod)
                  if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                  )
                    __createBinding(result, mod, k)
              __setModuleDefault(result, mod)
              return result
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.Messages = void 0
          exports.Messages = __importStar(require('./messages'))
        },
        {'./messages': 120}
      ],
      120: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.TezosBallotType =
            exports.TezosContractType =
            exports.StellarSignerType =
            exports.StellarMemoType =
            exports.StellarAssetType =
            exports.NEMImportanceTransferMode =
            exports.NEMModificationType =
            exports.NEMSupplyChangeType =
            exports.NEMMosaicLevy =
            exports.MoneroNetworkType =
            exports.Enum_WordRequestType =
            exports.RecoveryDeviceType =
            exports.SdProtectOperationType =
            exports.Enum_Capability =
            exports.Enum_HomescreenFormat =
            exports.Enum_SafetyCheckLevel =
            exports.Enum_BackupType =
            exports.EthereumDataType =
            exports.EthereumDefinitionType =
            exports.DebugButton =
            exports.Enum_PinMatrixRequestType =
            exports.Enum_ButtonRequestType =
            exports.FailureType =
            exports.CardanoTxWitnessType =
            exports.CardanoTxSigningMode =
            exports.CardanoCVoteRegistrationFormat =
            exports.CardanoTxAuxiliaryDataSupplementType =
            exports.CardanoPoolRelayType =
            exports.CardanoCertificateType =
            exports.CardanoTxOutputSerializationFormat =
            exports.CardanoNativeScriptHashDisplayFormat =
            exports.CardanoNativeScriptType =
            exports.CardanoAddressType =
            exports.CardanoDerivationType =
            exports.Enum_RequestType =
            exports.AmountUnit =
            exports.DecredStakingSpendType =
            exports.Enum_OutputScriptType =
            exports.Enum_InputScriptType =
            exports.BinanceTimeInForce =
            exports.BinanceOrderSide =
            exports.BinanceOrderType =
              void 0
          var BinanceOrderType
          ;(function (BinanceOrderType) {
            BinanceOrderType[(BinanceOrderType['OT_UNKNOWN'] = 0)] =
              'OT_UNKNOWN'
            BinanceOrderType[(BinanceOrderType['MARKET'] = 1)] = 'MARKET'
            BinanceOrderType[(BinanceOrderType['LIMIT'] = 2)] = 'LIMIT'
            BinanceOrderType[(BinanceOrderType['OT_RESERVED'] = 3)] =
              'OT_RESERVED'
          })(
            (BinanceOrderType =
              exports.BinanceOrderType || (exports.BinanceOrderType = {}))
          )
          var BinanceOrderSide
          ;(function (BinanceOrderSide) {
            BinanceOrderSide[(BinanceOrderSide['SIDE_UNKNOWN'] = 0)] =
              'SIDE_UNKNOWN'
            BinanceOrderSide[(BinanceOrderSide['BUY'] = 1)] = 'BUY'
            BinanceOrderSide[(BinanceOrderSide['SELL'] = 2)] = 'SELL'
          })(
            (BinanceOrderSide =
              exports.BinanceOrderSide || (exports.BinanceOrderSide = {}))
          )
          var BinanceTimeInForce
          ;(function (BinanceTimeInForce) {
            BinanceTimeInForce[(BinanceTimeInForce['TIF_UNKNOWN'] = 0)] =
              'TIF_UNKNOWN'
            BinanceTimeInForce[(BinanceTimeInForce['GTE'] = 1)] = 'GTE'
            BinanceTimeInForce[(BinanceTimeInForce['TIF_RESERVED'] = 2)] =
              'TIF_RESERVED'
            BinanceTimeInForce[(BinanceTimeInForce['IOC'] = 3)] = 'IOC'
          })(
            (BinanceTimeInForce =
              exports.BinanceTimeInForce || (exports.BinanceTimeInForce = {}))
          )
          var Enum_InputScriptType
          ;(function (Enum_InputScriptType) {
            Enum_InputScriptType[(Enum_InputScriptType['SPENDADDRESS'] = 0)] =
              'SPENDADDRESS'
            Enum_InputScriptType[(Enum_InputScriptType['SPENDMULTISIG'] = 1)] =
              'SPENDMULTISIG'
            Enum_InputScriptType[(Enum_InputScriptType['EXTERNAL'] = 2)] =
              'EXTERNAL'
            Enum_InputScriptType[(Enum_InputScriptType['SPENDWITNESS'] = 3)] =
              'SPENDWITNESS'
            Enum_InputScriptType[
              (Enum_InputScriptType['SPENDP2SHWITNESS'] = 4)
            ] = 'SPENDP2SHWITNESS'
            Enum_InputScriptType[(Enum_InputScriptType['SPENDTAPROOT'] = 5)] =
              'SPENDTAPROOT'
          })(
            (Enum_InputScriptType =
              exports.Enum_InputScriptType ||
              (exports.Enum_InputScriptType = {}))
          )
          var Enum_OutputScriptType
          ;(function (Enum_OutputScriptType) {
            Enum_OutputScriptType[(Enum_OutputScriptType['PAYTOADDRESS'] = 0)] =
              'PAYTOADDRESS'
            Enum_OutputScriptType[
              (Enum_OutputScriptType['PAYTOSCRIPTHASH'] = 1)
            ] = 'PAYTOSCRIPTHASH'
            Enum_OutputScriptType[
              (Enum_OutputScriptType['PAYTOMULTISIG'] = 2)
            ] = 'PAYTOMULTISIG'
            Enum_OutputScriptType[
              (Enum_OutputScriptType['PAYTOOPRETURN'] = 3)
            ] = 'PAYTOOPRETURN'
            Enum_OutputScriptType[(Enum_OutputScriptType['PAYTOWITNESS'] = 4)] =
              'PAYTOWITNESS'
            Enum_OutputScriptType[
              (Enum_OutputScriptType['PAYTOP2SHWITNESS'] = 5)
            ] = 'PAYTOP2SHWITNESS'
            Enum_OutputScriptType[(Enum_OutputScriptType['PAYTOTAPROOT'] = 6)] =
              'PAYTOTAPROOT'
          })(
            (Enum_OutputScriptType =
              exports.Enum_OutputScriptType ||
              (exports.Enum_OutputScriptType = {}))
          )
          var DecredStakingSpendType
          ;(function (DecredStakingSpendType) {
            DecredStakingSpendType[(DecredStakingSpendType['SSGen'] = 0)] =
              'SSGen'
            DecredStakingSpendType[(DecredStakingSpendType['SSRTX'] = 1)] =
              'SSRTX'
          })(
            (DecredStakingSpendType =
              exports.DecredStakingSpendType ||
              (exports.DecredStakingSpendType = {}))
          )
          var AmountUnit
          ;(function (AmountUnit) {
            AmountUnit[(AmountUnit['BITCOIN'] = 0)] = 'BITCOIN'
            AmountUnit[(AmountUnit['MILLIBITCOIN'] = 1)] = 'MILLIBITCOIN'
            AmountUnit[(AmountUnit['MICROBITCOIN'] = 2)] = 'MICROBITCOIN'
            AmountUnit[(AmountUnit['SATOSHI'] = 3)] = 'SATOSHI'
          })((AmountUnit = exports.AmountUnit || (exports.AmountUnit = {})))
          var Enum_RequestType
          ;(function (Enum_RequestType) {
            Enum_RequestType[(Enum_RequestType['TXINPUT'] = 0)] = 'TXINPUT'
            Enum_RequestType[(Enum_RequestType['TXOUTPUT'] = 1)] = 'TXOUTPUT'
            Enum_RequestType[(Enum_RequestType['TXMETA'] = 2)] = 'TXMETA'
            Enum_RequestType[(Enum_RequestType['TXFINISHED'] = 3)] =
              'TXFINISHED'
            Enum_RequestType[(Enum_RequestType['TXEXTRADATA'] = 4)] =
              'TXEXTRADATA'
            Enum_RequestType[(Enum_RequestType['TXORIGINPUT'] = 5)] =
              'TXORIGINPUT'
            Enum_RequestType[(Enum_RequestType['TXORIGOUTPUT'] = 6)] =
              'TXORIGOUTPUT'
            Enum_RequestType[(Enum_RequestType['TXPAYMENTREQ'] = 7)] =
              'TXPAYMENTREQ'
          })(
            (Enum_RequestType =
              exports.Enum_RequestType || (exports.Enum_RequestType = {}))
          )
          var CardanoDerivationType
          ;(function (CardanoDerivationType) {
            CardanoDerivationType[(CardanoDerivationType['LEDGER'] = 0)] =
              'LEDGER'
            CardanoDerivationType[(CardanoDerivationType['ICARUS'] = 1)] =
              'ICARUS'
            CardanoDerivationType[
              (CardanoDerivationType['ICARUS_TREZOR'] = 2)
            ] = 'ICARUS_TREZOR'
          })(
            (CardanoDerivationType =
              exports.CardanoDerivationType ||
              (exports.CardanoDerivationType = {}))
          )
          var CardanoAddressType
          ;(function (CardanoAddressType) {
            CardanoAddressType[(CardanoAddressType['BASE'] = 0)] = 'BASE'
            CardanoAddressType[(CardanoAddressType['BASE_SCRIPT_KEY'] = 1)] =
              'BASE_SCRIPT_KEY'
            CardanoAddressType[(CardanoAddressType['BASE_KEY_SCRIPT'] = 2)] =
              'BASE_KEY_SCRIPT'
            CardanoAddressType[(CardanoAddressType['BASE_SCRIPT_SCRIPT'] = 3)] =
              'BASE_SCRIPT_SCRIPT'
            CardanoAddressType[(CardanoAddressType['POINTER'] = 4)] = 'POINTER'
            CardanoAddressType[(CardanoAddressType['POINTER_SCRIPT'] = 5)] =
              'POINTER_SCRIPT'
            CardanoAddressType[(CardanoAddressType['ENTERPRISE'] = 6)] =
              'ENTERPRISE'
            CardanoAddressType[(CardanoAddressType['ENTERPRISE_SCRIPT'] = 7)] =
              'ENTERPRISE_SCRIPT'
            CardanoAddressType[(CardanoAddressType['BYRON'] = 8)] = 'BYRON'
            CardanoAddressType[(CardanoAddressType['REWARD'] = 14)] = 'REWARD'
            CardanoAddressType[(CardanoAddressType['REWARD_SCRIPT'] = 15)] =
              'REWARD_SCRIPT'
          })(
            (CardanoAddressType =
              exports.CardanoAddressType || (exports.CardanoAddressType = {}))
          )
          var CardanoNativeScriptType
          ;(function (CardanoNativeScriptType) {
            CardanoNativeScriptType[(CardanoNativeScriptType['PUB_KEY'] = 0)] =
              'PUB_KEY'
            CardanoNativeScriptType[(CardanoNativeScriptType['ALL'] = 1)] =
              'ALL'
            CardanoNativeScriptType[(CardanoNativeScriptType['ANY'] = 2)] =
              'ANY'
            CardanoNativeScriptType[(CardanoNativeScriptType['N_OF_K'] = 3)] =
              'N_OF_K'
            CardanoNativeScriptType[
              (CardanoNativeScriptType['INVALID_BEFORE'] = 4)
            ] = 'INVALID_BEFORE'
            CardanoNativeScriptType[
              (CardanoNativeScriptType['INVALID_HEREAFTER'] = 5)
            ] = 'INVALID_HEREAFTER'
          })(
            (CardanoNativeScriptType =
              exports.CardanoNativeScriptType ||
              (exports.CardanoNativeScriptType = {}))
          )
          var CardanoNativeScriptHashDisplayFormat
          ;(function (CardanoNativeScriptHashDisplayFormat) {
            CardanoNativeScriptHashDisplayFormat[
              (CardanoNativeScriptHashDisplayFormat['HIDE'] = 0)
            ] = 'HIDE'
            CardanoNativeScriptHashDisplayFormat[
              (CardanoNativeScriptHashDisplayFormat['BECH32'] = 1)
            ] = 'BECH32'
            CardanoNativeScriptHashDisplayFormat[
              (CardanoNativeScriptHashDisplayFormat['POLICY_ID'] = 2)
            ] = 'POLICY_ID'
          })(
            (CardanoNativeScriptHashDisplayFormat =
              exports.CardanoNativeScriptHashDisplayFormat ||
              (exports.CardanoNativeScriptHashDisplayFormat = {}))
          )
          var CardanoTxOutputSerializationFormat
          ;(function (CardanoTxOutputSerializationFormat) {
            CardanoTxOutputSerializationFormat[
              (CardanoTxOutputSerializationFormat['ARRAY_LEGACY'] = 0)
            ] = 'ARRAY_LEGACY'
            CardanoTxOutputSerializationFormat[
              (CardanoTxOutputSerializationFormat['MAP_BABBAGE'] = 1)
            ] = 'MAP_BABBAGE'
          })(
            (CardanoTxOutputSerializationFormat =
              exports.CardanoTxOutputSerializationFormat ||
              (exports.CardanoTxOutputSerializationFormat = {}))
          )
          var CardanoCertificateType
          ;(function (CardanoCertificateType) {
            CardanoCertificateType[
              (CardanoCertificateType['STAKE_REGISTRATION'] = 0)
            ] = 'STAKE_REGISTRATION'
            CardanoCertificateType[
              (CardanoCertificateType['STAKE_DEREGISTRATION'] = 1)
            ] = 'STAKE_DEREGISTRATION'
            CardanoCertificateType[
              (CardanoCertificateType['STAKE_DELEGATION'] = 2)
            ] = 'STAKE_DELEGATION'
            CardanoCertificateType[
              (CardanoCertificateType['STAKE_POOL_REGISTRATION'] = 3)
            ] = 'STAKE_POOL_REGISTRATION'
          })(
            (CardanoCertificateType =
              exports.CardanoCertificateType ||
              (exports.CardanoCertificateType = {}))
          )
          var CardanoPoolRelayType
          ;(function (CardanoPoolRelayType) {
            CardanoPoolRelayType[(CardanoPoolRelayType['SINGLE_HOST_IP'] = 0)] =
              'SINGLE_HOST_IP'
            CardanoPoolRelayType[
              (CardanoPoolRelayType['SINGLE_HOST_NAME'] = 1)
            ] = 'SINGLE_HOST_NAME'
            CardanoPoolRelayType[
              (CardanoPoolRelayType['MULTIPLE_HOST_NAME'] = 2)
            ] = 'MULTIPLE_HOST_NAME'
          })(
            (CardanoPoolRelayType =
              exports.CardanoPoolRelayType ||
              (exports.CardanoPoolRelayType = {}))
          )
          var CardanoTxAuxiliaryDataSupplementType
          ;(function (CardanoTxAuxiliaryDataSupplementType) {
            CardanoTxAuxiliaryDataSupplementType[
              (CardanoTxAuxiliaryDataSupplementType['NONE'] = 0)
            ] = 'NONE'
            CardanoTxAuxiliaryDataSupplementType[
              (CardanoTxAuxiliaryDataSupplementType[
                'CVOTE_REGISTRATION_SIGNATURE'
              ] = 1)
            ] = 'CVOTE_REGISTRATION_SIGNATURE'
          })(
            (CardanoTxAuxiliaryDataSupplementType =
              exports.CardanoTxAuxiliaryDataSupplementType ||
              (exports.CardanoTxAuxiliaryDataSupplementType = {}))
          )
          var CardanoCVoteRegistrationFormat
          ;(function (CardanoCVoteRegistrationFormat) {
            CardanoCVoteRegistrationFormat[
              (CardanoCVoteRegistrationFormat['CIP15'] = 0)
            ] = 'CIP15'
            CardanoCVoteRegistrationFormat[
              (CardanoCVoteRegistrationFormat['CIP36'] = 1)
            ] = 'CIP36'
          })(
            (CardanoCVoteRegistrationFormat =
              exports.CardanoCVoteRegistrationFormat ||
              (exports.CardanoCVoteRegistrationFormat = {}))
          )
          var CardanoTxSigningMode
          ;(function (CardanoTxSigningMode) {
            CardanoTxSigningMode[
              (CardanoTxSigningMode['ORDINARY_TRANSACTION'] = 0)
            ] = 'ORDINARY_TRANSACTION'
            CardanoTxSigningMode[
              (CardanoTxSigningMode['POOL_REGISTRATION_AS_OWNER'] = 1)
            ] = 'POOL_REGISTRATION_AS_OWNER'
            CardanoTxSigningMode[
              (CardanoTxSigningMode['MULTISIG_TRANSACTION'] = 2)
            ] = 'MULTISIG_TRANSACTION'
            CardanoTxSigningMode[
              (CardanoTxSigningMode['PLUTUS_TRANSACTION'] = 3)
            ] = 'PLUTUS_TRANSACTION'
          })(
            (CardanoTxSigningMode =
              exports.CardanoTxSigningMode ||
              (exports.CardanoTxSigningMode = {}))
          )
          var CardanoTxWitnessType
          ;(function (CardanoTxWitnessType) {
            CardanoTxWitnessType[(CardanoTxWitnessType['BYRON_WITNESS'] = 0)] =
              'BYRON_WITNESS'
            CardanoTxWitnessType[
              (CardanoTxWitnessType['SHELLEY_WITNESS'] = 1)
            ] = 'SHELLEY_WITNESS'
          })(
            (CardanoTxWitnessType =
              exports.CardanoTxWitnessType ||
              (exports.CardanoTxWitnessType = {}))
          )
          var FailureType
          ;(function (FailureType) {
            FailureType[(FailureType['Failure_UnexpectedMessage'] = 1)] =
              'Failure_UnexpectedMessage'
            FailureType[(FailureType['Failure_ButtonExpected'] = 2)] =
              'Failure_ButtonExpected'
            FailureType[(FailureType['Failure_DataError'] = 3)] =
              'Failure_DataError'
            FailureType[(FailureType['Failure_ActionCancelled'] = 4)] =
              'Failure_ActionCancelled'
            FailureType[(FailureType['Failure_PinExpected'] = 5)] =
              'Failure_PinExpected'
            FailureType[(FailureType['Failure_PinCancelled'] = 6)] =
              'Failure_PinCancelled'
            FailureType[(FailureType['Failure_PinInvalid'] = 7)] =
              'Failure_PinInvalid'
            FailureType[(FailureType['Failure_InvalidSignature'] = 8)] =
              'Failure_InvalidSignature'
            FailureType[(FailureType['Failure_ProcessError'] = 9)] =
              'Failure_ProcessError'
            FailureType[(FailureType['Failure_NotEnoughFunds'] = 10)] =
              'Failure_NotEnoughFunds'
            FailureType[(FailureType['Failure_NotInitialized'] = 11)] =
              'Failure_NotInitialized'
            FailureType[(FailureType['Failure_PinMismatch'] = 12)] =
              'Failure_PinMismatch'
            FailureType[(FailureType['Failure_WipeCodeMismatch'] = 13)] =
              'Failure_WipeCodeMismatch'
            FailureType[(FailureType['Failure_InvalidSession'] = 14)] =
              'Failure_InvalidSession'
            FailureType[(FailureType['Failure_FirmwareError'] = 99)] =
              'Failure_FirmwareError'
          })((FailureType = exports.FailureType || (exports.FailureType = {})))
          var Enum_ButtonRequestType
          ;(function (Enum_ButtonRequestType) {
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_Other'] = 1)
            ] = 'ButtonRequest_Other'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_FeeOverThreshold'] = 2)
            ] = 'ButtonRequest_FeeOverThreshold'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_ConfirmOutput'] = 3)
            ] = 'ButtonRequest_ConfirmOutput'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_ResetDevice'] = 4)
            ] = 'ButtonRequest_ResetDevice'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_ConfirmWord'] = 5)
            ] = 'ButtonRequest_ConfirmWord'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_WipeDevice'] = 6)
            ] = 'ButtonRequest_WipeDevice'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_ProtectCall'] = 7)
            ] = 'ButtonRequest_ProtectCall'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_SignTx'] = 8)
            ] = 'ButtonRequest_SignTx'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_FirmwareCheck'] = 9)
            ] = 'ButtonRequest_FirmwareCheck'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_Address'] = 10)
            ] = 'ButtonRequest_Address'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_PublicKey'] = 11)
            ] = 'ButtonRequest_PublicKey'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_MnemonicWordCount'] = 12)
            ] = 'ButtonRequest_MnemonicWordCount'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_MnemonicInput'] = 13)
            ] = 'ButtonRequest_MnemonicInput'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType[
                '_Deprecated_ButtonRequest_PassphraseType'
              ] = 14)
            ] = '_Deprecated_ButtonRequest_PassphraseType'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType[
                'ButtonRequest_UnknownDerivationPath'
              ] = 15)
            ] = 'ButtonRequest_UnknownDerivationPath'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_RecoveryHomepage'] = 16)
            ] = 'ButtonRequest_RecoveryHomepage'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_Success'] = 17)
            ] = 'ButtonRequest_Success'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_Warning'] = 18)
            ] = 'ButtonRequest_Warning'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_PassphraseEntry'] = 19)
            ] = 'ButtonRequest_PassphraseEntry'
            Enum_ButtonRequestType[
              (Enum_ButtonRequestType['ButtonRequest_PinEntry'] = 20)
            ] = 'ButtonRequest_PinEntry'
          })(
            (Enum_ButtonRequestType =
              exports.Enum_ButtonRequestType ||
              (exports.Enum_ButtonRequestType = {}))
          )
          var Enum_PinMatrixRequestType
          ;(function (Enum_PinMatrixRequestType) {
            Enum_PinMatrixRequestType[
              (Enum_PinMatrixRequestType['PinMatrixRequestType_Current'] = 1)
            ] = 'PinMatrixRequestType_Current'
            Enum_PinMatrixRequestType[
              (Enum_PinMatrixRequestType['PinMatrixRequestType_NewFirst'] = 2)
            ] = 'PinMatrixRequestType_NewFirst'
            Enum_PinMatrixRequestType[
              (Enum_PinMatrixRequestType['PinMatrixRequestType_NewSecond'] = 3)
            ] = 'PinMatrixRequestType_NewSecond'
            Enum_PinMatrixRequestType[
              (Enum_PinMatrixRequestType[
                'PinMatrixRequestType_WipeCodeFirst'
              ] = 4)
            ] = 'PinMatrixRequestType_WipeCodeFirst'
            Enum_PinMatrixRequestType[
              (Enum_PinMatrixRequestType[
                'PinMatrixRequestType_WipeCodeSecond'
              ] = 5)
            ] = 'PinMatrixRequestType_WipeCodeSecond'
          })(
            (Enum_PinMatrixRequestType =
              exports.Enum_PinMatrixRequestType ||
              (exports.Enum_PinMatrixRequestType = {}))
          )
          var DebugButton
          ;(function (DebugButton) {
            DebugButton[(DebugButton['NO'] = 0)] = 'NO'
            DebugButton[(DebugButton['YES'] = 1)] = 'YES'
            DebugButton[(DebugButton['INFO'] = 2)] = 'INFO'
          })((DebugButton = exports.DebugButton || (exports.DebugButton = {})))
          var EthereumDefinitionType
          ;(function (EthereumDefinitionType) {
            EthereumDefinitionType[(EthereumDefinitionType['NETWORK'] = 0)] =
              'NETWORK'
            EthereumDefinitionType[(EthereumDefinitionType['TOKEN'] = 1)] =
              'TOKEN'
          })(
            (EthereumDefinitionType =
              exports.EthereumDefinitionType ||
              (exports.EthereumDefinitionType = {}))
          )
          var EthereumDataType
          ;(function (EthereumDataType) {
            EthereumDataType[(EthereumDataType['UINT'] = 1)] = 'UINT'
            EthereumDataType[(EthereumDataType['INT'] = 2)] = 'INT'
            EthereumDataType[(EthereumDataType['BYTES'] = 3)] = 'BYTES'
            EthereumDataType[(EthereumDataType['STRING'] = 4)] = 'STRING'
            EthereumDataType[(EthereumDataType['BOOL'] = 5)] = 'BOOL'
            EthereumDataType[(EthereumDataType['ADDRESS'] = 6)] = 'ADDRESS'
            EthereumDataType[(EthereumDataType['ARRAY'] = 7)] = 'ARRAY'
            EthereumDataType[(EthereumDataType['STRUCT'] = 8)] = 'STRUCT'
          })(
            (EthereumDataType =
              exports.EthereumDataType || (exports.EthereumDataType = {}))
          )
          var Enum_BackupType
          ;(function (Enum_BackupType) {
            Enum_BackupType[(Enum_BackupType['Bip39'] = 0)] = 'Bip39'
            Enum_BackupType[(Enum_BackupType['Slip39_Basic'] = 1)] =
              'Slip39_Basic'
            Enum_BackupType[(Enum_BackupType['Slip39_Advanced'] = 2)] =
              'Slip39_Advanced'
          })(
            (Enum_BackupType =
              exports.Enum_BackupType || (exports.Enum_BackupType = {}))
          )
          var Enum_SafetyCheckLevel
          ;(function (Enum_SafetyCheckLevel) {
            Enum_SafetyCheckLevel[(Enum_SafetyCheckLevel['Strict'] = 0)] =
              'Strict'
            Enum_SafetyCheckLevel[(Enum_SafetyCheckLevel['PromptAlways'] = 1)] =
              'PromptAlways'
            Enum_SafetyCheckLevel[
              (Enum_SafetyCheckLevel['PromptTemporarily'] = 2)
            ] = 'PromptTemporarily'
          })(
            (Enum_SafetyCheckLevel =
              exports.Enum_SafetyCheckLevel ||
              (exports.Enum_SafetyCheckLevel = {}))
          )
          var Enum_HomescreenFormat
          ;(function (Enum_HomescreenFormat) {
            Enum_HomescreenFormat[(Enum_HomescreenFormat['Toif144x144'] = 1)] =
              'Toif144x144'
            Enum_HomescreenFormat[(Enum_HomescreenFormat['Jpeg240x240'] = 2)] =
              'Jpeg240x240'
          })(
            (Enum_HomescreenFormat =
              exports.Enum_HomescreenFormat ||
              (exports.Enum_HomescreenFormat = {}))
          )
          var Enum_Capability
          ;(function (Enum_Capability) {
            Enum_Capability[(Enum_Capability['Capability_Bitcoin'] = 1)] =
              'Capability_Bitcoin'
            Enum_Capability[(Enum_Capability['Capability_Bitcoin_like'] = 2)] =
              'Capability_Bitcoin_like'
            Enum_Capability[(Enum_Capability['Capability_Binance'] = 3)] =
              'Capability_Binance'
            Enum_Capability[(Enum_Capability['Capability_Cardano'] = 4)] =
              'Capability_Cardano'
            Enum_Capability[(Enum_Capability['Capability_Crypto'] = 5)] =
              'Capability_Crypto'
            Enum_Capability[(Enum_Capability['Capability_EOS'] = 6)] =
              'Capability_EOS'
            Enum_Capability[(Enum_Capability['Capability_Ethereum'] = 7)] =
              'Capability_Ethereum'
            Enum_Capability[(Enum_Capability['Capability_Lisk'] = 8)] =
              'Capability_Lisk'
            Enum_Capability[(Enum_Capability['Capability_Monero'] = 9)] =
              'Capability_Monero'
            Enum_Capability[(Enum_Capability['Capability_NEM'] = 10)] =
              'Capability_NEM'
            Enum_Capability[(Enum_Capability['Capability_Ripple'] = 11)] =
              'Capability_Ripple'
            Enum_Capability[(Enum_Capability['Capability_Stellar'] = 12)] =
              'Capability_Stellar'
            Enum_Capability[(Enum_Capability['Capability_Tezos'] = 13)] =
              'Capability_Tezos'
            Enum_Capability[(Enum_Capability['Capability_U2F'] = 14)] =
              'Capability_U2F'
            Enum_Capability[(Enum_Capability['Capability_Shamir'] = 15)] =
              'Capability_Shamir'
            Enum_Capability[(Enum_Capability['Capability_ShamirGroups'] = 16)] =
              'Capability_ShamirGroups'
            Enum_Capability[
              (Enum_Capability['Capability_PassphraseEntry'] = 17)
            ] = 'Capability_PassphraseEntry'
          })(
            (Enum_Capability =
              exports.Enum_Capability || (exports.Enum_Capability = {}))
          )
          var SdProtectOperationType
          ;(function (SdProtectOperationType) {
            SdProtectOperationType[(SdProtectOperationType['DISABLE'] = 0)] =
              'DISABLE'
            SdProtectOperationType[(SdProtectOperationType['ENABLE'] = 1)] =
              'ENABLE'
            SdProtectOperationType[(SdProtectOperationType['REFRESH'] = 2)] =
              'REFRESH'
          })(
            (SdProtectOperationType =
              exports.SdProtectOperationType ||
              (exports.SdProtectOperationType = {}))
          )
          var RecoveryDeviceType
          ;(function (RecoveryDeviceType) {
            RecoveryDeviceType[
              (RecoveryDeviceType['RecoveryDeviceType_ScrambledWords'] = 0)
            ] = 'RecoveryDeviceType_ScrambledWords'
            RecoveryDeviceType[
              (RecoveryDeviceType['RecoveryDeviceType_Matrix'] = 1)
            ] = 'RecoveryDeviceType_Matrix'
          })(
            (RecoveryDeviceType =
              exports.RecoveryDeviceType || (exports.RecoveryDeviceType = {}))
          )
          var Enum_WordRequestType
          ;(function (Enum_WordRequestType) {
            Enum_WordRequestType[
              (Enum_WordRequestType['WordRequestType_Plain'] = 0)
            ] = 'WordRequestType_Plain'
            Enum_WordRequestType[
              (Enum_WordRequestType['WordRequestType_Matrix9'] = 1)
            ] = 'WordRequestType_Matrix9'
            Enum_WordRequestType[
              (Enum_WordRequestType['WordRequestType_Matrix6'] = 2)
            ] = 'WordRequestType_Matrix6'
          })(
            (Enum_WordRequestType =
              exports.Enum_WordRequestType ||
              (exports.Enum_WordRequestType = {}))
          )
          var MoneroNetworkType
          ;(function (MoneroNetworkType) {
            MoneroNetworkType[(MoneroNetworkType['MAINNET'] = 0)] = 'MAINNET'
            MoneroNetworkType[(MoneroNetworkType['TESTNET'] = 1)] = 'TESTNET'
            MoneroNetworkType[(MoneroNetworkType['STAGENET'] = 2)] = 'STAGENET'
            MoneroNetworkType[(MoneroNetworkType['FAKECHAIN'] = 3)] =
              'FAKECHAIN'
          })(
            (MoneroNetworkType =
              exports.MoneroNetworkType || (exports.MoneroNetworkType = {}))
          )
          var NEMMosaicLevy
          ;(function (NEMMosaicLevy) {
            NEMMosaicLevy[(NEMMosaicLevy['MosaicLevy_Absolute'] = 1)] =
              'MosaicLevy_Absolute'
            NEMMosaicLevy[(NEMMosaicLevy['MosaicLevy_Percentile'] = 2)] =
              'MosaicLevy_Percentile'
          })(
            (NEMMosaicLevy =
              exports.NEMMosaicLevy || (exports.NEMMosaicLevy = {}))
          )
          var NEMSupplyChangeType
          ;(function (NEMSupplyChangeType) {
            NEMSupplyChangeType[
              (NEMSupplyChangeType['SupplyChange_Increase'] = 1)
            ] = 'SupplyChange_Increase'
            NEMSupplyChangeType[
              (NEMSupplyChangeType['SupplyChange_Decrease'] = 2)
            ] = 'SupplyChange_Decrease'
          })(
            (NEMSupplyChangeType =
              exports.NEMSupplyChangeType || (exports.NEMSupplyChangeType = {}))
          )
          var NEMModificationType
          ;(function (NEMModificationType) {
            NEMModificationType[
              (NEMModificationType['CosignatoryModification_Add'] = 1)
            ] = 'CosignatoryModification_Add'
            NEMModificationType[
              (NEMModificationType['CosignatoryModification_Delete'] = 2)
            ] = 'CosignatoryModification_Delete'
          })(
            (NEMModificationType =
              exports.NEMModificationType || (exports.NEMModificationType = {}))
          )
          var NEMImportanceTransferMode
          ;(function (NEMImportanceTransferMode) {
            NEMImportanceTransferMode[
              (NEMImportanceTransferMode['ImportanceTransfer_Activate'] = 1)
            ] = 'ImportanceTransfer_Activate'
            NEMImportanceTransferMode[
              (NEMImportanceTransferMode['ImportanceTransfer_Deactivate'] = 2)
            ] = 'ImportanceTransfer_Deactivate'
          })(
            (NEMImportanceTransferMode =
              exports.NEMImportanceTransferMode ||
              (exports.NEMImportanceTransferMode = {}))
          )
          var StellarAssetType
          ;(function (StellarAssetType) {
            StellarAssetType[(StellarAssetType['NATIVE'] = 0)] = 'NATIVE'
            StellarAssetType[(StellarAssetType['ALPHANUM4'] = 1)] = 'ALPHANUM4'
            StellarAssetType[(StellarAssetType['ALPHANUM12'] = 2)] =
              'ALPHANUM12'
          })(
            (StellarAssetType =
              exports.StellarAssetType || (exports.StellarAssetType = {}))
          )
          var StellarMemoType
          ;(function (StellarMemoType) {
            StellarMemoType[(StellarMemoType['NONE'] = 0)] = 'NONE'
            StellarMemoType[(StellarMemoType['TEXT'] = 1)] = 'TEXT'
            StellarMemoType[(StellarMemoType['ID'] = 2)] = 'ID'
            StellarMemoType[(StellarMemoType['HASH'] = 3)] = 'HASH'
            StellarMemoType[(StellarMemoType['RETURN'] = 4)] = 'RETURN'
          })(
            (StellarMemoType =
              exports.StellarMemoType || (exports.StellarMemoType = {}))
          )
          var StellarSignerType
          ;(function (StellarSignerType) {
            StellarSignerType[(StellarSignerType['ACCOUNT'] = 0)] = 'ACCOUNT'
            StellarSignerType[(StellarSignerType['PRE_AUTH'] = 1)] = 'PRE_AUTH'
            StellarSignerType[(StellarSignerType['HASH'] = 2)] = 'HASH'
          })(
            (StellarSignerType =
              exports.StellarSignerType || (exports.StellarSignerType = {}))
          )
          var TezosContractType
          ;(function (TezosContractType) {
            TezosContractType[(TezosContractType['Implicit'] = 0)] = 'Implicit'
            TezosContractType[(TezosContractType['Originated'] = 1)] =
              'Originated'
          })(
            (TezosContractType =
              exports.TezosContractType || (exports.TezosContractType = {}))
          )
          var TezosBallotType
          ;(function (TezosBallotType) {
            TezosBallotType[(TezosBallotType['Yay'] = 0)] = 'Yay'
            TezosBallotType[(TezosBallotType['Nay'] = 1)] = 'Nay'
            TezosBallotType[(TezosBallotType['Pass'] = 2)] = 'Pass'
          })(
            (TezosBallotType =
              exports.TezosBallotType || (exports.TezosBallotType = {}))
          )
        },
        {}
      ],
      121: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.resolveTimeoutPromise = exports.create = void 0
          function create() {
            let localResolve = () => {}
            let localReject = () => {}
            const promise = new Promise((resolve, reject) => {
              localResolve = resolve
              localReject = reject
            })
            const rejectingPromise = promise.then(() => {
              throw new Error('Promise is always rejecting')
            })
            rejectingPromise.catch(() => {})
            return {
              resolve: localResolve,
              reject: localReject,
              promise,
              rejectingPromise
            }
          }
          exports.create = create
          function resolveTimeoutPromise(delay, result) {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(result)
              }, delay)
            })
          }
          exports.resolveTimeoutPromise = resolveTimeoutPromise
        },
        {}
      ],
      122: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.call =
            exports.acquire =
            exports.devices =
            exports.version =
            exports.info =
              void 0
          const ERROR = 'Wrong result type.'
          function info(res) {
            if (typeof res !== 'object' || res == null) {
              throw new Error('Wrong result type.')
            }
            const {version} = res
            if (typeof version !== 'string') {
              throw new Error(ERROR)
            }
            const configured = !!res.configured
            return {version, configured}
          }
          exports.info = info
          function version(version) {
            if (typeof version !== 'string') {
              throw new Error(ERROR)
            }
            return version.trim()
          }
          exports.version = version
          function convertSession(r) {
            if (r == null) {
              return null
            }
            if (typeof r !== 'string') {
              throw new Error(ERROR)
            }
            return r
          }
          function devices(res) {
            if (typeof res !== 'object') {
              throw new Error(ERROR)
            }
            if (!(res instanceof Array)) {
              throw new Error(ERROR)
            }
            return res.map(o => {
              if (typeof o !== 'object' || o == null) {
                throw new Error(ERROR)
              }
              const {path} = o
              if (typeof path !== 'string') {
                throw new Error(ERROR)
              }
              const pathS = path.toString()
              return {
                path: pathS,
                session: convertSession(o.session),
                debugSession: convertSession(o.debugSession),
                product: o.product,
                vendor: o.vendor,
                debug: !!o.debug
              }
            })
          }
          exports.devices = devices
          function acquire(res) {
            if (typeof res !== 'object' || res == null) {
              throw new Error(ERROR)
            }
            const {session} = res
            if (typeof session !== 'string' && typeof session !== 'number') {
              throw new Error(ERROR)
            }
            return session.toString()
          }
          exports.acquire = acquire
          function call(res) {
            if (typeof res !== 'object' || res == null) {
              throw new Error(ERROR)
            }
            const {type} = res
            if (typeof type !== 'string') {
              throw new Error(ERROR)
            }
            const {message} = res
            if (typeof message !== 'object' || message == null) {
              throw new Error(ERROR)
            }
            return {type, message}
          }
          exports.call = call
        },
        {}
      ],
      123: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.isPrimitiveField = void 0
          const primitiveTypes = [
            'bool',
            'string',
            'bytes',
            'int32',
            'int64',
            'uint32',
            'uint64',
            'sint32',
            'sint64',
            'fixed32',
            'fixed64',
            'sfixed32',
            'sfixed64',
            'double',
            'float'
          ]
          const isPrimitiveField = field => primitiveTypes.includes(field)
          exports.isPrimitiveField = isPrimitiveField
        },
        {}
      ],
      124: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.AbortablePromise = exports.AbortError = void 0
          class AbortError extends Error {
            constructor(message = 'Aborted') {
              super(message)
              this.name = 'AbortError'
            }
          }
          exports.AbortError = AbortError
          class AbortablePromise extends Promise {
            get abortReason() {
              return this._abortReason
            }
            constructor(executor, abortControllerParam) {
              const abortController =
                abortControllerParam || new AbortController()
              const abortSignal = abortController.signal
              const normalExecutor = (resolve, reject) => {
                abortSignal.addEventListener('abort', () => {
                  reject(new AbortError(this.abortReason))
                })
                executor(resolve, reject, abortSignal)
              }
              super(normalExecutor)
              this.abort = reason => {
                this._abortReason = reason || 'Aborted'
                abortController.abort()
              }
            }
          }
          exports.AbortablePromise = AbortablePromise
          AbortablePromise.from = promise => {
            if (promise instanceof AbortablePromise) {
              return promise
            }
            return new AbortablePromise((resolve, reject) => {
              promise.then(resolve).catch(reject)
            })
          }
        },
        {}
      ],
      125: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.arrayDistinct = void 0
          const arrayDistinct = (item, index, self) =>
            self.indexOf(item) === index
          exports.arrayDistinct = arrayDistinct
        },
        {}
      ],
      126: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.arrayPartition = void 0
          const arrayPartition = (array, condition) =>
            array.reduce(
              ([pass, fail], elem) =>
                condition(elem)
                  ? [[...pass, elem], fail]
                  : [pass, [...fail, elem]],
              [[], []]
            )
          exports.arrayPartition = arrayPartition
        },
        {}
      ],
      127: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.arrayShuffle = void 0
          const arrayShuffle = array => {
            const shuffled = array.slice()
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
          }
          exports.arrayShuffle = arrayShuffle
        },
        {}
      ],
      128: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.arrayToDictionary = void 0
          const validateKey = key => {
            if (['string', 'number'].includes(typeof key)) {
              return true
            }
            return false
          }
          const arrayToDictionary = (array, getKey, multiple) =>
            multiple
              ? array.reduce((prev, cur) => {
                  var _a
                  const key = getKey(cur)
                  if (validateKey(key)) {
                    return Object.assign(Object.assign({}, prev), {
                      [key]: [
                        ...((_a = prev[key]) !== null && _a !== void 0
                          ? _a
                          : []),
                        cur
                      ]
                    })
                  }
                  return prev
                }, {})
              : array.reduce((prev, cur) => {
                  const key = getKey(cur)
                  if (validateKey(key)) {
                    return Object.assign(Object.assign({}, prev), {[key]: cur})
                  }
                  return prev
                }, {})
          exports.arrayToDictionary = arrayToDictionary
        },
        {}
      ],
      129: [
        function (require, module, exports) {
          ;(function (Buffer) {
            ;(function () {
              'use strict'
              Object.defineProperty(exports, '__esModule', {value: true})
              exports.reverseBuffer = void 0
              const reverseBuffer = src => {
                if (src.length < 1) return src
                const buffer = Buffer.alloc(src.length)
                let j = buffer.length - 1
                for (let i = 0; i < buffer.length / 2; i++) {
                  buffer[i] = src[j]
                  buffer[j] = src[i]
                  j--
                }
                return buffer
              }
              exports.reverseBuffer = reverseBuffer
            }).call(this)
          }).call(this, require('buffer').Buffer)
        },
        {buffer: 2}
      ],
      130: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.bytesToHumanReadable = void 0
          const units = ['B', 'KB', 'MB', 'GB', 'TB']
          const bytesToHumanReadable = bytes => {
            let size = Math.abs(bytes)
            let i = 0
            while (size >= 1024 || i >= units.length) {
              size /= 1024
              i++
            }
            return `${size.toFixed(1)} ${units[i]}`
          }
          exports.bytesToHumanReadable = bytesToHumanReadable
        },
        {}
      ],
      131: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.capitalizeFirstLetter = void 0
          const capitalizeFirstLetter = s =>
            s.charAt(0).toUpperCase() + s.slice(1)
          exports.capitalizeFirstLetter = capitalizeFirstLetter
        },
        {}
      ],
      132: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.countBytesInString = void 0
          const countBytesInString = input =>
            encodeURI(input).split(/%..|./).length - 1
          exports.countBytesInString = countBytesInString
        },
        {}
      ],
      133: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createDeferred = void 0
          const createDeferred = id => {
            let localResolve = () => {}
            let localReject = () => {}
            const promise = new Promise((resolve, reject) => {
              localResolve = resolve
              localReject = reject
            })
            return {
              id,
              resolve: localResolve,
              reject: localReject,
              promise
            }
          }
          exports.createDeferred = createDeferred
        },
        {}
      ],
      134: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.createTimeoutPromise = void 0
          const createTimeoutPromise = timeout =>
            new Promise(resolve => setTimeout(resolve, timeout))
          exports.createTimeoutPromise = createTimeoutPromise
        },
        {}
      ],
      135: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.getValueByKey = exports.getKeyByValue = void 0
          function getKeyByValue(obj, value) {
            return obj && Object.keys(obj).find(x => obj[x] === value)
          }
          exports.getKeyByValue = getKeyByValue
          function getValueByKey(obj, enumKey) {
            const key = obj && Object.keys(obj).find(x => x === enumKey)
            return key && obj[key]
          }
          exports.getValueByKey = getValueByKey
        },
        {}
      ],
      136: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.getNumberFromPixelString = void 0
          const getNumberFromPixelString = size =>
            parseInt(size.replace('px', ''), 10)
          exports.getNumberFromPixelString = getNumberFromPixelString
        },
        {}
      ],
      137: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.getRandomNumberInRange = void 0
          const getRandomNumberInRange = (min, max) =>
            Math.floor(Math.random() * (max - min + 1)) + min
          exports.getRandomNumberInRange = getRandomNumberInRange
        },
        {}
      ],
      138: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.getWeakRandomId = void 0
          const getWeakRandomId = length => {
            let id = ''
            const list =
              'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            for (let i = 0; i < length; i++) {
              id += list.charAt(Math.floor(Math.random() * list.length))
            }
            return id
          }
          exports.getWeakRandomId = getWeakRandomId
        },
        {}
      ],
      139: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.hasUppercaseLetter = void 0
          const HAS_UPPERCASE_LATER_REGEXP = new RegExp('^(.*[A-Z].*)$')
          const hasUppercaseLetter = value =>
            HAS_UPPERCASE_LATER_REGEXP.test(value)
          exports.hasUppercaseLetter = hasUppercaseLetter
        },
        {}
      ],
      140: [
        function (require, module, exports) {
          'use strict'
          var __createBinding =
            (this && this.__createBinding) ||
            (Object.create
              ? function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  var desc = Object.getOwnPropertyDescriptor(m, k)
                  if (
                    !desc ||
                    ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
                  ) {
                    desc = {
                      enumerable: true,
                      get: function () {
                        return m[k]
                      }
                    }
                  }
                  Object.defineProperty(o, k2, desc)
                }
              : function (o, m, k, k2) {
                  if (k2 === undefined) k2 = k
                  o[k2] = m[k]
                })
          var __setModuleDefault =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (o, v) {
                  Object.defineProperty(o, 'default', {
                    enumerable: true,
                    value: v
                  })
                }
              : function (o, v) {
                  o['default'] = v
                })
          var __exportStar =
            (this && this.__exportStar) ||
            function (m, exports) {
              for (var p in m)
                if (
                  p !== 'default' &&
                  !Object.prototype.hasOwnProperty.call(exports, p)
                )
                  __createBinding(exports, m, p)
            }
          var __importStar =
            (this && this.__importStar) ||
            function (mod) {
              if (mod && mod.__esModule) return mod
              var result = {}
              if (mod != null)
                for (var k in mod)
                  if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                  )
                    __createBinding(result, mod, k)
              __setModuleDefault(result, mod)
              return result
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.xssFilters =
            exports.versionUtils =
            exports.enumUtils =
            exports.bufferUtils =
              void 0
          __exportStar(require('./abortablePromise'), exports)
          __exportStar(require('./arrayDistinct'), exports)
          __exportStar(require('./arrayPartition'), exports)
          __exportStar(require('./arrayShuffle'), exports)
          __exportStar(require('./arrayToDictionary'), exports)
          exports.bufferUtils = __importStar(require('./bufferUtils'))
          __exportStar(require('./bytesToHumanReadable'), exports)
          __exportStar(require('./capitalizeFirstLetter'), exports)
          __exportStar(require('./countBytesInString'), exports)
          __exportStar(require('./createDeferred'), exports)
          __exportStar(require('./createTimeoutPromise'), exports)
          exports.enumUtils = __importStar(require('./enumUtils'))
          __exportStar(require('./getNumberFromPixelString'), exports)
          __exportStar(require('./getRandomNumberInRange'), exports)
          __exportStar(require('./getWeakRandomId'), exports)
          __exportStar(require('./hasUppercaseLetter'), exports)
          __exportStar(require('./isAscii'), exports)
          __exportStar(require('./isHex'), exports)
          __exportStar(require('./isNotUndefined'), exports)
          __exportStar(require('./isUrl'), exports)
          __exportStar(require('./mergeDeepObject'), exports)
          __exportStar(require('./objectPartition'), exports)
          __exportStar(require('./parseHostname'), exports)
          __exportStar(require('./promiseAllSequence'), exports)
          __exportStar(require('./redactUserPath'), exports)
          __exportStar(require('./resolveStaticPath'), exports)
          __exportStar(require('./scheduleAction'), exports)
          __exportStar(require('./throwError'), exports)
          __exportStar(require('./truncateMiddle'), exports)
          __exportStar(require('./topologicalSort'), exports)
          exports.versionUtils = __importStar(require('./versionUtils'))
          exports.xssFilters = __importStar(require('./xssFilters'))
        },
        {
          './abortablePromise': 124,
          './arrayDistinct': 125,
          './arrayPartition': 126,
          './arrayShuffle': 127,
          './arrayToDictionary': 128,
          './bufferUtils': 129,
          './bytesToHumanReadable': 130,
          './capitalizeFirstLetter': 131,
          './countBytesInString': 132,
          './createDeferred': 133,
          './createTimeoutPromise': 134,
          './enumUtils': 135,
          './getNumberFromPixelString': 136,
          './getRandomNumberInRange': 137,
          './getWeakRandomId': 138,
          './hasUppercaseLetter': 139,
          './isAscii': 141,
          './isHex': 142,
          './isNotUndefined': 143,
          './isUrl': 144,
          './mergeDeepObject': 145,
          './objectPartition': 146,
          './parseHostname': 147,
          './promiseAllSequence': 148,
          './redactUserPath': 149,
          './resolveStaticPath': 150,
          './scheduleAction': 151,
          './throwError': 152,
          './topologicalSort': 153,
          './truncateMiddle': 154,
          './versionUtils': 155,
          './xssFilters': 156
        }
      ],
      141: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.isAscii = void 0
          function isAscii(value) {
            if (!value) return true
            return /^[\x00-\x7F]*$/.test(value)
          }
          exports.isAscii = isAscii
        },
        {}
      ],
      142: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.isHex = void 0
          const isHex = str => {
            const regExp = /^(0x|0X)?[0-9A-Fa-f]+$/g
            return regExp.test(str)
          }
          exports.isHex = isHex
        },
        {}
      ],
      143: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.isNotUndefined = void 0
          const isNotUndefined = item => typeof item !== 'undefined'
          exports.isNotUndefined = isNotUndefined
        },
        {}
      ],
      144: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.isUrl = void 0
          const URL_REGEXP =
            /^(http|ws)s?:\/\/[a-z0-9]([a-z0-9.-]+)?(:[0-9]{1,5})?((\/)?(([a-z0-9-_])+(\/)?)+)$/i
          const isUrl = value => URL_REGEXP.test(value)
          exports.isUrl = isUrl
        },
        {}
      ],
      145: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.mergeDeepObject = void 0
          const isObject = obj => {
            if (typeof obj === 'object' && obj !== null) {
              if (typeof Object.getPrototypeOf === 'function') {
                const prototype = Object.getPrototypeOf(obj)
                return prototype === Object.prototype || prototype === null
              }
              return Object.prototype.toString.call(obj) === '[object Object]'
            }
            return false
          }
          const mergeDeepObject = (...objects) =>
            objects.reduce((result, current) => {
              if (Array.isArray(current)) {
                throw new TypeError(
                  'Arguments provided to ts-deepmerge must be objects, not arrays.'
                )
              }
              Object.keys(current).forEach(key => {
                if (['__proto__', 'constructor', 'prototype'].includes(key)) {
                  return
                }
                if (Array.isArray(result[key]) && Array.isArray(current[key])) {
                  result[key] = exports.mergeDeepObject.options.mergeArrays
                    ? Array.from(new Set(result[key].concat(current[key])))
                    : current[key]
                } else if (isObject(result[key]) && isObject(current[key])) {
                  result[key] = (0, exports.mergeDeepObject)(
                    result[key],
                    current[key]
                  )
                } else {
                  result[key] = current[key]
                }
              })
              return result
            }, {})
          exports.mergeDeepObject = mergeDeepObject
          const defaultOptions = {
            mergeArrays: true
          }
          exports.mergeDeepObject.options = defaultOptions
          exports.mergeDeepObject.withOptions = (options, ...objects) => {
            exports.mergeDeepObject.options = Object.assign(
              {mergeArrays: true},
              options
            )
            const result = (0, exports.mergeDeepObject)(...objects)
            exports.mergeDeepObject.options = defaultOptions
            return result
          }
        },
        {}
      ],
      146: [
        function (require, module, exports) {
          'use strict'
          var __rest =
            (this && this.__rest) ||
            function (s, e) {
              var t = {}
              for (var p in s)
                if (
                  Object.prototype.hasOwnProperty.call(s, p) &&
                  e.indexOf(p) < 0
                )
                  t[p] = s[p]
              if (
                s != null &&
                typeof Object.getOwnPropertySymbols === 'function'
              )
                for (
                  var i = 0, p = Object.getOwnPropertySymbols(s);
                  i < p.length;
                  i++
                ) {
                  if (
                    e.indexOf(p[i]) < 0 &&
                    Object.prototype.propertyIsEnumerable.call(s, p[i])
                  )
                    t[p[i]] = s[p[i]]
                }
              return t
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.objectPartition = void 0
          const objectPartition = (obj, keys) =>
            keys.reduce(
              ([included, excluded], key) => {
                const _a = excluded,
                  _b = key,
                  value = _a[_b],
                  rest = __rest(_a, [typeof _b === 'symbol' ? _b : _b + ''])
                return typeof value !== 'undefined'
                  ? [
                      Object.assign(Object.assign({}, included), {
                        [key]: value
                      }),
                      rest
                    ]
                  : [included, excluded]
              },
              [{}, obj]
            )
          exports.objectPartition = objectPartition
        },
        {}
      ],
      147: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.parseHostname = void 0
          const HOSTNAME_REGEX =
            /^([a-z0-9.+-]+:\/\/)?([a-z0-9.-]+)([:/][^:/]+)*\/?$/i
          const parseHostname = url => {
            var _a, _b
            return (_b =
              (_a = url.match(HOSTNAME_REGEX)) === null || _a === void 0
                ? void 0
                : _a[2]) === null || _b === void 0
              ? void 0
              : _b.toLowerCase()
          }
          exports.parseHostname = parseHostname
        },
        {}
      ],
      148: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.promiseAllSequence = void 0
          const promiseAllSequence = actions =>
            __awaiter(void 0, void 0, void 0, function* () {
              const results = []
              yield actions.reduce(
                (promise, fn) =>
                  promise.then(fn).then(result => {
                    results.push(result)
                    return result
                  }),
                Promise.resolve()
              )
              return results
            })
          exports.promiseAllSequence = promiseAllSequence
        },
        {}
      ],
      149: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.redactUserPathFromString = exports.startOfUserPathRegex =
            void 0
          exports.startOfUserPathRegex =
            /([/\\][Uu]sers[/\\]{1,4})([^"^'^[^\]^/^\\]*)/g
          const redactUserPathFromString = text =>
            text.replace(exports.startOfUserPathRegex, '$1[*]')
          exports.redactUserPathFromString = redactUserPathFromString
        },
        {}
      ],
      150: [
        function (require, module, exports) {
          ;(function (process) {
            ;(function () {
              'use strict'
              Object.defineProperty(exports, '__esModule', {value: true})
              exports.resolveStaticPath = void 0
              const resolveStaticPath = (
                path,
                pathPrefix = process.env.ASSET_PREFIX
              ) => `${pathPrefix || ''}/static/${path.replace(/^\/+/, '')}`
              exports.resolveStaticPath = resolveStaticPath
            }).call(this)
          }).call(this, require('_process'))
        },
        {_process: 5}
      ],
      151: [
        function (require, module, exports) {
          'use strict'
          var __awaiter =
            (this && this.__awaiter) ||
            function (thisArg, _arguments, P, generator) {
              function adopt(value) {
                return value instanceof P
                  ? value
                  : new P(function (resolve) {
                      resolve(value)
                    })
              }
              return new (P || (P = Promise))(function (resolve, reject) {
                function fulfilled(value) {
                  try {
                    step(generator.next(value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function rejected(value) {
                  try {
                    step(generator['throw'](value))
                  } catch (e) {
                    reject(e)
                  }
                }
                function step(result) {
                  result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
                }
                step(
                  (generator = generator.apply(
                    thisArg,
                    _arguments || []
                  )).next()
                )
              })
            }
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.scheduleAction = void 0
          const isArray = attempts => Array.isArray(attempts)
          const abortedBySignal = () => new Error('Aborted by signal')
          const abortedByDeadline = () => new Error('Aborted by deadline')
          const abortedByTimeout = () => new Error('Aborted by timeout')
          const resolveAfterMs = (ms, clear) =>
            new Promise((resolve, reject) => {
              if (clear.aborted) return reject()
              if (ms === undefined) return resolve()
              const timeout = setTimeout(resolve, ms)
              const onClear = () => {
                clearTimeout(timeout)
                clear.removeEventListener('abort', onClear)
                reject()
              }
              clear.addEventListener('abort', onClear)
            })
          const rejectAfterMs = (ms, reason, clear) =>
            new Promise((_, reject) => {
              if (clear.aborted) return reject()
              const timeout =
                ms !== undefined
                  ? setTimeout(() => reject(reason()), ms)
                  : undefined
              const onClear = () => {
                clearTimeout(timeout)
                clear.removeEventListener('abort', onClear)
                reject()
              }
              clear.addEventListener('abort', onClear)
            })
          const rejectWhenAborted = (signal, clear) =>
            new Promise((_, reject) => {
              if (clear.aborted) return reject()
              if (
                signal === null || signal === void 0 ? void 0 : signal.aborted
              )
                return reject(abortedBySignal())
              const onAbort = () => reject(abortedBySignal())
              signal === null || signal === void 0
                ? void 0
                : signal.addEventListener('abort', onAbort)
              const onClear = () => {
                signal === null || signal === void 0
                  ? void 0
                  : signal.removeEventListener('abort', onAbort)
                clear.removeEventListener('abort', onClear)
                reject()
              }
              clear.addEventListener('abort', onClear)
            })
          const resolveAction = (action, clear) =>
            __awaiter(void 0, void 0, void 0, function* () {
              const aborter = new AbortController()
              const onClear = () => aborter.abort()
              if (clear.aborted) onClear()
              clear.addEventListener('abort', onClear)
              try {
                return yield new Promise(resolve =>
                  resolve(action(aborter.signal))
                )
              } finally {
                clear.removeEventListener('abort', onClear)
              }
            })
          const attemptLoop = (attempts, attempt, failure, clear) =>
            __awaiter(void 0, void 0, void 0, function* () {
              for (let a = 0; a < attempts - 1; a++) {
                if (clear.aborted) break
                const aborter = new AbortController()
                const onClear = () => aborter.abort()
                clear.addEventListener('abort', onClear)
                try {
                  return yield attempt(a, aborter.signal)
                } catch (_a) {
                  onClear()
                  yield failure(a)
                } finally {
                  clear.removeEventListener('abort', onClear)
                }
              }
              return clear.aborted
                ? Promise.reject()
                : attempt(attempts - 1, clear)
            })
          const scheduleAction = (action, params) =>
            __awaiter(void 0, void 0, void 0, function* () {
              const {signal, delay, attempts, timeout, deadline, gap} = params
              const deadlineMs = deadline && deadline - Date.now()
              const attemptCount = isArray(attempts)
                ? attempts.length
                : attempts !== null && attempts !== void 0
                ? attempts
                : deadline
                ? Infinity
                : 1
              const clearAborter = new AbortController()
              const clear = clearAborter.signal
              const getParams = isArray(attempts)
                ? attempt => attempts[attempt]
                : () => ({timeout, gap})
              try {
                return yield Promise.race([
                  rejectWhenAborted(signal, clear),
                  rejectAfterMs(deadlineMs, abortedByDeadline, clear),
                  resolveAfterMs(delay, clear).then(() =>
                    attemptLoop(
                      attemptCount,
                      (attempt, abort) =>
                        Promise.race([
                          rejectAfterMs(
                            getParams(attempt).timeout,
                            abortedByTimeout,
                            clear
                          ),
                          resolveAction(action, abort)
                        ]),
                      attempt => {
                        var _a
                        return resolveAfterMs(
                          (_a = getParams(attempt).gap) !== null &&
                            _a !== void 0
                            ? _a
                            : 0,
                          clear
                        )
                      },
                      clear
                    )
                  )
                ])
              } finally {
                clearAborter.abort()
              }
            })
          exports.scheduleAction = scheduleAction
        },
        {}
      ],
      152: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.throwError = void 0
          const throwError = reason => {
            throw new Error(reason)
          }
          exports.throwError = throwError
        },
        {}
      ],
      153: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.topologicalSort = void 0
          const arrayPartition_1 = require('./arrayPartition')
          const topologicalSort = (elements, precedes, tie) => {
            const result = []
            const filterRoots = verts =>
              (0, arrayPartition_1.arrayPartition)(
                verts,
                succ => !verts.some(pred => precedes(pred, succ))
              )
            let elem = elements
            while (elem.length) {
              const [roots, rest] = filterRoots(elem)
              if (!roots.length) throw new Error('Cycle detected')
              result.push(...(tie ? roots.sort(tie) : roots))
              elem = rest
            }
            return result
          }
          exports.topologicalSort = topologicalSort
        },
        {'./arrayPartition': 126}
      ],
      154: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.truncateMiddle = void 0
          const truncateMiddle = (text, startChars, endChars) => {
            if (text.length <= startChars + endChars) return text
            const start = text.substring(0, startChars)
            const end = text.substring(text.length - endChars, text.length)
            return `${start}…${end}`
          }
          exports.truncateMiddle = truncateMiddle
        },
        {}
      ],
      155: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.normalizeVersion =
            exports.isNewerOrEqual =
            exports.isEqual =
            exports.isNewer =
            exports.isVersionArray =
              void 0
          const parse = versionArr => ({
            major: versionArr[0],
            minor: versionArr[1],
            patch: versionArr[2]
          })
          const split = version => {
            const arr = version.split('.')
            if (arr.length !== 3) {
              throw new Error('version string is in wrong format')
            }
            return arr
          }
          const versionToString = arr => `${arr[0]}.${arr[1]}.${arr[2]}`
          const isVersionArray = arr => arr.length === 3
          exports.isVersionArray = isVersionArray
          const isNewer = (versionX, versionY) => {
            const parsedX = parse(
              typeof versionX === 'string' ? split(versionX) : versionX
            )
            const parsedY = parse(
              typeof versionY === 'string' ? split(versionY) : versionY
            )
            if (parsedX.major - parsedY.major !== 0) {
              return parsedX.major > parsedY.major
            }
            if (parsedX.minor - parsedY.minor !== 0) {
              return parsedX.minor > parsedY.minor
            }
            if (parsedX.patch - parsedY.patch !== 0) {
              return parsedX.patch > parsedY.patch
            }
            return false
          }
          exports.isNewer = isNewer
          const isEqual = (versionX, versionY) => {
            const strX =
              typeof versionX === 'string'
                ? versionX
                : versionToString(versionX)
            const strY =
              typeof versionY === 'string'
                ? versionY
                : versionToString(versionY)
            return strX === strY
          }
          exports.isEqual = isEqual
          const isNewerOrEqual = (versionX, versionY) =>
            (0, exports.isNewer)(versionX, versionY) ||
            (0, exports.isEqual)(versionX, versionY)
          exports.isNewerOrEqual = isNewerOrEqual
          const normalizeVersion = version => version.replace(/\b0+(\d)/g, '$1')
          exports.normalizeVersion = normalizeVersion
        },
        {}
      ],
      156: [
        function (require, module, exports) {
          'use strict'
          Object.defineProperty(exports, '__esModule', {value: true})
          exports.inDoubleQuotes =
            exports.inSingleQuotes =
            exports.inHTML =
              void 0
          const LT = /</g
          const SQUOT = /'/g
          const QUOT = /"/g
          const inHTML = value => value.replace(LT, '&lt;')
          exports.inHTML = inHTML
          const inSingleQuotes = value => value.replace(SQUOT, '&#39;')
          exports.inSingleQuotes = inSingleQuotes
          const inDoubleQuotes = value => value.replace(QUOT, '&quot;')
          exports.inDoubleQuotes = inDoubleQuotes
        },
        {}
      ]
    },
    {},
    [57]
  )(57)
})
