import type {
  CircuitDiagnostic,
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

        case "DIODE_SCHOTTKY":
        case "DIODE_1N4148":
        case "DIODE_RECTIFIER": {
          const anNet = pinToNet.get(`${c.id}:anode`);
          const catNet = pinToNet.get(`${c.id}:cathode`);
          const va = anNet ? (nodeVoltages[anNet] ?? 0) : 0;
          const vk = catNet ? (nodeVoltages[catNet] ?? 0) : 0;
          const vDiff = va - vk;
          const forwardV = Number(c.properties.forwardV ?? 0.7);
          const isConducting = vDiff >= forwardV;
          const currentA = isConducting ? Math.min(1.0, (vDiff - forwardV) / 0.1) : 0;
          c.state = { voltage: vDiff, current: currentA, active: isConducting };
          break;
        }

        case "PHOTORESISTOR": {
          const lux = Number(c.properties.lightLux ?? 500);
          const rDark = Number(c.properties.darkResistance ?? 100000);
          const rLight = Number(c.properties.lightResistance ?? 1000);
          const rVal = Math.round(rLight + (rDark - rLight) * Math.exp(-lux / 200));
          c.properties.resistance = rVal;
          c.state = { voltage: 0, current: 0, active: lux > 100 };
          break;
        }

        case "THERMISTOR_NTC": {
          const tempC = Number(c.properties.tempC ?? 25);
          const r25 = Number(c.properties.r25 ?? 10000);
          const beta = Number(c.properties.beta ?? 3950);
          const tKelvin = tempC + 273.15;
          const rVal = Math.round(r25 * Math.exp(beta * (1 / tKelvin - 1 / 298.15)));
          c.properties.resistance = rVal;
          c.state = { tempC, active: true };
          break;
        }

        case "RELAY_SPDT": {
          const coilPosNet = pinToNet.get(`${c.id}:coil_pos`);
          const coilNegNet = pinToNet.get(`${c.id}:coil_neg`);
          const vp = coilPosNet ? (nodeVoltages[coilPosNet] ?? 0) : 0;
          const vn = coilNegNet ? (nodeVoltages[coilNegNet] ?? 0) : 0;
          const coilV = Math.abs(vp - vn);
          const isEnergized = coilV >= 3.8;
          c.properties.energized = isEnergized;
          c.state = { voltage: coilV, active: isEnergized };
          break;
        }

        case "VOLTMETER": {
          const posNet = pinToNet.get(`${c.id}:pos`);
          const negNet = pinToNet.get(`${c.id}:neg`);
          const vp = posNet ? (nodeVoltages[posNet] ?? 0) : 0;
          const vn = negNet ? (nodeVoltages[negNet] ?? 0) : 0;
          const measuredV = vp - vn;
          c.properties.displayedVoltage = measuredV;
          c.state = { voltage: measuredV, active: true };
          break;
        }

        case "AMMETER": {
          const inNet = pinToNet.get(`${c.id}:in`);
          const outNet = pinToNet.get(`${c.id}:out`);
          const vin = inNet ? (nodeVoltages[inNet] ?? 0) : 0;
          const vout = outNet ? (nodeVoltages[outNet] ?? 0) : 0;
          const measuredI = Math.abs(vin - vout) / 0.01;
          c.properties.displayedCurrentMa = measuredI * 1000;
          c.state = { current: measuredI, active: true };
          break;
        }

        case "RGB_LED": {
          const rNet = pinToNet.get(`${c.id}:r`);
          const gNet = pinToNet.get(`${c.id}:g`);
          const bNet = pinToNet.get(`${c.id}:b`);
          const gndNet = pinToNet.get(`${c.id}:gnd`);
          const vgnd = gndNet ? (nodeVoltages[gndNet] ?? 0) : 0;
          const vr = (rNet ? (nodeVoltages[rNet] ?? 0) : 0) - vgnd;
          const vg = (gNet ? (nodeVoltages[gNet] ?? 0) : 0) - vgnd;
          const vb = (bNet ? (nodeVoltages[bNet] ?? 0) : 0) - vgnd;
          c.state = {
            active: vr >= 2.0 || vg >= 3.0 || vb >= 3.0,
          };
          break;
        }

        case "IC_LM358": {
          const in1Neg = pinToNet.get(`${c.id}:in1_neg`);
          const in1Pos = pinToNet.get(`${c.id}:in1_pos`);
          const out1 = pinToNet.get(`${c.id}:out1`);
          const v1N = in1Neg ? (nodeVoltages[in1Neg] ?? 0) : 0;
          const v1P = in1Pos ? (nodeVoltages[in1Pos] ?? 0) : 0;
          const vOut1 = Math.max(0, Math.min(13.5, (v1P - v1N) * 100000));
          if (out1) nodeVoltages[out1] = vOut1;
          c.state = { voltage: vOut1, active: true };
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
        const f = acSource.state?.frequency ?? 50;
        const amp = Number(acSource.properties.amplitudeV ?? 12.0);
        const vIn = Math.sin(2 * Math.PI * f * sampleT) * amp;
        ch1Samples.push(vIn);

        const bjt = components.find((c) => c.type === "BJT_NPN" || c.type === "TRANSISTOR_NPN_BC547");
        const hasDiode = components.some((c) => c.type === "DIODE_RECTIFIER" || c.type === "DIODE_1N4148");
        const hasFilterCap = components.some((c) => c.type === "CAPACITOR_ELECTROLYTIC");

        if (opAmp || bjt) {
          // BJT / Op-Amp 180° phase-inverted and amplified
          ch2Samples.push(Math.max(-12, Math.min(12, -4.5 * Math.sin(2 * Math.PI * f * sampleT))));
        } else if (hasDiode && hasFilterCap) {
          // Year 1 Bridge Rectifier with smoothing capacitor (DC with slight ripple)
          const vDcPeak = Math.max(0, amp - 1.4);
          const ripple = Math.sin(4 * Math.PI * f * sampleT) * (vDcPeak * 0.04);
          ch2Samples.push(vDcPeak - Math.abs(ripple));
        } else if (hasDiode) {
          // Raw full-wave pulsating DC
          ch2Samples.push(Math.max(0, Math.abs(vIn) - 1.4));
        } else {
          ch2Samples.push(vIn);
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

    // 6.5. AC Frequency Sweep / Bode Plot Analysis
    let cutoffFreqHz = 1591.5; // default 1.59kHz (10k + 10nF)
    let resonanceFreqHz = 1000.0;
    let qFactor = 2.5;

    // Detect actual R and C from placed components if available
    const resistor = components.find((c) => c.type === "RESISTOR");
    const capacitor = components.find((c) => c.type === "CAPACITOR_CERAMIC" || c.type === "CAPACITOR_ELECTROLYTIC");
    if (resistor && capacitor) {
      const rVal = Number(resistor.properties.resistance ?? 10000);
      const cValUf = Number(capacitor.properties.capacitanceUf ?? 0.01);
      const cFarad = cValUf * 1e-6;
      if (rVal > 0 && cFarad > 0) {
        cutoffFreqHz = 1.0 / (2 * Math.PI * rVal * cFarad);
      }
    }

    const bodeFrequencies: number[] = [];
    const bodeGainDb: number[] = [];
    const bodePhaseDeg: number[] = [];
    // 50 logarithmic frequency steps from 10 Hz to 1 MHz
    for (let i = 0; i < 50; i++) {
      const logF = 1 + (i / 49) * 5; // 10^1 to 10^6
      const f = Math.pow(10, logF);
      bodeFrequencies.push(f);

      // Low-pass / Bandpass frequency response transfer function
      const ratio = f / cutoffFreqHz;
      let gainNorm = 1.0 / Math.sqrt(1 + ratio * ratio);
      let phase = -Math.atan(ratio) * (180 / Math.PI);

      if (opAmp) {
        // Active inverting amplifier gain: -10x (20 dB) with high-frequency roll-off
        const a0 = 10.0; // 20dB passband
        gainNorm = a0 / Math.sqrt(1 + Math.pow(f / 100000, 2));
        phase = -180 - Math.atan(f / 100000) * (180 / Math.PI);
      }

      const gainDbVal = 20 * Math.log10(Math.max(1e-4, gainNorm));
      bodeGainDb.push(Math.round(gainDbVal * 10) / 10);
      bodePhaseDeg.push(Math.round(phase * 10) / 10);
    }

    // 7. Intelligent Circuit Diagnostics & Actionable Recommendations
    const diagnostics: CircuitDiagnostic[] = [];

    // Diagnostic 1: VCC directly shorted to GND
    if (vccNet && gndNet && vccNet === gndNet) {
      diagnostics.push({
        id: "diag_short_vcc_gnd",
        severity: "critical",
        title: "CRITICAL SHORT CIRCUIT: VCC Connected Directly to GND",
        faultLocation: {
          componentId: "RAIL_VCC",
          componentDesignator: "VCC",
          pinId: "pos",
          pinName: "+VCC",
          netId: vccNet,
          nodePotentialV: 0,
        },
        whereItWentWrong: "Net between VCC (+5V/+12V) and Ground (0V)",
        whyItWentWrong:
          "The positive power rail is tied directly to Ground with zero load resistance. According to Ohm's Law (I = V / R), R = 0Ω demands infinite current, causing immediate power supply collapse and thermal burnout.",
        whyThisHappened:
          "The positive power rail (+5V/+12V) is tied directly to Ground with zero load resistance. According to Ohm's Law (I = V / R), this demands infinite current, causing immediate power supply collapse and thermal burnout.",
        firstPrinciplesProof: "I_{short} = \\frac{V_{CC}}{R_{wire}} = \\frac{5.0\\text{V}}{0.001\\Omega} = 5000\\text{A} \\gg I_{max}",
        recommendation:
          "Disconnect the direct wire connecting Power to Ground. Place an electrical load (such as a resistor, motor, IC, or LED circuit) between the power rails.",
      });
      activeAlerts.push("CRITICAL SHORT CIRCUIT: VCC directly shorted to GND!");
    }

    // Diagnostic 2: Component-level fault inspection
    components.forEach((c) => {
      // Reversed Electrolytic Capacitor
      if (c.type === "CAPACITOR_ELECTROLYTIC") {
        const posNet = pinToNet.get(`${c.id}:pos`);
        const negNet = pinToNet.get(`${c.id}:neg`);
        const vp = posNet ? (nodeVoltages[posNet] ?? 0) : 0;
        const vn = negNet ? (nodeVoltages[negNet] ?? 0) : 0;
        if (vn - vp > 0.4) {
          diagnostics.push({
            id: `diag_rev_cap_${c.id}`,
            severity: "critical",
            title: `REVERSED POLARITY: Electrolytic Capacitor (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: "neg",
              pinName: "Negative (-)",
              netId: negNet,
              nodePotentialV: vn,
            },
            whereItWentWrong: `Capacitor ${c.designator || c.name} Pin: Negative (-) terminal`,
            whyItWentWrong: `Negative lead is at ${vn.toFixed(1)}V, which is higher than positive lead at ${vp.toFixed(1)}V. Reverse bias destroys the dielectric aluminum oxide film, boiling the electrolyte into hydrogen gas.`,
            whyThisHappened: `Capacitor ${c.name} has its negative (-) pin connected to a higher potential (${vn.toFixed(1)}V) than its positive (+) pin (${vp.toFixed(1)}V). In polarized aluminum electrolytic capacitors, reverse bias destroys the microscopic dielectric oxide layer, releasing hydrogen gas and causing thermal rupture.`,
            firstPrinciplesProof: "V_{neg} - V_{pos} = " + (vn - vp).toFixed(2) + "\\text{V} > 0.4\\text{V} \\implies \\text{Oxide Dielectric Breakdown}",
            recommendation:
              "Rotate or reconnect the capacitor so that the positive (+) lead connects toward the positive supply rail and the white-striped negative (-) lead faces Ground.",
          });
          activeAlerts.push(`REVERSED POLARITY: ${c.name} negative pin at ${vn.toFixed(1)}V > positive pin ${vp.toFixed(1)}V!`);
        }
      }

      // Overcurrent Unballasted LED
      if (c.type === "LED") {
        const aNet = pinToNet.get(`${c.id}:anode`);
        const kNet = pinToNet.get(`${c.id}:cathode`);
        const va = aNet ? (nodeVoltages[aNet] ?? 0) : 0;
        const vk = kNet ? (nodeVoltages[kNet] ?? 0) : 0;
        const vDiff = va - vk;
        if (vDiff >= 3.0 && aNet === vccNet && kNet === gndNet) {
          diagnostics.push({
            id: `diag_led_burn_${c.id}`,
            severity: "critical",
            title: `OVERCURRENT: Unballasted LED Connected to Power (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: "anode",
              pinName: "Anode (+)",
              netId: aNet,
              nodePotentialV: va,
            },
            whereItWentWrong: `LED ${c.designator || c.name} Anode (+) Pin connected directly to VCC`,
            whyItWentWrong: `Dynamic resistance of PN junction collapses above knee voltage (2.0V). Direct connection across ${vDiff.toFixed(1)}V rail forces over 120mA forward current, causing instant thermal blowout.`,
            whyThisHappened: `LED ${c.name} is connected directly across the supply rails (${vDiff.toFixed(1)}V) with no ballast resistor. Because the diode dynamic resistance drops to near zero above its 2.0V threshold, current exceeds 120mA (safe limit: 20mA), causing instantaneous thermal burnout.`,
            firstPrinciplesProof: "I_{LED} = \\frac{V_{CC} - V_F}{R_{bulk}} = \\frac{" + (vDiff - 2.0).toFixed(1) + "\\text{V}}{1.5\\Omega} \\approx 2000\\text{mA} \\gg 25\\text{mA}",
            recommendation:
              "Insert a 330Ω to 1kΩ current-limiting resistor in series with the LED anode or cathode (R = (Vsupply - 2.0V) / 0.015A).",
          });
          activeAlerts.push(`OVERCURRENT: ${c.name} has no current-limiting resistor!`);
        }
      }

      // Unprotected Inductive Kickback
      if (c.type === "INDUCTOR" || c.type === "DC_MOTOR") {
        const hasDiodeSnubber = components.some(
          (other) =>
            (other.type === "DIODE_RECTIFIER" || other.type === "DIODE_1N4148") &&
            wires.some(
              (w) =>
                (w.fromCompId === c.id && w.toCompId === other.id) ||
                (w.fromCompId === other.id && w.toCompId === c.id)
            )
        );
        if (!hasDiodeSnubber && wires.some((w) => w.fromCompId === c.id || w.toCompId === c.id)) {
          diagnostics.push({
            id: `diag_flyback_${c.id}`,
            severity: "warning",
            title: `UNPROTECTED INDUCTIVE FLYBACK: (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: "pos",
              pinName: "Terminal 1",
            },
            whereItWentWrong: `Inductive load ${c.designator || c.name} switching terminal`,
            whyItWentWrong: `When switch opens, magnetic flux collapses instantaneously. Faraday's Law (V = -L di/dt) produces reverse high-voltage spikes exceeding 80V, puncturing semiconductor junctions.`,
            whyThisHappened: `Inductive component ${c.name} is connected without an anti-parallel flyback protection diode. When coil current is interrupted by a switch or transistor, the collapsing magnetic field generates a large reverse voltage spike (V = -L di/dt > 60V) that arcs across contacts and destroys driver semiconductors.`,
            firstPrinciplesProof: "V_{spike} = -L \\frac{di}{dt} = -(50\\text{mH}) \\cdot \\frac{-0.5\\text{A}}{1\\mu\\text{s}} = +25,000\\text{V} \\gg V_{breakdown}",
            recommendation:
              "Connect a 1N4007 or 1N4148 diode in anti-parallel (cathode facing +VCC, anode facing the switch node) across the motor/inductor terminals.",
          });
        }
      }

      // Op-Amp Saturation / Clipping Detection
      if (c.type === "IC_OPAMP_741") {
        const invNet = pinToNet.get(`${c.id}:inv`);
        const noninvNet = pinToNet.get(`${c.id}:noninv`);
        const outNet = pinToNet.get(`${c.id}:out`);
        const vposNet = pinToNet.get(`${c.id}:vpos`);
        const vOut = outNet ? (nodeVoltages[outNet] ?? 0) : 0;

        const hasVposWire = wires.some(
          (w) =>
            `${w.fromCompId}:${w.fromPinId}` === `${c.id}:vpos` ||
            `${w.toCompId}:${w.toPinId}` === `${c.id}:vpos`
        );

        if (!vposNet || !hasVposWire) {
          diagnostics.push({
            id: `diag_opamp_floating_vpos_${c.id}`,
            severity: "critical",
            title: `⚡ FLOATING VCC+ RAIL: LM741 Op-Amp (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: "vpos",
              pinName: "Pin 7 (VCC+ Supply Rail)",
              nodePotentialV: 0.0,
            },
            whereItWentWrong: `LM741 ${c.designator || c.name} Pin 7 (VCC+) is Unconnected / Floating`,
            whyItWentWrong: `Positive power supply rail pin has infinite DC source impedance. Without positive rail bias current, the internal differential pair is starved of current and the output flat-clips at 0V.`,
            whyThisHappened: `IC1 Pin 7 (VCC+) lacks a physical wire connection to the +15V DC rail. The op-amp output collapses into flat clipping at 0V.`,
            firstPrinciplesProof: "I_{supply} = 0\\text{ mA} \\implies V_{out,max} = \\min(A_{ol} \\cdot V_{id}, V_{cc} - V_{sat}) = 0.00\\text{V} \\text{ (Output Flat-Clipped)}",
            recommendation: "Connect Pin 7 (VCC+) to the +15V positive DC supply rail to restore normal operational bias.",
          });
          activeAlerts.push(`CRITICAL FAULT: LM741 ${c.designator || c.name} Pin 7 (VCC+) is floating! Output collapsed.`);
        } else if (!invNet || !noninvNet) {
          diagnostics.push({
            id: `diag_opamp_float_${c.id}`,
            severity: "warning",
            title: `FLOATING OP-AMP INPUT TERMINAL: (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: !invNet ? "inv" : "noninv",
              pinName: !invNet ? "Pin 2 (Inverting -)" : "Pin 3 (Non-Inverting +)",
            },
            whereItWentWrong: `Op-Amp ${c.designator || c.name} Pin: ${!invNet ? "Pin 2 (INV)" : "Pin 3 (NON-INV)"}`,
            whyItWentWrong: `Input pin is floating with no DC path to ground or reference. Input bias current charges stray capacitance, driving the output to positive or negative supply rail saturation.`,
            whyThisHappened: `An operational amplifier input pin has no DC path to Ground or reference potential.`,
            recommendation: "Provide a DC bias return path or tie unused inputs to Ground through a 10kΩ resistor.",
          });
        } else if (Math.abs(vOut) >= 11.5) {
          diagnostics.push({
            id: `diag_opamp_sat_${c.id}`,
            severity: "warning",
            title: `OP-AMP RAIL SATURATION / CLIPPING: (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: "out",
              pinName: "Pin 6 (Output)",
              nodePotentialV: vOut,
            },
            whereItWentWrong: `Op-Amp ${c.designator || c.name} Pin 6 (OUT) at ${vOut.toFixed(1)}V`,
            whyItWentWrong: `Demanded output voltage exceeds the internal BJT output stage headroom (VCC - 1.5V). The waveform tops are clipped flat, producing severe harmonic distortion.`,
            whyThisHappened: `Closed loop gain (-Rf / Rin) multiplied by input signal amplitude exceeds operational amplifier voltage rails.`,
            firstPrinciplesProof: "V_{demanded} = |A_v \\cdot V_{in}| = |-10 \\times 2.0\\text{V}| = 20.0\\text{V} > V_{rail} (\\pm 12\\text{V})",
            recommendation: "Reduce closed-loop feedback gain (lower Rf or raise Rin) or attenuate the AC input signal amplitude.",
          });
        }
      }

      // Floating Reset Pin on ICs
      if (c.type === "IC_555") {
        const rstPinKey = `${c.id}:p4_rst`;
        const hasWire = wires.some(
          (w) =>
            `${w.fromCompId}:${w.fromPinId}` === rstPinKey ||
            `${w.toCompId}:${w.toPinId}` === rstPinKey
        );
        if (!hasWire) {
          diagnostics.push({
            id: `diag_rst_${c.id}`,
            severity: "info",
            title: `FLOATING RESET PIN: NE555 Timer (${c.designator || c.name})`,
            componentId: c.id,
            faultLocation: {
              componentId: c.id,
              componentDesignator: c.designator || c.name,
              pinId: "p4_rst",
              pinName: "Pin 4 (RESET)",
            },
            whereItWentWrong: `NE555 Timer ${c.designator || c.name} Pin 4 (Active-Low RESET)`,
            whyItWentWrong: `Pin 4 is unasserted and high-impedance. Ambient electrical noise can pull the internal flip-flop low, causing sporadic glitching or shutting off oscillation.`,
            whyThisHappened: `Pin 4 (active-low RESET) on ${c.name} is left disconnected. In CMOS and bipolar timers, high input impedance picks up stray electromagnetic interference, causing intermittent resets and unstable timing pulses.`,
            recommendation:
              "Connect Pin 4 (RESET) directly to Pin 8 (VCC) for normal continuous astable operation, or pull it high with a 10kΩ resistor.",
          });
        }
      }
    });

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
      bodeData: {
        frequencies: bodeFrequencies,
        gainDb: bodeGainDb,
        phaseDeg: bodePhaseDeg,
        cutoffFreqHz,
        resonanceFreqHz,
        qFactor,
      },
      logicWaveforms: digitalTracks,
      thermalMap,
      activeAlerts,
      diagnostics,
    };
  }
}
