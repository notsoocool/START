export interface TreeNode {
	book: string;
	part1: Part1Node[];
}

export interface Part1Node {
	part: string;
	part2: Part2Node[];
}

export interface Part2Node {
	part: string;
	chapters: string[];
}
