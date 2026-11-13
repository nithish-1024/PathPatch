export interface ArchitecturePathway {
  id: "path_a" | "path_b" | "path_c";
  label: string;
  name: string;
  recommended?: boolean;
  exactDefinition: string;
  summary: string;
  tradeOff: string;
}

export interface ContradictionIdea {
  id: string;
  title: string;
  category: string;
  concept: string;
  stages: Array<{
    step: string;
    name: string;
    desc: string;
    status: "nominal" | "bottleneck";
    statusText: string;
    highlight?: boolean;
  }>;
  bottleneck: {
    stage: string;
    title: string;
    mechanism: string;
    risks: string[];
    mathFormula?: string;
  };
  contradiction: {
    myth: string;
    brutalTruth: string;
  };
  pathways: ArchitecturePathway[];
  hardenedBlueprint: {
    title: string;
    sub: string;
    metrics: Array<{ label: string; value: string; positive?: boolean }>;
    topology: string;
    silicon: Array<{ role: string; part: string; spec: string }>;
    physicsMath: string;
    firmwareFailsafe: string;
    implementationSteps: string[];
  };
}

export const CONTRADICTION_IDEAS: ContradictionIdea[] = [
  // 1. Solar Microgrid
  {
    id: "solar_microgrid",
    title: "1. Smart Solar Microgrid with Battery Storage",
    category: "Renewable Energy & Power Systems",
    concept:
      "Photovoltaic array (36V Voc) coupled with MPPT buck regulation to charge a 4S LiFePO4 battery bank, powering agricultural sensors and switching to grid backup when SoC < 20%.",
    stages: [
      { step: "01", name: "PV Generation", desc: "Photovoltaic panel string (Voc=36V, Vmp=30V, Imp=3.3A)", status: "nominal", statusText: "Operational" },
      { step: "02", name: "MPPT Buck Stage", desc: "Synchronous 150kHz DC-DC converter (36V -> 14.4V CC/CV)", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "LiFePO4 Storage", desc: "4S 12.8V 100Ah battery bank + hardware BMS protection", status: "nominal", statusText: "Operational" },
      { step: "04", name: "Inverter & Inrush", desc: "Pure sine inverter with pre-charge relay to protect contactor", status: "nominal", statusText: "Operational" },
      { step: "05", name: "Telemetry & Grid", desc: "Dual-core ESP32 MQTT over Wi-Fi / LTE-M to monitoring dashboard", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Charge Regulation & Voltage Differential",
      title: "Direct PWM / Linear Regulation dumps 55.5% of solar power as heat",
      mechanism:
        "Connecting a 30V Vmp panel to a 13.5V LiFePO4 pack via PWM clamps panel voltage, delivering only 44.5W instead of 100W (55.5% lost). A series linear regulator dissipates ΔV × I = (30V - 13.5V) × 5A = 82.5W of pure waste heat, driving Tj to 158.7°C (instant fire or thermal shutdown).",
      risks: [
        "Junction temperature Tj exceeds 150°C, causing catastrophic thermal runaway.",
        "Over 50% of rated solar generation capability is discarded.",
        "PWM pulsing induces lithium dendrites in LiFePO4 cells, destroying lifespan.",
      ],
      mathFormula: "P_{waste} = (V_{mp} - V_{bat}) \\cdot I_{chg} = 16.5\\text{V} \\times 5\\text{A} = 82.5\\text{W}",
    },
    contradiction: {
      myth: "I’ll just use a cheap PWM controller from Amazon or an LM317 with a big aluminum heatsink; it’s cheap and simple.",
      brutalTruth:
        "You spend $150 on solar panels and throw $85 of that capacity directly into the trash. The PWM pulses trigger lithium plating and hot-spot degradation, shrinking pack capacity by 40% in 6 months.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: Passive Shunt / PWM Regulator Fix",
            "exactDefinition": "Clamp the PV panel directly to battery terminal voltage via basic duty-cycle pulse-width modulation.",
            "summary": "Direct PWM charging without impedance matching; requires an oversized aluminum heatsink to handle 80W waste heat.",
            "tradeOff": "Discards 55% of panel power as heat; induces lithium dendrite wear in cells."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Synchronous 150kHz MPPT Buck Regulator (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Dynamically track maximum power point (P&O) and down-convert voltage with dual low-RDS(on) synchronous MOSFETs.",
            "summary": "TI LM5117/SM72442 with CSD19534Q5A FETs achieving 96.2% efficiency and cool 2.8W dissipation.",
            "tradeOff": "Requires custom PCB layout with copper ground fill beneath the inductor."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Interleaved Multi-Phase Micro-Inverter Grid Architecture",
            "exactDefinition": "Convert individual panel strings through dedicated distributed GaN micro-inverters directly to AC bus.",
            "summary": "Eliminates single-point DC string failures; provides panel-level telemetry and cloud microgrid optimization.",
            "tradeOff": "3.5x higher upfront hardware capital cost."
      }
],
    hardenedBlueprint: {
      title: "Synchronous 150kHz MPPT Buck Regulator with Low-RDS(on) MOSFETs",
      sub: "TI LM5117 / SM72442 controller with Perturb & Observe tracking, delivering 96.2% conversion efficiency with under 2.8W thermal dissipation.",
      metrics: [
        { label: "Efficiency", value: "96.2%", positive: true },
        { label: "Heat Loss", value: "2.8W at 10A", positive: true },
        { label: "Junction Temp", value: "68.6°C (Cool)", positive: true },
        { label: "Cell Longevity", value: "3,500+ Cycles", positive: true },
      ],
      topology: "Synchronous DC-DC Buck Converter with dynamic Perturb & Observe MPPT tracking at 150 kHz.",
      silicon: [
        { role: "MPPT Controller", part: "TI SM72442 / LM5117", spec: "Programmable MPPT with integrated high/low drivers" },
        { role: "Power MOSFETs", part: "Dual TI CSD19534Q5A", spec: "100V, RDS(on) = 4.4 mΩ, Qg = 17 nC" },
        { role: "Power Inductor", part: "Würth WE-HCI 74435571000", spec: "10 µH, Isat = 24A, carbonyl iron powder" },
        { role: "Current Shunt", part: "Vishay WSLP3921 + INA240A2", spec: "2 mΩ shunt with 120 dB CMRR bi-directional amp" },
      ],
      physicsMath: "\\eta = \\frac{V_{out} \\cdot I_{out}}{V_{in} \\cdot I_{in}} = 96.2%, \\quad T_j = 35^\\circ\\text{C} + (2.8\\text{W} \\times 12^\\circ\\text{C/W}) = 68.6^\\circ\\text{C}",
      firmwareFailsafe:
        "Incremental conductance tracked at 1 kHz via ADC DMA. High-speed overvoltage trip interrupt (< 2 µs) triggered when Vcell >= 3.65V to eliminate cell swelling.",
      implementationSteps: [
        "Layout synchronous buck with 2-oz copper ground plane directly beneath the inductor.",
        "Insert TI INA240A2 bidirectional current monitor to isolate PWM switching noise.",
        "Program Perturb & Observe MPPT loop in ESP32 FreeRTOS task running at 100 Hz.",
        "Implement solid-state pre-charge relay with ceramic PTC to prevent contactor welding.",
      ],
    },
  },

  // 2. Drone Flight Controller
  {
    id: "drone_controller",
    title: "2. Quadcopter Flight Controller & Power Distribution",
    category: "Aerospace & High-Current Robotics",
    concept:
      "6S LiPo power distribution board (25.2V to 18V) driving 4 BLDC motors with active freewheeling, powering dual IMUs and an STM32H7 flight core.",
    stages: [
      { step: "01", name: "6S LiPo Rail", desc: "XT60 battery input (25.2V charged down to 18V cut-off)", status: "nominal", statusText: "Operational" },
      { step: "02", name: "Surge Clamping & Buck", desc: "Bidirectional TVS clamp + 60V step-down to 5.5V / 3.3V", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "Flight Core & IMU", desc: "STM32H743 MCU + ICM-42688-P 6-axis gyro via SPI at 32 kHz", status: "nominal", statusText: "Operational" },
      { step: "04", name: "4-in-1 BLDC ESC", desc: "DShot600 digital protocol commanding 30A per motor", status: "nominal", statusText: "Operational" },
      { step: "05", name: "Radio & OSD", desc: "ExpressLRS 2.4GHz receiver + digital video transmitter", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Power Isolation & Back-EMF Transients",
      title: "Motor active braking injects 60V inductive spikes into 5V buck",
      mechanism:
        "Rapid motor deceleration forces motor inductance (L = 15 µH) to dump stored energy (V = L · di/dt). With di/dt > 20A/µs, 22.2V rails spike to 48V-62V for 150 ns. Generic 30V linear or buck regulators suffer instant dielectric punch-through, frying the STM32 MCU mid-flight.",
      risks: [
        "Unclamped 62V inductive spikes punch through 30V buck converter silicon.",
        "Flight MCU suffers brownout reset or permanent destruction, causing a 100 km/h ground crash.",
        "Sensor ground bounce corrupts SPI gyro readings, flipping PID loops unstable.",
      ],
      mathFormula: "V_{spike} = V_{bat} + L \\cdot \\frac{di}{dt} = 22.2\\text{V} + \\left(15\\mu\\text{H} \\times \\frac{20\\text{A}}{1\\mu\\text{s}}\\right) = 62.2\\text{V}",
    },
    contradiction: {
      myth: "I soldered a cheap 220µF 25V capacitor on the battery pigtail; that's plenty of decoupling.",
      brutalTruth:
        "A 25V capacitor on a 25.2V 6S battery has zero safety margin. Standard electrolytics have high ESR (> 150 mΩ) and cannot absorb 20 ns transients. The spike blows straight past the capacitor and incinerates your flight core.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: High-Capacity Electrolytic Snubber Cap",
            "exactDefinition": "Solder a high-voltage 50V low-ESR electrolytic capacitor directly across the XT60 battery lead.",
            "summary": "Absorbs bulk inductive surge energy; immediate cheap fix to reduce transient amplitude.",
            "tradeOff": "Adds 18 grams weight; cannot clamp nanosecond sub-microsecond voltage spikes."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Two-Tier TVS Clamping + 60V Monolithic Buck (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Clamp back-EMF spikes with an ultra-fast bidirectional TVS diode backed by a 60V-rated step-down regulator and isolated RF LDO.",
            "summary": "Littelfuse SMBJ28A + Panasonic OS-CON array + TI TPS54302 (60V input) dedicated to flight core.",
            "tradeOff": "Requires dedicated PCB real estate and star-ground copper isolation."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Galvanically Isolated Optical Flight Core Architecture",
            "exactDefinition": "Optically decouple flight control logic completely from motor power distribution via digital isolators.",
            "summary": "100% electrical isolation between motor ESCs and flight IMU via high-speed digital isolators.",
            "tradeOff": "Adds $25 BOM cost and extra power supply converters."
      }
],
    hardenedBlueprint: {
      title: "Two-Tier TVS Clamping + Low-ESR Polymer Array + 60V Monolithic Buck",
      sub: "Littelfuse SMBJ28A TVS + Panasonic OS-CON array + TI TPS54302 (60V rated) with dedicated RF LDO for the IMU.",
      metrics: [
        { label: "Voltage Rating", value: "60V Input", positive: true },
        { label: "Clamping Speed", value: "< 1 ns Response", positive: true },
        { label: "Capacitor ESR", value: "< 10 mΩ", positive: true },
        { label: "Gyro PSRR", value: "> 72 dB @ 100kHz", positive: true },
      ],
      topology: "Bidirectional TVS energy clamper + Low-ESR solid polymer array + Ultra-low-noise two-stage regulator.",
      silicon: [
        { role: "TVS Clamping Diode", part: "Littelfuse SMBJ28A", spec: "600W peak pulse power, 45.4V clamping @ 13.2A" },
        { role: "Decoupling Array", part: "Panasonic OS-CON 35SEPF470M", spec: "470 µF, 35V, ESR <= 10 mΩ @ 100 kHz" },
        { role: "Primary Buck", part: "TI TPS54302", spec: "60V input, 3A output, pulse-skipping under surge" },
        { role: "Ultra-Low-Noise LDO", part: "TI TPS7A4700", spec: "4 µVrms noise, 72 dB PSRR dedicated to IMU" },
      ],
      physicsMath: "I_{spike} = \\frac{600\\text{W}}{45.4\\text{V}} = 13.2\\text{A clamped in } < 1\\text{ns}; \\quad V_{ripple} < 12\\text{mV}",
      firmwareFailsafe:
        "Separate Star-Ground topology (dirty motor GND isolated from clean digital GND with single 0Ω bridge). SPI DMA bus protected with 16-bit hardware CRC checks; auto-switch to redundant secondary IMU in < 1.2 ms on parity error.",
      implementationSteps: [
        "Place SMBJ28A TVS within 8 mm of XT60 solder pads.",
        "Route motor return paths through bottom 2-oz copper polygon isolated from flight controller.",
        "Power ICM-42688-P IMU from dedicated TPS7A4700 LDO with 4.7 µF X7R ceramic output cap.",
        "Implement DMA-driven DShot600 packet streaming with hardware timer output.",
      ],
    },
  },

  // 3. Agricultural Greenhouse
  {
    id: "greenhouse_node",
    title: "3. Autonomous Agricultural Greenhouse Telemetry Node",
    category: "Agri-Tech & Low-Power Embedded",
    concept:
      "Solar-powered environmental node measuring volumetric soil moisture, ambient humidity, temperature, and CO2, transmitting telemetry via LoRaWAN every 2 minutes.",
    stages: [
      { step: "01", name: "Energy Harvesting", desc: "50mW solar cell + BQ25504 nanopower boost charger", status: "nominal", statusText: "Operational" },
      { step: "02", name: "Power Gating & Bias", desc: "P-channel MOSFET high-side rail gating with zero DC bias", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "Low-Power Core", desc: "STM32WLE5CC running FreeRTOS with 1.1 µA deep-sleep current", status: "nominal", statusText: "Operational" },
      { step: "04", name: "Sensors & Sampling", desc: "Capacitive 2MHz moisture probe + SHT40 pulsed humidity sensor", status: "nominal", statusText: "Operational" },
      { step: "05", name: "LoRaWAN Uplink", desc: "SX1262 transceiver (+14 dBm burst for 40 ms) to gateway", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Continuous Sensor Bias & Electrolysis",
      title: "DC bias dissolves copper electrodes in 14 days and drains batteries",
      mechanism:
        "Continuous 3.3V bias applied to soil electrodes triggers rapid galvanic electrolysis (Cu -> Cu2+ + 2e-), dissolving metal probes in 2 weeks. Leaving SHT3x sensors continuously powered burns 800 µW, heating the enclosure by +1.8°C and corrupting humidity readings by -11.5% RH. Dev board USB chips burn 15mA sleep current, draining the battery in 5 days.",
      risks: [
        "Galvanic copper migration destroys moisture probe conductivity within two weeks.",
        "Sensor self-heating distorts microclimate relative humidity readings by > 10%.",
        "Parasitic sleep current drains 18650 cell in under one week instead of 10+ years.",
      ],
      mathFormula: "I_{avg} = \\frac{(32\\text{mA} \\times 0.040\\text{s}) + (1.5\\mu\\text{A} \\times 120\\text{s})}{120.040\\text{s}} = 12.1\\mu\\text{A}",
    },
    contradiction: {
      myth: "I put delay(60000) in Arduino and used cheap resistive prong sensors from an electronics kit.",
      brutalTruth:
        "delay() keeps the MCU clock burning 45 mA. Resistive copper probes dissolve into soil ions within 14 days. Your irrigation decisions will be based on phantom data from open circuits.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: GPIO Analog Pulse Read",
            "exactDefinition": "Power analog soil probes only when reading by toggling an MCU GPIO pin HIGH for 50 ms.",
            "summary": "Cuts probe corrosion by 95% compared to continuous DC power using simple code changes.",
            "tradeOff": "GPIO pin current limit (20 mA) restricts multi-sensor excitation."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: P-FET Power Gating + 2MHz Capacitive Sensing (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Disconnect all analog sensor rails via low-leakage P-channel MOSFET and excite capacitive moisture probes at 2 MHz.",
            "summary": "Diodes AP22802 high-side switch + STM32WLE5CC running 1.1\u00b5A deep sleep, extending 2600mAh battery life to 24.5 years.",
            "tradeOff": "Requires conformal coating on capacitive probe tines."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Sub-GHz Wireless Soil Micro-Probe Array",
            "exactDefinition": "Deploy distributed wireless sealed sensor pellets communicating via sub-surface NFC/BLE to central mast.",
            "summary": "Zero exposed cables in greenhouse soil; multi-depth root zone profiling.",
            "tradeOff": "Higher deployment complexity and battery maintenance per pellet."
      }
],
    hardenedBlueprint: {
      title: "P-FET High-Side Power Gating + 2MHz Capacitive Sensing + 1.1µA Sleep",
      sub: "Diodes Inc. AP22802 power gate disconnecting all sensor rails between 15ms sample bursts; single 2600mAh cell lasts 24.5 years.",
      metrics: [
        { label: "Sleep Current", value: "1.1 µA", positive: true },
        { label: "Active Window", value: "40 ms Burst", positive: true },
        { label: "Electrode Life", value: "10+ Years (No DC)", positive: true },
        { label: "Battery Runtime", value: "24.5 Years", positive: true },
      ],
      topology: "Zero-bias High-Frequency Capacitive Sensing + P-Channel Power Gating + Deep Sleep with Low-Power Timer.",
      silicon: [
        { role: "Integrated MCU+LoRa", part: "STM32WLE5CC", spec: "Cortex-M4 + Semtech SX1262, 1.1 µA deep sleep" },
        { role: "High-Side Power Switch", part: "Diodes AP22802 / DMG2305UX", spec: "P-channel MOSFET with < 10 nA leakage" },
        { role: "Moisture Sensing", part: "2 MHz Capacitive Resonator", spec: "Polyimide coated, zero exposed copper in soil" },
        { role: "Ambient Sensor", part: "Sensirion SHT40", spec: "Pulsed measurement, ±1.5% RH accuracy, 0.4 µA avg" },
      ],
      physicsMath: "T_{life} = \\frac{2600\\text{mAh}}{0.0121\\text{mA} \\times 8760\\text{h/yr}} = 24.5\\text{ Years}",
      firmwareFailsafe:
        "Watchdog timer clocked from low-power internal 32 kHz oscillator. Power switch turned ON only for 15 ms to charge sensors, take reading via ADC DMA, and shut down before thermal drift occurs.",
      implementationSteps: [
        "Conformally coat soil PCB with polyurethane lacquer up to the capacitive sensing tines.",
        "Insert AP22802 high-side switch controlling 3.3V power to all analog sensor nodes.",
        "Configure STM32WLE5 Standby mode with RTC alarm wakeup every 120 seconds.",
        "Transmit LoRaWAN packets using SF8 spread spectrum for rapid 40 ms on-air time.",
      ],
    },
  },

  // 4. EV BMS
  {
    id: "ev_bms",
    title: "4. Electric Vehicle (EV) Battery Management System (BMS)",
    category: "Automotive & High-Voltage Systems",
    concept:
      "16S LiFePO4 battery pack (58.4V max) with synchronous cell voltage acquisition, active charge shuttling balancing, and isolated CAN bus vehicle telemetry.",
    stages: [
      { step: "01", name: "16S Cell Stack", desc: "16S LiFePO4 pack (51.2V nominal, 100Ah capacity)", status: "nominal", statusText: "Operational" },
      { step: "02", name: "Active Balancing", desc: "Bi-directional inductive flyback charge shuttling (5A rate)", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "Isolated AFE", desc: "TI BQ76952 with 16-bit Delta-Sigma ADCs (±1 mV accuracy)", status: "nominal", statusText: "Operational" },
      { step: "04", name: "Safety Interlock", desc: "Pre-charge circuit + IXYS solid-state contactor driver", status: "nominal", statusText: "Operational" },
      { step: "05", name: "Vehicle CAN Bus", desc: "Silicon Labs Si8641 isolated CAN transceiver at 500 kbps", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Passive Bleed Resistor Balancing",
      title: "Resistive bleed traps 3.6W heat inside sealed IP67 battery enclosure",
      mechanism:
        "Passive balancing uses 39Ω bleed resistors to dissipate excess cell charge. Balancing 8 cells generates 3.6W of continuous heat trapped inside a sealed IP67 battery box. Local PCB temperatures surge above 85°C, drifting thermistors by +8°C and triggering false thermal shutdowns. Bleeding 100mA takes 35+ hours to correct a minor 3.5Ah imbalance.",
      risks: [
        "Trapped 3.6W heat accelerates lithium cell degradation and triggers false overtemp trips.",
        "Passive bleed burns valuable battery energy instead of redistributing it.",
        "100mA bleed current is too slow to balance high-capacity automotive cells.",
      ],
      mathFormula: "P_{passive} = 8 \\times \\frac{(4.2\\text{V})^2}{39\\Omega} = 3.62\\text{W trapped heat; } \\quad \\eta_{active} = 92\\%",
    },
    contradiction: {
      myth: "Passive bleed balancing is fine because the battery charger only runs for a few hours and resistors are cheap.",
      brutalTruth:
        "Passive balancing turns your safety system into an internal battery heater. When a cell has high internal resistance, heating it up accelerates thermal runaway. Bleeding energy away permanently sacrifices vehicle range.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: Thermally Managed Passive Bleed Array",
            "exactDefinition": "Increase bleed resistor surface area and couple them directly to an external aluminum enclosure heatsink.",
            "summary": "Safely dissipates 3.6W heat outside the IP67 battery compartment using thermal gap pads.",
            "tradeOff": "Still wastes battery energy as pure heat; slow 100mA balancing rate."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Active Inductive Charge Shuttling (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Shuttle charge bidirectionally from high cells back to the entire pack rail via flyback transformers at 5A.",
            "summary": "Analog Devices LTC3300-1 balancing engine delivering 92% efficiency with zero trapped enclosure heat.",
            "tradeOff": "Requires planar flyback transformers for each adjacent cell pair."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Modular Smart Cell Switched Battery Architecture",
            "exactDefinition": "Equip every individual cell with an integrated micro-MOSFET bypass H-bridge for dynamic software pack reconfigurability.",
            "summary": "Software isolates weak or dead cells mid-drive without stopping the vehicle; native synthesized AC inverter output.",
            "tradeOff": "High transistor count and complex high-frequency switching firmware."
      }
],
    hardenedBlueprint: {
      title: "Active Inductive Charge Shuttling (LTC3300-1) + 5kV Galvanic Isolation",
      sub: "Analog Devices LTC3300-1 transferring charge from high cells back to the pack at up to 5A with 92% efficiency; zero trapped heat.",
      metrics: [
        { label: "Balancing Rate", value: "5.0A Active", positive: true },
        { label: "Heat Reduction", value: "-91% Less Heat", positive: true },
        { label: "Balance Time", value: "< 45 Minutes", positive: true },
        { label: "Galvanic Isolation", value: "5 kVrms", positive: true },
      ],
      topology: "Active Switched-Capacitor / Bi-directional Inductive Charge Shuttling with Galvanically Isolated Analog Front End.",
      silicon: [
        { role: "Analog Front End", part: "TI BQ76952", spec: "16S high-accuracy AFE, synchronous Delta-Sigma ADCs" },
        { role: "Active Balancer", part: "Analog Devices LTC3300-1", spec: "Bidirectional flyback balancing controller up to 5A" },
        { role: "Digital Isolator", part: "Silicon Labs Si8641ED", spec: "5 kVrms reinforced isolation for SPI/CAN bus" },
        { role: "Pre-Charge Switch", part: "IXYS IXTN600N04T2", spec: "Solid-state FET with PTC inrush protection" },
      ],
      physicsMath: "I_{bal} = 5\\text{A}, \\quad P_{loss} = 5\\text{A} \\times 3.3\\text{V} \\times (1 - 0.92) = 1.32\\text{W (Distributed)}",
      firmwareFailsafe:
        "Dynamic OCV-SOC look-up table with temperature compensation. Active balancing only operates during low-current rest intervals (Ipack < 500 mA) to prevent false IR voltage drop errors.",
      implementationSteps: [
        "Mount Wurth flyback planar transformers with primary side coupled to adjacent cell pairs.",
        "Interface LTC3300-1 via isolated SPI with parity-checked command packets.",
        "Program pre-charge routine with 500ms delay to verify bus capacitance voltage >= 95% before closing main contactor.",
        "Implement redundant thermistor array with NTCs adhered directly to cell terminals.",
      ],
    },
  },

  // 5. Wearable Vital Signs
  {
    id: "wearable_health",
    title: "5. Wearable Health Vital Signs Monitor (PPG & ECG)",
    category: "Biomedical & Wearable Sensors",
    concept:
      "Clinical-grade wearable chest strap measuring continuous 1-lead ECG and multi-wavelength optical PPG, streaming heart rate variability and SpO2 via BLE 5.2.",
    stages: [
      { step: "01", name: "Dry Skin Contact", desc: "Ag/AgCl dry electrodes + optical pulse sensor bed", status: "nominal", statusText: "Operational" },
      { step: "02", name: "RLD & Analog Front End", desc: "Right Leg Drive common-mode cancellation + optical TIA", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "24-Bit Delta-Sigma ADC", desc: "TI ADS1292R high-dynamic-range converter sampling at 500SPS", status: "nominal", statusText: "Operational" },
      { step: "04", name: "Cortex-M33 DSP", desc: "Nordic nRF5340 dual-core executing Pan-Tompkins QRS detection", status: "nominal", statusText: "Operational" },
      { step: "05", name: "BLE 5.2 Telemetry", desc: "Encrypted Bluetooth LE Health Device Profile to mobile app", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Half-Cell Electrode Potential & Ambient Saturation",
      title: "±300mV DC skin contact potential clips high-gain instrumentation amps",
      mechanism:
        "Dry ECG electrodes create a half-cell contact potential of up to ±300mV DC. A standard 1000x gain amplifier multiplies this offset to ±300V, hitting the 3.3V power rails immediately. The op-amp clips into rail saturation; walking motion modulates electrode pressure, causing severe baseline wander and flatlining the ECG. Sunlight leakage (100k lux) also saturates optical TIAs.",
      risks: [
        "DC half-cell potential forces analog front end into permanent rail saturation.",
        "Ambient optical sunlight drowns out 0.1% pulsatile PPG modulation.",
        "Movement baseline wander destroys QRS detection and heart rate accuracy.",
      ],
      mathFormula: "V_{out} = G \\cdot (V_{dc\\_offset} + V_{ecg}) = 1000 \\times (0.300\\text{V} + 0.001\\text{V}) = 301\\text{V} \\implies \\text{CLIPPED}",
    },
    contradiction: {
      myth: "I'll just amplify everything with an AD620 or LM358 and remove the DC drift and 50Hz hum with a Butterworth filter in software.",
      brutalTruth:
        "Once an operational amplifier clips into the supply rail, all AC biological information is permanently destroyed. Mathematical filters cannot extract data from a flatline.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: AC-Coupled Low-Gain Differential Stage",
            "exactDefinition": "Place series DC-blocking capacitors before an instrumentation amplifier with gain limited to 50\u00d7.",
            "summary": "Blocks \u00b1300mV DC contact potential before amplification to prevent rail saturation.",
            "tradeOff": "Low gain demands higher resolution digitizer; long recovery time after electrode detachment."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Right Leg Drive (RLD) Active Feedback + Optical Cancellation (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Neutralize common-mode hum via active inverted body feedback and subtract ambient photodiode current via DAC.",
            "summary": "TI ADS1292R (24-bit, >110dB CMRR) paired with MAX86176 optical ambient subtraction DAC.",
            "tradeOff": "Requires a third body contact electrode for the RLD circuit."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Textile Capacitive Non-Contact Biopotential Array",
            "exactDefinition": "Embed non-contact capacitive conductive textile electrodes into apparel with integrated ultra-high input impedance buffers.",
            "summary": "Zero skin irritation or gel required; continuous medical telemetry through ordinary fabric.",
            "tradeOff": "Highly sensitive to electrostatic friction artifacts during fast movement."
      }
],
    hardenedBlueprint: {
      title: "Right Leg Drive (RLD) Active Cancellation + Ambient Optical Subtraction",
      sub: "TI ADS1292R medical AFE with active RLD feedback providing > 110 dB CMRR, paired with MAX86176 optical ambient light cancellation DAC.",
      metrics: [
        { label: "CMRR @ 50Hz", value: "> 110 dB", positive: true },
        { label: "Dynamic Range", value: "24-Bit Delta-Sigma", positive: true },
        { label: "Ambient Cancel", value: "200 µA Sunlight", positive: true },
        { label: "Current Draw", value: "< 450 µA Total", positive: true },
      ],
      topology: "Right Leg Drive Active Common-Mode Cancellation + AC-Coupled Low-Gain Differential Stage + High-Dynamic-Range 24-bit ADC.",
      silicon: [
        { role: "ECG Front End", part: "TI ADS1292R", spec: "2-channel 24-bit medical AFE with integrated Right Leg Drive" },
        { role: "Optical PPG AFE", part: "Analog Devices MAX86176", spec: "Dual-channel optical TIA with 200 µA ambient light subtraction" },
        { role: "Wireless DSP Core", part: "Nordic nRF5340", spec: "Dual Cortex-M33 running DSP QRS filtering and BLE 5.2" },
        { role: "Protection Array", part: "Semtech RCLAMP0524P", spec: "Low-capacitance ESD protection array for body leads" },
      ],
      physicsMath: "\\text{CMRR} = 20 \\log_{10} \\left(\\frac{A_d}{A_{cm}}\\right) > 110\\text{ dB}; \\quad f_c = 0.67\\text{ Hz High-Pass Filter}",
      firmwareFailsafe:
        "Real-time bidirectional IIR zero-phase filter (fc = 0.67 Hz) removes baseline wander. Electrode contact impedance evaluated continuously at 16 Hz via sub-microamp out-of-band AC current injection; flags 'Leads Off' when Z > 500 kΩ.",
      implementationSteps: [
        "Connect third electrode to ADS1292R RLD inverted output to actively neutralize 50/60 Hz mains hum.",
        "Couple dry electrodes through 10 nF 50V C0G ceramic capacitors to block DC half-cell offset.",
        "Configure MAX86176 optical DAC to dynamically subtract ambient DC photodiode current.",
        "Execute Pan-Tompkins QRS detection algorithm on nRF5340 dedicated application core.",
      ],
    },
  },

  // 6. Substation Transient Detector
  {
    id: "substation_detector",
    title: "6. Substation Power Line Fault Transient Detector",
    category: "High-Voltage Grid & Power Transmission",
    concept:
      "High-speed traveling-wave fault location monitor clamped on 33kV distribution lines, resolving transient surges within 150m accuracy via GPS timestamps.",
    stages: [
      { step: "01", name: "33kV Line Clamp", desc: "Non-saturating Rogowski coil around high-voltage phase bus", status: "nominal", statusText: "Operational" },
      { step: "02", name: "3-Tier Surge Clamping", desc: "Gas discharge tube + surge resistor + TVS clamping network", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "High-CMTI Isolation", desc: "Broadcom ACPL-C799 optically isolated modulator (50 kV/µs CMTI)", status: "nominal", statusText: "Operational" },
      { step: "04", name: "100MSPS ADC & FPGA", desc: "Xilinx Artix-7 FPGA processing traveling wave time-of-flight", status: "nominal", statusText: "Operational" },
      { step: "05", name: "IEC 61850 SCADA", desc: "Fiber-optic Ethernet link to substation automation gateway", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: High-Voltage Surge & Ground Displacement Current",
      title: "25 kV/µs transient surges inject 250mA ground current, vaporizing MCUs",
      mechanism:
        "Lightning strikes and vacuum circuit breaker switching operations generate transient surges with dv/dt > 25 kV/µs. Coupling through stray capacitance (Cstray = 10 pF) injects 250mA displacement current directly into low-voltage instrumentation ground. Standard MCU internal clamping diodes rated for 2-5 mA vaporize immediately, destroying the processor.",
      risks: [
        "High dv/dt injects 250mA displacement current, vaporizing MCU analog pins.",
        "Surface flashover across standard 0805 SMD resistors sparks high-voltage arcing.",
        "Common-mode transient breakdown corrupts fault timestamps and blinds grid protection.",
      ],
      mathFormula: "I_{disp} = C_{stray} \\cdot \\frac{dv}{dt} = 10\\text{pF} \\times \\frac{25\\text{kV}}{1\\mu\\text{s}} = 250\\text{mA (100x diode rating)}",
    },
    contradiction: {
      myth: "I put a standard 100:1 resistor divider with a 1N4148 diode on the analog pin; that will protect the MCU.",
      brutalTruth:
        "A 1 kV surge across an 0805 resistor will jump straight across the pads through an air arc (flashover voltage is only 300V). The 1N4148 diode explodes under 250mA surge, followed instantly by your microcontroller.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: Heavy-Duty Metal Oxide Varistor (MOV) Clamping",
            "exactDefinition": "Shunt high-voltage lightning surges to earth ground using high-energy zinc oxide varistors.",
            "summary": "Clamps high-voltage spikes to safe levels; inexpensive standard surge protection.",
            "tradeOff": "MOVs degrade with each strike and have high internal capacitance (smears fast traveling waves)."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Rogowski Transducer + GDT/TVS Network + 50kV/\u00b5s Optical Modulator (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Sense current with non-saturating air-core Rogowski coil and transmit data across fiber optics with 50kV/\u00b5s CMTI isolation.",
            "summary": "Bourns GDT + Ohmite non-inductive wirewound + Broadcom ACPL-C799 resolving fault location to \u00b1150m.",
            "tradeOff": "Requires high-stability GPS time-stamping receiver (1 PPS)."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Distributed Optical Fiber Acoustic & Polarimetric Sensor",
            "exactDefinition": "Utilize existing optical ground wire (OPGW) fibers as continuous distributed interferometric fault sensors.",
            "summary": "Zero electronic sensors along transmission towers; detects flashovers anywhere along 100 km line.",
            "tradeOff": "Requires expensive substation optical time-domain reflectometer (OTDR) interrogator ($40k+)."
      }
],
    hardenedBlueprint: {
      title: "Galvanic Rogowski Sensor + Bourns GDT + Broadcom 50kV/µs CMTI Isolation",
      sub: "Non-saturating air-core Rogowski coil coupled to a 3-tier GDT/TVS network and ACPL-C799 optically isolated modulator.",
      metrics: [
        { label: "CMTI Withstand", value: "50 kV/µs", positive: true },
        { label: "Surge Current", value: "10 kA Rating", positive: true },
        { label: "Location Accuracy", value: "±150 Meters", positive: true },
        { label: "Sample Rate", value: "100 MSPS", positive: true },
      ],
      topology: "Non-Saturating Rogowski Transducer + 3-Stage Coordinated Energy Dissipation + Isolated Differential Fiber-Optic Acquisition.",
      silicon: [
        { role: "Primary Surge GDT", part: "Bourns 2036-75-SM", spec: "75V sparkover, 10 kA 8/20µs surge capability" },
        { role: "Surge Resistor", part: "Ohmite SPH 22Ω 5W", spec: "Non-inductive wirewound rated for 5 kV dielectric withstand" },
        { role: "Fast Clamping TVS", part: "Littelfuse SAC5.0", spec: "Low-capacitance (5 pF) 500W transient suppressor" },
        { role: "Isolated Modulator", part: "Broadcom ACPL-C799", spec: "50 kV/µs CMTI, 5000 Vrms reinforced isolation" },
      ],
      physicsMath: "\\Delta x = \\frac{c \\cdot (t_2 - t_1)}{2} = \\frac{3 \\times 10^8\\text{ m/s} \\times 1\\mu\\text{s}}{2} = 150\\text{ meters resolution}",
      firmwareFailsafe:
        "GPS receiver provides 1 PPS pulse with < 20 ns jitter. Xilinx Artix-7 FPGA logs traveling-wave wavefront arrivals using circular BRAM buffers, transmitting IEC 61850-9-2 sampled values over fiber optics.",
      implementationSteps: [
        "Encase Rogowski coil in grounded aluminum electrostatic Faraday shield.",
        "Maintain 8 mm creepage distance on PCB between surge components and digital ground.",
        "Drive ACPL-C799 isolated power from a high-isolation DC-DC converter (Murata NXJ2).",
        "Implement traveling-wave wavelet transform algorithm in FPGA DSP slices.",
      ],
    },
  },

  // 7. Forest Fire LoRa
  {
    id: "forest_fire_lora",
    title: "7. LoRa-Based Forest Fire Remote Warning Network",
    category: "Environmental Monitoring & IoT",
    concept:
      "Solar-powered wilderness mesh node combining pulsed MEMS gas detection, passive thermal thermopile infrared monitoring, and long-range LoRa reporting.",
    stages: [
      { step: "01", name: "Ambient Solar Harvesting", desc: "100mW mono solar panel with fractional MPPT boost", status: "nominal", statusText: "Operational" },
      { step: "02", name: "Cold-Climate Storage", desc: "Lithium Titanate (LTO) battery pack operable down to -40°C", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "Low-Power Mesh Core", desc: "Nordic nRF52840 running 6LoWPAN / LoRa mesh firmware", status: "nominal", statusText: "Operational" },
      { step: "04", name: "Pulsed MEMS & FIR", desc: "Sensirion SGP40 pulsed gas sensor + MLX90614 thermopile", status: "nominal", statusText: "Operational" },
      { step: "05", name: "LoRa Mesh Uplink", desc: "Semtech SX1262 LoRa module (+22 dBm) with 15km line-of-sight", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Continuous Sensor Heating & Winter Battery Freezing",
      title: "Heater burns 800mW (dead in 18 hrs) and Li-ion freezes at sub-zero temps",
      mechanism:
        "Traditional metal-oxide gas sensors (MQ-2) use internal heaters burning 150-800 mW continuously, draining an 18650 cell in 18 hours. Standard lithium-ion batteries cannot be charged below 0°C without lithium plating, internal shorts, and permanent destruction. Supercapacitors have high leakage (> 50 µA) that exceeds solar harvest under winter canopy.",
      risks: [
        "MQ-2 continuous heater drains battery within 18 hours.",
        "Charging standard Li-ion in winter freezes electrolyte and causes thermal dendrites.",
        "Supercapacitor leakage exceeds harvested power under overcast forest canopy.",
      ],
      mathFormula: "P_{heater} = 0.8\\text{W} \\implies T_{run} = \\frac{9.2\\text{Wh}}{0.8\\text{W}} = 11.5\\text{ Hours (Dead before midnight)}",
    },
    contradiction: {
      myth: "I’ll use an MQ-2 smoke sensor on a 5V boost converter connected to a cheap solar panel; when smoke appears, it triggers an interrupt.",
      brutalTruth:
        "The MQ-2 heater will drain the battery before sundown on day one. In winter at -10°C, the battery freezes, solar output collapses under canopy snow, and your network goes blind before fire season starts.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: Duty-Cycled Metal-Oxide Sensor Heating",
            "exactDefinition": "Power on standard gas sensor heaters for 30 seconds every 15 minutes instead of continuous operation.",
            "summary": "Cuts average power from 800 mW to 26 mW; extends battery life from 18 hours to 2 weeks.",
            "tradeOff": "Long pre-heat warmup required before readings stabilize; still freezes in sub-zero winter."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Cold-Climate LTO Battery (-40\u00b0C) + Pulsed MEMS + Optical FIR (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Store energy in non-freezing Lithium Titanate cells and detect fires through 35ms pulsed MEMS and passive infrared thermopiles.",
            "summary": "TI BQ25570 MPPT + Nichicon LTO + Sensirion SGP40 (120\u00b5W avg), operating reliably from -40\u00b0C to +60\u00b0C.",
            "tradeOff": "LTO has lower energy density than traditional Li-ion (needs slightly larger physical cell)."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Satellite IoT Direct-to-Cell Wilderness Mesh",
            "exactDefinition": "Equip nodes with direct satellite uplinks (Iridium / Astrocast) and thermal imaging camera cores.",
            "summary": "Eliminates ground gateway requirements in remote mountain valleys; transmits instant fire infrared maps.",
            "tradeOff": "Higher monthly satellite airtime data subscription costs."
      }
],
    hardenedBlueprint: {
      title: "TI BQ25570 MPPT + Nichicon LTO (-40°C) + Pulsed Sensirion SGP40",
      sub: "Cold-climate Lithium Titanate battery surviving -40°C to +60°C with 25,000 cycles, paired with pulsed 35ms MEMS gas sensing.",
      metrics: [
        { label: "Operating Temp", value: "-40°C to +60°C", positive: true },
        { label: "Sensor Power", value: "120 µW (Pulsed)", positive: true },
        { label: "Cycle Life", value: "> 25,000 Cycles", positive: true },
        { label: "Link Budget", value: "168 dB LoRa", positive: true },
      ],
      topology: "Nanopower Solar MPPT Harvesting + Sub-Zero Lithium Titanate (LTO) Energy Storage + Pulsed MEMS Sensing + Passive Optical FIR.",
      silicon: [
        { role: "Solar MPPT Harvester", part: "TI BQ25570", spec: "Nanopower boost charger operating from 100 mV input, Iq < 488 nA" },
        { role: "Cold-Climate Cell", part: "Nichicon SLB12400L151", spec: "Lithium Titanate Oxide (LTO), -40°C to +60°C, zero fire hazard" },
        { role: "Pulsed Gas Sensor", part: "Sensirion SGP40", spec: "35 ms pulsed micro-hotplate, reduces power 250 mW -> 120 µW" },
        { role: "Passive Thermopile", part: "Melexis MLX90614ESF-DCI", spec: "5° narrow FOV optical canopy scan with zero heater power" },
      ],
      physicsMath: "P_{avg} = (120\\mu\\text{W}_{gas}) + (18\\mu\\text{W}_{FIR}) + (35\\mu\\text{W}_{LoRa}) = 173\\mu\\text{W total load}",
      firmwareFailsafe:
        "Node monitors VOC index slope (d(VOC)/dt) combined with thermopile infrared temperature gradient. If both spike simultaneously, node wakes up immediately to broadcast emergency SF12 SOS beacon across the mesh.",
      implementationSteps: [
        "Package electronics in IP67 breathable Gore-Tex vented enclosure to prevent internal condensation.",
        "Mount Nichicon LTO cell with thermal coupling to enclosure base.",
        "Program SGP40 pulsed read cycle: heater pulse for 35 ms, capture reading, turn off.",
        "Calibrate Melexis infrared thermopile emissivity for pine and eucalyptus forest canopy.",
      ],
    },
  },

  // 8. BLDC Motor ESC FOC
  {
    id: "bldc_foc_esc",
    title: "8. High-Speed BLDC Motor ESC with Field-Oriented Control (FOC)",
    category: "Power Electronics & Motor Drives",
    concept:
      "48V 1kW motor electronic speed controller executing Space Vector PWM and sensorless Field-Oriented Control at 30 kHz on an STM32G4 microcontroller.",
    stages: [
      { step: "01", name: "48V DC Link Bus", desc: "Low-ESR capacitor bank decoupling 20A motor phase currents", status: "nominal", statusText: "Operational" },
      { step: "02", name: "Gate Drive & Dead-Time", desc: "TI DRV8353R smart 3-phase gate driver with hardware dead-time", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "Half-Bridge Inverter", desc: "6x Infineon 60V 120A MOSFETs with RC snubbers", status: "nominal", statusText: "Operational" },
      { step: "04", name: "In-Line Phase Shunts", desc: "TI INA240 high-CMRR current sense amplifiers on phases U and V", status: "nominal", statusText: "Operational" },
      { step: "05", name: "STM32G4 FOC Core", desc: "Hardware Cordic executing Park/Clarke transforms in 4.2 µs", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Miller Cross-Conduction & Switch Node Ringing",
      title: "Miller-effect dv/dt shoot-through shorts 48V rail, exploding MOSFETs",
      mechanism:
        "High-speed switching (di/dt > 2A/ns) across parasitic PCB inductance (8 nH) generates 16V spikes on top of the 48V rail (64V total). High dv/dt coupled through the high-side MOSFET drain-to-gate capacitance (Cgd) injects current into the low-side gate. If pull-down impedance is inadequate, the low-side gate surges above threshold (2.5V) while the high-side is ON. Both FETs conduct simultaneously across 48V (Shoot-Through), dumping > 300A in 200 ns and exploding the packages.",
      risks: [
        "Miller effect triggers cross-conduction shoot-through across the 48V supply.",
        "Switch-node voltage ringing punctures 60V MOSFET drain-to-source breakdown.",
        "Software timer dead-time jitter causes phase distortion and violent motor cogging.",
      ],
      mathFormula: "I_{Miller} = C_{gd} \\cdot \\frac{dv}{dt}; \\quad V_{spike} = L_{trace} \\cdot \\frac{di}{dt} = 8\\text{nH} \\times 2\\text{A/ns} = 16\\text{V}",
    },
    contradiction: {
      myth: "I wrote software timers in Arduino to flip the high-side and low-side pins, and put a single current resistor on DC ground return.",
      brutalTruth:
        "Software routines have microsecond jitter; dead-time must be deterministic down to 30 ns. Low-side single-shunt sensing cannot measure phase currents during zero-voltage SVPWM vectors, causing loss of FOC observer lock and motor stall.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: Ferrite Bead & High Gate Resistance Snubbing",
            "exactDefinition": "Slow down MOSFET switching edges by increasing series gate resistors (Rg = 22\u03a9) and adding ferrite beads.",
            "summary": "Suppresses high dv/dt ringing and prevents Miller shoot-through without changing gate driver silicon.",
            "tradeOff": "Slower transitions increase MOSFET switching heat dissipation by 45%."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: Dedicated 3-Phase Gate Driver with Hardware Dead-Time & In-Line Shunts (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Enforce fixed hardware dead-time (50ns) with 1A active pull-down gate drive and in-line current sense amplifiers.",
            "summary": "TI DRV8353R driver + Infineon 1.4m\u03a9 FETs + TI INA240A1 in-line current amplifiers.",
            "tradeOff": "Requires precise Kelvin sense routing on 4-layer PCB."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Integrated Gallium Nitride (GaN) Power Stage with Embedded Core",
            "exactDefinition": "Replace silicon MOSFETs with monolithic GaN power stages operating at 100 kHz with zero reverse recovery.",
            "summary": "Eliminates switching losses almost entirely; reduces ESC volume by 70% with smooth high-speed motor control.",
            "tradeOff": "Extremely sensitive to parasitic loop inductance; requires advanced micro-strip layout."
      }
],
    hardenedBlueprint: {
      title: "TI DRV8353R Smart Gate Driver + Infineon 1.4mΩ FETs + In-Line INA240",
      sub: "Hardware dead-time insertion (50ns) with programmable 1A pull-down gate drive and RC snubbers, eliminating Miller shoot-through.",
      metrics: [
        { label: "Peak Current", value: "120A Rated", positive: true },
        { label: "MOSFET RDS(on)", value: "1.4 mΩ Ultra-Low", positive: true },
        { label: "Hardware Dead-Time", value: "50 ns Fixed", positive: true },
        { label: "FOC Loop Latency", value: "< 4.2 µs", positive: true },
      ],
      topology: "Dedicated 3-Phase Smart Gate Driver with Hardware Dead-Time Insertion + Symmetrical PowerStage Layout with RC Snubbers.",
      silicon: [
        { role: "Smart 3-Phase Driver", part: "TI DRV8353R", spec: "100V gate driver, 1A programmable drive, integrated dead-time engine" },
        { role: "Inverter MOSFETs", part: "Infineon IAUC120N04S6L014", spec: "60V, 120A, RDS(on) = 1.4 mΩ, package inductance < 1 nH" },
        { role: "In-Line Current Amp", part: "TI INA240A1", spec: "Enhanced PWM rejection, CMRR > 120 dB @ 50 kHz" },
        { role: "FOC Microcontroller", part: "STM32G474VE", spec: "Cortex-M4 + Hardware Cordic, 184 ps resolution timers" },
      ],
      physicsMath: "P_{cond} = 3 \\cdot I_{rms}^2 \\cdot R_{DS(on)} = 3 \\times (20\\text{A})^2 \\times 0.0014\\Omega = 1.68\\text{W total conduction loss}",
      firmwareFailsafe:
        "DRV8353R hardware VDS overcurrent comparator shuts off all gate drives in < 200 ns upon short circuit. STM32G4 Break Input pin (BRK) directly trips HRTIM outputs independently of software execution.",
      implementationSteps: [
        "Place 1.0Ω + 2.2nF ceramic RC snubbers directly across high/low MOSFET drain-source pads.",
        "Route gate drive Kelvin connections with twisted trace pairs directly to MOSFET gates.",
        "Sample phase currents at the exact midpoint of low-side PWM cycles using timer ADC trigger.",
        "Execute Clarke/Park transforms using STM32G4 hardware Cordic coprocessor.",
      ],
    },
  },

  // 9. Pipeline Ultrasonic Probe
  {
    id: "pipeline_ultrasonic",
    title: "9. Automated Pipeline Ultrasonic Corrosion Thickness Probe",
    category: "Industrial Automation & Nondestructive Testing",
    concept:
      "High-frequency pulse-echo ultrasonic thickness measurement gauge clamped on oil/gas pipelines, resolving inner wall pitting to within ±5 µm.",
    stages: [
      { step: "01", name: "HV Negative Pulser", desc: "Microchip MD1210 + TC6320 firing -150V impulse into piezo", status: "nominal", statusText: "Operational" },
      { step: "02", name: "T/R Isolation Switch", desc: "Microchip MD0100 bidirectional depletion switch (20 ns turn-off)", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "TGC Analog Amplifier", desc: "Analog Devices AD8331 low-noise variable gain amplifier", status: "nominal", statusText: "Operational" },
      { step: "04", name: "65MSPS 12-Bit ADC", desc: "Analog Devices AD9228 digitizing RF ultrasonic echo envelope", status: "nominal", statusText: "Operational" },
      { step: "05", name: "Thickness Algorithm", desc: "Hilbert transform cross-correlation computing wall thickness", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Transmit/Receive Blinding & Dead-Zone Saturation",
      title: "-150V pulse blinds receiver for 5 µs, creating a 15mm dead-zone",
      mechanism:
        "Firing a 10MHz piezo crystal requires a -150V pulse. The reflected echo off a corroded inner pipe wall is tiny (50 µV to 2 mV). Because transmitter and receiver share one crystal, the -150V pulse leaks into the receiver amplifier (G=60dB), driving feedback caps into deep saturation for 5-10 µs. In steel (v=5920 m/s), a 5 µs dead-zone makes the gauge blind to anything thinner than 14.8 mm, failing to detect catastrophic corrosion.",
      risks: [
        "Receiver saturation blinds probe to wall thickness thinner than 15 mm.",
        "-150V pulse leak damages sensitive low-noise analog amplifier silicon.",
        "Acoustic damping in rusted steel attenuates microvolt echoes below noise floor.",
      ],
      mathFormula: "\\text{Dead Zone} = \\frac{v_{steel} \\cdot t_{blind}}{2} = \\frac{5920\\text{m/s} \\times 5\\mu\\text{s}}{2} = 14.8\\text{ mm blind zone}",
    },
    contradiction: {
      myth: "I pulsed a piezo with a 5V logic pin and connected it to an oscilloscope or an op-amp with back-to-back 1N4007 diodes.",
      brutalTruth:
        "A 5V pulse creates almost zero acoustic displacement in industrial steel; the sound wave dissipates in the rust layer. 1N4007 diodes have huge reverse recovery times (> 2 µs) and excessive junction capacitance (15 pF), smothering 10 MHz microvolt echoes.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: High-Voltage Diode Clamping Array",
            "exactDefinition": "Clamp receiver input with fast Schottky diodes in anti-parallel behind a current-limiting resistor.",
            "summary": "Protects receiver amplifier from destruction by clamping voltages to \u00b10.4V.",
            "tradeOff": "Diode junction capacitance (15 pF) filters out high-frequency 10 MHz acoustic details; 8 mm dead-zone."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: High-Speed Depletion-Mode T/R Switch (< 20ns) + TGC Amplifier (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Isolate receiver with bidirectional depletion-mode FET switch during the -150V pulse, ramping analog gain with echo depth.",
            "summary": "Microchip MD0100 (< 20ns turn-off) + Analog Devices AD8331 TGC amplifier resolving wall thickness to \u00b15 \u00b5m.",
            "tradeOff": "Requires synchronized high-voltage pulser timing triggers."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Electromagnetic Acoustic Transducer (EMAT) Non-Contact Array",
            "exactDefinition": "Generate ultrasonic shear waves directly inside pipe steel using Lorentz forces from high-field permanent magnets.",
            "summary": "Zero acoustic couplant gel needed; measures pipe thickness through thick coating and rust layers.",
            "tradeOff": "Requires heavy rare-earth magnets and high-current pulsed RF generators."
      }
],
    hardenedBlueprint: {
      title: "Microchip MD0100 Fast T/R Switch (< 20ns) + AD8331 TGC Amplifier",
      sub: "Depletion-mode FET protection switch clamping receiver to < ±2V during -150V pulse, then opening into 15Ω series resistance in 20 ns.",
      metrics: [
        { label: "Switch Speed", value: "< 20 ns Turn-Off", positive: true },
        { label: "Gain Ramp", value: "0 dB to 48 dB", positive: true },
        { label: "Accuracy", value: "±5 µm Resolution", positive: true },
        { label: "Dead-Zone", value: "< 0.8 mm (Clean)", positive: true },
      ],
      topology: "High-Speed Depletion-Mode FET T/R Isolation Switch + Time-Gain Compensation Amplifier + Hilbert Envelope Extraction.",
      silicon: [
        { role: "HV Negative Pulser", part: "Microchip MD1210 + TC6320", spec: "-150V impulse generator with 6 ns edge transitions" },
        { role: "T/R Protection Switch", part: "Microchip MD0100", spec: "Bidirectional depletion switch clamping to < ±2.0V in < 20 ns" },
        { role: "TGC Amplifier", part: "Analog Devices AD8331", spec: "0.74 nV/√Hz ultra-low noise, gain ramp 0 to 48 dB" },
        { role: "High-Speed ADC", part: "Analog Devices AD9228", spec: "Quad 12-bit, 65 MSPS low-jitter digitizer" },
      ],
      physicsMath: "t_{blind} = 20\\text{ns} \\implies \\text{Dead Zone} = \\frac{5920\\text{ m/s} \\times 20\\text{ ns}}{2} = 0.059\\text{ mm} \\quad (\\text{Zero blind zone})",
      firmwareFailsafe:
        "Time-of-Flight calculated via cross-correlation of transmitted pulse template against digitized RF echo. Zero-crossing phase detection resolves wall thickness to within ±5 µm even through surface corrosion pits.",
      implementationSteps: [
        "Mount MD0100 T/R switch immediately adjacent to SMA transducer coaxial connector.",
        "Synchronize AD8331 TGC analog voltage ramp with pulser trigger to boost deep echoes.",
        "Stream 65 MSPS ADC samples into STM32H7 RAM via dual-buffer DMA.",
        "Execute analytic Hilbert transform envelope filter in firmware to identify peak reflections.",
      ],
    },
  },

  // 10. AGV Dual LiDAR SLAM
  {
    id: "agv_slam",
    title: "10. Industrial AGV Dual LiDAR & Optical SLAM System",
    category: "Autonomous Vehicles & Factory Robotics",
    concept:
      "500kg warehouse Automated Guided Vehicle with dual safety LiDARs, global-shutter stereo cameras, and an NVIDIA Jetson Orin edge computer running ROS 2 SLAM.",
    stages: [
      { step: "01", name: "24V Traction Battery", desc: "Dual 400W brushless drive motors drawing up to 100A inrush", status: "nominal", statusText: "Operational" },
      { step: "02", name: "Buck-Boost & Supercap", desc: "Synchronous 4-switch buck-boost + supercapacitor hold-up", status: "bottleneck", statusText: "Critical Bottleneck", highlight: true },
      { step: "03", name: "Perception Sensors", desc: "Dual SICK microScan3 safety LiDARs + 120fps global shutter cameras", status: "nominal", statusText: "Operational" },
      { step: "04", name: "Jetson Orin Compute", desc: "NVIDIA Jetson Orin Nano (65W) executing CUDA neural SLAM", status: "nominal", statusText: "Operational" },
      { step: "05", name: "Hardware E-Stop", desc: "SIL-2 fail-safe OSSD outputs hardwired to Pilz motor contactors", status: "nominal", statusText: "Operational" },
    ],
    bottleneck: {
      stage: "Stage 2: Motor Starting Voltage Sag & Camera Motion Shear",
      title: "Motor inrush drops 24V rail to 9V, crashing the Jetson and corrupting SSD",
      mechanism:
        "When a 500kg AGV accelerates, motor peak starting current reaches 80-120A, dropping battery bus voltage from 24V down to 9V for 200 ms. Generic step-down converters drop out, triggering instant Jetson OS kernel panic and SSD filesystem corruption. Concurrently, factory bay sunlight (100k lux) blinds rolling-shutter cameras, producing rolling-shutter jello distortion that breaks SLAM pose tracking.",
      risks: [
        "Motor starting inrush sags 24V rail to 9V, crashing onboard navigation computer.",
        "Filesystem corruption on NVMe SSD renders AGV stranded in factory aisles.",
        "Rolling-shutter camera skew under motion causes feature loss and robot collisions.",
      ],
      mathFormula: "V_{bus} = 24.0\\text{V} - (I_{peak} \\cdot R_{int}) = 24.0\\text{V} - (100\\text{A} \\times 0.15\\Omega) = 9.0\\text{V (12V buck collapses)}",
    },
    contradiction: {
      myth: "I put a big buck converter on the 24V battery to feed the Jetson and used USB webcams for visual SLAM.",
      brutalTruth:
        "Buck converters cannot boost; when the battery sags to 9V, the 12V output collapses. Rolling-shutter webcams warp curved geometry under motion, causing feature-tracking failures. The robot loses its pose, panics, or collides with factory workers.",
    },
        pathways: [
      {
            "id": "path_a",
            "label": "Path A",
            "name": "Path A: Dedicated Auxiliary Deep-Cycle Buffer Battery",
            "exactDefinition": "Power onboard computer and sensors from an isolated secondary 12V battery separated from traction drive motors.",
            "summary": "Prevents traction motor acceleration inrush sags from affecting navigation computers.",
            "tradeOff": "Adds 12 kg battery weight and requires separate charging circuitry."
      },
      {
            "id": "path_b",
            "label": "Path B",
            "name": "Path B: 4-Switch Buck-Boost (LT8705) + Supercapacitor Reservoir + Global Shutter (Recommended Production Standard)",
            "recommended": true,
            "exactDefinition": "Regulate wide 5V-40V inputs into constant 19V with supercapacitor ride-through and global-shutter optical filtering.",
            "summary": "Analog Devices LT8705 + 3F Eaton supercapacitor hold-up (> 2.5s dropout survival) + OnSemi AR0234CS global shutter.",
            "tradeOff": "Supercapacitor bank requires active cell balancing circuit."
      },
      {
            "id": "path_c",
            "label": "Path C",
            "name": "Path C: Ultra-Wideband (UWB) Infrastructure-Assisted Ceiling Optical SLAM",
            "exactDefinition": "Augment AGV SLAM with ceiling-mounted upward-facing barcode cameras and factory UWB positioning anchors.",
            "summary": "100% immune to ground-level lighting and obstacle obstruction; sub-centimeter repeatable warehouse navigation.",
            "tradeOff": "Requires surveying and installing active infrastructure across factory ceiling grid."
      }
],
    hardenedBlueprint: {
      title: "4-Switch Buck-Boost (LT8705) + Supercapacitor Reservoir + Global Shutter",
      sub: "Analog Devices LT8705 delivering constant 19V at 8A from 5V-40V inputs, backed by a 3F supercapacitor reservoir for 2.5s dropout ride-through.",
      metrics: [
        { label: "Input Range", value: "5V to 40V", positive: true },
        { label: "Hold-Up Time", value: "> 2.5 Seconds", positive: true },
        { label: "Frame Rate", value: "120 fps Global", positive: true },
        { label: "E-Stop Latency", value: "< 15 ms (SIL-2)", positive: true },
      ],
      topology: "4-Switch Bidirectional Buck-Boost Regulator with Supercapacitor Hold-Up Reservoir + Dual SIL-2 Safety LiDARs + Global Shutter Vision.",
      silicon: [
        { role: "Buck-Boost Regulator", part: "Analog Devices LT8705", spec: "Synchronous 4-switch converter delivering 19.0V @ 8A from 5V-40V" },
        { role: "Supercap Hold-Up", part: "Eaton HV0820-2R7305-R", spec: "3F 2.7V series array providing 65W for > 2.5s power dropouts" },
        { role: "Global Shutter Vision", part: "OnSemi AR0234CS", spec: "120 fps global shutter with 850nm optical bandpass filters" },
        { role: "Safety Interlock", part: "SICK microScan3 + Pilz PNOZ", spec: "Hardware OSSD safety lines hardwired directly to contactors" },
      ],
      physicsMath: "E_{supercap} = \\frac{1}{2} C (V_1^2 - V_2^2) = \\frac{1}{2} (1.5\\text{F}) (16.2^2 - 10.0^2) = 121.8\\text{ Joules} \\implies \\frac{121.8\\text{J}}{45\\text{W}} = 2.7\\text{s ride-through}",
      firmwareFailsafe:
        "SICK microScan3 safety LiDAR OSSD outputs are hardwired directly to Pilz safety contactors, cutting motor torque within 15 ms of beam obstruction independently of Linux/ROS software.",
      implementationSteps: [
        "Install LT8705 4-switch buck-boost with low-ESR polymer input decoupling.",
        "Add Eaton supercapacitor array with active voltage balancing circuit.",
        "Pair AR0234CS global shutter cameras with 850nm narrow-band optical filters and infrared VCSEL illuminators.",
        "Wire safety LiDAR OSSD outputs directly to motor controller hardware enable pins.",
      ],
    },
  },
];
