import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  input: 'src/index.ts',
  external: ['axios', 'eventemitter3', 'ws'],
  plugins: [
    resolve({
      preferBuiltins: true,
      browser: false
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !isProduction,
      inlineSources: !isProduction
    })
  ]
};

const configs = [
  // ESM build
  {
    ...baseConfig,
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: !isProduction
    },
    plugins: [
      ...baseConfig.plugins,
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ].filter(Boolean)
  },

  // CommonJS build
  {
    ...baseConfig,
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: [
      ...baseConfig.plugins,
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ].filter(Boolean)
  },

  // UMD build for browsers
  {
    ...baseConfig,
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'DandoloSDK',
      sourcemap: !isProduction,
      globals: {
        'axios': 'axios',
        'eventemitter3': 'EventEmitter',
        'ws': 'WebSocket'
      }
    },
    plugins: [
      ...baseConfig.plugins,
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ].filter(Boolean)
  },

  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()],
    external: [/\.css$/]
  }
];

export default configs;