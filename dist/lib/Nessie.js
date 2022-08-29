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
Object.defineProperty(exports, "__esModule", { value: true });
const oracledb_1 = require("oracledb");
class Nessie {
    constructor(configuration) {
        this.configuration = configuration;
        this._connection = null;
        this.models = {};
        if (!Nessie.initialized) {
            (0, oracledb_1.initOracleClient)(configuration);
            Nessie.initialized = true;
        }
    }
    get connection() {
        return this._connection;
    }
    addModels(...newModels) {
        newModels.forEach(model => this.models[model.name] = model);
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._connection === null) {
                this._connection = yield (0, oracledb_1.getConnection)(this.configuration);
                return true;
            }
            return false;
        });
    }
    execute(sql, bindParams = []) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            if (this.configuration.verbose) {
                console.info(`Executing: ${sql}`);
            }
            return this._connection.execute(sql, bindParams);
        });
    }
    executeMany(sql, bindParams) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            if (this.configuration.verbose) {
                console.info(`Executing Many: ${sql}`);
            }
            return this._connection.executeMany(sql, bindParams);
        });
    }
    sync(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const model in this.models) {
                yield this.models[model].sync(force);
            }
        });
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            return this._connection.commit();
        });
    }
}
exports.default = Nessie;
Nessie.initialized = false;
