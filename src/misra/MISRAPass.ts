import { Joinpoint } from "clava-js/api/Joinpoints.js";
import { LaraJoinPoint } from "lara-js/api/LaraJoinPoint.js";
import SimplePass from "lara-js/api/lara/pass/SimplePass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import { Preprocessing, PreprocessingReqs } from "./MISRAReporter.js";
import MISRAPassResult from "./MISRAPassResult.js";
import Fix from "clava-js/api/clava/analysis/Fix.js";

export default abstract class MISRAPass extends SimplePass {
    protected _ruleMapper: Map<number, ($jp: Joinpoint) => void> = new Map();
    private _executedRules: Map<number, boolean> = new Map();
    private _rules: number[];
    private _currentRule: number = -1;
    private _preprocessing: Preprocessing | undefined;
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
        if (this._executedRules.get($id) === false) {
            this.executeRule($id, $jp);
        }
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