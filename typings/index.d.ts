import {
    BindDefinition,
    BindParameters,
    Connection,
    InitialiseOptions,
    Pool,
    PoolAttributes,
    Result,
    Results
} from "oracledb";

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

type ColumnValue = string | number | null;

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

type ExecuteManyOptions = ExecuteOptions & {
    binds: Array<BindParameters>,
    bindDefs?: BindDefinition[]
};

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

type ModelQueryAttributesOptions = { attributes?: Array<string> };

type ModelCreateOptions = ConnectionOptions & ModelQueryAttributesOptions & { ignoreDuplicate?: boolean };

type ModelBulkCreateOptions = ConnectionOptions & ModelQueryAttributesOptions & { ignoreDuplicates?: boolean };

interface ModelQueryWhereOperatorData {
    [key: Operators]: ColumnValue;
}

interface ModelQueryWhereData {
    [key: string]: ColumnValue | ModelQueryWhereOperatorData;
}

type ModelQueryWhereOptions = { where: ModelQueryWhereData };

type FindOneModelOptions = ConnectionOptions & ModelQueryAttributesOptions & { where?: ModelQueryWhereData };

type FindAllModelOptions = FindOneModelOptions & { limit?: number };

type FindRowIdModelOptions = ConnectionOptions & ModelQueryAttributesOptions;

type ModelUpdateOptions = ConnectionOptions & ModelQueryAttributesOptions;

type ModelQueryUpdateOptions = ModelUpdateOptions & ModelQueryWhereOptions;

interface ModelQueryAttributeData {
    [key: string]: ColumnValue;
}

type FindOrCreateModelOptions = ModelQueryUpdateOptions & { defaults?: ModelQueryAttributeData };

type ModelQueryDestroyOptions = ConnectionOptions & ModelQueryWhereOptions;

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
    static create(values: ModelQueryAttributeData, options?: ModelCreateOptions): Promise<Model | null>;
    static bulkCreate(values: Array<ModelQueryAttributeData>, options?: ModelBulkCreateOptions): Promise<Array<Model>>;
    static findAll(options?: FindAllModelOptions): Promise<Array<Model>>;
    static findOne(options?: FindOneModelOptions): Promise<Model | null>;
    static findByRowId(rowId: string, options?: FindRowIdModelOptions): Promise<Model | null>;
    static findOrCreate(options: FindOrCreateModelOptions): Promise<[Model, boolean]>;
    static update(values: ModelQueryAttributeData, options: ModelQueryUpdateOptions): Promise<Array<Model>>;
    static destroy(options: ModelQueryDestroyOptions): Promise<number>;

    update(values: ModelQueryAttributeData, options?: ModelUpdateOptions): Promise<this>;
    destroy(options?: ConnectionOptions): Promise<void>;
}
