"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CardModel } from "@/lib/types";
import { localDb } from "@/lib/services/local-storage";
import { FileText, Bookmark, Globe, Tag, Network, ZoomIn, ZoomOut, RotateCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type GraphNode = {
  id: string;
  label: string;
  type: 'note' | 'card' | 'url';
  x: number;
  y: number;
  size: number;
  color: string;
};

type GraphLink = {
  source: string;
  target: string;
  type: 'note-link' | 'card-reference' | 'url-reference';
  strength: number;
};

type KnowledgeGraphProps = {
  onSelectCard?: (card: CardModel) => void;
  className?: string;
};

export function KnowledgeGraph({ onSelectCard, className = "" }: KnowledgeGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cards = useDataStore((state) => state.cards);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    return nodes.filter(node =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [nodes, searchQuery]);

  // Get connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    const hoveredId = hoveredNodeId || selectedNodeId;
    if (!hoveredId) return new Set<string>();

    const connected = new Set<string>([hoveredId]);
    links.forEach(link => {
      if (link.source === hoveredId) connected.add(link.target);
      if (link.target === hoveredId) connected.add(link.source);
    });
    return connected;
  }, [hoveredNodeId, selectedNodeId, links]);

  // Load graph data
  useEffect(() => {
    async function loadGraphData() {
      setLoading(true);
      try {
        const notes = cards.filter(card =>
          (card.type === 'md-note' || card.type === 'text-note') && !card.collections?.includes('the-den')
        );
        const graphNodes: GraphNode[] = [];
        const graphLinks: GraphLink[] = [];

        // Create nodes for notes
        for (const note of notes) {
          if (!note.title) continue;

          const node: GraphNode = {
            id: note.id,
            label: note.title,
            type: 'note',
            x: Math.random() * 800 - 400,
            y: Math.random() * 600 - 300,
            size: 20,
            color: '#a78bfa' // Purple for notes
          };
          graphNodes.push(node);

          // Get links for this note
          try {
            const [noteLinks, cardLinks] = await Promise.all([
              localDb.getNoteLinks(note.id),
              localDb.getNoteCardLinks(note.id)
            ]);

            // Add links to other notes
            for (const link of noteLinks) {
              const targetNote = notes.find(n => n.id === link.targetNoteId);
              if (targetNote) {
                graphLinks.push({
                  source: note.id,
                  target: link.targetNoteId,
                  type: 'note-link',
                  strength: 1
                });
              }
            }

            // Add links to cards
            for (const cardLink of cardLinks) {
              const targetCard = cards.find(c => c.id === cardLink.targetCardId && !c.collections?.includes('the-den'));
              if (targetCard) {
                // Create node for card if it doesn't exist
                if (!graphNodes.find(n => n.id === cardLink.targetCardId)) {
                  const cardNode: GraphNode = {
                    id: cardLink.targetCardId,
                    label: targetCard.title || 'Untitled',
                    type: cardLink.linkType === 'card' ? 'card' : 'url',
                    x: Math.random() * 800 - 400,
                    y: Math.random() * 600 - 300,
                    size: 15,
                    color: cardLink.linkType === 'card' ? '#60a5fa' : '#4ade80'
                  };
                  graphNodes.push(cardNode);
                }

                graphLinks.push({
                  source: note.id,
                  target: cardLink.targetCardId,
                  type: cardLink.linkType === 'card' ? 'card-reference' : 'url-reference',
                  strength: 0.8
                });
              }
            }
          } catch (error) {
          }
        }

        setNodes(graphNodes);
        setLinks(graphLinks);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }

    loadGraphData();
  }, [cards]);

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Get node icon
  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'note':
        return <FileText size={12} />;
      case 'card':
        return <Bookmark size={12} />;
      case 'url':
        return <Globe size={12} />;
    }
  };

  // Get link color
  const getLinkColor = (type: GraphLink['type']) => {
    switch (type) {
      case 'note-link':
        return '#a78bfa';
      case 'card-reference':
        return '#60a5fa';
      case 'url-reference':
        return '#4ade80';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 bg-surface rounded-lg border border-subtle ${className}`}>
        <div className="text-center">
          <Network size={48} className="mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg border border-subtle overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="space-y-3 p-4 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network size={20} className="text-accent" />
            <h3 className="font-semibold text-foreground">Knowledge Graph</h3>
            <span className="text-sm text-muted-foreground">
              {filteredNodes.length} nodes, {links.length} connections
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded hover:bg-surface-soft text-muted-foreground hover:text-foreground transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded hover:bg-surface-soft text-muted-foreground hover:text-foreground transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded hover:bg-surface-soft text-muted-foreground hover:text-foreground transition-colors"
              title="Reset view"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-soft text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Graph */}
      <div className="h-96 relative overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#666"
              />
            </marker>
          </defs>
          
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          >
            {/* Links */}
            {links.map((link, index) => {
              const sourceNode = nodes.find(n => n.id === link.source);
              const targetNode = nodes.find(n => n.id === link.target);

              if (!sourceNode || !targetNode) return null;

              // Highlight connected links
              const isConnected = connectedNodeIds.size > 0 &&
                (connectedNodeIds.has(link.source) || connectedNodeIds.has(link.target));
              const isHighlighted = connectedNodeIds.size === 0 || isConnected;

              return (
                <line
                  key={index}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={getLinkColor(link.type)}
                  strokeWidth={isConnected ? link.strength * 3 : link.strength * 2}
                  opacity={isHighlighted ? 0.8 : 0.2}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const isConnected = connectedNodeIds.has(node.id);
              const isHighlighted = connectedNodeIds.size === 0 || isConnected;
              const nodeSize = isConnected ? node.size * 1.3 : node.size;

              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize}
                    fill={node.color}
                    stroke="#fff"
                    strokeWidth={isConnected ? 3 : 2}
                    opacity={isHighlighted ? 1 : 0.3}
                    className="cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
                      const card = cards.find(c => c.id === node.id && !c.collections?.includes('the-den'));
                      if (card && onSelectCard) {
                        onSelectCard(card);
                      }
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#fff"
                    className="pointer-events-none"
                    opacity={isHighlighted ? 1 : 0.3}
                  >
                    {getNodeIcon(node.type)}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + nodeSize + 15}
                    textAnchor="middle"
                    fontSize={isConnected ? "14" : "12"}
                    fontWeight={isConnected ? "600" : "400"}
                    fill={isConnected ? "#fff" : "#666"}
                    className="pointer-events-none"
                    opacity={isHighlighted ? 1 : 0.3}
                  >
                    {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-subtle">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
            <span className="text-muted-foreground">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-muted-foreground">Cards</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-muted-foreground">URLs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
