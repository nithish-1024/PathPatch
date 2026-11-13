import type {
  EdaPlacedComponent,
  EdaWire,
  SimulationResult,
} from "./types";

// Standard 7-segment segment mapping for digits 0-9 (a, b, c, d, e, f, g, dp)
export const DIGIT_SEGMENTS: Record<number, boolean[]> = {
  0: [true, true, true, true, true, true, false, false],
  1: [false, true, true, false, false, false, false, false],
  2: [true, true, false, true, true, false, true, false],
  3: [true, true, true, true, false, false, true, false],
  4: [false, true, true, false, false, true, true, false],
  5: [true, false, true, true, false, true, true, false],
  6: [true, false, true, true, true, true, true, false],
  7: [true, true, true, false, false, false, false, false],
  8: [true, true, true, true, true, true, true, false],
  9: [true, true, true, true, false, true, true, false],
};

export class EdaSimulationEngine {
  private time: number = 0;
  private stepCount: number = 0;
  private counterState: number = 0;
  private lastClkState: 0 | 1 = 0;
  private capVoltage555: number = 1.67;
  private state555: 0 | 1 = 1;

  public reset() {
    this.time = 0;
    this.stepCount = 0;
    this.counterState = 0;
    this.lastClkState = 0;
    this.capVoltage555 = 1.67;
    this.state555 = 1;
  }

  public step(
    components: EdaPlacedComponent[],
    wires: EdaWire[],
    dt: number = 0.0005,
    tAmbient: number = 27
  ): SimulationResult {
    this.time += dt;
    this.stepCount++;

    const nodeVoltages: Record<string, number> = {};
    const branchCurrents: Record<string, number> = {};
    const thermalMap: Record<string, number> = {};
    const activeAlerts: string[] = [];

    // 1. Build Adjacency & Net Map
    // Pin identifier: `${componentId}:${pinId}`
    const pinToNet: Map<string, string> = new Map();
    const netMembers: Map<string, string[]> = new Map();

    // Initialize each pin in its own net
    components.forEach((c) => {
      c.pins.forEach((p) => {
        const pinKey = `${c.id}:${p.id}`;
        pinToNet.set(pinKey, pinKey);
        netMembers.set(pinKey, [pinKey]);
      });
    });

    // Merge nets connected by wires
    wires.forEach((w) => {
      const pinA = `${w.fromCompId}:${w.fromPinId}`;
      const pinB = `${w.toCompId}:${w.toPinId}`;

      const netA = pinToNet.get(pinA);
      const netB = pinToNet.get(pinB);

      if (netA && netB && netA !== netB) {
        const membersA = netMembers.get(netA) || [];
        const membersB = netMembers.get(netB) || [];
        const mergedMembers = [...membersA, ...membersB];

        netMembers.delete(netB);
        netMembers.set(netA, mergedMembers);

        mergedMembers.forEach((pin) => {
          pinToNet.set(pin, netA);
        });
      }
    });

    // 2. Identify Sources and Fix Potential References
    let gndNet: string | null = null;
    let vccNet: string | null = null;
    let vccVoltage = 5.0;

    components.forEach((c) => {
      if (c.type === "GROUND") {
        const pKey = `${c.id}:gnd`;
        gndNet = pinToNet.get(pKey) || null;
      }
      if (c.type === "SOURCE_DC") {
        const posKey = `${c.id}:pos`;
        const negKey = `${c.id}:neg`;
        vccNet = pinToNet.get(posKey) || null;
        if (!gndNet) gndNet = pinToNet.get(negKey) || null;
        vccVoltage = Number(c.properties.voltage ?? 5.0);
      }
    });

    // Set default voltage states
    if (gndNet) nodeVoltages[gndNet] = 0.0;
    if (vccNet) nodeVoltages[vccNet] = vccVoltage;

    // 3. Process Active Components
    components.forEach((c) => {
      thermalMap[c.id] = tAmbient;

      switch (c.type) {
        case "SOURCE_DC": {
          const v = Number(c.properties.voltage ?? 5.0);
          const posNet = pinToNet.get(`${c.id}:pos`);
          const negNet = pinToNet.get(`${c.id}:neg`);
          if (posNet) nodeVoltages[posNet] = v;
          if (negNet) nodeVoltages[negNet] = 0;
          c.state = { voltage: v, active: true };
          break;
        }

        case "SOURCE_AC": {
          const amp = Number(c.properties.amplitudeV ?? 2.0);
          const freq = Number(c.properties.frequencyHz ?? 1000);
          const wave = String(c.properties.waveform ?? "sine");
          let val = 0;
          const theta = 2 * Math.PI * freq * this.time;
          if (wave === "sine") val = amp * Math.sin(theta);
          else if (wave === "square") val = Math.sin(theta) >= 0 ? amp : -amp;
          else val = (2 * amp / Math.PI) * Math.asin(Math.sin(theta));

          const sigNet = pinToNet.get(`${c.id}:out`);
          const gndNetKey = pinToNet.get(`${c.id}:gnd`);
          if (sigNet) nodeVoltages[sigNet] = val;
          if (gndNetKey) nodeVoltages[gndNetKey] = 0;
          c.state = { voltage: val, frequency: freq, active: true };
          break;
        }

        case "SOURCE_CLOCK": {
          const freq = Number(c.properties.frequencyHz ?? 2.0);
          const period = 1.0 / freq;
          const phase = (this.time % period) / period;
          const clkVal: 0 | 1 = phase < 0.5 ? 1 : 0;
          const clkNet = pinToNet.get(`${c.id}:clk`);
          if (clkNet) nodeVoltages[clkNet] = clkVal * 5.0;
          c.state = { logicState: clkVal, frequency: freq, active: true };
          break;
        }

        case "SWITCH_SPST": {
          const closed = Boolean(c.properties.closed);
          const inNet = pinToNet.get(`${c.id}:in`);
          const outNet = pinToNet.get(`${c.id}:out`);
          if (closed && inNet && outNet) {
            const v = nodeVoltages[inNet] ?? nodeVoltages[outNet] ?? 0;
            nodeVoltages[inNet] = v;
            nodeVoltages[outNet] = v;
          }
          c.state = { active: closed };
          break;
        }

        case "REGULATOR_7805": {
          const inNet = pinToNet.get(`${c.id}:vin`);
          const outNet = pinToNet.get(`${c.id}:vout`);
          const vin = inNet ? (nodeVoltages[inNet] ?? 12.0) : 12.0;
          const vout = vin >= 7.0 ? 5.0 : Math.max(0, vin - 2.0);
          if (outNet) nodeVoltages[outNet] = vout;

          // Thermal calculation
          const iloadMa = 350;
          const pLoss = Math.max(0, vin - vout) * (iloadMa / 1000);
          const thetaJa = Number(c.properties.thetaJa ?? 36.0);
          const tj = tAmbient + pLoss * thetaJa;
          thermalMap[c.id] = tj;

          const isOverheating = tj > 105;
          if (isOverheating) {
            activeAlerts.push(`⚠️ ${c.id} (LM7805): Junction Temp ${tj.toFixed(1)}°C exceeds safe threshold! Thermal shutdown imminent.`);
          }

          c.state = {
            voltage: vout,
            current: iloadMa / 1000,
            power: pLoss,
            tempC: tj,
            active: true,
          };
          break;
        }

        case "BUCK_TSR1": {
          const inNet = pinToNet.get(`${c.id}:vin`);
          const outNet = pinToNet.get(`${c.id}:vout`);
          const vin = inNet ? (nodeVoltages[inNet] ?? 12.0) : 12.0;
          const vout = 5.0;
          if (outNet) nodeVoltages[outNet] = vout;

          const iloadMa = 350;
          const pLoss = (5.0 * (iloadMa / 1000)) * (1 - 0.94) / 0.94; // 94% efficiency
          const tj = tAmbient + pLoss * 25.0;
          thermalMap[c.id] = tj;

          c.state = {
            voltage: vout,
            current: iloadMa / 1000,
            power: pLoss,
            tempC: tj,
            rippleMv: 45,
            active: true,
          };
          break;
        }

        case "IC_555": {
          // Astable Multivibrator Simulation
          const r1 = Number(c.properties.r1 ?? 10000);
          const r2 = Number(c.properties.r2 ?? 47000);
          const c1Uf = Number(c.properties.c1Uf ?? 10);
          const c1Farad = c1Uf * 1e-6;

          const vcc = vccVoltage;
          const vHighThresh = (2.0 / 3.0) * vcc;
          const vLowThresh = (1.0 / 3.0) * vcc;

          // Capacitor charge / discharge cycle
          if (this.state555 === 1) {
            // Charging through R1 + R2
            const tauCharge = (r1 + r2) * c1Farad;
            this.capVoltage555 += ((vcc - this.capVoltage555) / tauCharge) * dt * 20;
            if (this.capVoltage555 >= vHighThresh) {
              this.state555 = 0;
            }
          } else {
            // Discharging through R2
            const tauDischarge = r2 * c1Farad;
            this.capVoltage555 -= (this.capVoltage555 / tauDischarge) * dt * 20;
            if (this.capVoltage555 <= vLowThresh) {
              this.state555 = 1;
            }
          }

          const outVoltage = this.state555 === 1 ? vcc - 1.2 : 0.15;
          const freq = 1.44 / ((r1 + 2 * r2) * c1Farad);
          const dutyCycle = ((r1 + r2) / (r1 + 2 * r2)) * 100;

          const outNet = pinToNet.get(`${c.id}:p3_out`);
          const threshNet = pinToNet.get(`${c.id}:p6_thresh`);
          if (outNet) nodeVoltages[outNet] = outVoltage;
          if (threshNet) nodeVoltages[threshNet] = this.capVoltage555;

          c.state = {
            voltage: outVoltage,
            frequency: freq,
            dutyCycle,
            logicState: this.state555,
            active: true,
          };
          break;
        }

        case "BJT_NPN": {
          const bNet = pinToNet.get(`${c.id}:base`);
          const cNet = pinToNet.get(`${c.id}:collector`);
          const eNet = pinToNet.get(`${c.id}:emitter`);

          const vb = bNet ? (nodeVoltages[bNet] ?? 0) : 0;
          const ve = eNet ? (nodeVoltages[eNet] ?? 0) : 0;
          const vc = cNet ? (nodeVoltages[cNet] ?? vccVoltage) : vccVoltage;

          const vbe = vb - ve;
          const conducting = vbe >= 0.65;
          let ic = 0;
          if (conducting) {
            const ib = Math.max(0, (vbe - 0.65) / 1000);
            const beta = Number(c.properties.beta ?? 200);
            ic = Math.min(0.1, ib * beta);
            if (cNet) nodeVoltages[cNet] = Math.max(ve + 0.2, vc - ic * 1000);
          }

          c.state = {
            voltage: vc,
            current: ic,
            power: (vc - ve) * ic,
            active: conducting,
          };
          break;
        }

        case "IC_OPAMP_741": {
          const invNet = pinToNet.get(`${c.id}:inv`);
          const noninvNet = pinToNet.get(`${c.id}:noninv`);
          const outNet = pinToNet.get(`${c.id}:out`);

          const vInv = invNet ? (nodeVoltages[invNet] ?? 0) : 0;
          const vNonInv = noninvNet ? (nodeVoltages[noninvNet] ?? 0) : 0;

          // Inverting Amp Model: Gain = -10x
          const gain = -10.0;
          const vOutCalc = Math.max(-12.0, Math.min(12.0, (vNonInv - vInv) * Math.abs(gain)));
          if (outNet) nodeVoltages[outNet] = vOutCalc;

          c.state = {
            voltage: vOutCalc,
            gain,
            active: true,
          };
          break;
        }

        case "LED": {
          const anNet = pinToNet.get(`${c.id}:anode`);
          const catNet = pinToNet.get(`${c.id}:cathode`);
          const va = anNet ? (nodeVoltages[anNet] ?? 0) : 0;
          const vk = catNet ? (nodeVoltages[catNet] ?? 0) : 0;
          const vDiff = va - vk;
          const forwardV = Number(c.properties.forwardV ?? 2.0);
          const isConducting = vDiff >= forwardV;
          const iLedMa = isConducting ? Math.min(30, (vDiff - forwardV) / 220 * 1000) : 0;

          c.state = {
            voltage: vDiff,
            current: iLedMa / 1000,
            active: isConducting && iLedMa > 1.0,
          };
          break;
        }

        case "COUNTER_4BIT": {
          const clkNet = pinToNet.get(`${c.id}:clk`);
          const clkVolts = clkNet ? (nodeVoltages[clkNet] ?? 0) : 0;
          const currentClk: 0 | 1 = clkVolts > 2.0 ? 1 : 0;

          // Rising edge detection
          if (this.lastClkState === 0 && currentClk === 1) {
            this.counterState = (this.counterState + 1) % 16;
          }
          this.lastClkState = currentClk;

          const q0: 0 | 1 = (this.counterState & 1) ? 1 : 0;
          const q1: 0 | 1 = (this.counterState & 2) ? 1 : 0;
          const q2: 0 | 1 = (this.counterState & 4) ? 1 : 0;
          const q3: 0 | 1 = (this.counterState & 8) ? 1 : 0;

          const q0Net = pinToNet.get(`${c.id}:q0`);
          const q1Net = pinToNet.get(`${c.id}:q1`);
          const q2Net = pinToNet.get(`${c.id}:q2`);
          const q3Net = pinToNet.get(`${c.id}:q3`);

          if (q0Net) nodeVoltages[q0Net] = q0 * 5.0;
          if (q1Net) nodeVoltages[q1Net] = q1 * 5.0;
          if (q2Net) nodeVoltages[q2Net] = q2 * 5.0;
          if (q3Net) nodeVoltages[q3Net] = q3 * 5.0;

          c.state = {
            countValue: this.counterState,
            logicState: currentClk,
            active: true,
          };
          break;
        }

        case "DISPLAY_7SEG": {
          const digit = this.counterState % 10;
          const segments = DIGIT_SEGMENTS[digit] || DIGIT_SEGMENTS[0];
          c.state = {
            countValue: digit,
            segments,
            active: true,
          };
          break;
        }

        case "GATE_NOT": {
          const inNet = pinToNet.get(`${c.id}:in`);
          const outNet = pinToNet.get(`${c.id}:out`);
          const inVal = inNet ? ((nodeVoltages[inNet] ?? 0) > 2.0 ? 1 : 0) : 0;
          const outVal = inVal === 1 ? 0 : 1;
          if (outNet) nodeVoltages[outNet] = outVal * 5.0;
          c.state = { logicState: outVal as (0 | 1), active: true };
          break;
        }

        case "GATE_AND": {
          const in1Net = pinToNet.get(`${c.id}:in1`);
          const in2Net = pinToNet.get(`${c.id}:in2`);
          const outNet = pinToNet.get(`${c.id}:out`);
          const in1 = in1Net ? ((nodeVoltages[in1Net] ?? 0) > 2.0 ? 1 : 0) : 0;
          const in2 = in2Net ? ((nodeVoltages[in2Net] ?? 0) > 2.0 ? 1 : 0) : 0;
          const outVal = (in1 === 1 && in2 === 1) ? 1 : 0;
          if (outNet) nodeVoltages[outNet] = outVal * 5.0;
          c.state = { logicState: outVal as (0 | 1), active: true };
          break;
        }

        case "GATE_OR": {
          const in1Net = pinToNet.get(`${c.id}:in1`);
          const in2Net = pinToNet.get(`${c.id}:in2`);
          const outNet = pinToNet.get(`${c.id}:out`);
          const in1 = in1Net ? ((nodeVoltages[in1Net] ?? 0) > 2.0 ? 1 : 0) : 0;
          const in2 = in2Net ? ((nodeVoltages[in2Net] ?? 0) > 2.0 ? 1 : 0) : 0;
          const outVal = (in1 === 1 || in2 === 1) ? 1 : 0;
          if (outNet) nodeVoltages[outNet] = outVal * 5.0;
          c.state = { logicState: outVal as (0 | 1), active: true };
          break;
        }

        case "GATE_XOR": {
          const in1Net = pinToNet.get(`${c.id}:in1`);
          const in2Net = pinToNet.get(`${c.id}:in2`);
          const outNet = pinToNet.get(`${c.id}:out`);
          const in1 = in1Net ? ((nodeVoltages[in1Net] ?? 0) > 2.0 ? 1 : 0) : 0;
          const in2 = in2Net ? ((nodeVoltages[in2Net] ?? 0) > 2.0 ? 1 : 0) : 0;
          const outVal = in1 !== in2 ? 1 : 0;
          if (outNet) nodeVoltages[outNet] = outVal * 5.0;
          c.state = { logicState: outVal as (0 | 1), active: true };
          break;
        }

        case "DC_MOTOR": {
          const posNet = pinToNet.get(`${c.id}:pos`);
          const negNet = pinToNet.get(`${c.id}:neg`);
          const vp = posNet ? (nodeVoltages[posNet] ?? 0) : 0;
          const vn = negNet ? (nodeVoltages[negNet] ?? 0) : 0;
          const vDiff = Math.max(0, vp - vn);
          const rpm = Math.round((vDiff / 5.0) * 3600);
          c.state = { voltage: vDiff, current: vDiff / 10.0, power: vDiff * (vDiff / 10.0), active: rpm > 100 };
          break;
        }
      }
    });

    // 4. Update Wires Telemetry & Particle Flow
    wires.forEach((w) => {
      const pinA = `${w.fromCompId}:${w.fromPinId}`;
      const pinB = `${w.toCompId}:${w.toPinId}`;
      const netA = pinToNet.get(pinA);
      const netB = pinToNet.get(pinB);

      const va = netA ? (nodeVoltages[netA] ?? 0) : 0;
      const vb = netB ? (nodeVoltages[netB] ?? 0) : 0;

      w.voltage = va;
      // Estimate wire current from connected component state
      const compA = components.find((c) => c.id === w.fromCompId);
      const compB = components.find((c) => c.id === w.toCompId);
      const currentA = compA?.state?.current ?? 0;
      const currentB = compB?.state?.current ?? 0;
      w.current = Math.max(currentA, currentB, (Math.abs(va - vb) / 50));
      branchCurrents[w.id] = w.current;

      // Advance moving particles
      if (!w.particles) {
        w.particles = [{ progress: 0.2 }, { progress: 0.5 }, { progress: 0.8 }];
      }
      const speed = Math.min(0.08, Math.max(0.005, w.current * 0.1));
      w.particles.forEach((p) => {
        p.progress = (p.progress + speed) % 1.0;
      });
    });

    // 5. Generate Multi-Sample Waveforms for Instruments Dock
    const samplesCount = 120;
    const timeSamples: number[] = [];
    const ch1Samples: number[] = [];
    const ch2Samples: number[] = [];

    // Find active waveform producers (555, AC, Op-Amp, or Buck)
    const timer555 = components.find((c) => c.type === "IC_555");
    const acSource = components.find((c) => c.type === "SOURCE_AC");
    const opAmp = components.find((c) => c.type === "IC_OPAMP_741");
    const buck = components.find((c) => c.type === "BUCK_TSR1");

    for (let i = 0; i < samplesCount; i++) {
      const sampleT = this.time - (samplesCount - i) * 0.0001;
      timeSamples.push(sampleT);

      if (timer555) {
        // CH1: 555 Output pulse (0 or 4.5V)
        const f = timer555.state?.frequency ?? 1000;
        const phase = (sampleT * f) % 1.0;
        const duty = (timer555.state?.dutyCycle ?? 60) / 100;
        ch1Samples.push(phase < duty ? 4.5 : 0.2);
        // CH2: Timing capacitor saw/triangle wave
        const capV = phase < duty ? 1.67 + phase * (3.33 - 1.67) / duty : 3.33 - (phase - duty) * (3.33 - 1.67) / (1 - duty);
        ch2Samples.push(capV);
      } else if (acSource) {
        // CH1: AC input sine wave
        const f = acSource.state?.frequency ?? 1000;
        const vIn = Math.sin(2 * Math.PI * f * sampleT) * 1.5;
        ch1Samples.push(vIn);
        // CH2: Amplified inverted output if Op-Amp exists, else rectified wave
        if (opAmp) {
          ch2Samples.push(Math.max(-10, Math.min(10, -10.0 * vIn)));
        } else {
          ch2Samples.push(Math.abs(vIn) - 0.7 > 0 ? Math.abs(vIn) - 0.7 : 0);
        }
      } else if (buck) {
        // CH1: Switching ripple (50mV p-p at 300kHz)
        const ripple = 5.0 + 0.045 * Math.sin(2 * Math.PI * 300000 * sampleT);
        ch1Samples.push(ripple);
        // CH2: Switching inductor square node (0V to 12V)
        const phaseSw = (sampleT * 300000) % 1.0;
        ch2Samples.push(phaseSw < (5.0 / 12.0) ? 12.0 : 0.0);
      } else {
        // Default DC Rail
        ch1Samples.push(vccVoltage);
        ch2Samples.push(0.0);
      }
    }

    // 6. Vivado Digital Waveforms (Logic Analyzer Tracks)
    const digitalTracks: Record<string, (0 | 1)[]> = {
      CLK: [],
      Q0: [],
      Q1: [],
      Q2: [],
      Q3: [],
      OUT: [],
    };

    for (let i = 0; i < 40; i++) {
      const cyc = (this.counterState - (39 - i) + 64) % 16;
      digitalTracks.CLK.push((i % 2 === 0 ? 1 : 0));
      digitalTracks.Q0.push((cyc & 1 ? 1 : 0));
      digitalTracks.Q1.push((cyc & 2 ? 1 : 0));
      digitalTracks.Q2.push((cyc & 4 ? 1 : 0));
      digitalTracks.Q3.push((cyc & 8 ? 1 : 0));
      digitalTracks.OUT.push((cyc >= 10 ? 1 : 0));
    }

    return {
      time: this.time,
      step: this.stepCount,
      nodeVoltages,
      branchCurrents,
      oscilloscopeSamples: {
        time: timeSamples,
        ch1: ch1Samples,
        ch2: ch2Samples,
      },
      logicWaveforms: digitalTracks,
      thermalMap,
      activeAlerts,
    };
  }
}
