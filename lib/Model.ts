import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import {
    ModelInitError,
    ModelSyncError
} from "./errors/ModelError";
import {
    DataTypes,
    OnDeleteBehavior,
    Operators,
    Pseudocolumns
} from "./utils/Constants";
import {
    BindDefinition,
    BIND_OUT,
    DB_TYPE_NUMBER,
    DB_TYPE_RAW,
    DB_TYPE_VARCHAR,
    Metadata,
    Result,
} from "oracledb";
import {
    AssociationOptions,
    AttributeData,
    BuiltModelBulkQuery,
    ColumnValue,
    ConnectionOptions,
    FindAllModelOptions,
    FindOneModelOptions,
    FindOrCreateModelOptions,
    FindRowIdModelOptions,
    FormattedModelAssociations,
    FormattedModelAttributes,
    ModelAttributes,
    ModelBulkCreateOptions,
    ModelCreateOptions,
    ModelDropOptions,
    ModelInitOptions,
    ModelQueryAttributeData,
    ModelQueryAttributesOptions,
    ModelQueryDestroyOptions,
    ModelQueryUpdateOptions,
    ModelQueryWhereData,
    ModelUpdateOptions,
    SyncOptions
} from "./utils/typedefs";

export default class Model {
    private static _nessie?: Nessie;
    private static _tableName: string | null;
    private static _attributes: FormattedModelAttributes | null = null;
    private static _associations: FormattedModelAssociations | null = null;

    private _destroyed: boolean;
    dataValues: ModelQueryAttributeData;

    static get tableName() {
        return this._tableName ?? pluralize(upperCaseName(this.name));
    }

    static get primaryKeys() {
        if (this._attributes) {
            return Object
                .keys(this._attributes)
                .filter(key => this._attributes![key].primaryKey);
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
        return this.constructor as typeof Model;
    }

    get destroyed() {
        return this._destroyed;
    }

    get rowId() {
        return this.dataValues.ROWID as string;
    }

    constructor(metaData: Array<Metadata<any>>, row: Array<ColumnValue>) {
        this._destroyed = false;
        this.dataValues = {};
        metaData.forEach((attributeMeta, i) => this.dataValues[attributeMeta.name] = row[i]);
    }

    static init(attributes: ModelAttributes, options: ModelInitOptions) {
        this._nessie = options.nessie;
        this._tableName = options.tableName ?? null;
        this._attributes = {};
        this._associations = {};
        Object
            .keys(attributes)
            .sort()
            .forEach(key => this._attributes![key] = (typeof attributes[key] === "object" ? attributes[key] : { type: attributes[key] }) as AttributeData);
        this._nessie!.addModels(this);
    }

    private static initCheck() {
        assert(this._nessie && this._attributes && this._associations, new ModelInitError(`Model not initialized: ${this.name}`));
        assert(this._nessie instanceof Nessie, new ModelInitError(`Invalid Nessie instance on model ${this.name}`));
    }

    private static parseForeignKey(source: typeof Model) {
        source.initCheck();
        const sourceKey = source.primaryKeys[0] ?? "ROWID";
        return {
            foreignKey: `${upperCaseName(source.name)}${upperCaseName(sourceKey)}`,
            sourceKey
        };
    }

    static hasMany(other: typeof Model, options: AssociationOptions = {}) {
        this.initCheck();
        const association: any = (options.foreignKey && options.sourceKey) ? options : this.parseForeignKey(this);
        association.onDelete = options.onDelete ?? OnDeleteBehavior.SET_NULL;
        association.type = this._attributes![association.sourceKey].type;
        association.source = false;
        this._associations![other.tableName] = association;
    }

    static belongsTo(other: typeof Model, options: AssociationOptions = {}) {
        this.initCheck();
        const association: any = (options.foreignKey && options.sourceKey) ? options : this.parseForeignKey(other);
        association.onDelete = options.onDelete ?? OnDeleteBehavior.SET_NULL;
        association.type = other._attributes![association.sourceKey].type;
        association.source = true;
        this._associations![other.tableName] = association;
    }

    private static buildColumnSql(key: string, attributeData: AttributeData) {
        assert(
            Object
                .values(DataTypes)
                .includes(attributeData.type),
            new ModelSyncError(`Invalid attribute type on model ${this.name}`)
        );
        const sql = [`"${key}"`, attributeData.type];
        if (attributeData.defaultValue) {
            sql.push(`DEFAULT ${formatValue(attributeData.defaultValue)}`);
        }
        if (attributeData.allowNull !== undefined && !attributeData.allowNull) {
            sql.push("NOT NULL");
        }
        return sql.join(" ");
    }

    private static buildAssociationSql() {
        return Object
            .keys(this._associations!)
            .filter(association => this._associations![association].source)
            .map(otherTableName => `"${this._associations![otherTableName].foreignKey}" ${this._associations![otherTableName].type} REFERENCES "${otherTableName}" ("${this._associations![otherTableName].sourceKey}") ON DELETE ${this._associations![otherTableName].onDelete}`);
    }

    private static buildTableSql(attributesData: FormattedModelAttributes) {
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

    static async drop(options: ModelDropOptions = {}) {
        this.initCheck();
        const cascadeSql = options.cascade ? " CASCADE CONSTRAINTS" : "";
        await this._nessie!.execute(`BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"${cascadeSql}'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF; END;`, { connection: options.connection });
    }

    static async sync(options: SyncOptions = {}) {
        this.initCheck();
        const connection = options.connection ?? await this._nessie!.connect();
        if (options.force) {
            await this.drop({
                connection,
                cascade: true
            });
        }
        const columnSql = this.buildTableSql(this._attributes!);
        await this._nessie!.execute(`BEGIN EXECUTE IMMEDIATE 'CREATE TABLE "${this.tableName}" (${columnSql})'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -955 THEN raise; END IF; END;`, { connection });
        if (!options.connection) {
            await connection.close();
        }
    }

    private static formatAttributeKeys(attributes: ModelQueryWhereData): ModelQueryWhereData {
        return Object
            .keys(attributes)
            .sort()
            .reduce((formatted: any, key) => {
                if (key in this._attributes! || key in Pseudocolumns || this.foreignKeys.includes(key)) {
                    formatted[key] = attributes[key];
                }
                return formatted;
            }, {});
    }

    private static parseReturningSql(attributes: Array<string> = Object.keys(this._attributes!).concat(this.foreignKeys), priorBinds: number): [Array<Metadata<any>>, string, Array<BindDefinition>] {
        if (!attributes.includes("ROWID")) {
            attributes.push("ROWID");
        }
        const [metadata, attributeSqlData, outBindSqlData, bindDefs] = attributes.reduce((data: [Array<Metadata<any>>, Array<string>, Array<string>, Array<BindDefinition>], attribute, i) => {
            let found = true;
            if (attribute in this._attributes!) {
                found = true;
                data[3].push(createOutBindDef(this._attributes![attribute].type));
            }
            else if (this.foreignKeys.includes(attribute)) {
                found = true;
                const association = Object
                    .values(this._associations!)
                    .find(association => association.foreignKey === attribute);
                data[3].push(createOutBindDef(association!.type));
            }
            else if (attribute === "ROWID") {
                found = true;
                data[3].push(createOutBindDef(DataTypes.STRING));
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

    private static buildBulkQuery(values: Array<ModelQueryAttributeData>, options: ModelBulkCreateOptions): BuiltModelBulkQuery {
        const structure = values.reduce((struct: ModelQueryAttributeData, value) => {
            const formatted = this.formatAttributeKeys(value) as ModelQueryAttributeData;
            Object
                .keys(formatted)
                .forEach(attribute => struct[attribute] = formatted[attribute]);
            return struct;
        }, {});
        const structureAttributeList = Object.keys(structure);
        const [structureAttributeSqlData, bindParamSqlData, bindDefs] = structureAttributeList.reduce((sqlData: [Array<string>, Array<string>, Array<BindDefinition>], attribute, i) => {
            sqlData[0].push(`"${attribute}"`);
            sqlData[1].push(`:${i + 1}`);
            sqlData[2].push(createInBindDef(structure[attribute]))
            return sqlData;
        }, [[], [], []]);
        const [metadata, returningSql, outBindDefs] = this.parseReturningSql(options.attributes, bindDefs.length);
        const insertSql = `INSERT INTO "${this.tableName}" (${structureAttributeSqlData.join(", ")}) VALUES (${bindParamSqlData.join(", ")}) ${returningSql}`;
        const sql = options.ignoreDuplicates ? `BEGIN ${insertSql}; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -1 THEN raise; END IF; END;` : insertSql;
        return {
            metadata,
            sql,
            binds: values.map(value => structureAttributeList.map(attribute => value[attribute] ?? null)),
            bindDefs: bindDefs.concat(outBindDefs)
        };
    }

    private static parseOutBinds(outBinds: Array<Array<Array<ColumnValue> | null>>, metadata: Array<Metadata<any>>) {
        return outBinds!.reduce((created: Array<Model>, row) => {
            const rowCount = row.reduce((count, attribute) => Math.max(count, attribute?.length ?? 0), 0);
            for (let i = 0; i < rowCount; i++) {
                if (row.some(column => column !== null)) {
                    created.push(new this(metadata, row.map(column => column?.at(i) ?? null)));
                }
            }
            return created;
        }, []);
    }

    static async bulkCreate(values: Array<ModelQueryAttributeData>, options: ModelBulkCreateOptions = {}) {
        this.initCheck();
        const {
            metadata,
            sql,
            binds,
            bindDefs
        } = this.buildBulkQuery(values, options);
        const { outBinds } = await this._nessie!.executeMany(sql, {
            binds,
            bindDefs,
            commit: true
        });
        return this.parseOutBinds(outBinds as any, metadata);
    }

    static async create(values: ModelQueryAttributeData, options: ModelCreateOptions = {}) {
        this.initCheck();
        const [created] = await this.bulkCreate([values], {
            attributes: options.attributes,
            ignoreDuplicates: options.ignoreDuplicate
        });
        return created ?? null;
    }

    private static parseSelectAttributeSql(attributes: Array<string> = Object.keys(this._attributes!)) {
        return attributes
            .reduce((data: Array<string>, attribute) => {
                if (attribute in this._attributes! || attribute in Pseudocolumns || this.foreignKeys.includes(attribute)) {
                    const sql = `"${this.tableName}"."${attribute}"`;
                    data.push(sql);
                }
                return data;
            }, [`"${this.tableName}"."ROWID"`])
            .join(", ");
    }

    private static parseQueryAttributeDataSql(values: ModelQueryWhereData, bindParams: Array<any> = []): [string, Array<any>] {
        const attributes = this.formatAttributeKeys(values);
        const sqlData: Array<string> = [];
        for (const attribute in attributes) {
            const operatorData: any = typeof attributes[attribute] === "object" ? attributes[attribute] : { [Operators.eq]: attributes[attribute] };
            for (const operator in operatorData) {
                sqlData.push(`"${this.tableName}"."${attribute}" ${operator} :${bindParams.length + 1}`);
                bindParams.push(operatorData[operator]);
            }
        }
        return [sqlData.join(", "), bindParams];
    }

    static async findAll(options: FindAllModelOptions = {}) {
        this.initCheck();
        const bindParams: Array<any> = [];
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
        const results: Result<any> = await this._nessie!.execute(sqlData.join(" "), {
            bindParams,
            connection: options.connection
        });
        return results.rows!.map(row => new this(results.metaData!, row));
    }

    static async findOne(options: FindOneModelOptions = {}) {
        const [first] = await this.findAll({
            ...options,
            limit: 1
        });
        return first ?? null;
    }

    static async findByRowId(rowId: string, options: FindRowIdModelOptions = {}) {
        return this.findOne({
            where: { ROWID: rowId },
            attributes: options.attributes,
            connection: options.connection
        });
    }

    static async findOrCreate(options: FindOrCreateModelOptions): Promise<[Model, boolean]> {
        let created = false;
        let model = await this.findOne(options);
        if (!model) {
            const createOptions = {
                ...options.where,
                ...options.defaults
            } as ModelQueryAttributeData;
            try {
                model = (await this.create(createOptions))!;
                created = true;
            }
            catch (error: any) {
                if (error.errorNum === 1) {
                    const pks = this.primaryKeys;
                    const findPkOptions = Object
                        .keys(createOptions)
                        .reduce((pkWhere: any, attribute) => {
                            if (pks.includes(attribute)) {
                                pkWhere[attribute] = createOptions[attribute];
                            }
                            return pkWhere;
                        }, {});
                    model = await this.findOne({ where: findPkOptions });
                }
                else {
                    throw error;
                }
            }
        }
        return [model, created];
    }

    static async update(values: ModelQueryAttributeData, options: ModelQueryUpdateOptions) {
        this.initCheck();
        const [valuesSql, bindParams] = this.parseQueryAttributeDataSql(values);
        const [where] = this.parseQueryAttributeDataSql(options.where, bindParams);
        const [metadata, returningSql, bindDefs] = this.parseReturningSql(options.attributes, bindParams.length);
        const { outBinds } = await this._nessie!.execute(`UPDATE "${this.tableName}" SET ${valuesSql} WHERE ${where} ${returningSql}`, {
            bindParams: bindParams.concat(bindDefs),
            commit: true,
            connection: options.connection
        });
        return this.parseOutBinds([outBinds as any], metadata);
    }

    async update(values: ModelQueryAttributeData, options: ModelUpdateOptions = {}) {
        const [updated] = await this.model.update(values, {
            where: { ROWID: this.rowId },
            attributes: options.attributes,
            connection: options.connection
        });
        this.dataValues = updated.dataValues;
        return this;
    }

    static async destroy(options: ModelQueryDestroyOptions) {
        this.initCheck();
        const [where, bindParams] = this.parseQueryAttributeDataSql(options.where);
        const { rowsAffected } = await this._nessie!.execute(`DELETE FROM "${this.tableName}" WHERE ${where}`, {
            bindParams,
            commit: true,
            connection: options.connection
        });
        return rowsAffected ?? 0;
    }

    async destroy(options: ConnectionOptions = {}) {
        if (!this._destroyed) {
            await this.model.destroy({
                where: { ROWID: this.rowId },
                connection: options.connection
            });
            this._destroyed = true;
        }
    }
}

function upperCaseName(name: string) {
    return name[0].toUpperCase() + name.slice(1);
}

function formatValue(value: any): string {
    switch (typeof value) {
        case "string": return `''${value.replace("'", "'''")}''`;
        default: return value.toString();
    }
}

function createBindDef(type: number) {
    const bindDef: BindDefinition = { type };
    if (type === DB_TYPE_VARCHAR) {
        bindDef.maxSize = 255;
    }
    return bindDef;
}

function createInBindDef(value: ColumnValue) {
    switch (typeof value) {
        case "number": return createBindDef(DB_TYPE_NUMBER);
        case "string": return createBindDef(DB_TYPE_VARCHAR);
        default: return createBindDef(DB_TYPE_RAW);
    }
}

function createOutBindDef(type: DataTypes) {
    let bindDef: BindDefinition;
    switch (type) {
        case DataTypes.NUMBER: bindDef = createBindDef(DB_TYPE_NUMBER); break;
        case DataTypes.STRING: bindDef = createBindDef(DB_TYPE_VARCHAR); break;
        default: bindDef = createBindDef(DB_TYPE_RAW); break;
    }
    bindDef.dir = BIND_OUT;
    return bindDef;
}
