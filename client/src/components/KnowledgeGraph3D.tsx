"use client";

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls, Line, Billboard } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BulletPoint {
  text: string;
  keywords: string[];
}

interface KnowledgeGraph {
  skills: string[];
  experiences: {
    role: string;
    company: string;
    duration: string;
    highlights: string[];
    bullets: BulletPoint[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
    keywords: string[];
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    bullets: BulletPoint[];
  }[];
  strengths: string[];
  industries: string[];
  summary: string;
}

interface GraphNode {
  id: string;
  label: string;
  detail?: string;
  category: string;
  depth: number; // 0=center, 1=section, 2=item, 3=bullet, 4=keyword
  position: [number, number, number];
  color: string;
  size: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

/* ------------------------------------------------------------------ */
/*  Bright colour palette                                              */
/* ------------------------------------------------------------------ */

const COLORS: Record<string, string> = {
  center: "#4361ee",
  skills: "#06d6a0",
  experience: "#f72585",
  education: "#7209b7",
  projects: "#4cc9f0",
  strengths: "#ff9f1c",
  industries: "#3a86ff",
};

/* ------------------------------------------------------------------ */
/*  Deterministic seeded random                                        */
/* ------------------------------------------------------------------ */

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/*  Truncate long labels                                               */
/* ------------------------------------------------------------------ */

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/* ------------------------------------------------------------------ */
/*  Build hierarchical graph with clusters                             */
/* ------------------------------------------------------------------ */

function buildGraphData(kg: KnowledgeGraph): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let seed = 0;

  // Center node
  nodes.push({
    id: "center",
    label: "You",
    detail: kg.summary,
    category: "center",
    depth: 0,
    position: [0, 0, 0],
    color: COLORS.center,
    size: 1.6,
  });

  // ---- Section ring layout ----
  const sections: {
    key: string;
    label: string;
    color: string;
    itemCount: number;
  }[] = [];

  if (kg.experiences.length)
    sections.push({ key: "experience", label: "Experience", color: COLORS.experience, itemCount: kg.experiences.length });
  if (kg.education.length)
    sections.push({ key: "education", label: "Education", color: COLORS.education, itemCount: kg.education.length });
  if (kg.projects.length)
    sections.push({ key: "projects", label: "Projects", color: COLORS.projects, itemCount: kg.projects.length });
  if (kg.skills.length)
    sections.push({ key: "skills", label: "Skills", color: COLORS.skills, itemCount: kg.skills.length });
  if (kg.strengths.length)
    sections.push({ key: "strengths", label: "Strengths", color: COLORS.strengths, itemCount: kg.strengths.length });
  if (kg.industries.length)
    sections.push({ key: "industries", label: "Industries", color: COLORS.industries, itemCount: kg.industries.length });

  const sectionRadius = 12;

  sections.forEach((sec, si) => {
    const sAngle = (si / sections.length) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(sAngle) * sectionRadius;
    const sy = Math.sin(sAngle) * sectionRadius * 0.85;
    const sz = Math.sin(sAngle + 0.3) * 8;

    const secId = `sec-${sec.key}`;
    nodes.push({
      id: secId,
      label: sec.label,
      category: sec.key,
      depth: 1,
      position: [sx, sy, sz],
      color: sec.color,
      size: 1.0,
    });
    edges.push({ from: "center", to: secId });

    // ---- Experience cluster ----
    if (sec.key === "experience") {
      const itemRadius = 7;
      kg.experiences.forEach((exp, ei) => {
        const eAngle = sAngle + ((ei - (kg.experiences.length - 1) / 2) / Math.max(kg.experiences.length, 1)) * 1.6;
        const ex = sx + Math.cos(eAngle) * itemRadius;
        const ey = sy + Math.sin(eAngle) * itemRadius * 0.6;
        const ez = sz + (seededRandom(++seed) - 0.5) * 8;
        const expId = `exp-${ei}`;

        nodes.push({
          id: expId,
          label: `${exp.role}`,
          detail: `${exp.company} · ${exp.duration}`,
          category: sec.key,
          depth: 2,
          position: [ex, ey, ez],
          color: sec.color,
          size: 0.65,
        });
        edges.push({ from: secId, to: expId });

        // Bullets fan out from experience
        const bullets = exp.bullets?.length ? exp.bullets : exp.highlights.map(h => ({ text: h, keywords: [] }));
        const bulletRadius = 4.5;
        bullets.forEach((b, bi) => {
          const bAngle = eAngle + ((bi - (bullets.length - 1) / 2) / Math.max(bullets.length, 1)) * 1.2;
          const bx = ex + Math.cos(bAngle) * bulletRadius;
          const by = ey + Math.sin(bAngle) * bulletRadius * 0.5;
          const bz = ez + (seededRandom(++seed) - 0.5) * 5;
          const bulletId = `exp-${ei}-b-${bi}`;

          nodes.push({
            id: bulletId,
            label: truncate(b.text, 35),
            detail: b.text,
            category: sec.key,
            depth: 3,
            position: [bx, by, bz],
            color: sec.color,
            size: 0.35,
          });
          edges.push({ from: expId, to: bulletId });

          // Keywords from bullet
          const kwRadius = 2.8;
          (b.keywords ?? []).forEach((kw, ki) => {
            const kwAngle = bAngle + ((ki - (b.keywords.length - 1) / 2) / Math.max(b.keywords.length, 1)) * 0.8;
            const kwx = bx + Math.cos(kwAngle) * kwRadius;
            const kwy = by + Math.sin(kwAngle) * kwRadius * 0.4;
            const kwz = bz + (seededRandom(++seed) - 0.5) * 4;
            const kwId = `exp-${ei}-b-${bi}-kw-${ki}`;

            nodes.push({
              id: kwId,
              label: kw,
              category: sec.key,
              depth: 4,
              position: [kwx, kwy, kwz],
              color: sec.color,
              size: 0.2,
            });
            edges.push({ from: bulletId, to: kwId });
          });
        });
      });
    }

    // ---- Projects cluster (same structure as experience) ----
    if (sec.key === "projects") {
      const itemRadius = 7;
      kg.projects.forEach((proj, pi) => {
        const pAngle = sAngle + ((pi - (kg.projects.length - 1) / 2) / Math.max(kg.projects.length, 1)) * 1.6;
        const px = sx + Math.cos(pAngle) * itemRadius;
        const py = sy + Math.sin(pAngle) * itemRadius * 0.6;
        const pz = sz + (seededRandom(++seed) - 0.5) * 8;
        const projId = `proj-${pi}`;

        nodes.push({
          id: projId,
          label: proj.name,
          detail: proj.description,
          category: sec.key,
          depth: 2,
          position: [px, py, pz],
          color: sec.color,
          size: 0.65,
        });
        edges.push({ from: secId, to: projId });

        // Tech tags
        const techRadius = 3.5;
        proj.technologies.forEach((t, ti) => {
          const tAngle = pAngle + ((ti - (proj.technologies.length - 1) / 2) / Math.max(proj.technologies.length, 1)) * 1.0;
          const tx = px + Math.cos(tAngle) * techRadius;
          const ty = py + Math.sin(tAngle) * techRadius * 0.4;
          const tz = pz + (seededRandom(++seed) - 0.5) * 4;

          nodes.push({
            id: `proj-${pi}-tech-${ti}`,
            label: t,
            category: sec.key,
            depth: 3,
            position: [tx, ty, tz],
            color: sec.color,
            size: 0.25,
          });
          edges.push({ from: projId, to: `proj-${pi}-tech-${ti}` });
        });

        // Bullets
        const bulletRadius = 4.5;
        (proj.bullets ?? []).forEach((b, bi) => {
          const bAngle = pAngle + ((bi - ((proj.bullets?.length ?? 1) - 1) / 2) / Math.max(proj.bullets?.length ?? 1, 1)) * 1.2;
          const bx = px + Math.cos(bAngle) * bulletRadius;
          const by = py + Math.sin(bAngle) * bulletRadius * 0.5;
          const bz = pz + (seededRandom(++seed) - 0.5) * 5;
          const bulletId = `proj-${pi}-b-${bi}`;

          nodes.push({
            id: bulletId,
            label: truncate(b.text, 35),
            detail: b.text,
            category: sec.key,
            depth: 3,
            position: [bx, by, bz],
            color: sec.color,
            size: 0.3,
          });
          edges.push({ from: projId, to: bulletId });

          (b.keywords ?? []).forEach((kw, ki) => {
            const kwAngle = bAngle + ((ki - (b.keywords.length - 1) / 2) / Math.max(b.keywords.length, 1)) * 0.7;
            nodes.push({
              id: `proj-${pi}-b-${bi}-kw-${ki}`,
              label: kw,
              category: sec.key,
              depth: 4,
              position: [
                bx + Math.cos(kwAngle) * 2.5,
                by + Math.sin(kwAngle) * 2.5 * 0.4,
                bz + (seededRandom(++seed) - 0.5) * 3,
              ],
              color: sec.color,
              size: 0.18,
            });
            edges.push({ from: bulletId, to: `proj-${pi}-b-${bi}-kw-${ki}` });
          });
        });
      });
    }

    // ---- Education cluster ----
    if (sec.key === "education") {
      const itemRadius = 6;
      kg.education.forEach((edu, ei) => {
        const eAngle = sAngle + ((ei - (kg.education.length - 1) / 2) / Math.max(kg.education.length, 1)) * 1.4;
        const ex = sx + Math.cos(eAngle) * itemRadius;
        const ey = sy + Math.sin(eAngle) * itemRadius * 0.6;
        const ez = sz + (seededRandom(++seed) - 0.5) * 6;
        const eduId = `edu-${ei}`;

        nodes.push({
          id: eduId,
          label: edu.degree,
          detail: `${edu.institution} · ${edu.year}`,
          category: sec.key,
          depth: 2,
          position: [ex, ey, ez],
          color: sec.color,
          size: 0.55,
        });
        edges.push({ from: secId, to: eduId });

        // Keywords
        (edu.keywords ?? []).forEach((kw, ki) => {
          const kwAngle = eAngle + ((ki - ((edu.keywords?.length ?? 1) - 1) / 2) / Math.max(edu.keywords?.length ?? 1, 1)) * 1.0;
          nodes.push({
            id: `edu-${ei}-kw-${ki}`,
            label: kw,
            category: sec.key,
            depth: 3,
            position: [
              ex + Math.cos(kwAngle) * 3,
              ey + Math.sin(kwAngle) * 3 * 0.4,
              ez + (seededRandom(++seed) - 0.5) * 4,
            ],
            color: sec.color,
            size: 0.22,
          });
          edges.push({ from: eduId, to: `edu-${ei}-kw-${ki}` });
        });
      });
    }

    // ---- Simple leaf lists: skills, strengths, industries ----
    if (sec.key === "skills" || sec.key === "strengths" || sec.key === "industries") {
      const items =
        sec.key === "skills" ? kg.skills :
        sec.key === "strengths" ? kg.strengths : kg.industries;
      // Arrange in concentric rings — max 8 items per ring
      const perRing = 8;
      items.forEach((item, ii) => {
        const ring = Math.floor(ii / perRing);
        const indexInRing = ii % perRing;
        const countInRing = Math.min(perRing, items.length - ring * perRing);
        const leafRadius = 4 + ring * 2.5;
        const spread = Math.min(1.2, 0.4 + countInRing * 0.1);
        const iAngle = sAngle + ((indexInRing - (countInRing - 1) / 2) / Math.max(countInRing, 1)) * spread;
        nodes.push({
          id: `${sec.key}-${ii}`,
          label: item,
          category: sec.key,
          depth: 2,
          position: [
            sx + Math.cos(iAngle) * leafRadius,
            sy + Math.sin(iAngle) * leafRadius * 0.5,
            sz + (seededRandom(++seed) - 0.5) * 3 + ring * 1.5,
          ],
          color: sec.color,
          size: 0.35,
        });
        edges.push({ from: secId, to: `${sec.key}-${ii}` });
      });
    }
  });

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/*  Node sphere — flat bright, size varies by depth                    */
/* ------------------------------------------------------------------ */

function NodeSphere({
  node,
  onHover,
  onClick,
  isSelected,
}: {
  node: GraphNode;
  onHover: (n: GraphNode | null) => void;
  onClick: (n: GraphNode) => void;
  isSelected: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  // Opacity decreases with depth for visual hierarchy
  const opacity = node.depth <= 1 ? 1.0 : node.depth === 2 ? 0.95 : node.depth === 3 ? 0.8 : 0.65;

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.y =
      node.position[1] +
      Math.sin(Date.now() * 0.0006 + node.position[0] * 0.3) * 0.06;

    const s = hovered || isSelected ? 1.4 : 1;
    targetScale.current.set(s, s, s);
    ref.current.scale.lerp(targetScale.current, delta * 5);

    if (glowRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.1;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const fontSize =
    node.depth === 0 ? 0.55 :
    node.depth === 1 ? 0.42 :
    node.depth === 2 ? 0.3 :
    node.depth === 3 ? 0.22 : 0.18;

  return (
    <group
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(node);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node);
      }}
    >
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[node.size * (hovered || isSelected ? 2.2 : 1.5), 20, 20]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={hovered || isSelected ? 0.2 : 0.06}
        />
      </mesh>

      {/* Sphere */}
      <mesh ref={ref}>
        <sphereGeometry args={[node.size, 28, 28]} />
        <meshBasicMaterial color={node.color} transparent opacity={opacity} />
      </mesh>

      {/* Label — always faces camera */}
      <Billboard position={[0, node.size + 0.3, 0]}>
        <Text
          fontSize={fontSize}
          color="#1a1a2e"
          anchorX="center"
          anchorY="bottom"
          maxWidth={node.depth >= 3 ? 4 : 5}
          textAlign="center"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          {node.label}
        </Text>
      </Billboard>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Edge curve                                                         */
/* ------------------------------------------------------------------ */

function EdgeCurve({
  from,
  to,
  color,
  depth,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  depth: number;
}) {
  const points = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = new THREE.Vector3()
      .addVectors(a, b)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(0, 0, 0.6));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    return curve
      .getPoints(16)
      .map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [from, to]);

  const lineOpacity = depth <= 1 ? 0.35 : depth === 2 ? 0.2 : 0.12;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={depth <= 1 ? 1.5 : 1}
      transparent
      opacity={lineOpacity}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Particle field                                                     */
/* ------------------------------------------------------------------ */

function ParticleField() {
  const count = 200;
  const ref = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (seededRandom(i * 3) - 0.5) * 160;
      arr[i * 3 + 1] = (seededRandom(i * 3 + 1) - 0.5) * 160;
      arr[i * 3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 160;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.00012;
      ref.current.rotation.x += 0.00006;
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#cbd5e1"
        size={0.03}
        transparent
        opacity={0.12}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Camera                                                             */
/* ------------------------------------------------------------------ */

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 3, 35);
  }, [camera]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

function DetailPanel({
  node,
  onClose,
}: {
  node: GraphNode;
  onClose: () => void;
}) {
  const depthLabel =
    node.depth === 0 ? "Profile" :
    node.depth === 1 ? "Section" :
    node.depth === 2 ? "Item" :
    node.depth === 3 ? "Bullet" : "Keyword";

  return (
    <div
      className="absolute top-4 right-4 w-80 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl p-5 shadow-2xl z-20"
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex justify-between items-start mb-3">
        <div
          className="w-3 h-3 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: node.color }}
        />
        <div className="flex-1 ml-2">
          <h3 className="text-sm font-bold text-gray-900">{node.label}</h3>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">{depthLabel}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-lg leading-none"
        >
          &times;
        </button>
      </div>
      {node.detail && (
        <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
          {node.detail}
        </p>
      )}
      {!node.detail && (
        <p className="text-xs text-gray-400 italic">
          {node.category === "center"
            ? "The central node connecting all your profile data."
            : `Part of your ${node.category} cluster.`}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

function Scene({
  kg,
  onSelectNode,
}: {
  kg: KnowledgeGraph;
  onSelectNode: (n: GraphNode | null) => void;
}) {
  const { nodes, edges } = useMemo(() => buildGraphData(kg), [kg]);
  const [selected, setSelected] = useState<string | null>(null);
  const [, setHovered] = useState<GraphNode | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const handleClick = useCallback(
    (n: GraphNode) => {
      setSelected((prev) => {
        const next = prev === n.id ? null : n.id;
        onSelectNode(next ? n : null);
        return next;
      });
    },
    [onSelectNode]
  );

  return (
    <>
      <CameraRig />
      <ambientLight intensity={1} />
      <ParticleField />

      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        return (
          <EdgeCurve
            key={i}
            from={fromNode.position}
            to={toNode.position}
            color={toNode.color}
            depth={toNode.depth}
          />
        );
      })}

      {nodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          onHover={setHovered}
          onClick={handleClick}
          isSelected={selected === node.id}
        />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.25}
        minDistance={12}
        maxDistance={80}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Fullscreen button                                                  */
/* ------------------------------------------------------------------ */

function FullscreenButton({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="absolute top-4 right-4 z-20 bg-white/70 hover:bg-white/90 backdrop-blur-sm text-gray-500 hover:text-gray-800 rounded-lg p-2 transition-all border border-gray-200"
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export default function KnowledgeGraph3D({ kg }: { kg: KnowledgeGraph }) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-[#f0f4f8]"
    : "relative w-full h-full min-h-[500px] rounded-lg overflow-hidden bg-[#f0f4f8]";

  return (
    <div className={containerClass}>
      <FullscreenButton
        isFullscreen={isFullscreen}
        onToggle={() => setIsFullscreen((v) => !v)}
      />

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
          Knowledge Graph
        </p>
        <div className="space-y-1">
          {[
            { color: COLORS.experience, label: "Experience" },
            { color: COLORS.education, label: "Education" },
            { color: COLORS.projects, label: "Projects" },
            { color: COLORS.skills, label: "Skills" },
            { color: COLORS.strengths, label: "Strengths" },
            { color: COLORS.industries, label: "Industries" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      <Canvas
        camera={{ fov: 50, near: 0.1, far: 200 }}
        style={{ width: "100%", height: "100%" }}
        onPointerMissed={() => setSelectedNode(null)}
      >
        <Scene kg={kg} onSelectNode={setSelectedNode} />
      </Canvas>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white/70 backdrop-blur-sm rounded-full px-4 py-1.5 border border-gray-200">
        <p className="text-[10px] text-gray-400">
          Drag to rotate &middot; Scroll to zoom &middot; Click nodes for
          details {isFullscreen && "&middot; Esc to exit"}
        </p>
      </div>
    </div>
  );
}
