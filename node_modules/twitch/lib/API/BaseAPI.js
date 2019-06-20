"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var NonEnumerable_1 = require("../Toolkit/Decorators/NonEnumerable");
/** @private */
var BaseAPI = /** @class */ (function () {
    function BaseAPI(client) {
        this._client = client;
    }
    tslib_1.__decorate([
        NonEnumerable_1.NonEnumerable
    ], BaseAPI.prototype, "_client", void 0);
    return BaseAPI;
}());
exports.default = BaseAPI;
//# sourceMappingURL=BaseAPI.js.map