import Query from "lara-js/api/weaver/Query.js";
import { Program, FileJp, Joinpoint, Include } from "clava-js/api/Joinpoints.js";
import MISRAAnalyser from "../MISRAAnalyser.js";

export default class Section20_PreprocessingDirectives extends MISRAAnalyser {
    ruleMapper: Map<number, (jp: Program | FileJp) => void>;

    constructor(rules: number[]) {
        super(rules);
        this.ruleMapper = new Map([
            [2, this.r20_2_noInvalidCharsInInclude.bind(this)]
        ]);
    }
    
    private r20_2_noInvalidCharsInInclude($startNode: Joinpoint) {
        Query.searchFrom($startNode, Include).get().forEach(include => {
            if (/.*('|"|\\|\/\*|\/\/).*/.test(include.name)) {
                this.logMISRAError(include, `Invalid characters in include for ${include.name}. Invalid characters are ', ", \\, and the sequences /* and //.`)
            }
        }, this);
    }
}