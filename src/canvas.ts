import { Pane } from 'tweakpane';
import { ShaderProgram, WebGLUtility } from './webgl';

import * as vertexShaderSource from './shader/main.vert';
import * as fragmentShaderSource from './shader/main.frag';
import * as exportVertexShaderSource from './shader/export.vert';

export class Renderer {
  private parent: HTMLElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private console: HTMLElement;
  private image: HTMLImageElement | HTMLCanvasElement;
  private imageName: string;
  private imageWidth: number;
  private imageHeight: number;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private isRendering: boolean;
  private texture: WebGLTexture;
  private vertexShaderSource: string;
  private fragmentShaderSource: string;
  private shaderProgram: ShaderProgram;
  private exVertexShaderSource: string;
  private exShaderProgram: ShaderProgram;
  private position: number[];
  private texCoord: number[];
  private offset: number[];
  private indices: number[];
  private vbo: WebGLBuffer[];
  private ibo: WebGLBuffer;

  private exportFunction: () => void | null;

  private uCrevice: number[];
  private uMouse: number[];
  private uCanvasAspect: number;
  private uResourceAspect: number;
  private uVertexScale: number;
  private uDropScale: number;
  private uDropAttenuation: number;
  private uDropRange: number;
  private uDropDistortion: number;
  private uTemperature: number;
  private uTint: number;
  private uContrast: number;
  private uHSV: number[];
  private uSobel: number;
  private uMosaic: number;
  private uBayer: number;
  private uToon: number;
  private uToonMin: number;
  private uToonMax: number;
  private uShift: number[];
  private shiftScale: number;
  private uVignette: number;
  private uVignetteScale: number;
  private uNoiseIntensity: number[];
  private uNoiseScale: number[];
  private uNoiseTime: number;
  private uSNoiseIntensity: number[];
  private uSNoiseScale: number[];
  private uSNoiseTime: number;
  private isFixed: boolean;
  private isTemperature: boolean;
  private isTint: boolean;
  private isContrast: boolean;
  private isHSV: boolean;
  private isMosaic: boolean;
  private isShift: boolean;
  private isNoise: boolean;
  private isSNoise: boolean;
  private isSobel: boolean;
  private isBayer: boolean;
  private isToon: boolean;
  private isVignette: boolean;
  private gui: any;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.glCanvas = document.createElement('canvas');
    this.gl = this.glCanvas.getContext('webgl', {preserveDrawingBuffer: true});
    this.console = document.querySelector('#console');

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0px';
    this.canvas.style.left = '0px';
    this.glCanvas.style.width = '100%';
    this.glCanvas.style.height = '100%';
    this.glCanvas.style.position = 'absolute';
    this.glCanvas.style.top = '0px';
    this.glCanvas.style.left = '0px';
    this.parent.appendChild(this.glCanvas);
    this.parent.appendChild(this.canvas);

    this.exportFunction = null;
    this.render = this.render.bind(this);
    this.resize = this.resize.bind(this);

    this.resize();
    this.init();
    this.eventSetting();
    this.paneSetting();
  }
  paneSetting(): void {
    const pane = new Pane();

    const generalFolder = pane.addFolder({title: 'general'});
    const creviceX = generalFolder.addBinding({'crevice-x': this.uCrevice[0]}, 'crevice-x', {
      min: 0,
      max: 0.5,
    }).on('change', (v) => { this.uCrevice[0] = v.value; });
    const creviceY = generalFolder.addBinding({'crevice-y': this.uCrevice[1]}, 'crevice-y', {
      min: 0,
      max: 0.5,
    }).on('change', (v) => { this.uCrevice[1] = v.value; });
    const dropScale = generalFolder.addBinding({'drop-scl': this.uDropScale}, 'drop-scl', {
      min: 0.0,
      max: 2.0,
    }).on('change', (v) => { this.uDropScale = v.value; });
    const dropAttenuation = generalFolder.addBinding({'drop-att': this.uDropAttenuation}, 'drop-att', {
      min: 1.0,
      max: 10.0,
    }).on('change', (v) => { this.uDropAttenuation = v.value; });
    const dropRange = generalFolder.addBinding({'drop-rng': this.uDropRange}, 'drop-rng', {
      min: 0.0,
      max: 0.99,
    }).on('change', (v) => { this.uDropRange = v.value; });
    const dropDistortion = generalFolder.addBinding({'drop-dst': this.uDropDistortion}, 'drop-dst', {
      min: 1.0,
      max: 10.0,
    }).on('change', (v) => { this.uDropDistortion = v.value; });
    const vertexScale = generalFolder.addBinding({'scale': this.uVertexScale}, 'scale', {
      min: 1.0,
      max: 5.0,
    }).on('change', (v) => { this.uVertexScale = v.value; });
    const colorFolder = pane.addFolder({title: 'color'});
    const isTemperature = colorFolder.addBinding({'temperature': this.isTemperature}, 'temperature').on('change', (v) => { this.isTemperature = v.value; });
    const temperature = colorFolder.addBinding({'temperature': this.uTemperature}, 'temperature', {
      min: -3.0,
      max: 3.0,
    }).on('change', (v) => { this.uTemperature = v.value; });
    const isTint = colorFolder.addBinding({'tint': this.isTint}, 'tint').on('change', (v) => { this.isTint = v.value; });
    const tint = colorFolder.addBinding({'tint': this.uTint}, 'tint', {
      min: -3.0,
      max: 3.0,
    }).on('change', (v) => { this.uTint = v.value; });
    const isContrast = colorFolder.addBinding({'contrast': this.isContrast}, 'contrast').on('change', (v) => { this.isContrast = v.value; });
    const contrast = colorFolder.addBinding({'contrast': this.uContrast}, 'contrast', {
      min: 0.0,
      max: 3.0,
    }).on('change', (v) => { this.uContrast = v.value; });
    const isHSV = colorFolder.addBinding({'hsv': this.isHSV}, 'hsv').on('change', (v) => { this.isHSV = v.value; });
    const HSVH = colorFolder.addBinding({'hsv-H': this.uHSV[0]}, 'hsv-H', {
      min: 0.0,
      max: 1.0,
    }).on('change', (v) => { this.uHSV[0] = v.value; });
    const HSVS = colorFolder.addBinding({'hsv-S': this.uHSV[1]}, 'hsv-S', {
      min: -1.0,
      max: 1.0,
    }).on('change', (v) => { this.uHSV[1] = v.value; });
    const HSVV = colorFolder.addBinding({'hsv-V': this.uHSV[2]}, 'hsv-V', {
      min: -1.0,
      max: 1.0,
    }).on('change', (v) => { this.uHSV[2] = v.value; });
    const filterFolder = pane.addFolder({title: 'filter'});
    const isSobel = filterFolder.addBinding({'sobel': this.isSobel}, 'sobel').on('change', (v) => { this.isSobel = v.value; });
    const sobel = filterFolder.addBinding({'sobel': this.uSobel}, 'sobel', {
      min: -3.0,
      max: 3.0,
    }).on('change', (v) => { this.uSobel = v.value; });
    const isToon = filterFolder.addBinding({'toon': this.isToon}, 'toon').on('change', (v) => { this.isToon = v.value; });
    const toon = filterFolder.addBinding({'toon': this.uToon}, 'toon', {
      min: 2.0,
      max: 10.0,
      step: 1.0,
    }).on('change', (v) => { this.uToon = v.value; });
    const toonMin = filterFolder.addBinding({'toon-min': this.uToonMin}, 'toon-min', {
      min: 0.0,
      max: 1.0,
    }).on('change', (v) => { this.uToonMin = v.value; });
    const toonMax = filterFolder.addBinding({'toon-max': this.uToonMax}, 'toon-max', {
      min: 0.0,
      max: 1.0,
    }).on('change', (v) => { this.uToonMax = v.value; });
    const isMosaic = filterFolder.addBinding({'mosaic': this.isMosaic}, 'mosaic').on('change', (v) => { this.isMosaic = v.value; });
    const mosaic = filterFolder.addBinding({'mosaic': this.uMosaic}, 'mosaic', {
      min: 1.0,
      max: 400.0,
    }).on('change', (v) => { this.uMosaic = v.value; });
    const isBayer = filterFolder.addBinding({'bayer': this.isBayer}, 'bayer').on('change', (v) => { this.isBayer = v.value; });
    const bayer = filterFolder.addBinding({'bayer': this.uBayer}, 'bayer', {
      min: 1.0,
      max: 400.0,
    }).on('change', (v) => { this.uBayer = v.value; });
    const isShift = filterFolder.addBinding({'shift': this.isShift}, 'shift').on('change', (v) => { this.isShift = v.value; });
    const shiftScale = filterFolder.addBinding({'shift-s': this.shiftScale}, 'shift-s', {
      min: 0.0,
      max: 0.2,
    }).on('change', (v) => { this.shiftScale = v.value; });
    const shiftX = filterFolder.addBinding({'shift-x': this.uShift[0]}, 'shift-x', {
      min: -1.0,
      max: 1.0,
    }).on('change', (v) => { this.uShift[0] = v.value; });
    const shiftY = filterFolder.addBinding({'shift-y': this.uShift[1]}, 'shift-y', {
      min: -1.0,
      max: 1.0,
    }).on('change', (v) => { this.uShift[1] = v.value; });
    const isVignette = filterFolder.addBinding({'vignette': this.isVignette}, 'vignette').on('change', (v) => { this.isVignette = v.value; });
    const vignette = filterFolder.addBinding({'vignette': this.uVignette}, 'vignette', {
      min: 0.0,
      max: 4.0,
    }).on('change', (v) => { this.uVignette = v.value; });
    const vignetteScale = filterFolder.addBinding({'v-scale': this.uVignetteScale}, 'v-scale', {
      min: 0.0,
      max: 4.0,
    }).on('change', (v) => { this.uVignetteScale = v.value; });
    const noiseFolder = pane.addFolder({title: 'noise', expanded: false});
    const isNoise = noiseFolder.addBinding({'noise': this.isNoise}, 'noise').on('change', (v) => { this.isNoise = v.value; });
    const noiseIntensityX = noiseFolder.addBinding({'n-ix': this.uNoiseIntensity[0]}, 'n-ix', {
      min: -10.0,
      max: 10.0,
    }).on('change', (v) => { this.uNoiseIntensity[0] = v.value; });
    const noiseIntensityY = noiseFolder.addBinding({'n-iy': this.uNoiseIntensity[1]}, 'n-iy', {
      min: -10.0,
      max: 10.0,
    }).on('change', (v) => { this.uNoiseIntensity[1] = v.value; });
    const noiseScaleX = noiseFolder.addBinding({'n-sx': this.uNoiseScale[0]}, 'n-sx', {
      min: 1.0,
      max: 500.0,
    }).on('change', (v) => { this.uNoiseScale[0] = v.value; });
    const noiseScaleY = noiseFolder.addBinding({'n-sy': this.uNoiseScale[1]}, 'n-sy', {
      min: 1.0,
      max: 500.0,
    }).on('change', (v) => { this.uNoiseScale[1] = v.value; });
    const noiseTime = noiseFolder.addBinding({'n-time': this.uNoiseTime}, 'n-time', {
      min: 0.0,
      max: 1.0,
    }).on('change', (v) => { this.uNoiseTime = v.value; });
    const isSNoise = noiseFolder.addBinding({'s-noise': this.isSNoise}, 's-noise').on('change', (v) => { this.isSNoise = v.value; });
    const sNoiseIntensityX = noiseFolder.addBinding({'sn-ix': this.uSNoiseIntensity[0]}, 'sn-ix', {
      min: -0.5,
      max: 0.5,
    }).on('change', (v) => { this.uSNoiseIntensity[0] = v.value; });
    const sNoiseIntensityY = noiseFolder.addBinding({'sn-iy': this.uSNoiseIntensity[1]}, 'sn-iy', {
      min: -0.5,
      max: 0.5,
    }).on('change', (v) => { this.uSNoiseIntensity[1] = v.value; });
    const sNoiseScaleX = noiseFolder.addBinding({'sn-sx': this.uSNoiseScale[0]}, 'sn-sx', {
      min: 0.0,
      max: 10.0,
    }).on('change', (v) => { this.uSNoiseScale[0] = v.value; });
    const sNoiseScaleY = noiseFolder.addBinding({'sn-sy': this.uSNoiseScale[1]}, 'sn-sy', {
      min: 0.0,
      max: 10.0,
    }).on('change', (v) => { this.uSNoiseScale[1] = v.value; });
    const sNoiseTime = noiseFolder.addBinding({'sn-time': this.uSNoiseTime}, 'sn-time', {
      min: 0.0,
      max: 10.0,
    }).on('change', (v) => { this.uSNoiseTime = v.value; });
    const toolFolder = pane.addFolder({title: 'tool'});
    const openButton = toolFolder.addButton({
      title: 'open',
    });
    openButton.on('click', () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.addEventListener('change', async () => {
        if (input.files.length === 0) {
          return;
        }
        await this.fromFile(input.files[0]);
        this.update();
      });
      input.click();
    });
    const resetButton = toolFolder.addButton({
      title: 'reset',
    });
    resetButton.on('click', () => {
      // reset values
      this.uTemperature = 0.0;
      this.uTint = 0.0;
      this.uContrast = 0.5;
      this.uHSV[0] = 0.0;
      this.uHSV[1] = 0.0;
      this.uHSV[2] = 0.0;
      this.uSobel = 0.0;
      this.uMosaic = 200.0;
      this.uBayer = 200.0;
      this.uToon = 3.0;
      this.uToonMin = 0.0;
      this.uToonMax = 1.0;
      this.shiftScale = 0.01;
      this.uShift = [0.0, 0.0];
      this.uVignette = 1.5;
      this.uVignetteScale = 1.0;
      this.uNoiseIntensity = [0.0, 0.0];
      this.uNoiseScale = [1.0, 1.0];
      this.uNoiseTime = 1.0;
      this.uSNoiseIntensity = [0.0, 0.0];
      this.uSNoiseScale = [1.0, 1.0];
      this.uSNoiseTime = 0.0;
      // reset inputs
      temperature.controller.value.setRawValue(this.uTemperature);
      tint.controller.value.setRawValue(this.uTint);
      contrast.controller.value.setRawValue(this.uContrast);
      HSVH.controller.value.setRawValue(this.uHSV[0]);
      HSVS.controller.value.setRawValue(this.uHSV[1]);
      HSVV.controller.value.setRawValue(this.uHSV[2]);
      sobel.controller.value.setRawValue(this.uSobel);
      mosaic.controller.value.setRawValue(this.uMosaic);
      bayer.controller.value.setRawValue(this.uBayer);
      toon.controller.value.setRawValue(this.uToon);
      toonMin.controller.value.setRawValue(this.uToonMin);
      toonMax.controller.value.setRawValue(this.uToonMax);
      shiftScale.controller.value.setRawValue(this.shiftScale);
      shiftX.controller.value.setRawValue(this.uShift[0]);
      shiftY.controller.value.setRawValue(this.uShift[1]);
      vignette.controller.value.setRawValue(this.uVignette);
      vignetteScale.controller.value.setRawValue(this.uVignetteScale);
      noiseIntensityX.controller.value.setRawValue(this.uNoiseIntensity[0]);
      noiseIntensityY.controller.value.setRawValue(this.uNoiseIntensity[1]);
      noiseScaleX.controller.value.setRawValue(this.uNoiseScale[0]);
      noiseScaleY.controller.value.setRawValue(this.uNoiseScale[1]);
      noiseTime.controller.value.setRawValue(this.uNoiseTime);
      sNoiseIntensityX.controller.value.setRawValue(this.uSNoiseIntensity[0]);
      sNoiseIntensityY.controller.value.setRawValue(this.uSNoiseIntensity[1]);
      sNoiseScaleX.controller.value.setRawValue(this.uSNoiseScale[0]);
      sNoiseScaleY.controller.value.setRawValue(this.uSNoiseScale[1]);
      sNoiseTime.controller.value.setRawValue(this.uSNoiseTime);
    });
    const randomButton = toolFolder.addButton({
      title: 'randomize',
    });
    randomButton.on('click', () => {
      // randomize values
      if (this.isTemperature === true) {
        this.uTemperature = Math.random() * (1.67 * 2.0) - 1.67;
      }
      if (this.isTint === true) {
        this.uTint = Math.random() * (1.67 * 2.0) - 1.67;
      }
      if (this.isContrast === true) {
        this.uContrast = Math.random() * 2.0;
      }
      if (this.isHSV === true) {
        this.uHSV[0] = Math.random();
        this.uHSV[1] = Math.random() * 2.0 - 1.0;
        this.uHSV[2] = Math.random() * 2.0 - 1.0;
      }
      if (this.isSobel === true) {
        this.uSobel = Math.random() * 4.0 - 2.0;
      }
      if (this.isBayer === true) {
        this.uBayer = Math.random() * 399.0 + 1.0;
      }
      if (this.isToon === true) {
        this.uToon = Math.floor(Math.random() * 9.0) + 2.0;
        this.uToonMin = Math.random() * 0.5;
        this.uToonMax = Math.random() * 0.5 + 0.5;
      }
      if (this.isMosaic === true) {
        // dare to make different
        this.uMosaic = Math.random() * 199.0 + 1.0;
      }
      if (this.isShift === true) {
        // dare to make different
        this.shiftScale = Math.random() * 0.2;
        this.uShift = [Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0];
      }
      if (this.isVignette === true) {
        this.uVignette = Math.random() * 4.0;
        this.uVignetteScale = Math.random() * 4.0;
      }
      if (this.isNoise === true) {
        this.uNoiseIntensity = [Math.random() * 20.0 - 10.0, Math.random() * 20.0 - 10.0];
        this.uNoiseScale = [Math.random() * 499.0 + 1.0, Math.random() * 499.0 + 1.0];
        // dare to make different
        this.uNoiseTime = Math.random() * 0.1;
      }
      if (this.isSNoise === true) {
        // dare to make different
        this.uSNoiseIntensity = [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1];
        // dare to make different
        this.uSNoiseScale = [Math.random() * 5.0, Math.random() * 5.0];
        this.uSNoiseTime = Math.random() * 10.0;
      }
      // set to inputs
      temperature.controller.value.setRawValue(this.uTemperature);
      tint.controller.value.setRawValue(this.uTint);
      contrast.controller.value.setRawValue(this.uContrast);
      HSVH.controller.value.setRawValue(this.uHSV[0]);
      HSVS.controller.value.setRawValue(this.uHSV[1]);
      HSVV.controller.value.setRawValue(this.uHSV[2]);
      sobel.controller.value.setRawValue(this.uSobel);
      mosaic.controller.value.setRawValue(this.uMosaic);
      bayer.controller.value.setRawValue(this.uBayer);
      toon.controller.value.setRawValue(this.uToon);
      toonMin.controller.value.setRawValue(this.uToonMin);
      toonMax.controller.value.setRawValue(this.uToonMax);
      shiftScale.controller.value.setRawValue(this.shiftScale);
      shiftX.controller.value.setRawValue(this.uShift[0]);
      shiftY.controller.value.setRawValue(this.uShift[1]);
      vignette.controller.value.setRawValue(this.uVignette);
      vignetteScale.controller.value.setRawValue(this.uVignetteScale);
      noiseIntensityX.controller.value.setRawValue(this.uNoiseIntensity[0]);
      noiseIntensityY.controller.value.setRawValue(this.uNoiseIntensity[1]);
      noiseScaleX.controller.value.setRawValue(this.uNoiseScale[0]);
      noiseScaleY.controller.value.setRawValue(this.uNoiseScale[1]);
      noiseTime.controller.value.setRawValue(this.uNoiseTime);
      sNoiseIntensityX.controller.value.setRawValue(this.uSNoiseIntensity[0]);
      sNoiseIntensityY.controller.value.setRawValue(this.uSNoiseIntensity[1]);
      sNoiseScaleX.controller.value.setRawValue(this.uSNoiseScale[0]);
      sNoiseScaleY.controller.value.setRawValue(this.uSNoiseScale[1]);
      sNoiseTime.controller.value.setRawValue(this.uSNoiseTime);
    });

    const info = `drag and drop image.

> press 'e' key
  to export as image.
> press 'f' key
  to fix pointer.
> press 'j' key
  export json.
> press 'i' key
  import json.`;
    const infoFolder = pane.addFolder({title: 'info'});
    infoFolder.addBinding({info: info}, 'info', {
      readonly: true,
      multiline: true,
      rows: 10,
    });

    this.gui = {
      uTemperature: temperature,
      uTint: tint,
      uContrast: contrast,
      uHSV: [HSVH, HSVS, HSVV],
      uSobel: sobel,
      uMosaic: mosaic,
      uBayer: bayer,
      uToon: toon,
      uToonMin: toonMin,
      uToonMax: toonMax,
      shiftScale: shiftScale,
      uShift: [shiftX, shiftY],
      uVignette: vignette,
      uVignetteScale: vignetteScale,
      uNoiseIntensity: [noiseIntensityX, noiseIntensityY],
      uNoiseScale: [noiseScaleX, noiseScaleY],
      uNoiseTime: noiseTime,
      uSNoiseIntensity: [sNoiseIntensityX, sNoiseIntensityY],
      uSNoiseScale: [sNoiseScaleX, sNoiseScaleY],
      uSNoiseTime: sNoiseTime,
      isTemperature: isTemperature,
      isTint: isTint,
      isContrast: isContrast,
      isHSV: isHSV,
      isMosaic: isMosaic,
      isShift: isShift,
      isNoise: isNoise,
      isSNoise: isSNoise,
      isSobel: isSobel,
      isBayer: isBayer,
      isToon: isToon,
      isVignette: isVignette,
    };
  }
  init(): void {
    this.isRendering = false;
    this.isFixed = false;
    if (this.gl == null) {
      throw new Error('webgl not support.');
    }
    const gl = this.gl;
    this.position = [];
    this.texCoord = [];
    this.offset = [];
    this.indices = [];
    const ROW = 2;
    const COLUMN = 2;
    const COUNT_X = (COLUMN - 1) * 2 + 2;
    const COUNT_Y = (ROW - 1) * 2 + 2;
    const SIZE = 2;
    const start = -SIZE / 2;
    const wx = SIZE / COLUMN;
    const wy = SIZE / ROW;
    let iI = 0;
    for (let i = 0; i <= ROW; ++i) {
      const y = start + i * wy;
      const v = i / ROW;
      const dr = (i === 0 || i === ROW) ? 1 : 2;
      for (let I = 0; I < dr; ++I) {
        let iJ = 0;
        for (let j = 0; j <= COLUMN; ++j) {
          const x = start + j * wx;
          const u = j / COLUMN;
          const dc = (j === 0 || j === COLUMN) ? 1 : 2;
          for (let J = 0; J < dc; ++J) {
            const cy = iI < COUNT_Y / 2 ? 1.0 : -1.0;
            const cx = iJ < COUNT_X / 2 ? -1.0 : 1.0;
            this.position.push(x, -y);
            this.texCoord.push(u, v);
            this.offset.push(cx, cy);

            if (i > 0 && j > 0) {
              const c = iI * COUNT_X + (iJ - 1);
              const p = c - COUNT_X;
              this.indices.push(p, c, p + 1, p + 1, c, c + 1);
            }
            ++iJ;
          }
        }
        ++iI;
      }
    }
    this.vbo = [
      WebGLUtility.createVbo(gl, this.position),
      WebGLUtility.createVbo(gl, this.texCoord),
      WebGLUtility.createVbo(gl, this.offset),
    ];
    this.ibo = WebGLUtility.createIbo(gl, this.indices);

    this.vertexShaderSource = vertexShaderSource.default;
    this.fragmentShaderSource = fragmentShaderSource.default;
    this.exVertexShaderSource = exportVertexShaderSource.default;

    const option = {
      vertexShaderSource: this.vertexShaderSource,
      fragmentShaderSource: this.fragmentShaderSource,
      attribute: [
        'position',
        'texCoord',
        'offset',
      ],
      stride: [
        2,
        2,
        2,
      ],
      uniform: [
        'resolution',
        'crevice',
        'mouse',
        'canvasAspect',
        'resourceAspect',
        'vertexScale',
        'inputTexture',
        'dropScale',
        'dropAttenuation',
        'dropRange',
        'dropDistortion',
        'hsv',
        'sobel',
        'temperature',
        'tint',
        'contrastIntensity',
        'mosaic',
        'bayer',
        'toon',
        'toonMin',
        'toonMax',
        'shift',
        'vignette',
        'vignetteScale',
        'noiseIntensity',
        'noiseScale',
        'noiseTime',
        'sNoiseIntensity',
        'sNoiseScale',
        'sNoiseTime',
      ],
      type: [
        'uniform2fv',
        'uniform2fv',
        'uniform2fv',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1i',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform3fv',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform2fv',
        'uniform1f',
        'uniform1f',
        'uniform2fv',
        'uniform2fv',
        'uniform1f',
        'uniform2fv',
        'uniform2fv',
        'uniform1f',
      ],
    };
    this.shaderProgram = new ShaderProgram(gl, option);
    option.vertexShaderSource = this.exVertexShaderSource;
    this.exShaderProgram = new ShaderProgram(gl, option);

    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    this.uCrevice = [0, 0];
    this.uMouse = [0.0, 0.0];
    this.uDropScale = 0.0;
    this.uDropAttenuation = 5.0;
    this.uDropRange = 0.5;
    this.uDropDistortion = 1.0;
    this.uVertexScale = 1.25;
    this.uTemperature = 0.0;
    this.uTint = 0.0;
    this.uContrast = 0.5;
    this.uHSV = [0.0, 0.0, 0.0];
    this.uSobel = 0.0;
    this.uMosaic = 200.0;
    this.uBayer = 200.0;
    this.uToon = 3.0;
    this.uToonMin = 0.0;
    this.uToonMax = 1.0;
    this.shiftScale = 0.01;
    this.uShift = [0.0, 0.0];
    this.uVignette = 1.5;
    this.uVignetteScale = 1.0;
    this.uNoiseIntensity = [0.0, 0.0];
    this.uNoiseScale = [1.0, 1.0];
    this.uNoiseTime = 1.0;
    this.uSNoiseIntensity = [0.0, 0.0];
    this.uSNoiseScale = [1.0, 1.0];
    this.uSNoiseTime = 0.0;
    this.isTemperature = true;
    this.isTint = true;
    this.isContrast = true;
    this.isHSV = true;
    this.isMosaic = false;
    this.isShift = false;
    this.isNoise = false;
    this.isSNoise = false;
    this.isSobel = false;
    this.isBayer = false;
    this.isToon = false;
    this.isVignette = false;
  }
  update(): void {
    if (this.gl == null || this.image == null) {return;}
    const gl = this.gl;

    if (this.texture != null) {
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    this.texture = WebGLUtility.createTexture(gl, this.image);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (this.isRendering !== true) {
      this.isRendering = true;
      this.render();
    }
  }
  render(): void {
    const gl = this.gl;

    requestAnimationFrame(this.render);

    const uniforms = [
      [this.imageWidth, this.imageHeight],
      this.uCrevice,
      this.uMouse,
      this.uCanvasAspect,
      this.uResourceAspect,
      this.uVertexScale,
      0,
      this.uDropScale,
      this.uDropAttenuation,
      this.uDropRange,
      this.uDropDistortion,
      this.isHSV ? this.uHSV : [0.0, 0.0, 0.0],
      this.isSobel ? this.uSobel : 0.0,
      this.isTemperature ? this.uTemperature : 0.0,
      this.isTint ? this.uTint : 0.0,
      this.isContrast ? this.uContrast : 0.5,
      this.isMosaic ? this.uMosaic : -1.0,
      this.isBayer ? this.uBayer : 0.0,
      this.isToon ? this.uToon : 0.0,
      this.uToonMin,
      this.uToonMax,
      this.isShift ? [this.uShift[0] * this.shiftScale, this.uShift[1] * this.shiftScale] : [0.0, 0.0],
      this.uVignette,
      this.isVignette ? this.uVignetteScale : 0.0,
      this.isNoise ? this.uNoiseIntensity : [0.0, 0.0],
      this.isNoise ? this.uNoiseScale : [1.0, 1.0],
      this.uNoiseTime,
      this.isSNoise ? this.uSNoiseIntensity : [0.0, 0.0],
      this.isSNoise ? this.uSNoiseScale : [1.0, 1.0],
      this.uSNoiseTime,
    ];

    if (this.exportFunction != null) {
      const iw = 1.0 / (1.0 - this.uCrevice[0]);
      const ih = 1.0 / (1.0 - this.uCrevice[1]);
      const width = this.imageWidth * iw;
      const height = this.imageHeight * ih;
      this.glCanvas.width = width;
      this.glCanvas.height = height;
      this.uCanvasAspect = width / height;

      this.exShaderProgram.use();
      this.exShaderProgram.setAttribute(this.vbo, this.ibo);
      this.exShaderProgram.setUniform(uniforms);
    } else {
      this.shaderProgram.use();
      this.shaderProgram.setAttribute(this.vbo, this.ibo);
      this.shaderProgram.setUniform(uniforms);
    }

    gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

    if (this.exportFunction != null) {
      this.exportFunction();
      this.exportFunction = null;
      this.glCanvas.width = window.innerWidth;
      this.glCanvas.height = window.innerHeight;
      this.uCanvasAspect = window.innerWidth / window.innerHeight;
    }
  }
  fromFile(file: File): Promise<HTMLImageElement | HTMLCanvasElement> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const url = reader.result as string;
        this.image = new Image();
        this.image.addEventListener('load', () => {
          const img = this.image as HTMLImageElement;
          this.imageWidth = img.naturalWidth;
          this.imageHeight = img.naturalHeight;
          this.uResourceAspect = img.naturalWidth / img.naturalHeight;
          if (Renderer.isPower(img.naturalWidth) !== true || Renderer.isPower(img.naturalHeight) !== true) {
            const c = document.createElement('canvas');
            const cx = c.getContext('2d');
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            let width = 0;
            let height = 0;
            let counter = 0;
            while(true) {
              ++counter;
              const v = Math.pow(2, counter);
              if (width === 0) {
                if (nw < v) {
                  width = v;
                }
              }
              if (height === 0) {
                if (nh < v) {
                  height = v;
                }
              }
              if (width !== 0 && height !== 0) {
                break;
              }
            }
            c.width = width;
            c.height = height;
            cx.drawImage(this.image, 0, 0, width, height);
            this.image = c;
          }
          resolve(this.image);
        }, false);
        this.image.src = url;
      }, false);
      this.imageName = file.name;
      reader.readAsDataURL(file);
    });
  }
  eventSetting(): void {
    window.addEventListener('resize', this.resize, false);
    window.addEventListener('keydown', (keyboardEvent) => {
      switch(keyboardEvent.key) {
        case 'e':
          this.export();
          break;
        case 'f':
          this.isFixed = !this.isFixed;
          break
        case 'i':
          Renderer.importJson().then((json) => {
            // TODO: validate value and type
            if (json.uTemperature != null) {this.uTemperature = json.uTemperature;}
            if (json.uTint != null) {this.uTint = json.uTint;}
            if (json.uContrast != null) {this.uContrast = json.uContrast;}
            if (json.uHSV != null) {this.uHSV = json.uHSV;}
            if (json.uSobel != null) {this.uSobel = json.uSobel;}
            if (json.uMosaic != null) {this.uMosaic = json.uMosaic;}
            if (json.uBayer != null) {this.uBayer = json.uBayer;}
            if (json.uToon != null) {this.uToon = json.uToon;}
            if (json.uToonMin != null) {this.uToonMin = json.uToonMin;}
            if (json.uToonMax != null) {this.uToonMax = json.uToonMax;}
            if (json.shiftScale != null) {this.shiftScale = json.shiftScale;}
            if (json.uShift != null) {this.uShift = json.uShift;}
            if (json.uVignette != null) {this.uVignette = json.uVignette;}
            if (json.uVignetteScale != null) {this.uVignetteScale = json.uVignetteScale;}
            if (json.uNoiseIntensity != null) {this.uNoiseIntensity = json.uNoiseIntensity;}
            if (json.uNoiseScale != null) {this.uNoiseScale = json.uNoiseScale;}
            if (json.uNoiseTime != null) {this.uNoiseTime = json.uNoiseTime;}
            if (json.uSNoiseIntensity != null) {this.uSNoiseIntensity = json.uSNoiseIntensity;}
            if (json.uSNoiseScale != null) {this.uSNoiseScale = json.uSNoiseScale;}
            if (json.uSNoiseTime != null) {this.uSNoiseTime = json.uSNoiseTime;}
            if (json.isTemperature != null) {this.isTemperature = json.isTemperature;}
            if (json.isTint != null) {this.isTint = json.isTint;}
            if (json.isContrast != null) {this.isContrast = json.isContrast;}
            if (json.isHSV != null) {this.isHSV = json.isHSV;}
            if (json.isMosaic != null) {this.isMosaic = json.isMosaic;}
            if (json.isShift != null) {this.isShift = json.isShift;}
            if (json.isNoise != null) {this.isNoise = json.isNoise;}
            if (json.isSNoise != null) {this.isSNoise = json.isSNoise;}
            if (json.isSobel != null) {this.isSobel = json.isSobel;}
            if (json.isBayer != null) {this.isBayer = json.isBayer;}
            if (json.isToon != null) {this.isToon = json.isToon;}
            if (json.isVignette != null) {this.isVignette = json.isVignette;}

            this.gui.uTemperature.controller.value.setRawValue(this.uTemperature);
            this.gui.uTint.controller.value.setRawValue(this.uTint);
            this.gui.uContrast.controller.value.setRawValue(this.uContrast);
            this.gui.uHSV[0].controller.value.setRawValue(this.uHSV[0]);
            this.gui.uHSV[1].controller.value.setRawValue(this.uHSV[1]);
            this.gui.uHSV[2].controller.value.setRawValue(this.uHSV[2]);
            this.gui.uSobel.controller.value.setRawValue(this.uSobel);
            this.gui.uMosaic.controller.value.setRawValue(this.uMosaic);
            this.gui.uBayer.controller.value.setRawValue(this.uBayer);
            this.gui.uToon.controller.value.setRawValue(this.uToon);
            this.gui.uToonMin.controller.value.setRawValue(this.uToonMin);
            this.gui.uToonMax.controller.value.setRawValue(this.uToonMax);
            this.gui.shiftScale.controller.value.setRawValue(this.shiftScale);
            this.gui.uShift[0].controller.value.setRawValue(this.uShift[0]);
            this.gui.uShift[1].controller.value.setRawValue(this.uShift[1]);
            this.gui.uVignette.controller.value.setRawValue(this.uVignette);
            this.gui.uVignetteScale.controller.value.setRawValue(this.uVignetteScale);
            this.gui.uNoiseIntensity[0].controller.value.setRawValue(this.uNoiseIntensity[0]);
            this.gui.uNoiseIntensity[1].controller.value.setRawValue(this.uNoiseIntensity[1]);
            this.gui.uNoiseScale[0].controller.value.setRawValue(this.uNoiseScale[0]);
            this.gui.uNoiseScale[1].controller.value.setRawValue(this.uNoiseScale[1]);
            this.gui.uNoiseTime.controller.value.setRawValue(this.uNoiseTime);
            this.gui.uSNoiseIntensity[0].controller.value.setRawValue(this.uSNoiseIntensity[0]);
            this.gui.uSNoiseIntensity[1].controller.value.setRawValue(this.uSNoiseIntensity[1]);
            this.gui.uSNoiseScale[0].controller.value.setRawValue(this.uSNoiseScale[0]);
            this.gui.uSNoiseScale[1].controller.value.setRawValue(this.uSNoiseScale[1]);
            this.gui.uSNoiseTime.controller.value.setRawValue(this.uSNoiseTime);
            this.gui.isTemperature.controller.value.setRawValue(this.isTemperature);
            this.gui.isTint.controller.value.setRawValue(this.isTint);
            this.gui.isContrast.controller.value.setRawValue(this.isContrast);
            this.gui.isHSV.controller.value.setRawValue(this.isHSV);
            this.gui.isMosaic.controller.value.setRawValue(this.isMosaic);
            this.gui.isShift.controller.value.setRawValue(this.isShift);
            this.gui.isNoise.controller.value.setRawValue(this.isNoise);
            this.gui.isSNoise.controller.value.setRawValue(this.isSNoise);
            this.gui.isSobel.controller.value.setRawValue(this.isSobel);
            this.gui.isBayer.controller.value.setRawValue(this.isBayer);
            this.gui.isToon.controller.value.setRawValue(this.isToon);
            this.gui.isVignette.controller.value.setRawValue(this.isVignette);
          });
          break
        case 'j':
          const parameters = {
            uTemperature: this.uTemperature,
            uTint: this.uTint,
            uContrast: this.uContrast,
            uHSV: this.uHSV,
            uSobel: this.uSobel,
            uMosaic: this.uMosaic,
            uBayer: this.uBayer,
            uToon: this.uToon,
            uToonMax: this.uToonMax,
            uToonMin: this.uToonMin,
            shiftScale: this.shiftScale,
            uShift: this.uShift,
            uVignette: this.uVignette,
            uVignetteScale: this.uVignetteScale,
            uNoiseIntensity: this.uNoiseIntensity,
            uNoiseScale: this.uNoiseScale,
            uNoiseTime: this.uNoiseTime,
            uSNoiseIntensity: this.uSNoiseIntensity,
            uSNoiseScale: this.uSNoiseScale,
            uSNoiseTime: this.uSNoiseTime,
            isTemperature: this.isTemperature,
            isTint: this.isTint,
            isContrast: this.isContrast,
            isHSV: this.isHSV,
            isMosaic: this.isMosaic,
            isShift: this.isShift,
            isNoise: this.isNoise,
            isSNoise: this.isSNoise,
            isSobel: this.isSobel,
            isBayer: this.isBayer,
            isToon: this.isToon,
            isVignette: this.isVignette,
          };
          Renderer.downloadJson(parameters);
          break;
        default:
          break;
      }
    }, false);
    const body = document.body;
    body.addEventListener('dragover', (evt) => {
      evt.preventDefault();
    }, false);
    body.addEventListener('drop', async (evt) => {
      evt.preventDefault();
      const files = evt.dataTransfer.files;
      if (files.length === 0) {
        return;
      }
      await this.fromFile(files[0]);
      this.update();
    }, false);

    this.canvas.addEventListener('pointermove', (pointerEvent) => {
      if (this.isFixed === true) {return;}
      const x = pointerEvent.pageX / window.innerWidth * 2.0 - 1.0;
      const y = pointerEvent.pageY / window.innerHeight * 2.0 - 1.0;
      this.uMouse[0] = x;
      this.uMouse[1] = -y;
      this.console.textContent = `x: ${x}
y: ${-y}`;
    }, false);
  }
  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.glCanvas.width = window.innerWidth;
    this.glCanvas.height = window.innerHeight;
    this.uCanvasAspect = window.innerWidth / window.innerHeight;
  }
  export(): void {
    if (this.isRendering !== true) {return;}

    this.exportFunction = () => {
      const url = this.glCanvas.toDataURL();
      const anchor = document.createElement('a');
      document.body.appendChild(anchor);
      const name = this.imageName.replace(/\.(JPG|JPEG|PNG)/ig, '');
      anchor.download = `${name}.png`;
      anchor.href = url;
      anchor.click();
      document.body.removeChild(anchor);
    };
  }
  static isPower(v: number): boolean {
    if (v === 0) {
      return false;
    } else {
      return (v & (v - 1)) === 0;
    }
  }
  static downloadJson(value): void {
    const isString = Object.prototype.toString.call(value) === '[object String]';
    const v = isString === true ? value : JSON.stringify(value, null, '  ');
    const blob = new Blob([v], {type: 'application\/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', 'between.json');
    anchor.click();
    URL.revokeObjectURL(url);
  }
  static importJson(): Promise<any> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.addEventListener('change', () => {
        if (input.files[0] == null) {
          reject();
          return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const text = reader.result as string;
          resolve(JSON.parse(text));
        });
        reader.readAsText(file);
      }, false);
      input.click();
    });
  }

}
