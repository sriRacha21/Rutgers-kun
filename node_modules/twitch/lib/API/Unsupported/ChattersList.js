"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Cache_1 = require("../../Toolkit/Decorators/Cache");
var ArrayTools_1 = require("../../Toolkit/ArrayTools");
/**
 * A list of chatters in a Twitch chat.
 */
var ChattersList = /** @class */ (function () {
    /** @private */
    function ChattersList(_data) {
        this._data = _data;
    }
    Object.defineProperty(ChattersList.prototype, "allChatters", {
        /**
         * A list of user names of all chatters in the chat.
         */
        get: function () {
            return ArrayTools_1.flatten(Object.values(this._data.chatters));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChattersList.prototype, "allChattersWithStatus", {
        /**
         * A map of user names of all chatters in the chat, mapped to their status in the channel.
         */
        get: function () {
            return new Map(ArrayTools_1.flatten(Object.entries(this._data.chatters).map(function (_a) {
                var _b = tslib_1.__read(_a, 2), status = _b[0], names = _b[1];
                return names.map(function (name) { return [name, status]; });
            })));
        },
        enumerable: true,
        configurable: true
    });
    tslib_1.__decorate([
        Cache_1.CachedGetter()
    ], ChattersList.prototype, "allChatters", null);
    tslib_1.__decorate([
        Cache_1.CachedGetter()
    ], ChattersList.prototype, "allChattersWithStatus", null);
    ChattersList = tslib_1.__decorate([
        Cache_1.Cacheable
    ], ChattersList);
    return ChattersList;
}());
exports.default = ChattersList;
//# sourceMappingURL=ChattersList.js.map