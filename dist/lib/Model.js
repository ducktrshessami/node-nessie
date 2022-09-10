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
const cleanupConnection_1 = __importDefault(require("./utils/cleanupConnection"));
const ModelError_1 = require("./errors/ModelError");
const Constants_1 = require("./utils/Constants");
const oracledb_1 = require("oracledb");
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
    static get foreignKeys() {
        if (this._associations) {
            return Object
                .values(this._associations)
                .filter(association => association.source)
                .map(association => association.foreignKey);
        }
        return [];
    }
    static get parentTableCount() {
        if (this._associations) {
            const parents = Object
                .values(this._associations)
                .filter(assocation => assocation.source);
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
            .forEach(key => this._attributes[key] = (typeof attributes[key] === "object" ? attributes[key] : { type: attributes[key] }));
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
        var _a;
        this.initCheck();
        const association = (options.foreignKey && options.sourceKey) ? options : this.parseForeignKey(this);
        association.onDelete = (_a = options.onDelete) !== null && _a !== void 0 ? _a : Constants_1.OnDeleteBehavior.SET_NULL;
        association.type = this._attributes[association.sourceKey].type;
        association.source = false;
        this._associations[other.tableName] = association;
    }
    static belongsTo(other, options = {}) {
        var _a;
        this.initCheck();
        const association = (options.foreignKey && options.sourceKey) ? options : this.parseForeignKey(other);
        association.onDelete = (_a = options.onDelete) !== null && _a !== void 0 ? _a : Constants_1.OnDeleteBehavior.SET_NULL;
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
    static drop(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const cascadeSql = options.cascade ? " CASCADE CONSTRAINTS" : "";
            yield this._nessie.execute(`BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"${cascadeSql}'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF; END;`, { connection: options.connection });
        });
    }
    static sync(options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const connection = (_a = options.connection) !== null && _a !== void 0 ? _a : yield this._nessie.connect();
            if (options.force) {
                yield this.drop({
                    connection,
                    cascade: true
                });
            }
            const columnSql = this.buildTableSql(this._attributes);
            yield this._nessie.execute(`BEGIN EXECUTE IMMEDIATE 'CREATE TABLE "${this.tableName}" (${columnSql})'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -955 THEN raise; END IF; END;`, { connection });
            yield (0, cleanupConnection_1.default)(connection, options.connection);
        });
    }
    static formatAttributeKeys(attributes) {
        return Object
            .keys(attributes)
            .sort()
            .reduce((formatted, key) => {
            if (key in this._attributes || key in Constants_1.Pseudocolumns || this.foreignKeys.includes(key)) {
                formatted[key] = attributes[key];
            }
            return formatted;
        }, {});
    }
    static parseReturningSql(attributes = Object.keys(this._attributes).concat(this.foreignKeys), priorBinds) {
        if (!attributes.includes("ROWID")) {
            attributes.push("ROWID");
        }
        const [metadata, attributeSqlData, outBindSqlData, bindDefs] = attributes.reduce((data, attribute, i) => {
            let found = true;
            if (attribute in this._attributes) {
                found = true;
                data[3].push(createOutBindDef(this._attributes[attribute].type));
            }
            else if (this.foreignKeys.includes(attribute)) {
                found = true;
                const association = Object
                    .values(this._associations)
                    .find(association => association.foreignKey === attribute);
                data[3].push(createOutBindDef(association.type));
            }
            else if (attribute === "ROWID") {
                found = true;
                data[3].push(createOutBindDef(Constants_1.DataTypes.STRING));
            }
            if (found) {
                data[0].push({ name: attribute });
                data[1].push(`"${this.tableName}"."${attribute}"`);
                data[2].push(`:${priorBinds + i + 1}`);
            }
            return data;
        }, [[], [], [], []]);
        return [metadata, `RETURNING ${attributeSqlData.join(", ")} INTO ${outBindSqlData.join(", ")}`, bindDefs];
    }
    static buildBulkQuery(values, options) {
        const structure = values.reduce((struct, value) => {
            const formatted = this.formatAttributeKeys(value);
            Object
                .keys(formatted)
                .forEach(attribute => struct[attribute] = formatted[attribute]);
            return struct;
        }, {});
        const structureAttributeList = Object.keys(structure);
        const [structureAttributeSqlData, bindParamSqlData, bindDefs] = structureAttributeList.reduce((sqlData, attribute, i) => {
            sqlData[0].push(`"${attribute}"`);
            sqlData[1].push(`:${i + 1}`);
            sqlData[2].push(createInBindDef(structure[attribute]));
            return sqlData;
        }, [[], [], []]);
        const [metadata, returningSql, outBindDefs] = this.parseReturningSql(options.attributes, bindDefs.length);
        const insertSql = `INSERT INTO "${this.tableName}" (${structureAttributeSqlData.join(", ")}) VALUES (${bindParamSqlData.join(", ")}) ${returningSql}`;
        const sql = options.ignoreDuplicates ? `BEGIN ${insertSql}; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -1 THEN raise; END IF; END;` : insertSql;
        return {
            metadata,
            sql,
            binds: values.map(value => structureAttributeList.map(attribute => { var _a; return (_a = value[attribute]) !== null && _a !== void 0 ? _a : null; })),
            bindDefs: bindDefs.concat(outBindDefs)
        };
    }
    static parseOutColumns(columns, metadata) {
        let maxLength = 0;
        const columnArrays = columns.map(column => {
            const columnArray = Array.isArray(column) ? column : [column];
            maxLength = Math.max(maxLength, columnArray.length);
            return columnArray;
        });
        const created = [];
        for (let i = 0; i < maxLength; i++) {
            let allNull = true;
            const row = columnArrays.map(column => {
                var _a;
                const value = (_a = column[i]) !== null && _a !== void 0 ? _a : null;
                allNull && (allNull = value === null);
                return value;
            });
            if (!allNull) {
                created.push(new this(metadata, row));
            }
        }
        return created;
    }
    static parseOutBinds(outBinds, metadata) {
        return outBinds.reduce((created, outerRow) => {
            if (outerRow.some(column => Array.isArray(column))) {
                return created.concat(this.parseOutColumns(outerRow, metadata));
            }
            else if (outerRow.some(column => column !== null)) {
                created.push(new this(metadata, outerRow));
            }
            return created;
        }, []);
    }
    static bulkCreate(values, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const { metadata, sql, binds, bindDefs } = this.buildBulkQuery(values, options);
            const { outBinds } = yield this._nessie.executeMany(sql, {
                binds,
                bindDefs,
                commit: true,
                connection: options.connection
            });
            return this.parseOutBinds(outBinds, metadata);
        });
    }
    static create(values, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [created] = yield this.bulkCreate([values], {
                attributes: options.attributes,
                ignoreDuplicates: options.ignoreDuplicate,
                connection: options.connection
            });
            return created !== null && created !== void 0 ? created : null;
        });
    }
    static parseSelectAttributeSql(attributes = Object.keys(this._attributes)) {
        return attributes
            .reduce((data, attribute) => {
            if (attribute in this._attributes || attribute in Constants_1.Pseudocolumns || this.foreignKeys.includes(attribute)) {
                const sql = `"${this.tableName}"."${attribute}"`;
                data.push(sql);
            }
            return data;
        }, [`"${this.tableName}"."ROWID"`])
            .join(", ");
    }
    static parseQueryAttributeDataSql(values, bindParams = []) {
        const attributes = this.formatAttributeKeys(values);
        const sqlData = [];
        for (const attribute in attributes) {
            const operatorData = typeof attributes[attribute] === "object" ? attributes[attribute] : { [Constants_1.Operators.eq]: attributes[attribute] };
            for (const operator in operatorData) {
                sqlData.push(`"${this.tableName}"."${attribute}" ${operator} :${bindParams.length + 1}`);
                bindParams.push(operatorData[operator]);
            }
        }
        return [sqlData.join(", "), bindParams];
    }
    static findAll(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const bindParams = [];
            const attributeSql = this.parseSelectAttributeSql(options.attributes);
            let sqlData = [`SELECT ${attributeSql} FROM "${this.tableName}"`];
            if (options.where) {
                const [where] = this.parseQueryAttributeDataSql(options.where, bindParams);
                if (where) {
                    sqlData.push(`WHERE ${where}`);
                }
            }
            if (typeof options.limit === "number") {
                sqlData.push(`FETCH NEXT ${Math.floor(options.limit)} ROWS ONLY`);
            }
            const results = yield this._nessie.execute(sqlData.join(" "), {
                bindParams,
                connection: options.connection
            });
            return results.rows.map(row => new this(results.metaData, row));
        });
    }
    static findOne(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const [first] = yield this.findAll(Object.assign(Object.assign({}, options), { limit: 1 }));
            return first !== null && first !== void 0 ? first : null;
        });
    }
    static findByRowId(rowId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findOne({
                where: { ROWID: rowId },
                attributes: options.attributes,
                connection: options.connection
            });
        });
    }
    static findOrCreate(options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const connection = (_a = options.connection) !== null && _a !== void 0 ? _a : yield this._nessie.connect();
            try {
                let created = false;
                let model = yield this.findOne({
                    connection,
                    where: options.where,
                    attributes: options.attributes
                });
                if (!model) {
                    const createOptions = Object
                        .keys(options.where)
                        .reduce((data, attribute) => {
                        const value = options.where[attribute];
                        if (isColumnValue(value)) {
                            data[attribute] = value;
                        }
                        return data;
                    }, {});
                    Object.assign(createOptions, options.defaults);
                    model = yield this.create(createOptions, {
                        connection,
                        attributes: options.attributes,
                        ignoreDuplicate: true
                    });
                    if (model) {
                        created = true;
                    }
                    else {
                        const pks = this.primaryKeys;
                        const findPkOptions = Object
                            .keys(createOptions)
                            .reduce((pkWhere, attribute) => {
                            if (pks.includes(attribute)) {
                                pkWhere[attribute] = createOptions[attribute];
                            }
                            return pkWhere;
                        }, {});
                        model = yield this.findOne({
                            connection,
                            where: findPkOptions,
                            attributes: options.attributes
                        });
                    }
                }
                return [model, created];
            }
            finally {
                yield (0, cleanupConnection_1.default)(connection, options.connection);
            }
        });
    }
    static update(values, options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [valuesSql, bindParams] = this.parseQueryAttributeDataSql(values);
            const [where] = this.parseQueryAttributeDataSql(options.where, bindParams);
            const [metadata, returningSql, bindDefs] = this.parseReturningSql(options.attributes, bindParams.length);
            const { outBinds } = yield this._nessie.execute(`UPDATE "${this.tableName}" SET ${valuesSql} WHERE ${where} ${returningSql}`, {
                bindParams: bindParams.concat(bindDefs),
                commit: true,
                connection: options.connection
            });
            return this.parseOutBinds([outBinds], metadata);
        });
    }
    update(values, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const [updated] = yield this.model.update(values, {
                where: { ROWID: this.rowId },
                attributes: options.attributes,
                connection: options.connection
            });
            this.dataValues = updated.dataValues;
            return this;
        });
    }
    static destroy(options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initCheck();
            const [where, bindParams] = this.parseQueryAttributeDataSql(options.where);
            const { rowsAffected } = yield this._nessie.execute(`DELETE FROM "${this.tableName}" WHERE ${where}`, {
                bindParams,
                commit: true,
                connection: options.connection
            });
            return rowsAffected !== null && rowsAffected !== void 0 ? rowsAffected : 0;
        });
    }
    destroy(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._destroyed) {
                yield this.model.destroy({
                    where: { ROWID: this.rowId },
                    connection: options.connection
                });
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
function createBindDef(type) {
    const bindDef = { type };
    if (type === oracledb_1.DB_TYPE_VARCHAR) {
        bindDef.maxSize = 255;
    }
    return bindDef;
}
function createInBindDef(value) {
    switch (typeof value) {
        case "number": return createBindDef(oracledb_1.DB_TYPE_NUMBER);
        case "string": return createBindDef(oracledb_1.DB_TYPE_VARCHAR);
        default: return createBindDef(oracledb_1.DB_TYPE_RAW);
    }
}
function createOutBindDef(type) {
    let bindDef;
    switch (type) {
        case Constants_1.DataTypes.NUMBER:
            bindDef = createBindDef(oracledb_1.DB_TYPE_NUMBER);
            break;
        case Constants_1.DataTypes.STRING:
            bindDef = createBindDef(oracledb_1.DB_TYPE_VARCHAR);
            break;
        default:
            bindDef = createBindDef(oracledb_1.DB_TYPE_RAW);
            break;
    }
    bindDef.dir = oracledb_1.BIND_OUT;
    return bindDef;
}
function isColumnValue(value) {
    return value === null ||
        !isNaN(value) ||
        typeof value === "string";
}
