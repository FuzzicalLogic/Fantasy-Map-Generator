export const Voronoi = function ({ triangles, halfedges }, points, pointsN) {
//    const cells = { v: [], c: [], b: [] }; // voronoi cells: v = cell vertices, c = adjacent cells, b = near-border cell
    const vertices = { p: [], v: [], c: [] }; // cells vertices: p = vertex coordinates, v = neighboring vertices, c = adjacent cells

    const cells = [];
    const { length } = triangles;
    for (let e = 0; e < length; e++) {

        const p = triangles[nextHalfedge(e)];
//        if (p < pointsN && !cells.c[p]) {
//            const edges = getEdges(halfedges, e);
//            cells.v[p] = edges.map(e => triangleOfEdge(e));                              // cell: adjacent vertex
//            cells.c[p] = edges.map(e => triangles[e]).filter(c => c < pointsN); // cell: adjacent valid cells
//            cells.b[p] = edges.length > cells.c[p].length ? 1 : 0;                       // cell: is border
//        }

        if (p < pointsN && !cells[p])
            cells[p] = { v: [], c: [], b: 0 };

        if (p < pointsN && !cells[p].c.length) {
            const edges = getEdges(halfedges, e);
            cells[p].v = edges.map(e => triangleOfEdge(e));                              // cell: adjacent vertex
            cells[p].c = edges.map(e => triangles[e]).filter(c => c < pointsN); // cell: adjacent valid cells
            cells[p].b = edges.length > cells[p].c.length ? 1 : 0;                       // cell: is border
        }

        const t = triangleOfEdge(e);
        if (!vertices.p[t]) {
            vertices.p[t] = getCenter(triangles, t);              // vertex: coordinates
            vertices.v[t] = getAdjacent(halfedges, t); // vertex: adjacent vertices
            vertices.c[t] = getVertices(triangles, t);            // vertex: adjacent cells
        }
    }

    function getCenter(triangles, t) {
        let vertices = getVertices(triangles, t).map(p => points[p]);
        return circumcenter(vertices[0], vertices[1], vertices[2]);
    }

//    return { cells, vertices }
    return { cells, vertices }

}

function getVertices(triangles, t) {
    return edgesOfTriangle(t).map(e => triangles[e]);
}


function getEdges(halfedges, start) {
    let result = [], incoming = start;
    do {
        result.push(incoming);
        const outgoing = nextHalfedge(incoming);
        incoming = halfedges[outgoing];
    } while (incoming !== -1 && incoming !== start && result.length < 20);
    return result;
}

function getAdjacent(halfedges, t) {
    let triangles = [];
    for (let e of edgesOfTriangle(t)) {
        let opposite = halfedges[e];
        triangles.push(triangleOfEdge(opposite));
    }
    return triangles;
}

function edgesOfTriangle(x) { return [3 * x, 3 * x + 1, 3 * x + 2]; }

function triangleOfEdge(x) { return Math.floor(x / 3); }

function nextHalfedge(x) { return (x % 3 === 2) ? x - 2 : x + 1; }

function prevHalfedge(x) { return (x % 3 === 0) ? x + 2 : x - 1; }

function circumcenter(a, b, c) {
    let ad = a[0] * a[0] + a[1] * a[1],
        bd = b[0] * b[0] + b[1] * b[1],
        cd = c[0] * c[0] + c[1] * c[1];
    let D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    return [
        Math.floor(1 / D * (ad * (b[1] - c[1]) + bd * (c[1] - a[1]) + cd * (a[1] - b[1]))),
        Math.floor(1 / D * (ad * (c[0] - b[0]) + bd * (a[0] - c[0]) + cd * (b[0] - a[0])))
    ];
}
