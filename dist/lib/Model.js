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
const Nessie_1 = __importDefault(require("./Nessie"));
const pluralize_1 = __importDefault(require("pluralize"));
const node_assert_1 = __importDefault(require("node:assert"));
const ModelError_1 = require("./errors/ModelError");
const Constants_1 = require("./utils/Constants");
class Model {
    constructor(metaData, row) {
        this._destroyed = false;
        this.dataValues = {};
        metaData.forEach((attributeMeta, i) => this.dataValues[attributeMeta.name] = row[i]);
    }
    static get tableName() {
        var _a;
        return (_a = this._tableName) !== null && _a !== void 0 ? _a : (0, pluralize_1.default)(upperCaseName(this.name));
    }
    static get primaryKeys() {
        if (this._attributes) {
            return Object
                .keys(this._attributes)
                .filter(key => this._attributes[key].primaryKey);
        }
        return [];
    }
    static get parentTableCount() {
        if (this._associations) {
            const parents = Object
                .values(this._associations)
                .filter((assocation) => assocation.source);
            return parents.length;
        }
        return 0;
    }
    get model() {
        return this.constructor;
    }
    get destroyed() {
        return this._destroyed;
    }
    get rowId() {
        return this.dataValues.ROWID;
    }
    static init(attributes, options) {
        var _a;
        this._nessie = options.nessie;
        this._tableName = (_a = options.tableName) !== null && _a !== void 0 ? _a : null;
        this._attributes = {};
        this._associations = {};
        Object
            .keys(attributes)
            .sort()
            .forEach(key => this._attributes[key] = attributes[key]);
        this._nessie.addModels(this);
    }
    static initCheck() {
        (0, node_assert_1.default)(this._nessie && this._attributes && this._associations, new ModelError_1.ModelInitError(`Model not initialized: ${this.name}`));
        (0, node_assert_1.default)(this._nessie instanceof Nessie_1.default, new ModelError_1.ModelInitError(`Invalid Nessie instance on model ${this.name}`));
    }
    static parseForeignKey(source) {
        var _a;
        source.initCheck();
        const sourceKey = (_a = source.primaryKeys[0]) !== null && _a !== void 0 ? _a : "ROWID";
        return {
            foreignKey: `${upperCaseName(source.name)}${upperCaseName(sourceKey)}`,
            sourceKey
        };
    }
    static hasMany(other, options = {}) {
        var _a, _b;
        this.initCheck();
        const association = (_a = options.foreignKey) !== null && _a !== void 0 ? _a : this.parseForeignKey(this);
        const upperDelete = (_b = options.onDelete) === null || _b === void 0 ? void 0 : _b.toUpperCase();
        association.onDelete = Object.values(Constants_1.OnDeleteBehavior).includes(upperDelete) ? upperDelete : Constants_1.OnDeleteBehavior.SET_NULL;
        association.type = this._attributes[association.sourceKey].type;
        association.source = false;
        this._associations[other.tableName] = association;
    }
    static belongsTo(other, options = {}) {
        var _a, _b;
        this.initCheck();
        const association = (_a = options.foreignKey) !== null && _a !== void 0 ? _a : this.parseForeignKey(other);
        const upperDelete = (_b = options.onDelete) === null || _b === void 0 ? void 0 : _b.toUpperCase();
        association.onDelete = Object.values(Constants_1.OnDeleteBehavior).includes(upperDelete) ? upperDelete : Constants_1.OnDeleteBehavior.SET_NULL;
        association.type = other._attributes[association.sourceKey].type;
        association.source = true;
        this._associations[other.tableName] = association;
    }
    static buildColumnSql(key, attributeData) {
        (0, node_assert_1.default)(Object
            .values(Constants_1.DataTypes)
            .includes(attributeData.type), new ModelError_1.ModelSyncError(`Invalid attribute type on model ${this.name}`));
        const sql = [`"${key}"`, attributeData.type];
        if (attributeData.defaultValue) {
            sql.push(`DEFAULT ${formatValue(attributeData.defaultValue)}`);
        }
        if (attributeData.allowNull !== undefined && !attributeData.allowNull) {
            sql.push("NOT NULL");
        }
        return sql.join(" ");
    }
    static buildAssociationSql() {
        return Object
            .keys(this._associations)
            .filter(association => this._associations[association].source)
            .map(otherTableName => `"${this._associations[otherTableName].foreignKey}" ${this._associations[otherTableName].type} REFERENCES "${otherTableName}" ("${this._associations[otherTableName].sourceKey}") ON DELETE ${this._associations[otherTableName].onDelete}`);
    }
    static buildTableSql(attributesData) {
        const sql = Object
            .keys(attributesData)
            .map(key => this.buildColumnSql(key, attributesData[key]));
        const associationSql = this.buildAssociationSql();
        if (associationSql.length) {
            sql.push(...associationSql);
        }
        const pkData = this.primaryKeys
            .map(pk => `"${pk}"`)
            .join(", ");
        if (pkData) {
            sql.push(`PRIMARY KEY (${pkData})`);
        }
        return sql.join(", ");
    }
    static sync(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            if (force) {
                yield this._nessie.execute(`BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}" CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF; END;`);
            }
            const columnSql = this.buildTableSql(this._attributes);
            yield this._nessie.execute(`BEGIN EXECUTE IMMEDIATE 'CREATE TABLE "${this.tableName}" (${columnSql})'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -955 THEN raise; END IF; END;`);
        });
    }
    static formatAttributeKeys(attributes) {
        return Object
            .keys(attributes)
            .sort()
            .reduce((formatted, key) => {
            if (key in this._attributes || key in Constants_1.Pseudocolumns) {
                formatted[key] = attributes[key];
            }
            return formatted;
        }, {});
    }
    static parseValueSql(values) {
        const attributes = this.formatAttributeKeys(values);
        const attributeKeys = Object.keys(attributes);
        const attributeSql = attributeKeys
            .map(attribute => `"${attribute}"`)
            .join(", ");
        const bindParamSql = attributeKeys
            .map((_, i) => `:${i + 1}`)
            .join(", ");
        const bindParams = Object.values(attributes);
        return [attributeSql, bindParamSql, bindParams];
    }
    static create(values, options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [attributeSql, valuesSql, bindParams] = this.parseValueSql(values);
            const { lastRowid } = yield this._nessie.execute(`INSERT INTO "${this.tableName}" (${attributeSql}) VALUES (${valuesSql})`, bindParams, true);
            if ((_a = options.select) !== null && _a !== void 0 ? _a : true) {
                return this.findByRowId(lastRowid);
            }
        });
    }
    static buildBulkQuery(values, ignoreDuplicates) {
        const structure = values.reduce((struct, value) => {
            const formatted = this.formatAttributeKeys(value);
            Object
                .keys(formatted)
                .forEach(attribute => struct[attribute] = null);
            return struct;
        }, {});
        const structureAttributeList = Object.keys(structure);
        const structureAttributes = structureAttributeList
            .map(attribute => `"${attribute}"`)
            .join(", ");
        const bindParamSql = structureAttributeList
            .map((_, i) => `:${i + 1}`)
            .join(", ");
        const bindParamList = values.map(value => structureAttributeList.map(attribute => { var _a; return (_a = value[attribute]) !== null && _a !== void 0 ? _a : null; }));
        const insertSql = `INSERT INTO "${this.tableName}" (${structureAttributes}) VALUES (${bindParamSql})`;
        const sql = ignoreDuplicates ? `BEGIN ${insertSql}; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -1 THEN raise; END IF; END;` : insertSql;
        return [sql, bindParamList];
    }
    static bulkCreate(values, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [sql, bindParams] = this.buildBulkQuery(values, options.ignoreDuplicates);
            const { rowsAffected } = yield this._nessie.executeMany(sql, bindParams, true);
            return rowsAffected !== null && rowsAffected !== void 0 ? rowsAffected : 0;
        });
    }
    static parseSelectAttributeSql(attributes = Object.keys(this._attributes)) {
        return attributes
            .reduce((data, attribute) => {
            if (attribute in this._attributes || attribute in Constants_1.Pseudocolumns) {
                const sql = `"${this.tableName}"."${attribute}"`;
                data.push(sql);
            }
            return data;
        }, [`"${this.tableName}"."ROWID"`])
            .join(", ");
    }
    static parseEql(values, bindParams = []) {
        const attributes = this.formatAttributeKeys(values);
        const setSql = Object
            .keys(attributes)
            .map((attribute, i) => `"${this.tableName}"."${attribute}" = :${i + bindParams.length + 1}`)
            .join(", ");
        bindParams.push(...Object.values(attributes));
        return [setSql, bindParams];
    }
    static findAll(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const bindParams = [];
            const attributeSql = this.parseSelectAttributeSql(options.attributes);
            let sqlData = [`SELECT ${attributeSql} FROM "${this.tableName}"`];
            if (options.where) {
                const [where] = this.parseEql(options.where, bindParams);
                if (where) {
                    sqlData.push(`WHERE ${where}`);
                }
            }
            if (typeof options.limit === "number") {
                sqlData.push(`FETCH NEXT ${Math.floor(options.limit)} ROWS ONLY`);
            }
            const results = yield this._nessie.execute(sqlData.join(" "), bindParams);
            return results.rows.map(row => new this(results.metaData, row));
        });
    }
    static findOne(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const [first] = yield this.findAll(Object.assign(Object.assign({}, options), { limit: 1 }));
            return first !== null && first !== void 0 ? first : null;
        });
    }
    static findByRowId(rowId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findOne({
                where: { ROWID: rowId }
            });
        });
    }
    static findOrCreate(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let created = false;
            let model = yield this.findOne(options);
            if (!model) {
                const createOptions = Object.assign(Object.assign({}, options.where), options.defaults);
                try {
                    model = (yield this.create(createOptions));
                    created = true;
                }
                catch (error) {
                    if (error.errorNum === 1) {
                        const pks = this.primaryKeys;
                        const findPkOptions = Object
                            .keys(createOptions)
                            .reduce((pkWhere, attribute) => {
                            if (pks.includes(attribute)) {
                                pkWhere[attribute] = createOptions[attribute];
                            }
                            return pkWhere;
                        }, {});
                        model = yield this.findOne({ where: findPkOptions });
                    }
                    else {
                        throw error;
                    }
                }
            }
            return [model, created];
        });
    }
    static update(values, options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [valuesSql, bindParams] = this.parseEql(values);
            const [where] = this.parseEql(options.where, bindParams);
            const { rowsAffected } = yield this._nessie.execute(`UPDATE "${this.tableName}" SET ${valuesSql} WHERE ${where}`, bindParams, true);
            return rowsAffected !== null && rowsAffected !== void 0 ? rowsAffected : 0;
        });
    }
    patch() {
        return __awaiter(this, void 0, void 0, function* () {
            const { dataValues } = yield this.model.findByRowId(this.rowId);
            this.dataValues = dataValues;
        });
    }
    update(values, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.model.update(values, Object.assign(Object.assign({}, options), { where: { ROWID: this.rowId } }));
            yield this.patch();
            return this;
        });
    }
    static destroy(options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [where, bindParams] = this.parseEql(options.where);
            const { rowsAffected } = yield this._nessie.execute(`DELETE FROM "${this.tableName}" WHERE ${where}`, bindParams, true);
            return rowsAffected !== null && rowsAffected !== void 0 ? rowsAffected : 0;
        });
    }
    destroy(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._destroyed) {
                yield this.model.destroy(Object.assign(Object.assign({}, options), { where: { ROWID: this.rowId } }));
                this._destroyed = true;
            }
        });
    }
}
exports.default = Model;
Model._attributes = null;
Model._associations = null;
function upperCaseName(name) {
    return name[0].toUpperCase() + name.slice(1);
}
function formatValue(value) {
    switch (typeof value) {
        case "string": return `''${value.replace("'", "'''")}''`;
        default: return value.toString();
    }
}
