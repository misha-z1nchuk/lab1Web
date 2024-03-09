'use strict';

exports.__esModule = true;

var _jsonPointer = require('json-pointer');

var _jsonPointer2 = _interopRequireDefault(_jsonPointer);

var _renameKeys = require('rename-keys');

var _renameKeys2 = _interopRequireDefault(_renameKeys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Exception extends Error {
    constructor(data) {
        super();
        if (!data.fields) throw new Error('FIELDS_REQUIRED');
        if (!data.code) throw new Error('MESSAGE_REQUIRED');

        const fields = _jsonPointer2.default.dict(data.fields);

        this.fields = (0, _renameKeys2.default)(fields, str => {
            return str.substr(1);
        });

        this.code = data.code;
        this.message = data.message;
    }

    toHash() {
        return {
            fields: this.fields,
            code: this.code
        };
    }
}
exports.default = Exception;