"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelSyncError = exports.ModelInitError = void 0;
class ModelInitError extends Error {
    constructor(message) {
        super(message);
        this.name = "ModelInitError";
    }
}
exports.ModelInitError = ModelInitError;
class ModelSyncError extends Error {
    constructor(message) {
        super(message);
        this.name = "ModelSyncError";
    }
}
exports.ModelSyncError = ModelSyncError;
