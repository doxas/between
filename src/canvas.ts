import { Pane } from 'tweakpane';
import { ShaderProgram, WebGLUtility } from './webgl';

import * as vertexShaderSource from './shader/main.vert';
import * as fragmentShaderSource from './shader/main.frag';
import * as exportVertexShaderSource from './shader/export.vert';

export class Renderer {
  private parent: HTMLElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
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
  private uTemperature: number;
  private uTint: number;
  private uContrast: number;
  private uHSV: number[];
  private uMosaic: number;
  private uShift: number[];
  private isFixed: boolean;
  private isTemperature: boolean;
  private isTint: boolean;
  private isContrast: boolean;
  private isHSV: boolean;
  private isMosaic: boolean;
  private isShift: boolean;
  private gui: any;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.glCanvas = document.createElement('canvas');
    this.gl = this.glCanvas.getContext('webgl', {preserveDrawingBuffer: true});

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

    const creviceX = pane.addBinding({'crevice-x': this.uCrevice[0]}, 'crevice-x', {
      min: 0,
      max: 1.0,
    }).on('change', (v) => { this.uCrevice[0] = v.value; });
    const creviceY = pane.addBinding({'crevice-y': this.uCrevice[1]}, 'crevice-y', {
      min: 0,
      max: 1.0,
    }).on('change', (v) => { this.uCrevice[1] = v.value; });
    const vertexScale = pane.addBinding({'scale': this.uVertexScale}, 'scale', {
      min: 1.0,
      max: 2.0,
    }).on('change', (v) => { this.uVertexScale = v.value; });
    const isTemperature = pane.addBinding({'temperature': this.isTemperature}, 'temperature').on('change', (v) => { this.isTemperature = v.value; });
    const temperature = pane.addBinding({'temperature': this.uTemperature}, 'temperature', {
      min: -1.67,
      max: 1.67,
    }).on('change', (v) => { this.uTemperature = v.value; });
    const isTint = pane.addBinding({'tint': this.isTint}, 'tint').on('change', (v) => { this.isTint = v.value; });
    const tint = pane.addBinding({'tint': this.uTint}, 'tint', {
      min: -1.67,
      max: 1.67,
    }).on('change', (v) => { this.uTint = v.value; });
    const isContrast = pane.addBinding({'contrast': this.isContrast}, 'contrast').on('change', (v) => { this.isContrast = v.value; });
    const contrast = pane.addBinding({'contrast': this.uContrast}, 'contrast', {
      min: 0.0,
      max: 1.0,
    }).on('change', (v) => { this.uContrast = v.value; });
    const isHSV = pane.addBinding({'hsv': this.isHSV}, 'hsv').on('change', (v) => { this.isHSV = v.value; });
    const HSVH = pane.addBinding({'hsv-H': this.uHSV[0]}, 'hsv-H', {
      min: 0.0,
      max: 1.0,
    }).on('change', (v) => { this.uHSV[0] = v.value; });
    const HSVS = pane.addBinding({'hsv-S': this.uHSV[1]}, 'hsv-S', {
      min: -1.0,
      max: 1.0,
    }).on('change', (v) => { this.uHSV[1] = v.value; });
    const HSVV = pane.addBinding({'hsv-V': this.uHSV[2]}, 'hsv-V', {
      min: -1.0,
      max: 1.0,
    }).on('change', (v) => { this.uHSV[2] = v.value; });
    const isMosaic = pane.addBinding({'mosaic': this.isMosaic}, 'mosaic').on('change', (v) => { this.isMosaic = v.value; });
    const mosaic = pane.addBinding({'mosaic': this.uMosaic}, 'mosaic', {
      min: 1.0,
      max: 200.0,
    }).on('change', (v) => { this.uMosaic = v.value; });
    const isShift = pane.addBinding({'shift': this.isShift}, 'shift').on('change', (v) => { this.isShift = v.value; });
    const shiftX = pane.addBinding({'shift-x': this.uShift[0]}, 'shift-x', {
      min: -0.2,
      max: 0.2,
    }).on('change', (v) => { this.uShift[0] = v.value; });
    const shiftY = pane.addBinding({'shift-y': this.uShift[1]}, 'shift-y', {
      min: -0.2,
      max: 0.2,
    }).on('change', (v) => { this.uShift[1] = v.value; });
    const resetButton = pane.addButton({
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
      this.uMosaic = 100.0;
      this.uShift = [0.0, 0.0];
      // reset inputs
      temperature.controller.value.setRawValue(this.uTemperature);
      tint.controller.value.setRawValue(this.uTint);
      contrast.controller.value.setRawValue(this.uContrast);
      HSVH.controller.value.setRawValue(this.uHSV[0]);
      HSVS.controller.value.setRawValue(this.uHSV[1]);
      HSVV.controller.value.setRawValue(this.uHSV[2]);
      mosaic.controller.value.setRawValue(this.uMosaic);
      shiftX.controller.value.setRawValue(this.uShift[0]);
      shiftY.controller.value.setRawValue(this.uShift[1]);
    });
    const randomButton = pane.addButton({
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
        this.uContrast = Math.random();
      }
      if (this.isHSV === true) {
        this.uHSV[0] = Math.random();
        this.uHSV[1] = Math.random() * 2.0 - 1.0;
        this.uHSV[2] = Math.random() * 2.0 - 1.0;
      }
      if (this.isMosaic === true) {
        this.uMosaic = Math.random() * 199.0 + 1.0;
      }
      if (this.isShift === true) {
        this.uShift = [Math.random() * 0.4 - 0.2, Math.random() * 0.4 - 0.2];
      }
      // set to inputs
      temperature.controller.value.setRawValue(this.uTemperature);
      tint.controller.value.setRawValue(this.uTint);
      contrast.controller.value.setRawValue(this.uContrast);
      HSVH.controller.value.setRawValue(this.uHSV[0]);
      HSVS.controller.value.setRawValue(this.uHSV[1]);
      HSVV.controller.value.setRawValue(this.uHSV[2]);
      mosaic.controller.value.setRawValue(this.uMosaic);
      shiftX.controller.value.setRawValue(this.uShift[0]);
      shiftY.controller.value.setRawValue(this.uShift[1]);
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
    pane.addBinding({info: info}, 'info', {
      readonly: true,
      multiline: true,
      rows: 10,
    });

    this.gui = {
      uCrevice: [creviceX, creviceY],
      uTemperature: temperature,
      uTint: tint,
      uContrast: contrast,
      uHSV: [HSVH, HSVS, HSVV],
      uMosaic: mosaic,
      uShift: [shiftX, shiftY],
      isTemperature: isTemperature,
      isTint: isTint,
      isContrast: isContrast,
      isHSV: isHSV,
      isMosaic: isMosaic,
      isShift: isShift
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
        'crevice',
        'mouse',
        'canvasAspect',
        'resourceAspect',
        'vertexScale',
        'inputTexture',
        'hsv',
        'temperature',
        'tint',
        'contrastIntensity',
        'mosaic',
        'shift',
      ],
      type: [
        'uniform2fv',
        'uniform2fv',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1i',
        'uniform3fv',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform2fv',
      ],
    };
    this.shaderProgram = new ShaderProgram(gl, option);
    option.vertexShaderSource = this.exVertexShaderSource;
    this.exShaderProgram = new ShaderProgram(gl, option);

    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    this.uCrevice = [0, 0];
    this.uMouse = [0.0, 0.0];
    this.uVertexScale = 1.25;
    this.uTemperature = 0.0;
    this.uTint = 0.0;
    this.uContrast = 0.5;
    this.uHSV = [0.0, 0.0, 0.0];
    this.uMosaic = 100.0;
    this.uShift = [0.0, 0.0];
    this.isTemperature = true;
    this.isTint = true;
    this.isContrast = true;
    this.isHSV = true;
    this.isMosaic = false;
    this.isShift = false;
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
      this.uCrevice,
      this.uMouse,
      this.uCanvasAspect,
      this.uResourceAspect,
      this.uVertexScale,
      0,
      this.isHSV ? this.uHSV : [0.0, 0.0, 0.0],
      this.isTemperature ? this.uTemperature : 0.0,
      this.isTint ? this.uTint : 0.0,
      this.isContrast ? this.uContrast : 0.5,
      this.isMosaic ? this.uMosaic : -1.0,
      this.isShift ? this.uShift : [0.0, 0.0],
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
            this.uCrevice = json.uCrevice;
            this.uMouse = json.uMouse;
            this.uTemperature = json.uTemperature;
            this.uTint = json.uTint;
            this.uContrast = json.uContrast;
            this.uHSV = json.uHSV;
            this.uMosaic = json.uMosaic;
            this.uShift = json.uShift;
            this.isTemperature = json.isTemperature;
            this.isTint = json.isTint;
            this.isContrast = json.isContrast;
            this.isHSV = json.isHSV;
            this.isMosaic = json.isMosaic;
            this.isShift = json.isShift;

            this.gui.uCrevice[0].controller.value.setRawValue(this.uCrevice[0]);
            this.gui.uCrevice[1].controller.value.setRawValue(this.uCrevice[1]);
            this.gui.uTemperature.controller.value.setRawValue(this.uTemperature);
            this.gui.uTint.controller.value.setRawValue(this.uTint);
            this.gui.uContrast.controller.value.setRawValue(this.uContrast);
            this.gui.uHSV[0].controller.value.setRawValue(this.uHSV[0]);
            this.gui.uHSV[1].controller.value.setRawValue(this.uHSV[1]);
            this.gui.uHSV[2].controller.value.setRawValue(this.uHSV[2]);
            this.gui.uMosaic.controller.value.setRawValue(this.uMosaic);
            this.gui.uShift[0].controller.value.setRawValue(this.uShift[0]);
            this.gui.uShift[1].controller.value.setRawValue(this.uShift[1]);
            this.gui.isTemperature.controller.value.setRawValue(this.isTemperature);
            this.gui.isTint.controller.value.setRawValue(this.isTint);
            this.gui.isContrast.controller.value.setRawValue(this.isContrast);
            this.gui.isHSV.controller.value.setRawValue(this.isHSV);
            this.gui.isMosaic.controller.value.setRawValue(this.isMosaic);
            this.gui.isShift.controller.value.setRawValue(this.isShift);
          });
          break
        case 'j':
          const parameters = {
            uCrevice: this.uCrevice,
            uMouse: this.uMouse,
            uTemperature: this.uTemperature,
            uTint: this.uTint,
            uContrast: this.uContrast,
            uHSV: this.uHSV,
            uMosaic: this.uMosaic,
            uShift: this.uShift,
            isTemperature: this.isTemperature,
            isTint: this.isTint,
            isContrast: this.isContrast,
            isHSV: this.isHSV,
            isMosaic: this.isMosaic,
            isShift: this.isShift,
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
    body.addEventListener('drop', (evt) => {
      evt.preventDefault();
      const files = evt.dataTransfer.files;
      if (files.length === 0) {
        return;
      }
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
          this.update();
        }, false);
        this.image.src = url;
      }, false);
      this.imageName = files[0].name;
      reader.readAsDataURL(files[0]);
    }, false);

    this.canvas.addEventListener('pointermove', (pointerEvent) => {
      if (this.isFixed === true) {return;}
      const x = pointerEvent.pageX / window.innerWidth * 2.0 - 1.0;
      const y = pointerEvent.pageY / window.innerHeight * 2.0 - 1.0;
      this.uMouse[0] = x;
      this.uMouse[1] = -y;
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
      anchor.download = `${this.imageName}.png`;
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
