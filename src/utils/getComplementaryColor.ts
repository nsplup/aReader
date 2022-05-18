export function getComplementaryColor (color: string, max = 215) {
	const rgb = (
		color.startsWith('#')
			? [0, 1, 2].map(n => parseInt(color.slice(1 + n * 2, 1 + n * 2 + 2), 16))
			: color.slice(4, -1).split(/\,\s*/).map(n => parseInt(n))
	).map(n => Math.abs(max - n)).join(', ')
	return `rgb(${rgb})`
}