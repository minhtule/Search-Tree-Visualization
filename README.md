Search Tree Visualization for Finite Domain Constraint Problems
====================

Explorer.js is a plug-in library to the [FD.js](http://nishabdam.com:8080/fd/index) library 
written by Mr. Srikumar. Explorer.js allows users to follow the search process
graphically and step by step. 

As FD.js is designed based on the Finite Domain Constraint Programming 
feature of [Mozart/Oz](http://www.mozart-oz.org/documentation/fdt/index.html),
Explorer.js is also designed based on the [Oz Explorer](http://www.mozart-oz.org/documentation/explorer/index.html). 

Dependencies
---------------------
All of these libraries need to be loaded prior to Explorer.js for full 
functionality.

+ [FD.js](http://nishabdam.com:8080/fd/index) (Finite Domain Constraint main engine)
+ [Kinetic.js](http://www.kineticjs.com/) (Drawing and interaction on HTML5 Canvas)
+ jQuery.js (Needed for below libraries and Explorer's hotkey functionality)
+ jQuery.ui.position.js (Needed to nicely position the context menu but can be
ignored. Refer [jQuery.contextMenu.js](https://github.com/medialize/jQuery-contextMenu/blob/gh-pages/README.md))
for more detailed.)
+ [jQuery.contextMenu.js] (https://github.com/medialize/jQuery-contextMenu/blob/gh-pages/README.md)
(Creating the context menu in the Explorer)

User Guide
---------------------
### Invoke the Explorer
Explorer.js provides 4 methods to invoke the Explorer (as part of FD). The first 3 use depth first search engine
while the last one uses branch and bound search engine.

+ **FD.Explore** (*problem*, *container*) : Initialize the explorer and display the orignal space
+ **FD.ExploreOne** (*problem*, *container*) : Initialize the explorer and display the search tree until the first 
solution is found
+ **FD.ExploreAll** (*problem*, *container*) : Initialize the explorer and display the entire search tree
+ **FD.ExploreBest** (*problem*, *container*) : Initialize the explore and display the entire search tree (using 
branch and bound search)

Explanation

- *problem* : An object describes the FD constraint problem to be solved. Refer to [FD.js API](http://nishabdam.com:8080/fd/wiki?name=API)
to learn how to write scripts in FD.js.

````
	var problem = {
		script: function (space) { 
			...
		},
		// Only for branch and bound
		ordering: function (space, best_solution) { 
			...
		},
		// Optional
		solve_for: FD.search.solve_for_variables(...) 
	};
````

- *container* : HTML div id of the div tag where the canvases (Kinetic.js creates 
many layers of canvas!) reside

### Context Menu & Hotkeys
To explore the the search tree, you can use either the context menu (by right click) or the hotkeys.

+ Display space (**d**) - Display the space's varibles and their domains
+ Collapse (**space**) - Collapse a node
+ Expand (**space**) - Expand a node
+ Explore Next (**n**) - Explore the next space
+ Explore One (**o**) - Explore the subtree until the next solution is found
+ Explore All (**a**) - Explore the entire subtree

### The Search Tree

![](https://github.com/minhtule/Search-Tree-Visualization/raw/gh-pages/nodes.jpg "Nodes in the search tree")

**Figure 1:** Nodes in the search tree


![](https://github.com/minhtule/Search-Tree-Visualization/raw/gh-pages/subtrees.jpg "Collapsed subtrees in the search tree")

**Figure 2:** Collapsed subtrees in the search tree

Authors
---------------------
### Authors:
+ [Minh Tu Le](https://github.com/minhtule) (<minhtule0412@gmail.com>)
+ [Shubham Goyal](https://github.com/shubhamgoyal) (<shubhamjigoyal@gmail.com>)

### Supervisors:
+ Assoc. Prof. Martin Henz (National University of Singapore)
+ Mr. Srikumar K. S. (National University of Sinagpore)