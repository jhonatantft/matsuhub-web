import type { AgentBuffers } from "./geometry";
import { PULSES } from "./shaders";

/**
 * The agents' timetable. Every hop is a pure function of the clock — agent `i` on hop `k`
 * always travels between the same two nodes at the same moment — so the scene can be frozen
 * at any `?t=` for a screenshot, paused off screen and resumed, with no state to replay.
 *
 * Per frame this only compares a couple of integers per agent; buffers are rewritten (in
 * place) at the instant an agent takes off or lands.
 */
export type Agents = {
  /** Ripple origins for the shell shader: xyz on the unit sphere + strength, one slot per agent. */
  pulse: Float32Array;
  /** Landing time of each ripple, on the scene clock. */
  pulseT: Float32Array;
  update: (t: number) => void;
};

/** Longest tail, as a fraction of a flight (matches `tail` in AGENT_VERT). */
const TAIL_MAX = 0.4 * 1.3;

function hash(i: number, k: number) {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 0x7f4a7c15, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

export function createAgents(buffers: AgentBuffers, nodes: Float32Array, count: number, rnd: () => number): Agents {
  const nodeCount = nodes.length / 3;
  const half = nodeCount >> 1;
  const period = new Float32Array(count);
  const phase = new Float32Array(count);
  const strength = new Float32Array(count);
  const hop = new Int32Array(count).fill(-0x40000000);
  const landing = new Int32Array(count).fill(-0x40000000);
  const pulse = new Float32Array(PULSES * 4);
  const pulseT = new Float32Array(PULSES).fill(-1e3);
  const from = buffers.from.array as Float32Array;
  const to = buffers.to.array as Float32Array;
  const data = buffers.data.array as Float32Array;

  for (let i = 0; i < count; i++) {
    period[i] = 4.4 + rnd() * 2.8;
    phase[i] = rnd() * period[i];
    strength[i] = i % 4 === 0 ? 1 : 0.2 + rnd() * 0.25; // a few lead agents make the big waves
    data[i * 4 + 2] = rnd();
    data[i * 4 + 3] = strength[i];
  }

  /** Node reached at the end of hop `k`. Even and odd hops use different halves, so a hop never ends where it began. */
  const nodeOf = (i: number, k: number) => ((hash(i, k) % half) * 2 + (k & 1)) * 3;

  const angle = (a: number, b: number) => {
    const d = nodes[a] * nodes[b] + nodes[a + 1] * nodes[b + 1] + nodes[a + 2] * nodes[b + 2];
    return Math.acos(Math.min(1, Math.max(-1, d)));
  };

  /** Longer journeys take longer, but always leave time to reel the tail in before the next hop. */
  const flight = (i: number, omega: number) => Math.min(0.9 + 1.25 * omega, (period[i] - 0.1) / (1 + TAIL_MAX));

  function update(t: number) {
    let moved = false;
    for (let i = 0; i < count; i++) {
      const p = period[i];
      const k = Math.floor((t + phase[i]) / p);
      if (k !== hop[i]) {
        hop[i] = k;
        const a = nodeOf(i, k - 1);
        const b = nodeOf(i, k);
        from[i * 3] = nodes[a];
        from[i * 3 + 1] = nodes[a + 1];
        from[i * 3 + 2] = nodes[a + 2];
        to[i * 3] = nodes[b];
        to[i * 3 + 1] = nodes[b + 1];
        to[i * 3 + 2] = nodes[b + 2];
        data[i * 4] = k * p - phase[i];
        data[i * 4 + 1] = flight(i, angle(a, b));
        moved = true;
      }
      // the ripple slot always holds this agent's most recent landing
      const last = t >= data[i * 4] + data[i * 4 + 1] ? k : k - 1;
      if (last !== landing[i]) {
        landing[i] = last;
        const a = nodeOf(i, last - 1);
        const b = nodeOf(i, last);
        const omega = angle(a, b);
        const reach = Math.min(1, Math.max(0, (omega - 0.25) / 1.1));
        pulse[i * 4] = nodes[b];
        pulse[i * 4 + 1] = nodes[b + 1];
        pulse[i * 4 + 2] = nodes[b + 2];
        pulse[i * 4 + 3] = strength[i] * (0.3 + 0.7 * reach);
        pulseT[i] = last * p - phase[i] + flight(i, omega);
      }
    }
    if (moved) {
      buffers.from.needsUpdate = true;
      buffers.to.needsUpdate = true;
      buffers.data.needsUpdate = true;
    }
  }

  return { pulse, pulseT, update };
}
