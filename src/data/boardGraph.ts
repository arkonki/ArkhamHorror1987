export type BoardNodeType = 'location' | 'space' | 'junction' | 'transport';

export interface BoardNode {
  id: string;
  type: BoardNodeType;
  label?: string;
  locationId?: string; // Links to LOCATIONS_DATA key
  streetName?: string; // e.g. "North Street", "West Street"
  x: number; // SVG coordinate
  y: number; // SVG coordinate
}

export interface BoardEdge {
  a: string;
  b: string;
  cost: 1;
}

// -------------------------------------------------------------
// AUTHENTIC 1987 ARKHAM BOARD GRAPH NODES
// All 26 locations + 3 taxi stands + empty street stepping spaces
// -------------------------------------------------------------
export const BOARD_NODES: Record<string, BoardNode> = {
  // ===========================================================
  // 1. NORTH STREET (West Taxi Stand -> Black Cave -> East Taxi Stand)
  // ===========================================================
  TAXI_W: { id: 'TAXI_W', type: 'transport', label: 'West Taxi Stand', streetName: 'West Taxi Stand', x: 230, y: 460 },
  S_NW_01: { id: 'S_NW_01', type: 'space', streetName: 'Northwest Road', x: 250, y: 410 },
  S_NW_02: { id: 'S_NW_02', type: 'space', streetName: 'Northwest Road', x: 285, y: 375 },
  LOC_HARVEY_JONES_SHACK: { id: 'LOC_HARVEY_JONES_SHACK', type: 'location', label: "Harney Jones' Shack", locationId: 'harney_jones_shack', streetName: 'North Street', x: 340, y: 350 },
  S_N_01: { id: 'S_N_01', type: 'space', streetName: 'North Street', x: 395, y: 340 },
  S_N_02: { id: 'S_N_02', type: 'space', streetName: 'North Street', x: 445, y: 330 },
  S_N_03: { id: 'S_N_03', type: 'space', streetName: 'North Street', x: 495, y: 325 },
  LOC_TRAIN_STATION: { id: 'LOC_TRAIN_STATION', type: 'location', label: 'Train Station', locationId: 'train_station', streetName: 'North Street', x: 550, y: 320 },
  S_N_04: { id: 'S_N_04', type: 'space', streetName: 'North Street', x: 605, y: 325 },
  S_N_05: { id: 'S_N_05', type: 'space', streetName: 'North Street', x: 655, y: 332 },
  S_N_06: { id: 'S_N_06', type: 'space', streetName: 'North Street', x: 700, y: 340 },
  S_N_07: { id: 'S_N_07', type: 'space', streetName: 'North Street', x: 745, y: 350 },
  LOC_BLACK_CAVE: { id: 'LOC_BLACK_CAVE', type: 'location', label: 'Black Cave', locationId: 'black_cave', streetName: 'North Street', x: 795, y: 355 },
  S_NE_01: { id: 'S_NE_01', type: 'space', streetName: 'Lodge Road', x: 840, y: 365 },
  LOC_SILVER_TWILIGHT_LODGE: { id: 'LOC_SILVER_TWILIGHT_LODGE', type: 'location', label: 'Silver Twilight Lodge', locationId: 'silver_twilight_lodge', streetName: 'Northeast Avenue', x: 885, y: 380 },
  S_NE_02: { id: 'S_NE_02', type: 'space', streetName: 'Northeast Avenue', x: 910, y: 415 },
  S_NE_03: { id: 'S_NE_03', type: 'space', streetName: 'Northeast Avenue', x: 925, y: 455 },
  TAXI_E: { id: 'TAXI_E', type: 'transport', label: 'East Taxi Stand', streetName: 'East Taxi Stand', x: 930, y: 500 },

  // ===========================================================
  // 2. WEST DISTRICT (West Taxi -> Graveyard -> Press -> Beach)
  // ===========================================================
  S_W_01: { id: 'S_W_01', type: 'space', streetName: 'West Avenue', x: 235, y: 500 },
  S_W_02: { id: 'S_W_02', type: 'space', streetName: 'West Avenue', x: 245, y: 535 },
  J_GRAVEYARD_NW: { id: 'J_GRAVEYARD_NW', type: 'junction', label: 'Graveyard NW Junction', streetName: 'Cemetery Road', x: 255, y: 570 },
  LOC_GRAVEYARD: { id: 'LOC_GRAVEYARD', type: 'location', label: 'Graveyard', locationId: 'graveyard', streetName: 'Cemetery Lane', x: 300, y: 570 },
  S_GRAVE_01: { id: 'S_GRAVE_01', type: 'space', streetName: 'Cemetery Lane', x: 340, y: 570 },
  J_GRAVEYARD_E: { id: 'J_GRAVEYARD_E', type: 'junction', label: 'Graveyard East Junction', streetName: 'Hospital Way', x: 380, y: 570 },

  // Newspaper / Library
  S_NEWSPAPER_N: { id: 'S_NEWSPAPER_N', type: 'space', streetName: 'Press Street', x: 260, y: 615 },
  LOC_NEWSPAPER: { id: 'LOC_NEWSPAPER', type: 'location', label: 'Arkham Gazette', locationId: 'newspaper', streetName: 'Press Street', x: 265, y: 660 },
  S_NEWSPAPER_S1: { id: 'S_NEWSPAPER_S1', type: 'space', streetName: 'Southwest Road', x: 275, y: 705 },
  S_NEWSPAPER_S2: { id: 'S_NEWSPAPER_S2', type: 'space', streetName: 'Southwest Road', x: 285, y: 750 },
  LOC_LIBRARY: { id: 'LOC_LIBRARY', type: 'location', label: 'Public Library', locationId: 'library', streetName: 'Library Steps', x: 295, y: 795 },
  S_LIB_01: { id: 'S_LIB_01', type: 'space', streetName: 'Coastal Path', x: 330, y: 830 },
  LOC_DEVILS_BEACH: { id: 'LOC_DEVILS_BEACH', type: 'location', label: "Devil's Beach", locationId: 'devils_beach', streetName: 'River Shore', x: 370, y: 855 },

  // ===========================================================
  // 3. MEDICAL DISTRICT (Hospital, Sanitarium & Asylum Way)
  // ===========================================================
  LOC_HOSPITAL: { id: 'LOC_HOSPITAL', type: 'location', label: "St. Mary's Hospital", locationId: 'hospital', streetName: 'Hospital Way', x: 385, y: 650 },
  S_HS_01: { id: 'S_HS_01', type: 'space', streetName: 'Asylum Street', x: 435, y: 650 },
  LOC_SANITARIUM: { id: 'LOC_SANITARIUM', type: 'location', label: 'Arkham Sanitarium', locationId: 'sanitarium', streetName: 'Asylum Street', x: 490, y: 650 },
  S_SAN_01: { id: 'S_SAN_01', type: 'space', streetName: 'Asylum Street', x: 530, y: 670 },
  J_VELMA_W: { id: 'J_VELMA_W', type: 'junction', label: 'Velma West Junction', streetName: 'River Street', x: 555, y: 710 },

  // ===========================================================
  // 4. WOODS & SHUNNED HOUSE (Wilderness Border)
  // ===========================================================
  S_WOODS_01: { id: 'S_WOODS_01', type: 'space', streetName: 'Woods Path', x: 420, y: 500 },
  S_WOODS_02: { id: 'S_WOODS_02', type: 'space', streetName: 'Woods Path', x: 450, y: 465 },
  LOC_WOODS: { id: 'LOC_WOODS', type: 'location', label: 'Woods', locationId: 'woods', streetName: 'Woods Path', x: 490, y: 435 },
  S_WOODS_SHUNNED: { id: 'S_WOODS_SHUNNED', type: 'space', streetName: 'Marsh Road', x: 540, y: 430 },
  LOC_SHUNNED_HOUSE: { id: 'LOC_SHUNNED_HOUSE', type: 'location', label: 'Shunned House', locationId: 'shunned_house', streetName: 'Marsh Road', x: 590, y: 425 },
  J_CITY_N: { id: 'J_CITY_N', type: 'junction', label: 'City North Junction', streetName: 'North Church Street', x: 605, y: 475 },

  // ===========================================================
  // 5. CIVIC CENTER (City Hall, Police Station, Velma's Diner, Boarding House)
  // ===========================================================
  J_CITY_CENTER: { id: 'J_CITY_CENTER', type: 'junction', label: 'City Hall Hub', streetName: 'Market Square', x: 605, y: 535 },
  LOC_CITY_HALL: { id: 'LOC_CITY_HALL', type: 'location', label: 'City Hall', locationId: 'city_hall', streetName: 'Market Square', x: 575, y: 575 },
  LOC_POLICE_STATION_JAIL: { id: 'LOC_POLICE_STATION_JAIL', type: 'location', label: 'Police Station & Jail', locationId: 'police_station', streetName: 'Civic Way', x: 595, y: 645 },
  LOC_BOARDING_HOUSE: { id: 'LOC_BOARDING_HOUSE', type: 'location', label: 'Boarding House', locationId: 'boarding_house', streetName: 'Ma\'s Row', x: 665, y: 575 },
  LOC_VELMAS_DINER: { id: 'LOC_VELMAS_DINER', type: 'location', label: "Velma's Diner", locationId: 'velmas_diner', streetName: 'River Street', x: 585, y: 710 },

  // ===========================================================
  // 6. CHURCH, UNIVERSITY & LAKE MISKATONIC
  // ===========================================================
  S_CHURCH_01: { id: 'S_CHURCH_01', type: 'space', streetName: 'Church Street', x: 645, y: 450 },
  LOC_NORTH_CHURCH: { id: 'LOC_NORTH_CHURCH', type: 'location', label: 'North Church', locationId: 'north_church', streetName: 'Church Street', x: 690, y: 450 },
  S_CHURCH_UNI: { id: 'S_CHURCH_UNI', type: 'space', streetName: 'College Avenue', x: 730, y: 460 },
  LOC_MISKATONIC_UNIVERSITY: { id: 'LOC_MISKATONIC_UNIVERSITY', type: 'location', label: 'Miskatonic University', locationId: 'miskatonic_university', streetName: 'College Campus', x: 765, y: 495 },
  LOC_LAKE_MISKATONIC: { id: 'LOC_LAKE_MISKATONIC', type: 'location', label: 'Lake Miskatonic', locationId: 'lake_miskatonic', streetName: 'Lakeside Road', x: 815, y: 435 },
  S_LAKE_01: { id: 'S_LAKE_01', type: 'space', streetName: 'Lakeside Road', x: 825, y: 395 },
  J_NE_OUTER: { id: 'J_NE_OUTER', type: 'junction', label: 'NE Outer Junction', streetName: 'Lakeside Road', x: 815, y: 365 },

  // East Center Junction
  S_UNI_EAST: { id: 'S_UNI_EAST', type: 'space', streetName: 'East Avenue', x: 810, y: 535 },
  J_EAST_CENTER: { id: 'J_EAST_CENTER', type: 'junction', label: 'East Center Junction', streetName: 'East Avenue', x: 855, y: 565 },

  // ===========================================================
  // 7. FOUNDER'S ROCK & HIBS ROADHOUSE
  // ===========================================================
  S_VB_01: { id: 'S_VB_01', type: 'space', streetName: 'Old Meadow Road', x: 640, y: 645 },
  S_VB_02: { id: 'S_VB_02', type: 'space', streetName: 'Old Meadow Road', x: 690, y: 665 },
  LOC_FOUNDERS_ROCK: { id: 'LOC_FOUNDERS_ROCK', type: 'location', label: "Founder's Rock", locationId: 'founders_rock', streetName: 'Old Meadow Road', x: 745, y: 690 },
  S_FR_01: { id: 'S_FR_01', type: 'space', streetName: 'Tavern Road', x: 790, y: 675 },
  S_FR_02: { id: 'S_FR_02', type: 'space', streetName: 'Tavern Road', x: 830, y: 660 },
  LOC_HIBS_ROADHOUSE: { id: 'LOC_HIBS_ROADHOUSE', type: 'location', label: "Hib's Roadhouse", locationId: 'hibs_roadhouse', streetName: 'Tavern Road', x: 880, y: 645 },

  // ===========================================================
  // 8. SOUTH SHORE ROAD (Devil's Beach -> Carnival -> Lighthouse)
  // ===========================================================
  LOC_HISTORICAL_SOCIETY: { id: 'LOC_HISTORICAL_SOCIETY', type: 'location', label: 'Historical Society', locationId: 'historical_society', streetName: 'South Shore Road', x: 425, y: 865 },
  TAXI_S: { id: 'TAXI_S', type: 'transport', label: 'South Taxi Stand', streetName: 'South Taxi Stand', x: 480, y: 865 },
  LOC_DAGON_MISSION: { id: 'LOC_DAGON_MISSION', type: 'location', label: 'Order of Dagon Mission', locationId: 'dagon_mission', streetName: 'South Shore Road', x: 535, y: 865 },
  S_CARNIVAL_W: { id: 'S_CARNIVAL_W', type: 'space', streetName: 'Fairgrounds Path', x: 575, y: 865 },
  LOC_DARKS_CARNIVAL: { id: 'LOC_DARKS_CARNIVAL', type: 'location', label: "Dark's Carnival", locationId: 'darks_carnival', streetName: 'Fairgrounds Path', x: 620, y: 865 },
  J_CARNIVAL: { id: 'J_CARNIVAL', type: 'junction', label: 'Carnival Junction', streetName: 'South Loop', x: 670, y: 845 },

  // ===========================================================
  // 9. SOUTH-EAST COASTAL LOOP (Curiositie Shoppe & Lighthouse)
  // ===========================================================
  S_SE_01: { id: 'S_SE_01', type: 'space', streetName: 'Harbor Road', x: 720, y: 845 },
  S_SE_02: { id: 'S_SE_02', type: 'space', streetName: 'Harbor Road', x: 765, y: 845 },
  LOC_CURIOSITIE_SHOPPE: { id: 'LOC_CURIOSITIE_SHOPPE', type: 'location', label: 'Curiositie Shoppe', locationId: 'curiositie_shoppe', streetName: 'Harbor Road', x: 810, y: 840 },
  S_SE_03: { id: 'S_SE_03', type: 'space', streetName: 'Beacon Point Path', x: 855, y: 840 },
  LOC_LIGHTHOUSE: { id: 'LOC_LIGHTHOUSE', type: 'location', label: 'Lighthouse', locationId: 'lighthouse', streetName: 'Beacon Point', x: 900, y: 835 },
  S_SE_04: { id: 'S_SE_04', type: 'space', streetName: 'Cliff Path', x: 895, y: 745 },
  S_SE_05: { id: 'S_SE_05', type: 'space', streetName: 'Cliff Path', x: 890, y: 695 }
};

// -------------------------------------------------------------
// EXACT 1987 ARKHAM BOARD EDGES (Bi-Directional Street Network)
// -------------------------------------------------------------
export const BOARD_RAW_EDGES: [string, string][] = [
  // 1. NORTH STREET (West Taxi to East Taxi)
  ['TAXI_W', 'S_NW_01'],
  ['S_NW_01', 'S_NW_02'],
  ['S_NW_02', 'LOC_HARVEY_JONES_SHACK'],
  ['LOC_HARVEY_JONES_SHACK', 'S_N_01'],
  ['S_N_01', 'S_N_02'],
  ['S_N_02', 'S_N_03'],
  ['S_N_03', 'LOC_TRAIN_STATION'],
  ['LOC_TRAIN_STATION', 'S_N_04'],
  ['S_N_04', 'S_N_05'],
  ['S_N_05', 'S_N_06'],
  ['S_N_06', 'S_N_07'],
  ['S_N_07', 'LOC_BLACK_CAVE'],
  ['LOC_BLACK_CAVE', 'S_NE_01'],
  ['S_NE_01', 'LOC_SILVER_TWILIGHT_LODGE'],
  ['LOC_SILVER_TWILIGHT_LODGE', 'S_NE_02'],
  ['S_NE_02', 'S_NE_03'],
  ['S_NE_03', 'TAXI_E'],

  // 2. WEST STREET & GRAVEYARD
  ['TAXI_W', 'S_W_01'],
  ['S_W_01', 'S_W_02'],
  ['S_W_02', 'J_GRAVEYARD_NW'],
  ['J_GRAVEYARD_NW', 'LOC_GRAVEYARD'],
  ['LOC_GRAVEYARD', 'S_GRAVE_01'],
  ['S_GRAVE_01', 'J_GRAVEYARD_E'],

  // Graveyard to Hospital & Sanitarium
  ['J_GRAVEYARD_E', 'LOC_HOSPITAL'],
  ['LOC_HOSPITAL', 'S_HS_01'],
  ['S_HS_01', 'LOC_SANITARIUM'],
  ['LOC_SANITARIUM', 'S_SAN_01'],
  ['S_SAN_01', 'J_VELMA_W'],

  // Graveyard to Woods & Shunned House
  ['J_GRAVEYARD_E', 'S_WOODS_01'],
  ['S_WOODS_01', 'S_WOODS_02'],
  ['S_WOODS_02', 'LOC_WOODS'],
  ['LOC_WOODS', 'S_WOODS_SHUNNED'],
  ['S_WOODS_SHUNNED', 'LOC_SHUNNED_HOUSE'],
  ['LOC_SHUNNED_HOUSE', 'J_CITY_N'],

  // 3. SOUTH-WEST STREET (Press & Library & Beach)
  ['J_GRAVEYARD_NW', 'S_NEWSPAPER_N'],
  ['S_NEWSPAPER_N', 'LOC_NEWSPAPER'],
  ['LOC_NEWSPAPER', 'S_NEWSPAPER_S1'],
  ['S_NEWSPAPER_S1', 'S_NEWSPAPER_S2'],
  ['S_NEWSPAPER_S2', 'LOC_LIBRARY'],
  ['LOC_LIBRARY', 'S_LIB_01'],
  ['S_LIB_01', 'LOC_DEVILS_BEACH'],

  // 4. SOUTH SHORE ROAD (Devil's Beach to Dark's Carnival)
  ['LOC_DEVILS_BEACH', 'LOC_HISTORICAL_SOCIETY'],
  ['LOC_HISTORICAL_SOCIETY', 'TAXI_S'],
  ['TAXI_S', 'LOC_DAGON_MISSION'],
  ['LOC_DAGON_MISSION', 'S_CARNIVAL_W'],
  ['S_CARNIVAL_W', 'LOC_DARKS_CARNIVAL'],
  ['LOC_DARKS_CARNIVAL', 'J_CARNIVAL'],
  ['J_CARNIVAL', 'J_VELMA_W'],

  // 5. CITY CENTER (City Hall, Police, Boarding House, Velma's)
  ['J_CITY_N', 'J_CITY_CENTER'],
  ['J_CITY_CENTER', 'LOC_CITY_HALL'],
  ['J_CITY_CENTER', 'LOC_POLICE_STATION_JAIL'],
  ['J_CITY_CENTER', 'LOC_BOARDING_HOUSE'],
  ['LOC_CITY_HALL', 'LOC_POLICE_STATION_JAIL'],
  ['LOC_POLICE_STATION_JAIL', 'LOC_VELMAS_DINER'],
  ['J_VELMA_W', 'LOC_VELMAS_DINER'],

  // 6. NORTH CHURCH, UNIVERSITY & LAKE
  ['J_CITY_N', 'S_CHURCH_01'],
  ['S_CHURCH_01', 'LOC_NORTH_CHURCH'],
  ['LOC_NORTH_CHURCH', 'S_CHURCH_UNI'],
  ['S_CHURCH_UNI', 'LOC_MISKATONIC_UNIVERSITY'],
  ['LOC_MISKATONIC_UNIVERSITY', 'LOC_LAKE_MISKATONIC'],
  ['LOC_LAKE_MISKATONIC', 'S_LAKE_01'],
  ['S_LAKE_01', 'J_NE_OUTER'],
  ['J_NE_OUTER', 'LOC_BLACK_CAVE'],
  ['J_NE_OUTER', 'LOC_SILVER_TWILIGHT_LODGE'],

  // 7. UNIVERSITY TO EAST JUNCTION & HIBS
  ['LOC_MISKATONIC_UNIVERSITY', 'S_UNI_EAST'],
  ['S_UNI_EAST', 'J_EAST_CENTER'],
  ['J_EAST_CENTER', 'TAXI_E'],
  ['J_EAST_CENTER', 'LOC_BOARDING_HOUSE'],
  ['J_EAST_CENTER', 'LOC_HIBS_ROADHOUSE'],

  // 8. VELMA'S TO FOUNDER'S ROCK & HIBS
  ['LOC_VELMAS_DINER', 'S_VB_01'],
  ['S_VB_01', 'LOC_BOARDING_HOUSE'],
  ['LOC_BOARDING_HOUSE', 'S_VB_02'],
  ['S_VB_02', 'LOC_FOUNDERS_ROCK'],
  ['LOC_FOUNDERS_ROCK', 'S_FR_01'],
  ['S_FR_01', 'S_FR_02'],
  ['S_FR_02', 'LOC_HIBS_ROADHOUSE'],

  // 9. SOUTH-EAST LOOP (Curiositie Shoppe & Lighthouse)
  ['J_CARNIVAL', 'S_SE_01'],
  ['S_SE_01', 'S_SE_02'],
  ['S_SE_02', 'LOC_CURIOSITIE_SHOPPE'],
  ['LOC_CURIOSITIE_SHOPPE', 'S_SE_03'],
  ['S_SE_03', 'LOC_LIGHTHOUSE'],
  ['LOC_LIGHTHOUSE', 'S_SE_04'],
  ['S_SE_04', 'S_SE_05'],
  ['S_SE_05', 'LOC_HIBS_ROADHOUSE']
];

// Precompute adjacency list for bi-directional graph
export const BOARD_ADJACENCY: Record<string, string[]> = {};

// Initialize all nodes
Object.keys(BOARD_NODES).forEach(nodeId => {
  BOARD_ADJACENCY[nodeId] = [];
});

// Populate bi-directional edges
BOARD_RAW_EDGES.forEach(([a, b]) => {
  if (BOARD_ADJACENCY[a] && !BOARD_ADJACENCY[a].includes(b)) {
    BOARD_ADJACENCY[a].push(b);
  }
  if (BOARD_ADJACENCY[b] && !BOARD_ADJACENCY[b].includes(a)) {
    BOARD_ADJACENCY[b].push(a);
  }
});

// -------------------------------------------------------------
// GRAPH UTILITIES
// -------------------------------------------------------------
export function getNeighbors(nodeId: string): string[] {
  return BOARD_ADJACENCY[nodeId] || [];
}

/**
 * BFS to compute reachable nodes within a specific number of steps.
 * Respects monster blocker rules: if a node contains a monster and is not the starting node,
 * movement stops at that node and cannot pass through it.
 */
export function getReachableNodes(
  startNodeId: string,
  maxSteps: number,
  monsterNodeIds: string[] = []
): string[] {
  if (maxSteps <= 0) return [startNodeId];

  const reachable = new Set<string>();
  const visited = new Map<string, number>();
  const queue: { id: string; remaining: number }[] = [{ id: startNodeId, remaining: maxSteps }];

  while (queue.length > 0) {
    const { id, remaining } = queue.shift()!;
    reachable.add(id);

    if (remaining <= 0) continue;

    // Monster halts movement: cannot step through this node to further neighbors
    if (monsterNodeIds.includes(id) && id !== startNodeId) {
      continue;
    }

    const neighbors = getNeighbors(id);
    for (const neighbor of neighbors) {
      const nextRemaining = remaining - 1;
      const prevBest = visited.get(neighbor);
      if (prevBest === undefined || prevBest < nextRemaining) {
        visited.set(neighbor, nextRemaining);
        queue.push({ id: neighbor, remaining: nextRemaining });
      }
    }
  }

  return Array.from(reachable);
}

/**
 * Find shortest path between startNodeId and targetNodeId within maxSteps.
 * Returns array of nodes from start to target (inclusive), e.g. [start, n1, n2, target].
 * If a monster is on a node along the path, the path terminates at that monster's node.
 */
export function findShortestPath(
  startNodeId: string,
  targetNodeId: string,
  maxSteps: number,
  monsterNodeIds: string[] = []
): string[] | null {
  if (startNodeId === targetNodeId) return [startNodeId];

  const queue: { id: string; path: string[] }[] = [{ id: startNodeId, path: [startNodeId] }];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    if (id === targetNodeId) {
      return path;
    }

    if (path.length - 1 >= maxSteps) continue;

    // Monster stops further traversal through this space
    if (monsterNodeIds.includes(id) && id !== startNodeId) {
      continue;
    }

    const neighbors = getNeighbors(id);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...path, neighbor] });
      }
    }
  }

  return null;
}

/**
 * Find the locationId if this node represents a location, or undefined if it's an empty street space.
 */
export function getLocationIdForNode(nodeId: string): string | undefined {
  return BOARD_NODES[nodeId]?.locationId;
}

/**
 * Find the primary node on the board for a given location key
 */
export function getNodeForLocation(locId: string): string | undefined {
  for (const [nodeId, node] of Object.entries(BOARD_NODES)) {
    if (node.locationId === locId) return nodeId;
  }
  return undefined;
}

/**
 * Get display label for any node on the board
 */
export function getNodeDisplayLabel(nodeId: string): string {
  const node = BOARD_NODES[nodeId];
  if (!node) return nodeId;
  if (node.label) return node.label;
  if (node.type === 'space') return `${node.streetName || 'Street'} (Space)`;
  if (node.type === 'junction') return `${node.streetName || 'Intersection'} Junction`;
  return nodeId;
}
