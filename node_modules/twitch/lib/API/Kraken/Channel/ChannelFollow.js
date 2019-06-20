"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var User_1 = require("../User/User");
var NonEnumerable_1 = require("../../../Toolkit/Decorators/NonEnumerable");
/**
 * A relation of a user following a previously given channel.
 */
var ChannelFollow = /** @class */ (function () {
    /** @private */
    function ChannelFollow(_data, client) {
        this._data = _data;
        this._client = client;
    }
    Object.defineProperty(ChannelFollow.prototype, "user", {
        /**
         * The user following the given channel.
         */
        get: function () {
            return new User_1.default(this._data.user, this._client);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChannelFollow.prototype, "hasNotifications", {
        /**
         * Whether the user has notifications enabled for the channel.
         */
        get: function () {
            return this._data.notifications;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChannelFollow.prototype, "followDate", {
        /**
         * The date when the user followed.
         */
        get: function () {
            return new Date(this._data.created_at);
        },
        enumerable: true,
        configurable: true
    });
    tslib_1.__decorate([
        NonEnumerable_1.NonEnumerable
    ], ChannelFollow.prototype, "_client", void 0);
    return ChannelFollow;
}());
exports.default = ChannelFollow;
//# sourceMappingURL=ChannelFollow.js.map