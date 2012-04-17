/**
 * Search Tree Visualization for Finite Domain Constraint Problems
 * Copyright (C) 2012 by LE MINH TU (minhtule0412@gmail.com) & SHUBHAM GOYAL (shubhamjigoyal@gmail.com)
 * Version: 0.4
 * Licensed under the MIT or GPL Version 3 licenses.
 * 
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// NOTE: The fd.js module needs to be loaded prior to loading this file.
try {
    FD.space;
} catch (e) {
    alert("fd.js module needs to be loaded for this add-on to function.");
}

// NOTE: Kinetic.js library also needs to be loaded prior to loading this file.
try {
	Kinetic.stage;
} catch(e) {
	alert("A kinetic.js library needs to be loaded for this add-on to function");
}

// NOTE: jquery.contextMenu.js library also needs to be loaded prior to loading this file.
try {
	$.contextMenu.defaults;
} catch(e) {
	alert("jquery.contextMenu.js library needs to be loaded for this add-on to function");
}

(function() {

var is_solved, // Function to check whether a space is solved.
	ordering; // Function to order solution in branch and bound.

// Extreme object type.
// To store the extreme node of a tree.
// Used in Graphic_info objectype.
function Extreme() {
	this.node = null;
	this.level = -1;
	this.offset_from_root = 0;
}

Extreme.prototype.set = function(extreme, node, level, offset_from_root) {
	if (extreme) {
		this.node = extreme.node;
		this.level = extreme.level;
		this.offset_from_root = extreme.offset_from_root;
	} else {
		this.node = node;
		this.level = level;
		this.offset_from_root = offset_from_root;
	}
};

// Graphic_info object type.
// To be added to nodes of data tree to facilitate the tree drawing process.
function Graphic_info() {
	this.level = 0;
	this.offsets = [];
	this.is_thread = false;
	this.thread_offset = 0;
	this.is_expanded = true;
	this.left_extreme = new Extreme();
	this.right_extreme = new Extreme();
	this.is_selected = false;
	this.is_space_displayed = false;
	this.is_info_displayed = false;
}

// Node object type.
function Node(parent, child_th, children) {
	this.parent = parent;
	this.child_th = child_th;
	this.children = children;
	this.status = -1;
		// statuses are
		// 0 exploreable node
		// 1 non-exploreable node
		// 2 solution leave
		// 3 non-solution leave
	this.unexplored_children = 0;
	this.stable_children = 0;
	this.succeeded_children = 0;
	this.failed_children = 0;
	this.info = new Graphic_info();
}

// Travel to the leftmost child node. Considering whether the node is allowed to expand or not.
Node.prototype.next_left = function() {
	if (this.info.is_threaded) {
		return {node: this.info.is_threaded,
				offset: this.info.thread_offset};
	} else if (this.info.is_expanded === true && this.children.length > 0) {
		return {node: this.children[0],
				offset: this.info.offsets[0]};
	} else {
		return {node: null,
				offset: 0};
	}
};

// Travel to the rightmost child node. Considering whether the node is allowed to expand or not.
Node.prototype.next_right = function() {
	if (this.info.is_threaded) {
		return {node: this.info.is_threaded,
				offset: this.info.thread_offset};
	} else if (this.info.is_expanded === true && this.children.length > 0) {
		return {node: this.children[this.children.length-1],
				offset: this.info.offsets[this.children.length-1]};
	} else {
		return {node: null,
				offset: 0};
	}
};

// Explore the next subspace by branching
function explore_next(selected_node) {
	var cur_space = selected_node.space,
		cur_node = selected_node.node,
		choose = cur_space.brancher.branch(),
		new_space, new_node, status;
			
	if (cur_node.children.length < choose.numChoices) {
		new_space = choose(cur_space.clone(), cur_node.children.length);
		
		new_node = new Node(cur_node, cur_node.children.length, []);
		cur_node.children[cur_node.children.length] = new_node;
		try {
			new_space.propagate();
			if (is_solved(new_space)) {
				status = 2;
				new_node.succeeded_children = 1;
			} else {
				status = 0;
				new_node.stable_children = 1;
				new_node.unexplored_children = 1;
			}
		} catch (e) {
			status = 3;
			new_node.failed_children = 1;
		} finally {
			new_node.status = status;
			
			
			if (cur_node.children.length === choose.numChoices) {
				cur_node.status = 1;
				update_ancestor(new_node, new_node.succeeded_children,
							new_node.failed_children, new_node.stable_children,
							new_node.unexplored_children-1);
			} else {
				update_ancestor(new_node, new_node.succeeded_children,
							new_node.failed_children, new_node.stable_children,
							new_node.unexplored_children);
			}
		}
	}	
}

function State (node, space, dir, extra_info) {
	this.node = node;
	this.space = space;
	this.dir = dir;
	this.extra_info = extra_info;
}

function Extra_info(succeeded_children, failed_children, stable_children, unexplored_children) {
	this.succeeded_children = succeeded_children;
	this.failed_children = failed_children;
	this.stable_children = stable_children;
	this.unexplored_children = unexplored_children;
}

function update_state_info (child_info, parent_info) {
	parent_info.succeeded_children += child_info.succeeded_children;
	parent_info.failed_children += child_info.failed_children;
	parent_info.stable_children += child_info.stable_children;
	parent_info.unexplored_children += child_info.unexplored_children;
}

function add_state_info_into_node (state) {
	var node = state.node;
	
	node.succeeded_children += state.extra_info.succeeded_children;
	node.failed_children += state.extra_info.failed_children;
	node.stable_children += state.extra_info.stable_children;
	node.unexplored_children += state.extra_info.unexplored_children;
}

function branch_state(state) {
	var choose = state.space.brancher.branch(),
		cur_node, cur_space, new_node, new_space;
	
	while (state.dir < choose.numChoices) {
		// state.dir is valid, go to the state.dir - th child
		cur_node = state.node;
		cur_space = state.space;
	
		if (cur_node.children[state.dir]) {
			new_node = cur_node.children[state.dir];
			if (new_node.info.is_expanded && new_node.unexplored_children !== 0) {
				// if the space has not been fully explored, then explore.
				new_space = choose(cur_space.clone(),state.dir);
				return new State(new_node, new_space, 0, 
									new Extra_info(0, 0, 0, 0));
			}
		} else {
			// if state.dir = choose.numChoices, after branching 
			// the cur_node is fully explored
			if (state.dir === choose.numChoices-1) {
				--state.extra_info.unexplored_children;
				cur_node.status = 1;
			}
			
			new_node = new Node(cur_node, state.dir, []);
			cur_node.children[state.dir] = new_node;
			new_space = choose(cur_space.clone(), state.dir);
			return new State(new_node, new_space, 0,
								new Extra_info(0, 0, 0, 0));
		}
		++state.dir;
	}
	return false;
}

// Explore the sub tree until a solution is found or the subtree is exhausted
// The implementation is similar to Search.depth_first() but incorporated extra
// features to facilitate the tree drawing process.
function explore_one(selected_node) {
	var stack = [],
		temp_state, next_state, i;
	
	stack.push(new State(selected_node.node, selected_node.space, 0, 
							new Extra_info(0, 0, 0, 0)));
						
	while (stack.length > 0) {
		temp_state = stack[stack.length-1];
		
		next_state = branch_state(temp_state);
		if (next_state) { // as long as the state is valid (movable).
			try {
				next_state.space.propagate();
				
				// If a solution is found, clean up and exit
				if (is_solved(next_state.space)) {
					next_state.node.succeeded_children = 1;
					next_state.node.status = 2;
					update_state_info(new Extra_info(1, 0, 0, 0), temp_state.extra_info);
					add_state_info_into_node(temp_state);
					for (i = stack.length-1; i > 0; --i) {
						update_state_info(stack[i].extra_info, stack[i-1].extra_info);
						add_state_info_into_node(stack[i-1]);
					}
					
					// update all nodes in the path from the selected node
					// to the root
					update_ancestor(stack[0].node, stack[0].extra_info.succeeded_children,
									stack[0].extra_info.failed_children,
									stack[0].extra_info.stable_children,
									stack[0].extra_info.unexplored_children);
					return;
					
				}
				
				// If the state is stable and unexplored before,
				// update the children info
				if (next_state.node.unexplored_children === 0) {
					next_state.node.status = 0;
					++next_state.extra_info.stable_children;
					++next_state.extra_info.unexplored_children;
				}
				
				stack.push(next_state);
			} catch (e) {
				// If a failed space is reached, clean up and backtrack 1 step
				next_state.node.failed_children = 1;
				next_state.node.status = 3;
				update_state_info(new Extra_info(0,1,0,0), temp_state.extra_info);
			}
		} else {
			if (stack.length > 1) {
				update_state_info(stack[stack.length-1].extra_info, 
									stack[stack.length-2].extra_info);
			} else {
				update_ancestor(stack[0].node, stack[0].extra_info.succeeded_children,
								stack[0].extra_info.failed_children,
								stack[0].extra_info.stable_children,
								stack[0].extra_info.unexplored_children);
			}
			add_state_info_into_node(stack[stack.length-1]);
			stack.pop();
			if (stack.length > 0)
				++stack[stack.length-1].dir;
		}
	}
}

// Explore the entire subtree in depth first search manner.
function explore_all(selected_node) {
	var stack = [],
		temp_state, next_state, i;
	
	stack.push(new State(selected_node.node, selected_node.space, 0,
							new Extra_info(0, 0, 0, 0)));
							
	while (stack.length > 0) {
		temp_state = stack[stack.length-1];
		next_state = branch_state(temp_state);
		
		if (next_state) {
			try {
				next_state.space.propagate();
				
				if (is_solved(next_state.space)) {
					next_state.node.succeeded_children = 1;
					next_state.node.status = 2;
					update_state_info(new Extra_info(1, 0, 0, 0), temp_state.extra_info);
				} else {
					if (next_state.node.unexplored_children === 0) {
						next_state.node.status = 0;
						++next_state.extra_info.stable_children;
						++next_state.extra_info.unexplored_children;
					}

					stack.push(next_state);
				}
			} catch (e) {
				// If a failed space is reached, clean up and backtrack 1 step
				next_state.node.failed_children = 1;
				next_state.node.status = 3;
				update_state_info(new Extra_info(0,1,0,0), temp_state.extra_info);
			}
		} else {
			if (stack.length > 1) {
				update_state_info(stack[stack.length-1].extra_info, 
									stack[stack.length-2].extra_info);
			} else {
				update_ancestor(stack[0].node, stack[0].extra_info.succeeded_children,
								stack[0].extra_info.failed_children,
								stack[0].extra_info.stable_children,
								stack[0].extra_info.unexplored_children);
			}
			add_state_info_into_node(stack[stack.length-1]);
			stack.pop();
			if (stack.length > 0)
				++stack[stack.length-1].dir;
		}
	}
}

// Recursively update the ancestor nodes (up to the root node)
function update_ancestor(node, num_new_succeeded_children, num_new_failed_children, num_new_stable_children, num_new_unexplored_children) {
	
	while (node.parent) {
		node = node.parent;
		node.succeeded_children += num_new_succeeded_children;
		node.failed_children += num_new_failed_children;
		node.stable_children += num_new_stable_children;
		node.unexplored_children += num_new_unexplored_children;
	}
}

// Recomputing space by tracing the path from the root space.
function recomputing_space(node, root_space) {
	var path = [], space;
	
	while (node.parent) {
		path[path.length] = node.child_th;
		node = node.parent;
	}
	
	space = root_space.clone();
	// For depth first search
	if (!node.best_solutions) {
		for (var i=path.length-1; i >= 0; --i) {
			space = space.brancher.branch()(space, path[i]);
			space.propagate();
		}
	} else {
	// For branch and bound
		for (var i=path.length-1; i >= 0; --i) {
			space = space.brancher.branch()(space, path[i]);
			if (node.best_solutions[path[i]])
				ordering(space, node.best_solutions[path[i]]);
			node = node.children[path[i]];
			space.propagate();
		}
	}

	return space;
}

// Explore the search tree using branch and bound technique
// Once a solution is found, ordering constraint will be injected 
// to the subsequent spaces during search.
// NOTE: It is assumed that an ordering function exists
function explore_best(selected_node) {
	var stack = [], best_solution,
		temp_state, next_state, i;
	
	stack.push(new State(selected_node.node, selected_node.space, 0,
							new Extra_info(0, 0, 0, 0)));
							
	while (stack.length > 0) {
		temp_state = stack[stack.length-1];
		if (!temp_state.node.best_solutions)
			temp_state.node.best_solutions = [];

		next_state = branch_state(temp_state);
		
		if (next_state) {
			if (best_solution) {
				ordering(next_state.space, best_solution);
				temp_state.node.best_solutions[temp_state.dir] = best_solution;
			}

			try {
				next_state.space.propagate();
				
				if (is_solved(next_state.space)) {
					next_state.node.succeeded_children = 1;
					next_state.node.status = 2;
					update_state_info(new Extra_info(1, 0, 0, 0), temp_state.extra_info);
					best_solution = next_state.space.solution();
				} else {
					if (next_state.node.unexplored_children === 0) {
						next_state.node.status = 0;
						++next_state.extra_info.stable_children;
						++next_state.extra_info.unexplored_children;
					}

					stack.push(next_state);
				}
			} catch (e) {
				// If a failed space is reached, clean up and backtrack 1 step
				next_state.node.failed_children = 1;
				next_state.node.status = 3;
				update_state_info(new Extra_info(0,1,0,0), temp_state.extra_info);
			}
		} else {
			if (stack.length > 1) {
				update_state_info(stack[stack.length-1].extra_info, 
									stack[stack.length-2].extra_info);
			} else {
				update_ancestor(stack[0].node, stack[0].extra_info.succeeded_children,
								stack[0].extra_info.failed_children,
								stack[0].extra_info.stable_children,
								stack[0].extra_info.unexplored_children);
			}
			
			add_state_info_into_node(stack[stack.length-1]);
			stack.pop();
			if (stack.length > 0) 
				++stack[stack.length-1].dir;
		}
	}
}
//-----------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------
//		EXPLORER Plugin for FD.js library
//-----------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------


// Contains all the graphic function & event listeners
// Type is to indicate the initial set up
// 0: Only the root space is displayed
// 1: Display the tree up to the first found solution
// 2: Display the entire tree with all the solutions
function initializing(root_space, container, type) {
	
	var default_circle_radius = 10,
		default_square_side = 20,
		default_diamond_side = 20,
		default_triangle_base = 20,
		default_ring_thickness = 2,
		circle_angle = Math.PI*2,
		default_x = 40,
		default_y = 50,
		default_space_box_column_width = 120,
		default_space_box_corner_radius = 10,
		default_space_box_x_distance_from_node = 50,
		default_space_box_y_distance_from_node = 20,
		default_space_box_line_color = "FFB404",
		default_space_box_fill_color = "82CC8D",
		default_space_box_max_no_of_lines = 9,
		default_cancel_circle_radius = 8,
		default_font_size = 12,
		default_font_family = "Calibri",
		default_text_padding = 10,
		default_line_height = 15,
		//default_info_box_width = 95,
		default_info_box_height = default_line_height*3 + 2*default_text_padding, // only 3 lines are needed
		//default_info_box_x_distance_from_node = -Math.floor(default_info_box_width / 2),
		default_info_box_y_distance_from_node = -(default_circle_radius + default_info_box_height + 10),
		default_canvas_width = 5000,
		default_canvas_height = 1200,
		default_root_x = Math.floor(default_canvas_width / 2),
		default_root_y = 100,
		min_sep = default_x,
		selected_node = {},
		is_collapsing_no_sol_nodes = true,
		stage = new Kinetic.Stage({
			container: container, 
			width: default_canvas_width, 
			height: default_canvas_height
		}),
		tree_layer = new Kinetic.Layer(),
		tree_branch_layer = new Kinetic.Layer(),
		tree_branch_context = tree_branch_layer.getContext(),
		mask_layer = new Kinetic.Layer(),
		mask_context = mask_layer.getContext(),
		line_layer = new Kinetic.Layer(),
		space_layer = new Kinetic.Layer(),
		space_context = space_layer.getContext(),
		info_layer = new Kinetic.Layer(),
		info_context = info_layer.getContext(),
		root = new Node(null, -1, []);
	
	// Main algorithm of the tree drawing process.
	// Calculate offset of the parent from the node.
	function setup(root, level) {
		var children_seps = [], // seperation of a child node from the first child node.
			root_offset, // offset of the root from its first child.
			top_sep, current_sep, left_c, right_c, temp,
			left_offset_sum, right_offset_sum,
			cluster = {}, child, root_info, temp_node;
		
		if (root) {
			root_info = root.info;
			root_info.level = level;
			
			// Collapse nodes which are not a leave node and have no solution, if needed.
			if (root.unexplored_children === 0 && root.succeeded_children === 0 && is_collapsing_no_sol_nodes && root.status !== 3)
				root.info.is_expanded = false;

			// If the root is un-expandable, then it is assumed to have no child.
			if (!root.info.is_expanded) {
				root_info.left_extreme.set(false, root, level, 0);
				root_info.right_extreme.set(false, root, level, 0);
				return ;
			}
			
			switch (root.children.length) {
				// If there is no children node, do nothing
				case 0:
					root_info.left_extreme.set(false, root, level, 0);
					root_info.right_extreme.set(false, root, level, 0);
					return ;
				// If there is only one child node,
				case 1:
					child = root.children[0];
					root_info.offsets[0] = 0;
					setup(child, level+1);
					root_info.left_extreme.set(child.info.left_extreme);
					root_info.right_extreme.set(child.info.right_extreme);
					return ;
				// If there are more than 2 children, seperate first 2 subtrees.
				// Combine them into a cluster and then seperate with the next subtree.
				// So on and so forth until all subtrees are done.
				default:
					setup(root.children[0], level+1);
					cluster.left_extreme = new Extreme();
					cluster.left_extreme.set(root.children[0].info.left_extreme);
					cluster.right_extreme = new Extreme();
					cluster.right_extreme.set(root.children[0].info.right_extreme);
					cluster.right = root.children[0];
					children_seps[0] = 0;
					
					for (var i=1; i < root.children.length; ++i) {
						child = root.children[i];
						setup(child, level+1);
						
						// Initializing
						left_c = cluster.right;
						right_c = child;
						current_sep = min_sep;
						top_sep = min_sep;
						left_offset_sum = 0;
						right_offset_sum = 0;
						
						
						// Seperating the cluster and the next subtree
						// by moving along their contours until one of them is exhausted.
						while (left_c && right_c) {
							if (current_sep < min_sep) {
								top_sep += min_sep - current_sep;
								current_sep = min_sep;
							}
							
							// Advance the left contour (of the cluster so far)
							temp = left_c.next_right();
							left_c = temp.node;
							if (left_c) {
								current_sep -= temp.offset;
								left_offset_sum += temp.offset;
							}
								
							// Advance the right contour (of the next child)
							temp = right_c.next_left();
							right_c = temp.node;
							if (right_c) {
								current_sep += temp.offset;
								right_offset_sum += temp.offset;
							}
						}
						
						// If the cluster and the next subtree are of uneven heights,
						// check to see whether threading is necessary.
						if (left_c && left_c !== cluster.right) {
							temp_node = child.info.right_extreme.node;
							temp_node.info.is_threaded = left_c;
							temp_node.info.thread_offset = left_offset_sum - (top_sep +
											child.info.right_extreme.offset_from_root);
						} else if (right_c && right_c !== child) {
							temp_node = cluster.left_extreme.node;
							temp_node.info.is_threaded = right_c;
							temp_node.info.thread_offset = top_sep + right_offset_sum -
											cluster.left_extreme.offset_from_root;
						}
						
						// Combine the cluster and the next subtree.
						// And update the extremes.
						cluster.right = child;
						// Update left extreme of the cluster.
						if (child.info.left_extreme.level > cluster.left_extreme.level) {
							cluster.left_extreme = child.info.left_extreme;
						} else {
							cluster.left_extreme.offset_from_root -= top_sep;
						}
						// Update right extreme of the cluster.
						if (child.info.right_extreme.level >= cluster.right_extreme.level) {
							cluster.right_extreme = child.info.right_extreme;
						} else {
							cluster.right_extreme.offset_from_root -= top_sep;
						}
						
						// Update the separtion of the children nodes of the root
						children_seps[i] = children_seps[i-1] + top_sep;
					}			
					
					// Update the offset of the root and the extremes of the root.
					root_offset = Math.floor(children_seps[root.children.length-1] / 2);
					for (var i = 0; i < root.children.length; ++i) {
						root.info.offsets[i] = children_seps[i] - root_offset;
					}
					
					root.info.left_extreme.set(cluster.left_extreme);
					root.info.left_extreme.offset_from_root += root_offset;
					root.info.right_extreme.set(cluster.right_extreme);
					root.info.right_extreme.offset_from_root += root_offset;
			}
		}
	}

	//-----------------------------------------------------------------------------------------------------
	//		CANVAS DRAWING
	//-----------------------------------------------------------------------------------------------------
	var expanded_node_graphic = { // normal node
			0: { shape: "circle", color: "cadetblue" },		// explorable node
			1: { shape: "circle", color: "blue" },			// non-explorable node
			2: { shape: "diamond", color: "green" },		// solution leave
			3: { shape: "square", color: "red" }			// non-solution leave
		},
		collapsed_node_graphic = { // collapsed node
			0: { shape: "triangle", color: "yellow" },		// partially explored with solutions
			1: { shape: "triangle", color: "violet"},		// partially explored with no solution
			2: { shape: "triangle", color: "green"},		// fully explored with solutions
			3: { shape: "triangle", color: "red"}			// fully explored with no solution
		};
	
	var shapes = {
		"circle": function (x, y, color) {
						return new Kinetic.Circle({
							x: x,
							y: y,
							radius: default_circle_radius,
							fill: color
						});
					},
		"square": function (x, y, color) {
						var half_side = Math.floor(default_square_side / 2),
							points = [
								{x: x - half_side, y: y - half_side},
								{x: x + half_side, y: y - half_side},
								{x: x + half_side, y: y + half_side},
								{x: x - half_side, y: y + half_side}
							];
							
						return new Kinetic.Polygon({
							points: points,
							fill: color
						});
					},
		"triangle": function (x, y, color) {
						var half_side = Math.floor(default_triangle_base / 2),
							points = [
								{x: x, y: y - half_side},
								{x: x + half_side, y: y + half_side},
								{x: x - half_side, y: y + half_side}
							];
							
						return new Kinetic.Polygon({
							points: points,
							fill: color
						});
					},
		"diamond": function (x, y, color) {
						var half_side = Math.floor(default_diamond_side / 2),
							points = [
								{x: x, y: y - half_side},
								{x: x + half_side, y: y},
								{x: x, y: y + half_side},
								{x: x - half_side, y: y}
							];
							
						return new Kinetic.Polygon({
							points: points,
							fill: color
						});
					}
	};

	function rounded_rectangle(x, y, width, height, corner_radius, border_color, fill_color) {
		return new Kinetic.Shape({
			drawFunc: function() {
				var context = this.getContext();
				context.beginPath();
				context.moveTo(x + corner_radius, y);
				context.lineTo(x + width - corner_radius, y);
				context.arcTo(x + width, y, x + width, y + corner_radius, corner_radius);
				context.lineTo(x + width, y + height - corner_radius);
				context.arcTo(x + width, y + height, x + width - corner_radius, y + height, corner_radius);
				context.lineTo(x + corner_radius, y + height);
				context.arcTo(x, y + height, x, y + height - corner_radius, corner_radius);
				context.lineTo(x, y + corner_radius);
				context.arcTo(x, y, x + corner_radius, y, corner_radius);
				context.closePath();
				this.fillStroke();
			},
			stroke: border_color,
			strokeWidth: 1,
			fill: fill_color
		});
	}

	function cancel_circle(x, y, radius) {
		return new Kinetic.Circle({
			radius: radius,
			x: x,
			y: y,
			fill: "red",
			stroke: "black",
			strokeWidth: 1
		});
	}

	function cross_shape(x, y, radius) {
		return new Kinetic.Shape({
			drawFunc: function() {
				var context = this.getContext(),
					temp = radius * Math.sin(Math.PI/4);

				context.beginPath();
				context.moveTo(x-temp, y-temp);
				context.lineTo(x+temp, y+temp);
				context.closePath();
				this.fillStroke();
				context.beginPath();
				context.moveTo(x+temp, y-temp);
				context.lineTo(x-temp, y+temp);
				context.closePath();
				this.fillStroke();
			},
			stroke: "black",
			strokeWidth: 2
		});
	}

	// line_package has 6 properties
	// line: Kinetic Shape
	// space_box: the space information box (also a Kinetic Shape object)
	// x1, y1: starting point's coordinates
	// x2, y2: ending point's coordinates
	function draw_space_box_line(line_package) {
		line_package.line.setDrawFunc(function(){
			var context = this.getContext();
			context.beginPath();
			context.moveTo(line_package.x1, line_package.y1);
			context.lineTo(line_package.x2, line_package.y2);
			context.closePath();
			this.fillStroke();
		});
		line_layer.draw();
	}

	function draw_tree_line(x1, y1, x2, y2) {
		tree_branch_context.beginPath();
		tree_branch_context.moveTo(x1,y1);
		tree_branch_context.lineTo(x2,y2);
		tree_branch_context.closePath();
		tree_branch_context.stroke();
	}
	
	function draw_ring(x, y) {
		mask_layer.clear();
		mask_context.beginPath();
		mask_context.arc(x, y, default_circle_radius + default_ring_thickness, 0, circle_angle, true);
		mask_context.closePath();
		mask_context.lineWidth = default_ring_thickness;
		mask_context.stroke();
	}

	function write_text(text, x, y) {
		return new Kinetic.Text({
			x: x,
			y: y,
			text: text,
			fontSize: default_font_size,
			fontFamily: default_font_family,
			textFill: "black",
			align: "left"
		});
	}
	
	function draw_node(node, x, y) {
		var shape, color, temp = 0, gnode;
		
		if (node.info.is_expanded) {
			shape = expanded_node_graphic[node.status].shape;
			color = expanded_node_graphic[node.status].color;
		} else {
			if (node.unexplored_children === 0)
				temp += 2;
			if (node.succeeded_children === 0)
				temp += 1;
			shape = collapsed_node_graphic[temp].shape;
			color = collapsed_node_graphic[temp].color;
		}
		
		gnode = shapes[shape](x, y, color);
		
		// Add event listener
		gnode.on("click", function(evt) {
			
			if (selected_node.node) {
				selected_node.node.info.is_selected = false;
			}
			
			selected_node.node = node;
			selected_node.x = x;
			selected_node.y = y;
			node.info.is_selected = true;
			selected_node.space = recomputing_space(node, root_space);
			// draw a ring surrounding the selected node
			draw_ring(x, y);
		});
		
		gnode.on("dblclick", function(evt) {
			if (selected_node.node.status === 0 && selected_node.node.info.is_expanded) {
				explore_next(selected_node);
				is_collapsing_no_sol_nodes = false;
				redraw_canvas();
			}
		});

		gnode.on("mouseover", function(evt) {
			display_info(node, x, y);
			info_layer.draw();
		});

		gnode.on("mouseout", function(evt) {
			info_layer.removeChildren();
			info_layer.clear();
		});
		
		if (node.info.is_selected) {
			draw_ring(x, y);
			selected_node.x = x;
			selected_node.y = y;			
		}

		if (node.info.is_space_displayed) {
			node.info.is_space_displayed.x1 = x;
			node.info.is_space_displayed.y1 = y;
			line_layer.add(node.info.is_space_displayed.line);
			space_layer.add(node.info.is_space_displayed.space_box);
			draw_space_box_line(node.info.is_space_displayed);
		}
		tree_layer.add(gnode);
	}
	
	function draw_tree(root, x, y) {
		var newx, newy;
		
		// Remove any thread from the node.
		if (root.info.is_threaded) {
			root.info.is_threaded = false;
			root.info.thread_offset = 0;
		}
		
		if (root.info.is_expanded) {
			for (var i=0; i < root.children.length; ++i) {
				newx = x + root.info.offsets[i];
				newy = y + default_y;
				draw_tree_line(x, y + default_circle_radius, newx, newy - default_circle_radius);
				draw_tree(root.children[i], newx, newy);
			}
		}
		
		draw_node(root, x, y);
	}
	
	function redraw_canvas() {
		tree_branch_layer.clear();
		tree_layer.clear();
		tree_layer.removeChildren();
		space_layer.clear();
		space_layer.removeChildren();
		line_layer.clear();
		line_layer.removeChildren();
		setup(root, 1);
		draw_tree(root, default_root_x, default_root_y);
		tree_layer.draw();
		line_layer.draw();
		space_layer.draw();
	}
	
	// Display the space's variables and theirs domains
	function display_space(node, space, x, y) {
		var space_box = new Kinetic.Group({
				draggable: true
			}),
			line = new Kinetic.Shape({
				drawFunc: function() {
				},
				stroke: default_space_box_line_color,
				alpha: 0.7,
				strokeWidth: 5
			}),
			space_box_x = x + default_space_box_x_distance_from_node,
			space_box_y = y + default_space_box_y_distance_from_node,
			text_dimension = wrap_solution(space, space_box, space_box_x + default_text_padding, space_box_y + default_text_padding, 
												default_space_box_column_width, default_line_height),
			space_box_width = text_dimension.width + 2*default_text_padding,
			space_box_height = text_dimension.height + 2*default_text_padding,
			offset_x = space_box_x + Math.floor(space_box_width/2),
			offset_y = space_box_y + Math.floor(space_box_height/2),
			box = rounded_rectangle(space_box_x, space_box_y, space_box_width, space_box_height, 
									default_space_box_corner_radius, "black", default_space_box_fill_color), //"B2846C"
			cancel_button = cancel_circle(space_box_x + space_box_width, space_box_y, default_cancel_circle_radius),
			cross = cross_shape(space_box_x + space_box_width, space_box_y, default_cancel_circle_radius);

		cancel_button.on ("mouseover", function() {
			document.body.style.cursor = "pointer";
			space_box.draggable(false);
			this.transitionTo({
				scale: {
					x: 1.5,
					y: 1.5
				},
				duration: 0.3,
				easing: "ease-out"
			});
			space_layer.draw();
		});

		cancel_button.on ("mouseout", function() {
			document.body.style.cursor = "default";
			space_box.draggable(true);
			this.transitionTo({
				scale: {
					x: 1,
					y: 1
				},
				duration: 0.2,
				easing: "ease-out"
			});
			space_layer.draw();
		});

		cancel_button.on ("click", function() {
			node.info.is_space_displayed = false;
			space_layer.remove(space_box);
			space_layer.draw();
			line_layer.remove(line);
			line_layer.draw();
		});
		
		node.info.is_space_displayed = {
			line: line,
			space_box: space_box,
			x1: x,
			y1: y,
			x2: offset_x,
			y2: offset_y
		};
		line_layer.add(line);
		draw_space_box_line(node.info.is_space_displayed);
		space_box.add(box);
		box.setZIndex(0);
		space_box.add(cancel_button);
		space_box.add(cross);
		space_layer.add(space_box);
		
		space_box.on("dragmove", function() {
			node.info.is_space_displayed.x2 = space_box.attrs.x + offset_x;
			node.info.is_space_displayed.y2 = space_box.attrs.y + offset_y;
			draw_space_box_line(node.info.is_space_displayed);
		});
	}

	// Get the variables' domain from the space
	// and then format the text for displaying.
	// The function returns the object which contains 
	// dimension of the entire text body.
	function wrap_solution(space, space_box, x, y, column_width, line_height) {
		var i, v, d, line, test_line, next_word, line_width, indent_pos, indent_space, 
			max_width = 0,
			max_height = 0,
			acc_width = 0, 
			vars_count = 0, 
			original_y = y; 
		
		for (i in space.vars) {
			if (/^[0-9]+$/.test(i) === false) {
				++vars_count;
				v = space.vars[i];
				d = v.dom;
				if (d.length === 0) {
					line = "failed space";
					max_width = Math.max(max_width, space_context.measureText(line).width);
					space_box.add(write_text(line, x, y));
				} else if (d.length > 1 || d[0][1] > d[0][0]) {
					line = "" + i + ":";
					space_box.add(write_text(line, x, y));
					indent_space = space_context.measureText(line).width;
					indent_pos = x + indent_space;
					line = "";
					for (var j=0; j < d.length; ++j) {
						if (d[j][0] === d[j][1])
							next_word = " " + d[j][0];
						else
							next_word = " [" + d[j][0] + ", " + d[j][1] +"]";
						if (j !== d.length-1)
							next_word += ",";

						test_line = line + next_word;
						if (space_context.measureText(test_line).width + indent_space > column_width) {
							space_box.add(write_text(line, indent_pos, y));
							y += line_height;
							line = next_word;
							max_width = column_width;
						} else {
							line = test_line;
						}
					}

					space_box.add(write_text(line, indent_pos, y));
					max_width = Math.max(max_width, space_context.measureText(line).width + indent_space);
				} else {
					line = "" + i + ": " + d[0][0];
					max_width = Math.max(max_width, space_context.measureText(line).width);
					space_box.add(write_text(line, x, y));
				}

				y += line_height;

				if (vars_count % default_space_box_max_no_of_lines === 0) {
					max_height = Math.max(max_height, y - original_y);
					acc_width += max_width + default_text_padding;
					x += max_width + default_text_padding;
					y = original_y;
					max_width = 0;
				}
			}
		}
		return (acc_width === 0? 
		{
			width: max_width,
			height: y - original_y
		} : 
		{
			width: acc_width + max_width,
			height: max_height
		}

		);
	}

	// Display the statistics of the node: no. of succeeded children, 
	// no. of stable children and no. of failed children.
	function display_info(node, x, y) {
		var texts = [], max_width = 0; 
		
		texts[0] = "Soln: " + node.succeeded_children;
		texts[1] = "Stable: " + node.stable_children;
		texts[2] = "Failed: " + node.failed_children;
		// Get the longest text
		for (var i=0; i < 3; ++i)
			max_width = Math.max(max_width, info_context.measureText(texts[i]).width);
		max_width += 2 * default_text_padding;

		// Draw the box
		x += -Math.floor(max_width / 2);
		y += default_info_box_y_distance_from_node;
		info_layer.add(rounded_rectangle(x, y, max_width, default_info_box_height, 
						default_space_box_corner_radius, "black", default_space_box_fill_color));
		
		// Write the text
		x += default_text_padding;
		y += default_text_padding;
		for (var i=0 ; i < 3; ++i) {
			info_layer.add(write_text(texts[i], x, y));
			y += default_line_height;
		}
	}
	
	//-----------------------------------------------------------------------------------------------------
	//		CONTEXT MENU
	//-----------------------------------------------------------------------------------------------------

	$(function (){
		$.contextMenu({
			selector: '#' + container, 
			callback: function(key, options) {
			},
			items: {
				"display space": {
					name: "Display space",
					callback: function() {
						display_space(selected_node.node, selected_node.space, selected_node.x, selected_node.y);
						space_layer.draw();
					},
					disabled: function() {
						if (!selected_node.node || selected_node.node.status === 3 || selected_node.node.info.is_space_displayed)
							return true;
						else
							return false;
					},
					icon: "quit"
				},
				"sep1": "---------",
				"collapse": {
					name: "Collapse", 
					callback: function() {
						selected_node.node.info.is_expanded = false;
						is_collapsing_no_sol_nodes = false;
						redraw_canvas();
					},
					disabled: function() {
						if (!selected_node.node)
							return true;
						else if (!selected_node.node.info.is_expanded || selected_node.node.status > 1)
							return true;
						else
							return false;
					},	
					icon: "edit"						
				},
				"expand": {
					name: "Expand", 
					callback: function() {
						selected_node.node.info.is_expanded = true;
						is_collapsing_no_sol_nodes = false;
						redraw_canvas();
					},
					disabled: function () {
						if (!selected_node.node)
							return true;
						else if (selected_node.node.info.is_expanded || selected_node.node.status > 1)
							return true;
						else 
							return false;
					},
					icon: "cut"
				},
				"sep2": "---------",
				"explore_next": {
					name: "Explore Next",
					callback: function () {
						explore_next(selected_node);
						is_collapsing_no_sol_nodes = false;
						redraw_canvas();
					},
					disabled: function () {
						if (!selected_node.node || selected_node.node.info.is_expanded === false)
							return true;
						else if (selected_node.node.status === 0)
							return false;
						else 
							return true;
					},
					icon: "copy"
				},
				"explore one": {
					name: "Explore One", 
					callback: function() {
						explore_one(selected_node);
						is_collapsing_no_sol_nodes = true;
						redraw_canvas();
					},
					disabled: function() {
						if (!selected_node.node || selected_node.node.unexplored_children === 0 || selected_node.node.info.is_expanded === false)
							return true;
						else
							return false;
					},
					icon: "paste"
				},
				"explore all": {
					name: "Explore All", 
					callback: function() {
						explore_all(selected_node);
						is_collapsing_no_sol_nodes = true;
						redraw_canvas();
					},
					disabled: function() {
						if (!selected_node.node || selected_node.node.unexplored_children === 0 || selected_node.node.info.is_expanded === false)
							return true;
						else
							return false;
					},
					icon: "delete"
				}
			}
		});
	});
	
	//-----------------------------------------------------------------------------------------------------
	//		HOTKEY
	// d - display the space (keycode 100)
	// space - collapse/expand the subtree (32)
	// n - explore the next space (110)
	// o - explore the subtree until the next solution is found (111)
	// a - explore the entire subtree (97)
	//-----------------------------------------------------------------------------------------------------
	$("body").keypress(function(evt) {
		evt.preventDefault();
		if (selected_node) {
			switch (evt.keyCode) {
				case 100:
					if (selected_node.node.status !== 3 && !selected_node.node.info.is_space_displayed) {
						display_space(selected_node.node, selected_node.space, selected_node.x, selected_node.y);
						space_layer.draw();
					}
					break;
				case 32:
					if (selected_node.node.status < 2) {
						selected_node.node.info.is_expanded = !selected_node.node.info.is_expanded;
						is_collapsing_no_sol_nodes = false;
						redraw_canvas();
					}
					break;
				case 110:
					if (selected_node.node.info.is_expanded && selected_node.node.status === 0) {
						explore_next(selected_node);
						is_collapsing_no_sol_nodes = false;
						redraw_canvas();
					}
					break;
				case 111:
					if (selected_node.node.info.is_expanded && selected_node.node.unexplored_children !== 0) {
						explore_one(selected_node);
						is_collapsing_no_sol_nodes = true;
						redraw_canvas();
					}
					break;
				case 97:
					if (selected_node.node.info.is_expanded && selected_node.node.unexplored_children !== 0) {
						explore_all(selected_node);
						is_collapsing_no_sol_nodes = true;
						redraw_canvas();
					}
					break;
				default:
					break;
			}
		}
	});


	//-----------------------------------------------------------------------------------------------------
	//		EXPLORER INITIALIZATION
	//-----------------------------------------------------------------------------------------------------
	(function () {
		try {
			root_space.propagate();
			if (is_solved(root_space)) {
				root.status = 2;
				root.succeeded_children = 1;
			} else  {
				root.status = 0;
				root.stable_children = 1;
				if (root_space.brancher.branch() === null) {
					// root space has no brancher
					root.status = 1;
				} else {
					root.unexplored_children = 1;
					root.status = 0;
				}
			}			
		} catch (e) {
			root.status = 3;
			root.failed_children = 1;
		}
		
		setup(root, 1);
		stage.add(tree_branch_layer);
		stage.add(line_layer);
		stage.add(mask_layer);
		draw_tree(root, default_root_x, default_root_y);
		stage.add(tree_layer);
		stage.add(space_layer);
		stage.add(info_layer);
		space_context.font = "" + default_font_size + "pt " + default_font_family;
		space_context.fillStyle = "#333";
		info_context.font = "" + default_font_size + "pt " + default_font_family;
		info_context.fillStyle = "#333";
		
		// Scroll to the middle of the canvas.
		$("body").scrollLeft(Math.floor((default_canvas_width - $(window).width()) / 2));
	})()

	switch (type) {
		case 1: 
			explore_one({
				node: root,
				space: root_space
			});
			redraw_canvas();
			break;
		case 2:
			explore_all({
				node: root,
				space: root_space
			});
			redraw_canvas();
			break;
		case 3:
			explore_best({
				node: root,
				space: root_space
			});
			redraw_canvas();
			break;
		default:
			break;
	}
};

FD.Explore = function(problem, container) {
	if (problem.solve_for)
		is_solved = problem.solve_for;
	else
		is_solved = FD.search.solve_for_variables();
	initializing(problem.script(new FD.space()), container, 0);
};

FD.ExploreOne = function(problem, container) {
	if (problem.solve_for)
		is_solved = problem.solve_for;
	else
		is_solved = FD.search.solve_for_variables();
	initializing(problem.script(new FD.space()), container, 1);
};

FD.ExploreAll = function(problem, container) {
	if (problem.solve_for)
		is_solved = problem.solve_for;
	else
		is_solved = FD.search.solve_for_variables();
	initializing(problem.script(new FD.space()), container, 2);
};

FD.ExploreBest = function(problem, container) {
	if (problem.solve_for)
		is_solved = problem.solve_for;
	else
		is_solved = FD.search.solve_for_variables();
	ordering = problem.ordering;
	initializing(problem.script(new FD.space()), container, 3);
};

})();