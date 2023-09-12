
import { BladeApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import { Renderer } from './canvas';
import './main.scss';

window.addEventListener('DOMContentLoaded', () => {
  const renderer = new Renderer(document.body);
  console.log('😇', renderer);

  const pane = new Pane();

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

}, false);
