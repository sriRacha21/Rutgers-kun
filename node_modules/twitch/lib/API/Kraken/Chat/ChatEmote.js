"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var NonEnumerable_1 = require("../../../Toolkit/Decorators/NonEnumerable");
/**
 * A chat emote.
 */
var ChatEmote = /** @class */ (function () {
    /** @private */
    function ChatEmote(_data, client) {
        this._data = _data;
        this._client = client;
    }
    Object.defineProperty(ChatEmote.prototype, "id", {
        /**
         * The emote ID.
         */
        get: function () {
            return this._data.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChatEmote.prototype, "code", {
        /**
         * The emote code, i.e. how you write it in chat.
         */
        get: function () {
            return this._data.code;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChatEmote.prototype, "setId", {
        /**
         * The ID of the emote set.
         */
        get: function () {
            return this._data.emoticon_set;
        },
        enumerable: true,
        configurable: true
    });
    tslib_1.__decorate([
        NonEnumerable_1.NonEnumerable
    ], ChatEmote.prototype, "_client", void 0);
    return ChatEmote;
}());
exports.default = ChatEmote;
//# sourceMappingURL=ChatEmote.js.map