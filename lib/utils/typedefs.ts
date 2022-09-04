import { InitialiseOptions, PoolAttributes } from "oracledb";
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

export type AttributeData = {
    type: DataTypes,
    primaryKey?: boolean,
    allowNull?: boolean,
    defaultValue?: any
};

export interface ModelAttributes {
    [attribute: string]: AttributeData | DataTypes;
}

export type DefineModelOptions = {
    tableName?: string;
};

export type ModelInitOptions = DefineModelOptions & { nessie: Nessie };

export type AssociationOptions = {
    foreignKey?: string,
    sourceKey?: string,
    onDelete?: OnDeleteBehavior
};

export type ModelCreateOptions = {
    select?: boolean
};

export type ModelBulkCreateOptions = {
    ignoreDuplicates?: boolean
};

export interface ModelQueryAttributeData {
    [key: string]: any;
}

export type ModelQueryWhereOptions = { where: ModelQueryAttributeData };

export type ModelQueryAttributesOptions = { attributes?: Array<string> };

export type FindOneModelOptions = ModelQueryAttributesOptions & { where?: ModelQueryAttributeData };

export type FindAllModelOptions = FindOneModelOptions & { limit?: number };

export type FindOrCreateModelOptions = ModelQueryWhereOptions & ModelQueryAttributesOptions & { defaults?: ModelQueryAttributeData };
