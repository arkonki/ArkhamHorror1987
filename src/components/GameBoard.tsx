import React, { useState, useRef } from 'react';
import {
  GameState,
  Investigator,
  Monster,
  Gate,
  OtherWorldId
} from '../types/game';
import {
  LOCATIONS_DATA,
  STREET_NODES,
  OTHER_WORLDS
} from '../data/rules1987';
import { sound } from '../utils/audio';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Compass,
  MapPin,
  Sparkles,
  Skull,
  Eye,
  Car
} from 'lucide-react';

interface GameBoardProps {
  gameState: GameState;
  onNodeClick: (nodeId: string) => void;
  onLocationClick: (locId: string) => void;
  onOtherWorldClick?: (worldId: OtherWorldId) => void;
  reachableNodes: string[];
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onNodeClick,
  onLocationClick,
  onOtherWorldClick,
  reachableNodes
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const activeInvestigator = gameState.investigators[gameState.activeInvestigatorIndex];

  // Center on active investigator
  const centerOnActiveInvestigator = () => {
    if (!activeInvestigator) return;
    const locNode = STREET_NODES[activeInvestigator.locationNodeId] || LOCATIONS_DATA[activeInvestigator.locationNodeId];
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

  // Find monsters on a specific node or location
  const getMonstersAtNode = (nodeId: string) => {
    return gameState.activeMonsters.filter(m => m.currentNodeId === nodeId);
  };

  // Find investigators on a specific node or location
  const getInvestigatorsAtNode = (nodeId: string) => {
    return gameState.investigators.filter(inv => inv.locationNodeId === nodeId && !inv.otherWorldState);
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

      {/* SVG Board */}
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
            {/* Board Textures & Filters */}
            <linearGradient id="boardPaper" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7f1df" />
              <stop offset="40%" stopColor="#ede2c8" />
              <stop offset="100%" stopColor="#dfd1b0" />
            </linearGradient>

            <linearGradient id="miskatonicWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="portalVortex" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#ec4899" stopOpacity="0.75" />
              <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.95" />
            </linearGradient>

            <filter id="pawnShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.35" />
            </filter>

            <pattern id="brickPattern" width="16" height="8" patternUnits="userSpaceOnUse">
              <rect width="16" height="8" fill="#a8715a" />
              <line x1="0" y1="4" x2="16" y2="4" stroke="#784936" strokeWidth="0.8" />
              <line x1="8" y1="0" x2="8" y2="4" stroke="#784936" strokeWidth="0.8" />
              <line x1="0" y1="4" x2="0" y2="8" stroke="#784936" strokeWidth="0.8" />
              <line x1="16" y1="4" x2="16" y2="8" stroke="#784936" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Board Background Parchment */}
          <rect x="0" y="0" width="1120" height="980" fill="url(#boardPaper)" />
          <rect x="6" y="6" width="1108" height="968" fill="none" stroke="#4a321e" strokeWidth="5" />
          <rect x="14" y="14" width="1092" height="952" fill="none" stroke="#8a6341" strokeWidth="1.5" />

          {/* ======================================================== */}
          {/* TOP SECTION: 8 OTHER WORLDS (Authentic 1987 Columns) */}
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
                  {/* Outer World Card */}
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

                  {/* Header Title Bar with realm color */}
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

                  {/* Printed Encounter Rules Header */}
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

                  {/* 6 Printed Encounter Lines */}
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

                  {/* Bottom Progression Track: START -> [2] -> [1] -> RETURN */}
                  <g transform={`translate(${xPos + 6}, ${yPos + 120})`}>
                    <text x="0" y="2" fontSize="6" fontWeight="bold" fill="#713f12">START</text>
                    
                    {/* Box 2 */}
                    <rect x="0" y="6" width="28" height="26" fill="#ffffff" stroke={world.color} strokeWidth="1.5" rx="3" />
                    <text x="14" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill={world.color}>2</text>

                    {/* Arrow */}
                    <polygon points="32,19 36,16 36,22" fill="#713f12" />

                    {/* Box 1 */}
                    <rect x="40" y="6" width="28" height="26" fill="#ffffff" stroke={world.color} strokeWidth="1.5" rx="3" />
                    <text x="54" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill={world.color}>1</text>

                    {/* Return to Arkham */}
                    <rect x="74" y="6" width="45" height="26" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" rx="3" />
                    <text x="96" y="17" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#854d0e">RETURN</text>
                    <text x="96" y="25" textAnchor="middle" fontSize="5.5" fill="#854d0e">TO ARKHAM</text>

                    {/* Investigators Tokens in this Other World */}
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
            {/* Spells, Items, Gates Card Slots */}
            <g transform="translate(20, 195)">
              {/* Spells Slot */}
              <rect x="0" y="0" width="70" height="150" fill="#2e1065" stroke="#7e22ce" strokeWidth="2" rx="4" />
              <text x="35" y="80" textAnchor="middle" fill="#f3e8ff" fontSize="13" fontWeight="bold" fontFamily="serif" transform="rotate(-90 35 80)">
                SPELLS ({gameState.spellDeck.length})
              </text>

              {/* Items Slot */}
              <rect x="0" y="160" width="70" height="150" fill="#451a03" stroke="#b45309" strokeWidth="2" rx="4" />
              <text x="35" y="240" textAnchor="middle" fill="#fef3c7" fontSize="13" fontWeight="bold" fontFamily="serif" transform="rotate(-90 35 240)">
                ITEMS ({gameState.itemDeck.length})
              </text>

              {/* Gates Slot */}
              <rect x="0" y="320" width="70" height="150" fill="#064e3b" stroke="#059669" strokeWidth="2" rx="4" />
              <text x="35" y="400" textAnchor="middle" fill="#d1fae5" fontSize="13" fontWeight="bold" fontFamily="serif" transform="rotate(-90 35 400)">
                GATES ({gameState.openGates.length})
              </text>
            </g>

            {/* The 14-Space Doom Track */}
            <g transform="translate(100, 195)">
              <rect x="0" y="0" width="60" height="535" fill="#2d1c12" stroke="#8c6441" strokeWidth="2.5" rx="5" />
              <text x="30" y="20" textAnchor="middle" fill="#d4af37" fontSize="10.5" fontWeight="bold" fontFamily="serif">
                DOOM
              </text>
              <text x="30" y="32" textAnchor="middle" fill="#d4af37" fontSize="7.5" fontFamily="serif">
                TRACK
              </text>

              {/* 14 Doom Slots */}
              {Array.from({ length: 14 }).map((_, idx) => {
                const spaceNum = 14 - idx; // 14 at top (Doom of Arkham), 1 at bottom
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

                    {/* Doom Factor Token */}
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

            {/* Bottom-left: Gate Appearance Table (1987 Gazette Table) */}
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
            {/* Miskatonic River Flowing East to South Coast */}
            <path
              d="M 850,390 C 820,440 760,490 730,550 C 690,620 540,680 430,750 C 370,790 350,860 360,920"
              fill="none"
              stroke="url(#miskatonicWater)"
              strokeWidth="42"
              strokeLinecap="round"
            />
            {/* River Ripples */}
            <path
              d="M 845,395 C 815,445 755,495 725,555 C 685,625 535,685 425,755 C 365,795 345,865 355,920"
              fill="none"
              stroke="#e0f2fe"
              strokeWidth="2"
              strokeDasharray="6,12"
            />

            {/* Rolling Hills & Greenery Groves */}
            <ellipse cx="480" cy="440" rx="60" ry="30" fill="#166534" opacity="0.12" />
            <ellipse cx="800" cy="410" rx="75" ry="40" fill="#166534" opacity="0.15" />
            <ellipse cx="330" cy="560" rx="50" ry="25" fill="#166534" opacity="0.1" />
            <ellipse cx="730" cy="720" rx="55" ry="25" fill="#166534" opacity="0.1" />
          </g>

          {/* ======================================================== */}
          {/* STREET NETWORK (Paths, Intersections & Nodes) */}
          {/* ======================================================== */}
          <g id="street-paths">
            {/* Thick Cobblestone Base */}
            {Object.values(STREET_NODES).map(node => {
              return node.connectedTo.map(neighborId => {
                const neighbor = STREET_NODES[neighborId];
                if (!neighbor || neighbor.id < node.id) return null;
                return (
                  <line
                    key={`base-${node.id}-${neighbor.id}`}
                    x1={node.x}
                    y1={node.y}
                    x2={neighbor.x}
                    y2={neighbor.y}
                    stroke="#8c6a49"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                );
              });
            })}
            {/* Inner Street Fill */}
            {Object.values(STREET_NODES).map(node => {
              return node.connectedTo.map(neighborId => {
                const neighbor = STREET_NODES[neighborId];
                if (!neighbor || neighbor.id < node.id) return null;
                return (
                  <line
                    key={`inner-${node.id}-${neighbor.id}`}
                    x1={node.x}
                    y1={node.y}
                    x2={neighbor.x}
                    y2={neighbor.y}
                    stroke="#f5eee1"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                );
              });
            })}
          </g>

          {/* Location Pointer Arrows */}
          <g id="location-pointers">
            {Object.values(LOCATIONS_DATA).map(loc => {
              const streetNode = STREET_NODES[loc.pointerNodeId];
              if (!streetNode) return null;

              return (
                <g key={`ptr-${loc.id}`}>
                  <line
                    x1={streetNode.x}
                    y1={streetNode.y}
                    x2={loc.x}
                    y2={loc.y}
                    stroke="#b45309"
                    strokeWidth="3.5"
                    strokeDasharray="4,4"
                  />
                  <circle cx={loc.x} cy={loc.y} r="4" fill="#b45309" />
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* 24 ARKHAM BUILDINGS / LOCATIONS */}
          {/* ======================================================== */}
          <g id="buildings">
            {Object.values(LOCATIONS_DATA).map(loc => {
              const gate = getGateAtLocation(loc.id);
              const investigatorsHere = gameState.investigators.filter(
                inv => inv.locationNodeId === loc.id && !inv.otherWorldState
              );
              const monstersHere = gameState.activeMonsters.filter(
                m => m.currentNodeId === loc.id
              );

              return (
                <g
                  key={loc.id}
                  className="cursor-pointer group"
                  onClick={() => onLocationClick(loc.id)}
                >
                  {/* Building Shadow */}
                  <rect
                    x={loc.x - 42}
                    y={loc.y - 32}
                    width="84"
                    height="64"
                    fill="#332214"
                    opacity="0.3"
                    rx="6"
                    transform="translate(2.5, 3.5)"
                  />
                  {/* Building Base Card */}
                  <rect
                    x={loc.x - 42}
                    y={loc.y - 32}
                    width="84"
                    height="64"
                    fill="#faf6ee"
                    stroke="#5a3d25"
                    strokeWidth="2"
                    rx="6"
                    className="group-hover:stroke-amber-600 transition"
                  />

                  {/* Header Title Bar */}
                  <rect
                    x={loc.x - 42}
                    y={loc.y - 32}
                    width="84"
                    height="20"
                    fill="#4a311d"
                    rx="5"
                  />
                  <text
                    x={loc.x}
                    y={loc.y - 18}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.8"
                    fontWeight="bold"
                    fontFamily="serif"
                  >
                    {loc.name.length > 15 ? loc.name.substring(0, 14) + '..' : loc.name}
                  </text>

                  {/* Building Visual Architectural Glyph */}
                  <g transform={`translate(${loc.x - 12}, ${loc.y - 6})`}>
                    {loc.id === 'train_station' && (
                      <path d="M 4,14 L 20,14 L 20,4 L 4,4 Z M 8,2 L 16,2 L 16,0 L 8,0 Z" fill="#b91c1c" />
                    )}
                    {loc.id === 'north_church' && (
                      <path d="M 12,0 L 14,5 L 14,14 L 10,14 L 10,5 Z" fill="#64748b" />
                    )}
                    {loc.id === 'black_cave' && (
                      <path d="M 2,14 Q 12,2 22,14 Z" fill="#1e293b" />
                    )}
                    {loc.id === 'lighthouse' && (
                      <path d="M 9,14 L 15,14 L 13,2 L 11,2 Z" fill="#e11d48" />
                    )}
                    {loc.id === 'graveyard' && (
                      <path d="M 6,14 L 6,6 L 12,6 L 12,14 Z M 16,14 L 16,8 L 20,8 L 20,14 Z" fill="#475569" />
                    )}
                    {loc.id === 'darks_carnival' && (
                      <polygon points="4,14 12,2 20,14" fill="#ea580c" />
                    )}
                    {loc.id === 'curiositie_shoppe' && (
                      <path d="M 4,14 L 20,14 L 18,6 L 6,6 Z" fill="#ca8a04" />
                    )}
                    {/* Default building icon */}
                    {['train_station', 'north_church', 'black_cave', 'lighthouse', 'graveyard', 'darks_carnival', 'curiositie_shoppe'].indexOf(loc.id) === -1 && (
                      <path d="M 4,14 L 20,14 L 20,6 L 12,1 L 4,6 Z" fill="#784936" />
                    )}
                  </g>

                  {/* D6 Encounter tag */}
                  <text
                    x={loc.x}
                    y={loc.y + 24}
                    textAnchor="middle"
                    fill="#78563a"
                    fontSize="7"
                    fontStyle="italic"
                  >
                    D6 Encounter
                  </text>

                  {/* Swirling Dimensional Gate Overlay */}
                  {gate && (
                    <g transform={`translate(${loc.x}, ${loc.y + 6})`}>
                      <circle cx="0" cy="0" r="22" fill="url(#portalVortex)" filter="url(#pawnShadow)" />
                      <circle cx="0" cy="0" r="16" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="4,4" />
                      <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                        GATE
                      </text>
                    </g>
                  )}

                  {/* Investigators Present */}
                  {investigatorsHere.map((inv, idx) => {
                    const offset = (idx - (investigatorsHere.length - 1) / 2) * 15;
                    return (
                      <g key={inv.id} transform={`translate(${loc.x + offset}, ${loc.y + 14})`} filter="url(#pawnShadow)">
                        <circle cx="0" cy="0" r="9" fill={colorHexMap[inv.color] || '#333'} stroke="#ffffff" strokeWidth="2.5" />
                        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                          {inv.name[0]}
                        </text>
                      </g>
                    );
                  })}

                  {/* Monsters Present */}
                  {monstersHere.map((m, idx) => {
                    const mOffset = (idx - (monstersHere.length - 1) / 2) * 14;
                    return (
                      <g key={m.id} transform={`translate(${loc.x + mOffset - 10}, ${loc.y - 12})`} filter="url(#cardShadow)">
                        <rect x="0" y="0" width="20" height="20" fill="#991b1b" stroke="#fde047" strokeWidth="1.5" rx="3" />
                        <text x="10" y="14" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                          {m.strength}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* STREET NODES & TAXI STANDS */}
          {/* ======================================================== */}
          <g id="street-nodes">
            {Object.values(STREET_NODES).map(node => {
              const isReachable = reachableNodes.includes(node.id);
              const investigatorsHere = getInvestigatorsAtNode(node.id);
              const monstersHere = getMonstersAtNode(node.id);

              if (node.isTaxiStand) {
                // Yellow Circular Taxi Stand
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    onClick={() => { onNodeClick(node.id); sound.playStep(); }}
                    transform={`translate(${node.x}, ${node.y})`}
                  >
                    <circle cx="0" cy="0" r="24" fill="#eab308" stroke="#854d0e" strokeWidth="3.5" filter="url(#pawnShadow)" />
                    <circle cx="0" cy="0" r="17" fill="#ca8a04" />
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">
                      TAXI
                    </text>

                    {isReachable && (
                      <circle cx="0" cy="0" r="30" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="4,4" className="animate-spin" />
                    )}
                  </g>
                );
              }

              // Standard Street Circle
              return (
                <g
                  key={node.id}
                  className="cursor-pointer group"
                  onClick={() => { onNodeClick(node.id); sound.playStep(); }}
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill={isReachable ? '#ecfdf5' : '#ffffff'}
                    stroke={isReachable ? '#059669' : '#6b4f35'}
                    strokeWidth={isReachable ? '3.5' : '2'}
                    filter="url(#pawnShadow)"
                  />
                  {isReachable && (
                    <circle cx="0" cy="0" r="5" fill="#10b981" />
                  )}

                  {/* Investigators on this street node */}
                  {investigatorsHere.map((inv, idx) => {
                    const offset = (idx - (investigatorsHere.length - 1) / 2) * 14;
                    return (
                      <g key={inv.id} transform={`translate(${offset}, 0)`} filter="url(#pawnShadow)">
                        <circle cx="0" cy="0" r="10" fill={colorHexMap[inv.color] || '#333'} stroke="#ffffff" strokeWidth="2.5" />
                        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                          {inv.name[0]}
                        </text>
                      </g>
                    );
                  })}

                  {/* Monsters on this street node (Authentic 1987 Cardboard Counter) */}
                  {monstersHere.map((m, idx) => {
                    const offset = (idx - (monstersHere.length - 1) / 2) * 16;
                    return (
                      <g key={m.id} transform={`translate(${offset}, -22)`} filter="url(#cardShadow)">
                        {/* 1987 Cardboard Monster Counter */}
                        <rect x="-12" y="-12" width="24" height="24" fill="#7f1d1d" stroke="#fde047" strokeWidth="1.8" rx="3" />
                        {/* Direction Arrow */}
                        <polygon
                          points="0,-10 5,-2 -5,-2"
                          fill="#fef08a"
                          transform={m.handedness === 'L' ? 'rotate(-45)' : 'rotate(45)'}
                        />
                        {/* Strength SP */}
                        <text x="0" y="8" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                          {m.strength}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* Welcome to Arkham Billboard Sign */}
          <g transform="translate(195, 310) rotate(-12)" filter="url(#pawnShadow)">
            <rect x="0" y="0" width="90" height="36" fill="#fde68a" stroke="#854d0e" strokeWidth="2" rx="4" />
            <text x="45" y="16" textAnchor="middle" fill="#78350f" fontSize="9.5" fontWeight="bold" fontFamily="serif">
              WELCOME TO
            </text>
            <text x="45" y="28" textAnchor="middle" fill="#78350f" fontSize="8" fontStyle="italic">
              ARKHAM
            </text>
          </g>

          {/* Bottom Title Trademark Banner */}
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
