// decode: turns the game's compact binary messages (a format called "MessagePack")
// back into normal JavaScript values: numbers, text, lists, and objects.
//
//   decode(bytes)           reads ONE value from the start of `bytes`
//   decode(bytes, offset)   ...or from position `offset`
//
// It returns { value, offset }, where `offset` is the position right AFTER the value it read,
// so the caller can call decode again to read the next value in the same message.
//
// `bytes` must be a Uint8Array (a list of numbers from 0 to 255, one per byte).
//
// MessagePack in one paragraph: every value starts with one "type byte" that says what comes
// next. Small numbers (0-127) are stored in the type byte itself. For text, lists and objects
// the type byte also holds how many characters/items/pairs follow.
// This function only knows the types we have seen the game use.

function decode(bytes, offset = 0) {
  let pos = offset; // our current reading position in `bytes`

  // A DataView lets us read multi-byte numbers (like 16-bit and 32-bit ones) from `bytes`.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Make sure `count` more bytes really exist; otherwise the message was cut short.
  function need(count) {
    if (pos + count > bytes.length) throw new Error('decode: message ended too early');
  }

  // Read one number that takes up `size` bytes. `getter` says how to read it (for example,
  // as a whole number or as a decimal). Afterwards we move forward past those bytes.
  function readNumber(size, getter) {
    need(size);
    const value = getter(pos);
    pos += size;
    return value;
  }

  const readByte = () => readNumber(1, (at) => view.getUint8(at)); // a number from 0 to 255
  const readShort = () => readNumber(2, (at) => view.getUint16(at)); // a number from 0 to 65535

  // Read `length` bytes and turn them into text.
  function readText(length) {
    need(length);
    const text = new TextDecoder().decode(bytes.subarray(pos, pos + length));
    pos += length;
    return text;
  }

  // Read `count` values in a row and return them as a list.
  function readList(count) {
    const list = [];
    for (let i = 0; i < count; i++) list.push(readValue());
    return list;
  }

  // Read `count` key/value pairs and return them as an object.
  function readObject(count) {
    const object = {};
    for (let i = 0; i < count; i++) {
      const key = readValue();
      object[key] = readValue();
    }
    return object;
  }

  // Read one value of any kind. This is where the type byte is looked at.
  function readValue() {
    need(1);
    const type = bytes[pos];
    pos += 1;

    // Types whose "how many" is packed inside the type byte itself.
    if (type <= 0x7f) return type; // 0..127: the byte IS the number
    if (type >= 0xe0) return type - 256; // -32..-1: small negative numbers
    if ((type & 0xe0) === 0xa0) return readText(type & 0x1f); // text up to 31 bytes
    if ((type & 0xf0) === 0x90) return readList(type & 0x0f); // list of up to 15 items
    if ((type & 0xf0) === 0x80) return readObject(type & 0x0f); // object with up to 15 pairs

    // Types that have their own special byte, followed by the data.
    switch (type) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;
      case 0xca: return readNumber(4, (at) => view.getFloat32(at));
      case 0xcb: return readNumber(8, (at) => view.getFloat64(at));
      case 0xcc: return readByte();
      case 0xcd: return readShort();
      case 0xce: return readNumber(4, (at) => view.getUint32(at));
      case 0xd0: return readNumber(1, (at) => view.getInt8(at));
      case 0xd1: return readNumber(2, (at) => view.getInt16(at));
      case 0xd2: return readNumber(4, (at) => view.getInt32(at));
      case 0xd9: return readText(readByte()); // text whose length is in the next byte
      case 0xda: return readText(readShort()); // ...or in the next 2 bytes
      case 0xdc: return readList(readShort());
      case 0xde: return readObject(readShort());
      default:
        throw new Error('decode: unknown type byte 0x' + type.toString(16));
    }
  }

  const value = readValue();
  return { value, offset: pos };
}

// Lets the test files (which run in Node) load this file. In the browser `module` does not
// exist, so this line does nothing there and `decode` is simply available to other scripts.
if (typeof module !== 'undefined') module.exports = { decode };
