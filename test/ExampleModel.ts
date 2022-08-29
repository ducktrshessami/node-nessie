import { DataTypes, Model, Nessie } from "../";

export default function ExampleModel(nessie: Nessie) {
    class Example extends Model { }
    Example.init({
        ID: {
            type: DataTypes.NUMBER,
            primaryKey: true
        },
        FOO: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, { nessie });
    return Example;
}
