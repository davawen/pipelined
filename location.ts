export interface Location {
	line: number;
	col: number;
}

export function location_default(): Location {
	return {
		line: 0,
		col: 0,
	}
}

