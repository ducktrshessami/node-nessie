import { BindParameters, Connection, InitialiseOptions, Pool, PoolAttributes, Result, Results } from "oracledb";

export enum DataTypes {
    STRING = "VARCHAR(255)",
    NUMBER = "NUMBER"
}

export enum Pseudocolumns {
    COLUMN_VALUE = "COLUMN_VALUE",
    OBJECT_ID = "OBJECT_ID",
    OBJECT_VALUE = "OBJECT_VALUE",
    ORA_ROWSCN = "ORA_ROWSCN",
    ROWID = "ROWID",
    ROWNUM = "ROWNUM",
    XMLDATA = "XMLDATA",
}

export enum OnDeleteBehavior {
    CASCADE = "CASCADE",
    SET_NULL = "SET NULL"
}

export enum Operators {
    eq = "=",
    lt = "<",
    gt = ">"
}

type NessieInitOptions = {
    verbose?: boolean
};

type NessieConfiguration = NessieInitOptions & PoolAttributes & InitialiseOptions;

interface InitializedModels {
    [key: string]: typeof Model;
}

type ColumnValue = string | number;

type AttributeData = {
    type: DataTypes,
    primaryKey?: boolean,
    allowNull?: boolean,
    defaultValue?: ColumnValue
};

interface ModelAttributes {
    [attribute: string]: AttributeData | DataTypes;
}

type DefineModelOptions = {
    tableName?: string;
};

type ConnectionOptions = { connection?: Connection };

type ExecuteOptions = ConnectionOptions & { commit?: boolean };

type ExecuteOneOptions = ExecuteOptions & { bindParams?: BindParameters };

type ExecuteManyOptions = ExecuteOptions & { bindParams: Array<BindParameters> };

type SyncOptions = ConnectionOptions & { force?: boolean };

export class Nessie {
    protected configuration: NessieConfiguration;
    readonly models: InitializedModels;
    readonly pool: Pool | null;

    constructor(configuration: NessieConfiguration);

    addModels(...newModels: Array<typeof Model>): void;
    define(name: string, attributes: ModelAttributes, options: DefineModelOptions): typeof Model;
    initPool(): Promise<boolean>;
    connect(): Promise<Connection>;
    execute(sql: string, options?: ExecuteOneOptions): Promise<Result<any>>;
    executeMany(sql: string, options: ExecuteManyOptions): Promise<Results<any>>;
    drop(options?: ConnectionOptions): Promise<void>;
    sync(options?: SyncOptions): Promise<void>;
    close(drainTime?: number): Promise<void>;
}

type ModelInitOptions = DefineModelOptions & { nessie: Nessie };

type AssociationOptions = {
    foreignKey?: string,
    sourceKey?: string,
    onDelete?: OnDeleteBehavior
};

type ModelDropOptions = ConnectionOptions & { cascade?: boolean };

type ModelCreateOptions = {
    select?: boolean
};

type ModelBulkCreateOptions = {
    ignoreDuplicates?: boolean
};

interface ModelQueryWhereOperatorData {
    [key: Operators]: ColumnValue;
}

interface ModelQueryWhereData {
    [key: string]: ColumnValue | ModelQueryWhereOperatorData;
}

type ModelQueryWhereOptions = { where: ModelQueryWhereData };

type ModelQueryAttributesOptions = { attributes?: Array<string> };

type FindOneModelOptions = ModelQueryAttributesOptions & { where?: ModelQueryWhereData };

type FindAllModelOptions = FindOneModelOptions & { limit?: number };

interface ModelQueryAttributeData {
    [key: string]: ColumnValue;
}

type FindOrCreateModelOptions = ModelQueryWhereOptions & ModelQueryAttributesOptions & { defaults?: ModelQueryAttributeData };

export class Model {
    static readonly tableName: string;
    static readonly primaryKeys: Array<string>;
    static readonly foreignKeys: Array<string>;
    static readonly parentTableCount: number;

    readonly model: typeof Model;
    readonly destroyed: boolean;
    readonly rowId: string;
    dataValues: ModelQueryAttributeData;

    static init(attributes: ModelAttributes, options: ModelInitOptions): void;
    static hasMany(other: typeof Model, options?: AssociationOptions): void;
    static belongsTo(other: typeof Model, options?: AssociationOptions): void;
    static drop(options?: ModelDropOptions): Promise<void>;
    static sync(options?: SyncOptions): Promise<void>;
    static create(values: ModelQueryAttributeData, options: { select: false }): Promise<void>;
    static create(values: ModelQueryAttributeData, options?: ModelCreateOptions): Promise<Model>;
    static bulkCreate(values: Array<ModelQueryAttributeData>, options?: ModelBulkCreateOptions): Promise<number>;
    static findAll(options?: FindAllModelOptions): Promise<Array<Model>>;
    static findOne(options?: FindOneModelOptions): Promise<Model | null>;
    static findByRowId(rowId: string): Promise<Model | null>;
    static findOrCreate(options: FindOrCreateModelOptions): Promise<[Model, boolean]>;
    static update(values: ModelQueryAttributeData, options: ModelQueryWhereOptions): Promise<number>;
    static destroy(options: ModelQueryWhereOptions): Promise<number>;

    update(values: ModelQueryAttributeData): Promise<this>;
    destroy(): Promise<void>;
}
