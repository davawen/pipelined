import { Value } from "./value.ts";

function assert_type<T extends Value['tag']>(x: Value, ty: T): Value & { tag: T } {
	if (x.tag != ty) throw new Error(`expected value of type ${ty}, got ${x.tag}`);
	return x as Value & { tag: T };
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
		for (let i = 0; i < v.length-1; i++) {
			if (assert_type(v[i], "number").value <= assert_type(v[i+1], "number").value)
				return [ { tag: 'boolean', value: false } ];
		}
		return [ { tag: 'boolean', value: true } ];
	}
} as const;
