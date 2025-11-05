import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        inlineDynamicImports: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: true
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'SmartClone',
        sourcemap: true,
        exports: 'named',
        inlineDynamicImports: true,
        plugins: [terser()]
      }
    ],
    plugins: [
      typescript(),
      resolve(),
      commonjs()
    ]
  }
];
