import { DataTypes, Model, Nessie } from "../";

export default function ExampleModel(nessie: Nessie) {
    class Example extends Model { }
    Example.init(nessie, {
        ID: {
            type: DataTypes.NUMBER,
            primaryKey: true
        },
        FOO: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    return Example;
}
