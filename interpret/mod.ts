import { Expr, ExprLambda, ExprVariable } from "../parser.ts"
import { Scope, Value, ValueLambda } from "./value.ts"
import { builtins } from "./builtins.ts"

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
	else if (ast.node.tag == 'boolean') return [ ast.node ];
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

export function interpret(ast: Expr, scope = new Scope()): Value[] {
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

