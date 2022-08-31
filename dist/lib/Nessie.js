"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const oracledb_1 = require("oracledb");
const Model_1 = __importDefault(require("./Model"));
class Nessie {
    constructor(configuration) {
        this.configuration = configuration;
        this._pool = null;
        this.models = {};
        if (this.configuration.libDir && !Nessie.initialized) {
            (0, oracledb_1.initOracleClient)(configuration);
            Nessie.initialized = true;
        }
    }
    get pool() {
        return this._pool;
    }
    addModels(...newModels) {
        newModels.forEach(model => this.models[model.name] = model);
    }
    define(name, attributes, options) {
        const NewModel = Object.defineProperty(class extends Model_1.default {
        }, "name", { value: name });
        NewModel.init(attributes, Object.assign(Object.assign({}, options), { nessie: this }));
        return NewModel;
    }
    initPool() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._pool === null) {
                this._pool = yield (0, oracledb_1.createPool)(this.configuration);
                return true;
            }
            return false;
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPool();
            return this._pool.getConnection();
        });
    }
    execute(sql, bindParams = [], commit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.connect();
            try {
                if (this.configuration.verbose) {
                    console.info(`Executing: ${sql}`);
                }
                const result = yield connection.execute(sql, bindParams);
                if (commit) {
                    yield connection.commit();
                }
                yield connection.close();
                return result;
            }
            catch (err) {
                yield connection.close();
                throw err;
            }
        });
    }
    executeMany(sql, bindParams, commit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.connect();
            try {
                if (this.configuration.verbose) {
                    console.info(`Executing Many: ${sql}`);
                }
                const result = yield connection.executeMany(sql, bindParams);
                if (commit) {
                    yield connection.commit();
                }
                yield connection.close();
                return result;
            }
            catch (err) {
                yield connection.close();
                throw err;
            }
        });
    }
    sync(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const sortedModels = Object
                .values(this.models)
                .sort((a, b) => a.parentTableCount - b.parentTableCount);
            for (const model of sortedModels) {
                yield model.sync(force);
            }
        });
    }
    close(drainTime) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            yield (isNaN(drainTime) ? (_a = this._pool) === null || _a === void 0 ? void 0 : _a.close() : (_b = this._pool) === null || _b === void 0 ? void 0 : _b.close(drainTime));
            this._pool = null;
        });
    }
}
exports.default = Nessie;
Nessie.initialized = false;
