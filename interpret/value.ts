import { Expr, ExprLambda, ExprVariable } from "../parser.ts"

export type Value = ValueNumber | ValueString | ValueBoolean | ValueTuple | ValueLambda;
export interface ValueNumber {
	tag: 'number',
	value: number
}
export interface ValueString {
	tag: 'string',
	value: string
}
export interface ValueBoolean {
	tag: 'boolean',
	value: boolean
}
export interface ValueTuple {
	tag: 'tuple',
	value: Value[]
}
export interface ValueLambda {
	tag: 'lambda',
	scope: Scope,
	arguments: string[],
	value: Expr
}

export type Variable = Value[];

export class Scope {
	variables: Map<string, Variable>;

	constructor(parent?: Scope) {
		this.variables = new Map(parent?.variables);
	}

	add(name: string, variable: Variable) {
		this.variables.set(name, variable);
	}

	get_some(name: string): Variable | null {
		return this.variables.get(name) ?? null;
	}

	get(name: string): Variable {
		const v = this.variables.get(name);
		if (v === undefined) throw new Error(`unknown variable '${name}'`);
		return v;
	}
}

