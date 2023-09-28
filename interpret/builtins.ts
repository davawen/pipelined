import { call_lambda } from "./mod.ts";
import { Value } from "./value.ts";

function assert_type<T extends Value['tag']>(x: Value, ty: T): Value & { tag: T } {
	if (x.tag != ty) throw new Error(`expected value of type ${ty}, got ${x.tag}`);
	return x as Value & { tag: T };
}

function assert_single<T extends Value['tag']>(x: Value[], ty: T): Value & { tag: T } {
	if (x.length != 1) throw new Error(`expected single value of type ${ty}, got ${x.length} elements`);
	if (x[0].tag != ty) throw new Error(`expected value of type ${ty}, got ${x[0].tag}`);

	return x[0] as Value & { tag: T };
}

function arithmetic(operator: (a: number, b: number) => number): (v: Value[]) => Value[] {
	return v => {
		let result = assert_type(v[0], 'number').value;
		for (let i = 1; i < v.length; i++) {
			result = operator(result, assert_type(v[i], 'number').value);
		}
		return [{ tag: 'number', value: result }];
	}
}

function comparison(operator: (a: number, b: number) => boolean): (v: Value[]) => Value[] {
	return v => {
		if (v.length < 2) throw new Error("expected at least 2 elements in comparison");
		for (let i = 0; i < v.length-1; i++) {
			if (!operator(assert_type(v[i], "number").value, assert_type(v[i+1], "number").value))
				return [ { tag: 'boolean', value: false } ];
		}
		return [ { tag: 'boolean', value: true } ];
	}
}

export const builtins: { [key: string]: (v: Value[]) => Value[] } = {
	'identity': v => v,
	'to_string': v => v.map(x => {
		let value = "";
		if (x.tag == 'string') value = x.value;
		else if (x.tag == 'number' || x.tag == 'boolean') value = x.value.toString();
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
	'loop': v => {
		const condition = assert_type(v[0], 'lambda');
		const body = assert_type(v[1], 'lambda');
		let c = assert_single(call_lambda(condition, []), 'boolean').value;

		let result: Value[] = [];
		while (c) {
			result = call_lambda(body, []);
			c = assert_single(call_lambda(condition, []), 'boolean').value;
		}
		return result;
	},
	'if': v => {
		const condition = assert_type(v[0], 'boolean');
		const body = assert_type(v[1], 'lambda');
		if (condition.value) {
			call_lambda(body, []);
		}
		return [];
	},
	'+': arithmetic((a, b) => a + b),
	'-': arithmetic((a, b) => a - b),
	'*': arithmetic((a, b) => a * b),
	'/': arithmetic((a, b) => a / b),
	'>' : comparison((a, b) => a >  b),
	'>=': comparison((a, b) => a >= b),
	'<' : comparison((a, b) => a <  b),
	'<=': comparison((a, b) => a <= b),
	'==': comparison((a, b) => a == b),
	'!=': comparison((a, b) => a != b),
} as const;
