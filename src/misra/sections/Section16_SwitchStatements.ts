import Query from "lara-js/api/weaver/Query.js";
import { Program, FileJp, Switch, Break, Case, Joinpoint, BuiltinType, BoolLiteral, Expression } from "clava-js/api/Joinpoints.js";
import MISRAAnalyser, { T } from "../MISRAAnalyser.js";
import Fix from "clava-js/api/clava/analysis/Fix.js";
import ClavaJoinPoints from "clava-js/api/clava/ClavaJoinPoints.js";

export default class Section16_SwitchStatements extends MISRAAnalyser {
    protected processRules($startNode: T): void {
        Query.searchFrom($startNode, Switch).get().forEach(switchStmt => {
            if (this.rules.has(1)) {
                this.r16_1_16_3_wellFormedSwitch(switchStmt);
            }
            if (this.rules.has(2)) {
                this.r16_2_topLevelSwitchLabels(switchStmt);
            }
            if (this.rules.has(4)) {
                this.r16_4_switchHasDefault(switchStmt);
            }
            if (this.rules.has(5)) {
                this.r16_5_defaultFirstOrLast(switchStmt);
            }
            if (this.rules.has(7)) {
                this.r16_7_noEssentialBooleanInSwitch(switchStmt);
            }
        }, this);
    }
    protected dependencies: Map<number, number[]> = new Map([
        [6, [1]],
        [7, [1]]
    ]);

    constructor(rules: number[]) {
        super(rules);
    }

    private r16_1_16_3_wellFormedSwitch($switchStmt: Switch) {
        let foundStmt = false;
        let first = true;
        for (const child of $switchStmt.children[1].children) {
            if (child instanceof Break) {;
                foundStmt = false;
            }
            else if (child instanceof Case) {
                first = false;
            }
            else {
                foundStmt = true;
            }

            if (foundStmt && child.instanceOf("case")) {
                this.logMISRAError(child, `A break is missing before ${child.code}`);
            }
        }
        if (!$switchStmt.children[1].lastChild.instanceOf("break")) {
            this.logMISRAError($switchStmt.children[1].lastChild, "A break is missing at the end of the switch statement.");
        } 
    }

    private r16_2_topLevelSwitchLabels($switchStmt: Switch) {
        Query.searchFrom($switchStmt, Case).get().forEach(caseLabel => {
            if (!caseLabel.currentRegion.instanceOf("switch")) {
                this.logMISRAError(caseLabel, "A switch label can only be used if its enclosing compound statement is the switch statement itself.")
            }
        }, this);
    }

    private r16_4_switchHasDefault($switchStmt: Switch) {
        if (!$switchStmt.hasDefaultCase) {
            this.logMISRAError($switchStmt, "Switch statement is missing a default case.");
        }
    }
    

    private r16_5_defaultFirstOrLast($switchStmt: Switch) {
        for (let i = 0; i < $switchStmt.cases.length; i++) {
            if ($switchStmt.cases[i].isDefault && (i == 0 || i == $switchStmt.cases.length)) {
                return;
            }
            else if ($switchStmt.cases[i].isDefault) {
                this.logMISRAError($switchStmt, "The default case of a switch statement must be the first or last label.");
                return;
            }
        }
    }

    private r16_6_noTwoClauses($startNode: Joinpoint) { //UNFINISHED
        Query.searchFrom($startNode, Switch).get().forEach(switchStmt => {
            let clauses = 0;
            let foundStmt = false;
            for (const child of switchStmt.children[1].children) {
                if (child instanceof Case && foundStmt) {
                    clauses++;
                    foundStmt = false;
                }
                else if (child instanceof Break) {
                    clauses++;
                    foundStmt = false;
                }
                else {
                    foundStmt = true;
                }
            }

            if (clauses == 2) {
                this.logMISRAError(switchStmt, "Switch statements should have more than two clauses.", new Fix(
                    switchStmt,
                    (switchStmt: Joinpoint) => {
                        let firstClauseExpr: Expression;
                        let secondClauseExpr: Expression;
                        let firstClause: Joinpoint[] = [];
                        let secondClause: Joinpoint[] = []
                        for (const child of switchStmt.children[1].children) {
                             
                        }
                    }
                ));
            }
        }, this);
    }

    private r16_7_noEssentialBooleanInSwitch($switchStmt: Switch) {
            if ($switchStmt.condition.type instanceof BuiltinType && $switchStmt.condition.type.builtinKind === "Bool") {
                this.logMISRAError($switchStmt, `Switch statement controlling expression ${$switchStmt.condition.code} must not have essentially boolean type.`, new Fix(
                    $switchStmt,
                    (switchStmt) => {
                        const trueClause: Joinpoint[] = [];
                        const falseClause: Joinpoint[] = [];
                        let inTrue: boolean = false;
                        let inFalse: boolean = false;
                        for (const child of switchStmt.children[1].children) {
                            if (child instanceof Case && child.values.length == 1 && child.values[0].children[0] instanceof BoolLiteral && child.values[0].children[0].value) {
                                inTrue = true;
                                inFalse = false;
                            }
                            else if (child instanceof Case && child.values.length == 1 && child.values[0].children[0] instanceof BoolLiteral && !child.values[0].children[0].value) {
                                inFalse = true;
                                inTrue = false;
                            }
                            else if (child instanceof Break) {
                                inTrue = false;
                                inFalse = false;
                            }

                            if (inTrue && !(child instanceof Case)) {
                                trueClause.push(child.deepCopy());
                            }
                            else if (inFalse && !(child instanceof Case)) {
                                falseClause.push(child.deepCopy());
                            }
                        }

                        const ifStmt = ClavaJoinPoints.ifStmt(
                            (switchStmt as Switch).condition,
                            ClavaJoinPoints.scope(...trueClause),
                            ClavaJoinPoints.scope(...falseClause)
                        );

                        switchStmt.replaceWith(ifStmt);
                    }
                ));
            }
    }
    
}