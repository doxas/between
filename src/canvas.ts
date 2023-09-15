import { BladeApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import { ShaderProgram, WebGLUtility } from './webgl';

// TODO: 画像を保存するところを作る

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

    pane.addInput({'crevice-x': this.uCrevice[0]}, 'crevice-x', {
      min: 0,
      max: 1.0,
    }).on('change', (v) => { this.uCrevice[0] = v.value; });
    pane.addInput({'crevice-y': this.uCrevice[1]}, 'crevice-y', {
      min: 0,
      max: 1.0,
    }).on('change', (v) => { this.uCrevice[1] = v.value; });

    // const btn = pane.addButton({
    //   title: 're-render',
    // });
    // btn.on('click', () => {
    //   renderer.render();
    // });
    // const list = pane.addBlade({
    //   view: 'list',
    //   label: 'mode',
    //   options: [
    //     {text: 'default', value: 0},
    //     {text: 'with-line', value: 1},
    //   ],
    //   value: 0,
    // }) as unknown as any;
    // list.on('change', (v) => {
    //   renderer.mode = v.value;
    // });
    // pane.addInput({monochrome: renderer.monochrome}, 'monochrome').on('change', (v) => {
    //   renderer.monochrome = v.value === true;
    // });
    // pane.addInput({sizeRatio: renderer.sizeRatio}, 'sizeRatio', {
    //   step: 1,
    //   min: 1,
    //   max: 10000.0,
    // }).on('change', (v) => {
    //   renderer.sizeRatio = v.value;
    // });
  }
  init(): void {
    this.isRendering = false;
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

    this.vertexShaderSource = `
      attribute vec2 position;
      attribute vec2 texCoord;
      attribute vec2 offset;
      uniform vec2 crevice;
      uniform vec2 mouse;
      uniform float canvasAspect;
      uniform float resourceAspect;
      varying vec2 vTexCoord;
      void main() {
        vec2 edge = (1.0 - abs(position));
        float creviceRatio = 1.0 - max(crevice.x, crevice.y);

        vec2 m = mouse * 5.0; // interaction intensity

        vec2 t = texCoord * 2.0 - 1.0;
        t = t + vec2(m.x, -m.y) * edge * crevice / creviceRatio;
        vTexCoord = t * 0.5 + 0.5;

        vec2 o = offset * crevice;
        vec2 p = position * creviceRatio + o + m * edge * crevice;
        if (resourceAspect > 1.0) {
          p.y /= resourceAspect;
        } else {
          p.x *= resourceAspect;
        }
        if (canvasAspect > 1.0) {
          p.x /= canvasAspect;
        } else {
          p.y *= canvasAspect;
        }

        gl_Position = vec4(p, 0.0, 1.0);
      }
    `;
    this.fragmentShaderSource = `
      precision highp float;
      uniform sampler2D inputTexture;
      varying vec2 vTexCoord;
      void main() {
        vec4 samplerColor = texture2D(inputTexture, vTexCoord);
        gl_FragColor = samplerColor;
      }
    `;
    this.exVertexShaderSource = `
      attribute vec2 position;
      attribute vec2 texCoord;
      attribute vec2 offset;
      uniform vec2 crevice;
      uniform vec2 mouse;
      uniform float canvasAspect;
      uniform float resourceAspect;
      varying vec2 vTexCoord;
      void main() {
        vec2 edge = (1.0 - abs(position));
        float creviceRatio = 1.0 - max(crevice.x, crevice.y);

        vec2 m = mouse * 5.0; // interaction intensity

        vec2 t = texCoord * 2.0 - 1.0;
        t = t + vec2(m.x, -m.y) * edge * crevice / creviceRatio;
        vTexCoord = t * 0.5 + 0.5;

        vec2 o = offset * crevice * edge;
        vec2 p = position + o + m * edge * crevice;

        gl_Position = vec4(p, 0.0, 1.0);
      }
    `;

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
        'inputTexture',
      ],
      type: [
        'uniform2fv',
        'uniform2fv',
        'uniform1f',
        'uniform1f',
        'uniform1i',
      ],
    };
    this.shaderProgram = new ShaderProgram(gl, option);
    option.vertexShaderSource = this.exVertexShaderSource;
    this.exShaderProgram = new ShaderProgram(gl, option);

    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    this.uCrevice = [0, 0];
    this.uMouse = [0.0, 0.0];
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
      0,
    ];

    if (this.exportFunction != null) {
      const width = this.imageWidth + this.imageWidth * this.uCrevice[0] * 2.0;
      const height = this.imageHeight + this.imageHeight * this.uCrevice[1] * 2.0;
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
}
