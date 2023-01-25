import { createCanvas, loadImage } from "canvas";
import GIF from "js-binary-schema-parser/lib/schemas/gif.js";
import { parse } from "js-binary-schema-parser";
import { buildStream } from "js-binary-schema-parser/lib/parsers/uint8.js";
function checkQRVersion(version, sText, nCorrectLevel) {
  const length = _getUTF8Length(sText);
  const i = version - 1;
  let nLimit = 0;
  switch (nCorrectLevel) {
    case QRErrorCorrectLevel.L:
      nLimit = QRCodeLimitLength[i][0];
      break;
    case QRErrorCorrectLevel.M:
      nLimit = QRCodeLimitLength[i][1];
      break;
    case QRErrorCorrectLevel.Q:
      nLimit = QRCodeLimitLength[i][2];
      break;
    case QRErrorCorrectLevel.H:
      nLimit = QRCodeLimitLength[i][3];
      break;
  }
  return length <= nLimit;
}
function _getTypeNumber(sText, nCorrectLevel) {
  var nType = 1;
  var length = _getUTF8Length(sText);
  for (var i = 0, len = QRCodeLimitLength.length; i < len; i++) {
    var nLimit = 0;
    switch (nCorrectLevel) {
      case QRErrorCorrectLevel.L:
        nLimit = QRCodeLimitLength[i][0];
        break;
      case QRErrorCorrectLevel.M:
        nLimit = QRCodeLimitLength[i][1];
        break;
      case QRErrorCorrectLevel.Q:
        nLimit = QRCodeLimitLength[i][2];
        break;
      case QRErrorCorrectLevel.H:
        nLimit = QRCodeLimitLength[i][3];
        break;
    }
    if (length <= nLimit) {
      break;
    } else {
      nType++;
    }
  }
  if (nType > QRCodeLimitLength.length) {
    throw new Error("Too long data");
  }
  return nType;
}
function _getUTF8Length(sText) {
  var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, "a");
  return replacedText.length + (replacedText.length != Number(sText) ? 3 : 0);
}
class QR8bitByte {
  constructor(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.parsedData = [];
    this.data = data;
    const byteArrays = [];
    for (let i = 0, l = this.data.length; i < l; i++) {
      const byteArray = [];
      const code = this.data.charCodeAt(i);
      if (code > 65536) {
        byteArray[0] = 240 | (code & 1835008) >>> 18;
        byteArray[1] = 128 | (code & 258048) >>> 12;
        byteArray[2] = 128 | (code & 4032) >>> 6;
        byteArray[3] = 128 | code & 63;
      } else if (code > 2048) {
        byteArray[0] = 224 | (code & 61440) >>> 12;
        byteArray[1] = 128 | (code & 4032) >>> 6;
        byteArray[2] = 128 | code & 63;
      } else if (code > 128) {
        byteArray[0] = 192 | (code & 1984) >>> 6;
        byteArray[1] = 128 | code & 63;
      } else {
        byteArray[0] = code;
      }
      byteArrays.push(byteArray);
    }
    this.parsedData = Array.prototype.concat.apply([], byteArrays);
    if (this.parsedData.length != this.data.length) {
      this.parsedData.unshift(191);
      this.parsedData.unshift(187);
      this.parsedData.unshift(239);
    }
  }
  getLength() {
    return this.parsedData.length;
  }
  write(buffer) {
    for (let i = 0, l = this.parsedData.length; i < l; i++) {
      buffer.put(this.parsedData[i], 8);
    }
  }
}
const _QRCodeModel = class {
  constructor(typeNumber = -1, errorCorrectLevel = QRErrorCorrectLevel.L) {
    this.moduleCount = 0;
    this.dataList = [];
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.moduleCount = 0;
    this.dataList = [];
  }
  addData(data) {
    if (this.typeNumber <= 0) {
      this.typeNumber = _getTypeNumber(data, this.errorCorrectLevel);
    } else if (this.typeNumber > 40) {
      throw new Error(`Invalid QR version: ${this.typeNumber}`);
    } else {
      if (!checkQRVersion(this.typeNumber, data, this.errorCorrectLevel)) {
        throw new Error(`Data is too long for QR version: ${this.typeNumber}`);
      }
    }
    const newData = new QR8bitByte(data);
    this.dataList.push(newData);
    this.dataCache = void 0;
  }
  isDark(row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(`${row},${col}`);
    }
    return this.modules[row][col];
  }
  getModuleCount() {
    return this.moduleCount;
  }
  make() {
    this.makeImpl(false, this.getBestMaskPattern());
  }
  makeImpl(test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null;
      }
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    if (this.dataCache == null) {
      this.dataCache = _QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }
    this.mapData(this.dataCache, maskPattern);
  }
  setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r)
        continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c)
          continue;
        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }
  getBestMaskPattern() {
    if (Number.isInteger(this.maskPattern) && Object.values(QRMaskPattern).includes(this.maskPattern)) {
      return this.maskPattern;
    }
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);
      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }
  setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) {
        continue;
      }
      this.modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) {
        continue;
      }
      this.modules[6][c] = c % 2 == 0;
    }
  }
  setupPositionAdjustPattern() {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] != null) {
          continue;
        }
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }
  setupTypeNumber(test) {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (var i = 0; i < 18; i++) {
      var mod = !test && (bits >> i & 1) == 1;
      this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    }
    for (var i = 0; i < 18; i++) {
      var mod = !test && (bits >> i & 1) == 1;
      this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }
  setupTypeInfo(test, maskPattern) {
    const data = this.errorCorrectLevel << 3 | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (var i = 0; i < 15; i++) {
      var mod = !test && (bits >> i & 1) == 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }
    for (var i = 0; i < 15; i++) {
      var mod = !test && (bits >> i & 1) == 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }
    this.modules[this.moduleCount - 8][8] = !test;
  }
  mapData(data, maskPattern) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6)
        col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) == 1;
            }
            const mask = QRUtil.getMask(maskPattern, row, col - c);
            if (mask) {
              dark = !dark;
            }
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
  static createData(typeNumber, errorCorrectLevel, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error(`code length overflow. (${buffer.getLengthInBits()}>${totalDataCount * 8})`);
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(_QRCodeModel.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(_QRCodeModel.PAD1, 8);
    }
    return _QRCodeModel.createBytes(buffer, rsBlocks);
  }
  static createBytes(buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (var r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 255 & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array(totalCodeCount);
    let index = 0;
    for (var i = 0; i < maxDcCount; i++) {
      for (var r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }
    for (var i = 0; i < maxEcCount; i++) {
      for (var r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }
    return data;
  }
};
let QRCodeModel = _QRCodeModel;
QRCodeModel.PAD0 = 236;
QRCodeModel.PAD1 = 17;
const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
const QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };
const QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};
const _QRUtil = class {
  static getBCHTypeInfo(data) {
    let d = data << 10;
    while (_QRUtil.getBCHDigit(d) - _QRUtil.getBCHDigit(_QRUtil.G15) >= 0) {
      d ^= _QRUtil.G15 << _QRUtil.getBCHDigit(d) - _QRUtil.getBCHDigit(_QRUtil.G15);
    }
    return (data << 10 | d) ^ _QRUtil.G15_MASK;
  }
  static getBCHTypeNumber(data) {
    let d = data << 12;
    while (_QRUtil.getBCHDigit(d) - _QRUtil.getBCHDigit(_QRUtil.G18) >= 0) {
      d ^= _QRUtil.G18 << _QRUtil.getBCHDigit(d) - _QRUtil.getBCHDigit(_QRUtil.G18);
    }
    return data << 12 | d;
  }
  static getBCHDigit(data) {
    let digit = 0;
    while (data != 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
  static getPatternPosition(typeNumber) {
    return _QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
  }
  static getMask(maskPattern, i, j) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return (i + j) % 2 == 0;
      case QRMaskPattern.PATTERN001:
        return i % 2 == 0;
      case QRMaskPattern.PATTERN010:
        return j % 3 == 0;
      case QRMaskPattern.PATTERN011:
        return (i + j) % 3 == 0;
      case QRMaskPattern.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
      case QRMaskPattern.PATTERN101:
        return i * j % 2 + i * j % 3 == 0;
      case QRMaskPattern.PATTERN110:
        return (i * j % 2 + i * j % 3) % 2 == 0;
      case QRMaskPattern.PATTERN111:
        return (i * j % 3 + (i + j) % 2) % 2 == 0;
      default:
        throw new Error(`bad maskPattern:${maskPattern}`);
    }
  }
  static getErrorCorrectPolynomial(errorCorrectLength) {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }
  static getLengthInBits(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw new Error(`mode:${mode}`);
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw new Error(`mode:${mode}`);
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw new Error(`mode:${mode}`);
      }
    } else {
      throw new Error(`type:${type}`);
    }
  }
  static getLostPoint(qrCode) {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }
            if (r == 0 && c == 0) {
              continue;
            }
            if (dark == qrCode.isDark(row + r, col + c)) {
              sameCount++;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }
    for (var row = 0; row < moduleCount - 1; row++) {
      for (var col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col))
          count++;
        if (qrCode.isDark(row + 1, col))
          count++;
        if (qrCode.isDark(row, col + 1))
          count++;
        if (qrCode.isDark(row + 1, col + 1))
          count++;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount - 6; col++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount - 6; row++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) {
          darkCount++;
        }
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  }
};
let QRUtil = _QRUtil;
QRUtil.PATTERN_POSITION_TABLE = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170]
];
QRUtil.G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
QRUtil.G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
QRUtil.G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
const _QRMath = class {
  static glog(n) {
    if (n < 1) {
      throw new Error(`glog(${n})`);
    }
    return _QRMath.LOG_TABLE[n];
  }
  static gexp(n) {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return _QRMath.EXP_TABLE[n];
  }
};
let QRMath = _QRMath;
QRMath.EXP_TABLE = new Array(256);
QRMath.LOG_TABLE = new Array(256);
QRMath._constructor = function() {
  for (var i = 0; i < 8; i++) {
    _QRMath.EXP_TABLE[i] = 1 << i;
  }
  for (var i = 8; i < 256; i++) {
    _QRMath.EXP_TABLE[i] = _QRMath.EXP_TABLE[i - 4] ^ _QRMath.EXP_TABLE[i - 5] ^ _QRMath.EXP_TABLE[i - 6] ^ _QRMath.EXP_TABLE[i - 8];
  }
  for (var i = 0; i < 255; i++) {
    _QRMath.LOG_TABLE[_QRMath.EXP_TABLE[i]] = i;
  }
}();
class QRPolynomial {
  constructor(num, shift) {
    if (num.length == void 0) {
      throw new Error(`${num.length}/${shift}`);
    }
    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }
  get(index) {
    return this.num[index];
  }
  getLength() {
    return this.num.length;
  }
  multiply(e) {
    const num = new Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  }
  mod(e) {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (var i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }
    for (var i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}
const _QRRSBlock = class {
  constructor(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  static getRSBlocks(typeNumber, errorCorrectLevel) {
    const rsBlock = _QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock == void 0) {
      throw new Error(`bad rs block @ typeNumber:${typeNumber}/errorCorrectLevel:${errorCorrectLevel}`);
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) {
        list.push(new _QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  }
  static getRsBlockTable(typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L:
        return _QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectLevel.M:
        return _QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectLevel.Q:
        return _QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectLevel.H:
        return _QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return void 0;
    }
  }
};
let QRRSBlock = _QRRSBlock;
QRRSBlock.RS_BLOCK_TABLE = [
  [1, 26, 19],
  [1, 26, 16],
  [1, 26, 13],
  [1, 26, 9],
  [1, 44, 34],
  [1, 44, 28],
  [1, 44, 22],
  [1, 44, 16],
  [1, 70, 55],
  [1, 70, 44],
  [2, 35, 17],
  [2, 35, 13],
  [1, 100, 80],
  [2, 50, 32],
  [2, 50, 24],
  [4, 25, 9],
  [1, 134, 108],
  [2, 67, 43],
  [2, 33, 15, 2, 34, 16],
  [2, 33, 11, 2, 34, 12],
  [2, 86, 68],
  [4, 43, 27],
  [4, 43, 19],
  [4, 43, 15],
  [2, 98, 78],
  [4, 49, 31],
  [2, 32, 14, 4, 33, 15],
  [4, 39, 13, 1, 40, 14],
  [2, 121, 97],
  [2, 60, 38, 2, 61, 39],
  [4, 40, 18, 2, 41, 19],
  [4, 40, 14, 2, 41, 15],
  [2, 146, 116],
  [3, 58, 36, 2, 59, 37],
  [4, 36, 16, 4, 37, 17],
  [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69],
  [4, 69, 43, 1, 70, 44],
  [6, 43, 19, 2, 44, 20],
  [6, 43, 15, 2, 44, 16],
  [4, 101, 81],
  [1, 80, 50, 4, 81, 51],
  [4, 50, 22, 4, 51, 23],
  [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93],
  [6, 58, 36, 2, 59, 37],
  [4, 46, 20, 6, 47, 21],
  [7, 42, 14, 4, 43, 15],
  [4, 133, 107],
  [8, 59, 37, 1, 60, 38],
  [8, 44, 20, 4, 45, 21],
  [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116],
  [4, 64, 40, 5, 65, 41],
  [11, 36, 16, 5, 37, 17],
  [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88],
  [5, 65, 41, 5, 66, 42],
  [5, 54, 24, 7, 55, 25],
  [11, 36, 12],
  [5, 122, 98, 1, 123, 99],
  [7, 73, 45, 3, 74, 46],
  [15, 43, 19, 2, 44, 20],
  [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108],
  [10, 74, 46, 1, 75, 47],
  [1, 50, 22, 15, 51, 23],
  [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121],
  [9, 69, 43, 4, 70, 44],
  [17, 50, 22, 1, 51, 23],
  [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114],
  [3, 70, 44, 11, 71, 45],
  [17, 47, 21, 4, 48, 22],
  [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108],
  [3, 67, 41, 13, 68, 42],
  [15, 54, 24, 5, 55, 25],
  [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117],
  [17, 68, 42],
  [17, 50, 22, 6, 51, 23],
  [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112],
  [17, 74, 46],
  [7, 54, 24, 16, 55, 25],
  [34, 37, 13],
  [4, 151, 121, 5, 152, 122],
  [4, 75, 47, 14, 76, 48],
  [11, 54, 24, 14, 55, 25],
  [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118],
  [6, 73, 45, 14, 74, 46],
  [11, 54, 24, 16, 55, 25],
  [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107],
  [8, 75, 47, 13, 76, 48],
  [7, 54, 24, 22, 55, 25],
  [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115],
  [19, 74, 46, 4, 75, 47],
  [28, 50, 22, 6, 51, 23],
  [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123],
  [22, 73, 45, 3, 74, 46],
  [8, 53, 23, 26, 54, 24],
  [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118],
  [3, 73, 45, 23, 74, 46],
  [4, 54, 24, 31, 55, 25],
  [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117],
  [21, 73, 45, 7, 74, 46],
  [1, 53, 23, 37, 54, 24],
  [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116],
  [19, 75, 47, 10, 76, 48],
  [15, 54, 24, 25, 55, 25],
  [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116],
  [2, 74, 46, 29, 75, 47],
  [42, 54, 24, 1, 55, 25],
  [23, 45, 15, 28, 46, 16],
  [17, 145, 115],
  [10, 74, 46, 23, 75, 47],
  [10, 54, 24, 35, 55, 25],
  [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116],
  [14, 74, 46, 21, 75, 47],
  [29, 54, 24, 19, 55, 25],
  [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116],
  [14, 74, 46, 23, 75, 47],
  [44, 54, 24, 7, 55, 25],
  [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122],
  [12, 75, 47, 26, 76, 48],
  [39, 54, 24, 14, 55, 25],
  [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122],
  [6, 75, 47, 34, 76, 48],
  [46, 54, 24, 10, 55, 25],
  [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123],
  [29, 74, 46, 14, 75, 47],
  [49, 54, 24, 10, 55, 25],
  [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123],
  [13, 74, 46, 32, 75, 47],
  [48, 54, 24, 14, 55, 25],
  [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118],
  [40, 75, 47, 7, 76, 48],
  [43, 54, 24, 22, 55, 25],
  [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119],
  [18, 75, 47, 31, 76, 48],
  [34, 54, 24, 34, 55, 25],
  [20, 45, 15, 61, 46, 16]
];
class QRBitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }
  get(index) {
    const bufIndex = Math.floor(index / 8);
    return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
  }
  put(num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit((num >>> length - i - 1 & 1) == 1);
    }
  }
  getLengthInBits() {
    return this.length;
  }
  putBit(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 128 >>> this.length % 8;
    }
    this.length++;
  }
}
const QRCodeLimitLength = [
  [17, 14, 11, 7],
  [32, 26, 20, 14],
  [53, 42, 32, 24],
  [78, 62, 46, 34],
  [106, 84, 60, 44],
  [134, 106, 74, 58],
  [154, 122, 86, 64],
  [192, 152, 108, 84],
  [230, 180, 130, 98],
  [271, 213, 151, 119],
  [321, 251, 177, 137],
  [367, 287, 203, 155],
  [425, 331, 241, 177],
  [458, 362, 258, 194],
  [520, 412, 292, 220],
  [586, 450, 322, 250],
  [644, 504, 364, 280],
  [718, 560, 394, 310],
  [792, 624, 442, 338],
  [858, 666, 482, 382],
  [929, 711, 509, 403],
  [1003, 779, 565, 439],
  [1091, 857, 611, 461],
  [1171, 911, 661, 511],
  [1273, 997, 715, 535],
  [1367, 1059, 751, 593],
  [1465, 1125, 805, 625],
  [1528, 1190, 868, 658],
  [1628, 1264, 908, 698],
  [1732, 1370, 982, 742],
  [1840, 1452, 1030, 790],
  [1952, 1538, 1112, 842],
  [2068, 1628, 1168, 898],
  [2188, 1722, 1228, 958],
  [2303, 1809, 1283, 983],
  [2431, 1911, 1351, 1051],
  [2563, 1989, 1423, 1093],
  [2699, 2099, 1499, 1139],
  [2809, 2213, 1579, 1219],
  [2953, 2331, 1663, 1273]
];
const deinterlace = (pixels, width) => {
  const newPixels = new Array(pixels.length);
  const rows = pixels.length / width;
  const cpRow = function(toRow2, fromRow2) {
    const fromPixels = pixels.slice(fromRow2 * width, (fromRow2 + 1) * width);
    newPixels.splice.apply(newPixels, [toRow2 * width, width].concat(fromPixels));
  };
  const offsets = [0, 4, 2, 1];
  const steps = [8, 8, 4, 2];
  var fromRow = 0;
  for (var pass = 0; pass < 4; pass++) {
    for (var toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
      cpRow(toRow, fromRow);
      fromRow++;
    }
  }
  return newPixels;
};
const lzw = (minCodeSize, data, pixelCount) => {
  const MAX_STACK_SIZE = 4096;
  const nullCode = -1;
  const npix = pixelCount;
  var available, clear, code_mask, code_size, end_of_information, in_code, old_code, bits, code, i, datum, data_size, first, top, bi, pi;
  const dstPixels = new Array(pixelCount);
  const prefix = new Array(MAX_STACK_SIZE);
  const suffix = new Array(MAX_STACK_SIZE);
  const pixelStack = new Array(MAX_STACK_SIZE + 1);
  data_size = minCodeSize;
  clear = 1 << data_size;
  end_of_information = clear + 1;
  available = clear + 2;
  old_code = nullCode;
  code_size = data_size + 1;
  code_mask = (1 << code_size) - 1;
  for (code = 0; code < clear; code++) {
    prefix[code] = 0;
    suffix[code] = code;
  }
  var datum, bits, first, top, pi, bi;
  datum = bits = first = top = pi = bi = 0;
  for (i = 0; i < npix; ) {
    if (top === 0) {
      if (bits < code_size) {
        datum += data[bi] << bits;
        bits += 8;
        bi++;
        continue;
      }
      code = datum & code_mask;
      datum >>= code_size;
      bits -= code_size;
      if (code > available || code == end_of_information) {
        break;
      }
      if (code == clear) {
        code_size = data_size + 1;
        code_mask = (1 << code_size) - 1;
        available = clear + 2;
        old_code = nullCode;
        continue;
      }
      if (old_code == nullCode) {
        pixelStack[top++] = suffix[code];
        old_code = code;
        first = code;
        continue;
      }
      in_code = code;
      if (code == available) {
        pixelStack[top++] = first;
        code = old_code;
      }
      while (code > clear) {
        pixelStack[top++] = suffix[code];
        code = prefix[code];
      }
      first = suffix[code] & 255;
      pixelStack[top++] = first;
      if (available < MAX_STACK_SIZE) {
        prefix[available] = old_code;
        suffix[available] = first;
        available++;
        if ((available & code_mask) === 0 && available < MAX_STACK_SIZE) {
          code_size++;
          code_mask += available;
        }
      }
      old_code = in_code;
    }
    top--;
    dstPixels[pi++] = pixelStack[top];
    i++;
  }
  for (i = pi; i < npix; i++) {
    dstPixels[i] = 0;
  }
  return dstPixels;
};
const parseGIF = (arrayBuffer) => {
  const byteData = new Uint8Array(arrayBuffer);
  return parse(buildStream(byteData), GIF);
};
const generatePatch = (image) => {
  const totalPixels = image.pixels.length;
  const patchData = new Uint8ClampedArray(totalPixels * 4);
  for (var i = 0; i < totalPixels; i++) {
    const pos = i * 4;
    const colorIndex = image.pixels[i];
    const color = image.colorTable[colorIndex];
    patchData[pos] = color[0];
    patchData[pos + 1] = color[1];
    patchData[pos + 2] = color[2];
    patchData[pos + 3] = colorIndex !== image.transparentIndex ? 255 : 0;
  }
  return patchData;
};
const decompressFrame = (frame, gct, buildImagePatch) => {
  if (!frame.image) {
    console.warn("gif frame does not have associated image.");
    return;
  }
  const { image } = frame;
  const totalPixels = image.descriptor.width * image.descriptor.height;
  var pixels = lzw(image.data.minCodeSize, image.data.blocks, totalPixels);
  if (image.descriptor.lct.interlaced) {
    pixels = deinterlace(pixels, image.descriptor.width);
  }
  const resultImage = {
    pixels,
    dims: {
      top: frame.image.descriptor.top,
      left: frame.image.descriptor.left,
      width: frame.image.descriptor.width,
      height: frame.image.descriptor.height
    }
  };
  if (image.descriptor.lct && image.descriptor.lct.exists) {
    resultImage.colorTable = image.lct;
  } else {
    resultImage.colorTable = gct;
  }
  if (frame.gce) {
    resultImage.delay = (frame.gce.delay || 10) * 10;
    resultImage.disposalType = frame.gce.extras.disposal;
    if (frame.gce.extras.transparentColorGiven) {
      resultImage.transparentIndex = frame.gce.transparentColorIndex;
    }
  }
  if (buildImagePatch) {
    resultImage.patch = generatePatch(resultImage);
  }
  return resultImage;
};
const decompressFrames = (parsedGif, buildImagePatches) => {
  return parsedGif.frames.filter((f) => f.image).map((f) => decompressFrame(f, parsedGif.gct, buildImagePatches));
};
var ncycles = 100;
var netsize = 256;
var maxnetpos = netsize - 1;
var netbiasshift = 4;
var intbiasshift = 16;
var intbias = 1 << intbiasshift;
var gammashift = 10;
var betashift = 10;
var beta = intbias >> betashift;
var betagamma = intbias << gammashift - betashift;
var initrad = netsize >> 3;
var radiusbiasshift = 6;
var radiusbias = 1 << radiusbiasshift;
var initradius = initrad * radiusbias;
var radiusdec = 30;
var alphabiasshift = 10;
var initalpha = 1 << alphabiasshift;
var radbiasshift = 8;
var radbias = 1 << radbiasshift;
var alpharadbshift = alphabiasshift + radbiasshift;
var alpharadbias = 1 << alpharadbshift;
var prime1 = 499;
var prime2 = 491;
var prime3 = 487;
var prime4 = 503;
var minpicturebytes = 3 * prime4;
function NeuQuant(pixels, samplefac) {
  var network;
  var netindex;
  var bias;
  var freq;
  var radpower;
  function init() {
    network = [];
    netindex = new Int32Array(256);
    bias = new Int32Array(netsize);
    freq = new Int32Array(netsize);
    radpower = new Int32Array(netsize >> 3);
    var i, v;
    for (i = 0; i < netsize; i++) {
      v = (i << netbiasshift + 8) / netsize;
      network[i] = new Float64Array([v, v, v, 0]);
      freq[i] = intbias / netsize;
      bias[i] = 0;
    }
  }
  function unbiasnet() {
    for (var i = 0; i < netsize; i++) {
      network[i][0] >>= netbiasshift;
      network[i][1] >>= netbiasshift;
      network[i][2] >>= netbiasshift;
      network[i][3] = i;
    }
  }
  function altersingle(alpha, i, b, g, r) {
    network[i][0] -= alpha * (network[i][0] - b) / initalpha;
    network[i][1] -= alpha * (network[i][1] - g) / initalpha;
    network[i][2] -= alpha * (network[i][2] - r) / initalpha;
  }
  function alterneigh(radius, i, b, g, r) {
    var lo = Math.abs(i - radius);
    var hi = Math.min(i + radius, netsize);
    var j = i + 1;
    var k = i - 1;
    var m = 1;
    var p, a;
    while (j < hi || k > lo) {
      a = radpower[m++];
      if (j < hi) {
        p = network[j++];
        p[0] -= a * (p[0] - b) / alpharadbias;
        p[1] -= a * (p[1] - g) / alpharadbias;
        p[2] -= a * (p[2] - r) / alpharadbias;
      }
      if (k > lo) {
        p = network[k--];
        p[0] -= a * (p[0] - b) / alpharadbias;
        p[1] -= a * (p[1] - g) / alpharadbias;
        p[2] -= a * (p[2] - r) / alpharadbias;
      }
    }
  }
  function contest(b, g, r) {
    var bestd = ~(1 << 31);
    var bestbiasd = bestd;
    var bestpos = -1;
    var bestbiaspos = bestpos;
    var i, n, dist, biasdist, betafreq;
    for (i = 0; i < netsize; i++) {
      n = network[i];
      dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
      if (dist < bestd) {
        bestd = dist;
        bestpos = i;
      }
      biasdist = dist - (bias[i] >> intbiasshift - netbiasshift);
      if (biasdist < bestbiasd) {
        bestbiasd = biasdist;
        bestbiaspos = i;
      }
      betafreq = freq[i] >> betashift;
      freq[i] -= betafreq;
      bias[i] += betafreq << gammashift;
    }
    freq[bestpos] += beta;
    bias[bestpos] -= betagamma;
    return bestbiaspos;
  }
  function inxbuild() {
    var i, j, p, q, smallpos, smallval, previouscol = 0, startpos = 0;
    for (i = 0; i < netsize; i++) {
      p = network[i];
      smallpos = i;
      smallval = p[1];
      for (j = i + 1; j < netsize; j++) {
        q = network[j];
        if (q[1] < smallval) {
          smallpos = j;
          smallval = q[1];
        }
      }
      q = network[smallpos];
      if (i != smallpos) {
        j = q[0];
        q[0] = p[0];
        p[0] = j;
        j = q[1];
        q[1] = p[1];
        p[1] = j;
        j = q[2];
        q[2] = p[2];
        p[2] = j;
        j = q[3];
        q[3] = p[3];
        p[3] = j;
      }
      if (smallval != previouscol) {
        netindex[previouscol] = startpos + i >> 1;
        for (j = previouscol + 1; j < smallval; j++)
          netindex[j] = i;
        previouscol = smallval;
        startpos = i;
      }
    }
    netindex[previouscol] = startpos + maxnetpos >> 1;
    for (j = previouscol + 1; j < 256; j++)
      netindex[j] = maxnetpos;
  }
  function inxsearch(b, g, r) {
    var a, p, dist;
    var bestd = 1e3;
    var best = -1;
    var i = netindex[g];
    var j = i - 1;
    while (i < netsize || j >= 0) {
      if (i < netsize) {
        p = network[i];
        dist = p[1] - g;
        if (dist >= bestd)
          i = netsize;
        else {
          i++;
          if (dist < 0)
            dist = -dist;
          a = p[0] - b;
          if (a < 0)
            a = -a;
          dist += a;
          if (dist < bestd) {
            a = p[2] - r;
            if (a < 0)
              a = -a;
            dist += a;
            if (dist < bestd) {
              bestd = dist;
              best = p[3];
            }
          }
        }
      }
      if (j >= 0) {
        p = network[j];
        dist = g - p[1];
        if (dist >= bestd)
          j = -1;
        else {
          j--;
          if (dist < 0)
            dist = -dist;
          a = p[0] - b;
          if (a < 0)
            a = -a;
          dist += a;
          if (dist < bestd) {
            a = p[2] - r;
            if (a < 0)
              a = -a;
            dist += a;
            if (dist < bestd) {
              bestd = dist;
              best = p[3];
            }
          }
        }
      }
    }
    return best;
  }
  function learn() {
    var i;
    var lengthcount = pixels.length;
    var alphadec = 30 + (samplefac - 1) / 3;
    var samplepixels = lengthcount / (3 * samplefac);
    var delta = ~~(samplepixels / ncycles);
    var alpha = initalpha;
    var radius = initradius;
    var rad = radius >> radiusbiasshift;
    if (rad <= 1)
      rad = 0;
    for (i = 0; i < rad; i++)
      radpower[i] = alpha * ((rad * rad - i * i) * radbias / (rad * rad));
    var step;
    if (lengthcount < minpicturebytes) {
      samplefac = 1;
      step = 3;
    } else if (lengthcount % prime1 !== 0) {
      step = 3 * prime1;
    } else if (lengthcount % prime2 !== 0) {
      step = 3 * prime2;
    } else if (lengthcount % prime3 !== 0) {
      step = 3 * prime3;
    } else {
      step = 3 * prime4;
    }
    var b, g, r, j;
    var pix = 0;
    i = 0;
    while (i < samplepixels) {
      b = (pixels[pix] & 255) << netbiasshift;
      g = (pixels[pix + 1] & 255) << netbiasshift;
      r = (pixels[pix + 2] & 255) << netbiasshift;
      j = contest(b, g, r);
      altersingle(alpha, j, b, g, r);
      if (rad !== 0)
        alterneigh(rad, j, b, g, r);
      pix += step;
      if (pix >= lengthcount)
        pix -= lengthcount;
      i++;
      if (delta === 0)
        delta = 1;
      if (i % delta === 0) {
        alpha -= alpha / alphadec;
        radius -= radius / radiusdec;
        rad = radius >> radiusbiasshift;
        if (rad <= 1)
          rad = 0;
        for (j = 0; j < rad; j++)
          radpower[j] = alpha * ((rad * rad - j * j) * radbias / (rad * rad));
      }
    }
  }
  function buildColormap() {
    init();
    learn();
    unbiasnet();
    inxbuild();
  }
  this.buildColormap = buildColormap;
  function getColormap() {
    var map = [];
    var index = [];
    for (var i = 0; i < netsize; i++)
      index[network[i][3]] = i;
    var k = 0;
    for (var l = 0; l < netsize; l++) {
      var j = index[l];
      map[k++] = network[j][0];
      map[k++] = network[j][1];
      map[k++] = network[j][2];
    }
    return map;
  }
  this.getColormap = getColormap;
  this.lookupRGB = inxsearch;
}
var EOF = -1;
var BITS = 12;
var HSIZE = 5003;
var masks = [
  0,
  1,
  3,
  7,
  15,
  31,
  63,
  127,
  255,
  511,
  1023,
  2047,
  4095,
  8191,
  16383,
  32767,
  65535
];
function LZWEncoder(width, height, pixels, colorDepth) {
  var initCodeSize = Math.max(2, colorDepth);
  var accum = new Uint8Array(256);
  var htab = new Int32Array(HSIZE);
  var codetab = new Int32Array(HSIZE);
  var cur_accum, cur_bits = 0;
  var a_count;
  var free_ent = 0;
  var maxcode;
  var clear_flg = false;
  var g_init_bits, ClearCode, EOFCode;
  var remaining, curPixel, n_bits;
  function char_out(c, outs) {
    accum[a_count++] = c;
    if (a_count >= 254)
      flush_char(outs);
  }
  function cl_block(outs) {
    cl_hash(HSIZE);
    free_ent = ClearCode + 2;
    clear_flg = true;
    output(ClearCode, outs);
  }
  function cl_hash(hsize) {
    for (var i = 0; i < hsize; ++i)
      htab[i] = -1;
  }
  function compress(init_bits, outs) {
    var fcode, c, i, ent, disp, hsize_reg, hshift;
    g_init_bits = init_bits;
    clear_flg = false;
    n_bits = g_init_bits;
    maxcode = MAXCODE(n_bits);
    ClearCode = 1 << init_bits - 1;
    EOFCode = ClearCode + 1;
    free_ent = ClearCode + 2;
    a_count = 0;
    ent = nextPixel();
    hshift = 0;
    for (fcode = HSIZE; fcode < 65536; fcode *= 2)
      ++hshift;
    hshift = 8 - hshift;
    hsize_reg = HSIZE;
    cl_hash(hsize_reg);
    output(ClearCode, outs);
    outer_loop:
      while ((c = nextPixel()) != EOF) {
        fcode = (c << BITS) + ent;
        i = c << hshift ^ ent;
        if (htab[i] === fcode) {
          ent = codetab[i];
          continue;
        } else if (htab[i] >= 0) {
          disp = hsize_reg - i;
          if (i === 0)
            disp = 1;
          do {
            if ((i -= disp) < 0)
              i += hsize_reg;
            if (htab[i] === fcode) {
              ent = codetab[i];
              continue outer_loop;
            }
          } while (htab[i] >= 0);
        }
        output(ent, outs);
        ent = c;
        if (free_ent < 1 << BITS) {
          codetab[i] = free_ent++;
          htab[i] = fcode;
        } else {
          cl_block(outs);
        }
      }
    output(ent, outs);
    output(EOFCode, outs);
  }
  function encode(outs) {
    outs.writeByte(initCodeSize);
    remaining = width * height;
    curPixel = 0;
    compress(initCodeSize + 1, outs);
    outs.writeByte(0);
  }
  function flush_char(outs) {
    if (a_count > 0) {
      outs.writeByte(a_count);
      outs.writeBytes(accum, 0, a_count);
      a_count = 0;
    }
  }
  function MAXCODE(n_bits2) {
    return (1 << n_bits2) - 1;
  }
  function nextPixel() {
    if (remaining === 0)
      return EOF;
    --remaining;
    var pix = pixels[curPixel++];
    return pix & 255;
  }
  function output(code, outs) {
    cur_accum &= masks[cur_bits];
    if (cur_bits > 0)
      cur_accum |= code << cur_bits;
    else
      cur_accum = code;
    cur_bits += n_bits;
    while (cur_bits >= 8) {
      char_out(cur_accum & 255, outs);
      cur_accum >>= 8;
      cur_bits -= 8;
    }
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        maxcode = MAXCODE(n_bits = g_init_bits);
        clear_flg = false;
      } else {
        ++n_bits;
        if (n_bits == BITS)
          maxcode = 1 << BITS;
        else
          maxcode = MAXCODE(n_bits);
      }
    }
    if (code == EOFCode) {
      while (cur_bits > 0) {
        char_out(cur_accum & 255, outs);
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      flush_char(outs);
    }
  }
  this.encode = encode;
}
function ByteArray() {
  this.page = -1;
  this.pages = [];
  this.newPage();
}
ByteArray.pageSize = 4096;
ByteArray.charMap = {};
for (var i = 0; i < 256; i++)
  ByteArray.charMap[i] = String.fromCharCode(i);
ByteArray.prototype.newPage = function() {
  this.pages[++this.page] = new Uint8Array(ByteArray.pageSize);
  this.cursor = 0;
};
ByteArray.prototype.getData = function() {
  var rv = "";
  for (var p = 0; p < this.pages.length; p++) {
    for (var i = 0; i < ByteArray.pageSize; i++) {
      rv += ByteArray.charMap[this.pages[p][i]];
    }
  }
  return rv;
};
ByteArray.prototype.toFlattenUint8Array = function() {
  const chunks = [];
  for (var p = 0; p < this.pages.length; p++) {
    if (p === this.pages.length - 1) {
      const chunk = Uint8Array.from(this.pages[p].slice(0, this.cursor));
      chunks.push(chunk);
    } else {
      chunks.push(this.pages[p]);
    }
  }
  const flatten = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  chunks.reduce((lastLength, chunk) => {
    flatten.set(chunk, lastLength);
    return lastLength + chunk.length;
  }, 0);
  return flatten;
};
ByteArray.prototype.writeByte = function(val) {
  if (this.cursor >= ByteArray.pageSize)
    this.newPage();
  this.pages[this.page][this.cursor++] = val;
};
ByteArray.prototype.writeUTFBytes = function(string) {
  for (var l = string.length, i = 0; i < l; i++)
    this.writeByte(string.charCodeAt(i));
};
ByteArray.prototype.writeBytes = function(array, offset, length) {
  for (var l = length || array.length, i = offset || 0; i < l; i++)
    this.writeByte(array[i]);
};
function GIFEncoder(width, height) {
  this.width = ~~width;
  this.height = ~~height;
  this.transparent = null;
  this.transIndex = 0;
  this.repeat = -1;
  this.delay = 0;
  this.image = null;
  this.pixels = null;
  this.indexedPixels = null;
  this.colorDepth = null;
  this.colorTab = null;
  this.neuQuant = null;
  this.usedEntry = new Array();
  this.palSize = 7;
  this.dispose = -1;
  this.firstFrame = true;
  this.sample = 10;
  this.dither = false;
  this.globalPalette = false;
  this.out = new ByteArray();
}
GIFEncoder.prototype.setDelay = function(milliseconds) {
  this.delay = Math.round(milliseconds / 10);
};
GIFEncoder.prototype.setFrameRate = function(fps) {
  this.delay = Math.round(100 / fps);
};
GIFEncoder.prototype.setDispose = function(disposalCode) {
  if (disposalCode >= 0)
    this.dispose = disposalCode;
};
GIFEncoder.prototype.setRepeat = function(repeat) {
  this.repeat = repeat;
};
GIFEncoder.prototype.setTransparent = function(color) {
  this.transparent = color;
};
GIFEncoder.prototype.addFrame = function(imageData) {
  this.image = imageData;
  this.colorTab = this.globalPalette && this.globalPalette.slice ? this.globalPalette : null;
  this.getImagePixels();
  this.analyzePixels();
  if (this.globalPalette === true)
    this.globalPalette = this.colorTab;
  if (this.firstFrame) {
    this.writeHeader();
    this.writeLSD();
    this.writePalette();
    if (this.repeat >= 0) {
      this.writeNetscapeExt();
    }
  }
  this.writeGraphicCtrlExt();
  this.writeImageDesc();
  if (!this.firstFrame && !this.globalPalette)
    this.writePalette();
  this.writePixels();
  this.firstFrame = false;
};
GIFEncoder.prototype.finish = function() {
  this.out.writeByte(59);
};
GIFEncoder.prototype.setQuality = function(quality) {
  if (quality < 1)
    quality = 1;
  this.sample = quality;
};
GIFEncoder.prototype.setDither = function(dither) {
  if (dither === true)
    dither = "FloydSteinberg";
  this.dither = dither;
};
GIFEncoder.prototype.setGlobalPalette = function(palette) {
  this.globalPalette = palette;
};
GIFEncoder.prototype.getGlobalPalette = function() {
  return this.globalPalette && this.globalPalette.slice && this.globalPalette.slice(0) || this.globalPalette;
};
GIFEncoder.prototype.writeHeader = function() {
  this.out.writeUTFBytes("GIF89a");
};
GIFEncoder.prototype.analyzePixels = function() {
  if (!this.colorTab) {
    this.neuQuant = new NeuQuant(this.pixels, this.sample);
    this.neuQuant.buildColormap();
    this.colorTab = this.neuQuant.getColormap();
  }
  if (this.dither) {
    this.ditherPixels(this.dither.replace("-serpentine", ""), this.dither.match(/-serpentine/) !== null);
  } else {
    this.indexPixels();
  }
  this.pixels = null;
  this.colorDepth = 8;
  this.palSize = 7;
  if (this.transparent !== null) {
    this.transIndex = this.findClosest(this.transparent, true);
  }
};
GIFEncoder.prototype.indexPixels = function(imgq) {
  var nPix = this.pixels.length / 3;
  this.indexedPixels = new Uint8Array(nPix);
  var k = 0;
  for (var j = 0; j < nPix; j++) {
    var index = this.findClosestRGB(this.pixels[k++] & 255, this.pixels[k++] & 255, this.pixels[k++] & 255);
    this.usedEntry[index] = true;
    this.indexedPixels[j] = index;
  }
};
GIFEncoder.prototype.ditherPixels = function(kernel, serpentine) {
  var kernels = {
    FalseFloydSteinberg: [
      [3 / 8, 1, 0],
      [3 / 8, 0, 1],
      [2 / 8, 1, 1]
    ],
    FloydSteinberg: [
      [7 / 16, 1, 0],
      [3 / 16, -1, 1],
      [5 / 16, 0, 1],
      [1 / 16, 1, 1]
    ],
    Stucki: [
      [8 / 42, 1, 0],
      [4 / 42, 2, 0],
      [2 / 42, -2, 1],
      [4 / 42, -1, 1],
      [8 / 42, 0, 1],
      [4 / 42, 1, 1],
      [2 / 42, 2, 1],
      [1 / 42, -2, 2],
      [2 / 42, -1, 2],
      [4 / 42, 0, 2],
      [2 / 42, 1, 2],
      [1 / 42, 2, 2]
    ],
    Atkinson: [
      [1 / 8, 1, 0],
      [1 / 8, 2, 0],
      [1 / 8, -1, 1],
      [1 / 8, 0, 1],
      [1 / 8, 1, 1],
      [1 / 8, 0, 2]
    ]
  };
  if (!kernel || !kernels[kernel]) {
    throw "Unknown dithering kernel: " + kernel;
  }
  var ds = kernels[kernel];
  var index = 0, height = this.height, width = this.width, data = this.pixels;
  var direction = serpentine ? -1 : 1;
  this.indexedPixels = new Uint8Array(this.pixels.length / 3);
  for (var y = 0; y < height; y++) {
    if (serpentine)
      direction = direction * -1;
    for (var x = direction == 1 ? 0 : width - 1, xend = direction == 1 ? width : 0; x !== xend; x += direction) {
      index = y * width + x;
      var idx = index * 3;
      var r1 = data[idx];
      var g1 = data[idx + 1];
      var b1 = data[idx + 2];
      idx = this.findClosestRGB(r1, g1, b1);
      this.usedEntry[idx] = true;
      this.indexedPixels[index] = idx;
      idx *= 3;
      var r2 = this.colorTab[idx];
      var g2 = this.colorTab[idx + 1];
      var b2 = this.colorTab[idx + 2];
      var er = r1 - r2;
      var eg = g1 - g2;
      var eb = b1 - b2;
      for (var i = direction == 1 ? 0 : ds.length - 1, end = direction == 1 ? ds.length : 0; i !== end; i += direction) {
        var x1 = ds[i][1];
        var y1 = ds[i][2];
        if (x1 + x >= 0 && x1 + x < width && y1 + y >= 0 && y1 + y < height) {
          var d = ds[i][0];
          idx = index + x1 + y1 * width;
          idx *= 3;
          data[idx] = Math.max(0, Math.min(255, data[idx] + er * d));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + eg * d));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + eb * d));
        }
      }
    }
  }
};
GIFEncoder.prototype.findClosest = function(c, used) {
  return this.findClosestRGB((c & 16711680) >> 16, (c & 65280) >> 8, c & 255, used);
};
GIFEncoder.prototype.findClosestRGB = function(r, g, b, used) {
  if (this.colorTab === null)
    return -1;
  if (this.neuQuant && !used) {
    return this.neuQuant.lookupRGB(r, g, b);
  }
  var minpos = 0;
  var dmin = 256 * 256 * 256;
  var len = this.colorTab.length;
  for (var i = 0, index = 0; i < len; index++) {
    var dr = r - (this.colorTab[i++] & 255);
    var dg = g - (this.colorTab[i++] & 255);
    var db = b - (this.colorTab[i++] & 255);
    var d = dr * dr + dg * dg + db * db;
    if ((!used || this.usedEntry[index]) && d < dmin) {
      dmin = d;
      minpos = index;
    }
  }
  return minpos;
};
GIFEncoder.prototype.getImagePixels = function() {
  var w = this.width;
  var h = this.height;
  this.pixels = new Uint8Array(w * h * 3);
  var data = this.image;
  var srcPos = 0;
  var count = 0;
  for (var i = 0; i < h; i++) {
    for (var j = 0; j < w; j++) {
      this.pixels[count++] = data[srcPos++];
      this.pixels[count++] = data[srcPos++];
      this.pixels[count++] = data[srcPos++];
      srcPos++;
    }
  }
};
GIFEncoder.prototype.writeGraphicCtrlExt = function() {
  this.out.writeByte(33);
  this.out.writeByte(249);
  this.out.writeByte(4);
  var transp, disp;
  if (this.transparent === null) {
    transp = 0;
    disp = 0;
  } else {
    transp = 1;
    disp = 2;
  }
  if (this.dispose >= 0) {
    disp = this.dispose & 7;
  }
  disp <<= 2;
  this.out.writeByte(
    0 | disp | 0 | transp
  );
  this.writeShort(this.delay);
  this.out.writeByte(this.transIndex);
  this.out.writeByte(0);
};
GIFEncoder.prototype.writeImageDesc = function() {
  this.out.writeByte(44);
  this.writeShort(0);
  this.writeShort(0);
  this.writeShort(this.width);
  this.writeShort(this.height);
  if (this.firstFrame || this.globalPalette) {
    this.out.writeByte(0);
  } else {
    this.out.writeByte(
      128 | 0 | 0 | 0 | this.palSize
    );
  }
};
GIFEncoder.prototype.writeLSD = function() {
  this.writeShort(this.width);
  this.writeShort(this.height);
  this.out.writeByte(
    128 | 112 | 0 | this.palSize
  );
  this.out.writeByte(0);
  this.out.writeByte(0);
};
GIFEncoder.prototype.writeNetscapeExt = function() {
  this.out.writeByte(33);
  this.out.writeByte(255);
  this.out.writeByte(11);
  this.out.writeUTFBytes("NETSCAPE2.0");
  this.out.writeByte(3);
  this.out.writeByte(1);
  this.writeShort(this.repeat);
  this.out.writeByte(0);
};
GIFEncoder.prototype.writePalette = function() {
  this.out.writeBytes(this.colorTab);
  var n = 3 * 256 - this.colorTab.length;
  for (var i = 0; i < n; i++)
    this.out.writeByte(0);
};
GIFEncoder.prototype.writeShort = function(pValue) {
  this.out.writeByte(pValue & 255);
  this.out.writeByte(pValue >> 8 & 255);
};
GIFEncoder.prototype.writePixels = function() {
  var enc = new LZWEncoder(this.width, this.height, this.indexedPixels, this.colorDepth);
  enc.encode(this.out);
};
GIFEncoder.prototype.stream = function() {
  return this.out;
};
const defaultScale = 0.4;
const _AwesomeQR = class {
  constructor(options) {
    const _options = Object.assign({}, options);
    Object.keys(_AwesomeQR.defaultOptions).forEach((k) => {
      if (!(k in _options)) {
        Object.defineProperty(_options, k, { value: _AwesomeQR.defaultOptions[k], enumerable: true, writable: true });
      }
    });
    if (!_options.components) {
      _options.components = _AwesomeQR.defaultComponentOptions;
    } else if (typeof _options.components === "object") {
      Object.keys(_AwesomeQR.defaultComponentOptions).forEach((k) => {
        if (!(k in _options.components)) {
          Object.defineProperty(_options.components, k, {
            value: _AwesomeQR.defaultComponentOptions[k],
            enumerable: true,
            writable: true
          });
        } else {
          Object.defineProperty(_options.components, k, {
            value: { ..._AwesomeQR.defaultComponentOptions[k], ..._options.components[k] },
            enumerable: true,
            writable: true
          });
        }
      });
    }
    if (_options.dotScale !== null && _options.dotScale !== void 0) {
      if (_options.dotScale <= 0 || _options.dotScale > 1) {
        throw new Error("dotScale should be in range (0, 1].");
      }
      _options.components.data.scale = _options.dotScale;
      _options.components.timing.scale = _options.dotScale;
      _options.components.alignment.scale = _options.dotScale;
    }
    this.options = _options;
    this.canvas = createCanvas(options.size, options.size);
    this.canvasContext = this.canvas.getContext("2d");
    this.qrCode = new QRCodeModel(-1, this.options.correctLevel);
    if (Number.isInteger(this.options.maskPattern)) {
      this.qrCode.maskPattern = this.options.maskPattern;
    }
    if (Number.isInteger(this.options.version)) {
      this.qrCode.typeNumber = this.options.version;
    }
    this.qrCode.addData(this.options.text);
    this.qrCode.make();
  }
  draw() {
    return new Promise((resolve) => this._draw().then(resolve));
  }
  _clear() {
    this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  static _prepareRoundedCornerClip(canvasContext, x, y, w, h, r) {
    canvasContext.beginPath();
    canvasContext.moveTo(x, y);
    canvasContext.arcTo(x + w, y, x + w, y + h, r);
    canvasContext.arcTo(x + w, y + h, x, y + h, r);
    canvasContext.arcTo(x, y + h, x, y, r);
    canvasContext.arcTo(x, y, x + w, y, r);
    canvasContext.closePath();
  }
  static _getAverageRGB(image) {
    const blockSize = 5;
    const defaultRGB = {
      r: 0,
      g: 0,
      b: 0
    };
    let width, height;
    let i = -4;
    const rgb = {
      r: 0,
      g: 0,
      b: 0
    };
    let count = 0;
    height = image.naturalHeight || image.height;
    width = image.naturalWidth || image.width;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      return defaultRGB;
    }
    context.drawImage(image, 0, 0);
    let data;
    try {
      data = context.getImageData(0, 0, width, height);
    } catch (e) {
      return defaultRGB;
    }
    while ((i += blockSize * 4) < data.data.length) {
      if (data.data[i] > 200 || data.data[i + 1] > 200 || data.data[i + 2] > 200)
        continue;
      ++count;
      rgb.r += data.data[i];
      rgb.g += data.data[i + 1];
      rgb.b += data.data[i + 2];
    }
    rgb.r = ~~(rgb.r / count);
    rgb.g = ~~(rgb.g / count);
    rgb.b = ~~(rgb.b / count);
    return rgb;
  }
  static _drawDot(canvasContext, centerX, centerY, nSize, xyOffset = 0, dotScale = 1) {
    canvasContext.fillRect(
      (centerX + xyOffset) * nSize,
      (centerY + xyOffset) * nSize,
      dotScale * nSize,
      dotScale * nSize
    );
  }
  static _drawAlignProtector(canvasContext, centerX, centerY, nSize) {
    canvasContext.clearRect((centerX - 2) * nSize, (centerY - 2) * nSize, 5 * nSize, 5 * nSize);
    canvasContext.fillRect((centerX - 2) * nSize, (centerY - 2) * nSize, 5 * nSize, 5 * nSize);
  }
  static _drawAlign(canvasContext, centerX, centerY, nSize, xyOffset = 0, dotScale = 1, colorDark, hasProtector) {
    const oldFillStyle = canvasContext.fillStyle;
    canvasContext.fillStyle = colorDark;
    new Array(4).fill(0).map((_, i) => {
      _AwesomeQR._drawDot(canvasContext, centerX - 2 + i, centerY - 2, nSize, xyOffset, dotScale);
      _AwesomeQR._drawDot(canvasContext, centerX + 2, centerY - 2 + i, nSize, xyOffset, dotScale);
      _AwesomeQR._drawDot(canvasContext, centerX + 2 - i, centerY + 2, nSize, xyOffset, dotScale);
      _AwesomeQR._drawDot(canvasContext, centerX - 2, centerY + 2 - i, nSize, xyOffset, dotScale);
    });
    _AwesomeQR._drawDot(canvasContext, centerX, centerY, nSize, xyOffset, dotScale);
    if (!hasProtector) {
      canvasContext.fillStyle = "rgba(255, 255, 255, 0.6)";
      new Array(2).fill(0).map((_, i) => {
        _AwesomeQR._drawDot(canvasContext, centerX - 1 + i, centerY - 1, nSize, xyOffset, dotScale);
        _AwesomeQR._drawDot(canvasContext, centerX + 1, centerY - 1 + i, nSize, xyOffset, dotScale);
        _AwesomeQR._drawDot(canvasContext, centerX + 1 - i, centerY + 1, nSize, xyOffset, dotScale);
        _AwesomeQR._drawDot(canvasContext, centerX - 1, centerY + 1 - i, nSize, xyOffset, dotScale);
      });
    }
    canvasContext.fillStyle = oldFillStyle;
  }
  async _draw() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
    const nCount = (_a = this.qrCode) == null ? void 0 : _a.moduleCount;
    const rawSize = this.options.size;
    let rawMargin = this.options.margin;
    if (rawMargin < 0 || rawMargin * 2 >= rawSize) {
      rawMargin = 0;
    }
    const margin = Math.ceil(rawMargin);
    const rawViewportSize = rawSize - 2 * rawMargin;
    const whiteMargin = this.options.whiteMargin;
    const backgroundDimming = this.options.backgroundDimming;
    const nSize = Math.ceil(rawViewportSize / nCount);
    const viewportSize = nSize * nCount;
    const size = viewportSize + 2 * margin;
    const mainCanvas = createCanvas(size, size);
    const mainCanvasContext = mainCanvas.getContext("2d");
    this._clear();
    mainCanvasContext.save();
    mainCanvasContext.translate(margin, margin);
    const backgroundCanvas = createCanvas(size, size);
    const backgroundCanvasContext = backgroundCanvas.getContext("2d");
    let parsedGIFBackground = null;
    let gifFrames = [];
    if (!!this.options.gifBackground) {
      const gif = parseGIF(this.options.gifBackground);
      parsedGIFBackground = gif;
      gifFrames = decompressFrames(gif, true);
      if (this.options.autoColor) {
        let r = 0, g = 0, b = 0;
        let count = 0;
        for (let i = 0; i < gifFrames[0].colorTable.length; i++) {
          const c = gifFrames[0].colorTable[i];
          if (c[0] > 200 || c[1] > 200 || c[2] > 200)
            continue;
          if (c[0] === 0 && c[1] === 0 && c[2] === 0)
            continue;
          count++;
          r += c[0];
          g += c[1];
          b += c[2];
        }
        r = ~~(r / count);
        g = ~~(g / count);
        b = ~~(b / count);
        this.options.colorDark = `rgb(${r},${g},${b})`;
      }
    } else if (!!this.options.backgroundImage) {
      const backgroundImage = await loadImage(this.options.backgroundImage);
      if (this.options.autoColor) {
        const avgRGB = _AwesomeQR._getAverageRGB(backgroundImage);
        this.options.colorDark = `rgb(${avgRGB.r},${avgRGB.g},${avgRGB.b})`;
      }
      backgroundCanvasContext.drawImage(
        backgroundImage,
        0,
        0,
        backgroundImage.width,
        backgroundImage.height,
        0,
        0,
        size,
        size
      );
      backgroundCanvasContext.rect(0, 0, size, size);
      backgroundCanvasContext.fillStyle = backgroundDimming;
      backgroundCanvasContext.fill();
    } else {
      backgroundCanvasContext.rect(0, 0, size, size);
      backgroundCanvasContext.fillStyle = this.options.colorLight;
      backgroundCanvasContext.fill();
    }
    const alignmentPatternCenters = QRUtil.getPatternPosition(this.qrCode.typeNumber);
    const dataScale = ((_c = (_b = this.options.components) == null ? void 0 : _b.data) == null ? void 0 : _c.scale) || defaultScale;
    const dataXyOffset = (1 - dataScale) * 0.5;
    for (let row = 0; row < nCount; row++) {
      for (let col = 0; col < nCount; col++) {
        const bIsDark = this.qrCode.isDark(row, col);
        const isBlkPosCtr = col < 8 && (row < 8 || row >= nCount - 8) || col >= nCount - 8 && row < 8;
        const isTiming = row == 6 && col >= 8 && col <= nCount - 8 || col == 6 && row >= 8 && row <= nCount - 8;
        let isProtected = isBlkPosCtr || isTiming;
        for (let i = 1; i < alignmentPatternCenters.length - 1; i++) {
          isProtected = isProtected || row >= alignmentPatternCenters[i] - 2 && row <= alignmentPatternCenters[i] + 2 && col >= alignmentPatternCenters[i] - 2 && col <= alignmentPatternCenters[i] + 2;
        }
        const nLeft = col * nSize + (isProtected ? 0 : dataXyOffset * nSize);
        const nTop = row * nSize + (isProtected ? 0 : dataXyOffset * nSize);
        mainCanvasContext.strokeStyle = bIsDark ? this.options.colorDark : this.options.colorLight;
        mainCanvasContext.lineWidth = 0.5;
        mainCanvasContext.fillStyle = bIsDark ? this.options.colorDark : "rgba(255, 255, 255, 0.6)";
        if (alignmentPatternCenters.length === 0) {
          if (!isProtected) {
            mainCanvasContext.fillRect(
              nLeft,
              nTop,
              (isProtected ? isBlkPosCtr ? 1 : 1 : dataScale) * nSize,
              (isProtected ? isBlkPosCtr ? 1 : 1 : dataScale) * nSize
            );
          }
        } else {
          const inAgnRange = col < nCount - 4 && col >= nCount - 4 - 5 && row < nCount - 4 && row >= nCount - 4 - 5;
          if (!isProtected && !inAgnRange) {
            mainCanvasContext.fillRect(
              nLeft,
              nTop,
              (isProtected ? isBlkPosCtr ? 1 : 1 : dataScale) * nSize,
              (isProtected ? isBlkPosCtr ? 1 : 1 : dataScale) * nSize
            );
          }
        }
      }
    }
    const cornerAlignmentCenter = alignmentPatternCenters[alignmentPatternCenters.length - 1];
    const protectorStyle = "rgba(255, 255, 255, 0.6)";
    mainCanvasContext.fillStyle = protectorStyle;
    mainCanvasContext.fillRect(0, 0, 8 * nSize, 8 * nSize);
    mainCanvasContext.fillRect(0, (nCount - 8) * nSize, 8 * nSize, 8 * nSize);
    mainCanvasContext.fillRect((nCount - 8) * nSize, 0, 8 * nSize, 8 * nSize);
    if ((_e = (_d = this.options.components) == null ? void 0 : _d.timing) == null ? void 0 : _e.protectors) {
      mainCanvasContext.fillRect(8 * nSize, 6 * nSize, (nCount - 8 - 8) * nSize, nSize);
      mainCanvasContext.fillRect(6 * nSize, 8 * nSize, nSize, (nCount - 8 - 8) * nSize);
    }
    if ((_g = (_f = this.options.components) == null ? void 0 : _f.cornerAlignment) == null ? void 0 : _g.protectors) {
      _AwesomeQR._drawAlignProtector(mainCanvasContext, cornerAlignmentCenter, cornerAlignmentCenter, nSize);
    }
    if ((_i = (_h = this.options.components) == null ? void 0 : _h.alignment) == null ? void 0 : _i.protectors) {
      for (let i = 0; i < alignmentPatternCenters.length; i++) {
        for (let j = 0; j < alignmentPatternCenters.length; j++) {
          const agnX = alignmentPatternCenters[j];
          const agnY = alignmentPatternCenters[i];
          if (agnX === 6 && (agnY === 6 || agnY === cornerAlignmentCenter)) {
            continue;
          } else if (agnY === 6 && (agnX === 6 || agnX === cornerAlignmentCenter)) {
            continue;
          } else if (agnX === cornerAlignmentCenter && agnY === cornerAlignmentCenter) {
            continue;
          } else {
            _AwesomeQR._drawAlignProtector(mainCanvasContext, agnX, agnY, nSize);
          }
        }
      }
    }
    mainCanvasContext.fillStyle = this.options.colorDark;
    mainCanvasContext.fillRect(0, 0, 7 * nSize, nSize);
    mainCanvasContext.fillRect((nCount - 7) * nSize, 0, 7 * nSize, nSize);
    mainCanvasContext.fillRect(0, 6 * nSize, 7 * nSize, nSize);
    mainCanvasContext.fillRect((nCount - 7) * nSize, 6 * nSize, 7 * nSize, nSize);
    mainCanvasContext.fillRect(0, (nCount - 7) * nSize, 7 * nSize, nSize);
    mainCanvasContext.fillRect(0, (nCount - 7 + 6) * nSize, 7 * nSize, nSize);
    mainCanvasContext.fillRect(0, 0, nSize, 7 * nSize);
    mainCanvasContext.fillRect(6 * nSize, 0, nSize, 7 * nSize);
    mainCanvasContext.fillRect((nCount - 7) * nSize, 0, nSize, 7 * nSize);
    mainCanvasContext.fillRect((nCount - 7 + 6) * nSize, 0, nSize, 7 * nSize);
    mainCanvasContext.fillRect(0, (nCount - 7) * nSize, nSize, 7 * nSize);
    mainCanvasContext.fillRect(6 * nSize, (nCount - 7) * nSize, nSize, 7 * nSize);
    mainCanvasContext.fillRect(2 * nSize, 2 * nSize, 3 * nSize, 3 * nSize);
    mainCanvasContext.fillRect((nCount - 7 + 2) * nSize, 2 * nSize, 3 * nSize, 3 * nSize);
    mainCanvasContext.fillRect(2 * nSize, (nCount - 7 + 2) * nSize, 3 * nSize, 3 * nSize);
    const timingScale = ((_k = (_j = this.options.components) == null ? void 0 : _j.timing) == null ? void 0 : _k.scale) || defaultScale;
    const timingXyOffset = (1 - timingScale) * 0.5;
    for (let i = 0; i < nCount - 8; i += 2) {
      _AwesomeQR._drawDot(mainCanvasContext, 8 + i, 6, nSize, timingXyOffset, timingScale);
      _AwesomeQR._drawDot(mainCanvasContext, 6, 8 + i, nSize, timingXyOffset, timingScale);
    }
    const cornerAlignmentScale = ((_m = (_l = this.options.components) == null ? void 0 : _l.cornerAlignment) == null ? void 0 : _m.scale) || defaultScale;
    const cornerAlignmentXyOffset = (1 - cornerAlignmentScale) * 0.5;
    _AwesomeQR._drawAlign(
      mainCanvasContext,
      cornerAlignmentCenter,
      cornerAlignmentCenter,
      nSize,
      cornerAlignmentXyOffset,
      cornerAlignmentScale,
      this.options.colorDark,
      ((_o = (_n = this.options.components) == null ? void 0 : _n.cornerAlignment) == null ? void 0 : _o.protectors) || false
    );
    const alignmentScale = ((_q = (_p = this.options.components) == null ? void 0 : _p.alignment) == null ? void 0 : _q.scale) || defaultScale;
    const alignmentXyOffset = (1 - alignmentScale) * 0.5;
    for (let i = 0; i < alignmentPatternCenters.length; i++) {
      for (let j = 0; j < alignmentPatternCenters.length; j++) {
        const agnX = alignmentPatternCenters[j];
        const agnY = alignmentPatternCenters[i];
        if (agnX === 6 && (agnY === 6 || agnY === cornerAlignmentCenter)) {
          continue;
        } else if (agnY === 6 && (agnX === 6 || agnX === cornerAlignmentCenter)) {
          continue;
        } else if (agnX === cornerAlignmentCenter && agnY === cornerAlignmentCenter) {
          continue;
        } else {
          _AwesomeQR._drawAlign(
            mainCanvasContext,
            agnX,
            agnY,
            nSize,
            alignmentXyOffset,
            alignmentScale,
            this.options.colorDark,
            ((_s = (_r = this.options.components) == null ? void 0 : _r.alignment) == null ? void 0 : _s.protectors) || false
          );
        }
      }
    }
    if (whiteMargin) {
      mainCanvasContext.fillStyle = "#FFFFFF";
      mainCanvasContext.fillRect(-margin, -margin, size, margin);
      mainCanvasContext.fillRect(-margin, viewportSize, size, margin);
      mainCanvasContext.fillRect(viewportSize, -margin, margin, size);
      mainCanvasContext.fillRect(-margin, -margin, margin, size);
    }
    if (!!this.options.logoImage) {
      const logoImage = await loadImage(this.options.logoImage);
      let logoScale = this.options.logoScale;
      let logoMargin = this.options.logoMargin;
      let logoCornerRadius = this.options.logoCornerRadius;
      if (logoScale <= 0 || logoScale >= 1) {
        logoScale = 0.2;
      }
      if (logoMargin < 0) {
        logoMargin = 0;
      }
      if (logoCornerRadius < 0) {
        logoCornerRadius = 0;
      }
      const logoSize = viewportSize * logoScale;
      const x = 0.5 * (size - logoSize);
      const y = x;
      mainCanvasContext.restore();
      mainCanvasContext.fillStyle = "#FFFFFF";
      mainCanvasContext.save();
      _AwesomeQR._prepareRoundedCornerClip(
        mainCanvasContext,
        x - logoMargin,
        y - logoMargin,
        logoSize + 2 * logoMargin,
        logoSize + 2 * logoMargin,
        logoCornerRadius + logoMargin
      );
      mainCanvasContext.clip();
      const oldGlobalCompositeOperation = mainCanvasContext.globalCompositeOperation;
      mainCanvasContext.globalCompositeOperation = "destination-out";
      mainCanvasContext.fill();
      mainCanvasContext.globalCompositeOperation = oldGlobalCompositeOperation;
      mainCanvasContext.restore();
      mainCanvasContext.save();
      _AwesomeQR._prepareRoundedCornerClip(mainCanvasContext, x, y, logoSize, logoSize, logoCornerRadius);
      mainCanvasContext.clip();
      mainCanvasContext.drawImage(logoImage, x, y, logoSize, logoSize);
      mainCanvasContext.restore();
      mainCanvasContext.save();
      mainCanvasContext.translate(margin, margin);
    }
    if (!!parsedGIFBackground) {
      let gifOutput;
      let backgroundCanvas2;
      let backgroundCanvasContext2;
      let patchCanvas;
      let patchCanvasContext;
      let patchData;
      gifFrames.forEach(function(frame) {
        if (!gifOutput) {
          gifOutput = new GIFEncoder(rawSize, rawSize);
          gifOutput.setDelay(frame.delay);
          gifOutput.setRepeat(0);
        }
        const { width, height } = frame.dims;
        if (!backgroundCanvas2) {
          backgroundCanvas2 = createCanvas(width, height);
          backgroundCanvasContext2 = backgroundCanvas2.getContext("2d");
          backgroundCanvasContext2.rect(0, 0, backgroundCanvas2.width, backgroundCanvas2.height);
          backgroundCanvasContext2.fillStyle = "#ffffff";
          backgroundCanvasContext2.fill();
        }
        if (!patchCanvas || !patchData || width !== patchCanvas.width || height !== patchCanvas.height) {
          patchCanvas = createCanvas(width, height);
          patchCanvasContext = patchCanvas.getContext("2d");
          patchData = patchCanvasContext.createImageData(width, height);
        }
        patchData.data.set(frame.patch);
        patchCanvasContext.putImageData(patchData, 0, 0);
        backgroundCanvasContext2.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
        const unscaledCanvas = createCanvas(size, size);
        const unscaledCanvasContext = unscaledCanvas.getContext("2d");
        unscaledCanvasContext.drawImage(backgroundCanvas2, 0, 0, size, size);
        unscaledCanvasContext.rect(0, 0, size, size);
        unscaledCanvasContext.fillStyle = backgroundDimming;
        unscaledCanvasContext.fill();
        unscaledCanvasContext.drawImage(mainCanvas, 0, 0, size, size);
        const outCanvas = createCanvas(rawSize, rawSize);
        const outCanvasContext = outCanvas.getContext("2d");
        outCanvasContext.drawImage(unscaledCanvas, 0, 0, rawSize, rawSize);
        gifOutput.addFrame(outCanvasContext.getImageData(0, 0, outCanvas.width, outCanvas.height).data);
      });
      if (!gifOutput) {
        throw new Error("No frames.");
      }
      gifOutput.finish();
      if (isElement(this.canvas)) {
        const u8array = gifOutput.stream().toFlattenUint8Array();
        const binary = u8array.reduce((bin, u8) => bin + String.fromCharCode(u8), "");
        return Promise.resolve(`data:image/gif;base64,${window.btoa(binary)}`);
      }
      return Promise.resolve(Buffer.from(gifOutput.stream().toFlattenUint8Array()));
    } else {
      backgroundCanvasContext.drawImage(mainCanvas, 0, 0, size, size);
      mainCanvasContext.drawImage(backgroundCanvas, -margin, -margin, size, size);
      const outCanvas = createCanvas(rawSize, rawSize);
      const outCanvasContext = outCanvas.getContext("2d");
      outCanvasContext.drawImage(mainCanvas, 0, 0, rawSize, rawSize);
      this.canvas = outCanvas;
      if (isElement(this.canvas)) {
        return Promise.resolve(this.canvas.toDataURL());
      }
      return Promise.resolve(this.canvas.toBuffer());
    }
  }
};
let AwesomeQR = _AwesomeQR;
AwesomeQR.CorrectLevel = QRErrorCorrectLevel;
AwesomeQR.defaultComponentOptions = {
  data: {
    scale: 1
  },
  timing: {
    scale: 1,
    protectors: false
  },
  alignment: {
    scale: 1,
    protectors: false
  },
  cornerAlignment: {
    scale: 1,
    protectors: true
  }
};
AwesomeQR.defaultOptions = {
  text: "",
  size: 400,
  margin: 20,
  colorDark: "#000000",
  colorLight: "#ffffff",
  correctLevel: QRErrorCorrectLevel.M,
  backgroundImage: void 0,
  backgroundDimming: "rgba(0,0,0,0)",
  logoImage: void 0,
  logoScale: 0.2,
  logoMargin: 4,
  logoCornerRadius: 8,
  whiteMargin: true,
  components: _AwesomeQR.defaultComponentOptions,
  autoColor: true
};
function isElement(obj) {
  try {
    return obj instanceof HTMLElement;
  } catch (e) {
    return typeof obj === "object" && obj.nodeType === 1 && typeof obj.style === "object" && typeof obj.ownerDocument === "object";
  }
}
async function GET(params) {
  let { url } = params;
  let text = url.searchParams.get("text") ?? "AwesomeQR by Makito - Awesome, right now.";
  const buffer = await new AwesomeQR({
    text,
    size: 500
  }).draw();
  let resp = new Response(
    buffer
  );
  return resp;
}
const baseConfig = {
  text: "Hello world",
  size: 400,
  margin: 20,
  colorDark: "#181818",
  colorLight: "#ffffff",
  autoColor: true,
  backgroundImage: void 0,
  whiteMargin: true,
  logoImage: "https://crosssync.app/assets/favicon/apple-touch-icon.png",
  logoScale: 0.2,
  logoMargin: 6,
  logoCornerRadius: 8,
  dotScale: 0.4
};
async function POST(ev) {
  if (ev.request.headers.get("content-type").startsWith("application/x-www-form-urlencoded")) {
    const formData = await ev.request.formData();
    let data = {};
    for (const pair of formData.entries()) {
      data[pair[0]] = pair[1];
    }
    let QrData = { ...baseConfig, ...data };
    console.log(QrData);
    const buffer = await new AwesomeQR(QrData).draw();
    let resp = new Response(
      buffer
    );
    return resp;
  }
}
export {
  GET,
  POST
};
