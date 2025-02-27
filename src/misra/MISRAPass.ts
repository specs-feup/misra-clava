import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import { LaraJoinPoint } from "@specs-feup/lara/api/LaraJoinPoint.js";
import SimplePass from "@specs-feup/lara/api/lara/pass/SimplePass.js";
import PassResult from "@specs-feup/lara/api/lara/pass/results/PassResult.js";
import { Preprocessing, PreprocessingReqs } from "./MISRAReporter.js";
import MISRAPassResult from "./MISRAPassResult.js";
import Fix from "@specs-feup/clava/api/clava/analysis/Fix.js";

export default abstract class MISRAPass extends SimplePass {
    protected _ruleMapper: Map<number, ($jp: Joinpoint) => void> = new Map();
    private _executedRules: Map<number, boolean> = new Map();
    private _rules: number[];
    private _currentRule: number = -1;
    protected _preprocessing: Preprocessing | undefined;
    private _result: MISRAPassResult | undefined;
    protected abstract _preprocessingReqs: PreprocessingReqs[];

    get preprocessingReqs() {
        return this._preprocessingReqs;
    }

    abstract initRuleMapper(): void;

    setPreprocessing($preprocessing: Preprocessing): void {
        this._preprocessing = $preprocessing;
    }

    protected logMISRAError(message: string, fix?: Fix) {
        this._result?.addReport({rule: this._currentRule, message, fix});
    }

    private resetRules(): void {
        this._executedRules.forEach(($value: boolean, $key: number) => {
            this._executedRules.set($key, false);
        }, this);
    }

    constructor(includeDescendants: boolean = true, rules: number[]) {
        super(includeDescendants);
        this._rules = rules;
        this.initRuleMapper();

        this._ruleMapper.forEach(($value: ($jp: Joinpoint) => void, $key: number) => {
            this._executedRules.set($key, false);
        }, this);
    }

    private executeRule($id: number, $jp: Joinpoint) {
        if (!this._ruleMapper.has($id)) {
            throw new Error(`Pass does not support rule ${$id}`);
        }

        (this._ruleMapper.get($id) as ($jp: Joinpoint) => void)($jp);
        this._executedRules.set($id, true);
    }

    protected dependsOn($id: number, $jp: Joinpoint) {
        const tempId = this._currentRule;
        if (this._executedRules.get($id) === false) {
            this._currentRule = $id;
            this.executeRule($id, $jp);
        }
        this._currentRule = tempId;
    }

    abstract matchJoinpoint($jp: LaraJoinPoint): boolean;

    transformJoinpoint($jp: LaraJoinPoint): MISRAPassResult {
        if (!this._preprocessing) {
            throw new Error("Preprocessing object has not been set.");
        }

        this._result = new MISRAPassResult(this, $jp);
        this.resetRules();
        this._rules.forEach($id => {
            this._currentRule = $id;
            this.executeRule($id, $jp as Joinpoint);
        }, this);

        return this._result;
    }

    protected abstract _name: string;
    
}