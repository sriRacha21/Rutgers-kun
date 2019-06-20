"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ChatBadgeVersion_1 = require("./ChatBadgeVersion");
var NonEnumerable_1 = require("../../Toolkit/Decorators/NonEnumerable");
/**
 * A set of badges.
 */
var ChatBadgeSet = /** @class */ (function () {
    /** @private */
    function ChatBadgeSet(_data, client) {
        this._data = _data;
        this._client = client;
    }
    Object.defineProperty(ChatBadgeSet.prototype, "versionNames", {
        /**
         * Names of all versions of the badge set.
         */
        get: function () {
            return Object.keys(this._data.versions);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Gets a specific version of a badge by name.
     *
     * @param name The name of the version.
     */
    ChatBadgeSet.prototype.getVersion = function (name) {
        return new ChatBadgeVersion_1.default(this._data.versions[name], this._client);
    };
    tslib_1.__decorate([
        NonEnumerable_1.NonEnumerable
    ], ChatBadgeSet.prototype, "_client", void 0);
    return ChatBadgeSet;
}());
exports.default = ChatBadgeSet;
//# sourceMappingURL=ChatBadgeSet.js.map