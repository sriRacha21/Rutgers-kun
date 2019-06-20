"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var NonEnumerable_1 = require("../../../Toolkit/Decorators/NonEnumerable");
/**
 * A game as displayed on Twitch.
 */
var HelixGame = /** @class */ (function () {
    /** @private */
    function HelixGame(_data, client) {
        this._data = _data;
        this._client = client;
    }
    Object.defineProperty(HelixGame.prototype, "id", {
        /**
         * The ID of the game.
         */
        get: function () {
            return this._data.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HelixGame.prototype, "name", {
        /**
         * The name of the game.
         */
        get: function () {
            return this._data.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HelixGame.prototype, "boxArtUrl", {
        /**
         * The URL of the box art of the game.
         */
        get: function () {
            return this._data.box_art_url;
        },
        enumerable: true,
        configurable: true
    });
    tslib_1.__decorate([
        NonEnumerable_1.NonEnumerable
    ], HelixGame.prototype, "_client", void 0);
    return HelixGame;
}());
exports.default = HelixGame;
//# sourceMappingURL=HelixGame.js.map