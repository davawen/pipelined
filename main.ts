import { Lexer } from "./lexer.ts";
import { Expr, ExprLambda, ExprVariable, parse_expr, print_ast } from "./parser.ts";

type Value = ValueNumber | ValueString | ValueTuple | ValueLambda;
interface ValueNumber {
	tag: 'number',
	value: number
}
interface ValueString {
	tag: 'string',
	value: string
}
interface ValueTuple {
	tag: 'tuple',
	value: Value[]
}
interface ValueLambda {
	tag: 'lambda',
	scope: Scope,
	arguments: string[],
	value: Expr
}

type Variable = Value[];

class Scope {
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

function interpret_lambda_definition(lambda: ExprLambda, scope: Scope): ValueLambda {
	return {
		tag: 'lambda',
		arguments: lambda.args.map(v => v.node.value),
		scope,
		value: lambda.body
	}
}

function interpret_tuple_value(ast: Expr, scope: Scope): Value[] {
	if (ast.node.tag == 'string') return [ ast.node ];
	else if (ast.node.tag == 'number') return [ ast.node ];
	else if (ast.node.tag == 'tuple') return [{
		tag: 'tuple',
		value: ast.node.value.flatMap(x => interpret_tuple_value(x, scope))
	}];
	else if (ast.node.tag == 'variable') return scope.get(ast.node.value);
	else if (ast.node.tag == 'lambda') return [ interpret_lambda_definition(ast.node, scope) ];
	else if (ast.node.tag == 'binary') return interpret(ast, scope);
	else throw new Error("unreachable");
}

function assert_type<T extends Value['tag']>(x: Value, ty: T): Value & { tag: T } {
	if (x.tag != ty) throw new Error(`expected value of type ${ty}, got ${x.tag}`);
	return x as Value & { tag: T };
}

const builtins: { [key: string]: (v: Value[]) => Value[] } = {
	'identity': v => v,
	'to_string': v => v.map(x => {
		let value = "";
		if (x.tag == 'string') value = x.value;
		else if (x.tag == 'number') value = x.value.toString();
		else if (x.tag == 'lambda') value = `<lambda(${x.arguments.join(', ')})>`;
		else if (x.tag == 'tuple') value = `(${builtins.to_string(x.value).join(', ')})`;

		return {
			tag: 'string',
			value
		}
	}),
	'show': v => {
		console.log(builtins.to_string(v).map(x => x.value).join(', '));
		return []
	},
	'+': v => {
		const result = v.reduce((acc, x) => acc + assert_type(x, 'number').value, 0);
		return [{ tag: 'number', value: result }];
	},
	'-': v => {
		let result = assert_type(v[0], 'number').value;
		for (let i = 1; i < v.length; i++) {
			result -= assert_type(v[i], 'number').value;
		}
		return [{ tag: 'number', value: result }];
	},
	'*': v => {
		const result = v.reduce((acc, x) => acc * assert_type(x, 'number').value, 1);
		return [{ tag: 'number', value: result }];
	},
	'/': v => {
		let result = assert_type(v[0], 'number').value;
		for (let i = 1; i < v.length; i++) {
			result /= assert_type(v[i], 'number').value;
		}
		return [{ tag: 'number', value: result }];
	},
	'>': v => {
		if (v.length < 2) throw new Error("expected at least 2 elements in comparison");
		return [];
	}
} as const;

function call(f: ExprVariable, args: Value[], scope: Scope): Value[] {
	const lambda = scope.get_some(f.value);
	if (lambda != null) {
		if (lambda.length != 1 || lambda[0].tag != 'lambda') throw new Error(`expected function, got ${lambda}`);
		const f = lambda[0];
		if (f.arguments.length != args.length) throw new Error(`expected ${arguments.length} arguments, got ${args.length}`);

		const s = new Scope(f.scope);
		f.arguments.map((a, i) => s.add(a, [args[i]]));
		return interpret(f.value, s);
	}

	const builtin = builtins[f.value];
	if (builtin != undefined) {
		return builtin(args);
	}

	throw new Error(`unknown function ${f.value}`);
}

function interpret(ast: Expr, scope: Scope): Value[] {
	if (ast.node.tag == 'tuple') {
		return ast.node.value.flatMap(x => interpret_tuple_value(x, scope));
	}
	else if (ast.node.tag !== 'binary') throw new Error("cannot use a variable by itself");

	const lhs = interpret(ast.node.lhs, scope);
	if (ast.node.op == 'pipeline') {
		if (ast.node.rhs.node.tag == 'variable') { // function call
			return call(ast.node.rhs.node, lhs, scope);
		} else {
			return interpret(ast.node.rhs, scope);
		}
	} else if (ast.node.op == 'assign') {
		// TODO: Destructured assignment
		if (ast.node.rhs.node.tag != 'variable') throw new Error(`Expected variable, got ${ast.node.rhs.node.tag}.\nCannot assign to something else than a variable.`);
		scope.add(ast.node.rhs.node.value, lhs);
		return lhs;
	} else if (ast.node.op == 'mutate') {
		// TODO: Destructured assignment
		if (ast.node.rhs.node.tag != 'variable') throw new Error(`Expected variable, got ${ast.node.rhs.node.tag}.\nCannot assign to something else than a variable.`);
		const v = scope.get(ast.node.rhs.node.value);
		v.splice(0, v.length, ...lhs); // clear content of variable and assign new one
		return lhs;
	}

	throw new Error("unreachable");
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
	const _ = `
	((s) =>
		(0) -> i |> (
			() => (i, 10) |> <,              -- conditional branch
			() => (i, 1) |> + ->> i |> show  -- mutate i
		) |> loop
	) -> show10
`;

	const input = `
(3.1415926535) -> π |>
((radius) => ((radius, radius) |> *, π) |> *) -> area |>
((radius) => ((radius, 2) |> *, π) |> *) -> diameter |>
(10) -> r |> area |> show |> (r) |> diameter |> show
`;

	const lexer = new Lexer(input);

	console.log(`from input: \`${input}\``);

	const root = parse_expr(lexer);
	// print_ast(root);

	console.log("--- EXECUTING ---");

	interpret(root, new Scope());
}
