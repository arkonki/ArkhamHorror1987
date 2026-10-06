import React, { useState, useRef, useEffect } from 'react';
import {
  GameState,
  Investigator,
  Monster,
  Gate,
  OtherWorldId
} from '../types/game';
import {
  LOCATIONS_DATA,
  OTHER_WORLDS
} from '../data/rules1987';
import {
  BOARD_NODES,
  BOARD_RAW_EDGES,
  getLocationIdForNode,
  getNodeDisplayLabel,
  getNeighbors
} from '../data/boardGraph';
import { sound } from '../utils/audio';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Sparkles,
  Skull,
  Compass,
  Footprints,
  ShieldAlert
} from 'lucide-react';

interface GameBoardProps {
  gameState: GameState;
  onNodeClick: (nodeId: string) => void;
  onLocationClick: (locId: string) => void;
  onOtherWorldClick?: (worldId: OtherWorldId) => void;
  reachableNodes: string[];
  adjacentNodes?: string[];
  movingPawn?: {
    investigatorId: string;
    currentNodeId: string;
  } | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onNodeClick,
  onLocationClick,
  onOtherWorldClick,
  reachableNodes,
  adjacentNodes = [],
  movingPawn = null
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeInvestigator = gameState.investigators[gameState.activeInvestigatorIndex];

  // Center on active investigator
  const centerOnActiveInvestigator = () => {
    if (!activeInvestigator) return;
    const locNode = BOARD_NODES[activeInvestigator.locationNodeId];
    if (locNode) {
      setPan({
        x: 480 - locNode.x * zoom,
        y: 400 - locNode.y * zoom
      });
      sound.playStep();
    }
  };

  const jumpToOtherWorlds = () => {
    setZoom(1.2);
    setPan({ x: -100, y: 20 });
    sound.playStep();
  };

  const jumpToTown = () => {
    setZoom(1.1);
    setPan({ x: -280, y: -240 });
    sound.playStep();
  };

  const jumpToDoomTrack = () => {
    setZoom(1.3);
    setPan({ x: 50, y: -180 });
    sound.playStep();
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    sound.playStep();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(2.5, Math.max(0.6, prev * zoomFactor)));
  };

  // Find monsters on a specific node
  const getMonstersAtNode = (nodeId: string) => {
    return gameState.activeMonsters.filter(m => m.currentNodeId === nodeId);
  };

  // Find investigators on a specific node
  const getInvestigatorsAtNode = (nodeId: string) => {
    return gameState.investigators.filter(inv => {
      // If moving animation active, show moving investigator at animated node
      if (movingPawn && inv.id === movingPawn.investigatorId) {
        return movingPawn.currentNodeId === nodeId && !inv.otherWorldState;
      }
      return inv.locationNodeId === nodeId && !inv.otherWorldState;
    });
  };

  const getGateAtLocation = (locId: string) => {
    return gameState.openGates.find(g => g.locationId === locId);
  };

  const colorHexMap: Record<string, string> = {
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#eab308',
    purple: '#9333ea',
    orange: '#ea580c',
    black: '#1f2937',
    silver: '#94a3b8'
  };

  // Immediate neighbors of active investigator
  const currentActiveNode = activeInvestigator?.locationNodeId || '';
  const directStepNeighbors = getNeighbors(currentActiveNode);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[780px] bg-[#1a120c] overflow-hidden rounded-xl border-4 border-[#4a3420] select-none shadow-2xl"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Viewport Control Bar */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap gap-1.5 bg-[#25170f]/95 backdrop-blur-md p-1.5 rounded-lg border border-[#7a5433] shadow-xl">
        <button
          onClick={() => { setZoom(prev => Math.min(2.5, prev + 0.2)); sound.playStep(); }}
          className="p-1.5 text-amber-200 hover:bg-[#4a3420] rounded transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setZoom(prev => Math.max(0.6, prev - 0.2)); sound.playStep(); }}
          className="p-1.5 text-amber-200 hover:bg-[#4a3420] rounded transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-amber-200 hover:bg-[#4a3420] rounded transition"
          title="Reset Full Board View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={centerOnActiveInvestigator}
          className="p-1.5 text-amber-200 hover:bg-[#4a3420] rounded transition"
          title="Center Active Investigator"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#5c3e27] my-auto mx-0.5" />

        <button
          onClick={jumpToTown}
          className="px-2 py-1 text-[11px] font-serif font-bold text-amber-200 hover:bg-[#4a3420] rounded transition"
        >
          Arkham
        </button>
        <button
          onClick={jumpToOtherWorlds}
          className="px-2 py-1 text-[11px] font-serif font-bold text-purple-200 hover:bg-[#4a3420] rounded transition"
        >
          Other Worlds
        </button>
        <button
          onClick={jumpToDoomTrack}
          className="px-2 py-1 text-[11px] font-serif font-bold text-rose-200 hover:bg-[#4a3420] rounded transition"
        >
          Doom Track
        </button>
      </div>

      {/* Movement & Turn Instruction Banner */}
      {gameState.hasRolledMovement && gameState.movesRemaining > 0 && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#1e130b]/90 backdrop-blur-md px-4 py-2 rounded-lg border-2 border-amber-500 shadow-2xl text-amber-200">
          <Footprints className="w-5 h-5 text-amber-400 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-white text-sm">
              {gameState.movesRemaining} Moves Remaining
            </span>
            <p className="text-[11px] text-amber-300/80">
              Click an adjacent circle for 1 step, or click any highlighted space along the road!
            </p>
          </div>
        </div>
      )}

      {/* Hovered Space Tooltip */}
      {hoveredNodeId && (
        <div className="absolute bottom-4 left-4 z-20 bg-[#25170f]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#7a5433] text-xs text-amber-200 pointer-events-none shadow-xl flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <span>{getNodeDisplayLabel(hoveredNodeId)}</span>
          {reachableNodes.includes(hoveredNodeId) && (
            <span className="text-[10px] bg-emerald-800 text-emerald-100 font-bold px-1.5 py-0.5 rounded ml-1">
              Reachable
            </span>
          )}
        </div>
      )}

      {/* SVG Board Container */}
      <div
        className="w-full h-full transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        }}
      >
        <svg
          viewBox="0 0 1120 980"
          className="w-[1120px] h-[980px] shadow-2xl"
          style={{ background: '#eee5cf' }}
        >
          <defs>
            {/* Board Textures & Gradients */}
            <linearGradient id="boardPaper" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7f1df" />
              <stop offset="40%" stopColor="#ede2c8" />
              <stop offset="100%" stopColor="#dfd1b0" />
            </linearGradient>

            <linearGradient id="roadSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8c6a49" />
              <stop offset="50%" stopColor="#ab8761" />
              <stop offset="100%" stopColor="#8c6a49" />
            </linearGradient>

            <linearGradient id="miskatonicWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="portalVortex" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.95" />
            </linearGradient>

            <filter id="pawnShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
            </filter>

            <filter id="glowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Board Background Parchment */}
          <rect x="0" y="0" width="1120" height="980" fill="url(#boardPaper)" />
          <rect x="6" y="6" width="1108" height="968" fill="none" stroke="#4a321e" strokeWidth="5" />
          <rect x="14" y="14" width="1092" height="952" fill="none" stroke="#8a6341" strokeWidth="1.5" />

          {/* ======================================================== */}
          {/* TOP SECTION: 8 OTHER WORLDS */}
          {/* ======================================================== */}
          <g id="other-worlds-section">
            {Object.values(OTHER_WORLDS).map((world, idx) => {
              const xPos = 18 + idx * 135;
              const yPos = 20;
              const width = 131;
              const height = 160;

              const investigatorsHere = gameState.investigators.filter(
                inv => inv.otherWorldState?.worldId === world.id
              );

              return (
                <g
                  key={world.id}
                  className="cursor-pointer group"
                  onClick={() => onOtherWorldClick?.(world.id)}
                >
                  <rect
                    x={xPos}
                    y={yPos}
                    width={width}
                    height={height}
                    fill={world.color + '12'}
                    stroke={world.color}
                    strokeWidth="2.2"
                    rx="3"
                  />
                  <rect
                    x={xPos}
                    y={yPos}
                    width={width}
                    height={22}
                    fill={world.color}
                    rx="3"
                  />
                  <text
                    x={xPos + width / 2}
                    y={yPos + 15}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="serif"
                  >
                    {world.name}
                  </text>

                  <text
                    x={xPos + 6}
                    y={yPos + 33}
                    fill="#3b2413"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    Roll D6:
                  </text>

                  {Object.entries(world.table).map(([roll, lineText]) => {
                    const rNum = parseInt(roll, 10);
                    const lineY = yPos + 34 + rNum * 11.5;
                    const cleanText = lineText.replace(/^[\w\s'!-]+:\s*/, '');
                    const truncated = cleanText.length > 25 ? cleanText.substring(0, 24) + '..' : cleanText;

                    return (
                      <g key={roll} fontSize="6.2" fill="#4a3525" fontFamily="sans-serif">
                        <text x={xPos + 6} y={lineY} fontWeight="bold" fill={world.color}>
                          {roll} —
                        </text>
                        <text x={xPos + 22} y={lineY}>
                          {truncated}
                        </text>
                      </g>
                    );
                  })}

                  {/* Progression Track: Box 2 -> Box 1 -> RETURN */}
                  <g transform={`translate(${xPos + 6}, ${yPos + 120})`}>
                    <text x="0" y="2" fontSize="6" fontWeight="bold" fill="#713f12">START</text>
                    <rect x="0" y="6" width="28" height="26" fill="#ffffff" stroke={world.color} strokeWidth="1.5" rx="3" />
                    <text x="14" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill={world.color}>2</text>

                    <polygon points="32,19 36,16 36,22" fill="#713f12" />

                    <rect x="40" y="6" width="28" height="26" fill="#ffffff" stroke={world.color} strokeWidth="1.5" rx="3" />
                    <text x="54" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill={world.color}>1</text>

                    <rect x="74" y="6" width="45" height="26" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" rx="3" />
                    <text x="96" y="17" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#854d0e">RETURN</text>
                    <text x="96" y="25" textAnchor="middle" fontSize="5.5" fill="#854d0e">TO ARKHAM</text>

                    {investigatorsHere.map(inv => {
                      const box = inv.otherWorldState?.box || 2;
                      const tokenX = box === 2 ? 14 : 54;
                      return (
                        <g key={inv.id} transform={`translate(${tokenX}, 19)`} filter="url(#pawnShadow)">
                          <circle cx="0" cy="0" r="8" fill={colorHexMap[inv.color] || '#333'} stroke="#ffffff" strokeWidth="2" />
                          <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                            {inv.name[0]}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* LEFT SIDEBAR: DECKS & DOOM TRACK */}
          {/* ======================================================== */}
          <g id="left-column">
            <g transform="translate(20, 195)">
              <rect x="0" y="0" width="70" height="150" fill="#2e1065" stroke="#7e22ce" strokeWidth="2" rx="4" />
              <text x="35" y="80" textAnchor="middle" fill="#f3e8ff" fontSize="13" fontWeight="bold" fontFamily="serif" transform="rotate(-90 35 80)">
                SPELLS ({gameState.spellDeck.length})
              </text>

              <rect x="0" y="160" width="70" height="150" fill="#451a03" stroke="#b45309" strokeWidth="2" rx="4" />
              <text x="35" y="240" textAnchor="middle" fill="#fef3c7" fontSize="13" fontWeight="bold" fontFamily="serif" transform="rotate(-90 35 240)">
                ITEMS ({gameState.itemDeck.length})
              </text>

              <rect x="0" y="320" width="70" height="150" fill="#064e3b" stroke="#059669" strokeWidth="2" rx="4" />
              <text x="35" y="400" textAnchor="middle" fill="#d1fae5" fontSize="13" fontWeight="bold" fontFamily="serif" transform="rotate(-90 35 400)">
                GATES ({gameState.openGates.length})
              </text>
            </g>

            {/* Doom Track */}
            <g transform="translate(100, 195)">
              <rect x="0" y="0" width="60" height="535" fill="#2d1c12" stroke="#8c6441" strokeWidth="2.5" rx="5" />
              <text x="30" y="20" textAnchor="middle" fill="#d4af37" fontSize="10.5" fontWeight="bold" fontFamily="serif">
                DOOM
              </text>
              <text x="30" y="32" textAnchor="middle" fill="#d4af37" fontSize="7.5" fontFamily="serif">
                TRACK
              </text>

              {Array.from({ length: 14 }).map((_, idx) => {
                const spaceNum = 14 - idx;
                const isDoomOfArkham = spaceNum === 14;
                const slotY = 40 + idx * 35;
                const isCurrentDoom = gameState.doomTrack === spaceNum;

                return (
                  <g key={spaceNum}>
                    <rect
                      x="4"
                      y={slotY}
                      width="52"
                      height="31"
                      fill={isDoomOfArkham ? '#7f1d1d' : spaceNum >= 11 ? '#9a3412' : '#3d2b1c'}
                      stroke={isCurrentDoom ? '#fbbf24' : '#6b4f35'}
                      strokeWidth={isCurrentDoom ? '2.5' : '1'}
                      rx="3"
                    />
                    <text
                      x="30"
                      y={slotY + (isDoomOfArkham ? 15 : 21)}
                      textAnchor="middle"
                      fill={isDoomOfArkham ? '#fecaca' : '#f5ecd8'}
                      fontSize={isDoomOfArkham ? '8' : '13'}
                      fontWeight="bold"
                    >
                      {isDoomOfArkham ? 'DOOM OF' : spaceNum}
                    </text>
                    {isDoomOfArkham && (
                      <text x="30" y={slotY + 25} textAnchor="middle" fill="#fecaca" fontSize="7" fontWeight="bold">
                        ARKHAM
                      </text>
                    )}

                    {isCurrentDoom && (
                      <g transform={`translate(30, ${slotY + 15})`} filter="url(#pawnShadow)">
                        <circle cx="0" cy="0" r="13" fill="#dc2626" stroke="#fbbf24" strokeWidth="2.5" />
                        <Skull className="w-4 h-4 text-white -translate-x-2 -translate-y-2" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Gate Appearance Table */}
            <g transform="translate(20, 745)">
              <rect x="0" y="0" width="140" height="215" fill="#ede0c5" stroke="#6b4c33" strokeWidth="2" rx="4" />
              <text x="70" y="16" textAnchor="middle" fill="#3b2413" fontSize="8.5" fontWeight="bold" fontFamily="serif">
                GATE APPEARANCE TABLE
              </text>
              <line x1="8" y1="21" x2="132" y2="21" stroke="#6b4c33" strokeWidth="0.8" />
              
              <g fontSize="7.5" fill="#3b2413" fontFamily="sans-serif">
                <text x="8" y="33"><tspan fontWeight="bold">2</tspan> — Shunned House</text>
                <text x="8" y="46"><tspan fontWeight="bold">3</tspan> — Dark's Carnival</text>
                <text x="8" y="59"><tspan fontWeight="bold">4</tspan> — Lighthouse</text>
                <text x="8" y="71" fill="#b91c1c" fontSize="6.5">*(+1 Monster per Gate)*</text>
                <text x="8" y="84"><tspan fontWeight="bold">5</tspan> — Devil's Beach</text>
                <text x="8" y="97"><tspan fontWeight="bold">6</tspan> — Graveyard</text>
                <text x="8" y="110"><tspan fontWeight="bold">7</tspan> — Founder's Rock *</text>
                <text x="8" y="123"><tspan fontWeight="bold">8</tspan> — Silver Twilight Lodge</text>
                <text x="8" y="136"><tspan fontWeight="bold">9</tspan> — Woods</text>
                <text x="8" y="149"><tspan fontWeight="bold">10</tspan> — Lake Miskatonic *</text>
                <text x="8" y="162"><tspan fontWeight="bold">11</tspan> — Harney Jones' Shack</text>
                <text x="8" y="175"><tspan fontWeight="bold">12</tspan> — Black Cave</text>
                <text x="8" y="196" fill="#78350f" fontStyle="italic" fontSize="6.8">Roll 2D6 during Mythos</text>
              </g>
            </g>
          </g>

          {/* ======================================================== */}
          {/* CENTRAL ARKHAM MAP: NATURAL LANDSCAPE & RIVER */}
          {/* ======================================================== */}
          <g id="landscape">
            {/* Winding Miskatonic River */}
            <path
              d="M 850,380 C 820,430 760,490 730,550 C 690,620 540,680 430,750 C 370,790 350,860 360,920"
              fill="none"
              stroke="url(#miskatonicWater)"
              strokeWidth="48"
              strokeLinecap="round"
            />
            <path
              d="M 845,385 C 815,435 755,495 725,555 C 685,625 535,685 425,755 C 365,795 345,865 355,920"
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="2.5"
              strokeDasharray="6,12"
            />

            {/* Woods, Hills & Park Groves */}
            <ellipse cx="485" cy="440" rx="75" ry="35" fill="#15803d" opacity="0.14" />
            <ellipse cx="805" cy="410" rx="85" ry="45" fill="#15803d" opacity="0.15" />
            <ellipse cx="320" cy="570" rx="60" ry="30" fill="#15803d" opacity="0.12" />
            <ellipse cx="740" cy="720" rx="65" ry="30" fill="#15803d" opacity="0.12" />

            {/* River Bridge markings */}
            <rect x="520" y="685" width="28" height="12" fill="#5c381c" stroke="#2c1708" strokeWidth="1" rx="2" transform="rotate(-35 534 691)" />
            <rect x="715" y="525" width="30" height="12" fill="#5c381c" stroke="#2c1708" strokeWidth="1" rx="2" transform="rotate(35 730 531)" />
          </g>

          {/* ======================================================== */}
          {/* STREET ROADS WITH REAL BOARD GAME STREET WIDTH */}
          {/* Authentic wide roadway with curb borders and cobblestones */}
          {/* ======================================================== */}
          <g id="street-edges">
            {/* Outer Road Base (Curb & Bed) */}
            {BOARD_RAW_EDGES.map(([a, b]) => {
              const nodeA = BOARD_NODES[a];
              const nodeB = BOARD_NODES[b];
              if (!nodeA || !nodeB) return null;

              return (
                <line
                  key={`edge-base-${a}-${b}`}
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke="#5a3d24"
                  strokeWidth="22"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Inner Cobblestone Street Surface */}
            {BOARD_RAW_EDGES.map(([a, b]) => {
              const nodeA = BOARD_NODES[a];
              const nodeB = BOARD_NODES[b];
              if (!nodeA || !nodeB) return null;

              return (
                <line
                  key={`edge-surface-${a}-${b}`}
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke="#dfd0b5"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Subtle Street Center Line */}
            {BOARD_RAW_EDGES.map(([a, b]) => {
              const nodeA = BOARD_NODES[a];
              const nodeB = BOARD_NODES[b];
              if (!nodeA || !nodeB) return null;

              return (
                <line
                  key={`edge-dashed-${a}-${b}`}
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke="#b39b7d"
                  strokeWidth="1.2"
                  strokeDasharray="4,6"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* STREET LABELS PRINTED ALONG ROADS */}
          {/* ======================================================== */}
          <g id="street-names" fontSize="7.5" fill="#5c3e27" fontWeight="bold" fontFamily="serif" letterSpacing="1.5">
            <text x="640" y="318" textAnchor="middle">NORTH STREET</text>
            <text x="215" y="525" textAnchor="middle" transform="rotate(-90 215 525)">WEST STREET</text>
            <text x="440" y="638" textAnchor="middle">ASYLUM STREET</text>
            <text x="670" y="438" textAnchor="middle">CHURCH STREET</text>
            <text x="560" y="852" textAnchor="middle">SOUTH SHORE ROAD</text>
            <text x="790" y="830" textAnchor="middle">HARBOR ROAD</text>
            <text x="635" y="520" textAnchor="middle">MARKET SQUARE</text>
            <text x="800" y="650" textAnchor="middle">TAVERN ROAD</text>
          </g>

          {/* ======================================================== */}
          {/* ALL BOARD NODES: EMPTY STREET SPACES, LOCATIONS & TAXIS */}
          {/* ======================================================== */}
          <g id="board-nodes">
            {Object.values(BOARD_NODES).map(node => {
              const isReachable = reachableNodes.includes(node.id);
              const isAdjacent = directStepNeighbors.includes(node.id);
              const isHovered = hoveredNodeId === node.id;
              const investigatorsHere = getInvestigatorsAtNode(node.id);
              const monstersHere = getMonstersAtNode(node.id);

              // 1. TAXI STANDS (West, South, East)
              if (node.type === 'transport') {
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    onClick={() => { onNodeClick(node.id); sound.playStep(); }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    transform={`translate(${node.x}, ${node.y})`}
                  >
                    <circle cx="0" cy="0" r="23" fill="#eab308" stroke="#854d0e" strokeWidth="3" filter="url(#pawnShadow)" />
                    <circle cx="0" cy="0" r="16" fill="#ca8a04" />
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                      TAXI
                    </text>

                    {/* Reachable Ring */}
                    {isReachable && (
                      <circle cx="0" cy="0" r="27" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="4,4" className="animate-spin" />
                    )}

                    {/* Plastic Pawns */}
                    {investigatorsHere.map((inv, idx) => (
                      <PawnFigure
                        key={inv.id}
                        color={inv.color}
                        initial={inv.name[0]}
                        isActive={inv.id === activeInvestigator?.id}
                        offsetIndex={idx}
                        totalOnSpace={investigatorsHere.length}
                        colorHexMap={colorHexMap}
                      />
                    ))}
                  </g>
                );
              }

              // 2. LOCATIONS (Named Buildings with D6 Gazette Encounters)
              if (node.type === 'location') {
                const locId = node.locationId;
                const gate = locId ? getGateAtLocation(locId) : undefined;
                const locData = locId ? LOCATIONS_DATA[locId] : undefined;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    onClick={() => {
                      if (isReachable) onNodeClick(node.id);
                      else if (locId) onLocationClick(locId);
                      sound.playStep();
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    transform={`translate(${node.x}, ${node.y})`}
                  >
                    {/* Entrance Walkway to Road */}
                    <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#5a3d24" strokeWidth="2" filter="url(#pawnShadow)" />
                    <circle cx="0" cy="0" r="10" fill="none" stroke="#cbb292" strokeWidth="1" strokeDasharray="2,2" />

                    {/* Location Building Box */}
                    <g transform="translate(0, -32)">
                      <rect
                        x="-38"
                        y="-16"
                        width="76"
                        height="44"
                        fill="#faf6ee"
                        stroke={isReachable ? '#059669' : '#5a3d25'}
                        strokeWidth={isReachable ? '3.5' : '2'}
                        rx="5"
                        filter="url(#cardShadow)"
                        className="group-hover:stroke-amber-600 transition"
                      />

                      {/* Header Roof Banner */}
                      <rect x="-38" y="-16" width="76" height="16" fill="#4a311d" rx="4" />
                      <text
                        x="0"
                        y="-5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="serif"
                      >
                        {node.label && node.label.length > 15 ? node.label.substring(0, 14) + '..' : node.label}
                      </text>

                      {/* Gazette Encounter Hint */}
                      <text x="0" y="21" textAnchor="middle" fill="#78563a" fontSize="6.2" fontStyle="italic">
                        D6 Encounter
                      </text>

                      {/* Dimensional Vortex Gate Overlay */}
                      {gate && (
                        <g transform="translate(0, 7)">
                          <circle cx="0" cy="0" r="15" fill="url(#portalVortex)" filter="url(#pawnShadow)" />
                          <circle cx="0" cy="0" r="11" fill="none" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="3,3" />
                          <text x="0" y="2.5" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">
                            GATE
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Reachable Pulse Ring */}
                    {isReachable && (
                      <circle cx="0" cy="0" r="18" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="3,3" className="animate-spin" />
                    )}

                    {/* Step 1 badge if direct neighbor */}
                    {isAdjacent && gameState.movesRemaining > 0 && (
                      <g transform="translate(11, -11)">
                        <circle cx="0" cy="0" r="6" fill="#059669" stroke="#ffffff" strokeWidth="1" />
                        <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">1</text>
                      </g>
                    )}

                    {/* Plastic Pawns */}
                    {investigatorsHere.map((inv, idx) => (
                      <PawnFigure
                        key={inv.id}
                        color={inv.color}
                        initial={inv.name[0]}
                        isActive={inv.id === activeInvestigator?.id}
                        offsetIndex={idx}
                        totalOnSpace={investigatorsHere.length}
                        colorHexMap={colorHexMap}
                      />
                    ))}

                    {/* Monsters */}
                    {monstersHere.map((m, idx) => (
                      <g key={m.id} transform={`translate(${(idx - (monstersHere.length - 1) / 2) * 20}, -55)`} filter="url(#cardShadow)">
                        <rect x="-10" y="-10" width="20" height="20" fill="#7f1d1d" stroke="#fde047" strokeWidth="1.5" rx="2" />
                        <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                          {m.strength}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              }

              // 3. AUTHENTIC EMPTY STREET SPACES (White Circles for Plastic Pieces)
              // This is the core board game stepping mechanic the user emphasized!
              return (
                <g
                  key={node.id}
                  className="cursor-pointer group"
                  onClick={() => { onNodeClick(node.id); sound.playStep(); }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  {/* Outer Embossed Stepping Rim */}
                  <circle
                    cx="0"
                    cy="0"
                    r={node.type === 'junction' ? 14 : 12.5}
                    fill={isReachable ? '#ecfdf5' : '#ffffff'}
                    stroke={isReachable ? '#059669' : '#3d2817'}
                    strokeWidth={isReachable ? '3.5' : '2'}
                    filter="url(#pawnShadow)"
                    className="group-hover:stroke-amber-600 transition"
                  />

                  {/* Inner Concentric Vintage Boardgame Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r={node.type === 'junction' ? 10.5 : 9}
                    fill="none"
                    stroke={isReachable ? '#10b981' : '#cbb292'}
                    strokeWidth="1"
                    strokeDasharray={isReachable ? undefined : '2,2'}
                  />

                  {/* Reachable Green Center Dot */}
                  {isReachable && (
                    <circle cx="0" cy="0" r="4.5" fill="#10b981" />
                  )}

                  {/* Direct 1-Step Neighbor Badge */}
                  {isAdjacent && gameState.movesRemaining > 0 && (
                    <g transform="translate(10, -10)">
                      <circle cx="0" cy="0" r="5.5" fill="#059669" stroke="#ffffff" strokeWidth="1" />
                      <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="bold">1</text>
                    </g>
                  )}

                  {/* Plastic Pawns Resting on Empty Space */}
                  {investigatorsHere.map((inv, idx) => (
                    <PawnFigure
                      key={inv.id}
                      color={inv.color}
                      initial={inv.name[0]}
                      isActive={inv.id === activeInvestigator?.id}
                      offsetIndex={idx}
                      totalOnSpace={investigatorsHere.length}
                      colorHexMap={colorHexMap}
                    />
                  ))}

                  {/* Monsters on this Space */}
                  {monstersHere.map((m, idx) => (
                    <g key={m.id} transform={`translate(${(idx - (monstersHere.length - 1) / 2) * 18}, -20)`} filter="url(#cardShadow)">
                      <rect x="-10" y="-10" width="20" height="20" fill="#7f1d1d" stroke="#fde047" strokeWidth="1.5" rx="2" />
                      <polygon
                        points="0,-7 3.5,-1 -3.5,-1"
                        fill="#fef08a"
                        transform={m.handedness === 'L' ? 'rotate(-45)' : 'rotate(45)'}
                      />
                      <text x="0" y="6" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                        {m.strength}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </g>

          {/* Welcome to Arkham Vintage Signboard */}
          <g transform="translate(195, 310) rotate(-12)" filter="url(#pawnShadow)">
            <rect x="0" y="0" width="90" height="36" fill="#fde68a" stroke="#854d0e" strokeWidth="2" rx="4" />
            <text x="45" y="16" textAnchor="middle" fill="#78350f" fontSize="9.5" fontWeight="bold" fontFamily="serif">
              WELCOME TO
            </text>
            <text x="45" y="28" textAnchor="middle" fill="#78350f" fontSize="8" fontStyle="italic">
              ARKHAM
            </text>
          </g>

          {/* Bottom Title & Trademark */}
          <g transform="translate(200, 955)">
            <text x="0" y="0" fill="#2d1c10" fontSize="18" fontWeight="bold" fontFamily="serif" letterSpacing="2">
              ARKHAM HORROR
            </text>
            <text x="180" y="-1" fill="#78350f" fontSize="9.5" fontStyle="italic" fontFamily="sans-serif">
              The Boardgame for Monster Hunters — © 1987 Chaosium Inc.
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

// =========================================================================
// 3D PLASTIC PAWN COMPONENT (Authentic Board Game Figurine)
// =========================================================================
interface PawnFigureProps {
  color: string;
  initial: string;
  isActive: boolean;
  offsetIndex: number;
  totalOnSpace: number;
  colorHexMap: Record<string, string>;
}

const PawnFigure: React.FC<PawnFigureProps> = ({
  color,
  initial,
  isActive,
  offsetIndex,
  totalOnSpace,
  colorHexMap
}) => {
  const pawnColor = colorHexMap[color] || '#333';
  const offsetX = (offsetIndex - (totalOnSpace - 1) / 2) * 16;

  return (
    <g transform={`translate(${offsetX}, -2)`} filter="url(#pawnShadow)" className="transition-all duration-200">
      {/* Active Investigator Aura Beacon */}
      {isActive && (
        <g>
          <ellipse cx="0" cy="10" rx="10" ry="4" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3,3" className="animate-spin" />
          <polygon points="0,-19 -4,-25 4,-25" fill="#f59e0b" className="animate-bounce" />
        </g>
      )}

      {/* Pawn Drop Shadow */}
      <ellipse cx="0" cy="10" rx="9" ry="3.5" fill="#000000" opacity="0.5" />

      {/* Flared Circular Base */}
      <ellipse cx="0" cy="8" rx="7.5" ry="2.5" fill={pawnColor} stroke="#ffffff" strokeWidth="0.8" />
      <path
        d="M -7.5,8 C -7.5,6 7.5,6 7.5,8 C 7.5,10 -7.5,10 -7.5,8 Z"
        fill={pawnColor}
      />

      {/* Tapered Conical Waist */}
      <path
        d="M -5.5,7 C -2.5,0 -2,-3.5 -1.5,-5 L 1.5,-5 C 2,-3.5 2.5,0 5.5,7 Z"
        fill={pawnColor}
      />

      {/* Glossy Plastic Specular Waist Reflection */}
      <path
        d="M -3,6 C -1,0 -0.8,-3 -0.5,-4.5 L 0.2,-4.5 C -0.2,-3 -0.5,0 -1.8,6 Z"
        fill="#ffffff"
        opacity="0.4"
      />

      {/* Neck Collar */}
      <ellipse cx="0" cy="-5" rx="3.2" ry="1.2" fill={pawnColor} stroke="#ffffff" strokeWidth="0.5" />

      {/* Glossy Spherical Head */}
      <circle cx="0" cy="-10.5" r="5" fill={pawnColor} />

      {/* Specular Highlight on Head */}
      <ellipse
        cx="-1.6"
        cy="-12"
        rx="1.8"
        ry="1"
        fill="#ffffff"
        opacity="0.8"
        transform="rotate(-25 -1.6 -12)"
      />

      {/* Investigator Initial Monogram */}
      <text
        x="0"
        y="3"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="6"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {initial}
      </text>
    </g>
  );
};
