import type { BackgroundLayer } from "./types";
import { Starfield } from "./Starfield";
import { GoldenDust } from "./GoldenDust";
import { CinemaGrain } from "./CinemaGrain";
import { AuroraWave } from "./AuroraWave";
import { NeonGrid } from "./NeonGrid";
import { FireEmbers } from "./FireEmbers";
import { ElectricStorm } from "./ElectricStorm";
import { SmokeRing } from "./SmokeRing";
import { MatrixRain } from "./MatrixRain";
import { PlasmaField } from "./PlasmaField";
import { RainfallEffect } from "./RainfallEffect";
import { DNAHelix } from "./DNAHelix";
import { CosmicDust } from "./CosmicDust";
import { BlackHole } from "./BlackHole";
import { Galaxy } from "./Galaxy";
import { MeteorShower } from "./MeteorShower";
import { InteractiveParticles } from "./InteractiveParticles";
import { BlurredGradients } from "./BlurredGradients";
import { ParallaxField } from "./ParallaxField";
import { AnimatedShapes } from "./AnimatedShapes";
import { Nebula } from "./Nebula";
import { OceanWaves } from "./OceanWaves";
import { Snowfall } from "./Snowfall";
import { Fireflies } from "./Fireflies";
import { LightningBolts } from "./LightningBolts";
import { VortexTunnel } from "./VortexTunnel";
import { NorthernLights } from "./NorthernLights";
import { RaindropRipples } from "./RaindropRipples";
import { LavaLamp } from "./LavaLamp";
import { CrystalMatrix } from "./CrystalMatrix";
import { DigitalCircuit } from "./DigitalCircuit";
import { SolarFlare } from "./SolarFlare";
import { GeometricTessellation } from "./GeometricTessellation";
import { InkBleed } from "./InkBleed";
import { GlitchWave } from "./GlitchWave";
import { Kaleidoscope } from "./Kaleidoscope";
import { WaveInterference } from "./WaveInterference";
import { CellularAutomata } from "./CellularAutomata";
import { FractalTree } from "./FractalTree";
import { HolographicShimmer } from "./HolographicShimmer";
import { MagneticField } from "./MagneticField";
import { RetroSunset } from "./RetroSunset";
import { QuantumField } from "./QuantumField";
import { CoralReef } from "./CoralReef";
import { AcidTrip } from "./AcidTrip";
import { TidalWave } from "./TidalWave";
import { CrystalGrowth } from "./CrystalGrowth";
import { FireworksBurst } from "./FireworksBurst";
import { Topography } from "./Topography";
import { PrismRefraction } from "./PrismRefraction";
import { PowerNexus } from "./PowerNexus";
import { SandStorm } from "./SandStorm";
import { BubbleRise } from "./BubbleRise";
import { GravityWell } from "./GravityWell";
import { NeuralNetwork } from "./NeuralNetwork";
import { Pendulum } from "./Pendulum";
import { FlockingBoids } from "./FlockingBoids";
import { PixelSort } from "./PixelSort";
import { SpiralGalaxy } from "./SpiralGalaxy";
import { WaterColor } from "./WaterColor";
import { Chandelier } from "./Chandelier";
import { MorningDew } from "./MorningDew";
import { CherryBlossom } from "./CherryBlossom";
import { MintBreeze } from "./MintBreeze";
import { FreshSplash } from "./FreshSplash";
import { SpringBloom } from "./SpringBloom";

type LayerFactory = (w: number, h: number, color?: string) => BackgroundLayer;

export const backgroundRegistry: Record<string, LayerFactory> = {
  starfield: (w, h, c) => new Starfield(w, h, c),
  goldenDust: (w, h, c) => new GoldenDust(w, h, c),
  cinemaGrain: (_w, _h, c) => new CinemaGrain(c),
  auroraWave: (w, h, c) => new AuroraWave(w, h, c),
  neonGrid: (w, h, c) => new NeonGrid(w, h, c),
  fireEmbers: (w, h, c) => new FireEmbers(w, h, c),
  electricStorm: (w, h, c) => new ElectricStorm(w, h, c),
  smokeRing: (w, h, c) => new SmokeRing(w, h, c),
  matrixRain: (w, h, c) => new MatrixRain(w, h, c),
  plasmaField: (w, h, c) => new PlasmaField(w, h, c),
  rainfall: (w, h, c) => new RainfallEffect(w, h, c),
  dnaHelix: (w, h, c) => new DNAHelix(w, h, c),
  cosmicDust: (w, h, c) => new CosmicDust(w, h, c),
  blackHole: (w, h, c) => new BlackHole(w, h, c),
  galaxy: (w, h, c) => new Galaxy(w, h, c),
  meteorShower: (w, h, c) => new MeteorShower(w, h, c),
  interactiveParticles: (w, h, c) => new InteractiveParticles(w, h, c),
  blurredGradients: (w, h, c) => new BlurredGradients(w, h, c),
  parallaxField: (w, h, c) => new ParallaxField(w, h, c),
  animatedShapes: (w, h, c) => new AnimatedShapes(w, h, c),
  nebula: (w, h, c) => new Nebula(w, h, c),
  oceanWaves: (w, h, c) => new OceanWaves(w, h, c),
  snowfall: (w, h, c) => new Snowfall(w, h, c),
  fireflies: (w, h, c) => new Fireflies(w, h, c),
  lightningBolts: (w, h, c) => new LightningBolts(w, h, c),
  vortexTunnel: (w, h, c) => new VortexTunnel(w, h, c),
  northernLights: (w, h, c) => new NorthernLights(w, h, c),
  raindropRipples: (w, h, c) => new RaindropRipples(w, h, c),
  lavaLamp: (w, h, c) => new LavaLamp(w, h, c),
  crystalMatrix: (w, h, c) => new CrystalMatrix(w, h, c),
  digitalCircuit: (w, h, c) => new DigitalCircuit(w, h, c),
  solarFlare: (w, h, c) => new SolarFlare(w, h, c),
  geometricTessellation: (w, h, c) => new GeometricTessellation(w, h, c),
  inkBleed: (w, h, c) => new InkBleed(w, h, c),
  glitchWave: (w, h, c) => new GlitchWave(w, h, c),
  kaleidoscope: (w, h, c) => new Kaleidoscope(w, h, c),
  waveInterference: (w, h, c) => new WaveInterference(w, h, c),
  cellularAutomata: (w, h, c) => new CellularAutomata(w, h, c),
  fractalTree: (w, h, c) => new FractalTree(w, h, c),
  holographicShimmer: (w, h, c) => new HolographicShimmer(w, h, c),
  magneticField: (w, h, c) => new MagneticField(w, h, c),
  retroSunset: (w, h, c) => new RetroSunset(w, h, c),
  quantumField: (w, h, c) => new QuantumField(w, h, c),
  coralReef: (w, h, c) => new CoralReef(w, h, c),
  acidTrip: (w, h, c) => new AcidTrip(w, h, c),
  tidalWave: (w, h, c) => new TidalWave(w, h, c),
  crystalGrowth: (w, h, c) => new CrystalGrowth(w, h, c),
  fireworksBurst: (w, h, c) => new FireworksBurst(w, h, c),
  topography: (w, h, c) => new Topography(w, h, c),
  prismRefraction: (w, h, c) => new PrismRefraction(w, h, c),
  powerNexus: (w, h, c) => new PowerNexus(w, h, c),
  sandStorm: (w, h, c) => new SandStorm(w, h, c),
  bubbleRise: (w, h, c) => new BubbleRise(w, h, c),
  gravityWell: (w, h, c) => new GravityWell(w, h, c),
  neuralNetwork: (w, h, c) => new NeuralNetwork(w, h, c),
  pendulum: (w, h, c) => new Pendulum(w, h, c),
  flockingBoids: (w, h, c) => new FlockingBoids(w, h, c),
  pixelSort: (w, h, c) => new PixelSort(w, h, c),
  spiralGalaxy: (w, h, c) => new SpiralGalaxy(w, h, c),
  waterColor: (w, h, c) => new WaterColor(w, h, c),
  chandelier: (w, h, c) => new Chandelier(w, h, c),
  morningDew: (w, h, c) => new MorningDew(w, h, c),
  cherryBlossom: (w, h, c) => new CherryBlossom(w, h, c),
  mintBreeze: (w, h, c) => new MintBreeze(w, h, c),
  freshSplash: (w, h, c) => new FreshSplash(w, h, c),
  springBloom: (w, h, c) => new SpringBloom(w, h, c),
};
