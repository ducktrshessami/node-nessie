import { BindParameters, Connection, Metadata, Pool, Result, Results } from "oracledb";

export class Nessie {
    readonly models: any;
    readonly pool: Pool | null;

    constructor(protected configuration: any);

    addModels(...newModels: Array<typeof Model>): void;
    initPool(): Promise<boolean>;
    connect(): Promise<Connection>;
    execute(sql: string, bindParams: BindParameters = [], commit: boolean = false): Promise<Result<any>>;
    executeMany(sql: string, bindParams: Array<BindParameters>, commit: boolean = false): Promise<Results<any>>;
    sync(force: boolean = false): Promise<void>;
    close(drainTime?: number): Promise<void>;
}

export class Model {
    static readonly tableName: string;
    static readonly primaryKeys: Array<string>;

    readonly model: typeof Model;
    readonly destroyed: boolean;
    readonly rowId: string;
    dataValues: any;

    static init(attributes: any, options: any): void;
    static sync(force: boolean = false): Promise<void>;
    static create(values: any, options: { select: false }): Promise<void>;
    static create(values: any, options: any = {}): Promise<Model>;
    static bulkCreate(values: Array<any>, options: any = {}): Promise<number>;
    static findAll(options: any = {}): Promise<Array<Model>>;
    static findOne(options: any = {}): Promise<Model?>;
    static findByRowId(rowId: string): Promise<Model?>;
    static findOrCreate(options: any): Promise<[Model, boolean]>;
    static update(values: any, options: any): Promise<number>;
    static destroy(options: any): Promise<number>;

    update(values: any, options: any = {}): Promise<this>;
    destroy(options: any = {}): Promise<void>;
}

export * from "../lib/utils/Constants";
