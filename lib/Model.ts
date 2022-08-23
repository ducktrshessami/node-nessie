import Nessie from "./Nessie";
import pluralize from "pluralize";

export default abstract class Model {
    constructor(public nessie: Nessie) {
        const tableName = pluralize(this.constructor.name);
    }

    abstract attributes(): object;
    // abstract options(): object;
}
