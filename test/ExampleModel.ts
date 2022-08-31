import { DataTypes, Model, Nessie } from "../";

export default function ExampleModel(nessie: Nessie) {
    class Example extends Model { }
    Example.init({
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true
        },
        foo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        bar: {
            type: DataTypes.STRING,
            defaultValue: "foobar"
        }
    }, { nessie });
    return Example;
}
