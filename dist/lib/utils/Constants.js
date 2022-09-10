"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operators = exports.OnDeleteBehavior = exports.Pseudocolumns = exports.DataTypes = void 0;
var DataTypes;
(function (DataTypes) {
    DataTypes["STRING"] = "VARCHAR(255)";
    DataTypes["NUMBER"] = "NUMBER";
})(DataTypes = exports.DataTypes || (exports.DataTypes = {}));
var Pseudocolumns;
(function (Pseudocolumns) {
    Pseudocolumns["COLUMN_VALUE"] = "COLUMN_VALUE";
    Pseudocolumns["OBJECT_ID"] = "OBJECT_ID";
    Pseudocolumns["OBJECT_VALUE"] = "OBJECT_VALUE";
    Pseudocolumns["ORA_ROWSCN"] = "ORA_ROWSCN";
    Pseudocolumns["ROWID"] = "ROWID";
    Pseudocolumns["ROWNUM"] = "ROWNUM";
    Pseudocolumns["XMLDATA"] = "XMLDATA";
})(Pseudocolumns = exports.Pseudocolumns || (exports.Pseudocolumns = {}));
var OnDeleteBehavior;
(function (OnDeleteBehavior) {
    OnDeleteBehavior["CASCADE"] = "CASCADE";
    OnDeleteBehavior["SET_NULL"] = "SET NULL";
})(OnDeleteBehavior = exports.OnDeleteBehavior || (exports.OnDeleteBehavior = {}));
var Operators;
(function (Operators) {
    Operators["eq"] = "=";
    Operators["lt"] = "<";
    Operators["gt"] = ">";
})(Operators = exports.Operators || (exports.Operators = {}));
