import Nessie from "./Nessie";
import pluralize from "pluralize";

export default abstract class Model {
    static get tableName() {
        return pluralize(this.name);
    }

    constructor(public nessie: Nessie) {
        ;
    }

    abstract attributes(): object;
    // abstract options(): object;
}
