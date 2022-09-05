import { BindParameters, Connection, InitialiseOptions, PoolAttributes } from "oracledb";
import Model from "../Model";
import Nessie from "../Nessie";
import { DataTypes, OnDeleteBehavior } from "./Constants";

export type NessieInitOptions = {
    verbose?: boolean
};

export type NessieConfiguration = NessieInitOptions & PoolAttributes & InitialiseOptions;

export interface InitializedModels {
    [key: string]: typeof Model;
}

export type ColumnValue = string | number;

export type AttributeData = {
    type: DataTypes,
    primaryKey?: boolean,
    allowNull?: boolean,
    defaultValue?: ColumnValue
};

export interface ModelAttributes {
    [attribute: string]: AttributeData | DataTypes;
}

export type DefineModelOptions = {
    tableName?: string;
};

export type ConnectionOptions = { connection?: Connection };

export type ExecuteOptions = ConnectionOptions & { commit?: boolean };

export type ExecuteOneOptions = ExecuteOptions & { bindParams?: BindParameters };

export type ExecuteManyOptions = ExecuteOptions & { bindParams: Array<BindParameters> };

export type SyncOptions = ConnectionOptions & { force?: boolean };

export interface FormattedModelAttributes {
    [attribute: string]: AttributeData;
}

export type Association = {
    foreignKey: string,
    sourceKey: string,
    type: DataTypes,
    onDelete: OnDeleteBehavior,
    source: boolean
}

export interface FormattedModelAssociations {
    [other: string]: Association;
}

export type ModelInitOptions = DefineModelOptions & { nessie: Nessie };

export type AssociationOptions = {
    foreignKey?: string,
    sourceKey?: string,
    onDelete?: OnDeleteBehavior
};

export type ModelDropOptions = ConnectionOptions & { cascade?: boolean };

export type ModelCreateOptions = {
    select?: boolean
};

export type ModelBulkCreateOptions = {
    ignoreDuplicates?: boolean
};

export interface ModelQueryAttributeData {
    [key: string]: ColumnValue;
}

export type ModelQueryWhereOptions = { where: ModelQueryAttributeData };

export type ModelQueryAttributesOptions = { attributes?: Array<string> };

export type FindOneModelOptions = ModelQueryAttributesOptions & { where?: ModelQueryAttributeData };

export type FindAllModelOptions = FindOneModelOptions & { limit?: number };

export type FindOrCreateModelOptions = ModelQueryWhereOptions & ModelQueryAttributesOptions & { defaults?: ModelQueryAttributeData };
